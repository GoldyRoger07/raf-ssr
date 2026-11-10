/*
 * Contenu du guide d'aide (/aide), en francais et en creole haitien.
 *
 * Chaque sujet est un petit parcours : des questions (Android ou iPhone ? adresse
 * correcte ?) menent a des etapes courtes, suivies de « Ca a marche ? ». En cas
 * d'echec, on passe a la piste suivante, puis a un agent sur WhatsApp.
 *
 * Les libelles des ecrans (« Corriger », « Mot de passe oublié ? »...) restent en
 * francais entre « » dans les deux langues : c'est ce que le joueur voit a l'ecran.
 *
 * Images : `image: 'img/aide/<fichier>'` sur une etape, une question ou une fin de
 * parcours (fichiers dans public/img/aide/). Les app-*.webp sont de vraies captures
 * de l'app ; les .svg sont des schemas des ecrans du telephone (Chrome, Safari,
 * Gmail, Reglages), a remplacer par de vraies captures quand on les aura.
 */

export type Lang = 'fr' | 'ht';
export type Text = Record<Lang, string>;
export type Device = 'android' | 'iphone';

function t(fr: string, ht: string): Text {
  return { fr, ht };
}

export interface HelpStep {
  text: Text;
  image?: string;
}

/** Bouton sous les etapes : 'app' = app joueur, '/aide/...' = autre sujet du guide. */
export interface HelpLink {
  label: Text;
  to: 'app' | `/aide/${string}`;
}

export interface HelpOption {
  label: Text;
  next: string;
  /** Telephone choisi, repris dans le message WhatsApp a l'agent. */
  device?: Device;
}

export type HelpNode =
  | { kind: 'question'; title: Text; hint?: Text; image?: string; options: HelpOption[] }
  | {
      kind: 'steps';
      title: Text;
      hint?: Text;
      steps: HelpStep[];
      link?: HelpLink;
      /** Etape suivante si ca a marche ('done' : c'est regle). */
      ok: string;
      okLabel?: Text;
      /** Etape suivante sinon ('contact' : un agent prend le relais). */
      ko: string;
      koLabel?: Text;
    }
  | { kind: 'done'; title: Text; text: Text; image?: string; link?: HelpLink };

export interface HelpTopic {
  id: string;
  icon: string;
  title: Text;
  summary: Text;
  start: string;
  /** Premiere etape quand le telephone est deja connu (?appareil=, ou detecte). */
  startByDevice?: Record<Device, string>;
  nodes: Record<string, HelpNode>;
}

// --- Morceaux communs ------------------------------------------------------------

const DONE: HelpNode = {
  kind: 'done',
  title: t('Super, c’est réglé !', 'Bravo, sa regle !'),
  text: t('Tu peux retourner jouer sur RAF.', 'Ou ka retounen jwe sou RAF.'),
  link: { label: t('Ouvrir RAF', 'Ouvri RAF'), to: 'app' },
};

const DEVICE_QUESTION = (android: string, iphone: string): HelpNode => ({
  kind: 'question',
  title: t('Quel téléphone as-tu ?', 'Ki telefòn ou genyen ?'),
  hint: t(
    'Une pomme derrière le téléphone = iPhone. Samsung, Tecno, Infinix, Itel, Xiaomi… = Android.',
    'Yon pòm dèyè telefòn nan = iPhone. Samsung, Tecno, Infinix, Itel, Xiaomi… = Android.',
  ),
  options: [
    { label: t('Android', 'Android'), next: android, device: 'android' },
    { label: t('iPhone', 'iPhone'), next: iphone, device: 'iphone' },
  ],
});

const PROFILE_STEP: HelpStep = { text: t('Dans RAF, touche « Profil » (en bas à droite).', 'Nan RAF, peze sou « Profil » (anba a dwat).') };

function spamNode(ko: string): HelpNode {
  return {
    kind: 'steps',
    title: t('Regarder dans les spams', 'Gade nan spam yo'),
    hint: t('Parfois, l’email arrive au mauvais endroit.', 'Pafwa, imèl la tonbe nan move kote.'),
    steps: [
      {
        text: t(
          'Gmail : touche les 3 traits ☰ en haut à gauche, puis « Spam ». Regarde aussi « Promotions ».',
          'Gmail : peze sou 3 ti liy ☰ anlè a goch, epi « Spam ». Gade tou nan « Promotions ».',
        ),
        image: 'img/aide/gmail-spam.svg',
      },
      {
        text: t(
          'Yahoo, Outlook, Hotmail : ouvre le dossier « Spam » ou « Courrier indésirable ».',
          'Yahoo, Outlook, Hotmail : ouvri dosye « Spam » oswa « Courrier indésirable » lan.',
        ),
      },
      {
        text: t(
          'Tu l’as trouvé ? Touche « Non spam », puis le lien dans l’email.',
          'Ou jwenn li ? Peze « Non spam », epi peze sou lyen ki nan imèl la.',
        ),
      },
    ],
    ok: 'done',
    ko,
    koLabel: t('Il n’y est pas', 'Li pa la'),
  };
}

// --- Sujets --------------------------------------------------------------------------

const EMAIL: HelpTopic = {
  id: 'email',
  icon: 'mail',
  title: t('Je n’ai pas reçu l’email de confirmation', 'Mwen pa resevwa imèl konfimasyon an'),
  summary: t('Trouver l’email, corriger une adresse mal écrite.', 'Jwenn imèl la, korije yon adrès ki mal ekri.'),
  start: 'check-address',
  nodes: {
    'check-address': {
      kind: 'question',
      title: t('D’abord, vérifions ton adresse email.', 'Anvan tout bagay, ann tcheke adrès imèl ou.'),
      hint: t(
        'Dans RAF, touche « Profil ». Ton adresse est écrite dans « Mon compte ». Compare-la lettre par lettre avec ta vraie adresse : gmail et pas gmial, .com et pas .co.',
        'Nan RAF, peze sou « Profil ». Adrès ou ekri nan « Mon compte ». Konpare l lèt pa lèt ak vrè adrès ou : gmail epi pa gmial, .com epi pa .co.',
      ),
      image: 'img/aide/app-email-profil.webp',
      options: [
        { label: t('Elle est correcte', 'Li kòrèk'), next: 'can-open' },
        { label: t('Elle est fausse', 'Li pa bon'), next: 'fix-address' },
        { label: t('Je ne connais pas mon adresse', 'Mwen pa konnen adrès mwen'), next: 'unknown-address' },
      ],
    },
    'unknown-address': {
      kind: 'steps',
      title: t('Retrouver ton adresse email', 'Jwenn adrès imèl ou'),
      steps: [
        {
          text: t(
            'Sur Android : ouvre « Paramètres », puis « Comptes » ou « Google ». Ton adresse Gmail est écrite là.',
            'Sou Android : ouvri « Paramètres », epi « Comptes » oswa « Google ». Adrès Gmail ou ekri la.',
          ),
        },
        {
          text: t(
            'Sur iPhone : ouvre l’application Mail ou Gmail. Ton adresse apparaît en haut ou dans le menu.',
            'Sou iPhone : ouvri aplikasyon Mail oswa Gmail. Adrès ou parèt anlè oswa nan meni an.',
          ),
        },
        {
          text: t(
            'Une adresse ressemble à ça : prenom.nom@gmail.com. Pas d’espace, pas d’accent.',
            'Yon adrès sanble ak sa : prenon.non@gmail.com. Pa gen espas, pa gen aksan.',
          ),
        },
        {
          text: t(
            'Tu n’as pas d’adresse email ? Un agent RAF peut t’aider à en créer une.',
            'Ou pa gen adrès imèl ? Yon ajan RAF ka ede w kreye youn.',
          ),
        },
      ],
      ok: 'check-address',
      okLabel: t('J’ai trouvé mon adresse', 'Mwen jwenn adrès mwen'),
      ko: 'contact',
      koLabel: t('Je n’y arrive pas', 'Mwen pa rive'),
    },
    'fix-address': {
      kind: 'steps',
      title: t('Corriger ton adresse', 'Korije adrès ou'),
      steps: [
        PROFILE_STEP,
        { text: t('À côté de ton email, touche « Corriger ».', 'Bò kote imèl ou, peze « Corriger ».'), image: 'img/aide/app-email-profil.webp' },
        { text: t('Écris la bonne adresse, puis ton mot de passe RAF.', 'Ekri bon adrès la, epi modpas RAF ou.') },
        {
          text: t(
            'Touche « Enregistrer et renvoyer le lien ». Un nouvel email part vers la bonne adresse.',
            'Peze « Enregistrer et renvoyer le lien ». Yon nouvo imèl ap pati nan bon adrès la.',
          ),
          image: 'img/aide/app-email-corriger.webp',
        },
      ],
      ok: 'can-open',
      okLabel: t('C’est fait', 'Mwen fè l'),
      ko: 'contact',
      koLabel: t('Je n’y arrive pas', 'Mwen pa rive'),
    },
    'can-open': {
      kind: 'question',
      title: t('Sais-tu ouvrir ta boîte mail sur ce téléphone ?', 'Èske ou konn ouvri bwat imèl ou sou telefòn sa a ?'),
      options: [
        { label: t('Oui', 'Wi'), next: 'find' },
        { label: t('Non, montre-moi', 'Non, montre m'), next: 'open-mail' },
      ],
    },
    'open-mail': {
      kind: 'steps',
      title: t('Ouvrir ta boîte mail', 'Ouvri bwat imèl ou'),
      steps: [
        {
          text: t(
            'Ta boîte mail, c’est ta boîte aux lettres dans le téléphone. RAF y a déposé un message pour toi.',
            'Bwat imèl ou, se bwat lèt ou nan telefòn nan. RAF mete yon mesaj ladan l pou ou.',
          ),
        },
        {
          text: t(
            'Adresse en @gmail.com : ouvre l’application Gmail, le « M » rouge, bleu, jaune et vert. Elle est déjà sur la plupart des Android.',
            'Adrès ki fini ak @gmail.com : ouvri aplikasyon Gmail la, « M » wouj, ble, jòn ak vèt la. Li deja sou pifò telefòn Android.',
          ),
        },
        {
          text: t(
            'Pas d’application ? Ouvre Chrome ou Safari et va sur gmail.com (ou yahoo.com, outlook.com).',
            'Pa gen aplikasyon an ? Ouvri Chrome oswa Safari epi ale sou gmail.com (oswa yahoo.com, outlook.com).',
          ),
        },
        {
          text: t(
            'Connecte-toi avec ton adresse et le mot de passe de ton email. Ce n’est pas forcément celui de RAF.',
            'Konekte ak adrès ou ak modpas imèl ou. Se pa fòseman menm modpas ak RAF la.',
          ),
        },
      ],
      ok: 'find',
      okLabel: t('Ma boîte mail est ouverte', 'Bwat imèl mwen louvri'),
      ko: 'contact',
      koLabel: t('Je n’y arrive pas', 'Mwen pa rive'),
    },
    find: {
      kind: 'steps',
      title: t('Trouver l’email de RAF', 'Jwenn imèl RAF la'),
      steps: [
        {
          text: t(
            'Dans ta boîte mail, touche la barre « Rechercher » en haut et écris RAF.',
            'Nan bwat imèl ou, peze sou ba « Rechercher » anlè a epi ekri RAF.',
          ),
          image: 'img/aide/gmail-recherche.svg',
        },
        {
          text: t(
            'Ouvre l’email de RAF. Saisis le code à 6 chiffres dans l’app RAF, ou touche le lien de confirmation : l’un ou l’autre suffit.',
            'Ouvri imèl RAF la. Antre kòd 6 chif la nan aplikasyon RAF la, oswa peze sou lyen konfimasyon an : youn ou lòt ase.',
          ),
        },
        {
          text: t(
            'RAF affiche « Email confirmé ». C’est terminé.',
            'RAF ap ekri « Email confirmé ». Ou fini.',
          ),
          image: 'img/aide/app-email-confirme.webp',
        },
      ],
      ok: 'done',
      ko: 'spam',
      koLabel: t('Je ne trouve pas l’email', 'Mwen pa jwenn imèl la'),
    },
    spam: spamNode('resend'),
    resend: {
      kind: 'steps',
      title: t('Recevoir un nouvel email', 'Resevwa yon nouvo imèl'),
      steps: [
        PROFILE_STEP,
        { text: t('À côté de ton email, touche « Renvoyer ».', 'Bò kote imèl ou, peze « Renvoyer ».'), image: 'img/aide/app-email-profil.webp' },
        {
          text: t(
            'Attends 5 minutes, puis cherche encore RAF dans ta boîte mail et dans les spams.',
            'Tann 5 minit, epi chèche RAF ankò nan bwat imèl ou ak nan spam yo.',
          ),
        },
        {
          text: t(
            'Le code ou le lien ne marche plus ? Utilise ceux du dernier email reçu : chaque nouvel email annule le précédent.',
            'Kòd la oswa lyen an pa mache ankò ? Sèvi ak sa ki nan dènye imèl ou resevwa a : chak nouvo imèl anile ansyen an.',
          ),
        },
      ],
      ok: 'done',
      ko: 'contact',
    },
    done: DONE,
  },
};

const INSTALLED: HelpNode = {
  kind: 'done',
  title: t('RAF est installée !', 'RAF enstale !'),
  text: t(
    'À partir de maintenant, ouvre RAF depuis son icône sur l’écran d’accueil. C’est comme ça que les notifications fonctionnent.',
    'Depi kounye a, ouvri RAF nan ikòn li sou ekran dakèy la. Se konsa notifikasyon yo mache.',
  ),
  image: 'img/aide/icone-ecran-accueil.svg',
  link: { label: t('Activer les notifications', 'Aktive notifikasyon yo'), to: '/aide/notifications' },
};

const INSTALL: HelpTopic = {
  id: 'installer',
  icon: 'phone',
  title: t('Installer l’application RAF', 'Enstale aplikasyon RAF la'),
  summary: t('Mettre RAF sur l’écran d’accueil du téléphone.', 'Mete RAF sou ekran dakèy telefòn ou.'),
  start: 'device',
  startByDevice: { android: 'android', iphone: 'iphone' },
  nodes: {
    device: DEVICE_QUESTION('android', 'iphone'),
    android: {
      kind: 'steps',
      title: t('Installer sur Android', 'Enstale sou Android'),
      steps: [
        {
          text: t(
            'Ouvre RAF dans Chrome : touche le bouton « Ouvrir RAF » ci-dessous, ou écris app.rafhaiti.com.',
            'Ouvri RAF nan Chrome : peze bouton « Ouvri RAF » ki anba a, oswa ekri app.rafhaiti.com.',
          ),
        },
        { text: t('Touche les 3 petits points ⋮ en haut à droite.', 'Peze sou 3 ti pwen ⋮ anlè a dwat.') },
        {
          text: t(
            'Choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
            'Chwazi « Installer l’application » oswa « Ajouter à l’écran d’accueil ».',
          ),
          image: 'img/aide/android-chrome-menu.svg',
        },
        {
          text: t(
            'Touche « Installer ». L’icône RAF apparaît avec tes autres applications.',
            'Peze « Installer ». Ikòn RAF la parèt ak lòt aplikasyon ou yo.',
          ),
          image: 'img/aide/android-installer.svg',
        },
      ],
      link: { label: t('Ouvrir RAF', 'Ouvri RAF'), to: 'app' },
      ok: 'installed',
      ko: 'android-trouble',
      koLabel: t('Je ne vois pas « Installer »', 'Mwen pa wè « Installer »'),
    },
    'android-trouble': {
      kind: 'steps',
      title: t('L’option « Installer » n’apparaît pas', 'Opsyon « Installer » lan pa parèt'),
      steps: [
        {
          text: t(
            'Tu as ouvert le lien depuis WhatsApp ou Facebook ? Touche ⋮ puis « Ouvrir dans Chrome ».',
            'Ou louvri lyen an nan WhatsApp oswa Facebook ? Peze ⋮ epi « Ouvrir dans Chrome ».',
          ),
        },
        {
          text: t(
            'Mets Chrome à jour : ouvre Play Store, cherche Chrome, touche « Mettre à jour ».',
            'Mete Chrome ajou : ouvri Play Store, chèche Chrome, peze « Mettre à jour ».',
          ),
        },
        { text: t('Recommence les étapes dans Chrome.', 'Rekòmanse etap yo nan Chrome.') },
        {
          text: t(
            'Même sans installer, tu peux jouer dans Chrome : tout fonctionne.',
            'Menm si ou pa enstale l, ou ka jwe nan Chrome : tout bagay mache.',
          ),
        },
      ],
      ok: 'installed',
      ko: 'contact',
    },
    iphone: {
      kind: 'steps',
      title: t('Installer sur iPhone', 'Enstale sou iPhone'),
      hint: t(
        'Sur iPhone, ça marche seulement avec Safari (la boussole bleue).',
        'Sou iPhone, sa mache sèlman ak Safari (bousòl ble a).',
      ),
      steps: [
        { text: t('Ouvre Safari et va sur app.rafhaiti.com.', 'Ouvri Safari epi ale sou app.rafhaiti.com.') },
        {
          text: t(
            'Touche le bouton Partager : le carré avec une flèche vers le haut, en bas de l’écran.',
            'Peze bouton Pataje a : kare ki gen yon flèch k ap monte a, anba ekran an.',
          ),
          image: 'img/aide/iphone-safari-partager.svg',
        },
        {
          text: t(
            'Fais glisser la liste vers le haut et choisis « Sur l’écran d’accueil ».',
            'Fè lis la monte epi chwazi « Sur l’écran d’accueil ».',
          ),
          image: 'img/aide/iphone-sur-ecran-accueil.svg',
        },
        {
          text: t(
            'Touche « Ajouter » en haut à droite. L’icône RAF apparaît sur ton écran.',
            'Peze « Ajouter » anlè a dwat. Ikòn RAF la parèt sou ekran ou.',
          ),
          image: 'img/aide/iphone-ajouter.svg',
        },
      ],
      link: { label: t('Ouvrir RAF', 'Ouvri RAF'), to: 'app' },
      ok: 'installed',
      ko: 'iphone-trouble',
      koLabel: t('Ça ne marche pas', 'Sa pa mache'),
    },
    'iphone-trouble': {
      kind: 'steps',
      title: t('Ça ne marche pas sur iPhone', 'Sa pa mache sou iPhone'),
      steps: [
        {
          text: t(
            'Tu es dans Chrome, WhatsApp ou Facebook ? Copie le lien app.rafhaiti.com et colle-le dans Safari.',
            'Ou nan Chrome, WhatsApp oswa Facebook ? Kopye lyen app.rafhaiti.com epi kole l nan Safari.',
          ),
        },
        {
          text: t(
            'Tu ne vois pas le bouton Partager ? Touche le bas de l’écran pour faire revenir la barre.',
            'Ou pa wè bouton Pataje a ? Peze anba ekran an pou ba a tounen.',
          ),
        },
        {
          text: t(
            '« Sur l’écran d’accueil » n’est pas dans la liste ? Descends tout en bas, ou touche « Modifier les actions ».',
            '« Sur l’écran d’accueil » pa nan lis la ? Desann jis anba, oswa peze « Modifier les actions ».',
          ),
        },
      ],
      ok: 'installed',
      ko: 'contact',
    },
    installed: INSTALLED,
  },
};

const ENABLE_STEPS = (first: HelpStep): HelpStep[] => [
  first,
  { text: t('Touche « Profil », puis « Notifications ».', 'Peze « Profil », epi « Notifications ».'), image: 'img/aide/app-notif-profil.webp' },
  { text: t('Active « Notifications push ».', 'Aktive « Notifications push ».') },
  { text: t('Une fenêtre s’ouvre : touche « Autoriser ».', 'Yon fenèt ap louvri : peze « Autoriser ».'), image: 'img/aide/notif-autoriser.svg' },
];

const NOTIFICATIONS: HelpTopic = {
  id: 'notifications',
  icon: 'bell',
  title: t('Activer les notifications', 'Aktive notifikasyon yo'),
  summary: t('Être prévenu des quiz, des résultats et des gains.', 'Resevwa alèt pou quiz yo, rezilta yo ak sa ou genyen.'),
  start: 'device',
  startByDevice: { android: 'android', iphone: 'iphone-installed' },
  nodes: {
    device: DEVICE_QUESTION('android', 'iphone-installed'),
    android: {
      kind: 'steps',
      title: t('Activer sur Android', 'Aktive sou Android'),
      hint: t(
        'Conseil : installe RAF d’abord, les notifications marchent mieux.',
        'Konsèy : enstale RAF anvan, notifikasyon yo mache pi byen.',
      ),
      steps: ENABLE_STEPS({
        text: t('Ouvre RAF (depuis son icône si elle est installée).', 'Ouvri RAF (nan ikòn li si li enstale).'),
      }),
      link: { label: t('Installer RAF d’abord', 'Enstale RAF anvan'), to: '/aide/installer' },
      ok: 'done',
      ko: 'android-blocked',
      koLabel: t('C’est écrit « Bloquées »', 'Li ekri « Bloquées »'),
    },
    'android-blocked': {
      kind: 'steps',
      title: t('Débloquer les notifications', 'Debloke notifikasyon yo'),
      steps: [
        {
          text: t(
            'Ouvre Chrome, touche ⋮ puis « Paramètres » → « Paramètres des sites » → « Notifications ».',
            'Ouvri Chrome, peze ⋮ epi « Paramètres » → « Paramètres des sites » → « Notifications ».',
          ),
        },
        { text: t('Touche app.rafhaiti.com et choisis « Autoriser ».', 'Peze app.rafhaiti.com epi chwazi « Autoriser ».') },
        {
          text: t(
            'Vérifie aussi que le mode « Ne pas déranger » du téléphone est désactivé.',
            'Tcheke tou mòd « Ne pas déranger » telefòn nan pa aktive.',
          ),
        },
        {
          text: t('Reviens dans RAF et réessaie : « Profil » → « Notifications ».', 'Retounen nan RAF epi eseye ankò : « Profil » → « Notifications ».'),
        },
      ],
      ok: 'done',
      ko: 'contact',
    },
    'iphone-installed': {
      kind: 'question',
      title: t('RAF est-elle installée sur ton écran d’accueil ?', 'Èske RAF enstale sou ekran dakèy ou ?'),
      hint: t(
        'Sur iPhone, les notifications marchent seulement si RAF est installée.',
        'Sou iPhone, notifikasyon yo mache sèlman si RAF enstale.',
      ),
      options: [
        { label: t('Oui', 'Wi'), next: 'iphone-version' },
        { label: t('Non', 'Non'), next: 'iphone-install-first' },
      ],
    },
    'iphone-install-first': {
      kind: 'done',
      title: t('Installe RAF d’abord', 'Enstale RAF anvan'),
      text: t(
        'Sans installation, l’iPhone n’envoie pas les notifications. Installe RAF, puis reviens ici.',
        'Si RAF pa enstale, iPhone nan pa voye notifikasyon. Enstale RAF, epi tounen isit la.',
      ),
      link: { label: t('Installer RAF sur iPhone', 'Enstale RAF sou iPhone'), to: '/aide/installer' },
    },
    'iphone-version': {
      kind: 'steps',
      title: t('Vérifier la version de l’iPhone', 'Tcheke vèsyon iPhone nan'),
      steps: [
        {
          text: t(
            'Ouvre « Réglages » → « Général » → « Informations ». Regarde « Version iOS ».',
            'Ouvri « Réglages » → « Général » → « Informations ». Gade « Version iOS ».',
          ),
        },
        {
          text: t('Il faut la version 16.4 ou plus récente.', 'Fò l gen vèsyon 16.4 oswa pi nouvo.'),
        },
        {
          text: t(
            'Plus ancienne ? Va dans « Réglages » → « Général » → « Mise à jour logicielle ».',
            'Pi ansyen ? Ale nan « Réglages » → « Général » → « Mise à jour logicielle ».',
          ),
        },
      ],
      ok: 'iphone-enable',
      okLabel: t('Mon iPhone est à jour', 'iPhone mwen ajou'),
      ko: 'iphone-old',
      koLabel: t('Je ne peux pas le mettre à jour', 'Mwen pa ka mete l ajou'),
    },
    'iphone-old': {
      kind: 'done',
      title: t('Pas de notifications sur cet iPhone', 'Pa gen notifikasyon sou iPhone sa a'),
      text: t(
        'Cet iPhone est trop ancien pour les notifications. Ce n’est pas grave : toutes tes alertes restent dans l’onglet « Alertes » de RAF.',
        'iPhone sa a twò ansyen pou notifikasyon. Sa pa grav : tout alèt ou yo rete nan onglè « Alertes » RAF la.',
      ),
      link: { label: t('Ouvrir RAF', 'Ouvri RAF'), to: 'app' },
    },
    'iphone-enable': {
      kind: 'steps',
      title: t('Activer sur iPhone', 'Aktive sou iPhone'),
      steps: ENABLE_STEPS({
        text: t(
          'Ouvre RAF depuis son icône sur l’écran d’accueil (pas depuis Safari).',
          'Ouvri RAF nan ikòn li sou ekran dakèy la (pa nan Safari).',
        ),
      }),
      ok: 'done',
      ko: 'iphone-blocked',
      koLabel: t('Ça ne marche pas', 'Sa pa mache'),
    },
    'iphone-blocked': {
      kind: 'steps',
      title: t('Débloquer les notifications', 'Debloke notifikasyon yo'),
      steps: [
        { text: t('Ouvre « Réglages » sur l’iPhone, puis « Notifications ».', 'Ouvri « Réglages » nan iPhone nan, epi « Notifications ».') },
        { text: t('Touche RAF dans la liste.', 'Peze RAF nan lis la.') },
        { text: t('Active « Autoriser les notifications ».', 'Aktive « Autoriser les notifications ».'), image: 'img/aide/iphone-reglages-notif.svg' },
        {
          text: t('Reviens dans RAF et réessaie : « Profil » → « Notifications ».', 'Retounen nan RAF epi eseye ankò : « Profil » → « Notifications ».'),
        },
      ],
      ok: 'done',
      ko: 'contact',
    },
    done: DONE,
  },
};

const PASSWORD: HelpTopic = {
  id: 'mot-de-passe',
  icon: 'key',
  title: t('J’ai oublié mon mot de passe', 'Mwen bliye modpas mwen'),
  summary: t('Choisir un nouveau mot de passe.', 'Chwazi yon nouvo modpas.'),
  start: 'reset',
  nodes: {
    reset: {
      kind: 'steps',
      title: t('Choisir un nouveau mot de passe', 'Chwazi yon nouvo modpas'),
      steps: [
        {
          text: t(
            'Ouvre RAF. Sur l’écran de connexion, touche « Mot de passe oublié ? ».',
            'Ouvri RAF. Sou ekran koneksyon an, peze « Mot de passe oublié ? ».',
          ),
          image: 'img/aide/app-connexion-mdp.webp',
        },
        { text: t('Écris ton adresse email et valide.', 'Ekri adrès imèl ou epi valide.') },
        { text: t('Ouvre l’email de RAF et touche le lien.', 'Ouvri imèl RAF la epi peze sou lyen an.') },
        {
          text: t('Choisis un nouveau mot de passe (8 caractères minimum).', 'Chwazi yon nouvo modpas (omwen 8 karaktè).'),
        },
      ],
      link: { label: t('Ouvrir RAF', 'Ouvri RAF'), to: 'app' },
      ok: 'done',
      ko: 'spam',
      koLabel: t('Je n’ai pas reçu l’email', 'Mwen pa resevwa imèl la'),
    },
    spam: spamNode('contact'),
    done: DONE,
  },
};

export const HELP_TOPICS: HelpTopic[] = [EMAIL, INSTALL, NOTIFICATIONS, PASSWORD];

export function findTopic(id: string | null): HelpTopic | undefined {
  return HELP_TOPICS.find((topic) => topic.id === id);
}

/** Textes de l'interface du guide. */
export const UI = {
  pageTitle: t('Aide', 'Èd'),
  pageLead: t(
    'Choisis ton problème : on te guide pas à pas. Si tu restes bloqué, un agent RAF t’aide sur WhatsApp.',
    'Chwazi pwoblèm ou : n ap gide w etap pa etap. Si ou toujou bloke, yon ajan RAF ap ede w sou WhatsApp.',
  ),
  otherTitle: t('Autre problème', 'Lòt pwoblèm'),
  otherSummary: t('Parler directement à un agent RAF.', 'Pale dirèkteman ak yon ajan RAF.'),
  worked: t('Ça a marché ?', 'Sa mache ?'),
  yes: t('Oui, c’est réglé', 'Wi, sa regle'),
  no: t('Non, toujours bloqué', 'Non, mwen toujou bloke'),
  back: t('Retour', 'Retounen'),
  restart: t('Recommencer', 'Rekòmanse'),
  allTopics: t('Tous les sujets', 'Tout sijè yo'),
  otherPhone: t('Ce n’est pas mon téléphone', 'Se pa telefòn mwen'),
  step: t('Étape', 'Etap'),
  contactTitle: t('Un agent RAF va t’aider', 'Yon ajan RAF ap ede w'),
  contactText: t(
    'Touche le bouton : WhatsApp s’ouvre avec un message déjà prêt. L’agent saura tout de suite quel est ton problème.',
    'Peze bouton an : WhatsApp ap louvri ak yon mesaj ki deja pare. Ajan an ap konnen touswit ki pwoblèm ou genyen.',
  ),
  whatsapp: t('Écrire sur WhatsApp', 'Ekri sou WhatsApp'),
  call: t('Appeler', 'Rele'),
  hello: t('Bonjour RAF, j’ai besoin d’aide.', 'Bonjou RAF, mwen bezwen èd.'),
  topicLabel: t('Sujet', 'Sijè'),
  deviceLabel: t('Téléphone', 'Telefòn'),
  stuckLabel: t('Bloqué à', 'Mwen bloke nan'),
};
