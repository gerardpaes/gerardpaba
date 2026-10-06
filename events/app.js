import { db, doc, collection, getDoc, setDoc, deleteDoc, updateDoc, onSnapshot } from "./firebase-init.js";
import { MonthCalendar } from "./calendar.js";
import { t, applyTranslations, initLanguageSwitcher, getLocale } from "./i18n.js";
import { createCalendarAddButton } from "./calendar-export.js";

document.documentElement.lang = getLocale();
applyTranslations();
initLanguageSwitcher();

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");

// Fixed shortlist of frequent friends, offered as native <datalist>
// suggestions on the name field. Pure convenience — any other name can
// still be typed freely, it's not a restricted/validated list.
const FRIEND_NAMES = [
  "Gerard Paba", "Gerard Padrós", "Pol", "Laura Sánchez",
  "Laura Alcoberro", "Angola", "Guillem", "Artur"
];

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
const friendSuggestionsEl = document.getElementById("friend-suggestions");
if (friendSuggestionsEl) {
  friendSuggestionsEl.innerHTML = FRIEND_NAMES.map(n => `<option value="${n}"></option>`).join("");
}

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

function isoAddDays(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Finds every maximal run of CONSECUTIVE calendar days where at least 2
// distinct people marked themselves "available" on ALL of those days (a
// true intersection, not just "available on at least one day in range").
// This is what lets a 3-day-trip style event surface naturally: if you
// mark 1-2-3-4 available and a friend only marks 1-2, the only day set
// both of you share on every day is 1-2, so that's the stretch returned
// — not 1-4.
//
// Returns a list of { startIso, endIso, days, names } candidate stretches,
// one entry per distinct group of people sharing a maximal stretch,
// including single-day stretches (length 1) so the normal "one day" case
// still works exactly like before. Sorted by: more people first, then
// longer stretch first.
function computeStretches() {
  const people = Object.entries(responses).map(([key, r]) => ({
    key,
    name: r.displayName + (r.plusOne ? " (+1)" : ""),
    available: new Set(r.available || [])
  }));
  if (people.length === 0) return [];

  const allIsos = new Set();
  people.forEach(p => p.available.forEach(iso => allIsos.add(iso)));
  if (allIsos.size === 0) return [];

  const sortedIsos = Array.from(allIsos).sort();
  const stretches = [];
  const seen = new Set(); // dedupe identical {startIso,endIso,memberKeys} combos

  // For every possible start day, grow the stretch day by day for as long
  // as at least 2 people remain available on EVERY day so far; record each
  // length along the way (so shorter sub-stretches with potentially more
  // people also get considered — e.g. day 1 alone might have 4 people
  // while 1-2 only has 2).
  sortedIsos.forEach(startIso => {
    let currentIso = startIso;
    let commonKeys = new Set(people.filter(p => p.available.has(startIso)).map(p => p.key));
    let len = 1;
    while (commonKeys.size >= 1) {
      const dedupeKey = `${startIso}|${currentIso}|${Array.from(commonKeys).sort().join(",")}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        const members = people.filter(p => commonKeys.has(p.key));
        stretches.push({
          startIso,
          endIso: currentIso,
          days: len,
          names: members.map(p => p.name)
        });
      }
      const nextIso = isoAddDays(currentIso, 1);
      const nextKeys = new Set(
        Array.from(commonKeys).filter(k => people.find(p => p.key === k).available.has(nextIso))
      );
      if (nextKeys.size === 0) break;
      commonKeys = nextKeys;
      currentIso = nextIso;
      len++;
    }
  });

  // Collapse to only the MAXIMAL stretch at each distinct headcount level
  // (drop any stretch whose day-range is fully contained inside another
  // stretch that has the exact same set of people). Without this, e.g.
  // P1=1-2-3, P2=1-2-3-4-5, P3=2-3-4 would list 2, 2-3, AND 3 (all with the
  // same 3-person group) as separate rows — we only want to keep "2-3"
  // (the longest run for that exact group), not its sub-stretches.
  const byGroup = new Map(); // "sortedKeys" -> array of candidate stretches
  stretches.forEach(s => {
    const groupKey = s.names.slice().sort().join("|");
    if (!byGroup.has(groupKey)) byGroup.set(groupKey, []);
    byGroup.get(groupKey).push(s);
  });
  const maximal = [];
  byGroup.forEach(list => {
    list.forEach(s => {
      const isContained = list.some(other =>
        other !== s &&
        other.startIso <= s.startIso && other.endIso >= s.endIso &&
        !(other.startIso === s.startIso && other.endIso === s.endIso)
      );
      if (!isContained) maximal.push(s);
    });
  });

  // Keep only stretches with 2+ people (true coincidences) OR single days
  // with 1 person (so the "just one person voted" case still shows up),
  // then sort by headcount desc, then length desc.
  const filtered = maximal.filter(s => s.names.length >= 2 || s.days === 1);
  filtered.sort((a, b) => (b.names.length - a.names.length) || (b.days - a.days));
  return filtered;
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

function computeTentativeCounts() {
  const counts = {};
  Object.values(responses).forEach(r => {
    const tent = r.tentative || [];
    tent.forEach(iso => {
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
  const isRange = eventData.approvedEndDate && eventData.approvedEndDate !== eventData.approvedDate;
  const dateLabel = isRange
    ? `${formatDateLong(eventData.approvedDate)} → ${formatDateLong(eventData.approvedEndDate)}`
    : formatDateLong(eventData.approvedDate);
  const title = eventData.name;

  const timeVal = eventData.approvedTime || "";
  const locationVal = eventData.location || "";

  const timeLabel = timeVal || t("no_time_set");
  const locationLabel = locationVal || t("no_location_set");

  const admin = window.isAdmin();
  approvedBannerArea.innerHTML = `
    <div class="approved-banner card visible">
      <div style="flex:1; min-width:220px;">
        <div class="approved-text">${t("approved_banner", dateLabel)}</div>
        <div class="approved-view-mode">
          ${isRange ? "" : `<span class="approved-meta-line">🕒 ${timeLabel} &nbsp;·&nbsp; 📍 ${locationLabel}</span>`}
          ${isRange ? `<span class="approved-meta-line">📍 ${locationLabel}</span>` : ""}
          ${admin ? `<button class="edit-toggle-btn" id="approved-edit-btn" type="button">${t("btn_edit")}</button>` : ""}
        </div>
        ${admin ? `<div class="edit-fields-inline" id="approved-edit-fields" style="display:none;">
          <input type="date" id="approved-date-input" value="${eventData.approvedDate}">
          ${isRange ? `<input type="date" id="approved-end-date-input" value="${eventData.approvedEndDate}">` : `<input type="time" id="approved-time-input" value="${timeVal}">`}
          <input type="text" id="approved-location-input" value="${locationVal}" data-i18n-placeholder="placeholder_location">
        </div>` : ""}
      </div>
      <div class="cal-export-row" id="approved-cal-actions">
        ${admin ? `<button class="btn cal-export" id="unapprove-btn" type="button">${t("unapprove_btn")}</button>` : ""}
      </div>
    </div>
  `;

  const getParams = () => ({
    title,
    isoDate: eventData.approvedDate,
    details: `Find a Date: ${title}`,
    time: isRange ? null : (eventData.approvedTime || null),
    location: eventData.location || "",
    endIsoDate: eventData.approvedEndDate || null
  });
  const calBtn = createCalendarAddButton(getParams, {
    addToCalendar: t("add_to_calendar"),
    google: t("calendar_google"),
    apple: t("calendar_ics")
  });
  document.getElementById("approved-cal-actions").prepend(calBtn);

  if (admin) {
    const dateInput = document.getElementById("approved-date-input");
    const endDateInput = document.getElementById("approved-end-date-input");
    const timeInput = document.getElementById("approved-time-input");
    const locationInput = document.getElementById("approved-location-input");
    const editBtn = document.getElementById("approved-edit-btn");
    const editFields = document.getElementById("approved-edit-fields");
    const viewMode = document.querySelector(".approved-view-mode");

    editBtn.addEventListener("click", () => {
      const isEditing = editFields.style.display !== "none";
      if (isEditing) {
        editFields.style.display = "none";
        viewMode.style.display = "";
        editBtn.textContent = t("btn_edit");
      } else {
        editFields.style.display = "flex";
        viewMode.style.display = "none";
        editBtn.textContent = t("btn_done");
      }
    });

    dateInput.addEventListener("change", async () => {
      const dv = dateInput.value;
      if (!dv) return;
      try {
        const eventRef = doc(collection(db, "events"), eventId);
        await updateDoc(eventRef, { approvedDate: dv });
        eventData.approvedDate = dv;
        resultsCal.setApprovedDate(dv, eventData.approvedEndDate);
        renderApprovedBanner();
        renderResults();
        showToast(t("toast_approved", formatDateLong(dv)));
      } catch (e) { console.error(e); }
    });

    if (endDateInput) {
      endDateInput.addEventListener("change", async () => {
        const ev = endDateInput.value;
        if (!ev) return;
        try {
          const eventRef = doc(collection(db, "events"), eventId);
          await updateDoc(eventRef, { approvedEndDate: ev });
          eventData.approvedEndDate = ev;
          resultsCal.setApprovedDate(eventData.approvedDate, ev);
          renderApprovedBanner();
          renderResults();
          showToast(t("toast_approved", `${formatDateLong(eventData.approvedDate)} \u2192 ${formatDateLong(ev)}`));
        } catch (e) { console.error(e); }
      });
    }

    function refreshApprovedMetaLine() {
      const metaEl = document.querySelector(".approved-meta-line");
      if (!metaEl) return;
      const lLabel = locationInput.value || t("no_location_set");
      if (timeInput) {
        const tLabel = timeInput.value || t("no_time_set");
        metaEl.textContent = `🕒 ${tLabel} \u00b7 📍 ${lLabel}`;
      } else {
        metaEl.textContent = `📍 ${lLabel}`;
      }
    }

    if (timeInput) {
      timeInput.addEventListener("change", async () => {
        const tv = timeInput.value || null;
        try {
          const eventRef = doc(collection(db, "events"), eventId);
          await updateDoc(eventRef, { approvedTime: tv });
          eventData.approvedTime = tv;
          refreshApprovedMetaLine();
        } catch (e) { console.error(e); }
      });
    }

    locationInput.addEventListener("change", async () => {
      const lv = locationInput.value || "";
      try {
        const eventRef = doc(collection(db, "events"), eventId);
        await updateDoc(eventRef, { location: lv });
        eventData.location = lv;
        refreshApprovedMetaLine();
      } catch (e) { console.error(e); }
    });

    document.getElementById("unapprove-btn").addEventListener("click", async () => {
      try {
        const eventRef = doc(collection(db, "events"), eventId);
        await updateDoc(eventRef, { approvedDate: null, approvedEndDate: null });
        eventData.approvedDate = null;
        eventData.approvedEndDate = null;
        renderApprovedBanner();
        resultsCal.setApprovedDate(null);
        renderResults();
        showToast(t("toast_unapproved"));
      } catch (e) {
        console.error(e);
      }
    });
  }
}

function renderResults() {
  const counts = computeCounts();
  const tentCounts = computeTentativeCounts();
  const dates = Array.from(new Set([...Object.keys(counts), ...Object.keys(tentCounts)])).sort();
  const totalParticipants = Object.keys(responses).length;

  const maxTotal = Math.max(...Object.values(counts), 1);

  // Keep the "who's picking" calendar showing live counts too, even before results exist.
  if (pickCal) pickCal.setCounts(counts, maxTotal);
  if (resultsCal) resultsCal.setCounts(counts, maxTotal);

  if (totalParticipants === 0 || dates.length === 0) {
    resultsAreaEl.innerHTML = `<div class="empty-state">${t("no_responses")}</div>`;
    return;
  }

  // Single-day tallies (keeps tentative-mark display working exactly like
  // before) plus multi-day stretches (true availability intersections,
  // e.g. a 3-day trip where everyone's free days overlap on only 2 of
  // them). Both kinds are merged into one ranked list.
  const tallyList = dates.map(iso => {
    let availNames = [];
    let tentNames = [];
    Object.values(responses).forEach(r => {
      const avail = r.available || [];
      const tent = r.tentative || [];
      if (avail.includes(iso)) availNames.push(r.displayName + (r.plusOne ? " (+1)" : ""));
      else if (tent.includes(iso)) tentNames.push(r.displayName + (r.plusOne ? " (+1)" : ""));
    });
    return {
      startIso: iso, endIso: iso, days: 1,
      total: counts[iso] || 0, tentTotal: tentCounts[iso] || 0,
      availNames, tentNames
    };
  });

  // Multi-day stretches (true overlap ranges) only make sense for events
  // explicitly created as "Several days" (dayMode === "multi") — a plain
  // single-day event keeps showing only individual days, so marking
  // availability on several unrelated days never gets misread as "wants
  // a trip spanning all of them".
  const stretchList = eventData.dayMode === "multi"
    ? computeStretches()
        .filter(s => s.days > 1) // length-1 stretches are already covered by tallyList (with tentative support)
        .map(s => ({
          startIso: s.startIso, endIso: s.endIso, days: s.days,
          total: s.names.length, tentTotal: 0,
          availNames: s.names, tentNames: []
        }))
    : [];

  const combined = [...tallyList, ...stretchList];
  const ranked = combined.slice().sort((a, b) => (b.total - a.total) || (b.days - a.days));

  let html = `<div class="rank-list">`;
  ranked.forEach((item, idx) => {
    const badgeClass = idx === 0 ? "gold" : idx === 1 ? "silver" : idx === 2 ? "bronze" : "";
    const pct = Math.round((item.total / maxTotal) * 100);
    const isApproved = eventData.approvedDate === item.startIso &&
      (eventData.approvedEndDate || eventData.approvedDate) === item.endIso;
    const dateLabel = item.days > 1
      ? `${formatDateLong(item.startIso)} → ${formatDateLong(item.endIso)}`
      : formatDateLong(item.startIso);
    html += `
      <div class="rank-row${isApproved ? " is-approved" : ""}">
        <div class="rank-row-main">
          <span class="rank-date">${dateLabel}${item.days > 1 ? `<span class="rank-days-badge">${item.days}d</span>` : ""}</span>
          <div class="bar-wrap"><div class="bar-fill" style="width:${pct}%"></div></div>
          <span class="rank-total">${item.total}${item.tentTotal ? `<span class="rank-tent-badge">+${item.tentTotal}?</span>` : ""}</span>
          ${window.isAdmin() ? `<button class="btn secondary approve-date-btn" data-start="${item.startIso}" data-end="${item.endIso}" type="button">
            ${isApproved ? "✓" : t("approve_btn")}
          </button>` : (isApproved ? `<span class="status-badge approved">${t("approved_tag")}</span>` : "")}
        </div>
        <div class="rank-names">
          ${item.availNames.length ? item.availNames.join(", ") : ""}
          ${item.tentNames.length ? `<span class="rank-tentative">❓ ${item.tentNames.join(", ")}</span>` : ""}
          ${!item.availNames.length && !item.tentNames.length ? "—" : ""}
        </div>
      </div>
    `;
  });
  html += `</div>`;
  resultsAreaEl.innerHTML = html;

  resultsAreaEl.querySelectorAll(".approve-date-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const startIso = btn.dataset.start;
      const endIso = btn.dataset.end;
      try {
        const eventRef = doc(collection(db, "events"), eventId);
        await updateDoc(eventRef, {
          approvedDate: startIso,
          approvedEndDate: endIso !== startIso ? endIso : null
        });
        eventData.approvedDate = startIso;
        eventData.approvedEndDate = endIso !== startIso ? endIso : null;
        resultsCal.setApprovedDate(startIso, eventData.approvedEndDate);
        renderApprovedBanner();
        renderResults();
        showToast(t("toast_approved", endIso !== startIso ? `${formatDateLong(startIso)} → ${formatDateLong(endIso)}` : formatDateLong(startIso)));
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

    pickCal = new MonthCalendar(pickCalendarEl, {
      mode: "pick-free",
      pickModeLabels: { available: t("pickmode_available"), tentative: t("pickmode_tentative") }
    });
    pickCal.render();

    resultsCal = new MonthCalendar(resultsCalendarEl, {
      mode: "display",
      approvedDate: eventData.approvedDate || null,
      approvedEndDate: eventData.approvedEndDate || null
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
