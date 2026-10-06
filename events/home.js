import { db, collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, query, orderBy, getDocs } from "./firebase-init.js";
import { t, applyTranslations, initLanguageSwitcher, getLocale } from "./i18n.js";
import { createCalendarAddButton } from "./calendar-export.js";

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
const emojiPickerGrid = document.getElementById("emoji-picker-grid");
const emojiFreeInput = document.getElementById("emoji-free-input");
const confirmedDateToggle = document.getElementById("confirmed-date-toggle");
const confirmedFields = document.getElementById("confirmed-fields");
const confirmedDateInput = document.getElementById("confirmed-date-input");
const confirmedTimeInput = document.getElementById("confirmed-time-input");
const confirmedLocationInput = document.getElementById("confirmed-location-input");
const confirmedEndDateWrap = document.getElementById("confirmed-end-date-wrap");
const confirmedEndDateInput = document.getElementById("confirmed-end-date-input");
const confirmedTimeWrap = document.getElementById("confirmed-time-wrap");

// Day-mode segmented control: "single" (default, one specific date — the
// classic flow, results ranking shows individual days only) vs "multi"
// (a trip-style event — results ranking also surfaces the best overlapping
// date RANGE across people's availability, not just single days). This
// single choice at the top of the modal now ALSO decides whether the
// "confirmed date" section (if the admin already has a fixed date) asks
// for a start+end range or a single date+time — no separate/redundant
// "several days" checkbox further down anymore.
const dayModeSingleBtn = document.getElementById("day-mode-single");
const dayModeMultiBtn = document.getElementById("day-mode-multi");
let dayMode = "single";

function applyDayModeToConfirmedFields() {
  const multi = dayMode === "multi";
  confirmedEndDateWrap.style.display = multi ? "" : "none";
  confirmedTimeWrap.style.display = multi ? "none" : "";
}

function setDayMode(mode) {
  dayMode = mode;
  dayModeSingleBtn.classList.toggle("active", mode === "single");
  dayModeMultiBtn.classList.toggle("active", mode === "multi");
  applyDayModeToConfirmedFields();
}
dayModeSingleBtn.addEventListener("click", () => setDayMode("single"));
dayModeMultiBtn.addEventListener("click", () => setDayMode("multi"));

const EMOJI_CHOICES = ["🎉", "🎂", "🍕", "🍻", "🏖️", "🎬", "🎵", "🏔️", "🚗", "🎤", "✈️", "🧳", "🍽️", "🎄", "🌈", "🍴", "🍄", "🍂", "☀️", "🌸", "🧅"];
let selectedEmoji = "";

function renderEmojiPicker() {
  emojiPickerGrid.innerHTML = EMOJI_CHOICES.map(e =>
    `<button type="button" class="emoji-opt-btn" data-emoji="${e}">${e}</button>`
  ).join("") + `<button type="button" class="emoji-more-btn" id="emoji-more-btn" title="${t("emoji_more_title")}">➕</button>`;
  emojiPickerGrid.querySelectorAll(".emoji-opt-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const emoji = btn.dataset.emoji;
      if (selectedEmoji === emoji) {
        selectedEmoji = "";
      } else {
        selectedEmoji = emoji;
      }
      emojiFreeInput.value = selectedEmoji;
      refreshEmojiActiveStates();
    });
  });
  // "+" square: same grid, different color, opens the system emoji
  // keyboard directly (via the hidden text input) so users can pick ANY
  // emoji, not just the preset palette — no separate free-text box
  // floating below the grid anymore.
  document.getElementById("emoji-more-btn").addEventListener("click", () => {
    emojiFreeInput.focus();
  });
}

function refreshEmojiActiveStates() {
  emojiPickerGrid.querySelectorAll(".emoji-opt-btn").forEach(b => b.classList.toggle("active", b.dataset.emoji === selectedEmoji));
  const moreBtn = document.getElementById("emoji-more-btn");
  const isCustom = selectedEmoji && !EMOJI_CHOICES.includes(selectedEmoji);
  moreBtn.classList.toggle("active", !!isCustom);
  moreBtn.textContent = isCustom ? selectedEmoji : "➕";
}
renderEmojiPicker();

// Hidden text input: receives whatever emoji the system keyboard inserts
// when the "+" square is tapped. On mobile this works invisibly because
// focusing it pops the system keyboard (which has an emoji key) right
// away. On a LAPTOP there is no touch keyboard, so leaving the input
// permanently invisible gave the user zero feedback that clicking "+" did
// anything at all - it silently focused an off-screen 1x1px box. Now the
// input becomes visibly shown right under the grid while focused, with a
// placeholder hinting how to actually type an emoji on desktop (OS emoji
// picker shortcut, or paste), and hides again on blur if left empty.
emojiFreeInput.addEventListener("input", () => {
  selectedEmoji = emojiFreeInput.value.trim();
  refreshEmojiActiveStates();
});
emojiFreeInput.addEventListener("focus", () => {
  emojiFreeInput.classList.add("visible");
});
emojiFreeInput.addEventListener("blur", () => {
  if (!emojiFreeInput.value.trim()) emojiFreeInput.classList.remove("visible");
});

function updateCreateBtnLabel() {
  createBtn.textContent = confirmedDateToggle.checked ? t("btn_create") : t("btn_create_vote");
}

confirmedDateToggle.addEventListener("change", () => {
  confirmedFields.classList.toggle("open", confirmedDateToggle.checked);
  updateCreateBtnLabel();
});
updateCreateBtnLabel();

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function openConfirmDialog(message, onConfirm) {
  const overlay = document.createElement("div");
  overlay.className = "confirm-dialog-overlay open";
  overlay.innerHTML = `
    <div class="confirm-dialog">
      <p class="confirm-dialog-text"></p>
      <div class="btn-row">
        <button class="btn secondary" data-action="cancel" type="button">${t("btn_cancel")}</button>
        <button class="btn danger" data-action="confirm" type="button">${t("btn_delete_event")}</button>
      </div>
    </div>
  `;
  overlay.querySelector(".confirm-dialog-text").textContent = message;
  document.body.appendChild(overlay);

  function close() { overlay.remove(); }

  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('[data-action="cancel"]').addEventListener("click", close);
  overlay.querySelector('[data-action="confirm"]').addEventListener("click", () => {
    close();
    onConfirm();
  });
}

function resetCreateModal() {
  eventNameInput.value = "";
  selectedEmoji = "";
  emojiFreeInput.value = "";
  refreshEmojiActiveStates();
  confirmedDateToggle.checked = false;
  confirmedFields.classList.remove("open");
  confirmedDateInput.value = "";
  confirmedTimeInput.value = "";
  confirmedLocationInput.value = "";
  confirmedEndDateInput.value = "";
  setDayMode("single");
  updateCreateBtnLabel();
}

openModalBtn.addEventListener("click", () => { resetCreateModal(); modalOverlay.classList.add("open"); });
closeModalBtn.addEventListener("click", () => modalOverlay.classList.remove("open"));
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove("open"); });

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";
}

createBtn.addEventListener("click", async () => {
  const rawName = eventNameInput.value.trim();
  if (!rawName) { showToast(t("toast_need_event_name")); return; }
  const name = selectedEmoji ? `${selectedEmoji} ${rawName}` : rawName;

  const id = slugify(rawName) + "-" + Date.now().toString(36).slice(-4);

  const hasConfirmedDate = confirmedDateToggle.checked && confirmedDateInput.value;
  const isMultiDay = hasConfirmedDate && dayMode === "multi" && confirmedEndDateInput.value;

  try {
    await setDoc(doc(collection(db, "events"), id), {
      name,
      createdAt: serverTimestamp(),
      dayMode,
      approvedDate: hasConfirmedDate ? confirmedDateInput.value : null,
      approvedEndDate: isMultiDay ? confirmedEndDateInput.value : null,
      approvedTime: hasConfirmedDate && !isMultiDay ? (confirmedTimeInput.value || null) : null,
      location: hasConfirmedDate ? (confirmedLocationInput.value || "") : ""
    });
    showToast(t("toast_event_created"));
    if (hasConfirmedDate) {
      modalOverlay.classList.remove("open");
    } else {
      window.location.href = `/events/event.html?id=${encodeURIComponent(id)}`;
    }
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
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = allEvents.filter(ev => ev.data.approvedDate && ev.data.approvedDate >= todayIso);
  if (upcoming.length === 0) {
    upcomingGridEl.innerHTML = `<div class="empty-state">${t("no_upcoming")}</div>`;
    return;
  }

  upcoming.sort((a, b) => (a.data.approvedDate || "").localeCompare(b.data.approvedDate || ""));

  upcomingGridEl.innerHTML = "";
  upcoming.forEach(({ id, data }) => {
    const { dayNum, month, full } = formatDateParts(data.approvedDate);
    const isRange = data.approvedEndDate && data.approvedEndDate !== data.approvedDate;
    const title = data.name;
    const time = data.approvedTime || "";
    const location = data.location || "";
    const endParts = isRange ? formatDateParts(data.approvedEndDate) : null;
    const pillHtml = isRange
      ? `<span class="d-num d-num-range">${dayNum}-${endParts.dayNum}</span><span class="d-month">${month}</span>`
      : `<span class="d-num">${dayNum}</span><span class="d-month">${month}</span>`;
    const dateTextHtml = isRange
      ? `${full} → ${endParts.full}${location ? " · " + location : ""}`
      : `${full}${time ? " · " + time : ""}${location ? " · " + location : ""}`;

    const card = document.createElement("div");
    card.className = "upcoming-card";
    card.innerHTML = `
      ${window.isAdmin() ? `
      <div class="kebab-wrap">
        <button class="kebab-btn" type="button" aria-label="${t("btn_edit")}">&#8942;</button>
        <div class="kebab-menu">
          <button class="kebab-edit-btn" data-id="${id}" type="button">${t("btn_edit")}</button>
          <button class="kebab-delete-btn danger" data-id="${id}" type="button">${t("btn_delete_event")}</button>
        </div>
      </div>` : ""}
      <div class="uc-row uc-head">
        <div class="upcoming-date-pill">
          ${pillHtml}
        </div>
        <div class="uc-head-text">
          <div class="upcoming-name">${title}</div>
          <div class="upcoming-date-text view-mode-text">${dateTextHtml}</div>
          <div class="edit-fields-inline" style="display:none;">
            <input type="date" class="date-input" data-id="${id}" value="${data.approvedDate}">
            ${isRange ? `<input type="date" class="end-date-input" data-id="${id}" value="${data.approvedEndDate}">` : `<input type="time" class="time-input" data-id="${id}" value="${time}">`}
            <input type="text" class="location-input" data-id="${id}" value="${location}" data-i18n-placeholder="placeholder_location">
          </div>
        </div>
      </div>
      <div class="uc-row uc-foot cal-actions-slot">
        <button class="attendees-toggle" data-id="${id}" type="button">${t("view_attendees")}</button>
      </div>
      <div class="attendees-list" id="attendees-${id}"></div>
    `;
    upcomingGridEl.appendChild(card);

    const getParams = () => ({
      title,
      isoDate: data.approvedDate,
      details: `Find a Date: ${title}`,
      time: isRange ? null : (card.querySelector(".time-input")?.value || null),
      location: card.querySelector(".location-input").value || "",
      endIsoDate: isRange ? (card.querySelector(".end-date-input")?.value || data.approvedEndDate) : null
    });
    const calBtn = createCalendarAddButton(getParams, {
      addToCalendar: t("add_to_calendar"),
      google: t("calendar_google"),
      apple: t("calendar_ics")
    });
    card.querySelector(".cal-actions-slot").prepend(calBtn);

    const viewText = card.querySelector(".view-mode-text");
    const editFields = card.querySelector(".edit-fields-inline");
    const editBtn = card.querySelector(".kebab-edit-btn");
    const kebabBtn = card.querySelector(".kebab-btn");
    const kebabMenu = card.querySelector(".kebab-menu");

    function refreshViewText() {
      const d = card.querySelector(".date-input").value || data.approvedDate;
      const endInput = card.querySelector(".end-date-input");
      const timeInput = card.querySelector(".time-input");
      const loc = card.querySelector(".location-input").value || "";
      const parts = formatDateParts(d);
      if (endInput) {
        const endVal = endInput.value || data.approvedEndDate;
        const endParts = formatDateParts(endVal);
        viewText.textContent = `${parts.full} → ${endParts.full}${loc ? " · " + loc : ""}`;
      } else {
        const tm = timeInput ? (timeInput.value || "") : "";
        viewText.textContent = `${parts.full}${tm ? " · " + tm : ""}${loc ? " · " + loc : ""}`;
      }
    }

    if (kebabBtn) {
      kebabBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".kebab-menu.open").forEach(m => { if (m !== kebabMenu) m.classList.remove("open"); });
        kebabMenu.classList.toggle("open");
      });
      document.addEventListener("click", (e) => {
        if (!card.contains(e.target)) kebabMenu.classList.remove("open");
      });
    }

    if (editBtn) {
      editBtn.addEventListener("click", () => {
        kebabMenu.classList.remove("open");
        const isEditing = editFields.style.display !== "none";
        if (isEditing) {
          editFields.style.display = "none";
          viewText.style.display = "";
          editBtn.textContent = t("btn_edit");
        } else {
          editFields.style.display = "flex";
          viewText.style.display = "none";
          editBtn.textContent = t("btn_done");
        }
      });
    }

    card.querySelector(".date-input").addEventListener("change", async (e) => {
      const dateVal = e.target.value;
      if (!dateVal) return;
      try {
        await updateDoc(doc(collection(db, "events"), id), { approvedDate: dateVal });
        data.approvedDate = dateVal;
        refreshViewText();
      } catch (err) { console.error(err); }
    });

    const endDateInputEl = card.querySelector(".end-date-input");
    if (endDateInputEl) {
      endDateInputEl.addEventListener("change", async (e) => {
        const endVal = e.target.value;
        if (!endVal) return;
        try {
          await updateDoc(doc(collection(db, "events"), id), { approvedEndDate: endVal });
          data.approvedEndDate = endVal;
          refreshViewText();
        } catch (err) { console.error(err); }
      });
    }

    const timeInputEl = card.querySelector(".time-input");
    if (timeInputEl) {
      timeInputEl.addEventListener("change", async (e) => {
        const timeVal = e.target.value || null;
        try {
          await updateDoc(doc(collection(db, "events"), id), { approvedTime: timeVal });
          refreshViewText();
        } catch (err) { console.error(err); }
      });
    }

    card.querySelector(".location-input").addEventListener("change", async (e) => {
      const locVal = e.target.value || "";
      try {
        await updateDoc(doc(collection(db, "events"), id), { location: locVal });
        refreshViewText();
      } catch (err) { console.error(err); }
    });

    const upcomingDeleteBtn = card.querySelector(".kebab-delete-btn");
    if (upcomingDeleteBtn) upcomingDeleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openConfirmDialog(t("confirm_delete_event"), async () => {
        try {
          await deleteDoc(doc(collection(db, "events"), id));
          showToast(t("toast_event_deleted"));
        } catch (err) {
          console.error(err);
          showToast(t("toast_delete_error"));
        }
      });
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

function firstGlyph(name) {
  if (!name) return "?";
  // Use Array.from so multi-code-unit emoji (surrogate pairs) are not
  // split in half (which previously showed a broken "?" glyph).
  const first = Array.from(name.trim())[0] || "?";
  // Only uppercase plain letters; emoji pass through unchanged.
  return first.toUpperCase();
}

// Splits a leading emoji (chosen in the create-event emoji picker, stored
// glued to the start of `name`) from the rest of the title. Returns the
// emoji (or null if the name doesn't start with one) and the clean title.
const EMOJI_PREFIX_RE = /^(\p{Extended_Pictographic}(?:\u200d\p{Extended_Pictographic})*)\s*/u;
function splitEmoji(name) {
  if (!name) return { emoji: null, title: "" };
  const m = name.match(EMOJI_PREFIX_RE);
  if (m) return { emoji: m[1], title: name.slice(m[0].length) };
  return { emoji: null, title: name };
}

function voteCountLabel(n) {
  const [singular, plural] = t("vote_count_label").split("|");
  const word = n === 1 ? singular : plural;
  return `${n} ${word}`;
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
  const admin = window.isAdmin();
  voting.forEach(({ id, data }) => {
    const { emoji, title } = splitEmoji(data.name);
    const row = document.createElement("div");
    row.className = "event-row";
    row.innerHTML = `
      <div class="ev-icon">
        <span class="ev-icon-text">${emoji || "?"}</span>
        ${admin ? `<input type="text" class="ev-icon-edit-input" value="${emoji || ""}" maxlength="4" style="display:none;">` : ""}
      </div>
      <a href="/events/event.html?id=${encodeURIComponent(id)}" class="ev-link-area">
        <div class="ev-info">
          <div class="ev-name">
            <span class="ev-name-text">${title}</span>
            ${admin ? `<input type="text" class="ev-name-edit-input" value="${title}" style="display:none;">` : ""}
          </div>
          <div class="ev-meta" data-vote-count-id="${id}">…</div>
        </div>
      </a>
      <button class="btn vote-btn" type="button" onclick="window.location.href='/events/event.html?id=${encodeURIComponent(id)}'">${t("btn_vote")}</button>
      ${admin ? `<button class="edit-event-name-btn" data-id="${id}" type="button" title="${t("btn_edit")}">✎</button>` : ""}
      ${admin ? `<button class="delete-event-btn" data-id="${id}" type="button" title="${t("btn_delete_event")}">🗑</button>` : ""}
    `;

    const editNameBtn = row.querySelector(".edit-event-name-btn");
    if (editNameBtn) editNameBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const nameText = row.querySelector(".ev-name-text");
      const nameInput = row.querySelector(".ev-name-edit-input");
      const iconText = row.querySelector(".ev-icon-text");
      const iconInput = row.querySelector(".ev-icon-edit-input");
      const isEditing = nameInput.style.display !== "none";
      if (isEditing) {
        const newTitle = nameInput.value.trim();
        const newEmoji = iconInput.value.trim();
        if ((newTitle && newTitle !== title) || newEmoji !== (emoji || "")) {
          const fullName = newEmoji ? `${newEmoji} ${newTitle || title}` : (newTitle || title);
          updateDoc(doc(collection(db, "events"), id), { name: fullName }).catch(err => {
            console.error(err);
            showToast(t("toast_create_error"));
          });
        }
        nameInput.style.display = "none";
        nameText.style.display = "";
        iconInput.style.display = "none";
        iconText.style.display = "";
        editNameBtn.textContent = "✎";
      } else {
        nameText.style.display = "none";
        nameInput.style.display = "";
        iconText.style.display = "none";
        iconInput.style.display = "";
        nameInput.focus();
        nameInput.select();
        editNameBtn.textContent = "✓";
      }
    });
    const nameEditInput = row.querySelector(".ev-name-edit-input");
    if (nameEditInput) nameEditInput.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); });
    if (nameEditInput) nameEditInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") editNameBtn.click();
    });
    const iconEditInput = row.querySelector(".ev-icon-edit-input");
    if (iconEditInput) iconEditInput.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); });
    if (iconEditInput) iconEditInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") editNameBtn.click();
    });

    const votingDeleteBtn = row.querySelector(".delete-event-btn");
    if (votingDeleteBtn) votingDeleteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openConfirmDialog(t("confirm_delete_event"), async () => {
        try {
          await deleteDoc(doc(collection(db, "events"), id));
          showToast(t("toast_event_deleted"));
        } catch (err) {
          console.error(err);
          showToast(t("toast_delete_error"));
        }
      });
    });
    eventListEl.appendChild(row);

    fetchAttendees(id).then(list => {
      const meta = row.querySelector(`[data-vote-count-id="${id}"]`);
      if (meta) meta.textContent = list.length > 0 ? voteCountLabel(list.length) : t("no_votes_yet");
    });
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
