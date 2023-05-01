"use strict";
const { createElement } = FrankerFaceZ.utilities.dom;
import Logic from "./logic";
import { DEFAULT_SETTINGS } from "./constants";

/**
 * This index addon file is responsible for user settings and
 *  enables/disables the chat filtering "logic" addon.
 */
class Declutter extends Addon {
  constructor(...args) {
    super(...args);
    this.toggleEnabled = this.toggleEnabled.bind(this);
    this.inject("chat");
    this.inject("settings");
    this.inject("site.fine"); // this.fine
    this.inject("i18n");
    this.register("logic", Logic, true); // name, module, inject_reference

    this.settings.add("addon.declutter.enabled", {
      default: DEFAULT_SETTINGS.enabled,
      ui: {
        path: "Add-Ons > Declutterer >> General Settings",
        title: "Enable by Default",
        description:
          "Enable add-on by default. Otherwise, enable the add-on per channel via the toggle button next to chat settings",
        component: "setting-check-box",
      },
    });

    this.settings.add("addon.declutter.similarity_threshold", {
      default: DEFAULT_SETTINGS.similarity_threshold,
      ui: {
        path: "Add-Ons > Declutterer >> Filter Settings",
        title: "Similarity threshold in %",
        description:
          "Minimum similarity between 2 messages to count them as repetitions",
        component: "setting-text-box",
        process: "to_int",
        bounds: [0, 100],
      },
    });

    this.settings.add("addon.declutter.repetitions_threshold", {
      default: DEFAULT_SETTINGS.repetitions_threshold,
      ui: {
        path: "Add-Ons > Declutterer >> Filter Settings",
        title: "Repetition threshold",
        description: "Amount of repetitions before the message is marked",
        component: "setting-text-box",
        process: "to_int",
        bounds: [0],
      },
    });

    this.settings.add("addon.declutter.ignore_mods", {
      default: DEFAULT_SETTINGS.ignore_mods,
      ui: {
        path: "Add-Ons > Declutterer >> Mod Settings",
        title: "Ignore mods",
        description: "Do not limit messages by mods or the broadcaster",
        component: "setting-check-box",
      },
    });

    this.settings.add("addon.declutter.force_enable_when_mod", {
      default: DEFAULT_SETTINGS.force_enable_when_mod,
      ui: {
        path: "Add-Ons > Declutterer >> Mod Settings",
        title: "Force enabled when Moderator",
        description: "Force filtering even in channels you are a moderator in",
        component: "setting-check-box",
      },
    });

    this.settings.add("addon.declutter.cache_ttl", {
      default: DEFAULT_SETTINGS.cache_ttl,
      ui: {
        path: "Add-Ons > Declutterer >> Cache Settings",
        title: "Cache TTL",
        description:
          "Amount of seconds for messages to stay in the cache. A long TTL leads to high RAM usage, especially in bigger channels",
        component: "setting-text-box",
        process: "to_int",
        bounds: [1],
      },
    });

    // workaround: logic starts enabled by default, which breaks checkEnabled()
    this.logic.disable();

    this.set_enabled = null;
    this.ChatInput = this.fine.define("chat-input");
    this.logic.on(":enabled", this.updateButtons, this);
    this.logic.on(":disabled", this.updateButtons, this);
  }

  onEnable() {
    this.chat.context.on(
      "changed:addon.declutter.enabled",
      this.checkEnabled,
      this
    );
    this.checkEnabled();
    this.ChatInput.on("mount", this.updateButton, this);
    this.ChatInput.on("update", this.updateButton, this);
    this.updateButtons();
  }

  async onDisable() {
    await this.logic.disable();
    for (const inst of this.ChatInput.instances) {
      this.removeButton(inst);
    }
    this.ChatInput.off("mount", this.updateButton, this);
    this.ChatInput.off("update", this.updateButton, this);
  }

  checkEnabled() {
    const enabled =
      this.set_enabled ?? this.chat.context.get("addon.declutter.enabled");
    if (enabled && !this.logic.enabled) {
      this.logic.enable();
    } else if (!enabled && this.logic.enabled) {
      this.logic.disable();
    }
  }

  updateButtons() {
    if (this.ChatInput) {
      if (this.enabling || this.enabled) {
        for (const inst of this.ChatInput.instances) {
          this.updateButton(inst);
        }
      }
    }
  }

  toggleEnabled() {
    this.set_enabled = !this.logic.enabled;
    this.checkEnabled();
  }

  // Button tooltips piggyback on any PrattleNot internationalisation text
  updateButton(inst) {
    const node = this.fine.getHostNode(inst);
    if (!node) {
      return;
    }
    if (!inst._ffz_declutter_button) {
      inst._ffz_declutter_button = (
        <div class="tw-relative ffz-il-tooltip__container">
          <button
            class={`tw-border-radius-medium tw-button-icon--primary ffz-core-button 
							tw-inline-flex tw-interactive tw-justify-content-center 
							tw-overflow-hidden tw-relative tw-button-icon`}
            onclick={this.toggleEnabled}
          >
            <span class="tw-button-icon__icon">
              {(inst._ffz_declutter_icon = <figure class="ffz-i-zreknarf" />)}
            </span>
          </button>
          <div class="ffz-il-tooltip ffz-il-tooltip--up ffz-il-tooltip--align-right">
            {this.i18n
              .t("addon.pn.button.title", "Toggle Declutterer")
              .replace("PrattleNot", "Declutterer")}
            {(inst._ffz_declutter_enabled_tip = <div></div>)}
          </div>
        </div>
      );
    }
    if (!node.contains(inst._ffz_declutter_button)) {
      const container = node.querySelector(
        ".chat-input__buttons-container > div:last-child"
      );
      if (container) {
        container.insertBefore(
          inst._ffz_declutter_button,
          container.firstChild
        );
      }
    }
    inst._ffz_declutter_icon.className = this.logic.enabled
      ? "ffz-i-chat"
      : "ffz-i-chat-empty";
    inst._ffz_declutter_enabled_tip.classList.toggle(
      "tw-mg-t-1",
      this.logic.enabled
    );
    inst._ffz_declutter_enabled_tip.textContent = this.logic.enabled
      ? this.i18n
          .t(
            "addon.pn.button.enabled",
            "Declutterer is currently enabled. Click to disable."
          )
          .replace("PrattleNot", "Declutterer")
      : null;
  }

  removeButton(inst) {
    if (inst._ffz_declutter_button) {
      inst._ffz_declutter_button.remove();
      inst._ffz_declutter_button = null;
      inst._ffz_declutter_enabled_tip = null;
    }
  }
}

Declutter.register();
