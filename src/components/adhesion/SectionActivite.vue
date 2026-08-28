<script setup lang="ts">
import { computed } from 'vue';
import type { ActiviteOption } from '../../lib/adhesion/types';
import { formatPrix } from './format';

const props = defineProps<{
	options: ActiviteOption[];
	active: boolean;
	done: boolean;
	busy: boolean;
}>();

const emit = defineEmits<{ submit: []; passer: [] }>();
const selected = defineModel<number | null>({ required: true });

function complet(o: ActiviteOption): boolean {
	return o.placesRestantes !== null && o.placesRestantes <= 0;
}

function placesLabel(o: ActiviteOption): string {
	if (o.placesRestantes === null) return '';
	if (o.placesRestantes <= 0) return 'Complet';
	if (o.placesRestantes === 1) return '1 place restante';
	return `${o.placesRestantes} places restantes`;
}

const selectionValide = computed(() => {
	const o = props.options.find((x) => x.id === selected.value);
	return !!o && !complet(o);
});
</script>

<template>
	<li
		class="rounded-2xl border bg-white p-6 shadow-sm"
		:class="active ? 'border-primary' : 'border-gray-100'"
	>
		<div class="flex items-center gap-3">
			<span
				class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-heading text-sm"
				:class="done ? 'bg-primary text-white' : 'bg-primary/10 text-primary'"
			>
				<i v-if="done" class="fa-solid fa-check" aria-hidden="true"></i>
				<span v-else>3</span>
			</span>
			<h2 class="font-heading text-lg text-gray-900">Choix de l'activité</h2>
		</div>

		<form v-if="active" class="mt-5" @submit.prevent="emit('submit')">
			<p v-if="busy && !options.length" class="text-sm text-gray-500">Chargement…</p>
			<div v-else class="space-y-2">
				<label
					v-for="o in options"
					:key="o.id"
					class="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
					:class="[
						complet(o)
							? 'cursor-not-allowed opacity-50'
							: 'cursor-pointer hover:border-primary',
						{ 'border-primary bg-primary/5': selected === o.id },
					]"
				>
					<span class="flex items-center gap-3">
						<input
							type="radio"
							:value="o.id"
							v-model="selected"
							name="activite"
							:disabled="complet(o)"
						/>
						<span class="text-sm text-gray-900">{{ o.label }}</span>
					</span>
					<span class="text-right">
						<span class="block font-heading font-semibold text-gray-900">{{ formatPrix(o.prix) }}</span>
						<span
							class="block text-xs"
							:class="complet(o) ? 'text-red-600' : 'text-gray-400'"
						>{{ placesLabel(o) }}</span>
					</span>
				</label>
			</div>

			<div class="mt-6 flex flex-wrap items-center gap-3">
				<button
					type="submit"
					class="rounded-full bg-accent px-6 py-2.5 font-heading font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
					:disabled="busy || !selectionValide"
				>
					{{ busy ? 'Envoi…' : 'Valider mon inscription' }}
				</button>
				<button
					type="button"
					class="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-heading font-semibold text-gray-600 hover:border-primary hover:text-primary disabled:opacity-50"
					:disabled="busy"
					@click="emit('passer')"
				>
					Continuer sans activité
				</button>
			</div>
			<p class="mt-3 text-xs text-gray-400">
				Vous pourrez choisir une activité plus tard, directement auprès de l'association.
			</p>
		</form>

		<p v-else-if="done" class="mt-3 text-sm text-gray-600">
			{{ options.find((o) => o.id === selected)?.label ?? 'Aucune activité pour l’instant' }}
			<span class="text-gray-400">— enregistré</span>
		</p>
	</li>
</template>
