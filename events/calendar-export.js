// Helpers to add an approved event date to Google Calendar or Apple/iPhone Calendar (.ics download)

function pad(n) { return String(n).padStart(2, "0"); }

// Build a Google Calendar "render" link for an all-day event.
export function googleCalendarUrl(title, isoDate, details = "") {
  const d = new Date(isoDate + "T00:00:00");
  const next = new Date(d);
  next.setDate(next.getDate() + 1);

  const fmt = (dt) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;
  const dates = `${fmt(d)}/${fmt(next)}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates,
    details: details || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Build and trigger download of an .ics file (works with Apple Calendar / iPhone / Outlook).
export function downloadIcs(title, isoDate, details = "") {
  const d = new Date(isoDate + "T00:00:00");
  const next = new Date(d);
  next.setDate(next.getDate() + 1);

  const fmt = (dt) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;

  const uid = `${Date.now()}@findadate`;
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}Z`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FindADate//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${fmt(d)}`,
    `DTEND:${fmt(next)}`,
    `SUMMARY:${escapeIcs(title)}`,
    details ? `DESCRIPTION:${escapeIcs(details)}` : "",
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
