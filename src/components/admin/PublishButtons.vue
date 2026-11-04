<script setup lang="ts">
/**
 * Boutons d'envoi des formulaires de contenu : « Enregistrer et publier »
 * (reconstruction du site, publie aussi les modifications en attente) et
 * « Enregistrer sans publier » (la modification rejoint le lot en attente,
 * publiée plus tard en une fois). Le formulaire distingue les deux avec
 * `isDeferredSubmit(event)` (`lot.ts`). `compact` : version réduite (bandeau).
 */
defineProps<{ label?: string; busy?: boolean; disabled?: boolean; compact?: boolean }>();
</script>

<template>
	<button
		type="submit"
		:disabled="disabled || busy"
		:class="['bouton bouton-primaire', { 'bouton-mini': compact }]"
	>
		{{ busy ? 'Envoi…' : (label ?? 'Enregistrer et publier') }}
	</button>
	<button
		type="submit"
		data-sans-publier
		:disabled="disabled || busy"
		:class="['bouton bouton-contour', { 'bouton-mini': compact }]"
		title="La modification est enregistrée mais pas encore mise en ligne : publiez ensuite toutes les modifications en attente en une fois."
	>
		Enregistrer sans publier
	</button>
</template>
