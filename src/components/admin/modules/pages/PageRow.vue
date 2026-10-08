<script setup lang="ts">
/** Ligne d'une page dans la liste du module « Pages » (suppression confirmée dans la ligne). */
import type { PageSourceView } from '../../client';
import ConfirmIconButton from '../../ConfirmIconButton.vue';
import { iconButtonClass } from '../../context';

const props = defineProps<{ page: PageSourceView; locked: boolean; confirming: boolean }>();
const emit = defineEmits<{ edit: []; askDelete: []; confirmDelete: []; cancelDelete: [] }>();
</script>

<template>
	<li class="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
		<span class="min-w-0">
			<a :href="`/${props.page.path}`" class="font-medium text-gray-900 hover:underline">{{ props.page.title || props.page.path }}</a>
		</span>
		<span v-if="props.page.type === 'enrichie'" class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">enrichie</span>
		<slot />
		<span v-if="props.page.technique" class="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800" title="Page .mdx : se modifie dans le code">
			technique
		</span>
		<span class="ml-auto flex items-center gap-1">
			<!-- Flèches ↑/↓ quand la ligne fait partie du menu de navigation. -->
			<slot name="order" />
			<button
				type="button"
				:class="[iconButtonClass, 'text-primary']"
				:disabled="props.locked || props.page.technique"
				aria-label="Modifier"
				title="Modifier"
				@click="emit('edit')"
			>
				<i class="fa-solid fa-pen" aria-hidden="true"></i>
			</button>
			<ConfirmIconButton
				label="Supprimer"
				title="Supprimer la page"
				:confirming="props.confirming"
				:disabled="props.locked || props.page.technique"
				@ask="emit('askDelete')"
				@confirm="emit('confirmDelete')"
				@cancel="emit('cancelDelete')"
			/>
		</span>
	</li>
</template>
