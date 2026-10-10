// Set initial state on install
browser.runtime.onInstalled.addListener(() => {
  // We no longer store global 'enabled' in storage to avoid multi-tab desync.
  browser.action.setBadgeText({ text: "OFF" });
  browser.action.setBadgeBackgroundColor({ color: "#777777" });
});

// Handle the extension icon click
browser.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  // Use the tab-specific badge text as the source of truth for current state
  const currentBadge = await browser.action.getBadgeText({ tabId: tab.id });
  const nextState = currentBadge !== "ON";

  // Check if content script is already injected in this tab
  let isScriptInjected = false;
  try {
    const response = await browser.tabs.sendMessage(tab.id, { action: "ping" });
    if (response && response.pong) {
      isScriptInjected = true;
    }
  } catch (e) {
    // Expected to throw an error if the content script is not yet injected
  }

  if (nextState) {
    // Turn ON
    browser.action.setBadgeText({ text: "ON", tabId: tab.id });
    browser.action.setBadgeBackgroundColor({ color: "#00AA00", tabId: tab.id });
    browser.action.setTitle({ title: "Force Paste: ON", tabId: tab.id });
    browser.action.setIcon({ path: "icon-on.svg", tabId: tab.id });

    if (isScriptInjected) {
      // Content script exists, tell it to enable rules
      try {
        await browser.tabs.sendMessage(tab.id, { action: "enable" });
      } catch (e) {
        console.error("Error sending enable message:", e);
      }
    } else {
      // Inject the content script for the first time
      try {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
      } catch (e) {
        console.error("Failed to inject script into tab:", e);
      }
    }
  } else {
    // Turn OFF
    browser.action.setBadgeText({ text: "OFF", tabId: tab.id });
    browser.action.setBadgeBackgroundColor({ color: "#777777", tabId: tab.id });
    browser.action.setTitle({ title: "Force Paste: OFF", tabId: tab.id });
    browser.action.setIcon({ path: "icon-off.svg", tabId: tab.id });

    if (isScriptInjected) {
      // Content script exists, tell it to disable rules
      try {
        await browser.tabs.sendMessage(tab.id, { action: "disable" });
      } catch (e) {
        console.error("Error sending disable message:", e);
      }
    }
  }
});

