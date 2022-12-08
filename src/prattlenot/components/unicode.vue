<template>
	<section class="tw-flex-grow-1 tw-align-self-start">
		<header class="tw-mg-y-05">
			{{ t(type.i18n, type.title) }}
		</header>

		<div v-if="type.about">
			<markdown :source="t(type.about_i18n ? type.about_i18n : (type.i18n + '.about'), type.about)" />
		</div>

		<div class="tw-flex tw-align-items-center tw-mg-y-05">
			<label :for="'cats$' + value.id">
				<span class="tw-mg-l-1">
					{{ t('addon.prattlenot.categories', 'Categories') }}
				</span>
			</label>
			<div class="tw-flex tw-flex-wrap tw-align-items-center">
				<div
					v-for="i in CATEGORIES"
					:key="i.value"
					class="tw-flex tw-align-items-center ffz-checkbox tw-mg-x-05"
				>
					<input
						:id="'cat$' + i.value + '$' + value.id"
						:checked="categories.includes(i.label)"
						type="checkbox"
						class="ffz-checkbox__input"
						@input="onChange('cat', i.label, $event)"
					/>

					<label :for="'cat$' + i.value + '$' + value.id" class="ffz-checkbox__label">
						{{ t('addon.prattlenot.unicode.cat.' + i.value, i.label) }}
					</label>
				</div>
			</div>
		</div>

		<div class="tw-flex tw-align-items-center tw-mg-y-05">
			<label :for="'scripts$' + value.id">
				<span class="tw-mg-l-1">
					{{ t('addon.prattlenot.scripts', 'Scripts') }}
				</span>
			</label>
			<div class="tw-flex tw-flex-wrap tw-align-items-center">
				<div
					v-for="i in SCRIPTS"
					:key="i"
					class="tw-flex tw-align-items-center ffz-checkbox tw-mg-x-05"
				>
					<input
						:id="'script$' + i + '$' + value.id"
						:checked="scripts.includes(i)"
						type="checkbox"
						class="ffz-checkbox__input"
						@input="onChange('script', i, $event)"
					/>

					<label :for="'script$' + i + '$' + value.id" class="ffz-checkbox__label">
						{{ t('addon.prattlenot.unicode.script.' + i, i) }}
					</label>
				</div>
			</div>
		</div>

		<div class="tw-flex tw-align-items-center tw-mg-y-05">
			<label :for="'threshold$' + value.id">
				<span class="tw-mg-l-1">
					{{ t('addon.prattlenot.threshold', 'Threshold') }}
				</span>
			</label>
			<input
				:id="'threshold$' + value.id"
				v-model.number.lazy="value.data.threshold"
				type="number"
				min="0"
				max="1"
				step="0.05"
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

const { deep_copy } = FrankerFaceZ.utilities.object;

import { UNICODE_SCRIPTS, UNICODE_CATEGORIES } from '../constants';

let last_id = 0;

export default {
	props: ['value', 'type', 'filters', 'context'],

	data() {
		const cats = [];

		for(const [k, v] of Object.entries(UNICODE_CATEGORIES))
			cats.push({value: k, label: v});

		return {
			CATEGORIES: cats,
			SCRIPTS: deep_copy(UNICODE_SCRIPTS),
			id: last_id++,
		}
	},

	computed: {
		categories() {
			const out = [];

			if ( Array.isArray(this.value.data.terms) )
				for(const entry of this.value.data.terms) {
					if ( entry && entry.t === 'cat')
						out.push(entry.v);
				}

			return out;
		},

		scripts() {
			const out = [];

			if ( Array.isArray(this.value.data.terms) )
				for(const entry of this.value.data.terms) {
					if ( entry && entry.t === 'script')
						out.push(entry.v);
				}

			return out;
		},
	},

	methods: {
		onChange(type, value, evt) {
			const enabled = evt.target.checked;

			if ( ! Array.isArray(this.value.data.terms) ) {
				if ( enabled )
					this.value.data.terms = [
						{t: type, v: value}
					];

				return;
			}

			const arr = this.value.data.terms;

			for(let i = 0; i < arr.length; i++) {
				const thing = arr[i];
				if ( thing && thing.t === type && thing.v === value ) {
					if ( ! enabled )
						arr.splice(i, 1);

					return;
				}
			}

			if ( enabled )
				arr.push({t: type, v: value});
		}
	}
}

</script>