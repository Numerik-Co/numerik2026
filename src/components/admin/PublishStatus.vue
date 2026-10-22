<script setup lang="ts">
/**
 * Encadré de publication (en cours / dernier résultat), cf. `usePublication.ts` ;
 * `reloadIn` : compte à rebours avant l'actualisation de la page (« Ne pas actualiser » = `cancelReload`).
 * En dessous, les modifications enregistrées sans publier (`lot.ts`) et le
 * bouton qui les publie en une fois (`publishLot`, bloqué par `locked`) ;
 * `savedLabel` : la dernière, enregistrée depuis ce module.
 */
import type { PublishStatus } from './client';
import { lot, publishing } from './lot';

defineProps<{ status: PublishStatus; following: boolean; reloadIn?: number | null; savedLabel?: string | null; locked?: boolean }>();
const emit = defineEmits<{ dismiss: []; cancelReload: []; publishLot: [] }>();
</script>

<template>
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
		v-else-if="status.state === 'succeeded'"
		class="relative mb-4 rounded-xl border border-green-200 bg-green-50 p-4 pr-10 text-sm text-green-800"
		role="status"
	>
		<button
			type="button"
			class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 leading-none opacity-60 hover:bg-black/5 hover:opacity-100"
			aria-label="Fermer ce message"
			title="Fermer"
			@click="emit('dismiss')"
		>
			<i class="fa-solid fa-xmark" aria-hidden="true"></i>
		</button>
		Dernière publication en ligne :
		<a v-if="status.href" :href="status.href" class="font-medium underline">{{ status.label }}</a>
		<span v-else class="font-medium">{{ status.label }}</span>
		<span v-if="status.message" class="mt-1 block text-amber-800">{{ status.message }}</span>
		<span v-if="reloadIn != null" class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
			<span>
				<i class="fa-solid fa-rotate fa-spin mr-1.5" aria-hidden="true"></i>
				<template v-if="reloadIn > 0">Actualisation de la page dans {{ reloadIn }} s…</template>
				<template v-else>Actualisation de la page…</template>
			</span>
			<button v-if="reloadIn > 0" type="button" class="font-medium underline hover:no-underline" @click="emit('cancelReload')">
				Ne pas actualiser
			</button>
		</span>
	</div>
	<p
		v-else-if="status.state === 'failed'"
		class="relative mb-4 rounded-xl bg-red-50 p-4 pr-10 text-sm text-red-700"
		role="alert"
	>
		<button
			type="button"
			class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 leading-none opacity-60 hover:bg-black/5 hover:opacity-100"
			aria-label="Fermer ce message"
			title="Fermer"
			@click="emit('dismiss')"
		>
			<i class="fa-solid fa-xmark" aria-hidden="true"></i>
		</button>
		<strong class="font-medium">Dernière publication non aboutie<template v-if="status.label"> ({{ status.label }})</template>.</strong>
		<span class="block">{{ status.message }}</span>
	</p>
	<div
		v-if="lot.length && !publishing && status.state !== 'running'"
		class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
		role="status"
	>
		<p v-if="savedLabel" class="mb-2 font-medium">
			<i class="fa-solid fa-check mr-1.5" aria-hidden="true"></i>Enregistré sans publier : {{ savedLabel }}
		</p>
		<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
			<span class="min-w-0 flex-1">
				<i class="fa-solid fa-clock mr-1.5" aria-hidden="true"></i>
				<strong class="font-medium">{{ lot.length }} modification{{ lot.length > 1 ? 's' : '' }} en attente de publication</strong>
				<span class="block font-light text-amber-800">
					Pas encore visible{{ lot.length > 1 ? 's' : '' }} sur le site : publiez tout en une fois quand vous avez terminé (environ une minute).
				</span>
			</span>
			<button
				type="button"
				class="rounded-full bg-primary px-4 py-2 font-heading text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
				:disabled="locked"
				@click="emit('publishLot')"
			>
				<i class="fa-solid fa-rocket mr-1.5" aria-hidden="true"></i>Publier les modifications ({{ lot.length }})
			</button>
		</div>
		<details class="mt-2">
			<summary class="cursor-pointer text-xs font-medium text-amber-800 hover:underline">Voir la liste</summary>
			<ul class="mt-1 list-disc space-y-0.5 pl-5 text-xs font-light">
				<li v-for="change in lot" :key="change.at + change.label">
					{{ change.label }}<span v-if="change.by" class="text-amber-700"> — {{ change.by.fullname }}</span>
				</li>
			</ul>
		</details>
	</div>
</template>
