import GET_VIDEO from './utilities/graphql/video_info.gql'

const { createElement } = FrankerFaceZ.utilities.dom

class VodTimestamp extends Addon {
	constructor(...args) {
		super(...args)

		this.inject('metadata')
		this.inject('site')
		this.inject('site.router')

		this.load_requires = ['metadata']

		this._videoStart = null
		this._videoId = null

		this.settings.add('addon.vod_timestamp.use_local', {
			default: false,
			ui: {
				sort: 0,
				path: 'Add-Ons > VOD Timestamp Finder',
				title: 'Use Local Time',
				description: 'When enabled, the time input is treated as your local timezone instead of UTC.',
				component: 'setting-check-box',
			},
		})
	}

	onEnable() {
		this.router.on(':route', this.onRoute, this)
		this.onRoute()
	}

	onDisable() {
		this.router.off(':route', this.onRoute, this)
		this.metadata.define('vod-timestamp', null)
		this._videoStart = null
		this._videoId = null
	}

	onRoute() {
		const route = this.router.current?.name
		if (route === 'video' || route === 'user-video') {
			this.setupMetadata()
		} else {
			this.metadata.define('vod-timestamp', null)
			this._videoStart = null
			this._videoId = null
		}
	}

	async fetchVideoStart() {
		const match = location.pathname.match(/\/videos\/(\d+)/)
		if (!match) return null

		const videoId = match[1]
		if (this._videoId === videoId && this._videoStart) return this._videoStart

		const apollo = this.resolve('site.apollo')
		if (!apollo) return null

		try {
			const result = await apollo.client.query({
				query: GET_VIDEO,
				variables: { id: videoId },
			})

			// bail if user navigated away while fetch was in flight
			const current = location.pathname.match(/\/videos\/(\d+)/)
			if (!current || current[1] !== videoId) return null

			const createdAt = result?.data?.video?.createdAt
			if (createdAt) {
				this._videoId = videoId
				this._videoStart = new Date(createdAt)
				return this._videoStart
			}
		} catch (err) {
			this.log.error('[VOD Timestamp] Failed to fetch video info:', err)
		}
		return null
	}

	setupMetadata() {
		this.metadata.define('vod-timestamp', {
			order: 200,
			button: true,
			icon: 'ffz-i-clock',

			label: () => this.i18n.t('addon.vod_timestamp.label', 'VOD Time'),

			tooltip: () => this.i18n.t(
				'addon.vod_timestamp.tooltip',
				'Convert a clock time to a VOD timestamp'
			),

			popup: async (data, tip) => {
				await tip.waitForDom()
				tip.element.classList.add('ffz-balloon--lg')
				return this.buildPopup()
			},
		})
	}

	buildPopup() {
		const useLocal = this.settings.get('addon.vod_timestamp.use_local')
		const tzLabel = useLocal ? 'local' : 'UTC'

		const input = createElement('input', {
			type: 'text',
			placeholder: `HH:MM:SS (${tzLabel})`,
			ariaLabel: this.i18n.t('addon.vod_timestamp.input_label', 'Time to look up in VOD'),
			style: 'background:#18181b;color:#efeff1;border:1px solid #3a3a3d;border-radius:4px;padding:6px 8px;font-size:14px;width:100%;font-family:monospace;box-sizing:border-box;',
		})

		const resultBox = createElement('div', {
			style: 'margin-top:8px;min-height:28px;',
			role: 'status',
			ariaLive: 'polite',
		})

		const btn = createElement('button', {
			style: 'background:#9147ff;color:#fff;border:none;border-radius:4px;padding:6px 12px;font-size:13px;cursor:pointer;margin-top:8px;width:100%;box-sizing:border-box;',
			textContent: this.i18n.t('addon.vod_timestamp.find', 'Find in VOD'),
		})

		btn.addEventListener('click', () => this.handleConvert(input.value, resultBox))

		input.addEventListener('keydown', e => {
			if (e.key === 'Enter') this.handleConvert(input.value, resultBox)
		})

		const container = createElement('div', {
			style: 'padding:8px;width:260px;',
		})
		container.appendChild(
			createElement('div', {
				style: 'color:#adadb8;font-size:12px;margin-bottom:6px;',
				textContent: this.i18n.t(
					'addon.vod_timestamp.hint',
					'Enter a {tzLabel} time from chat to get the VOD timestamp.',
					{ tzLabel }
				),
			})
		)
		container.appendChild(input)
		container.appendChild(btn)
		container.appendChild(resultBox)

		setTimeout(() => input.focus(), 50)

		return container
	}

	async handleConvert(value, resultBox) {
		resultBox.textContent = ''
		resultBox.style.color = ''

		const parsed = this.parseTime(value.trim())
		if (!parsed) {
			resultBox.textContent = this.i18n.t(
				'addon.vod_timestamp.error_format',
				'Enter time as HH:MM:SS or HH:MM'
			)
			resultBox.style.color = '#eb5454'
			return
		}

		const videoStart = await this.fetchVideoStart()
		if (!videoStart) {
			resultBox.textContent = this.i18n.t(
				'addon.vod_timestamp.error_fetch',
				'Could not fetch VOD start time.'
			)
			resultBox.style.color = '#eb5454'
			return
		}

		const useLocal = this.settings.get('addon.vod_timestamp.use_local')
		const { h, m, s } = parsed

		// build target time on the stream start date, using explicit
		// date construction to avoid DST bugs from setHours mutation
		let entered
		if (useLocal) {
			const y = videoStart.getFullYear()
			const mo = videoStart.getMonth()
			const d = videoStart.getDate()
			entered = new Date(y, mo, d, h, m, s, 0)
		} else {
			entered = new Date(Date.UTC(
				videoStart.getUTCFullYear(),
				videoStart.getUTCMonth(),
				videoStart.getUTCDate(),
				h, m, s, 0
			))
		}

		// if entered time is before stream start, assume next day (midnight crossing)
		let offsetMs = entered - videoStart
		if (offsetMs < 0) offsetMs += 86400000

		const totalSec = Math.floor(offsetMs / 1000)
		const oh = Math.floor(totalSec / 3600)
		const om = Math.floor((totalSec % 3600) / 60)
		const os = totalSec % 60

		const timeParam = `${oh}h${om}m${os}s`
		const url = `https://www.twitch.tv/videos/${this._videoId}?t=${timeParam}`
		const display = `${String(oh).padStart(2, '0')}:${String(om).padStart(2, '0')}:${String(os).padStart(2, '0')}`

		const startDisplay = useLocal
			? videoStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
			: `${videoStart.toISOString().slice(11, 16)} UTC`

		resultBox.style.color = '#efeff1'
		resultBox.textContent = ''

		resultBox.appendChild(
			createElement('div', {
				style: 'color:#adadb8;font-size:11px;margin-bottom:4px;',
				textContent: this.i18n.t(
					'addon.vod_timestamp.stream_start',
					'Stream started at {time}',
					{ time: startDisplay }
				),
			})
		)

		const link = createElement('a', {
			href: url,
			style: 'color:#bf94ff;font-weight:600;font-size:14px;text-decoration:none;font-family:monospace;',
			textContent: display,
		})

		link.addEventListener('click', e => {
			e.preventDefault()
			const player = document.querySelector('video')
			if (player) {
				player.currentTime = totalSec
				history.replaceState(null, '', url)
			} else {
				window.location.href = url
			}
		})

		const copyBtn = createElement('button', {
			style: 'background:none;border:1px solid #3a3a3d;border-radius:4px;color:#adadb8;padding:2px 8px;font-size:11px;cursor:pointer;margin-left:8px;',
			textContent: this.i18n.t('addon.vod_timestamp.copy', 'Copy URL'),
		})
		copyBtn.addEventListener('click', () => {
			navigator.clipboard.writeText(url).then(
				() => {
					copyBtn.textContent = this.i18n.t('addon.vod_timestamp.copied', 'Copied!')
					setTimeout(() => {
						copyBtn.textContent = this.i18n.t('addon.vod_timestamp.copy', 'Copy URL')
					}, 1500)
				},
				() => {
					copyBtn.textContent = this.i18n.t('addon.vod_timestamp.copy_failed', 'Failed')
					setTimeout(() => {
						copyBtn.textContent = this.i18n.t('addon.vod_timestamp.copy', 'Copy URL')
					}, 1500)
				}
			)
		})

		const row = createElement('div', {
			style: 'display:flex;align-items:center;justify-content:space-between;margin-top:4px;',
		})
		row.appendChild(link)
		row.appendChild(copyBtn)
		resultBox.appendChild(row)
	}

	parseTime(str) {
		const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
		if (!match) return null
		const h = parseInt(match[1], 10)
		const m = parseInt(match[2], 10)
		const s = match[3] ? parseInt(match[3], 10) : 0
		if (h > 23 || m > 59 || s > 59) return null
		return { h, m, s }
	}
}

VodTimestamp.register()
