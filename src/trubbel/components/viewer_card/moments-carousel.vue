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

  <div class="cvc-badge-carousel__row">
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
          <button :disabled="i === 1" @click="move(i - 1)"
            :class="i === 1 ? 'cvc-moments-carousel__moment-active' : 'cvc-moments-carousel__moment-inactive'">
            <img :src="moment.clip && moment.clip.thumbnailURL" :alt="t('thumbnail', 'The clip thumbnail image')">
          </button>
          <div v-if="i === 1 && badge" class="cvc-moments-carousel__badge">
            <img :src="badge.image2x" :alt="t('badge', 'The community moments badge')">
          </div>
        </div>
        <div v-else class="cvc-moments-carousel__placeholder"></div>
      </div>
    </div>

    <button class="cvc-badge-carousel__arrow" :class="{ hidden: !slots[2] }" :disabled="!slots[2]"
      :aria-label="t('next', 'Next moment')" @click="move(1)">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M6.5 5.5 11 10l-4.5 4.5L8 16l6-6-6-6-1.5 1.5z" />
      </svg>
    </button>
  </div>

  <div v-if="current" class="cvc-badge-carousel__info">
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
export default {
  props: ["user", "badge", "getFFZ"],

  data() {
    return {
      moments: [],
      index: 0
    }
  },

  computed: {
    current() {
      return this.moments[this.index] || null;
    },

    // [previous, current, next] - wraps around with 3+ moments, like the badges
    slots() {
      var list = this.moments, len = list.length, i = this.index;
      if (!len) return [null, null, null];
      if (len >= 3)
        return [list[(i - 1 + len) % len], list[i], list[(i + 1) % len]];
      return [i > 0 ? list[i - 1] : null, list[i], i < len - 1 ? list[i + 1] : null];
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
      var len = this.moments.length;
      if (!len || !step) return;
      var next = this.index + step;
      if (len >= 3) next = (next + len) % len;
      if (next < 0 || next >= len) return;
      this.index = next;
    },

    async load() {
      var twitch_data = this.getFFZ().resolve("site.twitch_data"),
        user = this.user,
        // In Shared Chat the badges (and so the moments) belong to the message's own channel
        channel = user && (user.sourceChannel || user.channelUser);
      if (!twitch_data || !user || !user.login || !channel) return;

      try {
        var result = await twitch_data.queryApollo(
          await import(/* webpackChunkName: "queries" */ "../../utilities/graphql/viewer_card/card-community-moments.gql"),
          { userLogin: user.login, channelLogin: channel.login, first: 25 }
        );
        var viewer = result && result.data && result.data.channelViewer,
          edges = (viewer && viewer.earnedCommunityMoments && viewer.earnedCommunityMoments.edges) || [];
        this.moments = edges.map(function(e) { return e && e.node; }).filter(Boolean);
      } catch (err) {
        console.warn("[ViewerCards] Unable to load moments:", err);
      }
    }
  }
}
</script>