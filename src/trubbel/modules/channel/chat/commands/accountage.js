import GET_ACCOUNTAGE from "../../../../utilities/graphql/accountage.gql";
import { formatAccountAge } from "../../../../utilities/format";

export default async function accountage(ctx, inst) {
  const userId = inst?.props.currentUserID;
  const username = inst?.props.currentUserLogin;

  const twitch_data = await ctx.twitch_data.getUser(userId);
  const user = twitch_data.displayName.toLowerCase() === twitch_data.login
    ? twitch_data.displayName
    : `${twitch_data.displayName} (${twitch_data.login})`;

  const apollo = ctx.resolve("site.apollo");
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
      type: ctx.site.children.chat.chat_types.Notice,
      message: `${user} created their account ${formatAccountAge(accountAge)}.`
    });
  } else {
    inst.addMessage({
      type: ctx.site.children.chat.chat_types.Notice,
      message: `Unable to get accountage for ${user}.`
    });
  }
}