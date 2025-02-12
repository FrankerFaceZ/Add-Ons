import { ERROR_CODES, ERROR_MESSAGES } from "../utils/constants/player-errors";
import { showNotification } from "../utils/create-notification";

const { on } = FrankerFaceZ.utilities.dom;

class RateLimiter {
  constructor(maxAttempts, timeWindowMs) {
    this.maxAttempts = maxAttempts;
    this.timeWindowMs = timeWindowMs;
    this.attempts = [];
  }

  canAttempt() {
    const now = Date.now();
    // Remove attempts outside the time window
    this.attempts = this.attempts.filter(timestamp =>
      now - timestamp < this.timeWindowMs
    );
    return this.attempts.length < this.maxAttempts;
  }

  addAttempt() {
    this.attempts.push(Date.now());
  }

  reset() {
    this.attempts = [];
  }
}

export class Player extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("site");
    this.inject("site.fine");
    this.inject("site.player");

    // Initialize rate limiter - 3 attempts per 5 minutes
    this.rateLimiter = new RateLimiter(3, 5 * 60 * 1000);

    // Player - Player Errors - Enable Auto Reset on Player Errors
    this.settings.add("addon.trubbel.player.player-errors", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Player >> Player Errors",
        title: "Enable Auto Reset on Player Errors",
        description: "Automatically detects and resets the player when encountering errors like `\u00231000`, `\u00232000`, `\u00233000`, `\u00234000` or `\u00235000`.\n\n**Note:** This will only reset the player three times within five minutes, should you keep getting errors, it's likely something you have to fix yourself.",
        component: "setting-check-box"
      }
    });

    this.PlayerSource = this.fine.define(
      "player-source",
      n => n.props && n.props?.playerEvents && n.props?.mediaPlayerInstance
    );
  }

  onEnable() {
    // "PlayerSource" because we can use "userTriggeredPause" with it
    this.PlayerSource.ready((cls, instances) => {
      for (const inst of instances) {
        const events = inst.props?.playerEvents;
        if (events) {
          if (!this.settings.get("addon.trubbel.player.player-errors")) return;
          const playerErrorHandler = async () => {

            // Always check rate limit
            if (!this.rateLimiter.canAttempt()) {
              this.log.warn("[Auto Player Reset] Rate limit exceeded. Please wait before trying again.");
              showNotification("", "[Auto Player Reset] Too many reset attempts. Please try refreshing the page manually.", 15000);
              return;
            }

            // make sure the user didnt pause the player
            if (!inst?.props?.userTriggeredPause) {
              const player = inst?.props?.mediaPlayerInstance;
              const playerState = player?.core?.state?.state;

              // continue if player is paused and player state is idle
              if (player?.isPaused() && playerState === "Idle") {
                const video = player?.core?.mediaSinkManager?.video;

                // make sure the video source attribute is missing
                if (!video.getAttribute("src")) {

                  // The video download was cancelled. Please try again. (Error #1000)
                  // There was a network error. Please try again. (Error #2000)
                  // Your browser encountered an error while decoding the video. (Error #3000)
                  // This video is unavailable. (Error #5000)                  
                  const metadataElement = await this.site.awaitElement(".content-overlay-gate");
                  if (metadataElement) {

                    const hasError = ERROR_CODES.some(code => metadataElement.textContent.includes(code));
                    if (hasError) {
                      const errorCode = ERROR_CODES.find(code => metadataElement.textContent.includes(code));

                      // Always track the attempt
                      this.rateLimiter.addAttempt();
                      this.site.children.player.resetPlayer(this.site.children.player.current);

                      this.log.info(`[Auto Player Reset] ${ERROR_MESSAGES[errorCode]} (Error ${errorCode})`);
                      showNotification("", `[Auto Player Reset] ${ERROR_MESSAGES[errorCode]} (Error ${errorCode})`, 15000);
                    }
                  }
                }
              }
            }
          };
          on(events, "PlayerError", playerErrorHandler);
        }
      }
    });
  }
}