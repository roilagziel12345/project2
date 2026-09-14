"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = __dirname;
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const css = fs.readFileSync(path.join(projectRoot, "style.css"), "utf8");
const source = fs.readFileSync(path.join(projectRoot, "script.js"), "utf8");
const { LEVELS, BASE_VALUES, getResetValues, isSolution } = require("./script.js");

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("קיימים בדיוק 6 שלבים", () => {
  assert.equal(LEVELS.length, 6);
  assert.deepEqual(LEVELS.map((level) => level.code), [
    "MISSION_01", "MISSION_02", "MISSION_03", "MISSION_04", "MISSION_05", "MISSION_06"
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

test("הפרויקט אינו משתמש ב-CSS Grid או בספריות חיצוניות", () => {
  assert.doesNotMatch(css, /display\s*:\s*(inline-)?grid|grid-template/i);
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:\/\//i);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:\/\//i);
});

test("קובץ ה-JavaScript תקין תחבירית", () => {
  assert.doesNotThrow(() => new Function(source));
});

console.log("\nכל 10 הבדיקות עברו בהצלחה.");
