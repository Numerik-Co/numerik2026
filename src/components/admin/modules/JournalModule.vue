<script setup lang="ts">
/**
 * Module « Journal » (groupe `superadmin` seul) : historique des
 * modifications faites depuis l'espace bénévoles, par année, du plus récent
 * au plus ancien (cf. src/lib/journal.ts). Lecture seule.
 */
import { computed, inject, onMounted, ref } from 'vue';
import { ApiError, journalApi, type JournalEntry } from '../client';
import { ADMIN_CONTEXT, inputClass } from '../context';

const { sessionExpired } = inject(ADMIN_CONTEXT)!;

const ACTIONS: Record<string, { label: string; icon: string }> = {
	connexion: { label: 'Connexion', icon: 'fa-right-to-bracket' },
	'mot-de-passe': { label: 'Mot de passe changé', icon: 'fa-key' },
	'actualite.ajout': { label: 'Actualité ajoutée', icon: 'fa-newspaper' },
	'actualite.modification': { label: 'Actualité modifiée', icon: 'fa-pen' },
	'actualite.suppression': { label: 'Actualité supprimée', icon: 'fa-trash' },
	publication: { label: 'Publication', icon: 'fa-rocket' },
	'publication.message-ferme': { label: 'Message de publication fermé', icon: 'fa-xmark' },
	'page.ajout': { label: 'Page ajoutée', icon: 'fa-file-circle-plus' },
	'page.modification': { label: 'Page modifiée', icon: 'fa-file-pen' },
	'page.suppression': { label: 'Page supprimée', icon: 'fa-file-circle-minus' },
	'menu.ajout': { label: 'Menu ajouté', icon: 'fa-bars' },
	'menu.modification': { label: 'Menu modifié', icon: 'fa-bars' },
	'menu.suppression': { label: 'Menu supprimé', icon: 'fa-bars' },
	'compte.creation': { label: 'Compte créé', icon: 'fa-user-plus' },
	'compte.modification': { label: 'Compte modifié', icon: 'fa-user-pen' },
	'compte.reinitialisation': { label: 'Mot de passe réinitialisé', icon: 'fa-unlock' },
	'compte.suppression': { label: 'Compte supprimé', icon: 'fa-user-minus' },
};

const years = ref<string[]>([]);
const year = ref('');
const entries = ref<JournalEntry[]>([]);
const loading = ref(true);
const error = ref('');
const filter = ref('');
const hideLogins = ref(true);

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

const shown = computed(() => {
	const q = filter.value.trim().toLowerCase();
	return entries.value.filter((e) => {
		if (hideLogins.value && e.action === 'connexion') return false;
		if (!q) return true;
		return [e.by?.fullname, e.by?.login, e.label, e.message, ACTIONS[e.action]?.label ?? e.action]
			.some((v) => v?.toLowerCase().includes(q));
	});
});

async function load(y?: string) {
	loading.value = true;
	error.value = '';
	try {
		const res = await journalApi.list(y);
		years.value = res.years;
		year.value = res.year;
		entries.value = res.entries;
	} catch (e) {
		if (e instanceof ApiError && e.status === 401) return sessionExpired();
		error.value = (e as Error).message;
	} finally {
		loading.value = false;
	}
}

onMounted(() => load());
</script>

<template>
	<p class="mb-4 text-sm font-light text-gray-600">
		Toutes les modifications faites depuis l'espace bénévoles, avec leur auteur·rice et leur résultat. Visible par le
		super admin uniquement.
	</p>

	<div class="mb-4 flex flex-wrap items-end gap-3">
		<div v-if="years.length > 1">
			<label for="journal-year" class="block text-sm font-semibold text-gray-700">Année</label>
			<select id="journal-year" v-model="year" :class="[inputClass, 'w-auto']" @change="load(year)">
				<option v-for="y in years" :key="y" :value="y">{{ y }}</option>
			</select>
		</div>
		<div class="min-w-48 flex-1">
			<label for="journal-filter" class="block text-sm font-semibold text-gray-700">Rechercher</label>
			<input id="journal-filter" v-model="filter" type="search" placeholder="Nom, actualité, compte…" :class="inputClass" />
		</div>
		<label class="flex items-center gap-2 pb-2 text-sm text-gray-700">
			<input v-model="hideLogins" type="checkbox" class="rounded border-gray-300" />
			Masquer les connexions
		</label>
	</div>

	<p v-if="error" class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>
	<p v-if="loading" class="text-sm font-light text-gray-500">Chargement…</p>
	<p v-else-if="shown.length === 0" class="text-sm font-light text-gray-500">Aucun événement.</p>
	<ol v-else class="divide-y divide-gray-100 rounded-xl border border-gray-100">
		<li v-for="(e, i) in shown" :key="`${e.at}-${i}`" class="flex gap-3 px-4 py-3 text-sm">
			<i
				:class="[
					'fa-solid mt-0.5 w-4 shrink-0 text-center',
					ACTIONS[e.action]?.icon ?? 'fa-circle-info',
					e.outcome === 'echec' ? 'text-red-600' : e.outcome === 'ok' ? 'text-green-600' : 'text-gray-400',
				]"
				aria-hidden="true"
			></i>
			<div class="min-w-0 flex-1">
				<p class="text-gray-900">
					<span class="font-semibold">{{ ACTIONS[e.action]?.label ?? e.action }}</span>
					<span
						v-if="e.outcome"
						class="ml-1.5 rounded-full px-1.5 py-0.5 text-xs"
						:class="e.outcome === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
					>{{ e.outcome === 'ok' ? 'réussie' : 'échec' }}</span>
					<template v-if="e.label">
						—
						<a v-if="e.href" :href="e.href" class="underline">{{ e.label }}</a>
						<span v-else>{{ e.label }}</span>
					</template>
				</p>
				<p v-if="e.message" class="mt-0.5 break-words text-xs text-gray-600">{{ e.message }}</p>
				<p class="mt-0.5 text-xs font-light text-gray-500">
					{{ dateFormat.format(new Date(e.at)) }}
					<template v-if="e.by"> · {{ e.by.fullname }} ({{ e.by.login }})</template>
					<template v-else> · système</template>
				</p>
			</div>
		</li>
	</ol>
</template>
