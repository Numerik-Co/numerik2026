/**
 * Pages du site désactivées (bibliothèque `src/lib/site-pages.ts`) : leur
 * page renvoie une réponse 404, mais une page prérendue est quand même
 * écrite dans `dist/client` (contenu 404, servi en 200). En fin de
 * build, on retire donc ce HTML : la requête retombe sur le serveur Node,
 * qui répond par la vraie page 404.
 *
 * Lit `src/content/pages/_pages-site.md` directement (pas de collections à
 * ce stade du build).
 */
import { readFile, rm, rmdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { parse as parseYaml } from 'yaml';
import { SITE_PAGES } from '../lib/site-pages';

async function inactiveIds(root: URL): Promise<string[]> {
	try {
		const text = await readFile(new URL('src/content/pages/_pages-site.md', root), 'utf8');
		const match = text.replace(/\r\n?/g, '\n').match(/^---\n([\s\S]*?)\n---/);
		const pages = (match ? parseYaml(match[1]) : null)?.pages ?? {};
		return Object.entries(pages as Record<string, { active?: boolean }>)
			.filter(([, settings]) => settings?.active === false)
			.map(([id]) => id);
	} catch {
		return [];
	}
}

export default function sitePages(): AstroIntegration {
	let root: URL;
	return {
		name: 'numerik:site-pages',
		hooks: {
			'astro:config:done': ({ config }) => {
				root = config.root;
			},
			'astro:build:done': async ({ dir, logger }) => {
				for (const id of await inactiveIds(root)) {
					const page = SITE_PAGES.find((p) => p.id === id);
					if (!page?.canDisable || page.href === '/') continue;
					const file = new URL(`.${page.href}/index.html`, dir);
					await rm(fileURLToPath(file), { force: true });
					await rmdir(fileURLToPath(new URL('.', file))).catch(() => {}); // dossier vide seulement
					logger.info(`Page du site désactivée, HTML retiré : ${page.href}`);
				}
			},
		},
	};
}
