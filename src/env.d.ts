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
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
