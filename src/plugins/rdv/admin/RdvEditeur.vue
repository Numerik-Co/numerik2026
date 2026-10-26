<script setup lang="ts">
/**
 * Éditeur d'un RDV (module « Rendez-vous ») : second panneau, fixé à gauche
 * du panneau latéral des modules (pleine largeur sur petit écran). Placé dans
 * le DOM du panneau (pas de Teleport) pour rester dans son piège de focus ;
 * Échap ferme d'abord l'éditeur, pas le module.
 *
 * Bénéficiaire et son commentaire en lecture seule (fiche gérée dans
 * Grist, commentaire saisi par le bénéficiaire) ; modifiables : créneau (créneaux libres de la fenêtre de réservation, urgences comprises,
 * plus le créneau actuel — les créneaux pris ne sont pas proposés), démarche,
 * statut, et le compte rendu après le RDV (colonnes de `suivi.ts` présentes
 * dans le document : « Compte rendu de l'accompagnement », « Avis du
 * bénéficiaire »). Blocs sur deux colonnes quand le panneau est assez large
 * (requête de conteneur) : bénéficiaire et rendez-vous à gauche, compte rendu
 * à droite. « Supprimer » (doublon, erreur, test) demande un motif, noté au journal.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { ApiError } from '../../../components/admin/client';
import { inputClass } from '../../../components/admin/context';
import type { Creneau, Demarche } from '../lib/types';
import { classeStatut, libelleDate, MOTIFS_SUPPRESSION, rdvAdminApi, visage, type ChampSuivi, type RdvItem } from './client';

const props = defineProps<{ rdv: RdvItem; demarches: Demarche[]; statuts: string[]; suivi: ChampSuivi[]; creneaux: Creneau[] }>();
const emit = defineEmits<{ close: []; saved: []; deleted: [] }>();

const date = ref(props.rdv.date);
const heure = ref(props.rdv.heure);
const demarcheId = ref<number>(props.rdv.demarcheIds[0] ?? 0);
const statut = ref(props.rdv.statut);
/** Compte rendu en cours de saisie (copie : listes copiées aussi). */
const suivi = ref<Record<string, string | string[]>>(
	Object.fromEntries(
		props.suivi.map((c) => {
			const v = props.rdv.suivi[c.cle] ?? (c.type === 'choix-multiples' ? [] : '');
			return [c.cle, Array.isArray(v) ? [...v] : v];
		}),
	),
);
const groupesSuivi = computed(() =>
	(
		[
			{ id: 'compte-rendu', titre: "Compte rendu de l'accompagnement" },
			{ id: 'avis', titre: 'Avis du bénéficiaire', aide: 'Recueilli par vous à la fin du rendez-vous.' },
		] as const
	)
		.map((g) => ({ ...g, champs: props.suivi.filter((c) => c.groupe === g.id) }))
		.filter((g) => g.champs.length),
);

/** Choix multiple : coche / décoche une valeur. */
function basculer(cle: string, valeur: string) {
	const liste = (suivi.value[cle] as string[]) ?? [];
	suivi.value[cle] = liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur];
}

const valeurSuivi = (c: ChampSuivi) => {
	const v = suivi.value[c.cle];
	return Array.isArray(v) ? c.choix.filter((x) => v.includes(x)) : String(v ?? '').trim();
};

const busy = ref(false);
const error = ref('');
const enregistre = ref(false);

/** Jours proposés : ceux de la fenêtre de réservation, plus celui du RDV. */
const jours = computed(() => [...new Set([props.rdv.date, ...props.creneaux.map((c) => c.date)])].sort());

const estActuel = (d: string, h: string) => d === props.rdv.date && h === props.rdv.heure;

/** Horaires du jour choisi : seulement les libres, plus le créneau actuel du RDV. */
const horaires = computed(() => {
	const liste = props.creneaux
		.filter((c) => c.date === date.value && (c.disponible || estActuel(c.date, c.heure)))
		.map((c) => ({ heure: c.heure, urgence: c.urgence }));
	if (date.value === props.rdv.date && !liste.some((h) => h.heure === props.rdv.heure)) {
		liste.push({ heure: props.rdv.heure, urgence: false });
	}
	return liste.sort((a, b) => a.heure.localeCompare(b.heure));
});

function changerJour() {
	// Garde l'heure si elle est proposée ce jour-là, sinon la première libre.
	if (!horaires.value.some((h) => h.heure === heure.value)) heure.value = horaires.value[0]?.heure ?? '';
}

/** Démarches par thématique (listes déroulantes groupées). */
const parThematique = computed(() => {
	const map = new Map<string, Demarche[]>();
	for (const d of props.demarches) {
		if (!map.has(d.thematique)) map.set(d.thematique, []);
		map.get(d.thematique)!.push(d);
	}
	return [...map].sort(([a], [b]) => a.localeCompare(b, 'fr'));
});

const modifie = computed(
	() =>
		date.value !== props.rdv.date ||
		heure.value !== props.rdv.heure ||
		demarcheId.value !== (props.rdv.demarcheIds[0] ?? 0) ||
		statut.value !== props.rdv.statut ||
		props.suivi.some((c) => JSON.stringify(valeurSuivi(c)) !== JSON.stringify(props.rdv.suivi[c.cle] ?? (c.type === 'choix-multiples' ? [] : ''))),
);

const b = computed(() => props.rdv.beneficiaire);
const nom = computed(() => [b.value.prenom, b.value.nom].filter(Boolean).join(' ') || 'Bénéficiaire inconnu·e');

async function enregistrer() {
	error.value = '';
	enregistre.value = false;
	if (!heure.value) return void (error.value = 'Choisissez un horaire.');
	if (!demarcheId.value) return void (error.value = 'Choisissez une démarche.');
	busy.value = true;
	try {
		await rdvAdminApi.update(props.rdv.id, {
			date: date.value,
			heure: heure.value,
			demarcheId: demarcheId.value,
			commentaire: props.rdv.commentaire,
			statut: statut.value,
			suivi: Object.fromEntries(props.suivi.map((c) => [c.cle, valeurSuivi(c)])),
		});
		enregistre.value = true;
		emit('saved');
	} catch (e) {
		error.value = e instanceof ApiError ? e.message : 'Une erreur est survenue.';
	} finally {
		busy.value = false;
	}
}

/** Suppression : encadré de confirmation avec motif obligatoire. */
const suppression = ref(false);
const motif = ref('');
const precision = ref('');
const suppressionBusy = ref(false);
const suppressionErreur = ref('');
const motifValide = computed(() => !!motif.value && (motif.value !== 'Autre' || !!precision.value.trim()));

function demanderSuppression() {
	suppression.value = true;
	suppressionErreur.value = '';
}

function annulerSuppression() {
	suppression.value = false;
	motif.value = '';
	precision.value = '';
	suppressionErreur.value = '';
}

async function supprimer() {
	suppressionErreur.value = '';
	if (!motifValide.value) return void (suppressionErreur.value = motif.value ? 'Précisez le motif.' : 'Choisissez un motif.');
	suppressionBusy.value = true;
	try {
		await rdvAdminApi.remove(props.rdv.id, motif.value, precision.value);
		emit('deleted');
	} catch (e) {
		suppressionErreur.value = e instanceof ApiError ? e.message : 'Une erreur est survenue.';
	} finally {
		suppressionBusy.value = false;
	}
}

const panneau = ref<HTMLElement | null>(null);

function onKeydown(event: KeyboardEvent) {
	if (event.key !== 'Escape') return;
	event.stopPropagation();
	if (suppression.value) annulerSuppression();
	else emit('close');
}

onMounted(async () => {
	window.addEventListener('keydown', onKeydown, true);
	await nextTick();
	panneau.value?.focus();
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown, true));
</script>

<template>
	<section
		ref="panneau"
		tabindex="-1"
		aria-labelledby="rdv-editeur-titre"
		class="fixed bottom-0 left-0 right-0 top-10 z-10 flex flex-col bg-white focus:outline-none sm:right-[36rem] sm:border-r sm:border-gray-200"
	>
		<header class="flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
			<h2 id="rdv-editeur-titre" class="min-w-0 truncate font-heading text-lg font-semibold text-gray-900">
				{{ nom }}
				<span class="font-sans text-sm font-normal text-gray-500">· {{ libelleDate(rdv.date) }} · {{ rdv.heure }}</span>
			</h2>
			<div class="flex shrink-0 items-center gap-3">
				<span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="classeStatut(rdv.statut)">{{ rdv.statut }}</span>
				<button
					type="button"
					class="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
					aria-label="Fermer l'éditeur"
					@click="emit('close')"
				>
					<i class="fa-solid fa-xmark" aria-hidden="true"></i>
				</button>
			</div>
		</header>

		<form class="@container scrollbar-fin flex-1 overflow-y-auto px-6 py-6" @submit.prevent="enregistrer">
			<div class="space-y-6" :class="{ 'max-w-2xl': !groupesSuivi.length }">
				<div class="grid items-start gap-6" :class="{ '@3xl:grid-cols-2': groupesSuivi.length }">
					<div class="space-y-6">
						<!-- Bénéficiaire (lecture seule) -->
						<div class="rounded-xl border border-gray-200 p-4">
							<h3 class="font-heading text-sm font-semibold text-gray-900">Bénéficiaire</h3>
							<dl class="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
								<div>
									<dt class="text-xs text-gray-500">Téléphone</dt>
									<dd>
										<a v-if="b.telephone" :href="`tel:${b.telephone.replace(/\s/g, '')}`" class="text-primary hover:underline">{{ b.telephone }}</a>
										<span v-else class="text-gray-400">—</span>
									</dd>
								</div>
								<div>
									<dt class="text-xs text-gray-500">E-mail</dt>
									<dd class="truncate">
										<a v-if="b.email" :href="`mailto:${b.email}`" class="text-primary hover:underline">{{ b.email }}</a>
										<span v-else class="text-gray-400">—</span>
									</dd>
								</div>
								<div>
									<dt class="text-xs text-gray-500">Commune</dt>
									<dd>{{ b.commune || '—' }}</dd>
								</div>
								<div>
									<dt class="text-xs text-gray-500">Pris en ligne le</dt>
									<dd>{{ rdv.creeLe ? libelleDate(rdv.creeLe) : '—' }}</dd>
								</div>
								<div class="sm:col-span-2">
									<dt class="text-xs text-gray-500">Commentaire du bénéficiaire</dt>
									<dd class="whitespace-pre-line" :class="rdv.commentaire ? 'text-primary' : 'text-gray-400'">{{ rdv.commentaire || '—' }}</dd>
								</div>
							</dl>
							<p class="mt-3 text-xs text-gray-500">La fiche du bénéficiaire se modifie dans Grist.</p>
						</div>

						<!-- Rendez-vous -->
						<div class="space-y-4 rounded-xl border border-gray-200 p-4">
							<h3 class="font-heading text-sm font-semibold text-gray-900">Rendez-vous</h3>
							<div class="grid gap-4 sm:grid-cols-2">
								<div>
									<label for="rdv-jour" class="text-sm font-medium text-gray-700">Jour</label>
									<select id="rdv-jour" v-model="date" :class="inputClass" @change="changerJour">
										<option v-for="j in jours" :key="j" :value="j">{{ libelleDate(j) }}</option>
									</select>
								</div>
								<div>
									<label for="rdv-heure" class="text-sm font-medium text-gray-700">Horaire</label>
									<select id="rdv-heure" v-model="heure" :class="inputClass">
										<option v-if="!horaires.length" value="" disabled>Aucun créneau libre ce jour-là</option>
										<option v-for="h in horaires" :key="h.heure" :value="h.heure">
											{{ h.heure }}{{ h.urgence ? ' (urgence)' : '' }}{{ estActuel(date, h.heure) ? ' (actuel)' : '' }}
										</option>
									</select>
								</div>
							</div>
							<p class="text-xs text-gray-500">
								Lieu : {{ date === rdv.date && heure === rdv.heure ? rdv.lieu || '—' : creneaux.find((c) => c.date === date)?.lieu || '—' }}.
								Seuls les créneaux libres de la période de réservation sont proposés.
							</p>

							<div>
								<label for="rdv-demarche" class="text-sm font-medium text-gray-700">Démarche</label>
								<select id="rdv-demarche" v-model="demarcheId" :class="inputClass">
									<option :value="0" disabled>Choisir une démarche…</option>
									<optgroup v-for="[thematique, liste] in parThematique" :key="thematique" :label="thematique">
										<option v-for="d in liste" :key="d.id" :value="d.id">{{ d.nom }}</option>
									</optgroup>
								</select>
							</div>

							<div>
								<label for="rdv-statut" class="text-sm font-medium text-gray-700">Statut</label>
								<select id="rdv-statut" v-model="statut" :class="inputClass">
									<option v-for="s in statuts" :key="s" :value="s">{{ s }}</option>
								</select>
								<p class="mt-1 text-xs text-gray-500">« Annulé » libère le créneau pour une autre réservation.</p>
							</div>
						</div>
					</div>

					<!-- Compte rendu après le RDV (colonnes présentes dans le document Grist) -->
					<div v-if="groupesSuivi.length" class="space-y-6">
						<div v-for="g in groupesSuivi" :key="g.id" class="space-y-4 rounded-xl border border-gray-200 p-4">
							<div>
								<h3 class="font-heading text-sm font-semibold text-gray-900">{{ g.titre }}</h3>
								<p v-if="'aide' in g" class="mt-0.5 text-xs text-gray-500">{{ g.aide }}</p>
							</div>
							<div v-for="c in g.champs" :key="c.cle">
								<template v-if="c.type === 'choix-multiples'">
									<p class="text-sm font-medium text-gray-700">{{ c.label }}</p>
									<div class="mt-1.5 flex flex-wrap gap-2" role="group" :aria-label="c.label">
										<button
											v-for="x in c.choix"
											:key="x"
											type="button"
											class="rounded-full border px-3 py-1 text-xs transition-colors"
											:class="
												(suivi[c.cle] as string[]).includes(x)
													? 'border-primary bg-primary text-white'
													: 'border-gray-300 text-gray-700 hover:border-primary hover:text-primary'
											"
											:aria-pressed="(suivi[c.cle] as string[]).includes(x)"
											@click="basculer(c.cle, x)"
										>
											{{ x }}
										</button>
									</div>
								</template>
								<template v-else-if="c.type === 'choix' && c.affichage === 'smileys'">
									<p class="text-sm font-medium text-gray-700">{{ c.label }}</p>
									<div class="mt-1.5 flex flex-wrap justify-center gap-2" role="radiogroup" :aria-label="c.label">
										<button
											v-for="(x, i) in c.choix"
											:key="x"
											type="button"
											role="radio"
											class="flex w-24 flex-col items-center gap-1 rounded-xl border-2 px-2 py-2 text-xs transition-colors"
											:class="suivi[c.cle] === x ? visage(i, c.choix.length).fond : 'border-transparent hover:bg-gray-50'"
											:aria-checked="suivi[c.cle] === x"
											:title="suivi[c.cle] === x ? 'Cliquer à nouveau pour effacer' : x"
											@click="suivi[c.cle] = suivi[c.cle] === x ? '' : x"
										>
											<i
												class="fa-solid text-3xl"
												:class="[visage(i, c.choix.length).icone, suivi[c.cle] === x || !suivi[c.cle] ? visage(i, c.choix.length).couleur : 'text-gray-200']"
												aria-hidden="true"
											></i>
											<span class="text-center leading-tight text-gray-700">{{ x }}</span>
										</button>
									</div>
								</template>
								<template v-else-if="c.type === 'choix'">
									<label :for="`rdv-suivi-${c.cle}`" class="text-sm font-medium text-gray-700">{{ c.label }}</label>
									<select :id="`rdv-suivi-${c.cle}`" v-model="suivi[c.cle]" :class="inputClass">
										<option value="">Non renseigné</option>
										<option v-for="x in c.choix" :key="x" :value="x">{{ x }}</option>
									</select>
								</template>
								<template v-else>
									<label :for="`rdv-suivi-${c.cle}`" class="text-sm font-medium text-gray-700">{{ c.label }}</label>
									<textarea :id="`rdv-suivi-${c.cle}`" v-model="suivi[c.cle]" rows="3" :class="inputClass"></textarea>
								</template>
							</div>
						</div>
					</div>
				</div>

				<p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>
				<p v-else-if="enregistre && !modifie" class="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
					<i class="fa-solid fa-circle-check mr-1" aria-hidden="true"></i>Modifications enregistrées dans Grist.
				</p>

				<div class="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-5">
					<button
						type="submit"
						:disabled="busy || !modifie"
						class="rounded-full bg-primary px-6 py-3 font-heading text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
					>
						<i v-if="busy" class="fa-solid fa-spinner fa-spin mr-1.5" aria-hidden="true"></i>{{ busy ? 'Enregistrement…' : 'Enregistrer' }}
					</button>
					<button
						type="button"
						class="rounded-full border border-gray-300 bg-white px-6 py-3 font-heading text-sm font-semibold text-gray-700 hover:bg-gray-50"
						@click="emit('close')"
					>
						Fermer
					</button>
					<button
						v-if="!suppression"
						type="button"
						class="ml-auto rounded-full border border-red-200 bg-white px-5 py-3 font-heading text-sm font-semibold text-red-700 hover:bg-red-50"
						@click="demanderSuppression"
					>
						<i class="fa-solid fa-trash mr-1.5" aria-hidden="true"></i>Supprimer
					</button>
				</div>

				<!-- Suppression : motif obligatoire (journal) -->
				<div v-if="suppression" class="space-y-4 rounded-xl border border-red-200 bg-red-50/50 p-4" role="group" aria-labelledby="rdv-suppression-titre">
					<div>
						<h3 id="rdv-suppression-titre" class="font-heading text-sm font-semibold text-red-800">Supprimer ce rendez-vous ?</h3>
						<p class="mt-0.5 text-xs text-gray-600">
							La ligne est effacée de Grist (la fiche du bénéficiaire reste), le créneau est libéré. Un rendez-vous simplement
							décommandé : préférez le statut « Annulé ».
						</p>
					</div>
					<fieldset>
						<legend class="text-sm font-medium text-gray-700">Motif</legend>
						<div class="mt-1.5 flex flex-wrap gap-2">
							<label
								v-for="m in MOTIFS_SUPPRESSION"
								:key="m"
								class="cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-red-300"
								:class="motif === m ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-red-400'"
							>
								<input v-model="motif" type="radio" name="rdv-motif" :value="m" class="sr-only" />{{ m }}
							</label>
						</div>
					</fieldset>
					<div>
						<label for="rdv-motif-precision" class="text-sm font-medium text-gray-700">
							Précision<span v-if="motif !== 'Autre'" class="font-normal text-gray-500"> (facultative)</span>
						</label>
						<input
							id="rdv-motif-precision"
							v-model="precision"
							type="text"
							maxlength="500"
							:required="motif === 'Autre'"
							:placeholder="motif.startsWith('Doublon') ? 'Ex. : doublon du RDV de 10h00' : ''"
							:class="inputClass"
						/>
					</div>
					<p v-if="suppressionErreur" class="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800" role="alert">{{ suppressionErreur }}</p>
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							:disabled="suppressionBusy || !motifValide"
							class="rounded-full bg-red-600 px-5 py-2.5 font-heading text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
							@click="supprimer"
						>
							<i v-if="suppressionBusy" class="fa-solid fa-spinner fa-spin mr-1.5" aria-hidden="true"></i
							>{{ suppressionBusy ? 'Suppression…' : 'Supprimer définitivement' }}
						</button>
						<button
							type="button"
							class="rounded-full border border-gray-300 bg-white px-5 py-2.5 font-heading text-sm font-semibold text-gray-700 hover:bg-gray-50"
							@click="annulerSuppression"
						>
							Annuler
						</button>
					</div>
				</div>
			</div>
		</form>
	</section>
</template>
