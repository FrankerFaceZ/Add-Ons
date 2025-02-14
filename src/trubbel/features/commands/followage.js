import { formatFollowAge } from "../../utils/format";

export default async function getFollowAge(context, inst) {
  const channelID = inst?.props.channelID;
  const channelLogin = inst?.props.channelLogin;
  const currentUserID = inst?.props.currentUserID;

  if (channelID === currentUserID) {
    inst.addMessage({
      type: context.site.children.chat.chat_types.Notice,
      message: "You cannot follow yourself."
    });
    return;
  }

  const getBroadcaster = await context.twitch_data.getUser(null, channelLogin);
  const getUser = await context.twitch_data.getUser(currentUserID);

  const broadcaster = getBroadcaster.displayName.toLowerCase() === getBroadcaster.login ? getBroadcaster.displayName : `${getBroadcaster.displayName} (${getBroadcaster.login})`;
  const user = getUser.displayName.toLowerCase() === getUser.login ? getUser.displayName : `${getUser.displayName} (${getUser.login})`;

  const data = await context.twitch_data.getUserFollowed(null, channelLogin);
  if (data) {
    const followAge = data.followedAt;
    inst.addMessage({
      type: context.site.children.chat.chat_types.Notice,
      message: `${user} has been following ${broadcaster} for ${formatFollowAge(followAge)}.`
    });
  } else {
    inst.addMessage({
      type: context.site.children.chat.chat_types.Notice,
      message: `${user} is not following ${broadcaster}.`
    });
  }
}