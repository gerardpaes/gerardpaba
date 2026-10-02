// Helpers to add an approved event date (optionally with a time) to
// Google Calendar or Apple/iPhone Calendar (.ics download).
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

export function googleCalendarUrl(title, isoDate, details = "", time = null) {
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
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcs(title, isoDate, details = "", time = null) {
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
