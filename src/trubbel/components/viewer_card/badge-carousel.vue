<template>
<div class="cvc-badge-carousel">
  <div class="cvc-badge-carousel__top">
    <button class="cvc-badge-carousel__back" @click="$emit('back')">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.5 14.5 9 10l4.5-4.5L12 4l-6 6 6 6 1.5-1.5z" />
      </svg>
      <span>{{ t("back", "Back") }}</span>
    </button>
  </div>

  <div class="cvc-badge-carousel__row">
    <button class="cvc-badge-carousel__arrow" :class="{ hidden: !slots[0] }" :disabled="!slots[0]"
      :aria-label="t('previous', 'Previous badge')" @click="move(-1)">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.5 14.5 9 10l4.5-4.5L12 4l-6 6 6 6 1.5-1.5z" />
      </svg>
    </button>

    <!-- Like Twitch: three fixed slots that only swap the image source, so the old image stays until the new one is loaded -->
    <div class="cvc-badge-carousel__slots">
      <div v-for="(badge, i) in slots" :key="i" class="cvc-badge-carousel__slot">
        <button v-if="badge" :disabled="i === 1" @click="move(i - 1)">
          <img :class="i === 1 ? 'cvc-badge-carousel__badge-active' : 'cvc-badge-carousel__badge-inactive'"
            :src="badge.image4x" :alt="badge.title">
        </button>
        <div v-else class="cvc-badge-carousel__badge-placeholder"></div>
      </div>
    </div>

    <button class="cvc-badge-carousel__arrow" :class="{ hidden: !slots[2] }" :disabled="!slots[2]"
      :aria-label="t('next', 'Next badge')" @click="move(1)">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M6.5 5.5 11 10l-4.5 4.5L8 16l6-6-6-6-1.5 1.5z" />
      </svg>
    </button>
  </div>

  <div v-if="info" class="cvc-badge-carousel__info">
    <p class="cvc-badge-carousel__header">{{ info.header }}</p>
    <p v-if="info.description && info.description !== info.header" class="cvc-badge-carousel__description">{{ info.description }}</p>
    <ul v-if="info.orgs && info.orgs.length" class="cvc-badge-carousel__orgs">
      <li v-for="(org, i) in info.orgs" :key="i">
        <a v-if="org.url" :href="org.url" target="_blank" rel="noopener noreferrer">{{ org.name }}</a>
        <span v-else>{{ org.name }}</span>
      </li>
    </ul>
    <div v-if="info.buttons && info.buttons.length" class="cvc-badge-carousel__buttons">
      <template v-for="(btn, i) in info.buttons">
        <button v-if="btn.action" :key="'action-' + i" class="cvc-badge-carousel__btn"
          :disabled="btn.action === 'follow' && followBusy" @click="act(btn.action)">{{ btn.label }}</button>
        <a v-else :key="'link-' + i" class="cvc-badge-carousel__btn" :class="{ secondary: btn.secondary }" :href="btn.url"
          target="_blank" rel="noopener noreferrer">{{ btn.label }}</a>
      </template>
    </div>
  </div>
</div>
</template>

<script>
import { describeBadge, badgeNeeds } from "./badge-descriptions";

export default {
  props: ["badges", "selected", "user", "getFFZ"],

  data() {
    return {
      index: this.findIndex(this.selected),
      period: null,
      orgs: null,
      followBusy: false
    }
  },

  computed: {
    current() {
      return this.badges[this.index] || null;
    },

    // [previous, current, next] - wraps around with 3+ badges, like Twitch
    slots() {
      var list = this.badges, len = list.length, i = this.index;
      if (!len) return [null, null, null];
      if (len >= 3)
        return [list[(i - 1 + len) % len], list[i], list[(i + 1) % len]];
      return [i > 0 ? list[i - 1] : null, list[i], i < len - 1 ? list[i + 1] : null];
    },

    channel() {
      return (this.user && this.user.channelUser) || null;
    },

    info() {
      var i18n = this.getFFZ().resolve("i18n"),
        channel = this.channel,
        me = this.user && this.user.currentUser,
        self = channel && channel.self;

      return describeBadge(this.current, {
        t: function(key, phrase, data) {
          return i18n.t("addon.trubbel.viewer-cards.badge." + key, phrase, data);
        },
        userName: this.user && this.user.displayName,
        channelName: channel && channel.displayName,
        channelLogin: channel && channel.login,
        period: this.period,
        orgs: this.orgs,
        followingChannel: !!(self && self.follower),
        canFollowChannel: !!(self && self.canFollow),
        isChannelOwner: !!(me && channel && String(me.id) === String(channel.id))
      });
    }
  },

  watch: {
    selected(badge) {
      this.index = this.findIndex(badge);
    },

    current: {
      immediate: true,
      handler(badge) {
        this.load(badgeNeeds(badge));
      }
    }
  },

  methods: {
    t(key, phrase, data) {
      return this.getFFZ().resolve("i18n").t("addon.trubbel.viewer-cards.badge." + key, phrase, data);
    },

    findIndex(badge) {
      if (!badge || !this.badges) return 0;
      var i = this.badges.findIndex(function(b) {
        return b.setID === badge.setID && b.version === badge.version;
      });
      return i === -1 ? 0 : i;
    },

    move(step) {
      var len = this.badges.length;
      if (!len || !step) return;
      var next = this.index + step;
      if (len >= 3) next = (next + len) % len;
      if (next < 0 || next >= len) return;
      this.index = next;
    },

    // Only the leaderboard and game developer badges need extra data, loaded once per card
    async load(what) {
      var twitch_data = this.getFFZ().resolve("site.twitch_data");
      if (!what || !twitch_data) return;

      try {
        if (what === "leaderboard" && !this.period && this.channel) {
          var result = await twitch_data.queryApollo(
            await import(/* webpackChunkName: "queries" */ "../../utilities/graphql/viewer_card/card-badge-leaderboard.gql"),
            { channelLogin: this.channel.login }
          );
          var ch = result && result.data && result.data.channel;
          this.period = (ch && ch.leaderboardTimePeriod) || null;

        } else if (what === "developer" && !this.orgs && this.user && this.user.id) {
          var res = await twitch_data.queryApollo(
            await import(/* webpackChunkName: "queries" */ "../../utilities/graphql/viewer_card/card-badge-developer.gql"),
            { userID: this.user.id }
          );
          var u = res && res.data && res.data.user;
          this.orgs = (u && u.publicOrganizations) || [];
        }
      } catch (err) {
        console.warn("[ViewerCards] Unable to load badge details:", err);
      }
    },

    act(action) {
      if (action === "follow") this.follow();
      else if (action === "moments") this.$emit("moments", this.current);
    },

    async follow() {
      var twitch_data = this.getFFZ().resolve("site.twitch_data"),
        channel = this.channel;
      if (!twitch_data || !channel || !channel.self || this.followBusy) return;

      this.followBusy = true;
      try {
        await twitch_data.followUser(channel.id);
        this.$set(channel.self, "follower", { followedAt: new Date().toISOString() });
      } catch (err) {
        console.error("[ViewerCards] Error following:", err);
      } finally {
        this.followBusy = false;
      }
    }
  }
}
</script>