<script setup lang="ts">
/**
 * Encadré de publication (en cours / dernier résultat), cf. `usePublication.ts` ;
 * `reloadIn` : compte à rebours avant l'actualisation de la page (« Ne pas actualiser » = `cancelReload`).
 */
import type { PublishStatus } from './client';

defineProps<{ status: PublishStatus; following: boolean; reloadIn?: number | null }>();
const emit = defineEmits<{ dismiss: []; cancelReload: [] }>();
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
</template>
