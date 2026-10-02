import { db, collection, doc, setDoc, onSnapshot, serverTimestamp, query, orderBy } from "./firebase-init.js";
import { MonthCalendar } from "./calendar.js";

const eventNameInput = document.getElementById("event-name");
const createBtn = document.getElementById("create-event-btn");
const eventListEl = document.getElementById("event-list");
const toastEl = document.getElementById("toast");
const calendarContainer = document.getElementById("create-calendar");

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2200);
}

const createCal = new MonthCalendar(calendarContainer, { mode: "pick-any" });
createCal.render();

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "event";
}

createBtn.addEventListener("click", async () => {
  const name = eventNameInput.value.trim();
  const dates = createCal.getSelected();
  if (!name) { showToast("Please enter an event name"); return; }
  if (dates.length === 0) { showToast("Click at least one candidate date on the calendar"); return; }

  const id = slugify(name) + "-" + Date.now().toString(36).slice(-4);

  try {
    await setDoc(doc(collection(db, "events"), id), {
      name,
      dates: dates.slice().sort(),
      createdAt: serverTimestamp()
    });
    showToast("Event created!");
    window.location.href = `event.html?id=${encodeURIComponent(id)}`;
  } catch (e) {
    console.error(e);
    showToast("Error creating event. Check Firebase config.");
  }
});

function revealOnScroll() {
  document.querySelectorAll(".card, .event-row").forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (top < window.innerHeight * 0.9) el.classList.add("visible");
  });
}

function loadEvents() {
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
        <div class="ev-icon">🎉</div>
        <div class="ev-info">
          <div class="ev-name">${data.name}</div>
          <div class="ev-meta">${(data.dates || []).length} candidate date(s)</div>
        </div>
        <span class="chip">Open &rarr;</span>
      `;
      eventListEl.appendChild(row);
    });
    requestAnimationFrame(revealOnScroll);
  }, (err) => {
    console.error(err);
    eventListEl.innerHTML = `<div class="empty-state">Could not load events. Check your Firebase config in firebase-config.js.</div>`;
  });
}

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);

loadEvents();
