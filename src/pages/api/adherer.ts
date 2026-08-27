import type { APIRoute } from 'astro';

export const prerender = false;

interface AdhesionPayload {
	nom: string;
	prenom: string;
	email: string;
	typeAdhesion: string;
}

function isValidPayload(data: unknown): data is AdhesionPayload {
	if (!data || typeof data !== 'object') return false;
	const { nom, prenom, email, typeAdhesion } = data as Record<string, unknown>;

	return (
		typeof nom === 'string' &&
		nom.trim() !== '' &&
		typeof prenom === 'string' &&
		prenom.trim() !== '' &&
		typeof email === 'string' &&
		email.includes('@') &&
		typeof typeAdhesion === 'string' &&
		typeAdhesion.trim() !== ''
	);
}

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

// Squelette : le mapping des champs (Nom, Prenom, Email, TypeAdhesion) est à ajuster
// une fois le schéma réel de la table Grist et le formulaire d'adhésion définitifs.
export const POST: APIRoute = async ({ request }) => {
	const payload = await request.json().catch(() => null);

	if (!isValidPayload(payload)) {
		return json({ error: 'Champs manquants ou invalides.' }, 400);
	}

	const { GRIST_BASE_URL, GRIST_DOC_ID, GRIST_TABLE_ID, GRIST_API_KEY } = import.meta.env;

	if (!GRIST_BASE_URL || !GRIST_DOC_ID || !GRIST_TABLE_ID || !GRIST_API_KEY) {
		return json({ error: 'Configuration Grist manquante côté serveur.' }, 500);
	}

	const response = await fetch(
		`${GRIST_BASE_URL}/api/docs/${GRIST_DOC_ID}/tables/${GRIST_TABLE_ID}/records`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${GRIST_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				records: [
					{
						fields: {
							Nom: payload.nom,
							Prenom: payload.prenom,
							Email: payload.email,
							TypeAdhesion: payload.typeAdhesion,
						},
					},
				],
			}),
		}
	);

	if (!response.ok) {
		return json({ error: "Échec de l'enregistrement." }, 502);
	}

	return json({ success: true }, 200);
};
