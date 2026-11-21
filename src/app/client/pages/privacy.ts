import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SITE } from '../site';
import { DocPage, DocSection } from '../ui/doc';
import { pageDescription } from '../ui/page';
import { TPipe } from '../i18n';

const SECTIONS: DocSection[] = [
  { id: 'donnees', label: '1. Données collectées' },
  { id: 'usages', label: '2. Pourquoi' },
  { id: 'partage', label: '3. Avec qui' },
  { id: 'securite', label: '4. Sécurité' },
  { id: 'conservation', label: '5. Conservation' },
  { id: 'droits', label: '6. Tes droits' },
  { id: 'notifications', label: '7. Notifications' },
];

@Component({
  selector: 'raf-privacy',
  imports: [TPipe, DocPage],
  template: `
    <doc-page
      icon="lock"
      title="Confidentialité"
      lead="Quelles données RAF utilise, pourquoi, et comment tu gardes la main dessus."
      [sections]="sections"
    >
      <h2 id="donnees">{{ '1. Les données que nous collectons' | t }}</h2>
      <ul>
        <li><strong>{{ 'Ton compte' | t }}</strong> {{ ': nom, prénom, adresse email, numéro de téléphone et mot de passe.' | t }}</li>
        <li><strong>{{ 'Ton activité de jeu' | t }}</strong> {{ ': tickets, votes, parties, réponses, scores et classements.' | t }}</li>
        <li><strong>{{ 'Ton argent' | t }}</strong> {{ ': recharges, achats, gains, demandes de retrait et numéros de réception indiqués.' | t }}</li>
        <li>
          <strong>{{ 'Données techniques' | t }}</strong> {{ ': adresse IP et type d’appareil lors des connexions et des parties, appareils connectés à ton compte, abonnements aux notifications.' | t }}
        </li>
      </ul>

      <h2 id="usages">{{ '2. Pourquoi nous les utilisons' | t }}</h2>
      <ul>
        <li>{{ 'créer et sécuriser ton compte, et te reconnaître à chaque connexion ;' | t }}</li>
        <li>{{ 'faire fonctionner les quiz, calculer les scores et établir les classements ;' | t }}</li>
        <li>{{ 'tenir tes soldes, verser tes gains et traiter tes retraits ;' | t }}</li>
        <li>{{ 'détecter et empêcher la triche et la fraude ;' | t }}</li>
        <li>{{ 't’envoyer les messages utiles : codes de vérification, résultats, gains, retraits ;' | t }}</li>
        <li>{{ 'respecter nos obligations légales et comptables.' | t }}</li>
      </ul>
      <p>{{ 'Nous ne vendons pas tes données personnelles.' | t }}</p>

      <h2 id="partage">{{ '3. Avec qui nous les partageons' | t }}</h2>
      <p>{{ 'Uniquement avec les prestataires nécessaires au service, et pour ce seul usage :' | t }}</p>
      <ul>
        <li>{{ 'les opérateurs de paiement (MonCash, NatCash) pour exécuter tes recharges et tes retraits ;' | t }}</li>
        <li>{{ 'nos prestataires d’envoi d’emails et de SMS, pour les codes et les avis ;' | t }}</li>
        <li>{{ 'nos hébergeurs, qui stockent les données de l’application ;' | t }}</li>
        <li>{{ 'les autorités, lorsque la loi nous y oblige.' | t }}</li>
      </ul>
      <p>
        {{ 'Au classement d’un quiz terminé, les autres joueurs voient ton prénom suivi de l’initiale de ton nom (par exemple « Jean D. »), ton score et ton gain éventuel, jamais ton email, ton téléphone ni tes soldes.' | t }}
      </p>

      <h2 id="securite">{{ '4. Sécurité' | t }}</h2>
      <p>
        {{ 'Les échanges avec l’application sont chiffrés. Ton mot de passe n’est jamais stocké en clair. Les opérations sensibles (retrait, retrait au guichet) exigent un code envoyé sur ton téléphone. Chaque mouvement d’argent est tracé et contrôlé.' | t }}
      </p>

      <h2 id="conservation">{{ '5. Durée de conservation' | t }}</h2>
      <p>
        {{ 'Tes données sont conservées tant que ton compte est actif. Après sa fermeture, les données liées aux transactions sont gardées pendant la durée exigée par nos obligations légales et comptables, puis supprimées.' | t }}
      </p>

      <h2 id="droits">{{ '6. Tes droits' | t }}</h2>
      <p>
        {{ 'Tu peux consulter et corriger tes informations depuis l’app, et demander à tout moment une copie de tes données ou la fermeture de ton compte en nous contactant au' | t }} <a [href]="site.phoneHref">{{ site.phone }}</a> {{ 'ou sur' | t }} <a [href]="site.whatsappHref" target="_blank" rel="noopener">WhatsApp</a>. {{ 'Les gains restant sur ton solde peuvent être retirés avant la fermeture.' | t }}
      </p>

      <h2 id="notifications">{{ '7. Notifications' | t }}</h2>
      <p>
        {{ 'Tu choisis les notifications que tu reçois, par email et par notification push, depuis le menu Alertes de l’app. Les messages indispensables (codes de vérification, sécurité du compte) restent toujours envoyés.' | t }}
      </p>
    </doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PrivacyPage {
  protected readonly site = SITE;
  protected readonly sections = SECTIONS;

  constructor() {
    pageDescription('Politique de confidentialité de RAF : données collectées, finalités, partage, sécurité, conservation et droits des joueurs.');
  }
}
