/** Module « Facturation » : clients, prestations, devis et factures (`GET`), et réglages utiles au module. */
import type { APIRoute } from 'astro';
import { json } from '../../../../lib/auth/api';
import { isGotenbergEnabled } from '../../../../lib/gotenberg';
import { facturationConfig } from '../../lib/config';
import { charger } from '../../lib/documents';
import { traiter } from './erreurs';

export const prerender = false;

export const GET: APIRoute = () =>
	traiter('api/admin/facturation', async () =>
		json({
			...(await charger()),
			reglages: {
				modesPaiement: facturationConfig.factures.modesPaiement,
				validiteJours: facturationConfig.devis.validiteJours,
				pdf: isGotenbergEnabled(),
			},
		}),
	);
