import { WHISPER_THREADS_SELECTOR } from "../utils/constants/selectors";
import { WHISPER_HEIGHT_CONFIG } from "../utils/constants/config";
const { createElement } = FrankerFaceZ.utilities.dom;

export class Whispers extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);
    this.inject("settings");

    this.observer = null;
    this.styleElement = null;
    this.boundMouseMove = null;
    this.boundMouseUp = null;
    this.isResizing = false;
    this.currentArea = null;
    this.startHeight = 0;
    this.startY = 0;

    // Whispers - Resizable - Enable Resizable Drop Down
    this.settings.add("addon.trubbel.whispers.resizable", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel's Utilities > Whispers >> Resizable",
        title: "Enable Resizable Drop Down",
        description: "Gives the ability to adjust the height of the whisper window drop down.",
        component: "setting-check-box"
      },
      changed: () => this.getWhisperWindow()
    });
  }

  onEnable() {
    this.settings.getChanges("addon.trubbel.whispers.resizable", () => this.getWhisperWindow());
    this.getWhisperWindow();
  }

  cleanup() {
    // Remove style element
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }

    // Remove event listeners
    if (this.boundMouseMove) {
      document.removeEventListener("mousemove", this.boundMouseMove);
      this.boundMouseMove = null;
    }
    if (this.boundMouseUp) {
      document.removeEventListener("mouseup", this.boundMouseUp);
      this.boundMouseUp = null;
    }

    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Reset instance variables
    this.isResizing = false;
    this.currentArea = null;
    this.startHeight = 0;
    this.startY = 0;
  }

  initializeResize(scrollArea) {
    if (scrollArea.dataset.heightAdjustable) return;

    scrollArea.dataset.heightAdjustable = "true";

    const storedHeight = this.settings.provider.get(WHISPER_HEIGHT_CONFIG);
    if (storedHeight) {
      scrollArea.style.height = storedHeight;
    }

    scrollArea.appendChild(createElement("div", {
      class: "resize-handle"
    }));

    scrollArea.addEventListener("mousedown", (e) => {
      // Only trigger if clicking near the bottom edge
      const rect = scrollArea.getBoundingClientRect();
      if (e.clientY >= rect.bottom - 6) {
        this.isResizing = true;
        this.currentArea = scrollArea;
        this.startHeight = rect.height;
        this.startY = e.clientY;
        e.preventDefault();
      }
    });
  }

  handleMouseMove = (e) => {
    if (!this.isResizing || !this.currentArea) return;

    const deltaY = e.clientY - this.startY;
    const rect = this.currentArea.getBoundingClientRect();

    // Calculate the maximum height allowed (20px above the bottom of the browser)
    const viewportHeight = window.innerHeight;
    const maxHeight = Math.min(
      viewportHeight - rect.top - 20,
      this.startHeight + deltaY
    );

    const newHeight = Math.max(67, maxHeight); // minimum 67px height
    this.currentArea.style.height = `${newHeight}px`;
    this.settings.provider.set(WHISPER_HEIGHT_CONFIG, `${newHeight}px`);
  }

  handleMouseUp = () => {
    this.isResizing = false;
    this.currentArea = null;
  }

  setupStyles() {
    const styleContent = `
      .whispers-threads-box__scrollable-area {
        position: relative !important;
      }
      .whispers-threads-box__scrollable-area::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 6px;
        background: #6441a5;
        cursor: ns-resize;
        opacity: 0;
        transition: opacity 0.2s;
        border-top-width: 2px;
        border-top-style: dotted;
        border-top-color: inherit;
      }
      .whispers-threads-box__scrollable-area:hover::after {
        opacity: 0.5;
      }
    `;

    this.styleElement = createElement("style", {
      textContent: styleContent
    });
    document.head.appendChild(this.styleElement);
  }

  setupObserver() {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const scrollArea = node.querySelector(WHISPER_THREADS_SELECTOR);
            if (scrollArea) {
              this.initializeResize(scrollArea);
            }
          }
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  getWhisperWindow() {
    const enabled = this.settings.get("addon.trubbel.whispers.resizable");
    if (enabled) {
      // Set up styles
      this.setupStyles();

      // Set up event listeners
      this.boundMouseMove = this.handleMouseMove.bind(this);
      this.boundMouseUp = this.handleMouseUp.bind(this);
      document.addEventListener("mousemove", this.boundMouseMove);
      document.addEventListener("mouseup", this.boundMouseUp);

      // Set up observer
      this.setupObserver();
    } else {
      // Clean up existing handlers and observers
      this.cleanup();
      if (this.settings.provider.has(WHISPER_HEIGHT_CONFIG)) {
        this.settings.provider.delete(WHISPER_HEIGHT_CONFIG);
      }
    }
  }
}