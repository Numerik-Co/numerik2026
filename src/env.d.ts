/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly GRIST_BASE_URL: string;
	readonly GRIST_DOC_ID: string;
	readonly GRIST_TABLE_ID: string;
	readonly GRIST_API_KEY: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
