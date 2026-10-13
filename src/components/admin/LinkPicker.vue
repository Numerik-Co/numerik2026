<script setup lang="ts">
/**
 * Bloc « Insérer un lien vers une page du site », sous le texte Markdown des
 * formulaires d'actualité, de page et d'activité. Liste chargée à la
 * première ouverture (`GET /api/admin/liens`, `src/lib/site-links.ts`) ;
 * un clic insère `[titre](/adresse)` au curseur, ou fait du texte
 * sélectionné le texte du lien.
 *
 * `v-model` = texte du formulaire, `field` = sa zone de saisie (curseur).
 */
import { computed, inject, nextTick, ref } from 'vue';
import type { SiteLink, SiteLinkGroup } from '../../lib/site-links';
import { ApiError, linksApi } from './client';
import { ADMIN_CONTEXT, compactInputClass } from './context';

const props = defineProps<{ field: HTMLTextAreaElement | null }>();
const body = defineModel<string>({ required: true });
const { sessionExpired } = inject(ADMIN_CONTEXT)!;

const groups = ref<SiteLinkGroup[] | null>(null);
const loading = ref(false);
const error = ref('');
const search = ref('');

async function load() {
	if (groups.value || loading.value) return;
	loading.value = true;
	error.value = '';
	try {
		groups.value = (await linksApi.get()).groups;
	} catch (e) {
		if (e instanceof ApiError && e.status === 401) return sessionExpired();
		error.value = (e as Error).message;
	} finally {
		loading.value = false;
	}
}

/** Recherche sans accents ni casse, sur le titre, la précision et l'adresse. */
const fold = (text: string) =>
	text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase();

const shown = computed(() => {
	const words = fold(search.value).split(/\s+/).filter(Boolean);
	if (!groups.value) return [];
	return groups.value
		.map((g) => ({
			...g,
			links: g.links.filter((l) => {
				const text = fold(`${l.title} ${l.note ?? ''} ${l.href}`);
				return words.every((w) => text.includes(w));
			}),
		}))
		.filter((g) => g.links.length);
});

/** Crochets du texte du lien échappés : ils fermeraient le lien Markdown. */
const linkText = (text: string) => text.replace(/[[\]]/g, (c) => `\\${c}`);

async function insert(link: SiteLink) {
	const field = props.field;
	const start = field ? field.selectionStart : body.value.length;
	const end = field ? field.selectionEnd : start;
	const selected = body.value.slice(start, end).trim();
	const markdown = `[${linkText(selected || link.title)}](${link.href})`;
	body.value = `${body.value.slice(0, start)}${markdown}${body.value.slice(end)}`;
	await nextTick();
	if (field) {
		const pos = start + markdown.length;
		field.focus();
		field.setSelectionRange(pos, pos);
	}
}
</script>

<template>
	<details class="mt-2 text-xs text-gray-600" @toggle="($event.target as HTMLDetailsElement).open && load()">
		<summary class="cursor-pointer font-medium text-primary">Insérer un lien vers une page du site</summary>
		<p class="mt-1 font-light">
			Placez le curseur dans le texte (ou sélectionnez les mots à transformer en lien), puis choisissez la page.
		</p>
		<p v-if="loading" class="mt-2 font-light text-gray-500">Chargement…</p>
		<p v-else-if="error" class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-red-700" role="alert">{{ error }}</p>
		<template v-else-if="groups">
			<input
				v-model="search"
				type="search"
				placeholder="Rechercher une page…"
				aria-label="Rechercher une page"
				:class="[compactInputClass, 'mt-2 w-full text-xs']"
			/>
			<div class="mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
				<p v-if="!shown.length" class="px-3 py-2 font-light text-gray-500">Aucune page ne correspond.</p>
				<section v-for="g in shown" :key="g.id">
					<h4 class="sticky top-0 bg-gray-50 px-3 py-1 font-semibold text-gray-700">{{ g.label }}</h4>
					<ul>
						<li v-for="l in g.links" :key="l.href">
							<button
								type="button"
								class="flex w-full flex-wrap items-baseline gap-x-2 px-3 py-1.5 text-left hover:bg-primary/5 focus:bg-primary/5 focus:outline-none"
								:title="`Insérer un lien vers ${l.href}`"
								@click="insert(l)"
							>
								<span class="font-medium text-gray-800">{{ l.title }}</span>
								<span v-if="l.note" class="font-light text-gray-500">{{ l.note }}</span>
								<code class="ml-auto text-gray-400">{{ l.href }}</code>
							</button>
						</li>
					</ul>
				</section>
			</div>
		</template>
	</details>
</template>
