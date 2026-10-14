<script setup lang="ts">
/**
 * Au-dessus des onglets d'un formulaire en modification : « Télécharger le
 * fichier » (`.md` construit depuis le formulaire, `download`) et « Charger
 * un fichier modifié » (bouton ou glisser-déposer, `load`) — le parent
 * remplit le formulaire, rien n'est publié avant « Enregistrer ».
 * `imported` = dernier fichier chargé et remarques de lecture.
 */
import { ref } from 'vue';

const props = defineProps<{ imported: { name: string; warnings: string[] } | null; disabled?: boolean }>();
const emit = defineEmits<{ download: []; load: [file: File] }>();

const dragOver = ref(false);
const buttonClass =
	'flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary hover:text-primary';

function pick(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = ''; // recharger le même fichier après l'avoir corrigé
	if (file) emit('load', file);
}

function drop(event: DragEvent) {
	dragOver.value = false;
	const file = event.dataTransfer?.files?.[0];
	if (file) emit('load', file);
}
</script>

<template>
	<div class="mb-4">
		<div class="grid grid-cols-2 gap-2">
			<button type="button" :class="buttonClass" :disabled="props.disabled" @click="emit('download')">
				<i class="fa-solid fa-file-arrow-down text-primary" aria-hidden="true"></i>
				Télécharger le fichier
			</button>
			<label
				:class="[buttonClass, 'cursor-pointer', dragOver ? 'border-primary bg-primary/5 text-primary' : '']"
				@dragover.prevent="dragOver = true"
				@dragleave="dragOver = false"
				@drop.prevent="drop"
			>
				<i class="fa-solid fa-file-arrow-up text-primary" aria-hidden="true"></i>
				Charger un fichier modifié
				<input type="file" accept=".md,.markdown,text/markdown" class="sr-only" :disabled="props.disabled" @change="pick" />
			</label>
		</div>
		<p class="mt-1.5 text-xs font-light text-gray-500">
			Le fichier <code>.md</code> reprend le formulaire (sans la photo). Modifiez-le dans un éditeur de texte puis chargez-le :
			le formulaire est rempli, rien n'est publié avant l'enregistrement.
		</p>
		<div v-if="props.imported" class="mt-2 rounded-lg bg-primary/5 px-3 py-2 text-sm text-gray-700" role="status">
			<p>
				<i class="fa-solid fa-file-circle-check mr-1 text-primary" aria-hidden="true"></i>
				Formulaire rempli depuis <strong>{{ props.imported.name }}</strong> : vérifiez puis enregistrez.
			</p>
			<ul v-if="props.imported.warnings.length" class="mt-1 list-disc pl-5 text-xs text-amber-800">
				<li v-for="w in props.imported.warnings" :key="w">{{ w }}</li>
			</ul>
		</div>
	</div>
</template>
