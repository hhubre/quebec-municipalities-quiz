const LANG_PREF_KEY = "quebec-quiz-lang";
const THEME_PREF_KEY = "quebec-quiz-theme";

/** @type {"fr" | "en"} */
let uiLang = "fr";

const MESSAGES = {
  fr: {
    pageTitle: "Quiz des municipalités du Québec",
    langSwitchAria: "Langue de l’interface",
    setupSectionAria: "Configuration du quiz",
    loading: "Chargement des données…",
    startQuiz: "Commencer le quiz",
    includeReserves: "Inclure réserves indiennes et villages nordiques",
    onlyReserves: "Uniquement réserves indiennes et villages nordiques",
    filterMrc: "Filtrer par MRC",
    mrcSearchPlaceholder: "Rechercher une MRC…",
    mrcSelectAll: "Tout sélectionner",
    mrcDeselectAll: "Tout désélectionner",
    mrcFilterAria: "Filtrer par MRC",
    gameBarAria: "Partie en cours",
    municipalityToFind: "Municipalité à trouver",
    timeLabel: "Temps",
    pause: "Pause",
    resume: "Reprendre",
    mapAria: "Carte du Québec",
    wrongAnswersTitle: "Mauvaises réponses",
    sourceLabel: "Source :",
    sourceLink: "Découpages administratifs 1/100 000 (MRNF)",
    setupChooseMrc:
      "Choisissez les <strong>MRC</strong> et les options ci-dessous, puis lancez le quiz.",
    setupMunicipalityCount: "{n} municipalité{s} dans votre sélection.",
    noMunicipalitiesSelection:
      "Aucune municipalité dans la sélection. Activez au moins une MRC.",
    quizFinished: "Quiz terminé !",
    quizFinishedTime:
      "Temps total : {time} · {n} municipalité{s}",
    locateScoreLabel: "Points",
    locateScoreAria: "Score total : {points} points",
    locateScoreLegend:
      "0 erreur : 3 pts · 1 erreur : 2 pts · 2 erreurs : 1 pt · 3 erreurs : 0 pt",
    locateQuizScore:
      "Score final : {points} points · Temps total : {time} · {n} municipalité{s}",
    nameModeQuizScore:
      "Vous avez {correct}/{total} bonnes réponses — bravo ! Temps total : {time}.",
    nameModeProgress: "{named} / {total} bonnes réponses",
    adjustFilters: "Ajustez les filtres pour continuer.",
    noMunicipalitiesPlay:
      "Aucune municipalité dans la sélection. Activez au moins une MRC.",
    wrongPlace: "C'est le mauvais endroit",
    correctAnswerConfirmed: "Bonne réponse sélectionnée.",
    successPerfect: "Bravo ! Bon endroit.",
    successOneWrong: "Bon endroit — 1 erreur avant la bonne réponse.",
    successTwoWrong: "Bon endroit — 2 erreurs avant la bonne réponse.",
    mrcSummary: "{enabled} / {totalMrc} MRC · {n} municipalité{s}",
    loadError:
      "Erreur de chargement. Lancez scripts/fetch_municipalities.py puis servez le dossier avec un serveur local.",
    creatorWordsTitle: "Mots du créateur",
    creatorWordsBody:
      "<p>Certaines entités ont été fusionnées, car il s'agissait du même toponyme (ex.&nbsp;: village et canton, paroisse et village, etc.)</p><p>Pour les homonymes qui désignent des lieux distincts&nbsp;; le libellé peut être précisé (réserve, municipalité de canton, etc.).</p><p>Les superficies indiquées correspondent aux superficies terrestres des municipalités et excluent les grandes étendues d'eau.</p>",
    gameModeLegend: "Mode de jeu",
    gameModeLocate: "Trouver sur la carte (nom affiché)",
    gameModeName: "Nommer la municipalité (point clignotant)",
    pickGameModeTitle: "Modes de jeu",
    gameModeLocateTitle: "Trouver sur la carte",
    gameModeLocateDesc: "Sélectionner le bon point sur la carte.",
    gameModeLocateAria: "Mode trouver sur la carte",
    gameModeNameTitle: "Nommer la municipalité",
    gameModeNameDesc: "Saisissez le nom de la municipalité qui clignote.",
    gameModeNameAria: "Mode nommer la municipalité",
    modeDemoLocateLabel: "Saint-Augustin",
    modeDemoNameTyping: "Saint-Augustin",
    setupChangeMode: "← Changer de mode",
    headerBackToModes: "← Modes",
    headerBackToModesAria: "Retour au choix du mode de jeu",
    setupSelectedModeLocate: "Mode : trouver sur la carte",
    setupSelectedModeName: "Mode : nommer la municipalité",
    setupSelectedModeTen: "Mode : dix sur la carte",
    gameModeTenTitle: "Dix sur la carte",
    gameModeTenDesc: "Nommez les 10 municipalités choisies aléatoirement.",
    gameModeTenAria: "Mode dix municipalités sur la carte",
    tenModeKicker: "Municipalité à trouver (parmi 10 points)",
    tenModeProgress: "{found} / {total} trouvées",
    tenModeNeedTen:
      "Ce mode nécessite au moins <strong>10 municipalités</strong> dans votre sélection ({n} actuellement).",
    tenModeFinished:
      "Les 10 municipalités trouvées ! Temps total : {time}.",
    tenModeReplay: "Rejouer",
    tenModeReplayAria: "Rejouer avec 10 nouvelles municipalités",
    modeDemoTenLabel: "Roberval",
    gameModeTypemaxTitle: "Nommer un maximum de municipalités",
    gameModeTypemaxDesc: "Nommez le plus de municipalités possible.",
    gameModeTypemaxAria: "Mode nommer un maximum de municipalités",
    setupSelectedModeTypemax: "Mode : nommer un maximum de municipalités",
    typemaxModeKicker: "Tapez le nom de chaque municipalité sur la carte",
    typemaxGuessPlaceholder: "Nom de la municipalité…",
    typemaxProgress: "{named} / {total} nommées",
    typemaxQuizScore:
      "Vous avez nommé {correct}/{total} municipalités — bravo ! Temps total : {time}.",
    typemaxUnknown: "Nom non reconnu dans votre sélection.",
    typemaxGiveUp: "Abandonner",
    typemaxRevealedByClick: "{nom} révélé",
    typemaxGiveUpTitle: "Partie terminée — réponses manquantes révélées",
    typemaxQuizScoreGiveUp:
      "{correct}/{total} nommées · {missed} révélées en rouge. Temps : {time}.",
    gameModeMiscTitle: "Quiz divers",
    gameModeMiscDesc: "Tableaux, statistiques et défis sans carte.",
    gameModeMiscAria: "Mode quiz divers",
    setupSelectedModeMisc: "Mode : quiz divers",
    miscSubmodeAria: "Choisir un défi du quiz divers",
    miscSubmodeHeading: "Défi",
    miscSubmodeTop10Saints: "Les Saint/Sainte les plus fréquents.",
    miscSubmodeTop10SaintsHint:
      "Classement calculé à partir de votre sélection (MRC et réserves). Le premier mot après Saint-, Sainte-, etc. compte (ex. Saint-Jean-sur-Richelieu → Saint-Jean).",
    miscSubmodeTop10LargestArea:
      "Top 10 des plus grandes municipalités (km²)",
    miscSubmodeTop10LargestAreaHint:
      "Superficie calculée à partir des limites officielles (fusion incluse, ex. Senneterre). Ajustez les MRC et les réserves ci-dessous.",
    miscSetupPrompt:
      "Choisissez le défi et les filtres, puis lancez le quiz.",
    miscNeedTenSaints:
      "Il faut au moins <strong>10 formes Saint/Sainte distinctes</strong> dans votre sélection ({n} trouvées).",
    miscNeedTenArea:
      "Il faut au moins <strong>10 municipalités</strong> avec une superficie dans votre sélection ({n} disponibles).",
    miscModeKicker: "Nommez les entrées du classement",
    miscGuessPlaceholder: "Saint-Jean, Sainte-Anne…",
    miscGuessPlaceholderArea: "Senneterre, Baie-James…",
    miscQuizInstructions:
      "Remplissez le tableau : chaque ligne est un prénom (Saint-X ou Sainte-X) partagé par au moins cinq municipalités au Québec.",
    miscLeaderboardRank: "Rang",
    miscLeaderboardSaint: "Saint / Sainte",
    miscLeaderboardMunicipality: "Municipalité",
    miscLeaderboardCount: "Municipalités",
    miscLeaderboardArea: "Superficie",
    miscLeaderboardEmpty: "???",
    miscProgress: "{found} / {total} trouvés",
    miscAlreadyFound: "Déjà dans le tableau.",
    miscUnknown: "Pas dans le top 10 de votre sélection.",
    miscQuizScore:
      "Vous avez trouvé {correct}/{total} — bravo ! Temps total : {time}.",
    miscQuizScoreGiveUp:
      "{correct}/{total} trouvés · réponses manquantes révélées. Temps : {time}.",
    typemaxNameFilterTitle: "Filtrer par début de nom",
    typemaxNameFilterSummary: "{active} filtre(s) · {n} municipalités",
    typemaxNameFilterSummaryAll: "Aucun filtre · {n} municipalités",
    typemaxNameFilterAria: "Filtrer par début de nom de municipalité",
    typemaxNameFilterClearAll: "Tout désélectionner",
    typemaxFilterSaintAndSaints: "Saint ({count})",
    typemaxFilterSainte: "Sainte ({count})",
    typemaxFilterSaintSlashSainte: "Saint/Sainte ({count})",
    typemaxFilterLac: "Lac ({count})",
    typemaxFilterNotreDame: "Notre Dame ({count})",
    typemaxFilterVal: "Val ({count})",
    typemaxFilterRiviere: "Rivière ({count})",
    typemaxFilterMont: "Mont ({count})",
    typemaxFilterBaie: "Baie ({count})",
    typemaxFilterLes: "Les ({count})",
    typemaxFilterPointe: "Pointe ({count})",
    modeDemoTypemaxTyping: "Chambord…",
    nameModeKicker: "Quelle municipalité clignote sur la carte ?",
    nameGuessPlaceholder: "Nom de la municipalité…",
    nameGuessPass: "Passer",
    nameGuessPassAria: "Passer à une autre municipalité — raccourci Tab",
    nameGuessReveal: "Révéler",
    nameGuessRevealAria: "Révéler la municipalité clignotante — Ctrl+Alt",
    nameCenterTarget: "Centrer",
    nameCenterTargetAria:
      "Centrer la municipalité clignotante au milieu de la carte — Maj gauche (Shift)",
    locateCenterTargetAria:
      "Centrer la municipalité à trouver sur la carte — Maj gauche (Shift)",
    nameProgressToggle: "Liste",
    nameProgressToggleAria: "Ouvrir la liste des municipalités nommées",
    nameProgressSidebarAria: "Liste des municipalités nommées",
    nameProgressTitle: "Municipalités nommées",
    nameProgressCloseAria: "Fermer la liste",
    nameProgressSummary: "{named} / {total} nommées · {remaining} restantes",
    nameProgressPendingSlot: "Emplacement libre",
    darkModeLabel: "Mode sombre",
  },
  en: {
    pageTitle: "Quebec Municipalities Quiz",
    langSwitchAria: "Interface language",
    setupSectionAria: "Quiz setup",
    loading: "Loading data…",
    startQuiz: "Start quiz",
    includeReserves: "Include Indian reserves and Nordic villages",
    onlyReserves: "Only Indian reserves and Nordic villages",
    filterMrc: "Filter by RCM",
    mrcSearchPlaceholder: "Search for an RCM…",
    mrcSelectAll: "Select all",
    mrcDeselectAll: "Deselect all",
    mrcFilterAria: "Filter by RCM",
    gameBarAria: "Game in progress",
    municipalityToFind: "Municipality to find",
    timeLabel: "Time",
    pause: "Pause",
    resume: "Resume",
    mapAria: "Map of Quebec",
    wrongAnswersTitle: "Wrong answers",
    sourceLabel: "Source:",
    sourceLink: "Administrative boundaries 1:100,000 (MRNF)",
    setupChooseMrc:
      "Choose your <strong>RCMs</strong> and options below, then start the quiz.",
    setupMunicipalityCount: "{n} {unit} in your selection.",
    noMunicipalitiesSelection:
      "No municipalities in this selection. Enable at least one RCM.",
    quizFinished: "Quiz complete!",
    quizFinishedTime: "Total time: {time} · {n} {unit}",
    locateScoreLabel: "Score",
    locateScoreAria: "Total score: {points} points",
    locateScoreLegend:
      "0 wrong : 3 pts · 1 wrong : 2 pts · 2 wrong : 1 pt · 3 wrong : 0 pts",
    locateQuizScore:
      "Final score: {points} points · Total time: {time} · {n} {unit}",
    nameModeQuizScore:
      "You got {correct}/{total} correct — congrats! Total time: {time}.",
    nameModeProgress: "{named} / {total} correct",
    adjustFilters: "Adjust filters to continue.",
    noMunicipalitiesPlay:
      "No municipalities in this selection. Enable at least one RCM.",
    wrongPlace: "Wrong location",
    correctAnswerConfirmed: "Correct answer selected.",
    successPerfect: "Well done! Correct location.",
    successOneWrong: "Correct location — 1 wrong guess before the answer.",
    successTwoWrong: "Correct location — 2 wrong guesses before the answer.",
    mrcSummary: "{enabled} / {totalMrc} RCM · {n} {unit}",
    loadError:
      "Load failed. Run scripts/fetch_municipalities.py and serve this folder with a local web server.",
    creatorWordsTitle: "Creator’s note",
    creatorWordsBody:
      "<p>Some entities were merged because they shared the same place name (e.g. village and township, parish and village, etc.).</p><p>Distinct homonyms are kept separate; labels may be clarified (reserve, township municipality, etc.).</p><p>Areas shown are municipalities’ land areas and exclude large bodies of water.</p>",
    gameModeLegend: "Game mode",
    gameModeLocate: "Find on the map (name shown)",
    gameModeName: "Name the municipality (blinking dot)",
    pickGameModeTitle: "Gamemodes",
    gameModeLocateTitle: "Find on the map",
    gameModeLocateDesc: "Select the correct dot on the map.",
    gameModeLocateAria: "Find on map mode",
    gameModeNameTitle: "Name the municipality",
    gameModeNameDesc: "One dot blinks — type the municipality name.",
    gameModeNameAria: "Name the municipality mode",
    modeDemoLocateLabel: "Saint-Augustin",
    modeDemoNameTyping: "Saint-Augustin",
    setupChangeMode: "← Change mode",
    headerBackToModes: "← Modes",
    headerBackToModesAria: "Back to game mode selection",
    setupSelectedModeLocate: "Mode: find on the map",
    setupSelectedModeName: "Mode: name the municipality",
    setupSelectedModeTen: "Mode: ten on the map",
    gameModeTenTitle: "Ten on the map",
    gameModeTenDesc: "Name the 10 randomly chosen municipalities.",
    gameModeTenAria: "Ten municipalities on the map mode",
    tenModeKicker: "Municipality to find (among 10 dots)",
    tenModeProgress: "{found} / {total} found",
    tenModeNeedTen:
      "This mode needs at least <strong>10 municipalities</strong> in your selection ({n} currently).",
    tenModeFinished: "All 10 municipalities found! Total time: {time}.",
    tenModeReplay: "Play again",
    tenModeReplayAria: "Play again with 10 new municipalities",
    modeDemoTenLabel: "Roberval",
    gameModeTypemaxTitle: "Name as many as you can",
    gameModeTypemaxDesc: "Name as many municipalities as you can.",
    gameModeTypemaxAria: "Name as many municipalities mode",
    setupSelectedModeTypemax: "Mode: name as many municipalities as you can",
    typemaxModeKicker: "Type the name of each municipality on the map",
    typemaxGuessPlaceholder: "Municipality name…",
    typemaxProgress: "{named} / {total} named",
    typemaxQuizScore:
      "You named {correct}/{total} municipalities — congrats! Total time: {time}.",
    typemaxUnknown: "Name not recognized in your selection.",
    typemaxGiveUp: "Give up",
    typemaxRevealedByClick: "{nom} revealed",
    typemaxGiveUpTitle: "Game over — missed locations revealed",
    typemaxQuizScoreGiveUp:
      "{correct}/{total} named · {missed} revealed in red. Time: {time}.",
    gameModeMiscTitle: "Miscellaneous quiz",
    gameModeMiscDesc: "Leaderboards, stats, and challenges without the map.",
    gameModeMiscAria: "Miscellaneous quiz mode",
    setupSelectedModeMisc: "Mode: miscellaneous quiz",
    miscSubmodeAria: "Choose a miscellaneous quiz challenge",
    miscSubmodeHeading: "Challenge",
    miscSubmodeTop10Saints: "Top most common Saint / Sainte names",
    miscSubmodeTop10SaintsHint:
      "Rankings use your current selection (RCM and reserves). Only the first word after Saint-, Sainte-, etc. counts (e.g. Saint-Jean-sur-Richelieu → Saint-Jean).",
    miscSubmodeTop10LargestArea: "Top 10 largest municipalities (km²)",
    miscSubmodeTop10LargestAreaHint:
      "Area from official boundaries (merged units included, e.g. Senneterre). Adjust RCMs and reserves below.",
    miscSetupPrompt: "Pick a challenge and filters, then start the quiz.",
    miscNeedTenSaints:
      "You need at least <strong>10 distinct Saint/Sainte forms</strong> in your selection ({n} found).",
    miscNeedTenArea:
      "You need at least <strong>10 municipalities</strong> with area data in your selection ({n} available).",
    miscModeKicker: "Name the entries on the leaderboard",
    miscGuessPlaceholder: "Saint-Jean, Sainte-Anne…",
    miscGuessPlaceholderArea: "Senneterre, Baie-James…",
    miscQuizInstructions:
      "Fill in the board: each row is a Saint-X or Sainte-X shared by at least five municipalities in Quebec.",
    miscLeaderboardRank: "Rank",
    miscLeaderboardSaint: "Saint / Sainte",
    miscLeaderboardMunicipality: "Municipality",
    miscLeaderboardCount: "Municipalities",
    miscLeaderboardArea: "Area",
    miscLeaderboardEmpty: "???",
    miscProgress: "{found} / {total} found",
    miscAlreadyFound: "Already on the board.",
    miscUnknown: "Not in the top 10 for your selection.",
    miscQuizScore:
      "You found {correct}/{total} — congrats! Total time: {time}.",
    miscQuizScoreGiveUp:
      "{found}/{total} found · missing answers revealed. Time: {time}.",
    typemaxNameFilterTitle: "Filter by name prefix",
    typemaxNameFilterSummary: "{active} filter(s) · {n} municipalities",
    typemaxNameFilterSummaryAll: "No filter · {n} municipalities",
    typemaxNameFilterAria: "Filter municipalities by name prefix",
    typemaxNameFilterClearAll: "Clear all",
    typemaxFilterSaintAndSaints: "Saint ({count})",
    typemaxFilterSainte: "Sainte ({count})",
    typemaxFilterSaintSlashSainte: "Saint/Sainte ({count})",
    typemaxFilterLac: "Lac ({count})",
    typemaxFilterNotreDame: "Notre Dame ({count})",
    typemaxFilterVal: "Val ({count})",
    typemaxFilterRiviere: "Rivière ({count})",
    typemaxFilterMont: "Mont ({count})",
    typemaxFilterBaie: "Baie ({count})",
    typemaxFilterLes: "Les ({count})",
    typemaxFilterPointe: "Pointe ({count})",
    modeDemoTypemaxTyping: "Chambord…",
    nameModeKicker: "Which municipality is blinking on the map?",
    nameGuessPlaceholder: "Municipality name…",
    nameGuessPass: "Skip",
    nameGuessPassAria: "Skip to another municipality — Tab shortcut",
    nameGuessReveal: "Reveal",
    nameGuessRevealAria: "Reveal the blinking municipality — Ctrl+Alt",
    nameCenterTarget: "Center",
    nameCenterTargetAria:
      "Center the blinking municipality on the map — left Shift",
    locateCenterTargetAria:
      "Center the municipality to find on the map — left Shift",
    nameProgressToggle: "List",
    nameProgressToggleAria: "Open the list of named municipalities",
    nameProgressSidebarAria: "List of named municipalities",
    nameProgressTitle: "Named municipalities",
    nameProgressCloseAria: "Close list",
    nameProgressSummary: "{named} / {total} named · {remaining} remaining",
    nameProgressPendingSlot: "Empty slot",
    darkModeLabel: "Dark mode",
  },
};

function pluralS(n) {
  return uiLang === "en" ? (n === 1 ? "" : "s") : n > 1 ? "s" : "";
}

function municipalityUnit(n) {
  if (uiLang === "en") {
    return n === 1 ? "municipality" : "municipalities";
  }
  return n > 1 ? "municipalités" : "municipalité";
}

function t(key, vars = {}) {
  const table = MESSAGES[uiLang] ?? MESSAGES.fr;
  let s = table[key] ?? MESSAGES.fr[key] ?? key;
  const n = vars.n ?? vars.count ?? 0;
  s = s.replace(/\{s\}/g, pluralS(Number(n)));
  s = s.replace(/\{unit\}/g, municipalityUnit(Number(n)));
  for (const [k, v] of Object.entries(vars)) {
    if (k === "s" || k === "unit") {
      continue;
    }
    s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  }
  return s;
}

function loadLanguagePref() {
  try {
    const stored = localStorage.getItem(LANG_PREF_KEY);
    if (stored === "en" || stored === "fr") {
      uiLang = stored;
    }
  } catch {
    /* ignore */
  }
}

function saveLanguagePref() {
  try {
    localStorage.setItem(LANG_PREF_KEY, uiLang);
  } catch {
    /* ignore */
  }
}

function applyTheme(theme) {
  const dark = theme === "dark";
  if (dark) {
    document.documentElement.dataset.theme = "dark";
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  const toggle = document.getElementById("theme-dark-toggle");
  if (toggle) {
    toggle.checked = dark;
  }
  try {
    localStorage.setItem(THEME_PREF_KEY, dark ? "dark" : "light");
  } catch {
    /* ignore */
  }
}

function loadThemePref() {
  try {
    const stored = localStorage.getItem(THEME_PREF_KEY);
    applyTheme(stored === "dark" ? "dark" : "light");
  } catch {
    applyTheme("light");
  }
}

function initThemeToggle() {
  loadThemePref();
  document.getElementById("theme-dark-toggle")?.addEventListener("change", (e) => {
    const input = /** @type {HTMLInputElement} */ (e.target);
    applyTheme(input.checked ? "dark" : "light");
  });
}

function applyStaticTranslations() {
  document.documentElement.lang = uiLang;
  document.title = t("pageTitle");

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) {
      return;
    }
    const translated = t(key);
    if (translated === key) {
      return;
    }
    if (key === "setupChooseMrc") {
      el.innerHTML = translated;
    } else {
      el.textContent = translated;
    }
  });

  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (key) {
      el.innerHTML = t(key);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) {
      el.placeholder = t(key);
    }
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (key) {
      el.setAttribute("aria-label", t(key));
    }
  });

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.lang === uiLang);
  });

  if (typeof syncPauseControlLabels === "function") {
    syncPauseControlLabels();
  }
}

function setLanguage(lang) {
  uiLang = lang === "en" ? "en" : "fr";
  saveLanguagePref();
  applyStaticTranslations();
  if (typeof onLanguageChanged === "function") {
    onLanguageChanged();
  }
}

function initLanguageSwitcher() {
  loadLanguagePref();
  applyStaticTranslations();
  document.getElementById("lang-fr")?.addEventListener("click", () => {
    if (uiLang !== "fr") {
      setLanguage("fr");
    }
  });
  document.getElementById("lang-en")?.addEventListener("click", () => {
    if (uiLang !== "en") {
      setLanguage("en");
    }
  });
}

initLanguageSwitcher();
initThemeToggle();
