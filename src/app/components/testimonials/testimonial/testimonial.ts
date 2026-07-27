import { Component, Input } from '@angular/core';
import { Testimonial } from '../../../model/testimonial.model';



@Component({
  selector: 'my-testimonial',
  imports: [],
  templateUrl: './testimonial.html',
  styleUrl: './testimonial.css',
})
export class TestimonialComponent {

  @Input()
  testimonial: Testimonial = {
      name: 'Jean M.',
      avatar: 'JM',
      quizzes: 42,
      winnings: '180 $US',
      rating: 5,
      message: "Je pensais simplement m'amuser, mais j'ai rapidement remporté mes premiers gains. Les règles sont claires et les paiements sont rapides."
    }
}
