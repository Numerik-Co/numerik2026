<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ActiviteOption } from '../../lib/adhesion/types';
import { formatPrix } from '../adhesion/format';

const props = defineProps<{
	options: ActiviteOption[];
	active: boolean;
	done: boolean;
	busy: boolean;
	activiteLabel: string;
	/** `preinscription` : activité(s) visée(s) non publiée(s), on note l'intérêt au lieu d'inscrire. */
	mode: 'inscription' | 'preinscription';
	/** La fiche d'origine visait une activité sans correspondance dans Grist. */
	cibleIntrouvable: boolean;
	/** Adhésion en cours : met en avant le tarif adhérent·e, sinon le tarif non-adhérent·e. */
	estAdherent: boolean;
	/** Prix de l'adhésion individuelle, ajouté au tarif pour un·e non-adhérent·e. */
	prixAdhesion: number | null;
}>();

const emit = defineEmits<{ submit: [activiteId: number]; preinscrire: [activiteId: number] }>();

const activiteId = defineModel<number | null>('activiteId', { required: true });

const montreErreur = ref(false);
const preinscription = computed(() => props.mode === 'preinscription');

function complet(o: ActiviteOption): boolean {
	return !preinscription.value && o.placesRestantes !== null && o.placesRestantes <= 0;
}

function placesLabel(o: ActiviteOption): string {
	if (preinscription.value || o.placesRestantes === null) return '';
	if (o.placesRestantes <= 0) return 'Complet';
	if (o.placesRestantes === 1) return '1 place restante';
	return `${o.placesRestantes} places restantes`;
}

/** Activité réservée aux adhérent·es et adhésion payante : on affiche aussi le total non-adhérent·e. */
function doubleTarif(o: ActiviteOption): boolean {
	return o.adhesionRequise && props.prixAdhesion !== null && props.prixAdhesion > 0;
}

function totalNonAdherent(o: ActiviteOption): number {
	return (props.prixAdhesion ?? 0) + (o.prix ?? 0);
}

/** « 30 € adhésion + 45 € activité » (montants entiers sans décimales). */
function detailNonAdherent(o: ActiviteOption): string {
	const euros = (v: number) => `${new Intl.NumberFormat('fr-FR').format(v)} €`;
	const activite = o.prix ? `${euros(o.prix)} activité` : 'activité gratuite';
	return `${euros(props.prixAdhesion ?? 0)} adhésion + ${activite}`;
}

function valider() {
	montreErreur.value = true;
	if (activiteId.value === null) return;
	emit(preinscription.value ? 'preinscrire' : 'submit', activiteId.value);
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
				<p v-if="preinscription" class="mb-4 text-sm text-gray-700">
					{{ options.length > 1 ? 'Ces créneaux ne sont' : "Cette activité n'est" }} pas encore
					ouvert{{ options.length > 1 ? 's' : 'e' }} à l'inscription. Vous pouvez vous préinscrire :
					nous notons votre intérêt et vous recontactons dès l'ouverture des inscriptions.
				</p>
				<p v-else-if="cibleIntrouvable" class="mb-4 text-sm text-gray-600">
					Cette activité ne se réserve pas via ce formulaire. Voici les activités ouvertes à
					l'inscription :
				</p>

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
						<span v-if="!preinscription" class="text-right">
							<template v-if="doubleTarif(o)">
								<span
									class="block text-sm"
									:class="estAdherent ? 'font-heading font-semibold text-gray-900' : 'text-gray-400'"
								>
									{{ formatPrix(o.prix) }} <span class="text-xs font-normal">adhérent·e</span>
								</span>
								<span
									class="block text-sm"
									:class="estAdherent ? 'text-gray-400' : 'font-heading font-semibold text-gray-900'"
								>
									{{ formatPrix(totalNonAdherent(o)) }}
									<span class="text-xs font-normal">non-adhérent·e</span>
								</span>
								<span class="block text-xs text-gray-500">({{ detailNonAdherent(o) }})</span>
							</template>
							<span v-else class="block font-heading font-semibold text-gray-900">
								{{ formatPrix(o.prix) }}
							</span>
							<span class="block text-xs" :class="complet(o) ? 'text-red-600' : 'text-gray-400'">
								{{ placesLabel(o) }}
							</span>
						</span>
					</label>
				</div>

				<p v-if="montreErreur && activiteId === null" class="mt-3 text-sm text-red-600">
					Choisissez {{ preinscription ? 'un créneau' : 'une activité' }}.
				</p>

				<button
					type="submit"
					class="mt-6 rounded-full bg-accent px-6 py-2.5 font-heading font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
					:disabled="busy"
				>
					{{ busy ? 'Envoi…' : preinscription ? 'Me préinscrire' : "Valider l'inscription" }}
				</button>
			</template>
		</form>

		<p v-else-if="done" class="mt-3 text-sm text-gray-600">
			{{ activiteLabel }}
			<span class="text-gray-400">— {{ mode === 'preinscription' ? 'préinscription' : 'enregistré' }}</span>
		</p>
	</li>
</template>
