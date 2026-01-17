import { BAD_USERS } from "../../../utilities/constants/types";

export default class ChatTranslate {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.style = parent.style;
    this.site = parent.site;
    this.i18n = parent.i18n;
    this.log = parent.log;
    this.chat = parent.resolve("site.chat");
    this.actions = parent.resolve("chat.actions");

    this.isActive = false;
    this.translations = new Map();

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableTranslate = this.enableTranslate.bind(this);
    this.disableTranslate = this.disableTranslate.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.handleTranslate = this.handleTranslate.bind(this);
    this.handleClearChat = this.handleClearChat.bind(this);

    this.translationTokenizer = {
      type: "chat-translate",
      priority: 0,
      render: (token, createElement) => {
        if (token.translation_type === "loading") {
          return createElement("div", {
            className: "trubbel-chat-translation trubbel-chat-translation__loading"
          }, "Translating...");
        }

        if (token.translation_type === "error") {
          return createElement("div", {
            className: "trubbel-chat-translation trubbel-chat-translation__error"
          }, [
            createElement("span", {
              className: "trubbel-chat-translation__label",
              key: "label"
            }, "Translation Error: "),
            createElement("span", {
              className: "trubbel-chat-translation__text",
              key: "text"
            }, token.error)
          ]);
        }

        if (token.translation_type === "result") {
          return createElement("div", {
            className: "trubbel-chat-translation"
          }, [
            createElement("span", {
              className: "trubbel-chat-translation__label",
              key: "label"
            }, `Translation (${token.sourceLang}): `),
            createElement("span", {
              className: "trubbel-chat-translation__text",
              key: "text"
            }, token.text)
          ]);
        }

        return null;
      },
      process: (tokens, msg) => {
        if (!tokens || !tokens.length) return tokens;

        if (msg.trubbel_translation && msg.trubbel_translation_data) {
          const data = msg.trubbel_translation_data;
          const out = [...tokens];

          if (data.error) {
            out.push({
              type: "chat-translate",
              translation_type: "error",
              error: data.error
            });
          } else if (data.text) {
            out.push({
              type: "chat-translate",
              translation_type: "result",
              text: data.text,
              sourceLang: data.sourceLang,
              candidateText: data.candidateText
            });
          }

          return out;
        }

        const translation = this.translations.get(msg.id);
        if (!translation) return tokens;

        const out = [...tokens];

        if (translation.loading) {
          out.push({
            type: "chat-translate",
            translation_type: "loading"
          });

        } else if (translation.error) {

          msg.trubbel_translation = true;
          msg.trubbel_translation_data = {
            error: translation.error
          };

          out.push({
            type: "chat-translate",
            translation_type: "error",
            error: translation.error
          });

        } else if (translation.text) {

          msg.trubbel_translation = true;
          msg.trubbel_translation_data = {
            text: translation.text,
            sourceLang: translation.sourceLang,
            candidateText: translation.candidateText
          };

          out.push({
            type: "chat-translate",
            translation_type: "result",
            text: translation.text,
            sourceLang: translation.sourceLang,
            candidateText: translation.candidateText
          });
        }

        return out;
      }
    };
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.translation");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableTranslate();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableTranslate();
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
      const enabled = this.settings.get("addon.trubbel.channel.chat.translation");
      if (enabled && !this.isActive) {
        this.enableTranslate();
      }
    } else {
      if (this.isActive) {
        this.disableTranslate();
      }
    }
  }

  enableTranslate() {
    if (this.isActive) return;

    this.actions.addAction("addon.trubbel.translate", {
      presets: [
        {
          appearance: {
            type: "icon",
            icon: "ffz-i-language",
          },
          display: {},
        },
      ],

      required_context: ["message"],

      title: "Translate Message",
      description: "Translate this message to your preferred language",

      // prevent it from showing up in room actions
      hidden: (data, message) => {
        return !message;
      },

      tooltip: (data) => {
        if (this.translations.has(data.message.id)) {
          return "Translating...";
        }
        return "Translate Message";
      },

      click: async (event, data) => {
        if (!data.message || !data.message.text) return;
        await this.handleTranslate(data);
      },
    });

    this.style.set("chat-translations",
      `
      .trubbel-chat-translation {
        display: block;
        margin-top: 0.25rem;
        padding: 0.25rem 0.5rem;
        background-color: rgba(255, 255, 255, 0.05);
        border-left: 3px solid #4f8df4;
        border-radius: 3px;
        font-size: 0.9em;
        color: rgba(255, 255, 255, 0.8);
      }

      .trubbel-chat-translation__loading {
        opacity: 0.6;
        font-style: italic;
      }

      .trubbel-chat-translation__error {
        color: #ff6b6b;
        border-left-color: #ff6b6b;
      }

      .trubbel-chat-translation__label {
        font-weight: 600;
        color: #4f8df4;
      }

      .trubbel-chat-translation__text {
        color: rgba(255, 255, 255, 0.95);
      }
    `);

    this.chat.chat.on("chat:clear-chat", this.handleClearChat, this);

    this.chat.chat.addTokenizer(this.translationTokenizer);
    this.isActive = true;
  }

  disableTranslate() {
    if (!this.isActive) return;

    this.actions.removeAction("addon.trubbel.translate");
    this.chat.chat.off("chat:clear-chat", this.handleClearChat, this);
    this.chat.chat.removeTokenizer(this.translationTokenizer);

    if (this.style.has("chat-translations")) {
      this.style.delete("chat-translations");
    }

    this.translations.clear();

    this.isActive = false;
  }

  handleClearChat() {
    if (!this.chat.chat.context.get("chat.filtering.ignore-clear")) {
      this.translations.clear();
      this.parent.emit("chat:update-lines");
    }
  }

  async handleTranslate(data) {
    const messageId = data.message.id;
    const messageText = data.message.text;

    if (this.translations.has(messageId)) {
      return;
    }

    const messages = this.chat.chat.iterateMessages();
    for (const msg of messages) {
      if (msg.id === messageId && msg.trubbel_translation) {
        return;
      }
    }

    if (this.translations.size >= 30) {
      const firstKey = this.translations.keys().next().value;
      this.translations.delete(firstKey);
    }

    this.translations.set(messageId, {
      loading: true,
      text: null,
      sourceLang: null,
      error: null,
    });

    this.parent.emit("chat:update-lines");

    try {
      const targetLang = this.settings.get("addon.trubbel.channel.chat.translation.target_lang");

      const result = await this.translateText(messageText, targetLang);

      if (result.isError) {
        this.translations.set(messageId, {
          loading: false,
          text: null,
          sourceLang: null,
          error: result.errorMessage,
        });
      } else {
        this.translations.set(messageId, {
          loading: false,
          text: result.resultText,
          sourceLang: result.sourceLanguage,
          candidateText: result.candidateText,
          error: null,
        });
      }
    } catch (error) {
      this.log.error("Translation error:", error);
      this.translations.set(messageId, {
        loading: false,
        text: null,
        sourceLang: null,
        error: "Translation failed",
      });
    }

    this.parent.emit("chat:update-lines");

    setTimeout(() => {
      this.translations.delete(messageId);
    }, 100);
  }

  async translateText(text, targetLang) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&dt=bd&dj=1&q=${encodeURIComponent(
      text
    )}`;

    try {
      const response = await fetch(url);

      const resultData = {
        resultText: "",
        candidateText: "",
        sourceLanguage: "",
        percentage: 0,
        isError: false,
        errorMessage: "",
      };

      if (response.status !== 200) {
        resultData.isError = true;

        if (response.status === 0)
          resultData.errorMessage = "Network error";
        else if (response.status === 429 || response.status === 503)
          resultData.errorMessage = "Service unavailable";
        else
          resultData.errorMessage = `Unknown error [${response.status} ${response.statusText}]`;

        return resultData;
      }

      const result = await response.json();

      resultData.sourceLanguage = result.src;
      resultData.percentage = result.ld_result?.srclangs_confidences?.[0] || 0;
      resultData.resultText = result.sentences
        .map((sentence) => sentence.trans)
        .join("");

      if (result.dict) {
        resultData.candidateText = result.dict
          .map(
            (dict) =>
              `${dict.pos}${dict.pos != "" ? ": " : ""}${dict.terms !== undefined ? dict.terms.join(", ") : ""
              }\n`
          )
          .join("");
      }

      return resultData;
    } catch (error) {
      this.log.error("Fetch error:", error);
      return {
        resultText: "",
        candidateText: "",
        sourceLanguage: "",
        percentage: 0,
        isError: true,
        errorMessage: "Network error",
      };
    }
  }
}