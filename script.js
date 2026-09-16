"use strict";

const PROPERTY_OPTIONS = Object.freeze({
  display: ["block", "flex"],
  flexDirection: ["row", "row-reverse", "column", "column-reverse"],
  justifyContent: ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"],
  alignItems: ["stretch", "flex-start", "center", "flex-end"],
  flexWrap: ["nowrap", "wrap", "wrap-reverse"],
  alignContent: ["stretch", "flex-start", "center", "flex-end", "space-between", "space-around"]
});

const PROPERTY_LABELS = Object.freeze({
  display: "display",
  flexDirection: "flex-direction",
  justifyContent: "justify-content",
  alignItems: "align-items",
  flexWrap: "flex-wrap",
  alignContent: "align-content"
});

const BASE_VALUES = Object.freeze({
  display: "block",
  flexDirection: "row",
  justifyContent: "flex-start",
  alignItems: "stretch",
  flexWrap: "nowrap",
  alignContent: "stretch"
});

const STORAGE_KEY = "container-orchestrator-progress-v1";

const LEVELS = Object.freeze([
  {
    code: "MISSION_01",
    title: "אתחול הקלאסטר",
    difficulty: "בסיסי",
    instruction: "הפעל את מנוע Flexbox ורכז את שלושת הקונטיינרים בדיוק בלב שרת הפרודקשן.",
    tip: "justify-content פועל על הציר הראשי, ו-align-items על הציר הנגדי.",
    itemCount: 3,
    controls: ["display", "justifyContent", "alignItems"],
    solution: { display: "flex", justifyContent: "center", alignItems: "center" }
  },
  {
    code: "MISSION_02",
    title: "עמוד שדרה אנכי",
    difficulty: "מתקדם",
    instruction: "העבר את ארבעת השירותים לציר אנכי, פזר אותם מקצה לקצה ומרכז אותם לרוחב השרת.",
    tip: "שינוי flex-direction מסובב גם את הציר שעליו פועל justify-content.",
    itemCount: 4,
    controls: ["display", "flexDirection", "justifyContent", "alignItems"],
    solution: { display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center" }
  },
  {
    code: "MISSION_03",
    title: "Failover הפוך",
    difficulty: "מתקדם",
    instruction: "הפוך את סדר ארבעת ה־replicas, מקם אותם בתחתית ופזר סביב כל אחד מרווח מאוזן.",
    tip: "row-reverse הופך את כיוון הזרימה מבלי לשנות את סדר האלמנטים ב־DOM.",
    itemCount: 4,
    controls: ["display", "flexDirection", "justifyContent", "alignItems"],
    solution: { display: "flex", flexDirection: "row-reverse", justifyContent: "space-around", alignItems: "flex-end" }
  },
  {
    code: "MISSION_04",
    title: "Burst Capacity",
    difficulty: "מומחה",
    instruction: "אפשר לשבעה קונטיינרים לגלוש לשורה נוספת, פרוס כל שורה לרוחב והפרד את השורות בין קצות השרת.",
    tip: "אחרי flex-wrap, המאפיין align-content שולט במרווח שבין שורות מרובות.",
    itemCount: 7,
    itemWidth: 124,
    controls: ["display", "flexWrap", "justifyContent", "alignContent"],
    solution: { display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignContent: "space-between" }
  },
  {
    code: "MISSION_05",
    title: "Rollback מבוקר",
    difficulty: "מומחה",
    instruction: "בנה תור אנכי הפוך, הצמד אותו לצד הימני של השרת ומרכז אותו לאורך ציר הפריסה.",
    tip: "ב־column-reverse הציר הראשי אנכי והסדר שלו הפוך; align-items נשאר על הציר האופקי.",
    itemCount: 3,
    controls: ["display", "flexDirection", "justifyContent", "alignItems"],
    solution: { display: "flex", flexDirection: "column-reverse", justifyContent: "center", alignItems: "flex-end" }
  },
  {
    code: "MISSION_06",
    title: "Zero-Downtime Deploy",
    difficulty: "סופי",
    instruction: "סיים את הפריסה: הפוך את סדר חמשת ה־pods, פזר אותם מקצה לקצה ומרכז אותם אנכית — ללא גלישה.",
    tip: "שלב כמה מאפיינים יחד; כל בחירה חייבת להתאים לטופולוגיית היעד.",
    itemCount: 5,
    controls: ["display", "flexDirection", "justifyContent", "alignItems", "flexWrap"],
    solution: { display: "flex", flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", flexWrap: "nowrap" }
  }
]);

function calculateLevelScore(attemptCount) {
  if (!Number.isInteger(attemptCount) || attemptCount < 1) return 0;
  return Math.max(40, 110 - attemptCount * 10);
}

function createInitialProgress(levelCount = LEVELS.length) {
  return {
    currentLevelIndex: 0,
    unlockedLevelIndex: 0,
    completedLevels: [],
    attempts: Array(levelCount).fill(0),
    score: 0
  };
}

function normalizeProgress(value, levelCount = LEVELS.length) {
  const initial = createInitialProgress(levelCount);
  if (!value || typeof value !== "object") return initial;

  const completedLevels = [...new Set(
    (Array.isArray(value.completedLevels) ? value.completedLevels : [])
      .filter((index) => Number.isInteger(index) && index >= 0 && index < levelCount)
  )].sort((first, second) => first - second);
  const inferredUnlocked = completedLevels.length
    ? Math.min(levelCount - 1, Math.max(...completedLevels) + 1)
    : 0;
  const requestedUnlocked = Number.isInteger(value.unlockedLevelIndex)
    ? value.unlockedLevelIndex
    : 0;
  const unlockedLevelIndex = Math.min(
    levelCount - 1,
    Math.max(0, requestedUnlocked, inferredUnlocked)
  );
  const requestedCurrent = Number.isInteger(value.currentLevelIndex)
    ? value.currentLevelIndex
    : 0;
  const currentLevelIndex = Math.min(unlockedLevelIndex, Math.max(0, requestedCurrent));
  const attempts = Array.from({ length: levelCount }, (_, index) => {
    const attempt = Array.isArray(value.attempts) ? value.attempts[index] : 0;
    return Number.isInteger(attempt) && attempt >= 0 ? attempt : 0;
  });
  const score = Number.isInteger(value.score) && value.score >= 0 ? value.score : 0;

  return { currentLevelIndex, unlockedLevelIndex, completedLevels, attempts, score };
}

function readSavedProgress(storage, levelCount = LEVELS.length) {
  if (!storage) return createInitialProgress(levelCount);
  try {
    const saved = storage.getItem(STORAGE_KEY);
    return normalizeProgress(saved ? JSON.parse(saved) : null, levelCount);
  } catch {
    return createInitialProgress(levelCount);
  }
}

function writeSavedProgress(storage, progress) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

function getResetValues(level) {
  return level.controls.reduce((values, property) => {
    values[property] = BASE_VALUES[property];
    return values;
  }, {});
}

function isSolution(level, values) {
  return Object.entries(level.solution).every(([property, expected]) => values[property] === expected);
}

function applyFlexStyles(element, values) {
  Object.keys(PROPERTY_OPTIONS).forEach((property) => {
    element.style[property] = values[property] || BASE_VALUES[property];
  });
}

function createGame(rootDocument) {
  const elements = {
    headerStage: rootDocument.getElementById("header-stage"),
    stageStatus: rootDocument.getElementById("stage-status"),
    progressPercent: rootDocument.getElementById("progress-percent"),
    progressFill: rootDocument.getElementById("progress-fill"),
    difficulty: rootDocument.getElementById("difficulty-badge"),
    missionCode: rootDocument.getElementById("mission-code"),
    title: rootDocument.getElementById("mission-title"),
    instruction: rootDocument.getElementById("mission-instruction"),
    tip: rootDocument.getElementById("mission-tip"),
    controls: rootDocument.getElementById("controls"),
    form: rootDocument.getElementById("controls-form"),
    resetButton: rootDocument.getElementById("reset-button"),
    feedback: rootDocument.getElementById("feedback"),
    scoreValue: rootDocument.getElementById("score-value"),
    attemptValue: rootDocument.getElementById("attempt-value"),
    completedValue: rootDocument.getElementById("completed-value"),
    levelButtons: rootDocument.getElementById("level-buttons"),
    flexContainer: rootDocument.getElementById("flex-container"),
    targetLayer: rootDocument.getElementById("target-layer"),
    podCount: rootDocument.getElementById("pod-count"),
    modal: rootDocument.getElementById("completion-modal"),
    finalScore: rootDocument.getElementById("final-score"),
    restartButton: rootDocument.getElementById("restart-button")
  };

  let storage = null;
  try {
    storage = rootDocument.defaultView?.localStorage || null;
  } catch {
    storage = null;
  }

  const savedProgress = readSavedProgress(storage);
  let currentLevelIndex = savedProgress.currentLevelIndex;
  let unlockedLevelIndex = savedProgress.unlockedLevelIndex;
  let completedLevels = new Set(savedProgress.completedLevels);
  let attempts = savedProgress.attempts;
  let score = savedProgress.score;
  let currentValues = {};

  function formatStage(number) {
    return String(number).padStart(2, "0");
  }

  function renderNodes(level) {
    elements.flexContainer.replaceChildren();
    elements.targetLayer.replaceChildren();

    const itemWidth = level.itemWidth || 64;

    for (let index = 0; index < level.itemCount; index += 1) {
      const itemHeight = level.itemHeights?.[index] || 64;
      const target = rootDocument.createElement("span");
      target.className = "target";
      target.style.width = `${itemWidth}px`;
      target.style.height = `${itemHeight}px`;
      target.style.flexBasis = `${itemWidth}px`;
      elements.targetLayer.appendChild(target);

      const node = rootDocument.createElement("span");
      node.className = "container-node";
      node.textContent = `CTR-${formatStage(index + 1)}`;
      node.style.width = `${itemWidth}px`;
      node.style.height = `${itemHeight}px`;
      node.style.flexBasis = `${itemWidth}px`;
      elements.flexContainer.appendChild(node);
    }
  }

  function renderControls(level) {
    elements.controls.replaceChildren();

    level.controls.forEach((property, index) => {
      const row = rootDocument.createElement("label");
      row.className = "control-row";

      const number = rootDocument.createElement("span");
      number.className = "line-number";
      number.textContent = formatStage(index + 2);

      const propertyName = rootDocument.createElement("span");
      propertyName.className = "control-property";
      propertyName.textContent = PROPERTY_LABELS[property];

      const colon = rootDocument.createElement("span");
      colon.className = "control-colon";
      colon.textContent = ":";

      const select = rootDocument.createElement("select");
      select.className = "control-select";
      select.name = property;
      select.setAttribute("aria-label", PROPERTY_LABELS[property]);

      PROPERTY_OPTIONS[property].forEach((value) => {
        const option = rootDocument.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

      select.value = currentValues[property];
      select.addEventListener("change", () => {
        currentValues[property] = select.value;
        applyFlexStyles(elements.flexContainer, currentValues);
        clearResultState();
      });

      const semicolon = rootDocument.createElement("span");
      semicolon.className = "control-semicolon";
      semicolon.textContent = ";";

      row.append(number, propertyName, colon, select, semicolon);
      elements.controls.appendChild(row);
    });
  }

  function getProgressSnapshot() {
    return {
      currentLevelIndex,
      unlockedLevelIndex,
      completedLevels: [...completedLevels],
      attempts: [...attempts],
      score
    };
  }

  function saveProgress() {
    writeSavedProgress(storage, getProgressSnapshot());
  }

  function updatePerformance() {
    const completion = Math.round((completedLevels.size / LEVELS.length) * 100);
    elements.scoreValue.textContent = String(score).padStart(3, "0");
    elements.attemptValue.textContent = String(attempts[currentLevelIndex]);
    elements.completedValue.textContent = `${completedLevels.size}/${LEVELS.length}`;
    elements.progressPercent.textContent = `${completion}% הושלמו`;
    elements.progressFill.style.width = `${completion}%`;
  }

  function openLevel(levelIndex) {
    const isAvailable = levelIndex <= unlockedLevelIndex || completedLevels.has(levelIndex);
    if (!isAvailable || levelIndex === currentLevelIndex) return;

    currentLevelIndex = levelIndex;
    saveProgress();
    renderLevel();
    rootDocument.querySelector(".mission-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderLevelNavigation() {
    elements.levelButtons.replaceChildren();

    LEVELS.forEach((level, index) => {
      const button = rootDocument.createElement("button");
      const isComplete = completedLevels.has(index);
      const isCurrent = index === currentLevelIndex;
      const isAvailable = index <= unlockedLevelIndex || isComplete;

      button.type = "button";
      button.className = "level-button";
      button.textContent = isComplete && !isCurrent ? `✓${index + 1}` : String(index + 1);
      button.disabled = !isAvailable;
      button.classList.toggle("is-complete", isComplete);
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-current", isCurrent ? "step" : "false");
      button.setAttribute(
        "aria-label",
        `שלב ${index + 1}: ${isCurrent ? "שלב נוכחי" : isComplete ? "הושלם" : isAvailable ? "פתוח" : "נעול"}`
      );
      button.addEventListener("click", () => openLevel(index));
      elements.levelButtons.appendChild(button);
    });
  }

  function clearResultState() {
    elements.feedback.replaceChildren();
    elements.flexContainer.classList.remove("is-correct", "is-error");
  }

  function resetLevel() {
    const level = LEVELS[currentLevelIndex];
    currentValues = getResetValues(level);
    renderControls(level);
    applyFlexStyles(elements.flexContainer, currentValues);
    clearResultState();
    updatePerformance();
  }

  function showFeedback(success, pointsEarned = 0) {
    const wrapper = rootDocument.createElement("div");
    wrapper.className = `feedback-message ${success ? "feedback-success" : "feedback-error"}`;

    const message = rootDocument.createElement("p");
    message.textContent = success
      ? pointsEarned > 0
        ? `✓ הפריסה תקינה. נוספו ${pointsEarned} נקודות.`
        : "✓ הפריסה תקינה. שלב זה כבר הושלם."
      : `הפריסה עדיין לא תואמת ליעדים. זה היה ניסיון ${attempts[currentLevelIndex]}; אפשר להמשיך לנסות.`;
    wrapper.appendChild(message);

    if (success) {
      const nextButton = rootDocument.createElement("button");
      nextButton.type = "button";
      nextButton.className = "feedback-next";
      nextButton.textContent = currentLevelIndex === LEVELS.length - 1 ? "סיום" : "לשלב הבא ←";
      nextButton.addEventListener("click", nextLevel);
      wrapper.appendChild(nextButton);
    }

    elements.feedback.replaceChildren(wrapper);
  }

  function checkAnswer() {
    const level = LEVELS[currentLevelIndex];
    attempts[currentLevelIndex] += 1;
    const correct = isSolution(level, currentValues);
    elements.flexContainer.classList.remove("is-correct", "is-error");

    if (correct) {
      let pointsEarned = 0;
      if (!completedLevels.has(currentLevelIndex)) {
        pointsEarned = calculateLevelScore(attempts[currentLevelIndex]);
        score += pointsEarned;
        completedLevels.add(currentLevelIndex);
        unlockedLevelIndex = Math.min(
          LEVELS.length - 1,
          Math.max(unlockedLevelIndex, currentLevelIndex + 1)
        );
      }
      elements.flexContainer.classList.add("is-correct");
      saveProgress();
      updatePerformance();
      renderLevelNavigation();
      showFeedback(true, pointsEarned);
      return true;
    }

    void elements.flexContainer.offsetWidth;
    elements.flexContainer.classList.add("is-error");
    saveProgress();
    updatePerformance();
    showFeedback(false);
    return false;
  }

  function nextLevel() {
    if (currentLevelIndex === LEVELS.length - 1) {
      elements.finalScore.textContent = String(score).padStart(3, "0");
      elements.modal.hidden = false;
      elements.restartButton.focus();
      return;
    }

    currentLevelIndex += 1;
    unlockedLevelIndex = Math.max(unlockedLevelIndex, currentLevelIndex);
    saveProgress();
    renderLevel();
    rootDocument.querySelector(".mission-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderLevel() {
    const level = LEVELS[currentLevelIndex];
    const stage = currentLevelIndex + 1;
    const completion = Math.round((completedLevels.size / LEVELS.length) * 100);

    elements.headerStage.textContent = `MISSION ${formatStage(stage)} / ${formatStage(LEVELS.length)}`;
    elements.stageStatus.textContent = `שלב ${stage} מתוך ${LEVELS.length}`;
    elements.progressPercent.textContent = `${completion}% הושלמו`;
    elements.progressFill.style.width = `${completion}%`;
    elements.difficulty.textContent = level.difficulty;
    elements.missionCode.textContent = level.code;
    elements.title.textContent = level.title;
    elements.instruction.textContent = level.instruction;
    elements.tip.textContent = level.tip;
    elements.podCount.textContent = `PODS ${formatStage(level.itemCount)}`;

    renderNodes(level);
    applyFlexStyles(elements.targetLayer, { ...BASE_VALUES, ...level.solution });
    resetLevel();
    renderLevelNavigation();
  }

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    checkAnswer();
  });

  elements.resetButton.addEventListener("click", resetLevel);
  elements.restartButton.addEventListener("click", () => {
    currentLevelIndex = 0;
    unlockedLevelIndex = 0;
    completedLevels = new Set();
    attempts = Array(LEVELS.length).fill(0);
    score = 0;
    try {
      storage?.removeItem(STORAGE_KEY);
    } catch {
      // The game still restarts when storage is unavailable.
    }
    elements.modal.hidden = true;
    renderLevel();
  });

  rootDocument.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      checkAnswer();
    }

    if (event.key === "Escape" && !elements.modal.hidden) {
      elements.modal.hidden = true;
    }
  });

  renderLevel();

  return {
    checkAnswer,
    resetLevel,
    getCurrentLevelIndex: () => currentLevelIndex,
    getCurrentValues: () => ({ ...currentValues }),
    getProgress: getProgressSnapshot
  };
}

const GAME_TEST_API = Object.freeze({
  LEVELS,
  BASE_VALUES,
  PROPERTY_OPTIONS,
  STORAGE_KEY,
  getResetValues,
  isSolution,
  calculateLevelScore,
  createInitialProgress,
  normalizeProgress,
  readSavedProgress,
  writeSavedProgress,
  createGame
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = GAME_TEST_API;
}

if (typeof document !== "undefined") {
  createGame(document);
}
