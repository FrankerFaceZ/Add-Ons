<template>
  <section class="tw-c-text-alt-2">
    <markdown 
      v-if="item.description"
      :source="t(item.desc_i18n_key || `${item.i18n_key}.description`, item.description)" 
    />
  </section>
</template>

<script>
const SettingMixin = FrankerFaceZ.get().resolve("main_menu").SettingMixin;

export default {
  mixins: [SettingMixin],
  props: ["item", "context"]
}
</script>