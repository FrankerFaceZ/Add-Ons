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

		this.settings.add('addon.screenshoter.shortcut', {
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
	}

	updateShortcut() {
		const Mousetrap = this.Mousetrap = this.Mousetrap || this.web_munch.getModule('mousetrap') || window.Mousetrap
		if (! Mousetrap || ! Mousetrap.bind)
			return

		if (this._shortcut_bound ) {
			Mousetrap.unbind(this._shortcut_bound)
			this._shortcut_bound = null
		}

		const key = this.settings.get('addon.screenshoter.shortcut')
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
		return video.src?.length
	}
	
	updateButton(inst) {
		const outer = inst.props.containerRef || this.fine.getChildNode(inst)
		const container = outer?.querySelector?.(this.player.RIGHT_CONTROLS || '.video-player__default-player .player-controls__right-control-group')
		const added = container?.querySelector('.ffz--player-screenshoter')

		// We don't work with clips
		const video = outer?.querySelector('video')
		if (video && this.isClip(video)) return

		if (!video && !container) return
		if (added) added.remove()

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
			
		let label = this.i18n.t('addon.screenshoter.button', 'Take screenshot')

		const key = this.settings.get('addon.screenshoter.shortcut')
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

	onEnable() {
		this.on('site.player:update-gui', this.updateButton, this)

		this.updateButtons()
	}

	takeScreenshot() {
		const video = document.querySelector('video')
		if (!video) return

		const nickname = document.querySelector('h1.tw-title')

		const now = new Date()
		const currentTime = `${now.toDateString()}_${now.toLocaleTimeString()}`

		const canvas = document.createElement('canvas')
		const context = canvas.getContext('2d')

		canvas.width = video.videoWidth
		canvas.height = video.videoHeight

		if (video.src?.length) {
			// a clip, no workaround for now
			// TODO: find a workaround, prefereably with using a proxy, maybe a fullscreen capture.
			return
		} else {
			// a stream, basic approach
			context.drawImage(video, 0, 0, canvas.width, canvas.height)

			canvas.toBlob((blob) => {
				const link = document.createElement('a')
				link.href = URL.createObjectURL(blob)
				link.download = `${nickname.textContent ?? 'stream'}_${currentTime}.png`.replaceAll(' ', '-')
				link.click()
				URL.revokeObjectURL(link.href)
			})
		}		
	}
}

Screenshoter.register()