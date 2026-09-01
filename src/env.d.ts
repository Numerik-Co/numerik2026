/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly GRIST_BASE_URL: string;
	readonly GRIST_DOC_ID: string;
	readonly GRIST_API_KEY: string;
	readonly GRIST_TABLE_MEMBRES?: string;
	readonly GRIST_TABLE_ADHESIONS?: string;
	readonly GRIST_TABLE_INSCRIPTIONS?: string;
	readonly GRIST_TABLE_COTISATIONS?: string;
	readonly GRIST_TABLE_ACTIVITES?: string;
	readonly GRIST_TABLE_SAISONS?: string;
	/** Bulletin d'adhésion en PDF (cf. docs/bulletin-pdf.md) — GOTENBERG_URL + BULLETIN_SECRET requis pour activer. */
	readonly GOTENBERG_URL?: string;
	readonly GOTENBERG_USERNAME?: string; // auth HTTP Basic Gotenberg, optionnel
	readonly GOTENBERG_PASSWORD?: string;
	readonly BULLETIN_SECRET?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
