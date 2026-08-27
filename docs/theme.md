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

Pour changer une couleur de marque, modifier ces 3 valeurs hexadécimales : tout le site (boutons, liens, bandeaux, pastilles de catégorie) se met à jour automatiquement.

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

Le logo est importé directement dans les composants qui l'affichent (`Header.astro`, `Footer.astro`) depuis `src/styles/img/logo_transparent.png`, via le composant `<Image>` d'Astro (`astro:assets`) — ce qui l'optimise et le convertit automatiquement (redimensionnement, conversion WebP) au build.

Pour changer de logo : remplacer le fichier `src/styles/img/logo_transparent.png` par le nouveau (même nom, ou mettre à jour l'import dans `Header.astro` et `Footer.astro` si le nom change), en gardant si possible un fond transparent.

## Styles de base

Toujours dans `global.css` :

```css
body { font-family: var(--font-body); font-weight: 400; color: var(--color-gray-800); }
h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); font-weight: 600; }
```

Ce sont les réglages par défaut appliqués à tout le site (pas besoin de répéter `font-heading`/`font-body` sur chaque titre).
