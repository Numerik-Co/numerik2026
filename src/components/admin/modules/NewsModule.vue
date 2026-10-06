<script setup lang="ts">
/**
 * Module « Actualités » (groupes `redacteur` / `admin`) : liste des
 * actualités (brouillons compris) et ajout par dépôt d'un fichier `.md`
 * (frontmatter habituel, cf. docs/actualites.md) et d'une photo de couverture.
 *
 * Le serveur écrit `src/content/news/<AAAA-MM-JJ-slug>/` puis reconstruit le
 * site (≈ 1 min, cf. src/lib/site-build.ts) : le module suit la publication
 * (`/api/admin/publication`) jusqu'à sa mise en ligne, y compris pendant le
 * bref redémarrage du serveur. L'aperçu du frontmatter est indicatif ; le
 * serveur fait la vraie validation.
 */
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue';
import { ApiError, newsApi, type NewsItem, type PublishStatus } from '../client';
import { ADMIN_CONTEXT } from '../context';

const { sessionExpired } = inject(ADMIN_CONTEXT)!;

const view = ref<'list' | 'add'>('list');
const news = ref<NewsItem[]>([]);
const loading = ref(true);
const error = ref('');
const availability = ref<{ ok: boolean; reason?: string }>({ ok: true });
const status = ref<PublishStatus>({ state: 'idle' });
/** Vrai pendant qu'on suit une publication lancée depuis ce module (ou trouvée en cours). */
const following = ref(false);

const mdFile = ref<File | null>(null);
const mdText = ref('');
const photo = ref<File | null>(null);
const photoUrl = ref('');
const busy = ref(false);
const dragOver = ref<'md' | 'photo' | null>(null);

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX = 10 * 1024 * 1024;
const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

function fail(e: unknown) {
	if (e instanceof ApiError && e.status === 401) return sessionExpired();
	error.value = (e as Error).message;
}

async function load() {
	loading.value = true;
	try {
		const res = await newsApi.list();
		news.value = res.news;
		availability.value = res.availability;
		status.value = res.status;
		if (res.status.state === 'running' && !following.value) follow();
	} catch (e) {
		fail(e);
	} finally {
		loading.value = false;
	}
}

// --- Suivi de la publication ---

let pollTimer: ReturnType<typeof setTimeout> | undefined;

function follow() {
	following.value = true;
	const startedAt = Date.now();
	const tick = async () => {
		try {
			status.value = await newsApi.status();
		} catch (e) {
			if (e instanceof ApiError && e.status === 401) return sessionExpired();
			// Serveur en cours de redémarrage sur la nouvelle version : on réessaie.
		}
		if (status.value.state === 'running' && Date.now() - startedAt < POLL_TIMEOUT_MS) {
			pollTimer = setTimeout(tick, POLL_MS);
			return;
		}
		following.value = false;
		if (status.value.state === 'running') {
			error.value = "La publication prend plus de temps que prévu. Rouvrez ce module dans quelques minutes pour voir le résultat.";
		}
		await load();
	};
	pollTimer = setTimeout(tick, POLL_MS);
}

onBeforeUnmount(() => clearTimeout(pollTimer));

// --- Dépôt ---

/** Aperçu indicatif : lignes `clé: valeur` du frontmatter. */
const preview = computed(() => {
	const match = mdText.value.replace(/\r\n?/g, '\n').match(/^---\n([\s\S]*?)\n---/);
	if (!match) return null;
	const fields: Record<string, string> = {};
	for (const line of match[1].split('\n')) {
		const m = line.match(/^(\w+):\s*(.*)$/);
		if (m) fields[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
	}
	return fields;
});
const missing = computed(() =>
	preview.value ? ['title', 'publishAt', 'excerpt'].filter((k) => !preview.value![k]) : [],
);

async function pickMarkdown(file: File | undefined) {
	error.value = '';
	if (!file) return;
	if (!/\.(md|markdown)$/i.test(file.name)) {
		error.value = 'Le texte doit être un fichier Markdown (.md).';
		return;
	}
	mdFile.value = file;
	mdText.value = await file.text();
}

function pickPhoto(file: File | undefined) {
	error.value = '';
	if (!file) return;
	if (!PHOTO_TYPES.includes(file.type)) {
		error.value = 'Photo : formats acceptés JPEG, PNG ou WebP.';
		return;
	}
	if (file.size > PHOTO_MAX) {
		error.value = 'La photo est trop lourde (10 Mo max).';
		return;
	}
	if (photoUrl.value) URL.revokeObjectURL(photoUrl.value);
	photo.value = file;
	photoUrl.value = URL.createObjectURL(file);
}

function onDrop(kind: 'md' | 'photo', event: DragEvent) {
	dragOver.value = null;
	const file = event.dataTransfer?.files?.[0];
	if (kind === 'md') pickMarkdown(file);
	else pickPhoto(file);
}

function reset() {
	mdFile.value = null;
	mdText.value = '';
	photo.value = null;
	if (photoUrl.value) URL.revokeObjectURL(photoUrl.value);
	photoUrl.value = '';
}

function toBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
		reader.onerror = () => reject(new Error('Lecture de la photo impossible.'));
		reader.readAsDataURL(file);
	});
}

async function submit() {
	error.value = '';
	busy.value = true;
	try {
		const cover = photo.value ? { type: photo.value.type, data: await toBase64(photo.value) } : null;
		await newsApi.create(mdText.value, cover);
		status.value = { state: 'running', label: preview.value?.title };
		reset();
		view.value = 'list';
		follow();
	} catch (e) {
		fail(e);
	} finally {
		busy.value = false;
	}
}

/** Modèle de fichier à compléter, daté du jour (généré dans le navigateur). */
function downloadTemplate() {
	const today = new Date().toLocaleDateString('sv-SE'); // AAAA-MM-JJ, heure locale
	const template = `---
title: "Titre de l'actualité"
publishAt: ${today}
excerpt: "Résumé en une ou deux phrases, affiché sur les cartes et en page d'accueil."
tag: "Ateliers"
author: ""
# Facultatif — retirer le « # » en début de ligne pour activer :
# isPublish: false
# imageCredit: "Photo : Prénom Nom"
---

Premier paragraphe : l'essentiel de l'information en quelques phrases.

## Un sous-titre

Du texte en **gras** ou en *italique*, et un [lien](https://exemple.org).

- Un point de liste
- Un autre point

> Une citation ou un encadré à mettre en avant.

## Infos pratiques

- **Quand :** jour, horaires
- **Où :** lieu
- **Inscription :** téléphone ou email
`;
	const url = URL.createObjectURL(new Blob([template], { type: 'text/markdown;charset=utf-8' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = `${today}-modele-actualite.md`;
	link.click();
	URL.revokeObjectURL(url);
}

function openAdd() {
	error.value = '';
	reset();
	view.value = 'add';
}

const formatDate = (iso: string) =>
	new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

onMounted(load);
</script>

<template>
	<!-- Publication en cours / dernier résultat -->
	<div
		v-if="following || status.state === 'running'"
		class="mb-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-gray-800"
		role="status"
	>
		<i class="fa-solid fa-spinner fa-spin mt-0.5 text-primary" aria-hidden="true"></i>
		<span>
			<strong class="font-medium">Publication en cours<template v-if="status.label"> : {{ status.label }}</template></strong>
			<span class="block font-light text-gray-600">
				Le site est en cours de reconstruction (environ une minute). Vous pouvez fermer ce panneau : la publication continue.
			</span>
		</span>
	</div>
	<div
		v-else-if="status.state === 'succeeded' && status.href"
		class="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
		role="status"
	>
		Dernière publication en ligne :
		<a :href="status.href" class="font-medium underline">{{ status.label }}</a>
		<span v-if="status.message" class="mt-1 block text-amber-800">{{ status.message }}</span>
	</div>
	<p v-else-if="status.state === 'failed'" class="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">
		<strong class="font-medium">Dernière publication non aboutie<template v-if="status.label"> ({{ status.label }})</template>.</strong>
		<span class="block">{{ status.message }}</span>
	</p>

	<p v-if="error" class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>

	<!-- Liste -->
	<template v-if="view === 'list'">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<button
				type="button"
				class="rounded-full bg-primary px-5 py-2.5 font-heading text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
				:disabled="!availability.ok || following"
				@click="openAdd"
			>
				<i class="fa-solid fa-plus mr-1.5" aria-hidden="true"></i>
				Ajouter une actualité
			</button>
			<a href="/actualites" class="text-sm font-medium text-primary hover:underline">
				Voir la page Actualités <i class="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
			</a>
		</div>
		<p v-if="!availability.ok" class="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
			{{ availability.reason }}
		</p>

		<p v-if="loading" class="text-sm font-light text-gray-500">Chargement…</p>
		<p v-else-if="news.length === 0" class="text-sm font-light text-gray-500">Aucune actualité pour l'instant.</p>
		<ul v-else class="divide-y divide-gray-100 rounded-xl border border-gray-100">
			<li v-for="a in news" :key="a.slug" class="flex items-center gap-3 px-4 py-3">
				<span class="h-10 w-16 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-primary/10 to-secondary/10">
					<img v-if="a.thumbnail" :src="a.thumbnail" alt="" class="h-full w-full object-cover" loading="lazy" />
				</span>
				<span class="min-w-0 flex-1">
					<a
						v-if="a.isPublish"
						:href="a.href"
						class="block truncate text-sm font-medium text-gray-900 hover:text-primary"
					>{{ a.title }}</a>
					<span v-else class="block truncate text-sm font-medium text-gray-500">{{ a.title }}</span>
					<span class="block truncate text-xs font-light text-gray-500">
						{{ formatDate(a.publishAt) }}<template v-if="a.tag"> · {{ a.tag }}</template>
					</span>
				</span>
				<span v-if="!a.isPublish" class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Brouillon</span>
			</li>
		</ul>
	</template>

	<!-- Ajout -->
	<form v-else class="space-y-5" @submit.prevent="submit">
		<button type="button" class="text-sm font-medium text-primary hover:underline" @click="view = 'list'">
			← Toutes les actualités
		</button>

		<!-- Fichier Markdown -->
		<div>
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<p class="text-sm font-medium text-gray-700">1. Le texte (fichier .md)</p>
				<button type="button" class="text-sm font-medium text-primary hover:underline" @click="downloadTemplate">
					<i class="fa-solid fa-download mr-1 text-xs" aria-hidden="true"></i>
					Télécharger un modèle
				</button>
			</div>
			<p class="mt-1 text-xs font-light text-gray-500">
				Le modèle est daté du jour : complétez-le dans un éditeur de texte puis déposez-le ici.
			</p>
			<label
				class="mt-2 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors"
				:class="dragOver === 'md' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50'"
				@dragover.prevent="dragOver = 'md'"
				@dragleave="dragOver = null"
				@drop.prevent="onDrop('md', $event)"
			>
				<i class="fa-solid fa-file-lines text-2xl text-gray-400" aria-hidden="true"></i>
				<span v-if="mdFile" class="font-medium text-gray-900">{{ mdFile.name }}</span>
				<span v-else class="text-gray-600">Glissez le fichier ici ou <span class="text-primary underline">parcourez</span></span>
				<input type="file" accept=".md,.markdown,text/markdown" class="sr-only" @change="pickMarkdown(($event.target as HTMLInputElement).files?.[0])" />
			</label>

			<div v-if="mdFile" class="mt-3 rounded-xl bg-gray-50 p-4 text-sm">
				<p v-if="!preview" class="text-red-700">
					En-tête (frontmatter) introuvable : le fichier doit commencer par un bloc <code>---</code> … <code>---</code>.
				</p>
				<template v-else>
					<p class="font-heading font-semibold text-gray-900">{{ preview.title || '(sans titre)' }}</p>
					<p class="mt-0.5 text-xs text-gray-500">
						{{ preview.publishAt || 'date ?' }}
						<template v-if="preview.tag"> · {{ preview.tag }}</template>
						<template v-if="preview.author"> · {{ preview.author }}</template>
						<template v-if="preview.isPublish === 'false'"> · <strong>brouillon</strong></template>
					</p>
					<p v-if="preview.excerpt" class="mt-2 font-light text-gray-600">{{ preview.excerpt }}</p>
					<p v-if="missing.length" class="mt-2 text-red-700">Champ(s) manquant(s) : {{ missing.join(', ') }}.</p>
				</template>
			</div>
		</div>

		<!-- Photo -->
		<div>
			<p class="text-sm font-medium text-gray-700">
				2. La photo de couverture <span class="font-light text-gray-500">(facultative)</span>
			</p>
			<label
				class="mt-2 flex cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed text-center text-sm transition-colors"
				:class="[
					dragOver === 'photo' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50',
					photoUrl ? 'p-0' : 'px-4 py-6',
				]"
				@dragover.prevent="dragOver = 'photo'"
				@dragleave="dragOver = null"
				@drop.prevent="onDrop('photo', $event)"
			>
				<img v-if="photoUrl" :src="photoUrl" alt="Aperçu de la photo" class="aspect-video w-full object-cover" />
				<template v-else>
					<i class="fa-solid fa-image text-2xl text-gray-400" aria-hidden="true"></i>
					<span class="text-gray-600">Glissez la photo ici ou <span class="text-primary underline">parcourez</span></span>
					<span class="text-xs font-light text-gray-500">JPEG, PNG ou WebP · 10 Mo max</span>
				</template>
				<input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="pickPhoto(($event.target as HTMLInputElement).files?.[0])" />
			</label>
			<p v-if="photo" class="mt-1 text-xs font-light text-gray-500">
				{{ photo.name }} — la position GPS et les autres métadonnées sont retirées à l'envoi.
			</p>
		</div>

		<p class="text-xs font-light text-gray-500">
			À l'envoi, le site est reconstruit (environ une minute) : l'actualité apparaît ensuite sur la page Actualités,
			l'accueil et le flux RSS.
		</p>
		<button
			type="submit"
			:disabled="busy || !mdFile || !preview || missing.length > 0"
			class="rounded-full bg-primary px-6 py-3 font-heading text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
		>
			{{ busy ? 'Envoi…' : 'Publier l’actualité' }}
		</button>
	</form>
</template>
