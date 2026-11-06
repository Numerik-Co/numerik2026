/**
 * Réglages du plugin facturation propres à l'entreprise :
 * `src/content/facturation.yaml` (modèle commenté `../facturation.exemple.yaml`).
 * Tout est facultatif (défauts ci-dessous). Lu par `import.meta.glob` (le
 * fichier peut manquer), validé ici ; plugin actif sans fichier = build en
 * échec. Module serveur / build.
 */
import { z } from 'astro/zod';
import { parse as parseYaml } from 'yaml';
import { pluginActif } from '../..';
import { ADRESSE_DEFAUT, ADRESSE_RE } from './adresse';

export const FICHIER = 'src/content/facturation.yaml';

const texte = z.string({ error: 'texte attendu' }).trim().min(1, 'texte vide');
const jours = z.number({ error: 'nombre de jours attendu' }).int('nombre entier').min(0).max(365);
const modele = z
	.string({ error: 'texte attendu' })
	.refine((v) => v.includes('{numero}'), 'doit contenir {numero}');

const schema = z
	.strictObject({
		adresse: z.string().regex(ADRESSE_RE, 'adresse au format /devis (minuscules, chiffres, tirets)'),
		ouvert: z.boolean({ error: 'true ou false attendu' }),
		textes: z
			.strictObject({ titre: texte, description: texte, consentement: texte, confirmation: texte, fermeTitre: texte, fermeMessage: texte })
			.partial(),
		devis: z.strictObject({ validiteJours: jours, conditions: texte }).partial(),
		factures: z.strictObject({ delaiJours: jours, conditions: texte, modesPaiement: z.array(texte).min(1) }).partial(),
		tva: texte,
		paiement: z
			.strictObject({ iban: z.string().nullish(), bic: z.string().nullish() })
			.partial(),
		numerotation: z.strictObject({ devis: modele, factures: modele }).partial(),
	})
	.partial()
	.nullish()
	.transform((v) => v ?? {});

const DEFAUTS = {
	adresse: ADRESSE_DEFAUT,
	ouvert: true,
	textes: {
		titre: 'Demander un devis',
		description: 'Décrivez votre besoin : vous recevez un devis détaillé, gratuit et sans engagement.',
		consentement: "J'accepte que ces informations servent à établir et suivre mon devis.",
		confirmation: 'Merci ! Votre demande est bien arrivée : vous recevrez votre devis rapidement.',
		fermeTitre: 'Demandes de devis suspendues',
		fermeMessage: 'Les demandes en ligne sont momentanément fermées : contactez-nous directement.',
	},
	devis: {
		validiteJours: 30,
		conditions: 'Devis gratuit. Pour l’accepter : le retourner daté et signé, précédé de la mention « Bon pour accord ».',
	},
	factures: {
		delaiJours: 30,
		conditions:
			"Pas d'escompte pour paiement anticipé. En cas de retard : pénalités au taux de trois fois le taux d'intérêt légal et, pour un client professionnel, indemnité forfaitaire de 40 € pour frais de recouvrement (art. L441-10 du Code de commerce).",
		modesPaiement: ['Virement', 'Chèque', 'Espèces', 'Carte bancaire'],
	},
	tva: 'TVA non applicable, article 293 B du CGI',
	numerotation: { devis: 'D-{annee}-{numero}', factures: 'F-{annee}-{numero}' },
};

export function parseFacturationConfig(raw: string | undefined) {
	const result = schema.safeParse(raw ? parseYaml(raw) : {});
	if (!result.success) {
		const details = result.error.issues
			.map((i) => `  - ${i.path.join('.') || '(fichier)'} : ${i.code === 'unrecognized_keys' ? `clé inconnue « ${i.keys.join(' », « ')} »` : i.message}`)
			.join('\n');
		throw new Error(`${FICHIER} invalide :\n${details}`);
	}
	const o = result.data;
	return {
		adresse: o.adresse ?? DEFAUTS.adresse,
		ouvert: o.ouvert ?? DEFAUTS.ouvert,
		textes: { ...DEFAUTS.textes, ...o.textes },
		devis: { ...DEFAUTS.devis, ...o.devis },
		factures: { ...DEFAUTS.factures, ...o.factures },
		tva: o.tva ?? DEFAUTS.tva,
		paiement: { iban: o.paiement?.iban?.trim() ?? '', bic: o.paiement?.bic?.trim() ?? '' },
		numerotation: { ...DEFAUTS.numerotation, ...o.numerotation },
	};
}

export type FacturationConfig = ReturnType<typeof parseFacturationConfig>;

const fichiers = import.meta.glob<string>('../../../content/facturation.yaml', { eager: true, query: '?raw', import: 'default' });
const raw = Object.values(fichiers)[0];

if (raw === undefined && pluginActif('facturation')) {
	throw new Error(
		`Plugin « facturation » actif mais ${FICHIER} absent : copiez src/plugins/facturation/facturation.exemple.yaml, ` +
			'ou désactivez le plugin (plugins: facturation: false dans src/content/reglages.yaml).',
	);
}

export const facturationConfig: FacturationConfig = parseFacturationConfig(raw);
