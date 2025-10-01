const { SidebarExpand } = require("./expand");
const { SidebarShowmore } = require("./show-more");
const { SidebarPinned } = require("./pinned");
const { SidebarPreviews } = require("./previews");

const { findReactFragment } = FrankerFaceZ.utilities.dom;

export class SidebarManager {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.fine = parent.fine;
    this.log = parent.log;

    this.expand = new SidebarExpand(parent);
    this.showmore = new SidebarShowmore(parent);
    this.pinned = new SidebarPinned(parent);
    this.previews = new SidebarPreviews(parent);

    this.sidebarPreview = this.previews;

    this.onSidebarMount = this.onSidebarMount.bind(this);
    this.onSidebarMutate = this.onSidebarMutate.bind(this);
    this.onSidebarUnmount = this.onSidebarUnmount.bind(this);
    this.onSidebarUpdate = this.onSidebarUpdate.bind(this);
  }

  enable() {
    if (this.parent.Sidebar) {
      this.parent.Sidebar.on("mount", this.onSidebarMount, this.parent);
      this.parent.Sidebar.on("mutate", this.onSidebarMutate, this.parent);
      this.parent.Sidebar.on("unmount", this.onSidebarUnmount, this.parent);
      this.parent.Sidebar.each(el => this.onSidebarUpdate(el));
    }
  }

  disable() {
    if (this.parent.Sidebar) {
      this.parent.Sidebar.off("mount", this.onSidebarMount, this.parent);
      this.parent.Sidebar.off("mutate", this.onSidebarMutate, this.parent);
      this.parent.Sidebar.off("unmount", this.onSidebarUnmount, this.parent);
      this.parent.Sidebar.each(el => this.onSidebarUnmount(el));
    }

    this.expand.disable();
    this.showmore.disable();
    this.pinned.disable();
    this.previews.disable();
  }

  onSidebarMount(el) {
    this.onSidebarUpdate(el);
  }

  onSidebarMutate(el) {
    this.onSidebarUpdate(el);
  }

  onSidebarUnmount(el) {
    this.expand.clearSidebar(el);
    this.showmore.clearSidebar(el);
    this.pinned.clearSidebar(el);
    this.previews.clearSidebar(el);
  }

  onSidebarUpdate(el) {
    if (!el) {
      this.log.warn("[Sidebar Manager] No sidebar element provided");
      return;
    }

    const reactInstance = this.fine.getReactInstance(el);
    const reactElement = reactInstance.memoizedProps.children;

    const targetElement = findReactFragment(
      reactElement,
      node => node?.props?.collapsed !== undefined
    );

    const collapsed = targetElement?.props?.collapsed;

    this.checkAndCallExpand(el);
    this.checkAndCallShowMore(el, collapsed);
    this.checkAndCallPinned(el);
    this.checkAndCallPreviews(el);
  }

  checkAndCallExpand(el) {
    const autoCollapseEnabled = this.settings.get("addon.trubbel.twilight.sidebar_extended.expand");
    if (autoCollapseEnabled) {
      this.expand.updateSidebar(el);
    }
  }

  checkAndCallShowMore(el, collapsed) {
    const expandEnabled = this.settings.get("addon.trubbel.twilight.sidebar_extended.show_more.expand");
    if (expandEnabled && !collapsed) {
      this.showmore.updateSidebar(el);
    }
  }

  checkAndCallPinned(el) {
    const pinnedEnabled = this.settings.get("addon.trubbel.twilight.sidebar_extended.pinned_channels");
    if (pinnedEnabled) {
      this.pinned.updateSidebar(el);
    }
  }

  checkAndCallPreviews(el) {
    const previewsEnabled = this.settings.get("addon.trubbel.twilight.sidebar.preview");
    if (previewsEnabled) {
      this.previews.updateSidebar(el);
    }
  }
}