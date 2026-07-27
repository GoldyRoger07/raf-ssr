import { Component } from '@angular/core';
import { Testimonial } from '../../../model/testimonial.model';
import { TestimonialComponent } from '../testimonial/testimonial';

@Component({
  selector: 'my-testimonial-list',
  imports: [TestimonialComponent],
  templateUrl: './testimonial-list.html',
  styleUrl: './testimonial-list.css',
})
export class TestimonialList {

  testimonials: Testimonial[] = [
    {
      name: 'Jean M.',
      avatar: 'JM',
      quizzes: 42,
      winnings: '180,000 HTG',
      rating: 5,
      message: "Je pensais simplement m'amuser, mais j'ai rapidement remporté mes premiers gains. Les règles sont claires et les paiements sont rapides."
    },
    {
      name: 'Sarah L.',
      avatar: 'SL',
      quizzes: 31,
      winnings: '9,500 HTG',
      rating: 5,
      message: "L'application est très simple à utiliser. Les quiz sont variés et très bien organisés. Je participe chaque semaine."
    },
    {
      name: 'David R.',
      avatar: 'DR',
      quizzes: 58,
      winnings: '32,000 HTG',
      rating: 5,
      message: "Le classement est transparent et les résultats sont publiés rapidement. Une plateforme sérieuse."
    },
    {
      name: 'Marie C.',
      avatar: 'MC',
      quizzes: 24,
      winnings: '12,000 HTG',
      rating: 5,
      message: "J'aime apprendre tout en ayant la possibilité de gagner de l'argent. C'est devenu mon rendez-vous favori."
    },
    {
      name: 'Kevin T.',
      avatar: 'KT',
      quizzes: 67,
      winnings: '41,000 HTG',
      rating: 5,
      message: "Les quiz commencent toujours à l'heure et les récompenses sont distribuées rapidement."
    },
    {
      name: 'Sophie N.',
      avatar: 'SN',
      quizzes: 18,
      winnings: '7,500 HTG',
      rating: 5,
      message: "Une plateforme moderne, fluide et très agréable à utiliser. Je la recommande sans hésiter."
    }
  ];
}
