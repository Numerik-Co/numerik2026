<script setup lang="ts">
/**
 * Formulaire d'une catégorie du module « Activités » : création ou
 * modification (nom, icône, description du bandeau). L'adresse
 * (`/activites/<adresse>`) se choisit à la création seulement. Le serveur
 * valide tout (src/lib/category-writer.ts) et reconstruit le site.
 */
import { computed, inject, reactive, ref } from 'vue';
import { CATEGORY_ICONS } from '../../../../lib/category-icons';
import { ApiError, activityCategoriesApi, type ActivityCategory } from '../../client';
import { ADMIN_CONTEXT, inputClass, rememberOpenModule } from '../../context';

const props = defineProps<{ source: ActivityCategory | null; disabled: boolean }>();
const emit = defineEmits<{ published: [label: string]; cancel: [] }>();
const { sessionExpired } = inject(ADMIN_CONTEXT)!;

const editing = props.source;

/** « Jeux vidéo ! » → `jeux-video` (même règle que le serveur). */
function slugify(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40)
		.replace(/-+$/g, '');
}

const form = reactive({
	label: editing?.label ?? '',
	slug: editing?.slug ?? '',
	icon: editing?.icon ?? '',
	description: editing?.description ?? '',
});
/** L'adresse suit le nom tant qu'elle n'a pas été modifiée à la main (création seulement). */
const slugTouched = ref(false);
const slug = computed(() => (editing ? editing.slug : slugTouched.value ? form.slug : slugify(form.label)));
/** Icône écrite à la main dans le fichier, hors de la liste proposée : gardée en tête. */
const icons = computed(() =>
	editing && !CATEGORY_ICONS.some((i) => i.icon === editing.icon) ? [{ icon: editing.icon, label: 'Icône actuelle' }, ...CATEGORY_ICONS] : CATEGORY_ICONS,
);
const error = ref('');
const busy = ref(false);

function onSlugInput(event: Event) {
	slugTouched.value = true;
	form.slug = (event.target as HTMLInputElement).value;
}

async function submit() {
	error.value = '';
	if (!form.icon) {
		error.value = 'Choisissez une icône.';
		return;
	}
	busy.value = true;
	try {
		const category: ActivityCategory = { slug: slug.value, label: form.label, icon: form.icon, description: form.description };
		rememberOpenModule('activites');
		if (editing) await activityCategoriesApi.update(editing.slug, category);
		else await activityCategoriesApi.create(category);
		emit('published', `Catégorie : ${form.label}`);
	} catch (e) {
		if (e instanceof ApiError && e.status === 401) return sessionExpired();
		error.value = (e as Error).message;
	} finally {
		busy.value = false;
	}
}
</script>

<template>
	<form class="space-y-5" @submit.prevent="submit">
		<p class="text-sm font-light text-gray-600">
			Une catégorie regroupe des activités (comme « Ateliers ») : elle a sa carte sur l'accueil et sur la page Activités, et sa
			propre page qui liste ses activités.
		</p>
		<p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>

		<div>
			<label for="cat-label" class="block text-sm font-semibold text-gray-700">Nom</label>
			<input id="cat-label" v-model="form.label" type="text" required maxlength="40" :class="inputClass" />
		</div>
		<div>
			<label for="cat-slug" class="block text-sm font-semibold text-gray-700">Adresse</label>
			<div
				class="mt-1 flex items-center rounded-lg border border-gray-300 bg-white text-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
			>
				<span class="whitespace-nowrap pl-3 text-gray-500">/activites/</span>
				<input
					id="cat-slug"
					:value="slug"
					type="text"
					pattern="[a-z0-9]+(-[a-z0-9]+)*"
					:readonly="Boolean(editing)"
					:class="['min-w-0 flex-1 rounded-r-lg border-0 py-2 pr-3 focus:outline-none focus:ring-0', editing ? 'text-gray-500' : 'text-gray-900']"
					@input="onSlugInput"
				/>
			</div>
			<p v-if="!editing" class="mt-1 text-xs font-light text-gray-500">
				Déduite du nom ; ne change plus après la création. La catégorie se place en dernière position ; les flèches ↑/↓ de la
				liste changent l'ordre.
			</p>
		</div>

		<fieldset>
			<legend class="text-sm font-semibold text-gray-700">Icône</legend>
			<div class="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-9">
				<label
					v-for="i in icons"
					:key="i.icon"
					:title="i.label"
					:class="[
						'flex aspect-square cursor-pointer items-center justify-center rounded-lg text-lg ring-1 ring-inset transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
						form.icon === i.icon ? 'bg-primary text-white ring-primary' : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-100',
					]"
				>
					<input v-model="form.icon" type="radio" name="cat-icon" :value="i.icon" class="sr-only" :aria-label="i.label" />
					<i :class="['fa-solid', i.icon]" aria-hidden="true"></i>
				</label>
			</div>
		</fieldset>

		<div>
			<label for="cat-description" class="block text-sm font-semibold text-gray-700">
				Description <span class="font-light text-gray-500">(facultative)</span>
			</label>
			<textarea id="cat-description" v-model="form.description" rows="3" maxlength="300" :class="inputClass"></textarea>
			<p class="mt-1 text-xs font-light text-gray-500">Une phrase, affichée dans le bandeau de la page de la catégorie.</p>
		</div>

		<div class="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
			<button
				type="submit"
				:disabled="busy || props.disabled"
				class="rounded-full bg-primary px-6 py-3 font-heading text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
			>
				{{ busy ? 'Envoi…' : editing ? 'Enregistrer et publier' : 'Créer et publier' }}
			</button>
			<button type="button" class="text-sm text-gray-600 hover:underline" @click="emit('cancel')">Annuler</button>
		</div>
	</form>
</template>
