<template>
  <div :style="{ zIndex: z, overflow: 'visible' }" class="cvc-card-wrapper" tabindex="0" @focusin="onFocus"
    @keyup.esc="close" ref="card">
    <card-actions
      :user="user"
      :raw-user="raw_user"
      :loaded="loaded"
      :get-f-f-z="getFFZ"
      :room="messageRoom"
      :is-mod="isMod"
      :is-own="isOwn"
      :is-target-broadcaster="isTargetBroadcaster"
      :pinned="pinned"
      :is-broadcaster="isBroadcaster"
      :can-manage-mods="canManageMods"
      :menu-items="menuItems"
      :show-native-button="showNativeButton"
      :show-popout-button="showPopoutButton"
      @close="close"
      @close-all="$emit('close-all')"
      @edit-note="noteEditRequest++"
      @pin="pin"
      @emit="ffzEmit" />

    <card-banner
      :user="user"
      :raw-user="raw_user"
      :loaded="loaded"
      :show-banner="showBanner !== false"
      :seventv-data="showPaints === false ? null : seventvData"
      :show-avatar-tooltip="showAvatarTooltip !== false"
      :get-f-f-z="getFFZ" />

    <div v-if="loaded && user && (user.suspended || user.notFound)" class="cvc-account-status-banner ffz-tooltip"
      :data-title="suspendedInfo.detail">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path v-if="user.notFound" fill-rule="evenodd" clip-rule="evenodd" d="M13.226 2.72a1.404 1.404 0 0 0-2.452 0L2.192 17.84c-.545.96.136 2.16 1.226 2.16h17.164c1.09 0 1.771-1.2 1.226-2.16L13.226 2.72ZM13 7h-2v7h2V7Zm0 9h-2v2h2v-2Z" />
        <path v-else fill-rule="evenodd" d="M12 23c6.075 0 11-4.925 11-11S18.075 1 12 1 1 5.925 1 12s4.925 11 11 11Zm5-12H7v2h10v-2Z" clip-rule="evenodd" />
      </svg>
      <span>{{ suspendedInfo.label }}</span>
      <a v-if="!user.notFound" href="https://help.twitch.tv/s/article/how-to-manage-harassment-in-chat#UnabletoView"
        target="_blank" rel="noopener noreferrer">Learn More</a>
    </div>

    <card-badges v-if="loaded && showBadges !== false && !(user && user.notFound)" :badges="badges" />

    <card-notes v-if="loaded && user && !user.notFound" :user="user" :get-f-f-z="getFFZ" :edit-request="noteEditRequest" />

    <card-content v-if="loaded && user && !user.notFound"
      :user="user"
      :get-f-f-z="getFFZ"
      :room="messageRoom"
      :timeout-buttons="timeoutButtons"
      :is-mod="isMod"
      :is-own="isOwn"
      :is-broadcaster="isBroadcaster"
      :is-target-broadcaster="isTargetBroadcaster"
      :is-lead-mod="isLeadMod"
      :is-target-lead-mod="isTargetLeadMod"
      :can-access-mod-logs="canAccessModLogs"
      :mod-tabs="modTabs"
      :message-paint="messagePaint" />
  </div>
</template>

<script>
import displace from "displacejs";
import CardActions from "./actions.vue";
import CardBanner from "./banner.vue";
import CardBadges from "./badges.vue";
import CardNotes from "./notes.vue";
import CardContent from "./content.vue";
import { paintStyle, styleToCss } from "./card-utils";

const SUSPENDED_REASONS = {
  DEACTIVATED: { label: "Account deactivated", detail: "This channel has been closed by the user." },
  TOS_TEMPORARY: { label: "Account temporarily suspended", detail: "This channel is temporarily unavailable due to a violation of Twitch's Community Guidelines or Terms of Service." },
  TOS_INDEFINITE: { label: "Account suspended", detail: "This channel is currently unavailable due to a violation of Twitch's Community Guidelines or Terms of Service." },
  DMCA: { label: "Account suspended (DMCA)", detail: "Content from this channel has been removed at the request of the copyright holder." },
  UNKNOWN: { label: "Account suspended or deactivated", detail: "This account is currently unavailable." }
};

export default {
  components: {
    "card-actions": CardActions,
    "card-banner": CardBanner,
    "card-badges": CardBadges,
    "card-notes": CardNotes,
    "card-content": CardContent
  },

  props: ["raw_user", "data", "getZ", "getFFZ", "showBanner", "showBadges", "showAvatarTooltip", "showNativeButton", "showPopoutButton", "timeoutButtons", "modTabs", "menuItems", "seventvData", "showPaints"],

  data() {
    return {
      noteEditRequest: 0,
      z: this.getZ(),
      loaded: false,
      user: null,
      _mounted: false,
      _destroyed: false,
      pinned: false
    }
  },

  computed: {
    messagePaint() {
      if (this.showPaints === false) return null;
      var paint = this.seventvData && this.seventvData.paint;
      return paint ? styleToCss(paintStyle(paint)) : null;
    },

    badges() {
      if (!this.loaded || !this.user) return [];
      if (this.user.channelViewer && Array.isArray(this.user.channelViewer.earnedBadges))
        return this.user.channelViewer.earnedBadges;
      if (Array.isArray(this.user.displayBadges))
        return this.user.displayBadges;
      return [];
    },

    isMod() {
      if (this.isBroadcaster) return true;
      return !!(this.user && this.user.channelUser && this.user.channelUser.self &&
        this.user.channelUser.self.isModerator === true);
    },

    canAccessModLogs() {
      if (this.isBroadcaster) return true;
      return !!(this.user && this.user.channel && this.user.channel.moderationSettings &&
        this.user.channel.moderationSettings.canAccessViewerCardModLogs === true);
    },

    suspendedInfo() {
      if (this.user && this.user.notFound)
        return { label: "Unable to fetch account", detail: "This account doesn't exist." };
      var reason = this.user && this.user.suspended && this.user.suspended.reason;
      return SUSPENDED_REASONS[reason] || SUSPENDED_REASONS.UNKNOWN;
    },

    isLeadMod() {
      var c = this.user && this.user.channel;
      return !this.isBroadcaster && !!(c && (c.canAddMods || c.canRemoveMods));
    },

    canManageMods() {
      var c = this.user && this.user.channel;
      return this.isBroadcaster || !!(c && (c.canAddMods || c.canRemoveMods));
    },

    isTargetLeadMod() {
      return this.badges.some(function(b) { return b && b.setID === "lead_moderator"; });
    },

    isOwn() {
      return this.user && this.user.currentUser && this.user.currentUser.id === this.user.id;
    },

    isBroadcaster() {
      var me = this.user && this.user.currentUser;
      var room = this.messageRoom;
      return !!(me && me.id && room && room.id && String(me.id) === String(room.id));
    },

    isTargetBroadcaster() {
      var room = this.messageRoom;
      return !!(this.user && this.user.id && room && room.id && String(this.user.id) === String(room.id));
    },

    messageRoom() {
      var c = this.user && (this.user.channel || this.user.channelUser);
      return c ? { id: c.id, login: c.login } : null;
    },
  },

  async beforeMount() {
    this.ffzEmit(":open", this);
    try {
      var data = await this.data;
      if (!this._destroyed) {
        this.loaded = true;
        this.user = data;
        this.ffzEmit(":load", this);
        var self = this;
        this.$nextTick(function() { self.resize(); });
      }
    } catch (err) {
      console.error("Card error:", err);
    }
  },

  mounted() {
    this._mounted = true;
    var self = this;

    this._resizeHandler = function() {
      if (self._mounted && !self._destroyed) self.resize();
    };

    window.addEventListener("resize", this._resizeHandler);
    this.drag();

    if (window.ResizeObserver) {
      this._sizeObserver = new ResizeObserver(function() {
        if (self._mounted && !self._destroyed) self.constrain();
      });
      this._sizeObserver.observe(this.$el);
    }
  },

  beforeDestroy() {
    this._destroyed = true;
    this._mounted = false;

    if (this._resizeHandler) {
      window.removeEventListener("resize", this._resizeHandler);
      this._resizeHandler = null;
    }

    if (this._sizeObserver) {
      this._sizeObserver.disconnect();
      this._sizeObserver = null;
    }

    this.undrag();
    this.ffzEmit(":close", this);
  },

  methods: {
    close() {
      this.$emit("close");
    },

    pin() {
      this.pinned = true;
      this.$emit("pin");
      this.ffzEmit(":pin", this);
    },

    drag() {
      if (this._destroyed || !this._mounted) return;
      var self = this;
      this.$nextTick(function() {
        if (self._destroyed || !self._mounted) return;

        self.displace = displace(self.$el, {
          handle: self.$el,
          highlightInputs: true,
          constrain: true,
          onMouseDown: function() { self.onFocus(); },
          onTouchStart: function() { self.onFocus(); },
          ignoreFn: function(e) {
            var t = e.target;
            if (!t || !t.closest || !t.closest(".cvc-user-banner, .cvc-user-badges")) return true;
            return t.closest(".cvc-action-btn, .cvc-card-actions, .cvc-badge-item, .cvc-badges-toggle, .cvc-username, a, button") != null;
          }
        });
      });
    },

    undrag() {
      if (this.displace) {
        this.displace.destroy();
        this.displace = null;
      }
    },

    resize() {
      if (this._destroyed || !this._mounted) return;
      if (this.displace) this.displace.reinit();
    },

    constrain() {
      if (this._destroyed || !this._mounted) return;
      var el = this.$el;
      if (!el) return;
      var parent = el.parentElement || document.body;
      var box = el.getBoundingClientRect();
      var pbox = parent.getBoundingClientRect();
      var moved = false;

      if (box.top < pbox.top) { el.style.top = (el.offsetTop + (pbox.top - box.top)) + "px"; moved = true; }
      else if (box.bottom > pbox.bottom) { el.style.top = (el.offsetTop - (box.bottom - pbox.bottom)) + "px"; moved = true; }
      if (box.left < pbox.left) { el.style.left = (el.offsetLeft + (pbox.left - box.left)) + "px"; moved = true; }
      else if (box.right > pbox.right) { el.style.left = (el.offsetLeft - (box.right - pbox.right)) + "px"; moved = true; }

      if (moved && this.displace) this.displace.reinit();
    },

    onFocus() {
      if (this._destroyed || !this._mounted) return;
      this.z = this.getZ();
    },

    focus() {
      if (this._destroyed || !this._mounted) return;
      if (this.$refs.card) this.$refs.card.focus();
    },

    ffzEmit(event) {
      var args = [].slice.call(arguments, 1);
      this.$emit.apply(this, ["emit", event].concat(args));
    },

  }
}
</script>