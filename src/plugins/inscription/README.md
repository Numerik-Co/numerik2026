# Plugin « inscription » : inscription aux activités

Page publique `/inscription` et bouton **« S'inscrire »** des fiches
d'activité : un·e adhérent·e (retrouvé·e par nom et prénom) ou une personne
extérieure (fiche `Membres` minimale, rôle Contact) s'inscrit à une activité
de la saison en cours, en liste d'attente si elle est complète ; une activité
pas encore publiée donne une **préinscription** (intérêt noté dans les
commentaires du membre). Parcours, tarifs et présélection depuis la fiche :
[inscription.md](../../../docs/inscription.md).

**Requiert le plugin [`adhesion`](../adhesion/README.md)** (`requiert` du
catalogue) : même document Grist, et l'inscription passe par ses routes
`/api/adhesion/membre` (retrouver l'adhérent·e) et `/api/adhesion/inscription`
(enregistrer l'inscription, aussi utilisée par le formulaire d'adhésion).
C'est le seul autre plugin dont il importe le code.

**Actif par défaut**, sauf si l'adhésion est inactive. Pour le retirer seul :

```yaml
plugins:
  inscription: false
```

ou la case « Plugin actif » du module **Plugins** (super admin), qui refuse de
l'activer tant que l'adhésion ne l'est pas. Ouverture et fermeture du
formulaire (encart « fermé » à la place) : `forms.inscription` de
`reglages.yaml`.

## Plugin inactif

- `/inscription` et les routes `/api/inscription/*` n'existent pas (404) ;
- les fiches d'activité n'ont plus de bouton « S'inscrire », et le module
  « Activités » ne propose plus les réglages d'inscription d'une fiche
  (bouton affiché, activités Grist visées), gardés tels quels dans les
  fichiers ;
- plan du site et liens proposés dans l'espace bénévoles : sans `/inscription`.

## Organisation

| Fichier / dossier | Contenu |
| :--- | :--- |
| `plugin.ts` | Manifeste : page `/inscription`, routes `/api/inscription/*` |
| `index.ts` | Ce que le reste du site utilise : `INSCRIPTION_HREF`, `inscriptionEnLigne()` |
| `pages/inscription.astro` | Page, formulaire entouré de `<FormGate form="inscription">` |
| `formulaire/` | Îlot Vue `InscriptionForm.vue` (3 étapes : profil, activité, récapitulatif) et son client (`inscriptionApi`, plus `adhesionApi` du plugin adhésion) |
| `api/offre.ts` | `GET /api/inscription/offre` : activités proposées (cible de la fiche ou toutes les publiées), tarifs, places |
| `api/preinscription.ts` | `POST /api/inscription/preinscription` : intérêt noté dans `Membres.Commentaires` |
| `api/participant-exterieur.ts` | `POST /api/inscription/participant-exterieur` : fiche `Membres` minimale (rôle Contact) |
