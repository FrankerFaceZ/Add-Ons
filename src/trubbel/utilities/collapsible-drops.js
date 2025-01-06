export function collapseDrop() {
  const STORAGE_KEY = "ffzCollapsibleDrops";
  const BUTTON_CLASS = "drops-collapse-button";
  let isInitialized = false;

  // Load collapsed state from localStorage
  function loadCollapsedState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error("Error loading collapsed state:", e);
      return {};
    }
  }

  // Save collapsed state to localStorage
  function saveCollapsedState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Error saving collapsed state:", e);
    }
  }

  // Clean up localStorage by removing campaigns that are no longer on the page
  function cleanupStorage() {
    if (!window.location.href.includes("twitch.tv/drops/inventory")) return;

    if (!isInitialized) {
      setTimeout(() => {
        // Create a cleanup function that maintains its own URL check
        const performCleanup = () => {
          // Guard the entire cleanup operation
          if (!window.location.href.includes("twitch.tv/drops/inventory")) return;

          const campaigns = document.querySelectorAll(".inventory-campaign-info .tw-link");
          if (campaigns.length === 0) {
            console.debug("No campaigns found, skipping cleanup");
            return;
          }

          const state = loadCollapsedState();
          const currentCampaigns = new Set(
            Array.from(campaigns).map(link => link.textContent)
          );

          let hasChanges = false;
          const originalState = { ...state }; // Keep a copy of original state

          Object.keys(state).forEach(campaignName => {
            // One final URL check before each deletion
            if (!window.location.href.includes("twitch.tv/drops/inventory")) {
              state = originalState; // Restore original state
              hasChanges = false;
              return;
            }

            if (!currentCampaigns.has(campaignName)) {
              console.debug(`Removing stale campaign: ${campaignName}`);
              delete state[campaignName];
              hasChanges = true;
            }
          });

          // Final URL check before saving
          if (hasChanges && window.location.href.includes("twitch.tv/drops/inventory")) {
            saveCollapsedState(state);
          }
        };

        performCleanup();
        isInitialized = true;
      }, 1e4);
    }
  }

  // Create collapse button
  function createCollapseButton() {
    const button = document.createElement("button");
    button.className = BUTTON_CLASS;
    button.style.cssText = `
          background: none;
          border: none;
          color: var(--color-text-alt-2);
          cursor: pointer;
          padding: 4px 8px;
          margin-left: 8px;
          border-radius: 4px;
          font-size: 14px;
      `;
    button.onmouseover = () => button.style.backgroundColor = "#1f1f23";
    button.onmouseout = () => button.style.backgroundColor = "transparent";
    return button;
  }

  // Add collapse functionality to a section
  function makeCollapsible(infoElement) {
    // Check if this element has already been processed
    if (infoElement.dataset.collapsibleProcessed) return;

    // Mark the element as processed
    infoElement.dataset.collapsibleProcessed = "true";

    // Get campaign name for unique identification
    const nameLink = infoElement.querySelector(".tw-link");
    if (!nameLink) return;

    const campaignName = nameLink.textContent;
    const parentElement = infoElement.parentElement;

    // Ensure the parent element is positioned relative for absolute positioning
    parentElement.style.position = "relative";

    // Store the original height for the title section
    const titleHeight = 27;

    // Create collapse button
    const collapseBtn = createCollapseButton();
    const collapsedState = loadCollapsedState();

    // Set button's position to be absolute within the parent
    collapseBtn.style.position = "absolute";
    collapseBtn.style.top = "-1px";
    collapseBtn.style.right = "0px";

    // Set initial state based on localStorage
    const isCollapsed = collapsedState[campaignName] || false;
    collapseBtn.textContent = isCollapsed ? `▼ Show: ${campaignName}` : "▲ Hide";

    if (isCollapsed) {
      parentElement.style.height = `${titleHeight}px`;
      parentElement.style.overflow = "hidden";
      parentElement.style.marginBottom = "10px";
    }

    // Add click handler
    collapseBtn.onclick = (e) => {
      e.stopPropagation();
      const newCollapsed = collapseBtn.textContent.includes("Hide");

      if (newCollapsed) {
        parentElement.style.height = `${titleHeight}px`;
        parentElement.style.overflow = "hidden";
        parentElement.style.marginBottom = "10px";
        collapseBtn.textContent = `▼ Show: ${campaignName}`;
      } else {
        parentElement.style.height = "";
        parentElement.style.overflow = "";
        parentElement.style.marginBottom = "";
        collapseBtn.textContent = "▲ Hide";
      }

      // Update localStorage
      const state = loadCollapsedState();
      state[campaignName] = newCollapsed;
      saveCollapsedState(state);
    };

    // Insert button into the parent container
    parentElement.appendChild(collapseBtn);
  }

  // Delay the cleanup by 10 seconds
  function delayCleanup() {
    if (!window.location.href.includes("twitch.tv/drops/inventory")) return;
    setTimeout(() => {
      cleanupStorage();
    }, 1e4);
  }

  // Initialize collapse functionality
  function init() {
    const infoElements = document.querySelectorAll(".inventory-campaign-info");
    infoElements.forEach(makeCollapsible);
    delayCleanup();
  }

  // Create and start the observer
  let observerTimeout;
  const observer = new MutationObserver((mutations) => {
    if (!window.location.href.includes("twitch.tv/drops/inventory")) return;
    // Clear any existing timeout
    if (observerTimeout) {
      clearTimeout(observerTimeout);
    }

    // Set a new timeout
    observerTimeout = setTimeout(() => {
      init();
    }, 5e2);
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initial run
  init();
}