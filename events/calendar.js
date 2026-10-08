// Reusable visual month-calendar component.
//
// Modes:
//   "pick-free"  -> uses a mode toggle (Available / Tentative) above the grid;
//                   clicking a day sets/clears that state directly (no blind
//                   click-cycling). Optionally shows a small count badge of
//                   how many other people already marked that day (via
//                   `counts`), even while picking.
//   "display"    -> read-only heatmap, no clicking. Colored by `counts` vs `maxCount`.
//
// Weeks start on Monday.
//
// Usage:
//   const cal = new MonthCalendar(containerEl, {
//     mode: "pick-free" | "display",
//     available: Set<"YYYY-MM-DD">,
//     tentative: Set<"YYYY-MM-DD">,
//     counts: { "YYYY-MM-DD": number },   // how many people (total incl. +1) marked this day
//     maxCount: number,
//     approvedDate: "YYYY-MM-DD" | null,
//     onChange: (iso, state) => {}
//   });

// Fixed-date public holidays that apply every year in Spain / Catalonia /
// Barcelona (city). Only FIXED (same day/month every year) holidays are
// listed here on purpose - moving ones (Good Friday, Easter Monday, and
// Barcelona's own "Lunes de Pascua Granada" / "La Mercè" week shifts in
// some years) are not included since they are not reliably fixed; add
// them per-year below (MOVABLE_HOLIDAYS) if/when needed.
// Format: "MM-DD" -> label (label unused in UI for now, kept for clarity).
const FIXED_HOLIDAYS = {
  "01-01": "Año nuevo",
  "01-06": "Epifanía del Señor (Reyes)",
  "05-01": "Día del Trabajo",
  "06-24": "San Juan",
  "08-15": "Asunción de la Virgen",
  "09-11": "Diada Nacional de Catalunya",
  "09-24": "La Mercè (festivo local Barcelona)",
  "10-12": "Fiesta Nacional de España",
  "11-01": "Todos los Santos",
  "12-06": "Día de la Constitución",
  "12-08": "Inmaculada Concepción",
  "12-25": "Navidad",
  "12-26": "San Esteban (festivo local Barcelona/Catalunya)"
};

function isFixedHoliday(y, m, d) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return Object.prototype.hasOwnProperty.call(FIXED_HOLIDAYS, `${mm}-${dd}`);
}

export class MonthCalendar {
  constructor(container, opts = {}) {
    this.container = container;
    this.mode = opts.mode || "pick-free";
    this.available = opts.available || new Set();
    this.tentative = opts.tentative || new Set();
    this.counts = opts.counts || {};
    this.maxCount = opts.maxCount || 1;
    this.approvedDate = opts.approvedDate || null;
    this.approvedEndDate = opts.approvedEndDate || null;
    this.onChange = opts.onChange || (() => {});
    this.onDayClick = opts.onDayClick || null;
    this.showCountBadges = opts.showCountBadges !== false;
    this.pickMode = "available"; // which state clicking a day applies, in "pick-free" mode
    this.pickModeLabels = opts.pickModeLabels || { available: "Available", tentative: "Tentative" };
    // "mini" is used when several small read-only calendars are shown
    // side by side (one per month that has votes) - no month-nav arrows,
    // smaller cells, fixed to the month it was created for.
    this.mini = !!opts.mini;

    const today = new Date();
    this.viewYear = opts.initialYear != null ? opts.initialYear : today.getFullYear();
    this.viewMonth = opts.initialMonth != null ? opts.initialMonth : today.getMonth();
  }

  isoOf(y, m, d) {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  heatLevel(count) {
    if (!count) return 0;
    const ratio = count / Math.max(this.maxCount, 1);
    if (ratio >= 0.99) return 5;
    if (ratio >= 0.75) return 4;
    if (ratio >= 0.5) return 3;
    if (ratio >= 0.25) return 2;
    return 1;
  }

  render() {
    const y = this.viewYear, m = this.viewMonth;
    const first = new Date(y, m, 1);
    // Monday-start week: getDay() is 0=Sun..6=Sat, shift so Monday=0.
    const startWeekday = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const langShort = document.documentElement.lang || "en";
    const localeMap = { ca: "ca-ES", es: "es-ES", en: "en-US" };
    const localeCode = localeMap[langShort] || langShort;
    const monthLabel = first.toLocaleDateString(localeCode, { month: "long", year: "numeric" });

    const todayIso = this.isoOf(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    // Monday-start weekday labels, in the current language, derived from Intl so they're always correct.
    const weekdayLabels = [1, 2, 3, 4, 5, 6, 7].map(dow => {
      // 2024-01-01 was a Monday; dow-1 days later gives Mon..Sun.
      const d = new Date(2024, 0, 1 + (dow - 1));
      return d.toLocaleDateString(localeCode, { weekday: "short" }).replace(".", "").slice(0, 3);
    });

    let html = `
      <div class="calendar-header">
        ${this.mini ? "" : `<button class="cal-nav-btn" data-nav="-1" type="button">&lsaquo;</button>`}
        <div class="cal-title">${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</div>
        ${this.mini ? "" : `<button class="cal-nav-btn" data-nav="1" type="button">&rsaquo;</button>`}
      </div>
    `;

    if (this.mode === "pick-free") {
      html += `
        <div class="pick-mode-toggle" role="group">
          <button type="button" class="pick-mode-btn ${this.pickMode === "available" ? "active" : ""}" data-mode="available">
            <span class="pmb-dot pmb-available"></span><span class="pmb-label"></span>
          </button>
          <button type="button" class="pick-mode-btn ${this.pickMode === "tentative" ? "active" : ""}" data-mode="tentative">
            <span class="pmb-dot pmb-tentative"></span><span class="pmb-label"></span>
          </button>
        </div>
      `;
    }

    html += `<div class="cal-grid">`;
    weekdayLabels.forEach((w, idx) => {
      const isWeekend = idx === 5 || idx === 6; // Sat, Sun in Monday-start layout
      html += `<div class="cal-weekday${isWeekend ? " cal-weekday-weekend" : ""}">${w}</div>`;
    });
    for (let i = 0; i < startWeekday; i++) html += `<div class="cal-day empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = this.isoOf(y, m, d);
      let classes = ["cal-day"];
      let badge = "";
      let extra = "";

      const dowMondayStart = (new Date(y, m, d).getDay() + 6) % 7;
      const isWeekendDay = dowMondayStart === 5 || dowMondayStart === 6;
      if (isWeekendDay) classes.push("cal-day-weekend");
      else if (isFixedHoliday(y, m, d)) classes.push("cal-day-holiday");

      if (this.mode === "pick-free") {
        classes.push("candidate");
        if (this.available.has(iso)) { classes.push("state-available"); extra = `<span class="state-icon">✓</span>`; }
        else if (this.tentative.has(iso)) { classes.push("state-tentative"); extra = `<span class="state-icon">~</span>`; }

        const count = this.counts[iso] || 0;
        if (this.showCountBadges && count > 0) {
          badge = `<span class="count-badge">${count}</span>`;
        }
      } else if (this.mode === "display") {
        const count = this.counts[iso] || 0;
        if (count > 0) {
          const level = this.heatLevel(count);
          classes.push(`heat-${level}`);
          badge = `<span class="count-badge">${count}</span>`;
          if (this.onDayClick) classes.push("cal-day-clickable");
        }
        if (this.isApprovedIso(iso)) {
          classes.push("approved-day");
          extra = `<span class="approved-star">★</span>`;
        }
      }

      if (iso === todayIso) classes.push("today-marker");

      html += `<div class="${classes.join(" ")}" data-iso="${iso}">${extra}<span class="cal-day-num">${d}</span>${badge}</div>`;
    }

    html += `</div>`;
    this.container.innerHTML = html;
    if (this.mini) this.container.classList.add("calendar-mini");

    this.container.querySelectorAll(".pick-mode-btn").forEach(btn => {
      const lbl = btn.querySelector(".pmb-label");
      if (lbl) lbl.textContent = this.pickModeLabels[btn.dataset.mode] || btn.dataset.mode;
      btn.addEventListener("click", () => {
        this.pickMode = btn.dataset.mode;
        this.render();
      });
    });

    this.container.querySelectorAll(".cal-nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const delta = parseInt(btn.dataset.nav, 10);
        this.viewMonth += delta;
        if (this.viewMonth < 0) { this.viewMonth = 11; this.viewYear--; }
        if (this.viewMonth > 11) { this.viewMonth = 0; this.viewYear++; }
        this.render();
      });
    });

    if (this.mode === "pick-free") {
      this.container.querySelectorAll(".cal-day.candidate").forEach(dayEl => {
        dayEl.addEventListener("click", () => {
          const iso = dayEl.dataset.iso;
          const targetSet = this.pickMode === "tentative" ? this.tentative : this.available;
          const otherSet = this.pickMode === "tentative" ? this.available : this.tentative;
          otherSet.delete(iso);
          if (targetSet.has(iso)) {
            targetSet.delete(iso);
            this.onChange(iso, "none");
          } else {
            targetSet.add(iso);
            this.onChange(iso, this.pickMode);
          }
          this.render();
        });
      });
    } else if (this.mode === "display" && this.onDayClick) {
      this.container.querySelectorAll(".cal-day-clickable").forEach(dayEl => {
        dayEl.addEventListener("click", () => this.onDayClick(dayEl.dataset.iso));
      });
    }
  }

  getAvailable() { return Array.from(this.available); }
  getTentative() { return Array.from(this.tentative); }

  setState(availableArr, tentativeArr) {
    this.available = new Set(availableArr || []);
    this.tentative = new Set(tentativeArr || []);
    this.render();
  }

  setCounts(counts, maxCount) {
    this.counts = counts;
    this.maxCount = maxCount || 1;
    this.render();
  }

  // Returns true for `iso` if it's the single approved day, or falls
  // inside the approved [approvedDate, approvedEndDate] range (inclusive)
  // when a multi-day range was approved.
  isApprovedIso(iso) {
    if (!this.approvedDate) return false;
    if (!this.approvedEndDate || this.approvedEndDate === this.approvedDate) {
      return this.approvedDate === iso;
    }
    return iso >= this.approvedDate && iso <= this.approvedEndDate;
  }

  setApprovedDate(iso, endIso = null) {
    this.approvedDate = iso;
    this.approvedEndDate = endIso;
    this.render();
  }

  jumpToMonthOf(iso) {
    const d = new Date(iso + "T00:00:00");
    this.viewYear = d.getFullYear();
    this.viewMonth = d.getMonth();
    this.render();
  }
}
