/**
 * Document Grist de la facturation (schéma dans le README du plugin) :
 * tables, colonnes et client. ⚠️ SEUL ENDROIT à ajuster si ce schéma change.
 *
 * Adresse de l'instance, document et clé : variables d'environnement lues
 * au démarrage (`astro:env`, `.env` ou secrets de l'assistant
 * d'installation) : `GRIST_BASE_URL`, `GRIST_DOC_ID_FACTURATION`,
 * `GRIST_API_KEY_FACTURATION` (sinon `GRIST_API_KEY`).
 */
import { GRIST_API_KEY, GRIST_API_KEY_FACTURATION, GRIST_BASE_URL, GRIST_DOC_ID_FACTURATION } from 'astro:env/server';
import { clientGrist } from '../../../lib/grist-client';

export { GristError, dateDepuisGrist, dateVersGrist } from '../../../lib/grist-client';

export const grist = clientGrist(() => ({
	url: GRIST_BASE_URL,
	document: GRIST_DOC_ID_FACTURATION,
	cle: GRIST_API_KEY_FACTURATION || GRIST_API_KEY,
	nom: 'facturation',
}));

export const TABLES = {
	clients: 'Clients',
	prestations: 'Prestations',
	devis: 'Devis',
	factures: 'Factures',
	lignes: 'Lignes',
} as const;

export const COLS = {
	client: {
		nom: 'Nom',
		societe: 'Societe',
		email: 'Email',
		telephone: 'Telephone',
		adresse: 'Adresse',
		codePostal: 'Code_postal',
		ville: 'Ville',
		siret: 'SIRET',
		notes: 'Notes',
		creeLe: 'Cree_le',
	},
	prestation: { libelle: 'Libelle', description: 'Description', prixUnitaire: 'Prix_unitaire', unite: 'Unite', active: 'Active' },
	devis: {
		numero: 'Numero',
		client: 'Client', // Ref:Clients
		date: 'Date',
		validite: 'Validite',
		objet: 'Objet',
		statut: 'Statut', // Choice : STATUTS_DEVIS
		message: 'Message_client',
		notes: 'Notes',
		total: 'Total',
		creeLe: 'Cree_le',
	},
	facture: {
		numero: 'Numero',
		client: 'Client', // Ref:Clients
		devis: 'Devis', // Ref:Devis
		date: 'Date',
		datePrestation: 'Date_prestation',
		echeance: 'Echeance',
		objet: 'Objet',
		statut: 'Statut', // Choice : STATUTS_FACTURE
		datePaiement: 'Date_paiement',
		modePaiement: 'Mode_paiement',
		notes: 'Notes',
		total: 'Total',
		creeLe: 'Cree_le',
	},
	ligne: {
		devis: 'Devis', // Ref:Devis
		facture: 'Facture', // Ref:Factures
		ordre: 'Ordre',
		libelle: 'Libelle',
		quantite: 'Quantite',
		unite: 'Unite',
		prixUnitaire: 'Prix_unitaire',
		montant: 'Montant',
	},
} as const;

/** Date du jour à Paris (yyyy-mm-dd). */
export const aujourdhui = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());

/** `iso` + `n` jours (yyyy-mm-dd). */
export function plusJours(iso: string, n: number): string {
	const d = new Date(`${iso}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}
