<template lang="html">
  <div class="trubbel-icon-browser tw-pd-1">

    <div class="tw-flex tw-align-items-center tw-flex-nowrap tw-mg-b-1" style="gap: 8px;">
      <input v-model="search"
        class="ffz-input tw-flex-grow-1 tw-border-radius-medium ffz-font-size-6 tw-pd-x-1 tw-pd-y-05"
        placeholder="Search by name or path data..." type="text">
      <button class="tw-button" :disabled="scanning" @click="rescan">
        <span class="tw-button__text">
          {{ scanning ? 'Scanning…' : (icons.length ? `Rescan (${icons.length})` : 'Scan Icons') }}
        </span>
      </button>
    </div>

    <div v-if="!icons.length && !scanning" class="tw-pd-2 tw-align-center tw-c-text-alt">
      <p>Click <strong>Scan Icons</strong> to find all Twitch SVG icon components in webpack.</p>
    </div>

    <div v-if="scanning" class="tw-pd-2 tw-align-center tw-c-text-alt">
      Scanning webpack modules…
    </div>

    <div v-if="filteredIcons.length" class="trubbel-icon-grid">
      <div v-for="icon in filteredIcons" :key="icon.id" class="trubbel-icon-cell ffz-tooltip"
        :class="{ 'trubbel-icon-cell--active': selected && selected.id === icon.id }"
        :data-title="`<span style='font-size:var(--font-size-6);
            font-weight:var(--font-weight-semibold);
            line-height:var(--line-height-heading);
            padding:3px 6px;
            display:block;
            white-space:nowrap
          '>${icon.displayName || icon.id}</span>`"
          data-tooltip-type="html"
          @click="selectIcon(icon)">
        <svg width="24" height="24" :viewBox="icon.viewBox" focusable="false" aria-hidden="true" role="presentation"
          style="fill: currentColor; pointer-events: none;">
        <template v-for="(p, idx) in icon.paths">
          <polygon v-if="p.type === 'polygon'" :key="'poly-' + idx" :points="p.d" />
          <path v-else :key="'path-' + idx" fill-rule="evenodd" clip-rule="evenodd" :d="p.d" />
        </template>
        </svg>
      </div>
    </div>

    <div v-if="search && !filteredIcons.length && icons.length" class="tw-pd-1 tw-c-text-alt">
      No icons matched <code>{{ search }}</code>.
    </div>

    <div v-if="selected"
      class="trubbel-icon-detail tw-elevation-1 tw-c-background-alt tw-border tw-border-radius-large tw-pd-2 tw-mg-t-1">

      <div class="tw-flex tw-align-items-start tw-flex-nowrap tw-mg-b-1" style="gap: 16px;">
        <div class="trubbel-icon-detail-preview">
          <svg width="80" height="80" :viewBox="selected.viewBox" focusable="false" aria-hidden="true" role="presentation"
            style="fill: currentColor;">
          <template v-for="(p, idx) in selected.paths">
            <polygon v-if="p.type === 'polygon'" :key="'poly-' + idx" :points="p.d" />
            <path v-else :key="'path-' + idx" fill-rule="evenodd" clip-rule="evenodd" :d="p.d" />
          </template>
          </svg>
        </div>

        <div class="tw-flex-grow-1">
          <div v-if="selected.displayName" class="tw-mg-b-05">
            <span class="tw-strong">Name: </span>
            <code class="tw-c-text-alt-2">{{ selected.displayName }}</code>
          </div>
          <div class="tw-mg-b-05">
            <span class="tw-strong">Module ID: </span>
            <code class="tw-c-text-alt-2">{{ selected.id }}</code>
          </div>
          <div class="tw-mg-b-1 tw-c-text-alt-2" style="font-size: 11px;">
            {{ selected.paths.length }} path{{ selected.paths.length !== 1 ? 's' : '' }}
          </div>

          <div class="tw-flex tw-flex-wrap" style="gap: 6px;">
            <button class="tw-button ffz-button--hollow" @click="copySvgMarkup">
              <span class="tw-button__icon tw-button__icon--left">
                <figure class="ffz-i-docs" />
              </span>
              <span class="tw-button__text">Copy SVG</span>
            </button>

            <button class="tw-button ffz-button--hollow" @click="downloadSvg">
              <span class="tw-button__icon tw-button__icon--left">
                <figure class="ffz-i-download" />
              </span>
              <span class="tw-button__text">Download SVG</span>
            </button>

            <button class="tw-button ffz-button--hollow" @click="downloadPng">
              <span class="tw-button__icon tw-button__icon--left">
                <figure class="ffz-i-download" />
              </span>
              <span class="tw-button__text">Download PNG</span>
            </button>
          </div>

          <div v-if="feedback" class="tw-mg-t-05 tw-c-text-success ffz-font-size-6">
            {{ feedback }}
          </div>
        </div>
      </div>
    </div>

  </div>
</template>


<script>

import { buildSvgString } from "../../settings/twilight/icon-finder.js";

export default {
  props: ["item", "context"],

  data() {
    return {
      icons: [],
      selected: null,
      search: "",
      scanning: false,
      feedback: "",
      feedbackTimer: null
    };
  },

  computed: {
    filteredIcons() {
      if (!this.search.trim()) {
        return this.icons;
      }

      const q = this.search.toLowerCase();
      return this.icons.filter(icon => {
        return (
          (icon.displayName && icon.displayName.toLowerCase().includes(q)) ||
          icon.id.toLowerCase().includes(q) ||
          icon.paths.some(p => p.d.toLowerCase().includes(q))
        );
      });
    },

    findCode() {
      if (!this.selected) return "";
      return this.item.generateFind(this.selected);
    },

    selectedSvgString() {
      if (!this.selected) return "";
      return buildSvgString(this.selected.paths, { viewBox: this.selected.viewBox });
    }
  },

  mounted() {
    const cached = this.item.getIcons();
    if (cached?.length)
      this.icons = cached;
  },

  methods: {
    async rescan() {
      this.selected = null;
      this.scanning = true;
      this.icons = [];
      await this.$nextTick();
      await new Promise(r => setTimeout(r, 50));
      this.icons = this.item.rescan();
      this.scanning = false;
    },

    selectIcon(icon) {
      this.selected = (this.selected?.id === icon.id) ? null : icon;
      this.feedback = "";
    },

    copyText(text, msg = "Copied!") {
      navigator.clipboard.writeText(text).then(() => {
        this.showFeedback(msg);
      }).catch(() => {
        const el = document.createElement("textarea");
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        this.showFeedback(msg);
      });
    },

    showFeedback(msg) {
      this.feedback = msg;
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = setTimeout(() => { this.feedback = ""; }, 2000);
    },

    copySvgMarkup() {
      this.copyText(this.selectedSvgString, "SVG markup copied!");
    },

    downloadSvg() {
      if (!this.selected) return;
      const blob = new Blob([this.selectedSvgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.selected.displayName || "twitch-icon-" + this.selected.id}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      this.showFeedback("SVG downloaded!");
    },

    downloadPng() {
      if (!this.selected) return;
      const svg = buildSvgString(this.selected.paths, { fill: "#efeff1", size: 128, viewBox: this.selected.viewBox });
      const img = new Image();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 128;
        canvas.height = 128;
        canvas.getContext("2d").drawImage(img, 0, 0, 128, 128);
        URL.revokeObjectURL(url);
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `${this.selected.displayName || "twitch-icon-" + this.selected.id}.png`;
        a.click();
        this.showFeedback("PNG downloaded!");
      };
      img.src = url;
    }
  }
};

</script>