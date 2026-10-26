export default {
  // JS Object à nommer exactement « EmployeManager » (clic droit sur JSObject1 > Rename).
  // Appelé par les événements du Custom Widget (Paramètres > Employés) :
  //   onEnregistrerEmploye -> {{EmployeManager.enregistrer()}}
  //   onSupprimerEmploye   -> {{EmployeManager.supprimer()}}
  // Le résultat est rangé dans le store (employeResultat) : le widget l'affiche en message.

  async dire(ok, message) {
    await storeValue("employeResultat", { ok, message, at: Date.now() }, false);
  },

  // Équivalent automatique du clic sur Run dans l'éditeur : relance les requêtes qui n'ont pas encore rendu leurs données
  // (sans toucher à celles déjà chargées ni à celles en cours), puis change la valeur « dataVersion » du store, ce qui force
  // Appsmith à recalculer le modèle du widget (getModel lit appsmith.store.dataVersion). Appelé par le widget toutes les 2,5 s
  // pendant le chargement (30 s au plus).
  async rafraichir() {
    const requetes = [getMonProfil, getPlanificationSms, getAppelsManques, getConfigurationSms, getMessages, getEmployes];
    await Promise.all(requetes.filter((q) => !Array.isArray(q.data) && !q.isLoading).map((q) => q.run().catch(() => null)));
    await storeValue("dataVersion", Date.now(), false);
  },

  // Ajout ou modification d'une personne. model.employeSauvegarde = { ancienEmail, email, nom, role, cles }
  //  - cles : « * » pour la direction (aucun bureau), sinon la liste des bureaux séparés par des virgules.
  // On ajoute / met à jour d'abord (upsertEmploye), puis on retire ce qui n'est plus voulu (nettoyerEmploye) :
  // si l'ajout échoue, rien n'est supprimé.
  async enregistrer() {
    const p = Custom1.model.employeSauvegarde;
    if (!p) return;
    // Demande de rafraîchissement du widget (données pas encore arrivées) : on ne fait que rafraîchir.
    if (p.charger) { await this.rafraichir(); return; }
    if (!p.email) return;
    try {
      await upsertEmploye.run({ email: p.email, nom: p.nom, role: p.role, cles: p.cles });
      if (p.ancienEmail) await nettoyerEmploye.run({ ancienEmail: p.ancienEmail, email: p.email, cles: p.cles });
      await getEmployes.run();
      await getMonProfil.run();
      // Nouvel employé seulement (ancienEmail vide) : invitation dans Appsmith par le flux n8n. Un échec ici n'annule pas l'enregistrement.
      const suite = p.ancienEmail ? "" : await this.inviter(p.email);
      await this.dire(true, "Employé enregistré." + suite);
    } catch (e) {
      await getEmployes.run();
      await this.dire(false, "L'enregistrement a échoué : réessayez ou contactez le support.");
      showAlert("Enregistrement de l'employé impossible.", "error");
    }
  },

  // Invite la personne dans Appsmith (App Viewer) via la requête REST « inviterEmploye » (webhook n8n). Renvoie une phrase à
  // ajouter au message de l'enregistrement ; ne lance jamais d'exception.
  async inviter(email) {
    try {
      const r = await inviterEmploye.run({ email });
      if (r && r.statut === "deja_membre") return " Cette personne a déjà accès à Appsmith.";
      if (r && r.ok && r.courrielEnvoye) return " Un courriel d'invitation lui a été envoyé.";
      if (r && r.ok && r.lienInscription) return " Invitation créée, mais le courriel n'a pas pu être envoyé : transmettez-lui ce lien d'inscription : " + r.lienInscription;
      return " L'invitation Appsmith n'a pas abouti" + (r && r.message ? " (" + r.message + ")" : "") + " : invitez la personne à la main.";
    } catch (e) {
      return " L'invitation Appsmith a échoué : invitez la personne à la main.";
    }
  },

  // Retire l'accès Appsmith des personnes déjà supprimées de chat.employes, via la requête REST « retirerEmploye » (webhook n8n),
  // une personne à la fois. Renvoie une phrase à ajouter au message de la suppression ; ne lance jamais d'exception.
  // Les refus du flux (400, 409, 502) font lancer une exception à run() : ils tombent dans le catch.
  async retirerAppsmith(emails) {
    const liste = String(emails || "").split(",").map((e) => e.trim()).filter(Boolean);
    const phrases = [];
    for (const email of liste) {
      let phrase;
      try {
        const r = await retirerEmploye.run({ email });
        phrase = r && r.message ? r.message : "Son accès à Appsmith n'a pas pu être vérifié : à vérifier à la main dans Appsmith.";
      } catch (e) {
        phrase = "Son accès à Appsmith n'a pas pu être retiré : à retirer à la main dans Appsmith.";
      }
      phrases.push(liste.length > 1 ? email + " : " + phrase : phrase);
    }
    return phrases.length ? " " + phrases.join(" ") : "";
  },

  // Retire des personnes. model.employesSupprimes = { emails } (adresses séparées par des virgules)
  // Suppression dans chat.employes d'abord (le flux de retrait Appsmith refuse une personne encore présente), puis retrait Appsmith.
  async supprimer() {
    const p = Custom1.model.employesSupprimes;
    if (!p || !p.emails) return;
    try {
      await supprimerEmploye.run({ emails: p.emails });
      await getEmployes.run();
      await getMonProfil.run();
      const suite = await this.retirerAppsmith(p.emails);
      await this.dire(true, (String(p.emails).indexOf(",") >= 0 ? "Employés retirés de la page Employés." : "Employé retiré de la page Employés.") + suite);
    } catch (e) {
      await getEmployes.run();
      await this.dire(false, "La suppression a échoué : réessayez ou contactez le support.");
      showAlert("Suppression de l'employé impossible.", "error");
    }
  },
};
