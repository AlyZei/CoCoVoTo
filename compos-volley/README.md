# Compos Volley

Application web pour préparer les compos de volley : effectifs et postes, niveaux, formations 6×6 (5-1, 5-1 + libéro, 4-2), changements à mi-set, matchs en 4 contre 4 avec équilibrage du temps de jeu, et aide-mémoire des rotations animé.

Elle fonctionne entièrement dans le navigateur : pas de serveur, pas de compte, pas de base de données. Une fois installée sur un téléphone, elle marche aussi sans réseau.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `index.html` | La page de l’application |
| `styles.css`, `app.js` | L’apparence et le fonctionnement |
| `manifest.webmanifest` | Nom, icône et couleurs pour l’installation sur téléphone |
| `sw.js` | Fonctionnement hors ligne et mises à jour |
| `fonts/` | Les polices, hébergées avec l’application (aucun appel à Google) |
| `icons/` | Les icônes de l’application |
| `LICENCES/` | Les licences des éléments repris (voir plus bas) |
| `.nojekyll` | Indique à GitHub Pages de publier les fichiers tels quels |

## Mettre en ligne sur GitHub Pages (sans ligne de commande)

1. Connectez-vous sur [github.com](https://github.com), puis **New repository**.
2. Nom : par exemple `compos-volley`. Choisissez **Public** (obligatoire pour GitHub Pages avec un compte gratuit). Cliquez sur **Create repository**.
3. Sur la page du dépôt vide, cliquez sur **uploading an existing file**.
4. Glissez **le contenu** du dossier (les fichiers et les dossiers `fonts`, `icons`, `LICENCES`), pas le dossier lui-même. `index.html` doit être à la racine du dépôt.
   Le fichier caché `.nojekyll` n’apparaît pas toujours dans le Finder ou l’Explorateur : ce n’est pas grave, il est facultatif.
5. Cliquez sur **Commit changes**.
6. Allez dans **Settings → Pages**. Sous *Build and deployment*, choisissez **Source : Deploy from a branch**, puis **Branch : main** et **/ (root)**. Cliquez sur **Save**.
7. Après une ou deux minutes, l’adresse s’affiche en haut de cette page, du type `https://votre-compte.github.io/compos-volley/`.

Le dépôt et le site sont publics : n’y mettez jamais de vraies données de joueurs. Les équipes ne sont pas dans les fichiers, elles restent dans le navigateur de chaque entraîneur.

## Installer sur un téléphone

- **iPhone / iPad** : ouvrez l’adresse dans **Safari**, touchez **Partager**, puis **Sur l’écran d’accueil**.
- **Android** : ouvrez l’adresse dans **Chrome**, menu **⋮**, puis **Installer l’application** (ou **Ajouter à l’écran d’accueil**).

Sur iPhone, utilisez l’application installée plutôt que Safari : Safari efface les données d’un site après 7 jours sans visite, pas l’application installée.

## Vos données et les sauvegardes

- Les équipes, niveaux et matchs sont enregistrés **sur l’appareil**, dans le navigateur ou l’application installée. Rien n’est envoyé sur internet.
- Chaque appareil a ses propres données : le téléphone et l’ordinateur ne se synchronisent pas.
- Dans **Sauvegarder et transférer**, utilisez **Enregistrer une sauvegarde** pour obtenir un fichier `.json` avec toutes vos équipes. Gardez-le en lieu sûr.
- **Restaurer une sauvegarde** remplace toutes les équipes de l’appareil par celles du fichier. C’est aussi la façon de passer d’un appareil à un autre.
- Faites une sauvegarde avant de vider le navigateur, de changer de téléphone ou de désinstaller l’application.

## Mettre à jour l’application

1. Remplacez les fichiers modifiés dans le dépôt (**Add file → Upload files**, puis **Commit changes**).
2. Dans `sw.js`, changez la ligne `const VERSION = 'compos-volley-v1';` en `v2`, puis `v3` à la mise à jour suivante, etc. (sur GitHub : ouvrez le fichier, icône crayon, modifiez, **Commit changes**).
3. À la prochaine ouverture, les téléphones téléchargent la nouvelle version et affichent « Nouvelle version disponible ».

Sans changement de `VERSION`, les téléphones récupèrent quand même les nouveaux fichiers dès qu’ils ont du réseau, mais le changement de version garantit un cache propre.

## Autres hébergements possibles

Le dossier fonctionne sur n’importe quel hébergement de fichiers statiques en **HTTPS** (obligatoire pour l’installation et le hors ligne) :

- **Votre site WordPress** : déposez le dossier complet via le gestionnaire de fichiers ou le FTP de l’hébergeur (par exemple dans `/compos-volley/`). La médiathèque WordPress ne convient pas, car elle ne garde pas l’arborescence des fichiers.
- Tout autre hébergeur de sites statiques.

Ouvrir `index.html` directement depuis l’ordinateur (double-clic) fonctionne aussi, mais sans installation ni mode hors ligne.

## Sécurité et confidentialité

- Pas de serveur, pas de compte, pas de traceur, pas de publicité.
- Les polices sont hébergées avec l’application : aucune adresse IP de visiteur n’est envoyée à Google.
- Une politique de sécurité du contenu (CSP) empêche la page de charger quoi que ce soit depuis un autre site.
- Les noms saisis sont toujours affichés comme du texte : ils ne peuvent pas exécuter de code.
- Les fichiers de sauvegarde sont vérifiés avant d’être restaurés.
- Protégez votre compte GitHub avec la **double authentification** (Settings → Password and authentication).
- Si vous ajoutez un nom de domaine personnalisé, vérifiez-le dans GitHub (Settings → Pages → *Verified domains*) pour éviter qu’un tiers ne le récupère.
- Les données des joueurs (noms, niveaux donnés par l’entraîneur) restent sur l’appareil de l’entraîneur. Si un jour les entraîneurs doivent partager leurs données entre eux, il faudra un serveur, des comptes et une réflexion RGPD (information des joueurs, durée de conservation).

## Licences

- **Code de l’application** : il vous appartient. Sans fichier de licence, il est « tous droits réservés » ; ajoutez une licence (par exemple MIT) si vous voulez permettre à d’autres de le réutiliser.
- **Placements des rotations** : adaptés de [VBRotations](https://github.com/monkeysppp/VBRotations) d’Andy Edwards, sous licence Apache 2.0 — voir `LICENCES/VBRotations-Apache-2.0.md`. Le crédit figure aussi dans l’aide-mémoire des rotations.
- **Polices** Barlow Condensed et Figtree : SIL Open Font License 1.1 — voir `LICENCES/`.
