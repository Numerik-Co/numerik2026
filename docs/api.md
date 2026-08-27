# Routes serveur et intégration Grist

Le site est statique par défaut (`output: 'static'`, voir [developpement.md](developpement.md)). Certaines routes ont besoin d'un vrai serveur — typiquement pour appeler une API externe avec une clé secrète, ce qu'on ne peut jamais faire depuis le navigateur sans exposer cette clé à n'importe quel visiteur.

## Pourquoi pas d'appel direct à Grist depuis le navigateur

L'API de Grist s'authentifie avec une clé (`Authorization: Bearer <clé>`) qui donne accès en lecture/écriture au document. Si le futur formulaire d'adhésion appelait Grist directement depuis le JS du navigateur, cette clé se retrouverait visible dans le code source pour n'importe qui — permettant de lire, modifier ou supprimer les données du document, pas seulement d'envoyer un bulletin.

La solution : le formulaire (un îlot interactif — React/Vue/Svelte, voir la discussion sur les îlots Astro) n'appelle que notre propre route API. C'est cette route, exécutée côté serveur, qui détient la clé Grist et relaie la requête.

## Activer le rendu serveur pour une route

Par défaut toutes les pages restent pré-rendues en HTML statique. Pour qu'une route précise s'exécute côté serveur à chaque requête, il suffit d'ajouter dans son frontmatter/module :

```ts
export const prerender = false;
```

C'est ce que fait `src/pages/api/adherer.ts`. Le reste du site (toutes les autres pages) continue d'être généré statiquement au build, sans changement de comportement ni de performance.

## Adaptateur

`@astrojs/node` (mode `standalone`) fournit le serveur HTTP qui exécute ces routes. Configuré dans `astro.config.mjs` :

```js
import node from '@astrojs/node';

export default defineConfig({
	// ...
	adapter: node({ mode: 'standalone' }),
});
```

En développement (`astro dev`), tout fonctionne de façon transparente. En production sur un VPS/serveur dédié (OVH ou autre) :

1. `npm run build` — génère `dist/server/entry.mjs` (le serveur Node) en plus des fichiers statiques.
2. Lancer ce serveur en continu avec un process manager (ex. PM2 : `pm2 start dist/server/entry.mjs --name numerik2026`).
3. Mettre nginx/Apache en reverse proxy devant, avec le vrai nom de domaine.
4. Définir les variables d'environnement (voir plus bas) directement sur le serveur — jamais dans les fichiers commités.

## Variables d'environnement

Copier `.env.example` en `.env` (déjà dans `.gitignore`) et renseigner :

| Variable | Rôle |
| :--- | :--- |
| `GRIST_BASE_URL` | URL de l'instance Grist (ex. `https://grist.exemple.org`) |
| `GRIST_DOC_ID` | Identifiant du document Grist contenant la table des adhésions |
| `GRIST_TABLE_ID` | Nom de la table (ex. `Adherents`) |
| `GRIST_API_KEY` | Clé API Grist — **secret**, ne doit exister que dans `.env` côté serveur |

Ces variables sont typées dans `src/env.d.ts` pour l'auto-complétion sur `import.meta.env`.

## Route `src/pages/api/adherer.ts` (squelette)

État actuel : reçoit un JSON `{ nom, prenom, email, typeAdhesion }`, valide la présence de ces champs, puis relaie vers `POST {GRIST_BASE_URL}/api/docs/{GRIST_DOC_ID}/tables/{GRIST_TABLE_ID}/records`.

À ajuster une fois le formulaire et le schéma Grist définitifs :
- Les noms de champs (`nom`, `prenom`, `email`, `typeAdhesion` côté payload ; `Nom`, `Prenom`, `Email`, `TypeAdhesion` côté colonnes Grist) sont des placeholders.
- La validation (`isValidPayload`) est minimale — à étoffer selon les champs réels du bulletin (téléphone, adresse, type de cotisation, etc.).
- Pas encore de protection anti-spam (honeypot, rate-limit) ni d'email de confirmation — à ajouter si besoin.

Le futur composant de formulaire (îlot) appelle cette route ainsi :

```js
const res = await fetch('/api/adherer', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ nom, prenom, email, typeAdhesion }),
});
```
