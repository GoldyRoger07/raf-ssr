import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SITE } from '../site';
import { DocPage, DocSection } from '../ui/doc';
import { pageDescription } from '../ui/page';

const SECTIONS: DocSection[] = [
  { id: 'principes', label: 'Nos principes' },
  { id: 'conseils', label: 'Nos conseils' },
  { id: 'signaux', label: 'Les signaux d’alerte' },
  { id: 'aide', label: 'Besoin d’aide ?' },
];

@Component({
  selector: 'raf-responsible',
  imports: [DocPage],
  template: `
    <doc-page
      icon="shield"
      title="Jeu responsable"
      lead="RAF doit rester un plaisir. Voici comment garder le contrôle."
      [sections]="sections"
    >
      <h2 id="principes">Nos principes</h2>
      <ul>
        <li>RAF est strictement réservé aux personnes de {{ site.minimumAge }} ans et plus.</li>
        <li>
          Les crédits sont séparés des gains : tu vois toujours clairement ce que tu as dépensé pour jouer et ce que tu as
          gagné.
        </li>
        <li>Les règles, les prix et les récompenses de chaque quiz sont affichés avant toute dépense.</li>
        <li>En mode Solo, une seule partie par sujet et par jour : pas de partie à répétition pour « se refaire ».</li>
      </ul>

      <h2 id="conseils">Nos conseils</h2>
      <ul>
        <li>Fixe-toi un budget avant de recharger, et n’y ajoute pas en cours de route.</li>
        <li>Ne joue que l’argent que tu peux te permettre de perdre. Jamais l’argent du loyer, de l’école ou de la nourriture.</li>
        <li>N’essaie pas de récupérer une perte en rachetant des tickets.</li>
        <li>Considère tes gains comme un bonus : retire-les plutôt que de les dépenser aussitôt.</li>
        <li>Fais des pauses. RAF est un jeu, pas un revenu.</li>
      </ul>

      <h2 id="signaux">Les signaux d’alerte</h2>
      <p>Parle-en à un proche, ou à nous, si tu te reconnais dans l’une de ces situations :</p>
      <ul>
        <li>tu dépenses plus que prévu, ou tu caches tes dépenses à ton entourage ;</li>
        <li>tu empruntes de l’argent pour jouer ;</li>
        <li>tu penses au jeu en permanence, ou tu te sens irritable quand tu ne peux pas jouer ;</li>
        <li>le jeu passe avant ton travail, tes études ou ta famille.</li>
      </ul>

      <h2 id="aide">Besoin d’aide ?</h2>
      <p>
        Si tu veux faire une pause ou fermer ton compte, contacte-nous au <a [href]="site.phoneHref">{{ site.phone }}</a> ou
        sur <a [href]="site.whatsappHref" target="_blank" rel="noopener">WhatsApp</a>. Nous traiterons ta demande sans
        jugement, et tu pourras retirer les gains restants sur ton solde.
      </p>
      <p class="note">
        Parents : ne laissez pas un mineur utiliser votre téléphone ou votre compte pour jouer, et gardez votre mot de passe
        pour vous.
      </p>
    </doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ResponsiblePage {
  protected readonly site = SITE;
  protected readonly sections = SECTIONS;

  constructor() {
    pageDescription('Jeu responsable sur RAF : réservé aux 18 ans et plus, conseils pour garder le contrôle et où trouver de l’aide.');
  }
}
