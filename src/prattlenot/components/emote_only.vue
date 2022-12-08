<template>
	<section class="tw-flex-grow-1 tw-align-self-start">
		<header class="tw-mg-y-05">
			{{ t(type.i18n, type.title) }}
		</header>

		<div v-if="type.about">
			<markdown :source="t(type.about_i18n ? type.about_i18n : (type.i18n + '.about'), type.about)" />
		</div>

		<div class="tw-flex tw-align-items-center tw-mg-y-05">
			<label :for="'max_emotes$' + value.id">
				<span class="tw-mg-l-1">
					{{ t('addon.prattlenot.max_emotes', 'Maximum Emotes') }}
				</span>
			</label>
			<input
				:id="'max_emotes$' + value.id"
				v-model.number.lazy="value.data.max_emotes"
				type="number"
				class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-mg-x-1 tw-pd-x-1 tw-pd-y-05 ffz-input"
			>
		</div>

		<div class="tw-flex tw-align-items-center ffz-checkbox tw-mg-y-05 tw-mg-l-3">
			<input
				:id="'critical$' + value.id"
				v-model="value.data.critical"
				type="checkbox"
				class="ffz-checkbox__input"
			>
			<label :for="'critical$' + value.id" class="ffz-checkbox__label">
				<span class="tw-mg-l-1">
					{{ t('addon.prattlenot.critical', 'Critical (Stop Immediately)') }}
				</span>
			</label>
		</div>

		<div class="tw-flex tw-align-items-center tw-mg-y-05">
			<label :for="'score$' + value.id">
				<span class="tw-mg-l-1">
					{{ t('addon.prattlenot.score', 'Score') }}
				</span>
			</label>
			<input
				:id="'score$' + value.id"
				v-model.number.lazy="value.data.score"
				type="number"
				class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-mg-x-1 tw-pd-x-1 tw-pd-y-05 ffz-input"
			>
		</div>
	</section>
</template>

<script>

let last_id = 0;

export default {
	props: ['value', 'type', 'filters', 'context'],

	data() {
		return {
			id: last_id++
		}
	}
}

</script>