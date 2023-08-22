const {createElement} = FrankerFaceZ.utilities.dom
const {isValidShortcut} = FrankerFaceZ.utilities.object

const BAD_SHORTCUTS = [
	'f',
	'space',
	'k',
	'shift+up',
	'shift+down',
	'esc',
	'm',
	'?',
	'alt+t',
	'alt+x'
]

class Screenshoter extends Addon {
	constructor(...args) {
		super(...args)

		this.inject('site.fine')
		this.inject('site.player')
		this.inject('site.web_munch')

		this.onShortcut = this.onShortcut.bind(this)

		this.settingsNamespace = 'addon.screenshoter'

		this.settings.add(`${this.settingsNamespace}.clipboard`, {
			default: false,
			ui: {
				path: 'Add-Ons > Screenshoter >> Behavior',
				title: 'Copy to clipboard',
				description: 'By default, screenshots are saved as a file. Enable this to use clipboard instead (if supported by your browser).',
				component: 'setting-check-box'
			}
		});

		this.settings.add(`${this.settingsNamespace}.shortcut`, {
			default: 'ctrl+alt+shift+q',
			ui: {
				path: 'Add-Ons > Screenshoter >> Behavior',
				title: 'Shortcut Key',
				description: 'This key sequence can be used to take a screenshot.',
				component: 'setting-hotkey'
			},
			changed: () => {
				this.updateShortcut()
				this.updateButtons()
			}
		})
	}

	onEnable() {
		this.on('site.player:update-gui', this.updateButton, this)

		this.updateButtons()
		this.updateShortcut()
		this.createTooltip()
	}

	onDisable() {
		this.destroyButtons()
		this.destroyTooltip()
	}

	createTooltip() {
		if (this.tooltip) this.destroyTooltip()
		
		this.tooltip = document.createElement('span')
		this.tooltip.id = 'ffz-screenshoter-tooltip'
		this.tooltip.style = `
			color: var(--color-text-pill);
			background-color: var(--color-background-pill-subtle);
			display: inline-block;
			position: absolute;
			right: 15px;
			bottom: 45px;
			line-height: initial;
			text-align: center;
			white-space: nowrap;
			border-radius: 1000px;
			padding: 0.3rem 0.8em;
			font-weight: bold;
			opacity: 0;

			transition: opacity .1s;
		`
		this.tooltip.textContent = 'Copied to clipboard!'
		
		const parent = document.querySelector('div.video-player')
		parent.appendChild(this.tooltip)
	}

	showTooltip() {
		this.tooltip.style.opacity = 1
		setTimeout(() => {
			this.tooltip.style.opacity = 0
		}, 2000)
	}

	destroyTooltip() {
		this.tooltip?.remove()
	}

	destroyButtons() {
		for (const inst of this.player.Player.instances) {
			this.destroyButton(inst)
		}
	}

	destroyButton(inst) {
		const button = document.querySelector('.ffz--player-screenshoter')
		button?.remove()
	}

	updateShortcut() {
		const Mousetrap = this.Mousetrap = this.Mousetrap || this.web_munch.getModule('mousetrap') || window.Mousetrap
		if (! Mousetrap || ! Mousetrap.bind)
			return

		if (this._shortcut_bound ) {
			Mousetrap.unbind(this._shortcut_bound)
			this._shortcut_bound = null
		}

		const key = this.settings.get(`${this.settingsNamespace}.shortcut`)
		if (key && isValidShortcut(key)) {
			Mousetrap.bind(key, this.onShortcut)
			this._shortcut_bound = key
		}
	}

	updateButtons() {
		for (const inst of this.player.Player.instances) {
			this.updateButton(inst)
		}
	}

	// TODO: more robust check for clips vs streams
	isClip(video) {
		if (video.src?.length) {
			this.log.info('This page contains a clip, skipping...')
			return true
		}

		return false
	}
	
	updateButton(inst) {
		const outer = inst.props.containerRef || this.fine.getChildNode(inst)
		const container = outer?.querySelector?.(this.player.RIGHT_CONTROLS || '.video-player__default-player .player-controls__right-control-group')
		const button = container?.querySelector('.ffz--player-screenshoter')

		// We don't work with clips
		const video = outer?.querySelector('video')
		if (video && this.isClip(video)) return

		if (!video && !container) return
		if (button) button.remove()

		let icon, tip, btn, cont = container.querySelector('.ffz--player-screenshoter')

		cont = (<div class="ffz--player-screenshoter tw-inline-flex tw-relative ffz-il-tooltip__container">
			{btn = (<button
				class="tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-button-icon tw-button-icon--overlay ffz-core-button ffz-core-button--border ffz-core-button--overlay tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative"
				type="button"
				data-a-target="ffz-player-screenshoter-button"
				onClick={this.onButtonClick.bind(this, inst)} // eslint-disable-line react/jsx-no-bind
			>
				<div class="tw-align-items-center tw-flex tw-flex-grow-0">
					<div class="tw-button-icon__icon">
						{icon = (<figure class="ffz-fa-photo ffz-i-camera" />)}
					</div>
				</div>
			</button>)}
			{tip = (<div class="ffz-il-tooltip ffz-il-tooltip--align-right ffz-il-tooltip--up" role="tooltip" />)}
		</div>)

		const thing = container.querySelector('button[data-a-target="player-fullscreen-button"]')
		if ( thing ) {
			container.insertBefore(cont, thing.parentElement)
		} else
			container.appendChild(cont)
			
		let label = 'Take screenshot'

		const key = this.settings.get(`${this.settingsNamespace}.shortcut`)
		if ( key && isValidShortcut(key) )
			label = `${label} (${key})`

		btn.setAttribute('aria-label', label)
		tip.textContent = label
	}

	onShortcut() {
		this.takeScreenshot()
	}

	onButtonClick() {
		this.takeScreenshot()
	}

	saveToClipboard(blob) {
		try {
			navigator.clipboard.write([
				new ClipboardItem({
					'image/png': blob
				})
			])

			this.showTooltip()
		} catch (err) {
			this.log.error('Clipboard is not accessible, saving to file instead', err)
			this.saveToFile(blob)
		}
	}

	saveToFile(blob) {
		try {
			const nickname = document.querySelector('h1.tw-title')

			const now = new Date()
			const currentTime = `${now.toDateString()}_${now.toLocaleTimeString()}`

			const link = document.createElement('a')
			link.href = URL.createObjectURL(blob)
			link.download = `${nickname.textContent ?? 'stream'}_${currentTime}.png`.replaceAll(' ', '-')
			link.click()
			URL.revokeObjectURL(link.href)
		} catch (err) {
			this.log.error('Save to file was unsuccessful', err)
		}
	}

	takeScreenshot() {
		const video = document.querySelector('video')
		if (!video || this.isClip(video)) return

		const canvas = document.createElement('canvas')
		const context = canvas.getContext('2d')

		canvas.width = video.videoWidth
		canvas.height = video.videoHeight

		context.drawImage(video, 0, 0, canvas.width, canvas.height)

		canvas.toBlob((blob) => {
			const clipboard = this.settings.get(`${this.settingsNamespace}.clipboard`)
			clipboard ? this.saveToClipboard(blob) : this.saveToFile(blob)
		})
	}
}

Screenshoter.register()