<script setup lang="ts">
/**
 * Module « Rendez-vous » du plugin RDV (bureau et animateur·rice·s) : liste
 * des RDV, à venir ou passés, par jour, avec filtre de statut et recherche.
 * Un clic ouvre l'éditeur (`RdvEditeur.vue`) dans un second panneau, à
 * gauche de celui-ci. Les modifications vont directement dans Grist (pas de
 * reconstruction du site).
 */
import { computed, inject, onMounted, ref } from 'vue';
import { ApiError } from '../../../components/admin/client';
import { ADMIN_CONTEXT, inputClass } from '../../../components/admin/context';
import type { Creneau, Demarche } from '../lib/types';
import RdvEditeur from './RdvEditeur.vue';
import { aujourdhui, classeStatut, libelleDate, rdvAdminApi, type ChampSuivi, type RdvItem } from './client';

const { sessionExpired } = inject(ADMIN_CONTEXT)!;

const rdvs = ref<RdvItem[]>([]);
const demarches = ref<Demarche[]>([]);
const statuts = ref<string[]>([]);
const suivi = ref<ChampSuivi[]>([]);
const creneaux = ref<Creneau[]>([]);
const loading = ref(true);
const error = ref('');

const periode = ref<'avenir' | 'passes'>('avenir');
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

const affiches = computed(() => {
	const jour = aujourdhui();
	const q = sansAccents(recherche.value.trim());
	const liste = rdvs.value.filter(
		(r) =>
			(periode.value === 'avenir' ? r.date >= jour : r.date < jour) &&
			(!statut.value || r.statut === statut.value) &&
			(!q || sansAccents(`${r.beneficiaire.prenom} ${r.beneficiaire.nom} ${r.demarches.join(' ')}`).includes(q)),
	);
	// Passés : du plus récent au plus ancien.
	return periode.value === 'passes' ? liste.reverse() : liste;
});

/** RDV regroupés par jour, dans l'ordre de la liste. */
const parJour = computed(() => {
	const map = new Map<string, RdvItem[]>();
	for (const r of affiches.value) {
		if (!map.has(r.date)) map.set(r.date, []);
		map.get(r.date)!.push(r);
	}
	return [...map];
});

const nom = (r: RdvItem) => [r.beneficiaire.prenom, r.beneficiaire.nom].filter(Boolean).join(' ') || 'Bénéficiaire inconnu·e';

onMounted(load);
</script>

<template>
	<p v-if="error" class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>

	<div class="mb-4 space-y-3">
		<div class="inline-flex rounded-full bg-gray-100 p-1 text-sm" role="group" aria-label="Période">
			<button
				v-for="p in [
					{ id: 'avenir', label: 'À venir' },
					{ id: 'passes', label: 'Passés' },
				] as const"
				:key="p.id"
				type="button"
				class="rounded-full px-4 py-1.5 font-medium"
				:class="periode === p.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
				:aria-pressed="periode === p.id"
				@click="periode = p.id"
			>
				{{ p.label }}
			</button>
		</div>
		<div class="grid gap-2 sm:grid-cols-[1fr_auto]">
			<input v-model="recherche" type="search" placeholder="Rechercher un nom, une démarche…" :class="inputClass" aria-label="Rechercher" />
			<select v-model="statut" :class="inputClass" aria-label="Statut">
				<option value="">Tous les statuts</option>
				<option v-for="s in statuts" :key="s" :value="s">{{ s }}</option>
			</select>
		</div>
	</div>

	<p v-if="loading" class="flex items-center gap-2 text-sm font-light text-gray-500" role="status">
		<i class="fa-solid fa-spinner fa-spin text-primary" aria-hidden="true"></i>Chargement des rendez-vous…
	</p>
	<p v-else-if="!parJour.length" class="text-sm font-light text-gray-500">
		{{ periode === 'avenir' ? 'Aucun rendez-vous à venir' : 'Aucun rendez-vous passé' }}{{ statut || recherche ? ' pour ces critères' : '' }}.
	</p>
	<div v-else class="space-y-5">
		<section v-for="[date, liste] in parJour" :key="date">
			<h3 class="mb-2 font-heading text-sm font-semibold text-gray-900">{{ libelleDate(date) }}</h3>
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
	/>
</template>
