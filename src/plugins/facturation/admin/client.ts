/** Appels du module « Facturation » (routes `/api/admin/facturation*`, `api/` de ce dossier). */
import { request } from '../../../components/admin/client';
import type { Client, ClientSaisie, Devis, Facture, Ligne, Prestation, StatutDevis } from '../lib/types';

export interface DonneesFacturation {
	clients: Client[];
	prestations: Prestation[];
	devis: Devis[];
	factures: Facture[];
	reglages: { modesPaiement: string[]; validiteJours: number; pdf: boolean };
}

export interface DevisSaisie {
	clientId: number | null;
	date: string;
	validite: string;
	objet: string;
	statut: StatutDevis;
	notes: string;
	lignes: Ligne[];
}

export interface FactureSaisie {
	clientId: number | null;
	devisId: number | null;
	datePrestation: string;
	objet: string;
	notes: string;
	lignes: Ligne[];
}

const URL = '/api/admin/facturation';

export const facturationApi = {
	charger: () => request<DonneesFacturation>('GET', URL),
	client: (id: number | null, client: ClientSaisie) => request<{ ok: true; id: number }>('POST', `${URL}/clients`, { id, client }),
	devis: (action: 'enregistrer' | 'supprimer' | 'facturer', id: number | null, devis?: DevisSaisie) =>
		request<{ ok: true; id?: number; factureId?: number }>('POST', `${URL}/devis`, { action, id, devis }),
	facture: (
		action: 'enregistrer' | 'emettre' | 'paiement' | 'supprimer',
		id: number | null,
		donnees: { facture?: FactureSaisie; paiement?: { paye: boolean; datePaiement: string; modePaiement: string } } = {},
	) => request<{ ok: true; id?: number; numero?: string }>('POST', `${URL}/factures`, { action, id, ...donnees }),
};

export const pdfHref = (type: 'devis' | 'facture', id: number) => `${URL}/pdf?type=${type}&id=${id}`;

export const aujourdhui = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
export function plusJours(iso: string, n: number): string {
	const d = new Date(`${iso}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}
export const dateFr = (iso: string) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '—');
