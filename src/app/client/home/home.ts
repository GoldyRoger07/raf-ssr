import { Component } from '@angular/core';
import { Header } from '../../components/header/header';
import { Container } from "../../components/container/container";
import { Footer } from "../../components/footer/footer";
import { My3dButton } from '../../components/buttons/my3d-button/my3d-button';
import { FaqList } from "../../components/faqs/faq-list/faq-list";
import { TestimonialComponent } from "../../components/testimonials/testimonial/testimonial";
import { TestimonialList } from "../../components/testimonials/testimonial-list/testimonial-list";
import { AnimateOnScrollDirective } from '../../directives/animate-on-scroll';

interface CardData{
  title: string
  subtitle?: string
  desc: string
  avatar?: string


}

@Component({
  selector: 'app-home',
  imports: [Header, My3dButton, Container, Footer, FaqList, TestimonialComponent, TestimonialList, AnimateOnScrollDirective],
  templateUrl: './home.html',
  styleUrl: './home.css',
  
})
export default class Home {

  cardDatas:CardData[] = [
    {
      title: 'Achetez votre ticket',
      desc: 'Réservez votre place en achetant un ticket pour le prochain événement. Chaque ticket vous donne accès au quiz et au vote pour choisir son thème.'
    },
    {
      title: 'Votez pour le thème du quiz',
      desc: 'Une fois votre ticket acheté, choisissez le sujet que vous souhaitez voir abordé. Le thème qui obtient le plus de votes sera celui du prochain quiz.'
    },
    {
      title: 'Relevez le défi',
      desc: 'Le jour de l\'événement, répondez correctement au plus grand nombre de questions possible avant la fin du temps imparti. En cas d\'égalité, les joueurs les plus rapides sont classés devant.'
    },
    {
      title: 'Gagnez des récompenses',
      desc: 'À la fin du quiz, les meilleurs participants remportent les récompenses prévues pour l\'événement. Selon le quiz, de 3 à 5 joueurs peuvent être récompensés.'
    }
  ]

  testimonialCards: CardData[] = [
    {
      title: 'hjhjhgj',
      desc: 'jhkjhkhkjhkjhkhghjgjgfhgfhffffggfgdffgdg',
      avatar: 'hjhjb'
    },
    {
      title: 'hjhjhgj',
      desc: 'jhkjhkhkjhkjhkhghjgjgfhgfhffffggfgdffgdg',
      avatar: 'hjhjb'
    },
    {
      title: 'hjhjhgj',
      desc: 'jhkjhkhkjhkjhkhghjgjgfhgfhffffggfgdffgdg',
      avatar: 'hjhjb'
    }
  ]
  
}
