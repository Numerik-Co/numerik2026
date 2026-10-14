<script setup lang="ts">
/**
 * Ligne d'une page dans la liste du module « Pages » : le titre ouvre l'édition, l'œil la page sur le site,
 * suppression confirmée dans la ligne.
 */
import type { PageSourceView } from '../../client';
import ConfirmIconButton from '../../ConfirmIconButton.vue';
import { useSlots } from 'vue';
import { iconButtonClass } from '../../context';

/**
 * `nested` : page d'un menu déroulant, légèrement en retrait sous son libellé. Slot `handle` : poignée de
 * glisser-déposer en début de ligne (menu de navigation) ; slot `order` : flèches ↑/↓.
 */
const props = defineProps<{ page: PageSourceView; locked: boolean; confirming: boolean; nested?: boolean }>();
const emit = defineEmits<{ edit: []; askDelete: []; confirmDelete: []; cancelDelete: [] }>();
const slots = useSlots();
</script>

<template>
	<li
		:class="[
			'flex flex-wrap items-center gap-2 py-2.5 pr-4 text-sm transition-colors hover:bg-gray-100',
			slots.handle ? (props.nested ? 'pl-6' : 'pl-2') : props.nested ? 'pl-8' : 'pl-4',
		]"
	>
		<slot name="handle" />
		<span class="min-w-0">
			<button
				type="button"
				class="text-left font-medium text-gray-900 hover:text-primary disabled:cursor-default disabled:hover:text-gray-900"
				:disabled="props.locked || props.page.technique"
				:title="`Modifier « ${props.page.title || props.page.path} »`"
				@click="emit('edit')"
			>
				{{ props.page.title || props.page.path }}
			</button>
		</span>
		<span v-if="props.page.type === 'enrichie'" class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">enrichie</span>
		<slot />
		<span v-if="props.page.technique" class="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800" title="Page .mdx : se modifie dans le code">
			technique
		</span>
		<span class="ml-auto flex items-center gap-1">
			<!-- Flèches ↑/↓ quand la ligne fait partie du menu de navigation. -->
			<slot name="order" />
			<a
				:href="`/${props.page.path}`"
				:class="[iconButtonClass, 'text-gray-400 hover:text-gray-700']"
				:aria-label="`Voir « ${props.page.title || props.page.path} » sur le site`"
				title="Voir sur le site"
			>
				<i class="fa-solid fa-eye" aria-hidden="true"></i>
			</a>
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
