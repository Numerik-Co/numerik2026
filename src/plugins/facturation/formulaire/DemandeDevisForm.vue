<script setup lang="ts">
/**
 * Formulaire public « Demander un devis » : coordonnées, prestations
 * souhaitées (catalogue Grist, facultatif), message, accord RGPD. Envoi à
 * `/api/facturation/demande` (devis « Demande » dans Grist). Champ piège
 * `site` caché aux personnes (robots).
 */
import { onMounted, ref } from 'vue';

const props = defineProps<{ consentement: string; confirmation: string }>();

const prestations = ref<{ id: number; libelle: string; description: string }[]>([]);
const form = ref({ nom: '', societe: '', email: '', telephone: '', adresse: '', codePostal: '', ville: '', message: '', site: '' });
const choisies = ref<number[]>([]);
const accord = ref(false);
const envoi = ref(false);
const envoye = ref(false);
const erreur = ref('');

onMounted(async () => {
	try {
		const r = await fetch('/api/facturation/prestations');
		if (r.ok) prestations.value = (await r.json()).prestations ?? [];
	} catch {
		// Catalogue indisponible : la demande reste possible avec le message.
	}
});

async function envoyer() {
	erreur.value = '';
	envoi.value = true;
	try {
		const r = await fetch('/api/facturation/demande', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ ...form.value, prestationIds: choisies.value, consentement: accord.value }),
		});
		const d = await r.json().catch(() => null);
		if (!r.ok) throw new Error((d && d.error) || 'Envoi impossible, réessayez.');
		envoye.value = true;
	} catch (e) {
		erreur.value = (e as Error).message;
	} finally {
		envoi.value = false;
	}
}
</script>

<template>
	<div class="mx-auto max-w-2xl">
		<p v-if="envoye" class="alerte-succes text-base" role="status">
			<i class="fa-solid fa-circle-check mr-1.5" aria-hidden="true"></i>{{ props.confirmation }}
		</p>
		<form v-else class="space-y-5" @submit.prevent="envoyer">
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label for="dv-nom" class="champ-libelle">Prénom et nom *</label>
					<input id="dv-nom" v-model="form.nom" type="text" required autocomplete="name" class="champ mt-1" />
				</div>
				<div>
					<label for="dv-societe" class="champ-libelle">Société <span class="font-light text-gray-500">(facultatif)</span></label>
					<input id="dv-societe" v-model="form.societe" type="text" autocomplete="organization" class="champ mt-1" />
				</div>
				<div>
					<label for="dv-email" class="champ-libelle">Email *</label>
					<input id="dv-email" v-model="form.email" type="email" required autocomplete="email" class="champ mt-1" />
				</div>
				<div>
					<label for="dv-tel" class="champ-libelle">Téléphone</label>
					<input id="dv-tel" v-model="form.telephone" type="tel" autocomplete="tel" class="champ mt-1" />
				</div>
				<div class="sm:col-span-2">
					<label for="dv-adresse" class="champ-libelle">Adresse <span class="font-light text-gray-500">(pour le devis)</span></label>
					<input id="dv-adresse" v-model="form.adresse" type="text" autocomplete="street-address" class="champ mt-1" />
				</div>
				<div>
					<label for="dv-cp" class="champ-libelle">Code postal</label>
					<input id="dv-cp" v-model="form.codePostal" type="text" inputmode="numeric" autocomplete="postal-code" class="champ mt-1" />
				</div>
				<div>
					<label for="dv-ville" class="champ-libelle">Ville</label>
					<input id="dv-ville" v-model="form.ville" type="text" autocomplete="address-level2" class="champ mt-1" />
				</div>
			</div>

			<fieldset v-if="prestations.length">
				<legend class="champ-libelle">Prestations qui vous intéressent</legend>
				<div class="mt-2 grid gap-2 sm:grid-cols-2">
					<label
						v-for="p in prestations"
						:key="p.id"
						class="flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm"
						:class="choisies.includes(p.id) ? 'border-primary bg-primary/5' : 'border-gray-200'"
					>
						<input v-model="choisies" type="checkbox" :value="p.id" class="mt-1" />
						<span>
							<span class="block font-semibold text-gray-900">{{ p.libelle }}</span>
							<span v-if="p.description" class="block text-xs text-gray-600">{{ p.description }}</span>
						</span>
					</label>
				</div>
			</fieldset>

			<div>
				<label for="dv-message" class="champ-libelle">Votre besoin *</label>
				<textarea id="dv-message" v-model="form.message" rows="5" required maxlength="3000" class="champ mt-1" placeholder="Décrivez votre projet, vos délais, le lieu…"></textarea>
			</div>

			<!-- Piège à robots : invisible pour les personnes. -->
			<div class="hidden" aria-hidden="true">
				<label for="dv-site">Site web</label>
				<input id="dv-site" v-model="form.site" type="text" tabindex="-1" autocomplete="off" />
			</div>

			<label class="flex items-start gap-2 text-sm text-gray-700">
				<input v-model="accord" type="checkbox" required class="mt-1" />
				<span>{{ props.consentement }}</span>
			</label>

			<p v-if="erreur" class="alerte-erreur" role="alert">{{ erreur }}</p>
			<button type="submit" class="bouton bouton-primaire bouton-grand" :disabled="envoi">
				<i class="fa-solid" :class="envoi ? 'fa-spinner fa-spin' : 'fa-paper-plane'" aria-hidden="true"></i>
				{{ envoi ? 'Envoi…' : 'Envoyer ma demande' }}
			</button>
		</form>
	</div>
</template>
