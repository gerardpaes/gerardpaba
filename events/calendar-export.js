// Helpers to add an approved event date (optionally with a time and location)
// to Google Calendar or Apple/iPhone Calendar (.ics download), plus a
// reusable single-button "Add to calendar" dropdown UI component.
//
// If `time` ("HH:MM") is omitted, the event is created as an all-day event.
// If provided, the event defaults to a 2-hour block starting at that time.

function pad(n) { return String(n).padStart(2, "0"); }

function buildDateTimes(isoDate, time) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!time) {
    const start = new Date(y, m - 1, d);
    const end = new Date(y, m - 1, d);
    end.setDate(end.getDate() + 1);
    return { start, end, allDay: true };
  }
  const [hh, mm] = time.split(":").map(Number);
  const start = new Date(y, m - 1, d, hh, mm);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  return { start, end, allDay: false };
}

function fmtDateOnly(dt) {
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;
}

function fmtDateTime(dt) {
  return `${fmtDateOnly(dt)}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

export function googleCalendarUrl(title, isoDate, details = "", time = null, location = "") {
  const { start, end, allDay } = buildDateTimes(isoDate, time);
  const dates = allDay
    ? `${fmtDateOnly(start)}/${fmtDateOnly(end)}`
    : `${fmtDateTime(start)}/${fmtDateTime(end)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates,
    details: details || "",
  });
  if (location) params.set("location", location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcs(title, isoDate, details = "", time = null, location = "") {
  const { start, end, allDay } = buildDateTimes(isoDate, time);

  const uid = `${Date.now()}@findadate`;
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}Z`;

  const dtStart = allDay ? `DTSTART:${fmtDateOnly(start)}` : `DTSTART:${fmtDateTime(start)}`;
  const dtEnd = allDay ? `DTEND:${fmtDateOnly(end)}` : `DTEND:${fmtDateTime(end)}`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FindADate//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    dtStart,
    dtEnd,
    `SUMMARY:${escapeIcs(title)}`,
    details ? `DESCRIPTION:${escapeIcs(details)}` : "",
    location ? `LOCATION:${escapeIcs(location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR"
  ].filter(Boolean).join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(title)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function escapeIcs(str) {
  return String(str).replace(/[\\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
}

function slugify(str) {
  return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "event";
}

// Close any other open calendar-add dropdowns in the document.
function closeAllCalDropdowns(except) {
  document.querySelectorAll(".cal-add-wrap.open").forEach(el => {
    if (el !== except) el.classList.remove("open");
  });
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".cal-add-wrap")) closeAllCalDropdowns(null);
});

// Builds a single "Add to calendar" button that opens a small dropdown
// with two options: Google Calendar / Apple-iPhone Calendar (.ics).
// `getParams()` is called lazily each time an option is clicked, so the
// caller can always supply the latest title/time/location at click time.
//
// Returns the wrapper DOM element — insert it wherever the two old
// buttons used to live.
export function createCalendarAddButton(getParams, labels) {
  const wrap = document.createElement("div");
  wrap.className = "cal-add-wrap";
  wrap.innerHTML = `
    <button class="btn cal-export cal-add-btn" type="button">${labels.addToCalendar}</button>
    <div class="cal-add-menu">
      <button class="cal-add-menu-item" type="button" data-kind="google">${labels.google}</button>
      <button class="cal-add-menu-item" type="button" data-kind="apple">${labels.apple}</button>
    </div>
  `;

  const btn = wrap.querySelector(".cal-add-btn");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = !wrap.classList.contains("open");
    closeAllCalDropdowns(wrap);
    wrap.classList.toggle("open", willOpen);
  });

  wrap.querySelectorAll(".cal-add-menu-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      wrap.classList.remove("open");
      const { title, isoDate, details, time, location } = getParams();
      if (item.dataset.kind === "google") {
        window.open(googleCalendarUrl(title, isoDate, details, time, location), "_blank", "noopener");
      } else {
        downloadIcs(title, isoDate, details, time, location);
      }
    });
  });

  return wrap;
}
