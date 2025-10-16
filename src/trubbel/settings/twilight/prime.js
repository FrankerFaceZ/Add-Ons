import { PrimeReminder } from "../../modules/twilight/prime/reminder";

export class Twilight_Prime extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("site.router");
    this.inject("site");

    this.primeReminder = new PrimeReminder(this);

    // Twilight - Prime - Reminder - Yet Another Prime Reminder
    this.settings.add("addon.trubbel.twilight.prime.yapr", {
      default: false,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Prime >> Reminder",
        title: "Yet Another Prime Reminder",
        description: "This is only meant for those who have Prime. It will automatically disable itself otherwise.\n\n**Notes:**\n\n• This checks once every hour to see if you have Prime and whether it is available.\n\n• If your Prime is available, a crown will be displayed next to the search bar at the top of the page.\n\n• Even if you use your Prime, the crown won't disappear until the next check occurs.",
        component: "setting-check-box"
      },
      changed: val => this.primeReminder.handleSettingChange(val)
    });
  }

  onEnable() {
    this.primeReminder.initialize();
  }
}