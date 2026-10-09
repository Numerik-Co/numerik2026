<script setup lang="ts">
/**
 * Modules de la page d'accueil (catalogue `src/lib/home-modules.ts`) :
 * ajout, retrait, ordre (↑/↓) et contenu de chaque module, replié en
 * accordéon. Modifie la liste reçue sur place ; l'enregistrement est fait par
 * le formulaire parent (`SitePageForm.vue`).
 */
import { computed, ref } from 'vue';
import { DEFAULT_HOME, HOME_MODULES, homeModuleDef, newHomeModule, type HomeModule, type HomeModuleDef, type HomeModuleType } from '../../../../lib/home-modules';
import { iconButtonClass, inputClass } from '../../context';
import BlocFields from './BlocFields.vue';

const props = defineProps<{ modules: HomeModule[] }>();

/** Modules dépliés, par objet (l'index change quand on déplace). */
const open = ref(new Set<HomeModule>());
function toggle(m: HomeModule) {
	if (open.value.has(m)) open.value.delete(m);
	else open.value.add(m);
}

const types = Object.entries(HOME_MODULES) as [HomeModuleType, HomeModuleDef][];
/** Types encore ajoutables (un module unique déjà présent ne se rajoute pas). */
const available = computed(() => types.filter(([type, def]) => def.multiple || !props.modules.some((m) => m.type === type)));
const newType = ref<HomeModuleType | ''>('');

function add() {
	if (!newType.value) return;
	const m = newHomeModule(newType.value);
	props.modules.push(m);
	open.value.add(props.modules[props.modules.length - 1]);
	newType.value = '';
}

function move(index: number, delta: -1 | 1) {
	const [m] = props.modules.splice(index, 1);
	props.modules.splice(index + delta, 0, m);
}

function remove(index: number) {
	props.modules.splice(index, 1);
}

function resetHome() {
	props.modules.splice(0, props.modules.length, ...DEFAULT_HOME.map((m) => ({ ...m })));
	open.value.clear();
}

const VARIABLE_EXEMPLE = '{{association.nom}}';

/** Résumé d'un module replié : son titre. */
const summary = (m: HomeModule) => m.titre || '';
</script>

<template>
	<fieldset class="space-y-3">
		<legend class="font-heading text-sm font-semibold text-gray-900">Modules de la page</legend>
		<p class="text-xs font-light text-gray-500">
			Dans l'ordre d'affichage. Cliquez sur un module pour modifier son contenu ; les variables
			<code v-text="VARIABLE_EXEMPLE"></code>… sont acceptées.
		</p>

		<ol class="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
			<li v-for="(m, i) in props.modules" :key="i + m.type">
				<div :class="['flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-gray-100', { 'bg-gray-100': open.has(m) }]">
					<button
						type="button"
						class="flex min-w-0 flex-1 items-center gap-2 text-left"
						:aria-expanded="open.has(m)"
						@click="toggle(m)"
					>
						<i :class="['fa-solid', homeModuleDef(m.type).icon, 'w-5 text-center text-primary']" aria-hidden="true"></i>
						<span class="font-medium text-gray-900">{{ homeModuleDef(m.type).label }}</span>
						<span class="min-w-0 truncate text-xs font-light text-gray-500">{{ summary(m) }}</span>
						<i
							:class="['fa-solid fa-chevron-down ml-auto text-xs text-gray-400 transition-transform', { 'rotate-180': open.has(m) }]"
							aria-hidden="true"
						></i>
					</button>
					<span class="flex items-center">
						<button
							type="button"
							:class="[iconButtonClass, 'text-gray-500 hover:text-gray-900']"
							:disabled="i === 0"
							:aria-label="`Monter « ${homeModuleDef(m.type).label} »`"
							title="Monter"
							@click="move(i, -1)"
						>
							<i class="fa-solid fa-arrow-up text-xs" aria-hidden="true"></i>
						</button>
						<button
							type="button"
							:class="[iconButtonClass, 'text-gray-500 hover:text-gray-900']"
							:disabled="i === props.modules.length - 1"
							:aria-label="`Descendre « ${homeModuleDef(m.type).label} »`"
							title="Descendre"
							@click="move(i, 1)"
						>
							<i class="fa-solid fa-arrow-down text-xs" aria-hidden="true"></i>
						</button>
						<button
							type="button"
							:class="[iconButtonClass, 'text-red-600']"
							:aria-label="`Retirer « ${homeModuleDef(m.type).label} »`"
							title="Retirer de la page"
							@click="remove(i)"
						>
							<i class="fa-solid fa-trash" aria-hidden="true"></i>
						</button>
					</span>
				</div>
				<div v-if="open.has(m)" class="border-t border-gray-100 px-4 py-4">
					<p class="mb-3 text-xs font-light text-gray-500">{{ homeModuleDef(m.type).description }}</p>
					<BlocFields :fields="homeModuleDef(m.type).fields" :values="m" :id-prefix="`hm-${i}`" />
				</div>
			</li>
			<li v-if="!props.modules.length" class="px-4 py-3 text-sm font-light text-gray-500">
				Aucun module : la page d'accueil sera vide.
			</li>
		</ol>

		<div class="flex flex-wrap items-center gap-2">
			<label for="hm-new" class="sr-only">Module à ajouter</label>
			<select id="hm-new" v-model="newType" :class="[inputClass, 'mt-0 w-auto flex-1']">
				<option value="" disabled>Ajouter un module…</option>
				<option v-for="[type, def] in available" :key="type" :value="type">{{ def.label }} — {{ def.description }}</option>
			</select>
			<button
				type="button"
				class="rounded-full border-2 border-primary px-4 py-1.5 font-heading text-sm font-semibold text-primary hover:bg-primary hover:text-white disabled:opacity-50"
				:disabled="!newType"
				@click="add"
			>
				<i class="fa-solid fa-plus mr-1" aria-hidden="true"></i>Ajouter
			</button>
		</div>
		<p class="text-xs font-light text-gray-500">
			<button type="button" class="text-primary hover:underline" @click="resetHome">Revenir à l'accueil d'origine</button>
		</p>
	</fieldset>
</template>
