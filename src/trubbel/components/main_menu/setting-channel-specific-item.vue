<template>
  <li class="tw-elevation-1 tw-c-background-base tw-mg-x-05 tw-border tw-pd-y-05 tw-mg-y-05 tw-pd-r-1 tw-flex tw-flex-nowrap tw-align-items-center">
    <div class="ffz--search-avatar tw-mg-l-05 tw-mg-r-05">
      <figure class="ffz-avatar ffz-avatar--size-24">
        <div class="tw-border-radius-rounded tw-overflow-hidden">
          <img
            v-if="userData && userData.profileImageURL"
            :alt="displayName"
            :src="userData.profileImageURL"
            class="ffz-avatar__img tw-image"
            draggable="false"
          >
          <div
            v-else
            class="tw-full-width tw-full-height tw-c-background-alt-2 tw-flex tw-align-items-center tw-justify-content-center"
          >
            <figure class="ffz-i-user tw-c-text-alt-2" />
          </div>
        </div>
      </figure>
    </div>

    <div class="tw-flex-shrink-0 tw-mg-r-1" style="width: 13rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
      <a :href="`https://twitch.tv/${channel}`" target="_blank" class="tw-link tw-semibold" :title="displayName">
        {{ displayName }}
      </a>
    </div>

    <div class="tw-c-text-alt-2 tw-font-size-7" style="white-space: nowrap;">Volume:</div>
    <div class="tw-flex tw-flex-shrink-0 tw-align-items-center tw-mg-x-1">
      <div class="trubbel-range-slider" style="width: 120px;" :style="{ opacity: hasVolume ? 1 : 0.5 }">
        <div class="trubbel-range-slider__track">
          <div class="trubbel-range-slider__fill" :style="{ width: fillWidth }" />
        </div>
        <input
          type="range"
          class="trubbel-range-slider__input trubbel-slider-thumb ffz-min-width-unset"
          min="0"
          max="100"
          step="1"
          :value="hasVolume ? localVolume : 0"
          @input="onVolumeInput"
          @change="onVolumeChange"
        >
      </div>
      <span
        class="tw-font-size-6 tw-border tw-pd-x-05 tw-pd-y-05 tw-border-radius-small tw-mg-l-1 tw-align-center"
        style="min-width: 5rem;"
      >
        {{ hasVolume ? `${localVolume}%` : "Unset" }}
      </span>
      <button
        class="tw-button tw-button--text ffz-il-tooltip__container tw-mg-l-05"
        :style="{ visibility: hasVolume ? 'visible' : 'hidden' }"
        @click="clearVolume"
      >
        <span class="tw-button__text ffz-i-cancel" />
        <div class="ffz-il-tooltip ffz-il-tooltip--up ffz-il-tooltip--align-center">
          Unset
        </div>
      </button>
    </div>

    <div class="tw-c-text-alt-2 tw-font-size-7" style="white-space: nowrap;">Quality:</div>
    <div class="tw-flex-shrink-0 tw-mg-x-1">
      <select
        :value="quality"
        class="tw-border-radius-medium tw-font-size-6 ffz-select tw-pd-l-1 tw-pd-r-3 tw-pd-y-05"
        style="min-width: 0 !important;"
        @change="$emit('update-quality', channel, $event.target.value)"
      >
        <option v-for="opt in qualityOptions" :key="opt.value" :value="opt.value">
          {{ opt.title }}
        </option>
      </select>
    </div>

    <div class="tw-c-text-alt-2 tw-font-size-7" style="white-space: nowrap;">Hide chat:</div>
    <div class="tw-flex-shrink-0 tw-mg-x-1">
      <div class="tw-flex tw-align-items-center ffz-checkbox">
        <input
          :id="`hide-chat-${channel}`"
          type="checkbox"
          :checked="hideChat"
          class="ffz-checkbox__input"
          @change="$emit('update-hide-chat', channel, $event.target.checked)"
        >
        <label :for="`hide-chat-${channel}`" class="ffz-checkbox__label ffz-min-width-unset" />
      </div>
    </div>

    <div class="tw-c-text-alt-2 tw-font-size-7" style="white-space: nowrap;">Compressor:</div>
    <div class="tw-flex-shrink-0 tw-mg-x-1">
      <div class="tw-flex tw-align-items-center ffz-checkbox">
        <input
          :id="`compressor-${channel}`"
          type="checkbox"
          :checked="compressor"
          class="ffz-checkbox__input"
          @change="$emit('update-compressor', channel, $event.target.checked)"
        >
        <label :for="`compressor-${channel}`" class="ffz-checkbox__label ffz-min-width-unset" />
      </div>
    </div>

    <div class="tw-flex-shrink-0 tw-mg-l-auto">
      <div v-if="deleting" class="tw-flex-shrink-0">
        <button class="tw-button tw-button--text ffz-il-tooltip__container" @click="$emit('remove', channel)">
          <span class="tw-button__text ffz-i-trash" />
          <div class="ffz-il-tooltip ffz-il-tooltip--left ffz-il-tooltip--align-center">
            Delete
          </div>
        </button>
        <button class="tw-button tw-button--text ffz-il-tooltip__container" @click="deleting = false">
          <span class="tw-button__text ffz-i-cancel" />
          <div class="ffz-il-tooltip ffz-il-tooltip--left ffz-il-tooltip--align-center">
            Cancel
          </div>
        </button>
      </div>
      <button v-else class="tw-button tw-button--text ffz-il-tooltip__container" @click="deleting = true">
        <span class="tw-button__text ffz-i-trash" />
        <div class="ffz-il-tooltip ffz-il-tooltip--left ffz-il-tooltip--align-center">
          Delete
        </div>
      </button>
    </div>
  </li>
</template>

<script>
import { QUALITY_OPTIONS } from "../../utilities/player";

export default {
  props: {
    channel: String,
    volume: Number,
    quality: String,
    hideChat: Boolean,
    compressor: Boolean,
    userData: Object
  },

  data() {
    return {
      deleting: false,
      localVolume: this.volume,
      qualityOptions: QUALITY_OPTIONS
    }
  },

  computed: {
    hasVolume() {
      return this.localVolume != null;
    },

    fillWidth() {
      const value = this.hasVolume ? this.localVolume : 0;
      return `calc(${value}% + ${(0.5 - value / 100) * 18}px)`;
    },

    displayName() {
      return (this.userData && this.userData.displayName) || this.channel;
    }
  },

  watch: {
    volume(val) {
      this.localVolume = val;
    }
  },

  methods: {
    onVolumeInput(event) {
      this.localVolume = parseInt(event.target.value, 10);
    },

    onVolumeChange(event) {
      this.$emit("update-volume", this.channel, parseInt(event.target.value, 10));
    },

    clearVolume() {
      this.localVolume = null;
      this.$emit("update-volume", this.channel, null);
    }
  }
}
</script>