<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { fr } from 'date-fns/locale';
import {
	GENRE_CHOICES,
	STATUT_BENEFICIAIRE_CHOICES,
	TRANCHE_AGE_CHOICES,
	ZONE_GEOGRAPHIQUE_CHOICES,
} from '../../lib/rdv/choices';
import { deduireZone } from '../../lib/rdv/geographie';
import { validatePriseRdv, hasErrors } from '../../lib/rdv/validation';
import type { Creneau, CommuneSuggestion, Demarche, PriseRdvPayload } from '../../lib/rdv/types';
import { contenuQrCode, documentsDemarches, evenementRdv, type EvenementRdv } from '../../lib/rdv/ics';
import QRCode from 'qrcode';
import { rdvApi } from './client';

function capitaliser(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

const FUSEAU = 'Europe/Paris';

/** yyyy-mm-dd -> Date à midi UTC, pour éviter tout glissement de jour. */
function isoToDate(dateIso: string): Date {
	return new Date(`${dateIso}T12:00:00Z`);
}

/** Date -> yyyy-mm-dd (fuseau association), symétrique de `isoToDate`. */
function dateToIso(date: Date): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU }).format(date);
}

function libelleJour(dateIso: string): string {
	return capitaliser(
		new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(isoToDate(dateIso)),
	);
}

// --- Étapes : même logique que AdhesionForm.vue (bloc actif en bleu, les
// suivants n'apparaissent qu'une fois l'étape précédente validée, pas de
// bouton « précédent »). ---
const step = ref(1);

function cardCls(n: number): string {
	return step.value === n ? 'border-primary' : 'border-gray-100';
}

function badgeCls(n: number): string {
	return step.value > n ? 'bg-primary text-white' : 'bg-primary/10 text-primary';
}

const form = reactive({
	demarcheIds: [] as number[],
	commentaire: '',
	nom: '',
	prenom: '',
	email: '',
	telephone: '',
	genre: '' as (typeof GENRE_CHOICES)[number] | '',
	commune: '',
	codePostal: '',
	zoneGeographique: '' as (typeof ZONE_GEOGRAPHIQUE_CHOICES)[number] | '',
	trancheAge: '' as (typeof TRANCHE_AGE_CHOICES)[number] | '',
	statut: '' as (typeof STATUT_BENEFICIAIRE_CHOICES)[number] | '',
	consentement: false,
});

const errors = ref<Record<string, string | undefined>>({});

const champBase =
	'mt-1 w-full rounded-lg border px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary/20';

function champCls(champ: string): string {
	return `${champBase} ${errors.value[champ] ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-primary'}`;
}

// --- Démarches (bloc 1) : catalogue Grist (table Demarches), pas les
// thématiques génériques — le bénéficiaire choisit un besoin concret,
// déjà rattaché à une thématique pour les statistiques (cf. reservation.ts).
const demarches = ref<Demarche[]>([]);
const etatDemarches = ref<'chargement' | 'ok' | 'erreur'>('chargement');

rdvApi
	.demarches()
	.then((data) => {
		demarches.value = data;
		etatDemarches.value = 'ok';
	})
	.catch(() => {
		etatDemarches.value = 'erreur';
	});

// Une seule démarche à la fois : le créneau est fixé à 30 minutes.
function choisirDemarche(id: number) {
	form.demarcheIds = [id];
}

const demarchesResume = computed(() =>
	demarches.value
		.filter((d) => form.demarcheIds.includes(d.id))
		.map((d) => d.nom)
		.join(', '),
);

/** Documents à apporter pour la/les démarche(s) choisie(s) — une ligne par document, tous confondus. */
const documentsRappel = computed(() =>
	documentsDemarches(demarches.value.filter((d) => form.demarcheIds.includes(d.id))),
);

/**
 * Valide `construirePayload()` pour les seuls champs de l'étape en cours.
 * En cas de succès, on repart d'un objet d'erreurs vide : sinon les erreurs
 * des champs pas encore affichés (étapes suivantes) resteraient en mémoire
 * et s'afficheraient dès que ces blocs apparaissent.
 */
function peutAvancer(champs: (keyof PriseRdvPayload)[]): boolean {
	const e = validatePriseRdv(construirePayload());
	const ok = champs.every((c) => !e[c]);
	errors.value = ok ? {} : e;
	return ok;
}

function continuerBesoin() {
	if (peutAvancer(['demarcheIds'])) step.value = 2;
}

function continuerCreneau() {
	if (peutAvancer(['heure'])) step.value = 3;
}

function continuerCoordonnees() {
	if (peutAvancer(['nom', 'prenom', 'email', 'telephone'])) step.value = 4;
}

function continuerProfil() {
	errors.value = {};
	step.value = 5;
}

// --- Créneau : petit calendrier (choix du jour) + créneaux du jour choisi ---
const creneaux = ref<Creneau[]>([]);
const etatCreneaux = ref<'chargement' | 'ok' | 'erreur'>('chargement');
const creneauChoisi = ref<Creneau | null>(null);
const dateChoisie = ref<Date | null>(null);

const parJour = computed(() => {
	const m = new Map<string, Creneau[]>();
	for (const c of creneaux.value) {
		if (!m.has(c.date)) m.set(c.date, []);
		m.get(c.date)!.push(c);
	}
	return m;
});

/** Jours où au moins un créneau reste libre — reçoivent un marqueur dans le calendrier. */
const joursDisponibles = computed(() => {
	const s = new Set<string>();
	for (const c of creneaux.value) if (c.disponible) s.add(c.date);
	return s;
});

const marqueurs = computed(() =>
	[...joursDisponibles.value].map((date) => ({ date: isoToDate(date), type: 'dot' as const, color: '#2f7fc1' })),
);

const minDate = computed(() => (creneaux.value.length ? isoToDate(creneaux.value[0].date) : undefined));
const maxDate = computed(() =>
	creneaux.value.length ? isoToDate(creneaux.value[creneaux.value.length - 1].date) : undefined,
);

/** Seuls les jours de permanence (présents dans `creneaux`) sont sélectionnables. */
function dateDesactivee(date: Date): boolean {
	return !parJour.value.has(dateToIso(date));
}

const creneauxDuJour = computed(() => {
	if (!dateChoisie.value) return [];
	return parJour.value.get(dateToIso(dateChoisie.value)) ?? [];
});

const libelleJourChoisi = computed(() => (dateChoisie.value ? libelleJour(dateToIso(dateChoisie.value)) : ''));

rdvApi
	.creneaux()
	.then((data) => {
		creneaux.value = data;
		etatCreneaux.value = 'ok';
		// Présélectionne le premier jour où un créneau reste libre, pour éviter
		// un calendrier vide à l'ouverture.
		const premier = data.find((c) => c.disponible)?.date;
		if (premier) dateChoisie.value = isoToDate(premier);
	})
	.catch(() => {
		etatCreneaux.value = 'erreur';
	});

// Change de jour -> le créneau déjà choisi ne correspond plus, on redemande.
watch(dateChoisie, (date) => {
	if (date && creneauChoisi.value?.date === dateToIso(date)) return;
	creneauChoisi.value = null;
});

function choisirCreneau(c: Creneau) {
	if (!c.disponible) return;
	creneauChoisi.value = c;
}

const creneauChoisiLabel = computed(() => {
	if (!creneauChoisi.value) return '';
	return `${libelleJour(creneauChoisi.value.date)} à ${creneauChoisi.value.heure}`;
});

// --- Rappel affiché après envoi : date et horaires mis en exergue ---
const rappelDate = computed(() => {
	if (!creneauChoisi.value) return '';
	return capitaliser(
		new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
			isoToDate(creneauChoisi.value.date),
		),
	);
});

/** "09:00" -> "9 h" / "09:30" -> "9 h 30", avec la fin du créneau (30 min). */
function libelleHeure(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

const rappelHoraires = computed(() => {
	if (!creneauChoisi.value) return '';
	const [h, m] = creneauChoisi.value.heure.split(':').map(Number);
	const debut = h * 60 + m;
	return `${libelleHeure(debut)} – ${libelleHeure(debut + 30)}`;
});

const demarchesChoisies = computed(() => demarches.value.filter((d) => form.demarcheIds.includes(d.id)));

// --- Ajout à l'agenda du téléphone : fichier .ics + QR code ---
const evenementCourant = computed<EvenementRdv | null>(() =>
	creneauChoisi.value
		? evenementRdv(creneauChoisi.value.date, creneauChoisi.value.heure, creneauChoisi.value.lieu, demarchesChoisies.value)
		: null,
);

/** Le .ics est servi par `/api/rdv/ics` : iOS l'ouvre directement dans Calendrier. */
const lienIcs = computed(() => {
	if (!creneauChoisi.value) return '';
	const q = new URLSearchParams({ date: creneauChoisi.value.date, heure: creneauChoisi.value.heure });
	for (const id of form.demarcheIds) q.append('demarche', String(id));
	return `/api/rdv/ics?${q}`;
});

const qrCodeSvg = ref('');

async function genererQrCode() {
	if (!evenementCourant.value) return;
	try {
		qrCodeSvg.value = await QRCode.toString(contenuQrCode(evenementCourant.value), {
			type: 'svg',
			errorCorrectionLevel: 'L',
			margin: 1,
		});
	} catch {
		qrCodeSvg.value = '';
	}
}

// --- Autocomplétion commune (profil géographique) ---
// `form.commune` est directement le champ de recherche — comme
// `MembreFields.vue` (adhésion) pour `adresse` : si l'API n'a pas de
// correspondance ou que le choix n'est pas cliqué, la saisie libre reste.
// Le code postal n'est plus un champ visible : il est capturé en même temps
// que la commune (choisirCommune), uniquement pour affiner `deduireZone()`.
const suggestionsCommune = ref<CommuneSuggestion[]>([]);
const communeOuverte = ref(false);
let debounceCommune: ReturnType<typeof setTimeout> | undefined;

function onCommuneInput() {
	clearTimeout(debounceCommune);
	const q = form.commune.trim();
	if (q.length < 2) {
		suggestionsCommune.value = [];
		return;
	}
	debounceCommune = setTimeout(async () => {
		try {
			suggestionsCommune.value = await rdvApi.communes(q);
			communeOuverte.value = suggestionsCommune.value.length > 0;
		} catch {
			suggestionsCommune.value = [];
			communeOuverte.value = false;
		}
	}, 300);
}

function choisirCommune(s: CommuneSuggestion) {
	form.commune = s.commune;
	form.codePostal = s.codePostal;
	form.zoneGeographique = deduireZone(s.commune, s.codePostal) || form.zoneGeographique;
	communeOuverte.value = false;
	suggestionsCommune.value = [];
}

const coordonneesResume = computed(() => [form.email, form.telephone].filter(Boolean).join(' — '));

const profilResume = computed(() => {
	const items = [form.commune, form.zoneGeographique, form.trancheAge, form.statut].filter(Boolean);
	return items.length ? items.join(' · ') : 'Non renseigné';
});

const etatEnvoi = ref<'idle' | 'busy' | 'ok' | 'erreur'>('idle');
const messageErreur = ref('');

function construirePayload(): PriseRdvPayload {
	return {
		nom: form.nom.trim(),
		prenom: form.prenom.trim(),
		email: form.email.trim(),
		telephone: form.telephone.trim(),
		date: creneauChoisi.value?.date ?? '',
		heure: creneauChoisi.value?.heure ?? '',
		genre: form.genre || undefined,
		commune: form.commune.trim() || undefined,
		codePostal: form.codePostal.trim() || undefined,
		zoneGeographique: form.zoneGeographique || undefined,
		trancheAge: form.trancheAge || undefined,
		statut: form.statut || undefined,
		demarcheIds: form.demarcheIds,
		commentaire: form.commentaire.trim() || undefined,
		consentement: form.consentement,
	};
}

async function envoyer() {
	const payload = construirePayload();
	const e = validatePriseRdv(payload);
	errors.value = e;
	if (hasErrors(e)) return;

	etatEnvoi.value = 'busy';
	messageErreur.value = '';
	try {
		const res = await rdvApi.prendre(payload);
		if (res.status === 'complet') {
			messageErreur.value = 'Ce créneau vient d’être pris, merci d’en choisir un autre.';
			etatEnvoi.value = 'erreur';
			creneauChoisi.value = null;
			etatCreneaux.value = 'chargement';
			creneaux.value = await rdvApi.creneaux();
			etatCreneaux.value = 'ok';
			return;
		}
		if (res.status === 'demarches_invalides') {
			messageErreur.value = 'Une démarche sélectionnée n’est plus disponible, merci de recharger la page.';
			etatEnvoi.value = 'erreur';
			return;
		}
		etatEnvoi.value = 'ok';
		genererQrCode();
	} catch (err) {
		messageErreur.value = err instanceof Error ? err.message : 'Une erreur est survenue.';
		etatEnvoi.value = 'erreur';
	}
}
</script>

<template>
	<div class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
		<div v-if="etatEnvoi === 'ok'" class="mx-auto max-w-2xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
			<div class="text-center">
				<i class="fa-solid fa-circle-check text-3xl text-primary" aria-hidden="true"></i>
				<h2 class="mt-4 font-heading text-lg text-gray-900">RDV confirmé !</h2>
				<p class="mt-1 text-sm text-gray-600">Voici le rappel de votre rendez-vous avec la conseillère numérique.</p>
			</div>

			<!-- Date et heure mises en exergue -->
			<div class="mt-6 rounded-xl bg-primary px-6 py-5 text-center text-white">
				<p class="text-xs font-medium uppercase tracking-wider text-white/80">
					<i class="fa-regular fa-calendar mr-1" aria-hidden="true"></i>Votre rendez-vous
				</p>
				<p class="mt-2 font-heading text-xl sm:text-2xl">{{ rappelDate }}</p>
				<p class="mt-1 font-heading text-3xl sm:text-4xl">
					<i class="fa-regular fa-clock mr-2 text-2xl sm:text-3xl" aria-hidden="true"></i>{{ rappelHoraires }}
				</p>
			</div>

			<dl class="mt-6 space-y-3 text-sm">
				<div v-if="creneauChoisi?.lieu" class="flex gap-3">
					<dt class="w-5 shrink-0 text-center text-primary">
						<i class="fa-solid fa-location-dot" aria-hidden="true"></i><span class="sr-only">Lieu</span>
					</dt>
					<dd class="text-gray-900">{{ creneauChoisi.lieu }}</dd>
				</div>
				<div v-for="d in demarchesChoisies" :key="d.id" class="flex gap-3">
					<dt class="w-5 shrink-0 text-center text-primary">
						<i class="fa-solid" :class="d.icone || 'fa-list-check'" aria-hidden="true"></i
						><span class="sr-only">Démarche</span>
					</dt>
					<dd class="text-gray-900">
						{{ d.nom }}
						<span v-if="form.commentaire.trim()" class="mt-0.5 block text-gray-500">{{ form.commentaire.trim() }}</span>
					</dd>
				</div>
			</dl>

			<div v-if="documentsRappel.length" class="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-gray-700">
				<p class="font-medium text-gray-900">
					<i class="fa-solid fa-clipboard-list mr-2 text-amber-600" aria-hidden="true"></i>Pièces à apporter pour
					réaliser la démarche :
				</p>
				<ul class="mt-2 list-disc pl-5">
					<li v-for="(doc, i) in documentsRappel" :key="i">{{ doc }}</li>
				</ul>
			</div>

			<div class="mt-6 text-center">
				<a
					:href="lienIcs"
					class="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary/90"
				>
					<i class="fa-solid fa-calendar-plus" aria-hidden="true"></i>Ajouter à mon agenda
				</a>
			</div>

			<div v-if="qrCodeSvg" class="mt-6 hidden items-center gap-5 rounded-lg border border-gray-100 p-4 sm:flex">
				<div class="h-36 w-36 shrink-0" v-html="qrCodeSvg" role="img" aria-label="QR code du rendez-vous"></div>
				<p class="text-sm text-gray-600">
					<span class="font-medium text-gray-900">Vous avez réservé sur un ordinateur ?</span><br />
					Scannez ce code avec l’appareil photo de votre téléphone pour ajouter le rendez-vous à votre agenda.
				</p>
			</div>

			<p class="mt-6 text-center text-xs text-gray-500">
				Vous pouvez aussi noter ce rendez-vous ou faire une capture d’écran de ce rappel.
			</p>
		</div>

		<form v-else class="space-y-6" @submit.prevent="envoyer">
			<!-- 1. Besoin -->
			<div class="rounded-2xl border bg-white p-6 shadow-sm" :class="cardCls(1)">
				<div class="flex items-center gap-3">
					<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-heading text-sm" :class="badgeCls(1)">
						<i v-if="step > 1" class="fa-solid fa-check" aria-hidden="true"></i>
						<span v-else>1</span>
					</span>
					<h2 class="font-heading text-lg text-gray-900">De quoi avez-vous besoin ?</h2>
				</div>

				<template v-if="step === 1">
					<p class="mt-1 text-sm text-gray-600">
						Sélectionnez une démarche — le rendez-vous dure 30 minutes, ce qui ne permet d'en traiter qu'une seule.
					</p>

					<p v-if="etatDemarches === 'chargement'" class="mt-4 text-sm text-gray-500">Chargement…</p>
					<p v-else-if="etatDemarches === 'erreur'" class="mt-4 text-sm text-red-600">
						Impossible de charger les démarches proposées pour l'instant. Réessayez dans un instant.
					</p>
					<p v-else-if="!demarches.length" class="mt-4 text-sm text-gray-600">
						Aucune démarche disponible pour le moment — contactez-nous directement.
					</p>
					<div v-else class="mt-4 grid gap-2 sm:grid-cols-2">
						<label
							v-for="d in demarches"
							:key="d.id"
							class="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm"
							:class="form.demarcheIds.includes(d.id) ? 'border-primary bg-primary/5' : ''"
						>
							<input
								type="radio"
								name="demarche"
								:checked="form.demarcheIds.includes(d.id)"
								class="sr-only"
								@change="choisirDemarche(d.id)"
							/>
							<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
								<i class="fa-solid" :class="d.icone" aria-hidden="true"></i>
							</span>
							<span>
								<span class="block font-medium text-gray-900">{{ d.nom }}</span>
								<span class="block text-xs text-gray-500">{{ d.thematique }}</span>
							</span>
						</label>
					</div>
					<p v-if="errors.demarcheIds" class="mt-3 text-sm text-red-600">{{ errors.demarcheIds }}</p>

					<div class="mt-4">
						<label class="text-sm font-medium text-gray-700">Un mot pour préparer votre venue ? (facultatif)</label>
						<textarea v-model="form.commentaire" rows="3" :class="champCls('commentaire')"></textarea>
					</div>

					<button
						type="button"
						:disabled="!form.demarcheIds.length"
						class="mt-6 rounded-full bg-accent px-6 py-2.5 font-heading font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
						@click="continuerBesoin"
					>
						Continuer
					</button>
				</template>
				<p v-else-if="step > 1" class="mt-3 text-sm text-gray-600">
					{{ demarchesResume }} <span class="text-gray-400">— enregistré</span>
				</p>
			</div>

			<!-- 2. Créneau -->
			<div v-if="step >= 2" class="rounded-2xl border bg-white p-6 shadow-sm" :class="cardCls(2)">
				<div class="flex items-center gap-3">
					<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-heading text-sm" :class="badgeCls(2)">
						<i v-if="step > 2" class="fa-solid fa-check" aria-hidden="true"></i>
						<span v-else>2</span>
					</span>
					<h2 class="font-heading text-lg text-gray-900">Choisissez un créneau</h2>
				</div>

				<template v-if="step === 2">
					<p class="mt-1 text-sm text-gray-600">Permanences de 30 minutes avec la conseillère numérique.</p>

					<p v-if="etatCreneaux === 'chargement'" class="mt-4 text-sm text-gray-500">Chargement des créneaux…</p>
					<p v-else-if="etatCreneaux === 'erreur'" class="mt-4 text-sm text-red-600">
						Impossible de charger les créneaux pour l'instant. Réessayez dans un instant.
					</p>
					<p v-else-if="!creneaux.length" class="mt-4 text-sm text-gray-600">
						Aucun créneau disponible pour le moment — contactez-nous directement.
					</p>
					<div v-else class="mt-4 grid gap-6 sm:grid-cols-2">
						<div class="rdv-calendrier">
							<VueDatePicker
								v-model="dateChoisie"
								inline
								auto-apply
								:locale="fr"
								:week-start="1"
								:enable-time-picker="false"
								:clearable="false"
								:hide-offset-dates="true"
								:min-date="minDate"
								:max-date="maxDate"
								:disabled-dates="dateDesactivee"
								:markers="marqueurs"
							/>
						</div>
						<div>
							<p v-if="!dateChoisie" class="text-sm text-gray-500">Choisissez une date dans le calendrier.</p>
							<template v-else>
								<p class="text-sm font-medium text-gray-900">{{ libelleJourChoisi }}</p>
								<p v-if="!creneauxDuJour.length" class="mt-3 text-sm text-gray-500">Aucun créneau ce jour-là.</p>
								<div v-else class="mt-3 flex flex-wrap gap-2">
									<button
										v-for="c in creneauxDuJour"
										:key="c.heure"
										type="button"
										:disabled="!c.disponible"
										class="rounded-full border px-4 py-1.5 text-sm transition-colors"
										:class="
											creneauChoisi?.date === c.date && creneauChoisi?.heure === c.heure
												? 'border-primary bg-primary text-white'
												: c.disponible
													? 'border-gray-300 text-gray-700 hover:border-primary hover:text-primary'
													: 'cursor-not-allowed border-gray-100 text-gray-300 line-through'
										"
										@click="choisirCreneau(c)"
									>
										{{ c.heure }}
									</button>
								</div>
							</template>
						</div>
					</div>
					<p v-if="errors.heure" class="mt-3 text-sm text-red-600">{{ errors.heure }}</p>

					<button
						type="button"
						:disabled="!creneauChoisi"
						class="mt-6 rounded-full bg-accent px-6 py-2.5 font-heading font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
						@click="continuerCreneau"
					>
						Continuer
					</button>
				</template>
				<p v-else-if="step > 2" class="mt-3 text-sm text-gray-600">
					{{ creneauChoisiLabel }}
					<template v-if="creneauChoisi?.lieu"> — {{ creneauChoisi.lieu }}</template>
					<span class="text-gray-400">— enregistré</span>
				</p>
			</div>

			<!-- 3. Coordonnées -->
			<div v-if="step >= 3" class="rounded-2xl border bg-white p-6 shadow-sm" :class="cardCls(3)">
				<div class="flex items-center gap-3">
					<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-heading text-sm" :class="badgeCls(3)">
						<i v-if="step > 3" class="fa-solid fa-check" aria-hidden="true"></i>
						<span v-else>3</span>
					</span>
					<h2 class="font-heading text-lg text-gray-900">Vos coordonnées</h2>
				</div>

				<template v-if="step === 3">
					<div class="mt-4 grid gap-4 sm:grid-cols-3">
						<div>
							<label class="text-sm font-medium text-gray-700">Civilité</label>
							<select v-model="form.genre" :class="champCls('genre')">
								<option value="">Autre</option>
								<option value="Masculin">M.</option>
								<option value="Féminin">Mme</option>
							</select>
						</div>
						<div>
							<label class="text-sm font-medium text-gray-700">Prénom</label>
							<input v-model="form.prenom" type="text" :class="champCls('prenom')" />
							<p v-if="errors.prenom" class="mt-1 text-xs text-red-600">{{ errors.prenom }}</p>
						</div>
						<div>
							<label class="text-sm font-medium text-gray-700">Nom</label>
							<input v-model="form.nom" type="text" :class="champCls('nom')" />
							<p v-if="errors.nom" class="mt-1 text-xs text-red-600">{{ errors.nom }}</p>
						</div>
					</div>

					<p class="mt-4 text-sm text-gray-600">
						Pour être prévenu·e en cas de besoin (confirmation, rappel, imprévu), indiquez au moins un e-mail ou un
						numéro de téléphone — les deux ne sont pas obligatoires.
					</p>

					<div class="mt-4 grid gap-4 sm:grid-cols-2">
						<div>
							<label class="text-sm font-medium text-gray-700">E-mail</label>
							<input v-model="form.email" type="email" :class="champCls('email')" />
							<p v-if="errors.email" class="mt-1 text-xs text-red-600">{{ errors.email }}</p>
						</div>
						<div>
							<label class="text-sm font-medium text-gray-700">Téléphone</label>
							<input v-model="form.telephone" type="tel" :class="champCls('telephone')" />
							<p v-if="errors.telephone" class="mt-1 text-xs text-red-600">{{ errors.telephone }}</p>
						</div>
					</div>

					<button
						type="button"
						class="mt-6 rounded-full bg-accent px-6 py-2.5 font-heading font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
						@click="continuerCoordonnees"
					>
						Continuer
					</button>
				</template>
				<p v-else-if="step > 3" class="mt-3 text-sm text-gray-600">
					{{ form.prenom }} {{ form.nom }}
					<template v-if="coordonneesResume"> — {{ coordonneesResume }}</template>
					<span class="text-gray-400">— enregistré</span>
				</p>
			</div>

			<!-- 4. Profil (facultatif) -->
			<div v-if="step >= 4" class="rounded-2xl border bg-white p-6 shadow-sm" :class="cardCls(4)">
				<div class="flex items-center gap-3">
					<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-heading text-sm" :class="badgeCls(4)">
						<i v-if="step > 4" class="fa-solid fa-check" aria-hidden="true"></i>
						<span v-else>4</span>
					</span>
					<h2 class="font-heading text-lg text-gray-900">Votre profil</h2>
				</div>

				<template v-if="step === 4">
					<p class="mt-1 text-sm text-gray-600">
						Facultatif — ces informations anonymes nous aident à mieux connaître les besoins du territoire.
					</p>

					<div class="relative mt-4">
						<label class="text-sm font-medium text-gray-700">Commune de résidence</label>
						<input
							v-model.trim="form.commune"
							type="text"
							autocomplete="off"
							placeholder="Commencez à taper, puis choisissez dans la liste…"
							:class="champCls('commune')"
							@input="onCommuneInput"
							@focus="communeOuverte = suggestionsCommune.length > 0"
							@blur="communeOuverte = false"
						/>
						<ul
							v-if="communeOuverte"
							class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
						>
							<li v-for="s in suggestionsCommune" :key="s.label">
								<button
									type="button"
									class="block w-full px-3 py-2 text-left text-sm hover:bg-primary/5"
									@mousedown.prevent="choisirCommune(s)"
								>
									{{ s.label }} <span class="text-gray-400">({{ s.codePostal }})</span>
								</button>
							</li>
						</ul>
					</div>

					<div v-if="form.commune" class="mt-4">
						<label class="text-sm font-medium text-gray-700">Origine géographique</label>
						<div class="mt-2 flex flex-wrap gap-2">
							<button
								v-for="z in ZONE_GEOGRAPHIQUE_CHOICES"
								:key="z"
								type="button"
								class="rounded-full border px-4 py-1.5 text-sm transition-colors"
								:class="
									form.zoneGeographique === z
										? 'border-primary bg-primary text-white'
										: 'border-gray-300 text-gray-700 hover:border-primary hover:text-primary'
								"
								@click="form.zoneGeographique = z"
							>
								{{ z }}
							</button>
						</div>
					</div>

					<div class="mt-4 grid gap-4 sm:grid-cols-2">
						<div>
							<label class="text-sm font-medium text-gray-700">Tranche d'âge</label>
							<select v-model="form.trancheAge" :class="champCls('trancheAge')">
								<option value="">Non communiqué</option>
								<option v-for="t in TRANCHE_AGE_CHOICES" :key="t" :value="t">{{ t }}</option>
							</select>
						</div>
						<div>
							<label class="text-sm font-medium text-gray-700">Statut</label>
							<select v-model="form.statut" :class="champCls('statut')">
								<option value="">Non communiqué</option>
								<option v-for="s in STATUT_BENEFICIAIRE_CHOICES" :key="s" :value="s">{{ s }}</option>
							</select>
						</div>
					</div>

					<button
						type="button"
						class="mt-6 rounded-full bg-accent px-6 py-2.5 font-heading font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
						@click="continuerProfil"
					>
						Continuer
					</button>
				</template>
				<p v-else-if="step > 4" class="mt-3 text-sm text-gray-600">
					{{ profilResume }} <span class="text-gray-400">— enregistré</span>
				</p>
			</div>

			<!-- 5. Consentement + envoi -->
			<div v-if="step >= 5" class="rounded-2xl border bg-white p-6 shadow-sm" :class="cardCls(5)">
				<div class="flex items-center gap-3">
					<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-heading text-sm" :class="badgeCls(5)">
						5
					</span>
					<h2 class="font-heading text-lg text-gray-900">Dernière étape</h2>
				</div>

				<div v-if="documentsRappel.length" class="mt-4 rounded-lg bg-primary/5 p-4 text-sm text-gray-700">
					<p class="font-medium text-gray-900">
						<i class="fa-solid fa-clipboard-list mr-2 text-primary" aria-hidden="true"></i>Pensez à apporter le jour du
						rendez-vous :
					</p>
					<ul class="mt-2 list-disc pl-5">
						<li v-for="(doc, i) in documentsRappel" :key="i">{{ doc }}</li>
					</ul>
				</div>

				<label class="mt-4 flex items-start gap-3 text-sm text-gray-700">
					<input v-model="form.consentement" type="checkbox" class="mt-0.5 accent-primary" />
					J'accepte que mes informations soient conservées par l'association pour l'organisation de ce
					rendez-vous et les statistiques du dispositif Conseiller Numérique.
				</label>
				<p v-if="errors.consentement" class="mt-1 text-xs text-red-600">{{ errors.consentement }}</p>

				<p v-if="messageErreur" class="mt-4 text-sm text-red-600">{{ messageErreur }}</p>

				<button
					type="submit"
					:disabled="etatEnvoi === 'busy'"
					class="mt-4 w-full rounded-full bg-accent px-5 py-2.5 text-sm font-heading font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
				>
					{{ etatEnvoi === 'busy' ? 'Envoi…' : 'Confirmer le rendez-vous' }}
				</button>
			</div>
		</form>
	</div>
</template>

<style scoped>
/* Réaccorde le calendrier (vue-datepicker) sur les couleurs du site — voir src/styles/global.css. */
.rdv-calendrier {
	--dp-primary-color: #2f7fc1;
	--dp-primary-text-color: #ffffff;
	--dp-border-radius: 0.75rem;
	--dp-cell-border-radius: 0.5rem;
	--dp-font-family: inherit;
}
</style>
