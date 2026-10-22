<template>
  <div class="cvc-card-actions-root">
    <div class="cvc-card-actions">
      <div class="cvc-card-actions-row">
        <button v-if="showFlagButton" @click="toggleFlag" class="cvc-action-btn cvc-flag-btn tw-relative ffz-tooltip"
          data-title="Manage Suspicious User" :disabled="lowTrustBusy">
          <svg v-if="lowTrustTreatment === 'ACTIVE_MONITORING'" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 14v2h2v-2h-2Z" />
            <path fill-rule="evenodd"
              d="M21 5a14.999 14.999 0 0 1-9-3 15 15 0 0 1-9 3l.437 4.802a14 14 0 0 0 5.542 9.932L12 22l3.021-2.266a14 14 0 0 0 5.543-9.932L21 5Zm-8 0v7h-2V5a17.001 17.001 0 0 1-5.823 1.86l.251 2.76a12 12 0 0 0 4.751 8.514L12 19.5l1.821-1.366a12 12 0 0 0 4.75-8.513l.252-2.761A17 17 0 0 1 13 5Z"
              clip-rule="evenodd" />
          </svg>
          <svg v-else-if="lowTrustTreatment === 'RESTRICTED'" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd"
                  d="M7 10V7a5 5 0 0 1 10 0v3h3v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10h3Zm8-3v3H9V7a3 3 0 1 1 6 0Z"
                  clip-rule="evenodd" />
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" d="M2 2h19.723l-4.571 8 4.571 8H4v4H2V2Zm2 14h14.277l-3.429-6 3.429-6H4v12Z"
              clip-rule="evenodd" />
          </svg>
          <div v-if="showFlag" class="cvc-flag-popup show" @click.stop>
            <div v-if="lowTrustTreatment !== 'ACTIVE_MONITORING'" class="cvc-popup-item warning"
              @click.stop="setLowTrustTreatment('ACTIVE_MONITORING')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                <path fill-rule="evenodd"
                  d="M18.395 7.794 22 12l-3.605 4.206A8 8 0 0 1 12.32 19h-.64a8 8 0 0 1-6.075-2.794L2 12l3.605-4.206A8 8 0 0 1 11.68 5h.64a8 8 0 0 1 6.075 2.794Zm-1.519 1.301L19.366 12l-2.49 2.905A6 6 0 0 1 12.32 17h-.64a6 6 0 0 1-4.556-2.095L4.634 12l2.49-2.905A6 6 0 0 1 11.68 7h.64a6 6 0 0 1 4.556 2.095Z"
                  clip-rule="evenodd" />
              </svg>
              Monitor User
            </div>
            <div v-if="lowTrustTreatment !== 'RESTRICTED'" class="cvc-popup-item danger"
              @click.stop="setLowTrustTreatment('RESTRICTED')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd"
                  d="M7 10V7a5 5 0 0 1 10 0v3h3v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10h3Zm8-3v3H9V7a3 3 0 1 1 6 0Z"
                  clip-rule="evenodd" />
              </svg>
              Restrict User
            </div>
            <div v-if="lowTrustTreatment === 'ACTIVE_MONITORING' || lowTrustTreatment === 'RESTRICTED'" class="cvc-popup-item"
              @click.stop="setLowTrustTreatment('NONE')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd"
                  d="M3 7a5 5 0 1 1 6 4.9v.1a1 1 0 0 0 1 1h1a3 3 0 0 1 3 3v6h-2v-6a1 1 0 0 0-1-1h-1a2.99 2.99 0 0 1-2-.764A2.99 2.99 0 0 1 6 15H5a1 1 0 0 0-1 1v6H2v-6a3 3 0 0 1 3-3h1a1 1 0 0 0 1-1v-.1A5.002 5.002 0 0 1 3 7Zm5 3a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"
                  clip-rule="evenodd" />
                <path d="M20.293 9.293 17 12.586l-1.793-1.793-1.414 1.414L17 15.414l4.707-4.707-1.414-1.414Z" />
              </svg>
              {{ lowTrustTreatment === 'RESTRICTED' ? 'Stop Restricting' : 'Stop Monitoring' }}
            </div>
          </div>
        </button>

        <button v-if="showNativeButton !== false && !(user && user.notFound)" @click="openNativeCard" class="cvc-action-btn tw-relative ffz-tooltip" data-title="Open native card">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 6h2v5h-2V6Zm4 0h2v5h-2V6Z" />
            <path fill-rule="evenodd" clip-rule="evenodd" d="M6 1h16v12l-7 7h-4l-4 4v-4H2V5l4-4Zm14 2H7v12h3v4l4-4h3l3-3V3Z" />
          </svg>
        </button>
        <button v-if="showPopoutButton !== false" @click="openNative" class="cvc-action-btn tw-relative ffz-tooltip" data-title="Popout">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2v2h4.586l-8.293 8.293 1.414 1.414L20 5.414V10h2V2h-8Z" />
            <path d="M4 4h8v2H4v14h14v-8h2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          </svg>
        </button>
        <button @click="$emit('close')" @contextmenu.prevent="toggleCloseMenu"
          class="cvc-action-btn cvc-close-btn tw-relative ffz-tooltip" data-title="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M6.414 5 5 6.414l5.588 5.588L5 17.59l1.414 1.414 5.588-5.588 5.588 5.588 1.414-1.414-5.588-5.588 5.588-5.588L17.59 5l-5.588 5.588L6.414 5Z" />
          </svg>
          <div v-if="showCloseMenu" class="cvc-more-options-popup show" @click.stop>
            <div class="cvc-popup-item" @click.stop="closeAll">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.414 5 5 6.414l5.588 5.588L5 17.59l1.414 1.414 5.588-5.588 5.588 5.588 1.414-1.414-5.588-5.588 5.588-5.588L17.59 5l-5.588 5.588L6.414 5Z" />
              </svg>
              Close all
            </div>
          </div>
        </button>
      </div>
      <button v-if="!(user && user.notFound)" ref="moreButton" @click="toggleMore" class="cvc-action-btn tw-relative ffz-tooltip" data-title="More options">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M10 5a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm0 7a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm2 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
        </svg>
        <div v-if="showMore" class="cvc-more-options-popup show" @click.stop>

          <div v-if="menuShown('pin') && !pinned" :style="menuStyle('pin')" class="cvc-popup-item" @click.stop="onPin">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd"
                d="M18 4V2H6v2h2v5a3 3 0 0 0-3 3v4h14v-4a3 3 0 0 0-3-3V4h2Zm-1 10H7v-2a1 1 0 0 1 1-1h2V4h4v7h2a1 1 0 0 1 1 1v2Z"
                clip-rule="evenodd" />
              <path d="M13 18h-2v4h2v-4Z" />
            </svg>
            Pin
          </div>

          <div v-if="menuShown('edit')" :style="menuStyle('edit')" class="cvc-popup-item" @click.stop="action('edit')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd"
                d="M13.207 7.621 4 16.828V20h3.172l9.207-9.207-3.172-3.172Zm4.586 1.758L14.62 6.207l1.88-1.879L19.672 7.5l-1.88 1.879ZM8 21.999H2v-6L15.086 2.915a2 2 0 0 1 2.828 0l3.172 3.172a2 2 0 0 1 0 2.828L8 22Z"
                clip-rule="evenodd" />
            </svg>
            Edit
          </div>

          <div v-if="menuShown('notes')" :style="menuStyle('notes')" class="cvc-popup-item" @click.stop="action('notes')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M8 7h8v2H8V7Zm0 5h8v2H8v-2Z" />
              <path fill-rule="evenodd" clip-rule="evenodd" d="m17 22 4-4V2H3v20h14ZM5 4h14v13h-3v3H5V4Z" />
            </svg>
            Notes
          </div>

          <div v-if="menuShown('follow') && canShowFollow" :style="menuStyle('follow')" class="cvc-popup-item" @click.stop="handleFollowClick">
            <svg v-if="isFollowing" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.033 5.49 8.63 13h3.983l-2.165 6.493-6.984-6.785A4.788 4.788 0 0 1 2 9.274v-.417C2 6.175 4.239 4 7 4h.429c1.326 0 2.597.512 3.535 1.422l.07.068Z" />
              <path d="M13.205 5.266 11.37 11h4.017l-3.307 9.922 8.455-8.214A4.788 4.788 0 0 0 22 9.274v-.417C22 6.175 19.761 4 17 4h-.429a5.083 5.083 0 0 0-3.366 1.266Z" />
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="m12 6.429 1.036-1.006A5.076 5.076 0 0 1 16.57 4H17c2.761 0 5 2.175 5 4.857v.417a4.788 4.788 0 0 1-1.465 3.434L12 21l-8.536-8.292A4.788 4.788 0 0 1 2 9.274v-.417C2 6.175 4.239 4 7 4h.429c1.326 0 2.597.512 3.535 1.422L12 6.429Zm-2.43.428A3.076 3.076 0 0 0 7.43 6H7C5.288 6 4 7.333 4 8.857v.417c0 .739.302 1.46.858 2L12 18.212l7.142-6.938c.556-.54.858-1.261.858-2v-.417C20 7.333 18.712 6 17 6h-.429c-.814 0-1.583.315-2.142.857L12 9.217l-2.43-2.36Z"
                fill-rule="evenodd" />
            </svg>
            {{ isFollowing ? "Unfollow" : "Follow" }}
          </div>

          <div v-if="menuShown('mention')" :style="menuStyle('mention')" class="cvc-popup-item" @click.stop="action('mention')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 10h2v2H9v-2Zm6 0h-2v2h2v-2Z" />
              <path fill-rule="evenodd"
                d="m12 22-3-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4l-3 3Zm-2.172-5L12 19.172 14.172 17H19V5H5v12h4.828Z"
                clip-rule="evenodd" />
            </svg>
            Mention
          </div>

          <div v-if="menuShown('mod') && canModUser" :style="menuStyle('mod')" class="cvc-popup-item" @click.stop="toggleMod">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M3 7a5 5 0 1 1 6 4.9v.1a1 1 0 0 0 1 1h1a3 3 0 0 1 3 3v6h-2v-6a1 1 0 0 0-1-1h-1a2.99 2.99 0 0 1-2-.764A2.99 2.99 0 0 1 6 15H5a1 1 0 0 0-1 1v6H2v-6a3 3 0 0 1 3-3h1a1 1 0 0 0 1-1v-.1A5.002 5.002 0 0 1 3 7Zm5 3a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" clip-rule="evenodd" />
              <path v-if="user.isModerator" fill-rule="evenodd" clip-rule="evenodd" d="M16.5 8.5 15 10l2 2-2 2 1.5 1.5 2-2 2 2L22 14l-2-2 2-2-1.5-1.5-2 2-2-2Z" />
              <path v-else fill-rule="evenodd" clip-rule="evenodd" d="m18 8 4 4-4 4-1.5-1.5L18 13h-4v-2h4l-1.5-1.5L18 8Z" />
            </svg>
            {{ user.isModerator ? "Unmod" : "Mod" }}
          </div>

          <div v-if="menuShown('edit-profile') && isOwn" :style="menuStyle('edit-profile')" class="cvc-popup-item" @click.stop="editProfile">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M3 7a5 5 0 1 1 6 4.9v.1a1 1 0 0 0 1 1h1a3 3 0 0 1 3 3v6h-2v-6a1 1 0 0 0-1-1h-1a2.99 2.99 0 0 1-2-.764A2.99 2.99 0 0 1 6 15H5a1 1 0 0 0-1 1v6H2v-6a3 3 0 0 1 3-3h1a1 1 0 0 0 1-1v-.1A5.002 5.002 0 0 1 3 7Zm5 3a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" clip-rule="evenodd" />
            </svg>
            Edit Profile
          </div>

          <div v-if="menuShown('edit-chat-identity') && isOwn" :style="menuStyle('edit-chat-identity')" class="cvc-popup-item" @click.stop="editChatIdentity">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd"
                d="m12 22-3-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4l-3 3Zm-2.172-5L12 19.172 14.172 17H19V5H5v12h4.828Z"
                clip-rule="evenodd" />
              <path d="M12 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-3 7.5c0-1.105 1.343-2 3-2s3 .895 3 2V15H9v-.5Z" />
            </svg>
            Edit Chat Identity
          </div>

          <div v-if="menuShown('highlight')" :style="menuStyle('highlight')" class="cvc-popup-item" @click.stop="action('highlight-user')">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd"
                d="M4 2V4H16V2H18V6.28078L17.0299 6.52331C15.2492 6.96848 14 8.56841 14 10.4039V15.7808L6 17.7808V10.4039C6 8.56841 4.75081 6.96848 2.97014 6.52331L2 6.28078V2H4ZM8 12V15.2192L12 14.2192V12H8ZM6.07534 6H13.9247C12.823 7.02027 12.118 8.44067 12.0135 10H7.98651C7.88205 8.44067 7.17701 7.02027 6.07534 6Z"
                clip-rule="evenodd" />
            </svg>
            {{ tempHighlighted ? "Remove highlight" : "Highlight" }}
          </div>
          <div v-if="menuShown('block') && !isOwn" :style="menuStyle('block')" class="cvc-popup-item danger2" @click.stop="action('block')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd"
                d="m2.293 3.707 18 18 1.414-1.414-3.683-3.683a7.98 7.98 0 0 0 .37-.404L22 12l-3.605-4.206A8 8 0 0 0 12.32 5h-.64a8 8 0 0 0-4.122 1.144l-3.85-3.851-1.415 1.414Zm6.738 3.91 2.45 2.45a2.003 2.003 0 0 1 2.451 2.451l2.678 2.678c.091-.094.18-.191.266-.291L19.366 12l-2.49-2.905A6 6 0 0 0 12.32 7h-.64a6 6 0 0 0-2.65.616Z"
                clip-rule="evenodd" />
              <path
                d="M12.32 19c.74 0 1.469-.102 2.167-.299l-1.718-1.718a5.967 5.967 0 0 1-.449.017h-.64a6 6 0 0 1-4.556-2.095L4.634 12l1.455-1.697L4.67 8.885 2 12l3.605 4.206A8 8 0 0 0 11.68 19h.64Z" />
            </svg>
            Block
          </div>
          <div v-if="menuShown('report') && !isOwn" :style="menuStyle('report')" class="cvc-popup-item danger2" @click.stop="action('report')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 14a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm2-7h-2v4h2V7Z" />
              <path fill-rule="evenodd"
                d="m12 22-3-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4l-3 3Zm-2.172-5L12 19.172 14.172 17H19V5H5v12h4.828Z"
                clip-rule="evenodd" />
            </svg>
            Report
          </div>
          <div v-if="menuShown('whisper') && !isOwn && !isSuspended" :style="menuStyle('whisper')" class="cvc-popup-item" @click.stop="action('whisper', $event)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd"
                d="M9.828 17 12 19.172 14.172 17H19V5H5v12h4.828ZM12 22l-3-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4l-3 3Z"
                clip-rule="evenodd" />
            </svg>
            Whisper
          </div>
        </div>
      </button>
    </div>

    <div v-if="showUnfollowWarning" class="cvc-unfollow-modal-overlay" @click="cancelUnfollow">
      <div class="cvc-unfollow-modal" role="dialog" aria-modal="true" aria-labelledby="cvc-unfollow-title"
        @click.stop @keydown.esc.stop="cancelUnfollow">
        <div class="cvc-unfollow-modal__head">
          <img v-if="user.profileImageURL" class="cvc-unfollow-modal__avatar" :src="user.profileImageURL" alt="">
          <h3 id="cvc-unfollow-title" class="cvc-unfollow-modal__title">Unfollow {{ formatUsername(user) }}?</h3>
        </div>

        <div v-if="followInfo" class="cvc-unfollow-modal__stat">
          <span class="cvc-unfollow-modal__stat-label">Following since</span>
          <span class="cvc-unfollow-modal__stat-value ffz-tooltip" :data-title="followInfo.exact">{{ followInfo.date }}</span>
        </div>

        <div class="cvc-unfollow-modal__actions">
          <button ref="unfollowCancel" @click="cancelUnfollow" class="cvc-unfollow-modal__btn cvc-unfollow-modal__btn--cancel">Cancel</button>
          <button @click="confirmUnfollow" class="cvc-unfollow-modal__btn cvc-unfollow-modal__btn--danger">Unfollow</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { isIntl } from "../../utilities/format";
import { openReportModal } from "./card-utils";

export default {
  props: ["user", "rawUser", "loaded", "getFFZ", "room", "isMod", "isOwn", "isTargetBroadcaster", "pinned", "showNativeButton", "showPopoutButton", "isBroadcaster", "canManageMods", "menuItems"],

  data() {
    return {
      showFlag: false,
      showMore: false,
      showCloseMenu: false,
      tempHighlighted: false,
      showUnfollowWarning: false,
      lowTrustTreatment: null,
      lowTrustBusy: false
    }
  },

  computed: {
    menuLayout() {
      var out = {};
      (Array.isArray(this.menuItems) ? this.menuItems : []).forEach(function(t, i) {
        if (t && t.id) out[t.id] = { order: i, enabled: t.enabled !== false };
      });
      return out;
    },

    canFlag() {
      return !!(this.loaded && this.user && !this.user.notFound && !this.isOwn && !this.isTargetBroadcaster && this.isMod);
    },

    isSuspended() {
      return !!(this.user && this.user.suspended);
    },

    showFlagButton() {
      if (!this.canFlag || this.isSuspended) return false;
      if (this.user.isModerator && (!this.lowTrustTreatment || this.lowTrustTreatment === 'NONE')) return false;
      return true;
    },

    canModUser() {
      return !!(this.loaded && this.user && (this.isBroadcaster || this.canManageMods) && !this.isOwn && !this.isTargetBroadcaster && !this.isSuspended);
    },

    isFollowing() {
      return this.loaded && this.user && this.user.self && this.user.self.follower !== null;
    },

    canShowFollow() {
      return this.loaded && this.user && this.user.self && this.user.self.canFollow && !this.isSuspended;
    },

    followInfo() {
      var follower = this.isFollowing && this.user.self && this.user.self.follower;
      if (!follower || !follower.followedAt) return null;

      var since = new Date(follower.followedAt);
      if (isNaN(since)) return null;

      var i18n = this.getFFZ().resolve("i18n");
      var date, exact;
      try {
        date = i18n.formatDate(since, "long");
        exact = i18n.formatDateTime(since, "long");
      } catch (err) {
        date = since.toLocaleDateString();
        exact = since.toLocaleString();
      }

      return { date: date, exact: exact };
    },
  },

  watch: {
    showUnfollowWarning(val) {
      if (val) this.$nextTick(() => this.$refs.unfollowCancel && this.$refs.unfollowCancel.focus());
    },

    canFlag: {
      immediate: true,
      handler(val) {
        if (val && this.lowTrustTreatment === null)
          this.loadLowTrust();
      }
    }
  },

  created() {
    this.syncTempHighlight();
    this.getFFZ().on("trubbel:temp-highlight-changed", this.syncTempHighlight, this);
  },

  mounted() {
    var self = this;

    this._clickHandler = function(e) {
      var target = e.target;

      var clickedInFlagPopup = target.closest(".cvc-flag-popup");
      var clickedOnFlagButton = target.closest(".cvc-flag-btn");
      if (self.showFlag && !clickedOnFlagButton && !clickedInFlagPopup)
        self.showFlag = false;

      var clickedInMorePopup = target.closest(".cvc-more-options-popup");
      var clickedOnMoreButton = target.closest(".cvc-action-btn[data-title=\"More options\"]");
      if (self.showMore && !clickedOnMoreButton && !clickedInMorePopup)
        self.showMore = false;

      var clickedInCloseMenu = target.closest(".cvc-close-btn .cvc-more-options-popup");
      if (self.showCloseMenu && !clickedInCloseMenu)
        self.showCloseMenu = false;

      var clickedInUnfollowModal = target.closest(".cvc-unfollow-modal");
      if (self.showUnfollowWarning && !clickedInUnfollowModal)
        self.showUnfollowWarning = false;
    };

    document.addEventListener("click", this._clickHandler);
  },

  beforeDestroy() {
    this.getFFZ().off("trubbel:temp-highlight-changed", this.syncTempHighlight, this);
    if (this._clickHandler) {
      document.removeEventListener("click", this._clickHandler);
      this._clickHandler = null;
    }
  },

  methods: {
    menuShown(id) {
      var t = this.menuLayout[id];
      return !t || t.enabled;
    },

    menuStyle(id) {
      var t = this.menuLayout[id];
      return t ? { order: t.order } : null;
    },

    formatUsername(user) {
      if (!user) return "";
      return isIntl(user.displayName, user.login);
    },

    toggleCloseMenu() {
      this.showFlag = false;
      this.showMore = false;
      this.showCloseMenu = !this.showCloseMenu;
    },

    closeAll() {
      this.showCloseMenu = false;
      this.$emit('close-all');
    },

    toggleFlag() {
      this.showCloseMenu = false;
      this.showMore = false;
      this.showFlag = !this.showFlag;
    },

    toggleMore() {
      this.showCloseMenu = false;
      this.showFlag = false;
      this.showUnfollowWarning = false;
      this.showMore = !this.showMore;
    },

    action(a, event) {
      this.showFlag = false;
      this.showMore = false;

      if (a === 'highlight-user') {
        var login = (this.user || this.rawUser) && (this.user || this.rawUser).login;
        this.tempHighlighted = this.getFFZ().toggleTempHighlight(login);
        return;
      }

      if (a === 'notes') {
        this.$emit('edit-note');
        return;
      }

      if (a === 'mention') {
        this.mentionUser();
        return;
      }

      if (a === 'edit') {
        this.editOverrides();
        return;
      }

      if (a === 'whisper') {
        this.whisperUser(event);
        return;
      }

      if (a === 'report') {
        this.reportUser();
        return;
      }

      if (a === 'block') {
        this.blockUser();
        return;
      }

      this.$emit('emit', 'user:action', { action: a, user: this.user || this.rawUser });
    },

    syncTempHighlight() {
      var u = this.user || this.rawUser;
      var ffz = this.getFFZ();
      this.tempHighlighted = !!(u && ffz.isTempHighlighted && ffz.isTempHighlighted(u.login));
    },

    toggleMod() {
      this.showMore = false;
      var chat = this.getFFZ().resolve('site.chat');
      var room = this.room && this.room.login;
      if (!chat || !room || !this.user) return;

      var mod = !this.user.isModerator;
      chat.sendMessage(room, (mod ? '/mod ' : '/unmod ') + this.user.login);
      this.$set(this.user, 'isModerator', mod);
    },

    editProfile() {
      this.showMore = false;
      var router = this.getFFZ().resolve('site.router');
      try {
        router.push('/settings/profile');
      } catch (err) {
        window.location.href = '/settings/profile';
      }
    },

    editChatIdentity() {
      this.showMore = false;
      var btn = document.querySelector('button[data-a-target="chat-badge-carousel-badge-icon"]');
      if (btn) btn.click();
      else console.warn('[ViewerCards] Chat Identity button not found');
    },

    mentionUser() {
      var login = (this.user || this.rawUser) && (this.user || this.rawUser).login;
      if (!login) return;

      var input = this.getFFZ().resolve('site.chat.input');
      if (!input) return;

      var mention = "@" + login + " ";
      var room = this.room && this.room.login;

      if (room) {
        input.pasteMessage(room, mention);
        return;
      }

      var inst = input.ChatInput && input.ChatInput.first;
      if (!inst || !inst.autocompleteInputRef) return;

      var current = inst.ffzGetValue ? inst.ffzGetValue() : '';
      var value = current ? current + " " + mention : mention;
      inst.autocompleteInputRef.setValue(value);
      if (inst.autocompleteInputRef.componentRef && inst.autocompleteInputRef.componentRef.focus)
        inst.autocompleteInputRef.componentRef.focus();
      if (inst.ffzSetSelection)
        inst.ffzSetSelection(value.length, value.length);
    },

    whisperUser(event) {
      var u = this.user || this.rawUser;
      if (!u || !u.id) return;

      var actions = this.getFFZ().resolve('chat.actions');
      var whisper = actions && actions.getAction('whisper');
      if (!whisper || !whisper.click) return;

      whisper.click.call(actions, event, {
        user: { id: u.id, login: u.login, displayName: u.displayName }
      });
    },

    reportUser() {
      var u = this.user || this.rawUser;
      if (!u || !u.id) return;

      var room = this.room;
      openReportModal(this.getFFZ(), {
        contentID: String(u.id),
        contentMetadata: room && room.id ? { channelID: String(room.id) } : {},
        contentType: 'USER_REPORT',
        targetUserID: String(u.id),
        trackingContext: 'viewer_card'
      });
    },

    editOverrides() {
      var u = this.user || this.rawUser;
      if (!u || !u.id) return;

      var overrides = this.getFFZ().resolve('chat.overrides');
      var target = this.$refs.moreButton;
      if (!overrides || !target) return;

      overrides.renderUserEditor({
        id: u.id,
        login: u.login,
        displayName: u.displayName,
        color: u.chatColor
      }, target);
    },

    async loadLowTrust() {
      var twitch_data = this.getFFZ().resolve('site.twitch_data');
      var channelID = this.room && this.room.id;
      if (!twitch_data || !channelID || !this.user || !this.user.id) return;

      try {
        var result = await twitch_data.queryApollo(
          await import(/* webpackChunkName: "queries" */ '../../utilities/graphql/viewer_card/card-low-trust.gql'),
          { channelID: channelID, targetUserID: this.user.id },
          { fetchPolicy: 'network-only' }
        );
        var props = result && result.data && result.data.lowTrustUserProperties;
        this.lowTrustTreatment = (props && props.treatment && props.treatment.type) || 'NONE';
      } catch (err) {
        console.warn('[ViewerCards] Unable to load low-trust treatment:', err);
      }
    },

    async setLowTrustTreatment(treatment) {
      this.showFlag = false;

      var twitch_data = this.getFFZ().resolve('site.twitch_data');
      var channelID = this.room && this.room.id;
      if (!twitch_data || !channelID || !this.user || !this.user.id || this.lowTrustBusy) return;

      this.lowTrustBusy = true;
      try {
        var result = await twitch_data.mutate(
          await import(/* webpackChunkName: "queries" */ '../../utilities/graphql/viewer_card/card-low-trust-update.gql'),
          { input: { channelID: channelID, targetID: this.user.id, treatment: treatment } }
        );
        var payload = result && result.data && result.data.updateLowTrustUserTreatment;
        if (payload && payload.error) {
          console.error('[ViewerCards] Low-trust update failed:', payload.error);
          return;
        }
        var props = payload && payload.properties;
        this.lowTrustTreatment = (props && props.treatment && props.treatment.type) || treatment;
      } catch (err) {
        console.error('[ViewerCards] Low-trust update failed:', err);
      } finally {
        this.lowTrustBusy = false;
      }
    },

    blockUser() {
      var login = (this.user || this.rawUser) && (this.user || this.rawUser).login;
      if (!login) return;
      var ffz = this.getFFZ();
      var chat = ffz && ffz.resolve('site.chat');
      if (!chat) return;
      var room = chat.ChatService.first && chat.ChatService.first.props && chat.ChatService.first.props.channelLogin;
      if (!room) return;
      chat.sendMessage(room, "/block " + login);
    },

    openNative() {
      var login = this.user ? this.user.login : this.rawUser.login;
      var channel = this.room && this.room.login;

      if (!channel) {
        window.open("https://www.twitch.tv/" + login, "_blank", "noopener,noreferrer");
        return;
      }

      var win = window.open(
        "/popout/" + encodeURIComponent(channel) + "/viewercard/" + encodeURIComponent(login) + "?popout=",
        "_blank",
        "right=50,top=50,width=340,height=520,resizable=no,scrollbars=no,toolbar=no,location=no,directories=no,status=no,menubar=no,copyhistory=no"
      );

      if (win)
        win.focus();
    },

    openNativeCard() {
      var ffz = this.getFFZ();
      if (!ffz) return;
      var chatContainer = ffz.resolve("site.chat") && ffz.resolve("site.chat").ChatContainer;
      if (!chatContainer || !chatContainer.first || !chatContainer.first.onUsernameClick) {
        console.warn("[ViewerCards] Could not find ChatContainer.first.onUsernameClick");
        return;
      }
      var login = this.user ? this.user.login : this.rawUser.login;
      chatContainer.first.onUsernameClick(login, "viewer_card", null);
    },

    onPin() {
      this.showMore = false;
      this.$emit('pin');
    },

    handleFollowClick() {
      if (!this.user || !this.user.self) return;
      if (this.isFollowing) {
        this.showUnfollowWarning = true;
        this.showMore = false;
      } else {
        this.showMore = false;
        this.followUser();
      }
    },

    cancelUnfollow() {
      this.showUnfollowWarning = false;
    },

    async confirmUnfollow() {
      this.showUnfollowWarning = false;
      var twitch_data = this.getFFZ().resolve("site.twitch_data");
      if (!twitch_data) return;
      try {
        await twitch_data.unfollowUser(this.user.id);
        if (this.user.self.follower) {
          this.$set(this.user.self, "follower", null);
        }
      } catch (err) {
        console.error("[ViewerCards] Error unfollowing:", err);
      }
    },

    async followUser() {
      var twitch_data = this.getFFZ().resolve("site.twitch_data");
      if (!twitch_data) return;
      this.showMore = false;
      try {
        await twitch_data.followUser(this.user.id);
        this.$set(this.user.self, "follower", {
          followedAt: new Date().toISOString(),
          disableNotifications: false,
          __typename: "FollowerEdge"
        });
      } catch (err) {
        console.error("[ViewerCards] Error following:", err);
      }
    },
  }
}
</script>