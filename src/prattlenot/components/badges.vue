<template>
	<section class="tw-flex-grow-1 tw-align-self-start">
		<header class="tw-mg-y-05">
			{{ t(type.i18n, type.title) }}
		</header>

		<div v-if="type.about">
			<markdown :source="t(type.about_i18n ? type.about_i18n : (type.i18n + '.about'), type.about)" />
		</div>

        <div
            v-for="section in badges"
            :key="section.title"
        >
            <div class="tw-mg-b-05 tw-mg-t-05">{{ section.title }}</div>
            <div class="tw-flex tw-flex-wrap">
                <div
                    v-for="badge in section.badges"
                    :key="badge.id"
                    class="ffz-checkbox tw-mg-r-05 tw-mg-b-05"
                >
                    <input
                        :id="'badge$' + badge.id + '$' + value.id"
                        :checked="(enabled_badges.indexOf(badge.id) !== -1)"
                        type="checkbox"
                        class="ffz-checkbox__input"
                        @input="onChange(badge.id, $event)"
                    />

                    <label :for="'badge$' + badge.id + '$' + value.id" class="ffz-checkbox__label">
                        <div
                            :style="{backgroundColor: badge.color, backgroundImage: badge.styleImage }"
                            class="ffz-pn--preview-image ffz-badge tw-mg-x-05 tw-flex-shrink-0"
                        />
                        {{ badge.name }}
                    </label>
                </div>
            </div>
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
        const badges = FrankerFaceZ.get().resolve('chat.badges').getSettingsBadges(true, () => this.onBadgesLoad());

		return {
            badges: badges,
			id: last_id++
		}
	},

    computed: {
        enabled_badges() {
            if ( Array.isArray(this.value.data.badges) )
                return this.value.data.badges;
            return [];
        }
    },

    methods: {
        onBadgesLoad() {
            this.badges = FrankerFaceZ.get().resolve('chat.badges').getSettingsBadges();
        },

        onChange(value, evt) {
            const enabled = evt.target.checked,
                values = this.value.data.badges;

            if ( ! Array.isArray(values) ) {
                if ( enabled )
                    this.value.data.badges = [value];
                return;
            }

            const idx = values.indexOf(value);
            if (idx === -1 && enabled)
                values.push(value);
            else if (idx !== -1 && ! enabled)
                values.splice(idx, 1);
        }
    }
}

</script>