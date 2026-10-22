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
		:class="[
			'rounded-full bg-primary font-heading font-semibold text-white hover:opacity-90 disabled:opacity-60',
			compact ? 'px-4 py-1.5 text-xs' : 'px-6 py-3 text-sm',
		]"
	>
		{{ busy ? 'Envoi…' : (label ?? 'Enregistrer et publier') }}
	</button>
	<button
		type="submit"
		data-sans-publier
		:disabled="disabled || busy"
		:class="[
			'rounded-full border border-primary bg-white font-heading font-semibold text-primary hover:bg-primary/5 disabled:opacity-60',
			compact ? 'px-4 py-1.5 text-xs' : 'px-6 py-3 text-sm',
		]"
		title="La modification est enregistrée mais pas encore mise en ligne : publiez ensuite toutes les modifications en attente en une fois."
	>
		Enregistrer sans publier
	</button>
</template>
