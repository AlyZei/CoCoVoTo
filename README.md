# CoCoVoTo

Outils de volley qui fonctionnent entièrement dans le navigateur, sans serveur ni compte.

| Application | Adresse | Dossier |
|---|---|---|
| Compos Volley | https://alyzei.github.io/CoCoVoTo/compos-volley/ | [`compos-volley/`](compos-volley/) |

La page d’accueil (https://alyzei.github.io/CoCoVoTo/) liste les applications.

## Organisation du dépôt

- Une application = un dossier, avec tous ses fichiers (`index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `fonts/`, `icons/`, `LICENCES/`).
- À la racine : seulement cette page d’accueil (`index.html`), ce `README.md` et `.nojekyll`.
- Publication : **Settings → Pages → Deploy from a branch → main / (root)**.

## Mettre à jour une application

1. Remplacez les fichiers dans son dossier (**Add file → Upload files**, puis **Commit changes**).
2. Dans le `sw.js` de ce dossier, passez `VERSION` à la valeur suivante (`compos-volley-v1` → `compos-volley-v2`…).

## Ajouter une nouvelle application

Toutes les applications de ce compte partagent la même origine (`alyzei.github.io`), donc le même stockage navigateur. Pour qu’elles ne se gênent pas :

- un dossier par application ;
- un nom de clé de stockage propre à l’application (Compos Volley utilise `vb-compos-equipes-v1` et `vb-lineup-builder-v1`) ;
- un préfixe de cache propre dans son `sw.js` (Compos Volley utilise `compos-volley-`).

## Confidentialité et sécurité

- Les équipes et les niveaux restent dans le navigateur de chaque entraîneur ; ils ne sont jamais envoyés ni enregistrés dans ce dépôt.
- Ne mettez pas de vraies données de joueurs dans le dépôt : il est public.
- Pas de traceur ni de ressource externe ; les polices sont hébergées avec l’application.

## Licences

Voir le dossier `LICENCES/` de chaque application (placements de rotation adaptés de VBRotations, Apache 2.0 ; polices sous SIL OFL 1.1).
