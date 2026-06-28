import { BAD_USERS } from "../../../utilities/constants/types";

const { createElement } = FrankerFaceZ.utilities.dom;

export default class CharacterCounter {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;
    this.ChatInput = null;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableCharacterCounter = this.enableCharacterCounter.bind(this);
    this.disableCharacterCounter = this.disableCharacterCounter.bind(this);
    this.handlePositionChange = this.handlePositionChange.bind(this);
    this.handleFontSizeChange = this.handleFontSizeChange.bind(this);
    this.patchChatInput = this.patchChatInput.bind(this);
    this.unpatchChatInput = this.unpatchChatInput.bind(this);
  }

  initialize() {
    const position = this.settings.get("addon.trubbel.channel.chat.input.character_counter");
    if (position !== "disabled") {
      this.handleNavigation();
    } else {
      this.disableCharacterCounter();
    }
  }

  handlePositionChange(position) {
    if (position !== "disabled") {
      if (!this.isActive) {
        this.handleNavigation();
      } else {
        if (this.ChatInput) {
          for (const inst of this.ChatInput.instances)
            this.applyPositionAndSize(inst);
        }
      }
    } else {
      this.disableCharacterCounter();
    }
  }

  handleFontSizeChange(fontSize) {
    if (!this.isActive || !this.ChatInput) return;
    for (const inst of this.ChatInput.instances) {
      if (inst._char_counter_el)
        inst._char_counter_el.style.fontSize = `${fontSize}px`;
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
      const position = this.settings.get("addon.trubbel.channel.chat.input.character_counter");
      if (position !== "disabled" && !this.isActive) {
        this.enableCharacterCounter();
      }
    } else {
      if (this.isActive) {
        this.disableCharacterCounter();
      }
    }
  }

  enableCharacterCounter() {
    if (this.isActive) return;

    const chatInputModule = this.site.children.chat.input;
    if (!chatInputModule?.ChatInput) {
      this.log.warn("[CharacterCounter] ChatInput not available");
      return;
    }

    this.ChatInput = chatInputModule.ChatInput;

    this.ChatInput.on("mount", this.patchChatInput, this);
    this.ChatInput.on("unmount", this.unpatchChatInput, this);

    this.ChatInput.ready((cls, instances) => {
      for (const inst of instances)
        this.patchChatInput(inst);
    });

    this.isActive = true;
  }

  disableCharacterCounter() {
    if (!this.isActive) return;

    if (this.ChatInput) {
      this.ChatInput.off("mount", this.patchChatInput, this);
      this.ChatInput.off("unmount", this.unpatchChatInput, this);

      for (const inst of this.ChatInput.instances)
        this.unpatchChatInput(inst);

      this.ChatInput = null;
    }

    this.isActive = false;
  }

  patchChatInput(inst) {
    if (inst._char_counter) return;
    inst._char_counter = true;

    const t = this;
    const orig = inst.onMessageValueUpdate;

    inst._char_counter_orig = orig;
    inst.onMessageValueUpdate = function (value, ...args) {
      try {
        const str = typeof value === "string" ? value : (inst.ffzGetValue?.() ?? "");
        t.updateCounter(inst, str);
      } catch (err) {
        t.log.error("[CharacterCounter] error in onMessageValueUpdate wrapper", err);
      }
      return orig?.call(this, value, ...args);
    };

    this.injectCounter(inst);

    const initial = inst.ffzGetValue?.() ?? "";
    this.updateCounter(inst, initial);
  }

  unpatchChatInput(inst) {
    if (!inst._char_counter) return;

    inst.onMessageValueUpdate = inst._char_counter_orig;
    delete inst._char_counter_orig;
    delete inst._char_counter;

    this.removeCounter(inst);
  }

  getPositionStyle(position, fontSize) {
    const base = [
      "position: absolute",
      "pointer-events: none",
      `font-size: ${fontSize}px`,
      "line-height: 1",
      "z-index: 1",
      "opacity: 0.6",
      "user-select: none",
      "white-space: nowrap",
    ].join("; ") + "; ";

    const offset = "2px";
    switch (position) {
      case "top-left": return `${base}top: ${offset}; left: ${offset};`;
      case "top-right": return `${base}top: ${offset}; right: ${offset};`;
      case "bottom-left": return `${base}bottom: ${offset}; left: ${offset};`;
      case "bottom-right": return `${base}bottom: ${offset}; right: ${offset};`;
      default: return `${base}top: ${offset}; right: ${offset};`;
    }
  }

  injectCounter(inst) {
    const fine = this.site.children.fine;
    const hostNode = fine?.getHostNode(inst);
    if (!hostNode) {
      this.log.warn("[CharacterCounter] no hostNode found");
      return;
    }

    const textarea = hostNode.querySelector(".chat-input__textarea");
    if (!textarea) {
      this.log.warn("[CharacterCounter] no \".chat-input__textarea\" found");
      return;
    }

    inst._char_counter_el?.remove();

    const computedPosition = getComputedStyle(textarea).position;
    if (!computedPosition || computedPosition === "static") {
      textarea.style.position = "relative";
      inst._char_counter_textarea_positioned = true;
    } else {
      inst._char_counter_textarea_positioned = false;
    }

    const position = this.settings.get("addon.trubbel.channel.chat.input.character_counter");
    const fontSize = this.settings.get("addon.trubbel.channel.chat.input.character_counter.size");
    const maxLength = inst.props?.maxLength || 500;

    const counter = createElement("span");
    counter.style.cssText = this.getPositionStyle(position, fontSize);
    counter.textContent = `0/${maxLength}`;

    inst._char_counter_el = counter;
    inst._char_counter_textarea = textarea;
    textarea.appendChild(counter);
  }

  applyPositionAndSize(inst) {
    if (!inst._char_counter_el) return;
    const position = this.settings.get("addon.trubbel.channel.chat.input.character_counter");
    const fontSize = this.settings.get("addon.trubbel.channel.chat.input.character_counter.size");
    inst._char_counter_el.style.cssText = this.getPositionStyle(position, fontSize);
  }

  removeCounter(inst) {
    inst._char_counter_el?.remove();
    inst._char_counter_el = null;

    if (inst._char_counter_textarea) {
      if (inst._char_counter_textarea_positioned) {
        inst._char_counter_textarea.style.position = "";
      }
      inst._char_counter_textarea = null;
    }
    inst._char_counter_textarea_positioned = false;
  }

  updateCounter(inst, value) {
    if (!inst._char_counter_el) return;
    const maxLength = inst.props?.maxLength || 500;
    inst._char_counter_el.textContent = `${value.length}/${maxLength}`;
  }
}