<template>
	<section class="tw-flex-grow-1 tw-align-self-start">
		<header class="tw-mg-y-05">
			{{ t(type.i18n, type.title) }}
		</header>

		<div v-if="type.about">
			<markdown :source="t(type.about_i18n, type.about)" />
		</div>

		<div class="tw-flex tw-align-items-center tw-mg-y-05">
			<label :for="'hash$' + value.id">
				<span class="tw-mg-l-1">
					{{ t('addon.prattlenot.hash_count', 'Hash Storage Size') }}
				</span>
			</label>
			<input
				:id="'hash$' + value.id"
				v-model.number.lazy="value.data.hash_count"
				type="number"
				class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-mg-x-1 tw-pd-x-1 tw-pd-y-05 ffz-input"
			>
		</div>

		<div class="tw-flex tw-align-items-center tw-mg-y-05">
			<label :for="'leven$' + value.id">
				<span class="tw-mg-l-1">
					{{ t('addon.prattlenot.leven_count', 'Levenshtein Storage Size') }}
				</span>
			</label>
			<input
				:id="'leven$' + value.id"
				v-model.number.lazy="value.data.leven_count"
				type="number"
				class="tw-flex-grow-1 tw-border-radius-medium tw-font-size-6 tw-mg-x-1 tw-pd-x-1 tw-pd-y-05 ffz-input"
			>
		</div>

		<div class="tw-flex tw-align-items-center tw-mg-y-05">
			<label :for="'leven_score$' + value.id">
				<span class="tw-mg-l-1">
					{{ t('addon.prattlenot.leven_score', 'Levenshtein Threshold') }}
				</span>
			</label>
			<input
				:id="'leven_score$' + value.id"
				v-model.number.lazy="value.data.leven_score"
				type="number"
				step="0.05"
				min="0"
				max="1"
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