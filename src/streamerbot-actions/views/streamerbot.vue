<template lang="html">
	<div>
		<div class="tw-flex tw-align-items-start">
			<label for="edit_url" class="tw-mg-y-05">
				{{ t("setting.actions.url", "URL") }}
			</label>

			<div class="tw-full-width">
				<input
					id="edit_url"
					v-model="value.url"
					:placeholder="defaults.url"
					class="tw-border-radius-medium tw-font-size-6 tw-full-width ffz-input tw-pd-x-1 tw-pd-y-05 tw-mg-y-05"
					@input="$emit('input', value)"
				>

				<div class="tw-c-text-alt-2 tw-mg-b-1">
					{{
						t(
							"setting.actions.variables",
							"Available Variables: {vars}",
							{ vars }
						)
					}}
				</div>
			</div>
		</div>

		<div class="tw-flex tw-align-items-start">
			<label for="action_id" class="tw-mg-y-05">Action ID</label>

			<div class="tw-full-width">
				<input
					id="action_id"
					v-model="value.actionId"
					:placeholder="defaults.actionId"
					class="tw-border-radius-medium tw-font-size-6 tw-full-width ffz-input tw-pd-x-1 tw-pd-y-05 tw-mg-y-05"
					@input="$emit('input', value)"
				>

				<div class="tw-c-text-alt-2 tw-mg-b-1">
					{{
						t(
							"setting.actions.variables",
							"Available Variables: {vars}",
							{ vars }
						)
					}}
				</div>
			</div>
		</div>

		<div class="tw-flex tw-align-items-start">
			<label for="payload_body" class="tw-mg-y-05">Payload</label>

			<div class="tw-full-width">
				<input
					id="payload_body"
					v-model="value.payload"
					:placeholder="defaults.payload"
					class="tw-border-radius-medium tw-font-size-6 tw-full-width ffz-input tw-pd-x-1 tw-pd-y-05 tw-mg-y-05"
					@input="$emit('input', value)"
				>

				<div class="tw-c-text-alt-2 tw-mg-b-1">
					{{
						t(
							"setting.actions.variables",
							"Available Variables: {vars}",
							{ vars }
						)
					}}
				</div>

				<div class="tw-c-text-alt-2 tw-mg-b-1">
					{{
						t(
							"setting.actions.formats",
							"Available Formatters: {fmts}",
							{ fmts }
						)
					}}
				</div>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	props: ['value', 'defaults', 'vars', 'fmts'],
};
</script>
