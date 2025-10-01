const { on, off } = FrankerFaceZ.utilities.dom;

export class SidebarExpand {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.fine = parent.fine;
    this.log = parent.log;

    this.currentSidebarElement = null;
    this.currentReactProps = null;
    this.isMouseInSidebar = false;
    this.toggleTimer = null;

    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
  }

  disable() {
    this.log.info("[Sidebar Auto-Collapse] Disabling auto-collapse module");
    this.clearSidebar();
  }

  updateSidebar(el) {
    if (!el) {
      this.log.warn("[Sidebar Auto-Collapse] no sidebar element provided");
      return;
    }

    this.currentSidebarElement = el;
    this.updateReactProps();
    this.setupEventListeners();

    if (!this.isMouseInSidebar && this.shouldCollapseSidebar()) {
      setTimeout(() => this.collapseSidebar(), 100);
    }
  }

  clearSidebar() {
    if (this.toggleTimer) {
      clearTimeout(this.toggleTimer);
      this.toggleTimer = null;
    }

    this.removeEventListeners();

    this.currentSidebarElement = null;
    this.currentReactProps = null;
    this.isMouseInSidebar = false;
  }

  handleMouseEnter() {
    if (!this.settings.get("addon.trubbel.twilight.sidebar_extended.expand")) return;

    this.isMouseInSidebar = true;

    if (this.toggleTimer) {
      clearTimeout(this.toggleTimer);
      this.toggleTimer = null;
    }

    this.updateReactProps();

    if (this.shouldExpandSidebar()) {
      const delay = this.settings.get("addon.trubbel.twilight.sidebar_extended.expand.delay");

      this.toggleTimer = setTimeout(() => {
        if (this.isMouseInSidebar && this.settings.get("addon.trubbel.twilight.sidebar_extended.expand")) {
          this.expandSidebar();
        }
        this.toggleTimer = null;
      }, delay);
    }
  }

  handleMouseLeave(event) {
    if (!this.settings.get("addon.trubbel.twilight.sidebar_extended.expand")) return;

    if (event.relatedTarget && this.currentSidebarElement.contains(event.relatedTarget)) {
      return;
    }

    this.isMouseInSidebar = false;

    if (this.toggleTimer) {
      clearTimeout(this.toggleTimer);
      this.toggleTimer = null;
    }

    this.updateReactProps();

    if (this.shouldCollapseSidebar()) {
      this.collapseSidebar();
    }
  }

  setupEventListeners() {
    if (!this.currentSidebarElement || !this.currentSidebarElement.nodeType ||
      this.currentSidebarElement.nodeType !== Node.ELEMENT_NODE) {
      this.log.warn("[Sidebar Auto-Collapse] invalid element for event listeners");
      return;
    }

    off(this.currentSidebarElement, "mouseenter", this.handleMouseEnter);
    off(this.currentSidebarElement, "mouseleave", this.handleMouseLeave);

    on(this.currentSidebarElement, "mouseenter", this.handleMouseEnter);
    on(this.currentSidebarElement, "mouseleave", this.handleMouseLeave);
  }

  removeEventListeners() {
    if (this.currentSidebarElement) {
      off(this.currentSidebarElement, "mouseenter", this.handleMouseEnter);
      off(this.currentSidebarElement, "mouseleave", this.handleMouseLeave);
    }
  }

  updateReactProps() {
    if (!this.currentSidebarElement) return;

    try {
      let sideNavElement = this.currentSidebarElement.closest("[data-test-selector=\"side-nav\"]");

      if (!sideNavElement) {
        sideNavElement = this.currentSidebarElement.querySelector("[data-test-selector=\"side-nav\"]");
      }

      if (!sideNavElement) {
        sideNavElement = document.querySelector("[data-test-selector=\"side-nav\"]");
      }

      if (!sideNavElement) {
        this.log.warn("[Sidebar Auto-Collapse] could not find [data-test-selector=\"side-nav\"] element");
        this.currentReactProps = null;
        return;
      }

      this.log.info("[Sidebar Auto-Collapse] found side-nav element:", sideNavElement);

      const reactInstance = this.fine.getReactInstance(sideNavElement);
      if (!reactInstance) {
        this.log.warn("[Sidebar Auto-Collapse] no react instance found on side-nav element");
        return;
      }

      this.log.info("[Sidebar Auto-Collapse] react instance:", reactInstance);

      const reactProps = reactInstance.memoizedProps || reactInstance.pendingProps;
      if (!reactProps) {
        this.log.warn("[Sidebar Auto-Collapse] no react props found");
        this.currentReactProps = null;
        return;
      }

      this.log.info("[Sidebar Auto-Collapse] react props:", reactProps);

      try {
        const targetProps = reactProps?.children?.props?.children?.props?.children?.props?.children?.props?.children?.[0]?.props;

        if (targetProps &&
          typeof targetProps.collapseSideNavFromUser === "function" &&
          typeof targetProps.expandSideNavFromUser === "function") {
          this.currentReactProps = targetProps;
          this.log.info("[Sidebar Auto-Collapse] found collapse functions at expected location");
          this.log.info("[Sidebar Auto-Collapse] props:", {
            collapsed: targetProps.collapsed,
            collapsedByUser: targetProps.collapsedByUser,
            collapsedByBreakpoint: targetProps.collapsedByBreakpoint
          });
          return;
        }
      } catch (err) {
        this.log.warn("[Sidebar Auto-Collapse] expected path failed:", err);
      }

      const searchReactProps = (obj, depth = 0, maxDepth = 10) => {
        if (depth > maxDepth || !obj) return null;

        if (obj.collapseSideNavFromUser && obj.expandSideNavFromUser &&
          typeof obj.collapseSideNavFromUser === "function" &&
          typeof obj.expandSideNavFromUser === "function") {
          return obj;
        }

        if (obj.children) {
          if (Array.isArray(obj.children)) {
            for (const child of obj.children) {
              if (child && child.props) {
                const result = searchReactProps(child.props, depth + 1, maxDepth);
                if (result) return result;
              }
            }
          } else if (obj.children.props) {
            const result = searchReactProps(obj.children.props, depth + 1, maxDepth);
            if (result) return result;
          }
        }

        if (obj.props) {
          const result = searchReactProps(obj.props, depth + 1, maxDepth);
          if (result) return result;
        }

        return null;
      };

      const foundProps = searchReactProps(reactProps);
      if (foundProps) {
        this.currentReactProps = foundProps;
        this.log.info("[Sidebar Auto-Collapse] found collapse functions via recursive search");
        this.log.info("[Sidebar Auto-Collapse] props:", {
          collapsed: foundProps.collapsed,
          collapsedByUser: foundProps.collapsedByUser,
          collapsedByBreakpoint: foundProps.collapsedByBreakpoint
        });
      } else {
        this.log.warn("[Sidebar Auto-Collapse] could not find sidebar react props with collapse functions");
        this.currentReactProps = null;
      }

    } catch (err) {
      this.log.error("[Sidebar Auto-Collapse] error getting react props:", err);
      this.currentReactProps = null;
    }
  }

  shouldExpandSidebar() {
    if (!this.currentReactProps) return false;

    const { collapsed } = this.currentReactProps;
    if (!collapsed) return false;
    return true;
  }

  shouldCollapseSidebar() {
    if (!this.currentReactProps) return false;

    const { collapsed, collapsedByBreakpoint } = this.currentReactProps;
    return !collapsed && !collapsedByBreakpoint;
  }

  expandSidebar() {
    if (!this.currentReactProps || typeof this.currentReactProps.expandSideNavFromUser !== "function") {
      this.log.warn("[Sidebar Auto-Collapse] Cannot expand sidebar: React function not available");
      return;
    }

    try {
      this.log.info("[Sidebar Auto-Collapse] Auto-expanding sidebar");
      this.currentReactProps.expandSideNavFromUser();
    } catch (err) {
      this.log.error("[Sidebar Auto-Collapse] Error expanding sidebar:", err);
    }
  }

  collapseSidebar() {
    if (!this.currentReactProps || typeof this.currentReactProps.collapseSideNavFromUser !== "function") {
      this.log.warn("[Sidebar Auto-Collapse] Cannot collapse sidebar: React function not available");
      return;
    }

    try {
      this.log.info("[Sidebar Auto-Collapse] Auto-collapsing sidebar");
      this.currentReactProps.collapseSideNavFromUser();
    } catch (err) {
      this.log.error("[Sidebar Auto-Collapse] Error collapsing sidebar:", err);
    }
  }
}