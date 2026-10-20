export default {
  // JS Object à nommer exactement « AssetManager » (clic droit sur JSObject1 > Rename).
  // Appelé par l'événement onTeleverserLogo du Custom Widget : {{AssetManager.televerserLogo()}}
  // Le jeton du serveur de fichiers reste dans la datasource assets-uploader : il n'apparaît jamais ici.

  errorMessage(statusCode) {
    const code = String(statusCode || "").slice(0, 3);
    const texte = {
      "400": "Nom, type ou contenu de fichier non permis.",
      "401": "Jeton d'upload absent ou invalide dans la datasource : contacte Ops.",
      "404": "Le service d'upload ne trouve pas /files : contacte Ops.",
      "409": "Ce nom existe déjà.",
      "413": "Fichier trop volumineux (5 Mo max).",
    }[code] || "Service d'upload indisponible ou erreur inattendue : réessaie ou contacte Ops.";
    return code ? `${texte} (code ${code})` : texte;
  },

  // Téléverse le logo choisi dans le widget (model.logoUpload = { name, data }) puis recharge la liste.
  // « overwrite: true » : le logo est toujours remplacé sous le même nom (logo-entreprise.<ext>).
  // Le résultat est rangé dans le store (logoUploadResult) : le JS Object de configuration le passe au widget,
  // qui libère son bouton et affiche le message dans le bloc « Logo de l'entreprise ».
  async televerserLogo() {
    const up = Custom1.model.logoUpload;
    if (!up || !up.data || !up.name) {
      await storeValue("logoUploadResult", { ok: false, message: "Aucun fichier à téléverser.", at: Date.now() }, false);
      return;
    }
    try {
      await uploadAsset.run({ name: up.name, data: up.data, overwrite: true });
      await listAssets.run();
      await storeValue("logoUploadResult", { ok: true, message: "Logo mis à jour.", at: Date.now() }, false);
      showAlert("Logo mis à jour.", "success");
    } catch (e) {
      const msg = this.errorMessage(uploadAsset.responseMeta && uploadAsset.responseMeta.statusCode);
      await storeValue("logoUploadResult", { ok: false, message: msg, at: Date.now() }, false);
      showAlert(msg, "error");
    }
  },
};
