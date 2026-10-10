/**
 * Popup Script for Start Your Day Extension
 */

document.addEventListener("DOMContentLoaded", () => {
  const startMyDayBtn = document.getElementById("startMyDayBtn");
  const launchBtnText = document.getElementById("launchBtnText");
  const openInNewWindowToggle = document.getElementById("openInNewWindowToggle");
  const openSettingsBtn = document.getElementById("openSettingsBtn");
  const manageRulesBtn = document.getElementById("manageRulesBtn");
  const rulesListContainer = document.getElementById("rulesList");
  const linkCountBadge = document.getElementById("linkCountBadge");
  const statusToast = document.getElementById("statusToast");

  let currentSettings = { rules: DEFAULT_RULES, openInNewWindow: false };

  // Helper to open options page reliably in Firefox
  function openOptionsPage() {
    try {
      if (browser.runtime.openOptionsPage) {
        browser.runtime.openOptionsPage().catch(() => {
          browser.tabs.create({ url: browser.runtime.getURL("options.html") });
        });
      } else {
        browser.tabs.create({ url: browser.runtime.getURL("options.html") });
      }
    } catch (e) {
      browser.tabs.create({ url: browser.runtime.getURL("options.html") });
    }
  }

  // Toast message helper
  function showToast(message, isError = false) {
    if (!statusToast) return;
    statusToast.textContent = message;
    statusToast.className = `status-toast ${isError ? "error" : ""}`;
    setTimeout(() => {
      statusToast.className = "status-toast hidden";
    }, 2500);
  }

  // ATTACH CLICK LISTENERS IMMEDIATELY
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openOptionsPage();
    });
  }

  if (manageRulesBtn) {
    manageRulesBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openOptionsPage();
    });
  }

  if (startMyDayBtn) {
    startMyDayBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      startMyDayBtn.disabled = true;
      if (launchBtnText) launchBtnText.textContent = "Launching tabs...";

      try {
        const useNewWindow = openInNewWindowToggle ? openInNewWindowToggle.checked : false;
        const result = await openAllRules(currentSettings.rules, useNewWindow);
        showToast(`🚀 Opened ${result.count} tabs in containers!`);
        setTimeout(() => {
          window.close();
        }, 600);
      } catch (err) {
        console.error("Error launching tabs:", err);
        showToast(`Error: ${err.message}`, true);
        startMyDayBtn.disabled = false;
        if (launchBtnText) launchBtnText.textContent = "Start My Day";
      }
    });
  }

  // Render Rules list
  function renderRules() {
    if (!rulesListContainer) return;
    rulesListContainer.innerHTML = "";

    const activeRules = (currentSettings.rules || []).filter(r => r.enabled !== false);
    if (linkCountBadge) linkCountBadge.textContent = activeRules.length;

    if (activeRules.length === 0) {
      rulesListContainer.innerHTML = `
        <div class="empty-state">
          No active links configured.<br>Click settings to add your URLs!
        </div>
      `;
      if (launchBtnText) launchBtnText.textContent = "Start My Day";
      return;
    }

    if (launchBtnText) {
      launchBtnText.textContent = `Start My Day (${activeRules.length} ${activeRules.length === 1 ? 'tab' : 'tabs'})`;
    }

    activeRules.forEach((rule) => {
      const item = document.createElement("div");
      item.className = "rule-item";

      const colorHex = getColorHex(rule.color);

      let displayUrl = rule.url;
      try {
        const parsed = new URL(normalizeUrl(rule.url));
        displayUrl = parsed.hostname + (parsed.pathname !== "/" ? parsed.pathname : "");
      } catch (e) {}

      item.innerHTML = `
        <div class="rule-info">
          <div class="rule-url" title="${rule.url}">${displayUrl}</div>
          <div class="container-badge" style="background-color: ${colorHex}">
            🏷️ ${rule.containerName || "Default"}
          </div>
        </div>
        <button class="launch-single-btn" title="Open this tab now">▶</button>
      `;

      const singleBtn = item.querySelector(".launch-single-btn");
      if (singleBtn) {
        singleBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          singleBtn.textContent = "⌛";
          try {
            await openRule(rule);
            showToast(`Opened ${rule.containerName}!`);
          } catch (err) {
            showToast(`Error: ${err.message}`, true);
          } finally {
            singleBtn.textContent = "▶";
          }
        });
      }

      rulesListContainer.appendChild(item);
    });
  }

  // Load state and populate toggle & list
  async function loadData() {
    currentSettings = await getSettings();
    if (openInNewWindowToggle) {
      openInNewWindowToggle.checked = !!currentSettings.openInNewWindow;
      openInNewWindowToggle.addEventListener("change", async () => {
        currentSettings.openInNewWindow = openInNewWindowToggle.checked;
        await saveSettings(currentSettings);
      });
    }
    renderRules();
  }

  loadData();
});
