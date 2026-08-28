<script setup lang="ts">
import type { ActiviteOption, CotisationOption } from '../../lib/adhesion/types';
import { formatPrix } from './format';

const props = defineProps<{
	membreLabel: string;
	cotisation: CotisationOption | null;
	activite: ActiviteOption | null;
	montantTotal: number | null;
	disponibilite: string;
}>();

const enAttente = props.disponibilite === "Liste d'attente";

const emit = defineEmits<{ recommencer: [] }>();
</script>

<template>
	<li class="rounded-2xl border border-primary bg-primary/5 p-6">
		<div class="flex items-center gap-3">
			<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
				<i class="fa-solid fa-check" aria-hidden="true"></i>
			</span>
			<h2 class="font-heading text-lg text-gray-900">Adhésion enregistrée</h2>
		</div>

		<p class="mt-4 text-sm text-gray-700">
			Merci <span class="font-medium">{{ membreLabel }}</span>, votre demande d'adhésion est bien
			enregistrée.
		</p>

		<dl class="mt-4 divide-y divide-primary/15 rounded-xl bg-white text-sm">
			<div class="flex justify-between px-4 py-2">
				<dt class="text-gray-600">Cotisation</dt>
				<dd class="text-gray-900">
					{{ cotisation?.label }} — {{ formatPrix(cotisation?.prix ?? null) }}
				</dd>
			</div>
			<div class="flex justify-between px-4 py-2">
				<dt class="text-gray-600">Activité</dt>
				<dd class="text-right text-gray-900">
					<template v-if="activite">
						{{ activite.label }} — {{ formatPrix(activite.prix ?? null) }}
						<span v-if="enAttente" class="block text-xs text-amber-700">Placé·e en liste d'attente</span>
					</template>
					<template v-else>
						<span class="text-gray-500">Aucune pour l'instant</span>
						<span class="block text-xs text-gray-400">À choisir plus tard auprès de l'association.</span>
					</template>
				</dd>
			</div>
			<div v-if="montantTotal !== null" class="flex justify-between px-4 py-3">
				<dt class="font-heading font-semibold text-gray-900">Total à régler</dt>
				<dd class="font-heading font-semibold text-gray-900">{{ formatPrix(montantTotal) }}</dd>
			</div>
		</dl>

		<p class="mt-4 text-sm text-gray-600">
			Le règlement se fait sur place lors de votre venue, ou auprès de nos partenaires
			(Mairie de Saint-Pierre-du-Mont, Informatique40). La cotisation n'est pas remboursable.
		</p>

		<button
			type="button"
			class="mt-6 text-sm font-medium text-primary hover:text-secondary"
			@click="emit('recommencer')"
		>
			Faire une autre inscription
		</button>
	</li>
</template>
