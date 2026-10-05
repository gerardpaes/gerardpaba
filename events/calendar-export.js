// Helpers to add an approved event date (optionally with a time and location)
// to Google Calendar or Apple/iPhone Calendar (.ics download), plus a
// reusable single-button "Add to calendar" dropdown UI component.
//
// If `time` ("HH:MM") is omitted, the event is created as an all-day event.
// If provided, the event defaults to a 2-hour block starting at that time.

function pad(n) { return String(n).padStart(2, "0"); }

// `endIsoDate`, if given and different from `isoDate`, makes this a
// multi-day all-day event (e.g. a 3-day trip): DTEND becomes the day AFTER
// endIsoDate, per the iCal/Google convention that DTEND is exclusive.
// `time` is ignored for multi-day ranges (a span of days has no single
// start/end clock time).
function buildDateTimes(isoDate, time, endIsoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (endIsoDate && endIsoDate !== isoDate) {
    const [ey, em, ed] = endIsoDate.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    const end = new Date(ey, em - 1, ed);
    end.setDate(end.getDate() + 1);
    return { start, end, allDay: true };
  }
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

export function googleCalendarUrl(title, isoDate, details = "", time = null, location = "", endIsoDate = null) {
  const { start, end, allDay } = buildDateTimes(isoDate, time, endIsoDate);
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

function isIOS() {
  // iPhone/iPad Safari ignores the <a download> attribute on blob: URLs,
  // so the normal "create blob + click hidden link" trick silently does
  // nothing there. iPadOS 13+ also reports as "MacIntel" but is touch-only,
  // so we check maxTouchPoints too.
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function downloadIcs(title, isoDate, details = "", time = null, location = "", endIsoDate = null) {
  const { start, end, allDay } = buildDateTimes(isoDate, time, endIsoDate);

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

  if (isIOS()) {
    // On iOS Safari, assigning window.location.href = "data:..." from a
    // script is silently blocked (it is not treated as a direct result of
    // the user gesture), so nothing visibly happens. The reliable method is
    // to create a real <a href="data:..."> anchor and dispatch a click on it
    // synchronously, inside the same click handler call stack: Safari then
    // opens its native "Add to Calendar" preview for the .ics content.
    const dataUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.setAttribute("download", `${slugify(title)}.ics`);
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 0);
    return;
  }

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

// Builds a single "Add to calendar" button that, on click, opens a
// centered modal with two big options: Google Calendar / Apple-iPhone
// Calendar (.ics). `getParams()` is called lazily each time an option is
// clicked, so the caller can always supply the latest title/time/location.
//
// Returns the wrapper DOM element — insert it wherever the two old
// buttons used to live.
export function createCalendarAddButton(getParams, labels) {
  const wrap = document.createElement("div");
  wrap.className = "cal-add-wrap";
  wrap.innerHTML = `<button class="btn cal-export cal-add-btn" type="button">${labels.addToCalendar}</button>`;

  const btn = wrap.querySelector(".cal-add-btn");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    openCalChoiceModal(getParams, labels);
  });

  return wrap;
}

function openCalChoiceModal(getParams, labels) {
  const overlay = document.createElement("div");
  overlay.className = "cal-choice-overlay open";
  overlay.innerHTML = `
    <div class="cal-choice-dialog">
      <button class="modal-close-btn" type="button" data-action="close">&times;</button>
      <h3 class="cal-choice-title">${labels.addToCalendar}</h3>
      <div class="cal-choice-options">
        <button class="cal-choice-opt" type="button" data-kind="google">
          <span class="cco-icon">📅</span>
          <span class="cco-label">${labels.google}</span>
        </button>
        <button class="cal-choice-opt" type="button" data-kind="apple">
          <span class="cco-icon">🍏</span>
          <span class="cco-label">${labels.apple}</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function close() { overlay.remove(); }

  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('[data-action="close"]').addEventListener("click", close);

  overlay.querySelectorAll(".cal-choice-opt").forEach(item => {
    item.addEventListener("click", () => {
      close();
      const { title, isoDate, details, time, location, endIsoDate } = getParams();
      if (item.dataset.kind === "google") {
        window.open(googleCalendarUrl(title, isoDate, details, time, location, endIsoDate), "_blank", "noopener");
      } else {
        downloadIcs(title, isoDate, details, time, location, endIsoDate);
      }
    });
  });
}
