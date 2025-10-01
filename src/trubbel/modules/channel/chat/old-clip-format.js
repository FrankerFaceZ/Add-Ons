import { BAD_USERS } from "../../../utilities/constants/types";

export default class OldClipFormat {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;

    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableClipConverter = this.enableClipConverter.bind(this);
    this.disableClipConverter = this.disableClipConverter.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);

    this.clipConverterTokenizer = {
      type: "twitch-clip-converter",
      priority: 0,
      process: (tokens, msg) => {
        if (!tokens || !tokens.length) return tokens;

        // https://www.twitch.tv/channel/clip/slug -> https://clips.twitch.tv/slug
        const TWITCH_CLIP_REGEX = /^https:\/\/(?:www\.)?twitch\.tv\/[^\/]+\/clip\/([a-zA-Z0-9_-]+)/;

        const out = [];
        for (const token of tokens) {
          if (token.type === "link") {
            const match = TWITCH_CLIP_REGEX.exec(token.url);
            if (match) {
              const clipSlug = match[1];
              const newUrl = `https://clips.twitch.tv/${clipSlug}`;

              out.push({
                ...token,
                url: newUrl,
                text: newUrl
              });

            } else {
              out.push(token);
            }
          } else {
            out.push(token);
          }
        }
        return out;
      }
    }
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.links.clip_replace");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableClipConverter();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableClipConverter();
    }
  }

  handleNavigation() {
    const chatRoutes = this.site.constructor.CHAT_ROUTES;
    const currentRoute = this.router?.current?.name;

    let pathname;

    if (this.router?.match && this.router.match[1]) {
      pathname = this.router.match[1];
    } else {
      const location = this.router?.location;
      const segment = location?.split("/").filter(segment => segment.length > 0);
      pathname = segment?.[0];
    }

    if (chatRoutes.includes(currentRoute) && pathname && !BAD_USERS.includes(pathname)) {
      const enabled = this.settings.get("addon.trubbel.channel.chat.links.clip_replace");
      if (enabled && !this.isActive) {
        this.enableClipConverter();
      }
    } else {
      if (this.isActive) {
        this.disableClipConverter();
      }
    }
  }

  enableClipConverter() {
    if (this.isActive) return;
    this.parent.resolve("site.chat").chat.addTokenizer(this.clipConverterTokenizer);
    this.parent.emit("chat:update-lines");
    this.isActive = true;
  }

  disableClipConverter() {
    if (!this.isActive) return;
    this.parent.resolve("site.chat").chat.removeTokenizer(this.clipConverterTokenizer);
    this.parent.emit("chat:update-lines");
    this.isActive = false;
  }
}