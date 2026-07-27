import { Component, Input } from '@angular/core';

@Component({
  selector: 'my-3d-button',
  imports: [],
  templateUrl: './my3d-button.html',
  styleUrl: './my3d-button.css',
})
export class My3dButton {

  // Entrées pour personnaliser le bouton
  @Input() text: string = 'Valider';
  @Input() textColor: string = 'text-white';
  @Input() frontBgColor: string = 'bg-blue-600';
  @Input() backBgColor: string = 'bg-blue-600';
  @Input() size: 'small' | 'medium' | 'large' = 'large';
  // @Input() hoverBgColor: string = 'hover:bg-blue-700';

  // Combine toutes les classes Tailwind de base et dynamiques
 
  get backClasses(): string{
    return `pushable ${this.size} w-full max-w-[400px]  ${this.backBgColor} shadow-md`
  }

  get frontClasses(): string{
    return `front font-bold uppercase w-full max-w-[400px]  ${this.textColor} ${this.frontBgColor} `
  }

}
