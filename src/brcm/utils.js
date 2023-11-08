/**
 * @param {MouseEvent} event
 * @returns {{x: number, y: number}}
 */
export const getMousePos = event => ({
	x: event.pageX ? event.pageX : event.clientX + (document.documentElement.scrollLeft ?
		document.documentElement.scrollLeft : document.body.scrollLeft),
	y: event.pageY ? event.pageY : event.clientY + (document.documentElement.scrollTop ?
		document.documentElement.scrollTop : document.body.scrollTop)
});

/**
 * @param {HTMLElement|EventTarget} element
 * @param {number} [parentCount]
 * @param {number} [itr]
 * @returns {string}
 */
export const getParentClassNames = (element, parentCount = Number.MAX_SAFE_INTEGER, itr = 0) =>
	`${element.className} ${(itr < parentCount) && element.parentElement ? getParentClassNames(element.parentElement, parentCount, ++itr) : ''}`;

/**
 * @param {number} start
 * @param {number} end
 * @param {number} [step]
 * @returns {number[]}
 */
export const range = (start, end, step = 1) => {
	if (start === end) return [start];
	return [start, ...range(start + 1, end)].filter(n => n % step === 0);
};

/**
 * @param {string} str
 * @returns {string}
 */
export const titlize = str => str.split('_').map(word => word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()).join(' ');

/**
 * @param {string} str
 * @returns {string}
 */
export const capitalize = str => (str.charAt(0).toUpperCase() + str.substring(1).toLowerCase()).split('_').join(' ');

/**
 * @param {string} moduleKey
 * @param {string} submoduleKey
 * @returns {string}
 */
export const getConfigKey = (moduleKey, submoduleKey) => `add_ons.brcm.module.${moduleKey}.module.config.${submoduleKey}`;
