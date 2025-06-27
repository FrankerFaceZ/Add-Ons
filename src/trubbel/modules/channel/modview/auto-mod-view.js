export async function autoModView(ctx) {
  if (ctx.settings.get("addon.trubbel.channel.mod-view-auto")) {
    if (ctx.router?.current_name === "user" && ctx.router?.current_state?.channelView === "Watch") {
      ctx.router.replace("/moderator" + ctx.router.location);
    }
  }
}