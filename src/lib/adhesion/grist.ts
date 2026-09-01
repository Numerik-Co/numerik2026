/**
 * Client Grist + mapping des colonnes du document d'adhésion.
 *
 * ⚠️ SEUL ENDROIT à ajuster si le schéma Grist change :
 *   - `TABLES` : identifiants (nom technique) des tables
 *   - `COLS`   : mapping "champ logique" -> "id de colonne Grist"
 *   - `GENRE_CHOICES` / `ROLE_*` : valeurs des listes de choix Grist
 *
 * La clé Grist ne vit QUE côté serveur, jamais exposée au navigateur.
 * Voir docs/api.md.
 *
 * Lecture à l'EXÉCUTION via `process.env` (adaptateur Node) : `import.meta.env`
 * est figé au build — donc vide quand on construit l'image Docker sans `.env`.
 * `import.meta.env` reste en repli (utile en dev / autres contextes).
 */

const ENV = {
	...(import.meta.env as unknown as Record<string, string | undefined>),
	...(process.env as Record<string, string | undefined>),
};

const {
	GRIST_BASE_URL,
	GRIST_DOC_ID,
	GRIST_API_KEY,
	GRIST_TABLE_MEMBRES,
	GRIST_TABLE_ADHESIONS,
	GRIST_TABLE_INSCRIPTIONS,
	GRIST_TABLE_COTISATIONS,
	GRIST_TABLE_ACTIVITES,
	GRIST_TABLE_SAISONS,
} = ENV;

export const TABLES = {
	membres: GRIST_TABLE_MEMBRES || 'Membres',
	adhesions: GRIST_TABLE_ADHESIONS || 'Adhesions',
	inscriptions: GRIST_TABLE_INSCRIPTIONS || 'Inscription',
	cotisations: GRIST_TABLE_COTISATIONS || 'Cotisation',
	activites: GRIST_TABLE_ACTIVITES || 'Activite',
	saisons: GRIST_TABLE_SAISONS || 'Saisons',
} as const;

export const COLS = {
	membre: {
		nom: 'Nom',
		prenom: 'Prenom',
		email: 'Email',
		role: 'Role',
		genre: 'Genre',
		adresse: 'Adresse',
		codePostal: 'Code_Postal',
		commune: 'Commune',
		dateNaissance: 'DDN', // Date (timestamp Unix, secondes)
		telFixe: 'Telephone_Fixe',
		telMobile: 'Telephone_Mobile',
		newsletter: 'Newsletters',
		droitImage: 'Droit_image', // Bool
		commentaires: 'Commentaires',
		responsableDe: 'Responsable_de', // RefList:Membres (membres rattachés)
		adhesionEnCours: 'Adhesion_en_cours', // Bool FORMULE (lecture seule) : le membre figure dans une Adhesions de la saison « Actuelle »
	},
	adhesion: {
		membres: 'Membres', // RefList:Membres  -> ["L", id, ...]
		cotisation: 'Cotisation', // Ref:Cotisation -> rowId
		statut: 'Statut', // Choice: Payé | Partiellement | Impayé
		montantDu: 'Montant_du', // Numeric
		bulletinHtml: 'Formule', // FORMULE (lecture seule) : HTML complet du bulletin d'adhésion, cf. docs/bulletin-pdf.md
		// Autres colonnes FORMULE (ne pas écrire) : Saison, Tarif, Regle, Renouvellement
	},
	inscription: {
		membre: 'Membre', // Ref:Membres  -> rowId
		activite: 'Activite', // Ref:Activite -> rowId
		dateInscription: 'Date_d_inscription', // Date (timestamp Unix, secondes)
		montantDu: 'Montant_du', // Numeric
		disponibilite: 'Disponibilite', // Choice: Inscrit | Liste d'attente | Annulé
		// Colonnes FORMULE (ne pas écrire) : Saison, Eligible, Regle
	},
	cotisation: {
		type: 'Type',
		label: 'Label',
		prix: 'Tarif_conseille',
		description: 'Description',
		saison: 'Saison',
		personneMorale: 'Personne_Morale',
		multiple: 'Multiple', // Bool : adhésion à ≥ 2 membres
	},
	activite: {
		nom: 'Nom',
		type: 'Type',
		prix: 'Tarif',
		payant: 'Payant',
		saison: 'Saison',
		placesRestantes: 'Places_restantes',
		placesMax: 'Places_max',
		adhesionRequise: 'Adhesion_requise',
	},
	saison: {
		nom: 'Nom',
		actuelle: 'Actuelle',
	},
} as const;

/**
 * Valeurs des listes de choix Grist : déplacées dans `./choices` (module pur)
 * pour rester importables côté navigateur sans traîner `process.env` /
 * `node:crypto`. Ré-exportées ici pour le code serveur qui importe déjà `grist`.
 */
export {
	GENRE_CHOICES,
	ROLE_PHYSIQUE,
	ROLE_MORAL,
	ROLE_CONTACT,
	STATUT_IMPAYE,
	DISPO_INSCRIT,
	DISPO_ATTENTE,
} from './choices';
export type { GenreGrist } from './choices';

export class GristError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = 'GristError';
	}
}

export function assertGristConfig(): void {
	if (!GRIST_BASE_URL || !GRIST_DOC_ID || !GRIST_API_KEY) {
		throw new GristError('Configuration Grist manquante côté serveur.', 500);
	}
}

/** yyyy-mm-dd -> secondes depuis l'epoch (minuit UTC), format attendu par Grist. */
export function dateToEpochSeconds(iso: string): number | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
	const ms = Date.parse(`${iso}T00:00:00Z`);
	return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

/** Encodage d'une RefList Grist pour l'écriture. */
export function refList(...ids: number[]): (string | number)[] {
	return ['L', ...ids];
}

/** Décodage d'une RefList Grist lue (`['L', 8, 9]`) -> `[8, 9]`. */
export function parseRefList(value: unknown): number[] {
	if (!Array.isArray(value)) return [];
	return value.filter((v): v is number => typeof v === 'number');
}

/** Libellé « Prénom Nom » à partir des champs d'un enregistrement Membres. */
export function membreLabel(fields: Record<string, unknown>): string {
	const prenom = String(fields[COLS.membre.prenom] ?? '').trim();
	const nom = String(fields[COLS.membre.nom] ?? '').trim();
	return `${prenom} ${nom}`.trim() || 'Membre';
}

function docUrl(path: string): string {
	return `${GRIST_BASE_URL}/api/docs/${GRIST_DOC_ID}${path}`;
}

async function gristFetch<T>(path: string, init?: RequestInit): Promise<T> {
	assertGristConfig();
	const res = await fetch(docUrl(path), {
		...init,
		headers: {
			Authorization: `Bearer ${GRIST_API_KEY}`,
			'Content-Type': 'application/json',
			...init?.headers,
		},
	});
	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		throw new GristError(
			`Grist ${res.status} sur ${path}${detail ? ` — ${detail.slice(0, 300)}` : ''}`,
			502,
		);
	}
	return (await res.json()) as T;
}

export interface GristRecord<F = Record<string, unknown>> {
	id: number;
	fields: F;
}

export async function listRecords<F = Record<string, unknown>>(
	table: string,
	filter?: Record<string, (string | number | boolean)[]>,
): Promise<GristRecord<F>[]> {
	const qs = filter ? `?filter=${encodeURIComponent(JSON.stringify(filter))}` : '';
	const data = await gristFetch<{ records: GristRecord<F>[] }>(`/tables/${table}/records${qs}`);
	return data.records;
}

export async function createRecord(
	table: string,
	fields: Record<string, unknown>,
): Promise<number> {
	const data = await gristFetch<{ records: { id: number }[] }>(`/tables/${table}/records`, {
		method: 'POST',
		body: JSON.stringify({ records: [{ fields }] }),
	});
	const id = data.records[0]?.id;
	if (typeof id !== 'number') {
		throw new GristError('Grist n’a pas renvoyé d’identifiant de record.', 502);
	}
	return id;
}

export async function updateRecord(
	table: string,
	id: number,
	fields: Record<string, unknown>,
): Promise<void> {
	await updateRecords(table, [{ id, fields }]);
}

/** PATCH groupé : plusieurs enregistrements d'une même table en une requête. */
export async function updateRecords(
	table: string,
	records: { id: number; fields: Record<string, unknown> }[],
): Promise<void> {
	if (records.length === 0) return;
	await gristFetch(`/tables/${table}/records`, {
		method: 'PATCH',
		body: JSON.stringify({ records }),
	});
}

/** rowId de la saison en cours (Saisons.Actuelle = true). */
export async function currentSaisonId(): Promise<number> {
	const rows = await listRecords(TABLES.saisons, { [COLS.saison.actuelle]: [true] });
	const id = rows[0]?.id;
	if (typeof id !== 'number') {
		throw new GristError('Aucune saison marquée « Actuelle » dans Grist.', 502);
	}
	return id;
}
