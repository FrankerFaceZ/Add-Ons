import ClipsSubdomain from "../../modules/twilight/clips/subdomain";
import DownloadClips from "../../modules/channel/player/download-clips";

export class Twilight_Clips extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("site");
    this.inject("site.fine");
    this.inject("site.router");
    this.inject("site.player");

    this.clipsSubdomain = new ClipsSubdomain(this);
    this.downloadClips = new DownloadClips(this);

    // Twilight - Clips - Subdomain - Stay on clips subdomain
    this.settings.add("addon.trubbel.twilight.clips.subdomain", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Clips >> Subdomain",
        title: "Stay on clips subdomain",
        description: "Prevents Twitch from redirecting you from `clips.twitch.tv` to `www.twitch.tv/channel/clip/` when browsing clips.",
        component: "setting-check-box"
      },
      changed: val => this.clipsSubdomain.handleSettingChange(val)
    });



    // Channel - Player - Clips - Download
    this.settings.add("addon.trubbel.channel.player.clip.download", {
      default: false,
      ui: {
        path: "Add-Ons > Trubbel\u2019s Utilities > Channel > Player >> Clips",
        title: "Display Download Button on Clips",
        component: "setting-check-box"
      },
      changed: val => this.downloadClips.handleSettingChange(val)
    });
  }

  onEnable() {
    this.router.on(":route", this.navigate, this);
    this.clipsSubdomain.initialize();
    this.downloadClips.initialize();
  }

  async navigate() {
    this.clipsSubdomain.handleNavigation();
    this.downloadClips.handleNavigation();
  }
}