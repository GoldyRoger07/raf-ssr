import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-faq-item',
  imports: [],
  templateUrl: './faq-item.html',
  styleUrl: './faq-item.css',
})
export class FaqItem {
  @Input({ required: true }) question!: string;
  @Input({ required: true }) answer!: string;
  @Input() isOpen: boolean = false;
  
  @Output() toggle = new EventEmitter<void>();
}
