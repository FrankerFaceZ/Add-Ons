<template>
<div class="cvc-badge-carousel cvc-moments-carousel">
  <div class="cvc-badge-carousel__top">
    <button class="cvc-badge-carousel__back" @click="$emit('back')">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.5 14.5 9 10l4.5-4.5L12 4l-6 6 6 6 1.5-1.5z" />
      </svg>
      <span>{{ t("back", "Badges") }}</span>
    </button>
  </div>

  <div v-if="!moments" class="cvc-moments-carousel__loading">
    <figure class="ffz-i-zreknarf loading" />
  </div>

  <div v-else-if="!moments.length" class="cvc-moments-carousel__empty">
    <div class="cvc-moments-carousel__empty-image">
      <img :src="emptyImage" :alt="t('empty.image', 'Default clip image')">
    </div>
    <div class="cvc-moments-carousel__empty-text">
      <p class="cvc-badge-carousel__header">{{ t("empty.title", "No moments available") }}</p>
      <p class="cvc-moments-carousel__meta">
        {{ t("empty.description", "Sorry! Your Moments may have been removed by the channel owner or taken down due to copyright.") }}
      </p>
    </div>
  </div>

  <div v-else class="cvc-badge-carousel__row">
    <button class="cvc-badge-carousel__arrow" :class="{ hidden: !slots[0] }" :disabled="!slots[0]"
      :aria-label="t('previous', 'Previous moment')" @click="move(-1)">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.5 14.5 9 10l4.5-4.5L12 4l-6 6 6 6 1.5-1.5z" />
      </svg>
    </button>

    <!-- Like the badges: three fixed slots that only swap the image source -->
    <div class="cvc-badge-carousel__slots">
      <div v-for="(moment, i) in slots" :key="i" class="cvc-badge-carousel__slot">
        <div v-if="moment" class="cvc-moments-carousel__moment">
          <button :disabled="i === 1" @click="move(i - 1)" :style="i === 1 ? activeBorder : null"
            :class="i === 1 ? 'cvc-moments-carousel__moment-active' : 'cvc-moments-carousel__moment-inactive'">
            <img :src="moment.clip && moment.clip.thumbnailURL" :alt="t('thumbnail', 'The clip thumbnail image')">
          </button>
          <div v-if="i === 1" class="cvc-moments-carousel__badge" :style="badgeBorder">
            <img :src="badgeImage" :alt="t('badge', 'The community moments badge')">
          </div>
        </div>
        <div v-else class="cvc-moments-carousel__placeholder"></div>
      </div>
    </div>

    <div v-if="loadingMore" class="cvc-badge-carousel__arrow">
      <figure class="ffz-i-zreknarf loading" />
    </div>
    <button v-else class="cvc-badge-carousel__arrow" :class="{ hidden: !slots[2] }" :disabled="!slots[2]"
      :aria-label="t('next', 'Next moment')" @click="move(1)">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M6.5 5.5 11 10l-4.5 4.5L8 16l6-6-6-6-1.5 1.5z" />
      </svg>
    </button>
  </div>

  <div v-if="current" class="cvc-badge-carousel__info">
    <p class="cvc-moments-carousel__label">{{ t("label", "moments") }}</p>
    <p class="cvc-badge-carousel__header">{{ current.clip && current.clip.title }}</p>
    <p class="cvc-moments-carousel__meta">
      <span>{{ date }}</span>
      <span class="cvc-moments-carousel__dot">•</span>
      <span>{{ claimed }}</span>
    </p>
    <div v-if="current.clip && current.clip.url" class="cvc-badge-carousel__buttons">
      <a class="cvc-badge-carousel__btn" :href="current.clip.url" target="_blank" rel="noopener noreferrer">
        {{ t("view", "View Moment") }}
      </a>
    </div>
  </div>
</div>
</template>

<script>
const PURPLE = "#9147FF";
const RED = "#E91916";
// Twitch's own fallbacks for the moments badge and the empty state
const DEFAULT_BADGE = "https://static-cdn.jtvnw.net/badges/v1/bf370830-d79a-497b-81c6-a365b2b60dda/2";
const EMPTY_IMAGE = "https://assets.twitch.tv/assets/clips-empty-state-no-background-28f109c19006bdc92276.png";

export default {
  props: ["user", "badge", "getFFZ"],

  data() {
    return {
      moments: null,
      index: 0,
      hasNextPage: false,
      loadingMore: false,
      channelColor: null
    }
  },

  computed: {
    current() {
      return (this.moments && this.moments[this.index]) || null;
    },

    slots() {
      var list = this.moments || [], len = list.length, i = this.index;
      if (!len) return [null, null, null];
      return [i > 0 ? list[i - 1] : null, list[i], i < len - 1 ? list[i + 1] : null];
    },

    activeBorder() {
      return { background: "linear-gradient(to right, " + PURPLE + ", " + this.endColor + ") border-box" };
    },

    badgeBorder() {
      return { background: "linear-gradient(to right, " + this.endColor + ", " + PURPLE + ") border-box" };
    },

    endColor() {
      return this.channelColor ? "#" + this.channelColor : RED;
    },

    badgeImage() {
      return (this.badge && this.badge.image2x) || DEFAULT_BADGE;
    },

    emptyImage() {
      return EMPTY_IMAGE;
    },

    date() {
      return this.current ? this.getFFZ().resolve("i18n").formatDate(this.current.createdAt, "medium") : "";
    },

    claimed() {
      var count = this.current ? this.current.claimCount || 0 : 0;
      return this.t("claimed",
        "{count, plural, one {{count, number} viewer claimed} other {{count, number} viewers claimed}}",
        { count: count });
    }
  },

  mounted() {
    this.load();
  },

  methods: {
    t(key, phrase, data) {
      return this.getFFZ().resolve("i18n").t("addon.trubbel.viewer-cards.moments." + key, phrase, data);
    },

    move(step) {
      var len = this.moments ? this.moments.length : 0;
      if (!len || !step) return;
      var next = this.index + step;
      if (next < 0 || next >= len) return;
      this.index = next;
      // Like Twitch: on the last loaded moment, load the next page
      if (next === len - 1) this.load(true);
    },

    // 25 at a time, the next page after the last edge's cursor (same as Twitch)
    async load(more) {
      if (more && (!this.hasNextPage || this.loadingMore)) return;

      var twitch_data = this.getFFZ().resolve("site.twitch_data"),
        user = this.user,
        // In Shared Chat the badges (and so the moments) belong to the message's own channel
        channel = user && (user.sourceChannel || user.channelUser);
      if (!twitch_data || !user || !user.login || !channel) return;

      var vars = { userLogin: user.login, channelLogin: channel.login, first: 25 };
      if (more) {
        vars.cursor = this._cursor || "";
        this.loadingMore = true;
      }

      try {
        var result = await twitch_data.queryApollo(
          await import(/* webpackChunkName: "queries" */ "../../utilities/graphql/viewer_card/card-community-moments.gql"),
          vars
        );
        var data = result && result.data,
          viewer = data && data.channelViewer,
          conn = viewer && viewer.earnedCommunityMoments,
          edges = (conn && conn.edges) || [];

        var seen = new Set((this.moments || []).map(function(m) { return m.id; })),
          added = edges.map(function(e) { return e && e.node; }).filter(function(n) {
            return n && n.clip && !seen.has(n.id);
          });

        this.moments = more ? this.moments.concat(added) : added;
        this.hasNextPage = !!(conn && conn.pageInfo && conn.pageInfo.hasNextPage);
        this._cursor = edges.length ? edges[edges.length - 1].cursor : "";
        if (data && data.user) this.channelColor = data.user.primaryColorHex || null;

        // Twitch also loads the next page right away when the first one has one moment or none
        if (!more && this.moments.length <= 1) this.load(true);

      } catch (err) {
        console.warn("[ViewerCards] Unable to load moments:", err);
        if (!more && !this.moments) this.moments = [];
      } finally {
        this.loadingMore = false;
      }
    }
  }
}
</script>