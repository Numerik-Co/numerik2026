/**
 * « Transaction » sur un dossier de `src/content/` (pages, activités) pour les
 * modules de l'espace bénévoles : copie de sauvegarde du dossier entier
 * (quelques fichiers), modification, puis `restore` (reconstruction du site
 * en échec) ou `purge` (nouvelle version en ligne).
 *
 * Code serveur uniquement.
 */

import { cp, mkdir, rename, rm } from 'node:fs/promises';
import { workDir, workRoot } from './news-writer';

export interface Applied {
	restore: () => Promise<void>;
	purge: () => Promise<void>;
}

/**
 * Sauvegarde `root`, applique `mutate`, et rend de quoi annuler (`restore`)
 * ou valider (`purge`). Une erreur pendant `mutate` remet tout en place.
 * `name` nomme les dossiers de travail (`<name>-sauvegarde-…`).
 */
export async function contentTransaction(root: string, name: string, mutate: (root: string) => Promise<void>): Promise<Applied> {
	await mkdir(workRoot(), { recursive: true });
	const backup = workDir(`${name}-sauvegarde`);
	await cp(root, backup, { recursive: true });
	const restore = async () => {
		const trash = workDir(`${name}-annulees`);
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
