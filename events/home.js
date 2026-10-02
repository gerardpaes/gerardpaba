import { db, collection, doc, setDoc, onSnapshot, serverTimestamp, query, orderBy } from "./firebase-init.js";
import { MonthCalendar } from "./calendar.js";
import { t, applyTranslations, initLanguageSwitcher, getLocale } from "./i18n.js";

document.documentElement.lang = getLocale();
applyTranslations();
initLanguageSwitcher();

const eventNameInput = document.getElementById("event-name");
const createBtn = document.getElementById("create-event-btn");
const eventListEl = document.getElementById("event-list");
const toastEl = document.getElementById("toast");
const calendarContainer = document.getElementById("create-calendar");
const filtersEl = document.getElementById("dashboard-filters");

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

const createCal = new MonthCalendar(calendarContainer, { mode: "pick-any" });
createCal.render();

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";
}

createBtn.addEventListener("click", async () => {
  const name = eventNameInput.value.trim();
  const dates = createCal.getAvailable();
  if (!name) { showToast(t("toast_need_event_name")); return; }
  if (dates.length === 0) { showToast(t("toast_need_candidate_date")); return; }

  const id = slugify(name) + "-" + Date.now().toString(36).slice(-4);

  try {
    await setDoc(doc(collection(db, "events"), id), {
      name,
      dates: dates.slice().sort(),
      createdAt: serverTimestamp(),
      approvedDate: null
    });
    showToast(t("toast_event_created"));
    window.location.href = `event.html?id=${encodeURIComponent(id)}`;
  } catch (e) {
    console.error(e);
    showToast(t("toast_create_error"));
  }
});

function revealOnScroll() {
  document.querySelectorAll(".card, .event-row").forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (top < window.innerHeight * 0.9) el.classList.add("visible");
  });
}

let allEvents = [];
let activeFilter = "all";

function renderFilters() {
  const filters = [
    { key: "all", label: { ca: "Tots", es: "Todos", en: "All" } },
    { key: "voting", label: { ca: "En votació", es: "En votación", en: "Voting" } },
    { key: "approved", label: { ca: "Confirmats", es: "Confirmados", en: "Approved" } }
  ];
  const lang = getLocale();
  filtersEl.innerHTML = filters.map(f => `
    <button type="button" class="filter-chip ${activeFilter === f.key ? "active" : ""}" data-filter="${f.key}">${f.label[lang]}</button>
  `).join("");
  filtersEl.querySelectorAll(".filter-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter;
      renderFilters();
      renderEventList();
    });
  });
}

function renderEventList() {
  const filtered = allEvents.filter(ev => {
    if (activeFilter === "voting") return !ev.data.approvedDate;
    if (activeFilter === "approved") return !!ev.data.approvedDate;
    return true;
  });

  if (filtered.length === 0) {
    eventListEl.innerHTML = `<div class="empty-state">${t("no_events")}</div>`;
    return;
  }

  eventListEl.innerHTML = "";
  filtered.forEach(({ id, data }) => {
    const row = document.createElement("a");
    row.href = `event.html?id=${encodeURIComponent(id)}`;
    row.className = "event-row";
    const isApproved = !!data.approvedDate;
    row.innerHTML = `
      <div class="ev-icon">${isApproved ? "✅" : "🎉"}</div>
      <div class="ev-info">
        <div class="ev-name">${data.name}</div>
        <div class="ev-meta">${t("ev_dates_count", (data.dates || []).length)}</div>
        <div class="ev-status">
          <span class="status-badge ${isApproved ? "approved" : "voting"}">${isApproved ? t("ev_status_approved") : t("ev_status_voting")}</span>
        </div>
      </div>
      <span class="chip">${t("chip_open")}</span>
    `;
    eventListEl.appendChild(row);
  });
  requestAnimationFrame(revealOnScroll);
}

function loadEvents() {
  const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    allEvents = [];
    snap.forEach(docSnap => allEvents.push({ id: docSnap.id, data: docSnap.data() }));
    renderEventList();
  }, (err) => {
    console.error(err);
    eventListEl.innerHTML = `<div class="empty-state">Could not load events. Check your Firebase config in firebase-config.js.</div>`;
  });
}

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);

renderFilters();
loadEvents();
