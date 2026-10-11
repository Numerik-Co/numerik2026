<script setup lang="ts">
/**
 * Module « Activités » (groupes `redacteur` / `admin`) : fiches d'activité
 * telles qu'elles sont dans les sources (`src/content/activites/`), rangées
 * par catégorie (`src/content/activites/_categories.yaml`, cf.
 * `src/lib/categories.ts`). Fiches et catégories : création, modification,
 * suppression (catégorie vide seulement) ; ordre des catégories et des fiches
 * dans chaque catégorie par flèches ↑/↓, enregistré en une seule publication. Même présentation que le module « Pages » ; chaque
 * modification reconstruit le site (suivi par `usePublication`).
 */
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue';
import ConfirmIconButton from '../ConfirmIconButton.vue';
import PublishStatus from '../PublishStatus.vue';
import { activitiesApi, activityCategoriesApi, ApiError, type ActivityCategory, type ActivityItem, type ActivitySourceView } from '../client';
import { ADMIN_CONTEXT, iconButtonClass, rememberOpenModule, takeModuleToReopen } from '../context';
import { usePublication } from '../usePublication';
import ActivityForm from './activites/ActivityForm.vue';
import CategoryForm from './activites/CategoryForm.vue';
import OrderArrows from './pages/OrderArrows.vue';

const { sessionExpired, onCloseRequest } = inject(ADMIN_CONTEXT)!;

type View =
	| { name: 'list' }
	| { name: 'form'; source: ActivitySourceView | null; category: string }
	| { name: 'category'; source: ActivityCategory | null };

const view = ref<View>({ name: 'list' });
const activities = ref<ActivityItem[]>([]);
const categories = ref<ActivityCategory[]>([]);
const availability = ref<{ ok: boolean; reason?: string }>({ ok: true });
const loading = ref(true);
const busy = ref(false);
const error = ref('');
/** Élément dont la suppression attend confirmation (`<slug>` d'une fiche, `cat:<slug>` d'une catégorie). */
const confirming = ref<string | null>(null);

function fail(e: unknown) {
	takeModuleToReopen(); // l'enregistrement a échoué : pas de réouverture au prochain chargement
	if (e instanceof ApiError && e.status === 401) return sessionExpired();
	error.value = (e as Error).message;
}

async function load() {
	loading.value = true;
	try {
		const res = await activitiesApi.list();
		activities.value = res.activities;
		categories.value = res.categories;
		cancelOrder();
		availability.value = res.availability;
		receive(res.status);
	} catch (e) {
		fail(e);
	} finally {
		loading.value = false;
	}
}

const { status, following, receive, started, dismiss: dismissStatus } = usePublication({ onSettled: () => load(), onError: fail });
/** Publication impossible ou en cours. */
const publishLocked = computed(() => !availability.value.ok || following.value || busy.value);

/**
 * Ordre changé par les flèches ↑/↓, pas encore enregistré : slugs par
 * catégorie. Tant qu'il est en attente, les autres actions sont bloquées.
 */
const orderDraft = ref<Record<string, string[]>>({});
/** Nouvel ordre des catégories (slugs), pas encore enregistré. */
const categoryDraft = ref<string[] | null>(null);
const orderPending = computed(() => Object.keys(orderDraft.value).length > 0 || categoryDraft.value !== null);
function cancelOrder() {
	orderDraft.value = {};
	categoryDraft.value = null;
}

/** Catégories dans l'ordre affiché (brouillon d'ordre compris). */
const shownCategories = computed(() => {
	const draft = categoryDraft.value;
	return draft ? [...categories.value].sort((a, b) => draft.indexOf(a.slug) - draft.indexOf(b.slug)) : categories.value;
});

function moveCategory(index: number, delta: -1 | 1) {
	const next = shownCategories.value.map((c) => c.slug);
	[next[index], next[index + delta]] = [next[index + delta], next[index]];
	categoryDraft.value = next;
}
const locked = computed(() => publishLocked.value || orderPending.value);

/** Fiches d'une catégorie, dans l'ordre affiché (brouillon d'ordre compris). */
function inCategory(slug: string): ActivityItem[] {
	const list = activities.value.filter((a) => a.category === slug);
	const draft = orderDraft.value[slug];
	return draft ? [...list].sort((a, b) => draft.indexOf(a.slug) - draft.indexOf(b.slug)) : list;
}

/** Fiches dont la catégorie n'existe plus (`categories.ts` modifié) : le build échouerait, à corriger. */
const orphans = computed(() => activities.value.filter((a) => !categories.value.some((c) => c.slug === a.category)));

function move(category: string, index: number, delta: -1 | 1) {
	const next = inCategory(category).map((a) => a.slug);
	[next[index], next[index + delta]] = [next[index + delta], next[index]];
	orderDraft.value = { ...orderDraft.value, [category]: next };
}

async function saveOrder() {
	error.value = '';
	busy.value = true;
	try {
		rememberOpenModule('activites');
		await activitiesApi.saveOrder(orderDraft.value, categoryDraft.value);
		started(categoryDraft.value ? 'Nouvel ordre des catégories et des activités' : 'Nouvel ordre des activités');
		cancelOrder();
	} catch (e) {
		fail(e);
	} finally {
		busy.value = false;
	}
}

function go(next: View) {
	error.value = '';
	confirming.value = null;
	view.value = next;
}

async function openForm(item: ActivityItem | null, category = '') {
	if (!item) return go({ name: 'form', source: null, category });
	busy.value = true;
	try {
		go({ name: 'form', source: await activitiesApi.get(item.slug), category: item.category });
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

async function remove(item: ActivityItem) {
	error.value = '';
	busy.value = true;
	try {
		rememberOpenModule('activites');
		await activitiesApi.remove(item.slug);
		confirming.value = null;
		started(`Suppression : ${item.title}`);
	} catch (e) {
		fail(e);
	} finally {
		busy.value = false;
	}
}

async function removeCategory(category: ActivityCategory) {
	error.value = '';
	busy.value = true;
	try {
		rememberOpenModule('activites');
		await activityCategoriesApi.remove(category.slug);
		confirming.value = null;
		started(`Suppression de la catégorie : ${category.label}`);
	} catch (e) {
		fail(e);
	} finally {
		busy.value = false;
	}
}

// ✕ / Échap depuis le formulaire : retour à la liste plutôt que fermeture du panneau.
const stopCloseRequest = onCloseRequest(() => {
	if (view.value.name === 'list') return false;
	go({ name: 'list' });
	return true;
});
onBeforeUnmount(stopCloseRequest);

onMounted(load);

const badge = 'rounded-full px-2 py-0.5 text-xs';
const greyBadge = `${badge} bg-gray-100 ring-1 ring-inset ring-gray-200 text-gray-600`;
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
				@click="openForm(null)"
			>
				<i class="fa-solid fa-plus mr-1.5" aria-hidden="true"></i>Nouvelle activité
			</button>
			<button
				type="button"
				class="rounded-full border-2 border-primary px-5 py-2 font-heading text-sm font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-50"
				:disabled="locked"
				@click="go({ name: 'category', source: null })"
			>
				<i class="fa-solid fa-folder-plus mr-1.5" aria-hidden="true"></i>Nouvelle catégorie
			</button>
		</div>

		<p v-if="loading" class="text-sm font-light text-gray-500">Chargement…</p>
		<div v-else class="space-y-6">
			<!-- Ordre changé par les flèches : enregistré en une seule publication -->
			<div
				v-if="orderPending"
				class="sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm ring-1 ring-amber-200"
				role="status"
			>
				<i class="fa-solid fa-arrows-up-down" aria-hidden="true"></i>
				<span class="min-w-0 flex-1">Nouvel ordre {{ categoryDraft ? 'des catégories et des activités' : 'des activités' }}, pas encore publié.</span>
				<button
					type="button"
					class="rounded-full bg-primary px-4 py-1.5 font-heading text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
					:disabled="publishLocked"
					@click="saveOrder"
				>
					Enregistrer et publier
				</button>
				<button type="button" class="text-xs font-medium text-gray-700 hover:underline" @click="cancelOrder">Annuler</button>
			</div>

			<p v-if="orphans.length" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
				Catégorie inconnue pour : {{ orphans.map((a) => a.title || a.slug).join(', ') }}. Ouvrez la fiche et choisissez une
				catégorie, sinon les prochaines publications échoueront.
			</p>

			<!-- Une section par catégorie, dans l'ordre du site -->
			<section v-for="(cat, ci) in shownCategories" :key="cat.slug" class="overflow-hidden rounded-xl border border-gray-200">
				<header class="flex flex-wrap items-center gap-2 rounded-t-xl border-b border-gray-100 bg-gray-50 px-4 py-2.5">
					<i :class="['fa-solid', cat.icon, 'text-gray-400']" aria-hidden="true"></i>
					<a :href="`/activites/${cat.slug}`" class="font-heading font-semibold text-gray-900 hover:underline">{{ cat.label }}</a>
					<span class="text-xs text-gray-500">dans l'ordre d'affichage</span>
					<span class="ml-auto flex items-center gap-1">
						<OrderArrows
							:label="cat.label"
							:first="ci === 0"
							:last="ci === shownCategories.length - 1"
							:disabled="publishLocked"
							@up="moveCategory(ci, -1)"
							@down="moveCategory(ci, 1)"
						/>
						<button
							type="button"
							:class="[iconButtonClass, 'text-primary']"
							:disabled="locked"
							:aria-label="`Modifier la catégorie « ${cat.label} »`"
							title="Modifier la catégorie"
							@click="go({ name: 'category', source: cat })"
						>
							<i class="fa-solid fa-pen" aria-hidden="true"></i>
						</button>
						<ConfirmIconButton
							v-if="!inCategory(cat.slug).length && categories.length > 1"
							label="Supprimer"
							title="Supprimer la catégorie (vide)"
							:confirming="confirming === `cat:${cat.slug}`"
							:disabled="locked"
							@ask="confirming = `cat:${cat.slug}`"
							@confirm="removeCategory(cat)"
							@cancel="confirming = null"
						/>
						<span v-else class="w-7" aria-hidden="true"></span>
						<button
							type="button"
							:class="[iconButtonClass, 'text-primary']"
							:disabled="locked"
							:aria-label="`Nouvelle activité dans « ${cat.label} »`"
							title="Nouvelle activité dans cette catégorie"
							@click="openForm(null, cat.slug)"
						>
							<i class="fa-solid fa-plus" aria-hidden="true"></i>
						</button>
					</span>
				</header>
				<ul class="divide-y divide-gray-100">
					<li
						v-for="(a, i) in inCategory(cat.slug)"
						:key="a.slug"
						class="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-gray-100"
					>
						<img v-if="a.thumbnail" :src="a.thumbnail" alt="" class="h-8 w-12 shrink-0 rounded object-cover" />
						<span v-else class="flex h-8 w-12 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-300" aria-hidden="true">
							<i class="fa-solid fa-image text-xs"></i>
						</span>
						<span :class="['min-w-0', { 'opacity-60': !a.isPublish }]">
							<a v-if="a.isPublish" :href="a.href" class="font-medium text-gray-900 hover:underline">{{ a.title || a.slug }}</a>
							<span v-else class="font-medium text-gray-900">{{ a.title || a.slug }}</span>
						</span>
						<span v-if="!a.isPublish" :class="[badge, 'bg-amber-50 text-amber-800']">brouillon</span>
						<span v-if="a.level" :class="greyBadge">{{ a.level }}</span>
						<span v-if="!a.inscription" :class="greyBadge" title="Bouton « S'inscrire » masqué">sans inscription</span>
						<span class="ml-auto flex items-center gap-1">
							<OrderArrows
								:label="a.title"
								:first="i === 0"
								:last="i === inCategory(cat.slug).length - 1"
								:disabled="publishLocked"
								@up="move(cat.slug, i, -1)"
								@down="move(cat.slug, i, 1)"
							/>
							<button
								type="button"
								:class="[iconButtonClass, 'text-primary']"
								:disabled="locked"
								aria-label="Modifier"
								title="Modifier"
								@click="openForm(a)"
							>
								<i class="fa-solid fa-pen" aria-hidden="true"></i>
							</button>
							<ConfirmIconButton
								label="Supprimer"
								title="Supprimer l'activité"
								:confirming="confirming === a.slug"
								:disabled="locked"
								@ask="confirming = a.slug"
								@confirm="remove(a)"
								@cancel="confirming = null"
							/>
						</span>
					</li>
					<li v-if="!inCategory(cat.slug).length" class="px-4 py-2.5 text-sm font-light text-gray-500">
						Aucune activité : la page de la catégorie affiche « bientôt ».
					</li>
				</ul>
			</section>
		</div>
	</template>

	<!-- Catégorie : création / modification -->
	<CategoryForm
		v-else-if="view.name === 'category'"
		:source="view.source"
		:disabled="locked"
		@published="onPublished"
		@cancel="go({ name: 'list' })"
	/>

	<!-- Fiche : création / modification -->
	<ActivityForm
		v-else-if="view.name === 'form'"
		:categories="categories"
		:source="view.source"
		:category="view.category"
		:disabled="locked"
		@published="onPublished"
		@cancel="go({ name: 'list' })"
	/>
</template>
