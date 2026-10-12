/**
 * Charte graphique de l'association, depuis le module « Association »
 * (onglet « Charte graphique », bureau) : couleurs du thème (`colors:` de
 * `src/content/reglages.yaml`, lu par `src/config/site.ts`), logo et icône
 * d'onglet (`src/content/images/`, lus par `src/lib/site-images.ts`). La
 * publication (reconstruction du site) est faite par `site-build.ts`, via
 * `admin-publish.ts`.
 *
 * - Couleurs : valeurs changées en place (`yaml` Document : commentaires et
 *   autres réglages gardés), fichier revalidé par `parseReglages()`.
 * - Logo : remplace `logo.*` (PNG, JPEG, WebP ou SVG). Image matricielle
 *   réduite à `LOGO_MAX_WIDTH` px de large au plus, métadonnées retirées.
 * - Icône d'onglet : remplace tous les `favicon.*`. PNG recadré en carré
 *   (fond transparent) de `FAVICON_SIZE` px au plus ; SVG accompagné d'un
 *   `favicon.png` tiré de lui (navigateurs anciens, `/favicon.ico`) ; ICO
 *   gardé tel quel.
 * - SVG refusé s'il contient du script ou des contenus actifs : le fichier
 *   est servi tel quel par le site.
 *
 * « Transaction » : dossier `images/` sauvegardé (`contentTransaction`) et
 * texte de `reglages.yaml` gardé en mémoire, tout est remis si la
 * reconstruction échoue.
 *
 * Code serveur uniquement.
 */

import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { isMap, isScalar, isSeq, parseDocument, Scalar, YAMLMap, type Document } from 'yaml';
import { COLOR_PATTERN, DEFAULT_COLORS, parseReglages, type ThemeColors } from '../config/site';
import { contentTransaction, type Applied } from './content-transaction';
import { siteRoot } from './news-writer';

export const LOGO_MAX_WIDTH = 1600;
export const FAVICON_SIZE = 512;
export const BRAND_FILE_MAX_BYTES = 5 * 1024 * 1024;
export const STRIPE_MAX = 12;

/** Formats acceptés à l'envoi → extension du fichier écrit. */
export const LOGO_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
export const FAVICON_TYPES: Record<string, string> = {
	'image/svg+xml': 'svg',
	'image/png': 'png',
	'image/x-icon': 'ico',
	'image/vnd.microsoft.icon': 'ico',
};

const PREVIEW_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon' };

const imagesDir = () => join(siteRoot(), 'src', 'content', 'images');
const reglagesFile = () => join(siteRoot(), 'src', 'content', 'reglages.yaml');

// --- Lecture ---------------------------------------------------------------

export interface BrandImage {
	file: string;
	/** Aperçu (data URL, réduit pour les images matricielles). */
	preview: string;
}

export interface BrandSource {
	colors: ThemeColors;
	defaults: ThemeColors;
	logo: BrandImage | null;
	favicons: BrandImage[];
}

async function preview(file: string): Promise<BrandImage> {
	const ext = file.split('.').pop()!.toLowerCase();
	let data = await readFile(join(imagesDir(), file));
	let type = PREVIEW_TYPES[ext] ?? 'application/octet-stream';
	if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') {
		data = await sharp(data).resize({ height: 160, withoutEnlargement: true }).png().toBuffer();
		type = 'image/png';
	}
	return { file, preview: `data:${type};base64,${data.toString('base64')}` };
}

/** Ordre des icônes : comme `site-images.ts` (SVG, PNG, puis ICO). */
const EXT_ORDER = ['svg', 'png', 'webp', 'jpg', 'jpeg', 'ico'];

async function imageFiles(name: 'logo' | 'favicon'): Promise<string[]> {
	const files = await readdir(imagesDir()).catch(() => [] as string[]);
	const rank = (f: string) => EXT_ORDER.indexOf(f.split('.').pop()!.toLowerCase());
	return files.filter((f) => f.startsWith(`${name}.`)).sort((a, b) => rank(a) - rank(b));
}

export async function readBrandSource(): Promise<BrandSource> {
	const { colors } = parseReglages(await readFile(reglagesFile(), 'utf8').catch(() => ''));
	const [logo] = await imageFiles('logo');
	return {
		colors,
		defaults: DEFAULT_COLORS,
		logo: logo ? await preview(logo) : null,
		favicons: await Promise.all((await imageFiles('favicon')).map(preview)),
	};
}

// --- Contrôles -------------------------------------------------------------

export interface BrandUpload {
	type: string;
	data: Buffer;
}

export interface BrandInput {
	colors: ThemeColors;
	logo: BrandUpload | null;
	favicon: BrandUpload | null;
}

/** Contenus actifs interdits dans un SVG servi tel quel par le site. */
const SVG_DANGER = /<script|<foreignObject|<iframe|<embed|<object|\bon[a-z]+\s*=|javascript:|<!ENTITY|xlink:href\s*=\s*["']?\s*(?!#)|\bhref\s*=\s*["']?\s*(?!#|data:image\/)/i;

function svgProblem(data: Buffer, what: string): string | null {
	const text = data.toString('utf8');
	if (!/<svg[\s>]/i.test(text)) return `${what} : fichier SVG illisible.`;
	if (SVG_DANGER.test(text)) return `${what} : ce SVG contient du script ou des liens externes, refusé par sécurité. Exportez-le en « SVG simple » ou en PNG.`;
	return null;
}

function validateColors(colors: ThemeColors): string[] {
	const errors: string[] = [];
	const names: Record<string, string> = { primary: 'principale', secondary: 'secondaire', accent: "d'accent" };
	for (const key of ['primary', 'secondary', 'accent'] as const) {
		if (!COLOR_PATTERN.test(colors[key])) errors.push(`Couleur ${names[key]} invalide (format #2f7fc1).`);
	}
	if (!colors.stripe.length) errors.push('La bande de couleurs doit compter au moins une couleur.');
	else if (colors.stripe.length > STRIPE_MAX) errors.push(`La bande de couleurs compte ${STRIPE_MAX} couleurs au plus.`);
	else if (colors.stripe.some((c) => !COLOR_PATTERN.test(c))) errors.push('Une couleur de la bande est invalide (format #2f7fc1).');
	return errors;
}

// --- Écriture --------------------------------------------------------------

/** Table YAML à `path`, créée si absente ou vide. */
function ensureMap(doc: Document, path: string[]): YAMLMap {
	const node = doc.getIn(path, true);
	if (isMap(node)) return node;
	const map = new YAMLMap();
	doc.setIn(path, map);
	return map;
}

function quoted(value: string): Scalar {
	const scalar = new Scalar(value);
	scalar.type = Scalar.QUOTE_SINGLE;
	return scalar;
}

/** Couleurs écrites dans le document (nœuds gardés : commentaires, guillemets ; bande sur une ligne). */
function setColors(doc: Document, colors: ThemeColors): void {
	const map = ensureMap(doc, ['colors']);
	for (const key of ['primary', 'secondary', 'accent'] as const) {
		const node = map.get(key, true);
		if (isScalar(node)) node.value = colors[key];
		else map.set(key, quoted(colors[key]));
	}
	const current = map.get('stripe', true);
	const seq = doc.createNode(colors.stripe.map(quoted), { flow: true });
	if (isSeq(current) && isSeq(seq)) {
		current.items = seq.items;
		current.flow = current.flow ?? true;
	} else map.set('stripe', seq);
}

const sameColors = (a: ThemeColors, b: ThemeColors) => JSON.stringify(a) === JSON.stringify(b);

async function processLogo(upload: BrandUpload): Promise<{ ext: string; data: Buffer } | { error: string }> {
	const ext = LOGO_TYPES[upload.type];
	if (!ext) return { error: 'Logo : formats acceptés PNG, JPEG, WebP ou SVG.' };
	if (ext === 'svg') {
		const problem = svgProblem(upload.data, 'Logo');
		return problem ? { error: problem } : { ext, data: upload.data };
	}
	try {
		const image = sharp(upload.data).rotate();
		const meta = await image.metadata();
		if (!meta.width || !meta.height) return { error: 'Logo : image illisible.' };
		if (meta.width > LOGO_MAX_WIDTH) image.resize({ width: LOGO_MAX_WIDTH });
		const out = ext === 'png' ? image.png() : ext === 'webp' ? image.webp({ quality: 90 }) : image.jpeg({ quality: 90 });
		return { ext, data: await out.toBuffer() };
	} catch {
		return { error: 'Logo : image illisible.' };
	}
}

/** Fichiers `favicon.*` à écrire (un SVG donne aussi un PNG). */
async function processFavicon(upload: BrandUpload): Promise<{ files: { ext: string; data: Buffer }[] } | { error: string }> {
	const ext = FAVICON_TYPES[upload.type];
	if (!ext) return { error: 'Icône d’onglet : formats acceptés SVG, PNG ou ICO.' };
	const square = (input: Buffer) =>
		sharp(input)
			.resize({ width: FAVICON_SIZE, height: FAVICON_SIZE, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, withoutEnlargement: true })
			.png()
			.toBuffer();
	if (ext === 'ico') {
		const isIco = upload.data.length > 6 && upload.data.readUInt32BE(0) === 0x00000100;
		return isIco ? { files: [{ ext, data: upload.data }] } : { error: 'Icône d’onglet : fichier ICO illisible.' };
	}
	if (ext === 'svg') {
		const problem = svgProblem(upload.data, 'Icône d’onglet');
		if (problem) return { error: problem };
		const files = [{ ext, data: upload.data }];
		try {
			files.push({ ext: 'png', data: await sharp(upload.data, { density: 300 }).resize(FAVICON_SIZE, FAVICON_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer() });
		} catch {
			// SVG non rendu par sharp : le SVG seul suffit aux navigateurs récents.
		}
		return { files };
	}
	try {
		const meta = await sharp(upload.data).metadata();
		if (!meta.width || !meta.height) return { error: 'Icône d’onglet : image illisible.' };
		return { files: [{ ext, data: await square(upload.data) }] };
	} catch {
		return { error: 'Icône d’onglet : image illisible.' };
	}
}

export type BrandResult = { applied?: Applied; changes: string[]; errors: string[] };

export async function saveBrand(input: BrandInput): Promise<BrandResult> {
	const errors = validateColors(input.colors);
	const logo = input.logo ? await processLogo(input.logo) : null;
	const favicon = input.favicon ? await processFavicon(input.favicon) : null;
	if (logo && 'error' in logo) errors.push(logo.error);
	if (favicon && 'error' in favicon) errors.push(favicon.error);
	if (errors.length) return { changes: [], errors };

	const originalReglages = await readFile(reglagesFile(), 'utf8').catch(() => null);
	const colorsChanged = !sameColors(parseReglages(originalReglages ?? '').colors, input.colors);
	const changes = [colorsChanged && 'couleurs', logo && 'logo', favicon && 'icône d’onglet'].filter((c): c is string => Boolean(c));
	if (!changes.length) return { changes, errors: ["Rien n'a changé."] };

	let reglagesText: string | null = null;
	if (colorsChanged) {
		const doc = parseDocument(originalReglages ?? '');
		if (doc.errors.length) return { changes, errors: [`reglages.yaml illisible : ${doc.errors[0].message}`] };
		if (doc.contents === null) doc.contents = new YAMLMap() as never;
		setColors(doc, input.colors);
		reglagesText = doc.toString({ lineWidth: 0, flowCollectionPadding: false });
		parseReglages(reglagesText);
	}

	const images = await contentTransaction(imagesDir(), 'images', async (root) => {
		const existing = await readdir(root);
		if (logo && 'data' in logo) {
			for (const f of existing.filter((f) => f.startsWith('logo.'))) await rm(join(root, f));
			await writeFile(join(root, `logo.${logo.ext}`), logo.data);
		}
		if (favicon && 'files' in favicon) {
			for (const f of existing.filter((f) => f.startsWith('favicon.'))) await rm(join(root, f));
			for (const file of favicon.files) await writeFile(join(root, `favicon.${file.ext}`), file.data);
		}
	});
	try {
		if (reglagesText !== null) await writeFile(reglagesFile(), reglagesText, 'utf8');
	} catch (err) {
		await images.restore();
		throw err;
	}
	return {
		changes,
		errors: [],
		applied: {
			restore: async () => {
				await images.restore();
				if (reglagesText !== null && originalReglages !== null) await writeFile(reglagesFile(), originalReglages, 'utf8');
				else if (reglagesText !== null) await rm(reglagesFile(), { force: true });
			},
			purge: images.purge,
		},
	};
}

/** Corps JSON du formulaire → `BrandInput` (types forcés, rien n'est validé ici). */
export function readBrandInput(raw: unknown): BrandInput | { error: string } {
	const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	const c = (r.colors && typeof r.colors === 'object' ? r.colors : {}) as Record<string, unknown>;
	const color = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
	const upload = (v: unknown, what: string): BrandUpload | null | { error: string } => {
		if (!v || typeof v !== 'object') return null;
		const u = v as { type?: unknown; data?: unknown };
		const data = Buffer.from(String(u.data ?? ''), 'base64');
		if (!data.length) return { error: `${what} : fichier vide.` };
		if (data.length > BRAND_FILE_MAX_BYTES) return { error: `${what} : fichier trop lourd (5 Mo max).` };
		return { type: String(u.type ?? ''), data };
	};
	const logo = upload(r.logo, 'Logo');
	const favicon = upload(r.favicon, 'Icône d’onglet');
	if (logo && 'error' in logo) return logo;
	if (favicon && 'error' in favicon) return favicon;
	return {
		colors: {
			primary: color(c.primary),
			secondary: color(c.secondary),
			accent: color(c.accent),
			stripe: Array.isArray(c.stripe) ? c.stripe.map(color) : [],
		},
		logo,
		favicon,
	};
}
