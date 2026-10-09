import type { APIRoute } from 'astro';
import { json, withErrors } from '../../../lib/auth/api';
import { getModelVersionInfo } from '../../../lib/model-version';

export const prerender = false;

/**
 * Version du site et dernière version publiée du modèle (bureau seul, garde
 * dans `src/middleware.ts`) : alimente le badge « mise à jour disponible ».
 */
export const GET: APIRoute = withErrors(async () => json(await getModelVersionInfo()));
