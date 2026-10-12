/**
 * Photo du bandeau d'accueil (`src/content/images/accueil.*`, lue par
 * `src/lib/site-images.ts`), réglée depuis le module « Pages » → Accueil →
 * module « Bandeau ». Enregistrée avec la page d'accueil
 * (`PUT /api/admin/pages-du-site/accueil`, champ `photo`).
 *
 * Photo envoyée : redressée, réduite à `HOME_PHOTO_WIDTH` px de large,
 * métadonnées retirées, écrite en `accueil.jpg` (les autres `accueil.*`
 * sont supprimés). Retirée : bandeau sans photo (fond uni).
 *
 * Code serveur uniquement.
 */

import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { contentTransaction, type Applied } from './content-transaction';
import { siteRoot } from './news-writer';

export const HOME_PHOTO_WIDTH = 2400;

export type HomePhotoChange = { action: 'keep' } | { action: 'remove' } | { action: 'replace'; data: Buffer };

const imagesDir = () => join(siteRoot(), 'src', 'content', 'images');

async function photoFiles(): Promise<string[]> {
	return (await readdir(imagesDir()).catch(() => [] as string[])).filter((f) => f.startsWith('accueil.'));
}

/** Aperçu de la photo actuelle (data URL réduite), `null` sans photo. */
export async function readHomePhotoPreview(): Promise<string | null> {
	const [file] = await photoFiles();
	if (!file) return null;
	try {
		const data = await sharp(await readFile(join(imagesDir(), file)))
			.resize({ width: 480, withoutEnlargement: true })
			.jpeg({ quality: 75 })
			.toBuffer();
		return `data:image/jpeg;base64,${data.toString('base64')}`;
	} catch {
		return null;
	}
}

/** Photo prête à écrire, ou message d'erreur. */
export async function prepareHomePhoto(data: Buffer): Promise<{ data: Buffer } | { error: string }> {
	try {
		const image = sharp(data).rotate();
		const meta = await image.metadata();
		if (!meta.width || !meta.height) return { error: "Photo d'accueil : image illisible." };
		return {
			data: await image.resize({ width: HOME_PHOTO_WIDTH, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
		};
	} catch {
		return { error: "Photo d'accueil : image illisible." };
	}
}

/** Applique le changement dans `images/` (transaction : `restore` si la reconstruction échoue). */
export async function applyHomePhoto(change: { action: 'remove' } | { action: 'replace'; data: Buffer }): Promise<Applied> {
	return contentTransaction(imagesDir(), 'images', async (root) => {
		for (const file of (await readdir(root)).filter((f) => f.startsWith('accueil.'))) await rm(join(root, file));
		if (change.action === 'replace') await writeFile(join(root, 'accueil.jpg'), change.data);
	});
}

/** Deux transactions menées ensemble : tout est annulé ou validé d'un coup. */
export function bothApplied(a: Applied, b: Applied): Applied {
	return {
		restore: async () => {
			await a.restore();
			await b.restore();
		},
		purge: async () => {
			await a.purge();
			await b.purge();
		},
	};
}
