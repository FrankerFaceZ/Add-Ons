const NewTransCore = FrankerFaceZ.utilities.i18n.TranslationCore;

const { ManagedStyle, on } = FrankerFaceZ.utilities.dom;
const { has } = FrankerFaceZ.utilities.object;

import { errorCodes } from "./utilities/constants";
import getClipOrVideo from "./utilities/get-clip-video";
import { collapseDrop } from "./utilities/collapsible-drops";
import { handleMouseEnter, handleMouseLeave } from "./utilities/thumbnail-previews";

const CLASSES = {
	"hide-side-nav-for-you": ".side-nav--expanded [aria-label=\"Left Navigation\"] .side-nav__title",
	"hide-side-nav-hype-train": ".side-nav-card-hype-train-bottom",
	"hide-player-muted-segments": ".video-player .muted-segments-alert__scroll-wrapper",
	"hide-stream-monthly-recap": "article:has(a[href^=\"/recaps/\"])",
	"hide-following-stories": "div[class^=\"Layout-sc-\"] > [data-simplebar=\"init\"] > div:nth-child(3) > :has(h2[class*=\"sr-only\"]:is([class^=\"CoreText-sc-\"]))",
	"hide-sponsored-content-chat-banner": ".stream-chat div :is(.channel-skins-banner__interactive)",
	"hide-sponsored-content-within-player": ".video-player :is(.channel-skins-overlay__background)",
	"hide-sponsored-content-below-player": ".channel-info-content div[style]:has(.channel-skins-ribbon__container)",
	"hide-player-live-badge": ".video-player .tw-channel-status-text-indicator",
};

class Trubbel extends Addon {
	constructor(...args) {
		super(...args);

		this.style = new ManagedStyle;

		this.inject("settings");
		this.inject("i18n");
		this.inject("chat");
		this.inject("site");
		this.inject("site.apollo");
		this.inject("site.fine");
		this.inject("site.css_tweaks");
		this.inject("site.router");
		this.inject("site.player");
		this.inject("site.twitch_data");

		// Clip & Video Timestamps
		this.settings.add("addon.trubbel.format.datetime-clip", {
			default: false,
			ui: {
				sort: 1,
				path: "Add-Ons > Trubbel\u2019s Utilities >> Clip & Video Timestamps",
				title: "Enable Custom Timestamp for Clips",
				description: "Show the full timestamp when a clip was created.",
				component: "setting-check-box"
			},
			changed: () => this.setClipOrVideoTimestamp()
		});

		// Clip & Video Timestamps
		this.settings.add("addon.trubbel.format.datetime-video", {
			default: false,
			ui: {
				sort: 2,
				path: "Add-Ons > Trubbel\u2019s Utilities >> Clip & Video Timestamps",
				title: "Enable Custom Timestamp for Videos",
				description: "Show the full timestamp when a video was created.",
				component: "setting-check-box"
			},
			changed: () => this.setClipOrVideoTimestamp()
		});

		// Clip & Video Timestamps
		this.settings.add("addon.trubbel.format.datetime", {
			default: "medium",
			ui: {
				sort: 3,
				path: "Add-Ons > Trubbel\u2019s Utilities >> Clip & Video Timestamps",
				title: "Timestamp Format",
				description: "The default combined timestamp format. Custom time formats are formatted using the [Day.js](https://day.js.org/docs/en/display/format) library.",
				component: "setting-combo-box",
				extra: {
					before: true,
					mode: "datetime",
					component: "format-preview"
				},
				data: () => {
					const out = [], now = new Date;
					for (const [key, fmt] of Object.entries(this._.formats.datetime)) {
						out.push({
							value: key, title: `${this.i18n.formatDateTime(now, key)} (${key})`
						})
					}
					return out;
				}
			},
			changed: val => {
				this._.defaultDateTimeFormat = val;
				this.emit(":update");
				this.setClipOrVideoTimestamp();
			}
		});

		// Clip & Video Timestamps
		this.settings.add("addon.trubbel.format.datetime-relative", {
			default: false,
			ui: {
				sort: 4,
				path: "Add-Ons > Trubbel\u2019s Utilities >> Clip & Video Timestamps",
				title: "Enable Relative Timestamp",
				description: "Include relative timestamp, such as `(2 days ago)`, `(2 months ago)`, `(2 years ago)` at the end.",
				component: "setting-check-box"
			},
			changed: () => this.setClipOrVideoTimestamp()
		});



		// Directory Page Previews -- "Enable"
		this.settings.add("addon.trubbel.directory.video-preview", {
			default: false,
			ui: {
				sort: 1,
				path: "Add-Ons > Trubbel\u2019s Utilities >> Directory Page Previews",
				title: "Enable Video Preview for Thumbnails",
				description: "Show a video preview when hovering over thumbnails.\n\n**Note:** If you keep seeing \"Click to unmute\", change permission for player.twitch.tv to allow audio/video autoplay.",
				component: "setting-check-box"
			},
		});

		// Directory Page Previews -- "Video Preview Quality"
		this.settings.add("addon.trubbel.directory.video-preview-quality", {
			default: "160p30",
			ui: {
				sort: 2,
				path: "Add-Ons > Trubbel\u2019s Utilities >> Directory Page Previews",
				title: "Video Preview Quality",
				description: "Change the quality for the previews to be shown in.",
				component: "setting-select-box",
				data: [
					{ title: "Auto", value: "auto" },
					{ title: "Source", value: "chunked" },
					{ title: "1080p60", value: "1080p60" },
					{ title: "720p60", value: "720p60" },
					{ title: "720p", value: "720p30" },
					{ title: "480p", value: "480p30" },
					{ title: "360p", value: "360p30" },
					{ title: "160p", value: "160p30" }
				]
			},
		});

		// Directory Page Previews -- "Enable Video Preview Audio"
		this.settings.add("addon.trubbel.directory.video-preview-audio", {
			default: false,
			ui: {
				sort: 4,
				path: "Add-Ons > Trubbel\u2019s Utilities >> Directory Page Previews",
				title: "Enable Video Preview Audio",
				description: "Please keep in mind that this is using your default volume for streams. Some streams may be loud.",
				component: "setting-check-box"
			},
		});



		// Player Errors -- "Enable Auto Reset on Error"
		this.settings.add("addon.trubbel.stream.player-errors", {
			default: false,
			ui: {
				sort: 1,
				path: "Add-Ons > Trubbel\u2019s Utilities >> Player Errors",
				title: "Enable Auto Reset on Error",
				description: "Automatically reset the player on any `\u00231000`, `\u00232000`, `\u00233000`, `\u00234000`, `\u00235000`-errors.",
				component: "setting-check-box"
			},
		});



		// Random Things -- "Collapsible Inventory Drops & Rewards"
		this.settings.add("addon.trubbel.random.collapsible-drops", {
			default: false,
			ui: {
				sort: 1,
				path: "Add-Ons > Trubbel\u2019s Utilities >> Random Things",
				title: "Collapsible Drops",
				description: "Collapsible Inventory Drops & Rewards.",
				component: "setting-check-box"
			},
			changed: () => this.collapsibleDrops()
		});

		// Random Things -- "Show Full Tooltips"
		this.settings.add("addon.trubbel.random.full-side-nav-tooltip", {
			default: false,
			ui: {
				sort: 1,
				path: "Add-Ons > Trubbel\u2019s Utilities >> Random Things",
				title: "Show Full Title Tooltips",
				description: "Show the full title tooltip when hovering over a stream in the left side navigation.",
				component: "setting-check-box"
			},
			changed: () => this.updateCSS()
		});



		// Remove/Hide Things -- "About Section, Panels"
		this.settings.add("addon.trubbel.hide.stream.about-panels", {
			default: false,
			ui: {
				path: "Add-Ons > Trubbel\u2019s Utilities >> Remove/Hide Things",
				title: "Hide About Section, Panels below Streams",
				component: "setting-check-box"
			},
			changed: () => this.updateCSS()
		});

		// Remove/Hide Things -- "For You"
		this.settings.add("addon.trubbel.hide.left-nav.for-you", {
			default: false,
			ui: {
				path: "Add-Ons > Trubbel\u2019s Utilities >> Remove/Hide Things",
				title: "Hide \"For You\"-text from Left Side Navigation",
				component: "setting-check-box"
			},
			changed: val => this.toggleHide("hide-side-nav-for-you", val)
		});

		// Remove/Hide Things -- "Hype Train"
		this.settings.add("addon.trubbel.hide.left-nav.hype-train", {
			default: false,
			ui: {
				path: "Add-Ons > Trubbel\u2019s Utilities >> Remove/Hide Things",
				title: "Hide \"Hype Train\" from Left Side Navigation",
				component: "setting-check-box"
			},
			changed: val => this.toggleHide("hide-side-nav-hype-train", val)
		});

		// Remove/Hide Things -- "Monthly Recap"
		this.settings.add("addon.trubbel.hide.stream.monthly-recap", {
			default: false,
			ui: {
				path: "Add-Ons > Trubbel\u2019s Utilities >> Remove/Hide Things",
				title: "Hide \"Monthly Recap\" below Streams",
				component: "setting-check-box"
			},
			changed: val => this.toggleHide("hide-stream-monthly-recap", val)
		});

		// Remove/Hide Things -- "LIVE-badge"
		this.settings.add("addon.trubbel.hide.player.live-badge", {
			default: false,
			ui: {
				path: "Add-Ons > Trubbel\u2019s Utilities >> Remove/Hide Things",
				title: "Hide \"LIVE\"-badge from the Player",
				component: "setting-check-box"
			},
			changed: val => this.toggleHide("hide-player-live-badge", val)
		});

		// Remove/Hide Things -- "Player Gradient"
		this.settings.add("addon.trubbel.hide.player.player-gradient", {
			default: false,
			ui: {
				path: "Add-Ons > Trubbel\u2019s Utilities >> Remove/Hide Things",
				title: "Hide \"Gradient\" from the Player",
				component: "setting-check-box"
			},
			changed: () => this.updateCSS()
		});

		// Remove/Hide Things -- "Player Muted Segments"
		this.settings.add("addon.trubbel.hide.player.muted-segments", {
			default: false,
			ui: {
				path: "Add-Ons > Trubbel\u2019s Utilities >> Remove/Hide Things",
				title: "Hide \"Player Muted Segments\"-popup from VODs",
				component: "setting-check-box"
			},
			changed: val => this.toggleHide("hide-player-muted-segments", val)
		});

		// Remove/Hide Things -- "Power-ups"
		this.settings.add("addon.trubbel.hide.stream.power-ups", {
			default: false,
			ui: {
				// sort: 2,
				path: "Add-Ons > Trubbel\u2019s Utilities >> Remove/Hide Things",
				title: "Hide \"Power-ups\" within the Rewards popup",
				component: "setting-check-box"
			},
			changed: () => this.updateCSS()
		});

		// Remove/Hide Things -- "Stories Following Page"
		this.settings.add("addon.trubbel.hide.following.stories", {
			default: false,
			ui: {
				// sort: 2,
				path: "Add-Ons > Trubbel\u2019s Utilities >> Remove/Hide Things",
				title: "Hide \"Stories\" in the Following Page",
				component: "setting-check-box"
			},
			changed: val => this.toggleHide("hide-following-stories", val)
		});

		// Remove/Hide Things -- "Sponsored content above stream chat"
		this.settings.add("addon.trubbel.hide.stream.sponsored-content-chat-banner", {
			default: false,
			ui: {
				path: "Add-Ons > Trubbel\u2019s Utilities >> Remove/Hide Things",
				title: "Hide sponsored content above stream chat",
				component: "setting-check-box"
			},
			changed: val => this.toggleHide("hide-sponsored-content-chat-banner", val)
		});

		// Remove/Hide Things -- "Sponsored content within the player"
		this.settings.add("addon.trubbel.hide.stream.sponsored-content-within-player", {
			default: false,
			ui: {
				path: "Add-Ons > Trubbel\u2019s Utilities >> Remove/Hide Things",
				title: "Hide sponsored content within the player",
				component: "setting-check-box"
			},
			changed: val => this.toggleHide("hide-sponsored-content-within-player", val)
		});

		// Remove/Hide Things -- "Sponsored content below the player"
		this.settings.add("addon.trubbel.hide.stream.sponsored-content-below-player", {
			default: false,
			ui: {
				path: "Add-Ons > Trubbel\u2019s Utilities >> Remove/Hide Things",
				title: "Hide sponsored content below the player",
				component: "setting-check-box"
			},
			changed: val => this.toggleHide("hide-sponsored-content-below-player", val)
		});

		// Remove/Hide Things -- "Remove line-through text"
		this.settings.add("addon.trubbel.hide.moderation.line-through", {
			default: false,
			ui: {
				sort: 99,
				path: "Add-Ons > Trubbel\u2019s Utilities >> Remove/Hide Things",
				title: "Remove line-through text in Unban Requests & User Cards",
				description: "Remove the line-through text in Unban Requests and within user cards moderated messages.",
				component: "setting-check-box"
			},
			changed: () => this.updateCSS()
		});


		this.Player = this.fine.define(
			"highwind-player",
			n => n.setPlayerActive && n.props?.playerEvents && n.props?.mediaPlayerInstance
		);


		this.handleMouseEnterListener = null;
		this.handleMouseLeaveListener = null;


		this.site.router.on(":route", (route, match) => {
			if (match && match[0] == "/inventory") {
				this.collapsibleDrops();
			}
		});
	}

	async onLoad() {
	}

	onEnable() {
		this._ = new NewTransCore({
			warn: (...args) => this.log.warn(...args),
			defaultDateTimeFormat: this.settings.get("addon.trubbel.format.datetime")
		});

		this.on("addon.trubbel.format.datetime-clip", () => this.setClipOrVideoTimestamp());
		this.on("addon.trubbel.format.datetime-video", () => this.setClipOrVideoTimestamp());

		this.on("site.router:route", this.setClipOrVideoTimestamp, this);
		this.setClipOrVideoTimestamp();

		this.on("settings:changed:addon.trubbel.directory.video-preview", () => this.updatePreview());
		this.on("settings:changed:addon.trubbel.directory.video-preview-quality", () => this.updatePreview());
		this.on("settings:changed:addon.trubbel.directory.video-preview-audio", () => this.updatePreview());
		this.settings.getChanges("addon.trubbel.directory.video-preview", enabled => this.updatePreview(enabled));
		this.updatePreview();

		this.Player.ready((cls, instances) => {
			for (const inst of instances) {
				const events = inst.props?.playerEvents;

				if (events) {
					const playerErrorHandler = async (error) => {
						if (!this.settings.get("addon.trubbel.stream.player-errors")) return;

						const player = inst?.props?.mediaPlayerInstance;
						const state = player?.core?.state?.state;

						if (player?.isPaused() && state === "Idle") {
							const video = inst?.props?.mediaPlayerInstance?.core?.mediaSinkManager?.video;
							if (!video.getAttribute("src")) {

								const metadataElement = await this.site.awaitElement(".content-overlay-gate");
								if (metadataElement) {
									const hasError = errorCodes.some(code => metadataElement.textContent.includes(code));
									if (hasError) {
										this.site.children.player.resetPlayer(this.site.children.player.current);
									}
								}
							}
						}
					};

					on(events, "PlayerError", playerErrorHandler);
				}
			}
		});

		this.toggleHide("hide-side-nav-for-you", this.settings.get("addon.trubbel.hide.left-nav.for-you"));
		this.toggleHide("hide-side-nav-hype-train", this.settings.get("addon.trubbel.hide.left-nav.hype-train"));
		this.toggleHide("hide-player-muted-segments", this.settings.get("addon.trubbel.hide.player.muted-segments"));
		this.toggleHide("hide-stream-monthly-recap", this.settings.get("addon.trubbel.hide.stream.monthly-recap"));
		this.toggleHide("hide-following-stories", this.settings.get("addon.trubbel.hide.following.stories"));
		this.toggleHide("hide-sponsored-content-chat-banner", this.settings.get("addon.trubbel.hide.stream.sponsored-content-chat-banner"));
		this.toggleHide("hide-sponsored-content-within-player", this.settings.get("addon.trubbel.hide.stream.sponsored-content-within-player"));
		this.toggleHide("hide-sponsored-content-below-player", this.settings.get("addon.trubbel.hide.stream.sponsored-content-below-player"));
		this.toggleHide("hide-player-live-badge", this.settings.get("addon.trubbel.hide.player.live-badge"));

		this.updateCSS();

		this.settings.getChanges("addon.trubbel.random.collapsible-drops", () => this.collapsibleDrops());
		this.collapsibleDrops();
	}


	collapsibleDrops() {
		const enabled = this.settings.get("addon.trubbel.random.collapsible-drops");
		if (enabled) {
			collapseDrop();
		} else {
			window.localStorage.removeItem("ffzCollapsibleDrops");
		}
	}


	onDisable() {
		if (this.handleMouseEnterListener) {
			document.removeEventListener("mouseenter", this.handleMouseEnterListener, true);
		}
		if (this.handleMouseLeaveListener) {
			document.removeEventListener("mouseleave", this.handleMouseLeaveListener, true);
		}

		const previews = document.querySelectorAll(".stream-preview");
		previews.forEach(preview => preview.remove());

		this.handleMouseEnterListener = null;
		this.handleMouseLeaveListener = null;
	}


	setClipOrVideoTimestamp() {
		getClipOrVideo(this);
	}


	handleMouseEnter(event, settings) {
		handleMouseEnter(event, settings);
	}

	handleMouseLeave(event) {
		handleMouseLeave(event);
	}

	async updatePreview(enabled = this.settings.get("addon.trubbel.directory.video-preview")) {
		if (!enabled) {
			this.onDisable();
			return;
		}

		if (this.handleMouseEnterListener && this.handleMouseLeaveListener) {
			return;
		}

		this.handleMouseEnterListener = (event) => {
			const settings = {
				quality: this.settings.get("addon.trubbel.directory.video-preview-quality"),
				muted: this.settings.get("addon.trubbel.directory.video-preview-audio"),
			};
			this.handleMouseEnter(event, settings);
		};

		this.handleMouseLeaveListener = (event) => this.handleMouseLeave(event);

		document.addEventListener("mouseenter", this.handleMouseEnterListener, true);
		document.addEventListener("mouseleave", this.handleMouseLeaveListener, true);
	}

	toggleHide(key, val) {
		const k = `hide--${key}`;
		if (!val) {
			this.style.delete(k);
			return;
		}

		if (!has(CLASSES, key)) {
			throw new Error(`cannot find class for "${key}"`);
		}

		this.style.set(k, `${CLASSES[key]} { display: none !important }`);
	}

	updateCSS() {
		if (this.settings.get("addon.trubbel.hide.player.player-gradient")) {
			this.css_tweaks.set("hide-player-gradient", ".video-player .top-bar, .video-player .player-controls { background: transparent !important; }");
		} else {
			this.css_tweaks.delete("hide-player-gradient");
		}

		if (this.settings.get("addon.trubbel.random.full-side-nav-tooltip")) {
			this.css_tweaks.set("show-full-side-nav-tooltip1", ".tw-balloon :has(.online-side-nav-channel-tooltip__body) { max-width: none !important; }");
			this.css_tweaks.set("show-full-side-nav-tooltip2", ".online-side-nav-channel-tooltip__body :is(p) { display: block !important; -webkit-line-clamp: unset !important; -webkit-box-orient: unset !important; overflow: visible !important; text-overflow: unset !important; }");
			this.css_tweaks.set("show-full-side-nav-tooltip3", ".tw-balloon :has(.side-nav-guest-star-tooltip__body) { max-width: none !important; }");
			this.css_tweaks.set("show-full-side-nav-tooltip4", ".side-nav-guest-star-tooltip__body :is(p) { display: block !important; -webkit-line-clamp: unset !important; -webkit-box-orient: unset !important; overflow: visible !important; text-overflow: unset !important; }");
		} else {
			this.css_tweaks.delete("show-full-side-nav-tooltip1");
			this.css_tweaks.delete("show-full-side-nav-tooltip2");
			this.css_tweaks.delete("show-full-side-nav-tooltip3");
			this.css_tweaks.delete("show-full-side-nav-tooltip4");
		}

		if (this.settings.get("addon.trubbel.hide.stream.about-panels")) {
			this.css_tweaks.set("hide-stream-about-panels1", "[id=\"live-channel-about-panel\"], .channel-panels { display: none !important; }");
			this.css_tweaks.set("hide-stream-about-panels2", ".channel-info-content :is(div[style^=\"min-height:\"]) { min-height: 0px !important; }");
			this.css_tweaks.set("hide-stream-about-panels3", ".channel-info-content :is(.tw-tower:has(.tw-placeholder-wrapper)) { display: none !important; }");
		} else {
			this.css_tweaks.delete("hide-stream-about-panels1");
			this.css_tweaks.delete("hide-stream-about-panels2");
			this.css_tweaks.delete("hide-stream-about-panels3");
		}

		if (this.settings.get("addon.trubbel.hide.stream.power-ups")) {
			this.css_tweaks.set("hide-stream-power-ups1", ".rewards-list :is([class*=\"bitsRewardListItem--\"]) { display: none !important; }");
			this.css_tweaks.set("hide-stream-power-ups2", ".rewards-list > div:first-child:has(.tw-title:only-child) { display: none !important; }");
			this.css_tweaks.set("hide-stream-power-ups3", ".rewards-list > :is(div:has(> div > .tw-title)) { padding: 0rem 0.5rem 1rem !important; }");
		} else {
			this.css_tweaks.delete("hide-stream-power-ups1");
			this.css_tweaks.delete("hide-stream-power-ups2");
			this.css_tweaks.delete("hide-stream-power-ups3");
		}

		if (this.settings.get("addon.trubbel.hide.moderation.line-through")) {
			this.css_tweaks.set("remove-line-through-text1", ".mod-logs-entry-list .chat-line__message--deleted-detailed { text-decoration: none !important; }");
			this.css_tweaks.set("remove-line-through-text2", ".mod-logs-entry-list .chat-line__message--emote-button span::before { border-color: transparent !important; }");
		} else {
			this.css_tweaks.delete("remove-line-through-text1");
			this.css_tweaks.delete("remove-line-through-text2");
		}
	}
}

Trubbel.register();
