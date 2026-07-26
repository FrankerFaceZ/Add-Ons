import { BAD_USERS } from "../../../utilities/constants/types";

const { createElement } = FrankerFaceZ.utilities.dom;
const { duration_to_string } = FrankerFaceZ.utilities.time;
const { maybe_call } = FrankerFaceZ.utilities.object;
const { maybeLoad: maybeLoadFA } = FrankerFaceZ.utilities.fontAwesome;

const TICK_MS = 1000;

function getLiveSince(site) {
  const created = site.children.chat?.ChatContainer?.first?.props?.streamCreatedAt;
  if (!created) return null;

  const d = created instanceof Date ? created : new Date(created);
  return isNaN(d.getTime()) ? null : d;
}

function getUptime(liveSince, socket) {
  if (!liveSince) return null;
  const drift = socket?._time_drift ?? 0;
  const elapsed = Math.floor((Date.now() - drift - liveSince.getTime()) / 1000);
  return elapsed < 0 ? null : elapsed;
}

function getPlayer(site) {
  return site.children.player?.current ?? null;
}

function getLatency(player) {
  const latency = player?.core?.state?.liveLatency;
  return typeof latency === "number" ? latency : null;
}

function getRate(player) {
  if (!player) return 1;
  try { return maybe_call(player.getPlaybackRate, player) ?? 1; }
  catch (_) { return 1; }
}

function isPaused(player) {
  const core = player?.core;
  if (!core) return false;
  return core.paused === true || core.state?.state === "Idle";
}

export default class ChatHeaderInfo {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.style = parent.style;
    this.log = parent.log;

    this.isActive = false;
    this.interval = null;

    this.wrapper = null;
    this.uptimeGroup = null;
    this.uptimeText = null;
    this.delayGroup = null;
    this.delayIcon = null;
    this.delayText = null;

    this.tick = this.tick.bind(this);
  }

  initialize() {
    maybeLoadFA("ffz-fa fa-pause");

    const mode = this.settings.get("addon.trubbel.channel.chat.header.info");
    if (mode !== "off") this.handleNavigation();
  }

  handleSettingChange(val) {
    if (val === "off") {
      this.disable();
    } else {
      this.handleNavigation();
      if (this.isActive) this.tick();
    }
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

    const mode = this.settings.get("addon.trubbel.channel.chat.header.info");
    const enabled = mode !== "off";

    if (enabled && chatRoutes.includes(currentRoute) && pathname && !BAD_USERS.includes(pathname)) {
      if (!this.isActive) this.enable();
    } else {
      if (this.isActive) this.disable();
    }
  }

  enable() {
    if (this.isActive) return;
    this.isActive = true;

    this.site.awaitElement("[data-test-selector=\"chat-room-header-label\"]").then(() => {
      if (!this.isActive) return;
      this.interval = setInterval(this.tick, TICK_MS);
      this.tick();
    }).catch(err => {
      this.log.warn("[ChatHeaderInfo] awaitElement failed", err);
      this.isActive = false;
    });
  }

  disable() {
    if (!this.isActive) return;
    this.isActive = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.remove();
  }

  attach() {
    const h4 = document.querySelector("[data-test-selector=\"chat-room-header-label\"]");
    if (!h4) return false;

    this.style.set("chat-header-hide",
      `.stream-chat-header h4[data-test-selector="chat-room-header-label"] { display: none !important; }`
    );

    this.uptimeText = document.createTextNode("");
    this.uptimeGroup = createElement("span", {
      className: "custom-chat-header__uptime",
      style: "display: inline-flex; align-items: center; font-variant-numeric: tabular-nums;"
    },
      createElement("figure", { className: "ffz-i-clock tw-mg-r-05" }),
      this.uptimeText
    );

    this.delayText = document.createTextNode("");
    this.delayIcon = createElement("figure", { className: "ffz-i-gauge tw-mg-r-05" });
    this.delayGroup = createElement("span", {
      className: "custom-chat-header__latency",
      style: "display: inline-flex; align-items: center; font-variant-numeric: tabular-nums;"
    },
      this.delayIcon,
      this.delayText
    );

    this.wrapper = createElement("h4", {
      className: "custom-chat-header",
      style: "display: inline-flex; align-items: center; gap: 6px; font-weight: var(--font-weight-semibold); color: var(--color-text-alt); font-variant-numeric: tabular-nums;"
    },
      this.uptimeGroup,
      this.delayGroup
    );

    h4.parentElement.appendChild(this.wrapper);
    return true;
  }

  remove() {
    this.style.delete("chat-header-hide");

    document.querySelector(".custom-chat-header")?.remove();
    this.wrapper = null;
    this.uptimeGroup = null;
    this.uptimeText = null;
    this.delayGroup = null;
    this.delayIcon = null;
    this.delayText = null;
  }

  ensureAttached() {
    if (this.wrapper && document.contains(this.wrapper)) return true;
    return this.attach();
  }

  tick() {
    const socket = this.site.parent.socket;
    const liveSince = getLiveSince(this.site);

    if (!liveSince) {
      if (this.wrapper) this.remove();
      return;
    }

    if (!this.ensureAttached()) return;

    const mode = this.settings.get("addon.trubbel.channel.chat.header.info");
    const showUptime = mode === "uptime" || mode === "both";
    const showDelay = mode === "latency" || mode === "both";

    this.uptimeGroup.style.display = showUptime ? "inline-flex" : "none";
    if (showUptime) {
      const elapsed = getUptime(liveSince, socket);
      this.uptimeText.textContent = elapsed != null
        ? duration_to_string(elapsed, false, false, false, false)
        : "";
    }

    this.delayGroup.style.display = showDelay ? "inline-flex" : "none";
    if (showDelay) {
      const player = getPlayer(this.site);
      const latency = getLatency(player);
      const paused = isPaused(player);
      const rate = getRate(player);

      const wantedClass = `${paused ? "ffz-fa fa-pause" : rate > 1 ? "ffz-i-fast-fw" : "ffz-i-gauge"} tw-mg-r-05`;
      if (this.delayIcon.className !== wantedClass)
        this.delayIcon.className = wantedClass;

      this.delayText.textContent = latency != null ? `${latency.toFixed(2)}s` : "";
    }
  }
}