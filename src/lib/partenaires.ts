export interface Partenaire {
	name: string;
	role: string;
	url?: string;
}

// Partenaires listés sur la plaquette de présentation 2025-2026.
export const partenaires: Partenaire[] = [
	{
		name: 'Mairie de Saint-Pierre-du-Mont',
		role: "Co-porte le poste de conseiller numérique et soutient l'inclusion numérique sur la commune.",
	},
	{
		name: "ALPI — Agence Landaise Pour l'Informatique",
		role: "Coordonne le réseau des conseillers numériques et le portail landais de l'inclusion numérique.",
	},
	{
		name: 'Informatique40',
		role: "Partenaire principal : 5 % de remise sur le matériel neuf et 10 % sur les consommables pour les adhérent·e·s.",
	},
	{
		name: "La Ligue de l'enseignement — Fédération des Landes",
		role: "Réseau d'éducation populaire auquel l'association est affiliée.",
	},
	{
		name: 'Les Francas des Landes',
		role: "Mouvement d'éducation populaire tourné vers l'enfance et la jeunesse.",
	},
	{
		name: 'Alliance du Numérique',
		role: "Membre du réseau national des acteurs de la médiation numérique.",
	},
];
