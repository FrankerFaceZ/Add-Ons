import { SETTING_KEYS } from './settings.js';

/**
 * Chat filters, the same four rules the Starlit browser extension applies
 * (its core/chat-filters.ts): a line is classified once from who wrote it
 * and what it says, then the settings decide whether it hides.
 *
 *   catch_command   a player's !fish / !hunt / !dig / !beg / !search
 *   catch_response  the bot answering one of those
 *   command         any other line that starts with the command prefix
 *   bot_response    any other bot line
 *
 * The Catches control touches the catch pair (everyone's, only mine, none);
 * the separate switch hides every command and every bot line, the welcomes
 * and records included.
 */

const OFFICIAL_LOGINS = ['starlitgg', 'starlitgg_dev', 'starlitgg_staging'];
const CATCH_COMMAND = /^!\s*(fish|hunt|dig|beg|search)\b/i;
const COMMAND = /^!\S/;
// The two whiff lines with no catch verb count too, so hiding catches hides a failed attempt.
const CATCH_REPLY = /\b(fish|fishing|cast|reel|reeled|catch|hunt|hunting|bagged|game|dig|digging|dug|beg|begging|pity|search|searched)\b|\bthe woods were empty\b|\bnobody gave you anything\b/i;

export function classifyLine(login, text) {
	const t = (text || '').trim();
	if (!t) return null;
	const who = login ? String(login).toLowerCase() : null;
	if (who && OFFICIAL_LOGINS.includes(who)) {
		// The player a bot line addresses is the leading "@name" (7TV renders
		// the mention without the "@", so a leading login-shaped word counts).
		const m = /^@?([A-Za-z0-9_]{2,30})\b/.exec(t);
		return { kind: CATCH_REPLY.test(t) ? 'catch_response' : 'bot_response', who: m ? m[1].toLowerCase() : null };
	}
	if (CATCH_COMMAND.test(t)) return { kind: 'catch_command', who };
	if (COMMAND.test(t)) return { kind: 'command', who };
	return null;
}

export function shouldHide(c, catches, hideAll, selfLogin) {
	if (!c) return false;
	if (hideAll) return true;
	if (c.kind !== 'catch_command' && c.kind !== 'catch_response') return false;
	if (catches === 'hidden') return true;
	if (catches === 'mine') return !(selfLogin && c.who && c.who === selfLogin.toLowerCase());
	return false;
}

export class Filters extends FrankerFaceZ.utilities.module.Module {
	constructor(...args) {
		super(...args);

		this.inject('settings');
		this.inject('chat');
		this.inject('site');

		this.handleMessage = this.handleMessage.bind(this);
	}

	onEnable() {
		this.on('chat:receive-message', this.handleMessage);
	}

	onDisable() {
		this.off('chat:receive-message', this.handleMessage);
	}

	/** The signed-in viewer's login, lowercase, for "only my catches". */
	selfLogin() {
		const user = this.site.getUser?.();
		return user && user.login ? String(user.login).toLowerCase() : null;
	}

	handleMessage(event) {
		const msg = event && event.message;
		if (!msg || event.defaultPrevented || msg.ffz_removed || msg.deleted) return;
		const catches = this.settings.get(SETTING_KEYS.catches);
		const hideAll = this.settings.get(SETTING_KEYS.hideCommands);
		if (catches === 'all' && !hideAll) return;
		const login = msg.user && msg.user.login;
		const c = classifyLine(login, msg.message);
		if (shouldHide(c, catches, hideAll, this.selfLogin())) event.preventDefault();
	}
}
