/**
 * Lot de modifications en attente de publication (« Enregistrer sans
 * publier » dans les modules de l'espace bénévoles) : la modification est
 * écrite dans les sources (`src/content/`) comme d'habitude, mais le site
 * n'est pas reconstruit ; une seule reconstruction publie ensuite tout le lot
 * (bouton « Publier les modifications », `POST /api/admin/publication/lot`).
 *
 * Avant la première modification du lot, une copie de secours de tout
 * `src/content/` est faite dans `<DATA_DIR>/publication/lot/contenu/` :
 * « Annuler les modifications » la remet en place (`cancelLot`). Le lot est
 * ouvert tant que cette copie existe ; il se referme à chaque reconstruction
 * réussie (`clearLot`, appelé par `site-build.ts`), qu'elle ait été lancée
 * pour le lot ou pour une modification publiée aussitôt : toute
 * reconstruction met en ligne l'état des sources, donc le lot entier. Un
 * site reconstruit hors de l'espace bénévoles (redémarrage, `update.sh`)
 * le publie aussi : le lot est refermé dès que l'empreinte du site en place
 * correspond aux sources (`readLot`).
 *
 * Code serveur uniquement.
 */

import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { computeFingerprint, readBuildInfo } from '../../scripts/releases.mjs';
import { dataDir } from './data-dir';
import type { JournalActor } from './journal';
import { siteRoot } from './news-writer';

export interface LotChange {
	at: string;
	by?: JournalActor;
	/** Libellé de la modification (« Modification : <titre> »…). */
	label: string;
	/** Page concernée (badge « À publier » dans les listes des modules). */
	href?: string;
}

/** Dossiers de travail de la publication (`news-writer.ts`), jamais copiés ni remplacés. */
const WORK_DIR = '.tmp-publication';

function lotDir(): string {
	return join(dataDir(), 'publication', 'lot');
}

function changesFile(): string {
	return join(lotDir(), 'modifications.json');
}

function snapshotDir(): string {
	return join(lotDir(), 'contenu');
}

function contentDir(): string {
	return join(siteRoot(), 'src', 'content');
}

async function readChanges(): Promise<LotChange[]> {
	try {
		const changes = JSON.parse(await readFile(changesFile(), 'utf8'));
		return Array.isArray(changes) ? changes : [];
	} catch {
		return [];
	}
}

/** Empreinte du site en place déjà comparée aux sources dans ce process (elle ne change qu'au redémarrage). */
let checkedBuild: string | null = null;

/**
 * Modifications en attente, de la plus ancienne à la plus récente. Lot
 * refermé s'il est déjà en ligne (site reconstruit hors de l'espace
 * bénévoles avec les sources actuelles).
 */
export async function readLot(): Promise<LotChange[]> {
	if (!existsSync(snapshotDir())) return [];
	const changes = await readChanges();
	if (changes.length > 0 && !import.meta.env.DEV) {
		const built = await readBuildInfo(siteRoot());
		if (built?.fingerprint && built.fingerprint !== checkedBuild) {
			checkedBuild = built.fingerprint;
			const current = await computeFingerprint(siteRoot(), process.env.SITE_URL);
			if (current.fingerprint === built.fingerprint) {
				await clearLot();
				return [];
			}
		}
	}
	return changes;
}

/**
 * Ouvre le lot s'il ne l'est pas : copie de secours de `src/content/`. À
 * appeler AVANT d'écrire la modification dans les sources.
 */
export async function openLot(): Promise<void> {
	// Lot déjà en ligne (site reconstruit au redémarrage) : refermé avant que cette modification ne change les sources.
	await readLot();
	if (existsSync(snapshotDir())) return;
	await mkdir(lotDir(), { recursive: true });
	const tmp = join(lotDir(), `copie-${process.pid}-${Date.now()}`);
	await cp(contentDir(), tmp, { recursive: true, filter: (source) => basename(source) !== WORK_DIR });
	try {
		await rename(tmp, snapshotDir());
	} catch (err) {
		// Ouvert entre-temps par une autre demande : sa copie fait foi.
		await rm(tmp, { recursive: true, force: true });
		if (!existsSync(snapshotDir())) throw err;
	}
}

/** Ajoute une modification (déjà écrite dans les sources) au lot ouvert par `openLot()`. */
export async function addToLot(change: Omit<LotChange, 'at'>): Promise<LotChange[]> {
	const changes = [...(await readChanges()), { at: new Date().toISOString(), ...change }];
	await writeFile(changesFile(), JSON.stringify(changes, null, 2));
	return changes;
}

/** Referme le lot : ses modifications sont en ligne (copie de secours effacée). */
export async function clearLot(): Promise<void> {
	await rm(lotDir(), { recursive: true, force: true });
}

/**
 * Défait toutes les modifications du lot : `src/content/` reprend l'état de
 * la copie de secours. Le dossier lui-même n'est jamais renommé (il peut
 * être un volume Docker monté) : on remplace son contenu.
 */
export async function cancelLot(): Promise<void> {
	const snapshot = snapshotDir();
	if (!existsSync(snapshot)) return;
	const target = contentDir();
	for (const name of await readdir(target)) {
		if (name !== WORK_DIR) await rm(join(target, name), { recursive: true, force: true });
	}
	await cp(snapshot, target, { recursive: true });
	await clearLot();
}
