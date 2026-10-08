/**
 * Photo envoyée en JSON par les modules de l'espace bénévoles
 * (`{ type, data (base64) }`) : contrôles communs avant traitement par sharp.
 */

import { COVER_MAX_BYTES } from './news-writer';

export const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function readCover(raw: unknown): { data?: Buffer; error?: string } {
	if (!raw) return {};
	const cover = raw as { type?: unknown; data?: unknown };
	if (!COVER_TYPES.includes(String(cover.type))) return { error: 'Photo : formats acceptés JPEG, PNG ou WebP.' };
	const data = Buffer.from(String(cover.data ?? ''), 'base64');
	if (data.length === 0) return { error: 'La photo est vide.' };
	if (data.length > COVER_MAX_BYTES) return { error: 'La photo est trop lourde (10 Mo max).' };
	return { data };
}
