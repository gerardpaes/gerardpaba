import { db, collection, doc, setDoc, getDocs, onSnapshot, serverTimestamp, query, orderBy } from "./firebase-init.js";

const pendingDatesEl = document.getElementById("pending-dates");
const dateInput = document.getElementById("date-input");
const addDateBtn = document.getElementById("add-date-btn");
const eventNameInput = document.getElementById("event-name");
const createBtn = document.getElementById("create-event-btn");
const eventListEl = document.getElementById("event-list");
const toastEl = document.getElementById("toast");

let pendingDates = [];

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

function renderPendingDates() {
  pendingDatesEl.innerHTML = "";
  pendingDates.sort();
  pendingDates.forEach(iso => {
    const { weekday, label } = formatDate(iso);
    const pill = document.createElement("div");
    pill.className = "date-pill selected";
    pill.innerHTML = `<div class="d-weekday">${weekday}</div><div class="d-date">${label}</div>`;
    pill.title = "Click to remove";
    pill.addEventListener("click", () => {
      pendingDates = pendingDates.filter(d => d !== iso);
      renderPendingDates();
    });
    pendingDatesEl.appendChild(pill);
  });
}

addDateBtn.addEventListener("click", () => {
  const val = dateInput.value;
  if (!val) return;
  if (!pendingDates.includes(val)) {
    pendingDates.push(val);
    renderPendingDates();
  }
  dateInput.value = "";
});

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "event";
}

createBtn.addEventListener("click", async () => {
  const name = eventNameInput.value.trim();
  if (!name) { showToast("Please enter an event name"); return; }
  if (pendingDates.length === 0) { showToast("Add at least one candidate date"); return; }

  let id = slugify(name) + "-" + Date.now().toString(36).slice(-4);

  try {
    await setDoc(doc(collection(db, "events"), id), {
      name,
      dates: pendingDates.slice().sort(),
      createdAt: serverTimestamp()
    });
    showToast("Event created!");
    window.location.href = `event.html?id=${encodeURIComponent(id)}`;
  } catch (e) {
    console.error(e);
    showToast("Error creating event. Check Firebase config.");
  }
});

async function loadEvents() {
  try {
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
      if (snap.empty) {
        eventListEl.innerHTML = `<div class="empty-state">No events yet. Create your first one above! 🎉</div>`;
        return;
      }
      eventListEl.innerHTML = "";
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const row = document.createElement("a");
        row.href = `event.html?id=${encodeURIComponent(docSnap.id)}`;
        row.className = "event-row";
        row.innerHTML = `
          <div>
            <strong>${data.name}</strong>
            <div class="meta">${(data.dates || []).length} candidate date(s)</div>
          </div>
          <span class="chip">Open &rarr;</span>
        `;
        eventListEl.appendChild(row);
      });
    }, (err) => {
      console.error(err);
      eventListEl.innerHTML = `<div class="empty-state">Could not load events. Check your Firebase config in firebase-config.js.</div>`;
    });
  } catch (e) {
    console.error(e);
    eventListEl.innerHTML = `<div class="empty-state">Could not load events. Check your Firebase config in firebase-config.js.</div>`;
  }
}

loadEvents();
