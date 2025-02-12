import { VODS_TIMESTAMP } from "../../utils/constants/selectors";
import GET_VIDEO from "../../utils/graphql/video_info.gql";

let lastProcessedVideoId = null; // Tracks the last processed video ID
let processing = false; // Prevents re-entrant calls

export default async function setVideoTimestamp(ctx) {
  if (ctx.router.current?.name === "video") {
    if (!ctx.settings.get("addon.trubbel.clip-video.timestamps-video")) return;

    const videoId = location.pathname.split("/videos/")[1];
    if (!videoId) {
      ctx.log.error("[Video Timestamp] Unable to get the video ID.");
      return;
    }

    if (processing) {
      ctx.log.info("[Video Timestamp] Skipping as processing is already in progress.");
      return;
    }

    // Skip if the video ID has already been processed
    if (videoId === lastProcessedVideoId) {
      ctx.log.info("[Video Timestamp] Skipping as this video ID is already processed.");
      return;
    }

    processing = true;
    lastProcessedVideoId = videoId;

    try {
      const metadataElement = await ctx.site.awaitElement(VODS_TIMESTAMP);
      if (metadataElement) {
        const apollo = ctx.resolve("site.apollo");
        if (!apollo) {
          ctx.log.error("[Video Timestamp] Apollo client not resolved.");
          return null;
        }

        const result = await apollo.client.query({
          query: GET_VIDEO,
          variables: {
            id: videoId,
          },
        });

        const createdAt = result?.data?.video?.createdAt;
        if (createdAt) {
          let relative = "";
          if (ctx.settings.get("addon.trubbel.clip-video.timestamps-relative")) {
            relative = `(${ctx.i18n.toRelativeTime(createdAt)})`;
          }

          const timestamp = ctx.i18n.formatDateTime(
            createdAt,
            ctx.settings.get("addon.trubbel.clip-video.timestamps-format")
          );

          metadataElement.textContent = `${timestamp} ${relative}`;
        } else {
          ctx.log.warn("[Video Timestamp] No data found for video.");
        }
      } else {
        ctx.log.warn("[Video Timestamp] Video timestamp element not found.");
      }
    } catch (error) {
      ctx.log.error("[Video Timestamp] Error applying new video timestamp:", error);
    } finally {
      processing = false; // Ensure processing is reset even on error
    }
  }
}