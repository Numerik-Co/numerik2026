/**
 * PDF d'une semaine de RDV (module « Rendez-vous », bouton par semaine) :
 * vue semaine en A4 paysage — logo de l'association, une colonne par
 * jour de permanence (ou portant un RDV), chaque créneau libre ou occupé
 * (démarche, nom de l'usager et son message ; statut pour une semaine
 * terminée seulement). RDV « Annulé » non repris : le créneau apparaît libre. HTML
 * converti par Gotenberg (`htmlToPdf()`, partagé avec le bulletin d'adhésion).
 *
 * RGPD (minimisation) : document imprimé, donc ni coordonnées ni commune
 * du bénéficiaire — consultables dans le module si besoin.
 * Code serveur uniquement (noms des bénéficiaires).
 */
import { association } from '../../../lib/association';
import { site } from '../../../config/site';
import { rdvConfig } from '../lib/config';
import { horairesDuJour } from '../lib/creneaux';
import { STATUT_RDV } from '../lib/grist';
import type { RdvAdmin } from './gestion';

// Logo en data URI : Gotenberg ne peut pas aller le chercher sur le site.
const logos: Record<string, string> = import.meta.glob('../../../content/images/logo.{png,jpg,jpeg,webp,svg}', {
	eager: true,
	query: '?inline',
	import: 'default',
});
const logo = Object.values(logos)[0] ?? '';

const FUSEAU = 'Europe/Paris';

const echapper = (s: string) =>
	s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** yyyy-mm-dd + n jours (calcul à midi UTC : pas de glissement de jour). */
function plusJours(iso: string, n: number): string {
	const d = new Date(`${iso}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

/** Lundi de la semaine d'une date. */
export function lundiDe(iso: string): string {
	const jour = new Date(`${iso}T12:00:00Z`).getUTCDay(); // 0 = dimanche
	return plusJours(iso, -((jour + 6) % 7));
}

/** Date en toutes lettres, « 1er » pour le premier du mois. */
const format = (iso: string, options: Intl.DateTimeFormatOptions) =>
	new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...options })
		.format(new Date(`${iso}T12:00:00Z`))
		.replace(/(^|\s)1(?=\s)/, '$11er');
const capitaliser = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « du lundi 26 octobre au vendredi 30 octobre 2026 » (`dernier` : dernier jour affiché). */
function periode(lundi: string, dernier: string): string {
	const memeAnnee = lundi.slice(0, 4) === dernier.slice(0, 4);
	const debut = format(lundi, { weekday: 'long', day: 'numeric', month: 'long', ...(memeAnnee ? {} : { year: 'numeric' }) });
	const fin = format(dernier, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
	return `du ${debut} au ${fin}`;
}

interface Ligne {
	heure: string;
	rdv: RdvAdmin[];
}

/** Créneaux d'un jour : ceux de la permanence, plus les RDV tombés hors grille (déplacés dans Grist…). */
function lignesDuJour(date: string, rdvs: RdvAdmin[]): { lieu: string; lignes: Ligne[] } {
	const permanence = horairesDuJour(date);
	const lignes: Ligne[] = (permanence?.horaires ?? []).map((h) => ({ heure: h.heure, rdv: [] }));
	for (const r of rdvs) {
		let ligne = lignes.find((l) => l.heure === r.heure);
		if (!ligne) lignes.push((ligne = { heure: r.heure, rdv: [] }));
		ligne.rdv.push(r);
	}
	lignes.sort((a, b) => a.heure.localeCompare(b.heure));
	return { lieu: permanence?.lieu || rdvs.find((r) => r.lieu)?.lieu || '', lignes };
}

/** Carte d'un RDV : démarche (gras, bleu comme l'heure), nom de l'usager, message. */
function carteRdv(r: RdvAdmin, avecStatut: boolean): string {
	const b = r.beneficiaire;
	const nom = [b.prenom, b.nom].filter(Boolean).join(' ') || 'Bénéficiaire inconnu·e';
	const commentaire = r.commentaire.length > 140 ? `${r.commentaire.slice(0, 140)}…` : r.commentaire;
	const statut = avecStatut && r.statut && r.statut !== STATUT_RDV.confirme ? `<span class="statut">${echapper(r.statut)}</span>` : '';
	return `<div class="rdv">
		<div class="demarche">${echapper(r.demarches.join(', ') || 'Démarche non précisée')}${statut}</div>
		<div class="usager">${echapper(nom)}</div>
		${commentaire ? `<div class="commentaire">« ${echapper(commentaire)} »</div>` : ''}
	</div>`;
}

/** Document HTML complet de la semaine du `lundi`. */
export function semaineHtml(lundi: string, tous: RdvAdmin[]): string {
	const jours = Array.from({ length: 7 }, (_, i) => plusJours(lundi, i));
	const rdvs = tous.filter((r) => r.date >= jours[0] && r.date <= jours[6] && r.statut !== STATUT_RDV.annule);
	const colonnes = jours
		.map((date) => ({ date, ...lignesDuJour(date, rdvs.filter((r) => r.date === date)) }))
		.filter((j) => j.lignes.length);

	// Statut (Honoré, Absent…) montré seulement pour une semaine terminée.
	const passee = jours[6] < new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU }).format(new Date());
	const edite = new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, dateStyle: 'long', timeStyle: 'short' }).format(new Date());
	const total = rdvs.length;
	// Vendredi, ou plus tard si une permanence (ou un RDV) tombe le week-end.
	const dernier = [jours[4], ...colonnes.map((j) => j.date)].sort().at(-1)!;

	const corps = colonnes.length
		? `<div class="semaine" style="grid-template-columns: repeat(${colonnes.length}, minmax(0, 1fr))">
			${colonnes
				.map(
					(j) => `<section class="jour">
				<header>
					<div class="date">${echapper(capitaliser(format(j.date, { weekday: 'long', day: 'numeric', month: 'long' })))}</div>
					${j.lieu ? `<div class="lieu">${echapper(j.lieu)}</div>` : ''}
				</header>
				${j.lignes
					.map(
						(l) => `<div class="creneau${l.rdv.length ? '' : ' libre'}">
					<div class="heure">${echapper(l.heure.replace(':', 'h'))}</div>
					<div class="contenu">${l.rdv.length ? l.rdv.map((r) => carteRdv(r, passee)).join('') : 'Libre'}</div>
				</div>`,
					)
					.join('')}
			</section>`,
				)
				.join('')}
		</div>`
		: '<p class="vide">Aucune permanence ni aucun rendez-vous cette semaine.</p>';

	return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${echapper(`${rdvConfig.textes.nom} — semaine ${periode(lundi, dernier)}`)}</title>
<style>
	@page { size: A4 landscape; margin: 10mm; }
	:root { --primary: ${site.colors.primary}; }
	* { box-sizing: border-box; }
	body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 8pt; color: #1f2937; }
	.entete { display: flex; align-items: center; gap: 5mm; padding-bottom: 3mm; }
	.entete img { height: 14mm; width: auto; }
	.entete h1 { margin: 0; font-size: 14pt; color: #111827; }
	.entete .semaine-du { display: block; margin-top: 0.5mm; font-size: 11pt; font-weight: 600; color: #374151; }
	/* Bande de couleurs de la barre de navigation (BrandStripe.astro, colors.stripe). */
	.bande { display: flex; height: 1mm; margin-bottom: 4mm; }
	.bande span { flex: 1; }
	.entete .total { margin-left: auto; white-space: nowrap; text-align: right; font-size: 9pt; color: #374151; }
	.semaine { display: grid; gap: 3mm; align-items: start; }
	.jour { border: 0.3mm solid #e5e7eb; border-radius: 2mm; overflow: hidden; }
	.jour header { background: var(--primary); color: #fff; padding: 2mm 2.5mm; }
	.jour .date { font-weight: 700; font-size: 9pt; }
	.jour .lieu { font-size: 7.5pt; opacity: 0.9; }
	.creneau { display: flex; gap: 1mm; padding: 1.5mm 2.5mm; border-top: 0.2mm solid #e5e7eb; break-inside: avoid; }
	.creneau:first-of-type { border-top: 0; }
	.heure { width: 9mm; flex-shrink: 0; font-weight: 700; color: var(--primary); }
	.contenu { min-width: 0; flex: 1; }
	.libre .contenu { color: #9ca3af; font-style: italic; }
	.rdv + .rdv { margin-top: 1.5mm; padding-top: 1.5mm; border-top: 0.2mm dashed #e5e7eb; }
	.demarche { font-weight: 700; color: var(--primary); }
	.usager { font-weight: 600; color: #111827; }
	.commentaire { margin-top: 0.5mm; color: #6b7280; font-style: italic; }
	.statut { margin-left: 1.5mm; padding: 0 1.5mm; border-radius: 1mm; background: #fef3c7; color: #92400e; font-size: 6.5pt; font-weight: 600; }
	.vide { margin-top: 10mm; text-align: center; font-size: 11pt; color: #6b7280; }
	/* Bas de chaque page (élément fixe : répété par Chromium à l'impression). */
	.pied { position: fixed; bottom: 0; left: 0; right: 0; font-size: 7pt; color: #9ca3af; text-align: right; }
	body { padding-bottom: 6mm; }
</style>
</head>
<body>
	<div class="entete">
		${logo ? `<img src="${logo}" alt="${echapper(association.name)}" />` : ''}
		<h1>${echapper(rdvConfig.textes.nom)}<span class="semaine-du">Semaine ${echapper(periode(lundi, dernier))}</span></h1>
		<div class="total">${total} rendez-vous</div>
	</div>
	<div class="bande">${site.colors.stripe.map((c) => `<span style="background: ${c}"></span>`).join('')}</div>
	${corps}
	<div class="pied">Édité le ${echapper(edite)} · document interne, contient des données personnelles</div>
</body>
</html>`;
}

/** Nom du fichier téléchargé : `rendez-vous-semaine-2026-10-26.pdf`. */
export const nomFichier = (lundi: string) => `rendez-vous-semaine-${lundi}.pdf`;
