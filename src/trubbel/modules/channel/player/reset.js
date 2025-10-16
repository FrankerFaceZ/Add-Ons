import { PLAYER_ERROR_OVERLAY_SELECTOR } from "../../../utilities/constants/selectors";
import { ErrorCodes, ErrorMessages } from "../../../utilities/constants/types";
import { notification } from "../../../utilities/notification";
import { BAD_USERS } from "../../../utilities/constants/types";

const { on } = FrankerFaceZ.utilities.dom;

class RateLimiter {
  constructor(maxAttempts, timeWindowMs) {
    this.maxAttempts = maxAttempts;
    this.timeWindowMs = timeWindowMs;
    this.attempts = [];
  }

  canAttempt() {
    const now = Date.now();
    this.attempts = this.attempts.filter(timestamp =>
      now - timestamp < this.timeWindowMs
    );

    if (this.attempts.length < this.maxAttempts) {
      this.attempts.push(now);
      return true;
    }

    return false;
  }

  reset() {
    this.attempts = [];
  }
}

export default class PlayerReset {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.fine = parent.fine;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;

    this.rateLimiter = new RateLimiter(4, 5 * 60 * 1000);

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enablePlayerReset = this.enablePlayerReset.bind(this);
    this.disablePlayerReset = this.disablePlayerReset.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.setupInstanceHandlers = this.setupInstanceHandlers.bind(this);

    this.PlayerSource = this.fine.define(
      "player-source",
      n => n.setPlayerActive && n.props?.playerEvents && n.props?.mediaPlayerInstance
    );
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.player.auto_reset");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disablePlayerReset();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Player Reset] Enabling auto player reset");
      this.handleNavigation();
    } else {
      this.log.info("[Player Reset] Disabling auto player reset");
      this.disablePlayerReset();
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
      const enabled = this.settings.get("addon.trubbel.channel.player.auto_reset");
      if (enabled && !this.isActive) {
        this.log.info("[Player Reset] Entering channel page, enabling player reset");
        this.enablePlayerReset();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Player Reset] Leaving channel page, disabling player reset");
        this.disablePlayerReset();
      }
    }
  }

  enablePlayerReset() {
    if (this.isActive) return;

    this.log.info("[Player Reset] Setting up player reset functionality");
    this.isActive = true;

    this.PlayerSource.ready((cls, instances) => {
      for (const inst of instances) {
        this.setupInstanceHandlers(inst);
      }
    });

    this.PlayerSource.on("mount", this.setupInstanceHandlers);
  }

  setupInstanceHandlers(inst) {
    if (!this.isActive) {
      this.log.debug("[Player Reset] Not active, skipping instance setup");
      return;
    }

    const events = inst.props?.playerEvents;
    if (!events) return;

    if (inst._trubbel_handlers_set) return;
    inst._trubbel_handlers_set = true;

    const playerErrorHandler = async () => {
      if (!this.settings.get("addon.trubbel.channel.player.auto_reset")) return;

      if (!this.rateLimiter.canAttempt()) {
        this.log.warn("[Player Reset] Rate limit exceeded. Please wait before trying again.");
        notification("", "[Auto Player Reset] Too many reset attempts. Please try refreshing the page manually.", 15000);
        return;
      }

      if (!inst?.props?.userTriggeredPause) {
        const player = inst?.props?.mediaPlayerInstance;
        const playerState = player?.core?.state?.state;

        if (player?.isPaused() && playerState === "Idle") {
          const video = player?.core?.mediaSinkManager?.video;

          if (!video.getAttribute("src")) {
            const metadataElement = await this.site.awaitElement(PLAYER_ERROR_OVERLAY_SELECTOR);
            if (metadataElement) {
              const hasError = ErrorCodes.some(code => metadataElement.textContent.includes(code));
              if (hasError) {
                const errorCode = ErrorCodes.find(code => metadataElement.textContent.includes(code));
                this.parent.emit("site.player:reset");
                this.log.info(`[Auto Player Reset] ${ErrorMessages[errorCode]} (Error #${errorCode})`);
                notification("", `[Auto Player Reset] ${ErrorMessages[errorCode]} (Error #${errorCode})`, 15000);
                this.parent.emit("metadata:update", "player-stats");
              }
            }
          }
        }
      }
    };

    on(events, "PlayerError", playerErrorHandler);
  }

  disablePlayerReset() {
    if (!this.isActive) return;

    this.log.info("[Player Reset] Removing player reset functionality");
    this.isActive = false;

    this.PlayerSource.off("mount", this.setupInstanceHandlers);

    this.PlayerSource.each(inst => {
      if (inst._trubbel_handlers_set) {
        delete inst._trubbel_handlers_set;
      }
    });

    this.rateLimiter.reset();
  }
}