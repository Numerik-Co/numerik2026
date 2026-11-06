/**
 * Types et règles de calcul du plugin facturation, partagés par le serveur
 * et l'îlot Vue (module « Facturation », formulaire public). Module pur.
 */

export const STATUTS_DEVIS = ['Demande', 'Brouillon', 'Envoyé', 'Accepté', 'Refusé'] as const;
export type StatutDevis = (typeof STATUTS_DEVIS)[number];

/** Une facture numérotée (émise) n'est plus modifiable : seul son paiement l'est. */
export const STATUTS_FACTURE = ['Brouillon', 'Émise', 'Payée'] as const;
export type StatutFacture = (typeof STATUTS_FACTURE)[number];

export interface Ligne {
	libelle: string;
	quantite: number;
	unite: string;
	prixUnitaire: number;
}

export interface Client {
	id: number;
	nom: string;
	societe: string;
	email: string;
	telephone: string;
	adresse: string;
	codePostal: string;
	ville: string;
	siret: string;
	notes: string;
}

export type ClientSaisie = Omit<Client, 'id'>;

export interface Prestation {
	id: number;
	libelle: string;
	description: string;
	prixUnitaire: number;
	unite: string;
}

export interface Devis {
	id: number;
	/** Vide tant que c'est une demande en ligne non traitée. */
	numero: string;
	clientId: number | null;
	date: string;
	validite: string;
	objet: string;
	statut: StatutDevis;
	/** Message laissé par le client (demande en ligne). */
	message: string;
	notes: string;
	lignes: Ligne[];
	total: number;
	/** Facture créée depuis ce devis. */
	factureId: number | null;
}

export interface Facture {
	id: number;
	/** Vide tant que la facture est un brouillon. */
	numero: string;
	clientId: number | null;
	devisId: number | null;
	date: string;
	datePrestation: string;
	echeance: string;
	objet: string;
	statut: StatutFacture;
	datePaiement: string;
	modePaiement: string;
	notes: string;
	lignes: Ligne[];
	total: number;
}

/** Arrondi au centime. */
export const centimes = (n: number) => Math.round(n * 100) / 100;

export const montantLigne = (l: Ligne) => centimes(l.quantite * l.prixUnitaire);

export const totalLignes = (lignes: Ligne[]) => centimes(lignes.reduce((s, l) => s + montantLigne(l), 0));

export const euros = (n: number) =>
	n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

/** Problème d'une ligne, ou `null`. */
export function problemeLigne(l: Ligne, rang: number): string | null {
	if (!l.libelle.trim()) return `Ligne ${rang} : désignation vide.`;
	if (!Number.isFinite(l.quantite) || l.quantite <= 0) return `Ligne ${rang} : quantité positive attendue.`;
	if (!Number.isFinite(l.prixUnitaire) || l.prixUnitaire < 0) return `Ligne ${rang} : prix unitaire positif ou nul attendu.`;
	return null;
}
