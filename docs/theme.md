# Thème : couleurs, polices, logo

Tout le thème visuel part d'un seul fichier : **`src/styles/global.css`**.

## Couleurs

```css
@theme {
	--color-primary: #2f7fc1;   /* bleu — actions principales, liens */
	--color-secondary: #1fa39e; /* turquoise — bandeaux, dates/labels */
	--color-accent: #7cb93f;    /* vert — appels à l'action, boutons "Adhérer" */
}
```

Ce sont les couleurs **par défaut du modèle**. Chaque association règle les
siennes dans `src/content/reglages.yaml` :

```yaml
colors:
  primary: '#2f7fc1'
  secondary: '#1fa39e'
  accent: '#7cb93f'
  stripe: ['#4b4a9e', '#2f7fc1', '#1fa39e', '#7cb93f', '#e8b830', '#e2792f']  # bande sous l'en-tête
```

Les layouts injectent ces valeurs dans `<head>` (`themeCss`,
`src/config/site.ts`) : elles remplacent celles de `@theme`, et tout le site
suit (boutons, liens, bandeaux, pastilles, calendrier RDV, bordures de
l'agenda). Tailwind compile les classes avec `var(--color-…)` ; pour les
opacités (`bg-primary/10`), il ajoute une valeur figée de repli utilisée
seulement par les navigateurs sans `color-mix()` (antérieurs à 2023).
Dans le code, ne jamais recopier une couleur en hexadécimal : utiliser
`var(--color-primary)` ou une classe Tailwind. Les valeurs de `@theme`
restent alignées sur `DEFAULTS.colors`.

Ces couleurs sont utilisables partout dans le code via les classes Tailwind générées automatiquement : `bg-primary`, `text-secondary`, `border-accent`, `from-primary`, `to-secondary`, etc. (y compris avec opacité : `bg-primary/10`).

## Polices

```css
--font-heading: "Como", sans-serif;  /* titres (h1-h6, boutons) */
--font-body: "Aileron", sans-serif;  /* texte courant */
```

Les fichiers de police sont chargés juste au-dessus dans le même fichier :

```css
@font-face {
	font-family: "Aileron";
	src: url("./fonts/aileron/aileron-light.woff2") format("woff2"), ...;
	font-weight: 300;
}
@font-face {
	font-family: "Como";
	src: url("./fonts/como/como-semibold-webfont.woff2") format("woff2"), ...;
	font-weight: 600;
}
```

Les fichiers sont dans `src/styles/fonts/aileron/` et `src/styles/fonts/como/`. Pour changer de police :
1. Déposer les nouveaux fichiers `.woff2`/`.woff` dans `src/styles/fonts/<nom>/`.
2. Mettre à jour les chemins `src: url(...)` et le `font-weight` correspondant au fichier fourni.
3. Le nom donné après `font-family:` est libre (c'est un alias interne) — il doit juste correspondre à celui utilisé dans `--font-heading` / `--font-body`.

Utilisables via les classes `font-heading` et `font-body`.

## Logo

Les images propres à l'association vivent dans `src/content/images/` (dossier
de l'association, jamais remplacé par une mise à jour du modèle), retrouvées
par `src/lib/site-images.ts` quelle que soit leur extension :

| Fichier | Rôle |
| --- | --- |
| `logo.(png\|jpg\|webp\|svg)` | **Obligatoire.** En-tête et pied de page, via `<Image>` (`astro:assets` : redimensionné, converti en WebP au build). Largeur calculée d'après ses proportions (`logoWidth()`) : carré, large ou haut, il n'est ni rogné ni déformé. Fond transparent conseillé. |
| `accueil.(jpg\|png\|webp)` | Facultatif. Photo de fond du bandeau d'accueil ; absente = bandeau sans photo. |
| `favicon.(svg\|png\|ico)` | Facultatif, un ou plusieurs formats. Icône de l'onglet (une balise `<link rel="icon">` par fichier) ; `favicon.ico` (ou `.png`) est aussi servi à l'adresse `/favicon.ico` (`src/pages/favicon.ico.ts`). |

Pour changer de logo : remplacer `src/content/images/logo.png` (une autre
extension convient ; un seul fichier `logo.*`, sinon le build échoue).

## Styles de base

Toujours dans `global.css` :

```css
body { font-family: var(--font-body); font-weight: 400; color: var(--color-gray-800); }
h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); font-weight: 600; }
```

Ce sont les réglages par défaut appliqués à tout le site (pas besoin de répéter `font-heading`/`font-body` sur chaque titre).
