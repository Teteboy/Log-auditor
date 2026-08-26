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
  'Session': 'Session',
  'Log Monitor': 'Moniteur de journaux',
  'local operations cockpit': 'cockpit opérations locales',
  'Dismiss error': 'Ignorer l\'erreur',
  'Explain custom path access': 'Expliquer l\'accès par chemin personnalisé',
  'Session summary': 'Résumé de la session',
  'Log view': 'Vue du journal',
  'Table view': 'Vue tableau',
  'Readable list view': 'Vue liste lisible',
  'Line number': 'N°',
  'Level': 'Niveau',
  'Message / inferred fields': 'Message / champs inférés',
  'Inspect': 'Inspecter',
  'Inspect line {0}: {1}': 'Inspecter la ligne {0} : {1}',
  'Close event details': 'Fermer les détails de l\'événement',
  'raw line preserved': 'ligne brute conservée',
  'Parsed message': 'Message analysé',
  '{0} errors · {1} warnings': '{0} erreurs · {1} avertissements',
  'Plain text': 'Texte brut',
  'PM2': 'PM2',
  'Nginx': 'Nginx',
  'JSON / JSONL': 'JSON / JSONL',
  'Timestamped': 'Horodaté',
  'INFO': 'Info',
  'WARN': 'Avertissement',
  'ERROR': 'Erreur',
  'DEBUG': 'Débogage',
  'TRACE': 'Trace',
  'Enter a server path first, for example /var/log/nginx or /var/log.': 'Entrez d\'abord un chemin serveur, par exemple /var/log/nginx ou /var/log.',
  'Could not connect {0}: {1}.': 'Impossible de connecter {0} : {1}.',
  'No files found at {0}.': 'Aucun fichier trouvé à {0}.',
  'Could not reach the server. Make sure the backend is running.': 'Impossible d\'atteindre le serveur. Vérifiez que le backend est en cours d\'exécution.',
  'Could not read {0}. Check the server permissions and try again.': 'Impossible de lire {0}. Vérifiez les permissions du serveur et réessayez.',
  'The server could not read this file.': 'Le serveur n\'a pas pu lire ce fichier.',
  'Server-side request failure': 'Échec de requête côté serveur',
  'A 5xx response usually points to an upstream application, dependency, or proxy timeout rather than a client-side request issue.': 'Une réponse 5xx indique généralement une application, une dépendance ou une temporisation de proxy en amont plutôt qu\'un problème de requête côté client.',
  'Check the upstream service and its error log around this timestamp.': 'Vérifiez le service en amont et son journal d\'erreurs autour de cet horodatage.',
  'Compare the request path with recent deploys and dependency health.': 'Comparez le chemin de la requête avec les déploiements récents et l\'état des dépendances.',
  'Inspect latency, retry count, and correlation identifiers before changing configuration.': 'Inspectez la latence, le nombre de tentatives et les identifiants de corrélation avant de modifier la configuration.',
  'Dependency or network signal': 'Signal de dépendance ou réseau',
  'The message suggests the process could not complete a network operation in the expected window.': 'Le message suggère que le processus n\'a pas pu achever une opération réseau dans le délai attendu.',
  'Verify the target host, port, DNS, and service health.': 'Vérifiez l\'hôte cible, le port, le DNS et l\'état du service.',
  'Look for a matching trace or request id in the dependency logs.': 'Recherchez un identifiant de trace ou de requête correspondant dans les journaux des dépendances.',
  'Check whether retries are amplifying the failure.': 'Vérifiez si les tentatives amplifient l\'échec.',
  'Application error': 'Erreur d\'application',
  'This entry is classified as an error. Use the raw line and inferred fields to trace it back to the responsible process or request.': 'Cette entrée est classée comme une erreur. Utilisez la ligne brute et les champs inférés pour remonter au processus ou à la requête responsable.',
  'Search nearby lines for a stack trace or preceding trigger.': 'Recherchez des lignes proches pour une trace de pile ou un déclencheur précédent.',
  'Use the timestamp and service/process field to correlate across logs.': 'Utilisez l\'horodatage et le champ service/processus pour corréler entre les journaux.',
  'Confirm whether the error is isolated or repeating.': 'Confirmez si l\'erreur est isolée ou répétée.',
  'Degraded or unusual signal': 'Signal dégradé ou inhabituel',
  'Warnings are not necessarily failures, but repeated occurrences often reveal pressure before an outage.': 'Les avertissements ne sont pas forcément des échecs, mais des occurrences répétées révèlent souvent une pression avant une panne.',
  'Check the frequency of this signal across the current source.': 'Vérifiez la fréquence de ce signal dans la source actuelle.',
  'Compare duration, status, or resource fields with normal entries.': 'Comparez la durée, le statut ou les champs de ressources avec les entrées normales.',
  'Decide whether this should become an alert or threshold.': 'Décidez si cela devrait devenir une alerte ou un seuil.',
  'Normal operational signal': 'Signal opérationnel normal',
  'Unclassified output': 'Sortie non classée',
  'The parser found a useful structure in this line. The original text remains available for verification.': 'Le parseur a trouvé une structure utile dans cette ligne. Le texte original reste disponible pour vérification.',
  'No known structure matched this line, so it is preserved as raw output for manual inspection.': 'Aucune structure connue ne correspond à cette ligne, elle est donc conservée comme sortie brute pour inspection manuelle.',
  'Use the inferred fields to correlate this event with related services.': 'Utilisez les champs inférés pour corréler cet événement avec les services associés.',
  'Check surrounding lines when diagnosing a larger incident.': 'Vérifiez les lignes environnantes lors du diagnostic d\'un incident plus large.',
  'Look for a repeated prefix or delimiter in nearby lines.': 'Recherchez un préfixe ou un délimiteur répété dans les lignes proches.',
  'If this format is common, use its fields as a parser rule candidate.': 'Si ce format est courant, utilisez ses champs comme candidat de règle de parsing.',
};

const dictionaries: Record<Lang, Dictionary> = { en, fr };

export function t(text: string, lang: Lang = getStoredLang(), ...values: string[]): string {
  return (dictionaries[lang][text] ?? text).replace(/{(\d+)}/g, (_, i) => values[i] ?? `{${i}}`);
}
