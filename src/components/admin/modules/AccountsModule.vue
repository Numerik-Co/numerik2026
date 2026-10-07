<script setup lang="ts">
/**
 * Module « Comptes » (groupe `admin`) : liste → création / fiche d'un compte
 * (modification, désactivation, réinitialisation du mot de passe,
 * suppression). Un mot de passe provisoire n'est affiché qu'une fois.
 * Les garde-fous (soi-même, dernier admin) sont appliqués par le serveur ;
 * l'interface masque seulement les actions impossibles sur son propre compte.
 */
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { AUTH_GROUPS, type AuthGroup } from '../../../lib/auth/groups';
import { ApiError, accountsApi, type AccountView } from '../client';
import { ADMIN_CONTEXT, inputClass } from '../context';

const { user, sessionExpired, onCloseRequest } = inject(ADMIN_CONTEXT)!;
const groupEntries = Object.entries(AUTH_GROUPS) as [AuthGroup, (typeof AUTH_GROUPS)[AuthGroup]][];

type View = { name: 'list' } | { name: 'create' } | { name: 'edit'; login: string };

const view = ref<View>({ name: 'list' });
const accounts = ref<AccountView[]>([]);
const loading = ref(true);
const busy = ref(false);
const error = ref('');
const notice = ref('');
/** Mot de passe provisoire à transmettre (affiché une seule fois). */
const shownPassword = ref<{ login: string; password: string } | null>(null);

const form = reactive({
	login: '',
	fullname: '',
	email: '',
	groups: ['animateur'] as AuthGroup[],
	disabled: false,
	password: '',
});
const confirmDelete = ref('');

const current = computed(() =>
	view.value.name === 'edit' ? accounts.value.find((a) => a.login === (view.value as { login: string }).login) : undefined,
);
const isSelf = computed(() => current.value?.login === user.value?.login);

function fail(e: unknown) {
	if (e instanceof ApiError && e.status === 401) return sessionExpired();
	error.value = (e as Error).message;
}

async function load() {
	loading.value = true;
	try {
		accounts.value = (await accountsApi.list()).accounts;
	} catch (e) {
		fail(e);
	} finally {
		loading.value = false;
	}
}

function go(next: View) {
	error.value = '';
	notice.value = '';
	confirmDelete.value = '';
	if (next.name !== 'list') shownPassword.value = null;
	const a = next.name === 'edit' ? accounts.value.find((x) => x.login === next.login) : undefined;
	Object.assign(form, {
		login: a?.login ?? '',
		fullname: a?.fullname ?? '',
		email: a?.email ?? '',
		groups: a ? [...a.groups] : ['animateur'],
		disabled: a?.state === 'disabled',
		password: '',
	});
	view.value = next;
}

async function run(action: () => Promise<void>) {
	error.value = '';
	notice.value = '';
	busy.value = true;
	try {
		await action();
	} catch (e) {
		fail(e);
	} finally {
		busy.value = false;
	}
}

const create = () =>
	run(async () => {
		const res = await accountsApi.create({
			login: form.login,
			fullname: form.fullname,
			email: form.email,
			groups: form.groups,
			password: form.password,
		});
		await load();
		go({ name: 'list' });
		notice.value = `Compte « ${res.account.login} » créé.`;
		if (res.password) shownPassword.value = { login: res.account.login, password: res.password };
	});

const save = () =>
	run(async () => {
		const res = await accountsApi.update(form.login, {
			fullname: form.fullname,
			email: form.email,
			groups: form.groups,
			state: form.disabled ? 'disabled' : 'enabled',
		});
		accounts.value = accounts.value.map((a) => (a.login === res.account.login ? res.account : a));
		notice.value = 'Compte enregistré.';
	});

const resetPassword = () =>
	run(async () => {
		const res = await accountsApi.resetPassword(form.login);
		shownPassword.value = { login: form.login, password: res.password };
	});

const remove = () =>
	run(async () => {
		const login = form.login;
		await accountsApi.remove(login, confirmDelete.value);
		await load();
		go({ name: 'list' });
		notice.value = `Compte « ${login} » supprimé.`;
	});

const formatDate = (iso: string) =>
	iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ✕ / Échap depuis une fiche ou la création : retour à la liste plutôt que fermeture du panneau.
const stopCloseRequest = onCloseRequest(() => {
	if (view.value.name === 'list') return false;
	go({ name: 'list' });
	return true;
});

onMounted(load);
onBeforeUnmount(stopCloseRequest);
</script>

<template>
	<p v-if="notice" class="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">{{ notice }}</p>
	<div
		v-if="shownPassword"
		class="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900"
		role="status"
	>
		<p class="font-semibold">Mot de passe provisoire de « {{ shownPassword.login }} »</p>
		<p class="mt-2">
			À transmettre à la personne, il ne sera plus affiché :
			<code class="ml-1 select-all rounded bg-white px-2 py-1 font-mono text-base tracking-wide">{{ shownPassword.password }}</code>
		</p>
		<p class="mt-2 font-light">Elle pourra le changer dans « Mon mot de passe ».</p>
	</div>
	<p v-if="error" class="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>

	<!-- Liste -->
	<template v-if="view.name === 'list'">
		<p v-if="loading" class="text-sm font-light text-gray-500">Chargement…</p>
		<ul v-else class="divide-y divide-gray-100 rounded-xl border border-gray-100">
			<li v-for="a in accounts" :key="a.login">
				<button
					type="button"
					class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
					@click="go({ name: 'edit', login: a.login })"
				>
					<span class="min-w-0 flex-1">
						<span class="block truncate text-sm font-medium text-gray-900">{{ a.fullname }}</span>
						<span class="block truncate text-xs font-light text-gray-500">
							{{ a.login }} · {{ a.groups.map((g) => AUTH_GROUPS[g].label).join(', ') }}
						</span>
					</span>
					<span v-if="a.state === 'disabled'" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
						Désactivé
					</span>
					<i class="fa-solid fa-chevron-right text-xs text-gray-400" aria-hidden="true"></i>
				</button>
			</li>
		</ul>
		<button
			type="button"
			class="mt-5 rounded-full bg-primary px-5 py-2.5 font-heading text-sm font-semibold text-white hover:opacity-90"
			@click="go({ name: 'create' })"
		>
			<i class="fa-solid fa-plus mr-1.5" aria-hidden="true"></i>
			Nouveau compte
		</button>
	</template>

	<!-- Création / modification -->
	<template v-else>
		<button type="button" class="mb-4 text-sm font-medium text-primary hover:underline" @click="go({ name: 'list' })">
			← Tous les comptes
		</button>

		<form class="space-y-4" @submit.prevent="view.name === 'create' ? create() : save()">
			<h3 class="font-heading text-base font-semibold text-gray-900">
				{{ view.name === 'create' ? 'Nouveau compte' : `Compte « ${form.login} »` }}
			</h3>
			<div v-if="view.name === 'create'">
				<label for="acc-login" class="block text-sm font-medium text-gray-700">Identifiant</label>
				<input
					id="acc-login"
					v-model="form.login"
					type="text"
					required
					pattern="[a-z0-9][a-z0-9._\-]{1,31}"
					autocapitalize="none"
					spellcheck="false"
					placeholder="prenom.nom"
					:class="inputClass"
				/>
				<p class="mt-1 text-xs font-light text-gray-500">Minuscules, chiffres, « . », « - » ou « _ ».</p>
			</div>
			<div>
				<label for="acc-fullname" class="block text-sm font-medium text-gray-700">Prénom et nom</label>
				<input id="acc-fullname" v-model="form.fullname" type="text" required :class="inputClass" />
			</div>
			<div>
				<label for="acc-email" class="block text-sm font-medium text-gray-700">
					Email <span class="font-light text-gray-500">(facultatif)</span>
				</label>
				<input id="acc-email" v-model="form.email" type="email" :class="inputClass" />
			</div>
			<fieldset>
				<legend class="block text-sm font-medium text-gray-700">Groupes</legend>
				<div class="mt-2 space-y-2">
					<label v-for="[key, group] in groupEntries" :key="key" class="flex items-start gap-2 text-sm text-gray-700">
						<input
							v-model="form.groups"
							type="checkbox"
							:value="key"
							:disabled="isSelf && key === 'admin'"
							class="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
						/>
						<span>
							<span class="font-medium">{{ group.label }}</span>
							<span class="block text-xs font-light text-gray-500">{{ group.description }}</span>
						</span>
					</label>
				</div>
			</fieldset>
			<div v-if="view.name === 'create'">
				<label for="acc-password" class="block text-sm font-medium text-gray-700">
					Mot de passe provisoire <span class="font-light text-gray-500">(facultatif)</span>
				</label>
				<input id="acc-password" v-model="form.password" type="text" autocomplete="off" :class="inputClass" />
				<p class="mt-1 text-xs font-light text-gray-500">Laissez vide pour en générer un automatiquement.</p>
			</div>
			<label v-else class="flex items-center gap-2 text-sm text-gray-700">
				<input
					v-model="form.disabled"
					type="checkbox"
					:disabled="isSelf"
					class="rounded border-gray-300 text-primary focus:ring-primary"
				/>
				Compte désactivé (connexion refusée)
			</label>
			<button
				type="submit"
				:disabled="busy"
				class="rounded-full bg-primary px-6 py-3 font-heading text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
			>
				{{ view.name === 'create' ? 'Créer le compte' : 'Enregistrer' }}
			</button>
		</form>

		<template v-if="view.name === 'edit' && current">
			<p class="mt-4 text-xs font-light text-gray-500">
				Créé le {{ formatDate(current.created) }} · modifié le {{ formatDate(current.updated) }}
			</p>

			<section class="mt-8 space-y-3 border-t border-gray-100 pt-6">
				<h3 class="font-heading text-base font-semibold text-gray-900">Mot de passe</h3>
				<p class="text-sm font-light text-gray-600">
					Génère un nouveau mot de passe provisoire et ferme les sessions ouvertes de ce compte.
				</p>
				<button
					type="button"
					:disabled="busy"
					class="rounded-full border-2 border-primary px-5 py-2 font-heading text-sm font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-60"
					@click="resetPassword"
				>
					Réinitialiser le mot de passe
				</button>
			</section>

			<section v-if="!isSelf" class="mt-8 space-y-3 rounded-xl border border-red-100 p-4">
				<h3 class="font-heading text-base font-semibold text-red-700">Supprimer le compte</h3>
				<p class="text-sm font-light text-gray-600">
					Action définitive. Pour confirmer, recopiez l'identifiant <code class="font-mono">{{ form.login }}</code>.
				</p>
				<input v-model="confirmDelete" type="text" autocomplete="off" aria-label="Identifiant à recopier" :class="inputClass" />
				<button
					type="button"
					:disabled="busy || confirmDelete !== form.login"
					class="rounded-full bg-red-600 px-5 py-2 font-heading text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
					@click="remove"
				>
					Supprimer définitivement
				</button>
			</section>
		</template>
	</template>
</template>
