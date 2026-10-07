/**
 * Fines enveloppes typées autour des routes /api/auth/* et /api/admin/*.
 * Une erreur porte le message renvoyé par le serveur et son code HTTP
 * (`status === 401` : session expirée).
 */
import type { AuthGroup } from '../../lib/auth/groups';

export interface AdminUser {
	login: string;
	fullname: string;
	email: string | null;
	groups: AuthGroup[];
}

export interface ReservedPage {
	title: string;
	url: string;
	description: string | null;
}

export interface AccountView {
	login: string;
	fullname: string;
	email: string | null;
	groups: AuthGroup[];
	state: 'enabled' | 'disabled';
	created: string;
	updated: string;
}

export interface NewsItem {
	slug: string;
	href: string;
	title: string;
	publishAt: string;
	isPublish: boolean;
	tag: string | null;
	thumbnail: string | null;
}

/** Actualité telle qu'elle est dans les sources (formulaire d'édition). */
export interface NewsSource {
	slug: string;
	title: string;
	publishAt: string;
	excerpt: string;
	isPublish: boolean;
	tag: string;
	author: string;
	imageCredit: string;
	body: string;
	cover: string | null;
	/** Aperçu de la photo actuelle (site construit). */
	coverUrl: string | null;
}

export type NewsFields = Pick<NewsSource, 'title' | 'publishAt' | 'excerpt' | 'isPublish' | 'tag' | 'author' | 'imageCredit'>;

export type CoverUpdate = { action: 'keep' } | { action: 'remove' } | { action: 'replace'; type: string; data: string };

/** État de la dernière publication (reconstruction du site), cf. src/lib/site-build.ts. */
export interface PublishStatus {
	state: 'idle' | 'running' | 'succeeded' | 'failed';
	label?: string;
	href?: string;
	startedAt?: string;
	finishedAt?: string;
	message?: string;
}

export interface AccountInput {
	fullname: string;
	email: string;
	groups: AuthGroup[];
}

export class ApiError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.status = status;
	}
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
	const res = await fetch(url, {
		method,
		headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const data = await res.json().catch(() => null);
	if (!res.ok) {
		const fallback =
			res.status === 413
				? "Envoi trop volumineux pour le serveur (erreur 413). Essayez une photo plus légère ; l'administrateur·rice du serveur peut aussi relever la limite (nginx : client_max_body_size)."
				: `Erreur ${res.status}`;
		throw new ApiError((data && data.error) || fallback, res.status);
	}
	return data as T;
}

export const authApi = {
	me: () => request<{ user: AdminUser; pages: ReservedPage[] }>('GET', '/api/auth/me'),
	login: (login: string, password: string) => request<{ user: AdminUser }>('POST', '/api/auth/login', { login, password }),
	logout: () => request<{ ok: true }>('POST', '/api/auth/logout'),
	changePassword: (current: string, next: string) =>
		request<{ ok: true }>('POST', '/api/admin/mot-de-passe', { current, next }),
};

export const accountsApi = {
	list: () => request<{ accounts: AccountView[] }>('GET', '/api/admin/comptes'),
	create: (input: AccountInput & { login: string; password: string }) =>
		request<{ account: AccountView; password: string | null }>('POST', '/api/admin/comptes', input),
	update: (login: string, input: AccountInput & { state: AccountView['state'] }) =>
		request<{ account: AccountView }>('PATCH', `/api/admin/comptes/${encodeURIComponent(login)}`, input),
	resetPassword: (login: string) =>
		request<{ password: string }>('POST', `/api/admin/comptes/${encodeURIComponent(login)}`),
	remove: (login: string, confirm: string) =>
		request<{ ok: true }>('DELETE', `/api/admin/comptes/${encodeURIComponent(login)}`, { confirm }),
};

export const newsApi = {
	list: () =>
		request<{ news: NewsItem[]; status: PublishStatus; availability: { ok: boolean; reason?: string } }>(
			'GET',
			'/api/admin/actualites',
		),
	create: (markdown: string, cover: { type: string; data: string } | null) =>
		request<{ slug: string; href: string }>('POST', '/api/admin/actualites', { markdown, cover: cover ?? undefined }),
	status: () => request<PublishStatus>('GET', '/api/admin/publication'),
	get: (slug: string) => request<NewsSource>('GET', `/api/admin/actualites/${encodeURIComponent(slug)}`),
	update: (slug: string, fields: NewsFields, body: string, cover: CoverUpdate) =>
		request<{ ok: true; href: string }>('PUT', `/api/admin/actualites/${encodeURIComponent(slug)}`, { fields, body, cover }),
	remove: (slug: string) =>
		request<{ ok: true }>('DELETE', `/api/admin/actualites/${encodeURIComponent(slug)}`, { confirm: slug }),
};
