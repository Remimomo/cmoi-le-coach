# C'moiLeCoach

C'moiLeCoach est une web app mobile-first de coaching sportif intelligent.

L'objectif est d'aider l'utilisateur à rester régulier sans tomber dans une logique trop agressive. L'application tient compte du profil sportif, de l'état du jour, de données Garmin simulées, des contraintes des prochains jours et de l'historique local.

## Fonctionnalités V1

- Profil sportif sauvegardé localement
- État du jour : énergie, sommeil, stress, motivation, douleurs
- Page séparée pour les données test Garmin : sommeil, fréquence cardiaque, stress, Body Battery, charge, dernière activité
- Sélection des 10 prochains jours, aujourd'hui inclus
- Contraintes texte par jour
- Génération de programme personnalisé
- Synthèse de forme humaine et rassurante
- Détail concret des séances avec exercices, séries, durées et récupérations
- Possibilité de générer une autre séance pour un jour précis
- Historique local avec suppression
- Conversation libre avec un coach IA orienté sport
- Mode IA simulée si aucune clé OpenAI n'est renseignée
- Mode OpenAI si `OPENAI_API_KEY` est configurée côté serveur

## Lancer le projet en local

Dans le dossier du projet :

```bash
npm install
npm run dev
```

Puis ouvrir :

```text
http://localhost:3000
```

La page profil est ici :

```text
http://localhost:3000/profil
```

La page des données Garmin simulées est ici :

```text
http://localhost:3000/garmin
```

## Tester sans clé OpenAI

Tu peux utiliser l'application sans clé OpenAI.

Dans ce cas, C'moiLeCoach utilise une simulation intelligente locale :

- la synthèse est générée par `lib/coachEngine.ts`
- le programme est généré par `lib/coachEngine.ts`
- aucune API externe n'est appelée

## Ajouter la clé OpenAI en local

Créer ou ouvrir le fichier :

```text
.env.local
```

Ajouter cette ligne :

```text
OPENAI_API_KEY=ta_clé_openai_ici
```

Ne mets jamais cette clé dans `app/page.tsx` ou dans un fichier visible côté navigateur.

Après modification de `.env.local`, arrêter puis relancer :

```bash
npm run dev
```

## Tester avec clé OpenAI

1. Renseigner le profil sportif dans `/profil`
2. Renseigner les données test Garmin dans `/garmin`
3. Revenir sur l'accueil
4. Renseigner l'état du jour
5. Cliquer sur `Programmer mes prochaines séances`
6. Sélectionner des jours
7. Ajouter des contraintes, par exemple :

```text
trail intense en montagne
```

8. Générer le programme

Si la clé OpenAI est valide, l'API `/api/coach` utilise OpenAI.
Si la clé est absente ou invalide, l'application revient automatiquement au mode simulé.

## Vérifier avant publication

```bash
npm run build
```

La commande doit se terminer sans erreur.

## Publier sur Vercel

1. Créer un projet sur Vercel
2. Connecter le dépôt GitHub du projet
3. Dans Vercel, ouvrir `Settings`
4. Aller dans `Environment Variables`
5. Ajouter :

```text
OPENAI_API_KEY
```

6. Coller la clé OpenAI comme valeur
7. Déployer

Important : ne jamais publier `.env.local`. Il est déjà protégé par `.gitignore`.

## Fichiers principaux

- `app/page.tsx` : page d'accueil et parcours principal
- `app/profil/page.tsx` : profil sportif
- `app/api/coach/route.ts` : route serveur pour le coach IA
- `lib/coachEngine.ts` : logique coach simulée
- `lib/garminMock.ts` : données Garmin simulées
- `lib/openai.ts` : connexion OpenAI ou fallback simulé

## Prochaines évolutions

- Connexion Garmin réelle
- Connexion Strava
- Compte utilisateur
- Calendrier
- Avatar coach animé
- Voix
- Notifications et rappels
