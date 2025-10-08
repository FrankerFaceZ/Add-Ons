import { BAD_USERS } from "../../../utilities/constants/types";

export default class ChatMarkdown {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.style = parent.style;
    this.site = parent.site;

    this.isActive = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableMarkdown = this.enableMarkdown.bind(this);
    this.disableMarkdown = this.disableMarkdown.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.handleSpoilerClick = this.handleSpoilerClick.bind(this);

    this.markdownTokenizer = {
      type: "chat-markdown",
      priority: 0,
      render: (token, createElement) => {
        const renderInnerTokens = (innerTokens) => {
          if (!innerTokens || !innerTokens.length) {
            return token.text;
          }

          return innerTokens.map(innerToken => {
            if (innerToken.type === "text") {
              return innerToken.text;
            } else if (innerToken.type === "chat-markdown") {
              return this.markdownTokenizer.render(innerToken, createElement);
            }
            return innerToken.text || "";
          });
        };

        if (token.markdown_type === "spoiler") {
          const content = token.innerTokens ? renderInnerTokens(token.innerTokens) : token.text;
          return createElement("span", {
            className: "trubbel-spoiler trubbel-tooltip",
            "data-tooltip-type": "html",
            "data-title": "Click to toggle spoiler",
            onClick: this.handleSpoilerClick
          }, content);
        }

        if (token.markdown_type === "bold") {
          const content = token.innerTokens ? renderInnerTokens(token.innerTokens) : token.text;
          return createElement("strong", {}, content);
        }

        if (token.markdown_type === "italic") {
          const content = token.innerTokens ? renderInnerTokens(token.innerTokens) : token.text;
          return createElement("em", {}, content);
        }

        if (token.markdown_type === "underline") {
          const content = token.innerTokens ? renderInnerTokens(token.innerTokens) : token.text;
          return createElement("u", {}, content);
        }

        if (token.markdown_type === "strikethrough") {
          const content = token.innerTokens ? renderInnerTokens(token.innerTokens) : token.text;
          return createElement("s", {}, content);
        }

        if (token.markdown_type === "bold_italic") {
          const content = token.innerTokens ? renderInnerTokens(token.innerTokens) : token.text;
          return createElement("strong", {},
            createElement("em", {}, content)
          );
        }

        return null;
      },
      process: (tokens, msg) => {
        if (!tokens || !tokens.length) return tokens;

        const markdownEnabled = this.settings.get("addon.trubbel.channel.chat.markdown");
        if (!markdownEnabled) {
          return tokens;
        }

        const out = [];

        for (const token of tokens) {
          if (token.type !== "text") {
            out.push(token);
            continue;
          }

          const processedTokens = this.processMarkdownRecursive(token.text);
          out.push(...processedTokens);
        }

        return out;
      }
    };
  }

  processMarkdownRecursive(text, depth = 0) {
    if (!text || depth > 10) {
      return [{ type: "text", text: text || "" }];
    }

    const patterns = [];

    patterns.push({
      regex: /(^|\s)\|{2}([^|]+?)\|{2}(\s|$)/g,
      type: "spoiler",
      priority: 1,
      captureGroups: { prefix: 1, content: 2, suffix: 3 }
    });

    patterns.push({
      regex: /(^|\s)\*{3}([^*]+?)\*{3}(\s|$)/g,
      type: "bold_italic",
      priority: 2,
      captureGroups: { prefix: 1, content: 2, suffix: 3 }
    });

    patterns.push({
      regex: /(^|\s)_{2}([^_]+?)_{2}(\s|$)/g,
      type: "underline",
      priority: 3,
      captureGroups: { prefix: 1, content: 2, suffix: 3 }
    });

    patterns.push({
      regex: /(^|\s)\*{2}([^*]+?)\*{2}(\s|$)/g,
      type: "bold",
      priority: 4,
      captureGroups: { prefix: 1, content: 2, suffix: 3 }
    });

    patterns.push({
      regex: /(^|\s)~{2}([^~]+?)~{2}(\s|$)/g,
      type: "strikethrough",
      priority: 5,
      captureGroups: { prefix: 1, content: 2, suffix: 3 }
    });

    patterns.push({
      regex: /(^|\s)\*{1}([^*]+?)\*{1}(\s|$)/g,
      type: "italic",
      priority: 6,
      captureGroups: { prefix: 1, content: 2, suffix: 3 }
    });
    patterns.push({
      regex: /(^|\s)_{1}([^_]+?)_{1}(\s|$)/g,
      type: "italic",
      priority: 6,
      captureGroups: { prefix: 1, content: 2, suffix: 3 }
    });

    let firstMatch = null;
    let firstPattern = null;

    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      const match = pattern.regex.exec(text);
      if (match && (!firstMatch || match.index < firstMatch.index)) {
        firstMatch = match;
        firstPattern = pattern;
      }
    }

    if (!firstMatch) {
      return [{ type: "text", text }];
    }

    const result = [];
    const fullMatchStart = firstMatch.index;
    const fullMatchEnd = fullMatchStart + firstMatch[0].length;

    const prefix = firstMatch[1];
    const innerContent = firstMatch[2];
    const suffix = firstMatch[3];

    if (fullMatchStart > 0) {
      const beforeText = text.slice(0, fullMatchStart);
      result.push(...this.processMarkdownRecursive(beforeText, depth + 1));
    }

    if (prefix) {
      result.push({ type: "text", text: prefix });
    }

    const innerTokens = this.processMarkdownRecursive(innerContent, depth + 1);
    result.push({
      type: "chat-markdown",
      markdown_type: firstPattern.type,
      innerTokens: innerTokens,
      text: innerContent
    });

    if (suffix) {
      result.push({ type: "text", text: suffix });
    }

    if (fullMatchEnd < text.length) {
      const afterText = text.slice(fullMatchEnd);
      result.push(...this.processMarkdownRecursive(afterText, depth + 1));
    }

    return result;
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.markdown");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableMarkdown();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableMarkdown();
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
      const enabled = this.settings.get("addon.trubbel.channel.chat.markdown");
      if (enabled && !this.isActive) {
        this.enableMarkdown();
      }
    } else {
      if (this.isActive) {
        this.disableMarkdown();
      }
    }
  }

  enableMarkdown() {
    if (this.isActive) return;

    const chat = this.parent.resolve("site.chat").chat;
    chat.addTokenizer(this.markdownTokenizer);

    this.style.set("md-spoilers", `
      .trubbel-spoiler {
        background-color: #7b7c84 !important;
        color: transparent !important;
        cursor: pointer;
        border-radius: 3px;
        padding: 0 2px;
        transition: all 0.2s ease;
        user-select: none;
        white-space: pre-wrap !important;
      }
      .trubbel-spoiler:hover:not(.trubbel-spoiler--revealed) {
        background-color: #9b9ca3 !important;
      }
      .trubbel-spoiler--revealed {
        background-color: #3a3b41 !important;
        color: white !important;
        cursor: text;
        user-select: text;
        white-space: pre-wrap !important;
      }
    `);

    this.parent.emit("chat:update-lines");
    this.isActive = true;
  }

  disableMarkdown() {
    if (!this.isActive) return;

    const chat = this.parent.resolve("site.chat").chat;
    chat.removeTokenizer(this.markdownTokenizer);

    if (this.style.has("md-spoilers")) {
      this.style.delete("md-spoilers");
    }

    this.parent.emit("chat:update-lines");
    this.isActive = false;
  }

  handleSpoilerClick(event) {
    const target = event.currentTarget;
    target.classList.toggle("trubbel-spoiler--revealed");
  }
}