import GET_CLIP from "./data/clip_info.gql";
import GET_VIDEO from "./data/video_info.gql";

export default async function getClipOrVideo(context) {
  if (context.router.current?.name === "clip-page" || context.router.current?.name === "user-clip") {
    if (!context.settings.get("addon.trubbel.format.datetime-clip")) return;
    const clipId = location.hostname === "clips.twitch.tv"
      ? location.pathname.slice(1)
      : location.pathname.split("/clip/")[1];

    if (!clipId) {
      context.log.error("Unable to get the clip ID.");
      return;
    }

    const metadataElement = await context.site.awaitElement(".clips-player .timestamp-metadata__bar + p, .channel-info-content .timestamp-metadata__bar + p");
    if (metadataElement) {

      const apollo = context.resolve("site.apollo");
      if (!apollo) {
        return null;
      }

      const result = await apollo.client.query({
        query: GET_CLIP,
        variables: {
          slug: clipId
        }
      });

      try {
        if (result?.data?.clip && result?.data?.clip.createdAt) {
          const createdAt = result?.data?.clip.createdAt;
          let relative = "";
          if (context.settings.get("addon.trubbel.format.datetime-relative")) {
            relative = ` (${context.i18n.toRelativeTime(createdAt)})`;
          }
          const timestamp = context.i18n.formatDateTime(
            createdAt,
            context.settings.get("addon.trubbel.format.datetime")
          );

          metadataElement.textContent = "";
          metadataElement.textContent = `${timestamp} ${relative}`;
        }
      } catch (error) {
        context.log.error("Error applying new clip timestamp.");
        context.log.error(error);
      }
    } else {
      context.log.error("Clip timestamp element not found.");
    }
  }
  if (context.router.current?.name === "video") {
    if (!context.settings.get("addon.trubbel.format.datetime-video")) return;

    const videoId = location.pathname.split("/videos/")[1];

    if (!videoId) {
      context.log.error("Unable to get the video ID.");
      return;
    }

    const metadataElement = await context.site.awaitElement(".channel-info-content .timestamp-metadata__bar + p");
    if (metadataElement) {

      const apollo = context.resolve("site.apollo");
      if (!apollo) {
        return null;
      }

      const result = await apollo.client.query({
        query: GET_VIDEO,
        variables: {
          id: videoId
        }
      });

      try {
        if (result?.data?.video && result?.data?.video.createdAt) {
          const createdAt = result?.data?.video.createdAt;
          let relative = "";
          if (context.settings.get("addon.trubbel.format.datetime-relative")) {
            relative = ` (${context.i18n.toRelativeTime(createdAt)})`;
          }
          const timestamp = context.i18n.formatDateTime(
            createdAt,
            context.settings.get("addon.trubbel.format.datetime")
          );

          metadataElement.textContent = "";
          metadataElement.textContent = `${timestamp} ${relative}`;
        }
      } catch (error) {
        context.log.error("Error applying new video timestamp.");
        context.log.error(error);
      }
    } else {
      context.log.error("Video timestamp element not found.");
    }
  }
}