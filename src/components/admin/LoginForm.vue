<script setup lang="ts">
import { ref } from 'vue';
import { authApi } from './client';
import { inputClass } from './context';

const emit = defineEmits<{ success: [] }>();

const login = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
	error.value = '';
	busy.value = true;
	try {
		await authApi.login(login.value, password.value);
		emit('success');
	} catch (e) {
		error.value = (e as Error).message;
		password.value = '';
	} finally {
		busy.value = false;
	}
}
</script>

<template>
	<form class="space-y-4" @submit.prevent="submit">
		<p class="text-sm font-light text-gray-600">Réservé au bureau et aux animateur·rice·s de l'association.</p>
		<p v-if="error" class="alerte-erreur" role="alert">{{ error }}</p>
		<div>
			<label for="admin-login" class="champ-libelle">Identifiant</label>
			<input
				id="admin-login"
				v-model="login"
				type="text"
				required
				autofocus
				autocomplete="username"
				autocapitalize="none"
				spellcheck="false"
				:class="inputClass"
			/>
		</div>
		<div>
			<label for="admin-password" class="champ-libelle">Mot de passe</label>
			<input id="admin-password" v-model="password" type="password" required autocomplete="current-password" :class="inputClass" />
		</div>
		<button
			type="submit"
			:disabled="busy"
			class="w-full rounded-full bg-primary px-6 py-3 font-heading text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
		>
			{{ busy ? 'Connexion…' : 'Se connecter' }}
		</button>
		<p class="text-center text-xs font-light text-gray-500">
			Mot de passe oublié ? Demandez à un membre du bureau de le réinitialiser.
		</p>
	</form>
</template>
