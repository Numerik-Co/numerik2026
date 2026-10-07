import type { APIRoute } from 'astro';
import { json } from '../../../lib/auth/api';
import { readStatus } from '../../../lib/site-build';

export const prerender = false;

/** État de la dernière publication (suivi depuis le module « Actualités »). */
export const GET: APIRoute = async () => json(await readStatus());
