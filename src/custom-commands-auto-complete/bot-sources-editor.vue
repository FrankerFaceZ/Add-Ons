<!--
	Bot Sources Editor

	This custom Vue component provides a specialized drag-and-drop interface for managing
	bot command sources. While FFZ generally discourages recreating FFZ functionality
	(as noted in the Add-Ons README), this component is partially justified due to:

    The existing FFZ UI components only support basic inputs/lists, whilst this addon requires
    a more complex interaction model for managing ordering and a form for adding/editing custom sources.
    Or to put it simply, it would be difficult to achieve the desired UX without a custom component.
-->
<template>
	<section class="ffz--widget ffz--bot-sources-editor tw-border-t tw-pd-y-1">
		<div class="tw-pd-b-1">
			<div class="tw-c-text-alt-2 tw-font-size-6">
				{{ t('addon.custom-commands.sources.drag-hint', 'Drag to reorder sources. Commands are fetched in order from top to bottom.') }}
			</div>
		</div>

		<div ref="list" class="ffz--source-list">
			<section
				v-for="source in sources"
				:key="source.key"
				:data-key="source.key"
				class="tw-border tw-border-radius-medium tw-pd-1 tw-mg-b-05 tw-flex tw-align-items-center"
				:class="{'tw-c-background-alt-2': !source.enabled}"
			>
				<div class="tw-flex-shrink-0 tw-mg-r-1 handle" style="cursor: grab;">
					<figure class="ffz-i-ellipsis-vert" />
				</div>

				<div class="tw-flex-grow-1">
					<div class="tw-font-size-5 tw-semibold">
						{{ source.name }}
					</div>
					<div class="tw-font-size-7 tw-c-text-alt-2">
						<span v-if="source.isPreset">{{ t('addon.custom-commands.sources.preset', 'Built-in') }}</span>
						<span v-else>{{ t('addon.custom-commands.sources.custom', 'Custom') }}</span>
						<span v-if="source.botNames"> · Bot: {{ source.botNames.join(', ') }}</span>
					</div>
				</div>

				<div v-if="!source.isPreset" class="tw-flex-shrink-0 tw-mg-r-1">
					<button
						class="tw-button tw-button--text tw-button--small ffz-il-tooltip__container"
						@click="editCustomSource(source.customIndex)"
					>
						<span class="tw-button__text ffz-i-cog" />
						<div class="ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-right">
							{{ t('addon.custom-commands.sources.edit', 'Edit') }}
						</div>
					</button>
					<button
						class="tw-button tw-button--text tw-button--small ffz-il-tooltip__container"
						@click="removeCustomSource(source.customIndex)"
					>
						<span class="tw-button__text ffz-i-trash" />
						<div class="ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-right">
							{{ t('addon.custom-commands.sources.remove', 'Remove') }}
						</div>
					</button>
				</div>

				<div class="tw-flex-shrink-0">
					<div class="ffz-checkbox tw-relative">
						<input
							:id="'source-toggle-' + source.key"
							type="checkbox"
							class="ffz-checkbox__input"
							:checked="source.enabled"
							@change="toggleSource(source, $event.target.checked)"
						>
						<label :for="'source-toggle-' + source.key" class="ffz-checkbox__label">
							<span class="tw-mg-l-1">{{ source.enabled ? t('setting.on', 'On') : t('setting.off', 'Off') }}</span>
						</label>
					</div>
				</div>
			</section>

			<div v-if="!sources.length" class="tw-c-text-alt-2 tw-font-size-6 tw-align-center tw-pd-2">
				{{ t('addon.custom-commands.sources.no-sources', 'No bot sources available') }}
			</div>
		</div>

		<!-- Add Custom Source Button -->
		<div class="tw-mg-t-1 tw-border-t tw-pd-t-1 tw-flex tw-align-items-center tw-justify-content-between">
			<button class="tw-button" @click="showAddForm = true">
				<span class="tw-button__text ffz-i-plus">
					{{ t('addon.custom-commands.sources.add-custom', 'Add Custom Source') }}
				</span>
			</button>

			<div class="tw-flex tw-align-items-center">
				<button v-if="hasCustomSources" class="tw-button tw-button--text tw-mg-r-1" @click="clearAllCustomSources">
					<span class="tw-button__text ffz-i-trash">
						{{ t('addon.custom-commands.sources.clear-all', 'Clear All Custom') }}
					</span>
				</button>

				<button class="tw-button tw-button--text ffz-il-tooltip__container" @click="resetToDefaults">
					<span class="tw-button__text ffz-i-arrows-rotate">
						{{ t('setting.reset', 'Reset') }}
					</span>
					<div class="ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-right">
						{{ t('addon.custom-commands.sources.reset-hint', 'Reset to default (all built-in presets enabled, remove all custom sources)') }}
					</div>
				</button>
			</div>
		</div>

		<!-- Modal Overlay for Add/Edit Form -->
		<div v-if="showAddForm" class="ffz-modal-overlay" @click.self="cancelEdit">
			<div class="ffz-modal-content tw-pd-2 tw-border tw-border-radius-large tw-c-background-base tw-elevation-2" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
				<h4 class="tw-mg-b-1 tw-font-size-5">
					{{ editingIndex !== null ? t('addon.custom-commands.sources.edit-source', 'Edit Custom Source') : t('addon.custom-commands.sources.new-source', 'New Custom Source') }}
				</h4>

				<div class="tw-mg-b-1">
					<label class="tw-font-size-6">{{ t('addon.custom-commands.sources.name', 'Name') }}</label>
					<input v-model="editForm.name" type="text" class="tw-full-width tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input" placeholder="MyBot">
				</div>

				<div class="tw-mg-b-1">
					<label class="tw-font-size-6">{{ t('addon.custom-commands.sources.bot-names', 'Bot Username(s)') }}</label>
					<input v-model="editForm.botNamesStr" type="text" class="tw-full-width tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input" placeholder="mybot, mybot2">
					<div class="tw-font-size-7 tw-c-text-alt-2">
						{{ t('addon.custom-commands.sources.bot-names-hint', 'Comma-separated list of bot usernames to detect in chat') }}
					</div>
				</div>

				<div class="tw-mg-b-1">
					<label class="tw-font-size-6">{{ t('addon.custom-commands.sources.channel-names', 'OR Channel Name(s)') }}</label>
					<input v-model="editForm.channelNamesStr" type="text" class="tw-full-width tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input" placeholder="ixyles, otherchannel">
					<div class="tw-font-size-7 tw-c-text-alt-2">
						{{ t('addon.custom-commands.sources.channel-names-hint', 'Comma-separated list of channels where these commands are available') }}
					</div>
				</div>

				<div class="tw-mg-b-1">
					<label class="tw-font-size-6">{{ t('addon.custom-commands.sources.commands-url', 'Commands API URL') }}</label>
					<input v-model="editForm.commandsUrl" type="text" class="tw-full-width tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input" placeholder="https://api.example.com/commands/{channel}">
					<div class="tw-font-size-7 tw-c-text-alt-2">
						{{ t('addon.custom-commands.sources.url-hint', 'Use {channel} for channel login, {channelId} for channel ID') }}
					</div>
				</div>

				<div class="tw-mg-b-1">
					<label class="tw-font-size-6">{{ t('addon.custom-commands.sources.prefix', 'Command Prefix') }}</label>
					<input v-model="editForm.prefix" type="text" class="tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input" placeholder="!" style="width: 60px;">
				</div>

				<div class="tw-mg-b-1">
					<label class="tw-font-size-6">{{ t('addon.custom-commands.sources.name-path', 'Name Path') }}</label>
					<input v-model="editForm.namePathStr" type="text" class="tw-full-width tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input" placeholder="name or command">
					<div class="tw-font-size-7 tw-c-text-alt-2">
						{{ t('addon.custom-commands.sources.path-hint', 'JSON path to command name (e.g., "name" or "data.command")') }}
					</div>
				</div>

				<!-- Advanced Options Toggle -->
				<div class="tw-mg-b-1">
					<button class="tw-button tw-button--text" @click="editForm.showAdvanced = !editForm.showAdvanced">
						<span class="tw-button__text">
							<span :class="editForm.showAdvanced ? 'ffz-i-down-dir' : 'ffz-i-right-dir'" />
							{{ t('addon.custom-commands.sources.advanced', 'Advanced Options') }}
						</span>
					</button>
				</div>

				<!-- Advanced Fields -->
				<template v-if="editForm.showAdvanced">
					<div class="tw-mg-b-1">
						<label class="tw-font-size-6">{{ t('addon.custom-commands.sources.channel-url', 'Channel API URL (Optional)') }}</label>
						<input v-model="editForm.channelUrl" type="text" class="tw-full-width tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input" placeholder="https://api.example.com/channel/{channel}">
						<div class="tw-font-size-7 tw-c-text-alt-2">
							{{ t('addon.custom-commands.sources.channel-url-hint', 'URL to fetch channel ID if needed. Use {channel} placeholder.') }}
						</div>
					</div>

					<div class="tw-mg-b-1">
						<label class="tw-font-size-6">{{ t('addon.custom-commands.sources.channel-id-path', 'Channel ID Path (Optional)') }}</label>
						<input v-model="editForm.channelIdPathStr" type="text" class="tw-full-width tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input" placeholder="id or _id">
						<div class="tw-font-size-7 tw-c-text-alt-2">
							{{ t('addon.custom-commands.sources.channel-id-path-hint', 'Path to channel ID in channel API response') }}
						</div>
					</div>

					<div class="tw-mg-b-1">
						<label class="tw-font-size-6">{{ t('addon.custom-commands.sources.description-path', 'Description Path (Optional)') }}</label>
						<input v-model="editForm.descriptionPathStr" type="text" class="tw-full-width tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input" placeholder="description or response">
						<div class="tw-font-size-7 tw-c-text-alt-2">
							{{ t('addon.custom-commands.sources.description-path-hint', 'Path to command description in API response') }}
						</div>
					</div>

					<div class="tw-mg-b-1">
						<label class="tw-font-size-6">{{ t('addon.custom-commands.sources.permission-path', 'Permission Path (Optional)') }}</label>
						<input v-model="editForm.permissionPathStr" type="text" class="tw-full-width tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 ffz-input" placeholder="permission or accessLevel">
						<div class="tw-font-size-7 tw-c-text-alt-2">
							{{ t('addon.custom-commands.sources.permission-path-hint', 'Path to permission level in API response') }}
						</div>
					</div>

					<div class="tw-mg-b-1">
						<div class="ffz-checkbox tw-relative">
							<input
								id="prefix-in-name-checkbox"
								v-model="editForm.prefixInName"
								type="checkbox"
								class="ffz-checkbox__input"
							>
							<label for="prefix-in-name-checkbox" class="ffz-checkbox__label">
								<span class="tw-mg-l-1">{{ t('addon.custom-commands.sources.prefix-in-name', 'Prefix included in name') }}</span>
							</label>
						</div>
						<div class="tw-font-size-7 tw-c-text-alt-2 tw-mg-l-3">
							{{ t('addon.custom-commands.sources.prefix-in-name-hint', 'Check if command names include the prefix (e.g., "!ping" instead of "ping")') }}
						</div>
					</div>
				</template>

				<div v-if="validationError" class="tw-mg-b-1 tw-c-text-error tw-font-size-6">
					{{ validationError }}
				</div>

				<div class="tw-flex tw-align-items-center tw-mg-t-1">
					<button class="tw-button" @click="saveCustomSource">
						<span class="tw-button__text ffz-i-floppy">
							{{ t('setting.save', 'Save') }}
						</span>
					</button>
					<button class="tw-button tw-button--text tw-mg-l-1" @click="cancelEdit">
						<span class="tw-button__text">
							{{ t('setting.cancel', 'Cancel') }}
						</span>
					</button>
				</div>
			</div>
		</div>
	</section>
</template>

<script>
import Sortable from 'sortablejs';
import { PRESETS } from './presets.js';

export default {
	props: ['item', 'context'],

	data() {
		return {
			showAddForm: false,
			editingIndex: null,
			editForm: this.getEmptyForm(),
			localSources: [],
			validationError: null
		};
	},

	computed: {
		sources() {
			return this.localSources;
		},

		hasCustomSources() {
			return this.localSources.some(s => !s.isPreset);
		}
	},

	created() {
		this.refreshSources();
	},

	mounted() {
		this.$nextTick(() => this.initSortable());
	},

	beforeDestroy() {
		if (this._sortable) {
			this._sortable.destroy();
			this._sortable = null;
		}
	},

	methods: {
		getFFZ() {
			return this.context.getFFZ();
		},

		getSettings() {
			return this.getFFZ().resolve('settings');
		},

		getProfile() {
			return this.context.currentProfile || this.getSettings().main_context;
		},

		getSetting(key) {
			return this.getSettings().get(key, this.getProfile());
		},

		setSetting(key, value) {
			const profile = this.getProfile();
			if (profile && profile.set) {
				profile.set(key, value);
			} else {
				this.context.provider.set(key, value);
			}
		},

		deepCopy(obj) {
			return JSON.parse(JSON.stringify(obj));
		},

		t(key, defaultValue) {
			const i18n = this.getFFZ().resolve('i18n');
			return i18n ? i18n.t(key, defaultValue) : defaultValue;
		},

		parsePathString(pathStr) {
			return pathStr.split('.').map(s => s.trim()).filter(Boolean);
		},

		pathToString(path) {
			return Array.isArray(path) ? path.join('.') : (path || '');
		},

		parseCommaSeparated(str) {
			return str.split(',').map(s => s.trim()).filter(Boolean);
		},

		getCustomSources() {
			const raw = this.getSetting('addon.custom-commands.custom-sources');
			if (!raw) return [];
			if (Array.isArray(raw)) return raw;
			console.warn('[CCAC] Custom sources corrupted, resetting to empty array');
			return [];
		},

		getSourceOrder() {
			// Source order is always global (provider), never per-profile
			return this.context.provider.get('addon.custom-commands.source-order') || [];
		},

		setSourceOrder(order) {
		// Source order is always global (provider), never per-profile
			this.context.provider.set('addon.custom-commands.source-order', order);
		},

		setCustomSources(sources) {
			this.setSetting('addon.custom-commands.custom-sources', sources);
		},

		getDisabledSources() {
			return this.context.provider.get('addon.custom-commands.disabled-sources') || [];
		},

		setDisabledSources(disabled) {
			this.context.provider.set('addon.custom-commands.disabled-sources', disabled);
		},

		getEmptyForm() {
			return {
				name: '',
				botNamesStr: '',
				channelNamesStr: '',
				commandsUrl: '',
				prefix: '!',
				namePathStr: 'name',
				descriptionPathStr: '',
				permissionPathStr: '',
				channelUrl: '',
				channelIdPathStr: '',
				prefixInName: false,
				showAdvanced: false
			};
		},

		refreshSources() {
			const sourceOrder = this.getSourceOrder();
			const disabledSources = this.getDisabledSources();
			const sources = [];

			// Add presets (in order if present, enabled unless in disabled list)
			for (const [key, preset] of Object.entries(PRESETS)) {
				sources.push({
					key,
					name: preset.name,
					enabled: sourceOrder.includes(key) && !disabledSources.includes(key),
					isPreset: true,
					botNames: preset.botNames
				});
			}

			// Add custom sources
			const customSources = this.getCustomSources();
			for (let i = 0; i < customSources.length; i++) {
				const source = customSources[i];
				if (source) {
					sources.push({
						key: `custom-${i}`,
						name: source.name || `Custom ${i + 1}`,
						enabled: source.enabled !== false,
						isPreset: false,
						botNames: source.botNames,
						customIndex: i
					});
				}
			}

			// Sort by stored order
			sources.sort((a, b) => {
				const aIdx = sourceOrder.indexOf(a.key);
				const bIdx = sourceOrder.indexOf(b.key);
				if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
				if (aIdx !== -1) return -1;
				if (bIdx !== -1) return 1;
				return 0;
			});

			this.localSources = sources;
		},

		initSortable() {
			if (this._sortable) {
				this._sortable.destroy();
			}

			const list = this.$refs.list;
			if (!list) return;

			this._sortable = Sortable.create(list, {
				draggable: 'section',
				handle: '.handle',
				animation: 150,
				ghostClass: 'tw-c-background-accent',
				onUpdate: () => this.handleReorder()
			});
		},

		handleReorder() {
			const list = this.$refs.list;
			const sections = list.querySelectorAll('section[data-key]');
			const newOrder = Array.from(sections)
				.map(section => section.getAttribute('data-key'))
				.filter(Boolean);

			this.setSourceOrder(newOrder);
			this.refreshSources();
		},

		toggleSource(source, enabled) {
			if (source.isPreset) {
				this.togglePreset(source.key, enabled);
			} else {
				this.toggleCustomSource(source.customIndex, enabled);
			}
			this.$nextTick(() => this.refreshSources());
		},

		togglePreset(key, enabled) {
			const order = this.deepCopy(this.getSourceOrder());
			let disabled = this.deepCopy(this.getDisabledSources());

			// Ensure source is in order
			if (!order.includes(key)) {
				order.push(key);
			}

			// Toggle disabled state
			if (enabled) {
				disabled = disabled.filter(k => k !== key);
			} else {
				if (!disabled.includes(key)) {
					disabled.push(key);
				}
			}

			this.setSourceOrder(order);
			this.setDisabledSources(disabled);
		},

		toggleCustomSource(index, enabled) {
			const sources = this.deepCopy(this.getCustomSources());
			if (sources[index]) {
				sources[index].enabled = enabled;
				this.setCustomSources(sources);
			}

			// Keep in source order to preserve position, don't remove when disabled
			const customKey = `custom-${index}`;
			const order = this.deepCopy(this.getSourceOrder());
			if (!order.includes(customKey)) {
				order.push(customKey);
				this.setSourceOrder(order);
			}
		},

		editCustomSource(index) {
			const source = this.getCustomSources()[index];
			if (!source) return;

			this.editingIndex = index;
			this.editForm = {
				name: source.name || '',
				botNamesStr: (source.botNames || []).join(', '),
				channelNamesStr: (source.channelNames || []).join(', '),
				commandsUrl: source.commandsUrl || '',
				prefix: source.prefix || '!',
				namePathStr: this.pathToString(source.namePath) || 'name',
				descriptionPathStr: this.pathToString(source.descriptionPath),
				permissionPathStr: this.pathToString(source.permissionPath),
				channelUrl: source.channelUrl || '',
				channelIdPathStr: this.pathToString(source.channelIdPath),
				prefixInName: source.prefixInName || false,
				showAdvanced: !!(source.channelUrl || source.descriptionPath || source.channelIdPath || source.permissionPath || source.prefixInName)
			};
			this.showAddForm = true;
		},

		removeCustomSource(index) {
			const sources = this.deepCopy(this.getCustomSources());
			sources.splice(index, 1);
			this.setCustomSources(sources);

			// Remove from source order and adjust remaining indices
			let sourceOrder = this.deepCopy(this.getSourceOrder());
			const removedKey = `custom-${index}`;

			// Remove the deleted source
			sourceOrder = sourceOrder.filter(key => key !== removedKey);

			// Adjust indices for sources after the deleted one
			sourceOrder = sourceOrder.map(key => {
				if (key.startsWith('custom-')) {
					const idx = parseInt(key.substring(7), 10);
					if (idx > index) {
						return `custom-${idx - 1}`;
					}
				}
				return key;
			});

			this.setSourceOrder(sourceOrder);

			this.$nextTick(() => {
				this.refreshSources();
				this.initSortable();
			});
		},

		saveCustomSource() {
			const newSource = this.buildSourceFromForm();

			// Validate
			const error = this.validateSource(newSource);
			if (error) {
				this.validationError = error;
				return;
			}

			// Save
			const sources = this.deepCopy(this.getCustomSources());
			let customIndex;

			if (this.editingIndex !== null) {
				sources[this.editingIndex] = { ...sources[this.editingIndex], ...newSource };
				customIndex = this.editingIndex;
			} else {
				sources.push(newSource);
				customIndex = sources.length - 1;
			}

			this.setCustomSources(sources);

			// Add to source order if enabled and not already present
			if (newSource.enabled !== false) {
				const customKey = `custom-${customIndex}`;
				const sourceOrder = this.deepCopy(this.getSourceOrder());
				if (!sourceOrder.includes(customKey)) {
					sourceOrder.push(customKey);
					this.setSourceOrder(sourceOrder);
				}
			}

			this.cancelEdit();
			this.$nextTick(() => {
				this.refreshSources();
				this.initSortable();
			});
		},

		buildSourceFromForm() {
			const form = this.editForm;
			const source = {
				name: form.name.trim() || 'Custom Bot',
				enabled: true,
				commandsUrl: form.commandsUrl.trim(),
				prefix: form.prefix || '!',
				namePath: this.parsePathString(form.namePathStr)
			};

			// Optional arrays
			const botNames = this.parseCommaSeparated(form.botNamesStr);
			const channelNames = this.parseCommaSeparated(form.channelNamesStr);
			if (botNames.length) source.botNames = botNames;
			if (channelNames.length) source.channelNames = channelNames;

			// Optional advanced fields
			if (form.channelUrl) source.channelUrl = form.channelUrl.trim();
			if (form.channelIdPathStr) source.channelIdPath = this.parsePathString(form.channelIdPathStr);
			if (form.descriptionPathStr) source.descriptionPath = this.parsePathString(form.descriptionPathStr);
			if (form.permissionPathStr) source.permissionPath = this.parsePathString(form.permissionPathStr);
			if (form.prefixInName) source.prefixInName = true;

			return source;
		},

		validateSource(source) {
			if (!source.commandsUrl) {
				return this.t('addon.custom-commands.sources.url-required', 'Commands URL is required');
			}
			if (!source.botNames && !source.channelNames) {
				return this.t(
					'addon.custom-commands.sources.bot-or-channel-required',
					'At least one bot username OR channel name is required'
				);
			}
			return null;
		},

		cancelEdit() {
			this.showAddForm = false;
			this.editingIndex = null;
			this.editForm = this.getEmptyForm();
			this.validationError = null;
		},

		clearAllCustomSources() {
			this.setCustomSources([]);

			// Remove all custom source keys from source order
			let sourceOrder = this.deepCopy(this.getSourceOrder());
			sourceOrder = sourceOrder.filter(key => !key.startsWith('custom-'));
			this.setSourceOrder(sourceOrder);

			this.$nextTick(() => {
				this.refreshSources();
				this.initSortable();
			});
		},

		resetToDefaults() {
			const settings = this.getSettings();

			// Get default values from setting definitions
			const sourceOrderDef = settings.definitions.get('addon.custom-commands.source-order');
			const customSourcesDef = settings.definitions.get('addon.custom-commands.custom-sources');
			const disabledSourcesDef = settings.definitions.get('addon.custom-commands.disabled-sources');

			// Reset to defaults
			this.setSourceOrder(sourceOrderDef?.default || Object.keys(PRESETS));
			this.setCustomSources(customSourcesDef?.default || []);
			this.setDisabledSources(disabledSourcesDef?.default || []);

			this.$nextTick(() => {
				this.refreshSources();
				this.initSortable();
			});
		}
	}
};
</script>

<style scoped>
.ffz--source-list section {
	cursor: default;
	transition: background-color 0.15s ease;
}

.ffz--source-list section:hover {
	background-color: rgba(255, 255, 255, 0.05);
}

.handle {
	cursor: grab;
}

.handle:active {
	cursor: grabbing;
}

.ffz-modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.7);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
}

.ffz-modal-content {
	position: relative;
	width: 90%;
	box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}
</style>
