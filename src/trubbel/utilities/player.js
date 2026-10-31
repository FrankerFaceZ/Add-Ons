export function findPlayer(props) {
  const player = props?.mediaPlayerInstance;
  return player?.playerInstance ?? player;
}

export function findPlayerCore(props) {
  const player = findPlayer(props);
  return player?.core ?? player;
}

export function getPayload(event) {
  const data = event?.detail ?? event;
  return Array.isArray(data) ? data[0] : data;
}

export const QUALITY_OPTIONS = [
  { value: "unset", title: "Unset" },
  { value: "auto", title: "Auto" },
  { value: "source", title: "Source" },
  { value: "max:1080", title: "Up to 1080p" },
  { value: "max:720", title: "Up to 720p" },
  { value: "max:480", title: "Up to 480p" },
  { value: "max:360", title: "Up to 360p" },
  { value: "lowest", title: "Lowest" }
];

const QUALITY_CAPS = [1080, 720, 480, 360];

export function normalizeQuality(value) {
  if (!value)
    return "unset";

  if (QUALITY_OPTIONS.some(o => o.value === value))
    return value;

  const match = /^(\d+)p/.exec(value);
  if (!match)
    return "unset";

  const height = parseInt(match[1], 10);
  if (height > QUALITY_CAPS[0])
    return "source";

  const cap = QUALITY_CAPS.find(c => c <= height);
  return cap ? `max:${cap}` : "lowest";
}

function getVideoQualities(player) {
  const qualities = player?.getQualities?.();
  return Array.isArray(qualities) ? qualities.filter(q => q.height > 0) : [];
}

function byBest(a, b) {
  return b.height - a.height || b.framerate - a.framerate || b.bitrate - a.bitrate;
}

export function findBestQuality(player) {
  const qualities = getVideoQualities(player);
  return qualities.find(q => q.variantSource === "source") ?? qualities.sort(byBest)[0] ?? null;
}

export function resolveQuality(player, option) {
  const qualities = getVideoQualities(player).sort(byBest);
  if (!qualities.length)
    return null;

  if (option === "source")
    return findBestQuality(player);

  if (option === "lowest")
    return qualities[qualities.length - 1];

  if (option?.startsWith("max:")) {
    const cap = parseInt(option.slice(4), 10);
    return qualities.find(q => q.height <= cap) ?? qualities[qualities.length - 1];
  }

  return null;
}

export function setFixedQuality(player, quality) {
  if (!quality || !player?.setQuality)
    return false;

  if (!player.isAutoQualityMode?.() && player.getQuality?.()?.group === quality.group)
    return false;

  player.setQuality(quality);
  return true;
}

export function isPlayingContent(props) {
  const core = findPlayerCore(props),
    content = props?.content,
    path = core?.state?.path;

  if (!core?.isLoaded || !core.isReady || !path || core.state?.state !== "Playing")
    return false;

  if (content?.type === "live" && content.channelLogin)
    return path.toLowerCase().includes(`/${content.channelLogin.toLowerCase()}.m3u8`);

  return true;
}

export function setVolume(props, percent) {
  const player = props?.mediaPlayerInstance,
    core = findPlayerCore(props);

  if (!player?.setVolume)
    return false;

  if (core?._ffz_fakeVolume && core.setVolume === core._ffz_fakeVolume)
    return false;

  player.setVolume(Math.max(0, Math.min(100, percent)) / 100);
  return true;
}