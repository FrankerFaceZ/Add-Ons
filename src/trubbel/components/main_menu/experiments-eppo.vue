<template>
  <div class="ffz--experiments-eppo ffz--experiments tw-pd-t-05">
    <div class="tw-pd-b-1 tw-mg-b-1 tw-border-b">
      This feature allows you to override Eppo experiment values. Please note that, for most experiments, you may have to refresh the page for your changes to take effect.
    </div>

    <div class="tw-mg-b-2 tw-flex tw-align-items-center">
      <div class="tw-flex-grow-1">
        {{ visible_flags.length }} flag{{ visible_flags.length === 1 ? '' : 's' }}
      </div>
      <span class="tw-mg-l-1 tw-mg-r-05 tw-c-text-alt-2 ffz-font-size-6" style="font-weight: var(--font-weight-bold);">
        Sort by
      </span>
      <select
        v-model="sort_by"
        class="tw-border-radius-medium ffz-font-size-6 ffz-select tw-pd-l-1 tw-pd-r-3 tw-pd-y-05"
      >
        <option value="name_asc">Name (A-Z)</option>
        <option value="name_desc">Name (Z-A)</option>
        <option value="type">Type</option>
        <option value="date_newest">Date Added (Newest)</option>
        <option value="date_oldest">Date Added (Oldest)</option>
      </select>
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
            <div class="description ffz-font-size-7 tw-c-text-alt-2">
              Type: {{ flag.variationType }}
              <span v-if="flag.entity_label"> • Entity ID: {{ flag.entity_label }}</span>
              <span v-if="!flag.enabled"> • Disabled</span>
              <span
                v-if="flag.added_at !== null"
                :data-title="tDateTime(flag.added_at, 'full')"
                class="ffz-tooltip"
              > • Added: {{ tDate(flag.added_at) }}</span>
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

const ENTITY_LABELS = {
  143: 'User',
  144: 'Device',
  145: 'Channel',
  1026: 'Arbitrary',
};

export default {
  props: ['item', 'context', 'filter'],

  data() {
    return {
      code: pick_random(CODES),
      experiments_locked: this.item.is_locked(),
      sort_by: 'name_asc',
      eppo_data: {},
    };
  },

  computed: {
    sorted_flags() {
      const out = [];

      for (const [key, flag] of Object.entries(this.eppo_data)) {
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
            added_at: this.getAddedAt(flag),
            entity_label: flag.entityId != null
              ? (ENTITY_LABELS[flag.entityId] ?? String(flag.entityId))
              : null,
          },
        });
      }

      out.sort((a, b) => {
        if (a.flag.has_override !== b.flag.has_override)
          return a.flag.has_override ? -1 : 1;

        switch (this.sort_by) {
          case 'name_desc':
            return b.key.localeCompare(a.key);

          case 'type': {
            const typeCompare = (a.flag.variationType ?? '').localeCompare(b.flag.variationType ?? '');
            return typeCompare !== 0 ? typeCompare : a.key.localeCompare(b.key);
          }

          case 'date_newest':
          case 'date_oldest': {
            const a_val = a.flag.added_at, b_val = b.flag.added_at;

            if (a_val === null || b_val === null) {
              if (a_val === null && b_val === null) return 0;
              return a_val === null ? 1 : -1;
            }

            return this.sort_by === 'date_newest' ? b_val - a_val : a_val - b_val;
          }

          case 'name_asc':
          default:
            return a.key.localeCompare(b.key);
        }
      });

      return out;
    },

    visible_flags() {
      const query = this.filter?.query;
      if (!query) return this.sorted_flags;

      return this.sorted_flags.filter(({ key, flag }) => {
        if (key.toLowerCase().includes(query)) return true;
        if (flag.variationType?.toLowerCase().includes(query)) return true;
        if (flag.variations?.some(v => v.key.toLowerCase().includes(query))) return true;
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

    getAddedAt(flag) {
      if (!flag.allocations || !flag.allocations.length) return null;

      let earliest = null;
      for (const allocation of flag.allocations) {
        if (allocation.key && allocation.key.startsWith('ffz-override-')) continue;

        const ts = Date.parse(allocation.startAt);
        if (isNaN(ts)) continue;
        if (earliest === null || ts < earliest) earliest = ts;
      }

      return earliest;
    },

    enterCode() {
      if (this.$refs.code.value !== this.code)
        return;

      this.experiments_locked = false;
      this.item.unlock();
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