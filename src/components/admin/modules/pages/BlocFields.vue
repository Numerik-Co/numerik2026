<script setup lang="ts">
/** Champs d'un bloc (ou d'un élément de bloc), d'après leur description dans `src/lib/blocs.ts`. */
import type { BlocField } from '../../../../lib/blocs';
import { inputClass } from '../../context';

const props = defineProps<{ fields: BlocField[]; values: Record<string, unknown>; idPrefix: string }>();

const value = (name: string) => String(props.values[name] ?? '');
function set(name: string, event: Event) {
	props.values[name] = (event.target as HTMLInputElement).value;
}
</script>

<template>
	<div class="space-y-3">
		<div v-for="f in props.fields" :key="f.name">
			<label :for="`${props.idPrefix}-${f.name}`" class="block text-sm font-semibold text-gray-700">
				{{ f.label }}
				<span v-if="!f.required && f.type !== 'select'" class="font-light text-gray-500">(facultatif)</span>
			</label>
			<select
				v-if="f.type === 'select'"
				:id="`${props.idPrefix}-${f.name}`"
				:value="value(f.name)"
				:class="inputClass"
				@change="set(f.name, $event)"
			>
				<option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
			</select>
			<textarea
				v-else-if="f.type === 'textarea' || f.type === 'markdown'"
				:id="`${props.idPrefix}-${f.name}`"
				:value="value(f.name)"
				:required="f.required"
				rows="4"
				:class="[inputClass, f.type === 'markdown' ? 'font-mono text-xs leading-relaxed' : '']"
				@input="set(f.name, $event)"
			></textarea>
			<div v-else class="relative">
				<i
					v-if="f.type === 'icon' && value(f.name)"
					:class="['fa-solid', `fa-${value(f.name).replace(/^fa-/, '')}`, 'pointer-events-none absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-primary']"
					aria-hidden="true"
				></i>
				<input
					:id="`${props.idPrefix}-${f.name}`"
					:value="value(f.name)"
					type="text"
					:required="f.required"
					:inputmode="f.type === 'url' ? 'url' : undefined"
					:class="[inputClass, f.type === 'icon' ? 'pr-9' : '']"
					@input="set(f.name, $event)"
				/>
			</div>
			<p v-if="f.help" class="mt-1 text-xs font-light text-gray-500">{{ f.help }}</p>
		</div>
	</div>
</template>
