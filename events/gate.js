// Lightweight client-side password gate.
// NOT real security (static site, no server) - just a friendly barrier
// so random visitors don't stumble into the planning tool.
// The password is intentionally simple; anyone determined could read
// the source and find it. Good enough for sharing with friends.

const GATE_PASSWORDS = { "gay": "guest", "admin": "admin" };
const GATE_SESSION_KEY = "findadate:unlocked";
const GATE_ROLE_KEY = "findadate:role";

function buildOverlay(isSwitch) {
  const overlay = document.createElement("div");
  overlay.id = "gate-overlay";
  overlay.innerHTML = `
    <div class="gate-card">
      <div class="gate-icon">🔒</div>
      <h2>${isSwitch ? "Switch role" : "Private area"}</h2>
      <p>${isSwitch ? "Enter a password to switch role." : "Enter the password to continue."}</p>
      <input type="password" id="gate-password" placeholder="Password" autocomplete="off">
      <button class="btn block" id="gate-submit" type="button">Enter</button>
      ${isSwitch ? `<button class="btn block secondary" id="gate-cancel" type="button" style="margin-top:8px;">Cancel</button>` : ""}
      <p class="gate-error" id="gate-error"></p>
    </div>
  `;
  const style = document.createElement("style");
  style.textContent = `
    #gate-overlay {
      position: fixed; inset: 0; z-index: 10000;
      background: rgba(245,245,247,0.96);
      backdrop-filter: saturate(180%) blur(20px);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .gate-card {
      background: #ffffff;
      border-radius: 24px;
      padding: 44px 38px;
      max-width: 360px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.12);
    }
    .gate-icon { font-size: 40px; margin-bottom: 14px; }
    .gate-card h2 { font-size: 22px; font-weight: 600; margin: 0 0 8px; color: #1d1d1f; }
    .gate-card p { color: #6e6e73; font-size: 14px; margin: 0 0 20px; }
    .gate-card input {
      width: 100%; padding: 13px 16px; border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.1); background: #fafafa;
      font-size: 15px; margin-bottom: 14px; text-align: center;
      font-family: inherit;
    }
    .gate-card input:focus { outline: none; border-color: #0071e3; background: #fff; }
    .gate-error { color: #ff3b30; font-size: 13px; min-height: 18px; margin: 10px 0 0; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  const input = overlay.querySelector("#gate-password");
  const submitBtn = overlay.querySelector("#gate-submit");
  const errorEl = overlay.querySelector("#gate-error");

  function tryUnlock() {
    const role = GATE_PASSWORDS[input.value];
    if (role) {
      sessionStorage.setItem(GATE_SESSION_KEY, "1");
      sessionStorage.setItem(GATE_ROLE_KEY, role);
      overlay.remove();
      style.remove();
      if (isSwitch) window.location.reload();
    } else {
      errorEl.textContent = "Incorrect password, try again.";
      input.value = "";
      input.focus();
    }
  }

  submitBtn.addEventListener("click", tryUnlock);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });
  if (isSwitch) {
    overlay.querySelector("#gate-cancel").addEventListener("click", () => {
      overlay.remove();
      style.remove();
    });
  }
  setTimeout(() => input.focus(), 50);
}

if (sessionStorage.getItem(GATE_SESSION_KEY) !== "1") {
  // Hide content immediately to avoid any flash, then show the gate.
  document.documentElement.style.visibility = "hidden";
  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.style.visibility = "visible";
    buildOverlay();
  });
}

// Exposed globally (gate.js is a plain classic script, loaded before the
// module scripts) so home.js/app.js can check the current user's role
// without re-implementing the password/session logic.
window.isAdmin = function () {
  return sessionStorage.getItem(GATE_ROLE_KEY) === "admin";
};

// Lets the user re-enter a password mid-session to switch role (e.g. from
// guest to admin) without needing a new tab/incognito window. On success
// the page reloads so every admin-gated button re-renders correctly.
window.openRoleSwitcher = function () {
  buildOverlay(true);
};

window.currentRole = function () {
  return sessionStorage.getItem(GATE_ROLE_KEY) || "guest";
};

// Plain hardcoded label text (not run through the i18n module, which is a
// separate ES module loaded later) - just enough for guest/admin to read
// clearly as a labeled chip instead of a bare icon on mobile.
const ROLE_LABELS = {
  ca: { guest: "Convidat", admin: "Admin" },
  es: { guest: "Invitado", admin: "Admin" },
  en: { guest: "Guest", admin: "Admin" }
};

function currentLangForLabel() {
  try {
    return localStorage.getItem("findadate:lang") || "ca";
  } catch (e) { return "ca"; }
}

function refreshRoleLabel() {
  const labelEl = document.querySelector("[data-role-label]");
  if (!labelEl) return;
  const lang = currentLangForLabel();
  const labels = ROLE_LABELS[lang] || ROLE_LABELS.ca;
  labelEl.textContent = window.isAdmin() ? labels.admin : labels.guest;
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("role-switch-btn");
  if (btn) btn.addEventListener("click", () => window.openRoleSwitcher());
  refreshRoleLabel();
});
