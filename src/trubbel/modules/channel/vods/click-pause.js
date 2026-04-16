const { createElement } = FrankerFaceZ.utilities.dom;

export default class VODClickPause {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.style = parent.style;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;

    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.handleNavigation = this.handleNavigation.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.vods.playback.pause");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disable();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[VODClickPause] Enabling");
      this.handleNavigation();
    } else {
      this.log.info("[VODClickPause] Disabling");
      this.disable();
    }
  }

  async handleNavigation() {
    const currentRoute = this.router?.current?.name;
    if (currentRoute === "video") {
      const enabled = this.settings.get("addon.trubbel.channel.vods.playback.pause");
      if (enabled && !this.isActive) {
        this.log.info("[VODClickPause] Entering video page, enabling");
        await this.enable();
      }
    } else {
      if (this.isActive) {
        this.log.info("[VODClickPause] Leaving video page, disabling");
        this.disable();
      }
    }
  }

  async enable() {
    if (this.isActive) return;

    this.log.info("[VODClickPause] Setting up");

    this.site.children.player.Player.on("mount", this.attachListener, this);
    this.site.children.player.Player.on("update", this.attachListener, this);
    this.site.children.player.Player.on("unmount", this.detachListener, this);

    for (const inst of this.site.children.player.Player.instances)
      this.attachListener(inst);

    this.isActive = true;
  }

  disable() {
    if (!this.isActive) return;

    this.log.info("[VODClickPause] Disabling");

    for (const inst of this.site.children.player.Player.instances)
      this.detachListener(inst);

    this.isActive = false;
  }

  attachListener(inst) {
    this.detachListener(inst);

    const cont = inst.props.containerRef;
    if (!cont) return;

    inst._trubbel_vod_click_pause_handler = (event) => {
      if (!this.settings.get("addon.trubbel.channel.vods.playback.pause")) return;

      const target = event.target;
      if (!target) return;

      if (
        target.classList.contains("click-handler") ||
        target.closest("[data-a-target=\"player-overlay-click-handler\"]")
      )
        event.stopPropagation();
    };

    cont.addEventListener("click", inst._trubbel_vod_click_pause_handler, true);
  }

  detachListener(inst) {
    const cont = inst.props.containerRef;
    if (cont && inst._trubbel_vod_click_pause_handler)
      cont.removeEventListener("click", inst._trubbel_vod_click_pause_handler, true);

    inst._trubbel_vod_click_pause_handler = null;
  }
}