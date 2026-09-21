# Audit Velocity — temps / CJ / HUB — 21 septembre 2026

## Identification et état initial

- Clone : `E:\cj_project\nocturne velocity`.
- Branche : `main` ; HEAD : `0be658034a9d027b08af16b254b896c99e29460b`.
- Origin : `https://github.com/cjajlk/nocturne-velocity.git`.
- Recherche des configurations Git sous `E:\cj_project` et le dossier de travail Codex : un seul clone correspondant trouvé.
- État initial NON propre : `game.html` et `gameplay.js` déjà modifiés. Ces changements introduisaient notamment getGameState, le delta brut, les frontières hidden/focus et la sortie de partie. Ils ont été conservés et complétés, pas présentés comme entièrement produits par cet audit.
- Le gameplay.js publié correspond au HEAD initial, pas aux modifications locales. Le fichier publié ne contient pas `window.getGameState`.

## Causes reproduites

1. Le jeu publié charge `https://cjajlk.github.io/cjajlkGames/core/cjEngine.js`, qui répond HTTP 404. La variante relative locale `../cjajlkGames/core/...` pointe vers le même ancien projet une fois publiée. Le moteur V2-test répond normalement.
2. Le moteur partagé exige getGameState ; son absence dans le gameplay publié signifie session inactive, même avec une URL corrigée.
3. L'état local ajouté avant cet audit renvoyait toujours paused:false. Le blocage d'orientation réellement affiché n'était pas pris en compte par le filtre de comptage. Les gardes hidden/focus existaient déjà localement.

## Correctif ciblé

- `game.html` : compte puis moteur V2-test, une seule occurrence chacun, scripts classiques ordonnés avant gameplay ; compte avec data-readonly pour réutiliser le portefeuille existant sans création/migration depuis Velocity. Versionnement de gameplay.js pour éviter un ancien script en cache.
- `profil.html` : mêmes sources valides et compte readonly. Aucun tick producteur sur cette page.
- `gameplay.js` : complément de getGameState (hidden, focus et visibilité réelle de l'overlay existant `orientationLock`) ; frontières pagehide/pageshow/resize/orientationchange ajoutées à celles déjà présentes ; suspension protégée contre une exception du moteur ; réutilisation de cette frontière à la sortie. L'orientation elle-même n'est pas corrigée.
- Ajoutés : `tests/cj-integration.cjs`, `tests/cj-audit-server.cjs`, ce checkpoint.

L'appel est unique : `CJEngine.tick(deltaMs, 'velocity')` dans tickGlobalCJ, appelé depuis gameLoop par `tickGlobalCJ(rawDeltaTime * 1000)`. Il se trouve après le retour anticipé game over et avant les mises à jour du gameplay. Le delta brut vient du timestamp de la boucle, en millisecondes, et non du facteur de vitesse du combat. Deltas non finis, <=0 et >200 ms rejetés. Première frame après frontière : référence propre, pas de rattrapage.

running exclut game over, départ de la page et statistiques de partie déjà finalisées. Combat, boss et Hyper-Boost empruntent la même boucle active. Il n'existe pas de menu de pause distinct identifié dans cette version. Aucun nouveau mécanisme de pause gameplay n'a été introduit.

## Écritures et ancien Profil

Le seul écrivain du portefeuille global reste le moteur officiel : cjPlayerData, stats.totalCJ, stats.byGame.velocity, stats.playTime et reliquat cjActivityV1. Règle centrale inchangée : 600 s = 1 CJ, verrou Web Locks partagé conservé.

Recherche dans les scripts du dépôt : aucun appel parallèle addCJ, addPlayTime ou spendCJ, aucune écriture directe de cjPlayerData ou de ses statistiques. Le temps `runMetrics.playTime` alimente uniquement le profil local nv_player_stats à la fin de partie ; ce n'est pas un second crédit global.

profile.js contient encore des noms hérités (`playtimeInterval`, setupPlaytimeHook, fonctions CJ inertes), mais aucun setInterval producteur, ajout de temps ou crédit CJ. L'ouverture du Profil lit le solde global et ne crédite rien. Ces fonctions inertes et le pseudo existant sont laissés hors périmètre.

## Tests isolés navigateur

Serveur lancé uniquement sur `127.0.0.1:9222`, origine distincte de GitHub Pages. Aucun profil personnel GitHub touché. Les scripts officiels sont téléchargés et servis sans modification ; le hub V2 publié est relayé sur cette même origine de test, sans modifier ses fichiers. Une barre de diagnostic de test expose les données dans le DOM. Le compte initial de test est créé par cjAccount.js lui-même sur la seule page de fixture.

### Persistance 599 + reload + 1

Horloge virtuelle sur une page de test dédiée dans un vrai navigateur, moteur officiel inchangé, Web Locks natifs. La fixture appelle le moteur ; elle n'appelle pas directement addCJ/addPlayTime et n'écrit pas de solde arbitraire.

- Après 599 s : totalCJ=0, temps velocity=599 s, reliquat cjMs=599000, timeMs=0.
- Après rechargement : valeurs conservées.
- Après 1 s supplémentaire : totalCJ=1, byGame.velocity=1, playTime.totalSeconds=600, playTime.byGame.velocity=600, cjMs=0, timeMs=0.
- Exactement un crédit. Attrape et Breaker restent à zéro. Ce test accéléré valide la persistance du moteur ; ce n'est pas une partie manuelle de dix minutes.

### Menus et vraie session

- Menu, Garage et Profil visités séparément, relevés espacés de plusieurs secondes : temps global et velocity restent à 600 s, solde à 1 CJ, reliquat nul. Profil affiche 1 CJ, moteur non producteur.
- Démarrage via JOUER depuis le vrai menu ; gameplay réel visible (vaisseau, ennemis, intensité). Temps observé à 607 s puis 628 s. Aucun changement artificiel des autres jeux.
- Retour au hub V2 de test : mêmes 628 s persistées, 1 CJ, **1 jeu joué**, ligne d'activité velocity. Le hub ne modifie pas le portefeuille durant cette lecture.
- Défaut HUB confirmé : libellé brut **velocity**, et non Nocturne Velocity. Mapping absent de la table names de v2/dashboard.js. À corriger dans une mission HUB séparée ; aucun fichier HUB modifié ici.

### Suspensions

Le changement entre deux onglets du navigateur intégré n'a pas constitué une preuve fiable de masquage natif : la première page continuait à compter. Ce résultat n'est pas présenté comme un PASS du test natif.

Contrôle complémentaire dans le vrai navigateur avec signaux hidden/visibilityState et hasFocus explicitement simulés par la seule fixture, en déclenchant les événements standards :

- Hidden : 632 s et reliquat 32648,4333337 ms inchangés après attente ; état paused:true, tracking:false. Retour visible : même valeur initiale, puis reprise sans saut.
- Focus : tests automatisés des événements blur/focus et du refus de tick sans focus ; mesures navigateur complémentaires consignées ci-dessous.

La vérification native sur le navigateur du téléphone reste à effectuer après publication. Aucun contournement de visibilité/focus n'est livré dans les fichiers de production.

## Non-régression et hors périmètre

- `node tests/cj-integration.cjs` : PASS (clé velocity, état actif/fin/sortie, hidden/focus/overlay, bornes du delta, frontières propres, site unique de tick, ordre des scripts, Profil sans ajout de temps).
- Syntaxe gameplay.js et `git diff --check` : PASS.
- Menu, démarrage et Garage : contrôlés dans le navigateur. Aucun achat effectué.
- Drone Alpha, Drone Beta, Hyper-Boost, ennemis, boss, crédits et progression locale : leurs règles et sections de code ne sont pas modifiées ; pas de campagne complète de non-régression manuelle de chaque boss/drone.
- Assets/audio, garage.js, menu.js, profile.js, shop.js, options.js et styles inchangés par cet audit. Aucune nouvelle économie, identité, clé CJ ou portefeuille.
- Orientation : incohérence existante entre checkOrientation (`orientationBlock`) et l'overlay réel (`orientationLock`), ainsi qu'un blocage CSS paysage dépendant de la hauteur. Signalée seulement. Le filtre CJ consulte l'overlay réel sans changer sa logique d'affichage.
- Aucun bouton retour CJAJLK Games ajouté ; absence de lien dédié confirmée dans la navigation inspectée.
- Dépôts HUB V2-test et Nocturne Shift : consultés uniquement en lecture seule, état Git propre constaté avant/après cet audit. Breaker et Attrape non modifiés.

## Conclusion

**PASS technique du raccordement Velocity corrigé localement**, avec libellé HUB à traiter séparément et test natif hidden/focus sur téléphone restant à valider. Version publiée toujours antérieure tant qu'aucune publication n'est demandée. Aucun commit ni push effectué.
