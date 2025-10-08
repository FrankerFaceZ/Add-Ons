<!-- Borrowed from:
  https://github.com/FrankerFaceZ/Add-Ons/blob/5fd548b06a25dbd0b8caeddeca8e5477f0fe6517/src/ffzap-core/components/preview.vue
	-->
<template lang="html">
	<div>
		<button
			class="tw-mg-l-05 tw-mg-y-05 tw-button tw-button--text ffz-il-tooltip__container tw-relative"
			@click="click"
		>
			<span class="tw-button__text ffz-i-play" />
			<div class="ffz-il-tooltip ffz-il-tooltip--right ffz-il-tooltip--align-right">
				{{ t("addon.trubbel.preview_notification", "Preview Notification") }}
			</div>
		</button>
	</div>
</template>

<script>
import { notification } from "../../utilities/notification";
export default {
	methods: {
		click() {
			notification("🔔", "Notification Preview 123", 4000);
      notification("🔔", "Notification Preview 123", 6000);
      notification("🔔", "Notification Preview 123", 8000);
		}
	}
}
</script>