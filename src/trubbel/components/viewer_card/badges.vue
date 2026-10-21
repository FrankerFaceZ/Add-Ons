<template>
<div v-if="badges.length > 0" class="cvc-user-badges">
  <div class="cvc-badges-grid" :class="{ expanded: badgesExpanded }">
    <div v-for="badge in badges" :key="badge.setID + '-' + badge.version" class="cvc-badge-item tw-relative ffz-tooltip"
      :data-title="'<div class=\'ffz-badge-tip\'><img class=\'preview-image ffz-badge\' src=\'' + badge.image4x + '\' alt=\'' + badge.title + '\'>' + badge.title + '</div>'"
      data-tooltip-type="html" @click="badgeClick(badge)">
      <img :src="badge.image2x" :alt="badge.title">
    </div>
  </div>
  <button v-if="badges.length > 28" @click="badgesExpanded = !badgesExpanded" class="cvc-badges-toggle">
    {{ badgesExpanded ? "Show Less" : "View All (" + badges.length + ")" }}
  </button>
</div>
</template>

<script>
export default {
  props: ["badges"],

  data() {
    return {
      badgesExpanded: false
    }
  },

  methods: {
    badgeClick(badge) {
      if (badge.clickURL)
        window.open(badge.clickURL, "_blank", "noopener,noreferrer");
    }
  }
}
</script>