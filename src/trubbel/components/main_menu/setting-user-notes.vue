<template>
  <section class="ffz--widget">
    <div class="tw-mg-b-05">{{ item.title }}</div>
    <div v-if="item.description" class="tw-c-text-alt-2 tw-mg-b-1">{{ item.description }}</div>

    <div class="tw-flex tw-align-items-center tw-mg-b-05">
      <input v-model="search" type="text"
        class="tw-block tw-border-radius-medium tw-font-size-6 tw-full-width ffz-input tw-pd-x-1 tw-pd-y-05"
        placeholder="Search by user or note">
      <div class="tw-flex-shrink-0 tw-mg-l-1 tw-c-text-alt-2">
        {{ filtered.length }} / {{ notes.length }}
      </div>
    </div>

    <div v-if="!notes.length" class="tw-c-text-alt-2 tw-align-center tw-pd-2">
      No notes yet. Use "Notes" in a viewer card's More options menu to add one.
    </div>
    <div v-else-if="!filtered.length" class="tw-c-text-alt-2 tw-align-center tw-pd-2">
      No notes match "{{ search }}".
    </div>

    <ul v-else style="max-height: 500px; overflow-y: auto;">
      <li v-for="n in filtered" :key="n.id"
        class="tw-elevation-1 tw-c-background-base tw-border tw-pd-1 tw-mg-y-05">
        <div class="tw-flex tw-align-items-center">
          <div class="tw-flex-grow-1">
            <a :href="'https://www.twitch.tv/' + n.login" target="_blank" rel="noopener noreferrer"
              class="tw-strong">{{ n.displayName || n.login }}</a>
            <span v-if="n.displayName && n.displayName.toLowerCase() !== n.login" class="tw-c-text-alt-2">
              ({{ n.login }})
            </span>
            <span class="tw-c-text-alt-2 tw-mg-l-05">· {{ formatDate(n.updatedAt) }}</span>
          </div>

          <template v-if="editingId === n.id">
            <button class="tw-button tw-button--text tw-mg-l-05" @click="saveEdit(n)">
              <span class="tw-button__text ffz-i-ok">Save</span>
            </button>
            <button class="tw-button tw-button--text tw-mg-l-05" @click="editingId = null">
              <span class="tw-button__text ffz-i-cancel">Cancel</span>
            </button>
          </template>
          <template v-else>
            <button class="tw-button tw-button--text tw-mg-l-05" @click="startEdit(n)">
              <span class="tw-button__text ffz-i-pencil">Edit</span>
            </button>
            <button class="tw-button tw-button--text tw-mg-l-05" @click="remove(n)">
              <span class="tw-button__text ffz-i-trash">Delete</span>
            </button>
          </template>
        </div>

        <textarea v-if="editingId === n.id" v-model="draft" rows="3" maxlength="1000"
          class="tw-block tw-border-radius-medium tw-font-size-6 tw-full-width ffz-input tw-pd-x-1 tw-pd-y-05 tw-mg-t-05"
          @keydown.enter.ctrl.exact.prevent="saveEdit(n)"
          @keyup.esc.stop="editingId = null"></textarea>
        <div v-else class="tw-mg-t-05" style="white-space: pre-wrap; overflow-wrap: anywhere;">{{ n.text }}</div>
      </li>
    </ul>
  </section>
</template>

<script>
export default {
  props: ["item", "context"],

  data() {
    return {
      notes: [],
      search: "",
      editingId: null,
      draft: ""
    }
  },

  computed: {
    filtered() {
      var q = this.search.trim().toLowerCase();
      if (!q) return this.notes;
      return this.notes.filter(function(n) {
        return (n.login || "").toLowerCase().includes(q) ||
          (n.displayName || "").toLowerCase().includes(q) ||
          (n.text || "").toLowerCase().includes(q);
      });
    }
  },

  created() {
    this.load();
    this.item.on("trubbel:notes-changed", this.load, this);
  },

  beforeDestroy() {
    this.item.off("trubbel:notes-changed", this.load, this);
  },

  methods: {
    load() {
      var all = this.item.getNotes() || {};
      this.notes = Object.keys(all)
        .filter(function(id) { return all[id] && all[id].text; })
        .map(function(id) { return Object.assign({ id: id }, all[id]); })
        .sort(function(a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); });
    },

    formatDate(date) {
      return date ? new Date(date).toLocaleString() : "";
    },

    startEdit(n) {
      this.editingId = n.id;
      this.draft = n.text;
    },

    saveEdit(n) {
      this.item.setNote({ id: n.id, login: n.login, displayName: n.displayName }, this.draft);
      this.editingId = null;
    },

    remove(n) {
      if (!confirm("Delete your note about " + (n.displayName || n.login) + "?")) return;
      this.item.deleteNote(n.id);
    }
  }
}
</script>