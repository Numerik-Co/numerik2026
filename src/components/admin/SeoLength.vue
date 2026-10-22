<script setup lang="ts">
/**
 * Longueur d'un titre ou d'une description vus par les moteurs de recherche,
 * sous le champ correspondant (pages, pages du site, actualités, activités).
 * Simple repère, jamais bloquant : Google coupe un titre au-delà de
 * ~60 caractères et une description au-delà de ~160 (docs/referencement.md).
 * Variables `{{association.…}}` remplacées ; `suffix` = titre complété par
 * « · <nom de l'association> » à l'affichage (cf. layouts).
 */
import { computed } from 'vue';
import { association } from '../../lib/association';
import { applyPageVariablesText } from '../../lib/page-variables';

const props = defineProps<{ text: string; kind: 'titre' | 'description'; suffix?: boolean }>();

const LIMITS = { titre: { min: 15, max: 60 }, description: { min: 120, max: 160 } };

const tail = ` · ${association.name}`;
const length = computed(() => {
	const text = applyPageVariablesText(props.text.trim());
	return text ? text.length + (props.suffix ? tail.length : 0) : 0;
});
const limits = computed(() => LIMITS[props.kind]);
const problem = computed(() => {
	if (!length.value) return '';
	if (length.value > limits.value.max) return 'risque d’être coupé dans les résultats de recherche';
	if (length.value < limits.value.min) return 'un peu court pour les résultats de recherche';
	return '';
});
</script>

<template>
	<p v-if="length" :class="['mt-1 text-xs', problem ? 'text-amber-700' : 'font-light text-gray-500']" aria-live="polite">
		<i v-if="problem" class="fa-solid fa-triangle-exclamation mr-1" aria-hidden="true"></i>
		{{ length }} caractères{{ props.suffix ? ` avec « ${tail.trim()} » ajouté` : '' }}
		— conseillé : {{ limits.min }} à {{ limits.max }}<template v-if="problem"> ({{ problem }})</template>.
	</p>
</template>
