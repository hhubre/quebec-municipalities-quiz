const DATA_URL = "public/data/municipalities.geojson";
const MUNICIPALITY_ALIASES_URL =
  "public/data/municipality-name-aliases.json";
const ROUTES_URL = "public/data/major-routes-lite.geojson";
const MAX_STRIKES = 3;
/**
 * MRNF MUS_CO_DES — exclues si « Inclure… » est décoché :
 * R/EI réserves et établissements indiens ; VN villages nordiques ;
 * TI/TC/TK terres réservées ; VC/VK villages cris/naskapis.
 */
const INDIGENOUS_AND_NORDIC_DESIGNATIONS = new Set([
  "R",
  "EI",
  "VN",
  "TI",
  "TC",
  "TK",
  "VC",
  "VK",
]);
const INCLUDE_RESERVES_PREF_KEY = "quebec-quiz-include-indian-reserves";
const ONLY_RESERVES_PREF_KEY = "quebec-quiz-only-indian-reserves";
const DISABLED_MRC_PREF_KEY = "quebec-quiz-disabled-mrc-codes";
const TYPEMAX_NAME_PREFIX_FILTER_PREF_KEY =
  "quebec-quiz-typemax-name-prefix-filters";
/** Noms de municipalités (trouvées, bonne réponse, erreurs) — pas en vue très dézoomée. */
const MIN_ZOOM_FOR_MUNICIPALITY_LABELS = 9;
/** Alias : nom de la bonne réponse après succès / échec confirmé. */
const MIN_ZOOM_FOR_ANSWER_LABEL = MIN_ZOOM_FOR_MUNICIPALITY_LABELS;
/** Numéros / noms des routes (boucliers). */
const MIN_ZOOM_FOR_ROUTE_LABELS = 9;
/** Durée d’affichage du résultat sur la carte avant la manche suivante. */
const MAP_FEEDBACK_MS = 450;
const MRNF_DATASET_URL =
  "https://www.donneesquebec.ca/recherche/dataset/eec20550-7916-4ff9-b9bf-9e07288b4a17";

function buildMapAttributionHtml() {
  const imagery =
    'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics';
  const boundaries = `${t("sourceLabel")} <a href="${MRNF_DATASET_URL}" target="_blank" rel="noopener noreferrer">${t("sourceLink")}</a>`;
  return `${imagery} | ${boundaries}`;
}

function refreshMapAttribution() {
  if (!imageryTileLayer) {
    return;
  }
  imageryTileLayer.options.attribution = buildMapAttributionHtml();
  if (map.attributionControl && typeof map.attributionControl._update === "function") {
    map.attributionControl._update();
  }
}

const promptEl = document.getElementById("prompt");
const feedbackEl = document.getElementById("feedback");
const setupPromptEl = document.getElementById("setup-prompt");
const setupFeedbackEl = document.getElementById("setup-feedback");
const setupSectionEl = document.getElementById("setup-section");
const setupInnerEl = document.getElementById("setup-inner");
const setupStepModeEl = document.getElementById("setup-step-mode");
const setupStepOptionsEl = document.getElementById("setup-step-options");
const setupLoadErrorEl = document.getElementById("setup-load-error");
const setupModePickerEl = document.getElementById("setup-mode-picker");
const setupChangeModeEl = document.getElementById("setup-change-mode");
const setupSelectedModeLabelEl = document.getElementById("setup-selected-mode-label");
const gameBarEl = document.getElementById("game-bar");
const includeIndianReservesEl = document.getElementById("include-indian-reserves");
const onlyIndianReservesEl = document.getElementById("only-indian-reserves");
const startQuizEl = document.getElementById("start-quiz");
const quizTimerEl = document.getElementById("quiz-timer");
const quizTimerValueEl = document.getElementById("quiz-timer-value");
const pauseQuizEl = document.getElementById("pause-quiz");
const tenReplayQuizEl = document.getElementById("ten-replay-quiz");
const nameProgressToggleEl = document.getElementById("name-progress-toggle");
const nameProgressSidebarEl = document.getElementById("name-progress-sidebar");
const nameProgressCloseEl = document.getElementById("name-progress-close");
const nameProgressListEl = document.getElementById("name-progress-list");
const nameProgressSummaryEl = document.getElementById("name-progress-summary");
const mapPauseOverlayEl = document.getElementById("map-pause-overlay");
const gameBarKickerEl = document.getElementById("game-bar-kicker");
const locateScoreEl = document.getElementById("locate-score");
const locateScoreValueEl = document.getElementById("locate-score-value");
const nameGuessFormEl = document.getElementById("name-guess-form");
const nameGuessInputEl = document.getElementById("name-guess-input");
const nameGuessPassEl = document.getElementById("name-guess-pass");
const nameGuessRevealEl = document.getElementById("name-guess-reveal");
const nameCenterTargetEl = document.getElementById("name-center-target");
const locateCenterTargetEl = document.getElementById("locate-center-target");
const typemaxGiveUpEl = document.getElementById("typemax-give-up");
const miscQuizOverlayEl = document.getElementById("misc-quiz-overlay");
const miscLeaderboardBodyEl = document.getElementById("misc-leaderboard-body");
const miscSubmodePanelEl = document.getElementById("misc-submode-panel");

const NAME_MODE_CENTER_MIN_ZOOM = 7;

const GAME_MODE_LOCATE = "locate";
const GAME_MODE_NAME = "name";
const GAME_MODE_TEN = "ten";
const GAME_MODE_TYPEMAX = "typemax";
const GAME_MODE_MISC = "misc";
const MISC_SUBMODE_TOP10_SAINTS = "top10-saints";
const MISC_SUBMODE_TOP10_LARGEST_AREA = "top10-largest-area";
const MISC_SAINT_TOP_N = 10;
const MISC_SAINT_MIN_OCCURRENCES = 5;
const TEN_MODE_COUNT = 10;
/** @type {"locate" | "name" | "ten" | "typemax" | "misc"} */
let gameMode = GAME_MODE_LOCATE;
/** Score cumulé (mode « trouver sur la carte » uniquement). */
let locateModeScore = 0;
let setupDataReady = false;
let nameModeQuizTotal = 0;
let nameModeNamedCorrectCount = 0;
/** @type {GeoJSON.Feature[]} */
let tenModeFeatures = [];
/** @type {{ rank: number, label: string, hint: string, revealed: boolean, foundByUser: boolean, missedOnGiveUp: boolean, matchKeys: Set<string> }[]} */
let miscLeaderboardEntries = [];
let miscActiveSubmode = MISC_SUBMODE_TOP10_SAINTS;
let miscCorrectCount = 0;
let miscGiveUpUsed = false;

/** Sainte→ste, Saint→st, Saints→sts only; Ste and St are not interchangeable. */
function normalizeMunicipalityNameForMatch(str) {
  let s = String(str).trim().toLowerCase();
  s = s.normalize("NFD").replace(/\p{M}/gu, "");
  s = s.replace(/[''´`]/g, "");
  s = s.replace(/[\u2010-\u2015\u2212\u00ad\u2043]/g, "-");
  s = s.replace(/(^|[\s-])saints(?=[\s-]|$)/g, "$1sts");
  s = s.replace(/(^|[\s-])sainte(?=[\s-]|$)/g, "$1ste");
  s = s.replace(/(^|[\s-])saint(?=[\s-]|$)/g, "$1st");
  s = s.replace(/[\s-]+/g, "");
  s = s.replace(/[^a-z0-9]/g, "");
  return s;
}

function municipalityPrimaryName(nom) {
  const bracket = String(nom).indexOf("[");
  if (bracket === -1) {
    return String(nom).trim();
  }
  return String(nom).slice(0, bracket).trim();
}

/** @type {Map<string, string[]>} */
let municipalityAliasesByCode = new Map();
/** @type {Map<string, Set<string>>} */
const municipalityMatchKeysByCode = new Map();

function applyEnglishGeographicReplacements(name) {
  let s = String(name).trim();
  s = s.replace(/\bBaie-James\b/gi, "James Bay");
  s = s.replace(/\bBaie d'/gi, "Bay of ");
  s = s.replace(/\bBaie de /gi, "Bay of ");
  s = s.replace(/\bBaie du /gi, "Bay of the ");
  s = s.replace(/\bBaie-des-/gi, "Bay-des-");
  s = s.replace(/\bBaie-/gi, "Bay-");
  s = s.replace(/\bBaie\b/gi, "Bay");
  s = s.replace(/\bLac-/gi, "Lake-");
  s = s.replace(/\bLac\b/gi, "Lake");
  s = s.replace(/\bMont-/gi, "Mount-");
  s = s.replace(/\bMont\b/gi, "Mount");
  s = s.replace(/\bÎle-/gi, "Island-");
  s = s.replace(/\bIle-/gi, "Island-");
  s = s.replace(/\bÎle\b/gi, "Island");
  s = s.replace(/\bIle\b/gi, "Island");
  return s.trim();
}

function englishGeographicNameVariants(nom) {
  const variants = new Set();
  const base = String(nom).trim();
  const primary = municipalityPrimaryName(base);
  for (const src of [base, primary]) {
    const en = applyEnglishGeographicReplacements(src);
    if (en && en !== src) {
      variants.add(en);
    }
  }
  if (/eeyou\s+istchee\s+baie-james/i.test(base)) {
    variants.add("Eeyou Istchee James Bay");
    variants.add("James Bay Eeyou Istchee");
  }
  return variants;
}

function collectMatchNamesForOfficialNom(nom) {
  const names = new Set();
  const add = (value) => {
    const text = String(value || "").trim();
    if (text) {
      names.add(text);
    }
  };
  add(nom);
  const primary = municipalityPrimaryName(nom);
  add(primary);
  for (const variant of englishGeographicNameVariants(nom)) {
    add(variant);
  }
  return names;
}

function rebuildMunicipalityMatchKeysCache() {
  municipalityMatchKeysByCode.clear();
  for (const feature of allBaseFeatures) {
    const code = String(feature.properties.code);
    const keys = new Set();
    for (const name of collectMatchNamesForOfficialNom(feature.properties.nom)) {
      keys.add(normalizeMunicipalityNameForMatch(name));
    }
    const extras = municipalityAliasesByCode.get(code);
    if (extras) {
      for (const name of extras) {
        keys.add(normalizeMunicipalityNameForMatch(name));
      }
    }
    keys.delete("");
    municipalityMatchKeysByCode.set(code, keys);
  }
}

function normalizedOfficialNameMatchKeys(officialNom, code) {
  if (code != null) {
    const cached = municipalityMatchKeysByCode.get(String(code));
    if (cached) {
      return cached;
    }
  }
  const keys = new Set();
  for (const name of collectMatchNamesForOfficialNom(officialNom)) {
    keys.add(normalizeMunicipalityNameForMatch(name));
  }
  keys.delete("");
  return keys;
}

function municipalityNamesMatch(guess, officialNom, code) {
  const normalizedGuess = normalizeMunicipalityNameForMatch(guess);
  if (!normalizedGuess) {
    return false;
  }
  for (const key of normalizedOfficialNameMatchKeys(officialNom, code)) {
    if (normalizedGuess === key) {
      return true;
    }
  }
  return false;
}

function municipalityFeatureNamesMatch(guess, feature) {
  return municipalityNamesMatch(
    guess,
    feature.properties.nom,
    feature.properties.code
  );
}

function isNameTypingGameMode() {
  return (
    gameMode === GAME_MODE_NAME ||
    gameMode === GAME_MODE_TYPEMAX ||
    gameMode === GAME_MODE_MISC
  );
}

function remainingFeaturesForGuessing() {
  return remainingMunicipalities();
}

function findExactGuessMatchesAmongRemaining(guess) {
  return remainingFeaturesForGuessing().filter((f) =>
    municipalityFeatureNamesMatch(guess, f)
  );
}

/** Typemax: exact name match, including all homonyms (e.g. every « Saint-Augustin »), but not longer names (e.g. « Saint-Augustin-de-Desmaures »). */
function findTypeMaxMatchesForGuess(guess) {
  const normalizedGuess = normalizeMunicipalityNameForMatch(guess);
  if (!normalizedGuess) {
    return [];
  }
  return remainingFeaturesForGuessing().filter((f) => {
    if (!municipalityFeatureNamesMatch(guess, f)) {
      return false;
    }
    const primaryNorm = normalizeMunicipalityNameForMatch(
      municipalityPrimaryName(f.properties.nom)
    );
    if (
      primaryNorm.length > normalizedGuess.length &&
      primaryNorm.startsWith(normalizedGuess)
    ) {
      return false;
    }
    return true;
  });
}

function findAutoAcceptableTypeMaxMatch(guess) {
  const matches = findTypeMaxMatchesForGuess(guess);
  return matches.length > 0 ? matches : null;
}

function findForceAcceptTypeMaxMatch(guess) {
  const matches = findTypeMaxMatchesForGuess(guess);
  return matches.length > 0 ? matches : null;
}

function getSelectedGameModeFromSetup() {
  const checked = document.querySelector('input[name="game-mode"]:checked');
  const value = checked?.value;
  if (value === GAME_MODE_NAME) {
    return GAME_MODE_NAME;
  }
  if (value === GAME_MODE_TEN) {
    return GAME_MODE_TEN;
  }
  if (value === GAME_MODE_TYPEMAX) {
    return GAME_MODE_TYPEMAX;
  }
  if (value === GAME_MODE_MISC) {
    return GAME_MODE_MISC;
  }
  return GAME_MODE_LOCATE;
}

function isTenModeSelectedInSetup() {
  return getSelectedGameModeFromSetup() === GAME_MODE_TEN;
}

function shufflePickFeatures(features, count) {
  const copy = features.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function getMapDisplayFeatures() {
  if (gameStarted && gameMode === GAME_MODE_TEN && tenModeFeatures.length > 0) {
    return tenModeFeatures;
  }
  return municipalities;
}

function updateSetupSelectedModeLabel() {
  if (!setupSelectedModeLabelEl) {
    return;
  }
  const mode = getSelectedGameModeFromSetup();
  setupSelectedModeLabelEl.textContent =
    mode === GAME_MODE_NAME
      ? t("setupSelectedModeName")
      : mode === GAME_MODE_TEN
        ? t("setupSelectedModeTen")
        : mode === GAME_MODE_TYPEMAX
          ? t("setupSelectedModeTypemax")
          : mode === GAME_MODE_MISC
            ? t("setupSelectedModeMisc")
            : t("setupSelectedModeLocate");
}

function isValidGameModeValue(value) {
  return (
    value === GAME_MODE_LOCATE ||
    value === GAME_MODE_NAME ||
    value === GAME_MODE_TEN ||
    value === GAME_MODE_TYPEMAX ||
    value === GAME_MODE_MISC
  );
}

function highlightSelectedModeCard() {
  const mode = getSelectedGameModeFromSetup();
  document.querySelectorAll(".mode-card").forEach((card) => {
    const radio = card.querySelector('input[name="game-mode"]');
    card.classList.toggle("is-selected", radio?.value === mode);
  });
}

function showSetupModeStep() {
  setupInnerEl?.classList.add("setup-inner--mode-step");
  setupStepOptionsEl?.classList.add("hidden");
  if (setupStepOptionsEl) {
    setupStepOptionsEl.hidden = true;
  }
  setupStepModeEl?.classList.remove("hidden");
  if (setupStepModeEl) {
    setupStepModeEl.hidden = false;
  }
  highlightSelectedModeCard();
  syncTypemaxNameFilterPanelVisibility();
  syncMiscSubmodePanelVisibility();
  syncMiscSaintsSetupUi();
}

function showSetupOptionsStep(mode) {
  if (!isValidGameModeValue(mode)) {
    return;
  }
  const radio = document.querySelector(
    `input[name="game-mode"][value="${mode}"]`
  );
  if (radio) {
    radio.checked = true;
  }
  highlightSelectedModeCard();
  setupInnerEl?.classList.remove("setup-inner--mode-step");
  setupStepModeEl?.classList.add("hidden");
  if (setupStepModeEl) {
    setupStepModeEl.hidden = true;
  }
  setupStepOptionsEl?.classList.remove("hidden");
  if (setupStepOptionsEl) {
    setupStepOptionsEl.hidden = false;
  }
  updateSetupSelectedModeLabel();
  syncTypemaxNameFilterPanelVisibility();
  syncMiscSubmodePanelVisibility();
  syncMiscSaintsSetupUi();
  if (!setupDataReady) {
    if (setupPromptEl) {
      setupPromptEl.textContent = t("loading");
    }
    setSetupFeedback("", "");
    updateStartQuizButton();
    return;
  }
  applyPlayableFilters({ refitBounds: true });
}

function markSetupDataReady() {
  setupDataReady = true;
  if (setupLoadErrorEl) {
    setupLoadErrorEl.classList.add("hidden");
    setupLoadErrorEl.textContent = "";
  }
  highlightSelectedModeCard();
  if (setupStepOptionsEl && !setupStepOptionsEl.hidden) {
    updateSetupSelectedModeLabel();
    showSetupPrompt();
  }
  updateModeCardStaticLabels();
}

function updateModeCardStaticLabels() {
  const setLabel = (el, key) => {
    if (!el) {
      return;
    }
    const text = t(key);
    if (text !== key) {
      el.textContent = text;
    }
  };

  const tenCard = document
    .querySelector('input[name="game-mode"][value="ten"]')
    ?.closest(".mode-card");
  const typeCard = document
    .querySelector('input[name="game-mode"][value="typemax"]')
    ?.closest(".mode-card");

  if (tenCard) {
    setLabel(tenCard.querySelector(".mode-card-title"), "gameModeTenTitle");
    setLabel(tenCard.querySelector(".mode-card-desc"), "gameModeTenDesc");
    setLabel(tenCard.querySelector(".mode-demo-prompt"), "modeDemoTenLabel");
  }
  if (typeCard) {
    setLabel(typeCard.querySelector(".mode-card-title"), "gameModeTypemaxTitle");
    setLabel(typeCard.querySelector(".mode-card-desc"), "gameModeTypemaxDesc");
    setLabel(
      typeCard.querySelector(".mode-demo-input-text"),
      "modeDemoTypemaxTyping"
    );
  }
}

function bindSetupModePicker() {
  const pickMode = (mode) => {
    if (!isValidGameModeValue(mode)) {
      return;
    }
    const radio = document.querySelector(
      `input[name="game-mode"][value="${CSS.escape(mode)}"]`
    );
    if (radio) {
      radio.checked = true;
    }
    showSetupOptionsStep(mode);
  };

  document.querySelectorAll('input[name="game-mode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        pickMode(radio.value);
      }
    });
  });

  document.querySelectorAll(".mode-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      const radio = card.querySelector('input[name="game-mode"]');
      if (!radio) {
        return;
      }
      if (e.target instanceof HTMLInputElement && e.target === radio) {
        return;
      }
      pickMode(radio.value);
    });
  });

  setupChangeModeEl?.addEventListener("click", () => {
    if (!gameStarted) {
      showSetupModeStep();
    }
  });
}

function locatePointsForWrongCount(wrongCount) {
  if (wrongCount <= 0) {
    return 3;
  }
  if (wrongCount === 1) {
    return 2;
  }
  if (wrongCount === 2) {
    return 1;
  }
  return 0;
}

function awardLocateRoundPoints(wrongCount) {
  if (gameMode !== GAME_MODE_LOCATE) {
    return;
  }
  locateModeScore += locatePointsForWrongCount(wrongCount);
  updateLocateScoreUi();
}

function updateLocateScoreUi() {
  if (!locateScoreEl || !locateScoreValueEl) {
    return;
  }
  const show = gameStarted && gameMode === GAME_MODE_LOCATE;
  locateScoreEl.classList.toggle("hidden", !show);
  if (!show) {
    return;
  }
  locateScoreValueEl.textContent = String(locateModeScore);
  locateScoreEl.setAttribute(
    "aria-label",
    t("locateScoreAria", { points: locateModeScore })
  );
}

function syncGameBarForMode() {
  document.body.classList.toggle("game-mode-name", gameMode === GAME_MODE_NAME);
  document.body.classList.toggle("game-mode-locate", gameMode === GAME_MODE_LOCATE);
  document.body.classList.toggle("game-mode-ten", gameMode === GAME_MODE_TEN);
  document.body.classList.toggle(
    "game-mode-typemax",
    gameMode === GAME_MODE_TYPEMAX
  );
  document.body.classList.toggle("game-mode-misc", gameMode === GAME_MODE_MISC);
  if (gameBarKickerEl) {
    gameBarKickerEl.textContent =
      gameMode === GAME_MODE_NAME
        ? t("nameModeKicker")
        : gameMode === GAME_MODE_TEN
          ? t("tenModeKicker")
          : gameMode === GAME_MODE_TYPEMAX
            ? t("typemaxModeKicker")
            : gameMode === GAME_MODE_MISC
              ? t("miscModeKicker")
              : t("municipalityToFind");
  }
  if (nameGuessFormEl) {
    nameGuessFormEl.classList.toggle(
      "hidden",
      !isNameTypingGameMode() || quizFinished
    );
  }
  if (promptEl) {
    promptEl.style.display =
      gameMode === GAME_MODE_NAME ||
      gameMode === GAME_MODE_TYPEMAX ||
      gameMode === GAME_MODE_MISC
        ? "none"
        : "";
  }
  if (nameGuessInputEl) {
    if (gameMode === GAME_MODE_NAME) {
      nameGuessInputEl.placeholder = t("nameGuessPlaceholder");
    } else if (gameMode === GAME_MODE_TYPEMAX) {
      nameGuessInputEl.placeholder = t("typemaxGuessPlaceholder");
    } else if (gameMode === GAME_MODE_MISC) {
      nameGuessInputEl.placeholder = t("nameGuessPlaceholder");
    }
  }
  if (nameCenterTargetEl && gameMode === GAME_MODE_NAME) {
    nameCenterTargetEl.setAttribute("aria-label", t("nameCenterTargetAria"));
  }
  if (locateCenterTargetEl) {
    const showLocateCenter =
      gameMode === GAME_MODE_LOCATE &&
      gameStarted &&
      !quizFinished &&
      Boolean(target) &&
      !solved;
    locateCenterTargetEl.classList.toggle("hidden", !showLocateCenter);
    locateCenterTargetEl.disabled = !showLocateCenter || quizPaused;
    if (showLocateCenter) {
      locateCenterTargetEl.setAttribute("aria-label", t("locateCenterTargetAria"));
    }
  }
  if (typemaxGiveUpEl) {
    const showGiveUp =
      (gameMode === GAME_MODE_TYPEMAX &&
        gameStarted &&
        !quizFinished &&
        !typemaxGiveUpUsed) ||
      (gameMode === GAME_MODE_MISC &&
        gameStarted &&
        !quizFinished &&
        !miscGiveUpUsed);
    typemaxGiveUpEl.classList.toggle("hidden", !showGiveUp);
    typemaxGiveUpEl.disabled = !showGiveUp || quizPaused;
  }
  syncMiscQuizOverlayVisibility();
  if (quizTimerEl) {
    quizTimerEl.classList.toggle("hidden", gameMode === GAME_MODE_MISC);
  }
  if (gameStarted && gameMode === GAME_MODE_MISC) {
    renderMiscLeaderboard();
  }
  updateLocateScoreUi();
  if (tenReplayQuizEl) {
    const showTenReplay =
      gameMode === GAME_MODE_TEN &&
      gameStarted &&
      quizFinished &&
      municipalities.length >= TEN_MODE_COUNT;
    tenReplayQuizEl.classList.toggle("hidden", !showTenReplay);
  }
  if (pauseQuizEl) {
    pauseQuizEl.classList.toggle(
      "hidden",
      quizFinished && gameMode === GAME_MODE_TEN
    );
  }
  syncNameProgressUi();
}

function typemaxMissedPalette() {
  return {
    dot: {
      radius: 6,
      color: "#b91c1c",
      fillColor: "#ef4444",
      fillOpacity: 1,
      weight: 2,
    },
    zone: {
      color: "#991b1b",
      weight: 3,
      fillColor: "#ef4444",
      fillOpacity: 0.52,
    },
  };
}

function handleTypeMaxGiveUp() {
  if (gameMode === GAME_MODE_MISC) {
    handleMiscGiveUp();
    return;
  }
  if (
    !gameStarted ||
    quizFinished ||
    quizPaused ||
    gameMode !== GAME_MODE_TYPEMAX ||
    typemaxGiveUpUsed
  ) {
    return;
  }
  typemaxGiveUpUsed = true;
  quizElapsedFrozenMs = getQuizElapsedMs();
  stopQuizTimerInterval();
  if (quizTimerValueEl) {
    quizTimerValueEl.textContent = formatElapsed(quizElapsedFrozenMs);
  }
  const missed = remainingMunicipalities();
  const palette = typemaxMissedPalette();
  for (const feature of missed) {
    const code = feature.properties.code;
    typemaxMissedCodes.add(String(code));
    const marker = markersByCode.get(code);
    if (marker) {
      marker.setStyle(palette.dot);
    }
    markMunicipalityDiscovered(code, palette.zone);
    markMunicipalityCompleted(code, palette.dot);
  }
  if (nameGuessInputEl) {
    nameGuessInputEl.value = "";
    nameGuessInputEl.disabled = true;
  }
  syncGameBarForMode();
  finishQuiz();
}

function revealTypeMaxMunicipality(feature) {
  if (
    !gameStarted ||
    quizFinished ||
    quizPaused ||
    gameMode !== GAME_MODE_TYPEMAX ||
    typemaxGiveUpUsed
  ) {
    return;
  }
  const code = String(feature.properties.code);
  if (completedCodes.has(code)) {
    return;
  }
  const palette = typemaxMissedPalette();
  typemaxMissedCodes.add(code);
  const marker = markersByCode.get(code);
  if (marker) {
    marker.setStyle(palette.dot);
  }
  markMunicipalityDiscovered(code, palette.zone);
  markMunicipalityCompleted(code, palette.dot);
  renderNameProgressSidebar();
  updateQuizProgressFeedback();
  setFeedback(
    t("typemaxRevealedByClick", { nom: feature.properties.nom }),
    "error"
  );
  if (remainingMunicipalities().length === 0) {
    clearNextRoundTimer();
    finishQuiz();
  }
}

function completeTargetSuccess(strikeCount) {
  if (!target) {
    return;
  }
  const code = target.properties.code;
  solved = true;
  answerLabelActive =
    gameMode === GAME_MODE_LOCATE || gameMode === GAME_MODE_TEN;
  const palette = successPalette(strikeCount);
  solvedStyles = palette;
  setFeedback(palette.feedback, palette.feedbackClass);
  clearWrongReveals();
  stopBlink();
  disableFailedRoundClickRecovery();

  const marker = markersByCode.get(code);
  if (marker) {
    marker.setStyle(palette.dot);
  }
  markMunicipalityDiscovered(code, palette.zone);
  markMunicipalityCompleted(code, palette.dot);
  if (gameMode === GAME_MODE_NAME) {
    nameModeNamedCorrectCount += 1;
    recordNamedCorrect(code);
  }
  if (gameMode === GAME_MODE_LOCATE) {
    awardLocateRoundPoints(strikeCount);
  }
  if (gameMode === GAME_MODE_LOCATE || gameMode === GAME_MODE_TEN) {
    updateCorrectNameLabel();
  }
  scheduleNextRound();
}

function completeTypeMaxSuccess(feature) {
  completeTypeMaxSuccessBatch([feature]);
}

function completeTypeMaxSuccessBatch(features) {
  if (features.length === 0) {
    return;
  }
  const palette = successPalette(0);
  setFeedback(palette.feedback, palette.feedbackClass);
  for (const feature of features) {
    const code = feature.properties.code;
    const marker = markersByCode.get(code);
    if (marker) {
      marker.setStyle(palette.dot);
    }
    markMunicipalityDiscovered(code, palette.zone);
    markMunicipalityCompleted(code, palette.dot);
    nameModeNamedCorrectCount += 1;
    recordNamedCorrect(code);
  }
  if (nameGuessInputEl) {
    nameGuessInputEl.value = "";
  }
  updateQuizProgressFeedback();
  if (remainingMunicipalities().length === 0) {
    clearNextRoundTimer();
    nextRoundTimer = setTimeout(() => {
      nextRoundTimer = null;
      finishQuiz();
    }, MAP_FEEDBACK_MS);
  } else if (!quizPaused && nameGuessInputEl) {
    requestAnimationFrame(() => nameGuessInputEl.focus());
  }
}

function tryAcceptTypeMaxGuess({ force = false } = {}) {
  if (
    !gameStarted ||
    quizFinished ||
    quizPaused ||
    gameMode !== GAME_MODE_TYPEMAX ||
    typemaxGiveUpUsed
  ) {
    return;
  }
  const guess = nameGuessInputEl?.value ?? "";
  const matches = force
    ? findForceAcceptTypeMaxMatch(guess)
    : findAutoAcceptableTypeMaxMatch(guess);
  if (!matches || matches.length === 0) {
    if (force && normalizeMunicipalityNameForMatch(guess)) {
      setFeedback(t("typemaxUnknown"), "error");
    }
    return;
  }
  completeTypeMaxSuccessBatch(matches);
}

function tryAcceptNameGuess() {
  if (
    !gameStarted ||
    quizFinished ||
    quizPaused ||
    gameMode !== GAME_MODE_NAME ||
    !target ||
    solved
  ) {
    return;
  }
  const guess = nameGuessInputEl?.value ?? "";
  if (!municipalityNamesMatch(guess, target.properties.nom, target.properties.code)) {
    return;
  }
  completeTargetSuccess(0);
}

function handleNameGuessInput() {
  if (gameMode === GAME_MODE_TYPEMAX) {
    setFeedback("", "");
    tryAcceptTypeMaxGuess();
    return;
  }
  if (gameMode === GAME_MODE_MISC) {
    setFeedback("", "");
    tryAcceptMiscGuess();
    return;
  }
  tryAcceptNameGuess();
}

function handleNameGuessFormSubmit(e) {
  e.preventDefault();
  if (gameMode === GAME_MODE_TYPEMAX) {
    tryAcceptTypeMaxGuess({ force: true });
    return;
  }
  if (gameMode === GAME_MODE_MISC) {
    tryAcceptMiscGuess({ force: true });
  }
}

function canCenterOnActiveTarget() {
  if (!gameStarted || quizFinished || quizPaused || !target || solved) {
    return false;
  }
  return gameMode === GAME_MODE_NAME || gameMode === GAME_MODE_LOCATE;
}

function canCenterOnBlinkingTarget() {
  return canCenterOnActiveTarget() && gameMode === GAME_MODE_NAME;
}

function centerMapOnActiveTarget() {
  if (!canCenterOnActiveTarget()) {
    return;
  }
  const [lat, lng] = featureCenter(target);
  const zoom = Math.max(map.getZoom(), NAME_MODE_CENTER_MIN_ZOOM);
  map.stop();
  map.flyTo([lat, lng], zoom, { duration: 0.4 });

  map.once("moveend", () => {
    if (!canCenterOnActiveTarget()) {
      return;
    }
    const gameBar = document.getElementById("game-bar");
    if (gameBar && !gameBar.classList.contains("hidden")) {
      const offsetY = Math.round(gameBar.offsetHeight / 2);
      if (offsetY > 0) {
        map.panBy([0, offsetY], { animate: true });
      }
    }
  });
}

function centerMapOnBlinkingTarget() {
  centerMapOnActiveTarget();
}

function canNameModePass() {
  return (
    gameStarted &&
    !quizFinished &&
    !quizPaused &&
    gameMode === GAME_MODE_NAME &&
    target &&
    !solved
  );
}

function canNameModeReveal() {
  return canNameModePass();
}

function handleGameBarKeyboard(e) {
  if (
    e.type === "keydown" &&
    e.key === "Escape" &&
    nameProgressSidebarOpen
  ) {
    e.preventDefault();
    setNameProgressSidebarOpen(false);
    return;
  }

  const centerMode =
    gameMode === GAME_MODE_NAME || gameMode === GAME_MODE_LOCATE;
  if (centerMode && gameStarted && !quizFinished && !quizPaused) {
    if (e.code === "ShiftLeft") {
      if (e.type === "keydown") {
        if (!e.repeat) {
          nameModeLeftShiftAlonePending = true;
        }
        return;
      }
      if (e.type === "keyup" && nameModeLeftShiftAlonePending) {
        nameModeLeftShiftAlonePending = false;
        if (canCenterOnActiveTarget()) {
          e.preventDefault();
          centerMapOnActiveTarget();
          if (gameMode === GAME_MODE_NAME) {
            nameGuessInputEl?.focus({ preventScroll: true });
          }
        }
      }
      return;
    }
    if (e.type === "keydown" && e.code !== "ShiftLeft") {
      nameModeLeftShiftAlonePending = false;
    }
  }

  if (gameMode !== GAME_MODE_NAME || !gameStarted || quizFinished || quizPaused) {
    return;
  }

  if (e.type !== "keydown") {
    return;
  }

  if (
    e.code === "AltLeft" &&
    e.ctrlKey &&
    !e.metaKey &&
    !e.shiftKey &&
    canNameModeReveal()
  ) {
    e.preventDefault();
    handleNameModeReveal();
    return;
  }

  if (e.key === "Tab") {
    if (!canNameModePass()) {
      return;
    }
    e.preventDefault();
    handleNameModePass();
    return;
  }
}

function handleNameModePass() {
  if (!canNameModePass()) {
    return;
  }
  clearNextRoundTimer();
  stopBlink();
  setFeedback("", "");
  if (nameGuessInputEl) {
    nameGuessInputEl.value = "";
  }

  const pool = remainingMunicipalities(target.properties.code);
  if (pool.length === 0) {
    finishQuiz();
    return;
  }
  queuedTarget = pool[Math.floor(Math.random() * pool.length)];
  pickTarget();
}

function handleNameModeReveal() {
  if (!canNameModeReveal()) {
    return;
  }
  revealCurrentTargetAnswer();
}

const vectorCanvas = L.canvas({ padding: 0.85 });

/** Rendu canvas + pas de recalcul des géométries pendant l’animation de zoom. */
const vectorPathOpts = {
  renderer: vectorCanvas,
  smoothFactor: 3,
  updateWhenZooming: false,
  updateWhenIdle: true,
};

const map = L.map("map", {
  zoomControl: true,
  minZoom: 4,
  maxZoom: 12,
  preferCanvas: true,
  zoomAnimation: true,
  fadeAnimation: true,
  markerZoomAnimation: false,
  zoomAnimationThreshold: 2,
  attributionControl: true,
}).setView([52, -71.5], 5);

/** @type {L.TileLayer | null} */
let imageryTileLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: buildMapAttributionHtml(),
    maxZoom: 19,
    maxNativeZoom: 18,
    updateWhenIdle: false,
    updateWhenZooming: false,
    keepBuffer: 6,
    crossOrigin: true,
  }
);
imageryTileLayer.addTo(map);
if (map.attributionControl) {
  map.attributionControl.setPrefix(false);
}

map.createPane("roadsPane");
map.getPane("roadsPane").style.zIndex = "450";
map.getPane("roadsPane").style.pointerEvents = "none";

map.createPane("routeLabelsPane");
map.getPane("routeLabelsPane").style.zIndex = "465";
map.getPane("routeLabelsPane").style.pointerEvents = "none";

map.createPane("quizMarkersPane");
map.getPane("quizMarkersPane").style.zIndex = "680";

map.createPane("blinkPane");
map.getPane("blinkPane").style.zIndex = "500";
map.getPane("blinkPane").style.pointerEvents = "none";

const ROAD_MIN_ZOOM = 6;
const ROAD_NUMBERED_MIN_ZOOM = 8;
let majorRoutesAutorouteLayer = null;
let majorRoutesNumberedLayer = null;
/** @type {{ feature: object, west: number, south: number, east: number, north: number }[] | null} */
let majorRoutesSpatialIndex = null;
let routeLabelsLayer = L.layerGroup();
let routeLabelUpdateTimer = null;
let routesHiddenDuringZoom = false;
let mapInteractionEndTimer = null;

const MAP_INTERACTION_SETTLE_MS = 220;
/** @type {number | null} */
let lastRoadStyleZoom = null;

const markerRenderer = L.canvas({ padding: 0.25, pane: "quizMarkersPane" });

const markerPathOpts = {
  renderer: markerRenderer,
  updateWhenZooming: false,
  updateWhenIdle: true,
};

function featureBBox(feature) {
  const coords = feature.geometry?.coordinates;
  if (!coords?.length) {
    return null;
  }
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return { west, south, east, north };
}

function buildRoutesSpatialIndex(features) {
  const index = [];
  for (const feature of features) {
    const box = featureBBox(feature);
    if (!box) {
      continue;
    }
    index.push({ feature, ...box });
  }
  return index;
}

function bboxIntersectsBounds(box, bounds) {
  return !(
    box.east < bounds.getWest() ||
    box.west > bounds.getEast() ||
    box.north < bounds.getSouth() ||
    box.south > bounds.getNorth()
  );
}

function majorRouteStyle(feature) {
  const z = map.getZoom();
  if (feature.properties?.kind === "autoroute") {
    const weight = z >= 11 ? 2.5 : z >= 9 ? 2 : 1.5;
    return {
      color: "#3b82f6",
      weight,
      opacity: 0.9,
      lineCap: "round",
      lineJoin: "round",
    };
  }
  const weight = z >= 11 ? 2 : z >= 9 ? 1.5 : 1.25;
  return {
    color: "#eab308",
    weight,
    opacity: 0.88,
    lineCap: "round",
    lineJoin: "round",
  };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatRouteLabel(props) {
  const ref = (props.ref || "").trim();
  if (ref) {
    const primary = ref.split(";")[0].trim().replace(/\s+/g, "");
    if (props.kind === "autoroute") {
      if (/^A-?\d/i.test(primary)) {
        return primary.toUpperCase().replace(/^A(\d)/i, "A-$1");
      }
      return `A-${primary}`;
    }
    return primary;
  }
  const name = (props.name || "").trim();
  if (!name) {
    return "";
  }
  const m = name.match(/\b(\d{1,3})\b/);
  if (m) {
    return props.kind === "autoroute" ? `A-${m[1]}` : m[1];
  }
  return name.length > 14 ? `${name.slice(0, 12)}…` : name;
}

function minRouteLabelSegmentKm(zoom) {
  if (zoom >= 11) {
    return 1.2;
  }
  if (zoom >= 10) {
    return 3.5;
  }
  /* Zoom 9 : segments longs seulement */
  return 10;
}

function routeLabelGridDegrees(zoom) {
  if (zoom >= 11) {
    return 0.045;
  }
  if (zoom >= 10) {
    return 0.14;
  }
  /* Zoom 9 : grande maille (clé par route, pas par cellule) */
  return 0.6;
}

function routeLabelDedupeKey(props, label, latlng, grid, zoom) {
  const routeKey = `${props.kind}|${label}`;
  if (zoom <= 9) {
    return routeKey;
  }
  const cell = `${Math.floor(latlng.lat / grid)}:${Math.floor(latlng.lng / grid)}`;
  return `${routeKey}|${cell}`;
}

function featureMidpointLatLng(feature) {
  const geom = feature.geometry;
  if (!geom) {
    return null;
  }
  try {
    const line = geom.type === "LineString" ? turf.lineString(geom.coordinates) : null;
    if (!line) {
      return null;
    }
    const lenKm = turf.length(line, { units: "kilometers" });
    if (lenKm <= 0) {
      return null;
    }
    const mid = turf.along(line, lenKm / 2, { units: "kilometers" });
    const [lng, lat] = mid.geometry.coordinates;
    return L.latLng(lat, lng);
  } catch {
    return null;
  }
}

function scheduleRouteLabelUpdate() {
  if (routeLabelUpdateTimer) {
    clearTimeout(routeLabelUpdateTimer);
  }
  routeLabelUpdateTimer = setTimeout(() => {
    routeLabelUpdateTimer = null;
    if (routesHiddenDuringZoom) {
      return;
    }
    updateRouteLabels();
  }, 280);
}

function updateRouteLabels() {
  routeLabelsLayer.clearLayers();
  const zoom = map.getZoom();
  const mapEl = map.getContainer();
  mapEl.classList.toggle("map-show-route-labels", zoom >= MIN_ZOOM_FOR_ROUTE_LABELS);

  if (
    zoom < MIN_ZOOM_FOR_ROUTE_LABELS ||
    !majorRoutesSpatialIndex?.length ||
    routesHiddenDuringZoom
  ) {
    if (map.hasLayer(routeLabelsLayer)) {
      map.removeLayer(routeLabelsLayer);
    }
    return;
  }

  if (!map.hasLayer(routeLabelsLayer)) {
    routeLabelsLayer.addTo(map);
  }

  const bounds = map.getBounds();
  const minLen = minRouteLabelSegmentKm(zoom);
  const grid = routeLabelGridDegrees(zoom);
  /** @type {Map<string, { lenKm: number, latlng: L.LatLng, label: string, kind: string }>} */
  const picks = new Map();

  for (const entry of majorRoutesSpatialIndex) {
    if (!bboxIntersectsBounds(entry, bounds)) {
      continue;
    }
    const feature = entry.feature;
    const props = feature.properties || {};
    const label = formatRouteLabel(props);
    if (!label) {
      continue;
    }
    try {
      const geom = feature.geometry;
      if (!geom || geom.type !== "LineString") {
        continue;
      }
      const line = turf.lineString(geom.coordinates);
      const lenKm = turf.length(line, { units: "kilometers" });
      if (lenKm < minLen) {
        continue;
      }
      const latlng = featureMidpointLatLng(feature);
      if (!latlng || !bounds.contains(latlng)) {
        continue;
      }
      const key = routeLabelDedupeKey(props, label, latlng, grid, zoom);
      const prev = picks.get(key);
      if (!prev || lenKm > prev.lenKm) {
        picks.set(key, {
          lenKm,
          latlng,
          label,
          kind: props.kind === "autoroute" ? "autoroute" : "numbered",
        });
      }
    } catch {
      /* skip */
    }
  }

  for (const { latlng, label, kind } of picks.values()) {
    const shieldClass =
      kind === "autoroute" ? "route-shield-autoroute" : "route-shield-numbered";
    L.marker(latlng, {
      pane: "routeLabelsPane",
      interactive: false,
      icon: L.divIcon({
        className: "route-shield-anchor",
        html: `<span class="route-shield-marker ${shieldClass}">${escapeHtml(label)}</span>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      }),
    }).addTo(routeLabelsLayer);
  }
}

function refreshMajorRouteStyles() {
  const z = map.getZoom();
  if (lastRoadStyleZoom === z) {
    return;
  }
  lastRoadStyleZoom = z;
  if (majorRoutesAutorouteLayer) {
    majorRoutesAutorouteLayer.eachLayer((layer) => {
      if (layer.feature) {
        layer.setStyle(majorRouteStyle(layer.feature));
      }
    });
  }
  if (majorRoutesNumberedLayer) {
    majorRoutesNumberedLayer.eachLayer((layer) => {
      if (layer.feature) {
        layer.setStyle(majorRouteStyle(layer.feature));
      }
    });
  }
}

function syncRoadOverlays() {
  if (routesHiddenDuringZoom) {
    return;
  }

  const zoom = map.getZoom();

  if (majorRoutesAutorouteLayer) {
    if (zoom >= ROAD_MIN_ZOOM) {
      if (!map.hasLayer(majorRoutesAutorouteLayer)) {
        majorRoutesAutorouteLayer.addTo(map);
      }
    } else if (map.hasLayer(majorRoutesAutorouteLayer)) {
      map.removeLayer(majorRoutesAutorouteLayer);
    }
  }

  if (majorRoutesNumberedLayer) {
    if (zoom >= ROAD_NUMBERED_MIN_ZOOM) {
      if (!map.hasLayer(majorRoutesNumberedLayer)) {
        majorRoutesNumberedLayer.addTo(map);
      }
    } else if (map.hasLayer(majorRoutesNumberedLayer)) {
      map.removeLayer(majorRoutesNumberedLayer);
    }
  }

  refreshMajorRouteStyles();
  scheduleRouteLabelUpdate();
}

async function loadMajorRoutes() {
  const res = await fetch(ROUTES_URL);
  if (!res.ok) {
    console.warn(`Routes non chargées (${ROUTES_URL}). Lancez scripts/simplify_major_routes.py`);
    return;
  }
  const geojson = await res.json();
  const autorouteFeatures = [];
  const numberedFeatures = [];
  for (const f of geojson.features) {
    if (f.properties?.kind === "autoroute") {
      autorouteFeatures.push(f);
    } else {
      numberedFeatures.push(f);
    }
  }
  majorRoutesSpatialIndex = buildRoutesSpatialIndex(geojson.features);

  const layerOpts = {
    pane: "roadsPane",
    interactive: false,
    style: majorRouteStyle,
    ...vectorPathOpts,
  };

  majorRoutesAutorouteLayer = L.geoJSON(
    { type: "FeatureCollection", features: autorouteFeatures },
    layerOpts
  );
  majorRoutesNumberedLayer = L.geoJSON(
    { type: "FeatureCollection", features: numberedFeatures },
    layerOpts
  );
  syncRoadOverlays();
}

function beginMapInteraction() {
  if (mapInteractionEndTimer) {
    clearTimeout(mapInteractionEndTimer);
    mapInteractionEndTimer = null;
  }
  if (routesHiddenDuringZoom) {
    return;
  }
  routesHiddenDuringZoom = true;
  routeLabelsLayer.clearLayers();
  map.getContainer().classList.add("map-is-zooming");
}

function finishMapInteraction() {
  mapInteractionEndTimer = null;
  routesHiddenDuringZoom = false;
  map.getContainer().classList.remove("map-is-zooming");
  onMapViewChangedForRoutes();
  syncMunicipalityLabelVisibility();
  updateCorrectNameLabel();
  scheduleRouteLabelUpdate();
}

function scheduleFinishMapInteraction() {
  if (mapInteractionEndTimer) {
    clearTimeout(mapInteractionEndTimer);
  }
  mapInteractionEndTimer = setTimeout(
    finishMapInteraction,
    MAP_INTERACTION_SETTLE_MS
  );
}

function onMapZoomStart() {
  beginMapInteraction();
}

function onMapZoomEnd() {
  scheduleFinishMapInteraction();
}

function onMapViewChangedForRoutes() {
  syncRoadOverlays();
}

map.on("zoomstart", onMapZoomStart);
map.on("zoomend", onMapZoomEnd);
loadMajorRoutes().catch((err) => console.warn("Routes:", err));
syncMunicipalityLabelVisibility();

const baseStyle = {
  color: "#e2e8f0",
  weight: 1,
  fillColor: "#64748b",
  fillOpacity: 0,
};

const dotStyle = {
  radius: 4,
  color: "#cbd5e1",
  fillColor: "#e2e8f0",
  fillOpacity: 0.95,
  weight: 1,
  interactive: false,
};

/** Points masqués (mode « nommer » : seul le point cible clignote). */
const dotHiddenStyle = {
  radius: 0,
  color: "#cbd5e1",
  fillColor: "#e2e8f0",
  fillOpacity: 0,
  opacity: 0,
  weight: 0,
  interactive: false,
};

/** Zone cliquable (2× le rayon visible), sans rendu. fillOpacity > 0 requis pour le canvas Leaflet. */
const hitAreaStyle = {
  radius: 8,
  fillColor: "#000",
  fillOpacity: 0.01,
  opacity: 0,
  weight: 0,
  className: "municipality-hit",
};

const FAILED_ROUND_HIT_RADIUS = 20;
const FAILED_ROUND_CLICK_TOLERANCE_PX = 40;

const dotHoverStyle = {
  radius: 7,
  color: "#f8fafc",
  fillColor: "#93c5fd",
  fillOpacity: 1,
  weight: 2,
};

/** @type {{ dot: object, zone: object, feedback: string, feedbackClass: string } | null} */
let solvedStyles = null;

const blinkZoneStyle = {
  color: "#dc2626",
  weight: 3,
  fillColor: "#ef4444",
  fillOpacity: 0.55,
};

const blinkDotStyle = {
  radius: 6,
  color: "#dc2626",
  fillColor: "#ef4444",
  fillOpacity: 1,
  weight: 2,
};

/** Toutes les entités jouables (hors TNO), réserves incluses ou non. */
let allBaseFeatures = [];
let includeIndianReserves = false;
let onlyIndianReserves = false;
/** @type {{ code: string, nom: string }[]} */
let mrcCatalog = [];
/** @type {Set<string>} */
let disabledMrcCodes = new Set();
let mrcSearchQuery = "";
let municipalities = [];
let gameStarted = false;
let quizFinished = false;
let typemaxGiveUpUsed = false;
let nameModeLeftShiftAlonePending = false;
/** Codes nommés correctement (pas révélés / passés). */
const namedCorrectCodes = new Set();
const namedRevealedCodes = new Set();
/** Typemax abandon: codes the player did not name (shown in red in the list). */
const typemaxMissedCodes = new Set();
/** @type {{ code: string, nom: string }[]} */
let nameProgressSlots = [];
let nameProgressSidebarOpen = false;
let quizPaused = false;
/** @type {number | null} */
let quizStartedAt = null;
/** @type {number | null} */
let quizPauseStartedAt = null;
let quizPausedTotalMs = 0;
/** When set, timer display and final score use this elapsed time (e.g. typemax abandon). */
let quizElapsedFrozenMs = null;
/** @type {ReturnType<typeof setInterval> | null} */
let quizTimerInterval = null;
/** @type {Set<string>} */
const completedCodes = new Set();
/** @type {Map<string, object>} */
const completedMarkerStyles = new Map();
let target = null;
/** Prochaine question déjà tirée au hasard (pendant la manche en cours). */
let queuedTarget = null;
let solved = false;
let failedRound = false;
let strikes = 0;
let boundaryLayer = null;
let markersLayer = null;
let highlightLayer = null;
let blinkLayer = null;
let blinkInterval = null;
let blinkVisible = false;
let hoveredMarkerCode = null;
let answerLabelActive = false;
let failedAnswerConfirmed = false;
let nextRoundTimer = null;
/** @type {Map<string, L.CircleMarker>} */
const markersByCode = new Map();
/** @type {Map<string, [number, number]>} */
const featureDotLatLngCache = new Map();
/** @type {Map<string, L.CircleMarker>} */
const hitAreasByCode = new Map();
let failedRoundMapClickActive = false;
/** @type {Map<string, { nom: string }>} */
const wrongReveals = new Map();
/** @type {Map<string, object>} */
const discoveredZoneStyles = new Map();
/** @type {Map<string, L.Layer>} */
const boundaryLayersByCode = new Map();
/** @type {GeoJSON.Feature[]} */
let mapBoundaryFeaturePool = [];
/** @type {Map<string, { west: number; south: number; east: number; north: number }>} */
const municipalityBoundsByCode = new Map();

function loadIncludeIndianReservesPref() {
  try {
    return localStorage.getItem(INCLUDE_RESERVES_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

function saveIncludeIndianReservesPref(value) {
  try {
    localStorage.setItem(INCLUDE_RESERVES_PREF_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function saveOnlyIndianReservesPref(value) {
  try {
    localStorage.setItem(ONLY_RESERVES_PREF_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function loadOnlyIndianReservesPref() {
  try {
    return localStorage.getItem(ONLY_RESERVES_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

function syncReserveOptionCheckboxesUi() {
  if (includeIndianReservesEl) {
    includeIndianReservesEl.disabled = onlyIndianReserves;
    includeIndianReservesEl.checked = onlyIndianReserves
      ? false
      : includeIndianReserves;
  }
  if (onlyIndianReservesEl) {
    onlyIndianReservesEl.checked = onlyIndianReserves;
  }
}

function isIndigenousOrNordicFeature(feature) {
  return INDIGENOUS_AND_NORDIC_DESIGNATIONS.has(feature.properties?.designation);
}

function isBasePlayableFeature(feature) {
  return (
    feature.geometry &&
    feature.properties?.code &&
    feature.properties?.nom &&
    feature.properties?.designation !== "G" &&
    feature.properties?.designation !== "NO" &&
    !String(feature.properties.nom).includes("TNO aquatique")
  );
}

function featureMrcCode(feature) {
  return normalizeMrcCode(feature.properties?.mrcCode);
}

function normalizeMrcCode(code) {
  const raw = String(code ?? "").trim();
  if (!raw) {
    return "";
  }
  if (/^\d+$/.test(raw)) {
    const trimmed = raw.replace(/^0+/, "");
    return trimmed || "0";
  }
  return raw;
}

function foldMunicipalityDisplayName(str) {
  return String(str)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function foldedPrimaryNom(nom) {
  let s = foldMunicipalityDisplayName(municipalityPrimaryName(nom));
  s = s.replace(/[\u2010-\u2015\u2212\u00ad\u2043]/g, "-");
  return s;
}

/** Eeyou Istchee Baie-James — « Baie » n’est pas le début du nom. */
const TYPEMAX_BAIE_FILTER_EXCLUDED_CODES = new Set(["99060"]);

/** Saint-… (not Sainte/Saintes) plus Saints-… */
function matchesTypemaxFilterSaintAndSaints(nom) {
  const p = foldedPrimaryNom(nom);
  if (p.startsWith("saints-")) {
    return true;
  }
  if (p.startsWith("sainte-") || p.startsWith("saintes-")) {
    return false;
  }
  return p.startsWith("saint-");
}

/** Saint-… / Sainte-… (toutes variantes : Saints-, Saintes-, etc.) */
function matchesTypemaxFilterSaintSlashSainte(nom) {
  const p = foldedPrimaryNom(nom);
  if (p.startsWith("sainte-") || p.startsWith("saintes-")) {
    return true;
  }
  if (p.startsWith("saints-")) {
    return true;
  }
  return p.startsWith("saint-");
}

const TYPEMAX_NAME_PREFIX_FILTER_DEFS = [
  {
    id: "saint-and-saints",
    labelKey: "typemaxFilterSaintAndSaints",
    matches: matchesTypemaxFilterSaintAndSaints,
  },
  {
    id: "sainte",
    labelKey: "typemaxFilterSainte",
    matches(nom) {
      return foldedPrimaryNom(nom).startsWith("sainte-");
    },
  },
  {
    id: "saint-saints-saintes",
    labelKey: "typemaxFilterSaintSlashSainte",
    matches: matchesTypemaxFilterSaintSlashSainte,
  },
  {
    id: "lac",
    labelKey: "typemaxFilterLac",
    matches(nom) {
      return foldedPrimaryNom(nom).startsWith("lac-");
    },
  },
  {
    id: "notre-dame",
    labelKey: "typemaxFilterNotreDame",
    matches(nom) {
      return foldedPrimaryNom(nom).startsWith("notre-dame-");
    },
  },
  {
    id: "val",
    labelKey: "typemaxFilterVal",
    matches(nom) {
      return foldedPrimaryNom(nom).startsWith("val-");
    },
  },
  {
    id: "riviere",
    labelKey: "typemaxFilterRiviere",
    matches(nom) {
      return foldedPrimaryNom(nom).startsWith("riviere-");
    },
  },
  {
    id: "mont",
    labelKey: "typemaxFilterMont",
    matches(nom) {
      return foldedPrimaryNom(nom).startsWith("mont-");
    },
  },
  {
    id: "baie",
    labelKey: "typemaxFilterBaie",
    matches(nom) {
      const p = foldedPrimaryNom(nom);
      return p.startsWith("baie-") || p === "baie" || p.startsWith("baie ");
    },
  },
  {
    id: "les",
    labelKey: "typemaxFilterLes",
    matches(nom) {
      const p = foldedPrimaryNom(nom);
      return p.startsWith("les ") || p.startsWith("les-");
    },
  },
  {
    id: "pointe",
    labelKey: "typemaxFilterPointe",
    matches(nom) {
      return foldedPrimaryNom(nom).startsWith("pointe-");
    },
  },
];

/** @type {Set<string>} */
let enabledTypemaxNamePrefixFilters = new Set();

function shouldApplyTypemaxNamePrefixFilters() {
  if (getSelectedGameModeFromSetup() === GAME_MODE_MISC) {
    return false;
  }
  if (gameStarted) {
    return gameMode === GAME_MODE_TYPEMAX;
  }
  return getSelectedGameModeFromSetup() === GAME_MODE_TYPEMAX;
}

function municipalityMatchesTypemaxNamePrefixFilters(feature) {
  if (!shouldApplyTypemaxNamePrefixFilters()) {
    return true;
  }
  if (enabledTypemaxNamePrefixFilters.size === 0) {
    return true;
  }
  const nom = feature.properties?.nom;
  if (!nom) {
    return false;
  }
  const code = String(feature.properties?.code ?? "");
  for (const def of TYPEMAX_NAME_PREFIX_FILTER_DEFS) {
    if (!enabledTypemaxNamePrefixFilters.has(def.id)) {
      continue;
    }
    if (def.id === "baie" && TYPEMAX_BAIE_FILTER_EXCLUDED_CODES.has(code)) {
      continue;
    }
    if (def.matches(nom)) {
      return true;
    }
  }
  return false;
}

function baseFeaturesExcludingTypemaxNameFilters() {
  return allBaseFeatures.filter((f) => {
    const indigenous = isIndigenousOrNordicFeature(f);
    if (onlyIndianReserves) {
      if (!indigenous) {
        return false;
      }
    } else if (!includeIndianReserves && indigenous) {
      return false;
    }
    const mrc = featureMrcCode(f);
    if (mrc && disabledMrcCodes.has(mrc)) {
      return false;
    }
    return true;
  });
}

function loadTypemaxNamePrefixFilterPref() {
  const valid = new Set(TYPEMAX_NAME_PREFIX_FILTER_DEFS.map((d) => d.id));
  try {
    const raw = localStorage.getItem(TYPEMAX_NAME_PREFIX_FILTER_PREF_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((id) => valid.has(String(id))));
  } catch {
    return new Set();
  }
}

function saveTypemaxNamePrefixFilterPref() {
  try {
    localStorage.setItem(
      TYPEMAX_NAME_PREFIX_FILTER_PREF_KEY,
      JSON.stringify([...enabledTypemaxNamePrefixFilters])
    );
  } catch {
    /* ignore */
  }
}

function syncTypemaxNameFilterPanelVisibility() {
  const panel = document.getElementById("typemax-name-filter-panel");
  if (!panel) {
    return;
  }
  const show =
    getSelectedGameModeFromSetup() === GAME_MODE_TYPEMAX ||
    (gameStarted && gameMode === GAME_MODE_TYPEMAX);
  panel.classList.toggle("hidden", !show);
}

function updateTypemaxNameFilterSummary() {
  const el = document.getElementById("typemax-name-filter-summary");
  if (!el) {
    return;
  }
  const active = enabledTypemaxNamePrefixFilters.size;
  el.textContent =
    active === 0
      ? t("typemaxNameFilterSummaryAll", { n: municipalities.length })
      : t("typemaxNameFilterSummary", {
          active,
          n: municipalities.length,
        });
}

function typemaxNameFilterMatchCount(def, pool) {
  return pool.filter((f) => {
    const code = String(f.properties?.code ?? "");
    if (def.id === "baie" && TYPEMAX_BAIE_FILTER_EXCLUDED_CODES.has(code)) {
      return false;
    }
    return def.matches(f.properties.nom);
  }).length;
}

function handleTypemaxNameFilterChecklistChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.type !== "checkbox") {
    return;
  }
  const filterId = input.dataset.filterId;
  if (!filterId) {
    return;
  }
  if (input.checked) {
    enabledTypemaxNamePrefixFilters.add(filterId);
  } else {
    enabledTypemaxNamePrefixFilters.delete(filterId);
  }
  saveTypemaxNamePrefixFilterPref();
  applyPlayableFilters({ refitBounds: true });
}

function renderTypemaxNameFilterChecklist() {
  const root = document.getElementById("typemax-name-filter-list");
  if (!root) {
    return;
  }
  root.replaceChildren();
  const pool = baseFeaturesExcludingTypemaxNameFilters();
  for (const def of TYPEMAX_NAME_PREFIX_FILTER_DEFS) {
    const count = typemaxNameFilterMatchCount(def, pool);
    const label = document.createElement("label");
    label.className = "option-toggle mrc-checklist-item";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = enabledTypemaxNamePrefixFilters.has(def.id);
    input.dataset.filterId = def.id;
    const span = document.createElement("span");
    span.textContent = t(def.labelKey, { count });
    label.appendChild(input);
    label.appendChild(span);
    root.appendChild(label);
  }
  updateTypemaxNameFilterSummary();
}

function clearAllTypemaxNamePrefixFilters() {
  if (enabledTypemaxNamePrefixFilters.size === 0) {
    return;
  }
  enabledTypemaxNamePrefixFilters.clear();
  saveTypemaxNamePrefixFilterPref();
  applyPlayableFilters({ refitBounds: true });
}

function configureNameGuessInputNoSuggestions() {
  if (!nameGuessInputEl) {
    return;
  }
  nameGuessInputEl.setAttribute("autocomplete", "off");
  nameGuessInputEl.setAttribute("autocorrect", "off");
  nameGuessInputEl.setAttribute("autocapitalize", "off");
  nameGuessInputEl.setAttribute("spellcheck", "false");
  nameGuessInputEl.setAttribute("aria-autocomplete", "none");
  nameGuessInputEl.setAttribute("data-lpignore", "true");
  nameGuessInputEl.setAttribute("data-1p-ignore", "true");
  nameGuessInputEl.setAttribute("data-form-type", "other");
  nameGuessInputEl.removeAttribute("list");
}

function refreshNameGuessInputAutofillKey() {
  if (!nameGuessInputEl) {
    return;
  }
  nameGuessInputEl.name = `quiz-guess-${gameMode}-${Date.now()}`;
}

function getSelectedMiscSubmodeFromSetup() {
  const checked = document.querySelector('input[name="misc-submode"]:checked');
  const value = checked?.value;
  if (value === MISC_SUBMODE_TOP10_LARGEST_AREA) {
    return MISC_SUBMODE_TOP10_LARGEST_AREA;
  }
  if (value === MISC_SUBMODE_TOP10_SAINTS) {
    return MISC_SUBMODE_TOP10_SAINTS;
  }
  return MISC_SUBMODE_TOP10_SAINTS;
}

function miscSaintsIsBuiltInQuiz() {
  const inMiscMode =
    gameStarted && gameMode === GAME_MODE_MISC
      ? true
      : getSelectedGameModeFromSetup() === GAME_MODE_MISC;
  if (!inMiscMode) {
    return false;
  }
  const submode =
    gameStarted && gameMode === GAME_MODE_MISC
      ? miscActiveSubmode
      : getSelectedMiscSubmodeFromSetup();
  return submode === MISC_SUBMODE_TOP10_SAINTS;
}

function getMiscSaintsBuiltInFeatures() {
  return allBaseFeatures.filter((f) => !isIndigenousOrNordicFeature(f));
}

function syncMrcFilterPanelVisibility() {
  const panel = document.getElementById("mrc-filter-panel");
  if (!panel) {
    return;
  }
  panel.classList.toggle("hidden", miscSaintsIsBuiltInQuiz());
}

function syncSetupReserveOptionsVisibility() {
  const card = document.getElementById("setup-reserve-options");
  if (!card) {
    return;
  }
  card.classList.toggle("hidden", miscSaintsIsBuiltInQuiz());
}

function syncMiscSaintsSetupUi() {
  syncMrcFilterPanelVisibility();
  syncSetupReserveOptionsVisibility();
  if (
    !gameStarted &&
    setupDataReady &&
    getSelectedGameModeFromSetup() === GAME_MODE_MISC &&
    getSelectedMiscSubmodeFromSetup() === MISC_SUBMODE_TOP10_LARGEST_AREA
  ) {
    applyPlayableFilters();
  }
}

function featureAreaKm2(feature) {
  const raw = feature.properties?.areaKm2;
  if (raw != null && Number.isFinite(Number(raw))) {
    return Number(raw);
  }
  if (feature.geometry && typeof turf !== "undefined" && turf.area) {
    return turf.area(feature) / 1_000_000;
  }
  return 0;
}

function formatAreaKm2Display(km2) {
  const n = Number(km2);
  if (!Number.isFinite(n)) {
    return "—";
  }
  if (n >= 100) {
    return `${Math.round(n).toLocaleString()} km²`;
  }
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} km²`;
}

function municipalityDisplayName(nom) {
  return municipalityPrimaryName(nom);
}

function syncMiscSubmodePanelVisibility() {
  if (!miscSubmodePanelEl) {
    return;
  }
  const show =
    getSelectedGameModeFromSetup() === GAME_MODE_MISC ||
    (gameStarted && gameMode === GAME_MODE_MISC);
  miscSubmodePanelEl.classList.toggle("hidden", !show);
  syncMiscSaintsSetupUi();
}

function extractSaintLeaderboardKey(nom) {
  const primary = municipalityPrimaryName(nom);
  const match = primary.match(/^(Saint|Sainte|Saints|Saintes)-(.+)$/i);
  if (!match) {
    return null;
  }
  const segment = match[2].split("-")[0];
  const kind = match[1].toLowerCase();
  let prefix = "Saint";
  if (kind === "sainte") {
    prefix = "Sainte";
  } else if (kind === "saints") {
    prefix = "Saints";
  } else if (kind === "saintes") {
    prefix = "Saintes";
  }
  return `${prefix}-${segment}`;
}

function buildSaintEntryMatchKeys(label) {
  const keys = new Set();
  keys.add(normalizeMunicipalityNameForMatch(label));
  const match = label.match(/^(Saint|Sainte|Saints|Saintes)-(.+)$/i);
  if (match) {
    const segment = match[2].split("-")[0];
    keys.add(normalizeMunicipalityNameForMatch(segment));
    keys.add(normalizeMunicipalityNameForMatch(`${match[1]}-${segment}`));
  }
  return keys;
}

function computeTop10SaintEntries(features) {
  const counts = new Map();
  for (const feature of features) {
    const key = extractSaintLeaderboardKey(feature.properties.nom);
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }
    const locale = document.documentElement.lang === "en" ? "en" : "fr";
    return a[0].localeCompare(b[0], locale, { sensitivity: "base" });
  });
  const qualifying = sorted.filter(
    ([, count]) => count >= MISC_SAINT_MIN_OCCURRENCES
  );
  return qualifying.map(([label, count], index) => ({
    rank: index + 1,
    label,
    hint: String(count),
    revealed: false,
    foundByUser: false,
    missedOnGiveUp: false,
    matchKeys: buildSaintEntryMatchKeys(label),
  }));
}

function computeTop10LargestAreaEntries(features) {
  const locale = document.documentElement.lang === "en" ? "en" : "fr";
  const sorted = features
    .map((feature) => ({
      feature,
      areaKm2: featureAreaKm2(feature),
      label: municipalityDisplayName(feature.properties.nom),
    }))
    .filter((row) => row.areaKm2 > 0)
    .sort((a, b) => {
      if (b.areaKm2 !== a.areaKm2) {
        return b.areaKm2 - a.areaKm2;
      }
      return a.label.localeCompare(b.label, locale, { sensitivity: "base" });
    });
  return sorted.slice(0, MISC_SAINT_TOP_N).map((row, index) => ({
    rank: index + 1,
    label: row.label,
    hint: formatAreaKm2Display(row.areaKm2),
    revealed: false,
    foundByUser: false,
    missedOnGiveUp: false,
    matchKeys: new Set(
      normalizedOfficialNameMatchKeys(
        row.feature.properties.nom,
        row.feature.properties.code
      )
    ),
  }));
}

function buildMiscLeaderboardEntries(features, submode) {
  if (submode === MISC_SUBMODE_TOP10_LARGEST_AREA) {
    return computeTop10LargestAreaEntries(features);
  }
  return computeTop10SaintEntries(getMiscSaintsBuiltInFeatures());
}

function miscSubmodeReady(features, submode) {
  if (submode === MISC_SUBMODE_TOP10_LARGEST_AREA) {
    return buildMiscLeaderboardEntries(features, submode).length >= MISC_SAINT_TOP_N;
  }
  return buildMiscLeaderboardEntries(features, submode).length > 0;
}

function syncMiscQuizOverlayVisibility() {
  if (!miscQuizOverlayEl) {
    return;
  }
  const show =
    gameStarted &&
    gameMode === GAME_MODE_MISC &&
    (!quizFinished || miscGiveUpUsed);
  miscQuizOverlayEl.classList.toggle("hidden", !show);
  miscQuizOverlayEl.setAttribute("aria-hidden", show ? "false" : "true");
}

function updateMiscLeaderboardHead() {
  const nameCol = document.getElementById("misc-leaderboard-name-col");
  const hintCol = document.getElementById("misc-leaderboard-hint-col");
  if (nameCol) {
    nameCol.textContent =
      miscActiveSubmode === MISC_SUBMODE_TOP10_LARGEST_AREA
        ? t("miscLeaderboardMunicipality")
        : t("miscLeaderboardSaint");
  }
  if (hintCol) {
    hintCol.textContent =
      miscActiveSubmode === MISC_SUBMODE_TOP10_LARGEST_AREA
        ? t("miscLeaderboardArea")
        : t("miscLeaderboardCount");
  }
}

function renderMiscLeaderboard() {
  if (!miscLeaderboardBodyEl) {
    return;
  }
  updateMiscLeaderboardHead();
  miscLeaderboardBodyEl.replaceChildren();
  for (const entry of miscLeaderboardEntries) {
    const row = document.createElement("tr");
    if (!entry.revealed) {
      row.className = "misc-leaderboard-row--pending";
    } else if (entry.missedOnGiveUp) {
      row.className =
        "misc-leaderboard-row--revealed misc-leaderboard-row--missed";
    } else {
      row.className = "misc-leaderboard-row--revealed";
    }

    const rankCell = document.createElement("td");
    rankCell.textContent = String(entry.rank);

    const nameCell = document.createElement("td");
    nameCell.className = "misc-leaderboard-name";
    nameCell.textContent = entry.revealed
      ? entry.label
      : t("miscLeaderboardEmpty");

    const hintCell = document.createElement("td");
    hintCell.textContent = entry.hint;

    row.appendChild(rankCell);
    row.appendChild(nameCell);
    row.appendChild(hintCell);
    miscLeaderboardBodyEl.appendChild(row);
  }
}

function findMiscLeaderboardEntryForGuess(guess, { unrevealedOnly = true } = {}) {
  const normalizedGuess = normalizeMunicipalityNameForMatch(guess);
  if (!normalizedGuess) {
    return null;
  }
  const pool = unrevealedOnly
    ? miscLeaderboardEntries.filter((e) => !e.revealed)
    : miscLeaderboardEntries;
  const matches = pool.filter((entry) => entry.matchKeys.has(normalizedGuess));
  if (matches.length === 0) {
    return null;
  }
  if (matches.length === 1) {
    return matches[0];
  }
  const exact = matches.find(
    (entry) => normalizeMunicipalityNameForMatch(entry.label) === normalizedGuess
  );
  return exact ?? matches[0];
}

function revealMiscLeaderboardEntry(entry) {
  if (!entry || entry.revealed) {
    return false;
  }
  entry.revealed = true;
  entry.foundByUser = true;
  miscCorrectCount += 1;
  renderMiscLeaderboard();
  return true;
}

function tryAcceptMiscGuess({ force = false } = {}) {
  if (
    !gameStarted ||
    quizFinished ||
    quizPaused ||
    gameMode !== GAME_MODE_MISC ||
    miscGiveUpUsed
  ) {
    return;
  }
  const guess = nameGuessInputEl?.value ?? "";
  const normalizedGuess = normalizeMunicipalityNameForMatch(guess);
  if (!normalizedGuess) {
    return;
  }
  const already = findMiscLeaderboardEntryForGuess(guess, {
    unrevealedOnly: false,
  });
  if (already?.revealed) {
    if (force) {
      setFeedback(t("miscAlreadyFound"), "error");
    }
    return;
  }
  const match = findMiscLeaderboardEntryForGuess(guess, { unrevealedOnly: true });
  if (!match) {
    if (force) {
      setFeedback(t("miscUnknown"), "error");
    }
    return;
  }
  revealMiscLeaderboardEntry(match);
  setFeedback(t("successPerfect"), "success");
  if (nameGuessInputEl) {
    nameGuessInputEl.value = "";
  }
  updateQuizProgressFeedback();
  if (miscCorrectCount >= miscLeaderboardEntries.length) {
    clearNextRoundTimer();
    nextRoundTimer = setTimeout(() => {
      nextRoundTimer = null;
      finishQuiz();
    }, MAP_FEEDBACK_MS);
  } else if (!quizPaused && nameGuessInputEl) {
    requestAnimationFrame(() => nameGuessInputEl.focus());
  }
}

function handleMiscGiveUp() {
  if (
    !gameStarted ||
    quizFinished ||
    quizPaused ||
    gameMode !== GAME_MODE_MISC ||
    miscGiveUpUsed
  ) {
    return;
  }
  miscGiveUpUsed = true;
  quizElapsedFrozenMs = getQuizElapsedMs();
  stopQuizTimerInterval();
  for (const entry of miscLeaderboardEntries) {
    if (!entry.foundByUser) {
      entry.missedOnGiveUp = true;
    }
    entry.revealed = true;
  }
  renderMiscLeaderboard();
  if (nameGuessInputEl) {
    nameGuessInputEl.value = "";
    nameGuessInputEl.disabled = true;
  }
  syncGameBarForMode();
  finishQuiz();
}

function initMiscQuizUi() {
  document.querySelectorAll('input[name="misc-submode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      syncMiscSaintsSetupUi();
      applyPlayableFilters({ refitBounds: true });
      if (!gameStarted && setupStepOptionsEl && !setupStepOptionsEl.hidden) {
        showSetupPrompt();
        updateStartQuizButton();
      }
    });
  });
  syncMiscSubmodePanelVisibility();
}

function initTypemaxNameFilterUi() {
  enabledTypemaxNamePrefixFilters = loadTypemaxNamePrefixFilterPref();
  const root = document.getElementById("typemax-name-filter-list");
  if (root && !root.dataset.changeBound) {
    root.dataset.changeBound = "1";
    root.addEventListener("change", handleTypemaxNameFilterChecklistChange);
  }
  document
    .getElementById("typemax-name-filter-clear-all")
    ?.addEventListener("click", clearAllTypemaxNamePrefixFilters);
  renderTypemaxNameFilterChecklist();
  syncTypemaxNameFilterPanelVisibility();
}

function computePlayableMunicipalities() {
  if (miscSaintsIsBuiltInQuiz()) {
    return getMiscSaintsBuiltInFeatures();
  }
  return allBaseFeatures.filter((f) => {
    const indigenous = isIndigenousOrNordicFeature(f);
    if (onlyIndianReserves) {
      if (!indigenous) {
        return false;
      }
    } else if (!includeIndianReserves && indigenous) {
      return false;
    }
    const mrc = featureMrcCode(f);
    if (mrc && disabledMrcCodes.has(mrc)) {
      return false;
    }
    if (!municipalityMatchesTypemaxNamePrefixFilters(f)) {
      return false;
    }
    return true;
  });
}

function normalizeSearchText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function mrcMatchesSearch(mrc) {
  if (!mrcSearchQuery.trim()) {
    return true;
  }
  const q = normalizeSearchText(mrcSearchQuery);
  return (
    normalizeSearchText(mrc.nom).includes(q) ||
    normalizeSearchText(mrc.code).includes(q)
  );
}

function buildMrcCatalog(features) {
  const byCode = new Map();
  for (const f of features) {
    const code = featureMrcCode(f);
    const nom = String(f.properties?.mrcNom ?? "").trim();
    if (code && nom && !byCode.has(code)) {
      byCode.set(code, nom);
    }
  }
  return [...byCode.entries()]
    .map(([code, nom]) => ({ code, nom }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

function normalizeDisabledMrcPref(codes, allCodes) {
  const normalized = new Set();
  for (const code of codes) {
    const n = normalizeMrcCode(code);
    if (n && allCodes.has(n)) {
      normalized.add(n);
    }
  }
  return normalized;
}

function loadDisabledMrcPref(allCodes) {
  try {
    const raw = localStorage.getItem(DISABLED_MRC_PREF_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return normalizeDisabledMrcPref(parsed, allCodes);
  } catch {
    return new Set();
  }
}

function saveDisabledMrcPref() {
  try {
    localStorage.setItem(
      DISABLED_MRC_PREF_KEY,
      JSON.stringify([...disabledMrcCodes])
    );
  } catch {
    /* ignore */
  }
}

function updateMrcFilterSummary() {
  const el = document.getElementById("mrc-filter-summary");
  if (!el) {
    return;
  }
  const enabled = mrcCatalog.filter((m) => !disabledMrcCodes.has(m.code)).length;
  el.textContent = t("mrcSummary", {
    enabled,
    totalMrc: mrcCatalog.length,
    n: municipalities.length,
  });
}

function renderMrcChecklist() {
  const root = document.getElementById("mrc-checklist");
  if (!root) {
    return;
  }
  root.replaceChildren();
  for (const mrc of mrcCatalog) {
    if (!mrcMatchesSearch(mrc)) {
      continue;
    }
    const label = document.createElement("label");
    label.className = "mrc-checklist-item";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !disabledMrcCodes.has(mrc.code);
    input.addEventListener("change", () => {
      if (input.checked) {
        disabledMrcCodes.delete(mrc.code);
      } else {
        disabledMrcCodes.add(mrc.code);
      }
      saveDisabledMrcPref();
      applyPlayableFilters();
    });

    const span = document.createElement("span");
    span.textContent = mrc.nom;

    label.appendChild(input);
    label.appendChild(span);
    root.appendChild(label);
  }
}

function setAllMrcEnabled(enabled) {
  for (const mrc of mrcCatalog) {
    if (enabled) {
      disabledMrcCodes.delete(mrc.code);
    } else {
      disabledMrcCodes.add(mrc.code);
    }
  }
  saveDisabledMrcPref();
  renderMrcChecklist();
  applyPlayableFilters();
}

function setMrcEnabledForVisible(checked) {
  for (const mrc of mrcCatalog) {
    if (!mrcMatchesSearch(mrc)) {
      continue;
    }
    if (checked) {
      disabledMrcCodes.delete(mrc.code);
    } else {
      disabledMrcCodes.add(mrc.code);
    }
  }
  saveDisabledMrcPref();
  renderMrcChecklist();
  applyPlayableFilters();
}

function initMrcFilterUi() {
  mrcCatalog = buildMrcCatalog(allBaseFeatures);
  const allCodes = new Set(mrcCatalog.map((m) => m.code));
  disabledMrcCodes = loadDisabledMrcPref(allCodes);

  const search = document.getElementById("mrc-search");
  search?.addEventListener("input", () => {
    mrcSearchQuery = search.value;
    renderMrcChecklist();
  });

  document.getElementById("mrc-select-all")?.addEventListener("click", () => {
    setAllMrcEnabled(true);
  });

  document.getElementById("mrc-deselect-all")?.addEventListener("click", () => {
    setAllMrcEnabled(false);
  });

  renderMrcChecklist();
  updateMrcFilterSummary();
}

function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const remAfterDays = totalSec % 86400;
  const hours = Math.floor(remAfterDays / 3600);
  const minutes = Math.floor((remAfterDays % 3600) / 60);
  const seconds = remAfterDays % 60;
  const dd = String(days).padStart(2, "0");
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${dd}:${hh}:${mm}:${ss}`;
}

function getQuizElapsedMs() {
  if (quizElapsedFrozenMs != null) {
    return quizElapsedFrozenMs;
  }
  if (quizStartedAt == null) {
    return 0;
  }
  let elapsed = Date.now() - quizStartedAt - quizPausedTotalMs;
  if (quizPaused && quizPauseStartedAt != null) {
    elapsed -= Date.now() - quizPauseStartedAt;
  }
  return Math.max(0, elapsed);
}

function updateQuizTimerDisplay() {
  if (!quizTimerValueEl || quizStartedAt == null || quizFinished) {
    return;
  }
  quizTimerValueEl.textContent = formatElapsed(getQuizElapsedMs());
}

function startQuizTimer() {
  stopQuizTimerInterval();
  quizFinished = false;
  quizElapsedFrozenMs = null;
  quizPaused = false;
  quizPauseStartedAt = null;
  quizPausedTotalMs = 0;
  quizStartedAt = Date.now();
  updateQuizTimerDisplay();
  quizTimerInterval = setInterval(updateQuizTimerDisplay, 200);
}

function stopQuizTimerInterval() {
  if (quizTimerInterval) {
    clearInterval(quizTimerInterval);
    quizTimerInterval = null;
  }
}

function stopQuizTimer() {
  stopQuizTimerInterval();
}

function setQuizPaused(paused) {
  if (!gameStarted || quizFinished) {
    return;
  }
  if (paused === quizPaused) {
    return;
  }
  if (paused) {
    quizPaused = true;
    quizPauseStartedAt = Date.now();
    stopQuizTimerInterval();
    document.body.classList.add("quiz-paused");
    mapPauseOverlayEl?.classList.remove("hidden");
    pauseQuizEl?.classList.add("is-paused");
    if (pauseQuizEl) {
      pauseQuizEl.textContent = t("resume");
    }
    stopBlink();
  } else {
    if (quizPauseStartedAt != null) {
      quizPausedTotalMs += Date.now() - quizPauseStartedAt;
    }
    quizPauseStartedAt = null;
    quizPaused = false;
    document.body.classList.remove("quiz-paused");
    mapPauseOverlayEl?.classList.add("hidden");
    pauseQuizEl?.classList.remove("is-paused");
    if (pauseQuizEl) {
      pauseQuizEl.textContent = t("pause");
    }
    quizTimerInterval = setInterval(updateQuizTimerDisplay, 200);
    requestAnimationFrame(() => map.invalidateSize());
    if (
      gameMode === GAME_MODE_NAME &&
      target &&
      !solved &&
      !failedRound &&
      !quizFinished
    ) {
      startBlinkTarget();
    }
    if (gameMode === GAME_MODE_TYPEMAX && nameGuessInputEl) {
      requestAnimationFrame(() => nameGuessInputEl.focus());
    }
  }
  syncGameBarForMode();
}

function toggleQuizPause() {
  setQuizPaused(!quizPaused);
}

function activateGameLayout() {
  document.body.classList.add("game-active");
  gameBarEl?.classList.remove("hidden");
  requestAnimationFrame(() => {
    map.invalidateSize(true);
    setTimeout(() => map.invalidateSize(true), 150);
  });
}

function formatGameTargetPrompt(nom) {
  return `<strong>${nom}</strong>`;
}

function remainingMunicipalities(excludeCode) {
  const pool = getMapDisplayFeatures();
  return pool.filter((f) => {
    const code = f.properties.code;
    if (completedCodes.has(code)) {
      return false;
    }
    if (excludeCode && code === excludeCode) {
      return false;
    }
    return true;
  });
}

function compareMunicipalityDisplayName(a, b) {
  const locale = document.documentElement.lang === "en" ? "en" : "fr";
  return normalizeMunicipalityNameForMatch(a).localeCompare(
    normalizeMunicipalityNameForMatch(b),
    locale,
    { sensitivity: "base" }
  );
}

function isNameProgressGameMode() {
  return gameMode === GAME_MODE_NAME || gameMode === GAME_MODE_TYPEMAX;
}

function rebuildNameProgressSlots() {
  nameProgressSlots = municipalities
    .map((f) => ({
      code: String(f.properties.code),
      nom: String(f.properties.nom),
    }))
    .sort((a, b) => compareMunicipalityDisplayName(a.nom, b.nom));
}

function recordNamedCorrect(code) {
  if (!code || !isNameProgressGameMode()) {
    return;
  }
  const key = String(code);
  namedCorrectCodes.add(key);
  namedRevealedCodes.delete(key);
  renderNameProgressSidebar();
}

function recordNamedRevealed(code) {
  if (!code || gameMode !== GAME_MODE_NAME) {
    return;
  }
  const key = String(code);
  if (namedCorrectCodes.has(key)) {
    return;
  }
  namedRevealedCodes.add(key);
  renderNameProgressSidebar();
}

function isNameProgressListAvailable() {
  if (!isNameProgressGameMode() || !gameStarted) {
    return false;
  }
  if (!quizFinished) {
    return true;
  }
  return gameMode === GAME_MODE_TYPEMAX && typemaxGiveUpUsed;
}

function syncNameProgressUi() {
  const show = isNameProgressListAvailable();
  nameProgressToggleEl?.classList.toggle("hidden", !show);
  if (!show) {
    setNameProgressSidebarOpen(false);
  } else {
    rebuildNameProgressSlots();
    renderNameProgressSidebar();
  }
}

function setNameProgressSidebarOpen(open) {
  nameProgressSidebarOpen = open;
  document.body.classList.toggle("name-progress-sidebar-open", open);
  if (nameProgressSidebarEl) {
    nameProgressSidebarEl.classList.toggle("is-open", open);
    nameProgressSidebarEl.setAttribute("aria-hidden", open ? "false" : "true");
  }
  if (nameProgressToggleEl) {
    nameProgressToggleEl.setAttribute("aria-expanded", open ? "true" : "false");
  }
  requestAnimationFrame(() => map.invalidateSize(true));
}

function toggleNameProgressSidebar() {
  if (!isNameProgressListAvailable()) {
    return;
  }
  setNameProgressSidebarOpen(!nameProgressSidebarOpen);
}

function renderNameProgressSidebar() {
  if (!nameProgressListEl) {
    return;
  }
  nameProgressListEl.replaceChildren();
  const pendingLabel = t("nameProgressPendingSlot");
  let namedCount = 0;
  let remaining = 0;

  for (const slot of nameProgressSlots) {
    const correct = namedCorrectCodes.has(slot.code);
    const revealed = namedRevealedCodes.has(slot.code);
    const missedOnGiveUp = typemaxMissedCodes.has(slot.code);
    if (correct) {
      namedCount += 1;
    } else if (!revealed && !missedOnGiveUp) {
      remaining += 1;
    }

    const row = document.createElement("div");
    if (correct) {
      row.className =
        "name-progress-slot name-progress-slot--filled name-progress-slot--correct";
    } else if (revealed || missedOnGiveUp) {
      row.className =
        "name-progress-slot name-progress-slot--filled name-progress-slot--revealed";
    } else {
      row.className = "name-progress-slot name-progress-slot--pending";
    }
    row.setAttribute("role", "listitem");
    if (correct || revealed || missedOnGiveUp) {
      row.textContent = slot.nom;
    } else {
      row.setAttribute("aria-label", pendingLabel);
    }
    nameProgressListEl.appendChild(row);
  }

  const total = nameProgressSlots.length;

  if (nameProgressSummaryEl) {
    nameProgressSummaryEl.textContent = t("nameProgressSummary", {
      named: namedCount,
      total,
      remaining,
    });
  }
}

function markMunicipalityCompleted(code, dotStyle) {
  completedCodes.add(code);
  if (dotStyle) {
    completedMarkerStyles.set(code, dotStyle);
  }
}

function pruneCompletedForPlayableSet() {
  const playableCodes = new Set(municipalities.map((f) => f.properties.code));
  for (const code of completedCodes) {
    if (!playableCodes.has(code)) {
      completedCodes.delete(code);
      completedMarkerStyles.delete(code);
    }
  }
}

function formatQuizFinishedFeedback(elapsedMs) {
  const time = formatElapsed(elapsedMs);
  if (gameMode === GAME_MODE_NAME) {
    return t("nameModeQuizScore", {
      correct: nameModeNamedCorrectCount,
      total: nameModeQuizTotal,
      time,
    });
  }
  if (gameMode === GAME_MODE_TYPEMAX) {
    return t("typemaxQuizScore", {
      correct: nameModeNamedCorrectCount,
      total: nameModeQuizTotal,
      time,
    });
  }
  if (gameMode === GAME_MODE_MISC) {
    if (miscGiveUpUsed) {
      return t("miscQuizScoreGiveUp", {
        found: miscCorrectCount,
        total: nameModeQuizTotal,
        time,
      });
    }
    return t("miscQuizScore", {
      correct: miscCorrectCount,
      total: nameModeQuizTotal,
      time,
    });
  }
  if (gameMode === GAME_MODE_TEN) {
    return t("tenModeFinished", { time });
  }
  if (gameMode === GAME_MODE_LOCATE) {
    return t("locateQuizScore", {
      points: locateModeScore,
      time,
      n: completedCodes.size,
    });
  }
  return t("quizFinishedTime", {
    time,
    n: completedCodes.size,
  });
}

function updateQuizProgressFeedback() {
  const total = municipalities.length;
  if (total <= 0) {
    return;
  }
  if (gameMode === GAME_MODE_NAME) {
    setFeedback(
      t("nameModeProgress", {
        named: nameModeNamedCorrectCount,
        total: nameModeQuizTotal || total,
      }),
      ""
    );
    return;
  }
  if (gameMode === GAME_MODE_TYPEMAX) {
    setFeedback(
      t("typemaxProgress", {
        named: nameModeNamedCorrectCount,
        total: nameModeQuizTotal || total,
      }),
      ""
    );
    return;
  }
  if (gameMode === GAME_MODE_MISC) {
    setFeedback("", "");
    return;
  }
  if (gameMode === GAME_MODE_TEN) {
    setFeedback(
      t("tenModeProgress", {
        found: completedCodes.size,
        total: TEN_MODE_COUNT,
      }),
      ""
    );
    return;
  }
  if (total > 1) {
    setFeedback(`${completedCodes.size} / ${total}`, "");
  }
}

function finishQuiz() {
  quizFinished = true;
  setQuizPaused(false);
  stopQuizTimer();
  const elapsed = getQuizElapsedMs();
  target = null;
  queuedTarget = null;
  solved = false;
  failedRound = false;
  clearNextRoundTimer();
  stopBlink();
  if (quizTimerValueEl) {
    quizTimerValueEl.textContent = formatElapsed(elapsed);
  }
  if (gameMode === GAME_MODE_TYPEMAX && typemaxGiveUpUsed) {
    promptEl.innerHTML = `<strong>${t("quizFinished")}</strong>`;
  } else {
    promptEl.innerHTML = `<strong>${t("quizFinished")}</strong>`;
  }
  if (gameMode === GAME_MODE_MISC) {
    setFeedback("", "");
    syncGameBarForMode();
    return;
  }
  setFeedback(
    formatQuizFinishedFeedback(elapsed),
    gameMode === GAME_MODE_TYPEMAX && typemaxGiveUpUsed ? "success-red" : "success"
  );
  syncGameBarForMode();
}

function replayTenModeQuiz() {
  if (
    !gameStarted ||
    !quizFinished ||
    gameMode !== GAME_MODE_TEN ||
    municipalities.length < TEN_MODE_COUNT
  ) {
    return;
  }
  clearNextRoundTimer();
  stopBlink();
  disableFailedRoundClickRecovery();
  clearWrongReveals();
  clearCorrectNameLabel();
  target = null;
  queuedTarget = null;
  solved = false;
  failedRound = false;
  failedAnswerConfirmed = false;
  answerLabelActive = false;
  solvedStyles = null;
  strikes = 0;
  completedCodes.clear();
  completedMarkerStyles.clear();
  discoveredZoneStyles.clear();
  tenModeFeatures = shufflePickFeatures(municipalities, TEN_MODE_COUNT);
  setFeedback("", "");
  startQuizTimer();
  buildMapLayers();
  const tenLayer = L.geoJSON({
    type: "FeatureCollection",
    features: tenModeFeatures,
  });
  map.fitBounds(tenLayer.getBounds(), { padding: [48, 48] });
  pickTarget();
  syncGameBarForMode();
}

function updateStartQuizButton() {
  if (!startQuizEl) {
    return;
  }
  if (gameStarted) {
    startQuizEl.classList.add("is-hidden");
    startQuizEl.disabled = true;
    return;
  }
  stopQuizTimer();
  startQuizEl.classList.remove("is-hidden");
  const setupMode = getSelectedGameModeFromSetup();
  const tooFewForTen =
    setupMode === GAME_MODE_TEN && municipalities.length < TEN_MODE_COUNT;
  const tooFewForMisc =
    setupMode === GAME_MODE_MISC &&
    !miscSubmodeReady(municipalities, getSelectedMiscSubmodeFromSetup());
  startQuizEl.disabled =
    municipalities.length === 0 || tooFewForTen || tooFewForMisc;
}

function showSetupPrompt() {
  if (gameStarted) {
    return;
  }
  if (setupStepOptionsEl?.hidden) {
    return;
  }
  if (municipalities.length === 0) {
    setupPromptEl.textContent = t("noMunicipalitiesSelection");
    setSetupFeedback("", "");
    updateStartQuizButton();
    return;
  }
  if (isTenModeSelectedInSetup() && municipalities.length < TEN_MODE_COUNT) {
    setupPromptEl.innerHTML = t("tenModeNeedTen", { n: municipalities.length });
    setSetupFeedback(
      t("setupMunicipalityCount", { n: municipalities.length }),
      "error"
    );
    updateStartQuizButton();
    return;
  }
  if (getSelectedGameModeFromSetup() === GAME_MODE_MISC) {
    const submode = getSelectedMiscSubmodeFromSetup();
    if (submode === MISC_SUBMODE_TOP10_SAINTS) {
      setupPromptEl.textContent = "";
      setSetupFeedback("", "");
    } else {
      setupPromptEl.innerHTML = t("miscSetupPrompt");
      if (!miscSubmodeReady(municipalities, submode)) {
        const withArea = buildMiscLeaderboardEntries(
          municipalities,
          MISC_SUBMODE_TOP10_LARGEST_AREA
        ).length;
        setupPromptEl.innerHTML = t("miscNeedTenArea", { n: withArea });
        setSetupFeedback(
          t("setupMunicipalityCount", { n: municipalities.length }),
          "error"
        );
      } else {
        setSetupFeedback(
          t("setupMunicipalityCount", { n: municipalities.length }),
          ""
        );
      }
    }
    updateStartQuizButton();
    return;
  }
  setupPromptEl.innerHTML = t("setupChooseMrc");
  setSetupFeedback(
    t("setupMunicipalityCount", { n: municipalities.length }),
    ""
  );
  updateStartQuizButton();
}

function startQuiz() {
  if (gameStarted) {
    return;
  }
  const setupMode = getSelectedGameModeFromSetup();
  if (setupMode !== GAME_MODE_MISC && municipalities.length === 0) {
    return;
  }
  if (
    setupMode === GAME_MODE_MISC &&
    !miscSubmodeReady(municipalities, getSelectedMiscSubmodeFromSetup())
  ) {
    return;
  }
  gameMode = setupMode;
  tenModeFeatures = [];
  if (gameMode === GAME_MODE_TEN) {
    if (municipalities.length < TEN_MODE_COUNT) {
      return;
    }
    tenModeFeatures = shufflePickFeatures(municipalities, TEN_MODE_COUNT);
  }
  syncGameBarForMode();
  gameStarted = true;
  quizFinished = false;
  completedCodes.clear();
  completedMarkerStyles.clear();
  discoveredZoneStyles.clear();
  target = null;
  queuedTarget = null;
  solved = false;
  failedRound = false;
  failedAnswerConfirmed = false;
  answerLabelActive = false;
  strikes = 0;
  locateModeScore = 0;
  nameModeQuizTotal =
    gameMode === GAME_MODE_NAME || gameMode === GAME_MODE_TYPEMAX
      ? municipalities.length
      : 0;
  nameModeNamedCorrectCount = 0;
  namedCorrectCodes.clear();
  namedRevealedCodes.clear();
  typemaxMissedCodes.clear();
  nameProgressSlots = [];
  typemaxGiveUpUsed = false;
  miscGiveUpUsed = false;
  miscCorrectCount = 0;
  miscLeaderboardEntries = [];
  nameModeLeftShiftAlonePending = false;
  if (nameGuessInputEl) {
    nameGuessInputEl.disabled = false;
    refreshNameGuessInputAutofillKey();
  }
  updateStartQuizButton();
  activateGameLayout();
  startQuizTimer();
  buildMapLayers();
  if (gameMode === GAME_MODE_TEN && tenModeFeatures.length > 0) {
    const tenLayer = L.geoJSON({
      type: "FeatureCollection",
      features: tenModeFeatures,
    });
    map.fitBounds(tenLayer.getBounds(), { padding: [48, 48] });
  } else if (mapBoundaryFeaturePool.length > 0) {
    fitMapToBoundaryFeaturePool([24, 24]);
  }
  if (gameMode === GAME_MODE_TYPEMAX) {
    updateQuizProgressFeedback();
    resetMarkerStyles();
    syncGameBarForMode();
    if (nameGuessInputEl) {
      nameGuessInputEl.value = "";
      if (!quizPaused) {
        requestAnimationFrame(() => nameGuessInputEl.focus());
      }
    }
    return;
  }
  if (gameMode === GAME_MODE_MISC) {
    miscActiveSubmode = getSelectedMiscSubmodeFromSetup();
    miscLeaderboardEntries = buildMiscLeaderboardEntries(
      municipalities,
      miscActiveSubmode
    );
    nameModeQuizTotal = miscLeaderboardEntries.length;
    nameModeNamedCorrectCount = 0;
    updateQuizProgressFeedback();
    syncGameBarForMode();
    renderMiscLeaderboard();
    if (nameGuessInputEl) {
      nameGuessInputEl.value = "";
      if (!quizPaused) {
        requestAnimationFrame(() => nameGuessInputEl.focus());
      }
    }
    return;
  }
  pickTarget();
}

function pruneNamedCorrectForPlayableSet() {
  const playable = new Set(municipalities.map((f) => String(f.properties.code)));
  for (const code of namedCorrectCodes) {
    if (!playable.has(code)) {
      namedCorrectCodes.delete(code);
    }
  }
  for (const code of namedRevealedCodes) {
    if (!playable.has(code)) {
      namedRevealedCodes.delete(code);
    }
  }
  for (const code of typemaxMissedCodes) {
    if (!playable.has(code)) {
      typemaxMissedCodes.delete(code);
    }
  }
}

function syncTenModeFeaturesWithFilters() {
  if (!gameStarted || gameMode !== GAME_MODE_TEN || tenModeFeatures.length === 0) {
    return;
  }
  const playable = new Set(municipalities.map((f) => f.properties.code));
  tenModeFeatures = tenModeFeatures.filter((f) =>
    playable.has(f.properties.code)
  );
}

function applyPlayableFilters({ refitBounds = false } = {}) {
  municipalities = computePlayableMunicipalities();
  syncTenModeFeaturesWithFilters();
  pruneDiscoveredForPlayableSet();
  pruneCompletedForPlayableSet();
  pruneNamedCorrectForPlayableSet();
  buildMapLayers();
  updateMrcFilterSummary();
  if (!gameStarted) {
    renderTypemaxNameFilterChecklist();
  }

  if (!gameStarted) {
    if (refitBounds && mapBoundaryFeaturePool.length > 0) {
      fitMapToBoundaryFeaturePool([24, 24]);
    }
    showSetupPrompt();
    return;
  }

  if (refitBounds && boundaryLayer) {
    fitMapToBoundaryFeaturePool([24, 24]);
  }

  if (municipalities.length === 0) {
    clearNextRoundTimer();
    stopBlink();
    target = null;
    queuedTarget = null;
    setFeedback(t("noMunicipalitiesPlay"), "error");
    promptEl.textContent = t("adjustFilters");
    return;
  }

  if (gameStarted && isNameProgressGameMode()) {
    rebuildNameProgressSlots();
    renderNameProgressSidebar();
  }

  syncGameAfterPlayableSetChange();
}

function pruneDiscoveredForPlayableSet() {
  const playableCodes = new Set(
    municipalities.map((f) => f.properties.code)
  );
  for (const code of discoveredZoneStyles.keys()) {
    if (!playableCodes.has(code)) {
      discoveredZoneStyles.delete(code);
    }
  }
}

function removeMapLayers() {
  if (boundaryLayer) {
    map.removeLayer(boundaryLayer);
    boundaryLayer = null;
  }
  boundaryLayersByCode.clear();
  featureDotLatLngCache.clear();
  mapBoundaryFeaturePool = [];
  municipalityBoundsByCode.clear();
  if (markersLayer) {
    map.removeLayer(markersLayer);
    markersLayer = null;
  }
}

function featureGeographicBounds(feature) {
  const geom = feature?.geometry;
  if (!geom?.coordinates) {
    return null;
  }
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  function walk(node) {
    if (typeof node[0] === "number") {
      const lng = node[0];
      const lat = node[1];
      if (lng < west) {
        west = lng;
      }
      if (lng > east) {
        east = lng;
      }
      if (lat < south) {
        south = lat;
      }
      if (lat > north) {
        north = lat;
      }
      return;
    }
    for (const child of node) {
      walk(child);
    }
  }
  walk(geom.coordinates);
  if (!Number.isFinite(west)) {
    return null;
  }
  return { west, south, east, north };
}

function boundarySmoothFactorForZoom() {
  const z = map.getZoom();
  if (z <= 5) {
    return 10;
  }
  if (z <= 7) {
    return 6;
  }
  if (z <= 9) {
    return 4;
  }
  return 3;
}

function rebuildMunicipalityBoundsIndex(features) {
  municipalityBoundsByCode.clear();
  for (const feature of features) {
    const bounds = featureGeographicBounds(feature);
    if (bounds) {
      municipalityBoundsByCode.set(String(feature.properties.code), bounds);
    }
  }
  mapBoundaryFeaturePool = features;
}

function reapplyBoundaryLayerStyles() {
  for (const [code, zoneStyle] of discoveredZoneStyles) {
    const layer = boundaryLayersByCode.get(code);
    if (layer) {
      layer.setStyle(zoneStyle);
    }
  }
  if (target && !solved && !failedAnswerConfirmed) {
    showActiveTargetAsPending();
  }
}

function mountBoundaryGeoJson(features) {
  if (boundaryLayer) {
    map.removeLayer(boundaryLayer);
    boundaryLayer = null;
  }
  boundaryLayersByCode.clear();
  if (features.length === 0) {
    return;
  }
  boundaryLayer = L.geoJSON(
    { type: "FeatureCollection", features },
    {
      interactive: false,
      style: (feature) => boundaryStyleForFeature(feature),
      onEachFeature(feature, layer) {
        boundaryLayersByCode.set(feature.properties.code, layer);
      },
      ...vectorPathOpts,
      smoothFactor: boundarySmoothFactorForZoom(),
    }
  ).addTo(map);
  reapplyBoundaryLayerStyles();
}

function fitMapToBoundaryFeaturePool(padding = [24, 24]) {
  if (!mapBoundaryFeaturePool.length) {
    return;
  }
  const boundsLayer = L.geoJSON({
    type: "FeatureCollection",
    features: mapBoundaryFeaturePool,
  });
  map.fitBounds(boundsLayer.getBounds(), { padding });
}

function buildMapLayers() {
  removeMapLayers();
  if (gameStarted && gameMode === GAME_MODE_MISC) {
    mapBoundaryFeaturePool = [];
    return;
  }

  const features = getMapDisplayFeatures();
  mapBoundaryFeaturePool = features;
  rebuildMunicipalityBoundsIndex(features);
  mountBoundaryGeoJson(features);
  buildClickMarkers(features);
}

function syncGameAfterPlayableSetChange() {
  clearNextRoundTimer();
  stopBlink();
  clearWrongReveals();
  if (highlightLayer) {
    map.removeLayer(highlightLayer);
    highlightLayer = null;
  }

  if (gameMode === GAME_MODE_TYPEMAX) {
    resetMarkerStyles();
    updateQuizProgressFeedback();
    if (remainingMunicipalities().length === 0 && gameStarted && !quizFinished) {
      finishQuiz();
    }
    return;
  }

  const codeInSet = (code) =>
    getMapDisplayFeatures().some((f) => f.properties.code === code);

  if (!target || !codeInSet(target.properties.code)) {
    target = null;
    queuedTarget = null;
    solved = false;
    failedRound = false;
    failedAnswerConfirmed = false;
    pickTarget();
    return;
  }

  if (queuedTarget && !codeInSet(queuedTarget.properties.code)) {
    queuedTarget = null;
  }

  resetMarkerStyles();
  showActiveTargetAsPending();
  if (queuedTarget) {
    if (gameMode === GAME_MODE_LOCATE || gameMode === GAME_MODE_TEN) {
      showQueuedPromptPreview();
    }
  } else if (target) {
    if (gameMode === GAME_MODE_NAME) {
      promptEl.innerHTML = "";
    } else {
      promptEl.innerHTML = formatGameTargetPrompt(target.properties.nom);
    }
  }
}

function onIncludeIndianReservesChange() {
  if (onlyIndianReserves) {
    onlyIndianReserves = false;
    saveOnlyIndianReservesPref(false);
  }
  includeIndianReserves = Boolean(includeIndianReservesEl?.checked);
  saveIncludeIndianReservesPref(includeIndianReserves);
  syncReserveOptionCheckboxesUi();
  applyPlayableFilters();
}

function onOnlyIndianReservesChange() {
  onlyIndianReserves = Boolean(onlyIndianReservesEl?.checked);
  saveOnlyIndianReservesPref(onlyIndianReserves);
  if (onlyIndianReserves) {
    includeIndianReserves = false;
    saveIncludeIndianReservesPref(false);
  }
  syncReserveOptionCheckboxesUi();
  applyPlayableFilters();
}

function boundaryStyleForFeature(feature) {
  const code = feature.properties.code;
  if (target && !solved && !failedAnswerConfirmed && code === target.properties.code) {
    return baseStyle;
  }
  return discoveredZoneStyles.get(code) ?? baseStyle;
}

function syncMunicipalityLabelVisibility() {
  map.getContainer().classList.toggle(
    "map-show-municipality-labels",
    map.getZoom() >= MIN_ZOOM_FOR_MUNICIPALITY_LABELS
  );
}

function bindDiscoveredNameTooltip(code) {
  if (wrongReveals.has(code)) {
    return;
  }
  if (answerLabelActive && target?.properties.code === code) {
    return;
  }
  const feature = municipalities.find((f) => f.properties.code === code);
  const nom = feature?.properties?.nom;
  const marker = markersByCode.get(code);
  if (!nom || !marker) {
    return;
  }
  const existing = marker.getTooltip();
  if (existing?.options.className?.includes("discovered-name-label")) {
    return;
  }
  marker.unbindTooltip();
  marker
    .bindTooltip(nom, {
      permanent: true,
      direction: "top",
      className: "discovered-name-label",
      offset: [0, -8],
    })
    .openTooltip();
}

function reapplyDiscoveredNameTooltips() {
  for (const code of discoveredZoneStyles.keys()) {
    bindDiscoveredNameTooltip(code);
  }
  syncMunicipalityLabelVisibility();
}

function markMunicipalityDiscovered(code, zoneStyle) {
  discoveredZoneStyles.set(code, zoneStyle);
  const layer = boundaryLayersByCode.get(code);
  if (layer) {
    layer.setStyle(zoneStyle);
  }
  bindDiscoveredNameTooltip(code);
  syncMunicipalityLabelVisibility();
}

function showActiveTargetAsPending() {
  if (!target) return;
  const layer = boundaryLayersByCode.get(target.properties.code);
  if (layer) {
    layer.setStyle(baseStyle);
  }
}

function successPalette(wrongCount) {
  if (wrongCount === 0) {
    return {
      dot: {
        radius: 6,
        color: "#16a34a",
        fillColor: "#22c55e",
        fillOpacity: 1,
        weight: 2,
      },
      zone: {
        color: "#16a34a",
        weight: 3,
        fillColor: "#22c55e",
        fillOpacity: 0.55,
      },
      feedback: t("successPerfect"),
      feedbackClass: "success",
    };
  }
  if (wrongCount === 1) {
    return {
      dot: {
        radius: 6,
        color: "#ca8a04",
        fillColor: "#eab308",
        fillOpacity: 1,
        weight: 2,
      },
      zone: {
        color: "#ca8a04",
        weight: 3,
        fillColor: "#eab308",
        fillOpacity: 0.55,
      },
      feedback: t("successOneWrong"),
      feedbackClass: "success-yellow",
    };
  }
  if (wrongCount === 2) {
    return {
      dot: {
        radius: 6,
        color: "#ea580c",
        fillColor: "#f97316",
        fillOpacity: 1,
        weight: 2,
      },
      zone: {
        color: "#ea580c",
        weight: 3,
        fillColor: "#f97316",
        fillOpacity: 0.55,
      },
      feedback: t("successTwoWrong"),
      feedbackClass: "success-orange",
    };
  }
  return successPalette(2);
}

function setSetupFeedback(text, kind) {
  if (!setupFeedbackEl) {
    return;
  }
  setupFeedbackEl.textContent = text;
  setupFeedbackEl.className =
    "feedback setup-feedback" + (kind ? ` ${kind}` : "");
}

function setFeedback(text, kind) {
  if (!feedbackEl) {
    return;
  }
  feedbackEl.textContent = text;
  feedbackEl.className = "feedback game-feedback" + (kind ? ` ${kind}` : "");
}

/** Plus grande composante (polygone) d'une municipalité — évite un point « entre » les exclaves. */
function primaryPolygonFeature(feature) {
  const geom = feature?.geometry;
  if (!geom) {
    return feature;
  }
  if (geom.type === "Polygon") {
    return feature;
  }
  if (geom.type === "MultiPolygon") {
    let bestCoords = null;
    let bestArea = -1;
    for (const coords of geom.coordinates) {
      const part = {
        type: "Feature",
        properties: feature.properties,
        geometry: { type: "Polygon", coordinates: coords },
      };
      let area = 0;
      try {
        area = turf.area(part);
      } catch {
        continue;
      }
      if (area > bestArea) {
        bestArea = area;
        bestCoords = coords;
      }
    }
    if (bestCoords) {
      return {
        type: "Feature",
        properties: feature.properties,
        geometry: { type: "Polygon", coordinates: bestCoords },
      };
    }
  }
  return feature;
}

function isLngLatInsideFeature(lng, lat, feature) {
  try {
    return turf.booleanPointInPolygon([lng, lat], feature);
  } catch {
    return false;
  }
}

/** Point unique par municipalité, à l'intérieur de la zone (modes cliquer sur la carte). */
function featureDotLatLng(feature) {
  const code = feature?.properties?.code;
  if (code && featureDotLatLngCache.has(code)) {
    return featureDotLatLngCache.get(code);
  }

  const primary = primaryPolygonFeature(feature);
  let latLng = null;

  try {
    const com = turf.centerOfMass(primary);
    const lng = com.geometry.coordinates[0];
    const lat = com.geometry.coordinates[1];
    if (isLngLatInsideFeature(lng, lat, primary)) {
      latLng = [lat, lng];
    }
  } catch {
    /* suite */
  }

  if (!latLng) {
    try {
      const on = turf.pointOnFeature(primary);
      latLng = [on.geometry.coordinates[1], on.geometry.coordinates[0]];
    } catch {
      /* suite */
    }
  }

  if (!latLng) {
    const p = feature.properties;
    if (
      p?.centerLat != null &&
      p?.centerLng != null &&
      isLngLatInsideFeature(p.centerLng, p.centerLat, feature)
    ) {
      latLng = [p.centerLat, p.centerLng];
    }
  }

  if (!latLng) {
    try {
      const on = turf.pointOnFeature(feature);
      latLng = [on.geometry.coordinates[1], on.geometry.coordinates[0]];
    } catch {
      /* suite */
    }
  }

  if (!latLng) {
    const p = feature.properties;
    if (p?.centerLat != null && p?.centerLng != null) {
      latLng = [p.centerLat, p.centerLng];
    } else {
      try {
        const c = turf.center(primary);
        latLng = [c.geometry.coordinates[1], c.geometry.coordinates[0]];
      } catch {
        latLng = [46.5, -72.5];
      }
    }
  }

  if (code) {
    featureDotLatLngCache.set(code, latLng);
  }
  return latLng;
}

function featureCenter(feature) {
  return featureDotLatLng(feature);
}

function isZoomedNearTarget() {
  if (!target) {
    return false;
  }
  if (map.getZoom() < MIN_ZOOM_FOR_ANSWER_LABEL) {
    return false;
  }
  const [lat, lng] = featureCenter(target);
  return map.getBounds().contains([lat, lng]);
}

function updateCorrectNameLabel() {
  if (!target || !answerLabelActive) {
    return;
  }
  const marker = markersByCode.get(target.properties.code);
  if (!marker) {
    return;
  }

  if (isZoomedNearTarget()) {
    const labelClass = failedAnswerConfirmed
      ? "correct-name-label correct-name-label-fail"
      : "correct-name-label";
    if (!marker.getTooltip()) {
      marker.bindTooltip(target.properties.nom, {
        permanent: true,
        direction: "top",
        className: labelClass,
        offset: [0, -10],
      });
    }
    marker.openTooltip();
  } else if (marker.getTooltip()) {
    marker.unbindTooltip();
  }
}

function clearCorrectNameLabel() {
  if (!target) {
    return;
  }
  const marker = markersByCode.get(target.properties.code);
  marker?.unbindTooltip();
}

function isClickNearTarget(latlng, maxPx = FAILED_ROUND_CLICK_TOLERANCE_PX) {
  if (!target) {
    return false;
  }
  const [lat, lng] = featureCenter(target);
  const clickPt = map.latLngToContainerPoint(latlng);
  const targetPt = map.latLngToContainerPoint([lat, lng]);
  return (
    Math.hypot(clickPt.x - targetPt.x, clickPt.y - targetPt.y) <= maxPx
  );
}

function onFailedRoundMapClick(e) {
  if (!failedRound || failedAnswerConfirmed || !target) {
    return;
  }
  if (!isClickNearTarget(e.latlng)) {
    return;
  }
  pinFailedAnswer();
}

function enableFailedRoundClickRecovery() {
  if (failedRoundMapClickActive) {
    return;
  }
  map.on("click", onFailedRoundMapClick);
  failedRoundMapClickActive = true;
  const code = target?.properties?.code;
  const hit = code ? hitAreasByCode.get(code) : null;
  if (hit) {
    hit.setRadius(FAILED_ROUND_HIT_RADIUS);
    hit.bringToFront();
  }
}

function disableFailedRoundClickRecovery() {
  if (failedRoundMapClickActive) {
    map.off("click", onFailedRoundMapClick);
    failedRoundMapClickActive = false;
  }
  if (target) {
    syncHitAreasForGameMode();
  }
}

function pinFailedAnswer() {
  if (failedAnswerConfirmed) {
    return;
  }
  failedAnswerConfirmed = true;
  revealCurrentTargetAnswer();
}

function revealCurrentTargetAnswer() {
  if (!target) {
    return;
  }
  if (gameMode === GAME_MODE_LOCATE && failedRound) {
    awardLocateRoundPoints(MAX_STRIKES);
  }
  answerLabelActive = true;
  disableFailedRoundClickRecovery();
  stopBlink();

  const marker = markersByCode.get(target.properties.code);
  if (marker) {
    marker.setStyle(blinkDotStyle);
  }

  if (highlightLayer) {
    map.removeLayer(highlightLayer);
  }
  highlightLayer = null;
  markMunicipalityDiscovered(target.properties.code, blinkZoneStyle);
  markMunicipalityCompleted(target.properties.code, blinkDotStyle);

  if (gameMode === GAME_MODE_NAME) {
    recordNamedRevealed(target.properties.code);
  }

  setFeedback(t("correctAnswerConfirmed"), "error");
  updateCorrectNameLabel();
  resetMarkerStyles();
  scheduleNextRound();
}

function resetAllMarkersToDefault() {
  hoveredMarkerCode = null;
  for (const marker of markersByCode.values()) {
    marker.setStyle(dotStyle);
  }
}

function prepareNextTarget(excludeCode) {
  const pool = remainingMunicipalities(excludeCode);
  if (pool.length === 0) {
    queuedTarget = null;
    return;
  }
  queuedTarget = pool[Math.floor(Math.random() * pool.length)];
}

function clearNextRoundTimer() {
  if (nextRoundTimer) {
    clearTimeout(nextRoundTimer);
    nextRoundTimer = null;
  }
}

function showQueuedPromptPreview() {
  if (gameMode === GAME_MODE_NAME) {
    return;
  }
  if (!queuedTarget) {
    prepareNextTarget(target?.properties.code);
  }
  if (queuedTarget) {
    promptEl.innerHTML = formatGameTargetPrompt(queuedTarget.properties.nom);
  }
}

function scheduleNextRound() {
  clearNextRoundTimer();
  prepareNextTarget(target?.properties.code);
  showQueuedPromptPreview();
  nextRoundTimer = setTimeout(() => {
    nextRoundTimer = null;
    pickTarget();
  }, MAP_FEEDBACK_MS);
}

function isNameModeTargetCode(code) {
  return (
    gameMode === GAME_MODE_NAME &&
    target &&
    String(code) === String(target.properties.code)
  );
}

function getRestMarkerStyle(code) {
  if (gameMode === GAME_MODE_NAME) {
    if (!isNameModeTargetCode(code)) {
      return dotHiddenStyle;
    }
    if (completedMarkerStyles.has(code)) {
      return completedMarkerStyles.get(code);
    }
    if (solved && solvedStyles) {
      return solvedStyles.dot;
    }
    if (failedRound) {
      if (failedAnswerConfirmed) {
        return blinkDotStyle;
      }
      return blinkVisible ? blinkDotStyle : dotHiddenStyle;
    }
    return blinkVisible ? blinkDotStyle : dotHiddenStyle;
  }
  if (completedMarkerStyles.has(code)) {
    return completedMarkerStyles.get(code);
  }
  if (solved && target && code === target.properties.code && solvedStyles) {
    return solvedStyles.dot;
  }
  if (failedRound && target && code === target.properties.code) {
    if (failedAnswerConfirmed) {
      return blinkDotStyle;
    }
    return blinkVisible ? blinkDotStyle : dotStyle;
  }
  return dotStyle;
}

function syncHitAreasForGameMode() {
  for (const [code, hit] of hitAreasByCode.entries()) {
    if (gameMode === GAME_MODE_NAME) {
      hit.setRadius(isNameModeTargetCode(code) ? hitAreaStyle.radius : 0);
    } else if (failedRound && target && code === target.properties.code) {
      hit.setRadius(FAILED_ROUND_HIT_RADIUS);
    } else {
      hit.setRadius(hitAreaStyle.radius);
    }
  }
}

function isMarkerHoverAllowed(code) {
  if (gameMode === GAME_MODE_NAME) {
    return false;
  }
  if (solved) {
    return false;
  }
  if (failedRound) {
    return target && code === target.properties.code && !failedAnswerConfirmed;
  }
  return true;
}

function resetMarkerStyles() {
  hoveredMarkerCode = null;
  for (const [code, marker] of markersByCode.entries()) {
    marker.setStyle(getRestMarkerStyle(code));
  }
  syncHitAreasForGameMode();
}

function updateStrikesUi() {
  /* compteur retiré de l’interface */
}

function updateWrongRevealsPanel() {
  /* panneau retiré */
}

function revealWrong(_feature) {
  /* pas de libellé ni liste pour les mauvaises réponses */
}

function clearWrongReveals() {
  for (const code of wrongReveals.keys()) {
    const marker = markersByCode.get(code);
    if (marker) {
      marker.unbindTooltip();
    }
  }
  wrongReveals.clear();
  reapplyDiscoveredNameTooltips();
}

function stopBlink() {
  if (blinkInterval) {
    clearInterval(blinkInterval);
    blinkInterval = null;
  }
  if (blinkLayer) {
    map.removeLayer(blinkLayer);
    blinkLayer = null;
  }
  blinkVisible = false;
}

function startBlinkTarget() {
  stopBlink();
  const code = target.properties.code;
  const targetMarker = markersByCode.get(code);
  const nameModeDotOnly = gameMode === GAME_MODE_NAME;

  if (!nameModeDotOnly) {
    blinkLayer = L.geoJSON(target, {
      interactive: false,
      pane: "blinkPane",
      style: baseStyle,
      ...vectorPathOpts,
    }).addTo(map);
  }

  for (const [markerCode, marker] of markersByCode.entries()) {
    if (nameModeDotOnly && !isNameModeTargetCode(markerCode)) {
      marker.setStyle(dotHiddenStyle);
    }
  }
  syncHitAreasForGameMode();

  const offDotStyle = nameModeDotOnly ? dotHiddenStyle : dotStyle;
  if (targetMarker) {
    targetMarker.setStyle(blinkDotStyle);
  }
  blinkVisible = true;

  blinkInterval = setInterval(() => {
    blinkVisible = !blinkVisible;
    if (blinkLayer) {
      blinkLayer.setStyle(blinkVisible ? blinkZoneStyle : baseStyle);
    }
    if (targetMarker) {
      targetMarker.setStyle(blinkVisible ? blinkDotStyle : offDotStyle);
    }
  }, 450);
}

function failRound() {
  failedRound = true;
  clearWrongReveals();
  startBlinkTarget();
  setFeedback("", "");
  enableFailedRoundClickRecovery();
}

function pickTarget() {
  if (quizFinished) {
    return;
  }
  const displayPool = getMapDisplayFeatures();
  if (!displayPool.length) {
    return;
  }
  clearNextRoundTimer();

  if (!queuedTarget) {
    prepareNextTarget(target?.properties.code);
  }
  if (!queuedTarget) {
    finishQuiz();
    return;
  }
  target = queuedTarget;
  queuedTarget = null;

  solved = false;
  failedRound = false;
  failedAnswerConfirmed = false;
  answerLabelActive = false;
  solvedStyles = null;
  strikes = 0;
  updateStrikesUi();
  setFeedback("");
  updateQuizProgressFeedback();

  clearWrongReveals();
  clearCorrectNameLabel();
  disableFailedRoundClickRecovery();
  if (highlightLayer) {
    map.removeLayer(highlightLayer);
    highlightLayer = null;
  }
  resetMarkerStyles();
  prepareNextTarget(target.properties.code);
  syncGameBarForMode();

  if (gameMode === GAME_MODE_NAME) {
    promptEl.innerHTML = "";
    if (nameGuessInputEl) {
      nameGuessInputEl.value = "";
      if (!quizPaused) {
        requestAnimationFrame(() => nameGuessInputEl.focus());
      }
    }
    startBlinkTarget();
  } else {
    promptEl.innerHTML = formatGameTargetPrompt(target.properties.nom);
    stopBlink();
    showActiveTargetAsPending();
  }
}

function onMarkerClick(feature) {
  if (gameMode === GAME_MODE_TYPEMAX) {
    revealTypeMaxMunicipality(feature);
    return;
  }
  if (gameMode === GAME_MODE_NAME) {
    return;
  }
  if (gameMode !== GAME_MODE_LOCATE && gameMode !== GAME_MODE_TEN) {
    return;
  }
  if (!gameStarted || quizFinished || quizPaused) {
    return;
  }
  if (!target) return;

  const code = feature.properties.code;

  if (completedCodes.has(code)) {
    return;
  }

  if (failedRound) {
    if (String(code) !== String(target.properties.code)) {
      return;
    }
    pinFailedAnswer();
    return;
  }

  if (solved) {
    return;
  }

  if (code === target.properties.code) {
    completeTargetSuccess(strikes);
    return;
  }

  strikes += 1;
  updateStrikesUi();

  if (strikes >= MAX_STRIKES) {
    failRound();
  }
}

function buildClickMarkers(features) {
  markersLayer = L.layerGroup();
  markersByCode.clear();
  hitAreasByCode.clear();

  const seenCodes = new Set();
  for (const feature of features) {
    const code = feature.properties.code;
    if (seenCodes.has(code)) {
      continue;
    }
    seenCodes.add(code);
    const [lat, lng] = featureDotLatLng(feature);
    const marker = L.circleMarker([lat, lng], {
      ...dotStyle,
      className: "municipality-dot",
      pane: "quizMarkersPane",
      ...markerPathOpts,
    });

    const hitArea = L.circleMarker([lat, lng], {
      ...hitAreaStyle,
      pane: "quizMarkersPane",
      ...markerPathOpts,
    });

    hitArea.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      onMarkerClick(feature);
    });

    hitArea.on("mouseover", () => {
      if (!isMarkerHoverAllowed(code)) return;
      hoveredMarkerCode = code;
      marker.setStyle(dotHoverStyle);
    });

    hitArea.on("mouseout", () => {
      if (hoveredMarkerCode === code) {
        hoveredMarkerCode = null;
      }
      marker.setStyle(getRestMarkerStyle(code));
    });

    markersByCode.set(code, marker);
    hitAreasByCode.set(code, hitArea);
    markersLayer.addLayer(marker);
    markersLayer.addLayer(hitArea);
  }

  markersLayer.addTo(map);
  reapplyDiscoveredNameTooltips();
}

async function loadData() {
  const [geoRes, aliasRes] = await Promise.all([
    fetch(DATA_URL),
    fetch(MUNICIPALITY_ALIASES_URL),
  ]);
  if (!geoRes.ok) {
    throw new Error(`Impossible de charger ${DATA_URL}`);
  }
  const geojson = await geoRes.json();
  if (aliasRes.ok) {
    const aliasData = await aliasRes.json();
    municipalityAliasesByCode = new Map(
      Object.entries(aliasData.byCode || {}).map(([code, names]) => [
        String(code),
        Array.isArray(names) ? names.map(String) : [],
      ])
    );
  } else {
    municipalityAliasesByCode = new Map();
  }
  allBaseFeatures = geojson.features.filter(isBasePlayableFeature);
  rebuildMunicipalityMatchKeysCache();
  includeIndianReserves = loadIncludeIndianReservesPref();
  onlyIndianReserves = loadOnlyIndianReservesPref();
  if (onlyIndianReserves) {
    includeIndianReserves = false;
  }
  if (includeIndianReservesEl) {
    includeIndianReservesEl.addEventListener("change", onIncludeIndianReservesChange);
  }
  if (onlyIndianReservesEl) {
    onlyIndianReservesEl.addEventListener("change", onOnlyIndianReservesChange);
  }
  syncReserveOptionCheckboxesUi();

  initMrcFilterUi();
  initTypemaxNameFilterUi();
  initMiscQuizUi();
  configureNameGuessInputNoSuggestions();
  municipalities = computePlayableMunicipalities();
  buildMapLayers();
  updateMrcFilterSummary();

  fitMapToBoundaryFeaturePool([24, 24]);
  syncRoadOverlays();
  syncMunicipalityLabelVisibility();
  refreshMapAttribution();
  requestAnimationFrame(() => map.invalidateSize(true));

  startQuizEl?.addEventListener("click", startQuiz);
  nameGuessFormEl?.addEventListener("submit", handleNameGuessFormSubmit);
  nameGuessInputEl?.addEventListener("input", handleNameGuessInput);
  nameCenterTargetEl?.addEventListener("click", () => {
    centerMapOnActiveTarget();
    nameGuessInputEl?.focus({ preventScroll: true });
  });
  locateCenterTargetEl?.addEventListener("click", () => {
    centerMapOnActiveTarget();
  });
  document.addEventListener("keydown", handleGameBarKeyboard);
  document.addEventListener("keyup", handleGameBarKeyboard);
  nameGuessPassEl?.addEventListener("click", handleNameModePass);
  nameGuessRevealEl?.addEventListener("click", handleNameModeReveal);
  typemaxGiveUpEl?.addEventListener("click", handleTypeMaxGiveUp);
  pauseQuizEl?.addEventListener("click", toggleQuizPause);
  tenReplayQuizEl?.addEventListener("click", replayTenModeQuiz);
  nameProgressToggleEl?.addEventListener("click", toggleNameProgressSidebar);
  nameProgressCloseEl?.addEventListener("click", () =>
    setNameProgressSidebarOpen(false)
  );
  mapPauseOverlayEl?.addEventListener("click", toggleQuizPause);
  markSetupDataReady();
  showSetupPrompt();

  const mrcPanel = document.getElementById("mrc-filter-panel");
  if (mrcPanel && !mrcPanel.open) {
    mrcPanel.open = true;
  }
}

loadData().catch((err) => {
  console.error(err);
  if (setupLoadErrorEl) {
    setupLoadErrorEl.textContent = t("loadError");
    setupLoadErrorEl.classList.remove("hidden");
  }
});

bindSetupModePicker();
updateModeCardStaticLabels();

window.addEventListener("resize", () => {
  map.invalidateSize(true);
});

function syncPauseControlLabels() {
  if (pauseQuizEl) {
    pauseQuizEl.textContent = quizPaused ? t("resume") : t("pause");
  }
  const span = mapPauseOverlayEl?.querySelector("span");
  if (span) {
    span.textContent = t("pause");
  }
}

function onLanguageChanged() {
  refreshMapAttribution();
  updateMrcFilterSummary();
  renderTypemaxNameFilterChecklist();
  updateModeCardStaticLabels();
  if (!gameStarted) {
    updateSetupSelectedModeLabel();
    syncTypemaxNameFilterPanelVisibility();
    syncMiscSubmodePanelVisibility();
    syncMiscSaintsSetupUi();
    showSetupPrompt();
    return;
  }
  if (gameMode === GAME_MODE_MISC) {
    renderMiscLeaderboard();
  }
  syncPauseControlLabels();
  syncGameBarForMode();
  if (quizFinished) {
    promptEl.innerHTML = `<strong>${t("quizFinished")}</strong>`;
    if (gameMode === GAME_MODE_MISC) {
      setFeedback("", "");
    } else {
      const elapsed = getQuizElapsedMs();
      setFeedback(formatQuizFinishedFeedback(elapsed), "success");
    }
    return;
  }
  if (target) {
    if (gameMode === GAME_MODE_NAME || gameMode === GAME_MODE_TYPEMAX) {
      promptEl.innerHTML = "";
    } else {
      promptEl.innerHTML = formatGameTargetPrompt(target.properties.nom);
    }
    updateQuizProgressFeedback();
  }
  if (isNameProgressGameMode()) {
    rebuildNameProgressSlots();
    renderNameProgressSidebar();
  }
}
