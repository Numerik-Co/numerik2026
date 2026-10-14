/**
 * Fichier `.md` d'une actualité, d'une page ou d'une fiche (navigateur) :
 * en-tête YAML (frontmatter) + texte Markdown. Sert au téléchargement du
 * contenu en cours d'édition et à la lecture d'un fichier chargé
 * (`EditFileBar.vue`), ainsi qu'aux modèles du module « Pages ». Le
 * serveur revalide tout à l'enregistrement.
 */
import { parse as parseYaml, stringify } from 'yaml';

/** Même limite que le texte côté serveur. */
export const MARKDOWN_FILE_MAX = 200 * 1024;

const empty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

/** `---` + en-tête (valeurs vides retirées) + `---` + texte. */
export function buildMarkdownFile(frontmatter: Record<string, unknown>, body: string): string {
	const data = Object.fromEntries(Object.entries(frontmatter).filter(([, v]) => !empty(v)));
	return `---\n${stringify(data, { lineWidth: 0 })}---\n\n${body.trim()}\n`;
}

export function downloadMarkdown(name: string, text: string): void {
	const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = name;
	link.click();
	URL.revokeObjectURL(url);
}

/** Sépare et lit l'en-tête d'un fichier ; `error` = fichier inutilisable. */
export function parseMarkdownFile(source: string): { data?: Record<string, unknown>; body: string; error?: string } {
	const clean = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
	const match = clean.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
	if (!match) return { body: '', error: 'En-tête introuvable : le fichier doit commencer par un bloc --- … ---.' };
	try {
		const parsed = parseYaml(match[1]);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
		return { data: parsed as Record<string, unknown>, body: clean.slice(match[0].length).trim() };
	} catch {
		return { body: '', error: "En-tête illisible : vérifiez l'indentation et les guillemets entre les deux lignes ---." };
	}
}

/** Contrôles d'un fichier choisi (extension, taille) puis lecture ; `error` = message à afficher. */
export async function readMarkdownFile(file: File): Promise<{ data?: Record<string, unknown>; body: string; error?: string }> {
	if (!/\.(md|markdown)$/i.test(file.name)) return { body: '', error: 'Le fichier doit être un fichier Markdown (.md).' };
	if (file.size > MARKDOWN_FILE_MAX) return { body: '', error: 'Le fichier est trop long (200 Ko max).' };
	return parseMarkdownFile(await file.text());
}

/** Clés de l'en-tête non reprises : `ignored` = connues mais réglées ailleurs (message), les autres = inconnues. */
export function keyWarnings(data: Record<string, unknown>, known: readonly string[], ignored: Record<string, string | null> = {}): string[] {
	const warnings: string[] = [];
	for (const key of Object.keys(data)) {
		if (known.includes(key)) continue;
		if (key in ignored) {
			if (ignored[key]) warnings.push(`« ${key} » ignoré : ${ignored[key]}.`);
		} else warnings.push(`« ${key} » ignoré (champ inconnu).`);
	}
	return warnings;
}

/** Valeur texte d'un champ de l'en-tête (date YAML → AAAA-MM-JJ). */
export function textField(v: unknown): string {
	if (v instanceof Date) return v.toISOString().slice(0, 10);
	return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
}
