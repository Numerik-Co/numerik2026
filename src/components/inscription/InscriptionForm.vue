<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { adhesionApi } from '../adhesion/client';
import EtapeProfil from './EtapeProfil.vue';
import EtapeActivite from './EtapeActivite.vue';
import EtapeRecap from './EtapeRecap.vue';
import type {
	ActiviteOption,
	ExterieurPayload,
	Genre,
	MembreCandidat,
	Profil,
} from '../../lib/adhesion/types';

type Step = 'profil' | 'activite' | 'recap';

const emptyExterieur = (): ExterieurPayload => ({
	genre: '' as Genre, // radio non pré-coché ; le serveur valide la valeur
	nom: '',
	prenom: '',
	telephone: '',
});

const step = ref<Step>('profil');
const profil = ref<Profil>('');

const adherent = reactive({ nom: '', prenom: '' });
const exterieur = reactive<ExterieurPayload>(emptyExterieur());

const candidats = ref<MembreCandidat[]>([]);
const introuvable = ref(false);

const membreId = ref<number | null>(null);
const membreLabel = ref('');

const activites = ref<ActiviteOption[]>([]);
const activiteId = ref<number | null>(null);
const activiteLabel = ref('');
const prix = ref<number | null>(null);
const disponibilite = ref('');

const busy = ref(false);
const error = ref('');

/** Nom de l'activité passé en paramètre depuis la page d'une activité, pour présélection. */
const activitePreselection = ref('');

onMounted(() => {
	activitePreselection.value = new URLSearchParams(window.location.search).get('activite') ?? '';
});

function normalize(v: string): string {
	return v
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.trim();
}

function messageOf(e: unknown): string {
	return e instanceof Error ? e.message : 'Une erreur est survenue, réessayez.';
}

async function submitAdherent() {
	busy.value = true;
	error.value = '';
	candidats.value = [];
	introuvable.value = false;
	try {
		const res = await adhesionApi.retrouverMembre({ ...adherent });
		if (res.status === 'introuvable') {
			introuvable.value = true;
			return;
		}
		if (res.status === 'ambigu') {
			candidats.value = res.candidats;
			return;
		}
		// `res.prenom`/`res.nom` peuvent être ceux du·de la responsable du foyer
		// (résolution silencieuse côté API, pour l'adhésion) : on affiche ici le
		// nom du membre réellement inscrit à l'activité, tel que saisi.
		identifier(res.membreId, `${adherent.prenom} ${adherent.nom}`.trim());
	} catch (e) {
		error.value = messageOf(e);
	} finally {
		busy.value = false;
	}
}

function choisirCandidat(c: MembreCandidat) {
	candidats.value = [];
	identifier(c.membreId, `${c.prenom} ${c.nom}`.trim());
}

async function submitExterieur() {
	busy.value = true;
	error.value = '';
	try {
		const res = await adhesionApi.creerParticipantExterieur({ ...exterieur });
		identifier(res.membreId, `${res.prenom} ${res.nom}`.trim());
	} catch (e) {
		error.value = messageOf(e);
	} finally {
		busy.value = false;
	}
}

async function identifier(id: number, label: string) {
	membreId.value = id;
	membreLabel.value = label;
	step.value = 'activite';
	if (activites.value.length === 0) {
		busy.value = true;
		try {
			activites.value = await adhesionApi.activites();
			preselectionnerActivite();
		} catch (e) {
			error.value = messageOf(e);
		} finally {
			busy.value = false;
		}
	} else {
		preselectionnerActivite();
	}
}

function preselectionnerActivite() {
	if (!activitePreselection.value || activiteId.value !== null) return;
	const cible = normalize(activitePreselection.value);
	const match = activites.value.find((o) => normalize(o.label) === cible);
	if (match) activiteId.value = match.id;
}

async function submitActivite(id: number) {
	if (membreId.value === null) return;
	busy.value = true;
	error.value = '';
	try {
		const res = await adhesionApi.enregistrerActivite({ membreId: membreId.value, activiteId: id });
		const option = activites.value.find((a) => a.id === id);
		activiteLabel.value = option?.label ?? '';
		prix.value = option?.prix ?? null;
		disponibilite.value = res.disponibilite;
		step.value = 'recap';
	} catch (e) {
		error.value = messageOf(e);
	} finally {
		busy.value = false;
	}
}

function recommencer() {
	step.value = 'profil';
	profil.value = '';
	Object.assign(adherent, { nom: '', prenom: '' });
	Object.assign(exterieur, emptyExterieur());
	candidats.value = [];
	introuvable.value = false;
	membreId.value = null;
	membreLabel.value = '';
	activiteId.value = null;
	activiteLabel.value = '';
	prix.value = null;
	disponibilite.value = '';
	error.value = '';
}

function annuler() {
	if (busy.value) return;
	if (!window.confirm('Effacer toutes les informations saisies et recommencer ?')) return;
	recommencer();
}
</script>

<template>
	<div class="mx-auto max-w-3xl">
		<ol class="space-y-4">
			<EtapeProfil
				v-model:profil="profil"
				:adherent="adherent"
				:exterieur="exterieur"
				:active="step === 'profil'"
				:done="step !== 'profil'"
				:busy="busy"
				:candidats="candidats"
				:introuvable="introuvable"
				:membre-label="membreLabel"
				@submit-adherent="submitAdherent"
				@submit-exterieur="submitExterieur"
				@choisir="choisirCandidat"
			/>

			<EtapeActivite
				v-if="step === 'activite' || step === 'recap'"
				v-model:activite-id="activiteId"
				:options="activites"
				:active="step === 'activite'"
				:done="step === 'recap'"
				:busy="busy"
				:activite-label="activiteLabel"
				@submit="submitActivite"
			/>

			<EtapeRecap
				v-if="step === 'recap'"
				:membre-label="membreLabel"
				:exterieur="profil === 'exterieur'"
				:activite-label="activiteLabel"
				:prix="prix"
				:disponibilite="disponibilite"
				@recommencer="recommencer"
			/>
		</ol>

		<p v-if="error" class="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
			{{ error }}
		</p>

		<div v-if="step !== 'recap'" class="mt-6 text-center">
			<button
				type="button"
				class="text-sm font-medium text-gray-500 hover:text-red-600 disabled:opacity-50"
				:disabled="busy"
				@click="annuler"
			>
				Annuler et tout effacer
			</button>
		</div>
	</div>
</template>
