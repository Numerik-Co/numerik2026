<script setup lang="ts">
/**
 * Formulaire d'une fiche du module « Activités » : création ou modification.
 * L'adresse (nom du dossier) se choisit à la création seulement ; l'URL
 * publique `/activites/<catégorie>/<adresse>` change si la catégorie change.
 * Onglets Informations / Contenu / Image ; en modification, fichier `.md`
 * à télécharger ou à recharger (`EditFileBar`, ./activity-markdown.ts).
 * Le serveur valide tout (src/lib/activity-writer.ts) et reconstruit le site.
 */
import { computed, inject, onBeforeUnmount, reactive, ref } from 'vue';
import { TYPES_ACTIVITE_INSCRIPTION } from '../../../../lib/adhesion/choices';
import { ApiError, activitiesApi, type ActivityCategory, type ActivityInput, type ActivitySourceView, type CoverUpdate } from '../../client';
import { ADMIN_CONTEXT, fileToBase64, inputClass, photoProblem, rememberOpenModule } from '../../context';
import EditFileBar from '../../EditFileBar.vue';
import FormHeader from '../../FormHeader.vue';
import FormTabs from '../../FormTabs.vue';
import LinkPicker from '../../LinkPicker.vue';
import { EDIT_TABS, useFormTabs, type EditTab } from '../../form-tabs';
import { downloadMarkdown, readMarkdownFile } from '../../markdown-file';
import { activityMarkdownFile, parseActivityMarkdown } from './activity-markdown';

const props = defineProps<{ categories: ActivityCategory[]; source: ActivitySourceView | null; category: string; disabled: boolean }>();
const emit = defineEmits<{ published: [label: string]; cancel: [] }>();
const { sessionExpired } = inject(ADMIN_CONTEXT)!;

const editing = props.source;

/** « Atelier Photo ! » → `atelier-photo` (même règle que le serveur). */
function slugify(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60)
		.replace(/-+$/g, '');
}

/** Zone du texte (curseur, pour `LinkPicker`). */
const bodyField = ref<HTMLTextAreaElement | null>(null);
const form = reactive({
	title: editing?.title ?? '',
	slug: editing?.slug ?? '',
	category: editing?.category ?? props.category ?? '',
	excerpt: editing?.excerpt ?? '',
	level: editing?.level ?? '',
	isPublish: editing ? editing.isPublish : true,
	inscription: editing ? editing.inscription : true,
	/** Un nom Grist par ligne. */
	activiteGrist: (editing?.activiteGrist ?? []).join('\n'),
	typeGrist: editing?.typeGrist ?? '',
	imageCredit: editing?.imageCredit ?? '',
	body: editing?.body ?? '',
});
/** L'adresse suit le titre tant qu'elle n'a pas été modifiée à la main (création seulement). */
const slugTouched = ref(false);
const slug = computed(() => (editing ? editing.slug : slugTouched.value ? form.slug : slugify(form.title)));
const categoryLabel = computed(() => props.categories.find((c) => c.slug === form.category)?.label);
const categoryChanged = computed(() => Boolean(editing && form.category !== editing.category));
const error = ref('');
const busy = ref(false);
const { tab, onInvalid } = useFormTabs<EditTab>('act', 'infos');

// --- Fichier .md (modification) ---

/** Dernier fichier chargé et remarques de lecture. */
const imported = ref<{ name: string; warnings: string[] } | null>(null);
const gristNames = () =>
	form.activiteGrist
		.split('\n')
		.map((n) => n.trim())
		.filter(Boolean);

function downloadFile() {
	downloadMarkdown(`${slug.value || 'activite'}.md`, activityMarkdownFile({ ...form, activiteGrist: gristNames() }));
}

async function loadFile(file: File) {
	error.value = '';
	const read = await readMarkdownFile(file);
	if (read.error) {
		error.value = read.error;
		return;
	}
	const { fields, warnings, error: problem } = parseActivityMarkdown(await file.text(), props.categories.map((c) => c.slug));
	if (!fields) {
		error.value = problem!;
		return;
	}
	const { category, typeGrist, activiteGrist, ...rest } = fields;
	Object.assign(form, rest, { activiteGrist: activiteGrist.join('\n') });
	if (category !== undefined) form.category = category;
	if (typeGrist !== undefined) form.typeGrist = typeGrist;
	if (!fields.title) warnings.unshift('Titre absent du fichier : à saisir dans « Informations ».');
	imported.value = { name: file.name, warnings };
}

function onSlugInput(event: Event) {
	slugTouched.value = true;
	form.slug = (event.target as HTMLInputElement).value;
}

// --- Photo ---

const coverAction = ref<'keep' | 'replace' | 'remove'>('keep');
const photo = ref<File | null>(null);
const photoUrl = ref('');

function pickPhoto(file: File | undefined) {
	error.value = '';
	if (!file) return;
	const problem = photoProblem(file);
	if (problem) {
		error.value = problem;
		return;
	}
	if (photoUrl.value) URL.revokeObjectURL(photoUrl.value);
	photo.value = file;
	photoUrl.value = URL.createObjectURL(file);
	coverAction.value = 'replace';
}

function resetPhoto() {
	photo.value = null;
	if (photoUrl.value) URL.revokeObjectURL(photoUrl.value);
	photoUrl.value = '';
}
onBeforeUnmount(resetPhoto);

async function submit() {
	error.value = '';
	busy.value = true;
	try {
		const input: ActivityInput = {
			slug: slug.value,
			title: form.title,
			excerpt: form.excerpt,
			category: form.category,
			isPublish: form.isPublish,
			level: form.level,
			inscription: form.inscription,
			activiteGrist: gristNames(),
			typeGrist: form.typeGrist,
			imageCredit: form.imageCredit,
			body: form.body,
		};
		const newPhoto = coverAction.value === 'replace' && photo.value ? { type: photo.value.type, data: await fileToBase64(photo.value) } : null;
		rememberOpenModule('activites');
		if (editing) {
			const cover: CoverUpdate = newPhoto ? { action: 'replace', ...newPhoto } : coverAction.value === 'remove' ? { action: 'remove' } : { action: 'keep' };
			await activitiesApi.update(editing.slug, input, cover);
			emit('published', `Modification : ${form.title}`);
		} else {
			await activitiesApi.create(input, newPhoto);
			emit('published', `Activité : ${form.title}`);
		}
	} catch (e) {
		if (e instanceof ApiError && e.status === 401) return sessionExpired();
		error.value = (e as Error).message;
	} finally {
		busy.value = false;
	}
}
</script>

<template>
	<FormHeader back="Toutes les activités" :title="editing ? editing.title || editing.slug : 'Nouvelle activité'" :editing="Boolean(editing)" @back="emit('cancel')" />
	<form class="space-y-5" @submit.prevent="submit" @invalid.capture="onInvalid">
		<p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>

		<div>
			<EditFileBar v-if="editing" :imported="imported" @download="downloadFile" @load="loadFile" />
			<FormTabs v-model="tab" :tabs="EDIT_TABS" prefix="act" />

			<div v-show="tab === 'infos'" id="act-panel-infos" role="tabpanel" aria-labelledby="act-tab-infos" class="space-y-5">
				<div>
					<label for="act-title" class="block text-sm font-semibold text-gray-700">Titre</label>
					<input id="act-title" v-model="form.title" type="text" required :class="inputClass" />
				</div>
				<div>
					<label for="act-excerpt" class="block text-sm font-semibold text-gray-700">Résumé</label>
					<textarea id="act-excerpt" v-model="form.excerpt" rows="2" required :class="inputClass"></textarea>
					<p class="mt-1 text-xs font-light text-gray-500">Une ou deux phrases : affiché sur la carte de l'activité et dans les moteurs de recherche.</p>
				</div>

				<!-- Emplacement -->
				<fieldset class="space-y-3 rounded-xl bg-gray-50 p-4">
					<legend class="sr-only">Emplacement</legend>
					<div>
						<label for="act-category" class="block text-sm font-semibold text-gray-700">Catégorie</label>
						<select id="act-category" v-model="form.category" required :class="inputClass">
							<option value="" disabled>Choisir…</option>
							<option v-for="c in props.categories" :key="c.slug" :value="c.slug">{{ c.label }}</option>
						</select>
						<p v-if="!editing || categoryChanged" class="mt-1 text-xs font-light text-gray-500">
							L'activité se place en dernière position{{ categoryLabel ? ` de « ${categoryLabel} »` : '' }} ; les flèches ↑/↓ de la liste changent l'ordre.
						</p>
					</div>
					<div>
						<label for="act-slug" class="block text-sm font-semibold text-gray-700">Adresse</label>
						<div
							class="mt-1 flex items-center rounded-lg border border-gray-300 bg-white text-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
						>
							<span class="whitespace-nowrap pl-3 text-gray-500">/activites/{{ form.category || '…' }}/</span>
							<input
								id="act-slug"
								:value="slug"
								type="text"
								pattern="[a-z0-9]+(-[a-z0-9]+)*"
								:readonly="Boolean(editing)"
								:class="['min-w-0 flex-1 rounded-r-lg border-0 py-2 pr-3 focus:outline-none focus:ring-0', editing ? 'text-gray-500' : 'text-gray-900']"
								@input="onSlugInput"
							/>
						</div>
						<p v-if="!editing" class="mt-1 text-xs font-light text-gray-500">Déduite du titre ; ne change plus après la création.</p>
						<p v-if="categoryChanged" class="mt-1 text-xs text-amber-800">
							La catégorie change : l'adresse devient /activites/{{ form.category }}/{{ slug }}, les liens vers l'ancienne ne
							fonctionneront plus.
						</p>
					</div>
					<label class="flex items-center gap-2 text-sm text-gray-700">
						<input v-model="form.isPublish" type="checkbox" class="rounded border-gray-300" />
						Publiée <span class="font-light text-gray-500">(décochée : brouillon, absente du site)</span>
					</label>
					<div>
						<label for="act-level" class="block text-sm font-semibold text-gray-700">
							Niveau <span class="font-light text-gray-500">(facultatif)</span>
						</label>
						<input id="act-level" v-model="form.level" type="text" placeholder="Ex. Grand débutant, Initiation, Tous niveaux" :class="inputClass" />
						<p class="mt-1 text-xs font-light text-gray-500">Pastille affichée sur la carte de l'activité.</p>
					</div>
				</fieldset>

				<!-- Inscription en ligne -->
				<fieldset class="space-y-3 rounded-xl bg-gray-50 p-4">
					<legend class="sr-only">Inscription en ligne</legend>
					<label class="flex items-center gap-2 text-sm font-semibold text-gray-700">
						<input v-model="form.inscription" type="checkbox" class="rounded border-gray-300" />
						Bouton « S'inscrire » sur la fiche
					</label>
					<p v-if="!form.inscription" class="text-xs font-light text-gray-500">Masqué (ex. activité sur rendez-vous).</p>
					<template v-else>
						<div>
							<label for="act-grist" class="block text-sm font-semibold text-gray-700">
								Activité(s) Grist visée(s) <span class="font-light text-gray-500">(facultatif, une par ligne)</span>
							</label>
							<textarea id="act-grist" v-model="form.activiteGrist" rows="2" :placeholder="form.title" :class="inputClass"></textarea>
							<p class="mt-1 text-xs font-light text-gray-500">
								Nom exact de la colonne « Nom » de la table Activite ; terminer par <code>*</code> pour viser tous les noms qui
								commencent ainsi (ex. <code>Initiation*</code>). Vide : le titre de la fiche.
							</p>
						</div>
						<div>
							<label for="act-type" class="block text-sm font-semibold text-gray-700">
								Type Grist visé <span class="font-light text-gray-500">(facultatif)</span>
							</label>
							<select id="act-type" v-model="form.typeGrist" :class="inputClass">
								<option value="">Aucun</option>
								<option v-for="t in TYPES_ACTIVITE_INSCRIPTION" :key="t" :value="t">{{ t }}</option>
							</select>
						</div>
					</template>
				</fieldset>
			</div>

			<div v-show="tab === 'contenu'" id="act-panel-contenu" role="tabpanel" aria-labelledby="act-tab-contenu">
				<!-- Texte -->
				<div>
					<label for="act-body" class="block text-sm font-semibold text-gray-700">Texte de la fiche (Markdown)</label>
					<textarea id="act-body" ref="bodyField" v-model="form.body" rows="16" required :class="[inputClass, 'font-mono text-xs leading-relaxed']"></textarea>
					<p class="mt-1 text-xs font-light text-gray-500">
						<code>## Titre de section</code> (alimente le sommaire), <code>**gras**</code>, <code>*italique*</code>,
						<code>- liste</code>, <code>[lien](/contact)</code>. Le HTML est accepté (tableaux, encadrés…).
					</p>
					<LinkPicker v-model="form.body" :field="bodyField" />
				</div>
			</div>

			<div v-show="tab === 'image'" id="act-panel-image" role="tabpanel" aria-labelledby="act-tab-image">
				<!-- Photo -->
				<fieldset>
					<legend class="text-sm font-semibold text-gray-700">
						Photo de couverture <span class="font-light text-gray-500">(facultative)</span>
					</legend>
					<img
						v-if="coverAction === 'keep' && editing?.coverUrl"
						:src="editing.coverUrl"
						alt="Photo actuelle"
						class="mt-2 aspect-video w-full rounded-xl object-cover"
					/>
					<img v-if="coverAction === 'replace' && photoUrl" :src="photoUrl" alt="Nouvelle photo" class="mt-2 aspect-video w-full rounded-xl object-cover" />
					<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
						<label class="cursor-pointer text-primary hover:underline">
							{{ editing?.cover || photo ? 'Remplacer la photo' : 'Ajouter une photo' }}
							<input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="pickPhoto(($event.target as HTMLInputElement).files?.[0])" />
						</label>
						<button v-if="editing?.cover && coverAction !== 'remove'" type="button" class="text-red-600 hover:underline" @click="coverAction = 'remove'; resetPhoto()">
							Retirer la photo
						</button>
						<button v-if="coverAction !== 'keep'" type="button" class="text-gray-600 hover:underline" @click="coverAction = 'keep'; resetPhoto()">
							Annuler le changement de photo
						</button>
					</div>
					<p v-if="!editing?.cover && !photo" class="mt-1 text-xs font-light text-gray-500">Sans photo, la carte affiche « Image à venir ».</p>
					<div v-if="editing?.cover || photo" class="mt-3">
						<label for="act-credit" class="block text-sm font-semibold text-gray-700">
							Crédit photo <span class="font-light text-gray-500">(facultatif)</span>
						</label>
						<input id="act-credit" v-model="form.imageCredit" type="text" placeholder="Photo : Prénom Nom / Source" :class="inputClass" />
					</div>
				</fieldset>
			</div>
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
