import { WHISPER_THREADS_SELECTOR } from "../../../utilities/constants/selectors";
import { WHISPER_HEIGHT_KEY_CONFIG } from "../../../utilities/constants/config";

const { createElement, on, off } = FrankerFaceZ.utilities.dom;

export class ResizableDropDown {
  constructor(parent) {
    this.parent = parent;
    this.styleElement = null;
    this.observer = null;
    this.boundMouseMove = null;
    this.boundMouseUp = null;
    this.isResizing = false;
    this.currentArea = null;
    this.startHeight = 0;
    this.startY = 0;

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.initializeResize = this.initializeResize.bind(this);
    this.setupStyles = this.setupStyles.bind(this);
    this.setupObserver = this.setupObserver.bind(this);
    this.cleanup = this.cleanup.bind(this);
  }

  initialize() {
    const enabled = this.parent.settings.get("addon.trubbel.overall.whispers-resizable");
    if (enabled) {
      this.enableResize();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.enableResize();
    } else {
      this.disableResize();
    }
  }

  enableResize() {
    this.parent.log.info("[Whisper Resize] Enabling resizable drop down");

    this.setupStyles();
    this.boundMouseMove = this.handleMouseMove;
    this.boundMouseUp = this.handleMouseUp;
    on(document, "mousemove", this.boundMouseMove);
    on(document, "mouseup", this.boundMouseUp);
    this.setupObserver();

    const existingScrollAreas = document.querySelectorAll(WHISPER_THREADS_SELECTOR);
    existingScrollAreas.forEach(scrollArea => {
      this.initializeResize(scrollArea);
    });
  }

  disableResize() {
    this.parent.log.info("[Whisper Resize] Disabling resizable drop down");

    this.cleanup();

    // Remove stored height setting
    if (this.parent.settings.provider.has(WHISPER_HEIGHT_KEY_CONFIG)) {
      this.parent.settings.provider.delete(WHISPER_HEIGHT_KEY_CONFIG);
    }

    // Reset heights of all whisper windows to default
    const scrollAreas = document.querySelectorAll(WHISPER_THREADS_SELECTOR);
    scrollAreas.forEach(scrollArea => {
      scrollArea.style.height = "";
      delete scrollArea.dataset.heightAdjustable;

      // Remove resize handle if it exists
      const resizeHandle = scrollArea.querySelector(".resize-handle");
      if (resizeHandle) {
        resizeHandle.remove();
      }
    });
  }

  cleanup() {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }

    if (this.boundMouseMove) {
      off(document, "mousemove", this.boundMouseMove);
      this.boundMouseMove = null;
    }
    if (this.boundMouseUp) {
      off(document, "mouseup", this.boundMouseUp);
      this.boundMouseUp = null;
    }

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    this.isResizing = false;
    this.currentArea = null;
    this.startHeight = 0;
    this.startY = 0;
  }

  initializeResize(scrollArea) {
    if (scrollArea.dataset.heightAdjustable) return;

    this.parent.log.info("[Whisper Resize] Initializing resize for whisper window");

    scrollArea.dataset.heightAdjustable = "true";

    // Apply stored height if available
    const storedHeight = this.parent.settings.provider.get(WHISPER_HEIGHT_KEY_CONFIG);
    if (storedHeight) {
      scrollArea.style.height = storedHeight;
    }

    // Add resize handle (visual indicator)
    const resizeHandle = createElement("div", {
      class: "resize-handle",
      style: {
        position: "absolute",
        bottom: "0",
        left: "0",
        right: "0",
        height: "6px",
        cursor: "ns-resize",
        zIndex: "1000"
      }
    });
    scrollArea.appendChild(resizeHandle);

    on(scrollArea, "mousedown", (e) => {
      const rect = scrollArea.getBoundingClientRect();
      if (e.clientY >= rect.bottom - 6) {
        this.parent.log.info("[Whisper Resize] Starting resize operation");
        this.isResizing = true;
        this.currentArea = scrollArea;
        this.startHeight = rect.height;
        this.startY = e.clientY;
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  handleMouseMove(e) {
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

    // Store the new height
    this.parent.settings.provider.set(WHISPER_HEIGHT_KEY_CONFIG, `${newHeight}px`);
  }

  handleMouseUp() {
    if (this.isResizing) {
      this.parent.log.info("[Whisper Resize] Ending resize operation");
      this.isResizing = false;
      this.currentArea = null;
    }
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
        pointer-events: none;
        z-index: 999;
      }
      .whispers-threads-box__scrollable-area:hover::after {
        opacity: 0.5;
      }
      .whispers-threads-box__scrollable-area .resize-handle {
        background: transparent;
      }
      .whispers-threads-box__scrollable-area .resize-handle:hover {
        background: rgba(100, 65, 165, 0.3);
      }
    `;

    this.styleElement = createElement("style", {
      textContent: styleContent
    });
    document.head.appendChild(this.styleElement);

    this.parent.log.info("[Whisper Resize] Styles applied");
  }

  setupObserver() {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const scrollArea = node.querySelector(WHISPER_THREADS_SELECTOR);
            if (scrollArea) {
              this.parent.log.info("[Whisper Resize] New whisper window detected");
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

    this.parent.log.info("[Whisper Resize] Observer setup complete");
  }
}