export class LocalModeManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.currentMode = null;
    this.tokenizer = null;

    this.ctx.localSubModeActive = false;
    this.ctx.localModModeActive = false;
  }

  toggleSubMode(inst) {
    if (this.currentMode === "sub") {
      this.disableCurrentMode();
      inst.addMessage({
        type: this.ctx.site.children.chat.chat_types.Notice,
        message: "🔴 Local Sub-Only Mode disabled."
      });
      this.ctx.log.info(`[Local Mode] Sub mode disabled`);
    } else {

      const wasModModeActive = this.currentMode === "mod";
      if (wasModModeActive) {
        this.disableCurrentMode();
      }

      this.enableSubMode();

      const message = wasModModeActive
        ? "🟢 Local Sub-Only Mode enabled. (Local Mod-Only Mode disabled)"
        : "🟢 Local Sub-Only Mode enabled.";

      inst.addMessage({
        type: this.ctx.site.children.chat.chat_types.Notice,
        message: message
      });
      this.ctx.log.info(`[Local Mode] Sub mode enabled`);
    }

    this.ctx.emit("chat:update-lines");
  }

  toggleModMode(inst) {
    if (this.currentMode === "mod") {
      this.disableCurrentMode();
      inst.addMessage({
        type: this.ctx.site.children.chat.chat_types.Notice,
        message: "🔴 Local Mod-Only Mode disabled."
      });
      this.ctx.log.info(`[Local Mode] Mod mode disabled`);
    } else {
      
      const wasSubModeActive = this.currentMode === "sub";
      if (wasSubModeActive) {
        this.disableCurrentMode();
      }

      this.enableModMode();

      const message = wasSubModeActive
        ? "🟢 Local Mod-Only Mode enabled. (Local Sub-Only Mode disabled)"
        : "🟢 Local Mod-Only Mode enabled.";

      inst.addMessage({
        type: this.ctx.site.children.chat.chat_types.Notice,
        message: message
      });
      this.ctx.log.info(`[Local Mode] Mod mode enabled`);
    }

    this.ctx.emit("chat:update-lines");
  }

  enableSubMode() {
    this.tokenizer = {
      type: "local-sub",
      priority: 0,
      process: (tokens, msg) => {
        const badges = msg.badges || {};
        const isSubscriber = "subscriber" in badges;
        const isModOrHigher = this.isModeratorOrHigher(badges);
        if (!isSubscriber && !isModOrHigher) msg.ffz_removed = true;
      }
    };

    this.currentMode = "sub";
    this.ctx.localSubModeActive = true;
    this.ctx.localModModeActive = false;
    this.ctx.site.children.chat.chat.addTokenizer(this.tokenizer);
  }

  enableModMode() {
    this.tokenizer = {
      type: "local-mod",
      priority: 0,
      process: (tokens, msg) => {
        const badges = msg.badges || {};
        const isModOrHigher = this.isModeratorOrHigher(badges);
        if (!isModOrHigher) msg.ffz_removed = true;
      }
    };

    this.currentMode = "mod";
    this.ctx.localModModeActive = true;
    this.ctx.localSubModeActive = false;
    this.ctx.site.children.chat.chat.addTokenizer(this.tokenizer);
  }

  disableCurrentMode() {
    if (this.tokenizer) {
      this.ctx.site.children.chat.chat.removeTokenizer(this.tokenizer);
      this.tokenizer = null;
    }

    this.currentMode = null;
    this.ctx.localSubModeActive = false;
    this.ctx.localModModeActive = false;
  }

  isModeratorOrHigher(badges) {
    return "broadcaster" in badges ||
      "staff" in badges ||
      "admin" in badges ||
      "global_mod" in badges ||
      "moderator" in badges;
  }

  getStatus() {
    return {
      currentMode: this.currentMode,
      subModeActive: this.ctx.localSubModeActive,
      modModeActive: this.ctx.localModModeActive
    };
  }

  cleanup() {
    this.disableCurrentMode();
  }
}