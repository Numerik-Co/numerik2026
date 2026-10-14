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
import FormTabs from '../FormTabs.vue';
import PublishStatus from '../PublishStatus.vue';
import { ApiError, associationApi } from '../client';
import { ADMIN_CONTEXT, takeModuleToReopen } from '../context';
import type { FormTab } from '../form-tabs';
import { usePublication } from '../usePublication';
import BrandForm from './association/BrandForm.vue';
import GeneralForm from './association/GeneralForm.vue';

const { sessionExpired } = inject(ADMIN_CONTEXT)!;

const TABS = [
	{ id: 'general', label: 'Généralités', icon: 'fa-landmark' },
	{ id: 'charte', label: 'Charte graphique', icon: 'fa-palette' },
] as const satisfies readonly FormTab[];
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

const { status, following, receive, started, dismiss: dismissStatus, reloadIn, cancelReload } = usePublication({
	module: 'association',
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

onMounted(load);
</script>

<template>
	<PublishStatus :status="status" :following="following" :reload-in="reloadIn" @dismiss="dismissStatus" @cancel-reload="cancelReload" />
	<p v-if="!availability.ok" class="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{{ availability.reason }}</p>
	<p v-if="error" class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>

	<FormTabs v-model="tab" :tabs="TABS" prefix="asso" :marks="dirty" />

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
