/** Réponses d'erreur communes aux routes du module « Facturation ». */
import { jsonError } from '../../../../lib/auth/api';
import { ErreurSaisie } from '../../lib/documents';
import { GristError } from '../../lib/grist';

export async function traiter(lieu: string, action: () => Promise<Response>): Promise<Response> {
	try {
		return await action();
	} catch (err) {
		if (err instanceof ErreurSaisie) return jsonError(err.message, 422);
		if (err instanceof GristError) {
			console.error(`[${lieu}]`, err);
			return jsonError(err.status === 500 ? err.message : 'Grist injoignable ou en erreur : rien n’a été enregistré.', 502);
		}
		throw err;
	}
}
