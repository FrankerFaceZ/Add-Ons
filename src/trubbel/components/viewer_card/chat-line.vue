<script>
import { formatTime } from "./card-utils";

const { createElement, setChildren } = FrankerFaceZ.utilities.dom;

function buildTwitchEmotes(fragments) {
  if (!Array.isArray(fragments)) return null;
  var out = {}, idx = 0, found = false;
  for (var i = 0; i < fragments.length; i++) {
    var frag = fragments[i];
    var len = Array.from(frag.text || '').length;
    var content = frag.content;
    if (content && content.__typename === 'Emote' && content.emoteID && len > 0) {
      var id = String(content.emoteID);
      (out[id] = out[id] || []).push({ startIndex: idx, endIndex: idx + len - 1, id: id });
      found = true;
    }
    idx += len;
  }
  return found ? out : null;
}

function badgeSrcset(b) {
  var base = /\/1$/.test(b.image1x) ? b.image1x.slice(0, -1) : null;
  var x2 = b.image2x || (base && base + "2");
  var x4 = b.image4x || (base && base + "3");
  if (!x2 && !x4) return undefined;
  return [b.image1x + " 1x", x2 && x2 + " 2x", x4 && x4 + " 4x"].filter(Boolean).join(", ");
}

const deleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M10 2h4v2h7v2H3V4h7V2ZM5 8h2v12h10V8h2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Z" />
    <path d="M11 8h2v10h-2V8Z" />
  </svg>
);

export default {
  props: ["msg", "room", "getFFZ", "canDelete", "paint"],

  render(h) {
    return h("div", { class: "cvc-chat-line" });
  },

  mounted() {
    this.draw();
  },

  watch: {
    msg() {
      this.draw();
    },

    canDelete() {
      this.draw();
    },

    paint() {
      this.draw();
    }
  },

  methods: {
    renderBadges(displayBadges) {
      return (displayBadges || []).filter(function(b) { return b && b.image1x; }).map(function(b) {
        return createElement("img", {
          className: "cvc-msg__badge ffz-tooltip",
          src: b.image1x,
          srcset: badgeSrcset(b),
          alt: b.title || "",
          "data-title": b.title || ""
        });
      });
    },

    renderAuthor(user) {
      var parts = [createElement("span", { className: "cvc-msg__name" }, user.displayName)];
      if (user.isIntl)
        parts.push(createElement("span", { className: "cvc-msg__login" }, " (" + user.login + ")"));
      return parts;
    },

    draw() {
      var m = this.msg;
      if (!m || !this.$el) return;

      var ffz = this.getFFZ(),
        chat = ffz.resolve("chat"),
        site = ffz.resolve("site"),
        sender = m.sender || {},
        room = this.room || {},
        text = (m.content && m.content.text) || "",
        ts = new Date(m.sentAt).getTime();

      var badges = {};
      var display_badges = sender.displayBadges || [];
      for (var i = 0; i < display_badges.length; i++)
        badges[display_badges[i].setID] = display_badges[i].version;

      var user = {
        id: sender.id,
        login: sender.login,
        displayName: sender.displayName || sender.login,
        color: sender.chatColor,
        isIntl: !!(sender.login && sender.displayName &&
          sender.displayName.trim().toLowerCase() !== sender.login)
      };

      var ffz_msg = {
        id: m.id,
        user: user,
        roomID: room.id,
        roomLogin: room.login,
        badges: badges,
        message: text,
        ffz_emotes: buildTwitchEmotes(m.content && m.content.fragments),
        timestamp: ts,
        deleted: !!m.isDeleted,
        ffz_context: "viewer-card"
      };

      var message_body;
      try {
        var tokens = m._ffzTokens || chat.tokenizeMessage(ffz_msg, site.getUser());
        message_body = chat.renderTokens(tokens, createElement);
      } catch (err) {
        console.error("[ViewerCards] Unable to tokenize message, using plain text.", err);
        message_body = text;
      }

      var self = this;
      var deleteButton = this.canDelete && !m.isDeleted && m.id
        ? (<button
          className="cvc-msg__delete ffz-tooltip"
          data-title="Delete message"
          aria-label="Delete message"
          onClick={e => {
            e.stopPropagation();
            self.$emit("delete", m.id);
          }}
        >{deleteIcon()}</button>)
        : null;

      var deletedBy = m.isDeleted && m.lastUpdatedBy && (m.lastUpdatedBy.login || m.lastUpdatedBy.displayName);
      var deletedNote = m.isDeleted
        ? (<span className="cvc-msg__deleted-by">{deletedBy ? ` (Deleted by ${deletedBy})` : " (Deleted)"}</span>)
        : null;

      var line = createElement("div", {
        className: "cvc-msg",
        "data-room-id": room.id,
        "data-room": room.login,
        "data-user-id": user.id,
        "data-user": user.login,
        "data-message-id": m.id
      }, [
        createElement("span", { className: "cvc-msg__time" }, formatTime(m.sentAt)),
        deleteButton,
        createElement("span", { className: "cvc-msg__badges" }, this.renderBadges(sender.displayBadges)),
        createElement("span", {
          className: "cvc-msg__author notranslate" + (this.paint ? " seventv-painted-content" : ""),
          style: this.paint || { color: user.color || undefined }
        }, this.renderAuthor(user)),
        createElement("span", { className: "cvc-msg__colon", "aria-hidden": "true" }, ": "),
        createElement("span", { className: "cvc-msg__body" }, message_body),
        deletedNote
      ]);

      setChildren(this.$el, line);
    }
  }
}
</script>