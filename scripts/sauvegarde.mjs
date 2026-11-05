/**
 * Sauvegarde et restauration de ce qui appartient à l'association, façon
 * Grav : une archive ZIP de `src/content/` (contenu du site) et de
 * `<DATA_DIR>/accounts` + `<DATA_DIR>/journal` (comptes de l'Espace Admin,
 * journal). Le `.env` (secrets) n'y est jamais.
 *
 * Les archives sont rangées dans `<DATA_DIR>/sauvegardes/` (volume Docker
 * `./data`, conservé d'une version à l'autre). Chaque archive porte
 * `sauvegarde.json` (format, date, version du modèle, association, motif).
 *
 * Restaurer = remplacer : `src/content/`, `accounts/` et `journal/` sont
 * vidés puis remplis avec l'archive (les dossiers eux-mêmes restent : ce
 * sont des volumes sous Docker). Une sauvegarde « avant-restauration » de
 * l'état courant est faite d'abord, et remise en place si l'écriture échoue.
 * Le site doit ensuite être reconstruit (redémarrage, ou publication depuis
 * l'Espace Admin).
 *
 * Utilisé par les commandes `./sauvegarde.sh` / `./restauration.sh` (ou
 * directement `node scripts/sauvegarde.mjs …`) et par le module
 * « Sauvegardes » de l'Espace Admin (`/api/admin/sauvegardes*`).
 *
 *   node scripts/sauvegarde.mjs creer [motif]
 *   node scripts/sauvegarde.mjs liste
 *   node scripts/sauvegarde.mjs restaurer <nom.zip | chemin> [--oui]
 *
 * `SITE_ROOT` (dossier du projet, défaut : dossier courant) et `DATA_DIR`
 * (défaut : `<projet>/data`), comme le serveur.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export const FORMAT = 'numerik-sauvegarde';
/** Nom d'une archive : minuscules, chiffres, tirets, `.zip`. */
export const NOM_SAUVEGARDE = /^[a-z0-9][a-z0-9-]{0,99}\.zip$/;
/** Taille maximale d'une archive déposée ou restaurée. */
export const TAILLE_MAX = 500 * 1024 * 1024;
const MANIFESTE = 'sauvegarde.json';
/** Sous-dossiers de DATA_DIR sauvegardés (pas `publication/`, ni les sauvegardes elles-mêmes). */
const DONNEES = ['accounts', 'journal'];
/** Fichiers déjà compressés : stockés tels quels (plus rapide, même taille). */
const DEJA_COMPRESSE = /\.(jpe?g|png|webp|gif|avif|woff2?|zip|gz|pdf|mp4|webm)$/i;

export function racineSite() {
	return resolve(process.env.SITE_ROOT || process.cwd());
}
export function dossierDonnees(root = racineSite()) {
	return resolve(process.env.DATA_DIR || process.env.AUTH_DATA_DIR || join(root, 'data'));
}
export function dossierSauvegardes(dataDir = dossierDonnees()) {
	return join(dataDir, 'sauvegardes');
}

// --- Lecture des fichiers ------------------------------------------------------

/** Fichiers d'un dossier (récursif), chemins relatifs avec « / ». */
function fichiersDe(dir) {
	if (!existsSync(dir)) return [];
	const out = [];
	const walk = (d) => {
		for (const entry of readdirSync(d, { withFileTypes: true })) {
			const full = join(d, entry.name);
			if (entry.isDirectory()) {
				if (entry.name === '.tmp-publication') continue;
				walk(full);
			} else if (entry.isFile()) out.push(relative(dir, full).split(sep).join('/'));
		}
	};
	walk(dir);
	return out.sort();
}

function lireNomAsso(root) {
	try {
		const m = readFileSync(join(root, 'src', 'content', 'association.yaml'), 'utf8').match(/^name:\s*['"]?(.*?)['"]?\s*$/m);
		return m ? m[1] : '';
	} catch {
		return '';
	}
}

function lireVersion(root) {
	try {
		return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version ?? '';
	} catch {
		return '';
	}
}

const pad = (n) => String(n).padStart(2, '0');
function horodatage(d = new Date()) {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}h${pad(d.getMinutes())}`;
}
const motifPropre = (motif) =>
	String(motif ?? '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40);

// --- Création -----------------------------------------------------------------

/**
 * Crée une archive dans `<DATA_DIR>/sauvegardes/`.
 * @returns {{ nom: string, chemin: string, taille: number, fichiers: number }}
 */
export function creerSauvegarde({ root = racineSite(), dataDir = dossierDonnees(root), motif = '', par = '' } = {}) {
	const content = join(root, 'src', 'content');
	if (!existsSync(join(content, 'association.yaml'))) throw new Error('src/content/association.yaml introuvable : rien à sauvegarder.');
	const files = {};
	const ajouter = (base, prefix) => {
		for (const rel of fichiersDe(base)) {
			const data = readFileSync(join(base, rel));
			files[`${prefix}/${rel}`] = [data, { level: DEJA_COMPRESSE.test(rel) ? 0 : 6 }];
		}
	};
	ajouter(content, 'src/content');
	for (const d of DONNEES) ajouter(join(dataDir, d), `data/${d}`);
	const nbFichiers = Object.keys(files).length;
	const manifeste = {
		format: FORMAT,
		version: 1,
		creeLe: new Date().toISOString(),
		modele: lireVersion(root),
		association: lireNomAsso(root),
		motif: String(motif ?? ''),
		par: String(par ?? ''),
		fichiers: nbFichiers,
	};
	files[MANIFESTE] = strToU8(JSON.stringify(manifeste, null, 2));

	const dossier = dossierSauvegardes(dataDir);
	mkdirSync(dossier, { recursive: true });
	const suffixe = motifPropre(motif);
	let nom = `sauvegarde-${horodatage()}${suffixe ? `-${suffixe}` : ''}.zip`;
	for (let n = 2; existsSync(join(dossier, nom)); n++) nom = nom.replace(/(-\d+)?\.zip$/, `-${n}.zip`);
	const zip = zipSync(files);
	const chemin = join(dossier, nom);
	// Écrite puis renommée : jamais d'archive à moitié écrite dans la liste.
	writeFileSync(`${chemin}.partiel`, zip);
	renameSync(`${chemin}.partiel`, chemin);
	return { nom, chemin, taille: zip.length, fichiers: nbFichiers };
}

// --- Lecture / liste ----------------------------------------------------------

/** Manifeste d'une archive (lecture complète : quelques Mo). `null` = pas une sauvegarde du site. */
export function lireManifeste(zip) {
	try {
		const entries = unzipSync(zip, { filter: (f) => f.name === MANIFESTE });
		const m = entries[MANIFESTE] ? JSON.parse(strFromU8(entries[MANIFESTE])) : null;
		return m && m.format === FORMAT ? m : null;
	} catch {
		return null;
	}
}

/** Archives de `<DATA_DIR>/sauvegardes/`, la plus récente d'abord. */
export async function listerSauvegardes(dataDir = dossierDonnees()) {
	const dossier = dossierSauvegardes(dataDir);
	if (!existsSync(dossier)) return [];
	const noms = (await readdir(dossier)).filter((n) => NOM_SAUVEGARDE.test(n));
	const liste = await Promise.all(
		noms.map(async (nom) => {
			const chemin = join(dossier, nom);
			const s = await stat(chemin);
			const manifeste = lireManifeste(await readFile(chemin));
			return { nom, taille: s.size, date: manifeste?.creeLe ?? s.mtime.toISOString(), manifeste };
		}),
	);
	return liste.sort((a, b) => b.date.localeCompare(a.date));
}

export function cheminSauvegarde(nom, dataDir = dossierDonnees()) {
	if (!NOM_SAUVEGARDE.test(nom)) return null;
	const chemin = join(dossierSauvegardes(dataDir), nom);
	return existsSync(chemin) ? chemin : null;
}

export async function supprimerSauvegarde(nom, dataDir = dossierDonnees()) {
	const chemin = cheminSauvegarde(nom, dataDir);
	if (!chemin) return false;
	await rm(chemin);
	return true;
}

/**
 * Range une archive reçue (dépôt dans l'Espace Admin, fichier copié sur le
 * serveur) dans `<DATA_DIR>/sauvegardes/` après contrôle.
 * @returns {{ nom: string }}
 */
export async function deposerSauvegarde(zip, nomPropose, dataDir = dossierDonnees()) {
	verifierArchive(zip);
	const dossier = dossierSauvegardes(dataDir);
	await mkdir(dossier, { recursive: true });
	const base = motifPropre(String(nomPropose ?? '').replace(/\.zip$/i, '')) || `sauvegarde-deposee-${horodatage()}`;
	let nom = `${base}.zip`;
	for (let n = 2; existsSync(join(dossier, nom)); n++) nom = `${base}-${n}.zip`;
	await writeFile(join(dossier, nom), zip);
	return { nom };
}

// --- Restauration -------------------------------------------------------------

/** Contrôle une archive ; rend ses fichiers (chemin → octets). */
export function verifierArchive(zip) {
	if (zip.length > TAILLE_MAX) throw new Error(`Archive trop volumineuse (${Math.round(TAILLE_MAX / 1024 / 1024)} Mo max).`);
	let entries;
	try {
		entries = unzipSync(zip);
	} catch {
		throw new Error("Ce fichier n'est pas une archive ZIP lisible.");
	}
	const manifeste = entries[MANIFESTE] ? (() => {
		try {
			return JSON.parse(strFromU8(entries[MANIFESTE]));
		} catch {
			return null;
		}
	})() : null;
	if (!manifeste || manifeste.format !== FORMAT) throw new Error("Ce fichier n'est pas une sauvegarde du site (sauvegarde.json absent).");
	if (!entries['src/content/association.yaml']) throw new Error('Sauvegarde incomplète : src/content/association.yaml absent.');
	const autorises = ['src/content/', ...DONNEES.map((d) => `data/${d}/`)];
	const fichiers = {};
	for (const [name, data] of Object.entries(entries)) {
		if (name === MANIFESTE || name.endsWith('/')) continue;
		const parts = name.split('/');
		if (name.startsWith('/') || name.includes('\\') || parts.some((p) => p === '..' || p === '' || p === '.')) {
			throw new Error(`Chemin refusé dans l'archive : ${name}`);
		}
		if (!autorises.some((a) => name.startsWith(a))) throw new Error(`Fichier inattendu dans l'archive : ${name}`);
		fichiers[name] = data;
	}
	return { manifeste, fichiers };
}

/** Vide un dossier sans le supprimer (point de montage Docker). */
function viderDossier(dir) {
	mkdirSync(dir, { recursive: true });
	for (const entry of readdirSync(dir)) rmSync(join(dir, entry), { recursive: true, force: true });
}

function ecrire(root, dataDir, fichiers) {
	viderDossier(join(root, 'src', 'content'));
	for (const d of DONNEES) viderDossier(join(dataDir, d));
	for (const [name, data] of Object.entries(fichiers)) {
		const cible = name.startsWith('data/') ? join(dataDir, name.slice('data/'.length)) : join(root, name);
		mkdirSync(dirname(cible), { recursive: true });
		writeFileSync(cible, data);
	}
}

/**
 * Restaure une archive (octets) : sauvegarde de sécurité de l'état courant,
 * puis remplacement. Échec d'écriture = état courant remis.
 * @returns {{ manifeste: object, securite: string, fichiers: number }}
 */
export function restaurerSauvegarde(zip, { root = racineSite(), dataDir = dossierDonnees(root), par = '' } = {}) {
	const { manifeste, fichiers } = verifierArchive(zip);
	const securite = creerSauvegarde({ root, dataDir, motif: 'avant-restauration', par });
	try {
		ecrire(root, dataDir, fichiers);
	} catch (err) {
		ecrire(root, dataDir, verifierArchive(readFileSync(securite.chemin)).fichiers);
		throw new Error(`Restauration impossible (${err.message}) : l'état précédent a été remis.`);
	}
	return { manifeste, securite: securite.nom, fichiers: Object.keys(fichiers).length };
}

/** Remet l'état d'avant une restauration (publication en échec dans l'Espace Admin). */
export function annulerRestauration(nomSecurite, { root = racineSite(), dataDir = dossierDonnees(root) } = {}) {
	const chemin = cheminSauvegarde(nomSecurite, dataDir);
	if (!chemin) throw new Error(`Sauvegarde de sécurité ${nomSecurite} introuvable.`);
	ecrire(root, dataDir, verifierArchive(readFileSync(chemin)).fichiers);
}

// --- Ligne de commande --------------------------------------------------------

const taille = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

async function main(args) {
	const [commande, ...reste] = args;
	const root = racineSite();
	const dataDir = dossierDonnees(root);
	if (commande === 'creer') {
		const r = creerSauvegarde({ root, dataDir, motif: reste.join(' '), par: 'ligne de commande' });
		console.log(`✓ Sauvegarde créée : ${r.nom} (${r.fichiers} fichiers, ${taille(r.taille)})`);
		console.log(`  ${r.chemin}`);
		return;
	}
	if (commande === 'liste') {
		const liste = await listerSauvegardes(dataDir);
		if (!liste.length) console.log(`Aucune sauvegarde dans ${dossierSauvegardes(dataDir)}.`);
		for (const s of liste) {
			const m = s.manifeste;
			console.log(`${s.nom}  ${taille(s.taille)}  ${m ? `${m.association} · modèle ${m.modele}${m.motif ? ` · ${m.motif}` : ''}` : '(pas une sauvegarde du site)'}`);
		}
		return;
	}
	if (commande === 'restaurer') {
		const oui = reste.includes('--oui');
		const cible = reste.find((a) => a !== '--oui');
		if (!cible) throw new Error('Indiquez la sauvegarde : node scripts/sauvegarde.mjs restaurer <nom.zip | chemin>');
		const chemin = cheminSauvegarde(cible, dataDir) ?? (existsSync(cible) ? resolve(cible) : null);
		if (!chemin) throw new Error(`Sauvegarde introuvable : ${cible} (voir « liste »).`);
		const zip = readFileSync(chemin);
		const { manifeste, fichiers } = verifierArchive(zip);
		console.log(`Sauvegarde : ${basename(chemin)}`);
		console.log(`  association « ${manifeste.association} », créée le ${manifeste.creeLe}, modèle ${manifeste.modele}, ${Object.keys(fichiers).length} fichiers`);
		console.log('  ⚠️  Remplace TOUT src/content/ et les comptes + journal de l’Espace Admin.');
		if (!oui) {
			const rl = createInterface({ input: process.stdin, output: process.stdout });
			const reponse = await rl.question('  Taper « oui » pour restaurer : ');
			rl.close();
			if (reponse.trim().toLowerCase() !== 'oui') {
				console.log('Abandon : rien n’a été modifié.');
				process.exitCode = 3; // ./restauration.sh : pas de redémarrage
				return;
			}
		}
		const r = restaurerSauvegarde(zip, { root, dataDir, par: 'ligne de commande' });
		console.log(`✓ Restauration faite (${r.fichiers} fichiers). État précédent gardé dans ${r.securite}.`);
		console.log('  Redémarrez le site pour le reconstruire avec ce contenu.');
		return;
	}
	console.log('Usage : node scripts/sauvegarde.mjs creer [motif] | liste | restaurer <nom.zip | chemin> [--oui]');
	process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main(process.argv.slice(2)).catch((err) => {
		console.error(`✗ ${err.message}`);
		process.exit(1);
	});
}
