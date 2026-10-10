/**
 * Background script for Start Your Day extension
 */

// Initialize default settings and context menus on install
browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    const existing = await getSettings();
    if (!existing.rules) {
      await saveSettings({
        rules: DEFAULT_RULES,
        openInNewWindow: false
      });
    }
  }

  setupContextMenu();
});

// Setup context menu items
function setupContextMenu() {
  try {
    browser.contextMenus.removeAll().then(() => {
      // Right-click extension toolbar icon -> Settings
      browser.contextMenus.create({
        id: "open-container-settings",
        title: "Configure Container URLs & Settings",
        contexts: ["action"]
      });

      // Right-click anywhere on web page -> Add page to Start My Day
      browser.contextMenus.create({
        id: "add-page-to-start-my-day",
        title: "Add this page to Start My Day",
        contexts: ["page"]
      });
    });
  } catch (e) {
    console.error("Context menu creation error:", e);
  }
}

// Call context menu setup on startup
setupContextMenu();

// Handle context menu clicks
browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "open-container-settings") {
    openOptionsPage();
    return;
  }

  if (info.menuItemId === "add-page-to-start-my-day" && tab) {
    try {
      const targetUrl = info.pageUrl || tab.url;
      if (!targetUrl || targetUrl.startsWith("about:") || targetUrl.startsWith("chrome://")) {
        return;
      }

      let containerName = "Default (No Container)";

      // Look up container name from tab's cookieStoreId
      if (tab.cookieStoreId && tab.cookieStoreId !== "firefox-default" && browser.contextualIdentities) {
        try {
          const container = await browser.contextualIdentities.get(tab.cookieStoreId);
          if (container && container.name) {
            containerName = container.name;
          }
        } catch (e) {
          console.warn("Could not fetch contextual identity for cookieStoreId:", tab.cookieStoreId, e);
        }
      }

      // Append new rule to settings
      const settings = await getSettings();
      if (!settings.rules) settings.rules = [];

      settings.rules.push({
        id: Date.now().toString(),
        enabled: true,
        url: targetUrl,
        containerName: containerName
      });

      await saveSettings(settings);

      // Open options page to show the newly added rule
      openOptionsPage();
    } catch (err) {
      console.error("Error adding page to Start My Day:", err);
    }
  }
});

// Helper to open options page
function openOptionsPage() {
  if (browser.runtime.openOptionsPage) {
    browser.runtime.openOptionsPage().catch(() => {
      browser.tabs.create({ url: browser.runtime.getURL("options.html") });
    });
  } else {
    browser.tabs.create({ url: browser.runtime.getURL("options.html") });
  }
}

// ONE-CLICK ACTION: Left-click on toolbar extension icon instantly opens all container tabs
browser.action.onClicked.addListener(async () => {
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
