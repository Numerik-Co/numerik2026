<script setup lang="ts">
/**
 * Module « Association » (bureau : groupe `admin`), en onglets :
 *  - « Généralités » (`association/GeneralForm.vue`) : nom, coordonnées,
 *    réseaux sociaux, mentions légales (`association.yaml`) ;
 *  - « Charte graphique » (`association/BrandForm.vue`) : couleurs
 *    (`reglages.yaml`), logo et icône d'onglet (`images/`).
 * Chaque onglet s'enregistre à part et reconstruit le site (suivi par
 * `usePublication`, encadré commun) ; les deux restent montés, une saisie
 * en cours n'est pas perdue en changeant d'onglet.
 */
import { computed, inject, onMounted, ref } from 'vue';
import type { Association } from '../../../lib/association';
import PublishStatus from '../PublishStatus.vue';
import { ApiError, associationApi } from '../client';
import { ADMIN_CONTEXT, takeModuleToReopen } from '../context';
import { usePublication } from '../usePublication';
import BrandForm from './association/BrandForm.vue';
import GeneralForm from './association/GeneralForm.vue';

const { sessionExpired } = inject(ADMIN_CONTEXT)!;

const TABS = [
	{ id: 'general', label: 'Généralités', icon: 'fa-landmark' },
	{ id: 'charte', label: 'Charte graphique', icon: 'fa-palette' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const tab = ref<TabId>('general');
const association = ref<Association | null>(null);
const availability = ref<{ ok: boolean; reason?: string }>({ ok: true });
const loading = ref(true);
const error = ref('');
/** Onglets avec une saisie pas encore publiée (pastille). */
const dirty = ref<Record<TabId, boolean>>({ general: false, charte: false });
/** Remonte un onglet (données relues) après sa publication. */
const versions = ref<Record<TabId, number>>({ general: 0, charte: 0 });
let lastPublished: TabId | null = null;

function fail(e: unknown) {
	takeModuleToReopen();
	if (e instanceof ApiError && e.status === 401) return sessionExpired();
	error.value = (e as Error).message;
}

async function load() {
	try {
		const res = await associationApi.get();
		association.value = res.association;
		availability.value = res.availability;
		receive(res.status);
	} catch (e) {
		fail(e);
	} finally {
		loading.value = false;
	}
}

const { status, following, receive, started, dismiss: dismissStatus } = usePublication({
	onSettled: async () => {
		await load();
		if (lastPublished) versions.value[lastPublished]++;
		lastPublished = null;
	},
	onError: fail,
});
const locked = computed(() => !availability.value.ok || following.value);

function onPublished(from: TabId, label: string) {
	error.value = '';
	lastPublished = from;
	started(label);
}

/** Flèches gauche/droite entre onglets (motif ARIA « tabs »). */
function onTabKey(event: KeyboardEvent) {
	if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
	const i = TABS.findIndex((t) => t.id === tab.value);
	const next = TABS[(i + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
	tab.value = next.id;
	(document.getElementById(`asso-tab-${next.id}`) as HTMLElement | null)?.focus();
}

onMounted(load);
</script>

<template>
	<PublishStatus :status="status" :following="following" @dismiss="dismissStatus" />
	<p v-if="!availability.ok" class="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{{ availability.reason }}</p>
	<p v-if="error" class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>

	<div role="tablist" aria-label="Rubriques" class="mb-5 flex gap-1 border-b border-gray-200" @keydown="onTabKey">
		<button
			v-for="t in TABS"
			:id="`asso-tab-${t.id}`"
			:key="t.id"
			type="button"
			role="tab"
			:aria-selected="tab === t.id"
			:aria-controls="`asso-panel-${t.id}`"
			:tabindex="tab === t.id ? 0 : -1"
			:class="[
				'-mb-px flex items-center gap-2 border-b-2 px-3 py-2 font-heading text-sm font-semibold transition-colors',
				tab === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800',
			]"
			@click="tab = t.id"
		>
			<i :class="['fa-solid', t.icon]" aria-hidden="true"></i>
			{{ t.label }}
			<span v-if="dirty[t.id]" class="h-2 w-2 rounded-full bg-amber-400" title="Modifications pas encore publiées"></span>
		</button>
	</div>

	<p v-if="loading" class="text-sm font-light text-gray-500">Chargement…</p>
	<template v-else>
		<div v-show="tab === 'general'" id="asso-panel-general" role="tabpanel" aria-labelledby="asso-tab-general">
			<GeneralForm
				v-if="association"
				:key="versions.general"
				:source="association"
				:locked="locked"
				@published="(label) => onPublished('general', label)"
				@dirty="(value) => (dirty.general = value)"
			/>
		</div>
		<div v-show="tab === 'charte'" id="asso-panel-charte" role="tabpanel" aria-labelledby="asso-tab-charte">
			<BrandForm
				:key="versions.charte"
				:locked="locked"
				@published="(label) => onPublished('charte', label)"
				@dirty="(value) => (dirty.charte = value)"
			/>
		</div>
	</template>
</template>
