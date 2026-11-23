const LEADER_SETS = ["bits-leader", "clips-leader", "sub-gift-leader"];

const ROLE_SETS = ["moderator", "staff", "admin", "extension", "broadcaster", "partner", "vip", "artist-badge"];

// Moments badge tier -> number of moments
const MOMENT_TIERS = {
  1: 1, 2: 5, 3: 10, 4: 15, 5: 20, 6: 30, 7: 40, 8: 50, 9: 60, 10: 75,
  11: 90, 12: 105, 13: 120, 14: 140, 15: 160, 16: 180, 17: 200, 18: 225, 19: 250, 20: 275
};

const BADGES_GUIDE = "https://help.twitch.tv/s/article/twitch-chat-badges-guide";

// Badges that need one extra query, run only when the carousel lands on them
export function badgeNeeds(badge) {
  if (!badge) return null;
  if (LEADER_SETS.includes(badge.setID)) return "leaderboard";
  if (badge.setID === "game-developer") return "developer";
  return null;
}

// ctx: { t, formatNumber, userName, channelName, channelLogin, period, orgs, followingChannel, canFollowChannel, isChannelOwner }
export function describeBadge(badge, ctx) {
  if (!badge) return null;
  var t = ctx.t,
    learnMore = function(url) { return { label: t("learn-more", "Learn More"), url: url }; },
    subsURL = ctx.channelLogin ? "https://www.twitch.tv/subs/" + encodeURIComponent(ctx.channelLogin) : null;

  switch (badge.setID) {
    case "subscriber":
      return subscriber(badge, ctx, subsURL);

    case "bits":
      return {
        header: t("bits.header", "Cheer{version} Badge", { version: badge.version }),
        description: t("bits.description", "{userName} cheered {version} Bits to {channelName}'s channel.", {
          userName: ctx.userName, version: badge.version, channelName: ctx.channelName
        }),
        buttons: badge.clickURL ? [{ label: t("bits.button", "Guide to Cheering"), url: badge.clickURL }] : []
      };

    case "sub-gifter":
      return {
        header: t("gifter.header", "{badgeTitle} Badge", { badgeTitle: badge.title }),
        description: t("gifter.description",
          "{giftNumber, plural, one {{userName} has gifted subscriptions in {channelName}'s channel} other {{userName} has gifted {giftNumber, number} subscriptions in {channelName}'s channel}}", {
            userName: ctx.userName, giftNumber: parseInt(badge.version, 10), channelName: ctx.channelName
          }),
        buttons: subsURL ? [{ label: t("gift-sub", "Gift a Subscription"), url: subsURL }] : []
      };

    case "bits-leader":
    case "clips-leader":
    case "sub-gift-leader":
      return leaderboard(badge, ctx, subsURL);

    case "premium":
      return {
        header: t("prime.header", "Prime Badge"),
        description: t("prime.description", "Prime includes a free monthly Twitch channel Subscription"),
        buttons: [{ label: t("prime.button", "Learn More about Prime"), url: "https://www.twitch.tv/prime" }]
      };

    case "predictions": {
      var outcome = String(badge.version).match(/(.*)\-(\d*)/);
      if (!outcome) return null;
      return {
        header: t("predictions.header", "Predicted Outcome {outcomeNumber}", { outcomeNumber: outcome[2] }),
        description: t("predictions.description", "{userName} predicted this outcome for {currentChannel}'s current Channel Points Prediction.", {
          userName: ctx.userName, currentChannel: ctx.channelName
        }),
        buttons: [learnMore("https://help.twitch.tv/s/article/channel-points-predictions")]
      };
    }

    case "founder":
      return {
        header: t("founder.header", "Founder Badge"),
        description: t("founder.description", "{userName} is one of the first Prime or paid subscribers of {currentChannel}'s channel.", {
          userName: ctx.userName, currentChannel: ctx.channelName
        }),
        buttons: [learnMore("https://help.twitch.tv/s/article/founders-badge")]
      };

    case "moments": {
      var moments = MOMENT_TIERS[badge.version] || 0;
      return {
        header: t("moments.header", "Moments Badge (Tier {tier})", { tier: badge.version }),
        description: t("moments.description",
          "{moments, plural, one {{userName} has been a part of at least {moments, number} Moment on {channelName}'s channel.} other {{userName} has been a part of at least {moments, number} Moments on {channelName}'s channel.}}", {
            userName: ctx.userName, moments: moments, channelName: ctx.channelName
          }),
        buttons: [
          Object.assign(learnMore("https://help.twitch.tv/s/article/moments"), { secondary: true }),
          { label: t("moments.button", "See Moments"), action: "moments" }
        ]
      };
    }

    case "game-developer":
      // Twitch shows nothing until the organizations are loaded
      if (!ctx.orgs) return null;
      return {
        header: badge.title,
        description: t("developer.description", "{username} is a game developer for the following organization(s):", { username: ctx.userName }),
        orgs: ctx.orgs.map(function(org) {
          var url = org.url || "";
          if (url && !/^https?:\/\//.test(url)) url = "https://" + url;
          return { name: org.name, url: isValidURL(url) ? url : null };
        }),
        buttons: []
      };

    case "social-sharing": {
      if (!ctx.userName) return null;
      var social = {
        1: t("social.description.1", "{userName} earned an Icon badge for reaching 100 views on their social posts.", { userName: ctx.userName }),
        2: t("social.description.2", "{userName} earned a Pro badge for reaching 10,000 views on their social posts.", { userName: ctx.userName }),
        3: t("social.description.3", "{userName} earned a Legend badge for reaching 100,000 views on their social posts.", { userName: ctx.userName })
      };
      return {
        header: t("social.header", "Social Media Badge"),
        description: social[badge.version] || "",
        buttons: [{ label: t("social.button", "Earn Your Badge"), url: "https://www.twitch.tv/drops/social-badge" }]
      };
    }
  }

  if (ROLE_SETS.includes(badge.setID))
    return {
      header: badge.title,
      description: roleDescription(badge.setID, ctx),
      buttons: [learnMore(badge.clickURL || BADGES_GUIDE)]
    };

  if (badge.setID.startsWith("campaign-"))
    return {
      header: badge.title,
      description: badge.setID.endsWith("-mw")
        ? t("campaign.watch", "This badge was earned by watching during {channelName}'s event.", { channelName: ctx.channelName })
        : badge.setID.endsWith("-ranking")
          ? t("campaign.ranking", "This badge was earned by being top supporter during {channelName}'s event", { channelName: ctx.channelName })
          : t("campaign.sub", "This badge was earned by subscribing during {channelName}'s event.", { channelName: ctx.channelName }),
      buttons: []
    };

  // Everything else: the badge's own title and description
  return {
    header: badge.title,
    description: badge.description || "",
    buttons: badge.clickURL ? [learnMore(badge.clickURL)] : []
  };
}

function subscriber(badge, ctx, subsURL) {
  var t = ctx.t,
    match = String(badge.version).match(/(2\d|3\d)?(\d+)/);
  if (!match || !ctx.channelName) return null;

  var tier = match[1] === "30" ? 3 : match[1] === "20" ? 2 : 1,
    months = parseInt(match[2], 10),
    header, description;

  if (months > 0) {
    var duration = months / 12 >= 1
      ? t("sub.years", "{years, number} year", { years: months / 12 })
      : t("sub.months", "{months, number} month", { months: months });

    header = t("sub.header", "{channelName}'s Subscriber Badge ({tierLabel}{durationLabel})", {
      channelName: ctx.channelName,
      durationLabel: duration,
      tierLabel: tier > 1 ? t("sub.tier-prefix", "Tier {tier}, ", { tier: tier }) : ""
    });
    description = t("sub.description", "{userName} reached the {durationLabel} subscription mark for {channelName}'s channel.", {
      userName: ctx.userName, durationLabel: duration, channelName: ctx.channelName
    });

  } else {
    header = t("sub.header-plain", "{channelName}'s Subscriber Badge{tierLabel}", {
      channelName: ctx.channelName,
      tierLabel: tier > 1 ? t("sub.tier-suffix", " (Tier {tier})", { tier: tier }) : ""
    });
    description = t("sub.description-plain", "{userName} is subscribed to {channelName}'s channel.", {
      userName: ctx.userName, channelName: ctx.channelName
    });
  }

  // Like Twitch: Follow if you don't follow the channel yet, otherwise Subscribe
  var buttons = [];
  if (ctx.followingChannel) {
    if (subsURL && !ctx.isChannelOwner) buttons.push({ label: t("sub.subscribe", "Subscribe"), url: subsURL });
  } else if (ctx.canFollowChannel)
    buttons.push({ label: t("sub.follow", "Follow"), action: "follow" });

  return { header: header, description: description, buttons: buttons };
}

function leaderboard(badge, ctx, subsURL) {
  var t = ctx.t;
  // Twitch shows nothing until the leaderboard period is loaded
  if (!ctx.period) return null;

  var leaderType, button;
  if (badge.setID === "bits-leader") {
    leaderType = t("leader.cheerer", "Cheerer");
    button = { label: t("bits.button", "Guide to Cheering"), url: "https://www.twitch.tv/bits" };
  } else if (badge.setID === "clips-leader") {
    leaderType = t("leader.clipper", "Clipper");
    button = { label: t("learn-more", "Learn More"), url: "https://help.twitch.tv/s/article/leaderboards-guide" };
  } else {
    leaderType = t("leader.gifter", "Gifter");
    button = subsURL ? { label: t("gift-sub", "Gift a Subscription"), url: subsURL } : null;
  }

  var description;
  if (ctx.period === "ALLTIME")
    description = t("leader.alltime", "{userName} is currently the all-time #{position} {leaderType} on {channelName}'s channel.", {
      userName: ctx.userName, position: badge.version, leaderType: leaderType, channelName: ctx.channelName
    });
  else {
    var interval = ctx.period === "MONTH" ? t("leader.month", "month")
      : ctx.period === "WEEK" ? t("leader.week", "week")
        : t("leader.day", "day");
    description = t("leader.period", "{userName} is currently the #{position} {leaderType} for the {timeInterval} on {channelName}'s channel.", {
      userName: ctx.userName, position: badge.version, leaderType: leaderType, timeInterval: interval, channelName: ctx.channelName
    });
  }

  return {
    header: t("leader.header", "Top {leaderType} Badge", { leaderType: leaderType }),
    description: description,
    buttons: button ? [button] : []
  };
}

function roleDescription(setID, ctx) {
  var t = ctx.t, data = { userName: ctx.userName, channelName: ctx.channelName };
  switch (setID) {
    case "moderator": return t("role.moderator", "{userName} is a moderator of {channelName}'s channel.", data);
    case "staff": return t("role.staff", "{userName} is part of the fine folk who make Twitch tick. Say hello!", data);
    case "admin": return t("role.admin", "{userName} is responsible for reviewing reports and enforcing our Terms of Service. In short, they help us keep Twitch safe and fun.", data);
    case "extension": return t("role.extension", "This message was sent by an extension that is installed on this channel.");
    case "broadcaster": return t("role.broadcaster", "{userName} is the owner of the Channel that you are currently visiting on Twitch.", data);
    case "partner": return t("role.partner", "{userName} is a Twitch Verified user.", data);
    case "vip": return t("role.vip", "{channelName} has recognized {userName} as a VIP in their channel.", data);
    case "artist-badge": return t("role.artist", "{channelName} has recognized {userName} as an Artist in their channel.", data);
  }
  return "";
}

function isValidURL(url) {
  try {
    var u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch (err) {
    return false;
  }
}