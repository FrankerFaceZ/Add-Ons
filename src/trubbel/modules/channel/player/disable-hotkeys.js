import { BAD_USERS } from "../../../utilities/constants/types";

export default class DisableHotkeys {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.fine = parent.fine;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;

    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.handleNavigation = this.handleNavigation.bind(this);
    this.updateInstance = this.updateInstance.bind(this);

    this.PlayerHotkeys = this.fine.define(
      "player-hotkeys",
      n => n.setKeyHandlers && n.clearKeyHandlers && n.toggleShortcutOverlay
    );
  }

  initialize() {
    this.PlayerHotkeys.ready(cls => this.patchClass(cls));

    const enabled = this.settings.get("addon.trubbel.channel.player.disable_hotkeys");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableHotkeys();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Disable Hotkeys] Enabling");
      this.handleNavigation();
    } else {
      this.log.info("[Disable Hotkeys] Disabling");
      this.disableHotkeys();
    }
  }

  handleNavigation() {
    const currentRoute = this.router?.current?.name;

    let pathname;

    if (this.router?.match && this.router.match[1]) {
      pathname = this.router.match[1];
    } else {
      const location = this.router?.location;
      const segment = location?.split("/").filter(segment => segment.length > 0);
      pathname = segment?.[0];
    }

    if (currentRoute === "user" && pathname && !BAD_USERS.includes(pathname)) {
      const enabled = this.settings.get("addon.trubbel.channel.player.disable_hotkeys");
      if (enabled && !this.isActive) {
        this.log.info("[Disable Hotkeys] Entering livestream page, disabling player keyboard shortcuts");
        this.enableHotkeys();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Disable Hotkeys] Leaving livestream page, restoring player keyboard shortcuts");
        this.disableHotkeys();
      }
    }
  }

  enableHotkeys() {
    if (this.isActive) return;

    this.isActive = true;

    for (const inst of this.PlayerHotkeys.instances)
      this.updateInstance(inst);
  }

  disableHotkeys() {
    if (!this.isActive) return;

    this.isActive = false;

    for (const inst of this.PlayerHotkeys.instances)
      this.updateInstance(inst);
  }

  patchClass(cls) {
    const proto = cls.prototype;
    if (proto._trubbel_hotkeys_patched)
      return;

    proto._trubbel_hotkeys_patched = true;

    const t = this,
      old_mount = proto.componentDidMount;

    proto.componentDidMount = function(...args) {
      const ret = old_mount?.apply(this, args);
      t.updateInstance(this);
      return ret;
    };

    for (const inst of this.PlayerHotkeys.instances)
      this.updateInstance(inst);
  }

  updateInstance(inst) {
    if (!inst?.mouseTrapInstance)
      return;

    if (this.isActive)
      inst.clearKeyHandlers();
    else
      inst.setKeyHandlers();
  }
}