import {
  findPlayer,
  findPlayerCore,
  findBestQuality,
  isPlayingContent,
  normalizeQuality,
  resolveQuality,
  setFixedQuality,
  setVolume
} from "../../../utilities/player";

const { on, off } = FrankerFaceZ.utilities.dom;

const STORAGE_KEY = "addon.trubbel.channel.player.channel_specific";
const BEST_QUALITY_COOLDOWN = 5000;
const COMPRESSOR_INITIAL_DELAY = 1000;
const COMPRESSOR_RETRY_DELAY = 1000;
const COMPRESSOR_MAX_ATTEMPTS = 8;

export default class PlayerPlayback {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.site = parent.site;
    this.player = parent.player;
    this.log = parent.log;

    this.onVisibilityChange = this.onVisibilityChange.bind(this);
  }

  get channelSpecificEnabled() {
    return this.settings.get("addon.trubbel.channel.player.channel_specific.enabled");
  }

  get alwaysBestEnabled() {
    return this.settings.get("addon.trubbel.channel.player.quality.always_best");
  }

  get keepVisibleEnabled() {
    return this.settings.get("addon.trubbel.channel.player.quality.keep_visible");
  }

  get adMuteEnabled() {
    return this.settings.get("addon.trubbel.channel.player.ads.mute");
  }

  get enabled() {
    return this.channelSpecificEnabled || this.alwaysBestEnabled || this.adMuteEnabled;
  }

  initialize() {
    const PlayerSource = this.player.PlayerSource;

    PlayerSource.on("mount", this.attach, this);
    PlayerSource.on("update", this.update, this);
    PlayerSource.on("unmount", this.detach, this);

    PlayerSource.ready((cls, instances) => {
      for (const inst of instances)
        this.attach(inst);
    });

    this.updateVisibilityHook();
  }

  handleSettingChange() {
    for (const inst of this.player.PlayerSource.instances) {
      if (this.enabled) {
        this.attach(inst);
        this.enforceBestQuality(inst);
      } else
        this.detach(inst);
    }

    this.updateVisibilityHook();
  }

  getLogin(inst) {
    return inst?.props?.content?.channelLogin?.toLowerCase() || null;
  }

  getChannelConfig(login) {
    if (!login || !this.channelSpecificEnabled)
      return null;

    const all = this.settings.provider.get(STORAGE_KEY) || {};
    return all[login] || null;
  }

  attach(inst) {
    const events = inst?.props?.playerEvents;
    if (!this.enabled || !events || inst._trubbel_playback)
      return;

    const state = inst._trubbel_playback = {
      events,
      appliedFor: null,
      lastBestQuality: 0,
      adMuted: false,
      onPlaying: () => this.onPlaying(inst),
      onQualityChanged: () => this.enforceBestQuality(inst),
      onAdBreakStarted: data => this.onAdBreakStarted(inst, data),
      onAdBreakEnded: data => this.onAdBreakEnded(inst, data)
    };

    on(events, "Playing", state.onPlaying);
    on(events, "PlayerQualityChanged", state.onQualityChanged);
    on(events, "PlayerAdBreakStarted", state.onAdBreakStarted);
    on(events, "PlayerAdBreakEnded", state.onAdBreakEnded);

    if (isPlayingContent(inst.props))
      this.onPlaying(inst);
  }

  update(inst) {
    const state = inst?._trubbel_playback;
    if (!state)
      return this.attach(inst);

    if (inst.props.playerEvents !== state.events) {
      this.detach(inst);
      this.attach(inst);
    }
  }

  detach(inst) {
    const state = inst?._trubbel_playback;
    if (!state)
      return;

    off(state.events, "Playing", state.onPlaying);
    off(state.events, "PlayerQualityChanged", state.onQualityChanged);
    off(state.events, "PlayerAdBreakStarted", state.onAdBreakStarted);
    off(state.events, "PlayerAdBreakEnded", state.onAdBreakEnded);

    clearTimeout(state.compressorTimer);

    this.restoreAdMute(inst);
    inst._trubbel_playback = null;
  }

  onPlaying(inst) {
    const state = inst._trubbel_playback;
    if (!state || this.router.current_name === "front-page" || !isPlayingContent(inst.props))
      return;

    const login = this.getLogin(inst),
      core = findPlayerCore(inst.props),
      session = core.state.sessionId || core.state.path;

    if (state.appliedFor !== login) {
      if (state.adMuted && state.adLogin !== login)
        this.restoreAdMute(inst);

      if (state.compressedFor && state.compressedFor !== login)
        this.restoreCompressor(inst);

      state.appliedFor = login;
      state.session = session;
      this.applyChannelSettings(inst, login, true);

    } else if (state.session !== session) {
      state.session = session;
      this.applyChannelSettings(inst, login, false);
    }

    this.enforceBestQuality(inst);
  }

  applyChannelSettings(inst, login, first) {
    const config = this.getChannelConfig(login);
    if (!config)
      return;

    this.log.info(`[Channel Specific] Applying settings for ${login}${first ? "" : " (player reloaded)"}`, config);

    if (typeof config.volume === "number" && !setVolume(inst.props, config.volume))
      this.log.info("[Channel Specific] Volume skipped (FFZ Gain Control is controlling volume)");

    const option = normalizeQuality(config.quality),
      player = findPlayer(inst.props);

    if (option === "auto")
      player?.setAutoQualityMode?.(true);
    else if (option !== "unset")
      setFixedQuality(player, resolveQuality(player, option));

    if (!first)
      return;

    if (config.compressor === true)
      this.enableCompressor(inst, login);

    if (config.hideChat === true)
      this.hideChat();
  }

  getFFZPlayer(inst) {
    const player = findPlayer(inst.props);
    for (const ffz_inst of this.player.Player.instances)
      if (findPlayer(ffz_inst.props) === player)
        return ffz_inst;
    return null;
  }

  getVideo(inst) {
    return findPlayerCore(inst.props)?.mediaSinkManager?.video ?? null;
  }

  enableCompressor(inst, login) {
    if (this.settings.get("player.compressor.enable"))
      this.scheduleCompressor(inst, login, 0);
  }

  scheduleCompressor(inst, login, attempt) {
    const state = inst._trubbel_playback;
    if (!state)
      return;

    clearTimeout(state.compressorTimer);
    state.compressorTimer = setTimeout(
      () => this.tryCompressor(inst, login, attempt),
      attempt ? COMPRESSOR_RETRY_DELAY : COMPRESSOR_INITIAL_DELAY
    );
  }

  tryCompressor(inst, login, attempt) {
    const state = inst._trubbel_playback;
    if (!state || this.getLogin(inst) !== login)
      return;

    state.compressorTimer = null;

    const ffz_inst = this.getFFZPlayer(inst),
      video = this.getVideo(inst);

    if (video?._ffz_compressed) {
      state.compressedFor = login;
      this.log.info(`[Channel Specific] Compressor enabled for ${login} (attempt ${attempt + 1})`);
      return;
    }

    if (ffz_inst && video && isPlayingContent(inst.props) && this.player.canCompress(ffz_inst))
      this.player.compressPlayer(ffz_inst, { preventDefault() {} });

    if (attempt + 1 < COMPRESSOR_MAX_ATTEMPTS)
      this.scheduleCompressor(inst, login, attempt + 1);
    else
      this.log.warn(`[Channel Specific] Unable to enable compressor for ${login}. The browser may be blocking audio until you interact with the page.`);
  }

  restoreCompressor(inst) {
    const state = inst._trubbel_playback,
      ffz_inst = this.getFFZPlayer(inst),
      video = this.getVideo(inst);

    clearTimeout(state.compressorTimer);
    state.compressorTimer = null;
    state.compressedFor = null;

    if (!ffz_inst || !video || !video._ffz_toggled || !video._ffz_state)
      return;

    if (!this.player.canCompress(ffz_inst))
      return;

    video._ffz_toggled = false;
    this.player.compressPlayer(ffz_inst);
  }

  enforceBestQuality(inst) {
    const state = inst?._trubbel_playback;
    if (!state || !this.alwaysBestEnabled || this.router.current_name === "front-page")
      return;

    if (!isPlayingContent(inst.props))
      return;

    const config = this.getChannelConfig(this.getLogin(inst));
    if (config && normalizeQuality(config.quality) !== "unset")
      return;

    const now = Date.now();
    if (now - state.lastBestQuality < BEST_QUALITY_COOLDOWN)
      return;

    const player = findPlayer(inst.props),
      best = findBestQuality(player);

    if (setFixedQuality(player, best)) {
      state.lastBestQuality = now;
      this.log.info("[Always Best Quality] Switched to", best.group);
    }
  }

  onAdBreakStarted(inst, data) {
    this.log.info("[Ad Mute] PlayerAdBreakStarted:", data);

    const state = inst._trubbel_playback,
      player = findPlayer(inst.props);

    if (!state || !this.adMuteEnabled || !player?.setMuted)
      return;

    if (state.adMuted || player.isMuted?.())
      return;

    player.setMuted(true);
    state.adMuted = true;
    state.adLogin = this.getLogin(inst);
    this.log.info("[Ad Mute] Muted for ad break");
  }

  onAdBreakEnded(inst, data) {
    this.log.info("[Ad Mute] PlayerAdBreakEnded:", data);
    this.restoreAdMute(inst);
  }

  restoreAdMute(inst) {
    const state = inst?._trubbel_playback;
    if (!state?.adMuted)
      return;

    state.adMuted = false;

    const player = findPlayer(inst.props);
    if (player?.isMuted?.()) {
      player.setMuted(false);
      this.log.info("[Ad Mute] Unmuted after ad break");
    }
  }

  hideChat() {
    const store = this.site?.store;
    if (store && !store.getState()?.chat?.isHidden)
      store.dispatch({ type: "chat.CHAT_HIDDEN" });
  }

  updateVisibilityHook() {
    if (this.keepVisibleEnabled && !this._visibility_hooked) {
      on(document, "visibilitychange", this.onVisibilityChange);
      this._visibility_hooked = true;

    } else if (!this.keepVisibleEnabled && this._visibility_hooked) {
      off(document, "visibilitychange", this.onVisibilityChange);
      this._visibility_hooked = false;
    }
  }

  onVisibilityChange() {
    if (document.visibilityState !== "hidden")
      return;

    Promise.resolve().then(() => {
      for (const inst of this.player.PlayerSource.instances)
        findPlayer(inst.props)?.setVisible?.(true);
    });
  }
}