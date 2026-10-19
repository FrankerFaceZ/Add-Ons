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

export default {
  props: ["msg", "room", "getFFZ"],

  render(h) {
    return h("div", { class: "trubbel-chat-line" });
  },

  mounted() {
    this.draw();
  },

  watch: {
    msg() {
      this.draw();
    }
  },

  methods: {
    renderBadges(displayBadges) {
      return (displayBadges || []).filter(function(b) { return b && b.image1x; }).map(function(b) {
        return createElement("img", {
          className: "trubbel-msg__badge ffz-tooltip",
          src: b.image1x,
          srcset: badgeSrcset(b),
          alt: b.title || "",
          "data-title": b.title || ""
        });
      });
    },

    renderAuthor(user) {
      var parts = [createElement("span", { className: "trubbel-msg__name" }, user.displayName)];
      if (user.isIntl)
        parts.push(createElement("span", { className: "trubbel-msg__login" }, " (" + user.login + ")"));
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
        console.error("ViewerCards: Unable to tokenize message, using plain text.", err);
        message_body = text;
      }

      var line = createElement("div", {
        className: "trubbel-msg",
        "data-room-id": room.id,
        "data-room": room.login,
        "data-user-id": user.id,
        "data-user": user.login
      }, [
        createElement("span", { className: "trubbel-msg__time" }, formatTime(m.sentAt)),
        createElement("span", { className: "trubbel-msg__badges" }, this.renderBadges(sender.displayBadges)),
        createElement("span", {
          className: "trubbel-msg__author notranslate",
          style: { color: user.color || undefined }
        }, this.renderAuthor(user)),
        createElement("span", { className: "trubbel-msg__colon", "aria-hidden": "true" }, ": "),
        createElement("span", { className: "trubbel-msg__body" }, message_body)
      ]);

      setChildren(this.$el, line);
    }
  }
}
</script>