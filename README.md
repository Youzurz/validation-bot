# validation-bot — boîte de décisions YOUZURZ

Un plugin pour Claude Code édité par **YOUZURZ** — [youzurz.com](https://youzurz.com) · [info@youzurz.com](mailto:info@youzurz.com) · [+33 7 70 48 53 28](tel:+33770485328)

Quand plusieurs agents travaillent pour une même personne, ils ont des questions. Ce plugin les rassemble dans un seul panneau, « Décisions ». Une question, quelques boutons, un clic : la réponse est écrite là où l'agent la relira.

## Comment ça marche

```
agent ──▶ dépose une question (un fichier .json) ──▶ panneau « Décisions »
agent ◀── relit le même fichier (champ `reponse`) ◀── un clic
```

- Chaque question est un fichier JSON dans un dossier partagé : `id`, `de`, `titre`, `question`, `options`, `cree`.
- Le panneau relit le dossier toutes les 5 secondes.
- Un clic écrit `reponse` et `repondu` dans le fichier et ajoute une ligne à `JOURNAL.md`.
- « Changer ma réponse » retire la réponse et le note au journal.

Le dossier est fixé dans `hooks/register.tsx` (constante `DIR`). Adapte-le à ton poste.

## Installation

```bash
/plugin install validation-bot --marketplace youzurz/validation-bot
```

## Utilisation

Ouvre le panneau avec la commande `/validation-bot`.

## Contact

YOUZURZ — Fuel Your Dreams !

- Site : <https://youzurz.com>
- Courriel : <info@youzurz.com>
- Téléphone : +33 7 70 48 53 28

© 2026 YOUZURZ. Tous droits réservés.
