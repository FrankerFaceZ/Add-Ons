<template>
<div class="user-banner" :style="bannerStyle">
  <div class="avatar" :style="avatarBorder">
    <div v-if="loaded && user && !user.profileImageURL" class="avatar-default">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M6 8a6 6 0 1 1 7.025 5.913l.012.036A3 3 0 0 0 15.883 16H17a4 4 0 0 1 4 4v2h-2v-2a2 2 0 0 0-2-2h-1.117A5 5 0 0 1 12 16.15 5 5 0 0 1 8.117 18H7a2 2 0 0 0-2 2v2H3v-2a4 4 0 0 1 4-4h1.117a3 3 0 0 0 2.846-2.051l.012-.036A6.002 6.002 0 0 1 6 8Zm6 4a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" />
      </svg>
    </div>
    <img v-else-if="loaded && user"
      class="ffz-tooltip"
      data-tooltip-type="html"
      :data-title="'<img src=\'' + user.profileImageURL + '\'>'"
      :src="user.profileImageURL"
      :alt="user.displayName">
    <span v-if="loaded && isLive" class="live-badge ffz-tooltip" data-tooltip-type="html"
      :data-title="'Streaming <strong>' + streamCategory + '</strong> to <strong>' + viewerCount + '</strong> viewers'">
      LIVE
    </span>
  </div>
  <div class="user-info">
    <div class="username"
      :class="{ 'seventv-painted-content': !!seventvPaint, 'ffz-tooltip': !!seventvPaint }"
      :style="usernameStyle"
      :data-tooltip-type="seventvPaint ? 'html' : undefined"
      :data-title="seventvPaint ? '<strong>' + seventvPaint.name + '</strong>' : undefined"
      :title="user ? user.login : rawUser.login">
      {{ displayName }}
      <svg v-if="isPartner" height="14" width="14" viewBox="0 0 24 24" fill="#a970ff" style="margin-left: 3px;">
        <title>Verified Partner</title>
        <path fill-rule="evenodd"
          d="M19.071 19.071 22 12l-2.929-7.071L12 2 4.929 4.929 2 12l2.929 7.071L12 22l7.071-2.929ZM11 16l6-6-1.5-1.5L11 13l-2.5-2.5L7 12l4 4Z"
          clip-rule="evenodd" />
      </svg>
      <svg v-if="isStaff" width="14" height="14" viewBox="0 0 20 20" fill="#a970ff" style="margin-left: 3px;">
        <title>Twitch Staff</title>
        <path d="m2 18 9-9-.586-.586a2 2 0 0 1 0-2.828L14 2h3l1 1-4 4 3 3 4-4 1 1v3l-3.586 3.586a2 2 0 0 1-2.828 0L15 13l-9 9H5a3 3 0 0 1-3-3v-1Zm3 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
      </svg>
    </div>

    <div v-if="loaded && user && user.sourceChannel" class="user-detail">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path fill-rule="evenodd"
          d="M7 2h10v2H7V2ZM3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Zm16 0H5v12h14V8Zm-9 3h-4v2h4v-2Zm8 0h-6v2h6v-2Zm-8 4H6v2h4v-2Zm8 0h-6v2h6v-2Z"
          clip-rule="evenodd" />
      </svg>
      Chatting from {{ user.sourceChannel.displayName || user.sourceChannel.login }}
    </div>

    <div v-if="loaded && user && user.createdAt" class="user-detail">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path fill-rule="evenodd"
          d="M11 2h2v4h7a2 2 0 0 1 2 2v14H2V8a2 2 0 0 1 2-2h7V2Zm9 6H4v4.773l1.507-1.34a3 3 0 0 1 3.986 0l1.843 1.639a1 1 0 0 0 1.328 0l1.843-1.638a3 3 0 0 1 3.986 0L20 12.774V8Zm0 7.449-2.836-2.52a1 1 0 0 0-1.328 0l-1.843 1.637a3 3 0 0 1-3.986 0l-1.843-1.638a1 1 0 0 0-1.328 0L4 15.45V20h16v-4.551Z"
          clip-rule="evenodd" />
      </svg>
      Account created {{ formatSince(user.createdAt) }}
    </div>

    <div v-if="loaded && hasFollow" class="user-detail">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path fill-rule="evenodd"
          d="M10.964 5.422A5.075 5.075 0 0 0 7.429 4H7C4.239 4 2 6.175 2 8.857v.417a4.79 4.79 0 0 0 1.464 3.434L12 21l8.535-8.292A4.788 4.788 0 0 0 22 9.274v-.417C22 6.175 19.761 4 17 4h-.429a5.076 5.076 0 0 0-3.536 1.423L12 6.429l-1.036-1.007Z"
          clip-rule="evenodd" />
      </svg>
      Following since {{ formatSince(user.relationship.followedAt) }}
    </div>

    <div v-if="loaded && subText" class="user-detail" :class="{ 'ffz-tooltip': subTooltip }"
      data-tooltip-type="html" :data-title="subTooltip || undefined">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path v-if="subIcon === 'hollow-star'" fill-rule="evenodd"
          d="M14.026 9.626 12 5.114 9.974 9.626l-4.909.514 3.666 3.28-1.029 4.815L12 15.775l4.298 2.46-1.03-4.816 3.667-3.279-4.91-.514ZM8.62 7.756l-5.525.58c-1.052.11-1.476 1.405-.69 2.109l4.127 3.691-1.153 5.395c-.22 1.028.89 1.828 1.808 1.303L12 18.08l4.812 2.755c.917.525 2.028-.275 1.808-1.303l-1.153-5.395 4.127-3.691c.787-.704.362-2-.69-2.11l-5.525-.578-2.262-5.037c-.43-.96-1.803-.96-2.234 0L8.62 7.757Z"
          clip-rule="evenodd" />
        <path v-else-if="subIcon === 'gift'" fill-rule="evenodd"
          d="M5 5.192V7H2v8h1v7h18v-7h1V7h-3V5.192a3.192 3.192 0 0 0-5.93-1.642L12 5.333 10.93 3.55A3.193 3.193 0 0 0 5 5.192ZM17 7V5.192a1.192 1.192 0 0 0-2.215-.613L13.332 7H17Zm-6.332 0L9.215 4.579A1.192 1.192 0 0 0 7 5.192V7h3.668ZM11 9v4H4V9h7Zm2 0v4h7V9h-7Zm-8 6h6v5H5v-5Zm8 0v5h6v-5h-6Z"
          clip-rule="evenodd" />
        <path v-else-if="subIcon === 'prime'" d="M2 17V6l5 4 5-5 5 5 5-4v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" />
        <path v-else
          d="M10.883 2.72c.43-.96 1.803-.96 2.234 0l2.262 5.037 5.525.578c1.052.11 1.477 1.406.69 2.11l-4.127 3.691 1.153 5.395c.22 1.028-.89 1.828-1.808 1.303L12 18.08l-4.812 2.755c-.917.525-2.028-.275-1.808-1.303l1.153-5.395-4.127-3.691c-.786-.704-.362-2 .69-2.11l5.525-.578 2.262-5.037Z" />
      </svg>
      {{ subText }}
    </div>
  </div>
</div>
</template>

<script>
import { formatDate, formatSince } from "./card-utils";

export default {
  props: ["user", "rawUser", "loaded", "showBanner", "seventvData", "getFFZ"],

  computed: {
    bannerStyle() {
      if (this.showBanner === false) return { backgroundImage: "none" };
      if (!this.loaded || !this.user || !this.user.bannerImageURL) return {};
      return { backgroundImage: "url(\"" + this.user.bannerImageURL + "\")" };
    },

    avatarBorder() {
      if (!this.loaded || !this.user) return {};
      return { outlineColor: "#" + (this.user.primaryColorHex || "a970ff") };
    },

    usernameStyle() {
      var paint = this.seventvPaint;

      if (paint) {
        var gradients = paint.gradients;
        if (!gradients || !gradients.length) {
          if (paint.function) {
            gradients = [{
              function: paint.function,
              canvas_repeat: '',
              size: [1, 1],
              shape: paint.shape,
              image_url: paint.image_url,
              stops: paint.stops || [],
              repeat: paint.repeat || false,
              angle: paint.angle,
              at: null
            }];
          } else {
            gradients = [];
          }
        }

        var self = this;
        var gradientData = gradients.map(function(g) { return self.stv_createGradient(g); });
        var filter = paint.shadows && paint.shadows.length
          ? paint.shadows.map(function(s) { return self.stv_dropShadow(s); }).join(' ')
          : '';

        var style = {
          color: paint.color ? this.stv_colorFromInt(paint.color) : 'inherit',
          backgroundImage: gradientData.map(function(v) { return v[0]; }).join(', ') || 'none',
          filter: filter || 'inherit',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          fontWeight: '700'
        };

        var pos = gradientData.map(function(v) { return v[1]; }).filter(Boolean).join(', ');
        var size = gradientData.map(function(v) { return v[2]; }).filter(Boolean).join(', ');
        var repeat = gradientData.map(function(v) { return v[3]; }).join(', ');
        if (pos) style.backgroundPosition = pos;
        if (size) style.backgroundSize = size;
        if (repeat) style.backgroundRepeat = repeat;

        if (paint.text) {
          if (paint.text.weight)
            style.fontWeight = String(paint.text.weight * 100);
          if (paint.text.stroke) {
            style.WebkitTextStrokeWidth = paint.text.stroke.width + "px";
            style.WebkitTextStrokeColor = this.stv_colorFromInt(paint.text.stroke.color);
          }
          if (paint.text.shadows && paint.text.shadows.length) {
            style.textShadow = paint.text.shadows
              .map(function(s) { return s.x_offset + "px " + s.y_offset + "px " + s.radius + "px " + self.stv_colorFromInt(s.color); })
              .join(', ');
          }
          if (paint.text.transform)
            style.textTransform = paint.text.transform;
        }

        return style;
      }

      if (!this.loaded || !this.user || !this.user.chatColor) return {};
      return { color: this.user.chatColor };
    },

    seventvPaint() {
      return this.seventvData && this.seventvData.paint ? this.seventvData.paint : null;
    },

    displayName() {
      var u = this.user || this.rawUser;
      if (!u) return "";
      var display = u.displayName || u.login;
      var login = u.login;
      if (display.toLowerCase() === login.toLowerCase()) return display;
      return display + " (" + login + ")";
    },

    isPartner() {
      return this.loaded && this.user && this.user.roles && this.user.roles.isPartner;
    },

    isStaff() {
      return this.loaded && this.user && this.user.roles && this.user.roles.isStaff;
    },

    isLive() {
      return this.loaded && this.user && this.user.stream && this.user.stream.id;
    },

    streamCategory() {
      if (!this.isLive || !this.user.broadcastSettings) return "";
      return (this.user.broadcastSettings.game && this.user.broadcastSettings.game.displayName) || "";
    },

    viewerCount() {
      if (!this.isLive || !this.user.stream) return 0;
      return this.user.stream.viewersCount || 0;
    },

    hasFollow() {
      return this.user && this.user.relationship && this.user.relationship.followedAt;
    },

    subText() {
      if (!this.user || !this.user.relationship) return "";
      var b = this.user.relationship.subscriptionBenefit;
      var t = this.user.relationship.cumulativeTenure;

      if (b) {
        var tier = "Tier 1";
        if (b.purchasedWithPrime) tier = "Prime";
        else if (b.tier === "2000") tier = "Tier 2";
        else if (b.tier === "3000") tier = "Tier 3";

        if (t && t.months > 0) {
          return tier + " - Subbed for " + t.months + " " + (t.months === 1 ? "month" : "months");
        } else if (!t) {
          return tier + " - Subscription Status Hidden";
        }
        return tier;
      }

      if (t && t.months > 0) {
        return "Previously subbed for " + t.months + " " + (t.months === 1 ? "month" : "months");
      }

      return "";
    },

    subIcon() {
      if (!this.user || !this.user.relationship) return "star";
      var b = this.user.relationship.subscriptionBenefit;
      var t = this.user.relationship.cumulativeTenure;

      if (b) {
        if (b.gift && b.gift.isGift) return "gift";
        if (b.purchasedWithPrime) return "prime";
        return "star";
      }

      if (t && t.months > 0) return "hollow-star";
      return "star";
    },

    subTooltip() {
      if (!this.user || !this.user.relationship) return "";
      var benefit = this.user.relationship.subscriptionBenefit;
      if (!benefit || !benefit.gift || !benefit.gift.isGift) return "";

      var gifter = benefit.gift.gifter
        ? (benefit.gift.gifter.displayName.toLowerCase() === benefit.gift.gifter.login
          ? benefit.gift.gifter.displayName
          : benefit.gift.gifter.displayName + " (" + benefit.gift.gifter.login + ")")
        : "Anonymous";

      var tooltipText = "Gifted by <strong>" + gifter + "</strong>";

      if (benefit.gift.giftDate) {
        var giftDate = new Date(benefit.gift.giftDate);
        tooltipText += " on <strong>" + giftDate.toLocaleDateString("en-GB", {
          year: "numeric", month: "long", day: "numeric"
        }) + "</strong>";
      }

      return tooltipText;
    },

  },

  methods: {
    formatDate: formatDate,

    formatSince(date) {
      return this.getFFZ ? formatSince(this.getFFZ(), date) : formatDate(date);
    },

    stv_colorFromInt(int) {
      var r = int >>> 24 & 0xFF;
      var g = int >>> 16 & 0xFF;
      var b = int >>> 8 & 0xFF;
      var a = int & 0xFF;
      return "rgba(" + r + ", " + g + ", " + b + ", " + (a / 255) + ")";
    },

    stv_createGradient(gradient) {
      var args = [];
      switch (gradient.function) {
        case 'LINEAR_GRADIENT': args.push((gradient.angle || 0) + "deg"); break;
        case 'RADIAL_GRADIENT': args.push(gradient.shape || 'circle'); break;
        case 'URL':             args.push(gradient.image_url || ''); break;
      }

      var funcPrefix = '';
      if (gradient.function !== 'URL') {
        funcPrefix = gradient.repeat ? 'repeating-' : '';
        for (var i = 0; i < gradient.stops.length; i++) {
          var stop = gradient.stops[i];
          args.push(this.stv_colorFromInt(stop.color) + " " + (stop.at * 100) + "%");
        }
      }

      var image = funcPrefix + gradient.function.toLowerCase().replace('_', '-') + "(" + args.join(', ') + ")";
      var pos   = gradient.at && gradient.at.length === 2   ? (gradient.at[0] * 100) + "% " + (gradient.at[1] * 100) + "%" : '';
      var size  = gradient.size && gradient.size.length === 2 ? (gradient.size[0] * 100) + "% " + (gradient.size[1] * 100) + "%" : '';
      var rep   = gradient.canvas_repeat || 'unset';

      return [image, pos, size, rep];
    },

    stv_dropShadow(shadow) {
      return "drop-shadow(" + shadow.x_offset + "px " + shadow.y_offset + "px " + shadow.radius + "px " + this.stv_colorFromInt(shadow.color) + ")";
    },
  }
}
</script>