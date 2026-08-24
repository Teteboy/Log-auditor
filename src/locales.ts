export type Lang = 'en' | 'fr';

const STORAGE_KEY = 'log-monitor:lang';
const DEFAULT_LANG: Lang = 'fr';

export function getStoredLang(): Lang {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
  return stored === 'en' || stored === 'fr' ? stored : DEFAULT_LANG;
}

export function storeLang(lang: Lang): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, lang);
}

type Dictionary = Record<string, string>;

const en: Dictionary = {};

const fr: Dictionary = {
  'Workspace': 'Espace de travail',
  'Monitor': 'Surveiller',
  'LOCAL ONLY': 'LOCAL UNIQUEMENT',
  'Operations / local session': 'Opérations / session locale',
  'Make machine output legible.': 'Rendez la sortie machine lisible.',
  'Drop a log, let the parser explain its shape, then scan the signal without losing the original line.':
    'Déposez un journal, laissez le parseur expliquer sa forme, puis explorez le signal sans perdre la ligne originale.',
  'This browser does not expose the File API. Upgrade to a current browser to open local logs.':
    "Ce navigateur n'expose pas l'API File. Mettez à jour vers un navigateur récent pour ouvrir des journaux locaux.",
  'Drop log files here': 'Déposez les fichiers journaux ici',
  'PM2, Nginx, JSONL, plain text · parsing happens locally':
    'PM2, Nginx, JSONL, texte brut · analyse en local',
  'Reading and classifying logs…': 'Lecture et classification des journaux…',
  'Browse files': 'Parcourir',
  'Add a log source': 'Ajouter une source',
  'Folder': 'Dossier',
  'Connect a log path': 'Connecter un chemin de journal',
  'Custom local log path': 'Chemin de journal local personnalisé',
  'Connect path': 'Connecter',
  'Browsers cannot read an arbitrary filesystem path from text alone. The path becomes the source label, while the folder picker is the secure permission step. Nothing leaves this tab.':
    "Les navigateurs ne peuvent pas lire un chemin de système de fichiers arbitraire à partir du texte seul. Le chemin devient le libellé de la source, tandis que le sélecteur de dossier est l'étape de permission sécurisée. Rien ne quitte cet onglet.",
  'Sources online': 'Sources en ligne',
  'Entries indexed': 'Entrées indexées',
  'Errors / warnings': 'Erreurs / avertissements',
  'Parser confidence': 'Confiance du parseur',
  'local files in session': 'fichiers locaux en session',
  'matching current view': 'correspondent à la vue actuelle',
  'No source selected': 'Aucune source sélectionnée',
  'No sources yet. Open a file or drop a folder to begin.':
    "Aucune source pour l'instant. Ouvrez un fichier ou déposez un dossier pour commencer.",
  'Sources': 'Sources',
  'Add source': 'Ajouter une source',
  'Parser notes': 'Notes du parseur',
  'Clear active': 'Effacer le log actif',
  'Browser parsing ready': 'Analyse du navigateur prête',
  'File APIs unavailable': 'APIs de fichier indisponibles',
  'Files stay in this tab. Nothing is uploaded, indexed, or sent over the wire.':
    'Les fichiers restent dans cet onglet. Rien n\'est téléchargé, indexé ou envoyé sur le réseau.',
  'Search message, field, raw line…': 'Rechercher message, champ, ligne brute…',
  'All levels': 'Tous les niveaux',
  'Errors': 'Erreurs',
  'Warnings': 'Avertissements',
  'Info': 'Info',
  'Debug': 'Debug',
  'Trace': 'Trace',
  'Live view': 'Vue en direct',
  'Paused': 'En pause',
  'No source': 'Aucune source',
  'Inspect details': 'Inspecter les détails',
  'Following': 'Suivi',
  'Follow': 'Suivre',
  'Resume': 'Reprendre',
  'Clear': 'Effacer',
  'No matching entries': 'Aucune entrée correspondante',
  'Nothing to inspect yet': 'Rien à inspecter pour l\'instant',
  'Try a different search term or level filter.':
    'Essayez un autre terme de recherche ou un filtre de niveau.',
  'Open a local log and the monitor will keep its raw lines alongside every inferred field.':
    'Ouvrez un journal local et le moniteur conservera ses lignes brutes à côté de chaque champ inféré.',
  'Entry inspector': 'Inspecteur d\'entrée',
  'Select an entry to see parsed fields and its untouched source line.':
    "Sélectionnez une entrée pour voir les champs analysés et sa ligne source d'origine.",
  'Message': 'Message',
  'Classification': 'Classification',
  'Source format': 'Format source',
  'Parser result': 'Résultat du parseur',
  'Inferred': 'Inféré',
  'Raw fallback': 'Retour brut',
  'Timestamp': 'Horodatage',
  'Severity': 'Sévérité',
  'What this points to': 'Vers quoi cela pointe',
  'Source confidence': 'Confiance source',
  'Inferred fields': 'Champs inférés',
  'No additional fields found.': 'Aucun champ supplémentaire trouvé.',
  'Raw line': 'Ligne brute',
  'Copy raw': 'Copier la ligne brute',
  'Copied': 'Copié',
  'Close': 'Fermer',
  'Live event detail': 'Détail de l\'événement en direct',
  'Original raw line': 'Ligne brute originale',
  'Diagnostic interpretation': 'Interprétation diagnostique',
  'Local session · raw lines remain available for verification':
    'Session locale · les lignes brutes restent disponibles pour vérification',
  'Folder access supported': 'Accès aux dossiers supporté',
  'Single-file picker fallback': 'Sélecteur de fichier unique de repli',
  'The browser could not read this file.': 'Le navigateur n\'a pas pu lire ce fichier.',
  'Could not read {0}. Check the file permissions and try again.':
    'Impossible de lire {0}. Vérifiez les permissions du fichier et réessayez.',
  'Enter a local path first, for example /var/log/nginx or C:\\\\logs.':
    'Entrez d\'abord un chemin local, par exemple /var/log/nginx ou C:\\\\logs.',
  'This browser cannot open a file by path. Use Browse files or a current Chromium-based browser.':
    "Ce navigateur ne peut pas ouvrir un fichier par chemin. Utilisez Parcourir ou un navigateur basé sur Chromium récent.",
  'This browser cannot grant folder access. The path is not readable by a frontend alone; use Browse files or a current Chromium-based browser.':
    "Ce navigateur ne peut pas accorder l'accès aux dossiers. Le chemin n'est pas lisible par un frontend seul ; utilisez Parcourir ou un navigateur basé sur Chromium récent.",
  'Could not open {0}. Check the browser permission and try again.':
    'Impossible d\'ouvrir {0}. Vérifiez la permission du navigateur et réessayez.',
  'Could not connect {0}. Check the browser permission and try again.':
    'Impossible de connecter {0}. Vérifiez la permission du navigateur et réessayez.',
  'Lost access to {0}. Reconnect the path to resume local monitoring.':
    "Accès perdu à {0}. Reconnectez le chemin pour reprendre la surveillance locale.",
  'Remove active source': 'Supprimer la source active',
  'Toggle language': 'Changer de langue',
  'Page not found': 'Page non trouvée',
  'The page you are looking for does not exist.': 'La page que vous recherchez n\'existe pas.',
  'Go home': 'Retour à l\'accueil',
  'Something went wrong.': 'Quelque chose s\'est mal passé.',
  'An unexpected error occurred in this component.': 'Une erreur inattendue s\'est produite dans ce composant.',
  'Try again': 'Réessayer',
  'Not Found': 'Non trouvé',
  'shown': 'affiché',
  'Filter by level': 'Filtrer par niveau',
  'Copy raw line': 'Copier la ligne brute',
  'Line': 'Ligne',
};

const dictionaries: Record<Lang, Dictionary> = { en, fr };

export function t(text: string, lang: Lang = getStoredLang()): string {
  return dictionaries[lang][text] ?? text;
}
