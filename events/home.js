import { db, collection, doc, setDoc, updateDoc, onSnapshot, serverTimestamp, query, orderBy, getDocs } from "./firebase-init.js";
import { t, applyTranslations, initLanguageSwitcher, getLocale } from "./i18n.js";
import { googleCalendarUrl, downloadIcs } from "./calendar-export.js";

document.documentElement.lang = getLocale();
applyTranslations();
initLanguageSwitcher();

const eventNameInput = document.getElementById("event-name");
const createBtn = document.getElementById("create-event-btn");
const eventListEl = document.getElementById("event-list");
const upcomingGridEl = document.getElementById("upcoming-grid");
const toastEl = document.getElementById("toast");
const openModalBtn = document.getElementById("open-create-modal");
const closeModalBtn = document.getElementById("close-create-modal");
const modalOverlay = document.getElementById("create-modal-overlay");

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

openModalBtn.addEventListener("click", () => modalOverlay.classList.add("open"));
closeModalBtn.addEventListener("click", () => modalOverlay.classList.remove("open"));
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove("open"); });

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";
}

createBtn.addEventListener("click", async () => {
  const name = eventNameInput.value.trim();
  if (!name) { showToast(t("toast_need_event_name")); return; }

  const id = slugify(name) + "-" + Date.now().toString(36).slice(-4);

  try {
    await setDoc(doc(collection(db, "events"), id), {
      name,
      createdAt: serverTimestamp(),
      approvedDate: null,
      approvedTime: null
    });
    showToast(t("toast_event_created"));
    window.location.href = `event.html?id=${encodeURIComponent(id)}`;
  } catch (e) {
    console.error(e);
    showToast(t("toast_create_error"));
  }
});

function revealOnScroll() {
  document.querySelectorAll(".card, .event-row, .upcoming-card").forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (top < window.innerHeight * 0.9) el.classList.add("visible");
  });
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("");
}

function formatDateParts(iso) {
  const d = new Date(iso + "T00:00:00");
  const localeCode = { ca: "ca-ES", es: "es-ES", en: "en-US" }[getLocale()] || "en-US";
  const dayNum = d.getDate();
  const month = d.toLocaleDateString(localeCode, { month: "short" }).replace(".", "");
  const full = d.toLocaleDateString(localeCode, { weekday: "long", day: "numeric", month: "long" });
  return { dayNum, month, full };
}

async function fetchAttendees(eventId) {
  try {
    const eventRef = doc(collection(db, "events"), eventId);
    const snap = await getDocs(collection(eventRef, "responses"));
    const list = [];
    snap.forEach(d => list.push(d.data()));
    return list;
  } catch (e) {
    console.error(e);
    return [];
  }
}

let allEvents = [];

function renderUpcoming() {
  const upcoming = allEvents.filter(ev => ev.data.approvedDate);
  if (upcoming.length === 0) {
    upcomingGridEl.innerHTML = `<div class="empty-state">${t("no_upcoming")}</div>`;
    return;
  }

  upcoming.sort((a, b) => (a.data.approvedDate || "").localeCompare(b.data.approvedDate || ""));

  upcomingGridEl.innerHTML = "";
  upcoming.forEach(({ id, data }) => {
    const { dayNum, month, full } = formatDateParts(data.approvedDate);
    const title = data.name;
    const time = data.approvedTime || "";

    const card = document.createElement("div");
    card.className = "upcoming-card";
    card.innerHTML = `
      <div class="upcoming-top">
        <div>
          <div class="upcoming-name">${title}</div>
          <div class="upcoming-datebox">
            <div class="upcoming-date-pill">
              <span class="d-num">${dayNum}</span>
              <span class="d-month">${month}</span>
            </div>
            <div class="upcoming-date-text">${full}${time ? " · " + time : ""}</div>
          </div>
          <div class="time-input-row">
            <label class="field-label" style="margin:0;" data-i18n="label_time_optional">Time (optional)</label>
            <input type="time" class="time-input" data-id="${id}" value="${time}">
          </div>
        </div>
      </div>
      <div class="upcoming-actions">
        <a class="btn cal-export google-link" data-id="${id}" href="#" target="_blank" rel="noopener">📅 ${t("calendar_google")}</a>
        <button class="btn cal-export ics-btn" data-id="${id}" type="button">🍎 ${t("calendar_ics")}</button>
      </div>
      <button class="attendees-toggle" data-id="${id}" type="button">👥 <span class="toggle-label">${t("view_attendees")}</span></button>
      <div class="attendees-list" id="attendees-${id}"></div>
    `;
    upcomingGridEl.appendChild(card);

    const updateCalLinks = () => {
      const timeVal = card.querySelector(".time-input").value || null;
      const gUrl = googleCalendarUrl(title, data.approvedDate, `Find a Date: ${title}`, timeVal);
      card.querySelector(".google-link").href = gUrl;
    };
    updateCalLinks();

    card.querySelector(".time-input").addEventListener("change", async (e) => {
      const timeVal = e.target.value || null;
      updateCalLinks();
      try {
        await updateDoc(doc(collection(db, "events"), id), { approvedTime: timeVal });
      } catch (err) { console.error(err); }
    });

    card.querySelector(".ics-btn").addEventListener("click", () => {
      const timeVal = card.querySelector(".time-input").value || null;
      downloadIcs(title, data.approvedDate, `Find a Date: ${title}`, timeVal);
    });

    const toggleBtn = card.querySelector(".attendees-toggle");
    const attendeesListEl = card.querySelector(`#attendees-${id}`);
    let loaded = false;
    toggleBtn.addEventListener("click", async () => {
      const isOpen = attendeesListEl.classList.contains("open");
      if (isOpen) {
        attendeesListEl.classList.remove("open");
        toggleBtn.querySelector(".toggle-label").textContent = t("view_attendees");
        return;
      }
      if (!loaded) {
        const attendees = await fetchAttendees(id);
        if (attendees.length === 0) {
          attendeesListEl.innerHTML = `<span class="meta">${t("no_people")}</span>`;
        } else {
          attendeesListEl.innerHTML = attendees.map(r => `
            <span class="participant-chip"><span class="avatar">${initials(r.displayName)}</span>${r.displayName}${r.plusOne ? " +1" : ""}</span>
          `).join("");
        }
        loaded = true;
      }
      attendeesListEl.classList.add("open");
      toggleBtn.querySelector(".toggle-label").textContent = t("hide_attendees");
    });
  });

  requestAnimationFrame(revealOnScroll);
}

function eventTapLabel() {
  const lang = getLocale();
  const labels = {
    ca: "Toca per marcar les teves dates",
    es: "Toca para marcar tus fechas",
    en: "Tap to mark your dates"
  };
  return labels[lang];
}

function renderEventList() {
  const voting = allEvents.filter(ev => !ev.data.approvedDate);

  if (voting.length === 0) {
    eventListEl.innerHTML = `<div class="empty-state">${t("no_events")}</div>`;
    return;
  }

  eventListEl.innerHTML = "";
  voting.forEach(({ id, data }) => {
    const row = document.createElement("a");
    row.href = `event.html?id=${encodeURIComponent(id)}`;
    row.className = "event-row";
    row.innerHTML = `
      <div class="ev-icon">🎉</div>
      <div class="ev-info">
        <div class="ev-name">${data.name}</div>
        <div class="ev-meta">${eventTapLabel()}</div>
        <div class="ev-status">
          <span class="status-badge voting">${t("ev_status_voting")}</span>
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
    renderUpcoming();
    renderEventList();
  }, (err) => {
    console.error(err);
    eventListEl.innerHTML = `<div class="empty-state">Could not load events. Check your Firebase config in firebase-config.js.</div>`;
  });
}

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);

loadEvents();
