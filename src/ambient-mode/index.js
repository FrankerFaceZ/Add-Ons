'use strict';

// ============================================================================
// Ambient Mode Add-On
// Projects colors from video edges onto the surrounding area.
// ============================================================================

// Extract [r, g, b] for a pixel at (col, row) from a 3-column-wide ImageData buffer.
function pxRaw(data, col, row) {
	const i = (row * 3 + col) * 4;
	return [data[i], data[i + 1], data[i + 2]];
}

// Linearly interpolate two [r, g, b] arrays by factor t (0 = a, 1 = b).
function lerpColor(a, b, t) {
	return [
		Math.round(a[0] + (b[0] - a[0]) * t),
		Math.round(a[1] + (b[1] - a[1]) * t),
		Math.round(a[2] + (b[2] - a[2]) * t),
	];
}

// Format [r, g, b] as the inner part of an rgba() CSS call.
function rgbStr([r, g, b]) {
	return `${r},${g},${b}`;
}

function findPlayer(props) {
	const player = props?.mediaPlayerInstance;
	if ( player?.playerInstance )
		return player.playerInstance;
	return player;
}

function findPlayerCore(props) {
	const player = findPlayer(props);
	return player?.core ?? player;
}

function disableAmbientMode(inst) {
	if ( inst._ffz_ambient_retry ) {
		clearTimeout(inst._ffz_ambient_retry);
		inst._ffz_ambient_retry = null;
	}
	if ( inst._ffz_ambient_raf ) {
		cancelAnimationFrame(inst._ffz_ambient_raf);
		inst._ffz_ambient_raf = null;
	}
	if ( inst._ffz_ambient_el ) {
		inst._ffz_ambient_el.remove();
		inst._ffz_ambient_el = null;
	}
	inst._ffz_ambient_canvas = null;
	inst._ffz_ambient_ctx    = null;
	inst._ffz_ambient_colors = null;
}

class AmbientMode extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('site.player');

		this.settings.add('addon.ambient-mode.enabled', {
			default: true,
			ui: {
				sort: -1,
				path: 'Add-Ons > Ambient Mode >> General',
				title: 'Enable Ambient Mode',
				description: 'Projects colors from the edges of the video onto the surrounding area, creating an immersive ambient lighting effect similar to YouTube\'s Ambient Mode. Especially useful on OLED displays — replaces static black letterbox bars with dynamic ambient colors, reducing the risk of permanent burn-in during long streams.',
				component: 'setting-check-box'
			},
			changed: () => this._onSettingChanged()
		});

		this.settings.add('addon.ambient-mode.intensity', {
			default: 85,
			ui: {
				path: 'Add-Ons > Ambient Mode >> General',
				title: 'Intensity',
				description: 'How strong the ambient glow is.',
				component: 'setting-select-box',
				data: [
					{value: 100, title: '100%'},
					{value: 85,  title: '85%'},
					{value: 70,  title: '70%'},
					{value: 50,  title: '50%'},
					{value: 30,  title: '30%'},
					{value: 15,  title: '15%'}
				]
			}
		});

		this.settings.add('addon.ambient-mode.width', {
			default: 50,
			ui: {
				path: 'Add-Ons > Ambient Mode >> General',
				title: 'Width',
				description: 'How far the glow extends from each edge.',
				component: 'setting-select-box',
				data: [
					{value: 100, title: '100%'},
					{value: 75,  title: '75%'},
					{value: 50,  title: '50%'},
					{value: 25,  title: '25%'},
					{value: 10,  title: '10%'}
				]
			}
		});

		this.settings.add('addon.ambient-mode.invert', {
			default: false,
			ui: {
				path: 'Add-Ons > Ambient Mode >> General',
				title: 'Invert',
				description: 'When enabled, switches to linear edge gradients — color flows inward from each side of the player.',
				component: 'setting-check-box'
			}
		});
	}

	onEnable() {
		this._injectCSS();

		this.on('site.player:update-gui', this._onUpdateGUI, this);

		for ( const inst of this.player.Player.instances )
			this._enableAmbientMode(inst);
	}

	onDisable() {
		this.off('site.player:update-gui', this._onUpdateGUI, this);

		for ( const inst of this.player.Player.instances )
			disableAmbientMode(inst);

		this._removeCSS();
	}

	_onUpdateGUI(inst) {
		this._enableAmbientMode(inst);
	}

	_onSettingChanged() {
		for ( const inst of this.player.Player.instances )
			this._enableAmbientMode(inst);
	}

	_injectCSS() {
		if ( this._styleEl ) return;
		const style = document.createElement('style');
		style.id = 'ffz-ambient-mode-style';
		style.textContent = `
			.ffz-ambient-bg {
				position: absolute;
				inset: 0;
				z-index: 0;
				pointer-events: none;
				filter: blur(40px) saturate(1.5);
				transform: scale(1.15);
				transition: background 80ms linear;
			}
		`;
		document.head.appendChild(style);
		this._styleEl = style;
	}

	_removeCSS() {
		if ( this._styleEl ) {
			this._styleEl.remove();
			this._styleEl = null;
		}
	}

	_enableAmbientMode(inst) {
		const enabled = this.settings.get('addon.ambient-mode.enabled');

		if ( ! enabled ) {
			disableAmbientMode(inst);
			return;
		}

		const cont = inst.props.containerRef;
		if ( ! cont ) return;

		// Already active — don't re-initialize.
		if ( inst._ffz_ambient_el ) return;

		const video = findPlayerCore(inst.props)?.mediaSinkManager?.video;
		if ( ! video ) {
			// Video not ready yet — retry shortly.
			if ( ! inst._ffz_ambient_retry )
				inst._ffz_ambient_retry = setTimeout(() => {
					inst._ffz_ambient_retry = null;
					this._enableAmbientMode(inst);
				}, 500);
			return;
		}

		const el = document.createElement('div');
		el.className = 'ffz-ambient-bg';
		cont.insertBefore(el, cont.firstChild);
		inst._ffz_ambient_el = el;

		// 3×3 canvas: one draw call samples all 9 zones (TL/T/TR/L/R/BL/B/BR + center).
		const canvas = document.createElement('canvas');
		canvas.width  = 3;
		canvas.height = 3;
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		inst._ffz_ambient_canvas = canvas;
		inst._ffz_ambient_ctx    = ctx;

		let lastUpdate = 0;
		const INTERVAL = 1000 / 15; // 15 fps — smooth enough for ambient lighting
		const LERP_T   = 0.2;       // lerp factor: 20% toward new color each frame

		const update = timestamp => {
			if ( ! inst._ffz_ambient_el ) return;
			inst._ffz_ambient_raf = requestAnimationFrame(update);

			if ( timestamp - lastUpdate < INTERVAL ) return;
			lastUpdate = timestamp;

			if ( video.readyState < 2 || video.videoWidth === 0 ) return;

			try {
				const intensity    = (this.settings.get('addon.ambient-mode.intensity') ?? 85) / 100;
				const widthSetting = this.settings.get('addon.ambient-mode.width') ?? 50;
				const w            = widthSetting / 2;
				const invert       = this.settings.get('addon.ambient-mode.invert');

				// One draw call scales the whole frame into the 3×3 canvas.
				// The GPU handles averaging via bilinear filtering — no JS loops needed.
				ctx.drawImage(video, 0, 0, 3, 3);
				const data = ctx.getImageData(0, 0, 3, 3).data;

				// Zone layout (col, row):
				//   TL(0,0)  T(1,0)  TR(2,0)
				//    L(0,1)   ·       R(2,1)
				//   BL(0,2)  B(1,2)  BR(2,2)
				const raw = [
					pxRaw(data, 0, 0), pxRaw(data, 1, 0), pxRaw(data, 2, 0),
					pxRaw(data, 0, 1),                     pxRaw(data, 2, 1),
					pxRaw(data, 0, 2), pxRaw(data, 1, 2), pxRaw(data, 2, 2),
				];

				// Lerp toward new samples each frame to avoid jarring jumps on scene cuts.
				if ( ! inst._ffz_ambient_colors )
					inst._ffz_ambient_colors = raw.slice();
				else
					inst._ffz_ambient_colors = raw.map((c, i) => lerpColor(inst._ffz_ambient_colors[i], c, LERP_T));

				const [TL, T, TR, L, R, BL, B, BR] = inst._ffz_ambient_colors;

				if ( invert ) {
					// Linear mode: 4 edge gradients, each color fades inward by w%.
					el.style.maskImage       = '';
					el.style.webkitMaskImage = '';

					el.style.background = [
						`linear-gradient(to right,  rgba(${rgbStr(L)},${intensity}) 0%, rgba(${rgbStr(L)},0) ${w}%)`,
						`linear-gradient(to left,   rgba(${rgbStr(R)},${intensity}) 0%, rgba(${rgbStr(R)},0) ${w}%)`,
						`linear-gradient(to bottom, rgba(${rgbStr(T)},${intensity}) 0%, rgba(${rgbStr(T)},0) ${w}%)`,
						`linear-gradient(to top,    rgba(${rgbStr(B)},${intensity}) 0%, rgba(${rgbStr(B)},0) ${w}%)`,
					].join(', ');
				} else {
					// Conic mode: 8-stop conic gradient (one stop per zone, every 45°).
					el.style.background = `conic-gradient(at 50% 50%,
						rgba(${rgbStr(T)},${intensity})   0deg,
						rgba(${rgbStr(TR)},${intensity})  45deg,
						rgba(${rgbStr(R)},${intensity})   90deg,
						rgba(${rgbStr(BR)},${intensity})  135deg,
						rgba(${rgbStr(B)},${intensity})   180deg,
						rgba(${rgbStr(BL)},${intensity})  225deg,
						rgba(${rgbStr(L)},${intensity})   270deg,
						rgba(${rgbStr(TL)},${intensity})  315deg,
						rgba(${rgbStr(T)},${intensity})   360deg)`;

					// Ellipse mask: base = native video half-dimensions (always larger than
					// the display container), Width adds extra proportional to container size.
					// The 0.6 scale factor tunes the overall spread of the visible glow ring.
					const vw   = video.videoWidth;
					const vh   = video.videoHeight;
					const cw   = cont.offsetWidth;
					const ch   = cont.offsetHeight;
					const rx   = Math.max(200, (vw / 2 + cw / 2 * widthSetting / 100) * 0.6);
					const ry   = Math.max(112, (vh / 2 + ch / 2 * widthSetting / 100) * 0.6);
					const mask = `radial-gradient(ellipse ${rx}px ${ry}px at 50% 50%, black 0%, black ${w}%, transparent 100%)`;

					el.style.maskImage       = mask;
					el.style.webkitMaskImage = mask;
				}
			} catch(_) {
				// Silently skip cross-origin / security errors.
			}
		};

		inst._ffz_ambient_raf = requestAnimationFrame(update);
	}
}

AmbientMode.register();
