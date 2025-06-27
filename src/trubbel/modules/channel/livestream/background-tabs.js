import { notification } from "../../../utilities/notification";

export async function isBackgroundTab(ctx) {
  if (ctx.settings.get("addon.trubbel.channel.livestream-auto-pause-mute")) {

    const option = ctx.settings.get("addon.trubbel.channel.livestream-auto-pause-mute-option1");
    const shouldAutoResume = ctx.settings.get("addon.trubbel.channel.livestream-auto-pause-mute-option2");

    const currentName = ctx.router?.current_name;
    const oldName = ctx.router?.old_name;

    const isGoingToBackgroundTab =
      oldName === "user" &&
      (currentName === "user-home" ||
        currentName === "user-videos" ||
        currentName === "user-clips" ||
        currentName === null);

    const isReturningToStream =
      currentName === "user" &&
      (oldName === "user-home" ||
        oldName === "user-videos" ||
        oldName === "user-clips" ||
        oldName === null);

    if (isGoingToBackgroundTab) {
      ctx.log.info(`[Auto Stream Action] Detected navigation to background tab`);
      try {
        const video = await ctx.site.awaitElement("video");

        if (!video.paused) {
          if (option === "auto_mute" && !video.muted) {
            video.muted = true;
            notification("🔇", "[Auto Stream Mute] Muted background player");
          } else if (option === "auto_pause") {
            video.pause();
            notification("⏸️", "[Auto Stream Pause] Paused background player");
          }
        }
      } catch (error) {
        ctx.log.warn("[Auto Stream Action] No video element found:", error);
      }
    }

    if (isReturningToStream && shouldAutoResume) {
      ctx.log.info("[Auto Stream Action] Detected navigation back to stream");
      try {
        const video = await ctx.site.awaitElement("video");

        if (option === "auto_mute" && video.muted) {
          video.muted = false;
          notification("🔊", "[Auto Stream Mute] Unmuted player");
        } else if (option === "auto_pause" && video.paused) {
          video.play();
          notification("▶️", "[Auto Stream Pause] Resumed player");
        }
      } catch (error) {
        ctx.log.warn("[Auto Stream Action] No video element found:", error);
      }
    }
  }
}