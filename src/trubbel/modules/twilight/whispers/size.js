export default class WhisperSize {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.style = parent.style;
  }

  enable() {
    this.updateCSS();
  }

  updateCSS() {
    const threadsHeight = this.settings.get("addon.trubbel.twilight.whispers.drop_down");
    if (threadsHeight && threadsHeight !== 20) {
      this.style.set("whispers-dropdown-height", `
        .whispers-threads-box__scrollable-area {
          height: ${threadsHeight}rem !important;
        }
      `);
    } else {
      this.style.delete("whispers-dropdown-height");
    }

    const threadHeight = this.settings.get("addon.trubbel.twilight.whispers.window.height");
    if (threadHeight && threadHeight !== 28) {
      this.style.set("whispers-window-height", `
        .whispers-thread:not(.whispers-thread--collapsed) {
          height: ${threadHeight}rem !important;
        }
      `);
    } else {
      this.style.delete("whispers-window-height");
    }

    const threadWidth = this.settings.get("addon.trubbel.twilight.whispers.window.width");
    if (threadWidth && threadWidth !== 32) {
      this.style.set("whispers-window-width", `
        .whispers-thread:not(.whispers-thread--collapsed) {
          width: ${threadWidth}rem !important;
        }
      `);
    } else {
      this.style.delete("whispers-window-width");
    }
  }
}