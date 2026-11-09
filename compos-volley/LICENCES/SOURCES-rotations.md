# Origine des placements de l’aide-mémoire des rotations

Les 180 positions de joueurs utilisées par l’aide-mémoire des rotations (`const VB` dans `app.js` : phases *base*, *serve*, *switchServe*, *receive* et *set*) proviennent de :

- **rotazionivolley**, de Maurizio Napolitano — https://github.com/napo/rotazionivolley
  Fichier `js/vbRotations.js`, version du commit `a4285e7` (4 janvier 2019). Ce fichier n’a pas changé depuis. À cette date, et jusqu’au 22 octobre 2026, le projet était publié sous **licence Apache 2.0**. Le passage du projet à l’AGPL-3.0 en octobre 2026 ne s’applique pas rétroactivement à cette version.
- **VBRotations**, d’Andy Edwards — https://github.com/monkeysppp/VBRotations — licence **Apache 2.0**.
  rotazionivolley est parti d’une copie exacte de son fichier `vbRotations.js`.

Maurizio Napolitano a corrigé 25 des 180 positions (réception en P1 à P5, et départs d’attaque). Les 155 autres sont identiques à VBRotations.

Modifications apportées dans Compos Volley : positions conservées comme données (50 px = 1 m), libellés en français, remplacement du central arrière par le libéro, formations 4-2 dérivées des rotations 5-1 où le passeur avant occupe la même zone.

Aucun des deux projets ne fournit de fichier NOTICE ni de mention de copyright dans les fichiers concernés. Le texte de la licence Apache 2.0 se trouve dans `VBRotations-Apache-2.0.md`.
