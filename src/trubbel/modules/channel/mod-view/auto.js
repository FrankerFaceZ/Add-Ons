export default class AutoModView {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.log = parent.log;

    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableAutoModView = this.enableAutoModView.bind(this);
    this.disableAutoModView = this.disableAutoModView.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.mod_view.auto");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableAutoModView();
    }
  }

  handleNavigation() {
    const currentRoute = this.router?.current_name;
    const currentState = this.router?.current_state;

    if (currentRoute === "user" && currentState?.channelView === "Watch") {
      const enabled = this.settings.get("addon.trubbel.channel.mod_view.auto");
      if (enabled && !this.isActive) {
        this.log.info("[Auto Mod View] On watch page, enabling auto redirect");
        this.enableAutoModView();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Auto Mod View] Not on watch page, disabling auto redirect");
        this.disableAutoModView();
      }
    }
  }

  enableAutoModView() {
    if (this.isActive) return;

    this.log.info("[Auto Mod View] Setting up auto mod view redirect");
    this.isActive = true;

    this.performRedirect();
  }

  disableAutoModView() {
    if (!this.isActive) return;

    this.log.info("[Auto Mod View] Disabling auto mod view redirect");
    this.isActive = false;
  }

  performRedirect() {
    if (!this.isActive) return;

    const currentRoute = this.router?.current_name;
    const currentState = this.router?.current_state;

    if (currentRoute === "user" && currentState?.channelView === "Watch") {
      this.log.info("[Auto Mod View] Redirecting to moderator view");
      this.router.replace("/moderator" + this.router.location);
    }
  }
}