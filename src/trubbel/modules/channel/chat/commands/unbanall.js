import GET_BANNED_USERS from "../../../../utilities/graphql/banned-users.gql";

export default async function unbanall(event, ctx, inst) {
  const currentUserId = inst?.props.currentUserID;
  const channelId = inst?.props.channelID;

  if (!currentUserId || !channelId || currentUserId !== channelId) {
    inst.addMessage({
      type: ctx.site.children.chat.chat_types.Notice,
      message: "You must be the channel owner to use this command."
    });
    return;
  }

  function formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes} minutes`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
    }
  }

  async function fetchAllBannedUsers() {
    inst.addMessage({
      type: ctx.site.children.chat.chat_types.Notice,
      message: "🚨 PLEASE KEEP THIS PAGE OPEN! 🚨"
    });

    inst.addMessage({
      type: ctx.site.children.chat.chat_types.Notice,
      message: "Counting all banned users... This may take a moment."
    });

    const apollo = ctx.resolve("site.apollo");
    if (!apollo) {
      inst.addMessage({
        type: ctx.site.children.chat.chat_types.Notice,
        message: "Unable to fetch list of banned users."
      });
      return null;
    }

    let allBannedUsers = [];
    let cursor = null;
    let hasNextPage = true;
    let pageCount = 0;

    try {
      while (hasNextPage) {
        pageCount++;

        // Show progress for large lists
        if (pageCount > 1) {
          inst.addMessage({
            type: ctx.site.children.chat.chat_types.Notice,
            message: `Fetching page ${pageCount}... Found ${allBannedUsers.length} users so far.`
          });
        }

        const result = await apollo.client.query({
          query: GET_BANNED_USERS,
          variables: {
            channelID: channelId,
            cursor: cursor
          },
          fetchPolicy: 'network-only'
        });

        const bannedUsersData = result?.data?.user?.channel?.bannedUsers;
        if (!bannedUsersData || !bannedUsersData.edges) {
          if (pageCount === 1) {
            inst.addMessage({
              type: ctx.site.children.chat.chat_types.Notice,
              message: "No banned users found or error retrieving banned users."
            });
            return null;
          }
          break;
        }

        // Extract usernames from this page
        const pageUsers = bannedUsersData.edges
          .filter(edge => edge.node?.bannedUser?.login)
          .map(edge => edge.node.bannedUser.login);

        allBannedUsers = allBannedUsers.concat(pageUsers);
        hasNextPage = bannedUsersData.pageInfo?.hasNextPage || false;
        cursor = bannedUsersData.cursor;

        ctx.log.info(`[Chat Commands - Unbanall] Page ${pageCount}: Found ${pageUsers.length} users, Total: ${allBannedUsers.length}, HasNext: ${hasNextPage}`);
      }

      return allBannedUsers;

    } catch (error) {
      ctx.log.error("[Chat Commands - Unbanall] Error fetching banned users:", error);
      inst.addMessage({
        type: ctx.site.children.chat.chat_types.Notice,
        message: "Failed to fetch banned users. Please try again."
      });
      return null;
    }
  }

  function unbanAllUsers(allUsers) {
    const totalUsers = allUsers.length;
    let processedUsers = 0;

    if (totalUsers === 0) {
      inst.addMessage({
        type: ctx.site.children.chat.chat_types.Notice,
        message: "No banned users found to unban."
      });
      return;
    }

    const progressMilestones = {};
    for (let percent = 10; percent <= 90; percent += 10) {
      const userCount = Math.ceil((percent / 100) * totalUsers);
      progressMilestones[userCount] = percent;
    }

    const estimatedTimeSeconds = Math.ceil((totalUsers / 3) + 5);
    const estimatedTime = formatTime(estimatedTimeSeconds);

    inst.addMessage({
      type: ctx.site.children.chat.chat_types.Notice,
      message: `✔️ Found ${totalUsers} banned users total. Estimated time: ${estimatedTime}`
    });

    inst.addMessage({
      type: ctx.site.children.chat.chat_types.Notice,
      message: "⚠️ DO NOT close this page or the process will stop! ⚠️"
    });

    inst.addMessage({
      type: ctx.site.children.chat.chat_types.Notice,
      message: `Starting mass unban in 5 seconds...`
    });

    setTimeout(() => {
      const interval = setInterval(() => {
        if (allUsers.length === 0) {
          clearInterval(interval);

          setTimeout(() => {
            inst.addMessage({
              type: ctx.site.children.chat.chat_types.Notice,
              message: `Progress: ${totalUsers}/${totalUsers} users unbanned (100%). Processing complete!`
            });
            inst.addMessage({
              type: ctx.site.children.chat.chat_types.Notice,
              message: `🎉 Mass unban process completed successfully!`
            });
            inst.addMessage({
              type: ctx.site.children.chat.chat_types.Notice,
              message: `✔️ Total users unbanned: ${totalUsers}`
            });
            inst.addMessage({
              type: ctx.site.children.chat.chat_types.Notice,
              message: "All banned users have been unbanned. You can now safely close this page."
            });
          }, 1000);
          return;
        }

        const user = allUsers.shift();
        processedUsers++;

        event.sendMessage(`/unban ${user}`);

        if (progressMilestones[processedUsers]) {
          const percentage = progressMilestones[processedUsers];
          const remaining = totalUsers - processedUsers;
          const timeRemaining = Math.ceil(remaining / 3);

          inst.addMessage({
            type: ctx.site.children.chat.chat_types.Notice,
            message: `Progress: ${processedUsers}/${totalUsers} users unbanned (${percentage}%). ~${timeRemaining}s remaining.`
          });
        }
      }, 333);
    }, 5000);
  }

  inst.addMessage({
    type: ctx.site.children.chat.chat_types.Notice,
    message: "Starting mass unban process..."
  });

  // Fetch all banned users first, then start unbanning
  const allBannedUsers = await fetchAllBannedUsers();

  if (allBannedUsers) {
    unbanAllUsers(allBannedUsers);
  }
}