import { BAD_USERS } from "../../../utilities/constants/types";

import GET_CHANNEL_DROP from "../../../utilities/graphql/get-channel-drop.gql";

const { createElement } = FrankerFaceZ.utilities.dom;

export default class ChannelDrops {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.apollo = parent.apollo;
    this.router = parent.router;
    this.style = parent.style;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;

    this.lastProcessedChannel = null;
    this.dropContainer = null;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableChannelDrops = this.enableChannelDrops.bind(this);
    this.disableChannelDrops = this.disableChannelDrops.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.inventory.drops.channel");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableChannelDrops();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[ChannelDrops] Enabling channel drops functionality");
      this.handleNavigation();
    } else {
      this.log.info("[ChannelDrops] Disabling channel drops functionality");
      this.disableChannelDrops();
    }
  }

  handleNavigation() {
    const chatRoutes = this.site.constructor.CHAT_ROUTES;
    const currentRoute = this.router?.current?.name;

    let pathname;

    if (this.router?.match && this.router.match[1]) {
      pathname = this.router.match[1];
    } else {
      const location = this.router?.location;
      const segment = location?.split("/").filter(s => s.length > 0);
      pathname = segment?.[0];
    }

    if (chatRoutes.includes(currentRoute) && pathname && !BAD_USERS.includes(pathname)) {
      const enabled = this.settings.get("addon.trubbel.inventory.drops.channel");

      if (enabled) {
        if (!this.isActive) {
          this.log.info("[ChannelDrops] Entering chat page, enabling channel drops");
          this.enableChannelDrops();
        } else {
          this.log.info("[ChannelDrops] Already active, processing new channel");
          this.processCurrentChannel();
        }
      }
    } else {
      if (this.isActive) {
        this.log.info("[ChannelDrops] Leaving chat page, disabling channel drops");
        this.disableChannelDrops();
      }
    }
  }

  enableChannelDrops() {
    if (!this.isActive) {
      this.log.info("[ChannelDrops] Setting up channel drops functionality");
      this.isActive = true;
      this.injectStyle();
    }

    this.processCurrentChannel();
  }

  async processCurrentChannel() {
    if (!this.isActive) return;

    const user = this.router?.match?.[1];
    if (!user) {
      this.log.info("[ChannelDrops] No user to process");
      return;
    }

    if (this.lastProcessedChannel === user) {
      this.log.info(`[ChannelDrops] Already processed ${user}`);
      return;
    }

    this.log.info(`[ChannelDrops] Processing channel: ${user}`);
    this.lastProcessedChannel = user;

    this.removeDropContainer();

    try {
      const result = await this.apollo.client.query({
        query: GET_CHANNEL_DROP,
        variables: { login: user },
        fetchPolicy: "network-only"
      });

      const data = result?.data;
      this.log.info("[ChannelDrops] data:", data);

      const viewerDropCampaigns = data?.channel?.viewerDropCampaigns;
      if (!viewerDropCampaigns || viewerDropCampaigns.length === 0) {
        this.log.info("[ChannelDrops] No viewer drop campaigns found for this channel");
        return;
      }

      const progressMap = {};
      for (const campaign of (data?.currentUser?.inventory?.dropCampaignsInProgress ?? [])) {
        for (const drop of (campaign.timeBasedDrops ?? [])) {
          progressMap[drop.id] = drop.self;
        }
      }

      const session = data?.currentUser?.dropCurrentSession;
      if (session?.dropID) {
        progressMap[session.dropID] = {
          ...progressMap[session.dropID],
          currentMinutesWatched: session.currentMinutesWatched,
          isClaimed: progressMap[session.dropID]?.isClaimed ?? false,
          hasPreconditionsMet: progressMap[session.dropID]?.hasPreconditionsMet ?? true,
        };
      }

      this.log.info("[ChannelDrops] progressMap:", progressMap);

      await this.injectDropUI(user, viewerDropCampaigns, progressMap);

    } catch (error) {
      this.log.info("[ChannelDrops] Error fetching drops:", error);
    }
  }

  async injectDropUI(user, campaigns, progressMap) {
    const section = await this.site.awaitElement(
      ".channel-info-content section#live-channel-stream-information"
    );

    if (!this.isActive || this.lastProcessedChannel !== user) return;
    if (!section?.parentNode) return;

    this.removeDropContainer();

    const container = createElement("div", { className: "trubbel-drops" });

    for (const campaign of campaigns) {
      container.appendChild(this.buildCampaignElement(campaign, progressMap));
    }

    section.parentNode.insertBefore(container, section.nextSibling);
    this.dropContainer = container;
  }

  buildCampaignElement(campaign, progressMap) {
    const { name, game, detailsURL, timeBasedDrops } = campaign;

    const chevronEl = createElement("div", { className: "trubbel-drops__chevron" });

    const headerEl = createElement("div", { className: "trubbel-drops__header" }, [
      createElement("div", { className: "trubbel-drops__header-text" }, [
        createElement("span", { className: "trubbel-drops__name" }, name),
        createElement("span", { className: "trubbel-drops__game" }, game?.name ?? ""),
      ]),
      chevronEl,
    ]);

    const dropsGrid = createElement("div", { className: "trubbel-drops__grid" });

    for (const drop of (timeBasedDrops ?? [])) {
      for (const edge of (drop.benefitEdges ?? [])) {
        const benefit = edge.benefit;
        const self = progressMap[drop.id];
        const isClaimed = self?.isClaimed ?? false;
        const requiredSubs = drop.requiredSubs ?? 0;
        const isSubDrop = requiredSubs > 0;

        let pct = 0;
        let progressText;
        let tooltipText;

        if (isClaimed) {
          const required = drop.requiredMinutesWatched;
          progressText = "Claimed";
          tooltipText = `<strong>Claimed</strong> · watched ${this.formatMinutes(required)} of ${this.formatMinutes(required)}`;
          pct = 100;
        } else if (isSubDrop) {
          const subLabel = requiredSubs === 1 ? "Sub" : "Subs";
          progressText = `Gift ${requiredSubs} ${subLabel}`;
          tooltipText = null;
        } else {
          const current = self?.currentMinutesWatched ?? 0;
          const required = drop.requiredMinutesWatched;
          const displayCurrent = Math.min(current, required);
          const remaining = Math.max(0, required - current);
          pct = required > 0 ? Math.min(100, Math.floor((current / required) * 100)) : 0;
          progressText = `${this.formatMinutes(displayCurrent)} / ${this.formatMinutes(required)}`;
          tooltipText = `<strong>${this.formatMinutes(remaining)} remaining</strong>`;
        }

        const progressEl = tooltipText
          ? createElement("span", {
            className: "trubbel-drops__item-progress tw-relative ffz-tooltip ffz-tooltip--no-mouse",
            "data-title": tooltipText,
            "data-tooltip-type": "html",
          }, progressText)
          : createElement("span", { className: "trubbel-drops__item-progress" }, progressText);

        const dropEl = createElement("div", { className: "trubbel-drops__item" }, [
          createElement("div", { className: "trubbel-drops__item-img-wrap" }, [
            createElement("img", {
              className: "trubbel-drops__item-img",
              src: benefit.imageAssetURL,
              alt: benefit.name,
            }),
            createElement("div", { className: "trubbel-drops__item-bar" }, [
              createElement("div", {
                className: `trubbel-drops__item-bar-fill${isClaimed ? " trubbel-drops__item-bar-fill--claimed" : ""}`,
                style: { width: `${pct}%` },
              }),
            ]),
          ]),
          createElement("span", {
            className: "trubbel-drops__item-name tw-relative ffz-tooltip ffz-tooltip--no-mouse",
            "data-title": benefit.name,
            "data-tooltip-type": "html",
          }, benefit.name),
          progressEl,
        ]);

        dropsGrid.appendChild(dropEl);
      }
    }

    const actionsEl = createElement("div", { className: "trubbel-drops__actions" });

    if (detailsURL) {
      actionsEl.appendChild(
        createElement("a", {
          className: "trubbel-drops__learn-more",
          href: detailsURL,
          target: "_blank",
          rel: "noopener noreferrer",
        }, "Learn more")
      );
    }

    const bodyEl = createElement("div", { className: "trubbel-drops__body" }, [
      dropsGrid,
      actionsEl,
    ]);

    bodyEl.hidden = true;

    headerEl.addEventListener("click", () => {
      const isOpen = !bodyEl.hidden;
      bodyEl.hidden = isOpen;
      headerEl.classList.toggle("trubbel-drops__header--open", !isOpen);
    });

    return createElement("div", { className: "trubbel-drops__campaign" }, [
      headerEl,
      bodyEl,
    ]);
  }

  formatMinutes(minutes) {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${minutes}m`;
  }

  injectStyle() {
    this.style.set("trubbel-channel-drops", `
      .trubbel-drops {
        border-top: 0.1rem solid var(--color-border-base);
        background-color: var(--color-background-body);
      }

      .trubbel-drops__campaign {
        padding: 1.2rem 1.5rem;
        border-bottom: 0.1rem solid var(--color-border-base);
      }

      .trubbel-drops__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        user-select: none;
      }

      .trubbel-drops__header-text {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .trubbel-drops__name {
        font-size: 1.4rem;
        font-weight: 600;
        color: var(--color-text-base);
      }

      .trubbel-drops__game {
        font-size: 1.2rem;
        color: var(--color-text-alt-2);
      }

      .trubbel-drops__chevron {
        width: 1.6rem;
        height: 1.6rem;
        flex-shrink: 0;
        color: var(--color-text-alt-2);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23adadb8'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: center;
        transition: transform 0.15s ease;
      }

      .trubbel-drops__header--open .trubbel-drops__chevron {
        transform: rotate(180deg);
      }

      .trubbel-drops__body {
        margin-top: 1.2rem;
      }

      .trubbel-drops__grid {
        display: flex;
        flex-wrap: wrap;
        gap: 1.2rem;
      }

      .trubbel-drops__item {
        display: flex;
        flex-direction: column;
        /*width: 16rem;*/
        width: 12rem;
      }

      .trubbel-drops__item-img-wrap {
        position: relative;
        width: 100%;
        /*padding-bottom: 75%;*/
        padding-bottom: 100%;
        background-color: var(--color-background-alt);
        border-radius: 0.4rem;
        overflow: hidden;
        margin-bottom: 0.4rem;
      }

      .trubbel-drops__item-img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .trubbel-drops__item-bar {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 0.3rem;
        background-color: var(--color-background-alt-2);
      }

      .trubbel-drops__item-bar-fill {
        height: 100%;
        background-color: var(--color-background-progress-status, #a970ff);
        transition: width 0.2s ease;
      }

      .trubbel-drops__item-bar-fill--claimed {
        /*background-color: var(--color-background-success);*/
        background-color: var(--color-text-success);
      }

      .trubbel-drops__item-name {
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--color-text-base);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .trubbel-drops__item-progress {
        font-size: 1.2rem;
        color: var(--color-text-alt-2);
      }

      .trubbel-drops__actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 1.2rem;
      }

      .trubbel-drops__learn-more {
        font-size: 1.2rem;
        color: var(--color-text-link);
        text-decoration: none;
      }

      .trubbel-drops__learn-more:hover {
        text-decoration: underline;
      }
    `);
  }

  removeDropContainer() {
    if (this.dropContainer) {
      this.dropContainer.remove();
      this.dropContainer = null;
    }
  }

  disableChannelDrops() {
    if (!this.isActive) return;

    this.isActive = false;
    this.lastProcessedChannel = null;

    this.removeDropContainer();

    if (this.style.has("trubbel-channel-drops")) {
      this.style.delete("trubbel-channel-drops");
    }
  }
}