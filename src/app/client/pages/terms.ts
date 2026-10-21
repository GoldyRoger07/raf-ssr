import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SITE } from '../site';
import { DocPage, DocSection } from '../ui/doc';
import { pageDescription } from '../ui/page';

const SECTIONS: DocSection[] = [
  { id: 'acceptation', label: '1. Acceptation' },
  { id: 'service', label: '2. Le service' },
  { id: 'compte', label: '3. Ton compte' },
  { id: 'argent', label: '4. Crédits et gains' },
  { id: 'comportement', label: '5. Règles de conduite' },
  { id: 'suspension', label: '6. Suspension' },
  { id: 'disponibilite', label: '7. Disponibilité' },
  { id: 'responsabilite', label: '8. Responsabilité' },
  { id: 'propriete', label: '9. Propriété intellectuelle' },
  { id: 'evolution', label: '10. Évolution des conditions' },
  { id: 'contact', label: '11. Contact' },
];

@Component({
  selector: 'raf-terms',
  imports: [DocPage, RouterLink],
  template: `
    <doc-page
      icon="shield"
      title="Conditions d’utilisation"
      lead="Le cadre qui s’applique à tous les joueurs de RAF. Lis-le avant de créer ton compte."
      [sections]="sections"
    >
      <h2 id="acceptation">1. Acceptation</h2>
      <p>
        Les présentes conditions régissent l’utilisation de RAF, application de quiz éditée par {{ site.company }}. En créant
        un compte, tu déclares les avoir lues et acceptées, ainsi que les <a routerLink="/regles">règles du jeu</a> et la
        <a routerLink="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2 id="service">2. Le service</h2>
      <p>
        RAF propose des quiz de connaissances accessibles depuis un navigateur ou depuis l’application installée sur
        l’écran d’accueil. L’accès à certains quiz est payant, en crédits de jeu ; les joueurs les mieux classés, ou ceux
        qui réussissent un sans-faute en mode Solo, reçoivent des gains en gourdes, selon les règles du jeu.
      </p>

      <h2 id="compte">3. Ton compte</h2>
      <ul>
        <li>Tu dois avoir au moins {{ site.minimumAge }} ans pour créer un compte et jouer.</li>
        <li>Tu ne peux détenir qu’un seul compte, à ton nom, avec des informations exactes et à jour.</li>
        <li>
          Tu es responsable de la confidentialité de ton mot de passe et de l’activité de ton compte. Depuis l’app, tu peux
          voir les appareils connectés et les déconnecter.
        </li>
        <li>En cas d’utilisation non autorisée de ton compte, préviens-nous sans attendre.</li>
      </ul>

      <h2 id="argent">4. Crédits et gains</h2>
      <ul>
        <li>
          Les <strong>crédits</strong> s’achètent en gourdes et servent uniquement à jouer. Ils ne sont ni remboursables ni
          retirables, sauf remboursement prévu par les règles du jeu (annulation d’un quiz).
        </li>
        <li>
          Les <strong>gains</strong> sont tenus en gourdes sur un solde distinct et peuvent être retirés selon les conditions
          affichées dans l’app (montant minimum, frais, plafond journalier).
        </li>
        <li>
          Chaque mouvement d’argent est enregistré et consultable dans l’historique de ton Trésor. RAF peut vérifier une
          opération avant de la valider, notamment un retrait.
        </li>
        <li>Les éventuelles obligations fiscales liées à tes gains restent à ta charge.</li>
      </ul>

      <h2 id="comportement">5. Règles de conduite</h2>
      <p>En utilisant RAF, tu t’engages à ne pas :</p>
      <ul>
        <li>tricher, ou utiliser un programme ou un tiers pour jouer à ta place ;</li>
        <li>créer ou utiliser plusieurs comptes, ou utiliser le compte d’une autre personne ;</li>
        <li>diffuser les questions ou les réponses d’un quiz en cours ;</li>
        <li>perturber le service, tenter d’en contourner les protections ou d’accéder aux données d’autres joueurs ;</li>
        <li>utiliser RAF pour une activité illégale, notamment le blanchiment d’argent.</li>
      </ul>

      <h2 id="suspension">6. Suspension et fermeture</h2>
      <p>
        En cas de manquement à ces conditions ou aux règles du jeu, RAF peut invalider les parties concernées, suspendre ou
        fermer le compte, et retenir les gains obtenus de façon frauduleuse. Sauf urgence ou fraude, le joueur est informé
        de la mesure et peut présenter ses explications.
      </p>

      <h2 id="disponibilite">7. Disponibilité du service</h2>
      <p>
        RAF fait son possible pour que le service soit accessible en continu, sans pouvoir le garantir : des opérations de
        maintenance, des pannes ou des problèmes de réseau peuvent l’interrompre. Le chrono d’une partie est tenu par nos
        serveurs et continue de tourner pendant une coupure : nous recommandons de jouer avec une connexion stable.
      </p>

      <h2 id="responsabilite">8. Responsabilité</h2>
      <p>
        RAF n’est pas responsable des pertes liées à la qualité de ta connexion, à ton appareil ou à une utilisation non
        conforme du service. En cas d’incident technique imputable à RAF qui fausse un quiz, RAF peut annuler le quiz et
        rembourser les tickets.
      </p>

      <h2 id="propriete">9. Propriété intellectuelle</h2>
      <p>
        La marque RAF, le logo, l’application, les questions et l’ensemble des contenus sont la propriété de
        {{ site.company }} ou de ses partenaires. Toute reproduction sans autorisation est interdite.
      </p>

      <h2 id="evolution">10. Évolution des conditions</h2>
      <p>
        Ces conditions peuvent évoluer. La date de dernière mise à jour figure en haut de cette page. En cas de changement
        important, les joueurs en sont informés ; continuer à utiliser RAF vaut acceptation des nouvelles conditions.
      </p>

      <h2 id="contact">11. Contact</h2>
      <p>
        Une question, une réclamation ? Contacte-nous par téléphone au <a [href]="site.phoneHref">{{ site.phone }}</a> ou
        sur <a [href]="site.whatsappHref" target="_blank" rel="noopener">WhatsApp</a>.
      </p>
    </doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TermsPage {
  protected readonly site = SITE;
  protected readonly sections = SECTIONS;

  constructor() {
    pageDescription('Conditions d’utilisation de RAF : compte, crédits et gains, règles de conduite, suspension et responsabilités.');
  }
}
