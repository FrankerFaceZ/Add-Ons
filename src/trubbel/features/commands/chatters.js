import GET_CHATTERS from "../../utils/graphql/chatters.gql";

export default async function getChatters(context, inst) {
  const channelLogin = inst?.props.channelLogin;
  const twitch_data = await context.twitch_data.getUser(null, channelLogin);
  const displayName = twitch_data.displayName;
  const login = twitch_data.login;
  const streamer = displayName.toLowerCase() === login ? displayName : `${displayName} (${login})`;

  const apollo = context.resolve("site.apollo");
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
  const formattedCount = new Intl.NumberFormat(
    document.documentElement.getAttribute("lang")
  ).format(totalCount);

  if (totalCount) {
    inst.addMessage({
      type: context.site.children.chat.chat_types.Notice,
      message: `${streamer} has ${formattedCount} chatters.`
    });
  } else {
    inst.addMessage({
      type: context.site.children.chat.chat_types.Notice,
      message: `Unable to fetch chatter count for ${streamer}.`
    });
  }
}