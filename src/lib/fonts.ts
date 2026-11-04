/**
 * CSS des polices du site (build) : `@font-face` des seules polices
 * choisies (`site.polices`, `src/config/site.ts`) + variables
 * `--font-heading` / `--font-body` (remplacent celles de `@theme` dans
 * `global.css`, comme `themeCss` pour les couleurs). Injecté dans `<head>`
 * par les deux layouts (`fontsCss`, préchargement `fontPreloads`).
 *
 * - Police proposée : fichiers latin + latin étendu du paquet
 *   `@fontsource-variable/<id>` (seul le sous-ensemble utile est téléchargé,
 *   `unicode-range`).
 * - Police déposée : fichiers de `src/content/polices/` (`import.meta.glob`,
 *   suivi par Vite) ; fichier déclaré mais absent = build en échec.
 *
 * Code serveur / build (les URL ne servent à l'îlot Vue que via l'API).
 */

import { site, type UploadedFont } from '../config/site';
import { catalogueFont, FALLBACK_STACK, FONT_FORMATS, type CatalogueFontId, type FontExt, type FontRole } from './font-catalogue';

import MontserratLatin from '@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2?url';
import MontserratLatinExt from '@fontsource-variable/montserrat/files/montserrat-latin-ext-wght-normal.woff2?url';
import OpenSansLatin from '@fontsource-variable/open-sans/files/open-sans-latin-wght-normal.woff2?url';
import OpenSansLatinExt from '@fontsource-variable/open-sans/files/open-sans-latin-ext-wght-normal.woff2?url';
import InterLatin from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
import InterLatinExt from '@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2?url';
import RobotoLatin from '@fontsource-variable/roboto/files/roboto-latin-wght-normal.woff2?url';
import RobotoLatinExt from '@fontsource-variable/roboto/files/roboto-latin-ext-wght-normal.woff2?url';
import RalewayLatin from '@fontsource-variable/raleway/files/raleway-latin-wght-normal.woff2?url';
import RalewayLatinExt from '@fontsource-variable/raleway/files/raleway-latin-ext-wght-normal.woff2?url';
import SourceSans3Latin from '@fontsource-variable/source-sans-3/files/source-sans-3-latin-wght-normal.woff2?url';
import SourceSans3LatinExt from '@fontsource-variable/source-sans-3/files/source-sans-3-latin-ext-wght-normal.woff2?url';
import NunitoLatin from '@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2?url';
import NunitoLatinExt from '@fontsource-variable/nunito/files/nunito-latin-ext-wght-normal.woff2?url';
import WorkSansLatin from '@fontsource-variable/work-sans/files/work-sans-latin-wght-normal.woff2?url';
import WorkSansLatinExt from '@fontsource-variable/work-sans/files/work-sans-latin-ext-wght-normal.woff2?url';
import LoraLatin from '@fontsource-variable/lora/files/lora-latin-wght-normal.woff2?url';
import LoraLatinExt from '@fontsource-variable/lora/files/lora-latin-ext-wght-normal.woff2?url';

/** Fichiers des polices proposées (URL servies par le site). */
export const CATALOGUE_FILES: Record<CatalogueFontId, { latin: string; latinExt: string }> = {
	'montserrat': { latin: MontserratLatin, latinExt: MontserratLatinExt },
	'open-sans': { latin: OpenSansLatin, latinExt: OpenSansLatinExt },
	'inter': { latin: InterLatin, latinExt: InterLatinExt },
	'roboto': { latin: RobotoLatin, latinExt: RobotoLatinExt },
	'raleway': { latin: RalewayLatin, latinExt: RalewayLatinExt },
	'source-sans-3': { latin: SourceSans3Latin, latinExt: SourceSans3LatinExt },
	'nunito': { latin: NunitoLatin, latinExt: NunitoLatinExt },
	'work-sans': { latin: WorkSansLatin, latinExt: WorkSansLatinExt },
	'lora': { latin: LoraLatin, latinExt: LoraLatinExt },
};

// Plages Unicode de Fontsource (identiques pour toutes les polices du catalogue).
const LATIN =
	'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT =
	'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

const uploadedFiles: Record<string, string> = import.meta.glob('../content/polices/*.{woff2,woff,ttf,otf}', {
	eager: true,
	query: '?url',
	import: 'default',
});
const uploadedUrl = (file: string): string => {
	const url = Object.entries(uploadedFiles).find(([path]) => path.endsWith(`/${file}`))?.[1];
	if (!url) throw new Error(`src/content/polices/${file} manquant (déclaré dans polices.deposees de reglages.yaml).`);
	return url;
};

const q = (family: string) => `"${family.replace(/["\\]/g, '')}"`;
const face = (family: string, weight: string, src: string, range?: string) =>
	`@font-face{font-family:${q(family)};font-style:normal;font-display:swap;font-weight:${weight};src:${src}${range ? `;unicode-range:${range}` : ''}}`;

interface Resolved {
	family: string;
	faces: string[];
	/** Fichier principal à précharger (woff2 seulement). */
	preload?: string;
	fallback: string;
}

function resolve(role: FontRole, value: string, fonts: UploadedFont[]): Resolved {
	const cat = catalogueFont(value);
	if (cat) {
		const files = CATALOGUE_FILES[cat.id as CatalogueFontId];
		return {
			family: cat.family,
			faces: [
				face(cat.family, cat.weight, `url(${files.latinExt}) format("woff2")`, LATIN_EXT),
				face(cat.family, cat.weight, `url(${files.latin}) format("woff2")`, LATIN),
			],
			preload: files.latin,
			fallback: FALLBACK_STACK[cat.kind],
		};
	}
	const font = fonts.find((f) => f.nom === value)!;
	const entries = Object.entries(font.fichiers) as [string, string][];
	const faces = entries.map(([weight, file]) => {
		const ext = file.split('.').pop() as FontExt;
		return face(font.nom, weight === 'variable' ? '100 900' : weight, `url(${uploadedUrl(file)}) format("${FONT_FORMATS[ext]}")`);
	});
	// Préchargé (woff2) : fichier variable, sinon la graisse principale du rôle (texte 400, titres 600), sinon le premier.
	const woff2 = entries.filter(([, f]) => f.endsWith('.woff2'));
	const main = role === 'titres' ? '600' : '400';
	const pick = woff2.find(([w]) => w === 'variable') ?? woff2.find(([w]) => w === main) ?? woff2[0];
	return { family: font.nom, faces, preload: pick ? uploadedUrl(pick[1]) : undefined, fallback: FALLBACK_STACK.sans };
}

const roles: Record<FontRole, Resolved> = {
	titres: resolve('titres', site.polices.titres, site.polices.deposees),
	texte: resolve('texte', site.polices.texte, site.polices.deposees),
};

/** `@font-face` des polices choisies + variables du thème. */
export const fontsCss = [
	...new Set([...roles.titres.faces, ...roles.texte.faces]),
	`:root{--font-heading:${q(roles.titres.family)},${roles.titres.fallback};--font-body:${q(roles.texte.family)},${roles.texte.fallback}}`,
].join('\n');

/** Fichiers à précharger (`<link rel="preload" as="font">`) : texte puis titres. */
export const fontPreloads = [...new Set([roles.texte.preload, roles.titres.preload].filter((u): u is string => Boolean(u)))];
