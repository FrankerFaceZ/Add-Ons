export class SteamInspect {
  constructor(parent) {
    this.parent = parent;
    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableSteamInspect = this.enableSteamInspect.bind(this);
    this.disableSteamInspect = this.disableSteamInspect.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);

    this.steamInspectLink = {
      type: "steam-inspect-link",
      priority: 0,
      render: (token, createElement) => {
        return (<a
          class="ffz-tooltip link-fragment steam-inspect-link"
          data-tooltip-type="html"
          data-url={token.url}
          data-title="<strong>Inspect in Game...</strong>"
          data-is-mail={token.is_mail}
          rel="noopener noreferrer"
          target="_blank"
          href={token.url}
        >{token.text}</a>);
      },
      process: (tokens, msg) => {
        if (!tokens || !tokens.length) return;

        const STEAM_INSPECT_REGEX = /(\bsteam:\/\/rungame\/730\/\d+\/\+csgo_econ_action_preview(?:%20| )[MS]\d+A\d+D\d+\b)/g;
        const out = [];

        for (const token of tokens) {
          if (token.type !== "text") {
            out.push(token);
            continue;
          }

          const text = token.text;
          let idx = 0;
          let match;

          STEAM_INSPECT_REGEX.lastIndex = 0;

          while ((match = STEAM_INSPECT_REGEX.exec(text))) {
            const nix = match.index;
            if (idx !== nix)
              out.push({ type: "text", text: text.slice(idx, nix) });

            const uri = match[1];

            out.push({
              type: "steam-inspect-link",
              url: uri,
              is_mail: false,
              text: uri
            });

            idx = nix + uri.length;
          }

          if (idx < text.length)
            out.push({ type: "text", text: text.slice(idx) });
        }

        return out;
      }
    }
  }

  initialize() {
    const enabled = this.parent.settings.get("addon.trubbel.channel.chat-steam");
    if (enabled) {
      this.handleNavigation();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.parent.log.info("[Steam Inspect] Enabling clickable Steam inspect links");
      this.handleNavigation();
    } else {
      this.parent.log.info("[Steam Inspect] Disabling clickable Steam inspect links");
      this.disableSteamInspect();
    }
  }

  handleNavigation() {
    const chatRoutes = this.parent.site.constructor.CHAT_ROUTES;
    if (chatRoutes.includes(this.parent.router?.current?.name)) {
      const enabled = this.parent.settings.get("addon.trubbel.channel.chat-steam");
      if (enabled && !this.isActive) {
        this.parent.log.info("[Steam Inspect] Entering user page, enabling Steam inspect links");
        this.enableSteamInspect();
      }
    } else {
      if (this.isActive) {
        this.parent.log.info("[Steam Inspect] Leaving user page, disabling Steam inspect links");
        this.disableSteamInspect();
      }
    }
  }

  enableSteamInspect() {
    if (this.isActive) return;
    this.parent.log.info("[Steam Inspect] Adding Steam inspect tokenizer");
    this.parent.resolve("site.chat").chat.addTokenizer(this.steamInspectLink);
    this.parent.emit("chat:update-lines");
    this.isActive = true;
  }

  disableSteamInspect() {
    if (!this.isActive) return;
    this.parent.log.info("[Steam Inspect] Removing Steam inspect tokenizer");
    this.parent.resolve("site.chat").chat.removeTokenizer(this.steamInspectLink);
    this.parent.emit("chat:update-lines");
    this.isActive = false;
  }
}