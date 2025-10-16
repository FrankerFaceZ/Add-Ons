export default class SystemThemeSync {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;

    this.THEME = {
      LIGHT: 0,
      DARK: 1
    };

    this.onSystemThemeChange = this.onSystemThemeChange.bind(this);
  }

  initialize() {
    this.syncTheme();

    window.matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", this.onSystemThemeChange);
  }

  onSystemThemeChange(e) {
    if (this.settings.get("addon.trubbel.appearance.tweaks.system_theme")) {
      this.syncTheme();
    }
  }

  syncTheme() {
    if (!this.settings.get("addon.trubbel.appearance.tweaks.system_theme")) return;

    const store = this.parent.resolve("site")?.store;
    if (!store) return;

    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentTheme = store.getState().ui.theme;
    const targetTheme = systemPrefersDark ? this.THEME.DARK : this.THEME.LIGHT;

    if (currentTheme !== targetTheme) {
      store.dispatch({
        type: "core.ui.THEME_CHANGED",
        theme: targetTheme
      });

      const menuButton = this.parent.resolve("site.menu_button");
      if (menuButton) {
        menuButton.addToast({
          icon: systemPrefersDark ? "🌙" : "☀️",
          text: `[AUTO THEME] Theme set to ${systemPrefersDark ? "Dark" : "Light"} Mode`,
          timeout: 3000
        });
      }
    }
  }
}