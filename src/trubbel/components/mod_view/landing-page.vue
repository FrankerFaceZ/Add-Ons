<template>
  <div class="custom-mod-landing-page">
    <div class="custom-mod-landing-scroll">
      <div class="custom-mod-landing-inner">
        <div class="custom-mod-landing-toolbar">
          <div class="custom-mod-landing-count">{{ countLabel }}</div>
          <div style="flex:1;min-width:8px"></div>
          <input class="custom-mod-landing-search" type="search"
            :placeholder="t('trubbel.mod-landing.search-placeholder', 'Filter…')" :value="search"
            @input="search = $event.target.value">
          <div class="custom-mod-landing-sort-group">
            <button v-for="mode in sortModes" :key="mode.key" class="custom-mod-landing-sort-btn"
              :class="{ 'custom-mod-landing-sort-btn--active': sort === mode.key }" @click="onSortClick(mode.key)">{{
                sortLabel(mode) }}</button>
          </div>
        </div>

        <div v-if="channels === null" class="custom-mod-landing-empty">
          {{ t('trubbel.mod-landing.loading', 'Loading channels…') }}
        </div>

        <div v-else-if="hasError" class="custom-mod-landing-empty">
          {{ t('trubbel.mod-landing.error', 'Failed to load moderated channels.') }}
        </div>

        <div v-else-if="sorted.length === 0" class="custom-mod-landing-empty">
          {{ t('trubbel.mod-landing.no-results', 'No channels match your search.') }}
        </div>

        <template v-else>
          <div v-if="liveChannels.length" class="custom-mod-landing-section">
            <div class="custom-mod-landing-section-label custom-mod-landing-section-label--live">
              <span class="custom-mod-landing-section-pip custom-mod-landing-section-pip--live"></span>
              {{ t('trubbel.mod-landing.section.live', 'Live ({count})', { count: liveChannels.length }) }}
            </div>
            <mod-landing-card v-for="edge in liveChannels" :key="edge.node.id" :edge="edge" :now="now"
              @navigate="onNavigate" />
          </div>

          <div v-if="offlineChannels.length" class="custom-mod-landing-section">
            <div class="custom-mod-landing-section-label">
              <span class="custom-mod-landing-section-pip"></span>
              {{ t('trubbel.mod-landing.section.offline', 'Offline ({count})', { count: offlineChannels.length }) }}
            </div>
            <mod-landing-card v-for="edge in offlineChannels" :key="edge.node.id" :edge="edge" :now="now"
              @navigate="onNavigate" />
          </div>
        </template>

      </div>
    </div>
  </div>
</template>

<script>
var SORT_MODES = [
  { key: 'alpha', label: 'A-Z' },
  { key: 'game', label: 'By Game' },
  { key: 'viewers', label: 'Viewers' },
];

export default {
  props: ['channels', 'hasError'],

  data: function () {
    return {
      search: '',
      sort: 'alpha',
      sortAsc: true,
      sortModes: SORT_MODES,
      now: Date.now(),
    };
  },

  computed: {
    sorted: function () {
      var channels = this.channels ? this.channels.slice() : [];
      var q = this.search ? this.search.toLowerCase() : '';

      if (q) {
        channels = channels.filter(function (e) {
          var n = e.node;
          return n.displayName.toLowerCase().includes(q)
            || n.login.toLowerCase().includes(q)
            || ((n.broadcastSettings && n.broadcastSettings.game && n.broadcastSettings.game.displayName) || '').toLowerCase().includes(q)
            || ((n.broadcastSettings && n.broadcastSettings.title) || '').toLowerCase().includes(q);
        });
      }

      var sort = this.sort;
      var sortAsc = this.sortAsc;
      var asc = sortAsc ? 1 : -1;

      channels.sort(function (a, b) {
        if (sort === 'viewers') {
          if (a.isLive && b.isLive) {
            var va = (a.node.stream && a.node.stream.viewersCount) || 0;
            var vb = (b.node.stream && b.node.stream.viewersCount) || 0;
            if (va !== vb) return (vb - va) * asc;
          }
          return a.node.displayName.localeCompare(b.node.displayName);
        }

        if (sort === 'game') {
          var ga = (a.node.broadcastSettings && a.node.broadcastSettings.game && a.node.broadcastSettings.game.displayName) || '';
          var gb = (b.node.broadcastSettings && b.node.broadcastSettings.game && b.node.broadcastSettings.game.displayName) || '';
          if (!ga && !gb) return a.node.displayName.localeCompare(b.node.displayName);
          if (!ga) return 1;
          if (!gb) return -1;
          if (ga !== gb) return ga.localeCompare(gb) * asc;
          return a.node.displayName.localeCompare(b.node.displayName) * asc;
        }

        return a.node.displayName.localeCompare(b.node.displayName) * asc;
      });

      return channels;
    },

    liveChannels: function () {
      return this.sorted.filter(function (e) { return e.isLive; });
    },

    offlineChannels: function () {
      return this.sorted.filter(function (e) { return !e.isLive; });
    },

    countLabel: function () {
      if (this.channels === null)
        return this.t('trubbel.mod-landing.loading', 'Loading channels…');

      var total = this.channels.length;
      var live = this.channels.filter(function (e) { return e.isLive; }).length;
      var filtered = this.sorted.length;

      if (this.search && filtered !== total) {
        if (live > 0)
          return this.t('trubbel.mod-landing.count-filtered-live', '{filtered} of {total} channels - {live} live', { filtered: filtered, total: total, live: live });
        return this.t('trubbel.mod-landing.count-filtered', '{filtered} of {total} channels', { filtered: filtered, total: total });
      }

      if (live > 0)
        return this.t('trubbel.mod-landing.count-live', '{total} channels you moderate - {live} live', { total: total, live: live });

      return this.t('trubbel.mod-landing.count', '{total} channels you moderate', { total: total });
    },
  },

  mounted: function () {
    var self = this;
    this._uptimeInterval = setInterval(function () { self.now = Date.now(); }, 30000);
  },

  beforeDestroy: function () {
    if (this._uptimeInterval) {
      clearInterval(this._uptimeInterval);
      this._uptimeInterval = null;
    }
  },

  methods: {
    sortLabel: function (mode) {
      var label = this.t('trubbel.mod-landing.sort.' + mode.key, mode.label);
      if (this.sort === mode.key)
        label += this.sortAsc ? ' ↑' : ' ↓';
      return label;
    },

    onSortClick: function (key) {
      if (this.sort === key)
        this.sortAsc = !this.sortAsc;
      else {
        this.sort = key;
        this.sortAsc = true;
      }
    },

    onNavigate: function (login) {
      this.reactNavigate('/moderator/' + login);
    },
  },
};
</script>