<template>
	<div>
		<div class="tw-flex tw-align-items-center tw-checkbox bd-checkbox--indent tw-mg-y-05">
			<input
				:id="'no_recordings$' + value.id"
				v-model="value.settings.no_recordings"
				type="checkbox"
				class="tw-checkbox__input"
			>
			<label :for="'no_recordings$' + value.id" class="tw-checkbox__label">
				{{ t('addon.deck.no-recordings', 'Do not display videos from in-progress broadcasts.') }}
			</label>
		</div>

		<div class="tw-flex tw-align-items-start tw-mg-y-05">
			<label :class="{'tw-form-required': ! validTypes}">
				{{ t('addon.deck.video-types', 'Video Types:') }}
			</label>

			<div>
				<div
					v-for="(type, key) in types"
					:key="key"
					class="tw-checkbox"
				>
					<input
						:id="'type$' + key + '$' + value.id"
						:value="key"
						:checked="hasType(key)"
						type="checkbox"
						class="tw-checkbox__input"
						@input="setType(key, $event)"
					>

					<label :for="'type$' + key + '$' + value.id" class="tw-checkbox__label">
						{{ type.i18n ? t(type.i18n, type.text, type) : type.text }}
					</label>
				</div>
			</div>
		</div>
	</div>
</template>

<script>

import { getLoader, VideoTypes } from '../data';

const {deep_copy} = FrankerFaceZ.utilities.object;

export default {
	props: ['value', 'type', 'settings', 'inst'],

	data() {
		return {
			types: VideoTypes
		}
	},

	computed: {
		validTypes() {
			const types = this.value.settings.types;
			return ! types || types.length < Object.keys(this.types).length;
		},

		hasName() {
			return this.value.settings.name && this.value.settings.name.length > 0
		}
	},

	created() {
		if ( ! this.value.settings.types )
			this.value.settings.types = [];
	},

	methods: {
		hasType(type) {
			return ! this.value.settings.types.includes(type);
		},

		setType(type, event) {
			const checked = event.target && event.target.checked,
				idx = this.value.settings.types.indexOf(type);

			if ( checked && idx !== -1 )
				this.value.settings.types.splice(idx, 1);
			else
				this.value.settings.types.push(type);
		}
	}
}

</script>