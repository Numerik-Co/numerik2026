/**
 * Planning hebdomadaire affiché sur `/activites` : lu en direct depuis la
 * table Grist `Activite` plutôt qu'en dur dans le code. Seules les lignes
 * `Publiee = true` de la saison en cours sont retenues ; celles sans
 * `Categorie_agenda` valide (colonne pas encore renseignée) sont ignorées.
 */

import { AGENDA_KIND_META, type AgendaKind, type AgendaSession } from '../agenda';
import { COLS, currentSaisonId, listRecords, membreLabel, parseRefList, TABLES } from './grist';

/** "16:30" (Grist) -> "16h30" (format attendu par WeeklyAgenda.astro). */
function toAgendaTime(value: unknown): string {
	return String(value ?? '').replace(':', 'h');
}

export async function fetchPlanningAgenda(): Promise<AgendaSession[]> {
	const saisonId = await currentSaisonId();
	const records = await listRecords(TABLES.activites, {
		[COLS.activite.saison]: [saisonId],
		[COLS.activite.publiee]: [true],
	});

	const encadrantIds = new Set<number>();
	for (const r of records) {
		for (const id of parseRefList(r.fields[COLS.activite.encadrant])) {
			encadrantIds.add(id);
		}
	}
	const membres = encadrantIds.size > 0 ? await listRecords(TABLES.membres) : [];
	const labelParMembre = new Map(membres.map((m) => [m.id, membreLabel(m.fields)]));

	return records
		.filter((r) => {
			const kind = r.fields[COLS.activite.categorieAgenda];
			return typeof kind === 'string' && kind in AGENDA_KIND_META;
		})
		.map((r) => {
			const f = r.fields;
			const session: AgendaSession = {
				day: String(f[COLS.activite.jour]),
				start: toAgendaTime(f[COLS.activite.debuteA]),
				end: toAgendaTime(f[COLS.activite.finiA]),
				title: String(f[COLS.activite.nom] ?? ''),
				kind: f[COLS.activite.categorieAgenda] as AgendaKind,
			};
			const animateurs = parseRefList(f[COLS.activite.encadrant])
				.map((id) => labelParMembre.get(id))
				.filter((label): label is string => Boolean(label))
				.join(' et ');
			if (animateurs) session.animators = animateurs;
			const lieu = f[COLS.activite.lieu];
			if (lieu) session.location = String(lieu);
			return session;
		});
}
