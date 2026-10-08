/**
 * Réglages des pages du site lus au build (collection `sitePages`,
 * `src/content/pages/_pages-site.md`), cf. `src/lib/site-pages.ts`.
 */
import { getCollection } from 'astro:content';
import { resolvedTexts, sitePagesState, type SitePageState } from './site-pages';

export async function getSitePagesState(): Promise<SitePageState[]> {
	const [entry] = await getCollection('sitePages');
	return sitePagesState(entry?.data.pages);
}

/** Une page du site : état (active, lien) et textes prêts à afficher (`t`). */
export async function getSitePage(id: string): Promise<SitePageState & { t: Record<string, string> }> {
	const state = (await getSitePagesState()).find((p) => p.id === id);
	if (!state) throw new Error(`Page du site inconnue : ${id}`);
	return { ...state, t: resolvedTexts(state) };
}

/** `href` des pages du site désactivées (liens à masquer). */
export async function inactiveSiteHrefs(): Promise<Set<string>> {
	return new Set((await getSitePagesState()).filter((p) => !p.active).map((p) => p.href));
}
