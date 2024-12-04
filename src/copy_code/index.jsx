// noinspection JSUnresolvedVariable
const { createElement } = FrankerFaceZ.utilities.dom;

class CopyCode extends Addon {
	constructor(...args) {
		super(...args);
		this.inject('i18n');
		this.inject('site.elemental');

		/** @type {RegExp} */
		this.codeRegex = /Click here to redeem: (.*?)\./;
		/** @type {HTMLDivElement | undefined} */
		this.inboxPopup = undefined;
		/** @type {string} */
		this.notificationSelector = 'body > div div[role="dialog"] div.center-window > div:last-child > div.simplebar-scroll-content div[data-test-selector="center-window__content"] > div:first-child > div:not(:first-child) > div';
		/** @type {ElementalWrapper<HTMLBodyElement>} */
		this.Root = this.elemental.define(
			'notification',  this.notificationSelector,
			['notification'],
			{childNodes: true, subtree: true}, 1, 30000, false);
		/** @type {Record<string, string>} */
		this.cache = {};
		/** @type {HTMLDivElement[]} */
		this.buttons = [];
	}

	onEnable() {
		this.Root.on('mount', this.updateNotifications, this);
		this.Root.on('mutate', this.updateNotifications, this);
		this.Root.each(element => this.updateNotifications(element));
	}

	onDisable() {
		this.destroyButtons();
	}

	/**
	 * Updates notifications menus.
	 * @param {HTMLDivElement} element The element that was mutated or mounted.
	 */
	updateNotifications(element) {
		try {
			this.updateButton(element);
		} catch (error) {
			this.log.error(error);
		}
	}

	/**
	 * Destroys all button instances.
	 */
	destroyButtons() {
		const count = this.buttons.length;
		for (let i = count - 1; i >= 0; i--) {
			this.log.info('pop', i);
			this.log.info('remove', this.buttons[i]);
			this.log.info('count', count);
			this.buttons[i]?.remove();
			this.buttons.pop();
		}
	}

	/**
	 * Creates all the button and/or updates them.
	 * @param {HTMLDivElement} element The element that was mutated or mounted.
	 * @returns {void} Nothing...
	 */
	updateButton(element) {
		/** @type {HTMLParagraphElement | undefined} */
		const notificationBody = element.querySelector('div[data-test-selector="persistent-notification__body"] > span > p');

		if (!notificationBody)
			return;

		/** @type {HTMLDivElement | undefined} */
		const button = element.querySelector('.ffz--copy-code-button');

		if (button)
			return;

		if (!this.codeRegex.test(notificationBody.innerText))
			return;

		if (this.cache[notificationBody.innerText] === undefined) {
			/** @type {string[] | null} */
			const match = notificationBody.innerText.match(this.codeRegex);

			if (match === null || match.length != 2)
				return;

			/** @type {string} */
			this.cache[notificationBody.innerText] = match[1];
		}

		/** @type {string} */
		const code = this.cache[notificationBody.innerText];

		/** @type {string} */
		const label = this.i18n.t('addon.copy_code.button.label', 'Copy redeem code');

		/** @type {HTMLDivElement} */
		const cont = (<div class="ffz--copy-code-button tw-inline-flex tw-relative ffz-il-tooltip__container tw-mg-t-05">
			<button
				class="tw-align-items-center tw-align-middle tw-border-bottom-left-radius-medium tw-border-bottom-right-radius-medium tw-border-top-left-radius-medium tw-border-top-right-radius-medium tw-button-icon tw-button-icon--overlay ffz-core-button ffz-core-button--border ffz-core-button--overlay tw-inline-flex tw-interactive tw-justify-content-center tw-overflow-hidden tw-relative"
				type="button"
				title={label}
				aria-label={label}
				data-a-target="ffz-inbox-copy-button"
				data-code={code}
				onClick={this.onButtonClick.bind(this)} // eslint-disable-line react/jsx-no-bind
			>
				<div class="tw-align-items-center tw-flex tw-flex-grow-0">
					<div class="tw-button-icon__icon">
						<figure class="ffz-fa-copy ffz-i-docs" />
					</div>
				</div>
			</button>
			<div title={label} class="ffz-il-tooltip ffz-il-tooltip--align-left ffz-il-tooltip--up" role="tooltip">{label}</div>
		</div>);

		this.buttons.push(cont);

		/** @type {HTMLDivElement | undefined} */
		const thing = element.querySelector('a > div > div');
		if (thing) {
			thing.appendChild(cont);
		}
	}

	/**
	 * Finds the parent element based on the selector.
	 * @param {HTMLElement} element the element to find the parent of.
	 * @param {string} selector the selector to check for if it is the element.
	 * @returns {HTMLElement | undefined} the element if found; otherwise undefined.
	 */
	findParent(element, selector) {
		/** @type {HTMLElement | undefined} */
		let found;
		/** @type {HTMLElement | undefined} */
		let lastParent = element.parentElement;

		while (!found && lastParent) {
			if (lastParent.nodeName === 'HTML' || lastParent.nodeName === 'BODY') {
				lastParent = undefined;
			}
			if (lastParent.nodeName.toLowerCase() === selector.toLowerCase()) {
				found = lastParent;
			} else if (document.querySelector(selector) === lastParent) {
				found = lastParent;
			} else {
				lastParent = lastParent.parentElement;
			}
		}
		return found;
	}

	/**
	 * Handles the copy button click.
	 * @param {Event} event The click event that fires this method.
	 */
	onButtonClick(event) {
		// Prevent bubbling.
		event.preventDefault();
		try {
			/** @type {string | undefined} */
			const code = this.findParent(event.target, 'button').getAttribute('data-code');
			if (!code)
				throw new Error('could not get attribute, "data-code", on event target');
			try {
				navigator.clipboard.writeText(code);
			} catch (err) {
				this.log.error('Clipboard is not accessible', err);
			}
		} catch (err) {
			this.log.error('Failed to copy redeem code.', event, err);
		}
	}
}

CopyCode.register();