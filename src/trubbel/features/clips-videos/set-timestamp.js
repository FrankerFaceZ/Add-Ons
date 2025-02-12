import { TIMESTAMP_SELECTOR } from "../../utils/constants/selectors";
import GET_CLIP from "../../utils/graphql/clip_info.gql";
import GET_VIDEO from "../../utils/graphql/video_info.gql";

async function getIdFromURL(ctx) {
  if (location.hostname === "clips.twitch.tv" || location.pathname.includes("/clip/")) {
    const clipId = location.hostname === "clips.twitch.tv"
      ? location.pathname.slice(1)
      : location.pathname.split("/clip/")[1];

    if (clipId) {
      if (!ctx.settings.get("addon.trubbel.clip-video.timestamps-clip")) return;
      return { type: "clip", id: clipId };
    }
  }

  const videoMatch = location.pathname.match(/\/videos\/(\d+)/);
  if (videoMatch) {
    if (!ctx.settings.get("addon.trubbel.clip-video.timestamps-video")) return;
    return { type: "video", id: videoMatch[1] };
  }

  return null;
}

async function fetchCreationDate(ctx, type, id) {
  try {
    const apollo = ctx.resolve("site.apollo");
    if (!apollo) {
      ctx.log.error("[Set Timestamp] Apollo client not resolved.");
      return null;
    }

    const query = type === "clip" ? GET_CLIP : GET_VIDEO;
    const variables = type === "clip" ? { slug: id } : { id };

    const result = await apollo.client.query({
      query,
      variables,
    });

    return type === "clip"
      ? result?.data?.clip?.createdAt
      : result?.data?.video?.createdAt;
  } catch (error) {
    ctx.log.error(`[Set Timestamp] Error fetching ${type} data:`, error);
    return null;
  }
}

async function updateTimestamp(createdAt, ctx) {
  const element = await ctx.site.awaitElement(TIMESTAMP_SELECTOR, document.documentElement, 15000);
  if (!element) {
    ctx.log.error("[Set Timestamp] Timestamp element not found.");
    return;
  }

  let relative = "";
  if (ctx.settings.get("addon.trubbel.clip-video.timestamps-relative")) {
    relative = `(${ctx.i18n.toRelativeTime(createdAt)})`;
  }

  const timestamp = ctx.i18n.formatDateTime(
    createdAt,
    ctx.settings.get("addon.trubbel.clip-video.timestamps-format")
  );

  element.textContent = `${timestamp} ${relative}`;
}

export default async function setTimestamp(ctx) {
  const validRoutes = ["clip-page", "user-clip", "video"];
  if (!validRoutes.includes(ctx.router.current_name)) return;

  const idInfo = await getIdFromURL(ctx);
  if (!idInfo) return;

  if (!ctx.settings.get("addon.trubbel.clip-video.timestamps-clip") && idInfo.type === "clip") {
    return;
  }
  if (!ctx.settings.get("addon.trubbel.clip-video.timestamps-video") && idInfo.type === "video") {
    return;
  }

  const createdAt = await fetchCreationDate(ctx, idInfo.type, idInfo.id);
  if (createdAt) {
    await updateTimestamp(createdAt, ctx);
  }
}