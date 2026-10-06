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
  // iPhone/iPad ignore the <a download> attribute on blob: URLs, so the
  // normal "create blob + click hidden link" trick silently does nothing
  // there. iPadOS 13+ also reports as "MacIntel" but is touch-only, so we
  // check maxTouchPoints too.
  //
  // Note: this intentionally matches ANY browser on iOS (Chrome, Firefox,
  // Edge...), not just Safari by name. Apple forces every iOS browser to
  // run on the WebKit engine under the hood (its own rendering/JS engines
  // are banned on iOS), so "Chrome on iPhone" has the exact same data:-URI
  // and calendar-handoff behavior as Safari. Detecting the OS, not the
  // browser name, is correct here.
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
    // the user gesture), so a real <a href="data:..."> anchor + synchronous
    // .click() inside the same user-gesture call stack is used instead.
    //
    // Important gotchas (learned the hard way, two prior attempts failed):
    // 1. The anchor must NOT be `display:none` - WebKit treats it as
    //    "not interactable" and silently ignores .click(). Give it real
    //    layout, just moved off-screen.
    // 2. Do NOT set `download` together with a `data:` URI: that makes
    //    Safari try to save it as a file instead of previewing it.
    // 3. Do NOT set `target="_blank"`: Safari's native "Add Event" sheet
    //    for a data:text/calendar resource is only triggered on a
    //    top-level, SAME-TAB navigation. Opening it in a new tab/popup
    //    context just shows a blank tab and never hands off to Calendar.
    //    The anchor must navigate the current window.
    const dataUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.style.position = "fixed";
    a.style.top = "-1000px";
    a.style.left = "-1000px";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 1000);
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

// Builds a single "Add to calendar" button that, on click, opens Google
// Calendar directly with the event prefilled - no menu/modal anymore.
//
// Apple/iPhone Calendar (.ics via a data: URI) was removed: despite
// several fix attempts, it kept failing to trigger the native "Add Event"
// sheet reliably across iOS versions/browsers. Google Calendar works
// everywhere (including on iPhone, where it opens in Safari and the user
// can still add it to their calendar from there), so it's simpler and
// more reliable to only offer that one option.
//
// `getParams()` is called lazily on click, so the caller can always
// supply the latest title/time/location.
//
// Returns the wrapper DOM element — insert it wherever the old button lived.
export function createCalendarAddButton(getParams, labels) {
  const wrap = document.createElement("div");
  wrap.className = "cal-add-wrap";
  wrap.innerHTML = `<button class="btn cal-export cal-add-btn" type="button">${labels.addToCalendar}</button>`;

  const btn = wrap.querySelector(".cal-add-btn");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const { title, isoDate, details, time, location, endIsoDate } = getParams();
    window.open(googleCalendarUrl(title, isoDate, details, time, location, endIsoDate), "_blank", "noopener");
  });

  return wrap;
}
