<template>
<div class="cvc-gift-sub">
  <div v-if="error" class="cvc-gift-sub__message">
    <button class="cvc-badge-carousel__back" @click="$emit('back')">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13.5 14.5 9 10l4.5-4.5L12 4l-6 6 6 6 1.5-1.5z" />
      </svg>
      <span>{{ t("back", "Back") }}</span>
    </button>
    <p>{{ error }}</p>
  </div>
  <p v-else-if="loading" class="cvc-gift-sub__message">{{ t("loading", "Loading...") }}</p>
  <!-- Twitch's own gift page (GiftTierTabs) is rendered in here -->
  <div ref="root"></div>
</div>
</template>

<script>
const GIFT_TIER_TABS = m => m && m.pu === "sub-gift-select-back-button" && typeof m.T === "function";
const SUB_CHECKOUT = m => m && m.H2 === "SUB_CHECKOUT__PRODUCT" && typeof m.cd === "function";
const OPEN_CHECKOUT = m => m && typeof m.Z === "function" && String(m.Z).indexOf("core.ui.CHECKOUT_SHOWN") !== -1;
const CARD_LAYER = n => n && n.ViewerCard && typeof n.ViewerCard.getLoader === "function" && n.ExtensionMessageCard;
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));

export default {
  props: ["user", "getFFZ"],

  data() {
    return {
      loading: true,
      error: null
    }
  },

  async mounted() {
    try {
      var parts = await Promise.all([this.loadComponent(), this.loadProducts()]);
      if (this._destroyed) return;
      this.render(parts[0], parts[1]);
    } catch (err) {
      console.error("[ViewerCards] Unable to load gift sub page:", err);
      if (!this._destroyed) this.error = this.t("error", "Unable to load gifting right now.");
    } finally {
      if (!this._destroyed) this.loading = false;
    }
  },

  beforeDestroy() {
    this._destroyed = true;
    if (this._root) {
      this._root.unmount();
      this._root = null;
    }
  },

  methods: {
    t(key, phrase, data) {
      return this.getFFZ().resolve("i18n").t("addon.trubbel.viewer-cards.gift." + key, phrase, data);
    },

    async loadComponent() {
      var ffz = this.getFFZ(),
        munch = ffz.resolve("site.web_munch"),
        fine = ffz.resolve("site.fine");

      var layer = this._layer = fine.searchTree(null, CARD_LAYER, 1000);
      if (!layer) throw new Error("Twitch's viewer card layer was not found.");

      var mod = await munch.findModule("trubbel-gift-tier-tabs", GIFT_TIER_TABS);
      if (!mod) {
        // Not loaded yet: load Twitch's viewer card the way Twitch does, then look again
        // once FFZ has picked up the new modules (on the next frame)
        await layer.ViewerCard.getLoader()();
        await nextFrame();
        mod = await munch.findModule("trubbel-gift-tier-tabs", GIFT_TIER_TABS);
      }
      if (!mod) throw new Error("Twitch's gift page was not found.");
      return mod.T;
    },

    async loadProducts() {
      var twitch_data = this.getFFZ().resolve("site.twitch_data"),
        channel = this.user.channel;

      var result = await twitch_data.queryApollo(
        await import(/* webpackChunkName: "queries" */ "../../utilities/graphql/viewer_card/card-gift-sub.gql"),
        { channelLogin: channel.login, giftRecipientLogin: this.user.login, withStandardGifting: true },
        { fetchPolicy: "network-only" }
      );
      var data = result && result.data && result.data.channelUser,
        products = ((data && data.subscriptionProducts) || []).filter(function(p) { return p !== null; });
      if (!products.length) throw new Error("The channel has no subscription products.");

      this._channel = data;
      this._products = products;
      return products;
    },

    render(GiftTierTabs, products) {
      var site = this.getFFZ().resolve("site"),
        React = site.getReact(),
        ReactDOM = site.getReactDom(),
        channel = this._channel,
        self = this;

      var el = React.createElement(GiftTierTabs, {
        channelDisplayName: channel.displayName,
        channelId: channel.id,
        channelLogin: channel.login,
        subscriptionProducts: products,
        giftRecipient: this.user.login,
        giftRecipientID: this.user.id,
        handleSubMenuAction: this.handleSubMenuAction,
        onBack: function() { self.$emit("back"); },
        onClose: function() { self.$emit("close"); }
      });

      var layer = this._layer,
        fiber = layer && (layer._reactInternals || layer._reactInternalFiber);
      for (var f = fiber; f; f = f.return) {
        if (f.tag !== 10 || !f.type || !f.memoizedProps) continue;
        var ctx = f.type._context || f.type;
        el = React.createElement(ctx.Provider || ctx, { value: f.memoizedProps.value }, el);
      }

      this._root = ReactDOM.createRoot(this.$refs.root);
      this._root.render(el);
    },

    handleSubMenuAction(action) {
      if (!action || (action.action !== "buy_gift_sub" && action.action !== "buy_gift_sub_go_to_checkout")) return;

      var ffz = this.getFFZ(),
        site = ffz.resolve("site"),
        munch = ffz.resolve("site.web_munch"),
        store = site.store,
        subCheckout = munch.getModule("trubbel-sub-checkout", SUB_CHECKOUT);
      if (!store || !subCheckout) return;

      if (!site.getUser()) {
        store.dispatch(subCheckout.cd("viewer_card"));
        return;
      }

      var product = (this._products || []).find(function(p) { return p.tier === action.checkoutButtonTier; });
      if (!product) {
        subCheckout.Jv();
        return;
      }

      var checkout = munch.getModule("trubbel-open-checkout", OPEN_CHECKOUT);
      if (!checkout) return;

      store.dispatch(checkout.Z({
        isAnonymous: !!action.isAnonymous,
        productName: product.name,
        recipientLogin: action.giftRecipient || this.user.login,
        multiMonthGiftAmount: Number(action.multiMonthGiftAmount) || 0,
        offerID: action.offerID,
        trackingContext: { source: "viewer_card_click" }
      }));
    }
  }
}
</script>