<template>
<div class="cvc-live-messages">
  <div v-if="history.length === 0 && live.length === 0" class="cvc-empty-state">
    No messages from {{ user.displayName || user.login }} in chat yet.
  </div>
  <div v-else class="cvc-messages-scroll-container" ref="container" @scroll="onScroll">
    <ffz-card-chat-line v-for="item in history" :key="'h-' + item.id"
      :msg="item" :room="room" :get-f-f-z="getFFZ" :paint="paint"
      :class="{ 'message-deleted': item.isDeleted }" />

    <div v-if="history.length" class="cvc-message-date-separator">
      <span class="cvc-message-date-separator__line"></span>
      <span class="cvc-message-date-separator__date">LIVE</span>
      <span class="cvc-message-date-separator__line"></span>
    </div>

    <ffz-card-chat-line v-for="item in live" :key="'l-' + item.id"
      :msg="item" :room="room" :get-f-f-z="getFFZ" :paint="paint"
      :class="{ 'message-deleted': item.isDeleted }" />
  </div>
</div>
</template>

<script>

import ChatLine from "./chat-line.vue";

const MAX_LIVE = 150;

export default {
  components: {
    "ffz-card-chat-line": ChatLine
  },

  props: ["user", "room", "getFFZ", "paint"],

  data() {
    return {
      history: [],
      live: [],
      stickToBottom: true
    }
  },

  created() {
    var ffz = this.getFFZ();
    this._seen = new Set();

    this.loadHistory();

    ffz.on("chat:receive-message", this.onReceive, this);
    ffz.on("chat:mod-user", this.onModUser, this);
  },

  mounted() {
    this.scrollToBottom();
  },

  beforeDestroy() {
    var ffz = this.getFFZ();
    ffz.off("chat:receive-message", this.onReceive, this);
    ffz.off("chat:mod-user", this.onModUser, this);
  },

  methods: {
    isOurs(m, channelID) {
      if (!m || !m.user || !m.id || m.message == null) return false;
      if (String(m.user.id) !== String(this.user.id)) return false;
      var room_id = channelID != null ? channelID : m.roomID;
      return !this.room || !this.room.id || String(room_id) === String(this.room.id);
    },

    toLine(m) {
      var chat = this.getFFZ().resolve("chat"),
        badges_mod = chat && chat.badges,
        room = this.room || {},
        display = [];

      for (var set in (m.badges || {})) {
        var b = badges_mod && (m.sourceRoomID
          ? badges_mod.getTwitchBadge(set, m.badges[set], m.sourceRoomID, null)
          : badges_mod.getTwitchBadge(set, m.badges[set], room.id, room.login));
        if (b && b.image1x)
          display.push({ setID: set, version: m.badges[set], image1x: b.image1x, image2x: b.image2x, image4x: b.image4x, title: b.title });
      }

      return {
        id: m.id,
        sentAt: new Date(m.timestamp || Date.now()).toISOString(),
        isDeleted: !!m.deleted,
        content: { text: m.message || "" },
        sender: {
          id: m.user.id,
          login: m.user.login,
          displayName: m.user.displayName || m.user.login,
          chatColor: m.user.color,
          displayBadges: display
        },
        _ffzTokens: m.ffz_tokens || null
      };
    },

    loadHistory() {
      var chat = this.getFFZ().resolve("chat"),
        out = [];

      try {
        var entries = chat.iterateMessages(true, false, false);
        for (var i = 0; i < entries.length; i++) {
          var m = entries[i] && entries[i].message;
          if (!this.isOurs(m) || this._seen.has(m.id)) continue;
          this._seen.add(m.id);
          out.push(m);
        }
      } catch (err) {
        console.warn("[ViewerCards] Unable to read chat history:", err);
      }

      out.sort(function(a, b) { return (a.timestamp || 0) - (b.timestamp || 0); });
      this.history = out.map(this.toLine);
    },

    onReceive(event) {
      var m = event && event.message;
      if (!this.isOurs(m, event.channelID) || this._seen.has(m.id)) return;
      this._seen.add(m.id);

      this.live.push(this.toLine(m));
      if (this.live.length > MAX_LIVE) this.live.splice(0, this.live.length - MAX_LIVE);

      if (this.stickToBottom) this.$nextTick(this.scrollToBottom);
    },

    onModUser(type, login, target_id) {
      if (!login || login !== this.user.login) return;
      var mark = function(item) {
        if (!target_id || item.id === target_id) item.isDeleted = true;
      };
      this.history.forEach(mark);
      this.live.forEach(mark);
    },

    onScroll() {
      var el = this.$refs.container;
      if (el) this.stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    },

    scrollToBottom() {
      var el = this.$refs.container;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }
}
</script>