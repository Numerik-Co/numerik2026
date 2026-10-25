<script setup lang="ts">
/**
 * Module « Rendez-vous » du plugin RDV (bureau et animateur·rice·s) : RDV
 * d'une semaine à la fois (ouvert sur la semaine en cours, chevrons ‹ › pour
 * la précédente / suivante, même vide), par jour, avec filtre de statut, et
 * bouton « PDF » de la semaine affichée (vue semaine, `semaine-pdf.ts`). La
 * recherche (nom, démarche) porte sur toutes les semaines ; un clic sur une
 * semaine trouvée y ramène. Un clic sur un RDV ouvre l'éditeur
 * (`RdvEditeur.vue`) dans un second panneau, à gauche de celui-ci. Les
 * modifications vont directement dans Grist (pas de reconstruction du site).
 */
import { computed, inject, onMounted, ref } from 'vue';
import { ApiError } from '../../../components/admin/client';
import { ADMIN_CONTEXT, inputClass } from '../../../components/admin/context';
import type { Creneau, Demarche } from '../lib/types';
import RdvEditeur from './RdvEditeur.vue';
import {
	aujourdhui,
	classeStatut,
	libelleDate,
	libelleSemaine,
	lundiDe,
	plusJours,
	rdvAdminApi,
	telechargerPdfSemaine,
	type ChampSuivi,
	type RdvItem,
} from './client';

const { sessionExpired } = inject(ADMIN_CONTEXT)!;

const rdvs = ref<RdvItem[]>([]);
const demarches = ref<Demarche[]>([]);
const statuts = ref<string[]>([]);
const suivi = ref<ChampSuivi[]>([]);
const creneaux = ref<Creneau[]>([]);
const loading = ref(true);
const error = ref('');

const cetteSemaine = lundiDe(aujourdhui());
/** Lundi de la semaine affichée. */
const semaine = ref(cetteSemaine);
const statut = ref('');
const recherche = ref('');
const ouvertId = ref<number | null>(null);
const ouvert = computed(() => rdvs.value.find((r) => r.id === ouvertId.value) ?? null);

async function load() {
	error.value = '';
	try {
		const res = await rdvAdminApi.list();
		rdvs.value = res.rdvs;
		demarches.value = res.demarches;
		statuts.value = res.statuts;
		suivi.value = res.suivi;
		creneaux.value = res.creneaux;
	} catch (e) {
		if (e instanceof ApiError && e.status === 401) return sessionExpired();
		error.value = (e as Error).message;
	} finally {
		loading.value = false;
	}
}

const sansAccents = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const q = computed(() => sansAccents(recherche.value.trim()));

const changerSemaine = (pas: number) => (semaine.value = plusJours(semaine.value, 7 * pas));

/** RDV affichés : ceux de la semaine, ou, pendant une recherche, ceux de toutes les semaines. */
const affiches = computed(() => {
	const fin = plusJours(semaine.value, 6);
	return rdvs.value.filter(
		(r) =>
			(q.value || (r.date >= semaine.value && r.date <= fin)) &&
			(!statut.value || r.statut === statut.value) &&
			(!q.value || sansAccents(`${r.beneficiaire.prenom} ${r.beneficiaire.nom} ${r.demarches.join(' ')}`).includes(q.value)),
	);
});

/** RDV regroupés par semaine (lundi) puis par jour, dans l'ordre chronologique. */
const parSemaine = computed(() => {
	const map = new Map<string, Map<string, RdvItem[]>>();
	for (const r of affiches.value) {
		const lundi = lundiDe(r.date);
		if (!map.has(lundi)) map.set(lundi, new Map());
		const jours = map.get(lundi)!;
		if (!jours.has(r.date)) jours.set(r.date, []);
		jours.get(r.date)!.push(r);
	}
	return [...map].map(([lundi, jours]) => [lundi, [...jours]] as const);
});

/** Va à une semaine trouvée par la recherche (et quitte la recherche). */
function allerA(lundi: string) {
	semaine.value = lundi;
	recherche.value = '';
}

const pdfEnCours = ref(false);
const pdfErreur = ref('');

async function pdf() {
	pdfErreur.value = '';
	pdfEnCours.value = true;
	try {
		await telechargerPdfSemaine(semaine.value);
	} catch (e) {
		if (e instanceof ApiError && e.status === 401) return sessionExpired();
		pdfErreur.value = (e as Error).message;
	} finally {
		pdfEnCours.value = false;
	}
}

const nom = (r: RdvItem) => [r.beneficiaire.prenom, r.beneficiaire.nom].filter(Boolean).join(' ') || 'Bénéficiaire inconnu·e';
const chevron =
	'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40';

onMounted(load);
</script>

<template>
	<p v-if="error" class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>

	<div class="mb-4 space-y-3">
		<div class="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
			<div class="flex min-w-0 flex-1 items-center gap-1">
				<button type="button" :class="chevron" :disabled="!!q" aria-label="Semaine précédente" @click="changerSemaine(-1)">
					<i class="fa-solid fa-chevron-left text-sm" aria-hidden="true"></i>
				</button>
				<h3 class="min-w-0 truncate text-center font-heading text-base font-semibold text-gray-900" aria-live="polite">
					{{ q ? 'Toutes les semaines' : libelleSemaine(semaine) }}
				</h3>
				<button type="button" :class="chevron" :disabled="!!q" aria-label="Semaine suivante" @click="changerSemaine(1)">
					<i class="fa-solid fa-chevron-right text-sm" aria-hidden="true"></i>
				</button>
			</div>
			<div v-if="!q" class="flex shrink-0 items-center gap-2">
				<button
					v-if="semaine !== cetteSemaine"
					type="button"
					class="rounded-full px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/5"
					@click="semaine = cetteSemaine"
				>
					Cette semaine
				</button>
				<button
					type="button"
					class="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:border-primary hover:text-primary disabled:opacity-60"
					:disabled="pdfEnCours"
					:aria-label="`Télécharger le PDF de la ${libelleSemaine(semaine).toLowerCase()}`"
					title="Vue semaine en PDF (tous les RDV de la semaine, hors annulés)"
					@click="pdf"
				>
					<i class="fa-solid" :class="pdfEnCours ? 'fa-spinner fa-spin' : 'fa-file-pdf'" aria-hidden="true"></i>
					{{ pdfEnCours ? 'Génération…' : 'PDF' }}
				</button>
			</div>
		</div>
		<p v-if="pdfErreur" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ pdfErreur }}</p>
		<div class="grid gap-2 sm:grid-cols-[1fr_auto]">
			<input v-model="recherche" type="search" placeholder="Rechercher un nom, une démarche…" :class="inputClass" aria-label="Rechercher dans toutes les semaines" />
			<select v-model="statut" :class="inputClass" aria-label="Statut">
				<option value="">Tous les statuts</option>
				<option v-for="s in statuts" :key="s" :value="s">{{ s }}</option>
			</select>
		</div>
	</div>

	<p v-if="loading" class="flex items-center gap-2 text-sm font-light text-gray-500" role="status">
		<i class="fa-solid fa-spinner fa-spin text-primary" aria-hidden="true"></i>Chargement des rendez-vous…
	</p>
	<p v-else-if="!parSemaine.length" class="text-sm font-light text-gray-500">
		{{ q ? 'Aucun rendez-vous trouvé' : 'Aucun rendez-vous cette semaine' }}{{ statut ? ' pour ce statut' : '' }}.
	</p>
	<div v-else class="space-y-8">
		<div v-for="[lundi, jours] in parSemaine" :key="lundi" class="space-y-5">
			<button
				v-if="q"
				type="button"
				class="flex w-full items-center justify-between gap-3 border-b border-gray-200 pb-2 text-left font-heading text-sm font-semibold text-gray-900 hover:text-primary"
				:aria-label="`Afficher la ${libelleSemaine(lundi).toLowerCase()}`"
				@click="allerA(lundi)"
			>
				{{ libelleSemaine(lundi) }}
				<i class="fa-solid fa-arrow-right text-xs text-gray-400" aria-hidden="true"></i>
			</button>
			<section v-for="[date, liste] in jours" :key="date">
				<h4 class="mb-2 font-heading text-sm font-semibold text-gray-900">{{ libelleDate(date) }}</h4>
				<ul class="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
					<li v-for="r in liste" :key="r.id">
						<button
							type="button"
							class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
							:class="ouvertId === r.id ? 'bg-primary/5' : ''"
							:aria-label="`Modifier le rendez-vous de ${nom(r)}, ${r.heure}`"
							@click="ouvertId = r.id"
						>
							<span class="w-12 shrink-0 font-heading text-sm font-semibold text-primary">{{ r.heure }}</span>
							<span class="min-w-0 flex-1">
								<span class="block truncate text-sm font-medium text-gray-900">{{ nom(r) }}</span>
								<span class="block truncate text-xs text-gray-500">{{ r.demarches.join(', ') || 'Démarche non précisée' }}</span>
							</span>
							<span class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="classeStatut(r.statut)">{{ r.statut }}</span>
							<i class="fa-solid fa-chevron-left text-xs text-gray-300" aria-hidden="true"></i>
						</button>
					</li>
				</ul>
			</section>
		</div>
	</div>

	<RdvEditeur
		v-if="ouvert"
		:key="ouvert.id"
		:rdv="ouvert"
		:demarches="demarches"
		:statuts="statuts"
		:suivi="suivi"
		:creneaux="creneaux"
		@close="ouvertId = null"
		@saved="load"
		@deleted="
			ouvertId = null;
			load();
		"
	/>
</template>
