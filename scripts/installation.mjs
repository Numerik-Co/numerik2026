/**
 * Installation d'un site : secrets saisis dans l'assistant d'installation de
 * l'Espace Admin et état de l'installation, dans `<DATA_DIR>/installation/`.
 *
 *  - `secrets.env` (droits 600) : variables d'environnement qui **complètent**
 *    le `.env` (clés Grist, `AUTH_SECRET` généré…). Chargées au démarrage par
 *    `scripts/start.mjs` (et par `src/integrations/installation.ts` en dev) ;
 *    une variable déjà définie (non vide) par le `.env` ou l'environnement
 *    l'emporte toujours. Le `.env` d'un site Docker est lu par
 *    `docker compose` sur l'hôte, hors de portée du conteneur : d'où ce
 *    fichier, dans le volume des données. Jamais dans les sauvegardes.
 *  - `installation.json` : `{ etat: 'en-cours' | 'terminee', date, par }`.
 *
 * Module sans dépendance à Astro.
 */

import { randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function dossierInstallation(dataDir) {
	return join(dataDir, 'installation');
}

export function fichierSecrets(dataDir) {
	return join(dossierInstallation(dataDir), 'secrets.env');
}

function fichierEtat(dataDir) {
	return join(dossierInstallation(dataDir), 'installation.json');
}

/** Nom de variable accepté. */
export const NOM_SECRET = /^[A-Z][A-Z0-9_]{1,63}$/;

/**
 * Variables de `secrets.env` (format `NOM="valeur"`, valeur en JSON).
 * @returns {Record<string, string>}
 */
export function lireSecrets(dataDir) {
	let texte = '';
	try {
		texte = readFileSync(fichierSecrets(dataDir), 'utf8');
	} catch {
		return {};
	}
	/** @type {Record<string, string>} */
	const secrets = {};
	for (const ligne of texte.split('\n')) {
		const m = ligne.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
		if (!m) continue;
		try {
			secrets[m[1]] = m[2].startsWith('"') ? JSON.parse(m[2]) : m[2];
		} catch {
			// Ligne abîmée : ignorée.
		}
	}
	return secrets;
}

function ecrireAtomique(fichier, texte) {
	mkdirSync(join(fichier, '..'), { recursive: true });
	writeFileSync(`${fichier}.tmp`, texte, { mode: 0o600 });
	renameSync(`${fichier}.tmp`, fichier);
	chmodSync(fichier, 0o600);
}

/** Ajoute ou remplace des variables (valeur vide = retirée). */
export function ecrireSecrets(dataDir, valeurs) {
	const secrets = { ...lireSecrets(dataDir) };
	for (const [nom, valeur] of Object.entries(valeurs)) {
		if (!NOM_SECRET.test(nom)) throw new Error(`Nom de variable invalide : ${nom}`);
		if (valeur) secrets[nom] = String(valeur);
		else delete secrets[nom];
	}
	const texte =
		'# Secrets saisis à l’installation (Espace Admin). Complètent le .env, qui l’emporte.\n' +
		'# Fichier propre à ce serveur : jamais dans les sauvegardes ni dans git.\n' +
		Object.entries(secrets)
			.map(([nom, valeur]) => `${nom}=${JSON.stringify(valeur)}`)
			.join('\n') +
		'\n';
	ecrireAtomique(fichierSecrets(dataDir), texte);
}

/** Variable définie (non vide) par l'environnement ? */
export const defini = (env, nom) => typeof env[nom] === 'string' && env[nom] !== '';

/** Charge `secrets.env` dans `env` sans rien écraser ; rend les noms chargés. */
export function chargerSecrets(dataDir, env = process.env) {
	const charges = [];
	for (const [nom, valeur] of Object.entries(lireSecrets(dataDir))) {
		if (defini(env, nom)) continue;
		env[nom] = valeur;
		charges.push(nom);
	}
	return charges;
}

export const secretAleatoire = () => randomBytes(32).toString('base64url');

/**
 * `AUTH_SECRET` absent ou trop court (connexion impossible) : en génère un,
 * gardé dans `secrets.env`. Rend `true` s'il a été créé.
 */
export function assurerAuthSecret(dataDir, env = process.env) {
	if (defini(env, 'AUTH_SECRET') && env.AUTH_SECRET.length >= 32) return false;
	const secret = secretAleatoire();
	ecrireSecrets(dataDir, { AUTH_SECRET: secret });
	env.AUTH_SECRET = secret;
	return true;
}

/** @returns {{ etat: 'en-cours' | 'terminee', date: string, par?: string } | null} */
export function lireInstallation(dataDir) {
	try {
		return JSON.parse(readFileSync(fichierEtat(dataDir), 'utf8'));
	} catch {
		return null;
	}
}

export function ecrireInstallation(dataDir, etat, par = '') {
	ecrireAtomique(fichierEtat(dataDir), JSON.stringify({ etat, date: new Date().toISOString(), par }));
}
