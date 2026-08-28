import type { APIRoute } from 'astro';

/**
 * ROUTE TEMPORAIRE DE DEBUG — à supprimer une fois le mapping Grist calé.
 * Tables + colonnes (avec choix) + 1 enregistrement d'exemple par table.
 */
export const prerender = false;

const ONLY = ['Membres', 'Cotisation', 'Activite', 'Inscription', 'Adhesions', 'Saisons'];

export const GET: APIRoute = async ({ url }) => {
	if (!import.meta.env.DEV) return new Response('Not found', { status: 404 });
	const { GRIST_BASE_URL, GRIST_DOC_ID, GRIST_API_KEY } = import.meta.env;
	if (!GRIST_BASE_URL || !GRIST_DOC_ID || !GRIST_API_KEY) {
		return new Response('Config Grist manquante', { status: 500 });
	}
	const headers = { Authorization: `Bearer ${GRIST_API_KEY}` };
	const base = `${GRIST_BASE_URL}/api/docs/${GRIST_DOC_ID}`;
	const withSamples = url.searchParams.get('samples') === '1';

	// ?record=Table:rowId  -> renvoie ce record précis
	const rec = url.searchParams.get('record');
	if (rec) {
		const [table, rowId] = rec.split(':');
		const r = await fetch(`${base}/tables/${table}/records?filter=${encodeURIComponent(JSON.stringify({ id: [Number(rowId)] }))}`, { headers });
		return new Response(await r.text(), {
			status: r.status,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { tables } = (await (await fetch(`${base}/tables`, { headers })).json()) as {
		tables: { id: string }[];
	};

	const out: Record<string, unknown> = {};
	for (const t of tables) {
		if (!ONLY.includes(t.id)) continue;
		const colsRes = await fetch(`${base}/tables/${t.id}/columns`, { headers });
		const columns = colsRes.ok
			? ((await colsRes.json()) as {
					columns: { id: string; fields?: Record<string, unknown> }[];
				}).columns.map((c) => {
					let choices: unknown;
					try {
						const wo = c.fields?.widgetOptions;
						if (typeof wo === 'string' && wo) choices = JSON.parse(wo).choices;
					} catch {
						/* ignore */
					}
					const isFormula = c.fields?.isFormula === true && !!c.fields?.formula;
					return {
						id: c.id,
						type: c.fields?.type,
						...(isFormula ? { formula: true } : {}),
						...(choices ? { choices } : {}),
					};
				})
			: `erreur ${colsRes.status}`;

		let sample: unknown;
		if (withSamples) {
			const recRes = await fetch(`${base}/tables/${t.id}/records?limit=1`, { headers });
			sample = recRes.ok
				? ((await recRes.json()) as { records: unknown[] }).records[0]
				: `erreur ${recRes.status}`;
		}
		out[t.id] = withSamples ? { columns, sample } : columns;
	}

	return new Response(JSON.stringify(out, null, 2), {
		headers: { 'Content-Type': 'application/json' },
	});
};
