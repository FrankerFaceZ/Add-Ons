<template>
<div class="cvc-card-content">
  <div v-if="showModActions" class="cvc-mod-actions-container">

    <button @click="toggleWarnForm" class="cvc-mod-action-button warn tw-relative ffz-tooltip"
      :class="{ active: showWarnForm }" data-title="Warn"
      :disabled="!!currentlyBanned || banBusy || strikeLoading">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M13.226 2.72a1.404 1.404 0 0 0-2.452 0L2.192 17.84c-.545.96.136 2.16 1.226 2.16h17.164c1.09 0 1.771-1.2 1.226-2.16L13.226 2.72ZM13 7h-2v7h2V7Zm0 9h-2v2h2v-2Z" />
      </svg>
    </button>

    <button v-for="button in timeoutButtonsList" :key="button.label" @click="timeoutUser(button)"
      class="cvc-mod-action-button tw-relative ffz-tooltip" :disabled="!!currentlyBanned || banBusy || strikeLoading"
      :data-title="'Timeout for ' + button.value + ' ' + button.unit + (button.value !== 1 ? 's' : '')">
      {{ button.label }}
    </button>

    <button v-if="currentlyBanned" key="unban" @click="unbanUser"
      class="cvc-mod-action-button unban tw-relative ffz-tooltip" data-title="Unban" :disabled="banBusy">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.925 5.925 1 12 1s11 4.925 11 11-4.925 11-11 11S1 18.075 1 12Zm11 9A9 9 0 0 1 4.968 6.382l12.65 12.65A8.962 8.962 0 0 1 12 21Zm7.032-3.382a9 9 0 0 0-12.65-12.65l12.65 12.65Z" />
      </svg>
    </button>
    <button v-else key="ban" @click="banUser"
      class="cvc-mod-action-button ban tw-relative ffz-tooltip" data-title="Ban" :disabled="banBusy || strikeLoading">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M1 12C1 5.925 5.925 1 12 1s11 4.925 11 11-4.925 11-11 11S1 18.075 1 12Zm11 9A9 9 0 0 1 4.968 6.382l12.65 12.65A8.962 8.962 0 0 1 12 21Zm7.032-3.382a9 9 0 0 0-12.65-12.65l12.65 12.65Z" />
      </svg>
    </button>
  </div>

  <div v-if="showModActions && showWarnForm" class="cvc-warn-form">
    <input ref="warnInput" v-model="warnReason" class="cvc-warn-input" maxlength="500"
      placeholder="Reason for warning (required)"
      @keydown.enter.prevent="submitWarn"
      @keyup.esc.stop="closeWarnForm">
    <button class="cvc-warn-submit" :disabled="!warnReason.trim()" @click="submitWarn">Warn</button>
    <button class="cvc-warn-cancel" @click="closeWarnForm">Cancel</button>
  </div>

  <div v-if="user && !canLoadModData" class="cvc-tab-content active">
    <live-messages :user="user" :room="room" :get-f-f-z="getFFZ" :paint="messagePaint" />
  </div>

  <div v-if="showTabs" class="cvc-tabs-container">
    <div class="cvc-tabs">
      <div v-for="tab in tabList" :key="tab.id" :class="['cvc-tab', { active: activeTab === tab.id }]"
        @click="activeTab = activeTab === tab.id ? null : tab.id">
        <span class="cvc-tab-badge">{{ tab.count || 0 }}</span>
        {{ tab.name }}
      </div>
    </div>
  </div>

  <div v-if="showTabs && activeTab" class="cvc-tab-content active">

    <div v-if="activeTab === 'messages'">
      <div v-if="modLogsMessagesLoading && visibleMessages.length === 0" class="cvc-empty-state">Loading...</div>
      <div v-else-if="visibleMessages.length === 0" class="cvc-empty-state">
        This user hasn't chatted in the channel.
      </div>
      <div v-else class="cvc-messages-scroll-container" ref="messagesContainer">
        <div v-if="modLogsMessagesHasMore" class="cvc-load-more-sentinel">
          <button v-if="!modLogsMessagesLoading" @click="loadMoreMessages" class="cvc-badges-toggle">
            Load older messages
          </button>
          <div v-else class="cvc-empty-state" style="padding: 8px 0;">Loading older...</div>
        </div>
        <div v-for="item in messagesWithDateSeparators" :key="item.key">
          <div v-if="item.isSeparator" class="cvc-message-date-separator">
            <span class="cvc-message-date-separator__line"></span>
            <span class="cvc-message-date-separator__date">{{ item.date }}</span>
            <span class="cvc-message-date-separator__line"></span>
          </div>
          <div v-else-if="item.action" class="cvc-chat-line">
            <div class="cvc-msg">
              <span class="cvc-msg__time">{{ formatTime(item.action.timestamp) }}</span><span class="cvc-msg__body"><template v-for="(part, i) in modActionParts(item.action)"><span v-if="part.user" :key="i" class="cvc-msg__name">{{ part.text }}</span><template v-else>{{ part.text }}</template></template></span>
            </div>
          </div>
          <div v-else-if="item.caught" class="cvc-automod">
            <div class="cvc-automod__header">
              <a href="https://link.twitch.tv/automod_blog" target="_blank" rel="noopener noreferrer"><img class="cvc-msg__badge" alt="AutoMod badge"
                src="https://static-cdn.jtvnw.net/badges/v1/df9095f6-a8a0-4cc2-bb33-d908c0adffb8/1"
                srcset="https://static-cdn.jtvnw.net/badges/v1/df9095f6-a8a0-4cc2-bb33-d908c0adffb8/1 1x, https://static-cdn.jtvnw.net/badges/v1/df9095f6-a8a0-4cc2-bb33-d908c0adffb8/2 2x, https://static-cdn.jtvnw.net/badges/v1/df9095f6-a8a0-4cc2-bb33-d908c0adffb8/3 4x"></a><span class="cvc-automod__name">AutoMod</span>: {{ automodText(item.caught) }}
            </div>
            <ffz-card-chat-line class="cvc-automod__message"
              :msg="item.caught"
              :room="room"
              :get-f-f-z="getFFZ"
              :paint="messagePaint" />
          </div>
          <ffz-card-chat-line v-else
            :msg="item.msg"
            :room="room"
            :get-f-f-z="getFFZ"
            :can-delete="canDeleteMessages"
            :paint="messagePaint"
            :class="{ 'message-deleted': item.msg.isDeleted }"
            @delete="deleteMessage" />
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'warnings'">
      <div v-if="activeActionEdges.length === 0" class="cvc-empty-state">No warnings on record.</div>
      <div v-else class="cvc-messages-scroll-container" ref="actionContainer">
        <div v-for="item in actionEdgesWithDateSeparators" :key="item.key">
          <div v-if="item.isSeparator" class="cvc-message-date-separator">
            <span class="cvc-message-date-separator__line"></span>
            <span class="cvc-message-date-separator__date">{{ item.date }}</span>
            <span class="cvc-message-date-separator__line"></span>
          </div>
          <div v-else class="cvc-chat-line">
            <div class="cvc-msg">
              <span class="cvc-msg__time">{{ formatTime(item.edge.node.timestamp) }}</span><span class="cvc-msg__body"><template v-for="(part, i) in modActionParts(item.edge.node)"><span v-if="part.user" :key="i" class="cvc-msg__name">{{ part.text }}</span><template v-else>{{ part.text }}</template></template></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'timeouts'">
      <div v-if="activeActionEdges.length === 0" class="cvc-empty-state">No timeouts on record.</div>
      <div v-else class="cvc-messages-scroll-container" ref="actionContainer">
        <div v-for="item in actionEdgesWithDateSeparators" :key="item.key">
          <div v-if="item.isSeparator" class="cvc-message-date-separator">
            <span class="cvc-message-date-separator__line"></span>
            <span class="cvc-message-date-separator__date">{{ item.date }}</span>
            <span class="cvc-message-date-separator__line"></span>
          </div>
          <div v-else class="cvc-chat-line">
            <div class="cvc-msg">
              <span class="cvc-msg__time">{{ formatTime(item.edge.node.timestamp) }}</span><span class="cvc-msg__body"><template v-for="(part, i) in modActionParts(item.edge.node)"><span v-if="part.user" :key="i" class="cvc-msg__name">{{ part.text }}</span><template v-else>{{ part.text }}</template></template></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'bans'">
      <div v-if="activeActionEdges.length === 0" class="cvc-empty-state">No bans on record.</div>
      <div v-else class="cvc-messages-scroll-container" ref="actionContainer">
        <div v-for="item in actionEdgesWithDateSeparators" :key="item.key">
          <div v-if="item.isSeparator" class="cvc-message-date-separator">
            <span class="cvc-message-date-separator__line"></span>
            <span class="cvc-message-date-separator__date">{{ item.date }}</span>
            <span class="cvc-message-date-separator__line"></span>
          </div>
          <div v-else class="cvc-chat-line">
            <div class="cvc-msg">
              <span class="cvc-msg__time">{{ formatTime(item.edge.node.timestamp) }}</span><span class="cvc-msg__body"><template v-for="(part, i) in modActionParts(item.edge.node)"><span v-if="part.user" :key="i" class="cvc-msg__name">{{ part.text }}</span><template v-else>{{ part.text }}</template></template></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'requests'">
      <div v-if="activeActionEdges.length === 0" class="cvc-empty-state">No unban requests on record.</div>
      <div v-else class="cvc-messages-scroll-container" ref="actionContainer">
        <div v-for="item in actionEdgesWithDateSeparators" :key="item.key">
          <div v-if="item.isSeparator" class="cvc-message-date-separator">
            <span class="cvc-message-date-separator__line"></span>
            <span class="cvc-message-date-separator__date">{{ item.date }}</span>
            <span class="cvc-message-date-separator__line"></span>
          </div>
          <div v-else class="cvc-chat-line">
            <div class="cvc-msg">
              <span class="cvc-msg__time">{{ formatTime(item.edge.node.timestamp) }}</span><span class="cvc-msg__body"><template v-for="(part, i) in modActionParts(item.edge.node)"><span v-if="part.user" :key="i" class="cvc-msg__name">{{ part.text }}</span><template v-else>{{ part.text }}</template></template></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'comments'">
      <div v-if="modLogsCommentsLoading" class="cvc-empty-state">Loading comments...</div>
      <div v-else-if="modLogsCommentsError" class="cvc-empty-state">
        Unable to load comments ({{ modLogsCommentsError }})
      </div>
      <div v-else-if="modLogsComments !== null && modLogsComments.length === 0" class="cvc-empty-state">
        No comments on record.
      </div>
      <div v-else-if="modLogsComments" class="cvc-messages-scroll-container" ref="actionContainer">
        <div v-for="comment in modLogsComments" :key="comment.id">

          <div v-if="comment._isShared" class="cvc-shared-comment" :style="sharedCommentStyle(comment)">
            <div class="cvc-shared-comment-header">
              <img v-if="comment.channel && sharedChannelAvatars[comment.channel.id]"
                class="cvc-shared-comment-avatar" :src="sharedChannelAvatars[comment.channel.id]" alt="">
              <span>
                Shared comment from
                <a class="cvc-shared-comment-channel" :href="'/' + comment.channel.login"
                  target="_blank" rel="noopener noreferrer">{{ comment.channel.login }}</a>'s channel
              </span>
            </div>
            <div class="cvc-comment-log-row">
              <svg class="cvc-comment-log-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M9.828 17 12 19.172 14.172 17H19V5H5v12h4.828ZM12 22l-3-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4l-3 3Z" clip-rule="evenodd" />
              </svg>
              <div class="cvc-comment-log-body">
                <div class="cvc-comment-log-text">{{ comment.text }}</div>
                <div class="cvc-comment-log-meta">
                  <a class="cvc-comment-log-author" :href="'https://www.twitch.tv/' + comment.author.login" target="_blank" rel="noopener noreferrer"
                  :style="{ color: comment.author.chatColor || undefined }">{{ comment.author.displayName }}</a>
                  <span class="cvc-comment-log-sep"> • </span>
                  <span>{{ formatCommentDate(comment.timestamp) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="cvc-comment-log-row">
            <svg class="cvc-comment-log-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M9.828 17 12 19.172 14.172 17H19V5H5v12h4.828ZM12 22l-3-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4l-3 3Z" clip-rule="evenodd" />
              </svg>
            <div class="cvc-comment-log-body">
              <div class="cvc-comment-log-text">{{ comment.text }}</div>

              <div class="cvc-comment-log-meta">
                <a class="cvc-comment-log-author" :href="'https://www.twitch.tv/' + comment.author.login" target="_blank" rel="noopener noreferrer"
                  :style="{ color: comment.author.chatColor || undefined }">{{ comment.author.displayName }}</a>
                <span class="cvc-comment-log-sep"> • </span>
                <span>{{ formatCommentDate(comment.timestamp) }}</span>
                <span class="cvc-comment-log-sep"> • </span>
                <span class="cvc-comment-log-visibility ffz-tooltip"
                  :class="{ 'cvc-comment-log-visibility--shared': comment.isShareable }"
                  :data-title="comment.isShareable
                    ? 'This comment can be viewed by mods in the channels you are sharing ban info with.'
                    : 'This comment cannot be viewed by mods in the channels you are sharing ban info with.'">{{ comment.isShareable ? 'Shared' : 'Private' }}</span>
              </div>
            </div>

            <button v-if="isBroadcaster" class="cvc-comment-action cvc-comment-report ffz-tooltip"
              data-title="Report moderator comment" @click="reportComment(comment)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11 14a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm2-7h-2v4h2V7Z" />
                <path fill-rule="evenodd" d="m12 22-3-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4l-3 3Zm-2.172-5L12 19.172 14.172 17H19V5H5v12h4.828Z" clip-rule="evenodd" />
              </svg>
            </button>

            <button v-if="canDeleteComment(comment)" class="cvc-comment-action cvc-comment-delete ffz-tooltip"
              data-title="Delete moderator comment" :disabled="deletingCommentId === comment.id"
              @click="deleteComment(comment)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 2h4v2h7v2H3V4h7V2ZM5 8h2v12h10V8h2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Z" />
                <path d="M11 8h2v10h-2V8Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div v-if="!modLogsCommentsLoading && !modLogsCommentsError" class="cvc-comment-composer">
        <input v-model="newCommentText" type="text" class="cvc-comment-input"
          placeholder="Add a comment about this user"
          :disabled="commentSubmitting"
          @keydown.enter.prevent="submitComment"
          @keyup.esc.stop>
        <div class="cvc-comment-composer-row">
          <label v-if="canShareComments" class="cvc-comment-share">
            <input type="checkbox" v-model="newCommentShare" :disabled="commentSubmitting">
            Share this comment
            <span class="cvc-comment-share-info ffz-tooltip"
              data-title="Shared comments can be viewed by Mods in channels you share ban info with.">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11 9h2V7h-2v2Zm0 8h2v-6h-2v6Z" />
                <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" clip-rule="evenodd" />
              </svg>
            </span>
          </label>
          <button class="cvc-comment-submit" :disabled="!newCommentText.trim() || commentSubmitting" @click="submitComment">
            {{ commentSubmitting ? 'Adding...' : 'Add' }}
          </button>
        </div>
        <div v-if="commentActionError" class="cvc-comment-error">{{ commentActionError }}</div>
      </div>
    </div>

  </div>
</div>
</template>

<script>
import ChatLine from "./chat-line.vue";
import LiveMessages from "./live-messages.vue";
import {
  formatTime, formatCommentDate, withDateSeparators, openReportModal,
  formatCount
} from "./card-utils";

const TIMEOUT_UNIT_SECONDS = {
  second: 1,
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800
};

const MAX_TIMEOUT_SECONDS = 1209600;

export default {
  components: {
    "ffz-card-chat-line": ChatLine,
    "live-messages": LiveMessages
  },

  props: [
    "user", "getFFZ", "room", "timeoutButtons",
    "isMod", "isOwn", "isBroadcaster", "isTargetBroadcaster", "canAccessModLogs",
    "modTabs", "isLeadMod", "isTargetLeadMod", "messagePaint"
  ],

  data() {
    return {
      activeTab: null,

      modDataRequested: false,
      modLogs: null,
      strikeStatus: null,
      strikeLoading: false,

      modLogsComments: null,
      modLogsCommentsLoading: false,
      modLogsCommentsError: null,
      modLogsMessages: [],
      modLogsMessagesLoading: false,
      modLogsMessagesHasMore: false,
      modLogsMessagesCursor: null,

      newCommentText: '',
      newCommentShare: true,
      commentSubmitting: false,
      deletingCommentId: null,
      commentActionError: null,
      canDeleteComments: null,
      bansSharing: null,
      sharedChannelAvatars: {},

      showWarnForm: false,
      warnReason: '',
      banBusy: false
    }
  },

  computed: {
    showModActions() {
      return !!(this.user && this.isMod && !this.isOwn && !this.isTargetBroadcaster);
    },

    showTabs() {
      return this.canLoadModData && this.enabledTabIds.length > 0;
    },

    canLoadModData() {
      return !!(this.user && this.isMod && this.canAccessModLogs);
    },

    canDeleteMessages() {
      if (!this.canLoadModData || this.isTargetBroadcaster) return false;
      if (this.isBroadcaster || this.isOwn || !this.user.isModerator) return true;
      return !!(this.isLeadMod && !this.targetIsLeadMod);
    },

    targetIsLeadMod() {
      if (this.isTargetLeadMod) return true;
      return this.modLogsMessages.some(function(m) {
        var badges = m && m.sender && m.sender.displayBadges;
        return Array.isArray(badges) && badges.some(function(b) { return b && b.setID === "lead_moderator"; });
      });
    },

    enabledTabIds() {
      if (!Array.isArray(this.modTabs)) return ['messages', 'warnings', 'timeouts', 'bans', 'comments'];
      return this.modTabs.filter(function(t) { return t && t.enabled; }).map(function(t) { return t.id; });
    },

    tabList() {
      var logs = this.modLogs;
      if (!logs) return [];

      var cap = function(conn) {
        return formatCount(conn && conn.count, !!(conn && conn.pageInfo && conn.pageInfo.hasNextPage), 99);
      };
      var bansCount     = cap(logs.bans);
      var timeoutsCount = cap(logs.timeouts);
      var warningsCount = cap(logs.warnings);
      var requestsCount = cap(logs.unbanrequestcreations);

      var all = {
        messages: { id: 'messages', name: 'Messages', count: this.messagesCountLabel },
        warnings: { id: 'warnings', name: 'Warnings', count: warningsCount },
        timeouts: { id: 'timeouts', name: 'Timeouts', count: timeoutsCount },
        bans:     { id: 'bans',     name: 'Bans',     count: bansCount },
        requests: { id: 'requests', name: 'Appeals',  count: requestsCount },
        comments: { id: 'comments', name: 'Comments', count: this.commentsCountLabel },
      };

      return this.enabledTabIds.map(function(id) { return all[id]; }).filter(Boolean);
    },

    messagesCountLabel() {
      var m = this.modLogs && this.modLogs.messages;
      return formatCount(m && m.count, !!(m && m.pageInfo && m.pageInfo.hasNextPage), 999);
    },

    activeActionEdges() {
      var logs = this.modLogs;
      if (!logs || !this.activeTab) return [];

      var sources = [];

      if (this.activeTab === 'bans') {
        sources = [logs.bans, logs.unbans];
      } else if (this.activeTab === 'timeouts') {
        sources = [logs.timeouts, logs.untimeouts];
      } else if (this.activeTab === 'warnings') {
        sources = [logs.warnings, logs.warningacknowledgements];
      } else if (this.activeTab === 'requests') {
        sources = [logs.unbanrequestcreations, logs.unbanrequestapprovals, logs.unbanrequestdenials];
      }

      var allEdges = [];
      for (var i = 0; i < sources.length; i++) {
        var connection = sources[i];
        if (!connection || connection.__typename === 'ModLogsTargetedActionsError') continue;
        var edges = connection.edges || [];
        for (var j = 0; j < edges.length; j++) {
          allEdges.push(edges[j]);
        }
      }

      allEdges.sort(function(a, b) {
        return new Date(a.node.timestamp) - new Date(b.node.timestamp);
      });

      return allEdges;
    },

    visibleMessages() {
      return this.modLogsMessages.filter(function(m) {
        return m && (m.id || (m.__typename === 'ViewerCardModLogsModActionsMessage' && m.timestamp));
      });
    },

    messagesWithDateSeparators() {
      return withDateSeparators(this.visibleMessages,
        function(m) { return m.id ? m.sentAt : m.timestamp; },
        function(m) {
          if (m.__typename === 'ViewerCardModLogsCaughtMessage')
            return { caught: m, key: 'caught-' + m.id };
          return m.id
            ? { msg: m, key: 'msg-' + m.id }
            : { action: m, key: 'act-' + m.timestamp };
        });
    },

    actionEdgesWithDateSeparators() {
      return withDateSeparators(this.activeActionEdges,
        function(e) { return e.node.timestamp; },
        function(e) { return { edge: e, key: 'act-' + e.node.id }; });
    },

    timeoutButtonsList() {
      if (!this.timeoutButtons || !Array.isArray(this.timeoutButtons)) {
        return [
          { value: 1, unit: "second", label: "1s" },
          { value: 5, unit: "minute", label: "5m" },
          { value: 10, unit: "minute", label: "10m" },
          { value: 1, unit: "hour", label: "1h" },
          { value: 2, unit: "hour", label: "2h" },
          { value: 1, unit: "day", label: "1d" },
          { value: 1, unit: "week", label: "1w" },
          { value: 2, unit: "week", label: "2w" }
        ];
      }
      var unitMap = { second: "s", minute: "m", hour: "h", day: "d", week: "w" };
      return this.timeoutButtons
        .filter(function(b) { return b.value > 0; })
        .map(function(b) {
          return { value: b.value, unit: b.unit, label: b.value + (unitMap[b.unit] || b.unit) };
        });
    },

    canShareComments() {
      var b = this.bansSharing;
      return !!(b && b.isEnabled && !b.isModCommentsSharingDisabled);
    },

    commentsCountLabel() {
      var list = this.modLogsComments || [];
      var shared = list.filter(function(c) { return c._isShared; }).length;
      var own = list.length - shared;
      var more = function(conn) { return !!(conn && conn.pageInfo && conn.pageInfo.hasNextPage); };
      var logs = this.modLogs || {};
      var ownLabel = formatCount(own, more(logs.comments), 99);
      return shared ? ownLabel + ' (+' + formatCount(shared, more(logs.sharedComments), 99) + ')' : ownLabel;
    },

    currentlyBanned() {
      return this.strikeStatus && this.strikeStatus.banDetails;
    },
  },

  watch: {
    canLoadModData: {
      immediate: true,
      handler(val) {
        if (val && !this.modDataRequested) {
          this.modDataRequested = true;
          this.loadModLogs();
        }
      }
    },

    activeTab(newTab, oldTab) {
      var self = this;

      if (newTab === 'messages') {
        if (this.modLogsMessages.length === 0 && !this.modLogsMessagesLoading) {
          this.loadMessages(null);
        } else {
          this.$nextTick(function() {
            self.scrollMessagesToBottom();
            self.setupMessagesScroll();
          });
        }
      }

      if (oldTab === 'messages') {
        this.teardownMessagesScroll();
      }

      if (newTab === 'warnings' || newTab === 'timeouts' || newTab === 'bans' || newTab === 'requests' || newTab === 'comments') {
        this.$nextTick(function() {
          var container = self.$refs.actionContainer;
          if (container) container.scrollTop = container.scrollHeight;
        });
      }
    }
  },

  beforeDestroy() {
    this.teardownMessagesScroll();
  },

  methods: {
    formatTime: formatTime,
    formatCommentDate: formatCommentDate,

    async loadModLogs() {
      const apollo = this.getFFZ().resolve("site.apollo");
      if (!apollo || !this.user) return;

      const channelID = this.room && this.room.id;
      const targetID = this.user.id;
      if (!channelID || !targetID) {
        console.warn("[ViewerCards] Missing required IDs for mod data");
        return;
      }

      this.modLogsCommentsLoading = true;
      this.modLogsCommentsError = null;
      this.strikeLoading = true;

      try {
        const result = await apollo.client.query({
          query: await import(/* webpackChunkName: "queries" */ "../../utilities/graphql/viewer_card/card-moddata.gql"),
          variables: { channelID, targetID },
          fetchPolicy: "network-only",
          errorPolicy: "all"
        });

        const data = result && result.data;
        if (!data) return;

        this.strikeStatus = data.chatModeratorStrikeStatus || null;

        var ms = data.channel && data.channel.moderationSettings;
        this.bansSharing = (ms && ms.bansSharingSettings) || null;
        this.newCommentShare = this.canShareComments;

        this.loadCommentPermissions();

        const logs = data.viewerCardModLogs;
        if (!logs) return;

        this.modLogs = logs;

        const comments = logs.comments;
        const shared = logs.sharedComments;

        if (comments && comments.code) {
          this.modLogsCommentsError = comments.code;
        } else {
          const own = ((comments && comments.edges) || []).map(e => e.node);
          const sharedNodes = ((shared && !shared.code && shared.edges) || [])
            .map(e => ({ ...e.node, _isShared: true }));
          this.modLogsComments = [...own, ...sharedNodes]
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          this.loadSharedChannelAvatars(sharedNodes);
        }
      } catch (err) {
        console.error("[ViewerCards] Failed to load mod data:", err);
        this.modLogsCommentsError = "FETCH_ERROR";
      } finally {
        this.modLogsCommentsLoading = false;
        this.strikeLoading = false;
      }
    },

    async loadMessages(cursor) {
      if (this.modLogsMessagesLoading) return;

      var apollo = this.getFFZ().resolve('site.apollo');
      if (!apollo || !this.user) return;

      var channelID = (this.user.channel && this.user.channel.id) ||
                      (this.user.channelUser && this.user.channelUser.id);
      var senderID = this.user.id;
      if (!channelID || !senderID) return;

      this.modLogsMessagesLoading = true;

      try {
        var result = await apollo.client.query({
          query: await import(/* webpackChunkName: "queries" */ '../../utilities/graphql/viewer_card/card-modlogs-messages.gql'),
          variables: { channelID: channelID, senderID: senderID, cursor: cursor || undefined },
          fetchPolicy: 'network-only',
        });

        var messagesResult = result && result.data && result.data.viewerCardModLogs &&
                             result.data.viewerCardModLogs.messages;
        if (!messagesResult) return;

        if (messagesResult.__typename === 'ViewerCardModLogsMessagesError') {
          console.error('[ViewerCards] Messages error:', messagesResult.code);
          return;
        }

        var data = messagesResult;
        var edges = data.edges || [];
        var newMsgs = edges.map(function(e) { return e.node; });
        var lastEdge = edges[edges.length - 1];

        this.modLogsMessagesHasMore = !!(data.pageInfo && data.pageInfo.hasNextPage);
        this.modLogsMessagesCursor = lastEdge ? lastEdge.cursor : null;

        var self = this;

        if (cursor) {
          this.modLogsMessages = newMsgs.slice().reverse().concat(this.modLogsMessages);
        } else {
          this.modLogsMessages = newMsgs.slice().reverse();
          this.$nextTick(function() {
            self.scrollMessagesToBottom();
            self.setupMessagesScroll();
          });
        }
      } catch (err) {
        console.error('[ViewerCards] Failed to load messages:', err);
      } finally {
        this.modLogsMessagesLoading = false;
      }
    },

    async loadMoreMessages() {
      if (this.modLogsMessagesLoading || !this.modLogsMessagesHasMore) return;
      var container = this.$refs.messagesContainer;
      var oldScrollHeight = container ? container.scrollHeight : 0;
      await this.loadMessages(this.modLogsMessagesCursor);
      this.$nextTick(function() {
        if (container) container.scrollTop = container.scrollHeight - oldScrollHeight;
      });
    },

    scrollMessagesToBottom() {
      var container = this.$refs.messagesContainer;
      if (container) container.scrollTop = container.scrollHeight;
    },

    setupMessagesScroll() {
      var self = this;
      var container = this.$refs.messagesContainer;
      if (!container || this._messagesScrollBound) return;
      this._messagesScrollBound = function() {
        if (container.scrollTop < 50 && self.modLogsMessagesHasMore && !self.modLogsMessagesLoading) {
          self.loadMoreMessages();
        }
      };
      container.addEventListener('scroll', this._messagesScrollBound);
    },

    teardownMessagesScroll() {
      var container = this.$refs.messagesContainer;
      if (container && this._messagesScrollBound) {
        container.removeEventListener('scroll', this._messagesScrollBound);
      }
      this._messagesScrollBound = null;
    },

    automodText(m) {
      var reason = m.caughtMessageReason || {};
      var text;
      if (reason.mainReason === 'CHANNEL_BLOCKED_TERMS')
        text = 'Held a message for using channel blocked terms.';
      else if (reason.automodFailure && reason.automodFailure.category && reason.automodFailure.category !== 'INVALID')
        text = 'Held a message for reason: ' + reason.automodFailure.category.toLowerCase() + '.';
      else
        text = 'Held a message.';

      if (m.status === 'EXPIRED') return text + ' (Expired and not posted to Chat)';
      if (m.status === 'DENIED') return text + ' (Denied and not posted to Chat)';
      return text;
    },

    modActionParts(node) {
      var label = node && (node.localizedLabel || node.content);
      if (!label) return [{ text: node ? (node.type || '?') : '?' }];

      var fragments = label.localizedStringFragments;
      if (fragments && fragments.length) {
        var parts = [];
        fragments.forEach(function(f) {
          if (!f.token) return;
          if (f.token.__typename === 'User' || (f.token.login && f.token.displayName))
            parts.push({ text: f.token.login, user: true });
          else if (f.token.text != null)
            parts.push({ text: f.token.text });
        });
        if (parts.some(function(p) { return p.text && p.text.trim(); })) return parts;
      }

      return [{ text: label.fallbackString || node.type || '?' }];
    },

    deleteMessage(id) {
      var room = this.room && this.room.login;
      var chat = this.getFFZ().resolve('site.chat');
      if (!id || !room || !chat) return;

      chat.sendMessage(room, '/delete ' + id);

      var i = this.modLogsMessages.findIndex(function(m) { return m && m.id === id; });
      if (i !== -1) {
        var me = this.user && this.user.currentUser;
        this.$set(this.modLogsMessages, i, Object.assign({}, this.modLogsMessages[i], {
          isDeleted: true,
          lastUpdatedBy: me ? { id: me.id, login: me.login, displayName: me.login } : null
        }));
      }

      this.$nextTick(function() {
        requestAnimationFrame(function() {
          var ffz = FrankerFaceZ.get();
          if (ffz) ffz.emit("tooltips:cleanup");
        });
      });
    },

    sendModCommand(command) {
      var login = this.user && this.user.login;
      var room = this.room && this.room.login;
      var chat = this.getFFZ().resolve('site.chat');
      if (!login || !room || !chat) return false;
      chat.sendMessage(room, command.replace('{login}', login));
      return true;
    },

    async refreshStrikeStatus(isDone) {
      var twitch_data = this.getFFZ().resolve('site.twitch_data');
      var channelID = this.room && this.room.id;
      if (!twitch_data || !channelID || !this.user || !this.user.id) return;

      var query = await import(/* webpackChunkName: "queries" */ '../../utilities/graphql/viewer_card/card-strike-status.gql');
      var delays = [600, 1000, 1500, 2000];

      for (var i = 0; i < delays.length; i++) {
        await new Promise(function(r) { setTimeout(r, delays[i]); });
        if (this._isDestroyed) return;

        try {
          var result = await twitch_data.queryApollo(query,
            { channelID: channelID, targetUserID: this.user.id },
            { fetchPolicy: 'network-only' });
          var status = result && result.data && result.data.chatModeratorStrikeStatus;
          this.strikeStatus = status || null;
          if (isDone(this.strikeStatus)) return;
        } catch (err) {
          console.warn('[ViewerCards] Unable to refresh strike status:', err);
          return;
        }
      }
    },

    timeoutUser(button) {
      var seconds = button.value * (TIMEOUT_UNIT_SECONDS[button.unit] || 1);
      if (!seconds) return;

      seconds = Math.min(seconds, MAX_TIMEOUT_SECONDS);
      if (this.sendModCommand('/timeout {login} ' + seconds))
        this.refreshStrikeStatus(function(s) { return !!(s && s.timeoutDetails); });
    },

    async banUser() {
      if (this.banBusy || !this.sendModCommand('/ban {login}')) return;
      this.banBusy = true;
      this.closeWarnForm();
      try {
        await this.refreshStrikeStatus(function(s) { return !!(s && s.banDetails); });
      } finally {
        this.banBusy = false;
      }
    },

    async unbanUser() {
      if (this.banBusy || !this.sendModCommand('/unban {login}')) return;
      this.banBusy = true;
      try {
        await this.refreshStrikeStatus(function(s) { return !(s && s.banDetails); });
      } finally {
        this.banBusy = false;
      }
    },

    toggleWarnForm() {
      if (this.showWarnForm) {
        this.closeWarnForm();
        return;
      }
      this.showWarnForm = true;
      var self = this;
      this.$nextTick(function() {
        if (self.$refs.warnInput) self.$refs.warnInput.focus();
      });
    },

    closeWarnForm() {
      this.showWarnForm = false;
      this.warnReason = '';
    },

    submitWarn() {
      var reason = this.warnReason.trim();
      if (!reason) return;
      if (this.sendModCommand('/warn {login} ' + reason)) {
        this.closeWarnForm();
        this.refreshStrikeStatus(function(s) { return !!(s && s.warningDetails); });
      }
    },

    async loadCommentPermissions() {
      var twitch_data = this.getFFZ().resolve('site.twitch_data');
      var channelID = this.room && this.room.id;
      var me = this.user && this.user.currentUser;
      if (!twitch_data || !channelID || !me || !me.id) return;

      try {
        var result = await twitch_data.queryApollo(
          await import(/* webpackChunkName: "queries" */ '../../utilities/graphql/viewer_card/card-channel-permission.gql'),
          { channelID: channelID, userID: me.id, permission: 'moderation.vmcl.mod_comments:delete' },
          { fetchPolicy: 'network-only' }
        );
        var channel = result && result.data && result.data.channel;
        this.canDeleteComments = channel ? !!channel.hasPermission : null;
      } catch (err) {
        console.warn('[ViewerCards] Unable to check mod_comments:delete permission:', err);
        this.canDeleteComments = null;
      }
    },

    loadSharedChannelAvatars(nodes) {
      var twitch_data = this.getFFZ().resolve('site.twitch_data');
      if (!twitch_data || !nodes || !nodes.length) return;

      var self = this;
      var seen = {};
      nodes.forEach(function(c) {
        var id = c.channel && c.channel.id;
        if (!id || seen[id] || self.sharedChannelAvatars[id]) return;
        seen[id] = true;

        twitch_data.getUserBasic(id).then(function(u) {
          if (u && u.profileImageURL)
            self.$set(self.sharedChannelAvatars, id, u.profileImageURL);
        }).catch(function() { /* */ });
      });
    },

    sharedCommentStyle(comment) {
      var hex = comment.channel && comment.channel.primaryColorHex;
      return hex ? { borderColor: '#' + hex } : {};
    },

    canDeleteComment(comment) {
      return !comment._isShared && this.canDeleteComments !== false;
    },

    async submitComment() {
      var text = this.newCommentText.trim();
      var channelID = this.room && this.room.id;
      if (!text || this.commentSubmitting || !channelID || !this.user || !this.user.id) return;

      var twitch_data = this.getFFZ().resolve('site.twitch_data');
      if (!twitch_data) return;

      this.commentSubmitting = true;
      this.commentActionError = null;

      try {
        var result = await twitch_data.mutate(
          await import(/* webpackChunkName: "queries" */ '../../utilities/graphql/viewer_card/card-mod-comment-create.gql'),
          { input: {
            channelID: channelID,
            targetID: this.user.id,
            text: text,
            isShareable: this.canShareComments ? !!this.newCommentShare : false
          } }
        );

        var comment = result && result.data && result.data.createModeratorComment &&
          result.data.createModeratorComment.comment;
        if (!comment) throw new Error('No comment returned');

        this.modLogsComments = (this.modLogsComments || []).concat([comment]);
        this.newCommentText = '';

        var self = this;
        this.$nextTick(function() {
          var container = self.$refs.actionContainer;
          if (container) container.scrollTop = container.scrollHeight;
        });
      } catch (err) {
        console.error('[ViewerCards] Failed to add mod comment:', err);
        this.commentActionError = 'Unable to add comment.';
      } finally {
        this.commentSubmitting = false;
      }
    },

    async deleteComment(comment) {
      var channelID = this.room && this.room.id;
      if (!comment || !comment.id || !channelID || this.deletingCommentId) return;

      var twitch_data = this.getFFZ().resolve('site.twitch_data');
      if (!twitch_data) return;

      this.deletingCommentId = comment.id;
      this.commentActionError = null;

      try {
        var result = await twitch_data.mutate(
          await import(/* webpackChunkName: "queries" */ '../../utilities/graphql/viewer_card/card-mod-comment-delete.gql'),
          { input: { ID: comment.id, channelID: channelID } }
        );

        var deleted = result && result.data && result.data.deleteModeratorComment &&
          result.data.deleteModeratorComment.comment;
        if (!deleted) throw new Error('No comment returned');

        this.modLogsComments = (this.modLogsComments || []).filter(function(c) { return c.id !== comment.id; });
        this.getFFZ().emit('tooltips:cleanup');
      } catch (err) {
        console.error('[ViewerCards] Failed to delete mod comment:', err);
        this.commentActionError = 'Unable to delete comment.';
        if (this.canDeleteComments === null) this.canDeleteComments = false;
      } finally {
        this.deletingCommentId = null;
      }
    },

    reportComment(comment) {
      if (!comment || !comment.id || !this.user || !this.user.id) return;

      openReportModal(this.getFFZ(), {
        contentType: 'MOD_COMMENT',
        trackingContext: 'chat_viewer_card',
        targetUserID: String(this.user.id),
        contentID: String(comment.id)
      });
    }
  }
}
</script>