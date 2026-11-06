<script setup lang="ts">
/**
 * Lignes d'un devis ou d'une facture : désignation, quantité, unité, prix
 * unitaire, montant calculé ; ajout depuis le catalogue des prestations
 * (table Grist `Prestations`) ou ligne libre. `readonly` : facture émise.
 */
import { ref } from 'vue';
import { compactInputClass, iconButtonClass } from '../../../components/admin/context';
import { euros, montantLigne, totalLignes, type Ligne, type Prestation } from '../lib/types';

const lignes = defineModel<Ligne[]>({ required: true });
defineProps<{ prestations: Prestation[]; readonly?: boolean }>();

const choix = ref('');
function ajouter(p?: Prestation) {
	lignes.value = [...lignes.value, p ? { libelle: p.libelle, quantite: 1, unite: p.unite, prixUnitaire: p.prixUnitaire } : { libelle: '', quantite: 1, unite: '', prixUnitaire: 0 }];
}
function ajouterPrestation(prestations: Prestation[]) {
	const p = prestations.find((x) => String(x.id) === choix.value);
	if (p) ajouter(p);
	choix.value = '';
}
const retirer = (i: number) => (lignes.value = lignes.value.filter((_, j) => j !== i));
function deplacer(i: number, sens: -1 | 1) {
	const l = [...lignes.value];
	const j = i + sens;
	if (j < 0 || j >= l.length) return;
	[l[i], l[j]] = [l[j], l[i]];
	lignes.value = l;
}
</script>

<template>
	<div class="space-y-2">
		<div v-for="(l, i) in lignes" :key="i" class="rounded-lg border border-gray-200 p-3">
			<div class="flex items-start gap-2">
				<textarea
					v-model="l.libelle"
					rows="1"
					:readonly="readonly"
					:aria-label="`Désignation, ligne ${i + 1}`"
					placeholder="Désignation"
					:class="[compactInputClass, 'min-w-0 flex-1 resize-y']"
				></textarea>
				<template v-if="!readonly">
					<button type="button" :class="iconButtonClass" :disabled="i === 0" aria-label="Monter" title="Monter" @click="deplacer(i, -1)">
						<i class="fa-solid fa-arrow-up text-xs" aria-hidden="true"></i>
					</button>
					<button type="button" :class="[iconButtonClass, 'text-red-600']" aria-label="Retirer la ligne" title="Retirer la ligne" @click="retirer(i)">
						<i class="fa-solid fa-xmark" aria-hidden="true"></i>
					</button>
				</template>
			</div>
			<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
				<input v-model.number="l.quantite" type="number" min="0" step="any" :readonly="readonly" :aria-label="`Quantité, ligne ${i + 1}`" :class="[compactInputClass, 'w-20']" />
				<input v-model="l.unite" type="text" placeholder="unité" :readonly="readonly" :aria-label="`Unité, ligne ${i + 1}`" :class="[compactInputClass, 'w-24']" />
				<span class="text-gray-500">×</span>
				<input
					v-model.number="l.prixUnitaire"
					type="number"
					min="0"
					step="0.01"
					:readonly="readonly"
					:aria-label="`Prix unitaire, ligne ${i + 1}`"
					:class="[compactInputClass, 'w-28']"
				/>
				<span class="text-gray-500">€</span>
				<span class="ml-auto font-semibold tabular-nums">{{ euros(montantLigne(l)) }}</span>
			</div>
		</div>
		<p v-if="!lignes.length" class="text-sm font-light text-gray-500">Aucune ligne.</p>

		<div v-if="!readonly" class="flex flex-wrap items-center gap-2">
			<select v-if="prestations.length" v-model="choix" :class="[compactInputClass, 'w-auto min-w-0 flex-1']" aria-label="Ajouter une prestation du catalogue" @change="ajouterPrestation(prestations)">
				<option value="">Ajouter une prestation du catalogue…</option>
				<option v-for="p in prestations" :key="p.id" :value="String(p.id)">{{ p.libelle }} — {{ euros(p.prixUnitaire) }}{{ p.unite ? ` / ${p.unite}` : '' }}</option>
			</select>
			<button type="button" class="bouton bouton-neutre" @click="ajouter()"><i class="fa-solid fa-plus" aria-hidden="true"></i>Ligne libre</button>
		</div>

		<p class="flex justify-end gap-3 border-t border-gray-100 pt-2 text-base">
			<span class="text-gray-600">Total</span><strong class="tabular-nums">{{ euros(totalLignes(lignes)) }}</strong>
		</p>
	</div>
</template>
