import { db, doc, collection, getDoc, setDoc, deleteDoc, updateDoc, onSnapshot } from "./firebase-init.js";
import { MonthCalendar } from "./calendar.js";
import { t, applyTranslations, initLanguageSwitcher, getLocale } from "./i18n.js";
import { createCalendarAddButton } from "./calendar-export.js";

document.documentElement.lang = getLocale();
applyTranslations();
initLanguageSwitcher();

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
const approvedBannerArea = document.getElementById("approved-banner-area");

const pickCalendarEl = document.getElementById("pick-calendar");
const resultsCalendarEl = document.getElementById("results-calendar");

let eventData = null;
let responses = {};
let pickCal = null;
let resultsCal = null;

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function formatDateLong(iso) {
  const d = new Date(iso + "T00:00:00");
  const localeCode = { ca: "ca-ES", es: "es-ES", en: "en-US" }[getLocale()] || "en-US";
  return d.toLocaleDateString(localeCode, { weekday: "long", day: "numeric", month: "long" });
}

function slugifyName(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("");
}

// Compute, for every date that appears in ANY response, the total headcount
// (people who marked it "available", counting +1s). Tentative marks are
// listed but don't count toward the total.
function computeCounts() {
  const counts = {};
  Object.values(responses).forEach(r => {
    const avail = r.available || [];
    avail.forEach(iso => {
      counts[iso] = (counts[iso] || 0) + 1 + (r.plusOne ? 1 : 0);
    });
  });
  return counts;
}

function restoreMyResponseIfAny() {
  const savedName = localStorage.getItem(`findadate:${eventId}:name`);
  if (savedName && responses[slugifyName(savedName)]) {
    nameInput.value = savedName;
    const r = responses[slugifyName(savedName)];
    pickCal.setState(r.available || [], r.tentative || []);
    plusOneCheckbox.checked = !!r.plusOne;
  }
}

function renderApprovedBanner() {
  if (!eventData.approvedDate) {
    approvedBannerArea.innerHTML = "";
    return;
  }
  const dateLabel = formatDateLong(eventData.approvedDate);
  const title = eventData.name;

  const timeVal = eventData.approvedTime || "";
  const locationVal = eventData.location || "";

  approvedBannerArea.innerHTML = `
    <div class="approved-banner card visible">
      <div style="flex:1; min-width:220px;">
        <div class="approved-text">${t("approved_banner", dateLabel)}</div>
        <div class="time-input-row">
          <label class="field-label" style="margin:0;">${t("label_time_optional")}</label>
          <input type="time" id="approved-time-input" value="${timeVal}">
        </div>
        <div class="location-input-row">
          <label class="field-label" style="margin:0;" data-i18n="label_location_optional">Location</label>
          <input type="text" id="approved-location-input" value="${locationVal}" data-i18n-placeholder="placeholder_location">
        </div>
      </div>
      <div class="cal-export-row" id="approved-cal-actions">
        <button class="btn cal-export" id="unapprove-btn" type="button">${t("unapprove_btn")}</button>
      </div>
    </div>
  `;

  const timeInput = document.getElementById("approved-time-input");
  const locationInput = document.getElementById("approved-location-input");

  const getParams = () => ({
    title,
    isoDate: eventData.approvedDate,
    details: `Find a Date: ${title}`,
    time: timeInput.value || null,
    location: locationInput.value || ""
  });
  const calBtn = createCalendarAddButton(getParams, {
    addToCalendar: t("add_to_calendar"),
    google: t("calendar_google"),
    apple: t("calendar_ics")
  });
  document.getElementById("approved-cal-actions").prepend(calBtn);

  timeInput.addEventListener("change", async () => {
    const tv = timeInput.value || null;
    try {
      const eventRef = doc(collection(db, "events"), eventId);
      await updateDoc(eventRef, { approvedTime: tv });
      eventData.approvedTime = tv;
    } catch (e) { console.error(e); }
  });

  locationInput.addEventListener("change", async () => {
    const lv = locationInput.value || "";
    try {
      const eventRef = doc(collection(db, "events"), eventId);
      await updateDoc(eventRef, { location: lv });
      eventData.location = lv;
    } catch (e) { console.error(e); }
  });

  document.getElementById("unapprove-btn").addEventListener("click", async () => {
    try {
      const eventRef = doc(collection(db, "events"), eventId);
      await updateDoc(eventRef, { approvedDate: null });
      eventData.approvedDate = null;
      renderApprovedBanner();
      resultsCal.setApprovedDate(null);
      renderResults();
      showToast(t("toast_unapproved"));
    } catch (e) {
      console.error(e);
    }
  });
}

function renderResults() {
  const counts = computeCounts();
  const dates = Object.keys(counts).sort();
  const totalParticipants = Object.keys(responses).length;

  const maxTotal = Math.max(...Object.values(counts), 1);

  // Keep the "who's picking" calendar showing live counts too, even before results exist.
  if (pickCal) pickCal.setCounts(counts, maxTotal);
  if (resultsCal) resultsCal.setCounts(counts, maxTotal);

  if (totalParticipants === 0 || dates.length === 0) {
    resultsAreaEl.innerHTML = `<div class="empty-state">${t("no_responses")}</div>`;
    return;
  }

  const tallyList = dates.map(iso => {
    let names = [];
    Object.values(responses).forEach(r => {
      const avail = r.available || [];
      const tent = r.tentative || [];
      if (avail.includes(iso)) names.push(r.displayName + (r.plusOne ? " (+1)" : ""));
      else if (tent.includes(iso)) names.push(r.displayName + " (?)");
    });
    return { iso, total: counts[iso] || 0, names };
  });

  const ranked = tallyList.slice().sort((a, b) => b.total - a.total);

  let html = `<div class="rank-list">`;
  ranked.forEach((item, idx) => {
    const badgeClass = idx === 0 ? "gold" : idx === 1 ? "silver" : idx === 2 ? "bronze" : "";
    const pct = Math.round((item.total / maxTotal) * 100);
    const isApproved = eventData.approvedDate === item.iso;
    html += `
      <div class="rank-card">
        <div class="rank-badge ${badgeClass}">${idx + 1}</div>
        <div class="rank-info">
          <div class="rank-date">${formatDateLong(item.iso)} ${isApproved ? `<span class="status-badge approved">${t("approved_tag")}</span>` : ""}</div>
          <div class="rank-who">${item.names.length ? item.names.join(", ") : "—"}</div>
          <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="rank-total">${item.total}</div>
        <button class="btn secondary approve-date-btn" data-iso="${item.iso}" type="button" style="font-size:12px; padding:8px 14px;">
          ${isApproved ? "✓" : t("approve_btn")}
        </button>
      </div>
    `;
  });
  html += `</div>`;
  resultsAreaEl.innerHTML = html;

  resultsAreaEl.querySelectorAll(".approve-date-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const iso = btn.dataset.iso;
      try {
        const eventRef = doc(collection(db, "events"), eventId);
        await updateDoc(eventRef, { approvedDate: iso });
        eventData.approvedDate = iso;
        resultsCal.setApprovedDate(iso);
        renderApprovedBanner();
        renderResults();
        showToast(t("toast_approved", formatDateLong(iso)));
      } catch (e) {
        console.error(e);
      }
    });
  });
}

function renderParticipants() {
  const entries = Object.values(responses);
  if (entries.length === 0) {
    participantsChipsEl.innerHTML = `<span class="meta">${t("no_people")}</span>`;
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
    subtitleEl.textContent = "";

    pickCal = new MonthCalendar(pickCalendarEl, { mode: "pick-free" });
    pickCal.render();

    resultsCal = new MonthCalendar(resultsCalendarEl, {
      mode: "display",
      approvedDate: eventData.approvedDate || null
    });
    resultsCal.render();

    renderApprovedBanner();

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
  const availableDates = pickCal ? pickCal.getAvailable() : [];
  const tentativeDates = pickCal ? pickCal.getTentative() : [];
  if (!name) { showToast(t("toast_need_name")); return; }
  if (availableDates.length === 0 && tentativeDates.length === 0) { showToast(t("toast_need_date")); return; }

  const id = slugifyName(name);
  try {
    const eventRef = doc(collection(db, "events"), eventId);
    await setDoc(doc(collection(eventRef, "responses"), id), {
      displayName: name,
      available: availableDates,
      tentative: tentativeDates,
      plusOne: plusOneCheckbox.checked
    });
    localStorage.setItem(`findadate:${eventId}:name`, name);
    showToast(t("toast_saved", name));
  } catch (e) {
    console.error(e);
    showToast(t("toast_save_error"));
  }
});

removeBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  if (!name) { showToast(t("toast_enter_prev_name")); return; }
  const id = slugifyName(name);
  try {
    const eventRef = doc(collection(db, "events"), eventId);
    await deleteDoc(doc(collection(eventRef, "responses"), id));
    localStorage.removeItem(`findadate:${eventId}:name`);
    if (pickCal) pickCal.setState([], []);
    plusOneCheckbox.checked = false;
    showToast(t("toast_removed"));
  } catch (e) {
    console.error(e);
    showToast(t("toast_remove_error"));
  }
});

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);

loadEvent();
