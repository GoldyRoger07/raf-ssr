import { Component, Input, signal } from '@angular/core';
import { FaqItem } from "../faq-item/faq-item";
import { AnimateOnScrollDirective } from '../../../directives/animate-on-scroll';

interface FaqData {
  question: string;
  answer: string;
}

@Component({
  selector: 'faq-list',
  imports: [FaqItem, AnimateOnScrollDirective],
  templateUrl: './faq-list.html',
  styleUrl: './faq-list.css',
})
export class FaqList {
  // Signal contenant l'index de la FAQ ouverte (-1 signifie que tout est fermé)
  openIndex = signal<number>(-1);

  @Input()
  faqs: FaqData[] = [
    { 
      question: "Dois-je créer un compte pour jouer ?", 
      answer: "Oui. Un compte est nécessaire pour participer aux quiz, suivre vos résultats et recevoir vos gains." 
    },
    { 
      question: "Combien coûte un ticket de participation ?", 
      answer: "Le prix du ticket varie selon le quiz. Le montant est toujours affiché avant la validation de votre inscription." 
    },
    { 
      question: "Comment les gagnants sont-ils déterminés ?", 
      answer: "Les gagnants sont classés selon le nombre de bonnes réponses et, en cas d'égalité, selon le temps de réponse." 
    },
    { 
      question: "Comment les récompenses sont-elles distribuées ?", 
      answer: "Les récompenses sont automatiquement réparties entre les meilleurs participants selon les règles du quiz." 
    },
    { 
      question: "Quand recevrai-je mes gains ?", 
      answer: "Les gains sont crédités sur votre portefeuille dès que les résultats sont validés, généralement quelques instants après la fin du quiz." 
    },
    { 
      question: "Quels moyens de paiement sont acceptés ?", 
      answer: "Vous pouvez alimenter votre portefeuille avec les moyens de paiement proposés sur la plateforme, selon votre région." 
    },
    { 
      question: "Puis-je retirer mes gains à tout moment ?", 
      answer: "Oui, dès que votre solde est disponible et que vous respectez les conditions de retrait." 
    },
    { 
      question: "Que se passe-t-il si ma connexion Internet est interrompue pendant un quiz ?", 
      answer: "Si votre connexion est interrompue, le chronomètre continue de tourner. Nous vous recommandons d'utiliser une connexion stable avant de participer." 
    },
    {
      question: 'Les quiz sont-ils équitables pour tous les participants ?',
      answer: 'Oui. Tous les participants reçoivent les mêmes questions dans les mêmes conditions afin de garantir une compétition juste.'
    },
    {
      question: 'Puis-je participer à plusieurs quiz dans la même journée ?',
      answer: 'Absolument. Vous pouvez rejoindre autant de quiz que vous le souhaitez, à condition d\'acheter un ticket pour chaque session.'
    },
    {
      question: 'Comment puis-je connaître les prochains quiz ?',
      answer: 'Les prochains quiz sont affichés sur la page d\'accueil avec leur date, leur heure, leur thème et le montant des récompenses.'
    },
    {
      question: 'Que faire si je rencontre un problème technique ?',
      answer: 'Vous pouvez contacter notre équipe d\'assistance depuis la rubrique « Contact » ou via le support intégré à la plateforme.'
    },
    {
      question: 'Mes informations personnelles et mes paiements sont-ils sécurisés ?',
      answer: 'Oui. Nous utilisons des technologies de sécurité modernes pour protéger vos données personnelles et vos transactions.'
    }
  ];

  handleToggle(index: number): void {
    // Si la FAQ cliquée est déjà ouverte, on la ferme (-1). Sinon, on ouvre la nouvelle.
    if (this.openIndex() === index) {
      this.openIndex.set(-1);
    } else {
      this.openIndex.set(index);
    }
  }
}
