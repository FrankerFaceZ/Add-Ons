import { notification } from "../../../utilities/notification";
import { findPlayer, findPlayerCore, getPayload, isPlayingContent } from "../../../utilities/player";

const { on, off } = FrankerFaceZ.utilities.dom;

const NON_RECOVERABLE_CODES = [401, 403, 404];
const NON_RECOVERABLE_TYPES = ["ErrorNotAvailable", "ErrorAuthorization", "ErrorNoSource"];

const LATENCY_CHECK_INTERVAL = 5000;
const LATENCY_RESET_COOLDOWN = 30000;

const LATENCY_THRESHOLD_LOW = 10;
const LATENCY_THRESHOLD_NORMAL = 15;

const LATENCY_WARMUP = 10000;

const LATENCY_MAX_FAILURES = 2;
const RESET_LOCK_TIMEOUT = 20000;

function basePath(path) {
  return path ? path.split("?")[0] : null;
}

class RateLimiter {
  constructor(maxAttempts, timeWindowMs) {
    this.maxAttempts = maxAttempts;
    this.timeWindowMs = timeWindowMs;
    this.attempts = [];
  }

  prune() {
    const now = Date.now();
    this.attempts = this.attempts.filter(t => now - t < this.timeWindowMs);
  }

  canAttempt() {
    this.prune();
    if (this.attempts.length >= this.maxAttempts)
      return false;

    this.attempts.push(Date.now());
    return true;
  }

  getRemainingTime() {
    this.prune();
    if (this.attempts.length < this.maxAttempts)
      return 0;

    return Math.max(0, this.attempts[0] + this.timeWindowMs - Date.now());
  }

  reset() {
    this.attempts = [];
  }
}

export default class PlayerReset {
  constructor(parent) {
    this.parent = parent;
    this.settings = parent.settings;
    this.router = parent.router;
    this.player = parent.player;
    this.log = parent.log;

    this.rateLimiter = new RateLimiter(4, 5 * 60 * 1000);
  }

  get enabled() {
    return this.settings.get("addon.trubbel.channel.player.auto_reset") ||
      this.settings.get("addon.trubbel.channel.player.latency_reset");
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
  }

  handleSettingChange() {
    for (const inst of this.player.PlayerSource.instances) {
      if (this.enabled)
        this.attach(inst);
      else
        this.detach(inst);

      this.updateLatencyTimer(inst);
    }

    if (!this.settings.get("addon.trubbel.channel.player.auto_reset"))
      this.rateLimiter.reset();
  }

  attach(inst) {
    const events = inst?.props?.playerEvents;
    if (!this.enabled || !events || inst._trubbel_reset)
      return;

    const state = inst._trubbel_reset = {
      events,
      latencyTimer: null,
      lastLatencyReset: 0,
      playedPath: null,
      resetting: false,
      resetTimer: null,
      onError: event => this.handleError(inst, getPayload(event)),
      onPlaying: () => this.onPlaying(inst)
    };

    on(events, "PlayerError", state.onError);
    on(events, "Playing", state.onPlaying);
    this.updateLatencyTimer(inst);

    if (isPlayingContent(inst.props))
      this.onPlaying(inst);
  }

  update(inst) {
    const state = inst?._trubbel_reset;
    if (!state)
      return this.attach(inst);

    if (inst.props.playerEvents !== state.events) {
      this.detach(inst);
      this.attach(inst);
    }
  }

  detach(inst) {
    const state = inst?._trubbel_reset;
    if (!state)
      return;

    off(state.events, "PlayerError", state.onError);
    off(state.events, "Playing", state.onPlaying);
    clearInterval(state.latencyTimer);
    clearTimeout(state.resetTimer);
    inst._trubbel_reset = null;
  }

  onPlaying(inst) {
    const state = inst._trubbel_reset;
    if (!state || !isPlayingContent(inst.props))
      return;

    state.playedPath = basePath(findPlayerCore(inst.props).state.path);
    state.resetting = false;
    clearTimeout(state.resetTimer);
  }

  resetPlayer(inst) {
    const state = inst._trubbel_reset;
    state.resetting = true;
    clearTimeout(state.resetTimer);
    state.resetTimer = setTimeout(() => state.resetting = false, RESET_LOCK_TIMEOUT);

    this.player.resetPlayer(inst);
    this.parent.emit("metadata:update", "player-stats");
  }

  handleError(inst, error) {
    if (!this.settings.get("addon.trubbel.channel.player.auto_reset"))
      return;

    const state = inst._trubbel_reset,
      core = findPlayerCore(inst.props);

    this.log.info("[Player Reset] PlayerError:", error, "state:", core?.state?.state, "path:", core?.state?.path);

    if (inst.props?.userTriggeredPause || !state || state.resetting)
      return;

    if (!core?.state?.path || basePath(core.state.path) !== state.playedPath) {
      this.log.info("[Player Reset] Ignoring error, this source hasn't played yet");
      return;
    }

    if (NON_RECOVERABLE_CODES.includes(error?.code) || NON_RECOVERABLE_TYPES.includes(error?.type)) {
      this.log.info(`[Player Reset] Ignoring non-recoverable error (${error?.type}, code ${error?.code})`);
      return;
    }

    if (!this.rateLimiter.canAttempt()) {
      const remaining = Math.ceil(this.rateLimiter.getRemainingTime() / 1000);
      this.log.warn(`[Player Reset] Rate limited, ${remaining}s remaining`);
      notification("", `[Auto Player Reset] Too many resets. Please wait ${remaining}s, or refresh the page manually.`, 15000);
      return;
    }

    const detail = error?.message || error?.type || "Playback error";
    this.log.info(`[Player Reset] Resetting player: ${detail} (code ${error?.code})`);

    this.resetPlayer(inst);
    notification("", `[Auto Player Reset] ${detail}`, 15000);
  }

  updateLatencyTimer(inst) {
    const state = inst?._trubbel_reset;
    if (!state)
      return;

    const wanted = this.settings.get("addon.trubbel.channel.player.latency_reset");

    if (wanted && !state.latencyTimer)
      state.latencyTimer = setInterval(() => this.checkLatency(inst), LATENCY_CHECK_INTERVAL);

    else if (!wanted && state.latencyTimer) {
      clearInterval(state.latencyTimer);
      state.latencyTimer = null;
    }
  }

  checkLatency(inst) {
    if (inst.props?.content?.type !== "live" || this.router.current_name === "front-page")
      return;

    const state = inst._trubbel_reset;
    if (!state || state.resetting || !isPlayingContent(inst.props))
      return;

    const player = findPlayer(inst.props),
      core = findPlayerCore(inst.props),
      now = Date.now();

    const latency = player?.getLiveLatency?.() ?? core.state?.liveLatency;
    if (!latency || latency <= 0)
      return;

    const session = core.state.sessionId || basePath(core.state.path);
    if (state.latencySession !== session) {
      const login = inst.props.content.channelLogin;
      if (state.latencyLogin !== login) {
        state.latencyLogin = login;
        state.latencyFailures = 0;
        state.latencyGaveUp = false;
      }

      state.latencySession = session;
      state.latencySessionStart = now;
      state.underThreshold = false;
    }

    if (now - state.latencySessionStart < LATENCY_WARMUP)
      return;

    const isLowLatency = !!core.state.liveLowLatency && core.state.liveLowLatencyEnabled !== false,
      threshold = isLowLatency ? LATENCY_THRESHOLD_LOW : LATENCY_THRESHOLD_NORMAL;

    if (latency <= threshold) {
      state.underThreshold = true;
      state.latencyFailures = 0;
      return;
    }

    if (now - state.lastLatencyReset < LATENCY_RESET_COOLDOWN)
      return;

    if (!state.underThreshold && state.latencyFailures >= LATENCY_MAX_FAILURES) {
      if (!state.latencyGaveUp) {
        state.latencyGaveUp = true;
        this.log.info(`[Player Reset] Latency still ${latency.toFixed(2)}s after ${state.latencyFailures} resets, pausing latency resets for this stream`);
      }
      return;
    }

    state.latencyGaveUp = false;
    state.latencyFailures = state.underThreshold ? 1 : (state.latencyFailures || 0) + 1;
    state.lastLatencyReset = now;

    const mode = isLowLatency ? "Low Latency" : "Normal Latency";
    this.log.info(`[Player Reset] Latency ${latency.toFixed(2)}s > ${threshold}s (${mode}), resetting player`);

    this.resetPlayer(inst);
    notification("", `[Latency Reset] Stream was ${latency.toFixed(1)}s behind live (threshold: ${threshold}s, ${mode})`, 15000);
  }
}