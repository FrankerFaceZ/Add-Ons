import { MOST_RECENT_CARD_SELECTOR, MOST_RECENT_SELECTOR } from "../../utils/constants/selectors";
import GET_VIDEO from "../../utils/graphql/video_info.gql";
const { createElement } = FrankerFaceZ.utilities.dom;

let lastProcessedVideoId = null; // Tracks the last processed video ID
let processing = false; // Prevents re-entrant calls

export default async function applyMostRecentVideoTimestamp(ctx) {
  if (ctx.router.current?.name === "user" || ctx.router.current?.name === "mod-view") {
    if (!ctx.settings.get("addon.trubbel.clip-video.timestamps-most-recent")) return;

    const element = await ctx.site.awaitElement(MOST_RECENT_SELECTOR, document.documentElement, 15000);
    if (element) {
      const container = await ctx.site.awaitElement(MOST_RECENT_CARD_SELECTOR, document.documentElement, 15000);
      if (container) {
        if (container && !document.querySelector(".most_recent_video-overlay")) {
          lastProcessedVideoId = null;
          processing = false;
        }

        const videoId = element?.getAttribute("href").split("/videos/")[1];
        if (!videoId) return;

        if (processing) {
          ctx.log.info("[Most Recent Video Timestamp] Skipping as processing is already in progress.");
          return;
        }

        if (videoId === lastProcessedVideoId) {
          ctx.log.info("[Most Recent Video Timestamp] Skipping as this video ID is already processed.");
          return;
        }

        processing = true;
        lastProcessedVideoId = videoId;

        try {
          const apollo = ctx.resolve("site.apollo");
          if (!apollo) {
            ctx.log.error("[Most Recent Video Timestamp] Apollo client not resolved.");
            return null;
          }

          const result = await apollo.client.query({
            query: GET_VIDEO,
            variables: {
              id: videoId,
            }
          });

          const createdAt = result?.data?.video?.createdAt;
          if (createdAt) {
            const overlay = createElement("div", {
              class: "most_recent_video-overlay",
              style: "display: block;"
            });

            const notice = createElement("div", {
              class: "most_recent_video-timestamp",
              style: "padding: 0px 0.4rem; background: rgba(0, 0, 0, 0.6); color: #fff; font-size: 1.3rem; border-radius: 0.2rem; position: absolute; bottom: 0px; right: 0px; margin: 2px;"
            });

            let relative = "";
            if (ctx.settings.get("addon.trubbel.clip-video.timestamps-relative")) {
              relative = `(${ctx.i18n.toRelativeTime(createdAt)})`;
            }
            const timestamp = ctx.i18n.formatDateTime(
              createdAt,
              ctx.settings.get("addon.trubbel.clip-video.timestamps-format")
            );
            notice.textContent = `${timestamp} ${relative}`;

            overlay.appendChild(notice);
            container.appendChild(overlay);
          }
        } catch (error) {
          ctx.log.error("[Most Recent Video Timestamp] Error applying video timestamp:", error);
        } finally {
          processing = false;
        }
      } else {
        ctx.log.warn("[Most Recent Video Timestamp] container not found.");
      }
    } else {
      ctx.log.warn("[Most Recent Video Timestamp] element not found.");
    }
  }
}