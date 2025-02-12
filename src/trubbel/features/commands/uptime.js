import { formatLiveDuration } from "../../utils/format";

export default async function getStreamUptime(context, inst) {
  const channelLogin = inst?.props.channelLogin;
  const twitch_data = await context.twitch_data.getUser(null, channelLogin);
  const displayName = twitch_data.displayName;
  const login = twitch_data.login;
  const user = displayName.toLowerCase() === login ? displayName : `${displayName} (${login})`;

  const uptime = context?.site?.children?.chat?.ChatContainer?.first?.props?.streamCreatedAt;
  if (uptime) {
    inst.addMessage({
      type: context.site.children.chat.chat_types.Notice,
      message: `${user} has been live for ${formatLiveDuration(uptime)}.`
    });
  } else {
    inst.addMessage({
      type: context.site.children.chat.chat_types.Notice,
      message: `${user} is offline.`
    });
  }
}