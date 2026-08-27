export const association = {
	name: 'NUMERIK&Co',
	description:
		"Une association qui accompagne la découverte et l'appropriation du numérique pour toutes et tous.",
	email: 'contact@clubmicrosaintpierre.fr',
	phone: '09 51 93 77 06',
	address: {
		street: '40, impasse Georges Sabde',
		postalCode: '40280',
		city: 'Saint-Pierre-du-Mont',
	},
	social: {
		facebook: 'https://www.facebook.com/clubmicrosaintpierre',
	},
	legal: {
		registrationNumber: '', // Numéro SIRET ou RNA
		siretNumber: '', // Numéro SIRET ou RNA
		president: 'M. BURKE Xavier',
		publicationManager: 'M. BURKE Xavier', // Nom du responsable de la publication (souvent le président)
		publicationManagerRole: 'M. BURKE Xavier', // Fonction de ce responsable dans l'association
		hosting: {
			name: '',
			address: '',
			phone: '',
		},
	},
};

export function getFullAddress(): string {
	return `${association.address.street}, ${association.address.postalCode} ${association.address.city}`;
}
