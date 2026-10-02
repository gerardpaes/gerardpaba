import { db, doc, collection, getDoc, setDoc, deleteDoc, onSnapshot } from "./firebase-init.js";
import { MonthCalendar } from "./calendar.js";

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");

const titleEl = document.getElementById("event-title");
const subtitleEl = document.getElementById("event-subtitle");
const nameInput = document.getElementById("your-name");
const plusOneCheckbox = document.getElementById("plus-one");
const submitBtn = document.getElementById("submit-btn");
const removeBtn = document.getElementById("remove-btn");
const resultsAreaEl = document.getElementById("results-area");
const participantsChipsEl = document.getElementById("participants-chips");
const toastEl = document.getElementById("toast");

const pickCalendarEl = document.getElementById("pick-calendar");
const resultsCalendarEl = document.getElementById("results-calendar");

let eventData = null;
let responses = {}; // name -> { displayName, dates: [...], plusOne: bool }
let pickCal = null;
let resultsCal = null;

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function formatDateLong(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

function slugifyName(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("");
}

function restoreMyResponseIfAny() {
  const savedName = localStorage.getItem(`findadate:${eventId}:name`);
  if (savedName && responses[slugifyName(savedName)]) {
    nameInput.value = savedName;
    const r = responses[slugifyName(savedName)];
    pickCal.setSelected(r.dates || []);
    plusOneCheckbox.checked = !!r.plusOne;
  }
}

function renderResults() {
  const dates = (eventData.dates || []).slice().sort();
  const totalParticipants = Object.keys(responses).length;

  const counts = {};
  const tallyList = dates.map(iso => {
    let people = 0, withPlusOne = 0, names = [];
    Object.entries(responses).forEach(([, r]) => {
      if ((r.dates || []).includes(iso)) {
        people += 1;
        if (r.plusOne) withPlusOne += 1;
        names.push(r.displayName + (r.plusOne ? " (+1)" : ""));
      }
    });
    const total = people + withPlusOne;
    counts[iso] = total;
    return { iso, people, withPlusOne, total, names };
  });

  const maxTotal = Math.max(...Object.values(counts), 1);

  if (resultsCal) {
    resultsCal.setCounts(counts, maxTotal);
  }

  if (totalParticipants === 0) {
    resultsAreaEl.innerHTML = `<div class="empty-state">No responses yet.</div>`;
    return;
  }

  const ranked = tallyList.slice().sort((a, b) => b.total - a.total);

  let html = `<div class="rank-list">`;
  ranked.forEach((t, idx) => {
    const badgeClass = idx === 0 ? "gold" : idx === 1 ? "silver" : idx === 2 ? "bronze" : "";
    const pct = Math.round((t.total / maxTotal) * 100);
    html += `
      <div class="rank-card">
        <div class="rank-badge ${badgeClass}">${idx + 1}</div>
        <div class="rank-info">
          <div class="rank-date">${formatDateLong(t.iso)}</div>
          <div class="rank-who">${t.names.length ? t.names.join(", ") : "No one yet"}</div>
          <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="rank-total">${t.total}<span class="unit">attendees</span></div>
      </div>
    `;
  });
  html += `</div>`;
  resultsAreaEl.innerHTML = html;
}

function renderParticipants() {
  const entries = Object.values(responses);
  if (entries.length === 0) {
    participantsChipsEl.innerHTML = `<span class="meta">No one yet.</span>`;
    return;
  }
  participantsChipsEl.innerHTML = "";
  entries.forEach(r => {
    const chip = document.createElement("span");
    chip.className = "participant-chip";
    chip.innerHTML = `<span class="avatar">${initials(r.displayName)}</span>${r.displayName}${r.plusOne ? " +1" : ""}`;
    participantsChipsEl.appendChild(chip);
  });
}

function revealOnScroll() {
  document.querySelectorAll(".card").forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (top < window.innerHeight * 0.9) el.classList.add("visible");
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

    pickCal = new MonthCalendar(pickCalendarEl, {
      mode: "pick-from",
      candidateDates: eventData.dates || []
    });
    pickCal.render();

    resultsCal = new MonthCalendar(resultsCalendarEl, {
      mode: "display",
      candidateDates: eventData.dates || []
    });
    resultsCal.render();

    onSnapshot(collection(eventRef, "responses"), (snap2) => {
      responses = {};
      snap2.forEach(docSnap => { responses[docSnap.id] = docSnap.data(); });
      renderResults();
      renderParticipants();
      restoreMyResponseIfAny();
      requestAnimationFrame(revealOnScroll);
    });

    revealOnScroll();
  } catch (e) {
    console.error(e);
    titleEl.textContent = "Error loading event";
    subtitleEl.textContent = "Check your Firebase config in firebase-config.js.";
  }
}

submitBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const selectedDates = pickCal ? pickCal.getSelected() : [];
  if (!name) { showToast("Please enter your name"); return; }
  if (selectedDates.length === 0) { showToast("Select at least one available date"); return; }

  const id = slugifyName(name);
  try {
    const eventRef = doc(collection(db, "events"), eventId);
    await setDoc(doc(collection(eventRef, "responses"), id), {
      displayName: name,
      dates: selectedDates,
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
    if (pickCal) pickCal.setSelected([]);
    plusOneCheckbox.checked = false;
    showToast("Response removed.");
  } catch (e) {
    console.error(e);
    showToast("Error removing response.");
  }
});

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);

loadEvent();
