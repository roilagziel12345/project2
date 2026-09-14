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
    flexContainer: rootDocument.getElementById("flex-container"),
    targetLayer: rootDocument.getElementById("target-layer"),
    podCount: rootDocument.getElementById("pod-count"),
    modal: rootDocument.getElementById("completion-modal"),
    restartButton: rootDocument.getElementById("restart-button")
  };

  let currentLevelIndex = 0;
  let currentValues = {};

  function formatStage(number) {
    return String(number).padStart(2, "0");
  }

  function renderNodes(count, itemWidth = 64) {
    elements.flexContainer.replaceChildren();
    elements.targetLayer.replaceChildren();

    for (let index = 0; index < count; index += 1) {
      const target = rootDocument.createElement("span");
      target.className = "target";
      target.style.width = `${itemWidth}px`;
      target.style.flexBasis = `${itemWidth}px`;
      elements.targetLayer.appendChild(target);

      const node = rootDocument.createElement("span");
      node.className = "container-node";
      node.textContent = `CTR-${formatStage(index + 1)}`;
      node.style.width = `${itemWidth}px`;
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
  }

  function showFeedback(success) {
    const wrapper = rootDocument.createElement("div");
    wrapper.className = `feedback-message ${success ? "feedback-success" : "feedback-error"}`;

    const message = rootDocument.createElement("p");
    message.textContent = success
      ? "✓ הפריסה תקינה. כל הקונטיינרים הגיעו ליעד."
      : "הפריסה עדיין לא תואמת ליעדים. בדוק את הצירים והמרווחים.";
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
    const correct = isSolution(level, currentValues);
    elements.flexContainer.classList.remove("is-correct", "is-error");

    if (correct) {
      elements.flexContainer.classList.add("is-correct");
      showFeedback(true);
      return true;
    }

    void elements.flexContainer.offsetWidth;
    elements.flexContainer.classList.add("is-error");
    showFeedback(false);
    return false;
  }

  function nextLevel() {
    if (currentLevelIndex === LEVELS.length - 1) {
      elements.modal.hidden = false;
      elements.restartButton.focus();
      return;
    }

    currentLevelIndex += 1;
    renderLevel();
    rootDocument.querySelector(".mission-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderLevel() {
    const level = LEVELS[currentLevelIndex];
    const stage = currentLevelIndex + 1;
    const completion = Math.round((stage / LEVELS.length) * 100);

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

    renderNodes(level.itemCount, level.itemWidth);
    applyFlexStyles(elements.targetLayer, { ...BASE_VALUES, ...level.solution });
    resetLevel();
  }

  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    checkAnswer();
  });

  elements.resetButton.addEventListener("click", resetLevel);
  elements.restartButton.addEventListener("click", () => {
    currentLevelIndex = 0;
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
    getCurrentValues: () => ({ ...currentValues })
  };
}

const GAME_TEST_API = Object.freeze({
  LEVELS,
  BASE_VALUES,
  PROPERTY_OPTIONS,
  getResetValues,
  isSolution,
  createGame
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = GAME_TEST_API;
}

if (typeof document !== "undefined") {
  createGame(document);
}
