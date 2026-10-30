<template>
  <section class="ffz--widget">
    <div class="tw-mg-t-1 tw-mg-b-05">
      {{ item.title }}
    </div>
    <div class="tw-align-items-center tw-flex tw-flex-nowrap tw-flex-row tw-mg-x-05 tw-mg-b-05">
      <div class="tw-flex-grow-1">
        <autocomplete
          v-slot="slot"
          v-model="adding"
          :items="fetchUsers"
          :suggest-on-focus="true"
          :escape-to-clear="false"
          :clear-on-select="true"
          placeholder="Enter a channel name..."
          class="tw-flex-grow-1"
          @selected="addSelected"
        >
          <autocomplete-user :user="slot.item" />
        </autocomplete>
      </div>
    </div>

    <div v-if="!channelList.length" class="tw-mg-t-05 tw-c-text-alt-2 tw-align-center tw-pd-05">
      No channels with custom settings.
    </div>

    <ul v-else class="tw-mg-t-05" style="max-height: 320px; overflow-y: auto;">
      <channel-settings-item
        v-for="entry in channelList"
        :key="entry.channel"
        :channel="entry.channel"
        :volume="entry.volume"
        :quality="entry.quality"
        :hide-chat="entry.hideChat"
        :compressor="entry.compressor"
        :user-data="userCache[entry.channel]"
        @remove="remove"
        @update-volume="updateVolume"
        @update-quality="updateQuality"
        @update-hide-chat="updateHideChat"
        @update-compressor="updateCompressor"
      />
    </ul>

    <div v-if="channelList.length" class="tw-mg-t-1 tw-pd-t-1 tw-border-t">
      <div class="tw-flex tw-align-items-center tw-justify-content-between">
        <div class="tw-c-text-alt-2 tw-font-size-5">
          {{ channelList.length }} {{ channelList.length === 1 ? "channel" : "channels" }} configured
        </div>
        <button class="tw-button tw-button--text tw-c-text-error" @click="clearAll">
          <span class="tw-button__text ffz-i-trash">Clear All</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import ChannelSettingsItem from "./setting-channel-specific-item.vue";
import { normalizeQuality } from "../../utilities/player";

const { deep_copy } = FrankerFaceZ.utilities.object;

export default {
  components: { ChannelSettingsItem },

  props: ["item", "context"],

  data() {
    return {
      adding: "",
      channelSettings: {},
      userCache: {}
    }
  },

  computed: {
    channelList() {
      return Object.keys(this.channelSettings).map(channel => {
        const config = this.channelSettings[channel] || {};
        return {
          channel,
          volume: typeof config.volume === "number" ? config.volume : null,
          quality: normalizeQuality(config.quality),
          hideChat: config.hideChat === true,
          compressor: config.compressor === true
        };
      }).sort((a, b) => a.channel.localeCompare(b.channel));
    }
  },

  created() {
    this.loader = FrankerFaceZ.get().resolve("site.twitch_data");
  },

  mounted() {
    this.channelSettings = this.item.getChannelSettings();
    this.loadAllUserData();
  },

  methods: {
    save() {
      this.item.setChannelSettings(this.channelSettings);
    },

    getEntry(channel) {
      if (!this.channelSettings[channel])
        this.$set(this.channelSettings, channel, {});
      return this.channelSettings[channel];
    },

    async loadUserData(login) {
      if (!this.loader || this.userCache[login])
        return;

      try {
        const user = await this.loader.getUser(null, login);
        if (user)
          this.$set(this.userCache, login, deep_copy(user));
      } catch (err) {
        console.warn(`[Channel Specific Settings] Failed to load user ${login}:`, err);
      }
    },

    loadAllUserData() {
      return Promise.all(Object.keys(this.channelSettings).map(login => this.loadUserData(login)));
    },

    async fetchUsers(query) {
      if (!this.loader || !query)
        return [];

      const data = await this.loader.getMatchingUsers(query);
      return data && data.items ? deep_copy(data.items) : [];
    },

    addSelected(user) {
      if (!user || !user.login)
        return;

      const login = user.login.toLowerCase();
      if (this.channelSettings[login])
        return;

      this.$set(this.userCache, login, user);
      this.$set(this.channelSettings, login, {
        volume: "unset",
        quality: "unset",
        hideChat: false,
        compressor: false
      });
      this.save();
    },

    updateVolume(channel, volume) {
      this.$set(this.getEntry(channel), "volume", volume == null ? "unset" : volume);
      this.save();
    },

    updateQuality(channel, quality) {
      this.$set(this.getEntry(channel), "quality", quality);
      this.save();
    },

    updateHideChat(channel, hideChat) {
      this.$set(this.getEntry(channel), "hideChat", hideChat);
      this.save();
    },

    updateCompressor(channel, compressor) {
      this.$set(this.getEntry(channel), "compressor", compressor);
      this.save();
    },

    remove(channel) {
      this.$delete(this.channelSettings, channel);
      this.save();
    },

    clearAll() {
      if (confirm("Are you sure you want to clear all channel-specific settings?")) {
        this.channelSettings = {};
        this.save();
      }
    }
  }
}
</script>