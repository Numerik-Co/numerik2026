/**
 * Écriture des annonces de la bannière (`src/content/annonces.yaml`, collection
 * `annonces`) depuis le module « Annonces » de l'Espace Admin : création,
 * modification, suppression, ordre (ordre de défilement). La publication
 * (reconstruction du site) est faite par `site-build.ts`, via
 * `admin-publish.ts`.
 *
 * Le YAML est modifié en place (`yaml` Document) : l'en-tête commenté et les
 * commentaires sont conservés ; les textes sont écrits entre guillemets
 * doubles, comme le demande l'en-tête du fichier. La liste entière est
 * revalidée (`parseAnnonceList`, mêmes règles qu'au build) avant d'écrire.
 *
 * L'identifiant (`id`, qui mémorise la fermeture par le visiteur) est fixé à
 * la création, déduit du titre. Un seul fichier : la sauvegarde est son
 * texte d'origine, réécrit si la reconstruction échoue.
 *
 * Code serveur uniquement.
 */

import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Document, isMap, isSeq, parseDocument, Scalar, YAMLMap, YAMLSeq } from 'yaml';
import {
	ANNONCE_CTA_LABEL_MAX,
	ANNONCE_DEFAULT_ICON,
	ANNONCE_ICON,
	ANNONCE_ID,
	ANNONCE_MESSAGE_MAX,
	ANNONCE_TITLE_MAX,
	ANNONCE_TONES,
	parseAnnonceList,
	type AnnonceSource,
	type AnnonceToneValue,
} from './annonce-schema';
import type { Applied } from './content-transaction';
import { siteRoot, slugify } from './news-writer';
import { isSafeUrl } from './safe-url';

const FILE = 'annonces.yaml';
const ID_MAX = 50;
/** Adresses statiques des routes `/api/admin/annonces/*`. */
const RESERVED_IDS = new Set(['ordre']);

const HEADER = [
	' Annonces affichées dans la bannière en haut de toutes les pages, pendant',
	' leur période (startDate → endDate incluses), dans l’ordre du fichier.',
	' Gérées depuis l’Espace Admin (menu Contenus, module « Annonces ») ;',
	' détail des champs : docs/annonces.md.',
].join('\n');

const annoncesFile = () => join(siteRoot(), 'src', 'content', FILE);

export interface AnnonceInput {
	title: string;
	message: string;
	startDate: string;
	endDate: string;
	tone: AnnonceToneValue;
	icon: string;
	ctaLabel: string;
	ctaHref: string;
	active: boolean;
}

// --- Lecture ---------------------------------------------------------------

async function readFileText(): Promise<string | null> {
	try {
		return await readFile(annoncesFile(), 'utf8');
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
		throw err;
	}
}

function parseText(text: string): AnnonceSource[] {
	const doc = parseDocument(text);
	if (doc.errors.length) throw new Error(`${FILE} illisible : ${doc.errors[0].message}`);
	return parseAnnonceList(doc.toJS());
}

/** Annonces telles qu'elles sont dans les sources (brouillons compris), dans l'ordre du fichier. */
export async function readAnnonceSources(): Promise<AnnonceSource[]> {
	const text = await readFileText();
	return text === null ? [] : parseText(text);
}

async function readDocument(): Promise<{ doc: Document; seq: YAMLSeq<YAMLMap>; original: string | null }> {
	const original = await readFileText();
	let doc: Document;
	if (original === null) {
		doc = new Document([]);
		doc.commentBefore = HEADER;
	} else {
		doc = parseDocument(original);
		if (doc.errors.length) throw new Error(`${FILE} illisible : ${doc.errors[0].message}`);
		// Fichier sans annonce (commentaires seuls) : liste vide, commentaires gardés.
		if (doc.contents === null) doc.contents = doc.createNode([]) as YAMLSeq;
	}
	if (!isSeq(doc.contents)) throw new Error(`${FILE} : une liste d'annonces est attendue.`);
	return { doc, seq: doc.contents as YAMLSeq<YAMLMap>, original };
}

const idOf = (item: unknown) => (isMap(item) ? String(item.get('id') ?? '') : '');

/** Écrit le fichier après revalidation de la liste entière ; rend de quoi annuler. */
async function writeDocument(doc: Document, original: string | null): Promise<Applied> {
	// Une ligne vide entre les annonces, quel que soit l'ordre (celle sous l'en-tête est déjà écrite).
	(doc.contents as YAMLSeq<YAMLMap>).items.forEach((item, i) => (item.spaceBefore = i > 0));
	const text = doc.toString({ lineWidth: 0 });
	parseText(text);
	const file = annoncesFile();
	await writeFile(file, text, 'utf8');
	return {
		restore: () => (original === null ? rm(file, { force: true }) : writeFile(file, original, 'utf8')),
		purge: async () => {},
	};
}

// --- Écriture --------------------------------------------------------------

export type AnnonceResult = { id?: string; title?: string; applied?: Applied; errors: string[] };

const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));

function validate(input: AnnonceInput): string[] {
	const errors: string[] = [];
	const title = input.title.trim();
	const message = input.message.trim();
	if (!title) errors.push('Le titre est obligatoire.');
	else if (title.length > ANNONCE_TITLE_MAX) errors.push(`Le titre est trop long (${ANNONCE_TITLE_MAX} caractères max).`);
	if (!message) errors.push('Le message est obligatoire.');
	else if (message.length > ANNONCE_MESSAGE_MAX) errors.push(`Le message est trop long (${ANNONCE_MESSAGE_MAX} caractères max).`);
	if (!isDate(input.startDate)) errors.push('Date de début invalide.');
	if (!isDate(input.endDate)) errors.push('Date de fin invalide.');
	else if (isDate(input.startDate) && input.endDate < input.startDate) errors.push('La date de fin doit suivre la date de début.');
	if (!(ANNONCE_TONES as readonly string[]).includes(input.tone)) errors.push('Choisissez une couleur.');
	if (input.icon && !ANNONCE_ICON.test(input.icon)) errors.push('Icône invalide.');
	const label = input.ctaLabel.trim();
	const href = input.ctaHref.trim();
	if (Boolean(label) !== Boolean(href)) errors.push('Lien : renseignez le texte ET l’adresse, ou aucun des deux.');
	if (label.length > ANNONCE_CTA_LABEL_MAX) errors.push(`Texte du lien trop long (${ANNONCE_CTA_LABEL_MAX} caractères max).`);
	if (href && !isSafeUrl(href)) errors.push('Adresse du lien refusée : http(s)://…, mailto:, tel: ou adresse du site (/…).');
	return errors;
}

/** Valeur texte écrite entre guillemets doubles. */
function quoted(value: string): Scalar {
	const node = new Scalar(value);
	node.type = Scalar.QUOTE_DOUBLE;
	return node;
}

function applyFields(item: YAMLMap, input: AnnonceInput): void {
	item.set('title', quoted(input.title.trim()));
	item.set('message', quoted(input.message.trim()));
	item.set('startDate', quoted(input.startDate));
	item.set('endDate', quoted(input.endDate));
	item.set('tone', quoted(input.tone));
	item.set('icon', quoted(input.icon || ANNONCE_DEFAULT_ICON));
	const label = input.ctaLabel.trim();
	const href = input.ctaHref.trim();
	if (label && href) {
		item.set('ctaLabel', quoted(label));
		item.set('ctaHref', quoted(href));
	} else {
		item.delete('ctaLabel');
		item.delete('ctaHref');
	}
	if (input.active) item.delete('active');
	else item.set('active', false);
}

/** Identifiant libre déduit du titre (`-2`, `-3`… si déjà pris). */
function newId(title: string, taken: string[]): string {
	const base = (slugify(title) || 'annonce').slice(0, ID_MAX).replace(/-+$/, '') || 'annonce';
	let id = base;
	for (let n = 2; taken.includes(id) || RESERVED_IDS.has(id); n++) id = `${base}-${n}`;
	return id;
}

/** Crée (`currentId` null, en dernière position) ou modifie une annonce. */
export async function saveAnnonce(input: AnnonceInput, currentId: string | null): Promise<AnnonceResult> {
	const errors = validate(input);
	const { doc, seq, original } = await readDocument();
	const current = currentId ? seq.items.find((item) => idOf(item) === currentId) : undefined;
	if (currentId && !current) return { errors: ['Annonce introuvable dans les sources (supprimée entre-temps ?).'] };
	if (errors.length) return { errors };

	const id = currentId ?? newId(input.title, seq.items.map(idOf));
	if (!ANNONCE_ID.test(id)) return { errors: ['Identifiant invalide.'] };
	const item = current ?? (doc.createNode({ id: quoted(id) }) as YAMLMap);
	applyFields(item, input);
	if (!current) seq.items.push(item);

	const applied = await writeDocument(doc, original);
	return { id, title: input.title.trim(), applied, errors: [] };
}

export async function deleteAnnonce(id: string): Promise<AnnonceResult> {
	const { doc, seq, original } = await readDocument();
	const index = seq.items.findIndex((item) => idOf(item) === id);
	if (index < 0) return { errors: ['Annonce introuvable dans les sources (déjà supprimée ?).'] };
	const title = String(seq.items[index].get('title') ?? id);
	seq.items.splice(index, 1);
	const applied = await writeDocument(doc, original);
	return { id, title, applied, errors: [] };
}

/** Nouvel ordre de défilement : tous les identifiants, dans le nouvel ordre. */
export async function saveAnnonceOrder(order: string[]): Promise<{ applied?: Applied; errors: string[] }> {
	const { doc, seq, original } = await readDocument();
	const current = seq.items.map(idOf);
	const same =
		order.length === current.length && new Set(order).size === order.length && order.every((id) => current.includes(id));
	if (!same) return { errors: ['La liste a changé entre-temps : rechargez le module puis recommencez.'] };
	if (order.every((id, i) => id === current[i])) return { errors: ["L'ordre n'a pas changé."] };
	seq.items = order.map((id) => seq.items[current.indexOf(id)]);
	return { applied: await writeDocument(doc, original), errors: [] };
}

/** Corps JSON du formulaire → `AnnonceInput` (types forcés, rien n'est validé ici). */
export function readAnnonceInput(raw: unknown): AnnonceInput {
	const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	const text = (k: string) => (typeof r[k] === 'string' ? (r[k] as string) : '');
	return {
		title: text('title'),
		message: text('message'),
		startDate: text('startDate'),
		endDate: text('endDate'),
		tone: text('tone') as AnnonceToneValue,
		icon: text('icon').trim(),
		ctaLabel: text('ctaLabel'),
		ctaHref: text('ctaHref'),
		active: r.active !== false,
	};
}
