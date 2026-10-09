# Versions et mises à jour

Le dépôt est un **modèle** partagé par plusieurs associations. Tout ce qui
appartient à une association reste chez elle et n'est jamais remplacé par une
mise à jour :

| Appartient à l'association | Appartient au modèle (mis à jour) |
| --- | --- |
| `src/content/` (pages, actualités, `*.yaml`, `images/`) | tout le reste : code, composants, dépendances |
| `data/` (comptes, journal) | |
| `.env` (`SITE_URL`, clés Grist…) | |

## Construction au démarrage

Le site n'est construit ni dans le dépôt ni dans l'image Docker : il l'est
**sur chaque serveur**, avec le contenu et le `.env` de l'association, par
`scripts/start.mjs` (`npm start`, ou `CMD` de l'image).

Au démarrage, le script calcule une **empreinte** (version du modèle dans
`package.json` + `SITE_URL` + contenu de `src/content/` octet par octet,
`scripts/releases.mjs`) et la compare à celle du site en place
(`dist/build-info.json`, écrit par chaque `npm run build` via
`src/integrations/build-info.ts`) :

- **identiques** → le serveur démarre tout de suite ;
- **différentes** → `npm run build` dans `.releases/<horodatage>/`, `dist`
  pointe dessus, puis démarrage. Le journal indique la raison : « aucun site
  construit », « nouvelle version du modèle (1.0.0 → 1.1.0) », « adresse du
  site changée », « contenu modifié ». Pendant la construction (quelques
  secondes à quelques minutes selon le serveur), le site ne répond pas ;
- **construction en échec** → l'ancien site reste servi, l'erreur est dans
  le journal ; sans ancien site, arrêt (code 1).

Les publications depuis l'espace bénévoles construisent elles-mêmes
(`src/lib/site-build.ts`, mêmes fonctions) : au redémarrage qui suit,
l'empreinte correspond, rien n'est reconstruit.

Conséquence pratique : après un changement de `SITE_URL` ou une modification
de `src/content/` à la main, **redémarrer suffit**.

## Publier une version du modèle (mainteneur)

Sur `master`, une fois la CI au vert ([ci.md](ci.md)), arbre de travail propre :

```bash
npm version minor        # 1.0.0 → 1.1.0 : met à jour package.json, commit + tag v1.1.0
git push --follow-tags   # envoie le commit ET le tag
```

(`npm version patch` pour une correction, `major` pour un changement qui
demande une action des associations — à décrire dans le message de commit.)

Le tag déclenche `.github/workflows/release.yml` :

1. vérifie que le tag correspond à `package.json` et à un commit de `master` ;
2. relance la CI complète (`ci.yml`) ;
3. publie l'image Docker `ghcr.io/numerik-co/numerik2026` avec les
   étiquettes `X.Y.Z`, `X.Y` et `latest` ;
4. crée la **Release** GitHub : notes = consignes de mise à jour + liste des
   commits depuis la version précédente ; GitHub y joint l'archive des
   sources (installations Node seul).

Suivi : onglet **Actions** du dépôt ; résultat : onglet **Releases** et
**Packages**.

> **Première publication** : vérifier dans GitHub (organisation → Packages →
> `numerik2026` → Package settings) que le paquet est **public**, sinon les
> serveurs ne pourront pas télécharger l'image sans identifiants.

## Mettre à jour un site (association)

*À venir (étape 4) : script `update.sh` — Docker : télécharge l'image de la
version voulue et redémarre ; Node seul : télécharge l'archive, remplace le
code sans toucher `src/content/`, `data/`, `.env`, puis redémarre. Le site se
reconstruit au démarrage (voir plus haut).*
