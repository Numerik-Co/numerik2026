<script setup lang="ts">
/**
 * Une couleur du thème (onglet « Charte graphique ») : nuancier du
 * navigateur + saisie hexadécimale, contraste du texte blanc, retour à la
 * couleur du modèle.
 */
import { computed } from 'vue';
import { COLOR_PATTERN } from '../../../../config/site';
import { compactInputClass } from '../../context';
import { contrastLevel, contrastWithWhite, fullHex } from './contrast';

const props = defineProps<{ id: string; label: string; help: string; defaultValue: string }>();
const model = defineModel<string>({ required: true });

const valid = computed(() => COLOR_PATTERN.test(model.value));
const ratio = computed(() => (valid.value ? contrastWithWhite(model.value) : null));
const level = computed(() => (ratio.value === null ? null : contrastLevel(ratio.value)));
const LEVELS = {
	bon: { text: 'Texte blanc lisible', class: 'bg-green-50 text-green-700' },
	moyen: { text: 'Texte blanc : gros caractères seulement', class: 'bg-amber-50 text-amber-800' },
	faible: { text: 'Texte blanc peu lisible', class: 'bg-red-50 text-red-700' },
};
</script>

<template>
	<div class="flex flex-wrap items-start gap-3 px-4 py-3">
		<input
			:id="`${props.id}-picker`"
			type="color"
			:value="valid ? fullHex(model) : '#000000'"
			class="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-gray-300 bg-white p-0.5"
			:aria-label="`${props.label} : nuancier`"
			@input="model = ($event.target as HTMLInputElement).value"
		/>
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-baseline gap-x-2">
				<label :for="props.id" class="text-sm font-medium text-gray-700">{{ props.label }}</label>
				<span class="text-xs font-light text-gray-500">{{ props.help }}</span>
			</div>
			<div class="mt-1 flex flex-wrap items-center gap-2">
				<input
					:id="props.id"
					v-model.trim="model"
					type="text"
					maxlength="7"
					spellcheck="false"
					:class="[compactInputClass, 'w-28 font-mono', { 'border-red-400': !valid }]"
				/>
				<span v-if="level" :class="['rounded-full px-2 py-0.5 text-xs', LEVELS[level].class]" :title="`Contraste ${ratio!.toFixed(1)}:1`">
					{{ LEVELS[level].text }}
				</span>
				<span v-else class="text-xs text-red-700">Format attendu : #2f7fc1</span>
				<button
					v-if="model.toLowerCase() !== props.defaultValue.toLowerCase()"
					type="button"
					class="text-xs text-primary hover:underline"
					@click="model = props.defaultValue"
				>
					couleur d'origine
				</button>
			</div>
		</div>
	</div>
</template>
