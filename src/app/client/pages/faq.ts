import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SITE } from '../site';
import { IconComponent } from '../ui/icon';
import { PageHero, PlayCta, pageDescription } from '../ui/page';
import { RevealDirective } from '../ui/reveal';

interface Faq {
  q: string;
  a: string;
}

interface FaqGroup {
  id: string;
  icon: string;
  title: string;
  items: Faq[];
}

const GROUPS: FaqGroup[] = [
  {
    id: 'compte',
    icon: 'user',
    title: 'Compte et installation',
    items: [
      { q: 'L’inscription est-elle payante ?', a: 'Non, créer un compte est gratuit. Tu ne paies que les tickets des quiz et les parties Solo que tu choisis de jouer, avec tes crédits.' },
      { q: 'Quel âge faut-il avoir ?', a: `RAF est réservé aux personnes de ${SITE.minimumAge} ans et plus.` },
      { q: 'Dois-je télécharger une application ?', a: 'RAF fonctionne dans ton navigateur. Tu peux l’ajouter à ton écran d’accueil pour l’ouvrir comme une application : consulte la page « Installer l’app ».' },
      { q: 'Pourquoi dois-je confirmer mon email et mon téléphone ?', a: 'L’email confirmé est nécessaire pour acheter un ticket ou lancer une partie Solo. Le téléphone vérifié sert à confirmer tes retraits par un code : c’est ce qui protège ton argent.' },
      { q: 'Puis-je avoir plusieurs comptes ?', a: 'Non. Un seul compte par personne. Les comptes multiples sont considérés comme de la triche.' },
    ],
  },
  {
    id: 'jouer',
    icon: 'play',
    title: 'Jouer',
    items: [
      { q: 'Quelle différence entre En groupe et Solo ?', a: 'En groupe, tu achètes un ticket et tu affrontes les autres joueurs : les mieux classés gagnent. En Solo, tu paies ta partie et tu gagnes le prix du quiz si tu réponds juste à toutes les questions.' },
      { q: 'Quand puis-je jouer un quiz En groupe ?', a: 'Dès que le quiz est ouvert, au moment qui t’arrange, jusqu’à la fin du compte à rebours final. L’app te prévient quand le quiz démarre et quand le compte à rebours commence.' },
      { q: 'Tout le monde a-t-il les mêmes questions ?', a: 'Non : chaque joueur reçoit son propre tirage au hasard dans une grande banque de questions sur le sujet du quiz. C’est ce qui empêche de se passer les réponses.' },
      { q: 'Est-ce que la rapidité compte ?', a: 'Chaque question a un chrono : il faut répondre avant la fin. Le score ne dépend que du nombre de bonnes réponses. En cas d’égalité, celui qui a lancé sa première partie le plus tôt passe devant.' },
      { q: 'Puis-je jouer plusieurs fois au même quiz ?', a: 'Oui, avec un ticket par partie, dans la limite fixée par le quiz. Seule ta meilleure partie compte au classement.' },
      { q: 'Pourquoi l’app ne me dit pas si ma réponse est juste ?', a: 'Pour l’équité : le corrigé ne quitte pas nos serveurs pendant que le quiz est ouvert. Tu le découvres à la fin du quiz.' },
      { q: 'Et si ma connexion coupe pendant une partie ?', a: 'Rouvre l’app : ta partie reprend où tu l’avais laissée. Le chrono continue pendant la coupure, et les questions dont le temps est écoulé comptent sans réponse.' },
    ],
  },
  {
    id: 'argent',
    icon: 'coin',
    title: 'Crédits, gains et retraits',
    items: [
      { q: 'Combien vaut un crédit ?', a: 'La valeur d’un crédit en gourdes est affichée dans le Trésor de l’app. Elle y est toujours à jour.' },
      { q: 'Comment recharger mes crédits ?', a: 'Auprès d’un agent RAF : donne-lui ton numéro de téléphone ou ton identifiant joueur, paie en gourdes, et tes crédits arrivent aussitôt. La recharge par MonCash et NatCash arrive bientôt.' },
      { q: 'Puis-je retirer mes crédits ?', a: 'Non. Les crédits servent uniquement à jouer. Ce sont tes gains, en gourdes, qui se retirent.' },
      { q: 'Quand reçois-je mes gains ?', a: 'En groupe, automatiquement à la clôture du quiz. En Solo, immédiatement après un sans-faute. Ils arrivent sur ton solde de gains.' },
      { q: 'Comment retirer mes gains ?', a: 'Depuis le Trésor de l’app : choisis MonCash, NatCash ou espèces, confirme avec le code reçu par SMS. L’équipe RAF valide la demande, puis l’argent est versé.' },
      { q: 'Y a-t-il des frais ou un minimum de retrait ?', a: 'Oui : un montant minimum, des frais et un plafond journalier s’appliquent. Leurs valeurs à jour sont affichées dans l’app au moment de la demande.' },
      { q: 'Que se passe-t-il si un quiz est annulé ?', a: 'Tous les tickets sont remboursés intégralement en crédits, automatiquement.' },
    ],
  },
  {
    id: 'securite',
    icon: 'shield',
    title: 'Sécurité et équité',
    items: [
      { q: 'Comment RAF empêche-t-il la triche ?', a: 'Chrono tenu par nos serveurs, tirage différent pour chaque joueur, corrigé gardé secret jusqu’à la fin, et détection automatique des comportements anormaux. Une partie frauduleuse est retirée du classement.' },
      { q: 'Quelqu’un peut-il retirer mes gains à ma place ?', a: 'Chaque retrait exige un code envoyé sur ton téléphone vérifié. Au guichet, l’argent n’est remis que sur présentation du code de remise reçu par SMS.' },
      { q: 'Mon compte est utilisé sur un autre appareil, que faire ?', a: 'Dans le Profil de l’app, ouvre « Appareils connectés » pour déconnecter les appareils inconnus, change ton mot de passe, puis contacte-nous.' },
    ],
  },
];

@Component({
  selector: 'raf-faq',
  imports: [RouterLink, IconComponent, PageHero, PlayCta, RevealDirective],
  template: `
    <page-hero
      icon="question"
      kicker="Aide"
      title="Questions fréquentes"
      lead="Les réponses aux questions que se posent les joueurs, du premier crédit au premier retrait."
    />

    <section class="section">
      <div class="container narrow">
        <nav reveal revealStagger class="jump" aria-label="Thèmes">
          @for (g of groups; track g.id) {
            <a class="chip-raf" routerLink="/faq" [fragment]="g.id"><raf-icon [name]="g.icon" [size]="20" /> {{ g.title }}</a>
          }
        </nav>

        @for (g of groups; track g.id) {
          <section class="group" [id]="g.id">
            <h2 reveal class="h2 group-title"><raf-icon [name]="g.icon" [size]="44" /> {{ g.title }}</h2>
            <div reveal revealStagger class="list">
              @for (f of g.items; track f.q) {
                <details class="item card-raf">
                  <summary>{{ f.q }}</summary>
                  <p>{{ f.a }}</p>
                </details>
              }
            </div>
          </section>
        }

        <p reveal class="more">
          Pas trouvé ta réponse ? Appelle-nous au <a [href]="site.phoneHref">{{ site.phone }}</a> ou écris-nous sur
          <a [href]="site.whatsappHref" target="_blank" rel="noopener">WhatsApp</a>.
        </p>
      </div>
    </section>

    <play-cta />
  `,
  styleUrl: './content.css',
  styles: `
    .jump { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 24px; }
    .group { padding-top: 40px; scroll-margin-top: 80px; }
    .group-title { display: flex; align-items: center; gap: 12px; max-width: none; margin-bottom: 18px; }
    .list { display: grid; gap: 12px; }
    .item { padding: 0; border-radius: 20px; }
    .item summary {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 22px;
      font-weight: 900;
      font-size: 1.08rem;
      cursor: pointer;
      list-style: none;
    }
    .item summary::-webkit-details-marker { display: none; }
    .item summary::after { content: '+'; font-family: var(--raf-font-display); font-size: 1.6rem; line-height: 1; color: var(--raf-primary); }
    .item[open] summary::after { content: '−'; }
    .item p { padding: 0 22px 20px; color: var(--raf-ink-soft); font-weight: 600; line-height: 1.65; }
    .more { margin-top: 48px; text-align: center; font-weight: 700; color: var(--raf-ink-soft); }
    .more a { color: var(--raf-edge-dark); font-weight: 900; text-decoration: underline; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FaqPage {
  protected readonly site = SITE;
  protected readonly groups = GROUPS;

  constructor() {
    pageDescription('Questions fréquentes sur RAF : compte, installation, déroulement des quiz, crédits, gains, retraits et sécurité.');
  }
}
