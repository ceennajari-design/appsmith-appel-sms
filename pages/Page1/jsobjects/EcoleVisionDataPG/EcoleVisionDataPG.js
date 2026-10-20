export default {
  // ============================================================
  // CONFIG CLIENT — À PERSONNALISER POUR CHAQUE NOUVEAU CLIENT
  // C'est le SEUL bloc à modifier pour adapter ce produit à un
  // nouveau client similaire (même schéma de base : appels manqués
  // + planification SMS + modèles de messages). Tout le reste du
  // fichier, du widget.js et du widget.css est réutilisable tel quel.
  // ============================================================

  NOM_ENTREPRISE: "Ecole de conduite Vision",

  // Logo de repli : laissé vide volontairement. Le logo vient uniquement de ce qui est téléversé
  // depuis Paramètres > « Logo de l'entreprise » (aucun lien externe).
  LOGO_URL: "",

  // Nom (sans extension) du fichier logo téléversé depuis Paramètres > « Logo de l'entreprise ».
  // Doit être identique à LOGO_BASE dans widgetJs.
  LOGO_BASE: "logo-entreprise",

  // Accès par bureau (profil lu dans chat.employes par la requête getMonProfil).
  // false = transition : une personne absente de chat.employes voit tout, comme avant.
  // true  = une personne absente de chat.employes ne voit aucun bureau.
  ACCES_STRICT: false,

  BUREAUX: [
    "Latuque",
    "Shawinigan",
    "Trois-Rivieres (CDLM)",
    "Trois-Rivieres Ouest",
  ],

  // Email de l'utilisateur Appsmith connecté -> nom du bureau auquel
  // il/elle appartient. Utilisé en secours (voir widget.js) quand on
  // ajoute un plan depuis "Tous les bureaux" plutôt que depuis la page
  // d'un bureau précis. Reconstituer cette liste avec les vrais emails
  // des employés du nouveau client (comptes App Viewer par bureau).
  BUREAU_PAR_EMPLOYE: {
    "latuque@ecoledeconduitevision.com": "Latuque",
    "isabellebertrand@ecoledeconduitevision.com": "Latuque",
    "ecolevision@cloudtel.ca": "Shawinigan",
    "info@ecoledeconduitevision.com": "Shawinigan",
    "tr@ecoledeconduitevision.com": "Trois-Rivieres (CDLM)",
    "tro@ecoledeconduitevision.com": "Trois-Rivieres Ouest",
  },

  // ============================================================
  // FIN DE LA CONFIG CLIENT — ne pas modifier en dessous de cette
  // ligne pour un nouveau déploiement (sauf vrai changement de
  // logique métier).
  // ============================================================

  // URL du logo à afficher : le fichier le plus récent « logo-entreprise.<ext> » de la liste des
  // fichiers téléversés (requête listAssets), avec ?v=<date de modification> pour contourner le
  // cache d'une heure du serveur de fichiers. Sans fichier (ou si listAssets n'a pas pu être lue),
  // on garde LOGO_URL : rien ne casse.
  logoUrl() {
    const fichiers = Array.isArray(listAssets.data) ? listAssets.data : [];
    const logos = fichiers
      .filter((f) => f && typeof f.name === "string" && f.name.startsWith(this.LOGO_BASE + "."))
      .sort((a, b) => (b.mtime || 0) - (a.mtime || 0));
    if (!logos.length) return this.LOGO_URL || "";
    return `https://${appsmith.URL.host}${logos[0].url}?v=${logos[0].mtime || 0}`;
  },

  // Vrai tant que la liste des fichiers (listAssets) n'est pas arrivée sous forme de tableau : le widget
  // n'affiche alors aucun logo (ni icône par défaut), pour éviter un clignotement au rechargement.
  // Si la liste n'arrive jamais (erreur), le widget affiche l'icône par défaut après un délai (voir renderLogo).
  logoEnCours() {
    return !!listAssets.isLoading || !Array.isArray(listAssets.data);
  },

  // Profil d'accès de la personne connectée, d'après getMonProfil (lecture de chat.employes) :
  //  - rôle « direction » : voit tous les bureaux ;
  //  - rôle « employe » : voit seulement ses bureaux (une ligne par bureau) ;
  //  - personne inconnue : tout (ACCES_STRICT = false) ou rien (ACCES_STRICT = true).
  // « tous » = peut voir « Tous les bureaux » ; « bureaux » = bureaux accessibles.
  profil() {
    const tousLesBureaux = this.BUREAUX || [];
    const lignes = Array.isArray(getMonProfil.data) ? getMonProfil.data : [];
    if (lignes.some((l) => l.role === "direction" || l.role === "directrice")) {
      return { connu: true, role: "direction", tous: true, bureaux: tousLesBureaux };
    }
    if (lignes.length) {
      return { connu: true, role: "employe", tous: false, bureaux: tousLesBureaux.filter((b) => lignes.some((l) => l.bureau === b)) };
    }
    return { connu: false, role: "", tous: !this.ACCES_STRICT, bureaux: this.ACCES_STRICT ? [] : tousLesBureaux };
  },

  getModel() {
    const monEmail = (appsmith.user && appsmith.user.email) || "";
    const monNom = (appsmith.user && appsmith.user.name) || monEmail || "";
    const p = this.profil();
    const monBureau = (this.BUREAU_PAR_EMPLOYE || {})[monEmail] || (!p.tous && p.bureaux.length === 1 ? p.bureaux[0] : "");
    const urlLogo = this.logoUrl();

    return {
      app: {
        nom: this.NOM_ENTREPRISE,
        logoUrl: urlLogo,
        logoChargement: this.logoEnCours(),
        // Vrai seulement si la liste des fichiers est arrivée et ne contient aucun logo : seul cas où le widget
        // affiche l'icône par défaut sans attendre.
        logoAbsent: Array.isArray(listAssets.data) && !urlLogo,
        utilisateur: monNom || "Connextek Admin",
        monEmail: monEmail,
        monBureau: monBureau,
        notifications: 0,
      },
      profil: p,
      logoResultat: appsmith.store.logoUploadResult || null,
      employes: Array.isArray(getEmployes.data) ? getEmployes.data : [],
      employeResultat: appsmith.store.employeResultat || null,
      // true = la requête n'a pas encore rendu ses données : le widget affiche « Chargement des données… »
      // au lieu d'un tableau vide qui ressemble à une panne.
      chargement: {
        profil: !Array.isArray(getMonProfil.data),
        sms: !Array.isArray(getPlanificationSms.data),
        appels: !Array.isArray(getAppelsManques.data),
        modeles: !Array.isArray(getConfigurationSms.data),
        messages: !Array.isArray(getMessages.data),
        employes: !Array.isArray(getEmployes.data),
      },
      // Change à chaque rafraîchissement demandé par le widget (EmployeManager.rafraichir) : force Appsmith à recalculer ce modèle.
      version: appsmith.store.dataVersion || 0,
      // Thème choisi (« dark » / « light ») mémorisé par l'événement onChangerTheme ; null = jamais choisi.
      theme: appsmith.store.theme || null,
      bureaux: p.bureaux,
      sms: getPlanificationSms.data || [],
      appels: getAppelsManques.data || [],
      modeles: getConfigurationSms.data || [],
      messages: getMessages.data || [],
    };
  },
};
