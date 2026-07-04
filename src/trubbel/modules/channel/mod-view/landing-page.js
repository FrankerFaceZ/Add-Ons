import MODERATED_CHANNELS_QUERY from "../../../utilities/graphql/mod_view/landing-page.gql";

const { createElement } = FrankerFaceZ.utilities.dom;
const { get } = FrankerFaceZ.utilities.object;

export default class ModViewLanding {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.style = parent.style;
    this.site = parent.site;
    this.i18n = parent.i18n;
    this.log = parent.log;

    this.vue = parent.resolve("vue");

    this.isActive = false;

    this._vue_loaded = false;
    this._vueInstance = null;
    this._vueState = null;
    this._prevTitle = null;
    this.LandingPage = null;
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.mod_view.landing");
    if (enabled) {
      this.enable();
    } else {
      this.disable();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[ModViewLanding] Enabling");
      this.enable();
    } else {
      this.log.info("[ModViewLanding] Disabling");
      this.disable();
    }
  }

  enable() {
    if (this.isActive) return;

    const elemental = this.site.children.elemental;
    if (!elemental) {
      this.log.warn("[ModViewLanding] elemental is not available");
      return;
    }

    if (!this.LandingPage) {
      this.LandingPage = elemental.define(
        "trubbel-mod-view-landing",
        ".mod-view-landing-page",
        ["user"],
        { childNodes: false, subtree: false, attributes: false },
        1
      );
    }

    this.isActive = true;

    this.LandingPage.on("mount", this.onMount, this);
    this.LandingPage.on("unmount", this.onUnmount, this);
    this.LandingPage.each(el => this.onMount(el));

    this.applyCSS();
  }

  disable() {
    if (!this.isActive) return;

    if (this.LandingPage) {
      this.LandingPage.off("mount", this.onMount, this);
      this.LandingPage.off("unmount", this.onUnmount, this);
      this.LandingPage.each(el => this.onUnmount(el));
    }

    if (this.style.has("trubbel-mod-view-landing")) {
      this.style.delete("trubbel-mod-view-landing");
    }

    this.isActive = false;
  }

  _isLandingPage() {
    return this.router.current_name === "user"
      && this.router.location === "/moderator";
  }

  async _loadVue() {
    if (this._vue_loaded)
      return;

    const [, pageComponent, cardComponent] = await Promise.all([
      this.vue.enable(),
      import("../../../components/mod_view/landing-page.vue"),
      import("../../../components/mod_view/landing-card.vue"),
    ]);

    this.vue.component("mod-landing-page", pageComponent.default);
    this.vue.component("mod-landing-card", cardComponent.default);

    this._vue_loaded = true;
  }

  async onMount(el) {
    if (!this.isActive || !this._isLandingPage()) return;

    this.log.info("[ModViewLanding] Hiding Twitch landing page, injecting our own...");

    el.style.display = "none";

    this._prevTitle = document.title;
    document.title = "Mod View - Twitch";

    await this._loadVue();

    if (!this.isActive) return;

    const state = { channels: null, hasError: false };
    const self = this;

    const container = createElement("div");
    el.insertAdjacentElement("afterend", container);

    const component = new this.vue.Vue({
      el: container,
      data: () => state,
      render: function (h) {
        return h("mod-landing-page", {
          props: {
            channels: this.channels,
            hasError: this.hasError,
            getFFZ: () => self,
            ffzI18n: self.i18n,
          },
        });
      },
    });

    this._vueInstance = component;
    this._vueState = state;

    this._fetchAndPopulate();
  }

  onUnmount(el) {
    this.log.info("[ModViewLanding] Restoring Twitch landing page, removing ours...");

    el.style.removeProperty("display");

    if (this._prevTitle) {
      document.title = this._prevTitle;
      this._prevTitle = null;
    }

    if (this._vueInstance) {
      this._vueInstance.$el.remove();
      this._vueInstance.$destroy();
      this._vueInstance = null;
      this._vueState = null;
    }
  }

  async _fetchAndPopulate() {
    let edges;
    try {
      this.log.info("[ModViewLanding] Fetching all moderated channels..");
      edges = await this._fetchAllPages();
      this.log.info(`[ModViewLanding] Got ${edges.length} total moderated channel(s)`);
    } catch (err) {
      this.log.error("[ModViewLanding] GraphQL query failed:", err);
      if (this._vueState)
        this._vueState.hasError = true;
      return;
    }

    if (!this._vueState) return;

    // Mutating root instance data triggers reactive updates down to the component.
    this._vueState.channels = edges;
  }

  async _fetchAllPages(cursor = null, accumulated = []) {
    const currentUser = this.site.getUser();
    if (!currentUser?.id) {
      throw new Error("[ModViewLanding] No current user id found, unable to determine lead moderator role, aborting fetch");
    }

    const variables = {
      permission: "moderation.roles.vip:remove",
      userID: currentUser.id,
    };
    if (cursor) variables.after = cursor;

    const result = await this.site.children.twitch_data.queryApollo(
      MODERATED_CHANNELS_QUERY,
      variables,
      { fetchPolicy: "network-only" }
    );

    const data = result?.data;
    const edges = get("moderatedChannels.edges", data) ?? [];
    const hasNextPage = get("moderatedChannels.pageInfo.hasNextPage", data);
    const nextCursor = get("moderatedChannels.edges.@last.cursor", data);

    const all = accumulated.concat(edges);
    this.log.info(`[ModViewLanding] Page fetched: ${edges.length} channels (total so far: ${all.length}, hasNextPage: ${hasNextPage})`);

    if (hasNextPage && nextCursor)
      return this._fetchAllPages(nextCursor, all);

    return all;
  }

  applyCSS() {
    this.style.set("trubbel-mod-view-landing", `
      .ffz-mod-landing-page {
        height: 100%;
        width: 100%;
        background: var(--color-background-body);
        overflow: hidden;
      }
      .ffz-mod-landing-scroll {
        height: 100%;
        overflow-y: auto;
        position: relative;
        z-index: 0;
      }
      .ffz-mod-landing-inner {
        max-width: 860px;
        margin: 0 auto;
        padding: 40px 24px 60px;
      }
      .ffz-mod-landing-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      .ffz-mod-landing-count {
        font-size: var(--font-size-6);
        color: var(--color-text-alt-2);
        white-space: nowrap;
      }
      .ffz-mod-landing-search {
        flex: 1;
        min-width: 160px;
        max-width: 240px;
        height: var(--input-size-default);
        font-size: var(--input-text-default);
        font-family: inherit;
        font-weight: var(--font-weight-normal);
        line-height: 1.5;
        appearance: none;
        background-clip: padding-box;
        border-radius: var(--input-border-radius-default);
        border-style: solid;
        border-width: 0;
        border-color: transparent;
        box-shadow: inset 0 0 0 var(--input-border-width-small) var(--color-border-input);
        color: var(--color-text-input);
        background-color: var(--color-background-input);
        padding: 0 var(--input-padding-inline-default);
        transition: border var(--timing-short) ease-in, background-color var(--timing-short) ease-in;
      }
      .ffz-mod-landing-search:hover {
        outline: none;
        box-shadow: inset 0 0 0 var(--input-border-width-default) var(--color-border-input-hover);
        background-color: var(--color-background-input);
      }
      .ffz-mod-landing-search:focus {
        outline: solid 2px var(--color-border-input-focus);
        outline-offset: -1px;
        border-color: var(--color-border-input-focus);
        box-shadow: 0 0 0 var(--input-border-width-default) var(--color-border-input-focus), inset 0 0 0 var(--input-border-width-default) var(--color-border-input-focus);
        background-color: var(--color-background-input-focus);
      }
      .ffz-mod-landing-search:focus:hover {
        outline: solid 2px var(--color-border-input-focus);
        outline-offset: -1px;
        border-color: var(--color-border-input-focus);
        box-shadow: 0 0 0 var(--input-border-width-default) var(--color-border-input-focus), inset 0 0 0 var(--input-border-width-default) var(--color-border-input-focus);
        background-color: var(--color-background-input-focus);
      }
      .ffz-mod-landing-search::-webkit-search-cancel-button {
        cursor: pointer;
      }
      .ffz-mod-landing-sort-group {
        display: flex;
        gap: 4px;
      }
      .ffz-mod-landing-sort-btn {
        padding: 4px 10px;
        border-radius: var(--border-radius-medium);
        font-size: var(--font-size-7);
        font-weight: var(--font-weight-semibold);
        font-family: inherit;
        cursor: pointer;
        border: 1px solid var(--color-opac-gl-2);
        background: transparent;
        color: var(--color-text-alt-2);
        transition: background 0.1s ease, color 0.1s ease;
        line-height: 1.4;
      }
      .ffz-mod-landing-sort-btn:hover {
        background: var(--color-background-interactable-hover);
        color: var(--color-text-base);
      }
      .ffz-mod-landing-sort-btn--active {
        background: var(--color-background-button-secondary-default);
        color: var(--color-text-button-secondary);
        border-color: transparent;
      }
      .ffz-mod-landing-section {
        margin-bottom: 16px;
      }
      .ffz-mod-landing-section-label {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: var(--font-size-7);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-alt-2);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 6px;
      }
      .ffz-mod-landing-section-pip {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--color-border-base);
        flex-shrink: 0;
      }
      .ffz-mod-landing-section-pip--live {
        background: var(--color-fill-live);
      }
      .ffz-mod-landing-empty {
        padding: 24px;
        text-align: center;
        color: var(--color-text-alt-2);
        font-size: var(--font-size-6);
      }
      .ffz-mod-landing-card {
        position: relative;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px 10px 18px;
        background: var(--color-background-alt);
        border-radius: var(--border-radius-medium);
        text-decoration: none;
        color: var(--color-text-base);
        border: 1px solid transparent;
        overflow: hidden;
        transition: background 0.12s ease, border-color 0.12s ease;
        margin-bottom: 4px;
      }
      .ffz-mod-landing-card:last-child {
        margin-bottom: 0;
      }
      .ffz-mod-landing-card:hover {
        background: var(--color-background-alt-2);
        border-color: var(--color-border-base);
        color: var(--color-text-base);
        text-decoration: none;
      }
      .ffz-mod-landing-card--offline {
        opacity: 0.78;
      }
      .ffz-mod-landing-card--offline:hover {
        opacity: 1;
      }
      .ffz-mod-landing-card::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        width: 4px;
        background: var(--ffz-mod-accent, #a970ff);
      }
      .ffz-mod-landing-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: block;
        object-fit: cover;
      }
      .ffz-mod-landing-info {
        flex: 1;
        min-width: 0;
      }
      .ffz-mod-landing-name-row {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
        margin-bottom: 2px;
      }
      .ffz-mod-landing-name {
        font-weight: var(--font-weight-semibold);
        font-size: var(--font-size-6);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--color-text-base);
        line-height: 1.3;
      }
      .ffz-mod-landing-title {
        font-size: var(--font-size-7);
        color: var(--color-text-alt);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 2px;
        line-height: 1.4;
      }
      .ffz-mod-landing-game-row {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 1px;
      }
      .ffz-mod-landing-game-thumb {
        display: block;
        flex-shrink: 0;
        border-radius: 2px;
        object-fit: cover;
        width: 14px;
        height: 20px;
      }
      .ffz-mod-landing-game {
        font-size: var(--font-size-7);
        color: var(--color-text-alt-2);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ffz-mod-landing-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: var(--font-size-8);
        font-weight: var(--font-weight-semibold);
        line-height: 1;
        padding: 2px 5px;
        border-radius: 3px;
        white-space: nowrap;
        flex-shrink: 0;
        border: 1px solid transparent;
      }
      .ffz-mod-landing-badge--lead {
        color: #e6a817;
        background: rgba(230, 168, 23, 0.15);
        border-color: rgba(230, 168, 23, 0.35);
      }
      .ffz-mod-landing-badge--editor {
        color: #3a9de0;
        background: rgba(58, 157, 224, 0.15);
        border-color: rgba(58, 157, 224, 0.35);
      }
      .ffz-mod-landing-badge--founder {
        color: #e06b3a;
        background: rgba(224, 107, 58, 0.15);
        border-color: rgba(224, 107, 58, 0.35);
      }
      .ffz-mod-landing-badge--sub {
        color: #bf94ff;
        background: rgba(191, 148, 255, 0.15);
        border-color: rgba(191, 148, 255, 0.35);
      }
      .ffz-mod-landing-badge--gifts {
        color: #4db6ac;
        background: rgba(77, 182, 172, 0.15);
        border-color: rgba(77, 182, 172, 0.35);
      }
      .ffz-mod-landing-badge--sub-lapsed {
        color: var(--color-text-alt-2);
        background: transparent;
        border-color: var(--color-border-base);
      }
      .ffz-mod-landing-badge--ftc {
        color: #ff75e6;
        background: rgba(255, 117, 230, 0.15);
        border-color: rgba(255, 117, 230, 0.35);
      }
      .ffz-mod-landing-sub-icon {
        flex-shrink: 0;
        display: block;
      }
      .ffz-mod-landing-right {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
        margin-left: 8px;
        min-width: 60px;
      }
      .ffz-mod-landing-viewers {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: var(--font-size-6);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-alt-2);
        white-space: nowrap;
      }
      .ffz-mod-landing-viewers-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--color-fill-live);
        flex-shrink: 0;
      }
      .ffz-mod-landing-uptime {
        display: flex;
        align-items: center;
        gap: 3px;
        font-size: var(--font-size-7);
        color: var(--color-text-alt-2);
        white-space: nowrap;
      }
      .ffz-mod-landing-last-live {
        font-size: var(--font-size-7);
        color: var(--color-text-alt-2);
        white-space: nowrap;
        text-align: right;
      }
    `);
  }
}