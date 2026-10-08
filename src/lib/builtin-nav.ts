/**
 * Liens du menu de navigation vers les pages applicatives du template
 * (Accueil, Activités…, `site.builtinNav`). Leurs valeurs par défaut sont
 * dans `src/config/site.ts` ; le module « Pages » peut changer libellé,
 * position et visibilité, enregistrés dans `src/content/pages/_navigation.md`
 * (collection `navigation`, frontmatter `liens: { <id>: { label, order, show } }`).
 *
 * Sans `astro:content` : partagé par `navigation.ts` (build) et
 * `page-writer.ts` (serveur).
 */

import { site } from '../config/site';

export interface BuiltinLinkOverride {
	label?: string;
	order?: number;
	show?: boolean;
}

export interface BuiltinLink {
	id: string;
	href: string;
	label: string;
	order: number;
	/** `false` = absent du menu de navigation (la page reste accessible). */
	show: boolean;
	defaultLabel: string;
	defaultOrder: number;
}

export const BUILTIN_LINK_IDS: string[] = site.builtinNav.map((item) => item.id);

/** `site.builtinNav` avec les réglages enregistrés appliqués. */
export function builtinLinks(overrides: Record<string, BuiltinLinkOverride> = {}): BuiltinLink[] {
	return site.builtinNav.map((item) => {
		const o = overrides[item.id] ?? {};
		return {
			id: item.id,
			href: item.href,
			label: o.label?.trim() || item.label,
			order: typeof o.order === 'number' && Number.isFinite(o.order) ? o.order : item.order,
			show: o.show !== false,
			defaultLabel: item.label,
			defaultOrder: item.order,
		};
	});
}
