// noinspection JSUnresolvedVariable
const { createElement } = FrankerFaceZ.utilities.dom;

class CopyCode extends Addon {
	constructor(...args) {
		super(...args);
		this.inject('i18n');

		/** @type {RegExp} */
		this.codeRegex = /Click here to redeem: (.*?)\./;
		/** @type {HTMLDivElement | undefined} */
		this.inboxPopup = undefined;
		/** @type {string} */
		/** @type {FineWrapper<HTMLBodyElement>} */
		// this.RootFine = this.fine.define(
		//	'notification', () => true);
		/** @type {Record<string, string>} */
		this.cache = {};
		/** @type {HTMLDivElement[]} */
		this.buttons = [];
	}

	/**
	 * Triggered on enable of the add-on
	 */
	onEnable() {
		this.notificationObserver = new MutationObserver(this.notificationObserverCallback.bind(this));
		this.notificationObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
	}

	elementIs(element, ...queries) {
		for (const query of queries) {
			const queried = document.querySelector(query);
			if (queried == element) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Updates notifications menus.
	 * @param {MutationRecord[]} mutations The list of mutations
	 * @param {MutationObserver} _observer The mutation observer
	 */
	/* eslint-disable-next-line no-unused-vars */
	notificationObserverCallback(mutations, _observer) {
		for (const mutation of mutations) {
			if ((mutation.type === 'childList' && mutation.addedNodes.length > 0 && this.elementIs(mutation.target, 'div[data-test-selector="center-window__content"]')) || this.elementIs(mutation.target, '.ReactModal__Body--open')) {
				for (const element of mutation.addedNodes) {
					for (const innerElement of element.querySelectorAll('div.simplebar-scroll-content div[data-test-selector="center-window__content"] > div > div:not(:first-child) > div')) {
						this.updateButton(innerElement);
					}
				}
			}
		}
	}

	/**
	 * Triggered on disabling of the add-on
	 */
	onDisable() {
		this.notificationObserver.disconnect();
		this.destroyButtons();
	}

	/**
	 * Destroys all button instances.
	 */
	destroyButtons() {
		// statically store the count of how many buttons.
		const count = this.buttons.length;
		// Loop from end to the beginning of the array as pop() removes the last one.
		for (let i = count - 1; i >= 0; i--) {
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
		if (!element) return;

		/** @type {HTMLParagraphElement | undefined} */
		const notificationBody = element.querySelector('div[data-test-selector="persistent-notification__body"] > span > p');

		if (!notificationBody) return;

		/** @type {HTMLDivElement | undefined} */
		const button = element.querySelector('.ffz--copy-code-button');

		if (button) return;

		if (!this.codeRegex.test(notificationBody.innerText)) return;

		if (this.cache[notificationBody.innerText] === undefined) {
			/** @type {string[] | null} */
			const match = notificationBody.innerText.match(this.codeRegex);

			if (match === null || match.length != 2) return;

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
				this.log.error('Clipboard is not accessible', event, err);
			}
		} catch (err) {
			this.log.error('Failed to copy redeem code.', event, err);
		}
	}
}

CopyCode.register();