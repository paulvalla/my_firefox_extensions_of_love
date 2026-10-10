/**
 * Options Page Script for Start Your Day Extension
 */

document.addEventListener("DOMContentLoaded", () => {
  const rulesListContainer = document.getElementById("rulesList");
  const openInNewWindowPref = document.getElementById("openInNewWindowPref");

  const saveBtn = document.getElementById("saveBtn");
  const addRuleBtn = document.getElementById("addRuleBtn");
  const addRuleBtn2 = document.getElementById("addRuleBtn2");
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFileInput = document.getElementById("importFileInput");
  const toast = document.getElementById("toast");

  let settings = { rules: [], openInNewWindow: false };
  let existingFirefoxContainers = [];

  // Toast Helper
  function showToast(message, isError = false) {
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${isError ? "error" : ""}`;
    setTimeout(() => {
      toast.className = "toast hidden";
    }, 3000);
  }

  // Render Rules Table
  function renderRules() {
    if (!rulesListContainer) return;
    rulesListContainer.innerHTML = "";

    if (!settings.rules || settings.rules.length === 0) {
      rulesListContainer.innerHTML = `
        <div class="empty-rules">
          No container rules defined yet.<br>Click "➕ Add Rule" or right-click any page and select "Add this page to Start My Day"!
        </div>
      `;
      return;
    }

    settings.rules.forEach((rule, index) => {
      const row = document.createElement("div");
      row.className = "rule-row";

      // 1. Reorder buttons
      const reorderDiv = document.createElement("div");
      reorderDiv.className = "reorder-btns";

      const moveUpBtn = document.createElement("button");
      moveUpBtn.className = "btn-icon-only";
      moveUpBtn.textContent = "▲";
      moveUpBtn.title = "Move Up";
      moveUpBtn.disabled = index === 0;
      moveUpBtn.addEventListener("click", () => moveRule(index, -1));

      const moveDownBtn = document.createElement("button");
      moveDownBtn.className = "btn-icon-only";
      moveDownBtn.textContent = "▼";
      moveDownBtn.title = "Move Down";
      moveDownBtn.disabled = index === settings.rules.length - 1;
      moveDownBtn.addEventListener("click", () => moveRule(index, 1));

      reorderDiv.appendChild(moveUpBtn);
      reorderDiv.appendChild(moveDownBtn);

      // 2. Active checkbox
      const activeDiv = document.createElement("div");
      activeDiv.className = "active-check";
      const activeCheckbox = document.createElement("input");
      activeCheckbox.type = "checkbox";
      activeCheckbox.checked = rule.enabled !== false;
      activeCheckbox.addEventListener("change", (e) => {
        rule.enabled = e.target.checked;
      });
      activeDiv.appendChild(activeCheckbox);

      // 3. URL input
      const urlInput = document.createElement("input");
      urlInput.type = "text";
      urlInput.className = "input-text";
      urlInput.placeholder = "e.g. mail.google.com or https://...";
      urlInput.value = rule.url || "";
      urlInput.addEventListener("input", (e) => {
        rule.url = e.target.value;
      });

      // 4. Target Container Select Dropdown with Native Firefox Badge
      const containerSelectContainer = document.createElement("div");
      containerSelectContainer.style.display = "flex";
      containerSelectContainer.style.alignItems = "center";
      containerSelectContainer.style.gap = "10px";

      // Native Firefox Container Badge (filled circle + icon or outline ring)
      const containerBadge = document.createElement("div");
      containerBadge.className = "firefox-container-badge";

      const containerSelect = document.createElement("select");
      containerSelect.className = "select-input";

      // Default (No Container) Option
      const defaultOpt = document.createElement("option");
      defaultOpt.value = "Default (No Container)";
      defaultOpt.textContent = "Default (No Container)";
      if (!rule.containerName || rule.containerName === "Default (No Container)" || rule.containerName === "firefox-default") {
        defaultOpt.selected = true;
      }
      containerSelect.appendChild(defaultOpt);

      // Populate existing Firefox containers cleanly with container.name
      existingFirefoxContainers.forEach((container) => {
        const opt = document.createElement("option");
        opt.value = container.name;
        opt.textContent = container.name;

        if (rule.containerName && rule.containerName.toLowerCase() === container.name.toLowerCase()) {
          opt.selected = true;
        }
        containerSelect.appendChild(opt);
      });

      // Handle custom or unlisted container names
      const knownNames = new Set(existingFirefoxContainers.map(c => c.name.toLowerCase()));
      knownNames.add("default (no container)");
      knownNames.add("firefox-default");

      if (rule.containerName && !knownNames.has(rule.containerName.toLowerCase())) {
        const customOpt = document.createElement("option");
        customOpt.value = rule.containerName;
        customOpt.textContent = rule.containerName;
        customOpt.selected = true;
        containerSelect.appendChild(customOpt);
      }

      // Update Native Badge visual state (reads container.colorCode & container.iconUrl directly from Firefox)
      function updateContainerBadge() {
        const selectedName = containerSelect.value;
        const matched = existingFirefoxContainers.find(
          c => c.name.toLowerCase() === (selectedName || "").toLowerCase()
        );

        containerBadge.innerHTML = "";

        if (matched) {
          const colorHex = matched.colorCode || getFirefoxContainerColorHex(matched.color);
          const hasCustomIcon = matched.icon && matched.icon !== "circle" && matched.iconUrl;

          if (hasCustomIcon) {
            containerBadge.className = "firefox-container-badge badge-solid";
            containerBadge.style.backgroundColor = colorHex;
            containerBadge.style.borderColor = "transparent";
            
            const img = document.createElement("img");
            img.src = matched.iconUrl;
            img.alt = matched.name;
            containerBadge.appendChild(img);
          } else {
            containerBadge.className = "firefox-container-badge badge-outline";
            containerBadge.style.borderColor = colorHex;
          }
        } else {
          containerBadge.className = "firefox-container-badge badge-outline";
          containerBadge.style.borderColor = "#808080";
          containerBadge.textContent = "🌐";
          containerBadge.style.fontSize = "12px";
        }
      }

      containerSelect.addEventListener("change", (e) => {
        rule.containerName = e.target.value;
        updateContainerBadge();
      });

      updateContainerBadge();

      containerSelectContainer.appendChild(containerBadge);
      containerSelectContainer.appendChild(containerSelect);

      // 5. Actions (Test & Delete)
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "row-actions";

      const testBtn = document.createElement("button");
      testBtn.className = "btn btn-sm btn-secondary";
      testBtn.textContent = "▶ Test";
      testBtn.title = "Test opening this URL";
      testBtn.addEventListener("click", async () => {
        if (!rule.url) {
          showToast("Please specify a URL first.", true);
          return;
        }
        try {
          await openRule(rule);
          showToast(`Opened tab in ${rule.containerName || "Default"}!`);
        } catch (err) {
          showToast(`Error: ${err.message}`, true);
        }
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-sm btn-danger";
      deleteBtn.textContent = "🗑️";
      deleteBtn.title = "Delete rule";
      deleteBtn.addEventListener("click", () => deleteRule(index));

      actionsDiv.appendChild(testBtn);
      actionsDiv.appendChild(deleteBtn);

      // Append columns to row
      row.appendChild(reorderDiv);
      row.appendChild(activeDiv);
      row.appendChild(urlInput);
      row.appendChild(containerSelectContainer);
      row.appendChild(actionsDiv);

      rulesListContainer.appendChild(row);
    });
  }

  // Move Rule
  function moveRule(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= settings.rules.length) return;
    const temp = settings.rules[index];
    settings.rules[index] = settings.rules[target];
    settings.rules[target] = temp;
    renderRules();
  }

  // Delete Rule
  function deleteRule(index) {
    settings.rules.splice(index, 1);
    renderRules();
  }

  // Add Rule
  function addRule() {
    settings.rules.push({
      id: Date.now().toString(),
      enabled: true,
      url: "",
      containerName: "Default (No Container)"
    });
    renderRules();
  }

  if (addRuleBtn) addRuleBtn.addEventListener("click", addRule);
  if (addRuleBtn2) addRuleBtn2.addEventListener("click", addRule);

  // Save Settings
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      settings.rules.forEach(r => {
        r.url = (r.url || "").trim();
        r.containerName = (r.containerName || "Default (No Container)").trim();
      });

      try {
        await saveSettings(settings);
        showToast("💾 Settings saved successfully!");
      } catch (err) {
        showToast(`Failed to save: ${err.message}`, true);
      }
    });
  }

  // Export Settings
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "start-your-day-container-rules.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  // Import Settings
  if (importBtn && importFileInput) {
    importBtn.addEventListener("click", () => {
      importFileInput.click();
    });

    importFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const importedData = JSON.parse(evt.target.result);
          if (Array.isArray(importedData.rules)) {
            settings.rules = importedData.rules;
            if (importedData.openInNewWindow !== undefined && openInNewWindowPref) {
              settings.openInNewWindow = importedData.openInNewWindow;
              openInNewWindowPref.checked = settings.openInNewWindow;
            }
            renderRules();
            showToast("📥 Rules imported successfully! Click Save to apply.");
          } else {
            showToast("Invalid JSON file structure.", true);
          }
        } catch (err) {
          showToast("Error parsing JSON file.", true);
        }
      };
      reader.readAsText(file);
      importFileInput.value = "";
    });
  }

  // Auto-refresh rules if settings change in storage
  browser.storage.onChanged.addListener((changes) => {
    if (changes.rules && changes.rules.newValue) {
      settings.rules = changes.rules.newValue;
      renderRules();
      showToast("Rules updated!");
    }
  });

  // Initial load
  async function init() {
    existingFirefoxContainers = await getAllFirefoxContainers();
    settings = await getSettings();

    if (openInNewWindowPref) {
      openInNewWindowPref.checked = !!settings.openInNewWindow;
      openInNewWindowPref.addEventListener("change", () => {
        settings.openInNewWindow = openInNewWindowPref.checked;
      });
    }

    renderRules();
  }

  init();
});
