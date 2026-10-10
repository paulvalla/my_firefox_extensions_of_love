/**
 * Utility functions for Start Your Day Firefox Container Extension
 */

const DEFAULT_RULES = [];

// Get color hex directly from Firefox container object property (container.colorCode), with fallback if needed
function getFirefoxContainerColorHex(colorNameOrCode) {
  if (!colorNameOrCode) return "#808080";
  if (colorNameOrCode.startsWith("#") || colorNameOrCode.startsWith("rgb")) {
    return colorNameOrCode;
  }
  const map = {
    blue: "#37adff",
    turquoise: "#00c7d4",
    green: "#51cd00",
    yellow: "#ffb500",
    orange: "#ff9f00",
    red: "#ff613d",
    pink: "#ff4bda",
    purple: "#af51f5",
    toolbar: "#808080"
  };
  return map[colorNameOrCode.toLowerCase()] || "#808080";
}

// Normalize short URLs to full valid URLs
function normalizeUrl(input) {
  if (!input) return "about:blank";
  let url = input.trim();
  
  if (!/^https?:\/\//i.test(url) && !/^about:/i.test(url)) {
    url = "https://" + url;
  }
  return url;
}

// Get primary storage area safely
function getStorageArea() {
  return browser.storage.local || browser.storage.sync;
}

// Storage helpers
async function getSettings() {
  try {
    const storage = getStorageArea();
    const data = await storage.get({
      rules: DEFAULT_RULES,
      openInNewWindow: false
    });
    if (!data.rules || !Array.isArray(data.rules)) {
      data.rules = DEFAULT_RULES;
    }
    return data;
  } catch (e) {
    console.warn("Storage get failed, using empty rules:", e);
    return {
      rules: DEFAULT_RULES,
      openInNewWindow: false
    };
  }
}

async function saveSettings(settings) {
  try {
    const storage = getStorageArea();
    await storage.set(settings);
  } catch (e) {
    console.error("Storage set failed:", e);
  }
}

// Fetch all existing Firefox containers (includes name, color, colorCode, icon, iconUrl, cookieStoreId)
async function getAllFirefoxContainers() {
  if (browser.contextualIdentities) {
    try {
      return await browser.contextualIdentities.query({});
    } catch (e) {
      console.error("Error querying contextualIdentities:", e);
    }
  }
  return [];
}

// Find container cookieStoreId by containerName or cookieStoreId
async function getContainerCookieStoreId(containerName) {
  const nameTrimmed = (containerName || "").trim();

  // If Default (No Container) selected
  if (!nameTrimmed || nameTrimmed === "firefox-default" || nameTrimmed === "Default (No Container)") {
    return "firefox-default";
  }

  if (!browser.contextualIdentities) {
    return "firefox-default";
  }

  let existingContainers = [];
  try {
    existingContainers = await browser.contextualIdentities.query({});
  } catch (e) {
    console.warn("Could not query contextualIdentities:", e);
  }
  
  // Try exact cookieStoreId match
  let match = existingContainers.find(c => c.cookieStoreId === nameTrimmed);

  // Try case-insensitive name match
  if (!match) {
    match = existingContainers.find(
      c => c.name.toLowerCase() === nameTrimmed.toLowerCase()
    );
  }

  if (match) {
    return match.cookieStoreId;
  }

  // Fallback to default
  return "firefox-default";
}

// Open a single rule in its container tab
async function openRule(rule, windowId = null) {
  if (!rule || !rule.url) return null;

  let cookieStoreId = "firefox-default";
  try {
    cookieStoreId = await getContainerCookieStoreId(rule.containerName);
  } catch (e) {
    console.warn("Container lookup failed, opening in default container:", e);
  }

  const targetUrl = normalizeUrl(rule.url);
  const createProperties = {
    url: targetUrl
  };

  if (cookieStoreId && cookieStoreId !== "firefox-default") {
    createProperties.cookieStoreId = cookieStoreId;
  }

  if (windowId !== null) {
    createProperties.windowId = windowId;
  }

  return await browser.tabs.create(createProperties);
}

// Open all active rules
async function openAllRules(rules, openInNewWindow = false) {
  const activeRules = (rules || []).filter(r => r.enabled !== false && r.url);
  if (activeRules.length === 0) return { count: 0 };

  let targetWindowId = null;

  if (openInNewWindow) {
    // Create new window with the first rule tab
    const firstRule = activeRules[0];
    let firstCookieStoreId = "firefox-default";
    try {
      firstCookieStoreId = await getContainerCookieStoreId(firstRule.containerName);
    } catch (e) {}

    const windowProps = {
      url: normalizeUrl(firstRule.url)
    };
    if (firstCookieStoreId && firstCookieStoreId !== "firefox-default") {
      windowProps.cookieStoreId = firstCookieStoreId;
    }

    const newWindow = await browser.windows.create(windowProps);
    targetWindowId = newWindow.id;

    // Open remaining rules in the new window
    for (let i = 1; i < activeRules.length; i++) {
      await openRule(activeRules[i], targetWindowId);
    }
  } else {
    // Open in current window
    for (const rule of activeRules) {
      await openRule(rule);
    }
  }

  return { count: activeRules.length };
}
