import { BAD_USERS } from "../../../utilities/constants/types";

export default class PredictionNotifications {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.log = parent.log;

    this.isActive = false;

    this.notifiedPredictions = new Set();

    this.handleNavigation = this.handleNavigation.bind(this);
    this.enableNotifications = this.enableNotifications.bind(this);
    this.disableNotifications = this.disableNotifications.bind(this);
    this.handleSettingChange = this.handleSettingChange.bind(this);
    this.checkForPredictions = this.checkForPredictions.bind(this);
  }

  initialize() {
    const enabled = this.settings.get("addon.trubbel.channel.chat.prediction.notifications");
    if (enabled) {
      this.handleNavigation();
    } else {
      this.disableNotifications();
    }
  }

  handleSettingChange(enabled) {
    if (enabled) {
      this.log.info("[Prediction Notifications] Enabling");
      this.handleNavigation();
    } else {
      this.log.info("[Prediction Notifications] Disabling");
      this.disableNotifications();
    }
  }

  handleNavigation() {
    this.notifiedPredictions.clear();

    const chatRoutes = this.site.constructor.CHAT_ROUTES;
    const currentRoute = this.router?.current?.name;

    let pathname;
    if (this.router?.match?.[1]) {
      pathname = this.router.match[1];
    } else {
      const segments = this.router?.location?.split("/").filter(s => s.length > 0);
      pathname = segments?.[0];
    }

    if (chatRoutes.includes(currentRoute) && pathname && !BAD_USERS.includes(pathname)) {
      const enabled = this.settings.get("addon.trubbel.channel.chat.prediction.notifications");
      if (enabled && !this.isActive) {
        this.log.info("[Prediction Notifications] Entering chat page, enabling");
        this.enableNotifications();
      }
    } else {
      if (this.isActive) {
        this.log.info("[Prediction Notifications] Leaving chat page, disabling");
        this.disableNotifications();
      }
    }
  }

  enableNotifications() {
    if (this.isActive) return;
    this.isActive = true;

    const ChatContainer = this.site.children.chat.ChatContainer;
    if (ChatContainer) {
      ChatContainer.on("mount", this.checkForPredictions, this);
      ChatContainer.on("update", this.checkForPredictions, this);
    }

    this.checkForPredictions();
  }

  disableNotifications() {
    if (!this.isActive) return;
    this.isActive = false;

    const ChatContainer = this.site.children.chat.ChatContainer;
    if (ChatContainer) {
      ChatContainer.off("mount", this.checkForPredictions, this);
      ChatContainer.off("update", this.checkForPredictions, this);
    }
  }

  async checkForPredictions() {
    if (!this.isActive) return;

    const highlights = this.site.children.chat.community_stack?.highlights;
    if (!highlights) return;

    for (const entry of highlights) {
      const event = entry?.event;

      if (
        event?.type === "prediction" &&
        event?.typeDetails === "prediction_started" &&
        event?.predictionID &&
        event?.channelLogin
      ) {
        const key = `${event.channelLogin}:${event.predictionID}`;
        if (this.notifiedPredictions.has(key)) continue;

        this.notifiedPredictions.add(key);
        this.log.info("[Prediction Notifications] New prediction started:", key);
        await this.sendNotification(event);
      }
    }
  }

  getPredictionData(predictionID) {
    const fine = this.parent.resolve("site.fine");

    const elements = document.querySelectorAll(".community-highlight .highlight");
    if (!elements.length) {
      this.log.info("[Prediction Notifications] No .community-highlight .highlight elements found");
      return null;
    }

    for (const el of elements) {
      const node = fine.searchNode(
        fine.getReactInstance(el),
        n => n?.memoizedProps?.prediction?.id === predictionID,
        25
      );

      if (node) {
        const prediction = node.memoizedProps.prediction;
        this.log.info("[Prediction Notifications] Found prediction data via fine.searchNode:", prediction);
        return prediction;
      }
    }

    this.log.info("[Prediction Notifications] Could not find prediction data in any .community-highlight .highlight");
    return null;
  }

  async requestPermission() {
    if (!("Notification" in window)) {
      this.log.info("[Prediction Notifications] Browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;

    const result = await Notification.requestPermission();
    return result === "granted";
  }

  async sendNotification(event) {
    this.log.info("[Prediction Notifications] sendNotification event:", event);

    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      this.log.info("[Prediction Notifications] Permission denied, cannot notify");
      return;
    }

    // Respect the "only when unfocused" setting
    const onlyUnfocused = this.settings.get(
      "addon.trubbel.channel.chat.prediction.notifications.only_unfocused"
    );
    if (onlyUnfocused && document.hasFocus()) {
      this.log.info("[Prediction Notifications] Tab is focused, skipping notification");
      return;
    }

    const channel = event.channelLogin;
    const requireInteraction = this.settings.get(
      "addon.trubbel.channel.chat.prediction.notifications.require_interaction"
    );

    const prediction = this.getPredictionData(event.predictionID);
    const title = prediction?.title ?? "A prediction has started";
    const outcomes = prediction?.outcomes?.map(o => o.title).join(" vs ") ?? "";
    const windowSecs = prediction?.predictionWindowSeconds
      ? ` (${Math.round(prediction.predictionWindowSeconds / 60)} min)`
      : "";

    const body = [title + windowSecs, outcomes].filter(Boolean).join("\n");

    let icon = "https://www.twitch.tv/favicon.ico";
    try {
      const twitch_data = this.parent.resolve("site.twitch_data");
      const user = twitch_data ? await twitch_data.getUser(null, channel) : null;
      if (user?.profileImageURL) {
        icon = user.profileImageURL.replace("50x50", "300x300");
        this.log.info("[Prediction Notifications] Resolved channel avatar:", icon);
      }
    } catch (err) {
      this.log.info("[Prediction Notifications] Could not resolve channel avatar, using fallback:", err);
    }

    this.log.info("[Prediction Notifications] Sending notification:", { channel, body, icon });

    try {
      const notification = new Notification(`Prediction — ${channel}`, {
        body,
        icon,
        tag: `ffz-prediction-${event.predictionID}`,
        requireInteraction,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (err) {
      this.log.info("[Prediction Notifications] Failed to create notification:", err);
    }
  }
}