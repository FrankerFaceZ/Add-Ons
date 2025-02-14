// Add-Ons should contain a class that extends Addon.
class DoStreamerbotAction extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('chat.actions');
		this.inject('chat');
	}

	async onLoad() {}

	onEnable() {
		this.actions.addAction('streamerbot', {
			presets: [{ appearance: { type: 'icon', icon: 'ffz-i-mod' } }],

			defaults: {
				url: 'ws://localhost:8080',
				actionId: '',
				payload: '{}',
			},

			editor: () => import('./views/streamerbot.vue'),

			title: 'Streamerbot Action',

			description_i18n: null,
			description(data) {
				return `Action ID: ${data.options.actionId}`;
			},

			// The information this action requires. It won't be
			// possible to add the action to action providers that
			// don't have a specific part of the context.
			//   required_context: ["room", "user", "message"],

			tooltip(data) {
				const actionId = this.replaceVariables(data.options.actionId, data);

				return [
					<div
						key="add_ons.ffz-streamerbot.desc.title"
						class="tw-border-b tw-mg-b-05"
					>
						{'Run StreamerBot Action'}
					</div>,
					<div
						key="add_ons.ffz-streamerbot.desc.action_id"
						class="tw-align-left"
					>
						{'Action ID: '}
						{actionId}
					</div>,
				];
			},

			click(event, data) {
				const url = this.replaceVariables(data.options.url, data);
				const actionId = this.replaceVariables(data.options.actionId, data);
				const args = JSON.parse(
					this.replaceVariables(data.options.payload, data)
				);

				const msgid = `ffz.doaction.${Date.now()}`;
				const socket = new WebSocket(url);

				socket.onerror = err => {
					if (data.room?.login) {
						this.addNotice(
							data.room.login,
							this.i18n.t(
								'addon.streamerbot-actions.error',
								'There was an error sending the action to StreamerBot.'
							)
						);
					}
				};

				socket.onopen = () => {
					socket.send(
						JSON.stringify({
							id: msgid,
							request: 'DoAction',
							action: { id: actionId },
							args,
						})
					);
				};

				socket.onmessage = ev => {
					try {
						const response = JSON.parse(ev.data);

						if (response.status !== 'error') return;
						if (data.room?.login) {
							this.addNotice(
								data.room.login,
								this.i18n.t(
									'addon.streamerbot-actions.error',
									`Error running StreamerBot action: ${response.error}`
								)
							);
						} else {
							console.error(response);
						}

						socket.close();
					} catch (err) {
						if (data.room?.login) {
							this.addNotice(
								data.room.login,
								this.i18n.t(
									'addon.streamerbot-actions.error',
									'There was an error sending the action to StreamerBot.'
								)
							);
						} else {
							console.error(err);
						}

						socket.close();
					}
				};
			},
		});
	}
}

// Addons should register themselves. Doing so adds
// them to FFZ's map of known modules, and also attempts
// to enable the module.
DoStreamerbotAction.register();
