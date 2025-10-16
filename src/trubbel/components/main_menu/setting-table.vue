<template>
  <section class="ffz--widget">
    <div class="tw-mg-t-1 tw-mg-b-05">
      Manage Pinned Channels
    </div>
    <div class="tw-align-items-center tw-flex tw-flex-nowrap tw-flex-row tw-mg-x-05 tw-mg-b-05">
      <div class="tw-flex-grow-1">
        <autocomplete v-slot="slot" v-model="adding" :items="fetchUsers" :suggest-on-focus="true"
          :escape-to-clear="false" :clear-on-select="true" placeholder="Enter a channel name..." class="tw-flex-grow-1"
          @selected="addSelected">
          <autocomplete-user :user="slot.item" />
        </autocomplete>
      </div>
    </div>

    <div v-if="!pinnedChannels || !pinnedChannels.length" class="tw-mg-t-05 tw-c-text-alt-2 tw-align-center tw-pd-05">
      No pinned channels.
    </div>

    <ul v-else ref="list" class="tw-mg-t-05" :style="{
      maxHeight: '220px',
      overflowY: 'auto'
    }">
      <li v-for="(channel, index) in pinnedChannels" :key="channel" :data-channel="channel"
        class="tw-elevation-1 tw-c-background-base tw-mg-x-05 tw-border tw-pd-y-05 tw-mg-y-05 tw-pd-r-1 tw-flex tw-flex-nowrap">
        <div class="tw-flex tw-flex-shrink-0 tw-align-items-center handle tw-c-text-alt-2">
          <h5 class="ffz-i-ellipsis-vert ffz-font-size-5" />
        </div>

        <div class="tw-flex-grow-1 tw-align-items-center tw-flex tw-flex-row">
          <div class="ffz--search-avatar tw-mg-r-05">
            <figure class="ffz-avatar ffz-avatar--size-24">
              <div class="tw-border-radius-rounded tw-overflow-hidden">
                <img v-if="userCache[channel] && userCache[channel].profileImageURL"
                  :alt="userCache[channel].displayName || channel" :src="userCache[channel].profileImageURL"
                  class="ffz-avatar__img tw-image" draggable="false">
                <div v-else
                  class="tw-full-width tw-full-height tw-c-background-alt-2 tw-flex tw-align-items-center tw-justify-content-center">
                  <figure class="ffz-i-user tw-c-text-alt-2" />
                </div>
              </div>
            </figure>
          </div>

          <div class="tw-flex-grow-1">
            <a :href="`https://twitch.tv/${channel}`" target="_blank" class="tw-link tw-semibold">
              <span v-if="userCache[channel] && userCache[channel].displayName">
                {{ userCache[channel].displayName }}
              </span>
              <span v-else>{{ channel }}</span>
            </a>
            <div
              v-if="userCache[channel] && userCache[channel].displayName && userCache[channel].login !== userCache[channel].displayName.toLowerCase()"
              class="tw-c-text-alt-2 tw-font-size-5">
              ({{ userCache[channel].login }})
            </div>
          </div>
        </div>

        <div class="tw-flex tw-flex-shrink-0 tw-align-items-center tw-c-text-alt-2"
          :class="{ 'tw-mg-r-2': pinnedChannels.length === 1 }">
          <span class="tw-c-text-alt-2 tw-font-size-5">
            #{{ index + 1 }}
          </span>
        </div>

        <div class="tw-flex-shrink-0 tw-flex tw-align-items-center">

          <div v-if="index > 0"
            class="tw-flex tw-flex-column tw-flex-wrap tw-justify-content-start tw-align-items-start">
            <button class="tw-button tw-button--text tw-relative ffz-il-tooltip__container" @click="moveUp(index)">
              <span class="tw-button__text ffz-i-up-dir">
              </span>
              <div class="ffz-il-tooltip ffz-il-tooltip--left ffz-il-tooltip--align-center">
                Move Up
              </div>
            </button>
          </div>

          <div v-if="index < pinnedChannels.length - 1"
            class="tw-flex tw-flex-column tw-flex-wrap tw-justify-content-start tw-align-items-start">
            <button class="tw-button tw-button--text tw-relative ffz-il-tooltip__container" @click="moveDown(index)">
              <span class="tw-button__text ffz-i-down-dir">
              </span>
              <div class="ffz-il-tooltip ffz-il-tooltip--left ffz-il-tooltip--align-center">
                Move Down
              </div>
            </button>
          </div>

          <div
            class="tw-border-l tw-pd-l-1 tw-flex tw-flex-column tw-flex-wrap tw-justify-content-start tw-align-items-start">
            <button class="tw-button tw-button--text tw-relative ffz-il-tooltip__container" @click="remove(index)">
              <span class="tw-button__text ffz-i-trash">
              </span>
              <div class="ffz-il-tooltip ffz-il-tooltip--left ffz-il-tooltip--align-center">
                Delete
              </div>
            </button>
          </div>

        </div>
      </li>
    </ul>

    <div v-if="pinnedChannels && pinnedChannels.length > 0" class="tw-mg-t-1 tw-pd-t-1 tw-border-t">
      <div class="tw-flex tw-align-items-center tw-justify-content-between">
        <div class="tw-c-text-alt-2 tw-font-size-5">
          {{ pinnedChannels.length }} pinned channels
        </div>
        <button class="tw-button tw-button--text tw-c-text-error" @click="clearAll">
          <span class="tw-button__text ffz-i-trash">Clear All</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script>
import Sortable from "sortablejs";
const { deep_copy } = FrankerFaceZ.utilities.object;

export default {
  props: ["item", "context"],

  data() {
    return {
      adding: "",
      pinnedChannels: [],
      sortable: null,
      userCache: {}
    }
  },

  computed: {
    canAdd() {
      const trimmed = this.adding.trim();
      return trimmed && !this.isChannelAlreadyPinned(trimmed);
    }
  },

  created() {
    try {
      const ffz = FrankerFaceZ.get();
      this.loader = ffz.resolve("site.twitch_data");
    } catch (error) {
      console.warn("[Trubbel Pinned Manager] Could not load FFZ data loader:", error);
      this.loader = null;
    }
  },

  mounted() {
    this.loadData();
    this.initializeSortable();
    this.loadAllUserData();
  },

  beforeDestroy() {
    if (this.sortable) {
      this.sortable.destroy();
    }
  },

  methods: {
    loadData() {
      try {
        this.pinnedChannels = this.item.getPinnedChannels() || [];
        console.log("[Trubbel Pinned Manager] Loaded:", this.pinnedChannels);
      } catch (error) {
        console.error("[Trubbel Pinned Manager] Error loading data:", error);
        this.pinnedChannels = [];
      }
    },

    saveData() {
      try {
        this.item.setPinnedChannels(this.pinnedChannels);
        console.log("[Trubbel Pinned Manager] Saved:", this.pinnedChannels);
      } catch (error) {
        console.error("[Trubbel Pinned Manager] Error saving data:", error);
      }
    },

    async loadUserData(login) {
      if (!this.loader || !login) return null;

      try {
        if (this.userCache[login]) {
          return this.userCache[login];
        }

        const userData = await this.loader.getUser(null, login);
        if (userData) {
          this.$set(this.userCache, login, deep_copy(userData));
          return userData;
        }
      } catch (error) {
        console.warn(`[Trubbel Pinned Manager] Failed to load user data for ${login}:`, error);
      }
      return null;
    },

    async loadAllUserData() {
      if (!this.pinnedChannels.length) return;

      const loadPromises = this.pinnedChannels.map(channel =>
        this.loadUserData(channel)
      );

      try {
        await Promise.all(loadPromises);
      } catch (error) {
        console.warn("[Trubbel Pinned Manager] Some user data failed to load:", error);
      }
    },

    async fetchUsers(query) {
      if (!this.loader || !query)
        return [];

      try {
        const data = await this.loader.getMatchingUsers(query);
        if (!data || !data.items)
          return [];

        return deep_copy(data.items);
      } catch (error) {
        console.error("[Trubbel Pinned Manager] Error fetching users:", error);
        return [];
      }
    },

    initializeSortable() {
      if (!this.$refs.list) return;

      this.sortable = Sortable.create(this.$refs.list, {
        handle: ".handle",
        ghostClass: "trubbel--sortable-ghost",
        chosenClass: "trubbel--sortable-chosen",
        dragClass: "trubbel--sortable-drag",
        animation: 150,
        onEnd: (evt) => {
          if (evt.oldIndex !== evt.newIndex) {
            this.moveChannel(evt.oldIndex, evt.newIndex);
          }
        }
      });
    },

    isChannelAlreadyPinned(channel) {
      const cleanChannel = this.cleanChannelName(channel);
      return this.pinnedChannels.some(pinned =>
        pinned.toLowerCase() === cleanChannel.toLowerCase()
      );
    },

    cleanChannelName(channel) {
      return channel.replace(/^@/, "")
        .replace(/^(?:https?:\/\/)?(?:www\.)?twitch\.tv\//, "")
        .toLowerCase();
    },

    addSelected(selectedUser) {
      if (selectedUser && selectedUser.login) {
        const login = selectedUser.login.toLowerCase();

        if (this.isChannelAlreadyPinned(login)) {
          return;
        }

        this.$set(this.userCache, login, selectedUser);

        this.pinnedChannels.push(login);
        this.saveData();
      }
    },

    async add() {
      const channel = this.cleanChannelName(this.adding.trim());

      if (!channel) return;
      if (!/^[a-z0-9_]+$/.test(channel)) return;
      if (this.isChannelAlreadyPinned(channel)) {
        this.adding = "";
        return;
      }

      this.pinnedChannels.push(channel);
      this.adding = "";

      await this.loadUserData(channel);

      this.saveData();
    },

    remove(index) {
      if (index >= 0 && index < this.pinnedChannels.length) {
        this.pinnedChannels.splice(index, 1);
        this.saveData();
      }
    },

    moveUp(index) {
      if (index > 0) {
        this.moveChannel(index, index - 1);
      }
    },

    moveDown(index) {
      if (index < this.pinnedChannels.length - 1) {
        this.moveChannel(index, index + 1);
      }
    },

    moveChannel(fromIndex, toIndex) {
      if (fromIndex >= 0 && fromIndex < this.pinnedChannels.length &&
        toIndex >= 0 && toIndex < this.pinnedChannels.length) {

        const [movedChannel] = this.pinnedChannels.splice(fromIndex, 1);
        this.pinnedChannels.splice(toIndex, 0, movedChannel);
        this.saveData();
      }
    },

    clearAll() {
      if (confirm("Are you sure you want to clear all pinned channels?")) {
        this.pinnedChannels = [];
        this.saveData();
      }
    }
  },

  watch: {
    pinnedChannels() {
      this.$nextTick(() => {
        if (this.sortable) {
          this.sortable.destroy();
        }
        this.initializeSortable();
      });
    }
  }
}
</script>