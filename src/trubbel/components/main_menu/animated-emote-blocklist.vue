<template lang="html">
  <section class="ffz--widget">

    <div v-if="!blocklist.length" class="tw-c-text-alt-2 tw-pd-y-05">
      No emotes blocked yet. Right-click an animated emote in chat to block it.
    </div>

    <div v-else>
      <div class="tw-flex tw-align-items-center tw-mg-b-1">
        <span class="tw-c-text-alt-2 tw-font-size-7">
          {{ blocklist.length }} emote{{ blocklist.length === 1 ? "" : "s" }} blocked
        </span>
        <div class="tw-flex-grow-1" />
        <button class="tw-button tw-button--text" @click="clearAll">
          <span class="tw-button__text ffz-i-trash">
            Clear All
          </span>
        </button>
      </div>

      <ul style="max-height: 295px; overflow-y: auto;">
        <li v-for="emote in blocklist" :key="emote.provider + ':' + emote.id"
          class="tw-elevation-1 tw-c-background-base tw-mg-x-05 tw-border tw-pd-y-05 tw-mg-y-05 tw-pd-r-1 tw-flex tw-flex-nowrap tw-align-items-center">
          <span class="tw-c-text-alt-2 tw-font-size-7 tw-mg-x-1">
            [{{ formatSource(emote.source) }}]
          </span>

          <span class="tw-flex-grow-1 tw-font-size-6 tw-flex tw-align-items-center">
            {{ emote.name }}

            <img :src="emoteURL(emote)" :alt="emote.name" class="tw-mg-l-1" style="height: 28px;" />
          </span>

          <button class="tw-button tw-button--text ffz-il-tooltip__container" @click="remove(emote)">
            <span class="tw-button__text ffz-i-cancel" />
            <div class="ffz-il-tooltip ffz-il-tooltip--left ffz-il-tooltip--align-right">
              Re-enable Animation
            </div>
          </button>
        </li>
      </ul>
    </div>

  </section>
</template>

<script>
export default {
  props: ["item", "context"],

  data() {
    return {
      blocklist: this.item.getBlocklist()
    };
  },

  created() {
    this.refresh = () => {
      this.blocklist = this.item.getBlocklist();
    };
    this.item.on("stop-anim:blocklist-changed", this.refresh, this);
  },

  destroyed() {
    this.item.off("stop-anim:blocklist-changed", this.refresh, this);
  },

  methods: {
    remove(emote) {
      this.item.removeEmote(emote.provider, emote.id);
      this.blocklist = this.item.getBlocklist();
    },

    clearAll() {
      this.item.clearBlocklist();
      this.blocklist = this.item.getBlocklist();
    },

    formatSource(source) {
      if (!source) return "";

      if (source.toLowerCase() === "twitch") {
        return source.replace(/^./, c => c.toUpperCase())
      }

      return source.toUpperCase();
    },

    emoteURL(emote) {
      if (!emote || !emote.id) return "";

      const source = emote.source;

      switch (source) {
        case "ffz":
          return `https://cdn.frankerfacez.com/emote/${emote.id}/4`;

        case "7tv":
          return `https://cdn.7tv.app/emote/${emote.id}/4x.webp`;

        case "bttv":
          return `https://cdn.betterttv.net/emote/${emote.id}/3x.webp`;

        case "twitch":
        default:
          return `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/4.0`;
      }
    }
  }
};
</script>