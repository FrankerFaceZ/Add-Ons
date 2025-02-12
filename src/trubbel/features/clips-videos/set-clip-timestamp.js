import { CLIPS_TIMESTAMP, VODS_TIMESTAMP } from "../../utils/graphql/clip_info.gql";
import GET_CLIP from "../../utils/graphql/clip_info.gql";

let lastProcessedClipId = null; // Tracks the last processed clip ID
let processing = false; // Prevents re-entrant calls

export default async function setClipTimestamp(ctx) {
  if (ctx.router.current?.name === "clip-page" || ctx.router.current?.name === "user-clip") {
    if (!ctx.settings.get("addon.trubbel.clip-video.timestamps-clip")) return;

    const clipId = location.hostname === "clips.twitch.tv"
      ? location.pathname.slice(1)
      : location.pathname.split("/clip/")[1];

    if (!clipId) {
      ctx.log.error("[Clip Timestamp] Unable to get the clip ID.");
      return;
    }

    if (processing) {
      ctx.log.info("[Clip Timestamp] Skipping as processing is already in progress.");
      return;
    }

    // Skip if the clip ID has already been processed
    if (clipId === lastProcessedClipId) {
      ctx.log.info("[Clip Timestamp] Skipping as this clip ID is already processed.");
      return;
    }

    processing = true;
    lastProcessedClipId = clipId;

    try {
      const element = await ctx.site.awaitElement(`${CLIPS_TIMESTAMP}, ${VODS_TIMESTAMP}`);
      if (element) {
        const apollo = ctx.resolve("site.apollo");
        if (!apollo) {
          ctx.log.error("[Clip Timestamp] Apollo client not resolved.");
          return null;
        }

        const result = await apollo.client.query({
          query: GET_CLIP,
          variables: { slug: clipId },
        });

        const createdAt = result?.data?.clip?.createdAt;
        if (createdAt) {
          let relative = "";
          if (ctx.settings.get("addon.trubbel.clip-video.timestamps-relative")) {
            relative = `(${ctx.i18n.toRelativeTime(createdAt)})`;
          }
          const timestamp = ctx.i18n.formatDateTime(
            createdAt,
            ctx.settings.get("addon.trubbel.clip-video.timestamps-format")
          );
          element.textContent = `${timestamp} ${relative}`;
        } else {
          ctx.log.warn("[Clip Timestamp] No createdAt data found for clip.");
        }
      } else {
        ctx.log.warn("[Clip Timestamp] Clip timestamp element not found.");
      }
    } catch (error) {
      ctx.log.error("[Clip Timestamp] Error applying new clip timestamp:", error);
    } finally {
      processing = false; // Ensure processing is reset even on error
    }
  }
}