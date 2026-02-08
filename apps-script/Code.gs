const SHEET_NAMES = {
  people: "People",
  daily: "Daily"
};

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "summary";
  if (action === "summary") {
    const payload = JSON.stringify(buildSummary());
    const callback = e && e.parameter && e.parameter.callback;
    if (callback) {
      return ContentService.createTextOutput(`${callback}(${payload});`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
  }
  return jsonResponse({ error: "Unknown action" }, 400);
}

function doPost(e) {
  const action = (e && e.parameter && e.parameter.action) || "";
  const body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  if (action === "addEntry") {
    addDailyEntry(body);
    return jsonResponse({ ok: true });
  }
  if (action === "upsertPerson") {
    upsertPerson(body);
    return jsonResponse({ ok: true });
  }
  if (action === "deletePerson") {
    deletePerson(body.name);
    return jsonResponse({ ok: true });
  }
  return jsonResponse({ error: "Unknown action" }, 400);
}

function buildSummary() {
  const people = getPeople();
  const daily = getDailyEntries();
  const weekly = buildWeeklyLeaderboard(daily);
  const goals = buildGoalLeaderboard(people);

  const latestDaily = daily
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);

  return {
    people,
    weekly,
    goals,
    daily: latestDaily
  };
}

function getPeople() {
  const sheet = getOrCreateSheet(SHEET_NAMES.people, [
    "Name",
    "StartWeight",
    "CurrentWeight",
    "GoalWeight"
  ]);
  const rows = sheet.getDataRange().getValues();
  return rows
    .slice(1)
    .filter((row) => row[0])
    .map((row) => ({
      name: row[0],
      start: Number(row[1]),
      current: Number(row[2]),
      goal: Number(row[3])
    }));
}

function getDailyEntries() {
  const sheet = getOrCreateSheet(SHEET_NAMES.daily, [
    "Date",
    "Name",
    "Gym",
    "Sleep",
    "Water",
    "Notes"
  ]);
  const rows = sheet.getDataRange().getValues();
  return rows
    .slice(1)
    .filter((row) => row[0] && row[1])
    .map((row) => ({
      date: Utilities.formatDate(new Date(row[0]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      name: row[1],
      gym: Number(row[2]) || 0,
      sleep: Number(row[3]) || 0,
      water: Number(row[4]) || 0,
      notes: row[5] || ""
    }));
}

function buildWeeklyLeaderboard(daily) {
  const scores = {};
  daily.forEach((entry) => {
    const points = (entry.gym || 0) + (entry.sleep || 0) + (entry.water || 0);
    if (!scores[entry.name]) {
      scores[entry.name] = { name: entry.name, points: 0, gym: 0, sleep: 0, water: 0 };
    }
    scores[entry.name].points += points;
    scores[entry.name].gym += entry.gym || 0;
    scores[entry.name].sleep += entry.sleep || 0;
    scores[entry.name].water += entry.water || 0;
  });

  return Object.values(scores)
    .sort((a, b) => b.points - a.points)
    .map((row) => ({
      name: row.name,
      points: row.points,
      breakdown: `Gym ${row.gym} • Sleep ${row.sleep}`
    }));
}

function buildGoalLeaderboard(people) {
  return people
    .map((person) => {
      const distance = Math.abs(person.goal - person.current);
      const total = Math.abs(person.goal - person.start) || 1;
      const progress = Math.min(1, Math.max(0, 1 - distance / total));
      return {
        name: person.name,
        distance,
        progress,
        progressLabel: `${Math.round(progress * 100)}% toward goal`,
        distanceLabel: `${distance.toFixed(1)} lbs from goal`
      };
    })
    .sort((a, b) => a.distance - b.distance);
}

function addDailyEntry(entry) {
  if (!entry.name || !entry.date) return;
  const sheet = getOrCreateSheet(SHEET_NAMES.daily, [
    "Date",
    "Name",
    "Gym",
    "Sleep",
    "Water",
    "Notes"
  ]);
  sheet.appendRow([
    entry.date,
    entry.name,
    entry.gym ? 1 : 0,
    entry.sleep ? 1 : 0,
    entry.water ? 1 : 0,
    entry.notes || ""
  ]);
}

function upsertPerson(person) {
  if (!person.name) return;
  const sheet = getOrCreateSheet(SHEET_NAMES.people, [
    "Name",
    "StartWeight",
    "CurrentWeight",
    "GoalWeight"
  ]);
  const data = sheet.getDataRange().getValues();
  const name = person.name.trim();
  const idx = data.findIndex((row, i) => i > 0 && row[0] === name);
  const row = [name, person.start || 0, person.current || 0, person.goal || 0];
  if (idx === -1) {
    sheet.appendRow(row);
  } else {
    sheet.getRange(idx + 1, 1, 1, row.length).setValues([row]);
  }
}

function deletePerson(name) {
  if (!name) return;
  const sheet = getOrCreateSheet(SHEET_NAMES.people, [
    "Name",
    "StartWeight",
    "CurrentWeight",
    "GoalWeight"
  ]);
  const data = sheet.getDataRange().getValues();
  const idx = data.findIndex((row, i) => i > 0 && row[0] === name);
  if (idx > 0) {
    sheet.deleteRow(idx + 1);
  }
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function jsonResponse(data, code) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  if (code) {
    output.setResponseCode(code);
  }
  return output;
}
