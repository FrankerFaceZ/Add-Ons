const GLOBAL_TOKENS = new Set(["*", "html", "body", ""]);

function isCatchAll(selector) {
  return selector
    .replace(/::?[\w-]+(?:\([^)]*\))?/g, "")
    .split(/[\s>+~]+/)
    .every(part => GLOBAL_TOKENS.has(part.toLowerCase()));
}

function hidesElements(style) {
  return style.display === "none"
    || style.visibility === "hidden"
    || style.visibility === "collapse"
    || parseFloat(style.opacity) === 0
    || style.getPropertyValue("content-visibility") === "hidden";
}

function hasUnsafeRule(rules) {
  for (const rule of rules) {
    if (rule.selectorText && rule.selectorText.split(/,(?![^(]*\))/).some(isCatchAll) && hidesElements(rule.style))
      return true;
    if (rule.cssRules && hasUnsafeRule(rule.cssRules))
      return true;
  }
  return false;
}

export function isUnsafeCSS(css) {
  if (!css)
    return false;
  const sheet = new CSSStyleSheet();
  try {
    sheet.replaceSync(css);
  } catch {
    return false;
  }
  return hasUnsafeRule(sheet.cssRules);
}

export class Twilight_CSS extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("site");

    // Twilight - CSS - Custom - Custom CSS
    this.settings.add("addon.trubbel.twilight.css.custom", {
      default: "",
      process(ctx, val) {
        return isUnsafeCSS(val) ? "" : val;
      },
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > CSS >> Custom",
        title: "Custom CSS",
        description: "Plain CSS, applied to Twitch as you type.",
        component: () => import("../../components/main_menu/setting-textarea.vue"),
        rows: 12,
        monospace: true,
        debounce: 300,
        validator: value => !isUnsafeCSS(value),
        invalid: "This CSS would hide everything on Twitch (including this menu), so it isn't being applied."
      }
    });
  }

  onEnable() {
    this.settings.getChanges("addon.trubbel.twilight.css.custom", this.updateCustomCSS, this);
  }

  onDisable() {
    this.site.children.css_tweaks.delete("trubbel.custom-css");
  }

  updateCustomCSS() {
    const css = (this.settings.get("addon.trubbel.twilight.css.custom") || "").trim();
    if (css)
      this.site.children.css_tweaks.set("trubbel.custom-css", css);
    else
      this.site.children.css_tweaks.delete("trubbel.custom-css");
  }
}