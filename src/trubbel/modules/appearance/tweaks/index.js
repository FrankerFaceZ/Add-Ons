export default class Tweaks {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.style = parent.style;
  }

  onEnable() {
    this.updateCSS();
  }

  updateCSS() {
    // Appearance - Tweaks - Buttons, Input, Select, Textarea - Use old buttons with less border-radius
    if (this.settings.get("addon.trubbel.appearance.tweaks.form_control.border-radius")) {
      this.style.set("button-border-radius", `
          button[class*="ScCoreButton-sc-"],
          a[class*="ScCoreButton-sc-"],
          div:has(> button[data-test-selector="follow-button"]),
          div:has(> div [style] button[data-test-selector="follow-button"]),
          div:has(> button[data-test-selector="unfollow-button"]),
          div:has(> div [style] button[data-test-selector="unfollow-button"]),
          div:has(> button[data-a-target="notifications-toggle"]),
          .metadata-layout__support div:has(> button[data-a-target="top-nav-get-bits-button"]) {
            border-radius: 0.4rem !important;
          }
        `);
    } else {
      this.style.delete("button-border-radius");
    }
    // Appearance - Tweaks - Buttons, Input, Select, Textarea - Use old box-shadow for certain elements
    if (this.settings.get("addon.trubbel.appearance.tweaks.form_control.box-shadow")) {
      this.style.set("form-box-shadow", `
          button.tw-select-button,
          input:not(.ffz-input),
          select:not(.ffz-select),
          textarea:not(.ffz-textarea) {
            &:focus,
            &:focus:hover {
              box-shadow: inset 0 0 0 var(--input-border-width-default) var(--color-border-input-focus) !important;
              outline: unset !important;
            }
          }
          .chat-wysiwyg-input__box:focus-within {
            box-shadow: inset 0 0 0 var(--input-border-width-default) var(--color-border-input-focus) !important;
          }
        `);
    } else {
      this.style.delete("form-box-shadow");
    }
    // Appearance - Tweaks - Chat - Display full replies
    if (this.settings.get("addon.trubbel.appearance.tweaks.chat.full_replies")) {
      this.style.set("display-full-message", ".chat-line__message-container .tw-svg + div p, .chat-line__message .ffz--fix-reply-line p[title] {white-space: break-spaces !important;}");
    } else {
      this.style.delete("display-full-message");
    }
    // Appearance - Tweaks - Chat - Display the same opacity and font-weight for international usernames
    if (this.settings.get("addon.trubbel.appearance.tweaks.chat.intl")) {
      this.style.set("chat-intl", ".chat-author__intl-login {opacity: 1 !important;font-weight: 700;}");
    } else {
      this.style.delete("chat-intl");
    }
    // Appearance - Tweaks - Chat - Reduce padding in viewer list
    if (this.settings.get("addon.trubbel.appearance.tweaks.chat.viewer_list_padding")) {
      this.style.set("viewer-list-padding", `
          #community-tab-content > div {
            padding: 1rem !important;
          }
          .chatter-list-item {
            padding: .2rem 0 !important;
          }
        `);
    } else {
      this.style.delete("viewer-list-padding");
    }
    // Appearance - Tweaks - Inventory - Display bigger images in the inventory page
    if (this.settings.get("addon.trubbel.appearance.tweaks.inventory.big_img")) {
      this.style.set("inv-big-img", `
          .inventory-page .tw-tower .inventory-drop-image {
            height: unset;
            width: unset;
          }
          .inventory-page .tw-tower :is(div:has(> div > .inventory-drop-image)),
          .drops-root__content .tw-tower :is(div:has(> div > img.tw-image[alt])) {
            padding: 0px !important;
          }
        `);
    } else {
      this.style.delete("inv-big-img");
    }
    // Appearance - Tweaks - Titles - Display full titles for sidebar tooltips
    if (this.settings.get("addon.trubbel.appearance.tweaks.titles.full_sidebar_tooltip")) {
      this.style.set("display-full-sidebar-tooltip", `
          .tw-balloon :has(.online-side-nav-channel-tooltip__body),
          .tw-balloon :has(.side-nav-guest-star-tooltip__body) {
            max-width: none !important;
          }
          .online-side-nav-channel-tooltip__body :is(p),
          .side-nav-guest-star-tooltip__body :is(p) {
            display: block !important;
            -webkit-line-clamp: unset !important;
            -webkit-box-orient: unset !important;
            overflow: visible !important;
            text-overflow: unset !important;
          }
        `);
    } else {
      this.style.delete("display-full-sidebar-tooltip");
    }
    // Appearance - Tweaks - Titles - Display full titles in stream previews
    if (this.settings.get("addon.trubbel.appearance.tweaks.titles.full_stream_preview")) {
      this.style.set("full-title-stream", "[data-a-target=\"preview-card-channel-link\"] :is(h4[title]) {white-space: unset;}");
    } else {
      this.style.delete("full-title-stream");
    }
    // Appearance - Tweaks - Titles - Display full titles in clip previews
    if (this.settings.get("addon.trubbel.appearance.tweaks.titles.full_clip_preview")) {
      this.style.set("full-title-clip", "article [href*=\"/clip/\"] :is(h4[title]) {white-space: unset;}");
    } else {
      this.style.delete("full-title-clip");
    }
    // Appearance - Tweaks - Titles - Display full titles in VOD previews
    if (this.settings.get("addon.trubbel.appearance.tweaks.titles.full_vod_preview")) {
      this.style.set("full-title-vod", "article [href^=\"/videos/\"] :is(h4[title]) {white-space: unset;}");
    } else {
      this.style.delete("full-title-vod");
    }
    // Appearance - Tweaks - Titles - Display full titles for categories in directory
    if (this.settings.get("addon.trubbel.appearance.tweaks.titles.full_directory_preview")) {
      this.style.set("full-title-category", `
          .game-card .tw-card-body :is([data-a-target=\"tw-card-title\"]),
          .game-card .tw-card-body :is(h2[title]) {
            white-space: unset;
          }
        `);
    } else {
      this.style.delete("full-title-category");
    }
    // Appearance - Tweaks - Titles - Display full titles for Most Recent Videos
    if (this.settings.get("addon.trubbel.appearance.tweaks.titles.full_most_recent_preview")) {
      this.style.set("titles-most-recent-video", ".player-overlay-background p[title] {white-space: unset;}");
    } else {
      this.style.delete("titles-most-recent-video");
    }
    // Appearance - Tweaks - Unban Requests - Hide mod actions in Unban Requests
    if (this.settings.get("addon.trubbel.appearance.tweaks.unban_requests.hide_mod_actions")) {
      // Hides the "Banned By"-text
      this.style.set("unban-requests-hide1", `
          .tw-root--theme-dark .mod-view-widget-popout .unban-requests-item-header-tab__banned-by-item button {
            color: transparent !important;
            background-color: #adadb8 !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            pointer-events: none !important;
            padding: 0 90px !important;
          }
          .tw-root--theme-light .mod-view-widget-popout .unban-requests-item-header-tab__banned-by-item button {
            color: transparent !important;
            background-color: black !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            pointer-events: none !important;
            padding: 0 90px !important;
          }
        `);
      // Removes the "(Deleted by moderator)"-text
      this.style.set("unban-requests-hide2", ".mod-view-widget-popout .chat-line__message--deleted span+span {display: none !important;}");
      // Hides the mod actions within the "Chat Logs"-tab
      this.style.set("unban-requests-hide3", `
          .tw-root--theme-dark .mod-view-widget-popout .targeted-mod-action .message__timestamp+span {
            color: transparent !important;
            background-color: #adadb8 !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            padding: 0 90px !important;
          }
          .tw-root--theme-light .mod-view-widget-popout .targeted-mod-action .message__timestamp+span {
            color: transparent !important;
            background-color: black !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            padding: 0 90px !important;
          }
        `);
      // Hides the mod actions within the "Mod Comments"-tab
      this.style.set("unban-requests-hide4", `
          .tw-root--theme-dark .mod-view-widget-popout .viewer-card-mod-logs-comment-line a span {
            color: transparent !important;
            background-color: #adadb8 !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            padding: 0 90px !important;
          }
          .tw-root--theme-light .mod-view-widget-popout .viewer-card-mod-logs-comment-line a span {
            color: transparent !important;
            background-color: black !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            padding: 0 90px !important;
          }
        `);
      // Making sure the mod link within the "Mod Comments"-tab isn't clickable
      this.style.set("unban-requests-hide5", ".mod-view-widget-popout .viewer-card-mod-logs-comment-line a {pointer-events: none !important;}");
      // Removes the "(Deleted by moderator)"-text, if a User Card is opened within Unban Requests
      this.style.set("unban-requests-hide6", "#root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .chat-line__message--deleted span+span {display: none !important;}");
      // Hides the mod actions within the "Chat Logs"-tab, if a User Card is opened within Unban Requests
      this.style.set("unban-requests-hide7", `
          .tw-root--theme-dark #root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .targeted-mod-action div>span.message__timestamp+span {
            color: transparent !important;
            background-color: #adadb8 !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            padding: 0 50px !important;
          }
          .tw-root--theme-light #root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .targeted-mod-action div>span.message__timestamp+span {
            color: transparent !important;
            background-color: black !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            padding: 0 50px !important;
          }
        `);
      // Hides the moderation action at the bottom of a User Card
      this.style.set("unban-requests-hide8", `
          .tw-root--theme-dark #root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .viewer-card-mod-logs>div:not([style]):not(.viewer-card-mod-logs-page) span+span>span {
            color: transparent !important;
            background-color: #adadb8 !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            padding: 0 50px !important;
          }
          .tw-root--theme-light #root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .viewer-card-mod-logs>div:not([style]):not(.viewer-card-mod-logs-page) span+span>span {
            color: transparent !important;
            background-color: black !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            padding: 0 50px !important;
          }
        `);
      // Hides the moderation action within User Card "Mod Comments"-tab
      this.style.set("unban-requests-hide9", `
          .tw-root--theme-dark #root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .viewer-card-mod-logs-comment-line a span {
            color: transparent !important;
            background-color: #adadb8 !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            padding: 0 50px !important;
          }
          .tw-root--theme-light #root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .viewer-card-mod-logs-comment-line a span {
            color: transparent !important;
            background-color: black !important;
            -webkit-user-select: none !important;
            user-select: none !important;
            padding: 0 50px !important;
          }
        `);
      // Making sure the mod link within the "Mod Comments"-tab isn't clickable
      this.style.set("unban-requests-hide10", "#root :has(.mod-view-widget-popout)+.popout-widget__viewer-card-layer .viewer-card-mod-logs-comment-line a {pointer-events: none !important;}");
    } else {
      this.style.delete("unban-requests-hide1");
      this.style.delete("unban-requests-hide2");
      this.style.delete("unban-requests-hide3");
      this.style.delete("unban-requests-hide4");
      this.style.delete("unban-requests-hide5");
      this.style.delete("unban-requests-hide6");
      this.style.delete("unban-requests-hide7");
      this.style.delete("unban-requests-hide8");
      this.style.delete("unban-requests-hide9");
      this.style.delete("unban-requests-hide10");
    }
    // Appearance - Tweaks - Unban Requests - Remove line-through text in Unban Requests & Viewer Cards
    if (this.settings.get("addon.trubbel.appearance.tweaks.unban_requests.hide_line_through")) {
      this.style.set("unban-requests-deleted-message", `
          .vcml-message .chat-line__message--deleted-detailed {
            text-decoration: none;
          }
          .vcml-message .chat-line__message--deleted-detailed .chat-line__message--emote-button span::before {
            border-top-color: transparent;
          }
        `);
    } else {
      this.style.delete("unban-requests-deleted-message");
    }
    // Appearance - Tweaks - VODs - Display black background behind current and duration time
    if (this.settings.get("addon.trubbel.appearance.tweaks.vods.time")) {
      this.style.set("vod-time-background", `
          [data-a-target=\"player-seekbar-current-time\"],
          [data-a-target=\"player-seekbar-duration\"] {
            background-color: black;
            padding: 0px 0.4rem;
            border-radius: 0.2rem;
          }
        `);
    } else {
      this.style.delete("vod-time-background");
    }
  }
}