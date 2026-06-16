# Strava officiel

Strava utilise OAuth 2.0.

Parcours prévu :

1. L'utilisateur clique sur `Connecter Strava`.
2. Il autorise C'moiLeCoach sur Strava.
3. Strava renvoie un `code` vers `/api/strava/callback`.
4. Le serveur échange ce code contre des jetons Strava.
5. Plus tard, ces jetons seront stockés dans la base utilisateur pour récupérer les activités.

Scopes préparés :

- `read`
- `activity:read_all`

Source officielle :

- https://developers.strava.com/docs/authentication/
