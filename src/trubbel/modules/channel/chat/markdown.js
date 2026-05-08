import { BAD_USERS } from "../../../utilities/constants/types";

export default class ChatMarkdown {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.style = parent.style;
    this.chat = parent.chat;
    this.site = parent.site;
    this.i18n = parent.i18n;

    this.isActive = false;
    this.updateTimer = null;
    this.hasRelativeTimestamps = false;

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableMarkdown = this.enableMarkdown.bind(this);
    this.disableMarkdown = this.disableMarkdown.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.handleSpoilerClick = this.handleSpoilerClick.bind(this);

    this.markdownTokenizer = {
      type: "chat-markdown",
      priority: 0,
      tooltip(target) {
        const markdownType = target.dataset.markdownType;
        if (markdownType === "timestamp") {
          const unix = parseInt(target.dataset.unix, 10);
          return this.i18n.formatDateTime(new Date(unix * 1000), "full");
        }

        return null;
      },

      render: (token, createElement) => {
        const renderInnerTokens = (innerTokens) => {
          if (!innerTokens?.length) return token.text;
          return innerTokens.map(innerToken => {
            if (innerToken.type === "text") return innerToken.text;
            if (innerToken.type === "chat-markdown") return this.markdownTokenizer.render(innerToken, createElement);
            return innerToken.text || "";
          });
        };

        if (token.markdown_type === "spoiler") {
          const content = this.chat.renderTokens(token.innerTokens || [], createElement);
          return createElement("span", {
            className: "trubbel-spoiler ffz-tooltip",
            "data-tooltip-type": "text",
            "data-title": "Click to toggle spoiler",
            onClick: this.handleSpoilerClick
          }, content);
        }

        if (token.markdown_type === "timestamp") {
          const displayText = token.style === "R"
            ? this.i18n.toRelativeTime(token.date)
            : token.text;

          return createElement("span", {
            className: "ffz-timestamp ffz-tooltip",
            "data-tooltip-type": "chat-markdown",
            "data-markdown-type": "timestamp",
            "data-unix": String(token.unix)
          }, displayText);
        }

        if (token.markdown_type === "bold") {
          return createElement("strong", {}, renderInnerTokens(token.innerTokens));
        }

        if (token.markdown_type === "italic") {
          return createElement("em", {}, renderInnerTokens(token.innerTokens));
        }

        if (token.markdown_type === "underline") {
          return createElement("u", {}, renderInnerTokens(token.innerTokens));
        }

        if (token.markdown_type === "strikethrough") {
          return createElement("s", {}, renderInnerTokens(token.innerTokens));
        }

        if (token.markdown_type === "bold_italic") {
          return createElement("strong", {},
            createElement("em", {}, renderInnerTokens(token.innerTokens))
          );
        }

        return null;
      },
      process: (tokens, msg) => {
        if (!tokens?.length) return tokens;

        const markdownEnabled = this.settings.get("addon.trubbel.channel.chat.markdown");
        if (!markdownEnabled) return tokens;

        const withSpoilers = this.processSpoilers(tokens);
        const out = this.applyInlineFormatting(withSpoilers);

        if (!this.hasRelativeTimestamps) {
          this.checkForRelativeTimestamps(out);
        }

        return out;
      }
    };
  }

  findSpoilerOpener(text) {
    for (let k = 0; k <= text.length - 2; k++) {
      if (text[k] === "|" && text[k + 1] === "|") return k;
    }
    return -1;
  }

  findSpoilerCloser(text) {
    for (let k = 0; k <= text.length - 2; k++) {
      if (text[k] === "|" && text[k + 1] === "|") return k;
    }
    return -1;
  }

  processSpoilers(tokens) {
    const result = [];
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];

      if (token.type !== "text") {
        result.push(token);
        i++;
        continue;
      }

      const openPos = this.findSpoilerOpener(token.text);

      if (openPos === -1) {
        result.push(token);
        i++;
        continue;
      }

      if (openPos > 0) {
        result.push({ type: "text", text: token.text.slice(0, openPos) });
      }

      const afterOpen = token.text.slice(openPos + 2);
      const sameClose = this.findSpoilerCloser(afterOpen);

      if (sameClose !== -1) {
        const innerText = afterOpen.slice(0, sameClose);
        result.push({
          type: "chat-markdown",
          markdown_type: "spoiler",
          innerTokens: [{ type: "text", text: innerText }],
          text: innerText
        });

        const remaining = afterOpen.slice(sameClose + 2);
        if (remaining) {
          tokens = [...tokens.slice(0, i), { type: "text", text: remaining }, ...tokens.slice(i + 1)];
        } else {
          i++;
        }
        continue;
      }

      const innerTokens = [];
      if (afterOpen) innerTokens.push({ type: "text", text: afterOpen });

      let found = false;

      for (let j = i + 1; j < tokens.length; j++) {
        const t = tokens[j];

        if (t.type === "text") {
          const closePos = this.findSpoilerCloser(t.text);

          if (closePos !== -1) {
            if (closePos > 0) {
              innerTokens.push({ type: "text", text: t.text.slice(0, closePos) });
            }

            result.push({
              type: "chat-markdown",
              markdown_type: "spoiler",
              innerTokens,
              text: ""
            });

            const remaining = t.text.slice(closePos + 2);
            tokens = [
              ...tokens.slice(0, j),
              ...(remaining ? [{ type: "text", text: remaining }] : []),
              ...tokens.slice(j + 1)
            ];
            i = j;
            found = true;
            break;
          } else {
            innerTokens.push(t);
          }
        } else {
          innerTokens.push(t);
        }
      }

      if (!found) {
        if (openPos > 0) result.pop();
        result.push(token);
        i++;
      }
    }

    return result;
  }

  applyInlineFormatting(tokens) {
    const out = [];
    for (const token of tokens) {
      if (token.type === "chat-markdown" && token.markdown_type === "spoiler") {
        out.push({
          ...token,
          innerTokens: this.applyInlineFormatting(token.innerTokens || [])
        });
      } else if (token.type === "text") {
        out.push(...this.processInlineMarkdown(token.text));
      } else {
        out.push(token);
      }
    }
    return out;
  }

  processInlineMarkdown(text, depth = 0) {
    if (!text || depth > 10) {
      return [{ type: "text", text: text || "" }];
    }

    const patterns = [
      { regex: /<t:(\d{10})(?::([tTdDfFR]))?>/g, type: "timestamp" },
      { regex: /\*{3}([^*]+?)\*{3}/g, type: "bold_italic" },
      { regex: /_{2}([^_]+?)_{2}/g, type: "underline" },
      { regex: /\*{2}([^*]+?)\*{2}/g, type: "bold" },
      { regex: /~{2}([^~]+?)~{2}/g, type: "strikethrough" },
      { regex: /\*([^*]+?)\*/g, type: "italic" },
      { regex: /_([^_]+?)_/g, type: "italic" }
    ];

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

    if (!firstMatch) return [{ type: "text", text }];

    const result = [];
    const fullMatchStart = firstMatch.index;
    const fullMatchEnd = fullMatchStart + firstMatch[0].length;

    if (firstPattern.type === "timestamp") {
      if (fullMatchStart > 0) {
        result.push(...this.processInlineMarkdown(text.slice(0, fullMatchStart), depth + 1));
      }

      const unix = parseInt(firstMatch[1], 10);
      const style = firstMatch[2] || "f";

      result.push({
        type: "chat-markdown",
        markdown_type: "timestamp",
        text: this.formatTimestamp(unix, style),
        date: new Date(unix * 1000),
        style,
        unix
      });

      if (fullMatchEnd < text.length) {
        result.push(...this.processInlineMarkdown(text.slice(fullMatchEnd), depth + 1));
      }

    } else {
      const innerContent = firstMatch[1];

      if (fullMatchStart > 0) {
        result.push(...this.processInlineMarkdown(text.slice(0, fullMatchStart), depth + 1));
      }

      result.push({
        type: "chat-markdown",
        markdown_type: firstPattern.type,
        innerTokens: this.processInlineMarkdown(innerContent, depth + 1),
        text: innerContent
      });

      if (fullMatchEnd < text.length) {
        result.push(...this.processInlineMarkdown(text.slice(fullMatchEnd), depth + 1));
      }
    }

    return result;
  }

  checkForRelativeTimestamps(tokens) {
    for (const t of tokens) {
      if (t.type === "chat-markdown") {
        if (t.markdown_type === "timestamp" && t.style === "R") {
          this.hasRelativeTimestamps = true;
          return;
        }
        if (t.innerTokens?.length) {
          this.checkForRelativeTimestamps(t.innerTokens);
          if (this.hasRelativeTimestamps) return;
        }
      }
    }
  }

  formatTimestamp(unix, style) {
    const date = new Date(unix * 1000);

    switch (style) {
      case "t": return this.i18n.formatTime(date, "short");
      case "T": return this.i18n.formatTime(date, "medium");
      case "d": return this.i18n.formatDate(date);
      case "D": return this.i18n.formatDate(date, "long");
      case "f": return this.i18n.formatDateTime(date, "medium");
      case "F": return this.i18n.formatDateTime(date, "full");
      case "R": return this.i18n.toRelativeTime(date);
      default: return this.i18n.formatDateTime(date, "medium");
    }
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

    this.chat.addTokenizer(this.markdownTokenizer);

    this.updateTimer = setInterval(() => {
      if (!this.hasRelativeTimestamps) return;
      this.hasRelativeTimestamps = false;
      this.parent.emit("chat:update-lines");
    }, 60000);

    this.style.set("md-spoilers", `
      .trubbel-spoiler {
        background-color: #7b7c84 !important;
        color: transparent !important;
        cursor: pointer;
        border-radius: 3px;
        padding: 0 2px;
        transition: background-color 0.2s ease;
        user-select: none;
        white-space: pre-wrap !important;
      }
      .trubbel-spoiler:not(.trubbel-spoiler--revealed) * {
        opacity: 0 !important;
        pointer-events: none !important;
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

    this.style.set("md-timestamps", `
      .ffz-timestamp {
        background-color: #42434a;
        border-radius: 3px;
        padding: 0 2px;
      }
    `);

    this.parent.emit("chat:update-lines");
    this.isActive = true;
  }

  disableMarkdown() {
    if (!this.isActive) return;

    this.chat.removeTokenizer(this.markdownTokenizer);

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.style.has("md-spoilers")) this.style.delete("md-spoilers");
    if (this.style.has("md-timestamps")) this.style.delete("md-timestamps");

    this.parent.emit("chat:update-lines");
    this.isActive = false;
    this.hasRelativeTimestamps = false;
  }

  handleSpoilerClick(event) {
    const target = event.currentTarget;
    target.classList.toggle("trubbel-spoiler--revealed");
  }
}