import { db, doc, collection, getDoc, setDoc, deleteDoc, onSnapshot } from "./firebase-init.js";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");

const titleEl = document.getElementById("event-title");
const subtitleEl = document.getElementById("event-subtitle");
const dateGridEl = document.getElementById("date-grid");
const nameInput = document.getElementById("your-name");
const plusOneCheckbox = document.getElementById("plus-one");
const submitBtn = document.getElementById("submit-btn");
const removeBtn = document.getElementById("remove-btn");
const resultsAreaEl = document.getElementById("results-area");
const participantsChipsEl = document.getElementById("participants-chips");
const toastEl = document.getElementById("toast");

let eventData = null;
let selectedDates = new Set();
let responses = {}; // name -> { dates: [...], plusOne: bool }

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
  };
}

function slugifyName(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function renderDateGrid() {
  dateGridEl.innerHTML = "";
  (eventData.dates || []).slice().sort().forEach(iso => {
    const { weekday, label } = formatDate(iso);
    const pill = document.createElement("div");
    pill.className = "date-pill" + (selectedDates.has(iso) ? " selected" : "");
    pill.innerHTML = `<div class="d-weekday">${weekday}</div><div class="d-date">${label}</div>`;
    pill.addEventListener("click", () => {
      if (selectedDates.has(iso)) selectedDates.delete(iso);
      else selectedDates.add(iso);
      renderDateGrid();
    });
    dateGridEl.appendChild(pill);
  });
}

function restoreMyResponseIfAny() {
  const savedName = localStorage.getItem(`findadate:${eventId}:name`);
  if (savedName && responses[slugifyName(savedName)]) {
    nameInput.value = savedName;
    const r = responses[slugifyName(savedName)];
    selectedDates = new Set(r.dates || []);
    plusOneCheckbox.checked = !!r.plusOne;
    renderDateGrid();
  }
}

function renderResults() {
  const dates = (eventData.dates || []).slice().sort();
  if (Object.keys(responses).length === 0) {
    resultsAreaEl.innerHTML = `<div class="empty-state">No responses yet.</div>`;
    return;
  }

  const tally = dates.map(iso => {
    let people = 0, withPlusOne = 0, names = [];
    Object.entries(responses).forEach(([, r]) => {
      if ((r.dates || []).includes(iso)) {
        people += 1;
        if (r.plusOne) withPlusOne += 1;
        names.push(r.displayName + (r.plusOne ? " (+1)" : ""));
      }
    });
    const total = people + withPlusOne;
    return { iso, people, withPlusOne, total, names };
  });

  tally.sort((a, b) => b.total - a.total);
  const maxTotal = Math.max(...tally.map(t => t.total), 1);

  let html = `<table class="results-table"><thead><tr>
    <th>Rank</th><th>Date</th><th>Available</th><th></th>
  </tr></thead><tbody>`;

  tally.forEach((t, idx) => {
    const { label, weekday } = formatDate(t.iso);
    const badgeClass = idx === 0 ? "gold" : idx === 1 ? "silver" : idx === 2 ? "bronze" : "";
    const pct = Math.round((t.total / maxTotal) * 100);
    html += `<tr>
      <td><span class="rank-badge ${badgeClass}">${idx + 1}</span></td>
      <td><strong>${weekday} ${label}</strong></td>
      <td>
        ${t.total} attendee(s) ${t.withPlusOne ? `<span class="meta">(incl. ${t.withPlusOne} +1)</span>` : ""}
        <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="who-list">${t.names.length ? t.names.join(", ") : "No one yet"}</div>
      </td>
      <td></td>
    </tr>`;
  });

  html += `</tbody></table>`;
  resultsAreaEl.innerHTML = html;
}

function renderParticipants() {
  const names = Object.values(responses);
  if (names.length === 0) {
    participantsChipsEl.innerHTML = `<span class="meta">No one yet.</span>`;
    return;
  }
  participantsChipsEl.innerHTML = "";
  names.forEach(r => {
    const chip = document.createElement("span");
    chip.className = "participant-chip";
    chip.innerHTML = `${r.displayName}${r.plusOne ? " +1" : ""}`;
    participantsChipsEl.appendChild(chip);
  });
}

async function loadEvent() {
  if (!eventId) {
    titleEl.textContent = "Event not found";
    subtitleEl.textContent = "No event id was provided in the link.";
    return;
  }
  try {
    const eventRef = doc(collection(db, "events"), eventId);
    const snap = await getDoc(eventRef);
    if (!snap.exists()) {
      titleEl.textContent = "Event not found";
      subtitleEl.textContent = "This event may have been deleted.";
      return;
    }
    eventData = snap.data();
    titleEl.textContent = eventData.name;
    subtitleEl.textContent = `${(eventData.dates || []).length} candidate date(s). Pick the ones that work for you below.`;
    renderDateGrid();

    onSnapshot(collection(eventRef, "responses"), (snap2) => {
      responses = {};
      snap2.forEach(docSnap => {
        responses[docSnap.id] = docSnap.data();
      });
      renderResults();
      renderParticipants();
      restoreMyResponseIfAny();
    });
  } catch (e) {
    console.error(e);
    titleEl.textContent = "Error loading event";
    subtitleEl.textContent = "Check your Firebase config in firebase-config.js.";
  }
}

submitBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  if (!name) { showToast("Please enter your name"); return; }
  if (selectedDates.size === 0) { showToast("Select at least one available date"); return; }

  const id = slugifyName(name);
  try {
    const eventRef = doc(collection(db, "events"), eventId);
    await setDoc(doc(collection(eventRef, "responses"), id), {
      displayName: name,
      dates: Array.from(selectedDates),
      plusOne: plusOneCheckbox.checked
    });
    localStorage.setItem(`findadate:${eventId}:name`, name);
    showToast("Saved! Thanks " + name + " 🎉");
  } catch (e) {
    console.error(e);
    showToast("Error saving. Check Firebase config.");
  }
});

removeBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  if (!name) { showToast("Enter the name you used before"); return; }
  const id = slugifyName(name);
  try {
    const eventRef = doc(collection(db, "events"), eventId);
    await deleteDoc(doc(collection(eventRef, "responses"), id));
    localStorage.removeItem(`findadate:${eventId}:name`);
    selectedDates = new Set();
    plusOneCheckbox.checked = false;
    renderDateGrid();
    showToast("Response removed.");
  } catch (e) {
    console.error(e);
    showToast("Error removing response.");
  }
});

loadEvent();
