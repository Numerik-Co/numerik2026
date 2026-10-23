/**
 * Réglages du plugin RDV propres à l'association : `src/content/rdv.yaml`
 * (fichier de l'asso, jamais remplacé par une mise à jour, commenté). Tout y
 * est facultatif : les valeurs par défaut ci-dessous sont **génériques**
 * (aucune référence à un dispositif particulier) ; chaque association y met
 * son adresse, ses textes, ses permanences et ses zones.
 *
 * Lu par `import.meta.glob` (le fichier peut manquer), validé ici, lecture
 * synchrone. Fichier invalide = build en échec avec le chemin du champ ;
 * plugin actif sans fichier = build en échec aussi (sans permanences, aucun
 * créneau : mieux vaut le dire que publier une page vide).
 *
 * Module serveur / build : l'îlot `RdvForm.vue` reçoit ce dont il a besoin en
 * props (`rdvFormProps()`), jamais le YAML.
 *
 * L'adresse de la page est aussi lue par `plugin.ts` (config Astro, sans
 * `?raw`) : même règle de format, `ADRESSE_RE`.
 */
import { z } from 'astro/zod';
import { parse as parseYaml } from 'yaml';
import { AGENDA_DAYS } from '../../../lib/agenda';
import { pluginActif } from '../..';
import { FORMATS } from '../../champs';
import { ADRESSE_DEFAUT, ADRESSE_RE } from './adresse';
import type { RdvFormReglages } from './types';

export const FICHIER = 'src/content/rdv.yaml';

/** Champs facultatifs de l'étape « profil » (et la civilité de l'étape « Vous »). */
export const CHAMPS_PROFIL = ['genre', 'commune', 'zone', 'trancheAge', 'statut'] as const;
export type ChampProfil = (typeof CHAMPS_PROFIL)[number];

const DUREES = [15, 20, 30, 45, 60] as const;

const texte = z.string({ error: 'texte attendu' }).trim().min(1, 'texte vide');

const heureSchema = z
	.string({ error: 'heure attendue, ex. 09h00' })
	.regex(/^\d{2}h\d{2}$/, 'heure au format 09h00')
	// Contrôles suivants seulement si le format est bon (un message à la fois).
	.refine((h) => !/^\d{2}h\d{2}$/.test(h) || /h(00|30)$/.test(h), 'heure pile ou demie (09h00, 09h30…)')
	.refine((h) => {
		if (!/^\d{2}h\d{2}$/.test(h)) return true;
		const n = Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
		return n >= 9 * 60 && n <= 20 * 60;
	}, 'entre 09h00 et 20h00');

const permanenceSchema = z
	.strictObject({
		day: z.enum(AGENDA_DAYS, { error: `jour attendu : ${AGENDA_DAYS.join(', ')}` }),
		start: heureSchema,
		end: heureSchema,
		location: z
			.string({ error: 'texte attendu' })
			.trim()
			.nullish()
			.transform((v) => v || undefined),
	})
	.refine((p) => !/^\d{2}h\d{2}$/.test(p.start) || !/^\d{2}h\d{2}$/.test(p.end) || p.start < p.end, {
		message: 'fin avant le début',
		path: ['end'],
	});

const zoneSchema = z.strictObject({
	label: texte,
	communes: z
		.array(texte, { error: 'liste de communes attendue' })
		.nullish()
		.transform((v) => v ?? []),
	// `40` (nombre YAML) accepté comme '40'.
	codePostal: z
		.preprocess(
			(v) => (typeof v === 'number' ? String(v) : v),
			z.string({ error: 'début de code postal attendu (ex. 40)' }).regex(/^\d{1,5}$/, 'chiffres seulement (ex. 40)').nullish(),
		)
		.transform((v) => v || undefined),
});

const DEFAUTS = {
	adresse: ADRESSE_DEFAUT,
	ouvert: true,
	textes: {
		nom: 'Prendre rendez-vous',
		titre: 'Prendre rendez-vous',
		description: 'Réservez un créneau de {duree} minutes pour un accompagnement individuel.',
		intervenant: 'notre équipe',
		dejaVenu: 'Je suis déjà venu·e',
		urgence: 'Le premier créneau de {heure} est réservé aux demandes urgentes.',
		consentement: "J'accepte que mes informations soient conservées par l'association pour l'organisation de ce rendez-vous.",
		fermeTitre: 'Prise de rendez-vous en ligne momentanément fermée',
		fermeMessage: "La prise de rendez-vous en ligne n'est pas ouverte actuellement. Vous pouvez nous contacter directement.",
	},
	encart: {
		surtitre: 'Sur rendez-vous',
		titre: 'Besoin d’un coup de main ?',
		texte: 'Prenez rendez-vous en ligne pour un accompagnement individuel, pas à pas.',
		bouton: 'Prendre rendez-vous',
		mention: 'Gratuit · {duree} minutes',
		logo: undefined as string | undefined,
		logoAlt: '',
	},
	planning: {
		titre: 'Rendez-vous',
		legende: 'Rendez-vous',
	},
	creneaux: {
		duree: 30 as (typeof DUREES)[number],
		semaines: 3,
		urgence: false,
	},
	profil: [...CHAMPS_PROFIL] as ChampProfil[],
	civilite: {} as Record<string, string>,
	icones: {} as Record<string, string>,
	permanences: [] as z.infer<typeof permanenceSchema>[],
	zones: [] as z.infer<typeof zoneSchema>[],
	/** Document Grist : vide = variables du `.env` (`lib/grist.ts`). La clé d'API reste dans le `.env`. */
	grist: {} as { url?: string; document?: string; tables?: { beneficiaires?: string; rdv?: string; demarches?: string } },
};

const formatChamp = (type: keyof typeof FORMATS) =>
	z.string({ error: 'texte attendu' }).trim().regex(FORMATS[type].re, FORMATS[type].message);

const partiel = <T extends z.ZodRawShape>(shape: T) => z.strictObject(shape).partial().nullish();

const schema = z
	.strictObject({
		adresse: z.string({ error: 'adresse attendue, ex. /rendez-vous' }).regex(ADRESSE_RE, 'adresse au format /rendez-vous (minuscules, chiffres, tirets)'),
		ouvert: z.boolean({ error: 'true ou false attendu' }),
		textes: partiel({
			nom: texte,
			titre: texte,
			description: texte,
			intervenant: texte,
			dejaVenu: texte,
			urgence: texte,
			consentement: texte,
			fermeTitre: texte,
			fermeMessage: texte,
		}),
		encart: partiel({
			surtitre: texte,
			titre: texte,
			texte,
			bouton: texte,
			mention: texte,
			logo: z.string({ error: 'nom de fichier attendu' }).regex(/^[\w.-]+\.(svg|png|jpe?g|webp)$/i, 'nom de fichier image (ex. logo-partenaire.svg)'),
			logoAlt: z.string({ error: 'texte attendu' }).trim(),
		}),
		planning: partiel({ titre: texte, legende: texte }),
		creneaux: partiel({
			duree: z.union(
				DUREES.map((d) => z.literal(d)),
				{ error: `durée en minutes : ${DUREES.join(', ')}` },
			),
			semaines: z.number({ error: 'nombre de semaines attendu' }).int().min(1, 'au moins 1').max(8, '8 au plus'),
			urgence: z.boolean({ error: 'true ou false attendu' }),
		}),
		profil: z.array(z.enum(CHAMPS_PROFIL, { error: `champ attendu : ${CHAMPS_PROFIL.join(', ')}` })).nullish(),
		civilite: z.record(texte, texte, { error: 'liste « valeur Grist: libellé » attendue' }).nullish(),
		icones: z.record(texte, z.string().regex(/^fa-[a-z0-9-]+$/, 'icône Font Awesome, ex. fa-landmark'), { error: 'liste « thématique: icône » attendue' }).nullish(),
		permanences: z
			.array(permanenceSchema)
			.nullish()
			.refine((list) => !list || new Set(list.map((p) => p.day)).size === list.length, 'deux permanences le même jour'),
		zones: z
			.array(zoneSchema)
			.nullish()
			.refine((list) => !list || new Set(list.map((zone) => zone.label)).size === list.length, 'deux zones ont le même label'),
		grist: partiel({
			url: formatChamp('url'),
			document: formatChamp('identifiant'),
			tables: partiel({ beneficiaires: formatChamp('table'), rdv: formatChamp('table'), demarches: formatChamp('table') }),
		}),
	})
	.partial()
	.nullish()
	.transform((v) => v ?? {});

/** Lit et valide le texte de `rdv.yaml` : réglages fusionnés avec les défauts. */
export function parseRdvConfig(text: string | undefined) {
	const result = schema.safeParse(text === undefined ? {} : parseYaml(text));
	if (!result.success) {
		const details = result.error.issues
			.map((i) => {
				const [racine, index, ...reste] = i.path;
				const where =
					(racine === 'permanences' || racine === 'zones') && typeof index === 'number'
						? `${racine === 'zones' ? 'zone' : 'permanence'} n°${index + 1}${reste.length ? ` · ${reste.join('.')}` : ''}`
						: i.path.join('.') || '(fichier)';
				const message = i.code === 'unrecognized_keys' ? `clé inconnue « ${i.keys.join(' », « ')} »` : i.message;
				return `  - ${where} : ${message}`;
			})
			.join('\n');
		throw new Error(`${FICHIER} invalide :\n${details}`);
	}
	const o = result.data;
	return {
		adresse: o.adresse ?? DEFAUTS.adresse,
		ouvert: o.ouvert ?? DEFAUTS.ouvert,
		textes: { ...DEFAUTS.textes, ...o.textes },
		encart: { ...DEFAUTS.encart, ...o.encart },
		planning: { ...DEFAUTS.planning, ...o.planning },
		creneaux: { ...DEFAUTS.creneaux, ...o.creneaux },
		profil: o.profil ?? DEFAUTS.profil,
		civilite: o.civilite ?? DEFAUTS.civilite,
		icones: o.icones ?? DEFAUTS.icones,
		permanences: (o.permanences ?? DEFAUTS.permanences).toSorted((a, b) => AGENDA_DAYS.indexOf(a.day) - AGENDA_DAYS.indexOf(b.day)),
		zones: o.zones ?? DEFAUTS.zones,
		grist: { ...o.grist, tables: { ...o.grist?.tables } },
	};
}

export type RdvConfig = ReturnType<typeof parseRdvConfig>;

const fichiers = import.meta.glob<string>('../../../content/rdv.yaml', { eager: true, query: '?raw', import: 'default' });
const raw = Object.values(fichiers)[0];

if (raw === undefined && pluginActif('rdv')) {
	throw new Error(
		`Plugin « rdv » actif mais ${FICHIER} absent : créez-le (adresse de la page, textes, permanences…) ` +
			'd’après src/plugins/rdv/README.md, ou désactivez le plugin (plugins: rdv: false dans src/content/reglages.yaml).',
	);
}

export const rdvConfig: RdvConfig = parseRdvConfig(raw);

/** Ce que la page passe en props à `RdvForm.vue`. */
export function rdvFormProps(): RdvFormReglages & { zones: RdvConfig['zones'] } {
	const { textes, creneaux, profil, civilite, icones, zones } = rdvConfig;
	return {
		textes: { nom: textes.nom, intervenant: textes.intervenant, dejaVenu: textes.dejaVenu, urgence: textes.urgence, consentement: textes.consentement },
		duree: creneaux.duree,
		profil,
		civilite,
		icones,
		zones,
	};
}

/** Remplace `{duree}`, `{heure}`… dans un texte de `rdv.yaml`. */
export function remplir(texteSource: string, valeurs: Record<string, string | number>): string {
	return texteSource.replace(/\{(\w+)\}/g, (tout, cle: string) => (cle in valeurs ? String(valeurs[cle]) : tout));
}
