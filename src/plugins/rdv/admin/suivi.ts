/**
 * Compte rendu d'un RDV, saisi après coup depuis le module « Rendez-vous » :
 * colonnes facultatives de la table `RDV` (`SUIVI`). Seules celles qui
 * existent dans le document Grist de l'association sont proposées, avec leurs
 * choix lus dans Grist (gardés 5 minutes en mémoire).
 *
 * Code serveur uniquement.
 */
import { listColumns, TABLES } from '../lib/grist';

/** Colonne de compte rendu : `cle` = nom de colonne Grist ; type attendu (`choix` = Choice, `choix-multiples` = ChoiceList). */
export interface ChampSuivi {
	cle: string;
	label: string;
	groupe: 'compte-rendu' | 'avis';
	type: 'choix' | 'choix-multiples' | 'texte';
	aide?: string;
}

export const SUIVI: ChampSuivi[] = [
	{ cle: 'Lieu_reel', label: 'Lieu réel du rendez-vous', groupe: 'compte-rendu', type: 'choix' },
	{ cle: 'Materiel_utilise', label: 'Matériel utilisé', groupe: 'compte-rendu', type: 'choix-multiples' },
	{ cle: 'Sous_thematique_demarche', label: 'Sous-thématique de la démarche', groupe: 'compte-rendu', type: 'choix-multiples' },
	{ cle: 'Niveau_autonomie', label: "Niveau d'autonomie", groupe: 'compte-rendu', type: 'choix' },
	{ cle: 'Oriente_autre_structure', label: 'Orienté·e vers une autre structure', groupe: 'compte-rendu', type: 'choix' },
	{ cle: 'Notes_accompagnement', label: "Notes d'accompagnement", groupe: 'compte-rendu', type: 'texte' },
	{ cle: 'Evaluation_satisfaction', label: 'Satisfaction', groupe: 'avis', type: 'choix' },
	{ cle: 'Suggestions_beneficiaire', label: 'Suggestions', groupe: 'avis', type: 'texte' },
];

/** Champ de compte rendu disponible dans le document, avec ses choix. */
export interface ChampSuiviDispo extends ChampSuivi {
	choix: string[];
}

const TYPE_GRIST: Record<ChampSuivi['type'], string> = { choix: 'Choice', 'choix-multiples': 'ChoiceList', texte: 'Text' };
const DUREE_CACHE_MS = 5 * 60 * 1000;
let cache: { champs: ChampSuiviDispo[]; expire: number } | null = null;

/** Colonnes de `SUIVI` présentes dans la table `RDV`, avec le bon type. */
export async function champsSuivi(): Promise<ChampSuiviDispo[]> {
	if (cache && cache.expire > Date.now()) return cache.champs;
	const colonnes = new Map((await listColumns(TABLES.rdv)).map((c) => [c.id, c]));
	const champs = SUIVI.flatMap((s) => {
		const c = colonnes.get(s.cle);
		return c && c.type === TYPE_GRIST[s.type] ? [{ ...s, choix: c.choices }] : [];
	});
	cache = { champs, expire: Date.now() + DUREE_CACHE_MS };
	return champs;
}

/** Valeur d'un champ lue dans Grist → texte ou liste (`['L', …]` des ChoiceList retiré). */
export function lireSuivi(champ: ChampSuivi, brut: unknown): string | string[] {
	if (champ.type === 'choix-multiples') {
		return Array.isArray(brut) ? brut.filter((x): x is string => typeof x === 'string' && x !== 'L') : [];
	}
	return typeof brut === 'string' ? brut : '';
}

/** Valeur saisie → valeur à écrire, ou message d'erreur (choix inconnu). */
export function ecrireSuivi(champ: ChampSuiviDispo, saisie: unknown): { valeur: string | string[] | null; lu: string | string[] } | { erreur: string } {
	if (champ.type === 'choix-multiples') {
		const liste = Array.isArray(saisie) ? saisie.filter((x): x is string => typeof x === 'string') : [];
		const inconnu = liste.find((x) => !champ.choix.includes(x));
		if (inconnu) return { erreur: `${champ.label} : choix inconnu « ${inconnu} ».` };
		return { valeur: liste.length ? ['L', ...liste] : null, lu: liste };
	}
	const texte = typeof saisie === 'string' ? saisie.trim() : '';
	if (champ.type === 'choix' && texte && !champ.choix.includes(texte)) return { erreur: `${champ.label} : choix inconnu « ${texte} ».` };
	return { valeur: texte, lu: texte };
}
