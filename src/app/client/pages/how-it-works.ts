import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../ui/icon';
import { PageHero, PlayCta, pageDescription } from '../ui/page';
import { RevealDirective } from '../ui/reveal';
import { ScrubLineDirective } from '../ui/scrub-line';

interface Step {
  icon: string;
  tag?: string;
  title: string;
  text: string;
}

const BEFORE: Step[] = [
  {
    icon: 'user',
    title: 'Crée ton compte',
    text: 'Gratuit, en une minute. Confirme ton adresse email : c’est obligatoire pour acheter un ticket ou lancer une partie solo.',
  },
  {
    icon: 'coin',
    title: 'Recharge tes crédits',
    text: 'Les crédits sont la monnaie du jeu. Recharge-les auprès d’un agent RAF (MonCash et NatCash arrivent bientôt). La valeur d’un crédit en gourdes est affichée dans le Trésor de l’app.',
  },
  {
    icon: 'phone',
    title: 'Vérifie ton téléphone',
    text: 'Ton numéro sert à confirmer chaque retrait par un code. Vérifie-le une fois, et tes gains sont prêts à être encaissés.',
  },
];

const LIFECYCLE: Step[] = [
  {
    icon: 'ticket',
    tag: 'Inscriptions',
    title: 'Le quiz est annoncé',
    text: 'Thème général, prix du ticket, récompenses de chaque rang : tout est affiché avant que tu achètes. Un quiz peut limiter le nombre de tickets par joueur ou au total.',
  },
  {
    icon: 'vote',
    tag: 'Si le quiz le prévoit',
    title: 'Les joueurs votent le sujet',
    text: 'Les détenteurs d’un ticket choisissent le sujet précis parmi plusieurs propositions. À la fin du vote, l’équipe RAF annonce le sujet retenu.',
  },
  {
    icon: 'users',
    tag: 'Seuil de joueurs',
    title: 'Le départ est programmé',
    text: 'Dès que le nombre minimum de joueurs est atteint, le démarrage est programmé et tu en es averti. Si un quiz est annulé, chaque ticket est remboursé en crédits.',
  },
  {
    icon: 'play',
    tag: 'Quiz ouvert',
    title: 'Tu joues quand tu veux',
    text: 'Pendant que le quiz est ouvert, lance ta partie au moment qui t’arrange. Chaque ticket donne droit à une partie, et tu peux encore acheter des tickets.',
  },
  {
    icon: 'hourglass',
    tag: 'Dernière ligne droite',
    title: 'Le compte à rebours final',
    text: 'Quand un joueur atteint le score seuil fixé pour le quiz, un compte à rebours se déclenche. C’est la dernière chance de jouer ou de rejouer.',
  },
  {
    icon: 'trophy',
    tag: 'Résultats',
    title: 'Classement et gains',
    text: 'À la fin du compte à rebours, le classement est figé et les récompenses sont versées automatiquement sur le solde de gains des gagnants. Le corrigé devient consultable.',
  },
];

const DURING: Step[] = [
  {
    icon: 'clock',
    title: 'Un chrono par question',
    text: 'Chaque question a son propre temps. Tu passes à la suivante dès que tu réponds ; si le temps s’écoule, la question compte sans réponse.',
  },
  {
    icon: 'question',
    title: 'Ton propre tirage',
    text: 'Les questions sont tirées au hasard dans une grande banque, pour chaque joueur. Difficile de copier sur son voisin.',
  },
  {
    icon: 'lock',
    title: 'Aucun indice pendant le jeu',
    text: 'L’app n’indique jamais si ta réponse est juste pendant la partie. Le corrigé n’est dévoilé qu’à la fin du quiz.',
  },
  {
    icon: 'warning',
    title: 'Coupure de réseau ?',
    text: 'Rouvre l’app : ta partie reprend où tu l’avais laissée. Le chrono, lui, ne s’arrête pas, alors joue avec une connexion stable.',
  },
];

@Component({
  selector: 'raf-how-it-works',
  imports: [RouterLink, IconComponent, PageHero, PlayCta, RevealDirective, ScrubLineDirective],
  template: `
    <page-hero
      icon="question"
      kicker="Le guide du joueur"
      title="Comment ça marche ?"
      lead="Tout le parcours d’un joueur RAF, du premier crédit au premier retrait, sans jargon."
    />

    <section class="section">
      <div class="container">
        <header class="section-head">
          <p reveal class="chip-raf">Avant de jouer</p>
          <h2 reveal class="h2">Trois choses à faire une seule fois</h2>
        </header>
        <div reveal revealStagger class="grid three">
          @for (s of before; track s.title) {
            <article class="tile card-raf">
              <raf-icon [name]="s.icon" [size]="52" />
              <h3>{{ s.title }}</h3>
              <p>{{ s.text }}</p>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="section tinted">
      <div class="container narrow">
        <header class="section-head">
          <p reveal class="chip-raf">Mode En groupe</p>
          <h2 reveal class="h2">La vie d’un quiz, de l’annonce aux gains</h2>
        </header>
        <div class="timeline">
          <span class="timeline-track" aria-hidden="true"><span class="timeline-fill" scrubLine></span></span>
          @for (s of lifecycle; track s.title) {
            <article reveal="right" class="event card-raf">
              <span class="event-dot"><raf-icon [name]="s.icon" [size]="38" /></span>
              <span class="tag">{{ s.tag }}</span>
              <h3>{{ s.title }}</h3>
              <p>{{ s.text }}</p>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <header class="section-head">
          <p reveal class="chip-raf">Pendant une partie</p>
          <h2 reveal class="h2">Ce qu’il faut savoir avant d’appuyer sur « Jouer »</h2>
        </header>
        <div reveal revealStagger class="grid two">
          @for (s of during; track s.title) {
            <article class="tile card-raf">
              <raf-icon [name]="s.icon" [size]="52" />
              <h3>{{ s.title }}</h3>
              <p>{{ s.text }}</p>
            </article>
          }
        </div>
      </div>
    </section>

    <section class="section tinted">
      <div class="container split">
        <div>
          <p reveal class="chip-raf">Le classement</p>
          <h2 reveal class="h2" style="margin: 12px 0 18px">Comment on départage les joueurs</h2>
          <ul reveal revealStagger class="checklist">
            <li><raf-icon name="star" [size]="26" /> Chaque bonne réponse rapporte le même nombre de points, fixé par le quiz.</li>
            <li><raf-icon name="ticket" [size]="26" /> Si tu as joué plusieurs tickets, seule ta meilleure partie compte.</li>
            <li><raf-icon name="clock" [size]="26" /> En cas d’égalité, le joueur qui a lancé sa première partie le plus tôt passe devant.</li>
            <li><raf-icon name="crown" [size]="26" /> Les rangs récompensés et leurs montants sont affichés dans la fiche du quiz.</li>
          </ul>
        </div>
        <div reveal="zoom" class="formula card-raf">
          Score = bonnes réponses × points
          <small>Une question sans réponse ou fausse rapporte 0 point.</small>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container split">
        <div reveal="left" class="tile card-raf">
          <raf-icon name="flame" [size]="56" />
          <h3 class="font-display" style="font-size: 1.8rem; font-weight: 400">Le mode Solo</h3>
          <p>
            Pas de ticket ni de classement : tu paies ta partie en crédits et tu joues tout de suite. Réussis toutes les
            questions (le sans-faute) et le prix du quiz est versé aussitôt sur ton solde de gains. Une seule partie par sujet
            et par jour. Tu sais tout de suite si tu as gagné ; le détail des réponses est dévoilé à la fermeture du quiz.
          </p>
        </div>
        <div reveal="right" class="tile card-raf">
          <raf-icon name="bank" [size]="56" />
          <h3 class="font-display" style="font-size: 1.8rem; font-weight: 400">Retirer tes gains</h3>
          <p>
            Tes gains sont en gourdes sur un solde séparé de tes crédits. Depuis l’app, demande un retrait vers MonCash,
            NatCash ou en espèces. Tu confirmes avec un code reçu par SMS, l’équipe RAF valide la demande, puis l’argent
            est versé. Au guichet, un code de remise t’est envoyé : personne d’autre ne peut récupérer ton argent.
          </p>
          <p style="margin-top: 10px">
            Montant minimum, frais et plafond journalier : ils sont affichés dans l’app au moment du retrait.
            <a routerLink="/regles" fragment="retraits" style="color: var(--raf-edge-dark); font-weight: 900; text-decoration: underline">Voir les règles</a>
          </p>
        </div>
      </div>
    </section>

    <play-cta />
  `,
  styleUrl: './content.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HowItWorksPage {
  protected readonly before = BEFORE;
  protected readonly lifecycle = LIFECYCLE;
  protected readonly during = DURING;

  constructor() {
    pageDescription(
      'Le fonctionnement de RAF pas à pas : crédits, tickets, vote du sujet, déroulement d’une partie, classement, mode Solo et retrait des gains.',
    );
  }
}
