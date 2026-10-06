import type { APIRoute } from 'astro';
import { json } from '../../../lib/auth/api';
import { closeSession } from '../../../lib/auth/session';

export const prerender = false;

export const POST: APIRoute = ({ cookies }) => {
	closeSession(cookies);
	return json({ ok: true });
};
