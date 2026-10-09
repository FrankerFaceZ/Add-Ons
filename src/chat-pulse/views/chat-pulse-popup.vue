<template lang="html">
	<div class="ffz--chat-pulse tw-pd-1" style="min-width: 28rem">
		<header class="tw-flex tw-align-items-center tw-mg-b-1">
			<span class="ffz-i-chat tw-mg-r-05" />
			<h4 class="tw-flex-grow-1">
				{{ t('addon.chat-pulse.title', 'Chat Pulse') }}
			</h4>
			<span class="tw-c-text-alt-2 tw-font-size-7">{{ channel }}</span>
		</header>

		<template v-if="snap">
			<div class="tw-flex tw-mg-b-1">
				<div
					v-for="tile in tiles"
					:key="tile.key"
					class="tw-pd-r-1"
					style="flex: 1 1 0"
				>
					<div class="tw-font-size-3 tw-strong">
						{{ tile.value }}
					</div>
					<div class="tw-c-text-alt-2 tw-font-size-7">
						{{ tile.label }}
					</div>
				</div>
			</div>

			<svg
				class="tw-full-width tw-c-text-alt-2"
				:viewBox="`0 0 ${chart.width} ${chart.height}`"
				style="display: block"
				role="img"
				:aria-label="t('addon.chat-pulse.sparkline', 'Chat activity over the last {minutes, number} minutes', { minutes: chartMinutes })"
			>
				<polygon
					:points="area"
					fill="currentColor"
					fill-opacity="0.12"
				/>
				<polyline
					:points="line"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linejoin="round"
					stroke-linecap="round"
					vector-effect="non-scaling-stroke"
				/>
				<circle
					v-if="last"
					:cx="last[0]"
					:cy="last[1]"
					r="3.5"
					fill="#9146ff"
					stroke="var(--color-background-base, transparent)"
					stroke-width="1.5"
				/>
				<rect
					v-for="(count, index) in snap.series"
					:key="index"
					:x="chart.pad + index * chart.step - chart.step / 2"
					y="0"
					:width="chart.step"
					:height="chart.height"
					fill="transparent"
				>
					<title>{{ bucketTitle(count, index) }}</title>
				</rect>
			</svg>
			<div class="tw-flex tw-justify-content-between tw-c-text-alt-2 tw-font-size-8 tw-mg-b-1">
				<span>{{ t('addon.chat-pulse.axis.start', '{minutes, number} min ago', { minutes: chartMinutes }) }}</span>
				<span>{{ t('addon.chat-pulse.axis.end', 'now') }}</span>
			</div>

			<div class="tw-flex tw-mg-b-1">
				<div
					v-for="list in lists"
					:key="list.key"
					class="tw-pd-r-1"
					style="flex: 1 1 0; min-width: 0"
				>
					<div class="tw-c-text-alt-2 tw-font-size-7 tw-upcase tw-mg-b-05">
						{{ list.title }}
					</div>
					<div
						v-for="row in list.rows"
						:key="row.name"
						class="tw-flex tw-justify-content-between tw-font-size-6"
					>
						<span class="tw-ellipsis" style="min-width: 0">{{ row.name }}</span>
						<span class="tw-c-text-alt tw-mg-l-1">{{ number(row.count) }}</span>
					</div>
					<div
						v-if="! list.rows.length"
						class="tw-c-text-alt-2 tw-font-size-7"
					>
						{{ t('addon.chat-pulse.empty', 'Nothing yet') }}
					</div>
				</div>
			</div>

			<footer class="tw-flex tw-align-items-center tw-justify-content-between tw-border-t tw-pd-t-05">
				<span class="tw-c-text-alt-2 tw-font-size-7">{{ t('addon.chat-pulse.session', 'Session: {elapsed}', { elapsed }) }}</span>
				<button
					class="tw-button tw-button--text"
					@click="onReset"
				>
					<span class="tw-button__text">{{ t('addon.chat-pulse.reset', 'Reset') }}</span>
				</button>
			</footer>
		</template>
	</div>
</template>

<script>

const CHART_WIDTH = 300,
	CHART_HEIGHT = 48,
	CHART_PAD = 4;

export default {
	name: 'ChatPulsePopup',

	props: ['channel', 'getSnapshot', 'reset', 'onDetached'],

	data() {
		return {
			snap: null,
			timer: null
		};
	},

	computed: {
		chartMinutes() {
			return this.snap
				? Math.round(this.snap.series.length * this.snap.bucket_ms / 60000)
				: 0;
		},

		windowLabel() {
			const seconds = this.snap ? this.snap.window_sec : 0;
			return seconds < 60
				? this.t('addon.chat-pulse.window.seconds', '{seconds, number}s', { seconds })
				: this.t('addon.chat-pulse.window.minutes', '{minutes, number}m', { minutes: seconds / 60 });
		},

		tiles() {
			const snap = this.snap;
			if ( ! snap )
				return [];

			return [
				{
					key: 'rate',
					value: this.number(snap.rate),
					label: this.t('addon.chat-pulse.tile.rate', 'msg/min ({window})', { window: this.windowLabel })
				},
				{
					key: 'messages',
					value: this.number(snap.messages),
					label: this.t('addon.chat-pulse.tile.messages', 'messages')
				},
				{
					key: 'chatters',
					value: this.number(snap.chatters),
					label: this.t('addon.chat-pulse.tile.chatters', 'chatters')
				},
				{
					key: 'emote-only',
					value: `${snap.emote_only_pct}%`,
					label: this.t('addon.chat-pulse.tile.emote-only', 'emote-only')
				}
			];
		},

		lists() {
			const snap = this.snap;
			if ( ! snap )
				return [];

			return [
				{
					key: 'chatters',
					title: this.t('addon.chat-pulse.top-chatters', 'Top chatters'),
					rows: snap.top_chatters
				},
				{
					key: 'emotes',
					title: this.t('addon.chat-pulse.top-emotes', 'Top emotes'),
					rows: snap.top_emotes
				}
			];
		},

		elapsed() {
			const total = Math.floor((this.snap ? this.snap.elapsed : 0) / 1000),
				h = Math.floor(total / 3600),
				m = Math.floor(total % 3600 / 60),
				s = total % 60;

			if ( h )
				return this.t('addon.chat-pulse.elapsed.hours', '{h}h {m}m', { h, m });
			if ( m )
				return this.t('addon.chat-pulse.elapsed.minutes', '{m}m {s}s', { m, s });
			return this.t('addon.chat-pulse.elapsed.seconds', '{s}s', { s });
		},

		chart() {
			const series = this.snap ? this.snap.series : [],
				count = series.length,
				max = Math.max(1, ...series),
				step = count > 1 ? (CHART_WIDTH - 2 * CHART_PAD) / (count - 1) : 0,
				points = series.map((value, index) => [
					CHART_PAD + index * step,
					CHART_HEIGHT - CHART_PAD - (value / max) * (CHART_HEIGHT - 2 * CHART_PAD)
				]);

			return {
				width: CHART_WIDTH,
				height: CHART_HEIGHT,
				pad: CHART_PAD,
				step,
				max,
				points
			};
		},

		line() {
			return this.chart.points
				.map(point => `${point[0].toFixed(1)},${point[1].toFixed(1)}`)
				.join(' ');
		},

		area() {
			const points = this.chart.points;
			if ( ! points.length )
				return '';

			const first = points[0],
				last = points[points.length - 1],
				base = this.chart.height - this.chart.pad;

			return `${first[0].toFixed(1)},${base} ${this.line} ${last[0].toFixed(1)},${base}`;
		},

		last() {
			const points = this.chart.points;
			return points.length ? points[points.length - 1] : null;
		}
	},

	mounted() {
		this.tick();
		this.timer = setInterval(() => this.tick(), 1000);
	},

	beforeDestroy() {
		this.stop();
	},

	methods: {
		number(value) {
			return this.t('addon.chat-pulse.number', '{value, number}', { value });
		},

		bucketTitle(count, index) {
			const seconds = (this.snap.series.length - 1 - index) * this.snap.bucket_ms / 1000;
			return this.t(
				'addon.chat-pulse.bucket',
				'{count, plural, one {# message} other {# messages}}, {seconds, number}s ago',
				{ count, seconds }
			);
		},

		onReset() {
			this.reset();
			this.tick();
		},

		stop() {
			if ( this.timer ) {
				clearInterval(this.timer);
				this.timer = null;
			}
		},

		tick() {
			// The balloon detaches this element when it closes. If that
			// happened without the close listener firing, stop ourselves.
			if ( this.snap && ! document.body.contains(this.$el) ) {
				this.stop();
				if ( typeof this.onDetached === 'function' )
					this.onDetached();
				return;
			}

			this.snap = this.getSnapshot();
		}
	}
}

</script>
