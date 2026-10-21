<template>
<div v-if="editing || note" class="cvc-user-note">
  <div v-if="editing" class="cvc-user-note__editor">
    <textarea ref="input" v-model="draft" class="cvc-user-note__input" rows="3" maxlength="1000"
      placeholder="Write a private note about this user"
      @keydown.enter.ctrl.exact.prevent="save"
      @keydown.enter.meta.exact.prevent="save"
      @keyup.esc.stop="cancel"></textarea>
    <div class="cvc-user-note__row">
      <span class="cvc-user-note__hint">Ctrl+Enter to save</span>
      <button v-if="note" class="cvc-user-note__btn cvc-user-note__btn--danger" @click="remove">Delete</button>
      <button class="cvc-user-note__btn" @click="cancel">Cancel</button>
      <button class="cvc-user-note__btn cvc-user-note__btn--primary" @click="save">Save</button>
    </div>
  </div>

  <div v-else class="cvc-user-note__view ffz-tooltip" :data-title="'Last edited ' + updatedLabel + ' (click to edit)'"
    @click="startEdit">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M8 7h8v2H8V7Zm0 5h8v2H8v-2Z" />
      <path fill-rule="evenodd" clip-rule="evenodd" d="m17 22 4-4V2H3v20h14ZM5 4h14v13h-3v3H5V4Z" />
    </svg>
    <span class="cvc-user-note__text">{{ note.text }}</span>
  </div>
</div>
</template>

<script>

import { formatSince } from "./card-utils";

export default {
  props: ["user", "getFFZ", "editRequest"],

  data() {
    return {
      note: null,
      editing: false,
      draft: ""
    }
  },

  computed: {
    updatedLabel() {
      return this.note ? formatSince(this.getFFZ(), this.note.updatedAt) : "";
    }
  },

  watch: {
    editRequest(val) {
      if (val) this.startEdit();
    }
  },

  created() {
    this.load();
    this.getFFZ().on("trubbel:notes-changed", this.load, this);
  },

  beforeDestroy() {
    this.getFFZ().off("trubbel:notes-changed", this.load, this);
  },

  methods: {
    load() {
      var n = this.user && this.getFFZ().getNote(this.user.id);
      this.note = n ? { ...n } : null;
    },

    startEdit() {
      this.draft = this.note ? this.note.text : "";
      this.editing = true;
      this.$nextTick(() => {
        var el = this.$refs.input;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    },

    save() {
      this.getFFZ().setNote(this.user, this.draft);
      this.editing = false;
      this.load();
    },

    remove() {
      this.getFFZ().deleteNote(this.user.id);
      this.editing = false;
      this.load();
    },

    cancel() {
      this.editing = false;
    }
  }
}
</script>