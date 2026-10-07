<script setup lang="ts">
/**
 * Racine de l'espace bénévoles, montée par `mount.ts` (jamais pour un simple
 * visiteur, cf. `AdminLoader.astro`) :
 *  - personne connectée → barre fixe en haut + modules en panneau latéral ;
 *  - sinon → modale de connexion à la demande (`numerik:auth-open`).
 * Connexion et déconnexion rechargent la page : les pages réservées et le
 * contenu rendu côté serveur reflètent ainsi le nouvel état.
 */
import { computed, onBeforeUnmount, onMounted, provide, ref, shallowRef, watch } from 'vue';
import AdminOverlay from './AdminOverlay.vue';
import LoginForm from './LoginForm.vue';
import { ApiError, authApi, type AdminUser, type ReservedPage } from './client';
import { ADMIN_CONTEXT, takeModuleToReopen } from './context';
import { modulesFor } from './modules';

const props = defineProps<{ openOnMount?: boolean }>();

const user = ref<AdminUser | null>(null);
const pages = ref<ReservedPage[]>([]);
const loginOpen = ref(false);
const activeId = ref<string | null>(null);

/**
 * Mode du serveur, affiché dans la barre : en développement (`astro dev`), le
 * contenu est relu à chaud et les publications ne reconstruisent pas le site.
 */
const isDev = import.meta.env.DEV;

const modules = computed(() => (user.value ? modulesFor(user.value.groups) : []));
const activeModule = computed(() => modules.value.find((m) => m.id === activeId.value) ?? null);

function sessionExpired() {
	user.value = null;
	activeId.value = null;
	loginOpen.value = true;
}
/** Interception de la fermeture par le module ouvert (cf. `AdminContext.onCloseRequest`). */
const closeHandler = shallowRef<(() => boolean) | null>(null);
function onCloseRequest(handler: () => boolean) {
	closeHandler.value = handler;
	return () => {
		if (closeHandler.value === handler) closeHandler.value = null;
	};
}
function closeModule() {
	if (closeHandler.value?.()) return;
	activeId.value = null;
}

provide(ADMIN_CONTEXT, { user, pages, sessionExpired, onCloseRequest });

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
	// Rechargement automatique en dev après une publication : on rouvre le module.
	const reopen = takeModuleToReopen();
	if (reopen && modules.value.some((m) => m.id === reopen)) activeId.value = reopen;
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
			<span
				v-if="isDev"
				class="mr-1 shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950"
				title="Serveur de développement : les modifications sont visibles aussitôt, sans reconstruction du site."
			>
				<i class="fa-solid fa-flask mr-1" aria-hidden="true"></i><span class="hidden sm:inline">Développement</span><span class="sm:hidden">Dév.</span>
			</span>
			<span
				v-else
				class="mr-1 hidden shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs text-gray-300 sm:flex"
				title="Serveur de production : chaque publication reconstruit le site."
			>
				<span class="h-2 w-2 rounded-full bg-green-400" aria-hidden="true"></span>
				Production
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

	<AdminOverlay v-if="activeModule" :key="activeModule.id" :title="activeModule.label" @close="closeModule">
		<component :is="activeModule.component" />
	</AdminOverlay>

	<AdminOverlay v-if="loginOpen && !user" title="Espace bénévoles" variant="modal" @close="loginOpen = false">
		<LoginForm @success="reload" />
	</AdminOverlay>
</template>
