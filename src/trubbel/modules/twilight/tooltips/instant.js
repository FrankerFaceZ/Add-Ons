const { createElement, ManagedStyle, on, off } = FrankerFaceZ.utilities.dom;

export default class InstantTooltips {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.log = parent.log;

    this.style = new ManagedStyle;

    this.isActive = false;

    this.lastFiber = null;
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.twilight.tooltips.behaviour.instant");
    if (enabled) this.enable();
  }

  handleSettingChange(enabled) {
    if (enabled) this.enable();
    else this.disable();
  }

  enable() {
    if (this.isActive) return;
    this.isActive = true;

    on(document, "mouseover", this.onMouseOver = this.onMouseOver.bind(this), true);
    on(document, "mouseout", this.onMouseOut = this.onMouseOut.bind(this), true);

    this.style.set("instant-tooltips", `
			.tw-tooltip-layer,
			.tw-tooltip-layer * {
				pointer-events: none !important;
			}
		`);
  }

  disable() {
    if (!this.isActive) return;

    off(document, "mouseover", this.onMouseOver, true);
    off(document, "mouseout", this.onMouseOut, true);
    this.lastFiber = null;

    this.style.delete("instant-tooltips");

    this.isActive = false;
  }

  getFiber(el) {
    const key = Object.keys(el).find(k => k.startsWith("__reactFiber"));
    return key ? el[key] : null;
  }

  findTooltipFiber(el) {
    let fiber = this.getFiber(el);
    while (fiber) {
      const name = fiber.type?.displayName || fiber.type?.name;
      if (name === "Tooltip") return fiber;
      fiber = fiber.return;
    }
    return null;
  }

  findShowDispatch(fiber) {
    let state = fiber.memoizedState;
    while (state) {
      if (typeof state.memoizedState === "boolean" && state.queue?.dispatch)
        return { dispatch: state.queue.dispatch, current: state.memoizedState };
      state = state.next;
    }
    return null;
  }

  onMouseOver(e) {
    const fiber = this.findTooltipFiber(e.target);
    if (!fiber) {
      if (this.lastFiber) this.lastFiber = null;
      return;
    }
    if (fiber === this.lastFiber) return;
    this.lastFiber = fiber;
    const hook = this.findShowDispatch(fiber);
    if (!hook) return;
    hook.dispatch(true);
  }

  onMouseOut(e) {
    if (!this.lastFiber) return;
    const related = e.relatedTarget;
    if (related instanceof HTMLElement) {
      const fiber = this.findTooltipFiber(related);
      if (fiber === this.lastFiber) return;
    }
    const hook = this.findShowDispatch(this.lastFiber);
    if (hook?.current) hook.dispatch(false);
    this.lastFiber = null;
  }
}