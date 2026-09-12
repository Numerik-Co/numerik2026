<script setup lang="ts">
import { ref } from 'vue';
import type { ActiviteOption } from '../../lib/adhesion/types';
import { formatPrix } from '../adhesion/format';

const props = defineProps<{
	options: ActiviteOption[];
	active: boolean;
	done: boolean;
	busy: boolean;
	activiteLabel: string;
}>();

const emit = defineEmits<{ submit: [activiteId: number] }>();

const activiteId = defineModel<number | null>('activiteId', { required: true });

const montreErreur = ref(false);

function complet(o: ActiviteOption): boolean {
	return o.placesRestantes !== null && o.placesRestantes <= 0;
}

function placesLabel(o: ActiviteOption): string {
	if (o.placesRestantes === null) return '';
	if (o.placesRestantes <= 0) return 'Complet';
	if (o.placesRestantes === 1) return '1 place restante';
	return `${o.placesRestantes} places restantes`;
}

function valider() {
	montreErreur.value = true;
	if (activiteId.value === null) return;
	emit('submit', activiteId.value);
}
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
				<span v-else>2</span>
			</span>
			<h2 class="font-heading text-lg text-gray-900">Choix de l'activité</h2>
		</div>

		<form v-if="active" class="mt-5" @submit.prevent="valider">
			<p v-if="busy && !options.length" class="text-sm text-gray-500">Chargement…</p>

			<template v-else-if="!options.length">
				<p class="text-sm text-gray-500">Aucune activité ouverte à l'inscription pour le moment.</p>
			</template>

			<template v-else>
				<div class="space-y-2">
					<label
						v-for="o in options"
						:key="o.id"
						class="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
						:class="[
							complet(o) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-primary',
							{ 'border-primary bg-primary/5': activiteId === o.id },
						]"
					>
						<span class="flex items-center gap-3">
							<input
								type="radio"
								:value="o.id"
								v-model.number="activiteId"
								name="activite"
								:disabled="complet(o)"
							/>
							<span class="text-sm text-gray-900">{{ o.label }}</span>
						</span>
						<span class="text-right">
							<span class="block font-heading font-semibold text-gray-900">{{ formatPrix(o.prix) }}</span>
							<span class="block text-xs" :class="complet(o) ? 'text-red-600' : 'text-gray-400'">
								{{ placesLabel(o) }}
							</span>
						</span>
					</label>
				</div>

				<p v-if="montreErreur && activiteId === null" class="mt-3 text-sm text-red-600">
					Choisissez une activité.
				</p>

				<button
					type="submit"
					class="mt-6 rounded-full bg-accent px-6 py-2.5 font-heading font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
					:disabled="busy"
				>
					{{ busy ? 'Envoi…' : "Valider l'inscription" }}
				</button>
			</template>
		</form>

		<p v-else-if="done" class="mt-3 text-sm text-gray-600">
			{{ activiteLabel }}
			<span class="text-gray-400">— enregistré</span>
		</p>
	</li>
</template>
