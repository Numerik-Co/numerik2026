/**
 * Appels du formulaire d'inscription (routes `/api/inscription/*` de ce
 * plugin). La recherche d'un·e adhérent·e et l'inscription elle-même passent
 * par les routes du plugin adhésion, requis (`adhesionApi`).
 */
import { get, post } from '../../adhesion/formulaire/adhesion/client';
import type { ExterieurPayload, ExterieurResult, OffreInscription, PreinscriptionPayload } from '../../adhesion/lib/types';

export { adhesionApi } from '../../adhesion/formulaire/adhesion/client';

export const inscriptionApi = {
	/** `cible` : la query string reçue par /inscription (`activite=…&type=…`), relayée telle quelle. */
	offre: (cible: URLSearchParams) => get<OffreInscription>(`/api/inscription/offre?${cible}`),
	preinscrire: (payload: PreinscriptionPayload) => post<{ ok: true }>('/api/inscription/preinscription', payload),
	creerParticipantExterieur: (payload: ExterieurPayload) =>
		post<ExterieurResult>('/api/inscription/participant-exterieur', payload),
};
