<template lang="html">
	<div class="tr--rules-editor">

		<div class="tw-border tw-border-radius-medium tw-pd-1 tw-mg-b-1">
			<div class="tw-c-text-alt-2 tw-font-size-6 tw-mg-b-05">
				Rule Tester
			</div>
			<input
				v-model="tester_input"
				class="ffz-input tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-full-width tw-mg-b-05"
				placeholder="Type a message to preview rule output"
			>
			<input
				:value="tester_output"
				class="ffz-input tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-full-width"
				placeholder="Output will appear here"
				readonly
				style="opacity: 0.7"
			>
		</div>

		<div v-if="!rules.length" class="tw-c-text-alt-2 tw-font-size-6 tw-pd-y-05">
			No rules yet. Click "Add Rule" below to get started.
		</div>

		<div
			v-for="(rule, index) in rules"
			:key="rule.id"
			class="tw-border tw-border-radius-medium tw-mg-b-05"
		>
			<div
				class="tw-flex tw-align-items-center tw-pd-x-1 tw-pd-y-05 tw-interactive"
				style="cursor: pointer;"
				@click="toggleExpanded(rule.id)"
			>
				<span class="tw-flex-grow-1 tw-font-size-6">
					<template v-if="rule.find">
						Rule {{ index + 1 }}
						<span class="tw-c-text-alt-2"> - {{ rule.find }}</span>
						<span v-if="rule.isRegex" class="ffz-pill tw-mg-l-05" style="font-size: 1rem;">regex</span>
					</template>
					<span v-else class="tw-c-text-alt-2">Empty Rule {{ index + 1 }}</span>
				</span>
				<span :class="isExpanded(rule.id) ? 'ffz-i-up-dir' : 'ffz-i-down-dir'" />
			</div>

			<div v-if="isExpanded(rule.id)" class="tw-pd-1 tw-border-t">
				<div class="ffz-checkbox tw-mg-b-1">
					<input
						:id="'tr-regex-' + rule.id"
						:checked="rule.isRegex"
						type="checkbox"
						class="ffz-checkbox__input"
						@change="setField(index, 'isRegex', $event.target.checked)"
					>
					<label :for="'tr-regex-' + rule.id" class="ffz-checkbox__label">
						<span class="tw-mg-l-1">Use Regular Expression</span>
					</label>
				</div>

				<div style="display:grid; grid-template-columns:max-content 1fr; gap:0.4em 1em; align-items:start;">
					<label class="tw-c-text-alt-2 tw-font-size-6" style="padding-top:0.35em;">Find</label>
					<div>
						<input
							:value="rule.find"
							:class="{'ffz-input--error': rule.isRegex && getRegexError(rule.find)}"
							class="ffz-input tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-full-width"
							:placeholder="rule.isRegex ? 'Regular expression pattern' : 'Text to find'"
							@change="setField(index, 'find', $event.target.value)"
						>
						<div v-if="rule.isRegex && getRegexError(rule.find)" class="tw-c-text-alt-2 tw-font-size-7 tw-mg-t-05" style="color: var(--color-text-error, #f33);">
							{{ getRegexError(rule.find) }}
						</div>
					</div>

					<label class="tw-c-text-alt-2 tw-font-size-6" style="padding-top:0.35em;">Replace</label>
					<input
						:value="rule.replace"
						class="ffz-input tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-full-width"
						placeholder="Replacement text (leave blank to delete matches)"
						@change="setField(index, 'replace', $event.target.value)"
					>

					<label class="tw-c-text-alt-2 tw-font-size-6" style="padding-top:0.35em;">Only if includes</label>
					<input
						:value="rule.onlyIfIncludes"
						class="ffz-input tw-border-radius-medium tw-font-size-6 tw-pd-x-1 tw-pd-y-05 tw-full-width"
						placeholder="Optional - only apply if message contains this text"
						@change="setField(index, 'onlyIfIncludes', $event.target.value)"
					>
				</div>

				<button
					class="tw-button tw-button--text tw-full-width tw-mg-t-1"
					style="color: var(--color-text-error, #f33);"
					@click="removeRule(index)"
				>
					<span class="tw-button__text ffz-i-cancel">
						Delete Rule
					</span>
				</button>
			</div>
		</div>

		<button class="tw-button tw-full-width tw-mg-t-05" @click="addRule">
			<span class="tw-button__text ffz-i-plus">
				Add Rule
			</span>
		</button>

	</div>
</template>

<script>

let last_id = 0;

function makeRule() {
	return {
		id: ++last_id,
		find: "",
		replace: "",
		onlyIfIncludes: "",
		isRegex: false,
	};
}

function applyRules(msg, rules) {
	for (const rule of rules) {
		if (!rule.find) continue;
		if (rule.onlyIfIncludes && !msg.includes(rule.onlyIfIncludes)) continue;

		if (rule.isRegex) {
			try {
				msg = msg.replace(new RegExp(rule.find, "g"), rule.replace ?? "");
			} catch (_) { /* invalid regex */ }
		} else {
			msg = msg.replaceAll(rule.find, rule.replace ?? "");
		}
	}
	return msg;
}

export default {
	props: ["item", "context"],

	data() {
		const loaded = (this.item.getRules() ?? []).map(r => ({
			id: ++last_id,
			find: r.find ?? "",
			replace: r.replace ?? "",
			onlyIfIncludes: r.onlyIfIncludes ?? "",
			isRegex: r.isRegex ?? false,
		}));

		return {
			rules: loaded,
			expanded: {},
			tester_input: "",
		};
	},

	computed: {
		tester_output() {
			if (!this.tester_input.length)
				return "";

			return applyRules(this.tester_input, this.rules);
		},
	},

	methods: {
		isExpanded(id) {
			return !!this.expanded[id];
		},

		toggleExpanded(id) {
			this.$set(this.expanded, id, !this.expanded[id]);
		},

		getRegexError(pattern) {
			if (!pattern) return null;
			try {
				new RegExp(pattern);
				return null;
			} catch (e) {
				return String(e);
			}
		},

		addRule() {
			const rule = makeRule();
			this.rules.push(rule);

			this.$set(this.expanded, rule.id, true);
			this.save();
		},

		removeRule(index) {
			this.rules.splice(index, 1);
			this.save();
		},

		setField(index, field, value) {
			this.$set(this.rules[index], field, value);
			this.save();
		},

		save() {
			const toSave = this.rules.map(({ id, ...rest }) => rest);
			this.item.setRules(toSave);
		}
	}
};

</script>