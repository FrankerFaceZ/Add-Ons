'use strict';

const {createElement, on, off} = FrankerFaceZ.utilities.dom;
const {createTester} = FrankerFaceZ.utilities.filtering;
const {RERENDER_SETTINGS} = FrankerFaceZ.utilities.constants;

const NON_TEXT_TYPES = [
	'cheer',
	'emote',
	'emoji'
];

const BAD_TYPES = [
	'resub',
	'sub_gift',
	'sub_mystery'
];

const MORE_RERENDER_SETTINGS = [
	'pn.show-reason',
	'pn.show-badges',
	'pn.timestamps'
];

export default class Logic extends Addon {

    constructor(...args) {
        super(...args);

        this.inject('chat');
        this.inject('chat.overrides');
        this.inject('settings');
        this.inject('i18n');
        this.injectAs('site_chat', 'site.chat');
        this.inject('site.fine');

        this.ChatScroller = this.fine.define('chat-scroller');

        this.prattle = [];
		this.pending = [];

		this.scrollback_limit = 20;
		this.updating = true;

		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseLeave = this.onMouseLeave.bind(this);

		this.performUpdate = this.performUpdate.bind(this);
		this.onClickUndelete = this.onClickUndelete.bind(this);
    }

    addNotice(message) {
        this.addPrattle({
            type: this.site_chat?.chat_types?.Notice ?? 31,
            message: message
        });
    }

    rebuildTester() {
        const rules = this.chat.context.get('pn.rules');
        if ( ! rules || ! rules.length ) {
            this.tester = null;
            return;
        }

        this.tester = createTester(rules, this.parent.rules);
    }

    onEnable() {
        this.on('chat:receive-message', this.handleMessage, this);
		this.on('chat:mod-user', this.handleMod, this);
		this.on('chat:clear-chat', this.handleClear, this);
		this.on('site.router:route', this.handleNavigate, this);
		this.on('i18n:update', this.updateTranslation, this);

        this.rebuildTester();
        this.updateConstants();

        this.chat.context.on('changed:pn.rules', this.rebuildTester, this);

		this.chat.context.on('changed:pn.scrollback', this.updateConstants, this);
		this.chat.context.on('changed:chat.scroller.hover-delay', this.updateConstants, this);

		this.chat.context.on(`changed:pn.background`, this.updateContainer, this);
		this.chat.context.on(`changed:pn.active-position`, this.updateContainer, this);
		this.chat.context.on(`changed:pn.active-size`, this.updateContainer, this);

		for(const setting of MORE_RERENDER_SETTINGS)
			this.chat.context.on(`changed:${setting}`, this.rerenderLines, this);

		for(const setting of RERENDER_SETTINGS)
			this.chat.context.on(`changed:${setting}`, this.rerenderLines, this);

		this.ChatScroller.ready((cls, instances) => {
			for(const inst of instances)
				this.checkContainer(inst);
		});

		this.ChatScroller.on('mount', this.checkContainer, this);
		this.ChatScroller.on('update', this.checkContainer, this);

        this.handleNavigate();
    }

    updateConstants() {
        this.scrollback_limit = this.chat.context.get('pn.scrollback');
        this.pause_delay = this.chat.context.get('chat.scroller.hover-delay');
    }

    onDisable() {
		for(const setting of RERENDER_SETTINGS)
			this.chat.context.off(`changed:${setting}`, this.rerenderLines, this);

		for(const setting of MORE_RERENDER_SETTINGS)
			this.chat.context.off(`changed:${setting}`, this.rerenderLines, this);

        this.chat.context.off('changed:pn.rules', this.rebuildTester, this);

        this.chat.context.off('changed:pn.scrollback', this.updateConstants, this);
        this.chat.context.off('changed:chat.scroller.hover-delay', this.updateConstants, this);

		this.chat.context.off('changed:pn.active-position', this.updateContainer, this);
		this.chat.context.off('changed:pn.active-size', this.updateContainer, this);
		this.chat.context.off(`changed:pn.background`, this.updateContainer, this);

		this.removeContainer();

		this.clearUnpauseTimer();

		if ( this._outside_timer ) {
			clearTimeout(this._outside_timer);
            this._outside_timer = null;
        }

		this.off('chat:receive-message', this.handleMessage, this);
		this.off('chat:mod-user', this.handleMod, this);
		this.off('chat:clear-chat', this.handleClear, this);
        this.off('site.router:route', this.handleNavigate, this);
        this.off('i18n:update', this.updateTranslation, this);

		this.ChatScroller.off('mount', this.checkContainer, this);
		this.ChatScroller.off('update', this.checkContainer, this);
	}

    rerenderLines() {
		if ( ! this.cont )
			return;

		for(const msg of this.prattle) {
			if ( msg.prattle_line )
				this.renderLine(msg);
		}
	}

	updateTranslation() {
		if (this.pause_cont != null)
			this.pause_cont.textContent = this.i18n.t('addon.prattlenot.mouse-pause', 'Prattle Paused Due to Mouse');
	};

	getContainer() {
		if ( ! this.container ) {
			this.container = (<div
				class="ffz-pn--list chat-list--other font-scale--default"
				data-simplebar
			>
				{this.cont = <div role="log" />}
				<div class="ffz-pn--pause-notice">
					{this.pause_cont = (<div>
						{this.i18n.t('addon.prattlenot.mouse-pause', 'Prattle Paused Due to Mouse')}
					</div>)}
				</div>
			</div>);

			on(this.container, 'mousemove', this.onMouseMove);
			on(this.container, 'mouseleave', this.onMouseLeave);

			for(const msg of this.prattle) {
				const line = this.renderLine(msg);
				if ( line )
					this.cont.appendChild(line);
			}
		}

		return this.container;
	}

	removeContainer() {
		if (! this.container)
			return;

		const parent = this.container.parentElement;
		if (parent) {
			parent.classList.remove('ffz-pn--container');
			parent.classList.remove('ffz-pn--horizontal');
		}

		this.container.remove();

		for(const msg of this.prattle)
			msg.prattle_line = null;

		off(this.container, 'mousemove', this.onMouseMove);
		off(this.container, 'mouseleave', this.onMouseLeave);

		this.container = this.cont = this.pause_cont = null;
	}

	updateContainer() {
		for(const inst of this.ChatScroller.instances)
			this.checkContainer(inst);	
	}

	checkContainer(inst) {
		let node = this.fine.getChildNode(inst);
		if (node.parentElement && node.parentElement.matches('[class*="chat-list"]'))
			node = node.parentElement;

		if ( ! node )
			return;

		const size = this.chat.context.get('pn.active-size');

		if (size <= 0) {
			this.removeContainer();
			return;
		}

		const container = this.getContainer();
		if ( ! container )
			return;

		const pos = this.chat.context.get('pn.active-position'),
			raw_color = this.chat.context.get('pn.background');

		node.classList.add('ffz-pn--container');
		node.classList.toggle('ffz-pn--horizontal', pos === 2 || pos === 3);
		node.classList.toggle('ffz-pn--exclusive', size >= 100);

		if (size >= 100)
			container.style = '--ffz-pn-size: 100%;';
		else
			container.style = `--ffz-pn-size: ${size}%;`;

		if ( raw_color )
			container.style.backgroundColor = raw_color;

		container.classList.toggle('ffz-pn--top', pos === 0);
		container.classList.toggle('ffz-pn--bottom', pos === 1);
		container.classList.toggle('ffz-pn--left', pos === 2);
		container.classList.toggle('ffz-pn--right', pos === 3);

		if (! node.contains(container))
			node.insertBefore(container, node.firstElementChild);

		this.scroller = inst;
	}

	onMouseMove() {
		this._last_move = Date.now();
		this._outside = false;

		if ( this._outside_timer ) {
			clearTimeout(this._outside_timer);
			this._outside_timer = null;
		}

		if ( this.updating && this.shouldBePaused() ) {
			this.pauseScrolling();
			this.setUnpauseTimer();
		}
	}

	clearUnpauseTimer() {
		if ( this._unpause_timer ) {
			clearInterval(this._unpause_timer);
			this._unpause_timer = null;
		}
	}

	setUnpauseTimer() {
		if ( ! this._unpause_timer )
			this._unpause_timer = setInterval(() => {
				if ( ! this.updating && ! this.shouldBePaused() )
					this.unpauseScrolling();
			}, 50);
	}

	onMouseLeave() {
		this._outside = true;

		if ( this._outside_timer )
			clearTimeout(this._outside_timer);

		this._outside_timer = setTimeout(() => this.maybeUnpause(), 64);
	}

	shouldBePaused() {
		if ( this._outside )
			return false;

		return (Date.now() - this._last_move) < this.pause_delay;
	}

	maybeUnpause() {
		if ( ! this.shouldBePaused() )
			this.unpauseScrolling();
	}

	updatePauseEl() {
		if ( ! this._pause_raf )
			this._pause_raf = requestAnimationFrame(() => {
				this._pause_raf = null;
				this.container.classList.toggle('ffz-pn--paused', ! this.updating);
			});
	}

	pauseScrolling() {
		if (this.updating) {
			this.updating = false;
			this.updatePauseEl();
		}
	}

	unpauseScrolling() {
		if (!this.updating) {
			this.updating = true;
			this.updatePauseEl();
			this.scheduleUpdate();
		}
	}

	handleMod(action, user, msg_id) {
		const is_delete = action === this.site_chat.mod_types.Delete && msg_id != null;

		let i = this.prattle.length;
		while(i--) {
			const msg = this.prattle[i];
			if ( ! msg.user || msg.user.login !== user || msg.deleted || (is_delete && msg.id !== msg_id) )
				continue;

			msg.deleted = true;
			if ( msg.prattle_line ) {
				const el = msg.prattle_line.querySelector('.message');
				if ( el )
					el.textContent = this.i18n.t('chat.message-deleted', '<message deleted>');
				else
					this.renderLine(msg);
			}
		}

		i = this.pending.length;
		while(i--) {
			const msg = this.pending[i];
			if ( msg.user.login !== user || msg.deleted || (is_delete && msg.id !== msg_id) )
				continue;

			msg.deleted = true;
		}
	}

    handleNavigate() {
        // Clear everything but send a message.
        this.pending = [];
        this.prattle = [];
        if ( this.cont )
            this.cont.innerHTML = '';

        this.addNotice(this.i18n.t('addon.pn.welcome', 'Welcome to the field of prattle.'));
    }

	handleClear() {
		// Just clear everything.
		this.pending = [];
		this.prattle = [];

		if ( this.cont )
			this.cont.innerHTML = '';

        this.addNotice(this.i18n.t('addon.pn.cleared', 'Chat was cleared'));
	}

	addPrattle(msg) {
		this.pending.push(msg);
		if ( this.pending.length > this.scrollback_limit )
			this.pending.splice(0, this.pending.length - this.scrollback_limit);

		this.scheduleUpdate();
	}

	renderLine(msg) {
        let line;

        let room = msg.roomLogin ? msg.roomLogin : msg.channel ? msg.channel.slice(1) : undefined,
            room_id = msg.roomId;

        if ( ! room && room_id ) {
            const r = this.chat.getRoom(room_id, null, true);
            if ( r && r.login )
                room = msg.roomLogin = r.login;

        } else if ( ! room_id && room ) {
            const r = this.chat.getRoom(null, room, true);
            if ( r && r.id )
                room_id = msg.roomId = r.id;
        }

        if ( msg.type && msg.type === this.site_chat.chat_types?.Notice ) {
            line = (<div
                class="chat-line__status"
                data-room={room}
                data-room-id={room_id}
            >
                { msg.message }
            </div>)

        } else  {
            const is_action = msg.messageType === this.site_chat.message_types?.Action,
                action_style = is_action ? this.chat.context.get('chat.me-style') : 0,
                action_italic = action_style >= 2,
                action_color = action_style === 1 || action_style === 3,

                raw_color = this.overrides.getColor(msg.user.id) || msg.user.color,
                color = this.site_chat.colors.process(raw_color),

                bg_css = msg.mentioned && msg.mention_color ? this.site_chat.inverse_colors.process(msg.mention_color) : null;

            const username = this.chat.formatUser(msg.user, createElement),
				override_name = this.overrides.getName(msg.user.id);

            const show_reasons = this.chat.context.get('pn.show-reason');

            let reasons = null;
            if ( show_reasons && msg.prattle_reasons )
                reasons = `[${msg.prattle_score}=${msg.prattle_reasons.join(', ')}]`;

            const reason_el = reasons ? (<span class="pn--reasons tw-pd-l-05 tw-c-text-alt-2">
                { reasons }
            </span>) : null;

			let user_class = msg.ffz_user_class;
			if ( user_class instanceof Set )
				user_class = [...user_class].join(' ');
			else if ( Array.isArray(user_class) )
				user_class = user_class.join(' ');

			const user_props = {
				className: `chat-line__username notranslate${override_name ? ' ffz--name-override tw-relative ffz-il-tooltip__container' : ''} ${user_class ?? ''}`,
				role: 'button',
				style: { color },
				// onClick: this.ffz_user_click_handler,
				// onContextMenu: t.actions.handleUserContext
			};

			if ( msg.ffz_user_props )
				Object.assign(user_props, msg.ffz_user_props);

			if ( msg.ffz_user_style )
				Object.assign(user_props.style, msg.ffz_user_style);

            line = (<div
                class={`chat-line__message${msg.deleted ? ' ffz--deleted-message' : ''}${msg.mentioned ? ' ffz-mentioned' : ''}${bg_css ? ' ffz-custom-color' : ''}`}
                data-room={room}
                data-room-id={room_id}
                data-user={msg.user.login}
                data-user-id={msg.user.id}
				style={{backgroundColor: bg_css}}
            >
                {this.chat.context.get('pn.timestamps') ? (<span class="chat-line__timestamp">
                    { this.chat.formatTime(msg.timestamp) }
                </span>) : null}
                {this.chat.context.get('pn.show-badges') ? (<span class="chat-line__message--badges">
                    { this.chat.badges.render(msg, createElement) }
                </span>) : null}
				{createElement('span', user_props, override_name
					? [
						<span class="chat-author__display_name">{ override_name }</span>,
						<div class="ffz-il-tooltip ffz-il-tooldip--down ffz-il-tooltip--align-center">{ username }</div>
					]
					: username
				)}
                <span aria-hidden="true">
                    {is_action && ! action_italic ? ' ' : ': '}
                </span>
                <span
                    class={`message ${action_italic ? 'chat-line__message-body--italicized' : ''}`}
                    style={action_color ? {color} : null}
                >
                    { msg.deleted ?
                        <a href="" onClick={this.onClickUndelete}>
                            {this.i18n.t('chat.message-deleted', '<message deleted>')}
                        </a> :
                        this.chat.renderTokens(msg.ffz_tokens, createElement)
                    }
                </span>
                {reason_el}
            </div>);
        }

        if (line) {
            line.message = msg;

            if ( msg.prattle_line )
                msg.prattle_line.replaceWith(line);
            msg.prattle_line = line;
        }

		return line;
	}

	onClickUndelete(event) {
		event.preventDefault();

		const line = event.target.closest('.chat-line__message'),
			msg = line?.message;

		if ( msg ) {
			msg.deleted = false;
			this.renderLine(msg);
		}

		return false;
	}

	scheduleUpdate() {
		if ( this.updating && ! this._update_raf )
			this._update_raf = requestAnimationFrame(this.performUpdate);
	}

	performUpdate() {
		this._update_raf = null;

		if (! this.updating)
			return;

		const pending = this.pending;
		this.pending = [];

		const scroller = this.cont?.parentElement?.parentElement;

		for(const msg of pending) {
			if ( msg.deleted || msg.ffz_removed )
				continue;

			if (this.cont) {
				const line = this.renderLine(msg);
				if (line)
					this.cont.appendChild(line);
			}

			this.prattle.push(msg);
		}

		this.trimPrattle();

		if (scroller)
			scroller.scrollTop = scroller.scrollHeight;
	}

	trimPrattle() {
		let to_remove = Math.max(0, this.prattle.length - this.scrollback_limit);
		if ( to_remove % 2 )
			to_remove--;

		while ( to_remove ) {
			const msg = this.prattle.shift();
			if ( msg.prattle_line ) {
				msg.prattle_line.remove();
				msg.prattle_line = null;
			}
			to_remove--;
		}
	}

	handleMessage(event) {
		if ( ! event.message || ! this.tester || event.defaultPrevented )
			return;

		const msg = event.message;
		if ( msg.ffz_removed || msg.deleted || ! msg.ffz_tokens )
			return;

		const type = msg.ffz_type;
		if ( type && BAD_TYPES.includes(type) )
			return;

		const threshold = this.settings.get('pn.threshold') ?? 0,
			debugging = this.settings.get('pn.show-reason');

		const ctx = {
			source: msg,
			msg: msg.message,
			tokens: msg.ffz_tokens,
			score: 0,
			threshold
		};

		if ( debugging ) {
			ctx.reasons = [];
			//ctx.threshold = Infinity;
		}

		Object.defineProperty(ctx, 'text', {
			get() {
				if ( ctx._text )
					return ctx._text;

				const out = [],
					t = ctx.tokens,
					l = t.length;
				for(let i = 0; i < l; i++) {
					const token = t[i];
					if ( token.text && ! NON_TEXT_TYPES.includes(token.type) )
						out.push(token.text);
				}

				return ctx._text = out.join('').trim();
			}
		});

		const result = this.tester(ctx);
		if ( ctx.score > threshold ) {
			msg.prattle_reasons = ctx.reasons;
			msg.prattle_score = ctx.score;
			this.addPrattle(msg);
			event.preventDefault();
		}
	}

}