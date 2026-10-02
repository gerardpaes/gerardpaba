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
const confirmedDateToggle = document.getElementById("confirmed-date-toggle");
const confirmedFields = document.getElementById("confirmed-fields");
const confirmedDateInput = document.getElementById("confirmed-date-input");
const confirmedTimeInput = document.getElementById("confirmed-time-input");
const confirmedLocationInput = document.getElementById("confirmed-location-input");

const EMOJI_CHOICES = ["🎉", "🎂", "🍕", "🍻", "🏖️", "⚽", "🎮", "🎬", "🎵", "🏔️", "🚗", "📚"];
let selectedEmoji = "";

function renderEmojiPicker() {
  emojiPickerGrid.innerHTML = EMOJI_CHOICES.map(e =>
    `<button type="button" class="emoji-opt-btn" data-emoji="${e}">${e}</button>`
  ).join("");
  emojiPickerGrid.querySelectorAll(".emoji-opt-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const emoji = btn.dataset.emoji;
      if (selectedEmoji === emoji) {
        selectedEmoji = "";
      } else {
        selectedEmoji = emoji;
      }
      emojiPickerGrid.querySelectorAll(".emoji-opt-btn").forEach(b => b.classList.toggle("active", b.dataset.emoji === selectedEmoji));
    });
  });
}
renderEmojiPicker();

confirmedDateToggle.addEventListener("change", () => {
  confirmedFields.classList.toggle("open", confirmedDateToggle.checked);
});

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
  emojiPickerGrid.querySelectorAll(".emoji-opt-btn").forEach(b => b.classList.remove("active"));
  confirmedDateToggle.checked = false;
  confirmedFields.classList.remove("open");
  confirmedDateInput.value = "";
  confirmedTimeInput.value = "";
  confirmedLocationInput.value = "";
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

  try {
    await setDoc(doc(collection(db, "events"), id), {
      name,
      createdAt: serverTimestamp(),
      approvedDate: hasConfirmedDate ? confirmedDateInput.value : null,
      approvedTime: hasConfirmedDate ? (confirmedTimeInput.value || null) : null,
      location: hasConfirmedDate ? (confirmedLocationInput.value || "") : ""
    });
    showToast(t("toast_event_created"));
    if (hasConfirmedDate) {
      modalOverlay.classList.remove("open");
    } else {
      window.location.href = `event.html?id=${encodeURIComponent(id)}`;
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
    const location = data.location || "";

    const card = document.createElement("div");
    card.className = "upcoming-card";
    card.innerHTML = `
      <div class="upcoming-top">
        <div class="upcoming-main">
          <div class="upcoming-date-pill">
            <span class="d-num">${dayNum}</span>
            <span class="d-month">${month}</span>
          </div>
          <div>
            <div class="upcoming-name">${title}</div>
            <div class="upcoming-date-text view-mode-text">${full}${time ? " · " + time : ""}${location ? " · " + location : ""}</div>
            <div class="edit-fields-inline" style="display:none;">
              <input type="date" class="date-input" data-id="${id}" value="${data.approvedDate}">
              <input type="time" class="time-input" data-id="${id}" value="${time}">
              <input type="text" class="location-input" data-id="${id}" value="${location}" data-i18n-placeholder="placeholder_location">
            </div>
          </div>
        </div>
        <div class="upcoming-actions cal-actions-slot">
          <button class="edit-toggle-btn" data-id="${id}" type="button">${t("btn_edit")}</button>
          <button class="attendees-toggle" data-id="${id}" type="button">${t("view_attendees")}</button>
          <button class="delete-event-btn" data-id="${id}" type="button" title="${t("btn_delete_event")}">🗑</button>
        </div>
      </div>
      <div class="attendees-list" id="attendees-${id}"></div>
    `;
    upcomingGridEl.appendChild(card);

    const getParams = () => ({
      title,
      isoDate: data.approvedDate,
      details: `Find a Date: ${title}`,
      time: card.querySelector(".time-input").value || null,
      location: card.querySelector(".location-input").value || ""
    });
    const calBtn = createCalendarAddButton(getParams, {
      addToCalendar: t("add_to_calendar"),
      google: t("calendar_google"),
      apple: t("calendar_ics")
    });
    card.querySelector(".cal-actions-slot").prepend(calBtn);

    const viewText = card.querySelector(".view-mode-text");
    const editFields = card.querySelector(".edit-fields-inline");
    const editBtn = card.querySelector(".edit-toggle-btn");

    function refreshViewText() {
      const d = card.querySelector(".date-input").value || data.approvedDate;
      const tm = card.querySelector(".time-input").value || "";
      const loc = card.querySelector(".location-input").value || "";
      const parts = formatDateParts(d);
      viewText.textContent = `${parts.full}${tm ? " · " + tm : ""}${loc ? " · " + loc : ""}`;
    }

    editBtn.addEventListener("click", () => {
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

    card.querySelector(".date-input").addEventListener("change", async (e) => {
      const dateVal = e.target.value;
      if (!dateVal) return;
      try {
        await updateDoc(doc(collection(db, "events"), id), { approvedDate: dateVal });
        data.approvedDate = dateVal;
        refreshViewText();
      } catch (err) { console.error(err); }
    });

    card.querySelector(".time-input").addEventListener("change", async (e) => {
      const timeVal = e.target.value || null;
      try {
        await updateDoc(doc(collection(db, "events"), id), { approvedTime: timeVal });
        refreshViewText();
      } catch (err) { console.error(err); }
    });

    card.querySelector(".location-input").addEventListener("change", async (e) => {
      const locVal = e.target.value || "";
      try {
        await updateDoc(doc(collection(db, "events"), id), { location: locVal });
        refreshViewText();
      } catch (err) { console.error(err); }
    });

    card.querySelector(".delete-event-btn").addEventListener("click", (e) => {
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
    const row = document.createElement("div");
    row.className = "event-row";
    row.innerHTML = `
      <a href="event.html?id=${encodeURIComponent(id)}" class="ev-link-area">
        <div class="ev-icon">${(data.name || "?").charAt(0).toUpperCase()}</div>
        <div class="ev-info">
          <div class="ev-name">${data.name}</div>
          <div class="ev-meta">${eventTapLabel()}</div>
          <div class="ev-status">
            <span class="status-badge voting">${t("ev_status_voting")}</span>
          </div>
        </div>
        <span class="chip">${t("chip_open")}</span>
      </a>
      <button class="delete-event-btn" data-id="${id}" type="button" title="${t("btn_delete_event")}">🗑</button>
    `;
    row.querySelector(".delete-event-btn").addEventListener("click", (e) => {
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
