# Module Challenge Entreprise

## Objectif

Le challenge entreprise est une fonctionnalité réelle connectée à Supabase. Elle encourage la participation collective sans donner au salarié l'impression d'être évalué par son employeur.

Côté salarié, l'expérience affiche surtout :
- son score personnel du mois ;
- le score collectif de son entreprise ;
- sa contribution positive au collectif ;
- un message motivant simple.

## Confidentialité

Texte affiché dans l'application :

> Tes données personnelles restent privées. Ton employeur ne voit pas tes séances, tes données sportives, tes échanges avec l’IA ni tes informations personnelles. Seuls des indicateurs collectifs anonymisés sont utilisés.

Les pages admin n'affichent jamais :
- les séances individuelles ;
- les scores individuels nominatifs ;
- les données personnelles ;
- les échanges IA ;
- les données Strava détaillées.

## Accès par code entreprise

Le salarié rejoint une entreprise avec un code d'invitation stocké dans `invitation_codes`.

Parcours :
1. L'utilisateur va sur `/entreprise`.
2. Il saisit son code entreprise.
3. Son compte est rattaché à l'entreprise dans `company_members`.
4. Il peut quitter l'entreprise depuis la même page.

Il n'y a pas d'obligation de domaine email.

## Données sportives

Garmin n'est pas utilisé pour le challenge.

Sources de points :
- Strava : séance vérifiée, points complets.
- Déclaration manuelle : séance non vérifiée, points réduits.

## Règles de points et anti-abus

Les règles sont dans `supabase/schema.sql`, fonction `add_activity_points`.

Règles principales :
- une activité Strava ne peut compter qu'une fois ;
- les déclarations manuelles ont des points réduits ;
- les points hebdomadaires sont plafonnés par utilisateur ;
- les déclarations manuelles sont limitées par semaine ;
- chaque validation est journalisée dans `activity_points.validation_log`.

## Indice de participation collective

Formule documentée dans `supabase/schema.sql` :

`40% taux de participation active + 40% progression vers l'objectif mensuel + 20% régularité collective`

Cet indice permet de comparer les entreprises sans favoriser uniquement les plus grosses structures.

## Fonctionnement salarié

Page : `/entreprise`

Affiche :
- mon score du mois ;
- score collectif ;
- objectif collectif du mois ;
- progression collective ;
- message motivant ;
- bouton de synchronisation Strava ;
- déclaration manuelle avec points réduits ;
- lien admin seulement si le membre a le rôle `admin`.

Un résumé compact apparaît aussi sur le tableau de bord principal `/`.

## Fonctionnement admin

Page : `/entreprise/admin`

Accessible uniquement aux membres avec `company_members.role = 'admin'`.

Affiche uniquement :
- nombre de participants actifs ;
- score collectif mensuel ;
- taux de participation ;
- progression vs mois précédent ;
- indice de participation collective ;
- classement inter-entreprises anonymisé ou public selon `companies.public_leaderboard`;
- rapport mensuel généré.

## Rapport mensuel

La page admin génère un rapport avec `generate_company_monthly_report`.

Le rapport est stocké dans `monthly_reports` et peut être envoyé plus tard par email.

L'envoi email n'est pas encore branché : l'architecture est prête, mais le rapport est affiché dans l'espace admin.

## Tables Supabase

Créer ou mettre à jour avec le contenu de `supabase/schema.sql` :

- `companies`
- `company_members`
- `invitation_codes`
- `activity_points`
- `monthly_company_scores`
- `monthly_reports`

Les policies RLS sont dans le même fichier.

## Variables Vercel nécessaires

Déjà utilisées par l'application :

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI`
- `OPENAI_API_KEY`

Option future pour l'envoi email :

- `EMAIL_PROVIDER_API_KEY`
- `MONTHLY_REPORT_FROM_EMAIL`

## Tester le parcours salarié

1. Dans Supabase, créer une entreprise :

```sql
insert into public.companies(name, monthly_goal, public_leaderboard)
values ('Entreprise Demo', 500, true);
```

2. Créer un code :

```sql
insert into public.invitation_codes(company_id, code, role)
select id, 'DEMO2026', 'employee'
from public.companies
where name = 'Entreprise Demo';
```

3. Se connecter dans l'application.
4. Aller sur `/entreprise`.
5. Saisir `DEMO2026`.
6. Synchroniser Strava ou déclarer une séance manuelle.
7. Vérifier le score personnel et collectif.

## Tester le parcours admin

Créer un code admin :

```sql
insert into public.invitation_codes(company_id, code, role)
select id, 'ADMIN2026', 'admin'
from public.companies
where name = 'Entreprise Demo';
```

Puis :
1. rejoindre avec `ADMIN2026` ;
2. ouvrir `/entreprise/admin` ;
3. vérifier les indicateurs collectifs ;
4. générer le rapport mensuel.

## Vérifier la protection des données privées

À vérifier dans l'application :
- un salarié ne voit pas les séances des autres ;
- l'admin ne voit pas de détail individuel ;
- l'admin ne voit que des indicateurs agrégés.

À vérifier dans Supabase :
- RLS activé sur les tables du module ;
- `activity_points` lisible seulement par son propriétaire ;
- `monthly_company_scores` et `monthly_reports` lisibles seulement par les admins de l'entreprise ;
- les fonctions RPC retournent des agrégats, pas les données personnelles.

## Déployer

1. Lancer le SQL de `supabase/schema.sql` dans Supabase.
2. Commit les fichiers dans GitHub Desktop.
3. Push vers GitHub.
4. Vercel redéploie automatiquement.
5. Tester `/entreprise`, `/entreprise/admin` et la synchronisation Strava.

