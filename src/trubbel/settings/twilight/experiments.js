import { EppoManager } from "../../modules/twilight/experiments/eppo";

const { DEBUG } = FrankerFaceZ.utilities.constants;

const EPPO = "addon.trubbel.eppo-exp-lock";

export class Twilight_Experiments extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.inject("settings");
    this.inject("site");

    this.eppoManager = new EppoManager(this);

    this.settings.addUI("addon.trubbel.twilight.experiments.eppo", {
      path: "Add-Ons > Trubbel\u2019s Utilities > Overall > Experiments >> Eppo",
      component: () => import("../../components/main_menu/experiments-eppo.vue"),
      getExtraTerms: () => {
        const values = [];
        const flags = this.eppoManager.getEppoFlags();
        if (!Object.keys(flags).length) return values;
        for (const [key, flag] of Object.entries(flags)) {
          values.push(key);
          if (flag.variationType) values.push(flag.variationType);
          if (flag.variations) {
            for (const varKey of Object.keys(flag.variations)) {
              values.push(varKey);
            }
          }
        }
        return values;
      },
      eppo_data: () => this.eppoManager.getEppoFlags(),
      getAssignment: (key) => this.eppoManager.getAssignment(key),
      hasOverride: (key) => this.eppoManager.hasOverride(key),
      setOverride: (key, value) => this.eppoManager.setOverride(key, value),
      deleteOverride: (key) => this.eppoManager.deleteOverride(key),
      getVariationType: (key) => this.eppoManager.getVariationType(key),
      is_locked: () => this.getControlsLocked(),
      unlock: () => this.unlockControls(),
      on: (...args) => this.on(...args),
      off: (...args) => this.off(...args),
    });
  }

  onEnable() {
    this.eppoManager.initialize();
  }

  getControlsLocked() {
    if (DEBUG) return false;

    const ts = this.settings.provider.get(EPPO, 0);
    if (isNaN(ts) || !isFinite(ts)) return true;
    return Date.now() - ts >= 86400000;
  }

  unlockControls() {
    this.settings.provider.set(EPPO, Date.now());
  }
}