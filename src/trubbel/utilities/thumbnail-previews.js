export function getVideoPreviewURL(login, settings) {
  const params = new URLSearchParams({
    channel: login,
    enableExtensions: false,
    parent: "twitch.tv",
    player: "popout",
    quality: settings.quality,
    muted: settings.muted ? false : true,
    volume: localStorage.getItem("volume") || 0.5,
    controls: false,
    disable_frankerfacez: true
  });
  return `https://player.twitch.tv/?${params}`;
}

export function createVideoPreview(container, streamer, settings) {
  const iframe = document.createElement("iframe");
  iframe.src = getVideoPreviewURL(streamer, settings);
  iframe.style.position = "absolute";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.style.pointerEvents = "none";

  container.appendChild(iframe);
  return iframe;
}

export function handleMouseEnter(event, settings) {
  if (!(event.target instanceof Element)) return;
  if (event.target.closest(".blurred-preview-card-image")) return;

  const link = event.target.closest("[data-a-target=\"preview-card-image-link\"]");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!/^\/(?!videos\/\d+$)[^/]+$/.test(href)) return;

  const streamer = href.substring(1);
  const container = link.querySelector(".tw-aspect");

  if (container && !container.querySelector("iframe")) {
    const iframe = createVideoPreview(container, streamer, settings);
    container.dataset.previewActive = "true";
  }
}

export function handleMouseLeave(event) {
  if (!(event.target instanceof Element)) return;

  const link = event.target.closest("[data-a-target=\"preview-card-image-link\"]");
  if (!link) return;

  // Fix for ".ffz-top-right" interference
  if (link.contains(event.relatedTarget)) return;

  const container = link.querySelector(".tw-aspect");
  if (container && container.dataset.previewActive === "true") {
    const iframe = container.querySelector("iframe");
    if (iframe) {
      iframe.remove();
      delete container.dataset.previewActive;
    }
  }
}