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
      await this.dire(true, "Employé enregistré.");
    } catch (e) {
      await getEmployes.run();
      await this.dire(false, "L'enregistrement a échoué : réessayez ou contactez le support.");
      showAlert("Enregistrement de l'employé impossible.", "error");
    }
  },

  // Retire des personnes. model.employesSupprimes = { emails } (adresses séparées par des virgules)
  async supprimer() {
    const p = Custom1.model.employesSupprimes;
    if (!p || !p.emails) return;
    try {
      await supprimerEmploye.run({ emails: p.emails });
      await getEmployes.run();
      await getMonProfil.run();
      await this.dire(true, "Employé retiré.");
    } catch (e) {
      await getEmployes.run();
      await this.dire(false, "La suppression a échoué : réessayez ou contactez le support.");
      showAlert("Suppression de l'employé impossible.", "error");
    }
  },
};
