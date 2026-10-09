/**
 * Fines enveloppes typées autour des routes /api/auth/* et /api/admin/*.
 * Une erreur porte le message renvoyé par le serveur et son code HTTP
 * (`status === 401` : session expirée).
 */
import type { AuthGroup } from '../../lib/auth/groups';
import type { Bloc } from '../../lib/blocs';
import type { HomeModule } from '../../lib/home-modules';
import type { ModelVersionInfo } from '../../lib/model-version';
import type { SitePageState } from '../../lib/site-pages';

export interface AdminUser {
	login: string;
	fullname: string;
	email: string | null;
	groups: AuthGroup[];
	/** Mot de passe provisoire : à remplacer avant tout le reste. */
	mustChangePassword: boolean;
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

/** Événement du journal des modifications, cf. src/lib/journal.ts. */
export interface JournalEntry {
	at: string;
	by?: { login: string; fullname: string };
	action: string;
	label?: string;
	href?: string;
	outcome?: 'ok' | 'echec';
	message?: string;
}

export type PagePlacement = { kind: 'racine' } | { kind: 'dropdown'; dropdown: string } | { kind: 'reservee' };

/** Page à créer ou modifier (module « Pages »), cf. src/lib/page-writer.ts. */
export interface PageInput {
	placement: PagePlacement;
	slug: string;
	title: string;
	description: string;
	type: 'classique' | 'enrichie';
	menu: { show: boolean; order: number; label: string };
	access: AuthGroup[];
	body: string;
	blocs: Record<string, Bloc>;
	imageCredit: string;
}

/** Page telle qu'elle est dans les sources. */
export interface PageSourceView extends PageInput {
	path: string;
	cover: string | null;
	/** Page `.mdx` écrite dans le code : lecture seule. */
	technique: boolean;
	/** Aperçu de la photo actuelle (GET d'une page seulement). */
	coverUrl?: string | null;
}

/** Page du site (bibliothèque Accueil, Activités…) avec ses réglages, cf. src/lib/site-pages.ts. */
export type SitePageView = SitePageState;

export interface SitePageInput {
	label: string;
	show: boolean;
	active: boolean;
	textes: Record<string, string>;
	/** Accueil : liste complète des modules (absent = inchangée). */
	modules?: HomeModule[];
}

/** Menu déroulant de la barre de navigation (`_group.md`). */
export interface DropdownView {
	folder: string;
	label: string;
	order: number;
	pages: string[];
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
	dismissStatus: () => request<{ ok: true }>('DELETE', '/api/admin/publication'),
	get: (slug: string) => request<NewsSource>('GET', `/api/admin/actualites/${encodeURIComponent(slug)}`),
	update: (slug: string, fields: NewsFields, body: string, cover: CoverUpdate) =>
		request<{ ok: true; href: string }>('PUT', `/api/admin/actualites/${encodeURIComponent(slug)}`, { fields, body, cover }),
	remove: (slug: string) =>
		request<{ ok: true }>('DELETE', `/api/admin/actualites/${encodeURIComponent(slug)}`, { confirm: slug }),
};

export const pagesApi = {
	list: () =>
		request<{
			sitePages: SitePageView[];
			dropdowns: DropdownView[];
			pages: PageSourceView[];
			status: PublishStatus;
			availability: { ok: boolean; reason?: string };
		}>('GET', '/api/admin/pages'),
	get: (path: string) => request<PageSourceView>('GET', `/api/admin/pages/${path}`),
	create: (page: PageInput, cover: { type: string; data: string } | null) =>
		request<{ ok: true; href: string | null }>('POST', '/api/admin/pages', { page, cover: cover ?? undefined }),
	update: (path: string, page: PageInput, cover: CoverUpdate) =>
		request<{ ok: true; href: string | null }>('PUT', `/api/admin/pages/${path}`, { page, cover }),
	remove: (path: string) => request<{ ok: true }>('DELETE', `/api/admin/pages/${path}`, { confirm: path }),
};

/** Nouvel ordre d'un ou plusieurs niveaux du menu (`racine`, `dropdown:<dossier>`), cf. saveMenuOrder(). */
export const menuOrderApi = {
	save: (levels: Record<string, string[]>) => request<{ ok: true }>('PUT', '/api/admin/ordre-menu', { levels }),
};

export const sitePagesApi = {
	update: (id: string, input: SitePageInput) =>
		request<{ ok: true }>('PUT', `/api/admin/pages-du-site/${encodeURIComponent(id)}`, input),
};

export const dropdownsApi = {
	create: (input: { label: string; folder: string }) =>
		request<{ ok: true }>('POST', '/api/admin/menus-deroulants', input),
	update: (folder: string, input: { label: string }) =>
		request<{ ok: true }>('PUT', `/api/admin/menus-deroulants/${encodeURIComponent(folder)}`, input),
	remove: (folder: string) => request<{ ok: true }>('DELETE', `/api/admin/menus-deroulants/${encodeURIComponent(folder)}`, { confirm: folder }),
};

export const versionApi = {
	get: () => request<ModelVersionInfo>('GET', '/api/admin/version'),
};

export const journalApi = {
	list: (year?: string) =>
		request<{ years: string[]; year: string; entries: JournalEntry[] }>(
			'GET',
			`/api/admin/journal${year ? `?annee=${encodeURIComponent(year)}` : ''}`,
		),
};
