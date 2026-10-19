<template>
  <section class="ffz--widget">
    <div class="tw-mg-t-1 tw-mg-b-05">
      Timeout Buttons
    </div>
    <div class="tw-c-text-alt-2 tw-font-size-7 tw-mg-b-1">
      Configure up to 8 custom timeout buttons. Leave value empty to disable a button.
      Minimum is 1 second and maximum is 2 weeks.
    </div>

    <ul class="tw-mg-t-05" style="max-height: 400px; overflow-y: auto;">
      <li 
        v-for="(button, index) in buttons" 
        :key="index"
        class="tw-elevation-1 tw-c-background-base tw-mg-x-05 tw-border tw-pd-y-05 tw-mg-y-05 tw-pd-r-1 tw-flex tw-flex-nowrap tw-align-items-center"
      >

        <div class="tw-flex-shrink-0 tw-mg-l-1 tw-mg-r-1 tw-c-text-alt-2" style="min-width: 30px;">
          #{{ index + 1 }}
        </div>

        <input 
          v-model.number="button.value"
          type="number"
          min="0"
          max="999"
          class="tw-block tw-border-radius-medium tw-font-size-6 ffz-input ffz-min-width-unset tw-pd-x-1 tw-pd-y-05"
          placeholder="0"
          style="width: 110px;"
          @input="updateButton(index)"
        >

        <select 
          v-model="button.unit"
          class="tw-border-radius-medium tw-font-size-6 ffz-select ffz-min-width-unset tw-pd-l-1 tw-pd-r-3 tw-pd-y-05 tw-mg-l-05"
          style="width: 110px;"
          @change="updateButton(index)"
        >
          <option value="second">second(s)</option>
          <option value="minute">minute(s)</option>
          <option value="hour">hour(s)</option>
          <option value="day">day(s)</option>
          <option value="week">week(s)</option>
        </select>
      </li>
    </ul>

    <div class="tw-mg-t-1 tw-pd-t-1 tw-border-t">
      <div class="tw-flex tw-align-items-center tw-justify-content-between">
        <div class="tw-c-text-alt-2 tw-font-size-5">
          {{ activeButtonCount }} of 8 buttons configured
        </div>
        <button class="tw-button tw-button--text" @click="resetToDefaults">
          <span class="tw-button__text">Reset to Defaults</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  props: ["item", "context"],

  data() {
    return {
      buttons: []
    }
  },

  computed: {
    activeButtonCount() {
      return this.buttons.filter(b => b.value > 0).length;
    }
  },

  mounted() {
    this.loadData();
  },

  methods: {
    loadData() {
      try {
        const savedButtons = this.item.getTimeoutButtons();
        
        if (savedButtons && Array.isArray(savedButtons) && savedButtons.length === 8) {
          this.buttons = savedButtons.map(b => ({ ...b }));
        } else {
          this.resetToDefaults();
        }
        
        console.log("[Timeout Buttons] Loaded:", this.buttons);
      } catch (error) {
        console.error("[Timeout Buttons] Error loading data:", error);
        this.resetToDefaults();
      }
    },

    saveData() {
      try {
        this.item.setTimeoutButtons(this.buttons);
        console.log("[Timeout Buttons] Saved:", this.buttons);
      } catch (error) {
        console.error("[Timeout Buttons] Error saving data:", error);
      }
    },

    updateButton(index) {
      const button = this.buttons[index];
      if (button.value === "" || button.value === null || button.value === undefined) {
        button.value = 0;
      } else {
        button.value = parseInt(button.value) || 0;
      }
      
      this.saveData();
    },

    resetToDefaults() {
      if (this.buttons.length > 0) {
        if (!confirm("Are you sure you want to reset timeout buttons to default values?")) {
          return;
        }
      }

      this.buttons = [
        { value: 1, unit: "second" },
        { value: 5, unit: "minute" },
        { value: 10, unit: "minute" },
        { value: 1, unit: "hour" },
        { value: 2, unit: "hour" },
        { value: 1, unit: "day" },
        { value: 1, unit: "week" },
        { value: 2, unit: "week" }
      ];
      
      this.saveData();
    }
  }
}
</script>