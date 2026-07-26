<template>
  <a class="custom-mod-landing-card" :class="isLive ? 'custom-mod-landing-card--live' : 'custom-mod-landing-card--offline'"
    :href="'/moderator/' + node.login" :style="'--custom-mod-accent: #' + (node.primaryColorHex || 'a970ff') + ';'"
    @click="onClick">

    <img class="custom-mod-landing-avatar" :src="node.profileImageURL" :alt="node.displayName" width="44" height="44">

    <div class="custom-mod-landing-info">
      <div class="custom-mod-landing-name-row">

        <span class="custom-mod-landing-name" :style="node.chatColor ? 'color:' + node.chatColor : ''">{{ nameDisplay
        }}</span>

        <span v-if="isEditor"
          class="ffz-tooltip ffz-tooltip--no-mouse custom-mod-landing-badge custom-mod-landing-badge--editor"
          data-tooltip-type="text" data-title="Editor">{{ t('trubbel.mod-landing.badge.editor', 'editor') }}</span>

        <span v-if="isLeadMod"
          class="ffz-tooltip ffz-tooltip--no-mouse custom-mod-landing-badge custom-mod-landing-badge--lead"
          data-tooltip-type="text" data-title="Lead Moderator">
          <svg width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"
            class="custom-mod-landing-sub-icon">
            <path
              d="M202.5 55.5q5.709-.72 10 3a2400 2400 0 0 1 40.5 42 46 46 0 0 1 4 10 344 344 0 0 0 7 40q7.478 13.122 22.5 15.5a56.3 56.3 0 0 0 17 1 357 357 0 0 1 23-22q30.254-14.747 46.5 14.5 5.793 16.035-4 30l-25 25q-1.621 22.017 17.5 32.5a969 969 0 0 0 40 7 77 77 0 0 1 9 4 639 639 0 0 0 43.5 41.5q1.952 2.798 1 6A10013 10013 0 0 1 336.5 425q-3.225 2.385-7 2l-5-3a1129 1129 0 0 1-39.5-40.5q-5.16-9.676-5.5-20a951 951 0 0 0-4.5-27q-10.832-23.791-36.5-18.5a12042 12042 0 0 1-131 130q-25.551 17.07-46.5-5.5-10.374-16.646-1-34a6469 6469 0 0 1 134-133q3.128-20.776-11.5-35.5a35.2 35.2 0 0 0-10-5 2087 2087 0 0 1-34-5 47.4 47.4 0 0 1-12-5A435 435 0 0 1 85 180.5q-1-3 0-6a7740 7740 0 0 0 103-106q6.648-7.41 14.5-13" />
          </svg>
          {{ t('trubbel.mod-landing.badge.lead', 'lead mod') }}
        </span>

        <span v-if="isFounder"
          class="ffz-tooltip ffz-tooltip--no-mouse custom-mod-landing-badge custom-mod-landing-badge--founder"
          data-tooltip-type="text" data-title="Founder">{{ t('trubbel.mod-landing.badge.founder', 'founder') }}</span>

        <span v-if="showSubBadge"
          class="ffz-tooltip ffz-tooltip--no-mouse custom-mod-landing-badge custom-mod-landing-badge--sub"
          :class="{ 'custom-mod-landing-badge--sub-lapsed': !benefit }" data-tooltip-type="text" :data-title="subTooltip">

          <svg v-if="subIconKey === 'hollow-star'" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
            aria-hidden="true" class="custom-mod-landing-sub-icon">
            <path fill-rule="evenodd"
              d="M14.026 9.626 12 5.114 9.974 9.626l-4.909.514 3.666 3.28-1.029 4.815L12 15.775l4.298 2.46-1.03-4.816 3.667-3.279-4.91-.514ZM8.62 7.756l-5.525.58c-1.052.11-1.476 1.405-.69 2.109l4.127 3.691-1.153 5.395c-.22 1.028.89 1.828 1.808 1.303L12 18.08l4.812 2.755c.917.525 2.028-.275 1.808-1.303l-1.153-5.395 4.127-3.691c.787-.704.362-2-.69-2.11l-5.525-.578-2.262-5.037c-.43-.96-1.803-.96-2.234 0L8.62 7.757Z"
              clip-rule="evenodd" />
          </svg>

          <svg v-else-if="subIconKey === 'gift'" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
            aria-hidden="true" class="custom-mod-landing-sub-icon">
            <path fill-rule="evenodd"
              d="M5 5.192V7H2v8h1v7h18v-7h1V7h-3V5.192a3.192 3.192 0 0 0-5.93-1.642L12 5.333 10.93 3.55A3.193 3.193 0 0 0 5 5.192ZM17 7V5.192a1.192 1.192 0 0 0-2.215-.613L13.332 7H17Zm-6.332 0L9.215 4.579A1.192 1.192 0 0 0 7 5.192V7h3.668ZM11 9v4H4V9h7Zm2 0v4h7V9h-7Zm-8 6h6v5H5v-5Zm8 0v5h6v-5h-6Z"
              clip-rule="evenodd" />
          </svg>

          <svg v-else-if="subIconKey === 'prime'" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
            aria-hidden="true" class="custom-mod-landing-sub-icon">
            <path d="M2 17V6l5 4 5-5 5 5 5-4v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" />
          </svg>

          <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
            class="custom-mod-landing-sub-icon">
            <path
              d="M10.883 2.72c.43-.96 1.803-.96 2.234 0l2.262 5.037 5.525.578c1.052.11 1.477 1.406.69 2.11l-4.127 3.691 1.153 5.395c.22 1.028-.89 1.828-1.808 1.303L12 18.08l-4.812 2.755c-.917.525-2.028-.275-1.808-1.303l1.153-5.395-4.127-3.691c-.786-.704-.362-2 .69-2.11l5.525-.578 2.262-5.037Z" />
          </svg>
          <template v-if="tenureMonths > 0">{{ tenureMonths }}</template>
        </span>

        <span v-if="giftCount > 0"
          class="ffz-tooltip ffz-tooltip--no-mouse custom-mod-landing-badge custom-mod-landing-badge--gifts"
          data-tooltip-type="text"
          :data-title="giftCount === 1 ? t('trubbel.mod-landing.badge.gifts.one', '1 gifted sub') : t('trubbel.mod-landing.badge.gifts', '{n} gifted subs', { n: giftCount })">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
            class="custom-mod-landing-sub-icon">
            <path fill-rule="evenodd"
              d="M5 5.192V7H2v8h1v7h18v-7h1V7h-3V5.192a3.192 3.192 0 0 0-5.93-1.642L12 5.333 10.93 3.55A3.193 3.193 0 0 0 5 5.192ZM17 7V5.192a1.192 1.192 0 0 0-2.215-.613L13.332 7H17Zm-6.332 0L9.215 4.579A1.192 1.192 0 0 0 7 5.192V7h3.668ZM11 9v4H4V9h7Zm2 0v4h7V9h-7Zm-8 6h6v5H5v-5Zm8 0v5h6v-5h-6Z"
              clip-rule="evenodd" />
          </svg>
          {{ giftCount }}
        </span>

        <span v-if="isFirstTimeChatter"
          class="ffz-tooltip ffz-tooltip--no-mouse custom-mod-landing-badge custom-mod-landing-badge--ftc"
          data-tooltip-type="text" :data-title="t('trubbel.mod-landing.badge.ftc', 'First Time Chatter')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
            class="custom-mod-landing-sub-icon">
            <path
              d="m22 6-2.071-1.243a2 2 0 0 1-.686-.686L18 2l-1.243 2.071a2 2 0 0 1-.686.686L14 6l2.071 1.243a2 2 0 0 1 .686.686L18 10l1.243-2.071a2 2 0 0 1 .686-.686L22 6Z" />
            <path fill-rule="evenodd"
              d="M5.408 11.637 2 13v2l3.408 1.363a4 4 0 0 1 2.229 2.229L9 22h2l1.363-3.408a4 4 0 0 1 2.229-2.229L18 15v-2l-3.408-1.363a4 4 0 0 1-2.229-2.229L11 6H9L7.637 9.408a4 4 0 0 1-2.229 2.229Zm.743 2.87L4.885 14l1.266-.506a6 6 0 0 0 3.343-3.343L10 8.885l.506 1.266a6 6 0 0 0 3.343 3.343l1.266.506-1.266.506a6 6 0 0 0-3.343 3.343L10 19.115l-.506-1.266a6 6 0 0 0-3.343-3.343Z"
              clip-rule="evenodd" />
          </svg>
        </span>
      </div>

      <div v-if="title" class="custom-mod-landing-title">{{ title }}</div>

      <div v-if="game && game.displayName" class="custom-mod-landing-game-row">
        <img v-if="game.boxArtURL" class="ffz-tooltip ffz-tooltip--no-mouse custom-mod-landing-game-thumb"
          :src="game.boxArtURL.replace('{width}', '20').replace('{height}', '28')" alt="" width="14" height="20"
          data-tooltip-type="html"
          :data-title="'<img src=\'' + game.boxArtURL.replace('{width}', '108').replace('{height}', '144') + '\' width=\'108\' height=\'144\'>'">
        <span class="custom-mod-landing-game">{{ game.displayName }}</span>
      </div>
    </div>

    <div class="custom-mod-landing-right">
      <template v-if="isLive">
        <div class="custom-mod-landing-viewers">
          <span class="custom-mod-landing-viewers-dot"></span>
          {{ formatViewers(node.stream && node.stream.viewersCount) }}
        </div>
        <div v-if="node.stream && node.stream.createdAt"
          class="ffz-tooltip ffz-tooltip--no-mouse custom-mod-landing-uptime" data-tooltip-type="text"
          :data-title="uptimeTooltip">
          <span class="ffz-i-clock"></span>
          {{ formatUptime(node.stream.createdAt, now) }}
        </div>
      </template>
      <template v-else>
        <div class="custom-mod-landing-last-live" :class="{ 'ffz-tooltip ffz-tooltip--no-mouse': lastLiveDate }"
          data-tooltip-type="text" :data-title="lastLiveDate || ''">{{ lastLiveLabel }}</div>
      </template>
    </div>
  </a>
</template>

<script>
export default {
  props: ['edge', 'now'],

  computed: {
    isLive: function () { return this.edge.isLive; },
    node: function () { return this.edge.node; },

    nameDisplay: function () {
      var n = this.node;
      return n.displayName.toLowerCase() !== n.login.toLowerCase()
        ? n.displayName + ' (' + n.login + ')'
        : n.displayName;
    },

    self: function () { return this.node.self || {}; },
    benefit: function () { return this.self.subscriptionBenefit || null; },
    tenure: function () { return this.self.cumulativeTenure || null; },
    tenureMonths: function () { return (this.tenure && this.tenure.months) || 0; },
    giftCount: function () { return this.self.subscriptionGiftCount || 0; },
    isEditor: function () { return !!(this.self.isEditor); },
    isFounder: function () { return !!(this.self.isFounder); },
    isFirstTimeChatter: function () { return !!(this.self.isFirstTimeChatter); },
    isLeadMod: function () { return !!(this.node.channel && this.node.channel.hasPermission); },
    showSubBadge: function () { return !!(this.benefit || this.tenureMonths > 0); },
    title: function () { return (this.node.broadcastSettings && this.node.broadcastSettings.title) || ''; },
    game: function () { return (this.node.broadcastSettings && this.node.broadcastSettings.game) || null; },

    subIconKey: function () {
      var b = this.benefit;
      if (!b) return 'hollow-star';
      if (b.gift && b.gift.isGift) return 'gift';
      if (b.purchasedWithPrime) return 'prime';
      return 'star';
    },

    subTooltip: function () {
      var benefit = this.benefit;
      var tenure = this.tenure;
      var months = this.tenureMonths;

      var monthStr = months === 1
        ? this.t('trubbel.mod-landing.sub.month', '1 month')
        : this.t('trubbel.mod-landing.sub.months', '{n} months', { n: months });

      if (benefit) {
        var tier = this.t('trubbel.mod-landing.sub.tier1', 'Tier 1');
        if (benefit.purchasedWithPrime) tier = this.t('trubbel.mod-landing.sub.prime', 'Prime');
        else if (benefit.tier === '2000') tier = this.t('trubbel.mod-landing.sub.tier2', 'Tier 2');
        else if (benefit.tier === '3000') tier = this.t('trubbel.mod-landing.sub.tier3', 'Tier 3');

        var base;
        if (!tenure)
          base = this.t('trubbel.mod-landing.sub.hidden', '{tier} - Subscription status hidden', { tier: tier });
        else if (months > 0)
          base = this.t('trubbel.mod-landing.sub.active', '{tier} - Subbed for {months}', { tier: tier, months: monthStr });
        else
          base = tier;

        if (benefit.gift && benefit.gift.isGift) {
          var gifter = benefit.gift.gifter
            ? (benefit.gift.gifter.displayName.toLowerCase() !== benefit.gift.gifter.login.toLowerCase()
              ? benefit.gift.gifter.displayName + ' (' + benefit.gift.gifter.login + ')'
              : benefit.gift.gifter.displayName)
            : this.t('trubbel.mod-landing.sub.gift.anonymous', 'Anonymous');

          var giftLine = this.t('trubbel.mod-landing.sub.gift.gifted-by', 'Gifted by {gifter}', { gifter: gifter });
          if (benefit.gift.giftDate)
            giftLine += ' ' + this.t('trubbel.mod-landing.sub.gift.on-date', 'on {date}', { date: this.$i18n.tDate_(benefit.gift.giftDate, 'long') });

          return base + '\n' + giftLine;
        }

        return base;
      }

      if (months > 0)
        return this.t('trubbel.mod-landing.sub.lapsed', 'Previously subbed for {months}', { months: monthStr });

      return '';
    },

    uptimeTooltip: function () {
      var createdAt = this.node.stream && this.node.stream.createdAt;
      if (!createdAt) return '';
      return 'Stream Uptime\n' + this.t('metadata.uptime.since', '(since {since,datetime})', { since: new Date(createdAt) });
    },

    lastLiveDate: function () {
      var startedAt = this.node.lastBroadcast && this.node.lastBroadcast.startedAt;
      if (!startedAt) return null;
      return this.$i18n.tDateTime_(startedAt, 'full');
    },

    lastLiveLabel: function () {
      var startedAt = this.node.lastBroadcast && this.node.lastBroadcast.startedAt;
      var when = this.formatLastBroadcast(startedAt);

      if (when)
        return this.t('trubbel.mod-landing.last-live', 'Last live {when}', { when: when });

      return this.t('trubbel.mod-landing.offline', 'Offline');
    },
  },

  methods: {
    onClick: function (e) {
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
        e.preventDefault();
        this.$emit('navigate', this.node.login);
      }
    },

    formatViewers: function (n) {
      if (n == null || isNaN(n)) return '';
      if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
      return String(n);
    },

    formatUptime: function (createdAt, now) {
      var secs = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
      var h = Math.floor(secs / 3600);
      var m = Math.floor((secs % 3600) / 60);
      return h > 0 ? h + 'h ' + String(m).padStart(2, '0') + 'm' : m + 'm';
    },

    formatLastBroadcast: function (startedAt) {
      if (!startedAt) return null;
      var diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);

      if (diff < 60) return this.t('trubbel.mod-landing.last-live.now', 'less than a minute ago');
      if (diff < 3600) {
        var m = Math.floor(diff / 60);
        return m === 1
          ? this.t('trubbel.mod-landing.last-live.minute', '1 minute ago')
          : this.t('trubbel.mod-landing.last-live.minutes', '{n} minutes ago', { n: m });
      }
      if (diff < 86400) {
        var h = Math.floor(diff / 3600);
        return h === 1
          ? this.t('trubbel.mod-landing.last-live.hour', '1 hour ago')
          : this.t('trubbel.mod-landing.last-live.hours', '{n} hours ago', { n: h });
      }

      var days = Math.floor(diff / 86400);
      var weeks = Math.floor(days / 7);
      var months = Math.floor(days / 30);
      var years = Math.floor(days / 365);

      if (years >= 1) return years === 1 ? this.t('trubbel.mod-landing.last-live.year', '1 year ago') : this.t('trubbel.mod-landing.last-live.years', '{n} years ago', { n: years });
      if (months >= 1) return months === 1 ? this.t('trubbel.mod-landing.last-live.month', '1 month ago') : this.t('trubbel.mod-landing.last-live.months', '{n} months ago', { n: months });
      if (weeks >= 1) return weeks === 1 ? this.t('trubbel.mod-landing.last-live.week', '1 week ago') : this.t('trubbel.mod-landing.last-live.weeks', '{n} weeks ago', { n: weeks });

      return days === 1
        ? this.t('trubbel.mod-landing.last-live.day', '1 day ago')
        : this.t('trubbel.mod-landing.last-live.days', '{n} days ago', { n: days });
    },
  },
};
</script>