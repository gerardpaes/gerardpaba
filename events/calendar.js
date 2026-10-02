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

export class MonthCalendar {
  constructor(container, opts = {}) {
    this.container = container;
    this.mode = opts.mode || "pick-free";
    this.available = opts.available || new Set();
    this.tentative = opts.tentative || new Set();
    this.counts = opts.counts || {};
    this.maxCount = opts.maxCount || 1;
    this.approvedDate = opts.approvedDate || null;
    this.onChange = opts.onChange || (() => {});
    this.showCountBadges = opts.showCountBadges !== false;
    this.pickMode = "available"; // which state clicking a day applies, in "pick-free" mode
    this.pickModeLabels = opts.pickModeLabels || { available: "Available", tentative: "Tentative" };

    const today = new Date();
    this.viewYear = today.getFullYear();
    this.viewMonth = today.getMonth();
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
    const localeCode = document.documentElement.lang || "en";
    const monthLabel = first.toLocaleDateString(localeCode, { month: "long", year: "numeric" });

    const todayIso = this.isoOf(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];

    let html = `
      <div class="calendar-header">
        <button class="cal-nav-btn" data-nav="-1" type="button">&lsaquo;</button>
        <div class="cal-title">${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</div>
        <button class="cal-nav-btn" data-nav="1" type="button">&rsaquo;</button>
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
    weekdayLabels.forEach(w => { html += `<div class="cal-weekday">${w}</div>`; });
    for (let i = 0; i < startWeekday; i++) html += `<div class="cal-day empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = this.isoOf(y, m, d);
      let classes = ["cal-day"];
      let badge = "";
      let extra = "";

      if (this.mode === "pick-free") {
        classes.push("candidate");
        if (this.available.has(iso)) { classes.push("state-available"); extra = `<span class="state-icon">✓</span>`; }
        else if (this.tentative.has(iso)) { classes.push("state-tentative"); extra = `<span class="state-icon">?</span>`; }

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
        }
        if (this.approvedDate === iso) {
          classes.push("approved-day");
          extra = `<span class="approved-star">★</span>`;
        }
      }

      if (iso === todayIso) classes.push("today-marker");

      html += `<div class="${classes.join(" ")}" data-iso="${iso}">${extra}${d}${badge}</div>`;
    }

    html += `</div>`;
    this.container.innerHTML = html;

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

  setApprovedDate(iso) {
    this.approvedDate = iso;
    this.render();
  }

  jumpToMonthOf(iso) {
    const d = new Date(iso + "T00:00:00");
    this.viewYear = d.getFullYear();
    this.viewMonth = d.getMonth();
    this.render();
  }
}
