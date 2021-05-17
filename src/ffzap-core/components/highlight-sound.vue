<template lang="html">
	<div
		:class="{inherits: isInherited, default: isDefault}"
		class="ffz--widget ffz--select-box"
	>
		<div class="tw-flex tw-align-items-start">
			<label :for="item.full_key" class="tw-mg-y-05">
				{{ t(item.i18n_key, item.title) }}
				<span v-if="unseen" class="tw-pill">{{ t('setting.new', 'New') }}</span>
			</label>

			<div class="tw-flex tw-flex-column tw-mg-05">
				<select
					ref="type"
					class="tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-font-size-6 ffz-select tw-pd-l-1 tw-pd-r-3 tw-pd-y-05"
					@change="onTypeChange"
				>
					<option :selected="isPresetSound">
						{{ t('addon.ffzap-core.highlight-sound.preset-sound', 'Preset Sound') }}
					</option>
					<option :selected="isCustomURL">
						{{ t('addon.ffzap-core.highlight-sound.custom-url', 'Custom (URL)') }}
					</option>
					<option :selected="isCustomFile">
						{{ t('addon.ffzap-core.highlight-sound.custom-file', 'Custom (File)') }}
					</option>
				</select>
				<select
					v-if="isPresetSound"
					:id="item.full_key"
					ref="control"
					class="tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-font-size-6 ffz-select tw-pd-l-1 tw-pd-r-3 tw-pd-y-05"
					@change="onPresetChange"
				>
					<option
						v-for="i in data"
						:key="i.value"
						:selected="i.value === value"
					>
						{{ i.i18n_key ? t(i.i18n_key, i.title, i) : i.title }}
					</option>
				</select>
				<input
					v-if="isCustomURL"
					ref="text"
					:value="value"
					class="ffz-mg-t-1p tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input"
					@change="onCustomURLChange"
				>
				<button
					v-if="isCustomFile"
					:class="!isBlobSupported && 'tw-button--disabled ffz-tooltip ffz-tooltip--no-mouse'"
					class="tw-pd-l-1 tw-pd-r-3 tw-pd-y-05 tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-button"
					style="border-radius: 0"
					:data-title="t('addon.ffzap-core.no-file-support', 'Custom files are not supported by the current storage provider.\nPlease change your storage provider in Data Management > Storage >> Provider.')"
					@click="openFileSelector"
				>
					<span class="tw-button__icon tw-button__icon--left ffz-i-upload"/>
					<span class="tw-button__text">Select File</span>
				</button>
			</div>

			<component
				:is="item.buttons"
				v-if="item.buttons"
				:context="context"
				:item="item"
				:value="value"
			/>

			<button
				v-if="source && source !== profile"
				class="tw-mg-l-05 tw-mg-y-05 tw-button tw-button--text"
				@click="context.currentProfile = source"
			>
				<span class="tw-button__text ffz-i-right-dir">
					{{ sourceDisplay }}
				</span>
			</button>

			<button v-if="has_value" class="tw-mg-l-05 tw-mg-y-05 tw-button tw-button--text ffz-il-tooltip__container" @click="clear">
				<span class="tw-button__text ffz-i-cancel" />
				<div class="ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-right">
					{{ t('setting.reset', 'Reset to Default') }}
				</div>
			</button>
		</div>

		<section v-if="item.extra && item.extra.component && item.extra.before">
			<component :is="item.extra.component" :context="context" :item="item" :value="value" />
		</section>

		<section
			v-if="item.description"
			class="tw-c-text-alt-2"
		>
			<markdown :source="t(item.desc_i18n_key || `${item.i18n_key}.description`, item.description)" />
		</section>
		<section v-if="item.extra && item.extra.component && ! item.extra.before">
			<component :is="item.extra.component" :context="context" :item="item" :value="value" />
		</section>
	</div>
</template>

<script>
const { openFile } = FrankerFaceZ.utilities.dom;
const SettingMixin = FrankerFaceZ.get().resolve('main_menu').SettingMixin;

export default {
	mixins: [SettingMixin],
	props: ['item', 'context'],
	data() {
		return {
			isPresetSound: false,
			isCustomURL: false,
            isCustomFile: false
		}
	},
	computed: {
		isBlobSupported: function () {
			return this.context.getFFZ().resolve('settings').provider.supportsBlobs;
		}
	},
	mounted: function () {
		for (const { value } of this.data) {
			if (value === this.value) {
				this.isPresetSound = true;
				return;
			}
		}

		if (this.value.startsWith('ffzap.sound-file:')) {
			if (!this.isBlobSupported) {
				this.isPresetSound = true;
				this.clear();
				return;
			}

			this.isCustomFile = true;
		}
		else {
			this.isCustomURL = true;
		}
	},
	methods: {
		onTypeChange() {
			const idx = this.$refs.type.selectedIndex;

			this.isPresetSound = this.isCustomURL = this.isCustomFile = false;

			if (idx === 0) {
				this.isPresetSound = true;
			}
			else if (idx === 1) {
				this.isCustomURL = true;
			}
			else if (idx === 2) {
				this.isCustomFile = true;
			}
		},
		onPresetChange() {
			const idx = this.$refs.control.selectedIndex,
				raw_value = this.data[idx];

			if (raw_value) {
				this.set(raw_value.value);
			}
		},
		onCustomURLChange() {
			const value = this.$refs.text.value;
			if (value != null) {
				this.set(value);
			}
		},
		async canPlayAudio(blob) {
			return new Promise(resolve => {
				const timeout = setTimeout(() => {
					resolve(false);
				}, 100);

				const audio = new Audio(URL.createObjectURL(blob));
				audio.oncanplay = () => {
					clearTimeout(timeout);
					resolve(audio);
					return;
				};
			});
		},
		async openFileSelector() {
			if (!this.isBlobSupported) return;

			const file = await openFile('audio/*', false);

			if (file.size > 1024 * 1000 * 2) { // 2MB file size limit
				alert(this.t('addon.ffzap-core.highlight-sound.file-too-big', 'Audio file is too big! (Max. 2MB)'));
				return;
			}

			const audio = await this.canPlayAudio(file);
			if (!audio) {
				alert(this.t('addon.ffzap-core.highlight-sound.cant-play', 'Can\'t play audio file!'));
				return;
			}

			if (audio.duration > 10) { // Longer than 10s
				alert(this.t('addon.ffzap-core.highlight-sound.file-too-long', 'Audio file is too long! (Max. 10 seconds)'));
				return;
			}

			const settings = this.context.getFFZ().resolve('settings');
			await settings.awaitProvider();

			const provider = settings.provider;
			await provider.awaitReady();

			await provider.setBlob(`ffzap.sound-file:${file.name}`, file);

			this.set(`ffzap.sound-file:${file.name}`);

			this.clearUnusedSounds(settings);
		},
		async clearUnusedSounds(settings) {
			const sounds = [];

			for (const profile of settings.__profiles) {
				const file = profile.get('ffzap.core.highlight_sound');
				if (file && file.startsWith('ffzap.sound-file:')) {
					sounds.push(file);
				}
			}

			for (const key of await settings.provider.blobKeys()) {
				if (key.startsWith('ffzap.sound-file:') && !sounds.includes(key)) {
					await settings.provider.deleteBlob(key);
				}
			}
		}
	}
}
</script>