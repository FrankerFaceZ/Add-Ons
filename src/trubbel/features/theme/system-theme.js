import { showNotification } from "../../utils/create-notification";

export function autoChangeTheme(ctx) {
  if (!ctx.settings.get("addon.trubbel.ui-tweaks.system-theme")) return;

  const THEME = {
    LIGHT: 0,
    DARK: 1
  };

  function findReduxStore() {
    const searchReactChildren = (node, predicate) => {
      if (!node) return null;

      if (predicate(node)) return node;

      if (node.child) {
        let child = node.child;
        while (child) {
          const result = searchReactChildren(child, predicate);
          if (result) return result;
          child = child.sibling;
        }
      }
      return null;
    };

    const getReactRoot = (element) => {
      const key = Object.keys(element).find(key =>
        key.startsWith("__reactContainer$") ||
        key.startsWith("__reactFiber$")
      );
      return element[key];
    };

    const rootElement = document.querySelector("#root");
    const reactRoot = getReactRoot(rootElement);

    const node = searchReactChildren(
      reactRoot._internalRoot?.current ?? reactRoot,
      (n) => n.pendingProps?.value?.store
    );

    return node?.pendingProps?.value?.store;
  }

  function setTheme(store, isDark) {
    if (!store) return;

    store.dispatch({
      type: "core.ui.THEME_CHANGED",
      theme: isDark ? THEME.DARK : THEME.LIGHT
    });

    showNotification(
      isDark ? "🌙" : "☀️",
      `[AUTO THEME] Theme set to ${isDark ? "Dark" : "Light"} Mode`
    );
  }

  function initialize() {
    const store = findReduxStore();
    if (!store) {
      setTimeout(initialize, 1000);
      return;
    }

    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const currentTheme = store.getState().ui.theme;
    const twitchIsDark = currentTheme === THEME.DARK;

    if (systemPrefersDark !== twitchIsDark) {
      setTheme(store, systemPrefersDark);
    }

    window.matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => setTheme(store, e.matches));
  }

  setTimeout(initialize, 1000);
}