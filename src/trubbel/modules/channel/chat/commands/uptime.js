import { formatLiveDuration } from "../../../../utilities/format";

export default async function uptime(ctx, inst) {
  const channelLogin = inst?.props.channelLogin;
  const twitch_data = await ctx.twitch_data.getUser(null, channelLogin);
  const user = twitch_data.displayName.toLowerCase() === twitch_data.login
    ? twitch_data.displayName
    : `${twitch_data.displayName} (${twitch_data.login})`;

  const uptime = ctx?.site?.children?.chat?.ChatContainer?.first?.props?.streamCreatedAt;
  if (uptime) {
    inst.addMessage({
      type: ctx.site.children.chat.chat_types.Notice,
      message: `${user} has been live for ${formatLiveDuration(uptime)}.`
    });
  } else {
    inst.addMessage({
      type: ctx.site.children.chat.chat_types.Notice,
      message: `${user} is offline.`
    });
  }
}