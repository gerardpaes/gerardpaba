// Reusable visual month-calendar component.
// Usage:
//   const cal = new MonthCalendar(containerEl, {
//     mode: "pick-any"      // home page: user can click any day to propose it
//           | "pick-from"   // event page: user can only click days in `candidateDates`
//           | "display"     // results heatmap: no clicking, just show counts/colors
//     selected: Set() of "YYYY-MM-DD" currently selected/highlighted
//     candidateDates: array of "YYYY-MM-DD" allowed to be picked (for pick-from/display)
//     counts: map of "YYYY-MM-DD" -> number (for heatmap coloring in display mode)
//     maxCount: number used to scale heat levels
//     onToggle: (iso) => {} called when a day is clicked (pick-any / pick-from)
//   });
//   cal.render();
//   cal.getSelected() -> Array<string>

export class MonthCalendar {
  constructor(container, opts = {}) {
    this.container = container;
    this.mode = opts.mode || "pick-any";
    this.selected = opts.selected || new Set();
    this.candidateDates = new Set(opts.candidateDates || []);
    this.counts = opts.counts || {};
    this.maxCount = opts.maxCount || 1;
    this.onToggle = opts.onToggle || (() => {});

    const today = new Date();
    this.viewYear = today.getFullYear();
    this.viewMonth = today.getMonth(); // 0-indexed

    // If displaying candidate dates, jump to the month of the first one
    if (this.candidateDates.size > 0) {
      const first = Array.from(this.candidateDates).sort()[0];
      const d = new Date(first + "T00:00:00");
      this.viewYear = d.getFullYear();
      this.viewMonth = d.getMonth();
    }
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
    const startWeekday = first.getDay(); // 0=Sun
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    const todayIso = this.isoOf(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"];

    let html = `
      <div class="calendar-header">
        <button class="cal-nav-btn" data-nav="-1" type="button">&lsaquo;</button>
        <div class="cal-title">${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</div>
        <button class="cal-nav-btn" data-nav="1" type="button">&rsaquo;</button>
      </div>
      <div class="cal-grid">
    `;

    weekdayLabels.forEach(w => { html += `<div class="cal-weekday">${w}</div>`; });

    for (let i = 0; i < startWeekday; i++) {
      html += `<div class="cal-day empty"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = this.isoOf(y, m, d);
      let classes = ["cal-day"];
      let badge = "";

      if (this.mode === "pick-any") {
        classes.push("candidate");
        if (this.selected.has(iso)) classes.push("selected");
      } else if (this.mode === "pick-from") {
        if (this.candidateDates.has(iso)) {
          classes.push("candidate");
          if (this.selected.has(iso)) classes.push("selected");
        }
      } else if (this.mode === "display") {
        if (this.candidateDates.has(iso)) {
          const count = this.counts[iso] || 0;
          const level = this.heatLevel(count);
          if (level > 0) classes.push(`heat-${level}`);
          else classes.push("candidate");
          if (count > 0) badge = `<span class="count-badge">${count}</span>`;
        }
      }

      if (iso === todayIso) classes.push("today-marker");

      html += `<div class="${classes.join(" ")}" data-iso="${iso}">${d}${badge}</div>`;
    }

    html += `</div>`;
    this.container.innerHTML = html;

    this.container.querySelectorAll(".cal-nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const delta = parseInt(btn.dataset.nav, 10);
        this.viewMonth += delta;
        if (this.viewMonth < 0) { this.viewMonth = 11; this.viewYear--; }
        if (this.viewMonth > 11) { this.viewMonth = 0; this.viewYear++; }
        this.render();
      });
    });

    if (this.mode !== "display") {
      this.container.querySelectorAll(".cal-day.candidate").forEach(dayEl => {
        dayEl.addEventListener("click", () => {
          const iso = dayEl.dataset.iso;
          if (this.selected.has(iso)) this.selected.delete(iso);
          else this.selected.add(iso);
          this.onToggle(iso, this.selected);
          this.render();
        });
      });
    }
  }

  getSelected() {
    return Array.from(this.selected);
  }

  setSelected(arr) {
    this.selected = new Set(arr);
    this.render();
  }

  setCandidateDates(arr) {
    this.candidateDates = new Set(arr);
    this.render();
  }

  setCounts(counts, maxCount) {
    this.counts = counts;
    this.maxCount = maxCount || 1;
    this.render();
  }
}
