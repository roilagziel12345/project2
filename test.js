"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = __dirname;
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const css = fs.readFileSync(path.join(projectRoot, "style.css"), "utf8");
const source = fs.readFileSync(path.join(projectRoot, "script.js"), "utf8");
const {
  LEVELS,
  BASE_VALUES,
  STORAGE_KEY,
  getResetValues,
  isSolution,
  calculateLevelScore,
  createInitialProgress,
  normalizeProgress,
  readSavedProgress,
  writeSavedProgress
} = require("./script.js");

let testCount = 0;

function test(name, callback) {
  try {
    callback();
    testCount += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("קיימים 8 שלבים מלאים ומגוונים", () => {
  assert.equal(LEVELS.length, 8);
  assert.deepEqual(LEVELS.map((level) => level.code), [
    "MISSION_01", "MISSION_02", "MISSION_03", "MISSION_04",
    "MISSION_05", "MISSION_06", "MISSION_07", "MISSION_08"
  ]);
});

test("לוח המשחק קבוע בגודל 660×400 פיקסלים", () => {
  assert.match(html, /id="cluster-board"/);
  const boardRule = css.match(/\.cluster-board\s*\{([^}]+)\}/s);
  assert.ok(boardRule, "חסר חוק CSS עבור לוח המשחק");
  assert.match(boardRule[1], /width:\s*660px/);
  assert.match(boardRule[1], /height:\s*400px/);
  assert.match(boardRule[1], /flex:\s*0\s+0\s+auto/);
});

test("כל הפתרונות המוגדרים עוברים את בודק השלב", () => {
  LEVELS.forEach((level) => {
    assert.equal(isSolution(level, { ...BASE_VALUES, ...level.solution }), true, `${level.code} נכשל`);
  });
});

test("ערך שגוי אינו עובר את בודק השלב", () => {
  LEVELS.forEach((level) => {
    const wrong = { ...BASE_VALUES, ...level.solution, display: "block" };
    assert.equal(isSolution(level, wrong), false, `${level.code} קיבל פריסה שגויה`);
  });
});

test("איפוס מחזיר את ערכי ברירת המחדל ללא שיתוף state", () => {
  LEVELS.forEach((level) => {
    const firstReset = getResetValues(level);
    assert.deepEqual(firstReset, Object.fromEntries(level.controls.map((property) => [property, BASE_VALUES[property]])));
    firstReset[level.controls[0]] = "mutated";
    const secondReset = getResetValues(level);
    assert.equal(secondReset[level.controls[0]], BASE_VALUES[level.controls[0]]);
    assert.equal(isSolution(level, secondReset), false);
  });
  assert.match(source, /resetButton\.addEventListener\("click", resetLevel\)/);
});

test("שלב 4 מחייב flex-wrap ושבעה קונטיינרים", () => {
  const wrapLevel = LEVELS[3];
  assert.equal(wrapLevel.itemCount, 7);
  assert.ok(wrapLevel.itemCount * wrapLevel.itemWidth > 602, "הפריטים חייבים לחרוג מרוחב התוכן וליצור שורה נוספת");
  assert.equal(wrapLevel.solution.flexWrap, "wrap");
  assert.ok(wrapLevel.controls.includes("flexWrap"));
});

test("לפחות שלושה שלבים דורשים יותר ממאפיין Flexbox אחד מעבר ל-display", () => {
  const combinedLevels = LEVELS.filter((level) => {
    return Object.entries(level.solution)
      .filter(([property]) => property !== "display")
      .filter(([property, value]) => value !== BASE_VALUES[property])
      .length > 1;
  });
  assert.ok(combinedLevels.length >= 3, `נמצאו רק ${combinedLevels.length} שלבים מורכבים`);
});

test("כל מאפייני החובה מופיעים בפתרונות ובממשק", () => {
  ["display", "flexDirection", "justifyContent", "alignItems", "flexWrap"].forEach((property) => {
    assert.ok(LEVELS.some((level) => Object.hasOwn(level.solution, property)), `חסר ${property}`);
    assert.ok(LEVELS.some((level) => level.controls.includes(property)), `אין בקרה עבור ${property}`);
  });
});

test("השלבים הנוספים משלבים wrap-reverse ויישור פריטים בגבהים שונים", () => {
  const reverseWrapLevel = LEVELS[6];
  const adaptiveLevel = LEVELS[7];
  assert.equal(reverseWrapLevel.solution.flexWrap, "wrap-reverse");
  assert.equal(reverseWrapLevel.solution.flexDirection, "row-reverse");
  assert.ok(Object.keys(reverseWrapLevel.solution).length >= 5);
  assert.equal(adaptiveLevel.solution.flexWrap, "wrap");
  assert.equal(adaptiveLevel.solution.alignItems, "center");
  assert.equal(adaptiveLevel.solution.alignContent, "center");
  assert.equal(adaptiveLevel.itemHeights.length, adaptiveLevel.itemCount);
  assert.ok(new Set(adaptiveLevel.itemHeights).size > 3);
});

test("הניקוד יורד לפי מספר הניסיונות אך נשאר חיובי", () => {
  assert.equal(calculateLevelScore(1), 100);
  assert.equal(calculateLevelScore(2), 90);
  assert.equal(calculateLevelScore(7), 40);
  assert.equal(calculateLevelScore(100), 40);
  assert.equal(calculateLevelScore(0), 0);
});

test("נתוני התקדמות שמורים עוברים נרמול בטוח", () => {
  const normalized = normalizeProgress({
    currentLevelIndex: 99,
    unlockedLevelIndex: 2,
    completedLevels: [0, 1, 1, 99, -1],
    attempts: [1, 2, -4, "3"],
    score: 190
  });
  assert.equal(normalized.currentLevelIndex, 2);
  assert.equal(normalized.unlockedLevelIndex, 2);
  assert.deepEqual(normalized.completedLevels, [0, 1]);
  assert.deepEqual(normalized.attempts.slice(0, 4), [1, 2, 0, 0]);
  assert.equal(normalized.score, 190);
});

test("שמירת התקדמות פועלת ללא ספרייה חיצונית", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value)
  };
  const progress = createInitialProgress();
  progress.currentLevelIndex = 1;
  progress.unlockedLevelIndex = 1;
  progress.completedLevels = [0];
  progress.attempts[0] = 2;
  progress.score = 90;
  assert.equal(writeSavedProgress(storage, progress), true);
  assert.ok(values.has(STORAGE_KEY));
  assert.deepEqual(readSavedProgress(storage), progress);
});

test("ממשק המשחק כולל ניקוד, ניסיונות וניווט בין שלבים", () => {
  ["score-value", "attempt-value", "completed-value", "level-buttons", "final-score"].forEach((id) => {
    assert.match(html, new RegExp(`id=["']${id}["']`), `חסר הרכיב ${id}`);
  });
  assert.match(source, /localStorage/);
  assert.match(source, /renderLevelNavigation/);
});

test("הפרויקט אינו משתמש ב-CSS Grid או בספריות חיצוניות", () => {
  assert.doesNotMatch(css, /display\s*:\s*(inline-)?grid|grid-template/i);
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:\/\//i);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:\/\//i);
});

test("קובץ ה-JavaScript תקין תחבירית", () => {
  assert.doesNotThrow(() => new Function(source));
});

console.log(`\nכל ${testCount} הבדיקות עברו בהצלחה.`);
