<script setup lang="ts">
/**
 * Module « Plugins » (groupe `superadmin` seul) : volets activables du site
 * (catalogue `src/plugins/catalogue.ts`). Activer ou désactiver écrit
 * `plugins.<id>` de `reglages.yaml` puis reconstruit le site (suivi par
 * `usePublication`), ou rejoint les modifications en attente. Un plugin dont
 * un fichier requis manque ne peut pas être activé ; une variable
 * d'environnement absente est seulement signalée.
 */
import { computed, inject, onMounted, ref } from 'vue';
import PublishButtons from '../PublishButtons.vue';
import PublishStatus from '../PublishStatus.vue';
import { ApiError, pluginsApi, type PluginItem } from '../client';
import { ADMIN_CONTEXT, rememberOpenModule, takeModuleToReopen } from '../context';
import { isDeferredSubmit } from '../lot';
import { usePublication } from '../usePublication';

const { sessionExpired } = inject(ADMIN_CONTEXT)!;

const plugins = ref<PluginItem[]>([]);
const availability = ref<{ ok: boolean; reason?: string }>({ ok: true });
const loading = ref(true);
const busy = ref<string | null>(null);
const error = ref('');

function fail(e: unknown) {
	takeModuleToReopen();
	if (e instanceof ApiError && e.status === 401) return sessionExpired();
	error.value = (e as Error).message;
}

async function load() {
	try {
		const res = await pluginsApi.list();
		plugins.value = res.plugins;
		availability.value = res.availability;
		receive(res.status);
	} catch (e) {
		fail(e);
	} finally {
		loading.value = false;
	}
}

const { status, following, receive, afterSave, publishLot, savedLabel, dismiss: dismissStatus, reloadIn, cancelReload } = usePublication({
	module: 'plugins',
	onSettled: load,
	onError: fail,
});
const locked = computed(() => !availability.value.ok || following.value);

async function submit(plugin: PluginItem, event: Event) {
	error.value = '';
	busy.value = plugin.id;
	const actif = !plugin.actif;
	try {
		rememberOpenModule('plugins');
		const result = await pluginsApi.update(plugin.id, actif, { deferred: isDeferredSubmit(event) });
		afterSave(`Plugin « ${plugin.label} » ${actif ? 'activé' : 'désactivé'}`, result);
		if (result.deferred) await load();
	} catch (e) {
		fail(e);
	} finally {
		busy.value = null;
	}
}

onMounted(load);
</script>

<template>
	<PublishStatus
		:status="status"
		:following="following"
		:reload-in="reloadIn"
		:saved-label="savedLabel"
		:locked="locked"
		@dismiss="dismissStatus"
		@cancel-reload="cancelReload"
		@publish-lot="publishLot"
	/>
	<p v-if="!availability.ok" class="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{{ availability.reason }}</p>
	<p v-if="error" class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>

	<p class="mb-4 text-sm font-light text-gray-600">
		Volets du site que l'association active ou non. Un plugin inactif n'existe pas sur le site : ni page, ni encart,
		ni lien. Changer l'état reconstruit le site.
	</p>

	<p v-if="loading" class="text-sm font-light text-gray-500">Chargement…</p>
	<ul v-else class="space-y-4">
		<li v-for="p in plugins" :key="p.id" class="rounded-xl border border-gray-200 bg-white p-4">
			<div class="flex items-start gap-3">
				<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
					<i class="fa-solid" :class="p.icon" aria-hidden="true"></i>
				</span>
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<h3 class="font-heading text-base text-gray-900">{{ p.label }}</h3>
						<span
							class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
							:class="p.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'"
						>
							{{ p.actif ? 'Actif' : 'Inactif' }}
						</span>
						<span v-if="p.actif !== p.enLigne" class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
							en attente de publication
						</span>
					</div>
					<p class="mt-1 text-sm font-light text-gray-600">{{ p.description }}</p>
					<p class="mt-1 text-xs text-gray-500">
						Documentation : <code class="rounded bg-gray-100 px-1">{{ p.doc }}</code> (identifiant
						<code class="rounded bg-gray-100 px-1">{{ p.id }}</code>)
					</p>

					<ul v-if="p.manquants.length" class="mt-3 space-y-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
						<li v-for="m in p.manquants" :key="m.fichier">
							<i class="fa-solid fa-circle-xmark mr-1" aria-hidden="true"></i>
							<code>{{ m.fichier }}</code> absent : {{ m.aide }}
						</li>
					</ul>
					<ul v-if="p.avertissements.length" class="mt-3 space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
						<li v-for="a in p.avertissements" :key="a.nom">
							<i class="fa-solid fa-triangle-exclamation mr-1" aria-hidden="true"></i>
							<code>{{ a.nom }}</code> non renseignée : {{ a.aide }}
						</li>
					</ul>

					<form class="mt-4 flex flex-wrap items-center gap-2" @submit.prevent="submit(p, $event)">
						<PublishButtons
							compact
							:label="p.actif ? 'Désactiver et publier' : 'Activer et publier'"
							:busy="busy === p.id"
							:disabled="locked || busy !== null || (!p.actif && p.manquants.length > 0)"
						/>
					</form>
					<p v-if="p.actif" class="mt-2 text-xs text-gray-500">
						Désactiver retire du site tout ce que le plugin y ajoute ; ses réglages et son contenu sont gardés.
					</p>
				</div>
			</div>
		</li>
	</ul>
</template>
