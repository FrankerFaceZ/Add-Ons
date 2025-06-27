import { formatFollowAge } from "../../../../utilities/format";

export default async function followage(ctx, inst) {
  const channelID = inst?.props.channelID;
  const channelLogin = inst?.props.channelLogin;
  const currentUserID = inst?.props.currentUserID;

  if (channelID === currentUserID) {
    inst.addMessage({
      type: ctx.site.children.chat.chat_types.Notice,
      message: "You cannot follow yourself."
    });
    return;
  }

  const getBroadcaster = await ctx.twitch_data.getUser(null, channelLogin);
  const getUser = await ctx.twitch_data.getUser(currentUserID);

  const broadcaster = getBroadcaster.displayName.toLowerCase() === getBroadcaster.login
    ? getBroadcaster.displayName
    : `${getBroadcaster.displayName} (${getBroadcaster.login})`;

  const user = getUser.displayName.toLowerCase() === getUser.login
    ? getUser.displayName
    : `${getUser.displayName} (${getUser.login})`;

  const data = await ctx.twitch_data.getUserFollowed(null, channelLogin);
  if (data) {
    const followAge = data.followedAt;
    inst.addMessage({
      type: ctx.site.children.chat.chat_types.Notice,
      message: `${user} has been following ${broadcaster} for ${formatFollowAge(followAge)}.`
    });
  } else {
    inst.addMessage({
      type: ctx.site.children.chat.chat_types.Notice,
      message: `${user} is not following ${broadcaster}.`
    });
  }
}