<script setup lang="ts">
/** Ligne d'une page dans la liste du module « Pages » (suppression confirmée dans la ligne). */
import type { PageSourceView } from '../../client';

const props = defineProps<{ page: PageSourceView; locked: boolean; confirming: boolean }>();
const emit = defineEmits<{ edit: []; askDelete: []; confirmDelete: []; cancelDelete: [] }>();
</script>

<template>
	<li class="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
		<span class="min-w-0">
			<a :href="`/${props.page.path}`" class="font-medium text-gray-900 hover:underline">{{ props.page.title || props.page.path }}</a>
			<span class="block text-xs text-gray-500">/{{ props.page.path }}</span>
		</span>
		<span v-if="props.page.type === 'enrichie'" class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">enrichie</span>
		<slot />
		<span v-if="props.page.technique" class="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800" title="Page .mdx : se modifie dans le code">
			technique
		</span>
		<span class="ml-auto flex gap-3">
			<button
				type="button"
				class="text-primary hover:underline disabled:opacity-50"
				:disabled="props.locked || props.page.technique"
				@click="emit('edit')"
			>
				Modifier
			</button>
			<button
				v-if="!props.confirming"
				type="button"
				class="text-red-600 hover:underline disabled:opacity-50"
				:disabled="props.locked || props.page.technique"
				@click="emit('askDelete')"
			>
				Supprimer
			</button>
			<span v-else class="flex gap-2">
				<button type="button" class="font-semibold text-red-600 hover:underline" :disabled="props.locked" @click="emit('confirmDelete')">
					Confirmer la suppression
				</button>
				<button type="button" class="text-gray-600 hover:underline" @click="emit('cancelDelete')">Annuler</button>
			</span>
		</span>
	</li>
</template>
