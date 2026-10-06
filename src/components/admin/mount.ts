/** Monte l'espace bénévoles (chargé à la demande par `AdminLoader.astro`). */
import { createApp } from 'vue';
import AdminRoot from './AdminRoot.vue';

export function mountAdmin(openOnMount: boolean): void {
	const el = document.createElement('div');
	el.id = 'espace-benevoles';
	document.body.appendChild(el);
	createApp(AdminRoot, { openOnMount }).mount(el);
}
