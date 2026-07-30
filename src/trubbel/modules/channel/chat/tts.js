import { BAD_USERS } from "../../../utilities/constants/types";

export default class TextToSpeech {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.log = parent.log;
    this.chat = parent.resolve("site.chat");
    this.actions = parent.resolve("chat.actions");

    this.isActive = false;
    this.speakingId = null;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.enableTTS = this.enableTTS.bind(this);
    this.disableTTS = this.disableTTS.bind(this);
    this.handleSpeak = this.handleSpeak.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.tts");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableTTS();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableTTS();
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
      const segment = location?.split("/").filter(segment => segment.length > 0);
      pathname = segment?.[0];
    }

    if (chatRoutes.includes(currentRoute) && pathname && !BAD_USERS.includes(pathname)) {
      const enabled = this.settings.get("addon.trubbel.channel.chat.tts");
      if (enabled && !this.isActive) {
        this.enableTTS();
      }
    } else {
      if (this.isActive) {
        this.disableTTS();
      }
    }
  }

  enableTTS() {
    if (this.isActive) return;

    this.actions.addAction("addon.trubbel.tts", {
      presets: [
        {
          appearance: {
            type: "icon",
            icon: "ffz-i-comp-off",
          },
          display: {},
        },
      ],

      required_context: ["message"],

      can_self: true,

      title: "Read Message Aloud",
      description: "Use text-to-speech to read messages aloud",

      // prevent it from showing up in room actions
      hidden: (data, message) => {
        return !message;
      },

      tooltip: (data) => {
        if (this.speakingId === data.message?.id) {
          return "Stop Speaking";
        }
        return "Read Message Aloud";
      },

      override_appearance: (ap, data, msg) => {
        if (!msg || this.speakingId !== msg.id) return ap;
        return Object.assign({}, ap, { icon: "ffz-i-cancel" });
      },

      click: (event, data) => {
        if (!data.message) return;
        this.handleSpeak(data);
      },
    });

    this.isActive = true;
  }

  disableTTS() {
    if (!this.isActive) return;

    speechSynthesis.cancel();
    this.speakingId = null;

    this.actions.removeAction("addon.trubbel.tts");
    this.isActive = false;
  }

  handleSpeak(data) {
    const messageId = data.message?.id;
    if (!messageId) return;

    if (this.speakingId === messageId) {
      speechSynthesis.cancel();
      this.speakingId = null;
      this.parent.emit("chat:update-lines");
      return;
    }

    let fullMessage = null;
    for (const item of this.chat.chat.iterateMessages()) {
      if (item.message?.id === messageId) {
        fullMessage = item.message;
        break;
      }
    }

    if (!fullMessage) return;

    const tokens = fullMessage.ffz_tokens;
    const textParts = [];

    if (tokens && tokens.length) {
      for (const token of tokens) {
        if (token.type !== "text") continue;
        const trimmed = token.text.trim();
        if (trimmed.length) textParts.push(trimmed);
      }
    }

    if (!textParts.length) return;

    let textToSpeak = textParts.join(" ");

    const announceUser = this.settings.get("addon.trubbel.channel.chat.tts.announce_user");
    if (announceUser && fullMessage.user?.login) {
      textToSpeak = `${fullMessage.user.login} says: ${textToSpeak}`;
    }

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    const voiceURI = this.settings.get("addon.trubbel.channel.chat.tts.voice");
    if (voiceURI) {
      const currentVoices = speechSynthesis.getVoices();
      const voice = currentVoices.find((v) => v.voiceURI === voiceURI);
      if (voice) utterance.voice = voice;
    }

    utterance.rate = this.settings.get("addon.trubbel.channel.chat.tts.rate");
    utterance.pitch = this.settings.get("addon.trubbel.channel.chat.tts.pitch");
    utterance.volume = this.settings.get("addon.trubbel.channel.chat.tts.volume");

    this.speakingId = messageId;
    this.parent.emit("chat:update-lines");

    const onEnd = () => {
      if (this.speakingId === messageId) {
        this.speakingId = null;
        this.parent.emit("chat:update-lines");
      }
    };

    utterance.addEventListener("end", onEnd, { once: true });
    utterance.addEventListener("error", onEnd, { once: true });

    speechSynthesis.speak(utterance);
  }
}