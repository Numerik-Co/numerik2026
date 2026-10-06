# Bibliothèque de snippets

Blocs prêts à copier-coller, **tirés du code réel du projet**. Chaque snippet
renvoie à la doc qui détaille les champs. Deux parties :

- [Contenu](#contenu-éditeurs) — ce qu'on écrit dans `src/content/` (aucun
  code à toucher) ;
- [Développement](#développement) — composants et motifs utilisés dans
  `src/pages/`, `src/components/` et les routes API.

> Règle d'or côté contenu : valeurs du frontmatter **entre guillemets
> doubles**, dates au format `AAAA-MM-JJ`.

---

## Contenu (éditeurs)

### Frontmatter d'une actualité

`src/content/news/AAAA-MM-JJ-mon-titre/index.md` (+ la photo citée par
`cover:`, dans le même dossier). Schéma : `src/content.config.ts`. Détail :
[actualites.md](actualites.md).

```markdown
---
title: "Fête de la Science 2026 : retrouvez-nous au Village des Sciences"
isPublish: true
publishAt: 2026-09-22
excerpt: "Une phrase de résumé, reprise dans les cartes et le partage."
tag: "Vie associative"
author: "numérik&Co"
cover: ./cover.jpg
imageCredit: "Photo : Prénom Nom / Source"
---
```

### Frontmatter d'une activité

`src/content/activites/<slug>/index.md` (+ `cover.jpg` facultatif). Détail :
[activites.md](activites.md), bouton « S'inscrire » : [inscription.md](inscription.md#présélection).

```markdown
---
title: "Atelier — Intelligence artificielle : comprendre pour mieux choisir"
isPublish: true
excerpt: "L'IA, oui — mais laquelle, et pour quoi faire ?"
category: "ateliers"            # parcours | ateliers | mediation-numerique | fablab
activiteGrist: "Module IA"      # nom Grist visé par « S'inscrire » (liste possible, « Initiation* » = préfixe)
# typeGrist: "Atelier CN"       # ou un type Grist entier
# inscription: false            # masque le bouton « S'inscrire »
level: "Initiation"
imageCredit: "Photo : Prénom Nom / Pexels"
order: 10
---
```

Plusieurs créneaux Grist pour une même fiche :

```markdown
activiteGrist:
  - "Initiation Mardi 16h30"
  - "Initiation Jeudi 16h30"
```

### Frontmatter d'une page de contenu

`src/content/pages/<slug>/index.md` → URL `/<slug>`. Détail :
[pages.md](pages.md), menu : [navigation.md](navigation.md).

```markdown
---
title: "Adhérer en tant qu'association"
description: "Phrase affichée sous le titre et reprise en description SEO."
menu:
  show: true        # false = page accessible mais absente du menu
  order: 40
  label: "Associations partenaires"   # libellé du menu, si différent du titre
---
```

### Page réservée (espace bénévoles)

Frontmatter d'une page de contenu, cf. [auth.md](auth.md). Jamais dans le menu.

```markdown
---
title: "Fiches animateur·rice·s"
access: animateur          # true = toute personne connectée ; [animateur, admin]…
---
```

### Menu déroulant (dossier de pages)

`src/content/pages/<dossier>/_group.md` — toutes les pages du dossier
deviennent les entrées d'un menu déroulant. Détail : [navigation.md](navigation.md).

```markdown
---
# Le libellé n'est pas cliquable : seules les pages enfants ont un lien.
label: "Association"
order: 10
---
```

### Annonce dans la bannière

À ajouter dans la liste `annonces` de `src/content/annonces.md`. Détail :
[annonces.md](annonces.md).

```yaml
  - id: "ag-2026"
    title: "Assemblée générale 2026"
    message: "Notre assemblée générale annuelle approche. Votre présence compte."
    startDate: "2026-08-20"
    endDate: "2026-09-18"
    tone: "info"                 # info | accent | urgent
    icon: "fa-calendar-days"
    ctaLabel: "Voir les détails"
    ctaHref: "/actualites/2026-08-17-assemblee-generale-2026"
```

### Markdown courant

```markdown
## Infos pratiques

- **Date** : samedi 3 octobre 2026
- **Lieu** : place de la Mairie, Mont-de-Marsan

> Plus d'informations sur le [site de la Fête de la Science](https://www.fetedelascience.fr/).

Voir le détail des [tarifs 2026-2027](/adherer).
```

Les titres `##` alimentent le sommaire de la colonne de droite.

### Blocs MDX (pages `.mdx` uniquement)

Pour utiliser les blocs ci-dessous, la page doit être un **`index.mdx`**
(pas `.md`). Exemple complet :
`src/content/pages/association/adhesion-associations/index.mdx`.

#### Bouton

```mdx
import Button from '../../../../components/ui/Button.astro';

<div class="mt-6">
  <Button href="/contact" variant="primary">Nous contacter</Button>
</div>
```

`variant` : `primary` (défaut), `secondary`, `outline`. Le chemin de
l'`import` dépend de la profondeur du dossier : un `../` par niveau jusqu'à
`src/`.

#### Grille de cartes avec icône

Deux colonnes à partir de la tablette ; dupliquer le bloc de carte autant
que nécessaire. Icônes : [Font Awesome solid](https://fontawesome.com/search?o=r&s=solid&f=classic).

```mdx
<div class="mt-8 grid gap-6 sm:grid-cols-2">
  <div class="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
    <span class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl text-primary">
      <i class="fa-solid fa-cloud" aria-hidden="true"></i>
    </span>
    <p class="font-heading text-lg font-semibold text-gray-900">Titre de la carte</p>
    <p class="mt-2 text-sm font-light text-gray-600">Texte de la carte, **gras** et [liens](/contact) acceptés.</p>
  </div>
</div>
```

Liste à puces dans une carte :

```mdx
    <ul class="mt-3 space-y-1 text-sm font-light text-gray-600">
      <li>Premier point</li>
      <li>Second point</li>
    </ul>
```

#### Encadré tarif

```mdx
<div class="mt-6 flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-6">
  <span class="font-light text-gray-600">Adhésion structure, valable de septembre à juin</span>
  <span class="font-heading text-2xl font-semibold text-gray-900">110 € / an</span>
</div>
```

#### Valeur tirée de la configuration

Évite de recopier nom, adresse… qui changent d'un déploiement à l'autre
(voir `src/content/pages/mentions-legales/index.mdx`).

```mdx
import { association, getFullAddress } from '../../../lib/association';

export const president = association.legal.president || '[Nom du président]';

L'association **{association.name}** est présidée par {president}.
```

---

## Développement

### Page applicative (`.astro`) avec en-tête

Détail : [pages.md](pages.md#ajouter-une-page-applicative-astro).

Modèle : `src/pages/inscription.astro`.

```astro
---
import Layout from '../layouts/Layout.astro';
import PageHeader from '../components/sections/PageHeader.astro';
import { association } from '../lib/association';
---

<Layout
	title={`Titre de la page · ${association.name}`}
	description="Description SEO de la page."
	breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Titre de la page' }]}
>
	<PageHeader slot="page-header" title="Titre de la page" description="Sous-titre facultatif." />

	<section class="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:px-6">
		…
	</section>
</Layout>
```

`PageHeader` va dans le slot `page-header` du layout (bandeau pleine largeur).

### Sections de l'accueil

```astro
<RdvCtaSection />

<CtaSection
	title="Envie de nous rejoindre ?"
	description={`Bénévoles, adhérent·e·s ou partenaires : chacun·e a sa place chez ${association.name}.`}
	buttonLabel="Adhérer à l'association"
	buttonHref="/adherer"
/>
```

`RdvCtaSection` accepte aussi `eyebrow`, `title`, `description`,
`buttonLabel`, `buttonHref`. Détail : [composants.md](composants.md).

### Planning de la semaine

```astro
---
import WeeklyAgenda from '../components/sections/WeeklyAgenda.astro';
---

<WeeklyAgenda showHeading={false} />
```

Sans `sessions`, c'est le planning figé de secours (`weeklyAgenda`) ;
`/activites` passe les créneaux lus dans Grist. Props : `sessions`,
`showHeading`, `title`, `description`, `showLegend`, `startHour`, `endHour`,
`class`.

### Formulaire ouvert / fermé

1. Déclarer la clé dans `site.forms` (`src/config/site.ts`) :

```ts
forms: {
	monFormulaire: {
		enabled: true,
		closedTitle: 'Formulaire momentanément fermé',
		closedMessage: "Ce formulaire n'est pas ouvert actuellement. …",
	},
},
```

2. Entourer le formulaire (voir `src/pages/inscription.astro`). Le slot
   `fallback`, facultatif, s'affiche sous l'encart quand le formulaire est
   fermé :

```astro
<FormGate form="monFormulaire">
	<form class="space-y-4">…</form>

	<Button slot="fallback" href="/contact" variant="primary">Nous contacter</Button>
</FormGate>
```

3. Masquer un bouton ailleurs quand le formulaire est fermé :

```astro
---
import { isFormOpen } from '../lib/forms';
const visible = isFormOpen('monFormulaire');
---
{visible && <Button href="/mon-formulaire">Accéder au formulaire</Button>}
```

Détail : [composants.md](composants.md#forms).

### Partage et image d'article

```astro
<ShareTools title={title} />

<FigureImage image={cover} alt={title} caption={imageCredit} loading="eager" />
```

`ShareTools` : `url` facultative (défaut = URL publique de la page).
Détail : [partage.md](partage.md).

### Îlot Vue

```astro
---
import InscriptionForm from '../components/inscription/InscriptionForm.vue';
---

<FormGate form="inscription">
	<InscriptionForm client:load />

	<Button slot="fallback" href="/contact" variant="primary">Nous contacter</Button>
</FormGate>
```

Côté navigateur, on ne parle jamais à Grist : on passe par les routes
`/api/*` via le client typé (`src/components/adhesion/client.ts`) :

```ts
import { adhesionApi } from '../adhesion/client';

const res = await adhesionApi.retrouverMembre({ nom, prenom });
```

### Route API Grist

Motif de toutes les routes `src/pages/api/adhesion/*.ts` : rendu serveur,
validation du corps, erreurs Grist relayées avec leur statut. Détail :
[api.md](api.md).

```ts
import type { APIRoute } from 'astro';
import { COLS, GristError, listRecords, TABLES } from '../../../lib/adhesion/grist';
import { json } from '../../../lib/adhesion/http';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') {
		return json({ error: 'Requête invalide.' }, 400);
	}
	const { membreId } = body as Record<string, unknown>;
	if (typeof membreId !== 'number') {
		return json({ error: 'membreId requis.' }, 400);
	}

	try {
		const [membre] = await listRecords(TABLES.membres, { id: [membreId] });
		if (!membre) return json({ error: 'Membre inconnu.' }, 400);
		// … createRecord / updateRecord …
		return json({ ok: true });
	} catch (err) {
		const status = err instanceof GristError ? err.status : 500;
		console.error('[api/adhesion/ma-route]', err);
		return json({ error: "Échec de l'opération." }, status);
	}
};
```

Toujours passer par `COLS.*` / `TABLES.*` plutôt que d'écrire les noms de
colonnes Grist en dur ; une nouvelle colonne s'ajoute dans `COLS`
(`src/lib/adhesion/grist.ts`).

### Module de l'espace bénévoles

Panneau latéral ouvert depuis la barre admin, cf. [auth.md](auth.md#ajouter-un-module).

```ts
// src/components/admin/modules.ts — entrée de ADMIN_MODULES
{
	id: 'rdv',
	label: 'Rendez-vous',
	icon: 'fa-calendar-check',
	groups: ['admin'], // [] = toute personne connectée
	component: defineAsyncComponent(() => import('./modules/RdvModule.vue')),
},
```

```vue
<!-- src/components/admin/modules/RdvModule.vue -->
<script setup lang="ts">
import { inject } from 'vue';
import { ApiError } from '../client';
import { ADMIN_CONTEXT } from '../context';

const { user, sessionExpired } = inject(ADMIN_CONTEXT)!;
// appel API : catch (e) { if (e instanceof ApiError && e.status === 401) sessionExpired(); }
</script>
```

Bouton qui ouvre la connexion, n'importe où : `<button type="button" data-auth-open>Se connecter</button>`.

### Classes Tailwind récurrentes

| Usage | Classes |
| :--- | :--- |
| Carte | `rounded-2xl border border-gray-100 bg-white p-6 shadow-sm` |
| Titre de carte | `font-heading text-lg font-semibold text-gray-900` |
| Texte secondaire | `text-sm font-light text-gray-600` |
| Pastille d'icône | `flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl text-primary` |
| Bouton d'action (formulaires Vue) | `rounded-full bg-accent px-6 py-2.5 font-heading font-semibold text-white hover:opacity-90` |
| Message d'erreur | `rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700` |

Couleurs (`primary`, `secondary`, `accent`) et polices : [theme.md](theme.md).
