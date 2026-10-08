/**
 * Gestion des comptes en ligne de commande (équivalent de
 * `bin/plugin login newuser` de Grav) — indispensable pour créer le premier
 * admin, ensuite tout se fait depuis le module « Comptes » de la barre admin.
 *
 *   npm run auth:user -- list
 *   npm run auth:user -- add <login> "<Prénom Nom>" [groupe…]   (défaut : admin)
 *   npm run auth:user -- reset <login>
 *   npm run auth:user -- init [login] ["<Nom>"]   (super admin, défaut : superadmin)
 *
 * En production, sur le VPS (lance ce CLI dans le conteneur) :
 *   ./auth-user.sh add xavier "Xavier Burke" admin
 *
 * Le mot de passe provisoire est généré et affiché une seule fois.
 *
 * `init` (déploiement) crée le compte super admin — groupe `superadmin` seul,
 * mot de passe provisoire à changer obligatoirement à la première connexion
 * (`SUPERADMIN_PASSWORD` dans l'environnement pour l'imposer, sinon généré).
 * Sans effet si un compte super admin existe déjà : relançable sans risque.
 * `reset` d'un super admin impose aussi un changement à la connexion.
 * Comptes écrits dans `$DATA_DIR/accounts` (défaut `./data/accounts`).
 */

import {
	dataDir,
	isSuperadminAccount,
	isValidLogin,
	listAccounts,
	normalizeLogin,
	readAccount,
	saveAccount,
} from '../src/lib/auth/accounts.ts';
import { AUTH_GROUPS, isAuthGroup, type AuthGroup } from '../src/lib/auth/groups.ts';
import { generatePassword, hashPassword, passwordProblem } from '../src/lib/auth/password.ts';

const [command, ...args] = process.argv.slice(2);

function fail(message: string): never {
	console.error(`Erreur : ${message}`);
	process.exit(1);
}

async function main() {
	switch (command) {
		case 'list': {
			const accounts = await listAccounts();
			if (accounts.length === 0) console.log(`Aucun compte dans ${dataDir()}/accounts`);
			for (const a of accounts) {
				console.log(`${a.login.padEnd(20)} ${a.fullname.padEnd(28)} ${a.groups.join(',').padEnd(18)} ${a.state}`);
			}
			return;
		}

		case 'add': {
			const login = normalizeLogin(args[0] ?? '');
			const fullname = (args[1] ?? '').trim();
			const groups = args.slice(2).length > 0 ? args.slice(2) : ['admin'];
			if (!isValidLogin(login)) fail('identifiant invalide (2 à 32 caractères : a-z 0-9 . - _).');
			if (!fullname) fail('nom manquant.');
			const unknown = groups.filter((g) => !isAuthGroup(g));
			if (unknown.length > 0) fail(`groupe(s) inconnu(s) : ${unknown.join(', ')} — connus : ${Object.keys(AUTH_GROUPS).join(', ')}`);
			if (groups.includes('superadmin')) fail('le super admin se crée avec « init ».');
			if (await readAccount(login)) fail(`le compte « ${login} » existe déjà (utilisez reset).`);

			const password = generatePassword();
			const now = new Date().toISOString();
			await saveAccount({
				login,
				fullname,
				groups: groups as AuthGroup[],
				state: 'enabled',
				hashedPassword: await hashPassword(password),
				created: now,
				updated: now,
			});
			console.log(`Compte « ${login} » créé (${groups.join(', ')}).`);
			console.log(`Mot de passe provisoire : ${password}`);
			return;
		}

		case 'reset': {
			const account = await readAccount(normalizeLogin(args[0] ?? ''));
			if (!account) fail(`compte « ${args[0] ?? ''} » introuvable.`);
			const password = generatePassword();
			account.hashedPassword = await hashPassword(password);
			account.state = 'enabled';
			if (isSuperadminAccount(account)) account.mustChangePassword = true;
			await saveAccount(account);
			console.log(`Mot de passe de « ${account.login} » réinitialisé (compte réactivé).`);
			console.log(`Mot de passe provisoire : ${password}`);
			return;
		}

		case 'init': {
			const existing = (await listAccounts()).find(isSuperadminAccount);
			if (existing) {
				console.log(`Super admin déjà présent (« ${existing.login} ») : rien à faire.`);
				return;
			}
			const login = normalizeLogin(args[0] ?? 'superadmin');
			const fullname = (args[1] ?? 'Super admin').trim();
			if (!isValidLogin(login)) fail('identifiant invalide (2 à 32 caractères : a-z 0-9 . - _).');
			if (await readAccount(login)) fail(`le compte « ${login} » existe déjà : choisissez un autre identifiant.`);
			const imposed = process.env.SUPERADMIN_PASSWORD ?? '';
			const problem = imposed ? passwordProblem(imposed) : null;
			if (problem) fail(`SUPERADMIN_PASSWORD : ${problem}`);
			const password = imposed || generatePassword();
			const now = new Date().toISOString();
			await saveAccount({
				login,
				fullname,
				groups: ['superadmin'],
				state: 'enabled',
				hashedPassword: await hashPassword(password),
				mustChangePassword: true,
				created: now,
				updated: now,
			});
			console.log(`Super admin « ${login} » créé. Mot de passe à changer à la première connexion.`);
			if (!imposed) console.log(`Mot de passe provisoire : ${password}`);
			return;
		}

		default:
			console.log('Usage : auth-user.ts list | add <login> "<Prénom Nom>" [groupe…] | reset <login> | init [login] ["<Nom>"]');
			process.exit(command ? 1 : 0);
	}
}

await main();
