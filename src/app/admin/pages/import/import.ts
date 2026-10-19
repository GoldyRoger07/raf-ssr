import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { errorMessage } from '../../core/api';
import { Category, ImportReport } from '../../core/models';
import { QuestionApi } from '../../core/question-api.service';

/** Modele telechargeable : meme format que l'exemple du backend (docs/exemple-import-questions.csv). */
const TEMPLATE = [
  'question;reponse_a;reponse_b;reponse_c;reponse_d;bonne_reponse;difficulte;explication',
  "En quelle annee Haiti a-t-elle proclame son independance ?;1802;1803;1804;1805;C;FACILE;Proclamee le 1er janvier 1804 aux Gonaives.",
  "La Citadelle Laferriere se trouve dans le Nord.;Vrai;Faux;;;A;MOYEN;",
].join('\n');

@Component({
  selector: 'admin-import',
  imports: [FormsModule, RouterLink, ButtonModule, MessageModule, SelectModule, TableModule, ToggleSwitchModule],
  templateUrl: './import.html',
})
export default class Import {
  private readonly api = inject(QuestionApi);

  protected readonly categories = signal<Category[]>([]);
  protected categoryId: number | null = null;
  protected publishDirectly = false;
  protected readonly file = signal<File | null>(null);
  protected readonly importing = signal(false);
  protected readonly report = signal<ImportReport | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.api.categories().subscribe((categories) => this.categories.set(categories.filter((c) => c.active)));
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
    const blob = new Blob(['﻿' + TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modele-import-questions.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
}
