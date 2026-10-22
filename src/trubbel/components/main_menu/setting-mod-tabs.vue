<template>
  <section class="ffz--widget ffz--chat-actions">
    <div class="tw-flex tw-align-items-center tw-pd-b-05">
      <div class="tw-flex-grow-1">
        <div>{{ item.title }}</div>
        <div v-if="item.description" class="tw-c-text-alt-2">{{ item.description }}</div>
      </div>

      <button
        v-if="has_value"
        :disabled="isReadOnly"
        class="tw-mg-l-05 tw-button tw-button--text ffz-il-tooltip__container"
        @click="clear"
      >
        <span class="tw-button__text ffz-i-cancel" />
        <div class="ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-right">
          Reset to Default
        </div>
      </button>
    </div>

    <div class="ffz--action-list">
      <section
        v-for="(tab, index) in tabs"
        :key="tab.id"
        :class="{ 'sortable-ghost': dragIndex === index }"
        @dragover.prevent="onDragOver(index)"
        @drop.prevent="onDragEnd"
      >
        <div class="ffz--action tw-elevation-1 tw-c-background-base tw-border tw-pd-y-05 tw-pd-r-1 tw-mg-y-05 tw-flex tw-flex-nowrap tw-align-items-center">
          <div
            class="tw-flex tw-flex-shrink-0 tw-align-items-start handle tw-pd-x-05 tw-pd-t-1 tw-pd-b-05"
            style="cursor: move"
            :draggable="!isReadOnly"
            @dragstart="onDragStart($event, index)"
            @dragend="onDragEnd"
          >
            <span class="ffz-i-ellipsis-vert" />
          </div>

          <div class="tw-flex tw-align-items-center ffz-checkbox tw-flex-grow-1">
            <input
              :id="item.full_key + ':' + tab.id"
              :checked="tab.enabled"
              :disabled="isReadOnly"
              type="checkbox"
              class="ffz-checkbox__input"
              @change="toggle(index, $event.target.checked)"
            >
            <label :for="item.full_key + ':' + tab.id" class="ffz-checkbox__label">
              <span class="tw-mg-l-1">{{ label(tab) }}</span>
            </label>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<script>

const { SettingMixin } = FrankerFaceZ.get().resolve("main_menu");

export default {
  mixins: [SettingMixin],
  props: ["item", "context"],

  data() {
    return {
      dragIndex: null,
      dragOrder: null
    }
  },

  computed: {
    tabs() {
      var names = {};
      (this.item.tabs || []).forEach(function(t) { names[t.id] = t.name; });

      var list = this.dragOrder || this.item.normalize(this.value);
      return list.map(function(t) {
        return { id: t.id, enabled: t.enabled, name: names[t.id] || t.id };
      });
    }
  },

  methods: {
    label(tab) {
      return (this.item.itemLabel || "Display {name} tab").replace("{name}", tab.name);
    },

    save(list) {
      this.set(list.map(function(t) { return { id: t.id, enabled: t.enabled }; }));
    },

    toggle(index, enabled) {
      var list = this.tabs.slice();
      list[index] = Object.assign({}, list[index], { enabled: enabled });
      this.save(list);
    },

    onDragStart(event, index) {
      this.dragIndex = index;
      this.dragOrder = this.tabs.slice();
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", this.tabs[index].id);
      var row = event.target.closest("section");
      if (row) event.dataTransfer.setDragImage(row, 0, 0);
    },

    onDragOver(index) {
      if (this.dragIndex == null || this.dragIndex === index) return;
      var list = this.dragOrder.slice();
      list.splice(index, 0, list.splice(this.dragIndex, 1)[0]);
      this.dragOrder = list;
      this.dragIndex = index;
    },

    onDragEnd() {
      if (this.dragOrder == null) return;
      var list = this.dragOrder,
        before = this.item.normalize(this.value).map(function(t) { return t.id; }).join(),
        after = list.map(function(t) { return t.id; }).join();

      this.dragIndex = null;
      this.dragOrder = null;

      if (before !== after) this.save(list);
    }
  }
}
</script>