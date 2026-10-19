import { BAD_USERS } from "../../../utilities/constants/types";

function getLiveSince(site) {
  const created = site.children.chat?.ChatContainer?.first?.props?.streamCreatedAt;
  if (!created) return null;

  const d = created instanceof Date ? created : new Date(created);
  return isNaN(d.getTime()) ? null : d;
}

function getLatency(player) {
  const latency = player?.core?.state?.liveLatency;
  return typeof latency === "number" ? latency : null;
}

export default class InputLatency {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.fine = parent.fine;
    this.i18n = parent.i18n;
    this.log = parent.log;

    this.isActive = false;
    this.interval = null;
    this.ChatInput = null;
    this.text = null;

    this.tick = this.tick.bind(this);
  }

  initialize() {
    if (this.settings.get("addon.trubbel.channel.chat.input.latency_placeholder")) this.handleNavigation();
  }

  handleSettingChange(val) {
    if (val) this.handleNavigation();
    else this.disable();
  }

  handleNavigation() {
    const chatRoutes = this.site.constructor.CHAT_ROUTES;
    const currentRoute = this.router?.current?.name;

    let pathname;
    if (this.router?.match?.[1]) {
      pathname = this.router.match[1];
    } else {
      const seg = this.router?.location?.split("/").filter(s => s.length > 0);
      pathname = seg?.[0];
    }

    const enabled = this.settings.get("addon.trubbel.channel.chat.input.latency_placeholder");

    if (enabled && chatRoutes.includes(currentRoute) && pathname && !BAD_USERS.includes(pathname)) {
      if (!this.isActive) this.enable();
    } else {
      if (this.isActive) this.disable();
    }
  }

  enable() {
    if (this.isActive) return;

    const ChatInput = this.site.children.chat?.input?.ChatInput;
    if (!ChatInput) {
      this.log.warn("[InputLatency] ChatInput not available");
      return;
    }

    this.isActive = true;
    this.ChatInput = ChatInput;

    ChatInput.on("mount", this.updateInstance, this);
    ChatInput.on("update", this.updateInstance, this);

    this.interval = setInterval(this.tick, 1000);
    this.tick();
  }

  disable() {
    if (!this.isActive) return;

    this.isActive = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (this.ChatInput) {
      this.ChatInput.off("mount", this.updateInstance, this);
      this.ChatInput.off("update", this.updateInstance, this);

      for (const inst of this.ChatInput.instances)
        this.restoreInstance(inst);

      this.ChatInput = null;
    }

    this.text = null;
  }

  tick() {
    if (!this.isActive || !this.ChatInput) return;

    const latency = getLiveSince(this.site)
      ? getLatency(this.site.children.player?.current)
      : null;

    this.text = latency != null
      ? this.i18n.t("addon.trubbel.chat.input.latency", "Latency: {latency}s", {
        latency: latency.toFixed(2)
      })
      : null;

    for (const inst of this.ChatInput.instances)
      this.updateInstance(inst);
  }

  getTextNode(inst) {
    const p = this.fine.getHostNode(inst)?.querySelector?.(".chat-input__textarea p.chat-wysiwyg-input__placeholder");
    const node = p?.firstChild;
    return node?.nodeType === Node.TEXT_NODE ? node : null;
  }

  updateInstance(inst) {
    if (!this.isActive) return;

    const node = this.getTextNode(inst);
    if (!node) return;

    if (node.nodeValue !== node._ffz_latency_text)
      node._ffz_latency_orig = node.nodeValue;

    const text = this.text ?? node._ffz_latency_orig;
    if (node.nodeValue !== text)
      node.nodeValue = text;

    node._ffz_latency_text = text;
  }

  restoreInstance(inst) {
    const node = this.getTextNode(inst);
    if (!node) return;

    if (node._ffz_latency_orig != null && node.nodeValue === node._ffz_latency_text)
      node.nodeValue = node._ffz_latency_orig;

    delete node._ffz_latency_orig;
    delete node._ffz_latency_text;
  }
}