export default {
  // JS Object dédié au rafraîchissement périodique (polling) — contient des
  // appels d'action (.run()), donc à NE JAMAIS référencer depuis un champ
  // "donnée" comme le Default Model (même règle que EcoleVisionLoader du
  // temps d'Airtable). À déclencher depuis Page Settings → On page load.
  //
  // Ce n'est PAS du vrai temps réel poussé (Appsmith n'a pas de WebSocket
  // vers Postgres) — c'est un rafraîchissement périodique qui donne l'effet
  // du temps réel pour un usage humain (dashboard consulté à l'écran).

  intervalId: null,

  // PREMIER CHARGEMENT IMMÉDIAT (ajout 2026-10-15). Avant, rien n'était chargé au démarrage : le premier remplissage
  // des tableaux n'arrivait qu'au premier tour du minuteur de startPolling (donc après « secondes », 20 s par défaut).
  // On lance maintenant tout de suite les requêtes qui n'ont pas encore de données (et qui ne sont pas déjà en cours),
  // sans toucher à celles qui sont déjà chargées.
  premierChargement() {
    const requetes = [getMonProfil, getAppelsManques, getPlanificationSms, getConfigurationSms, getMessages, getEmployes];
    requetes.forEach((q) => {
      if (!Array.isArray(q.data) && !q.isLoading) q.run().catch(() => null);
    });
  },

  // secondes : l'intervalle entre chaque rafraîchissement (20-30s est un bon
  // compromis entre réactivité et charge sur la base — à ajuster si besoin).
  startPolling(secondes) {
    if (this.intervalId) return; // évite de doubler la boucle si rappelé
    this.premierChargement();
    const ms = (secondes || 20) * 1000;
    this.intervalId = setInterval(() => {
      getAppelsManques.run();
      getPlanificationSms.run();
      getConfigurationSms.run();
      getMessages.run();
    }, ms);
  },

  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  },

  chatIntervalId: null,

  // Relecture rapide des messages, tant qu'une conversation est ouverte dans le widget.
  startChat(secondes) {
    if (this.chatIntervalId) return;
    this.chatIntervalId = setInterval(() => {
      getMessages.run();
    }, (secondes || 5) * 1000);
  },

  stopChat() {
    if (this.chatIntervalId) {
      clearInterval(this.chatIntervalId);
      this.chatIntervalId = null;
    }
  },
};
