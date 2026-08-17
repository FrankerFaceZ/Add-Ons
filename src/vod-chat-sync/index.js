'use strict';

import STYLE_URL from './style.scss';
import {clampOffset, formatOffset, parseOffset} from './time';

const STORAGE_KEY = 'addon.vod-chat-sync.offsets';
const MAX_SAVED_VODS = 100;
const REFRESH_ACTION = '@@vod-chat-sync/OFFSET_CHANGED';
const VIDEO_TIME_ACTION = 'vodChat.video.CURRENT_VIDEO_TIME_CHANGED';
const VIDEO_ROUTES = ['video', 'user-video'];

class VodChatSync extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('site');
		this.inject('site.fine');
		this.inject('site.router');

		this.offsets = new Map;
		this.storeRecords = new Map;
		this.controllerRecords = new Map;
		this.toolbars = new Map;
		this.retryTimers = new Map;
		this.commentClones = new WeakMap;
		this.warnedControllers = new WeakSet;

		this._addonEnabled = false;
		this._renderPatch = null;
		this._controllerClass = null;

		this.onControllerReady = this.onControllerReady.bind(this);
		this.onControllerMount = this.onControllerMount.bind(this);
		this.onControllerProps = this.onControllerProps.bind(this);
		this.onControllerUpdate = this.onControllerUpdate.bind(this);
		this.onControllerUnmount = this.onControllerUnmount.bind(this);
		this.onRoute = this.onRoute.bind(this);

		this.VideoChatController = this.fine.define(
			'vod-chat-sync-controller',
			node => node.onError && node.videoData && node.props?.comments,
			VIDEO_ROUTES
		);

		this.settings.add('addon.vod-chat-sync.enabled', {
			default: true,
			ui: {
				path: 'Add-Ons > VOD Chat Sync >> General',
				title: 'Enable VOD Chat Sync',
				description: 'Show manual timing controls for Chat on Videos and apply saved offsets.',
				component: 'setting-check-box'
			},
			changed: value => this.onSettingChanged(value)
		});
	}

	onEnable() {
		this._addonEnabled = true;
		this.loadOffsets();
		this.mountStyles();

		this.VideoChatController.on('mount', this.onControllerMount, this);
		this.VideoChatController.on('receive-props', this.onControllerProps, this);
		this.VideoChatController.on('update', this.onControllerUpdate, this);
		this.VideoChatController.on('unmount', this.onControllerUnmount, this);
		this.router.on(':route', this.onRoute, this);

		this.VideoChatController.ready(this.onControllerReady);
	}

	onDisable() {
		this._addonEnabled = false;

		this.VideoChatController.off('mount', this.onControllerMount, this);
		this.VideoChatController.off('receive-props', this.onControllerProps, this);
		this.VideoChatController.off('update', this.onControllerUpdate, this);
		this.VideoChatController.off('unmount', this.onControllerUnmount, this);
		this.VideoChatController.off('set', this.onControllerReady);
		this.router.off(':route', this.onRoute, this);

		this.deactivateAll();
		this.unmountStyles();
		this._controllerClass = null;
	}

	onControllerReady(cls, instances) {
		if ( ! this._addonEnabled )
			return;

		this._controllerClass = cls;

		for(const instance of instances)
			this.onControllerMount(instance);
	}

	onControllerMount(instance) {
		if ( ! this.isFeatureEnabled() )
			return;

		this.attachController(instance);
	}

	onControllerProps(instance, nextProps) {
		if ( ! this.isFeatureEnabled() )
			return;

		const nextVideoID = this.getControllerVideoID(nextProps);
		if ( ! this.isSupportedVideo(nextVideoID) ) {
			this.detachController(instance);
			return;
		}

		const controller = this.controllerRecords.get(instance);
		if ( controller && controller.videoID !== nextVideoID ) {
			controller.videoID = nextVideoID;
			this.refreshStoreVideoID(controller.storeRecord);
			this.removeToolbar(instance);
		}
	}

	onControllerUpdate(instance) {
		if ( ! this.isFeatureEnabled() ) {
			this.detachController(instance);
			return;
		}

		const controller = this.controllerRecords.get(instance),
			videoID = this.getControllerVideoID(instance.props);

		if ( controller && controller.videoID !== videoID ) {
			if ( ! this.isSupportedVideo(videoID) ) {
				this.detachController(instance);
				return;
			}

			controller.videoID = videoID;
			this.refreshStoreVideoID(controller.storeRecord);
			this.removeToolbar(instance);
		}

		if ( ! this.controllerRecords.has(instance) )
			this.attachController(instance);
		else {
			this.ensureToolbar(instance);
			this.updateToolbar(instance);
		}
	}

	onControllerUnmount(instance) {
		this.detachController(instance);
	}

	onRoute() {
		if ( ! this.getURLVideoID() ) {
			for(const instance of Array.from(this.controllerRecords.keys()))
				this.detachController(instance);
			return;
		}

		if ( this.isFeatureEnabled() )
			for(const instance of this.VideoChatController.instances)
				this.attachController(instance);
	}

	onSettingChanged(enabled) {
		if ( ! this._addonEnabled )
			return;

		if ( enabled ) {
			this.mountStyles();
			for(const instance of this.VideoChatController.instances)
				this.attachController(instance);
		} else {
			this.deactivateAll();
			this.unmountStyles();
		}
	}

	isFeatureEnabled() {
		return this._addonEnabled && this.settings.get('addon.vod-chat-sync.enabled');
	}

	getURLVideoID() {
		return location.pathname.match(/^\/videos\/(\d+)(?:\/|$)/)?.[1] ?? null;
	}

	getControllerVideoID(props) {
		const videoID = props?.videoID;
		return videoID == null ? null : String(videoID);
	}

	isSupportedVideo(videoID) {
		const urlVideoID = this.getURLVideoID();
		return !! urlVideoID && videoID === urlVideoID;
	}

	attachController(instance, attempt = 0) {
		if ( ! this.isFeatureEnabled() || this.controllerRecords.has(instance) ) {
			if ( this.controllerRecords.has(instance) ) {
				this.ensureToolbar(instance);
				this.updateToolbar(instance);
			}
			return;
		}

		const videoID = this.getControllerVideoID(instance.props);
		if ( ! this.isSupportedVideo(videoID) )
			return;

		const store = this.findStore(instance);
		if ( ! store ) {
			if ( attempt < 8 ) {
				this.clearRetry(instance);
				this.retryTimers.set(instance, setTimeout(() => {
					this.retryTimers.delete(instance);
					this.attachController(instance, attempt + 1);
				}, 250));
			} else if ( ! this.warnedControllers.has(instance) ) {
				this.warnedControllers.add(instance);
				this.log.warn('Unable to locate the Twitch Redux store for Chat on Videos. VOD Chat Sync will remain inactive.');
			}
			return;
		}

		if ( ! this.isCompatibleController(instance, store) ) {
			this.warnIncompatible(instance);
			return;
		}

		if ( ! this.installRenderPatch(this._controllerClass || instance.constructor) ) {
			this.warnIncompatible(instance);
			return;
		}

		const storeRecord = this.wrapStore(store);
		if ( ! storeRecord ) {
			if ( ! this.controllerRecords.size )
				this.removeRenderPatch();
			this.warnIncompatible(instance);
			return;
		}

		storeRecord.instances.add(instance);
		this.controllerRecords.set(instance, {storeRecord, videoID});
		this.refreshStoreVideoID(storeRecord);
		this.ensureToolbar(instance);
		this.updateToolbar(instance);
		this.dispatchRefresh(storeRecord);
	}

	detachController(instance) {
		this.clearRetry(instance);
		this.removeToolbar(instance);

		const controller = this.controllerRecords.get(instance);
		if ( ! controller )
			return;

		this.controllerRecords.delete(instance);
		controller.storeRecord.instances.delete(instance);

		if ( controller.storeRecord.instances.size )
			this.refreshStoreVideoID(controller.storeRecord);
		else
			this.restoreStore(controller.storeRecord);

		if ( ! this.controllerRecords.size )
			this.removeRenderPatch();
	}

	deactivateAll() {
		for(const timer of this.retryTimers.values())
			clearTimeout(timer);
		this.retryTimers.clear();

		for(const instance of Array.from(this.toolbars.keys()))
			this.removeToolbar(instance);

		this.controllerRecords.clear();
		for(const record of Array.from(this.storeRecords.values()))
			this.restoreStore(record);

		this.removeRenderPatch();
	}

	clearRetry(instance) {
		const timer = this.retryTimers.get(instance);
		if ( timer ) {
			clearTimeout(timer);
			this.retryTimers.delete(instance);
		}
	}

	findStore(instance) { // eslint-disable-line class-methods-use-this
		let fiber = instance?._reactInternals || instance?._reactInternalFiber;

		while(fiber) {
			for(const props of [fiber.memoizedProps, fiber.pendingProps]) {
				const store = props?.store;
				if ( typeof store?.getState === 'function' && typeof store?.dispatch === 'function' )
					return store;
			}

			fiber = fiber.return;
		}

		return null;
	}

	isCompatibleController(instance, store) { // eslint-disable-line class-methods-use-this
		let state;
		try {
			state = store.getState();
		} catch(err) {
			return false;
		}

		return (
			Array.isArray(instance.props?.comments) &&
			typeof instance.constructor?.prototype?.render === 'function' &&
			typeof state?.vodChat?.comments?.currentVideoTime === 'number'
		);
	}

	warnIncompatible(instance) {
		if ( this.warnedControllers.has(instance) )
			return;

		this.warnedControllers.add(instance);
		this.log.warn('The Twitch Chat on Videos structure is incompatible. VOD Chat Sync will remain inactive.');
	}

	wrapStore(store) {
		const existing = this.storeRecords.get(store);
		if ( existing )
			return existing;

		const record = {
			store,
			instances: new Set,
			videoID: null,
			originalGetState: store.getState,
			wrappedGetState: null,
			lastRawState: null,
			lastOffset: null,
			lastVideoID: null,
			lastResult: null,
			lastActualVideoTime: null,
			syntheticVideoTime: null
		};

		record.wrappedGetState = () => {
			const rawState = record.originalGetState.call(store),
				comments = rawState?.vodChat?.comments,
				offset = record.videoID ? this.getOffset(record.videoID) : 0;

			if ( ! comments || typeof comments.currentVideoTime !== 'number' ) {
				record.syntheticVideoTime = null;
				record.lastActualVideoTime = null;
				record.lastRawState = rawState;
				record.lastOffset = offset;
				record.lastVideoID = record.videoID;
				record.lastResult = rawState;
				return rawState;
			}

			const isSynthetic = record.syntheticVideoTime === comments.currentVideoTime;
			if ( ! isSynthetic ) {
				record.syntheticVideoTime = null;
				record.lastActualVideoTime = comments.currentVideoTime;
			}

			if ( isSynthetic || ! offset ) {
				record.lastRawState = rawState;
				record.lastOffset = offset;
				record.lastVideoID = record.videoID;
				record.lastResult = rawState;
				return rawState;
			}

			if (
				record.lastRawState === rawState &&
				record.lastOffset === offset &&
				record.lastVideoID === record.videoID
			)
				return record.lastResult;

			const shiftedComments = {
				...comments,
				currentVideoTime: Math.max(0, comments.currentVideoTime + offset)
			};

			record.lastRawState = rawState;
			record.lastOffset = offset;
			record.lastVideoID = record.videoID;
			record.lastResult = {
				...rawState,
				vodChat: {
					...rawState.vodChat,
					comments: shiftedComments
				}
			};

			return record.lastResult;
		};

		try {
			store.getState = record.wrappedGetState;
		} catch(err) {
			return null;
		}

		if ( store.getState !== record.wrappedGetState )
			return null;

		this.storeRecords.set(store, record);
		return record;
	}

	refreshStoreVideoID(record) {
		let videoID = null;
		for(const instance of record.instances) {
			const controller = this.controllerRecords.get(instance);
			if ( controller?.videoID )
				videoID = controller.videoID;
		}

		if ( record.videoID !== videoID ) {
			record.videoID = videoID;
			record.syntheticVideoTime = null;
			record.lastActualVideoTime = null;
			record.lastRawState = null;
			record.lastResult = null;
			this.dispatchTimeChange(record);
		}
	}

	restoreStore(record) {
		if ( record.store.getState === record.wrappedGetState ) {
			this.restoreActualVideoTime(record);
			record.store.getState = record.originalGetState;
		} else
			this.log.warn('Twitch Redux getState changed while VOD Chat Sync was active; leaving the newer implementation untouched.');

		record.instances.clear();
		record.videoID = null;
		this.storeRecords.delete(record.store);

		try {
			record.store.dispatch({type: REFRESH_ACTION});
		} catch(err) {
			this.log.warn('Unable to refresh Chat on Videos while restoring Redux state.', err);
		}
	}

	getActualVideoTime(record) {
		let rawState;
		try {
			rawState = record.originalGetState.call(record.store);
		} catch(err) {
			return null;
		}

		const rawTime = rawState?.vodChat?.comments?.currentVideoTime;
		if ( typeof rawTime !== 'number' )
			return null;

		if (
			record.syntheticVideoTime === rawTime &&
			typeof record.lastActualVideoTime === 'number'
		)
			return record.lastActualVideoTime;

		record.syntheticVideoTime = null;
		record.lastActualVideoTime = rawTime;
		return rawTime;
	}

	dispatchTimeChange(record) {
		const actualTime = this.getActualVideoTime(record);
		if ( actualTime == null ) {
			this.dispatchRefresh(record);
			return;
		}

		const offset = record.videoID ? this.getOffset(record.videoID) : 0,
			shiftedTime = Math.max(0, actualTime + offset);

		record.lastActualVideoTime = actualTime;
		record.syntheticVideoTime = shiftedTime;
		record.lastRawState = null;
		record.lastResult = null;

		try {
			record.store.dispatch({type: VIDEO_TIME_ACTION, updatedTime: shiftedTime});
		} catch(err) {
			record.syntheticVideoTime = null;
			this.log.warn('Unable to update the native Chat on Videos time after changing its offset.', err);
			this.dispatchRefresh(record);
		}
	}

	restoreActualVideoTime(record) {
		const actualTime = this.getActualVideoTime(record);
		record.syntheticVideoTime = null;

		if ( actualTime == null )
			return;

		try {
			record.store.dispatch({type: VIDEO_TIME_ACTION, updatedTime: actualTime});
		} catch(err) {
			this.log.warn('Unable to restore the native Chat on Videos time.', err);
		}
	}

	dispatchRefresh(record) {
		record.lastRawState = null;
		record.lastResult = null;

		try {
			record.store.dispatch({type: REFRESH_ACTION});
		} catch(err) {
			this.log.warn('Unable to refresh Chat on Videos after changing its offset.', err);
		}
	}

	installRenderPatch(cls) {
		if ( this._renderPatch )
			return this._renderPatch.cls === cls;

		if ( typeof cls?.prototype?.render !== 'function' )
			return false;

		const addon = this,
			originalRender = cls.prototype.render;

		/* eslint-disable no-invalid-this */
		function wrappedRender(...args) {
			const videoID = addon.getControllerVideoID(this.props),
				offset = videoID ? addon.getOffset(videoID) : 0;

			if ( ! addon.isFeatureEnabled() || ! addon.isSupportedVideo(videoID) || ! Array.isArray(this.props?.comments) )
				return originalRender.apply(this, args);

			const originalProps = this.props;
			this.props = {
				...originalProps,
				comments: addon.cloneMessageContexts(originalProps.comments, offset)
			};

			try {
				return originalRender.apply(this, args);
			} finally {
				this.props = originalProps;
			}
		}
		/* eslint-enable no-invalid-this */

		try {
			cls.prototype.render = wrappedRender;
		} catch(err) {
			return false;
		}

		if ( cls.prototype.render !== wrappedRender )
			return false;

		this._renderPatch = {cls, originalRender, wrappedRender};
		return true;
	}

	removeRenderPatch() {
		const patch = this._renderPatch;
		if ( ! patch )
			return;

		if ( patch.cls.prototype.render === patch.wrappedRender )
			patch.cls.prototype.render = patch.originalRender;
		else
			this.log.warn('The Chat on Videos render method changed while VOD Chat Sync was active; leaving the newer implementation untouched.');

		this._renderPatch = null;
	}

	cloneMessageContexts(contexts, offset) {
		const timed = [];
		let outOfOrder = false,
			previousOffset = -Infinity;

		for(let index = 0; index < contexts.length; index++) {
			const context = contexts[index],
				contentOffset = context?.comment?.contentOffset;

			if ( Number.isFinite(contentOffset) ) {
				if ( contentOffset < previousOffset )
					outOfOrder = true;
				previousOffset = contentOffset;
				timed.push({context, contentOffset, index});
			}
		}

		if ( ! offset && ! outOfOrder )
			return contexts;

		// Twitch can merge newly fetched VOD ranges into the existing list out of order.
		timed.sort((left, right) =>
			left.contentOffset - right.contentOffset || left.index - right.index
		);

		let timedIndex = 0;
		return contexts.map(context => {
			if ( Number.isFinite(context?.comment?.contentOffset) )
				context = timed[timedIndex++].context;

			return this.cloneMessageContext(context, offset);
		});
	}

	cloneMessageContext(context, offset) {
		if ( ! context?.comment )
			return context;

		return {
			...context,
			comment: this.cloneComment(context.comment, offset),
			replies: Array.isArray(context.replies)
				? context.replies.map(reply => this.cloneMessageContext(reply, offset))
				: context.replies
		};
	}

	cloneComment(comment, offset) {
		let cached = this.commentClones.get(comment);
		if ( ! cached || cached.offset !== offset ) {
			const contentOffset = typeof comment.contentOffset === 'number'
				? Math.max(0, comment.contentOffset - offset)
				: comment.contentOffset;

			cached = {
				offset,
				comment: {
					...comment,
					contentOffset
				}
			};
			this.commentClones.set(comment, cached);
		}

		return cached.comment;
	}

	findHeaderTitle(header) { // eslint-disable-line class-methods-use-this
		const interactive = 'button, a, input, [role="button"]',
			heading = header.querySelector('h1, h2, h3, h4, h5, h6'),
			candidates = heading ? [heading] : header.querySelectorAll('span, p, div');

		let title = null;
		for(const candidate of candidates) {
			if (
				candidate.closest(interactive) ||
				(! heading && candidate.children.length) ||
				! candidate.textContent?.trim()
			)
				continue;

			title = candidate;
			break;
		}

		if ( ! title )
			return null;

		while(
			title.parentElement !== header &&
			title.parentElement?.childElementCount === 1 &&
			! title.parentElement.matches(interactive)
		)
			title = title.parentElement;

		return title;
	}

	ensureToolbar(instance) {
		const existing = this.toolbars.get(instance);
		if (
			existing?.element?.isConnected &&
			existing.title?.isConnected &&
			existing.title.classList.contains('vod-chat-sync__native-title') &&
			existing.header.classList.contains('vod-chat-sync-host')
		)
			return existing;

		if ( existing )
			this.removeToolbar(instance);

		const rootNode = this.fine.getChildNode(instance),
			root = rootNode instanceof HTMLElement && rootNode.matches('.video-chat')
				? rootNode
				: rootNode?.querySelector?.('.video-chat'),
			header = root?.querySelector?.('.video-chat__header'),
			title = header ? this.findHeaderTitle(header) : null;

		if ( ! header || ! title )
			return null;

		const toolbar = document.createElement('div');
		toolbar.className = 'vod-chat-sync';
		toolbar.setAttribute('role', 'group');
		toolbar.setAttribute('aria-label', 'VOD chat offset');

		for(const delta of [-10, -1])
			toolbar.appendChild(this.createStepButton(delta));

		const input = document.createElement('input');
		input.className = 'vod-chat-sync__input';
		input.type = 'text';
		input.inputMode = 'numeric';
		input.autocomplete = 'off';
		input.spellcheck = false;
		input.setAttribute('aria-label', 'Chat offset');
		toolbar.appendChild(this.createTooltipControl(
			input,
			'Chat offset. Positive values advance chat; negative values delay it. Enter seconds, MM:SS, or HH:MM:SS.',
			'center',
			true
		));

		for(const delta of [1, 10])
			toolbar.appendChild(this.createStepButton(delta));

		const reset = document.createElement('button');
		reset.className = 'vod-chat-sync__button vod-chat-sync__reset';
		reset.type = 'button';
		reset.setAttribute('aria-label', 'Reset chat offset');
		reset.innerHTML = '<figure class="ffz-i-cw"></figure>';
		toolbar.appendChild(this.createTooltipControl(reset, 'Reset chat offset', 'right'));

		const onClick = event => {
			const button = event.target.closest('button');
			if ( ! button || ! toolbar.contains(button) )
				return;

			const videoID = this.controllerRecords.get(instance)?.videoID;
			if ( ! videoID )
				return;

			if ( button === reset )
				this.setOffset(videoID, 0);
			else if ( button.dataset.delta )
				this.setOffset(videoID, this.getOffset(videoID) + Number.parseInt(button.dataset.delta, 10));
		};

		const onInput = () => {
			input.setAttribute('aria-invalid', parseOffset(input.value) == null ? 'true' : 'false');
		};

		const commitInput = () => {
			const videoID = this.controllerRecords.get(instance)?.videoID,
				value = parseOffset(input.value);

			if ( videoID && value != null )
				this.setOffset(videoID, value);
			else
				this.updateToolbar(instance, true);
		};

		let cancelBlur = false;
		const onBlur = () => {
			if ( cancelBlur )
				cancelBlur = false;
			else
				commitInput();
		};

		const onKeyDown = event => {
			if ( event.key === 'Enter' ) {
				event.preventDefault();
				input.blur();
			} else if ( event.key === 'Escape' ) {
				event.preventDefault();
				cancelBlur = true;
				this.updateToolbar(instance, true);
				input.blur();
			}
		};

		toolbar.addEventListener('click', onClick);
		input.addEventListener('input', onInput);
		input.addEventListener('keydown', onKeyDown);
		input.addEventListener('blur', onBlur);

		title.classList.add('vod-chat-sync__native-title');
		header.classList.add('vod-chat-sync-host');
		header.appendChild(toolbar);
		const record = {element: toolbar, header, input, reset, title};
		this.toolbars.set(instance, record);
		this.updateToolbar(instance, true);
		return record;
	}

	createTooltipControl(control, text, alignment = 'center', wrap = false) { // eslint-disable-line class-methods-use-this
		const container = document.createElement('div');
		container.className = 'vod-chat-sync__control tw-relative ffz-il-tooltip__container';
		container.appendChild(control);

		const tooltip = document.createElement('div');
		tooltip.className = `ffz-il-tooltip ffz-il-tooltip--down ffz-il-tooltip--align-${alignment}`;
		if ( wrap )
			tooltip.classList.add('ffz-il-tooltip--wrap', 'ffz-balloon--md');
		tooltip.setAttribute('role', 'tooltip');
		tooltip.textContent = text;
		container.appendChild(tooltip);
		return container;
	}

	createStepButton(delta) {
		const seconds = Math.abs(delta),
			direction = delta > 0 ? 'Advance' : 'Delay',
			label = `${direction} chat by ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;

		const button = document.createElement('button');
		button.className = 'vod-chat-sync__button';
		button.type = 'button';
		button.dataset.delta = String(delta);
		button.textContent = delta > 0 ? `+${delta}` : String(delta);
		button.setAttribute('aria-label', label);
		return this.createTooltipControl(button, label);
	}

	updateToolbar(instance, forceInput = false) {
		const toolbar = this.toolbars.get(instance),
			videoID = this.controllerRecords.get(instance)?.videoID;
		if ( ! toolbar || ! videoID )
			return;

		const offset = this.getOffset(videoID);
		if ( forceInput || document.activeElement !== toolbar.input ) {
			toolbar.input.value = formatOffset(offset);
			toolbar.input.setAttribute('aria-invalid', 'false');
		}

		toolbar.reset.disabled = offset === 0;
		toolbar.element.dataset.videoId = videoID;
	}

	removeToolbar(instance) {
		const toolbar = this.toolbars.get(instance);
		if ( toolbar ) {
			toolbar.element.remove();
			toolbar.title.classList.remove('vod-chat-sync__native-title');
			toolbar.header.classList.remove('vod-chat-sync-host');
			this.toolbars.delete(instance);
		}
	}

	loadOffsets() {
		this.offsets.clear();
		const stored = this.settings.provider.get(STORAGE_KEY, {});
		if ( ! stored || typeof stored !== 'object' || Array.isArray(stored) )
			return;

		for(const [videoID, entry] of Object.entries(stored)) {
			const offset = clampOffset(entry?.offset),
				updatedAt = Number.isFinite(entry?.updatedAt) ? entry.updatedAt : 0;

			if ( /^\d+$/.test(videoID) && offset )
				this.offsets.set(videoID, {offset, updatedAt});
		}
	}

	getOffset(videoID) {
		return this.offsets.get(String(videoID))?.offset ?? 0;
	}

	setOffset(videoID, value) {
		videoID = String(videoID);
		const offset = clampOffset(value);

		if ( offset )
			this.offsets.set(videoID, {offset, updatedAt: Date.now()});
		else
			this.offsets.delete(videoID);

		this.pruneOffsets();
		this.persistOffsets();

		for(const [instance, controller] of this.controllerRecords)
			if ( controller.videoID === videoID )
				this.updateToolbar(instance, true);

		for(const record of this.storeRecords.values())
			if ( record.videoID === videoID )
				this.dispatchTimeChange(record);

	}

	pruneOffsets() {
		if ( this.offsets.size <= MAX_SAVED_VODS )
			return;

		const entries = Array.from(this.offsets.entries())
			.sort((a, b) => b[1].updatedAt - a[1].updatedAt)
			.slice(0, MAX_SAVED_VODS);

		this.offsets = new Map(entries);
	}

	persistOffsets() {
		const stored = {};
		for(const [videoID, entry] of this.offsets)
			stored[videoID] = entry;

		if ( Object.keys(stored).length )
			this.settings.provider.set(STORAGE_KEY, stored);
		else
			this.settings.provider.delete(STORAGE_KEY);
	}

	mountStyles() {
		if ( this.styleLink || ! this.settings.get('addon.vod-chat-sync.enabled') )
			return;

		this.styleLink = document.createElement('link');
		this.styleLink.rel = 'stylesheet';
		this.styleLink.type = 'text/css';
		this.styleLink.crossOrigin = 'anonymous';
		this.styleLink.href = STYLE_URL;
		document.head.appendChild(this.styleLink);
	}

	unmountStyles() {
		this.styleLink?.remove();
		this.styleLink = null;
	}
}

VodChatSync.register();
