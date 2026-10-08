<script setup lang="ts">
/**
 * Module « Pages » (groupes `redacteur` / `admin`) : pages de contenu et
 * menus déroulants du site, tels qu'ils sont dans les sources
 * (`src/content/pages/`). Création (page classique ou enrichie de blocs),
 * modification, déplacement, suppression ; menus : création, libellé et
 * position, suppression d'un menu vide. Chaque modification reconstruit le
 * site (suivi par `usePublication`), comme le module « Actualités ».
 */
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import PublishStatus from '../PublishStatus.vue';
import { ApiError, menusApi, pagesApi, type MenuView, type PageSourceView } from '../client';
import { ADMIN_CONTEXT, inputClass, rememberOpenModule, takeModuleToReopen } from '../context';
import { usePublication } from '../usePublication';
import { site } from '../../../config/site';
import PageForm from './pages/PageForm.vue';
import PageRow from './pages/PageRow.vue';

const { sessionExpired, onCloseRequest } = inject(ADMIN_CONTEXT)!;

type View = { name: 'list' } | { name: 'page'; source: PageSourceView | null } | { name: 'menu'; menu: MenuView | null };

const view = ref<View>({ name: 'list' });
const menus = ref<MenuView[]>([]);
const pages = ref<PageSourceView[]>([]);
const availability = ref<{ ok: boolean; reason?: string }>({ ok: true });
const loading = ref(true);
const busy = ref(false);
const error = ref('');
/** Page ou menu dont la suppression attend confirmation (`page:<chemin>` / `menu:<dossier>`). */
const confirming = ref<string | null>(null);

function fail(e: unknown) {
	takeModuleToReopen(); // l'enregistrement a échoué : pas de réouverture au prochain chargement
	if (e instanceof ApiError && e.status === 401) return sessionExpired();
	error.value = (e as Error).message;
}

async function load() {
	loading.value = true;
	try {
		const res = await pagesApi.list();
		menus.value = res.menus;
		pages.value = res.pages;
		availability.value = res.availability;
		receive(res.status);
	} catch (e) {
		fail(e);
	} finally {
		loading.value = false;
	}
}

const { status, following, receive, started, dismiss: dismissStatus } = usePublication({ onSettled: () => load(), onError: fail });
const locked = computed(() => !availability.value.ok || following.value || busy.value);

const byPath = computed(() => new Map(pages.value.map((p) => [p.path, p])));
const rootPages = computed(() => pages.value.filter((p) => p.placement.kind === 'racine'));
const reservedPages = computed(() => pages.value.filter((p) => p.placement.kind === 'reservee'));
const menuPages = (menu: MenuView) =>
	menu.pages
		.map((path) => byPath.value.get(path))
		.filter((p): p is PageSourceView => Boolean(p))
		.sort((a, b) => a.menu.order - b.menu.order);

function go(next: View) {
	error.value = '';
	confirming.value = null;
	view.value = next;
}

async function openPage(page: PageSourceView | null) {
	if (!page) return go({ name: 'page', source: null });
	busy.value = true;
	try {
		go({ name: 'page', source: await pagesApi.get(page.path) });
	} catch (e) {
		fail(e);
	} finally {
		busy.value = false;
	}
}

function onPublished(label: string) {
	go({ name: 'list' });
	started(label);
}

async function removePage(page: PageSourceView) {
	error.value = '';
	busy.value = true;
	try {
		rememberOpenModule('pages-site');
		await pagesApi.remove(page.path);
		confirming.value = null;
		started(`Suppression : ${page.title}`);
	} catch (e) {
		fail(e);
	} finally {
		busy.value = false;
	}
}

// --- Menus ---

const menuForm = reactive({ label: '', folder: '', order: 50 });
/** Repères de position : pages applicatives de la barre (`site.builtinNav`). */
const navLandmarks = site.builtinNav.map((item) => `${item.label} ${item.order}`).join(', ');

function openMenu(menu: MenuView | null) {
	Object.assign(menuForm, { label: menu?.label ?? '', folder: menu?.folder ?? '', order: menu?.order ?? 50 });
	go({ name: 'menu', menu });
}

async function saveMenu() {
	if (view.value.name !== 'menu') return;
	const current = view.value.menu;
	error.value = '';
	busy.value = true;
	try {
		rememberOpenModule('pages-site');
		if (current) await menusApi.update(current.folder, { label: menuForm.label, order: Number(menuForm.order) });
		else await menusApi.create({ label: menuForm.label, folder: menuForm.folder, order: Number(menuForm.order) });
		onPublished(`Menu : ${menuForm.label}`);
	} catch (e) {
		fail(e);
	} finally {
		busy.value = false;
	}
}

async function removeMenu(menu: MenuView) {
	error.value = '';
	busy.value = true;
	try {
		rememberOpenModule('pages-site');
		await menusApi.remove(menu.folder);
		confirming.value = null;
		started(`Suppression du menu : ${menu.label}`);
	} catch (e) {
		fail(e);
	} finally {
		busy.value = false;
	}
}

// ✕ / Échap depuis un formulaire : retour à la liste plutôt que fermeture du panneau.
const stopCloseRequest = onCloseRequest(() => {
	if (view.value.name === 'list') return false;
	go({ name: 'list' });
	return true;
});
onBeforeUnmount(stopCloseRequest);

onMounted(load);
</script>

<template>
	<PublishStatus :status="status" :following="following" @dismiss="dismissStatus" />
	<p v-if="!availability.ok" class="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{{ availability.reason }}</p>
	<p v-if="error" class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>

	<!-- Liste -->
	<template v-if="view.name === 'list'">
		<div class="mb-5 flex flex-wrap gap-3">
			<button
				type="button"
				class="rounded-full bg-primary px-5 py-2.5 font-heading text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
				:disabled="locked"
				@click="openPage(null)"
			>
				<i class="fa-solid fa-plus mr-1.5" aria-hidden="true"></i>Nouvelle page
			</button>
			<button
				type="button"
				class="rounded-full border-2 border-primary px-5 py-2 font-heading text-sm font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-50"
				:disabled="locked"
				@click="openMenu(null)"
			>
				<i class="fa-solid fa-bars mr-1.5" aria-hidden="true"></i>Nouveau menu
			</button>
		</div>

		<p v-if="loading" class="text-sm font-light text-gray-500">Chargement…</p>
		<div v-else class="space-y-6">
			<!-- Menus déroulants -->
			<section v-for="menu in menus" :key="menu.folder" class="rounded-xl border border-gray-200">
				<header class="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
					<i class="fa-solid fa-bars text-gray-400" aria-hidden="true"></i>
					<span class="font-heading font-semibold text-gray-900">{{ menu.label }}</span>
					<span class="text-xs text-gray-500">menu · /{{ menu.folder }}/… · position {{ menu.order }}</span>
					<span class="ml-auto flex gap-3 text-sm">
						<button type="button" class="text-primary hover:underline disabled:opacity-50" :disabled="locked" @click="openMenu(menu)">Modifier</button>
						<template v-if="!menu.pages.length">
							<button
								v-if="confirming !== `menu:${menu.folder}`"
								type="button"
								class="text-red-600 hover:underline disabled:opacity-50"
								:disabled="locked"
								@click="confirming = `menu:${menu.folder}`"
							>
								Supprimer
							</button>
							<span v-else class="flex gap-2">
								<button type="button" class="font-semibold text-red-600 hover:underline" :disabled="locked" @click="removeMenu(menu)">
									Confirmer
								</button>
								<button type="button" class="text-gray-600 hover:underline" @click="confirming = null">Annuler</button>
							</span>
						</template>
					</span>
				</header>
				<ul class="divide-y divide-gray-100">
					<PageRow
						v-for="p in menuPages(menu)"
						:key="p.path"
						:page="p"
						:locked="locked"
						:confirming="confirming === `page:${p.path}`"
						@edit="openPage(p)"
						@ask-delete="confirming = `page:${p.path}`"
						@confirm-delete="removePage(p)"
						@cancel-delete="confirming = null"
					>
						<span v-if="!p.menu.show" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">masquée du menu</span>
					</PageRow>
					<li v-if="!menu.pages.length" class="px-4 py-2.5 text-sm font-light text-gray-500">
						Aucune page : le menu n'apparaît pas encore sur le site.
					</li>
				</ul>
			</section>

			<!-- Pages hors menu déroulant, puis réservées -->
			<section
				v-for="group in [
					{ key: 'racine', title: 'Pages hors menu déroulant', icon: 'fa-file-lines', list: rootPages },
					{ key: 'reservee', title: 'Pages réservées (espace bénévoles)', icon: 'fa-lock', list: reservedPages },
				]"
				:key="group.key"
				class="rounded-xl border border-gray-200"
			>
				<header class="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
					<i :class="['fa-solid', group.icon, 'text-gray-400']" aria-hidden="true"></i>
					<span class="font-heading font-semibold text-gray-900">{{ group.title }}</span>
				</header>
				<ul class="divide-y divide-gray-100">
					<PageRow
						v-for="p in group.list"
						:key="p.path"
						:page="p"
						:locked="locked"
						:confirming="confirming === `page:${p.path}`"
						@edit="openPage(p)"
						@ask-delete="confirming = `page:${p.path}`"
						@confirm-delete="removePage(p)"
						@cancel-delete="confirming = null"
					>
						<span v-if="group.key === 'racine' && p.menu.show" class="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
							dans la barre de navigation
						</span>
						<span v-if="group.key === 'reservee'" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
							{{ p.access.length ? p.access.join(', ') : 'toute personne connectée' }}
						</span>
					</PageRow>
					<li v-if="!group.list.length" class="px-4 py-2.5 text-sm font-light text-gray-500">Aucune page.</li>
				</ul>
			</section>
		</div>
	</template>

	<!-- Page : création / modification -->
	<PageForm
		v-else-if="view.name === 'page'"
		:menus="menus"
		:source="view.source"
		:disabled="locked"
		@published="onPublished"
		@cancel="go({ name: 'list' })"
	/>

	<!-- Menu : création / modification -->
	<form v-else class="space-y-4" @submit.prevent="saveMenu">
		<p class="text-sm font-light text-gray-600">
			Un menu regroupe des pages dans un menu déroulant de la barre de navigation. Son libellé n'est pas cliquable et
			il n'a pas de contenu propre : seules ses pages ont un lien.
		</p>
		<div>
			<label for="menu-label" class="block text-sm font-semibold text-gray-700">Libellé</label>
			<input id="menu-label" v-model="menuForm.label" type="text" required :class="inputClass" />
		</div>
		<div v-if="!view.menu">
			<label for="menu-folder" class="block text-sm font-semibold text-gray-700">
				Adresse <span class="font-light text-gray-500">(facultative, déduite du libellé)</span>
			</label>
			<input id="menu-folder" v-model="menuForm.folder" type="text" pattern="[a-z0-9]+(-[a-z0-9]+)*" :class="inputClass" />
			<p class="mt-1 text-xs font-light text-gray-500">Début de l'adresse des pages du menu (/adresse/page). Ne change plus ensuite.</p>
		</div>
		<div>
			<label for="menu-order" class="block text-sm font-semibold text-gray-700">Position dans la barre</label>
			<input id="menu-order" v-model.number="menuForm.order" type="number" step="1" :class="inputClass" />
			<p class="mt-1 text-xs font-light text-gray-500">
				Petit nombre = plus à gauche. Repères : {{ navLandmarks }}.
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
			<button
				type="submit"
				:disabled="locked"
				class="rounded-full bg-primary px-6 py-3 font-heading text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
			>
				{{ view.menu ? 'Enregistrer et publier' : 'Créer le menu' }}
			</button>
			<button type="button" class="text-sm text-gray-600 hover:underline" @click="go({ name: 'list' })">Annuler</button>
		</div>
	</form>
</template>
