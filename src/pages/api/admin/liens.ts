/**
 * Pages du site vers lesquelles pointer depuis un texte (groupes
 * `redacteur` / `admin`, garde dans `src/middleware.ts`) : bloc « Insérer un
 * lien » des formulaires d'actualité, de page et d'activité.
 *  - GET : `{ groups }` (`src/lib/site-links.ts`).
 */
import type { APIRoute } from 'astro';
import { json, withErrors } from '../../../lib/auth/api';
import { listSiteLinks } from '../../../lib/site-links';

export const prerender = false;

export const GET: APIRoute = withErrors(async () => json({ groups: await listSiteLinks() }));
