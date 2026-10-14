<script setup lang="ts">
/**
 * Barre d'onglets d'un formulaire (motif ARIA « tabs ») : `v-model` = onglet
 * actif, panneaux rendus par le parent (`v-show`, `id="<prefix>-panel-<id>"`,
 * `aria-labelledby="<prefix>-tab-<id>"`). Flèches gauche/droite entre
 * onglets ; `marks` = pastille « modifications pas encore publiées ».
 * Utilisée par les modules Association, Actualités, Pages et Activités
 * (cf. `form-tabs.ts`).
 */
import type { FormTab } from './form-tabs';

const props = defineProps<{ tabs: readonly FormTab[]; prefix: string; marks?: Record<string, boolean> }>();
const active = defineModel<string>({ required: true });

function onKey(event: KeyboardEvent) {
	if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
	const i = props.tabs.findIndex((t) => t.id === active.value);
	const next = props.tabs[(i + (event.key === 'ArrowRight' ? 1 : props.tabs.length - 1)) % props.tabs.length];
	active.value = next.id;
	(document.getElementById(`${props.prefix}-tab-${next.id}`) as HTMLElement | null)?.focus();
}
</script>

<template>
	<div role="tablist" aria-label="Rubriques" class="mb-5 flex gap-1 border-b border-gray-200" @keydown="onKey">
		<button
			v-for="t in props.tabs"
			:id="`${props.prefix}-tab-${t.id}`"
			:key="t.id"
			type="button"
			role="tab"
			:aria-selected="active === t.id"
			:aria-controls="`${props.prefix}-panel-${t.id}`"
			:tabindex="active === t.id ? 0 : -1"
			:class="[
				'-mb-px flex items-center gap-2 border-b-2 px-3 py-2 font-heading text-sm font-semibold transition-colors',
				active === t.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800',
			]"
			@click="active = t.id"
		>
			<i :class="['fa-solid', t.icon]" aria-hidden="true"></i>
			{{ t.label }}
			<span v-if="props.marks?.[t.id]" class="h-2 w-2 rounded-full bg-amber-400" title="Modifications pas encore publiées"></span>
		</button>
	</div>
</template>
