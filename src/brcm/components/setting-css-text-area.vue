<template lang="html">
  <section class="ffz--widget">
    <div>
      <label>
        <textarea
            id="brcm-css-text-area" autocapitalize="none" spellcheck="false"
            ref="control" rows="20" placeholder="Insert CSS here..."
            class="tw-border-radius-medium tw-font-size-6 tw-full-width tw-input tw-pd-x-1 tw-pd-y-05 tw-mg-y-05"
            @change="onChange">{{ css }}</textarea>
      </label>
    </div>
  </section>
</template>

<script>

export default {
  props: ['item', 'context'],

  data() {
    return {
      css: this.item.value
    };
  },

  methods: {
    onChange() {
      let value = this.$refs.control.value;
      if (value == null) return;

      if (this.item.isValid && typeof this.item.isValid == 'function' && !this.item.isValid(value))
        return;

      if (this.item.process && typeof this.item.process == 'function')
        value = this.item.process(value);

      this.context.currentProfile.set(this.item.setting, value);

      if (this.item.changed)
        this.item.changed();
    }
  }
};

</script>
