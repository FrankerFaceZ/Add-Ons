const { createElement, setChildren } = FrankerFaceZ.utilities.dom;

export default class DetailedDrops {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.i18n = parent.i18n;
    this.log = parent.log;

    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.inventory.drops.detailed");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disable();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Detailed Drops] Enabling detailed drops");
      this.handleNavigation();
    } else {
      this.log.info("[Detailed Drops] Disabling detailed drops");
      this.disable();
    }
  }

  handleNavigation() {
    const currentLocation = this.router?.location;
    const oldLocation = this.router?.old_location;

    const isCurrentInventory = currentLocation === "/drops/inventory" || currentLocation === "/inventory";
    const wasInventory = oldLocation === "/drops/inventory" || oldLocation === "/inventory";

    if (isCurrentInventory && this.settings.get("addon.trubbel.inventory.drops.detailed")) {
      if (!this.isActive) {
        this.log.info("[Detailed Drops] Entering inventory page, enabling detailed drops");
        this.enable();
      }
    } else if (wasInventory && !isCurrentInventory) {
      if (this.isActive) {
        this.log.info("[Detailed Drops] Leaving inventory page");
        this.isActive = false;
        this.removeDetailedElements();
      }
    }
  }

  enable() {
    if (this.isActive) return;

    this.log.info("[Detailed Drops] Setting up detailed drops functionality");
    this.isActive = true;

    this.setupDetailedDrops();
  }

  async setupDetailedDrops() {
    if (!this.isActive) {
      this.log.info("[Detailed Drops] Not active, skipping setup");
      return;
    }

    const currentLocation = this.router?.location;
    if (currentLocation !== "/drops/inventory" && currentLocation !== "/inventory") {
      this.log.info("[Detailed Drops] Not on inventory page, skipping setup");
      return;
    }

    try {
      this.log.info("[Detailed Drops] Setting up detailed drops for inventory");
      const infoElements = await this.waitForElements();

      if (!this.isActive) return;

      const campaignData = this.extractAllCampaignData(infoElements);

      infoElements.forEach((element, index) => {
        const data = campaignData[index];
        if (data) this.enhance(element, data);
      });
      this.log.info("[Detailed Drops] Successfully set up detailed drops");

      this.enhanceClaimedTimestamps();
    } catch (error) {
      this.log.error("[Detailed Drops] Error setting up detailed drops:", error);
    }
  }

  extractAllCampaignData(infoElements) {
    return Array.from(infoElements).map(infoElement => {
      const parentDiv = infoElement.parentElement;
      if (!parentDiv) return null;

      const inst = this.site.fine.getReactInstance(parentDiv);
      if (!inst || !inst.memoizedProps) return null;

      const children = inst.memoizedProps.children;
      if (!Array.isArray(children) || children.length < 2) return null;

      const descriptionProps = children[0]?.props || {};
      const rewardsProps = children[1]?.props || {};

      return {
        description: {
          campaignID: descriptionProps.campaignID,
          campaignName: descriptionProps.campaignName,
          endDate: descriptionProps.endDate,
          gameSlug: descriptionProps.gameSlug,
          imageURL: descriptionProps.imageURL,
          campaignDetailsURL: descriptionProps.campaignDetailsURL,
          accountLinkURL: descriptionProps.accountLinkURL,
          isAccountConnected: descriptionProps.isAccountConnected,
          targetChannels: descriptionProps.targetChannels,
        },
        rewards: {
          campaignID: rewardsProps.campaignID,
          timeBasedDrops: rewardsProps.timeBasedDrops || [],
          eventBasedDrops: rewardsProps.eventBasedDrops || [],
          ownedEventBasedDrops: rewardsProps.ownedEventBasedDrops || [],
        }
      };
    }).filter(Boolean);
  }

  async waitForElements() {
    let timeoutId;
    let animFrameId;

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        cancelAnimationFrame(animFrameId);
        this.log.warn("[Detailed Drops] Timeout waiting for inventory elements");
        reject(new Error("[Detailed Drops] Timeout waiting for inventory elements"));
      }, 10000);

      const checkElements = () => {
        const elements = document.querySelectorAll(".inventory-campaign-info");
        if (elements.length > 0) {
          clearTimeout(timeoutId);
          this.log.info(`[Detailed Drops] Found ${elements.length} inventory elements`);
          resolve(elements);
        } else {
          animFrameId = requestAnimationFrame(checkElements);
        }
      };
      animFrameId = requestAnimationFrame(checkElements);
    });
  }

  disable() {
    if (!this.isActive) return;

    this.log.info("[Detailed Drops] Removing detailed drops functionality");
    this.isActive = false;

    this.removeDetailedElements();
  }

  removeDetailedElements() {
    const injectedDivs = document.querySelectorAll("[data-trubbel-drops-dates]");
    injectedDivs.forEach(div => {
      const pElement = div.parentElement;
      if (pElement) {
        pElement.querySelectorAll("span").forEach(span => span.style.display = "");
      }
      div.remove();
    });

    const replacedProgress = document.querySelectorAll("[data-trubbel-progress-replaced]");
    replacedProgress.forEach(el => delete el.dataset.trubbelProgressReplaced);

    const timestamped = document.querySelectorAll("[data-trubbel-timestamp]");
    timestamped.forEach(p => {
      p.classList.remove("tw-relative", "ffz-tooltip", "ffz-tooltip--no-mouse");
      delete p.dataset.title;
      delete p.dataset.tooltipType;
      delete p.dataset.trubbelTimestamp;
    });
  }

  enhance(infoElement, campaignData) {
    if (!this.isActive) return;

    this.replaceDateInfo(infoElement, campaignData);
    this.replaceProgressText(infoElement, campaignData);
  }

  replaceDateInfo(infoElement, campaignData) {
    if (!campaignData) return;

    const dateSpans = infoElement.querySelectorAll("div p span");
    if (!dateSpans.length) return;

    const pElement = dateSpans[0].parentElement;

    const startDate = campaignData.rewards?.timeBasedDrops?.[0]?.startAt;
    const endDate = campaignData.description?.endDate;

    if (!startDate && !endDate) return;

    if (pElement.querySelector("[data-trubbel-drops-dates]")) return;

    const formattedStartDate = this.i18n.formatDateTime(startDate, "full");
    const formattedEndDate = this.i18n.formatDateTime(endDate, "full");

    dateSpans.forEach(span => span.style.display = "none");

    pElement.appendChild(
      <div
        data-trubbel-drops-dates
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem"
        }}
      >
        <div
          className="tw-relative ffz-tooltip ffz-tooltip--no-mouse"
          data-title={`<span style="font-size:var(--font-size-base);"><strong>Start Date:</strong> ${this.i18n.toRelativeTime(startDate)}</span>`}
          data-tooltip-type="html"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "var(--deprecated-font-size-7)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: "0" }}>
              <path fill-rule="evenodd" d="M8 2H6v2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H8V2Zm12 6H4v12h16V8Z" clip-rule="evenodd" />
              <path fill-rule="evenodd" d="M7 11h2v2H7v-2Z" clip-rule="evenodd" />
            </svg>
            <strong>Start Date:</strong>
          </div>
          <span style={{ color: "var(--color-text-alt-2)", fontSize: "var(--deprecated-font-size-7)" }}>{formattedStartDate}</span>
        </div>
        <div
          className="tw-relative ffz-tooltip ffz-tooltip--no-mouse"
          data-title={`<span style="font-size:var(--font-size-base);"><strong>End Date:</strong> ${this.i18n.toRelativeTime(endDate)}</span>`}
          data-tooltip-type="html"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "var(--deprecated-font-size-7)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: "0" }}>
              <path fill-rule="evenodd" d="M8 2H6v2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H8V2Zm12 6H4v12h16V8Z" clip-rule="evenodd" />
              <path fill-rule="evenodd" d="M15 15h2v2h-2v-2Z" clip-rule="evenodd" />
            </svg>
            <strong>End Date:</strong>
          </div>
          <span style={{ color: "var(--color-text-alt-2)", fontSize: "var(--deprecated-font-size-7)" }}>{formattedEndDate}</span>
        </div>
      </div>
    );
  }

  replaceProgressText(infoElement, campaignData) {
    const drops = campaignData?.rewards?.timeBasedDrops;
    if (!drops?.length) return;

    const parentElement = infoElement.parentElement;
    if (!parentElement) return;

    const benefitNameToDropMap = new Map();
    for (const drop of drops) {
      for (const edge of (drop.benefitEdges || [])) {
        if (edge.benefit?.name) {
          benefitNameToDropMap.set(edge.benefit.name, drop);
        }
      }
    }

    const formatMinutes = (mins) => {
      if (mins >= 60) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
      }
      return `${mins}m`;
    };

    const progressBars = parentElement.querySelectorAll("[role=\"progressbar\"]");

    progressBars.forEach((progressBar) => {
      const cardContainer = progressBar.parentElement?.parentElement;
      if (!cardContainer) return;

      const nameText = cardContainer.querySelector("p")?.textContent?.trim();
      if (!nameText) return;

      const drop = benefitNameToDropMap.get(nameText);
      if (!drop) return;

      const progressTextP = progressBar.nextElementSibling?.querySelector("p");
      if (!progressTextP || progressTextP.dataset.trubbelProgressReplaced) return;

      progressTextP.dataset.trubbelProgressReplaced = "true";

      const current = drop.self?.currentMinutesWatched ?? 0;
      const required = drop.requiredMinutesWatched ?? 0;
      const isClaimed = drop.self?.isClaimed ?? false;
      const displayCurrent = Math.min(current, required);
      const remaining = Math.max(0, required - current);

      const tooltipContent = isClaimed
        ? `<span style="font-size:var(--font-size-base);"><strong>Claimed</strong> · watched ${formatMinutes(displayCurrent)} of ${formatMinutes(required)}</span>`
        : `<span style="font-size:var(--font-size-base);">${formatMinutes(remaining)} remaining</span>`;

      setChildren(progressTextP, [
        <span
          className="tw-relative ffz-tooltip ffz-tooltip--no-mouse"
          data-title={tooltipContent}
          data-tooltip-type="html"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}
        >
          <span style={{ color: "var(--color-text-base)" }}>{formatMinutes(displayCurrent)}</span>
          <span style={{ color: "var(--color-text-alt-2)" }}>/</span>
          <span>{formatMinutes(required)}</span>
          {isClaimed && (
            <span style={{ color: "var(--color-fill-live)", marginLeft: "0.3rem" }}>✓</span>
          )}
        </span>
      ]);
    });
  }

  enhanceClaimedTimestamps() {
    const towers = document.querySelectorAll(".drops-root__content .inventory-page .tw-tower");
    for (const tower of towers) {
      if (tower.closest(".inventory-campaign-info")) continue;
      this._enhanceTowerTimestamps(tower);
    }
  }

  _enhanceTowerTimestamps(tower) {
    const inst = this.site.fine.getReactInstance(tower);
    const children = inst?.memoizedProps?.children;
    if (!Array.isArray(children) || !Array.isArray(children[0])) return;

    const dropElements = children[0];

    const cardNodes = [];
    for (const child of tower.children) {
      if (child.querySelector("img.inventory-drop-image"))
        cardNodes.push(child);
    }

    for (let i = 0; i < cardNodes.length && i < dropElements.length; i++) {
      const card = cardNodes[i];
      const drop = dropElements[i]?.props?.awardedDrop;
      if (!drop?.awardedAt) continue;

      const paragraphs = card.querySelectorAll("p");
      for (const p of paragraphs) {
        const text = p.textContent?.trim();
        if (text && text !== drop.awardedDropName && !p.dataset.trubbelTimestamp) {
          p.dataset.trubbelTimestamp = "true";
          p.classList.add("tw-relative", "ffz-tooltip", "ffz-tooltip--no-mouse");
          p.dataset.title = this.i18n.formatDateTime(drop.awardedAt, "full");
          break;
        }
      }
    }
  }
}