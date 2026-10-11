<script setup lang="ts">
/**
 * Flèches ↑/↓ d'une ligne ordonnable (modules « Pages » et « Activités », accueil, éléments d'un bloc). Sur
 * grand écran (≥ lg), elles sont masquées au profit de la poignée de glisser-déposer (`DragHandle.vue`), mais
 * réapparaissent quand on y arrive au clavier.
 */
import { iconButtonClass } from '../../context';

const props = defineProps<{ label: string; first: boolean; last: boolean; disabled: boolean }>();
const emit = defineEmits<{ up: []; down: [] }>();
</script>

<template>
	<span class="mr-1 flex items-center lg:sr-only lg:focus-within:not-sr-only">
		<button
			type="button"
			:class="[iconButtonClass, 'text-gray-500 hover:text-gray-900']"
			:disabled="props.disabled || props.first"
			:aria-label="`Monter « ${props.label} »`"
			title="Monter"
			@click="emit('up')"
		>
			<i class="fa-solid fa-arrow-up text-xs" aria-hidden="true"></i>
		</button>
		<button
			type="button"
			:class="[iconButtonClass, 'text-gray-500 hover:text-gray-900']"
			:disabled="props.disabled || props.last"
			:aria-label="`Descendre « ${props.label} »`"
			title="Descendre"
			@click="emit('down')"
		>
			<i class="fa-solid fa-arrow-down text-xs" aria-hidden="true"></i>
		</button>
	</span>
</template>
