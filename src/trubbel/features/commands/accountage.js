import GET_ACCOUNTAGE from "../../utils/graphql/accountage.gql";
import { formatAccountAge } from "../../utils/format";

export default async function getAccountAge(context, inst) {
  const userId = inst?.props.currentUserID;
  const username = inst?.props.currentUserLogin;

  const twitch_data = await context.twitch_data.getUser(userId);
  const displayName = twitch_data.displayName;
  const login = twitch_data.login;
  const user = displayName.toLowerCase() === login ? displayName : `${displayName} (${login})`;

  const apollo = context.resolve("site.apollo");
  if (!apollo) {
    return null;
  }

  const result = await apollo.client.query({
    query: GET_ACCOUNTAGE,
    variables: {
      login: username
    }
  });

  const accountAge = result?.data?.user?.createdAt;
  if (accountAge) {
    inst.addMessage({
      type: context.site.children.chat.chat_types.Notice,
      message: `${user} created their account ${formatAccountAge(accountAge)}.`
    });
  } else {
    inst.addMessage({
      type: context.site.children.chat.chat_types.Notice,
      message: `Unable to get accountage for ${user}.`
    });
  }
}