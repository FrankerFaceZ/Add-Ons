const { createElement } = FrankerFaceZ.utilities.dom;

const POSITION_CONFIGS = {
  "bottom-left": {
    basePosition: { bottom: "20px", left: "20px", top: "auto", right: "auto" },
    flexDirection: "column-reverse"
  },
  "bottom-right": {
    basePosition: { bottom: "20px", right: "20px", top: "auto", left: "auto" },
    flexDirection: "column-reverse"
  },
  "top-left": {
    basePosition: { top: "20px", left: "20px", bottom: "auto", right: "auto" },
    flexDirection: "column"
  },
  "top-right": {
    basePosition: { top: "20px", right: "20px", bottom: "auto", left: "auto" },
    flexDirection: "column"
  },
  "player-bottom-left": {
    basePosition: { bottom: "20px", left: "20px", top: "auto", right: "auto" },
    flexDirection: "column-reverse"
  },
  "player-bottom-right": {
    basePosition: { bottom: "20px", right: "20px", top: "auto", left: "auto" },
    flexDirection: "column-reverse"
  },
  "player-top-left": {
    basePosition: { top: "20px", left: "20px", bottom: "auto", right: "auto" },
    flexDirection: "column"
  },
  "player-top-right": {
    basePosition: { top: "20px", right: "20px", bottom: "auto", left: "auto" },
    flexDirection: "column"
  }
};

const notificationContainers = {};
const CONTROLS_OFFSET = 65;

function getOrCreateNotificationContainer(position, isPlayerPosition, videoPlayer) {
  const containerId = `notification-container-${position}`;

  if (notificationContainers[containerId] && notificationContainers[containerId].isConnected) {
    return notificationContainers[containerId];
  }

  const config = POSITION_CONFIGS[position];
  const container = createElement("div", {
    id: containerId,
    style: `
      position: ${isPlayerPosition && videoPlayer ? "absolute" : "fixed"};
      bottom: ${config.basePosition.bottom};
      left: ${config.basePosition.left};
      top: ${config.basePosition.top};
      right: ${config.basePosition.right};
      z-index: 9999;
      display: flex;
      flex-direction: ${config.flexDirection};
      gap: 5px;
      pointer-events: none;
    `
  });

  const parentContainer = isPlayerPosition && videoPlayer ? videoPlayer : document.body;

  if (isPlayerPosition && videoPlayer) {
    if (getComputedStyle(videoPlayer).position === "static") {
      videoPlayer.style.position = "relative";
    }
    if (!videoPlayer.style.zIndex || parseInt(videoPlayer.style.zIndex) < 10) {
      videoPlayer.style.zIndex = "10";
    }
  }

  parentContainer.appendChild(container);
  notificationContainers[containerId] = container;
  return container;
}

function updatePlayerContainerPosition(container, position, controlsVisible) {
  if (!container || !position.startsWith("player-") || !position.includes("bottom")) {
    return;
  }

  const config = POSITION_CONFIGS[position];
  const baseBottom = parseInt(config.basePosition.bottom) || 20;
  const adjustment = controlsVisible ? CONTROLS_OFFSET : 0;

  container.style.bottom = `${baseBottom + adjustment}px`;
}

function updateNotificationsForControlsVisibility(controlsVisible) {
  ["player-bottom-left", "player-bottom-right"].forEach(position => {
    const containerId = `notification-container-${position}`;
    const container = notificationContainers[containerId];

    if (container && container.isConnected) {
      updatePlayerContainerPosition(container, position, controlsVisible);
    }
  });
}

function setupPlayerControlsObserver() {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === "attributes" && mutation.attributeName === "data-a-visible") {
        const controlsVisible = mutation.target.getAttribute("data-a-visible") === "true";
        updateNotificationsForControlsVisibility(controlsVisible);
      }
    });
  });

  function checkAndObserveControls() {
    const playerControls = document.querySelector(".player-controls");
    if (playerControls) {
      const controlsVisible = playerControls.getAttribute("data-a-visible") === "true";
      updateNotificationsForControlsVisibility(controlsVisible);

      observer.observe(playerControls, { attributes: true, attributeFilter: ["data-a-visible"] });
      return true;
    }
    return false;
  }

  if (!checkAndObserveControls()) {
    const intervalId = setInterval(() => {
      if (checkAndObserveControls()) {
        clearInterval(intervalId);
      }
    }, 500);

    setTimeout(() => clearInterval(intervalId), 10000);
  }
}

setupPlayerControlsObserver();

export function notification(icon = "", message, timeout = 6000) {
  const ffz = FrankerFaceZ.get();
  const position = ffz.settings.get("addon.trubbel.appearance.notifications-position");

  const isPlayerPosition = position.startsWith("player-");
  const videoPlayer = isPlayerPosition ? document.querySelector(".video-player") : null;

  const effectivePosition = (isPlayerPosition && !videoPlayer)
    ? position.replace("player-", "")
    : position;

  const config = POSITION_CONFIGS[effectivePosition];
  const container = getOrCreateNotificationContainer(effectivePosition, isPlayerPosition, videoPlayer);

  const notification = createElement("div", {
    className: `dynamic-notification position-${effectivePosition}`,
    style: `
      background-color: ${ffz.settings.get("addon.trubbel.appearance.notifications-background-color") || "rgb(0, 0, 0)"};
      color: ${ffz.settings.get("addon.trubbel.appearance.notifications-text-color") || "#ffffff"};
      padding: ${ffz.settings.get("addon.trubbel.appearance.notifications-padding") ? "4" : "8"}px;
      border-radius: 5px;
      font-size: ${ffz.settings.get("addon.trubbel.appearance.notifications-font-size") || "16"}px;
      font-family: monospace;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      gap: 4px;
      display: flex;
      align-items: flex-start;
      opacity: 0;
      transform: translateY(${effectivePosition.includes("top") ? "-" : ""}20px);
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
    `
  });

  if (icon) {
    const iconElement = createElement("div", {
      textContent: icon,
      style: "flex-shrink: 0;"
    });
    notification.appendChild(iconElement);
  }

  const text = createElement("span", {
    textContent: message,
    style: "word-wrap: break-word; overflow-wrap: break-word;"
  });
  notification.appendChild(text);

  container.appendChild(notification);

  if (isPlayerPosition && effectivePosition.includes("bottom")) {
    const playerContainer = document.querySelector(".video-player__container");
    const playerControls = playerContainer ? playerContainer.querySelector(".player-controls") : null;
    const controlsVisible = playerControls && playerControls.getAttribute("data-a-visible") === "true";

    updatePlayerContainerPosition(container, effectivePosition, controlsVisible);
  }

  requestAnimationFrame(() => {
    notification.style.opacity = "1";
    notification.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = `translateY(${effectivePosition.includes("top") ? "-" : ""}20px)`;

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }

      if (container.children.length === 0) {
        container.remove();
        delete notificationContainers[container.id];
      }
    }, 300);
  }, timeout);
}