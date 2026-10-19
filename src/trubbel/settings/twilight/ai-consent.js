import GET_AI_CONSENT from "../../utilities/graphql/ai/ai-consent.gql";
import UPDATE_AI_CONSENT from "../../utilities/graphql/ai/update-ai-consent.gql";

const { createElement, ManagedStyle } = FrankerFaceZ.utilities.dom;
const { Tooltip } = FrankerFaceZ.utilities.tooltip;

const LOGO_CSS = `
.tw-animated-glitch-logo g[class*="ScEyes"] > path {
  d: path("M20.249,13.378L18.454,20.6H19.678L20.045,19.07H21.942L22.299,20.6H23.574L21.809,13.378Z M20.198,18.111L20.984,14.532H21.024L21.789,18.111Z M24.329,13.378H25.553V20.6H24.329Z") !important;
  fill-rule: evenodd !important;
  fill: red !important;
}
.tw-animated-glitch-logo polygon[class*="ScBody"] {
  fill: red !important;
}
`;

const BUTTON_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  verticalAlign: "middle",
  overflow: "hidden",
  userSelect: "none",
  width: "100%",
  height: "var(--button-size-default, 30px)",
  padding: "0 1rem",
  border: "none",
  borderRadius: ffz.settings.get("addon.trubbel.appearance.tweaks.form_control.border-radius") ? "0.4rem" : "var(--button-border-radius-default)",
  fontWeight: "var(--font-weight-semibold, 600)",
  fontSize: "var(--button-text-default, 13px)",
  backgroundColor: "var(--color-background-button-primary-default, #9147ff)",
  color: "var(--color-text-button-primary, #fff)",
  cursor: "pointer"
};

export class Twilight_AiConsent extends FrankerFaceZ.utilities.module.Module {
  constructor(...args) {
    super(...args);

    this.style = new ManagedStyle;

    this.inject("settings");
    this.inject("site");

    // Twilight - AI - Warning - Allow the AI warning to be displayed
    this.settings.add("addon.trubbel.twilight.ai_consent.warning", {
      default: true,
      ui: {
        sort: 0,
        path: "Add-Ons > Trubbel\u2019s Utilities > Overall > AI >> Warning",
        title: "Allow the AI warning to be displayed",
        description: "Checks whether **Training for Generative AI** is enabled on your Twitch account.\n\n**Note:** When disabled, no requests are made to check your AI training status.",
        component: "setting-check-box"
      },
      changed: val => val ? this.start() : this.stop()
    });

    this.GlitchLogo = this.site.children.elemental.define(
      "trubbel-ai-consent-logo", ".tw-animated-glitch-logo",
      null, null, 1
    );

    this.logoActive = false;
    this.listening = false;

    this.tooltip = null;
    this.tooltipTarget = null;
    this.disabling = false;
  }

  onEnable() {
    if (this.settings.get("addon.trubbel.twilight.ai_consent.warning")) this.start();
  }

  onDisable() {
    this.stop();
  }

  async start() {
    if (this.listening || !this.site.getUser()) return;

    this.listening = true;
    this.site.children.apollo.on(":response.UpdateAiConsent", this.handleConsentResponse, this);
    this.settings.provider.on("changed", this.handleProviderChange, this);

    let allowed;
    try {
      const result = await this.site.children.twitch_data.queryApollo({
        query: GET_AI_CONSENT,
        fetchPolicy: "network-only"
      });
      allowed = result?.data?.currentUser?.aiConsent?.isAiTrainingAllowed;
    } catch (err) {
      this.log.info("[AI Consent] Unable to fetch AI consent state.", err);
      return;
    }

    if (!this.listening) return;

    if (typeof allowed === "boolean") this.setState(allowed);
  }

  stop() {
    if (this.listening) {
      this.listening = false;
      this.site.children.apollo.off(":response.UpdateAiConsent", this.handleConsentResponse, this);
      this.settings.provider.off("changed", this.handleProviderChange, this);
    }

    this.removeLogo();
  }

  setState(allowed) {
    if (allowed) this.applyLogo();
    else this.removeLogo();
  }

  applyLogo() {
    if (this.logoActive) return;
    this.logoActive = true;

    this.style.set("ai-consent-logo", LOGO_CSS);

    this.GlitchLogo.on("mount", this.attachTooltip, this);
    this.GlitchLogo.on("unmount", this.detachTooltip, this);
    this.GlitchLogo.each(el => this.attachTooltip(el));
  }

  removeLogo() {
    if (!this.logoActive) return;
    this.logoActive = false;

    this.style.delete("ai-consent-logo");

    this.GlitchLogo.off("mount", this.attachTooltip, this);
    this.GlitchLogo.off("unmount", this.detachTooltip, this);
    this.detachTooltip();
  }

  attachTooltip(el) {
    if (this.tooltipTarget === el) return;
    this.detachTooltip();

    const parent = document.fullscreenElement || document.body.querySelector("#root>div") || document.body;

    this.tooltipTarget = el;
    this.tooltip = new Tooltip(parent, el, {
      logger: this.log,
      live: false,
      html: true,
      interactive: true,

      delayShow: 100,
      delayHide: 150,

      tooltipClass: "ffz-metadata-balloon ffz-balloon ffz-balloon--md tw-block tw-border tw-elevation-2 tw-border-radius-medium tw-c-background-base tw-c-text-base",
      arrowClass: "ffz-balloon__tail tw-overflow-hidden tw-absolute",
      arrowInner: "ffz-balloon__tail-symbol tw-border-t tw-border-r tw-border-b tw-border-l tw-border-radius-small tw-c-background-base tw-absolute",
      innerClass: "tw-block",

      popper: {
        placement: "bottom-start",
        modifiers: {
          preventOverflow: { boundariesElement: parent },
          flip: { behavior: ["bottom", "top"] }
        }
      },

      content: () => this.buildContent()
    });
  }

  detachTooltip(el) {
    if (el && el !== this.tooltipTarget) return;

    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
    this.tooltipTarget = null;
  }

  buildContent() {
    const status = (
      <div className="tw-c-text-error tw-mg-t-05" style={{ display: "none", fontSize: "1.2rem" }} />
    );

    const button = (
      <button
        style={BUTTON_STYLE}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--color-background-button-primary-hover, #772ce8)"}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = "var(--color-background-button-primary-default, #9147ff)"}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          this.disableAiTraining(button, status);
        }}
      >
        Disable AI Generative Training
      </button>
    );

    return (
      <div className="tw-pd-1" style={{ width: "30rem" }}>
        <p className="tw-mg-b-05">
          <strong>AI Generative Training is enabled.</strong>
        </p>
        <p className="tw-mg-b-05">
          Twitch has automatically enabled this setting by default, allowing channel content to be used to train generative AI content models at Amazon.
        </p>
        <p className="tw-c-text-alt-2 tw-mg-b-1" style={{ fontSize: "1.2rem" }}>
          You can opt out under <strong>Settings</strong> → <strong>Security and Privacy</strong> → <strong>Training for Generative AI</strong>, or just click the button below.
        </p>
        {button}
        {status}
      </div>
    );
  }

  async disableAiTraining(button, status) {
    if (this.disabling) return;
    this.disabling = true;

    button.disabled = true;
    button.style.opacity = "0.6";
    button.style.cursor = "wait";
    button.textContent = "Disabling…";
    status.style.display = "none";

    try {
      const result = await this.site.children.twitch_data.mutate({
        mutation: UPDATE_AI_CONSENT,
        variables: { input: { isAiTrainingAllowed: false } }
      });

      const code = result?.data?.updateAiConsent?.error?.code;
      if (code) throw new Error(code);

      this.handleConsentResponse(result?.data);
    } catch (err) {
      this.log.info("[AI Consent] Unable to disable AI training.", err);

      button.disabled = false;
      button.style.opacity = "";
      button.style.cursor = "pointer";
      button.textContent = "Try again";
      status.textContent = `Couldn’t disable AI training${err?.message ? ` (${err.message})` : ""}.`;
      status.style.display = "";
    } finally {
      this.disabling = false;
    }
  }

  handleConsentResponse(data) {
    const allowed = data?.updateAiConsent?.aiConsent?.isAiTrainingAllowed;
    if (typeof allowed !== "boolean") return;

    this.settings.provider.set("addon.trubbel.twilight.ai_consent.state", { allowed, at: Date.now() });
    this.setState(allowed);
  }

  handleProviderChange(key, value, deleted) {
    if (key !== "addon.trubbel.twilight.ai_consent.state" || deleted) return;
    if (typeof value?.allowed === "boolean") this.setState(value.allowed);
  }
}