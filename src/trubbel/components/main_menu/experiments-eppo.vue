<template>
  <div class="ffz--experiments-eppo ffz--experiments tw-pd-t-05">
    <div class="tw-pd-b-1 tw-mg-b-1 tw-border-b">
      This feature allows you to override Eppo experiment values. Please note that, for most experiments, you may have to refresh the page for your changes to take effect.
    </div>

    <div class="tw-mg-b-2 tw-flex tw-align-items-center">
      <div class="tw-flex-grow-1">
        {{ visible_flags.length }} flag{{ visible_flags.length === 1 ? '' : 's' }}
      </div>
      <select
        ref="sort_select"
        class="tw-border-radius-medium ffz-font-size-6 ffz-select tw-pd-l-1 tw-pd-r-3 tw-pd-y-05 tw-mg-x-05"
        @change="onSort"
      >
        <option :selected="sort_by === 0">
          Sort By: Name
        </option>
        <option :selected="sort_by === 1">
          Sort By: Type
        </option>
      </select>
    </div>

    <div class="tw-mg-b-2 tw-flex tw-align-items-center">
      <div class="tw-flex-grow-1" />
      <div class="ffz-checkbox tw-relative">
        <input
          id="show-disabled"
          v-model="show_disabled"
          type="checkbox"
          class="ffz-checkbox__input"
        >
        <label for="show-disabled" class="ffz-checkbox__label">
          <span class="tw-mg-l-1">
            Show disabled flags
          </span>
        </label>
      </div>
    </div>

    <h3 class="tw-mg-t-1 tw-mg-b-1 ffz-font-size-3">
      <span>Twitch Eppo Experiments</span>
    </h3>

    <section v-if="experiments_locked">
      <div class="tw-c-background-accent tw-c-text-overlay tw-pd-1 tw-mg-b-2">
        <h3 class="ffz-i-attention ffz-font-size-3">
          It's dangerous to go at all.
        </h3>
        <markdown :source="'Be careful, this is an advanced feature intended for developer use only. Normal users should steer clear. Adjusting your eppo experiments can have unexpected impacts on your Twitch experience. FrankerFaceZ is not responsible for any issues you encounter as a result of tampering with experiments, and we will not provide support.\n\nIf you\'re sure about this, please type `' + code + '` into the box below and hit enter.'" />
      </div>

      <div class="tw-flex tw-align-items-center">
        <input
          ref="code"
          type="text"
          class="tw-block tw-full-width tw-border-radius-medium ffz-font-size-6 tw-full-width ffz-input tw-pd-x-1 tw-pd-y-05 tw-mg-b-5"
          autocapitalize="off"
          autocorrect="off"
          @keydown.enter="enterCode"
        >
      </div>
    </section>

    <div v-else class="ffz--experiment-list">
      <section
        v-for="{key, flag} of visible_flags"
        :key="key"
        :data-key="key"
      >
        <div class="tw-elevation-1 tw-c-background-base tw-border tw-pd-y-05 tw-pd-x-1 tw-mg-y-05 tw-flex tw-flex-nowrap">
          <div class="tw-flex-grow-1">
            <h4 class="ffz-font-size-4">
              {{ key }}
              <span v-if="flag.has_override" class="tw-c-text-alt-2">
                (Overridden)
              </span>
            </h4>
            <div class="description tw-c-text-alt-2">
              Type: {{ flag.variationType }}
              <span v-if="flag.entityId"> • Entity ID: {{ flag.entityId }}</span>
              <span v-if="!flag.enabled"> • Disabled</span>
            </div>
          </div>

          <div class="tw-flex tw-flex-shrink-0 tw-align-items-start">
            <select
              v-if="flag.variationType === 'BOOLEAN' || flag.variationType === 'STRING'"
              :data-key="key"
              :value="flag.current_value"
              class="tw-border-radius-medium ffz-font-size-6 ffz-select tw-pd-l-1 tw-pd-r-3 tw-pd-y-05 tw-mg-x-05"
              @change="onChange($event)"
            >
              <option
                v-for="variation in flag.variations"
                :key="variation.key"
                :value="variation.value"
              >
                {{ variation.key }}
              </option>
            </select>

            <input
              v-else-if="flag.variationType === 'INTEGER'"
              type="number"
              :data-key="key"
              :value="flag.current_value"
              class="tw-border-radius-medium ffz-font-size-6 ffz-input tw-pd-l-1 tw-pd-r-1 tw-pd-y-05 tw-mg-x-05"
              style="width: 120px;"
              @change="onChange($event)"
            >

            <textarea
              v-else-if="flag.variationType === 'JSON'"
              :data-key="key"
              :value="typeof flag.current_value === 'object' ? JSON.stringify(flag.current_value, null, 2) : flag.current_value"
              class="tw-border-radius-medium ffz-font-size-6 ffz-input tw-pd-l-1 tw-pd-r-1 tw-pd-y-05 tw-mg-x-05"
              style="width: 300px; height: 80px; font-family: monospace;"
              @change="onChange($event)"
            />

            <input
              v-else
              type="text"
              :data-key="key"
              :value="typeof flag.current_value === 'object' ? JSON.stringify(flag.current_value) : flag.current_value"
              class="tw-border-radius-medium ffz-font-size-6 ffz-input tw-pd-l-1 tw-pd-r-1 tw-pd-y-05 tw-mg-x-05"
              style="width: 200px;"
              @change="onChange($event)"
            >

            <button
              :disabled="!flag.has_override"
              :class="{'tw-button--disabled': !flag.has_override}"
              class="tw-mg-t-05 tw-button tw-button--text ffz-il-tooltip__container"
              @click="reset(key)"
            >
              <span class="tw-button__text ffz-i-cancel" />
              <span class="ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-right">
                Reset to Default
              </span>
            </button>
          </div>
        </div>
      </section>

      <div v-if="!sorted_flags.length">
        There are no Eppo flags available.
      </div>
      <div v-else-if="!visible_flags.length">
        There are no matching flags.
      </div>
    </div>
  </div>
</template>

<script>

const { pick_random } = FrankerFaceZ.utilities.object;

const CODES = [
  'sv_cheats 1',
  'idspispopd',
  'rosebud',
  'how do you turn this on'
];

export default {
  props: ['item', 'context'],

  data() {
    return {
      code: pick_random(CODES),
      experiments_locked: this.item.is_locked(),
      sort_by: 0,
      show_disabled: false,
      eppo_data: {},
    };
  },

  computed: {
    sorted_flags() {
      const out = [];

      for (const [key, flag] of Object.entries(this.eppo_data)) {
        if (!this.show_disabled && !flag.enabled) continue;

        const variationsList = flag.variations
          ? Object.entries(flag.variations).map(([varKey, varData]) => ({
              key: varKey,
              value: varData.value,
            }))
          : [];

        out.push({
          key,
          flag: {
            ...flag,
            variations: variationsList,
            current_value: this.item.getAssignment?.(key),
            has_override: this.item.hasOverride?.(key) ?? false,
          },
        });
      }

      out.sort((a, b) => {
        if (a.flag.has_override !== b.flag.has_override) {
          return a.flag.has_override ? -1 : 1;
        }

        if (this.sort_by === 1) {
          const typeCompare = (a.flag.variationType ?? '').localeCompare(b.flag.variationType ?? '');
          if (typeCompare !== 0) return typeCompare;
        }

        return a.key.localeCompare(b.key);
      });

      return out;
    },

    visible_flags() {
      const filter = this.context?.context?.search_filter;
      if (!filter) return this.sorted_flags;

      const lower = filter.toLowerCase();

      return this.sorted_flags.filter(({ key, flag }) => {
        if (key.toLowerCase().includes(lower)) return true;
        if (flag.variationType?.toLowerCase().includes(lower)) return true;
        if (flag.variations?.some(v => v.key.toLowerCase().includes(lower))) return true;
        return false;
      });
    },
  },

  created() {
    this.loadData();

    this._eppoHandler = () => this.loadData();
    this.item.on?.(':eppo-changed', this._eppoHandler);
  },

  beforeDestroy() {
    this.item.off?.(':eppo-changed', this._eppoHandler);
  },

  methods: {
    loadData() {
      if (this.item.eppo_data) {
        this.eppo_data = this.item.eppo_data();
      }
    },

    enterCode() {
      if (this.$refs.code.value !== this.code)
        return;

      this.experiments_locked = false;
      this.item.unlock();
    },

    onSort() {
      this.sort_by = this.$refs.sort_select.selectedIndex;
    },

    onChange(event) {
      const key = event.target.dataset.key;
      if (!key) return;

      let value = event.target.value;
      const variationType = this.item.getVariationType?.(key);

      if (variationType === 'INTEGER') {
        value = parseInt(value, 10);
      } else if (variationType === 'BOOLEAN') {
        value = value === 'true' || value === true;
      } else if (variationType === 'JSON') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.error('[Eppo] Invalid JSON value:', e);
          return;
        }
      }

      this.item.setOverride?.(key, value);
    },

    reset(key) {
      if (!key) return;
      this.item.deleteOverride?.(key);
    },
  },
};
</script>