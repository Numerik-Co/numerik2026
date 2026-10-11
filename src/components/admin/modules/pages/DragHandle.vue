<script setup lang="ts">
/**
 * Poignée d'une ligne déplaçable au glisser-déposer (souris ou doigt, cf. `sortableProps`). Ignorée au
 * clavier et par les lecteurs d'écran : les flèches ↑/↓ de la ligne (`OrderArrows.vue`) font la même chose.
 */
const props = defineProps<{ disabled: boolean }>();
</script>

<template>
	<span
		:class="[
			'flex h-7 w-5 shrink-0 touch-none items-center justify-center rounded-md text-gray-400',
			props.disabled ? 'cursor-not-allowed opacity-50' : 'drag-handle cursor-grab hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing',
		]"
		title="Glisser pour déplacer"
		aria-hidden="true"
	>
		<i class="fa-solid fa-grip-vertical text-xs"></i>
	</span>
</template>
