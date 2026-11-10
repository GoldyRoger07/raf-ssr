import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { errorMessage } from '../../core/api';
import { Category, ImportReport, QuestionStatus } from '../../core/models';
import { QuestionApi } from '../../core/question-api.service';
import { distinctOptions } from '../../core/table-state';

/** Modele telechargeable : meme format que l'exemple du backend (docs/exemple-import-questions.csv). */
const TEMPLATE = [
  'question;reponse_a;reponse_b;reponse_c;reponse_d;bonne_reponse;difficulte;explication',
  "En quelle annee Haiti a-t-elle proclame son independance ?;1802;1803;1804;1805;C;FACILE;Proclamee le 1er janvier 1804 aux Gonaives.",
  "La Citadelle Laferriere se trouve dans le Nord.;Vrai;Faux;;;A;MOYEN;",
].join('\n');

@Component({
  selector: 'admin-import',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TableModule,
    ToggleSwitchModule,
  ],
  templateUrl: './import.html',
})
export default class Import {
  private readonly api = inject(QuestionApi);

  protected readonly categories = signal<Category[]>([]);
  /** L'export propose aussi les categories desactivees. */
  protected readonly allCategories = signal<Category[]>([]);
  protected categoryId: number | null = null;
  protected publishDirectly = false;
  protected readonly file = signal<File | null>(null);
  protected readonly importing = signal(false);
  protected readonly report = signal<ImportReport | null>(null);
  /** Problemes distincts du rapport, pour le filtre. */
  protected readonly reasonOptions = computed(() => distinctOptions(this.report()?.errors, 'reason'));
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.api.categories().subscribe((categories) => {
      this.allCategories.set(categories);
      this.categories.set(categories.filter((c) => c.active));
    });
  }

  // --- Export -------------------------------------------------------------------

  protected readonly exportStatuses: { label: string; value: QuestionStatus | null }[] = [
    { label: 'Tous les statuts', value: null },
    { label: 'Publiees', value: 'PUBLISHED' },
    { label: 'Brouillons', value: 'DRAFT' },
    { label: 'Archivees', value: 'ARCHIVED' },
  ];
  protected exportCategoryId: number | null = null;
  protected exportStatus: QuestionStatus | null = null;
  protected readonly exporting = signal(false);
  protected readonly exportError = signal<string | null>(null);

  protected exportCsv(): void {
    const categoryId = this.exportCategoryId;
    if (!categoryId) {
      return;
    }
    const category = this.allCategories().find((c) => c.id === categoryId);
    const status = this.exportStatus;
    this.exporting.set(true);
    this.exportError.set(null);
    this.api.exportCsv(categoryId, status).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const suffix = status ? '-' + status.toLowerCase() : '';
        this.save(blob, `questions-${category?.slug ?? categoryId}${suffix}.csv`);
      },
      error: (error) => {
        this.exporting.set(false);
        this.exportError.set(errorMessage(error));
      },
    });
  }

  protected onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
    this.report.set(null);
    this.error.set(null);
  }

  protected upload(): void {
    const file = this.file();
    if (!file || !this.categoryId) {
      return;
    }
    this.importing.set(true);
    this.error.set(null);
    this.report.set(null);
    this.api.importCsv(this.categoryId, file, this.publishDirectly).subscribe({
      next: (report) => {
        this.importing.set(false);
        this.report.set(report);
      },
      error: (error) => {
        this.importing.set(false);
        this.error.set(errorMessage(error));
      },
    });
  }

  protected downloadTemplate(): void {
    // BOM : Excel ouvre alors le fichier en UTF-8 et garde les accents.
    this.save(new Blob(['﻿' + TEMPLATE], { type: 'text/csv;charset=utf-8' }), 'modele-import-questions.csv');
  }

  private save(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
