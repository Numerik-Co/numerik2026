<script setup lang="ts">
/**
 * Formulaire de page du module « Pages » : création (choix page classique /
 * enrichie, ou fichier `.md` déposé qui pré-remplit le formulaire, modèles
 * téléchargeables : ./page-markdown.ts) ou modification d'une page des sources. Emplacement : hors menu
 * déroulant (racine), dans un menu déroulant, ou réservée (espace bénévoles).
 * « Menu » = menu de navigation (frontmatter `menu:`). Le serveur valide
 * tout (src/lib/page-writer.ts) et reconstruit le site.
 */
import { computed, inject, nextTick, onBeforeUnmount, reactive, ref } from 'vue';
import { ASSIGNABLE_GROUPS, AUTH_GROUPS } from '../../../../lib/auth/groups';
import { blocMarker, type Bloc } from '../../../../lib/blocs';
import { PAGE_VARIABLES } from '../../../../lib/page-variables';
import { ApiError, pagesApi, type CoverUpdate, type DropdownView, type PageInput, type PageSourceView } from '../../client';
import { ADMIN_CONTEXT, fileToBase64, inputClass, photoProblem, rememberOpenModule } from '../../context';
import BlocsEditor from './BlocsEditor.vue';
import { downloadPageTemplate, parsePageMarkdown } from './page-markdown';

const props = defineProps<{ dropdowns: DropdownView[]; source: PageSourceView | null; disabled: boolean }>();
const emit = defineEmits<{ published: [label: string]; cancel: [] }>();
const { sessionExpired } = inject(ADMIN_CONTEXT)!;

const RESERVED_PREFIX = 'espace-benevoles';
const editing = props.source;

/** « Notre projet ! » → `notre-projet` (même règle que le serveur). */
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

function placementKey(p: PageInput['placement']): string {
	return p.kind === 'dropdown' ? `dropdown:${p.dropdown}` : p.kind;
}

const form = reactive({
	type: editing?.type ?? ('classique' as PageInput['type']),
	title: editing?.title ?? '',
	description: editing?.description ?? '',
	placement: editing ? placementKey(editing.placement) : 'racine',
	slug: editing?.slug ?? '',
	menuShow: editing ? editing.menu.show : true,
	menuLabel: editing?.menu.label ?? '',
	access: [...(editing?.access ?? [])],
	body: editing?.body ?? '',
	imageCredit: editing?.imageCredit ?? '',
});
const blocs = reactive<Record<string, Bloc>>(structuredClone(editing?.blocs ?? {}));
/** Création : type pas encore choisi (écran de choix classique / enrichie). */
const typeChosen = ref(Boolean(editing));
/** L'adresse suit le titre tant qu'elle n'a pas été modifiée à la main (création seulement). */
const slugTouched = ref(Boolean(editing));
const error = ref('');
const busy = ref(false);
const bodyField = ref<HTMLTextAreaElement | null>(null);

// --- Création depuis un fichier .md ---

/** Fichier déposé et remarques de lecture (affichées en tête du formulaire). */
const imported = ref<{ name: string; warnings: string[] } | null>(null);
const mdDragOver = ref(false);

async function pickMarkdown(file: File | undefined) {
	error.value = '';
	if (!file) return;
	if (!/\.(md|markdown)$/i.test(file.name)) {
		error.value = 'Le fichier doit être un fichier Markdown (.md).';
		return;
	}
	if (file.size > 200 * 1024) {
		error.value = 'Le fichier est trop long (200 Ko max).';
		return;
	}
	const { page, warnings, error: problem } = parsePageMarkdown(await file.text());
	if (!page) {
		error.value = problem!;
		return;
	}
	Object.assign(form, {
		type: page.type,
		title: page.title,
		description: page.description,
		menuLabel: page.menuLabel,
		imageCredit: page.imageCredit,
		body: page.body,
	});
	if (page.menuShow !== undefined) form.menuShow = page.menuShow;
	for (const id of Object.keys(blocs)) delete blocs[id];
	Object.assign(blocs, page.blocs);
	if (!page.title) warnings.unshift('Titre absent du fichier : à saisir ci-dessous.');
	imported.value = { name: file.name, warnings };
	typeChosen.value = true;
}

const coverAction = ref<'keep' | 'replace' | 'remove'>('keep');
const photo = ref<File | null>(null);
const photoUrl = ref('');

const slug = computed(() => (slugTouched.value ? form.slug : slugify(form.title)));
const placement = computed<PageInput['placement']>(() =>
	form.placement === 'reservee'
		? { kind: 'reservee' }
		: form.placement.startsWith('dropdown:')
			? { kind: 'dropdown', dropdown: form.placement.slice('dropdown:'.length) }
			: { kind: 'racine' },
);
/** Début de l'adresse imposé par l'emplacement (`association/`, `espace-benevoles/`). */
const prefix = computed(() => {
	const p = placement.value;
	return p.kind === 'dropdown' ? `${p.dropdown}/` : p.kind === 'reservee' ? `${RESERVED_PREFIX}/` : '';
});
const path = computed(() => `${prefix.value}${slug.value || '…'}`);
const pathChanged = computed(() => Boolean(editing && path.value !== editing.path));
const dropdownLabel = computed(() => props.dropdowns.find((d) => `dropdown:${d.folder}` === form.placement)?.label);

function chooseType(type: PageInput['type']) {
	form.type = type;
	typeChosen.value = true;
}

function onSlugInput(event: Event) {
	slugTouched.value = true;
	form.slug = (event.target as HTMLInputElement).value;
}

/** Marqueur de bloc inséré au curseur, seul sur sa ligne. */
async function insertMarker(id: string) {
	const field = bodyField.value;
	const marker = blocMarker(id);
	const at = field ? field.selectionStart : form.body.length;
	const before = form.body.slice(0, at).replace(/\s*$/, '');
	const after = form.body.slice(at).replace(/^\s*/, '');
	form.body = `${before}${before ? '\n\n' : ''}${marker}\n\n${after}`;
	await nextTick();
	if (field) {
		const pos = before.length + (before ? 2 : 0) + marker.length;
		field.focus();
		field.setSelectionRange(pos, pos);
	}
}

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
		const input: PageInput = {
			placement: placement.value,
			slug: slug.value,
			title: form.title,
			description: form.description,
			type: form.type,
			// Position décidée par le serveur (dernière à la création ou en changeant d'emplacement).
			menu: { show: form.menuShow, order: editing?.menu.order ?? 0, label: form.menuLabel },
			access: form.placement === 'reservee' ? form.access : [],
			body: form.body,
			blocs: form.type === 'enrichie' ? blocs : {},
			imageCredit: form.imageCredit,
		};
		const newPhoto = coverAction.value === 'replace' && photo.value ? { type: photo.value.type, data: await fileToBase64(photo.value) } : null;
		rememberOpenModule('pages-site');
		if (editing) {
			const cover: CoverUpdate = newPhoto ? { action: 'replace', ...newPhoto } : coverAction.value === 'remove' ? { action: 'remove' } : { action: 'keep' };
			await pagesApi.update(editing.path, input, cover);
			emit('published', `Modification : ${form.title}`);
		} else {
			await pagesApi.create(input, newPhoto);
			emit('published', `Page : ${form.title}`);
		}
	} catch (e) {
		if (e instanceof ApiError && e.status === 401) return sessionExpired();
		error.value = (e as Error).message;
	} finally {
		busy.value = false;
	}
}

const variables = Object.entries(PAGE_VARIABLES);
const token = (name: string) => `{{${name}}}`;
const groupChoices = ASSIGNABLE_GROUPS.map((g) => ({ value: g, label: AUTH_GROUPS[g].label }));
</script>

<template>
	<!-- Création : choix du type -->
	<div v-if="!typeChosen" class="space-y-4">
		<p class="text-sm font-light text-gray-600">Quel type de page voulez-vous créer ?</p>
		<button
			type="button"
			class="block w-full rounded-2xl border border-gray-200 p-5 text-left transition-shadow hover:border-primary hover:shadow-md"
			@click="chooseType('classique')"
		>
			<span class="flex items-center gap-2 font-heading font-semibold text-gray-900">
				<i class="fa-solid fa-file-lines text-primary" aria-hidden="true"></i>Page classique
			</span>
			<span class="mt-1 block text-sm font-light text-gray-600">
				Du texte mis en forme (titres, listes, liens, tableaux), avec une photo de couverture facultative.
			</span>
		</button>
		<button
			type="button"
			class="block w-full rounded-2xl border border-gray-200 p-5 text-left transition-shadow hover:border-primary hover:shadow-md"
			@click="chooseType('enrichie')"
		>
			<span class="flex items-center gap-2 font-heading font-semibold text-gray-900">
				<i class="fa-solid fa-puzzle-piece text-primary" aria-hidden="true"></i>Page enrichie
			</span>
			<span class="mt-1 block text-sm font-light text-gray-600">
				Le texte, plus des blocs placés où vous voulez : grille de cartes, tarif, bouton, encadré, rendez-vous du
				Conseiller Numérique…
			</span>
		</button>

		<!-- Ou à partir d'un fichier .md -->
		<div class="pt-2">
			<p class="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-gray-400">
				<span class="h-px flex-1 bg-gray-200"></span>ou à partir d'un fichier .md<span class="h-px flex-1 bg-gray-200"></span>
			</p>
			<p v-if="error" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>
			<label
				class="mt-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors"
				:class="mdDragOver ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'"
				@dragover.prevent="mdDragOver = true"
				@dragleave="mdDragOver = false"
				@drop.prevent="mdDragOver = false; pickMarkdown($event.dataTransfer?.files?.[0])"
			>
				<i class="fa-solid fa-file-arrow-up text-2xl text-gray-400" aria-hidden="true"></i>
				<span class="text-gray-600">Glissez votre fichier ici ou <span class="text-primary underline">parcourez</span></span>
				<span class="text-xs font-light text-gray-500">Le formulaire est pré-rempli : vous vérifiez, choisissez l'emplacement, puis publiez.</span>
				<input type="file" accept=".md,.markdown,text/markdown" class="sr-only" @change="pickMarkdown(($event.target as HTMLInputElement).files?.[0])" />
			</label>
			<p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
				<span class="text-gray-600"><i class="fa-solid fa-download mr-1 text-xs text-gray-400" aria-hidden="true"></i>Télécharger un modèle :</span>
				<button type="button" class="font-medium text-primary hover:underline" @click="downloadPageTemplate('classique')">page classique</button>
				<button type="button" class="font-medium text-primary hover:underline" @click="downloadPageTemplate('enrichie')">page enrichie</button>
			</p>
		</div>

		<button type="button" class="text-sm text-gray-600 hover:underline" @click="emit('cancel')">Annuler</button>
	</div>

	<form v-else class="space-y-5" @submit.prevent="submit">
		<div v-if="imported" class="rounded-lg bg-primary/5 px-3 py-2 text-sm text-gray-700" role="status">
			<p>
				<i class="fa-solid fa-file-circle-check mr-1 text-primary" aria-hidden="true"></i>
				Formulaire rempli depuis <strong>{{ imported.name }}</strong> : vérifiez, choisissez l'emplacement puis publiez.
			</p>
			<ul v-if="imported.warnings.length" class="mt-1 list-disc pl-5 text-xs text-amber-800">
				<li v-for="w in imported.warnings" :key="w">{{ w }}</li>
			</ul>
		</div>
		<p v-if="editing?.technique" class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
			Page technique (.mdx) : elle se modifie dans le code, pas ici.
		</p>
		<p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>

		<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
			<span class="font-semibold text-gray-700">Type :</span>
			<label class="flex items-center gap-1.5"><input v-model="form.type" type="radio" value="classique" /> Page classique</label>
			<label class="flex items-center gap-1.5"><input v-model="form.type" type="radio" value="enrichie" /> Page enrichie (blocs)</label>
		</div>

		<div>
			<label for="pg-title" class="block text-sm font-semibold text-gray-700">Titre</label>
			<input id="pg-title" v-model="form.title" type="text" required :class="inputClass" />
		</div>
		<div>
			<label for="pg-description" class="block text-sm font-semibold text-gray-700">
				Description <span class="font-light text-gray-500">(facultative)</span>
			</label>
			<textarea id="pg-description" v-model="form.description" rows="2" :class="inputClass"></textarea>
			<p class="mt-1 text-xs font-light text-gray-500">Affichée sous le titre et dans les moteurs de recherche.</p>
		</div>

		<!-- Emplacement -->
		<fieldset class="space-y-3 rounded-xl bg-gray-50 p-4">
			<legend class="sr-only">Emplacement</legend>
			<div>
				<label for="pg-placement" class="block text-sm font-semibold text-gray-700">Emplacement</label>
				<select id="pg-placement" v-model="form.placement" :class="inputClass">
					<option value="racine">Hors menu déroulant (lien direct du menu de navigation, ou aucun lien)</option>
					<option v-for="d in props.dropdowns" :key="d.folder" :value="`dropdown:${d.folder}`">Dans le menu déroulant « {{ d.label }} »</option>
					<option value="reservee">Page réservée (espace bénévoles, connexion requise)</option>
				</select>
			</div>
			<div>
				<label for="pg-slug" class="block text-sm font-semibold text-gray-700">Adresse</label>
				<div class="mt-1 flex items-center rounded-lg border border-gray-300 bg-white text-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
					<span class="whitespace-nowrap pl-3 text-gray-500">/{{ prefix }}</span>
					<input
						id="pg-slug"
						:value="slug"
						type="text"
						pattern="[a-z0-9]+(-[a-z0-9]+)*"
						class="min-w-0 flex-1 rounded-r-lg border-0 py-2 pr-3 text-gray-900 focus:outline-none focus:ring-0"
						@input="onSlugInput"
					/>
				</div>
				<p v-if="pathChanged" class="mt-1 text-xs text-amber-800">
					L'adresse change (/{{ editing!.path }} → /{{ path }}) : les liens existants vers l'ancienne adresse ne
					fonctionneront plus.
				</p>
			</div>

			<template v-if="form.placement !== 'reservee'">
				<label class="flex items-center gap-2 text-sm text-gray-700">
					<input v-model="form.menuShow" type="checkbox" class="rounded border-gray-300" />
					<template v-if="dropdownLabel">Visible dans le menu déroulant « {{ dropdownLabel }} »</template>
					<template v-else>Lien direct dans le menu de navigation</template>
				</label>
				<div v-if="form.menuShow">
					<label for="pg-menu-label" class="block text-sm font-semibold text-gray-700">
						Libellé dans le menu de navigation <span class="font-light text-gray-500">(facultatif)</span>
					</label>
					<input id="pg-menu-label" v-model="form.menuLabel" type="text" :placeholder="form.title" :class="inputClass" />
					<p v-if="!editing || placementKey(editing.placement) !== form.placement" class="mt-1 text-xs font-light text-gray-500">
						La page se place en dernière position {{ dropdownLabel ? `du menu déroulant « ${dropdownLabel} »` : 'du menu de navigation' }}.
					</p>
				</div>
			</template>
			<fieldset v-else>
				<legend class="text-sm font-semibold text-gray-700">Accès</legend>
				<p class="text-xs font-light text-gray-500">Aucune case cochée : toute personne connectée.</p>
				<label v-for="g in groupChoices" :key="g.value" class="mt-1 flex items-center gap-2 text-sm text-gray-700">
					<input v-model="form.access" type="checkbox" :value="g.value" class="rounded border-gray-300" />
					{{ g.label }}
				</label>
			</fieldset>
		</fieldset>

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
				<button
					v-if="editing?.cover && coverAction !== 'remove'"
					type="button"
					class="text-red-600 hover:underline"
					@click="coverAction = 'remove'; resetPhoto()"
				>
					Retirer la photo
				</button>
				<button v-if="coverAction !== 'keep'" type="button" class="text-gray-600 hover:underline" @click="coverAction = 'keep'; resetPhoto()">
					Annuler le changement de photo
				</button>
			</div>
			<div v-if="editing?.cover || photo" class="mt-3">
				<label for="pg-credit" class="block text-sm font-semibold text-gray-700">
					Crédit photo <span class="font-light text-gray-500">(facultatif)</span>
				</label>
				<input id="pg-credit" v-model="form.imageCredit" type="text" placeholder="Photo : Prénom Nom" :class="inputClass" />
			</div>
		</fieldset>

		<!-- Texte -->
		<div>
			<label for="pg-body" class="block text-sm font-semibold text-gray-700">Texte (Markdown)</label>
			<textarea
				id="pg-body"
				ref="bodyField"
				v-model="form.body"
				rows="16"
				required
				:class="[inputClass, 'font-mono text-xs leading-relaxed']"
			></textarea>
			<p class="mt-1 text-xs font-light text-gray-500">
				<code>## Titre de section</code> (alimente le sommaire), <code>**gras**</code>, <code>*italique*</code>,
				<code>- liste</code>, <code>[lien](/contact)</code>. Le HTML est accepté (tableaux, encadrés…).
			</p>
			<details class="mt-2 text-xs text-gray-600">
				<summary class="cursor-pointer font-medium text-primary">Insérer une information de l'association</summary>
				<p class="mt-1 font-light">Recopiez la variable dans le texte : elle est remplacée par la valeur configurée pour le site.</p>
				<ul class="mt-1 space-y-0.5">
					<li v-for="[name, v] in variables" :key="name">
						<code>{{ token(name) }}</code> — {{ v.label }}
					</li>
				</ul>
			</details>
		</div>

		<BlocsEditor v-if="form.type === 'enrichie'" :blocs="blocs" :body="form.body" @insert="insertMarker" />

		<div class="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
			<button
				type="submit"
				:disabled="busy || props.disabled || editing?.technique"
				class="rounded-full bg-primary px-6 py-3 font-heading text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
			>
				{{ busy ? 'Envoi…' : editing ? 'Enregistrer et publier' : 'Créer et publier' }}
			</button>
			<button type="button" class="text-sm text-gray-600 hover:underline" @click="emit('cancel')">Annuler</button>
		</div>
	</form>
</template>
