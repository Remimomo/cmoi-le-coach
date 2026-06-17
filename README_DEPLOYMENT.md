# Déploiement de C'moiLeCoach

Ce fichier explique comment préparer l'application pour une mise en ligne publique sur Vercel.

## 1. Vérifier en local

Dans le dossier du projet :

```bash
npm install
npm run build
```

La commande `npm run build` doit se terminer sans erreur.

Pour tester l'application :

```bash
npm run dev
```

Puis ouvrir :

```text
http://localhost:3000
```

## 2. Publier sur Vercel

1. Créer un compte sur Vercel.
2. Importer le projet depuis GitHub.
3. Laisser Vercel détecter Next.js automatiquement.
4. Ajouter les variables d'environnement dans `Settings` puis `Environment Variables`.
5. Déployer.

## 3. Variables d'environnement

Adresse publique de l'application :

```text
NEXT_PUBLIC_APP_URL=https://ton-url-vercel.vercel.app
```

OpenAI :

```text
OPENAI_API_KEY=ta_clé_openai
```

Comptes utilisateurs avec Supabase :

```text
SUPABASE_URL=https://ton-projet.supabase.co
SUPABASE_ANON_KEY=ta_cle_anon_supabase
```

Strava :

```text
STRAVA_CLIENT_ID=ton_client_id_strava
STRAVA_CLIENT_SECRET=ton_client_secret_strava
STRAVA_REDIRECT_URI=https://ton-url-vercel.vercel.app/api/strava/callback
```

Garmin, après validation officielle :

```text
GARMIN_CLIENT_ID=fourni_par_garmin
GARMIN_CLIENT_SECRET=fourni_par_garmin
GARMIN_WEBHOOK_SECRET=à_créer
GARMIN_API_BASE_URL=https://apis.garmin.com
```

Important : ne jamais mettre ces valeurs dans le code visible côté navigateur.

## 4. OpenAI

L'application utilise OpenAI côté serveur via `app/api/coach/route.ts`.

Si `OPENAI_API_KEY` est absente ou invalide, l'application continue en mode simulation locale.

## 5. Garmin

La connexion officielle Garmin nécessite le Garmin Connect Developer Program.

Les API pertinentes sont :

- Health API : sommeil, fréquence cardiaque, stress, Body Battery et autres métriques de santé
- Activity API : activités sportives
- Training API : envoi futur de séances structurées vers Garmin

Limitation actuelle : tant que l'accès Garmin n'est pas validé, l'application ne peut pas récupérer automatiquement les vraies données Garmin Connect. Elle utilise donc la page `Données Garmin` en mode test.

Sources officielles :

- https://developer.garmin.com/gc-developer-program/overview/
- https://developer.garmin.com/gc-developer-program/health-api/

## 6. Strava

Strava fonctionne avec OAuth 2.0.

Étapes :

1. Créer une application sur https://www.strava.com/settings/api
2. Copier `Client ID` dans `STRAVA_CLIENT_ID`
3. Copier `Client Secret` dans `STRAVA_CLIENT_SECRET`
4. Mettre l'URL de retour :

```text
https://ton-url-vercel.vercel.app/api/strava/callback
```

5. Dans Vercel, ajouter la même URL dans `STRAVA_REDIRECT_URI`
6. Redéployer l'application
7. Ouvrir la page `Connexions`
8. Cliquer sur `Connecter Strava`

Source officielle :

- https://developers.strava.com/docs/authentication/

## 7. Comptes utilisateurs

Solution préparée : Supabase Auth.

Étapes :

1. Créer un compte Supabase
2. Créer un nouveau projet
3. Aller dans `Project Settings`
4. Copier `Project URL` dans `SUPABASE_URL`
5. Copier la clé `anon public` dans `SUPABASE_ANON_KEY`
6. Dans `Authentication`, vérifier que la connexion Email est activée
7. Dans Vercel, ajouter ces deux variables
8. Redéployer
9. Ouvrir `/compte` dans l'application

Pour activer la synchronisation profil, historique et programmes :

1. Dans Supabase, ouvrir `SQL Editor`
2. Créer une nouvelle requête
3. Copier le contenu du fichier `supabase/schema.sql`
4. Cliquer sur `Run`

Important : le stockage local reste actif comme sécurité. Quand le compte est connecté et que la table Supabase existe, l'application synchronise aussi les données sur le compte.

## 8. Tester sur téléphone

Après déploiement Vercel :

1. Ouvrir l'URL Vercel sur le téléphone.
2. Créer un compte dans `/compte`
3. Renseigner le profil.
4. Renseigner les données Garmin test.
5. Connecter Strava si les clés sont configurées.
6. Générer un programme.
7. Mémoriser une séance.
8. Revenir plus tard vérifier que l'historique local est toujours présent.

Le stockage actuel des entraînements est encore local : les données restent sur l'appareil utilisé. La prochaine étape sera de les synchroniser en base Supabase.

## 9. Prochaines mises à jour

- Validation Garmin officielle
- Connexion Garmin Connect
- Synchronisation Strava complète
- Synchronisation des activités
- Synchronisation sommeil, stress, fréquence cardiaque et Body Battery
- Sauvegarde cloud
- Calendrier
- Notifications de rappel
