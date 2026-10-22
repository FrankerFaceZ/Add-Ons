<template>
  <div
    :class="{inherits: isInherited, default: isDefault}"
    class="ffz--widget ffz--text-area"
  >
    <div class="tw-flex tw-align-items-center">
      <label :for="item.full_key">
        {{ item.i18n_key ? t(item.i18n_key, item.title) : item.title }}
        <span v-if="unseen" class="ffz-pill ffz-pill--success">{{ t("setting.new", "New") }}</span>
      </label>

      <component
        :is="item.buttons"
        v-if="item.buttons"
        :context="context"
        :item="item"
        :value="value"
      />

      <button
        v-if="source && source !== profile"
        class="tw-mg-l-05 tw-button tw-button--text"
        @click="context.currentProfile = source"
      >
        <span class="tw-button__text ffz-i-right-dir">
          {{ sourceDisplay }}
        </span>
      </button>

      <button
        v-if="has_value"
        :disabled="isReadOnly"
        class="tw-mg-l-05 tw-button tw-button--text ffz-il-tooltip__container"
        :class="{'tw-button--disabled': isReadOnly}"
        @click="clear"
      >
        <span class="tw-button__text ffz-i-cancel" />
        <div class="ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-right">
          {{ t("setting.reset", "Reset to Default") }}
        </div>
      </button>
    </div>

    <textarea
      :id="item.full_key"
      ref="control"
      :rows="rows"
      :placeholder="placeholder"
      :value="value"
      :disabled="isReadOnly"
      :class="{'ffz-textarea--error': ! isValid, 'ffz-monospace': item.monospace}"
      class="tw-block tw-full-width tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-mg-y-05 ffz-textarea"
      spellcheck="false"
      autocapitalize="off"
      autocorrect="off"
      autocomplete="off"
      @input="onInput"
      @change="onChange"
    />

    <section
      v-if="! isValid && item.invalid"
      class="tw-c-text-error tw-mg-b-05"
    >
      {{ t(`${item.i18n_key}.invalid`, item.invalid) }}
    </section>

    <section
      v-if="item.description"
      class="tw-c-text-alt-2"
    >
      <markdown :source="t(item.desc_i18n_key || `${item.i18n_key}.description`, item.description)" />
    </section>
    <section v-if="item.extra">
      <component :is="item.extra.component" :context="context" :item="item" />
    </section>
  </div>
</template>

<script>
const SettingMixin = FrankerFaceZ.get().resolve("main_menu").SettingMixin;
const { debounce } = FrankerFaceZ.utilities.object;

export default {
  mixins: [SettingMixin],
  props: ["item", "context"],

  computed: {
    rows() {
      return this.item.rows || 6;
    },

    placeholder() {
      return this.item.placeholder || this.default_value;
    }
  },

  created() {
    if (this.item.debounce)
      this.onInput = debounce(this.onInput, this.item.debounce);
  },

  beforeDestroy() {
    this.onChange();
  },

  methods: {
    onInput() {
      if (this.item.debounce)
        this.onChange();
    },

    onChange() {
      const control = this.$refs.control;
      if (!control || !this.profile)
        return;

      const value = control.value;
      if (value != null && value !== this.value)
        this.set(value);
    }
  }
}
</script>