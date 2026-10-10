/**
 * Background script for Start Your Day extension
 */

// Initialize default settings and context menus on install
browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    const existing = await getSettings();
    if (!existing.rules || existing.rules.length === 0) {
      await saveSettings({
        rules: DEFAULT_RULES,
        openInNewWindow: false
      });
    }
  }

  // Create context menu item for settings
  setupContextMenu();
});

// Also setup context menu on background startup
function setupContextMenu() {
  try {
    browser.contextMenus.removeAll().then(() => {
      browser.contextMenus.create({
        id: "open-container-settings",
        title: "⚙️ Configure Container URLs & Settings",
        contexts: ["action", "page"]
      });
    });
  } catch (e) {
    console.error("Context menu creation error:", e);
  }
}

// Call context menu setup on startup
setupContextMenu();

// Handle right-click context menu clicks
browser.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "open-container-settings") {
    if (browser.runtime.openOptionsPage) {
      browser.runtime.openOptionsPage().catch(() => {
        browser.tabs.create({ url: browser.runtime.getURL("options.html") });
      });
    } else {
      browser.tabs.create({ url: browser.runtime.getURL("options.html") });
    }
  }
});

// ONE-CLICK ACTION: Left-click on toolbar extension icon instantly opens all container tabs
browser.action.onClicked.addListener(async (tab) => {
  try {
    const settings = await getSettings();
    await openAllRules(settings.rules, settings.openInNewWindow);
  } catch (err) {
    console.error("Error launching Start My Day via toolbar action:", err);
  }
});

// Handle incoming runtime messages
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "START_MY_DAY") {
    return (async () => {
      try {
        const settings = await getSettings();
        const result = await openAllRules(settings.rules, message.openInNewWindow ?? settings.openInNewWindow);
        return { success: true, count: result.count };
      } catch (err) {
        console.error("Error launching Start My Day:", err);
        return { success: false, error: err.message };
      }
    })();
  }

  if (message.action === "LAUNCH_RULE") {
    return (async () => {
      try {
        await openRule(message.rule);
        return { success: true };
      } catch (err) {
        console.error("Error launching single rule:", err);
        return { success: false, error: err.message };
      }
    })();
  }
});
