<template>
<div v-if="badges.length > 0" class="user-badges">
  <div class="badges-grid" :class="{ expanded: badgesExpanded }">
    <div v-for="badge in badges" :key="badge.setID + '-' + badge.version" class="badge-item tw-relative ffz-tooltip"
      :data-title="'<div class=\'ffz-badge-tip\'><img class=\'preview-image ffz-badge\' src=\'' + badge.image4x + '\' alt=\'' + badge.title + '\'>' + badge.title + '</div>'"
      data-tooltip-type="html" @click="badgeClick(badge)">
      <img :src="badge.image2x" :alt="badge.title">
    </div>
  </div>
  <button v-if="badges.length > 28" @click="badgesExpanded = !badgesExpanded" class="badges-toggle">
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