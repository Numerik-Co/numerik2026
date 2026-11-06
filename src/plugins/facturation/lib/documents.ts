/**
 * Clients, devis et factures dans le document Grist (module « Facturation »
 * et demande de devis publique). Règles :
 *  - un devis reçoit son numéro dès qu'il n'est plus une simple demande en
 *    ligne ;
 *  - une facture est un brouillon modifiable jusqu'à son **émission**, qui
 *    lui donne le numéro suivant de l'année (continu, chronologique : la date
 *    d'émission est celle du jour) et son échéance ; émise, seul son
 *    paiement (statut « Payée », date, mode) change, elle ne
 *    se supprime plus (une erreur se corrige par une facture d'avoir) ;
 *  - les montants sont recalculés ici (jamais repris du navigateur).
 *
 * Code serveur uniquement.
 */
import { facturationConfig } from './config';
import { aujourdhui, COLS, dateDepuisGrist, dateVersGrist, grist, plusJours, TABLES } from './grist';
import {
	centimes,
	montantLigne,
	problemeLigne,
	STATUTS_DEVIS,
	STATUTS_FACTURE,
	totalLignes,
	type Client,
	type ClientSaisie,
	type Devis,
	type Facture,
	type Ligne,
	type Prestation,
	type StatutDevis,
} from './types';

export class ErreurSaisie extends Error {}

const texte = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const nombre = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const ref = (v: unknown) => (typeof v === 'number' && v > 0 ? v : null);

// ---------------------------------------------------------------------------
// Lecture

function clientDepuis(id: number, f: Record<string, unknown>): Client {
	const c = COLS.client;
	return {
		id,
		nom: texte(f[c.nom]),
		societe: texte(f[c.societe]),
		email: texte(f[c.email]),
		telephone: texte(f[c.telephone]),
		adresse: texte(f[c.adresse]),
		codePostal: texte(f[c.codePostal]),
		ville: texte(f[c.ville]),
		siret: texte(f[c.siret]),
		notes: texte(f[c.notes]),
	};
}

export async function listerClients(): Promise<Client[]> {
	return (await grist.lister(TABLES.clients)).map((r) => clientDepuis(r.id, r.fields)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export async function listerPrestations(): Promise<Prestation[]> {
	const p = COLS.prestation;
	return (await grist.lister(TABLES.prestations))
		.filter((r) => r.fields[p.active] !== false)
		.map((r) => ({
			id: r.id,
			libelle: texte(r.fields[p.libelle]),
			description: texte(r.fields[p.description]),
			prixUnitaire: nombre(r.fields[p.prixUnitaire]),
			unite: texte(r.fields[p.unite]),
		}))
		.filter((p) => p.libelle);
}

/** Lignes regroupées par devis et par facture, dans l'ordre. */
async function lignesParDocument() {
	const l = COLS.ligne;
	const records = (await grist.lister(TABLES.lignes)).sort((a, b) => nombre(a.fields[l.ordre]) - nombre(b.fields[l.ordre]));
	const devis = new Map<number, Ligne[]>();
	const factures = new Map<number, Ligne[]>();
	for (const r of records) {
		const ligne: Ligne = {
			libelle: texte(r.fields[l.libelle]),
			quantite: nombre(r.fields[l.quantite]),
			unite: texte(r.fields[l.unite]),
			prixUnitaire: nombre(r.fields[l.prixUnitaire]),
		};
		const d = ref(r.fields[l.devis]);
		const f = ref(r.fields[l.facture]);
		if (d) devis.set(d, [...(devis.get(d) ?? []), ligne]);
		if (f) factures.set(f, [...(factures.get(f) ?? []), ligne]);
	}
	return { devis, factures };
}

export interface Donnees {
	clients: Client[];
	prestations: Prestation[];
	devis: Devis[];
	factures: Facture[];
}

export async function charger(): Promise<Donnees> {
	const [clients, prestations, devisRecords, factureRecords, lignes] = await Promise.all([
		listerClients(),
		listerPrestations(),
		grist.lister(TABLES.devis),
		grist.lister(TABLES.factures),
		lignesParDocument(),
	]);
	const d = COLS.devis;
	const f = COLS.facture;
	const factures: Facture[] = factureRecords.map((r) => {
		const lignesF = lignes.factures.get(r.id) ?? [];
		const statut = texte(r.fields[f.statut]);
		return {
			id: r.id,
			numero: texte(r.fields[f.numero]),
			clientId: ref(r.fields[f.client]),
			devisId: ref(r.fields[f.devis]),
			date: dateDepuisGrist(r.fields[f.date]),
			datePrestation: texte(r.fields[f.datePrestation]),
			echeance: dateDepuisGrist(r.fields[f.echeance]),
			objet: texte(r.fields[f.objet]),
			statut: (STATUTS_FACTURE as readonly string[]).includes(statut) ? (statut as Facture['statut']) : 'Brouillon',
			datePaiement: dateDepuisGrist(r.fields[f.datePaiement]),
			modePaiement: texte(r.fields[f.modePaiement]),
			notes: texte(r.fields[f.notes]),
			lignes: lignesF,
			total: totalLignes(lignesF),
		};
	});
	const devis: Devis[] = devisRecords.map((r) => {
		const lignesD = lignes.devis.get(r.id) ?? [];
		const statut = texte(r.fields[d.statut]);
		return {
			id: r.id,
			numero: texte(r.fields[d.numero]),
			clientId: ref(r.fields[d.client]),
			date: dateDepuisGrist(r.fields[d.date]),
			validite: dateDepuisGrist(r.fields[d.validite]),
			objet: texte(r.fields[d.objet]),
			statut: (STATUTS_DEVIS as readonly string[]).includes(statut) ? (statut as StatutDevis) : 'Brouillon',
			message: texte(r.fields[d.message]),
			notes: texte(r.fields[d.notes]),
			lignes: lignesD,
			total: totalLignes(lignesD),
			factureId: factures.find((x) => x.devisId === r.id)?.id ?? null,
		};
	});
	const parDateDesc = <T extends { date: string; id: number }>(a: T, b: T) => b.date.localeCompare(a.date) || b.id - a.id;
	return { clients, prestations, devis: devis.sort(parDateDesc), factures: factures.sort(parDateDesc) };
}

// ---------------------------------------------------------------------------
// Numérotation (continue dans l'année ; un seul serveur : file d'attente en mémoire)

let file: Promise<unknown> = Promise.resolve();
function enSerie<T>(tache: () => Promise<T>): Promise<T> {
	const suite = file.then(tache, tache);
	file = suite.catch(() => {});
	return suite;
}

function prochainNumero(modele: string, existants: string[], date: string): string {
	const annee = date.slice(0, 4);
	const motif = new RegExp(
		`^${modele
			.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
			.replace('\\{annee\\}', annee)
			.replace('\\{numero\\}', '(\\d+)')}$`,
	);
	const max = existants.reduce((m, n) => {
		const x = n.match(motif);
		return x ? Math.max(m, Number(x[1])) : m;
	}, 0);
	return modele.replace('{annee}', annee).replace('{numero}', String(max + 1).padStart(3, '0'));
}

async function numerosDe(table: string): Promise<string[]> {
	return (await grist.lister(table)).map((r) => texte(r.fields[COLS.devis.numero])).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Saisies

function lireLignes(raw: unknown): Ligne[] {
	if (!Array.isArray(raw)) throw new ErreurSaisie('Lignes attendues.');
	if (raw.length > 60) throw new ErreurSaisie('60 lignes au plus.');
	const lignes = raw.map((x) => {
		const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
		return {
			libelle: texte(o.libelle).slice(0, 300),
			quantite: Number(o.quantite),
			unite: texte(o.unite).slice(0, 30),
			prixUnitaire: centimes(Number(o.prixUnitaire)),
		};
	});
	lignes.forEach((l, i) => {
		const p = problemeLigne(l, i + 1);
		if (p) throw new ErreurSaisie(p);
	});
	return lignes;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const lireDate = (v: unknown, quoi: string, obligatoire = false) => {
	const d = texte(v);
	if (!d) {
		if (obligatoire) throw new ErreurSaisie(`${quoi} : date obligatoire.`);
		return '';
	}
	if (!DATE_RE.test(d) || Number.isNaN(Date.parse(d))) throw new ErreurSaisie(`${quoi} : date invalide.`);
	return d;
};

async function remplacerLignes(champ: 'devis' | 'facture', id: number, lignes: Ligne[]) {
	const l = COLS.ligne;
	const anciennes = await grist.lister(TABLES.lignes, { [l[champ]]: [id] });
	await grist.supprimer(
		TABLES.lignes,
		anciennes.map((r) => r.id),
	);
	await grist.creer(
		TABLES.lignes,
		lignes.map((x, i) => ({
			[l[champ]]: id,
			[l.ordre]: i + 1,
			[l.libelle]: x.libelle,
			[l.quantite]: x.quantite,
			[l.unite]: x.unite,
			[l.prixUnitaire]: x.prixUnitaire,
			[l.montant]: montantLigne(x),
		})),
	);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function lireClient(raw: unknown): ClientSaisie {
	const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	const c: ClientSaisie = {
		nom: texte(o.nom).slice(0, 120),
		societe: texte(o.societe).slice(0, 120),
		email: texte(o.email).slice(0, 120),
		telephone: texte(o.telephone).slice(0, 40),
		adresse: texte(o.adresse).slice(0, 200),
		codePostal: texte(o.codePostal).slice(0, 10),
		ville: texte(o.ville).slice(0, 80),
		siret: texte(o.siret).replace(/\s/g, '').slice(0, 14),
		notes: texte(o.notes).slice(0, 2000),
	};
	if (!c.nom) throw new ErreurSaisie('Client : nom obligatoire.');
	if (c.email && !EMAIL_RE.test(c.email)) throw new ErreurSaisie('Client : adresse email invalide.');
	if (c.siret && !/^\d{9}(\d{5})?$/.test(c.siret)) throw new ErreurSaisie('Client : SIREN (9 chiffres) ou SIRET (14 chiffres) attendu.');
	return c;
}

function champsClient(c: ClientSaisie) {
	const k = COLS.client;
	return {
		[k.nom]: c.nom,
		[k.societe]: c.societe,
		[k.email]: c.email,
		[k.telephone]: c.telephone,
		[k.adresse]: c.adresse,
		[k.codePostal]: c.codePostal,
		[k.ville]: c.ville,
		[k.siret]: c.siret,
		[k.notes]: c.notes,
	};
}

export async function enregistrerClient(id: number | null, saisie: ClientSaisie): Promise<number> {
	if (id) {
		await grist.modifier(TABLES.clients, [{ id, fields: champsClient(saisie) }]);
		return id;
	}
	const [nouveau] = await grist.creer(TABLES.clients, [{ ...champsClient(saisie), [COLS.client.creeLe]: dateVersGrist(aujourdhui()) }]);
	return nouveau;
}

// ---------------------------------------------------------------------------
// Devis

interface DevisSaisie {
	clientId: number;
	date: string;
	validite: string;
	objet: string;
	statut: StatutDevis;
	notes: string;
	lignes: Ligne[];
}

export function lireDevis(raw: unknown): DevisSaisie {
	const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	const clientId = ref(o.clientId);
	if (!clientId) throw new ErreurSaisie('Choisissez un client.');
	const statut = texte(o.statut);
	if (!(STATUTS_DEVIS as readonly string[]).includes(statut)) throw new ErreurSaisie('Statut de devis inconnu.');
	const date = lireDate(o.date, 'Date du devis', true);
	const lignes = lireLignes(o.lignes);
	if (!lignes.length && statut !== 'Demande') throw new ErreurSaisie('Ajoutez au moins une ligne.');
	return {
		clientId,
		date,
		validite: lireDate(o.validite, 'Validité') || plusJours(date, facturationConfig.devis.validiteJours),
		objet: texte(o.objet).slice(0, 200),
		statut: statut as StatutDevis,
		notes: texte(o.notes).slice(0, 2000),
		lignes,
	};
}

export async function enregistrerDevis(id: number | null, s: DevisSaisie): Promise<number> {
	return enSerie(async () => {
		const d = COLS.devis;
		let numero = '';
		if (id) {
			const [actuel] = await grist.lister(TABLES.devis, { id: [id] });
			if (!actuel) throw new ErreurSaisie('Devis introuvable.');
			numero = texte(actuel.fields[d.numero]);
		}
		if (!numero && s.statut !== 'Demande') numero = prochainNumero(facturationConfig.numerotation.devis, await numerosDe(TABLES.devis), s.date);
		const champs = {
			[d.numero]: numero,
			[d.client]: s.clientId,
			[d.date]: dateVersGrist(s.date),
			[d.validite]: dateVersGrist(s.validite),
			[d.objet]: s.objet,
			[d.statut]: s.statut,
			[d.notes]: s.notes,
			[d.total]: totalLignes(s.lignes),
		};
		let devisId = id;
		if (devisId) await grist.modifier(TABLES.devis, [{ id: devisId, fields: champs }]);
		else [devisId] = await grist.creer(TABLES.devis, [{ ...champs, [d.creeLe]: dateVersGrist(aujourdhui()) }]);
		await remplacerLignes('devis', devisId!, s.lignes);
		return devisId!;
	});
}

export async function supprimerDevis(id: number): Promise<void> {
	const { devis } = await charger();
	const d = devis.find((x) => x.id === id);
	if (!d) throw new ErreurSaisie('Devis introuvable.');
	if (d.factureId) throw new ErreurSaisie('Ce devis a été facturé : il ne peut plus être supprimé.');
	if (d.statut === 'Accepté') throw new ErreurSaisie('Un devis accepté ne se supprime pas.');
	await remplacerLignes('devis', id, []);
	await grist.supprimer(TABLES.devis, [id]);
}

/** Crée la facture (brouillon) d'un devis, qui passe « Accepté ». */
export async function facturerDevis(id: number): Promise<number> {
	const { devis } = await charger();
	const d = devis.find((x) => x.id === id);
	if (!d) throw new ErreurSaisie('Devis introuvable.');
	if (d.factureId) throw new ErreurSaisie('Ce devis a déjà sa facture.');
	if (d.statut === 'Demande' || !d.numero) throw new ErreurSaisie("Enregistrez d'abord le devis (il reçoit alors son numéro).");
	if (!d.clientId) throw new ErreurSaisie('Devis sans client.');
	if (!d.lignes.length) throw new ErreurSaisie('Devis sans ligne.');
	const factureId = await enregistrerFacture(null, {
		clientId: d.clientId,
		devisId: d.id,
		datePrestation: '',
		objet: d.objet,
		notes: '',
		lignes: d.lignes,
	});
	await grist.modifier(TABLES.devis, [{ id, fields: { [COLS.devis.statut]: 'Accepté', [COLS.devis.numero]: d.numero } }]);
	return factureId;
}

// ---------------------------------------------------------------------------
// Factures

interface FactureSaisie {
	clientId: number;
	devisId: number | null;
	datePrestation: string;
	objet: string;
	notes: string;
	lignes: Ligne[];
}

export function lireFacture(raw: unknown): FactureSaisie {
	const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	const clientId = ref(o.clientId);
	if (!clientId) throw new ErreurSaisie('Choisissez un client.');
	const lignes = lireLignes(o.lignes);
	if (!lignes.length) throw new ErreurSaisie('Ajoutez au moins une ligne.');
	return {
		clientId,
		devisId: ref(o.devisId),
		datePrestation: texte(o.datePrestation).slice(0, 100),
		objet: texte(o.objet).slice(0, 200),
		notes: texte(o.notes).slice(0, 2000),
		lignes,
	};
}

async function factureActuelle(id: number) {
	const [r] = await grist.lister(TABLES.factures, { id: [id] });
	if (!r) throw new ErreurSaisie('Facture introuvable.');
	return { statut: texte(r.fields[COLS.facture.statut]) || 'Brouillon', numero: texte(r.fields[COLS.facture.numero]) };
}

/** Crée ou modifie une facture **brouillon**. */
export async function enregistrerFacture(id: number | null, s: FactureSaisie): Promise<number> {
	const f = COLS.facture;
	if (id && (await factureActuelle(id)).statut !== 'Brouillon') throw new ErreurSaisie('Facture émise : elle ne se modifie plus (seul son paiement).');
	const champs = {
		[f.client]: s.clientId,
		[f.devis]: s.devisId ?? 0,
		[f.datePrestation]: s.datePrestation,
		[f.objet]: s.objet,
		[f.notes]: s.notes,
		[f.total]: totalLignes(s.lignes),
	};
	let factureId = id;
	if (factureId) await grist.modifier(TABLES.factures, [{ id: factureId, fields: champs }]);
	else [factureId] = await grist.creer(TABLES.factures, [{ ...champs, [f.statut]: 'Brouillon', [f.creeLe]: dateVersGrist(aujourdhui()) }]);
	await remplacerLignes('facture', factureId!, s.lignes);
	return factureId!;
}

/** Émission : numéro suivant de l'année, date du jour, échéance ; plus modifiable ensuite. */
export async function emettreFacture(id: number): Promise<string> {
	return enSerie(async () => {
		const actuelle = await factureActuelle(id);
		if (actuelle.statut !== 'Brouillon') throw new ErreurSaisie('Facture déjà émise.');
		const { factures } = await charger();
		const facture = factures.find((x) => x.id === id)!;
		if (!facture.lignes.length) throw new ErreurSaisie('Facture sans ligne.');
		if (!facture.clientId) throw new ErreurSaisie('Facture sans client.');
		const date = aujourdhui();
		const derniere = factures.filter((x) => x.numero).reduce((m, x) => (x.date > m ? x.date : m), '');
		if (derniere > date) throw new ErreurSaisie(`Une facture est datée du ${derniere} : la numérotation doit rester chronologique.`);
		const numero = prochainNumero(facturationConfig.numerotation.factures, await numerosDe(TABLES.factures), date);
		const f = COLS.facture;
		await grist.modifier(TABLES.factures, [
			{
				id,
				fields: {
					[f.numero]: numero,
					[f.date]: dateVersGrist(date),
					[f.echeance]: dateVersGrist(plusJours(date, facturationConfig.factures.delaiJours)),
					[f.statut]: 'Émise',
					[f.total]: facture.total,
				},
			},
		]);
		return numero;
	});
}

/** Paiement d'une facture émise (`paye: false` = paiement annulé, retour à « Émise »). */
export async function enregistrerPaiement(id: number, raw: unknown): Promise<void> {
	const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	const actuelle = await factureActuelle(id);
	if (actuelle.statut === 'Brouillon') throw new ErreurSaisie("Émettez d'abord la facture.");
	const f = COLS.facture;
	const paye = o.paye === true;
	const mode = texte(o.modePaiement).slice(0, 60);
	if (paye && !mode) throw new ErreurSaisie('Indiquez le mode de paiement.');
	await grist.modifier(TABLES.factures, [
		{
			id,
			fields: {
				[f.statut]: paye ? 'Payée' : 'Émise',
				[f.datePaiement]: paye ? dateVersGrist(lireDate(o.datePaiement, 'Date de paiement', true)) : null,
				[f.modePaiement]: paye ? mode : '',
			},
		},
	]);
}

export async function supprimerFacture(id: number): Promise<void> {
	if ((await factureActuelle(id)).statut !== 'Brouillon') throw new ErreurSaisie('Une facture émise ne se supprime pas : établissez une facture d’avoir.');
	await remplacerLignes('facture', id, []);
	await grist.supprimer(TABLES.factures, [id]);
}

// ---------------------------------------------------------------------------
// Demande de devis publique

export interface Demande {
	nom: string;
	societe: string;
	email: string;
	telephone: string;
	adresse: string;
	codePostal: string;
	ville: string;
	message: string;
	prestationIds: number[];
}

/** Rapproche le client par email (sinon le crée) et ajoute un devis « Demande » avec les prestations choisies. */
export async function enregistrerDemande(d: Demande): Promise<void> {
	const c = COLS.client;
	const existants = await grist.lister(TABLES.clients, { [c.email]: [d.email] });
	const client = lireClient({ ...d, siret: '', notes: '' });
	const clientId = existants[0]?.id ?? (await enregistrerClient(null, client));
	if (existants[0]) {
		// Coordonnées complétées, jamais effacées.
		const f = existants[0].fields;
		const maj: Record<string, unknown> = {};
		for (const [cle, col] of [
			['telephone', c.telephone],
			['adresse', c.adresse],
			['codePostal', c.codePostal],
			['ville', c.ville],
			['societe', c.societe],
		] as const) {
			if (!texte(f[col]) && client[cle]) maj[col] = client[cle];
		}
		if (Object.keys(maj).length) await grist.modifier(TABLES.clients, [{ id: clientId, fields: maj }]);
	}
	const prestations = (await listerPrestations()).filter((p) => d.prestationIds.includes(p.id));
	const lignes: Ligne[] = prestations.map((p) => ({ libelle: p.libelle, quantite: 1, unite: p.unite, prixUnitaire: p.prixUnitaire }));
	const date = aujourdhui();
	const dv = COLS.devis;
	const [devisId] = await grist.creer(TABLES.devis, [
		{
			[dv.client]: clientId,
			[dv.date]: dateVersGrist(date),
			[dv.validite]: dateVersGrist(plusJours(date, facturationConfig.devis.validiteJours)),
			[dv.objet]: prestations.map((p) => p.libelle).join(', ').slice(0, 200) || 'Demande en ligne',
			[dv.statut]: 'Demande',
			[dv.message]: d.message,
			[dv.total]: totalLignes(lignes),
			[dv.creeLe]: dateVersGrist(date),
		},
	]);
	await remplacerLignes('devis', devisId, lignes);
}
