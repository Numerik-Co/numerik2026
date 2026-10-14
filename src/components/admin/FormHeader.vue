<script setup lang="ts">
/**
 * En-tête d'un formulaire de module : bouton de retour à la liste (couleur
 * accent, même style que les boutons du site) puis l'élément en cours
 * (« Modification » / « Création » + son titre, qui suit la saisie du champ
 * Titre — titre enregistré ou « Nouvelle … » s'il est vide) pour savoir où
 * l'on se trouve. Actualités, Pages, Activités, Comptes.
 */
const props = defineProps<{ back: string; title: string; editing: boolean }>();
const emit = defineEmits<{ back: [] }>();
</script>

<template>
	<div class="mb-5">
		<button
			type="button"
			class="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 font-heading text-sm font-semibold text-white transition-opacity hover:opacity-90"
			@click="emit('back')"
		>
			<i class="fa-solid fa-arrow-left text-xs" aria-hidden="true"></i>
			{{ props.back }}
		</button>
		<p class="mt-4 text-xs font-medium uppercase tracking-wide text-gray-500">{{ props.editing ? 'Modification' : 'Création' }}</p>
		<h3 class="font-heading text-lg font-semibold leading-snug text-gray-900">{{ props.title }}</h3>
	</div>
</template>
