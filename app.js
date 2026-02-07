const CONFIG = {
  WEB_APP_URL: "https://script.google.com/macros/s/AKfycbzgqHm15huKI5FZEERoO905Z7O6F1vsz9g8tHZVs2KpINPMCa1AeP2Nmk3JDDD2eTqE/exec"
};

const state = {
  people: [],
  weekly: [],
  goals: [],
  daily: []
};

const els = {
  statusPill: document.getElementById("status-pill"),
  refreshBtn: document.getElementById("refresh-btn"),
  checkinForm: document.getElementById("checkin-form"),
  checkinName: document.getElementById("checkin-name"),
  checkinDate: document.getElementById("checkin-date"),
  checkinGym: document.getElementById("checkin-gym"),
  checkinSleep: document.getElementById("checkin-sleep"),
  checkinWater: document.getElementById("checkin-water"),
  checkinNotes: document.getElementById("checkin-notes"),
  weeklyList: document.getElementById("weekly-list"),
  goalList: document.getElementById("goal-list"),
  dailyList: document.getElementById("daily-list"),
  peopleList: document.getElementById("people-list"),
  personForm: document.getElementById("person-form"),
  personName: document.getElementById("person-name"),
  personStart: document.getElementById("person-start"),
  personCurrent: document.getElementById("person-current"),
  personGoal: document.getElementById("person-goal")
};

function setStatus(ok, text) {
  els.statusPill.textContent = text;
  els.statusPill.classList.toggle("ok", ok);
}

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().slice(0, 10);
}

async function apiCall(action, payload = {}) {
  if (!CONFIG.WEB_APP_URL || CONFIG.WEB_APP_URL.includes("PASTE_")) {
    throw new Error("Missing Apps Script URL");
  }

  const url = `${CONFIG.WEB_APP_URL}?action=${encodeURIComponent(action)}`;
  if (action === "summary") {
    const res = await fetch(url);
    return res.json();
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.json();
}

function renderList(container, items) {
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = '<div class="hint">No data yet.</div>';
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "list-item";
    row.innerHTML = item;
    container.appendChild(row);
  });
}

function renderAll() {
  renderList(
    els.weeklyList,
    state.weekly.map(
      (row, idx) =>
        `<div><strong>#${idx + 1} ${row.name}</strong><div class="meta">${row.points} pts</div></div><div class="meta">${row.breakdown}</div>`
    )
  );

  renderList(
    els.goalList,
    state.goals.map(
      (row, idx) =>
        `<div><strong>#${idx + 1} ${row.name}</strong><div class="meta">${row.progressLabel}</div></div><div class="meta">${row.distanceLabel}</div>`
    )
  );

  renderList(
    els.dailyList,
    state.daily.map(
      (row) =>
        `<div><strong>${row.name}</strong><div class="meta">${row.date}</div></div><div class="meta">Gym ${row.gym} • Sleep ${row.sleep}</div>`
    )
  );

  els.checkinName.innerHTML = "";
  state.people.forEach((person) => {
    const option = document.createElement("option");
    option.value = person.name;
    option.textContent = person.name;
    els.checkinName.appendChild(option);
  });

  renderList(
    els.peopleList,
    state.people.map(
      (person) =>
        `<div><strong>${person.name}</strong><div class="meta">Start ${person.start} • Current ${person.current} • Goal ${person.goal}</div></div><button class="btn ghost" data-name="${person.name}">Remove</button>`
    )
  );

  [...els.peopleList.querySelectorAll("button[data-name]")].forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm(`Remove ${btn.dataset.name}?`)) return;
      await apiCall("deletePerson", { name: btn.dataset.name });
      await refresh();
    });
  });
}

async function refresh() {
  try {
    setStatus(false, "Refreshing...");
    const data = await apiCall("summary");
    state.people = data.people || [];
    state.weekly = data.weekly || [];
    state.goals = data.goals || [];
    state.daily = data.daily || [];
    renderAll();
    setStatus(true, "Connected");
  } catch (err) {
    console.error(err);
    setStatus(false, "Not connected");
  }
}

els.refreshBtn.addEventListener("click", refresh);

els.checkinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    name: els.checkinName.value,
    date: els.checkinDate.value,
    gym: els.checkinGym.checked ? 1 : 0,
    sleep: els.checkinSleep.checked ? 1 : 0,
    water: els.checkinWater.checked ? 1 : 0,
    notes: els.checkinNotes.value.trim()
  };
  await apiCall("addEntry", payload);
  els.checkinGym.checked = false;
  els.checkinSleep.checked = false;
  els.checkinWater.checked = false;
  els.checkinNotes.value = "";
  await refresh();
});

els.personForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    name: els.personName.value.trim(),
    start: Number(els.personStart.value),
    current: Number(els.personCurrent.value),
    goal: Number(els.personGoal.value)
  };
  await apiCall("upsertPerson", payload);
  els.personName.value = "";
  els.personStart.value = "";
  els.personCurrent.value = "";
  els.personGoal.value = "";
  await refresh();
});

els.checkinDate.value = todayISO();
refresh();
