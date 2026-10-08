/**
 * Écriture des pages de contenu et des menus dans les sources
 * (`src/content/pages/`) depuis le module « Pages » de l'espace bénévoles.
 * La publication (reconstruction du site) est faite par `site-build.ts`.
 *
 * Structure gérée (cf. `src/lib/content-pages.ts`) :
 *   <slug>/index.md                  page à la racine (lien de premier niveau si `menu.show`)
 *   <menu>/_group.md                 menu déroulant : libellé + ordre, sans contenu
 *   <menu>/<slug>/index.md           page du menu
 *   espace-benevoles/<slug>/index.md page réservée (`access:`), jamais dans le menu
 *
 * Tout est vérifié AVANT d'écrire, avec les règles du schéma de la collection
 * (`src/content.config.ts`, catalogue `src/lib/blocs.ts`) : une page qui
 * ferait échouer le build est refusée avec un message clair.
 *
 * Chaque modification se fait dans une « transaction » : copie de sauvegarde
 * de tout `src/content/pages/` (quelques fichiers), modification, puis
 * `restore` (reconstruction en échec) ou `purge` (nouvelle version en ligne).
 * Une page déplacée change d'URL ; les pages `.mdx` (code) ne sont jamais
 * modifiées ici.
 *
 * Code serveur uniquement.
 */

import { cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { isAuthGroup, type AuthGroup } from './auth/groups';
import { blocMarkdownTexts, blocMarkersIn, validateBloc, type Bloc } from './blocs';
import { RESERVED_FOLDER } from './content-pages';
import { checkBody, COVER_ERROR, siteRoot, slugify, workDir, workRoot, writeCover, type CoverChange } from './news-writer';
import { unknownPageVariables } from './page-variables';

export { type CoverChange };

/** Segment d'URL (page ou menu) : minuscules, chiffres, tirets. */
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEGMENT_MAX = 60;
const BODY_MAX = 200 * 1024;

export type Placement = { kind: 'racine' } | { kind: 'menu'; menu: string } | { kind: 'reservee' };

export interface PageInput {
	placement: Placement;
	/** Dernier segment de l'URL ; déduit du titre s'il est vide. */
	slug: string;
	title: string;
	description: string;
	type: 'classique' | 'enrichie';
	/** Présence dans le menu (page à la racine ou dans un menu ; ignoré pour une page réservée). */
	menu: { show: boolean; order: number; label: string };
	/** Page réservée : groupes autorisés ; vide = toute personne connectée. */
	access: AuthGroup[];
	body: string;
	blocs: Record<string, unknown>;
	imageCredit: string;
}

export interface PageSource extends PageInput {
	/** Chemin complet (= URL sans `/`). */
	path: string;
	/** `cover:` actuel (`./cover.jpg`) ou `null`. */
	cover: string | null;
	/** Page `.mdx` écrite dans le code : lecture seule dans le module. */
	technique: boolean;
}

export interface MenuSource {
	folder: string;
	label: string;
	order: number;
	/** Pages du menu (chemins). */
	pages: string[];
}

export function pagesSourceDir(): string {
	return join(siteRoot(), 'src', 'content', 'pages');
}

function readFrontmatter(text: string): { data: Record<string, unknown>; body: string } {
	const clean = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
	const match = clean.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
	let data: Record<string, unknown> = {};
	try {
		const parsed = match ? parseYaml(match[1]) : null;
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed;
	} catch {
		// En-tête illisible : champs vides, la personne les corrige.
	}
	return { data, body: (match ? clean.slice(match[0].length) : clean).trim() };
}

const exists = (path: string) => stat(path).then(() => true, () => false);

/** Noms pris par les pages applicatives (`src/pages/`) et les fichiers publics (`public/`) : interdits à la racine. */
async function takenRootNames(): Promise<Set<string>> {
	const names = new Set<string>([RESERVED_FOLDER, 'api', '_astro', '_image']);
	for (const dir of ['src/pages', 'public']) {
		try {
			for (const entry of await readdir(join(siteRoot(), dir))) {
				if (!entry.startsWith('[')) names.add(entry.replace(/\.[a-z]+$/i, ''));
			}
		} catch {
			// dossier absent
		}
	}
	return names;
}

// --- Lecture ---------------------------------------------------------------

async function readPageAt(path: string): Promise<PageSource | null> {
	const dir = join(pagesSourceDir(), path);
	let file = 'index.md';
	let text: string;
	try {
		text = await readFile(join(dir, file), 'utf8');
	} catch {
		try {
			file = 'index.mdx';
			text = await readFile(join(dir, file), 'utf8');
		} catch {
			return null;
		}
	}
	const { data, body } = readFrontmatter(text);
	const segments = path.split('/');
	const str = (v: unknown) => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v));
	const menu = data.menu && typeof data.menu === 'object' ? (data.menu as Record<string, unknown>) : null;
	const access = data.access;
	const placement: Placement =
		segments[0] === RESERVED_FOLDER
			? { kind: 'reservee' }
			: segments.length > 1
				? { kind: 'menu', menu: segments[0] }
				: { kind: 'racine' };
	return {
		path,
		placement,
		slug: segments[segments.length - 1],
		title: str(data.title),
		description: str(data.description),
		type: data.type === 'enrichie' ? 'enrichie' : 'classique',
		menu: {
			show: menu?.show === true,
			order: typeof menu?.order === 'number' ? menu.order : 99,
			label: str(menu?.label),
		},
		access: (Array.isArray(access) ? access : typeof access === 'string' ? [access] : []).filter(isAuthGroup),
		body,
		blocs: data.blocs && typeof data.blocs === 'object' && !Array.isArray(data.blocs) ? (data.blocs as Record<string, unknown>) : {},
		imageCredit: str(data.imageCredit),
		cover: typeof data.cover === 'string' && /^\.\/[\w.-]+$/.test(data.cover) ? data.cover : null,
		technique: file === 'index.mdx',
	};
}

/** Page telle qu'elle est dans les sources, par son chemin (`association/mission`). */
export async function readPageSource(path: string): Promise<PageSource | null> {
	const segments = path.split('/');
	if (segments.length > 2 || !segments.every((s) => SEGMENT.test(s))) return null;
	return readPageAt(path);
}

/** Arborescence des sources : menus (avec leurs pages), pages à la racine, pages réservées. */
export async function listPagesSource(): Promise<{ menus: MenuSource[]; pages: PageSource[] }> {
	const root = pagesSourceDir();
	const pages: PageSource[] = [];
	const menus: MenuSource[] = [];
	for (const entry of await readdir(root, { withFileTypes: true })) {
		if (!entry.isDirectory() || !SEGMENT.test(entry.name)) continue;
		const own = await readPageAt(entry.name);
		if (own) {
			pages.push(own);
			continue;
		}
		const children: PageSource[] = [];
		for (const child of await readdir(join(root, entry.name), { withFileTypes: true })) {
			if (!child.isDirectory() || !SEGMENT.test(child.name)) continue;
			const page = await readPageAt(`${entry.name}/${child.name}`);
			if (page) children.push(page);
		}
		pages.push(...children);
		if (entry.name === RESERVED_FOLDER) continue;
		let label = entry.name;
		let order = 50;
		try {
			const { data } = readFrontmatter(await readFile(join(root, entry.name, '_group.md'), 'utf8'));
			if (typeof data.label === 'string') label = data.label;
			if (typeof data.order === 'number') order = data.order;
		} catch {
			// pas de _group.md : valeurs déduites du dossier
		}
		menus.push({ folder: entry.name, label, order, pages: children.map((p) => p.path) });
	}
	menus.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'fr'));
	pages.sort((a, b) => a.menu.order - b.menu.order || a.title.localeCompare(b.title, 'fr'));
	return { menus, pages };
}

// --- Validation ------------------------------------------------------------

function targetPath(placement: Placement, slug: string): string {
	if (placement.kind === 'racine') return slug;
	if (placement.kind === 'reservee') return `${RESERVED_FOLDER}/${slug}`;
	return `${placement.menu}/${slug}`;
}

interface NormalizedPage {
	path: string;
	frontmatter: Record<string, unknown>;
	body: string;
}

async function normalizePage(input: PageInput, currentPath: string | null): Promise<{ page?: NormalizedPage; errors: string[] }> {
	const errors: string[] = [];
	const title = input.title.trim();
	if (!title) errors.push('Le titre est obligatoire.');
	const slug = (input.slug.trim() || slugify(title)).slice(0, SEGMENT_MAX);
	if (!SEGMENT.test(slug)) errors.push("L'adresse de la page ne peut contenir que des minuscules, des chiffres et des tirets.");

	const { menus, pages } = await listPagesSource();
	const placement = input.placement;
	if (placement.kind === 'menu' && !menus.some((m) => m.folder === placement.menu)) errors.push('Menu introuvable.');
	const path = targetPath(placement, slug);
	if (path !== currentPath) {
		if (pages.some((p) => p.path === path) || (await exists(join(pagesSourceDir(), path)))) {
			errors.push(`L'adresse /${path} est déjà prise.`);
		} else if (placement.kind === 'racine' && ((await takenRootNames()).has(slug) || menus.some((m) => m.folder === slug))) {
			errors.push(`L'adresse /${slug} est déjà utilisée par le site ou par un menu.`);
		}
	}

	const body = input.body.replace(/\r\n?/g, '\n').trim();
	if (!body) errors.push('Le texte de la page est vide.');
	if (Buffer.byteLength(body) > BODY_MAX) errors.push('Le texte est trop long (200 Ko max).');
	errors.push(...checkBody(body));
	const unknownVars = unknownPageVariables(body);
	if (unknownVars.length) errors.push(`Variable(s) inconnue(s) : ${unknownVars.map((v) => `{{${v}}}`).join(', ')}.`);

	const blocs: Record<string, Bloc> = {};
	if (input.type === 'enrichie') {
		for (const [id, raw] of Object.entries(input.blocs ?? {})) {
			const { bloc, errors: blocErrors } = validateBloc(id, raw);
			errors.push(...blocErrors);
			if (!bloc) continue;
			for (const text of blocMarkdownTexts(bloc)) errors.push(...checkBody(text).map((e) => `Bloc « ${id} » : ${e}`));
			blocs[id] = bloc;
		}
		const missing = blocMarkersIn(body).filter((id) => !blocs[id]);
		if (missing.length) errors.push(`Marqueur(s) sans bloc : ${missing.map((id) => `[[bloc:${id}]]`).join(', ')}.`);
	} else if (blocMarkersIn(body).length) {
		errors.push('Une page classique ne peut pas contenir de marqueur [[bloc:…]] : choisissez « page enrichie ».');
	}

	const groups = [...new Set(input.access.filter(isAuthGroup))];
	const frontmatter: Record<string, unknown> = { title };
	if (input.description.trim()) frontmatter.description = input.description.trim();
	if (placement.kind !== 'reservee') {
		const order = Number.isFinite(input.menu.order) ? Math.round(input.menu.order) : 99;
		const label = input.menu.label.trim();
		frontmatter.menu = { show: Boolean(input.menu.show), order, ...(label && label !== title ? { label } : {}) };
	}
	if (input.type === 'enrichie') frontmatter.type = 'enrichie';
	if (placement.kind === 'reservee' && groups.length) frontmatter.access = groups.length === 1 ? groups[0] : groups;
	if (input.imageCredit.trim()) frontmatter.imageCredit = input.imageCredit.trim();
	if (input.type === 'enrichie' && Object.keys(blocs).length) frontmatter.blocs = blocs;

	return errors.length ? { errors } : { page: { path, frontmatter, body }, errors };
}

function serialize(frontmatter: Record<string, unknown>, body: string): string {
	const yaml = stringifyYaml(frontmatter, { defaultStringType: 'QUOTE_DOUBLE', defaultKeyType: 'PLAIN', lineWidth: 0 });
	return `---\n${yaml}---\n\n${body}\n`;
}

// --- Transactions ----------------------------------------------------------

export interface Applied {
	restore: () => Promise<void>;
	purge: () => Promise<void>;
}

/**
 * Sauvegarde `src/content/pages/`, applique `mutate`, et rend de quoi annuler
 * (`restore`) ou valider (`purge`). Une erreur pendant `mutate` remet tout en place.
 */
async function transaction(mutate: (root: string) => Promise<void>): Promise<Applied> {
	const root = pagesSourceDir();
	await mkdir(workRoot(), { recursive: true });
	const backup = workDir('pages-sauvegarde');
	await cp(root, backup, { recursive: true });
	const restore = async () => {
		const trash = workDir('pages-annulees');
		await rename(root, trash);
		await rename(backup, root);
		await rm(trash, { recursive: true, force: true });
	};
	try {
		await mutate(root);
	} catch (err) {
		await restore();
		throw err;
	}
	return { restore, purge: () => rm(backup, { recursive: true, force: true }) };
}

// --- Pages -----------------------------------------------------------------

class CoverError extends Error {}

/** Dossier des pages réservées devenu vide (dernière page supprimée ou déplacée) : retiré. */
async function removeEmptyReservedFolder(root: string): Promise<void> {
	const dir = join(root, RESERVED_FOLDER);
	if ((await readdir(dir).catch(() => null))?.length === 0) await rm(dir, { recursive: true, force: true });
}

/**
 * Crée (`currentPath` null) ou modifie une page ; une page modifiée peut
 * changer d'emplacement ou d'adresse (son dossier est déplacé, photo comprise).
 */
export async function savePage(
	input: PageInput,
	currentPath: string | null,
	coverChange: CoverChange,
): Promise<{ path?: string; title?: string; applied?: Applied; errors: string[] }> {
	const current = currentPath ? await readPageSource(currentPath) : null;
	if (currentPath && !current) return { errors: ['Page introuvable dans les sources.'] };
	if (current?.technique) return { errors: ['Page technique (.mdx) : elle se modifie dans le code.'] };

	const { page, errors } = await normalizePage(input, currentPath);
	if (!page) return { errors };

	let applied: Applied;
	try {
		applied = await transaction(async (root) => {
			const dir = join(root, page.path);
			if (current && current.path !== page.path) {
				await mkdir(join(dir, '..'), { recursive: true });
				await rename(join(root, current.path), dir);
			}
			await mkdir(dir, { recursive: true });
			let cover = current?.cover ?? undefined;
			if (coverChange.action !== 'keep' && cover) await rm(join(dir, cover), { force: true });
			if (coverChange.action === 'remove') cover = undefined;
			if (coverChange.action === 'replace') {
				await writeCover(dir, coverChange.data).catch(() => {
					throw new CoverError();
				});
				cover = './cover.jpg';
			}
			// `cover` avant `imageCredit` et les blocs : ordre de lecture habituel.
			const { blocs, imageCredit, ...head } = page.frontmatter;
			const frontmatter = { ...head, ...(cover ? { cover } : {}), ...(imageCredit ? { imageCredit } : {}), ...(blocs ? { blocs } : {}) };
			await writeFile(join(dir, 'index.md'), serialize(frontmatter, page.body), 'utf8');
			await removeEmptyReservedFolder(root);
		});
	} catch (err) {
		if (err instanceof CoverError) return { errors: [COVER_ERROR] };
		throw err;
	}
	return { path: page.path, title: String(page.frontmatter.title), applied, errors: [] };
}

/** Supprime une page (dossier entier, photo comprise). */
export async function deletePage(path: string): Promise<{ title?: string; applied?: Applied; errors: string[] }> {
	const current = await readPageSource(path);
	if (!current) return { errors: ['Page introuvable dans les sources (déjà supprimée ?).'] };
	if (current.technique) return { errors: ['Page technique (.mdx) : elle se supprime dans le code.'] };
	const applied = await transaction(async (root) => {
		await rm(join(root, path), { recursive: true, force: true });
		await removeEmptyReservedFolder(root);
	});
	return { title: current.title || path, applied, errors: [] };
}

// --- Menus -----------------------------------------------------------------

export interface MenuInput {
	/** Nom du dossier = début de l'adresse des pages du menu ; fixé à la création. */
	folder: string;
	label: string;
	order: number;
}

/** Crée (`currentFolder` null) ou modifie un menu (libellé, ordre ; le dossier ne change pas). */
export async function saveMenu(
	input: MenuInput,
	currentFolder: string | null,
): Promise<{ folder?: string; applied?: Applied; errors: string[] }> {
	const errors: string[] = [];
	const label = input.label.trim();
	if (!label) errors.push('Le libellé du menu est obligatoire.');
	const order = Number.isFinite(input.order) ? Math.round(input.order) : 50;
	const { menus, pages } = await listPagesSource();
	let folder = currentFolder;
	if (currentFolder) {
		if (!menus.some((m) => m.folder === currentFolder)) errors.push('Menu introuvable.');
	} else {
		folder = (input.folder.trim() || slugify(label)).slice(0, SEGMENT_MAX);
		if (!SEGMENT.test(folder)) errors.push("L'adresse du menu ne peut contenir que des minuscules, des chiffres et des tirets.");
		else if (
			menus.some((m) => m.folder === folder) ||
			pages.some((p) => p.path === folder) ||
			(await takenRootNames()).has(folder) ||
			(await exists(join(pagesSourceDir(), folder)))
		) {
			errors.push(`L'adresse /${folder} est déjà utilisée.`);
		}
	}
	if (errors.length) return { errors };
	const applied = await transaction(async (root) => {
		await mkdir(join(root, folder!), { recursive: true });
		await writeFile(join(root, folder!, '_group.md'), serialize({ label, order }, '').trimEnd() + '\n', 'utf8');
	});
	return { folder: folder!, applied, errors: [] };
}

/** Supprime un menu vide (ses pages doivent d'abord être déplacées ou supprimées). */
export async function deleteMenu(folder: string): Promise<{ label?: string; applied?: Applied; errors: string[] }> {
	const menu = (await listPagesSource()).menus.find((m) => m.folder === folder);
	if (!menu) return { errors: ['Menu introuvable.'] };
	if (menu.pages.length) return { errors: ['Ce menu contient encore des pages : déplacez-les ou supprimez-les d’abord.'] };
	const applied = await transaction((root) => rm(join(root, folder), { recursive: true, force: true }));
	return { label: menu.label, applied, errors: [] };
}

// --- Corps JSON des routes -------------------------------------------------

const text = (v: unknown) => (typeof v === 'string' ? v : '');

/** `PageInput` depuis le corps JSON d'une route (types forcés ; la validation suit dans `savePage`). */
export function readPageInput(raw: unknown): PageInput {
	const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	const placement = (data.placement && typeof data.placement === 'object' ? data.placement : {}) as Record<string, unknown>;
	const menu = (data.menu && typeof data.menu === 'object' ? data.menu : {}) as Record<string, unknown>;
	return {
		placement:
			placement.kind === 'menu'
				? { kind: 'menu', menu: text(placement.menu) }
				: placement.kind === 'reservee'
					? { kind: 'reservee' }
					: { kind: 'racine' },
		slug: text(data.slug),
		title: text(data.title),
		description: text(data.description),
		type: data.type === 'enrichie' ? 'enrichie' : 'classique',
		menu: { show: menu.show === true, order: Number(menu.order ?? 99), label: text(menu.label) },
		access: Array.isArray(data.access) ? data.access.filter(isAuthGroup) : [],
		body: text(data.body),
		blocs: data.blocs && typeof data.blocs === 'object' && !Array.isArray(data.blocs) ? (data.blocs as Record<string, unknown>) : {},
		imageCredit: text(data.imageCredit),
	};
}
