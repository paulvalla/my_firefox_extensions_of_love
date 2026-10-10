(function () {
  // Guard against duplicate script injection
  if (window.__forcePasteInitialized) {
    return;
  }
  window.__forcePasteInitialized = true;

  // State variables
  let isActive = false;
  let observer = null;
  const events = ['paste', 'drop', 'contextmenu', 'dragstart'];

  function allowPaste(e) {
    // Allow the event to propagate normally without restriction
    e.stopImmediatePropagation();
    return true;
  }

  function cleanElement(el) {
    el.removeAttribute('onpaste');
    el.removeAttribute('ondrop');
    el.removeAttribute('oncontextmenu');
    // Ensure user can select text
    el.style.userSelect = "auto";
    el.style.WebkitUserSelect = "auto";
  }

  function cleanInputs(rootNode) {
    const node = rootNode || document;
    if (node.querySelectorAll) {
      const inputs = node.querySelectorAll('input, textarea');
      inputs.forEach(cleanElement);
    }
  }

  function enableRules() {
    if (isActive) {
      return;
    }
    isActive = true;

    // Intercept paste, drop, and right-click restrictions
    events.forEach(eventName => {
      document.addEventListener(eventName, allowPaste, true);
    });

    // Clean existing elements that might have inline restrictions
    cleanInputs(document);

    // Watch for dynamically added inputs
    if (!observer) {
      observer = new MutationObserver((mutations) => {
        if (!isActive) {
          return;
        }
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Node.ELEMENT_NODE
              if (node.matches('input, textarea')) {
                cleanElement(node);
              }
              cleanInputs(node);
            }
          });
        });
      });
    }
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    console.log("Force Paste Enabler: Rules successfully activated.");
  }

  function disableRules() {
    if (!isActive) {
      return;
    }
    isActive = false;

    events.forEach(eventName => {
      document.removeEventListener(eventName, allowPaste, true);
    });

    if (observer) {
      observer.disconnect();
    }

    console.log("Force Paste Enabler: Rules successfully deactivated.");
  }

  // Handle messages from background script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "ping") {
      sendResponse({ pong: true });
    } else if (message.action === "enable") {
      enableRules();
    } else if (message.action === "disable") {
      disableRules();
    }
  });

  // Enable rules on initial injection
  enableRules();
})();

