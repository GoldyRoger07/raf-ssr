import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SITE } from '../site';
import { DocPage, DocSection } from '../ui/doc';
import { pageDescription } from '../ui/page';

const SECTIONS: DocSection[] = [
  { id: 'objet', label: '1. Objet' },
  { id: 'participation', label: '2. Qui peut jouer' },
  { id: 'credits', label: '3. Crédits et tickets' },
  { id: 'deroulement', label: '4. Déroulement d’un quiz' },
  { id: 'partie', label: '5. Déroulement d’une partie' },
  { id: 'classement', label: '6. Score et classement' },
  { id: 'recompenses', label: '7. Récompenses' },
  { id: 'solo', label: '8. Mode Solo' },
  { id: 'annulation', label: '9. Annulation' },
  { id: 'fair-play', label: '10. Fair-play' },
  { id: 'retraits', label: '11. Retraits' },
  { id: 'modifications', label: '12. Modifications' },
];

@Component({
  selector: 'raf-rules',
  imports: [DocPage, RouterLink],
  template: `
    <doc-page
      icon="trophy"
      title="Règles du jeu"
      lead="Les règles officielles des quiz RAF : comment on joue, comment on gagne, et comment on encaisse."
      [sections]="sections"
    >
      <h2 id="objet">1. Objet</h2>
      <p>
        RAF est un jeu-concours de connaissances édité par {{ site.company }}. Les joueurs répondent à des questions à choix
        multiples dans un temps limité. Selon le mode de jeu, les meilleurs joueurs d’un quiz (mode En groupe) ou les joueurs
        qui réussissent un sans-faute (mode Solo) reçoivent des gains en gourdes (HTG).
      </p>

      <h2 id="participation">2. Qui peut jouer</h2>
      <ul>
        <li>Toute personne âgée d’au moins {{ site.minimumAge }} ans, titulaire d’un compte RAF.</li>
        <li>Un seul compte par personne. Les informations du compte doivent être exactes.</li>
        <li>L’adresse email doit être confirmée pour acheter un ticket ou lancer une partie Solo.</li>
        <li>Le numéro de téléphone doit être vérifié pour retirer des gains.</li>
      </ul>

      <h2 id="credits">3. Crédits et tickets</h2>
      <p>
        Les <strong>crédits</strong> sont la monnaie du jeu. Ils s’achètent en gourdes ; la valeur d’un crédit en vigueur est
        affichée dans l’app. Les crédits servent uniquement à acheter des tickets et des parties Solo : ils ne sont pas
        convertibles en argent et ne peuvent pas être retirés.
      </p>
      <ul>
        <li>Un <strong>ticket</strong> donne droit à <strong>une</strong> partie d’un quiz En groupe.</li>
        <li>Le prix du ticket est fixé pour chaque quiz et affiché avant l’achat.</li>
        <li>Un quiz peut limiter le nombre de tickets par joueur et le nombre total de tickets vendus.</li>
        <li>Un ticket acheté n’est pas remboursable, sauf annulation du quiz (article 9).</li>
      </ul>

      <h2 id="deroulement">4. Déroulement d’un quiz En groupe</h2>
      <ol>
        <li>
          <strong>Annonce.</strong> Le quiz est publié avec son thème général, le prix du ticket, le nombre minimum de joueurs
          et les récompenses de chaque rang. La vente des tickets commence.
        </li>
        <li>
          <strong>Vote du sujet</strong> (si le quiz le prévoit). Seuls les détenteurs d’un ticket votent, une fois par quiz,
          pour un sujet parmi les propositions. À la clôture du vote, RAF annonce le sujet retenu.
        </li>
        <li>
          <strong>Démarrage.</strong> Lorsque le nombre minimum de joueurs est atteint, le démarrage est programmé après un
          délai annoncé.
        </li>
        <li>
          <strong>Quiz ouvert.</strong> Chaque joueur lance ses parties quand il le souhaite tant que le quiz est ouvert. La
          vente de tickets continue.
        </li>
        <li>
          <strong>Compte à rebours final.</strong> Dès qu’un joueur atteint le score seuil fixé pour le quiz, un compte à
          rebours de clôture démarre. Les parties lancées doivent être terminées avant la fin du temps imparti.
        </li>
        <li>
          <strong>Clôture.</strong> À la fin du compte à rebours, le classement est figé, les récompenses sont versées et le
          corrigé devient consultable par les joueurs.
        </li>
      </ol>

      <h2 id="partie">5. Déroulement d’une partie</h2>
      <ul>
        <li>
          Chaque partie comporte un nombre de questions fixé par le quiz, tirées au hasard pour chaque joueur dans une banque
          de questions. Deux joueurs ne reçoivent donc pas forcément les mêmes questions.
        </li>
        <li>
          Chaque question a son propre chrono. Le joueur passe à la question suivante dès qu’il répond. Une question à
          laquelle il n’a pas répondu avant la fin du chrono compte comme fausse.
        </li>
        <li>
          Le temps de référence est celui des serveurs de RAF. Le chrono continue de tourner en cas de coupure de réseau ou
          de fermeture de l’app ; la partie reprend à la question en cours lorsque le joueur revient.
        </li>
        <li>Pendant la partie, l’app n’indique pas si une réponse est juste. Une réponse validée ne peut pas être modifiée.</li>
      </ul>

      <h2 id="classement">6. Score et classement</h2>
      <ul>
        <li>Chaque bonne réponse rapporte le nombre de points fixé par le quiz. Une réponse fausse ou absente rapporte 0 point.</li>
        <li>Le score est calculé par les serveurs de RAF à partir des réponses enregistrées.</li>
        <li>Si un joueur a joué plusieurs parties sur un même quiz, seule sa meilleure partie compte au classement.</li>
        <li>
          En cas d’égalité de score, le joueur qui a lancé sa première partie du quiz le plus tôt est classé devant.
        </li>
      </ul>

      <h2 id="recompenses">7. Récompenses</h2>
      <ul>
        <li>Les récompenses sont définies par rang ou par tranche de rangs et affichées dans la fiche du quiz avant l’achat d’un ticket.</li>
        <li>Elles sont versées automatiquement, en gourdes, sur le <strong>solde de gains</strong> des joueurs classés, dès la clôture.</li>
        <li>Un rang récompensé qui n’est occupé par aucun joueur n’est pas versé.</li>
        <li>Les gains peuvent être retirés selon les conditions de l’article 11.</li>
      </ul>

      <h2 id="solo">8. Mode Solo</h2>
      <ul>
        <li>Le joueur paie sa partie en crédits au lancement ; aucun ticket n’est nécessaire.</li>
        <li>Une seule partie par sujet et par jour (jour civil, heure d’Haïti), tous quiz Solo confondus.</li>
        <li>
          Le <strong>sans-faute</strong> (toutes les questions justes) rapporte le prix annoncé du quiz, versé aussitôt sur le
          solde de gains. Toute autre partie ne rapporte rien.
        </li>
        <li>Le joueur sait immédiatement s’il a gagné. Le détail des réponses est consultable à la fermeture du quiz.</li>
        <li>Le mode Solo ne comporte ni classement ni récompense par rang.</li>
      </ul>

      <h2 id="annulation">9. Annulation d’un quiz</h2>
      <p>
        RAF peut annuler un quiz avant son démarrage, notamment si le nombre minimum de joueurs n’est pas atteint. En cas
        d’annulation, tous les tickets sont remboursés intégralement en crédits, automatiquement, et les joueurs sont prévenus.
      </p>

      <h2 id="fair-play">10. Fair-play et lutte contre la triche</h2>
      <p>RAF veille à ce que chaque joueur ait les mêmes chances. Sont notamment interdits :</p>
      <ul>
        <li>l’utilisation de plusieurs comptes, ou d’un compte appartenant à une autre personne ;</li>
        <li>l’usage de programmes, robots ou outils qui répondent à la place du joueur ;</li>
        <li>la diffusion des questions ou du corrigé pendant qu’un quiz est ouvert ;</li>
        <li>toute tentative de modifier le fonctionnement de l’app ou les données envoyées aux serveurs.</li>
      </ul>
      <p>
        Les parties présentant des anomalies (réponses incohérentes, temps de réponse impossibles…) sont automatiquement
        signalées et examinées. Une partie frauduleuse peut être invalidée, ce qui la retire du classement. En cas de fraude
        avérée, RAF peut suspendre le compte et refuser le versement des gains concernés.
      </p>

      <h2 id="retraits">11. Retraits des gains</h2>
      <ul>
        <li>Seul le solde de gains peut être retiré, vers MonCash, NatCash ou en espèces auprès d’un agent RAF.</li>
        <li>Le numéro de téléphone du joueur doit être vérifié. Chaque demande est confirmée par un code envoyé par SMS.</li>
        <li>
          Un montant minimum, des frais et un plafond journalier s’appliquent ; leurs valeurs en vigueur sont affichées dans
          l’app au moment de la demande.
        </li>
        <li>Chaque demande est vérifiée par l’équipe RAF avant le versement. Le joueur est averti de chaque étape.</li>
        <li>
          Pour un retrait en espèces, un code de remise est envoyé au joueur : l’argent n’est remis que sur présentation de ce code.
        </li>
      </ul>

      <h2 id="modifications">12. Modification des règles</h2>
      <p>
        RAF peut faire évoluer ces règles. Les règles applicables à un quiz sont celles en vigueur lors de sa publication.
        Pour toute question, consulte la <a routerLink="/faq">FAQ</a> ou contacte-nous au
        <a [href]="site.phoneHref">{{ site.phone }}</a>. L’utilisation de RAF est aussi régie par les
        <a routerLink="/conditions-utilisation">conditions d’utilisation</a>.
      </p>
    </doc-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RulesPage {
  protected readonly site = SITE;
  protected readonly sections = SECTIONS;

  constructor() {
    pageDescription(
      'Règles officielles de RAF : conditions de participation, crédits et tickets, déroulement des quiz, calcul du score, classement, récompenses, mode Solo et retraits.',
    );
  }
}
