/**
 * `/favicon.ico` : adresse demandée d'office par certains navigateurs et
 * lecteurs RSS, sans lire les `<link rel="icon">`. Sert, à la construction,
 * `src/content/images/favicon.ico` (ou `favicon.png` à défaut) — voir
 * `src/lib/site-images.ts`. Aucun des deux : 404.
 */

import type { APIRoute } from 'astro';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const prerender = true;

const CANDIDATES = [
	['favicon.ico', 'image/x-icon'],
	['favicon.png', 'image/png'],
] as const;

export const GET: APIRoute = () => {
	for (const [file, type] of CANDIDATES) {
		// Prérendu : lu au build, depuis la racine du projet.
		const path = resolve('src/content/images', file);
		if (existsSync(path)) return new Response(readFileSync(path), { headers: { 'Content-Type': type } });
	}
	return new Response(null, { status: 404 });
};
