// Lightweight client-side password gate.
// NOT real security (static site, no server) - just a friendly barrier
// so random visitors don't stumble into the planning tool.
// The password is intentionally simple; anyone determined could read
// the source and find it. Good enough for sharing with friends.

const GATE_PASSWORD = "gay";
const GATE_SESSION_KEY = "findadate:unlocked";

function buildOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "gate-overlay";
  overlay.innerHTML = `
    <div class="gate-card">
      <div class="gate-icon">🔒</div>
      <h2>Private area</h2>
      <p>Enter the password to continue.</p>
      <input type="password" id="gate-password" placeholder="Password" autocomplete="off">
      <button class="btn block" id="gate-submit" type="button">Enter</button>
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
    if (input.value === GATE_PASSWORD) {
      sessionStorage.setItem(GATE_SESSION_KEY, "1");
      overlay.remove();
      style.remove();
    } else {
      errorEl.textContent = "Incorrect password, try again.";
      input.value = "";
      input.focus();
    }
  }

  submitBtn.addEventListener("click", tryUnlock);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });
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
