<template>
  <div class="ffz--widget">
    <div class="tw-flex tw-align-items-start">
      <label :for="item.full_key" class="tw-mg-y-05">
        {{ t(item.i18n_key, item.title) }}
        <span v-if="unseen" class="tw-pill">{{ t("setting.new", "New") }}</span>
      </label>
      <div class="tw-flex tw-align-items-center tw-mg-05" style="height: 3rem;">
        <div class="trubbel-range-slider" style="width: 200px;">
          <div class="trubbel-range-slider__track">
            <div
              class="trubbel-range-slider__fill"
              :style="{ width: fillWidth + '%' }"
            ></div>
          </div>
          <input
            type="range"
            :id="item.full_key"
            class="trubbel-range-slider__input trubbel-slider-thumb"
            :min="sliderMin"
            :max="sliderMax"
            :step="sliderStep"
            :value="value"
            @input="updateValue"
          />
        </div>
        <div class="tw-mg-l-2">
          <span class="tw-font-size-6 tw-border tw-pd-x-05 tw-pd-y-05 tw-border-radius-small">{{ formatDisplay }}</span>
        </div>
        <button
          v-if="has_value"
          class="tw-mg-l-05 tw-mg-y-05 tw-button tw-button--text ffz-il-tooltip__container"
          @click="clear"
        >
          <span class="tw-button__text ffz-i-cancel" />
          <div class="ffz-il-tooltip ffz-il-tooltip--right ffz-il-tooltip--align-right">
            {{ t("setting.reset", "Reset to Default") }}
          </div>
        </button>
      </div>
    </div>
    <div v-if="item.description" class="tw-c-text-alt-2">
      <markdown :source="t(item.desc_i18n_key || `${item.i18n_key}.description`, item.description)" />
    </div>
  </div>
</template>

<script>
const SettingMixin = FrankerFaceZ.get().resolve("main_menu").SettingMixin;

export default {
  mixins: [SettingMixin],
  props: ["item", "context"],
  computed: {
    value() {
      const val = this.getValue();
      return val;
    },
    sliderMin() {
      return this.item.min;
    },
    sliderMax() {
      return this.item.max;
    },
    sliderStep() {
      return this.item.step;
    },
    aspectRatio() {
      return this.item.ratio ?? null;
    },
    currentHeight() {
      return this.aspectRatio ? Math.round(this.value / this.aspectRatio) : null;
    },
    formatDisplay() {
      if (this.item.format_display) {
        return this.item.format_display(this.value, this.currentHeight);
      }
      const unit = this.item.unit;
      return `${this.value}${unit}`;
    },
    fillWidth() {
      const fill = ((this.value - this.sliderMin) / (this.sliderMax - this.sliderMin)) * 100;
      return fill;
    }
  },
  methods: {
    updateValue(event) {
      const val = parseInt(event.target.value, 10);
      this.set(val);
      if (this.item?.onUIChange) {
        this.item.onUIChange(val, this.context);
      }
    }
  }
}
</script>