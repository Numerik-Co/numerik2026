/**
 * Client Grist générique (API REST d'un document) pour les plugins :
 * `clientGrist({ url, document, cle, nom })` rend les opérations sur les
 * lignes. Configuration lue à l'appel (fonction), pour qu'un plugin puisse
 * la prendre dans son fichier de réglages ou dans le `.env`.
 *
 * Code serveur uniquement.
 */
import { GristError } from './grist-error';

export { GristError };

export interface GristConfig {
	url: string | undefined;
	document: string | undefined;
	cle: string | undefined;
	/** Nom du document dans les messages d'erreur (« facturation »…). */
	nom: string;
}

export interface GristRecord<F = Record<string, unknown>> {
	id: number;
	fields: F;
}

type Filtre = Record<string, (string | number | boolean)[]>;

/** yyyy-mm-dd → secondes depuis l'epoch (minuit UTC), format des colonnes Date de Grist. */
export function dateVersGrist(iso: string): number | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
	const ms = Date.parse(`${iso}T00:00:00Z`);
	return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

/** Valeur d'une colonne Date de Grist → yyyy-mm-dd (vide si absente). */
export function dateDepuisGrist(v: unknown): string {
	return typeof v === 'number' && v > 0 ? new Date(v * 1000).toISOString().slice(0, 10) : '';
}

export function clientGrist(config: () => GristConfig) {
	async function appel<T>(chemin: string, init?: RequestInit): Promise<T> {
		const { url, document, cle, nom } = config();
		if (!url || !document || !cle) throw new GristError(`Configuration Grist (${nom}) manquante côté serveur.`, 500);
		const res = await fetch(`${url.replace(/\/+$/, '')}/api/docs/${document}${chemin}`, {
			...init,
			headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json', ...init?.headers },
		});
		if (!res.ok) {
			const detail = await res.text().catch(() => '');
			throw new GristError(`Grist ${res.status} sur ${chemin}${detail ? ` — ${detail.slice(0, 300)}` : ''}`, 502);
		}
		return (await res.json()) as T;
	}

	return {
		configure: () => {
			const { url, document, cle } = config();
			return Boolean(url && document && cle);
		},
		async lister<F = Record<string, unknown>>(table: string, filtre?: Filtre): Promise<GristRecord<F>[]> {
			const qs = filtre ? `?filter=${encodeURIComponent(JSON.stringify(filtre))}` : '';
			return (await appel<{ records: GristRecord<F>[] }>(`/tables/${table}/records${qs}`)).records;
		},
		async creer(table: string, lignes: Record<string, unknown>[]): Promise<number[]> {
			if (!lignes.length) return [];
			const data = await appel<{ records: { id: number }[] }>(`/tables/${table}/records`, {
				method: 'POST',
				body: JSON.stringify({ records: lignes.map((fields) => ({ fields })) }),
			});
			return data.records.map((r) => r.id);
		},
		async modifier(table: string, lignes: { id: number; fields: Record<string, unknown> }[]): Promise<void> {
			if (!lignes.length) return;
			await appel(`/tables/${table}/records`, { method: 'PATCH', body: JSON.stringify({ records: lignes }) });
		},
		async supprimer(table: string, ids: number[]): Promise<void> {
			if (!ids.length) return;
			await appel(`/tables/${table}/data/delete`, { method: 'POST', body: JSON.stringify(ids) });
		},
	};
}

export type ClientGrist = ReturnType<typeof clientGrist>;
