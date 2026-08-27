export interface Category {
	slug: string;
	label: string;
	icon: string;
	description: string;
}

export const categories: Category[] = [
	{
		slug: 'parcours',
		label: 'Parcours',
		icon: 'fa-route',
		description: "Des parcours d'apprentissage progressifs, du grand débutant au perfectionnement.",
	},
	{
		slug: 'ateliers',
		label: 'Ateliers',
		icon: 'fa-screwdriver-wrench',
		description: 'Des ateliers pratiques pour prendre en main vos usages numériques du quotidien.',
	},
	{
		slug: 'mediation-numerique',
		label: 'Médiation numérique',
		icon: 'fa-people-group',
		description: "Un accompagnement individuel ou collectif animé par notre conseillère numérique.",
	},
	{
		slug: 'fablab',
		label: 'FabLab',
		icon: 'fa-cubes',
		description: 'Un espace de fabrication numérique pour créer, prototyper et apprendre en faisant.',
	},
];

export function getCategory(slug: string): Category | undefined {
	return categories.find((category) => category.slug === slug);
}
