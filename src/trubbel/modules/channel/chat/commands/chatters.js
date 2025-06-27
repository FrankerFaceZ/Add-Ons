import GET_CHATTERS from "../../../../utilities/graphql/chatters.gql";

export default async function chatters(ctx, inst) {
  const channelLogin = inst?.props.channelLogin;
  const twitch_data = await ctx.twitch_data.getUser(null, channelLogin);
  const streamer = twitch_data.displayName.toLowerCase() === twitch_data.login
    ? twitch_data.displayName
    : `${twitch_data.displayName} (${twitch_data.login})`;

  const apollo = ctx.resolve("site.apollo");
  if (!apollo) {
    return null;
  }

  const result = await apollo.client.query({
    query: GET_CHATTERS,
    variables: {
      name: channelLogin
    }
  });

  const totalCount = result?.data?.channel?.chatters?.count;
  const formattedCount = ctx.resolve("i18n").formatNumber(totalCount);
  if (totalCount) {
    inst.addMessage({
      type: ctx.site.children.chat.chat_types.Notice,
      message: `${streamer} has ${formattedCount} chatters.`
    });
  } else {
    inst.addMessage({
      type: ctx.site.children.chat.chat_types.Notice,
      message: `Unable to fetch chatter count for ${streamer}.`
    });
  }
}