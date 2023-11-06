"use strict";
import { DEFAULT_SETTINGS } from "./constants";

/**
 * This addon is toggled on/off by the index addon (or enabled by default via setting),
 *  and performs the actual chat filtering.
 */
export default class Logic extends Addon {
  cache = new Map(); // message -> [expiry timestamp]
  cacheEvictionTimer;
  chatContext;
  RepetitionCounter;
  userId;

  constructor(...args) {
    super(...args);
    this.inject("chat");
    this.inject("settings");
    this.inject("site");
    this.chatContext = this.chat.context;
    this.userId = this.site?.getUser()?.id;
    this.cacheTtl =
      (this.settings.get("addon.declutter.cache_ttl") ??
        DEFAULT_SETTINGS.cache_ttl) * 1000;
  }

  /**
   * Calculates the degree of similarity of 2 strings based on Dices Coefficient
   * @param {string} first  First string for comparison
   * @param {string} second Second string for comparison
   * @returns {number} Degree of similarity in the range [0,1]
   * @see Original source code {@link https://github.com/aceakash/string-similarity}, MIT License
   */
  compareTwoStrings = (first, second) => {
    first = first.replace(/\s+/g, "");
    second = second.replace(/\s+/g, "");
    if (!first.length && !second.length) return 1;
    if (!first.length || !second.length) return 0;
    if (first === second) return 1;
    if (first.length === 1 && second.length === 1) {
      return first === second ? 1 : 0;
    }
    if (first.length < 2 || second.length < 2) return 0;
    const firstBigrams = new Map();
    for (let i = 0; i < first.length - 1; i++) {
      const bigram = first.substring(i, i + 2);
      const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) + 1 : 1;
      firstBigrams.set(bigram, count);
    }
    let intersectionSize = 0;
    for (let i = 0; i < second.length - 1; i++) {
      const bigram = second.substring(i, i + 2);
      const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) : 0;
      if (count > 0) {
        firstBigrams.set(bigram, count - 1);
        intersectionSize++;
      }
    }
    return (2.0 * intersectionSize) / (first.length + second.length - 2);
  };

  checkRepetitionAndCache = (message) => {
    const simThreshold =
      this.settings.get("addon.declutter.similarity_threshold") ??
      DEFAULT_SETTINGS.similarity_threshold;
    const repThreshold =
      this.settings.get("addon.declutter.repetitions_threshold") ??
      DEFAULT_SETTINGS.repetitions_threshold;
    let n = 0;
    for (const [msg, timestamps] of this.cache) {
      if (simThreshold === 100) {
        if (message.toLowerCase() === msg.toLowerCase()) {
          n += timestamps?.length ?? 1;
        }
      } else if (
        this.compareTwoStrings(message.toLowerCase(), msg.toLowerCase()) >
        simThreshold / 100
      ) {
        n += timestamps?.length ?? 1;
      }
      if (n >= repThreshold) {
        break;
      }
    }
    const existing = this.cache.get(message) ?? [];
    this.cache.set(message, [...existing, Date.now() + this.cacheTtl]);
    this.log.debug("(" + n + "): " + message);
    return n;
  };

  onEnable = () => {
    this.log.debug("Enabling Declutterer");
    this.updateConstants();
    this.chat.context.on(
      "changed:addon.declutter.cache_ttl",
      this.updateConstants,
      this
    );
    this.on("chat:receive-message", this.handleMessage, this);
  };

  updateConstants = () => {
    // Note any new value for cache TTL won't be picked up until re-enable
    this.cache_ttl = this.chat.context.get("addon.declutter.cache_ttl");
    // Cache eviction will happen 10x per TTL, at least once every 10s, max once per second
    this.startCacheEvictionTimer(
      Math.min(Math.max(1, Math.floor(this.cache_ttl / 10)), 10)
    );
  };

  onDisable = () => {
    this.log.debug("Disabling Declutterer");
    this.off("chat:receive-message", this.handleMessage, this);
    if (this.cacheEvictionTimer) {
      clearInterval(this.cacheEvictionTimer);
    }
    this.cache = new Map();
  };

  startCacheEvictionTimer = (intervalSeconds) => {
    if (this.cacheEvictionTimer) {
      clearInterval(this.cacheEvictionTimer);
    }
    this.cacheEvictionTimer = setInterval(() => {
      this.log.debug("Running cache eviction cycle");
      for (const [msg, timestamps] of this.cache) {
        const futureTimestamps =
          timestamps?.filter((time) => time > Date.now()) ?? [];
        if (futureTimestamps.length === 0) {
          this.cache.delete(msg);
        } else {
          this.cache.set(msg, futureTimestamps);
        }
      }
    }, intervalSeconds * 1000);
  };

  handleMessage = (event) => {
    if (!event.message || event.defaultPrevented) return;
    if (
      this.chatContext &&
      this.chatContext.get("context.moderator") &&
      !this.settings.get("addon.declutter.force_enable_when_mod")
    )
      return;
    const msg = event.message;
    if (msg.ffz_removed || msg.deleted || !msg.ffz_tokens) return;
    if (
      this.settings.get("addon.declutter.ignore_mods") &&
      (msg.badges.moderator || msg.badges.broadcaster)
    )
      return;
    if (msg.user && this.userId && msg.user.id == this.userId) {
      // Always show the user's own messages
      return;
    }
    if (!msg.repetitionCount && msg.repetitionCount !== 0) {
      msg.repetitionCount = this.checkRepetitionAndCache(msg.message);
    }
    const repThreshold =
      this.settings.get("addon.declutter.repetitions_threshold") ??
      DEFAULT_SETTINGS.repetitions_threshold;
    if (msg.repetitionCount >= repThreshold) {
      // Hide messages matching our filter
      event.preventDefault();
    }
  };
}
