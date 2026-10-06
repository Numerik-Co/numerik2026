<script setup lang="ts">
/**
 * Racine de l'espace bénévoles, montée par `mount.ts` (jamais pour un simple
 * visiteur, cf. `AdminLoader.astro`) :
 *  - personne connectée → barre fixe en haut + modules en panneau latéral ;
 *  - sinon → modale de connexion à la demande (`numerik:auth-open`).
 * Connexion et déconnexion rechargent la page : les pages réservées et le
 * contenu rendu côté serveur reflètent ainsi le nouvel état.
 */
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import AdminOverlay from './AdminOverlay.vue';
import LoginForm from './LoginForm.vue';
import { ApiError, authApi, type AdminUser, type ReservedPage } from './client';
import { ADMIN_CONTEXT } from './context';
import { modulesFor } from './modules';

const props = defineProps<{ openOnMount?: boolean }>();

const user = ref<AdminUser | null>(null);
const pages = ref<ReservedPage[]>([]);
const loginOpen = ref(false);
const activeId = ref<string | null>(null);

const modules = computed(() => (user.value ? modulesFor(user.value.groups) : []));
const activeModule = computed(() => modules.value.find((m) => m.id === activeId.value) ?? null);

function sessionExpired() {
	user.value = null;
	activeId.value = null;
	loginOpen.value = true;
}
provide(ADMIN_CONTEXT, { user, pages, sessionExpired });

/** Lien « Espace bénévoles » : connexion, ou premier module si déjà connecté·e. */
function open() {
	if (user.value) activeId.value = modules.value[0]?.id ?? null;
	else loginOpen.value = true;
}

function reload() {
	window.location.reload();
}

async function logout() {
	try {
		await authApi.logout();
	} finally {
		reload();
	}
}

watch(user, (u) => document.documentElement.classList.toggle('has-admin-bar', Boolean(u)));

onMounted(async () => {
	window.addEventListener('numerik:auth-open', open);
	if (document.cookie.split('; ').includes('numerik_connecte=1')) {
		try {
			const me = await authApi.me();
			user.value = me.user;
			pages.value = me.pages;
		} catch (e) {
			if (!(e instanceof ApiError && e.status === 401)) console.error(e);
			user.value = null;
		}
	}
	// `AdminLoader.astro` a pu poser la classe d'avance (indicateur présent) : on la confirme ou on la retire.
	document.documentElement.classList.toggle('has-admin-bar', Boolean(user.value));
	if (props.openOnMount) open();
});

onBeforeUnmount(() => window.removeEventListener('numerik:auth-open', open));
</script>

<template>
	<div v-if="user" class="fixed inset-x-0 top-0 z-[60] h-10 bg-gray-900 text-sm text-white shadow">
		<div class="mx-auto flex h-full max-w-7xl items-center gap-1 px-2 sm:px-4">
			<span class="mr-2 hidden items-center gap-2 font-heading font-semibold md:flex">
				<i class="fa-solid fa-gear text-gray-400" aria-hidden="true"></i>
				Espace bénévoles
			</span>
			<nav class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label="Modules d'administration">
				<button
					v-for="m in modules"
					:key="m.id"
					type="button"
					class="flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1.5 hover:bg-white/10"
					:class="activeId === m.id ? 'bg-white/15' : ''"
					:aria-pressed="activeId === m.id"
					:title="m.label"
					@click="activeId = activeId === m.id ? null : m.id"
				>
					<i :class="['fa-solid', m.icon, 'text-gray-300']" aria-hidden="true"></i>
					<span class="hidden sm:inline">{{ m.label }}</span>
				</button>
			</nav>
			<span class="hidden shrink-0 items-center gap-1.5 text-gray-300 lg:flex">
				<i class="fa-solid fa-circle-user" aria-hidden="true"></i>
				{{ user.fullname }}
			</span>
			<button
				type="button"
				class="ml-1 flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1.5 text-gray-300 hover:bg-white/10 hover:text-white"
				title="Se déconnecter"
				@click="logout"
			>
				<i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
				<span class="hidden sm:inline">Déconnexion</span>
			</button>
		</div>
	</div>

	<AdminOverlay v-if="activeModule" :key="activeModule.id" :title="activeModule.label" @close="activeId = null">
		<component :is="activeModule.component" />
	</AdminOverlay>

	<AdminOverlay v-if="loginOpen && !user" title="Espace bénévoles" variant="modal" @close="loginOpen = false">
		<LoginForm @success="reload" />
	</AdminOverlay>
</template>
