// A lot of helpful stuff is tucked away in FrankerFaceZ's utilities.
// You're recommended to go over it to see what's available before
// pulling in external dependencies.
const createElement = FrankerFaceZ.utilities.dom.createElement;

function randomColor() {
	return `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`;
}

// Add-Ons should contain a class that extends Addon.
class Example extends Addon {
	constructor(...args) {
		super(...args);

		// Within the constructor, modules can inject dependencies.
		// A module will not be enabled until all its dependencies
		// have been loaded and enabled.

		// In this case, we're depending on the FFZ module "metadata".
		this.inject('metadata');

		// We also want to make a custom chat action, so let's import
		// that too.
		this.inject('chat.actions');

		// All add-ons, by default, depend on the "settings" and
		// "i18n" modules.

		// If you need to ensure a dependency is loaded before
		// onLoad is called, you need to create a list on the
		// Addon here with the names of the dependencies.
		this.load_requires = ['metadata'];
	}

	// onLoad is called when the module is being loaded, prior to
	// being enabled. If this method returns a Promise, FFZ will
	// wait for the promise to resolve before considering the
	// module as loaded.
	async onLoad() {
		// We don't actually need to do anything here, but if
		// we did, we'd already have guaranteed access to the
		// metadata module because of the earlier "load_requires"
	}

	// onEnable is called when the module is ready and should be
	// enabled. This happens when an Addon is registered, when a
	// module instance's ".enable()" method is called, or when a
	// module that depends on this module is enabled. If this
	// method returns a Promise, FFZ will wait for the promise
	// to resolve before considering the module as enabled.
	onEnable() {
		// All modules have a logger instance by default. Module
		// loggers prepend the name of the module to output.
		this.log.info('Hey, I\'m an example addon!');

		// Here, we're accessing one of our injected dependencies
		// directly. In this case, we're defining a new type of
		// metadata that shows an alert when clicked. The metadata
		// also has a pop-up button.
		this.metadata.define('example', {
			order: 150,
			button: true,

			click: data => {
				alert('Did you know that alerts block JavaScript thread till you close them?');
			},

			popup: async (data, tip) => {
				await tip.waitForDom();
				tip.element.classList.add('ffz-balloon--lg');

				return this.buildVue(data);
			},

			icon: 'ffz-i-star',

			// i18n.t allows you to localize strings. The first value is the key, and you should
			// namespace all your keys to within your addon, as shown here. We use the ICU
			// standard message format for localization.
			tooltip: data => this.i18n.t('addon.example.watching', 'You are currently watching: {displayName} ({login})', data.channel),

			// Even strings without variables should be localized to ensure your add-on is supported
			// in the future when FFZ gains localization.
			label: data => this.i18n.t('addon.example.example', 'Example')
		});

		this.metadata.define('example-two', {
			order: 150,

			refresh: 500,
			color: () => randomColor(),

			label: data => this.i18n.t('addon.example.rainbow', 'RAINBOW')
		});


		// Now, let's do our chat action.
		this.actions.addAction('example', {
			// Every action needs a preset, or multiple presets, that
			// will be added to the New Action menu.
			presets: [{
				appearance: {
					type: 'text',
					text: 'E'
				}
			}],

			// Default data for configuring a new action.
			defaults: {
				thingy: 1
			},

			// The information this action requires. It won't be
			// possible to add the action to action providers that
			// don't have a specific part of the context.
			required_context: ['room', 'user', 'message'],

			title: 'Example Action',

			// The editor is a Vue component that is shown to edit the
			// options of an action. It only has to allow configuration
			// for that action type's specific settings. Appearance
			// and other options are handled generically.
			editor: () => import('./views/edit-action.vue'),

			// Want your action to look different when stuff happens?
			// This method lets you override a specific action's appearance.
			// Please note that the data here is not the same as in most other
			// methods to keep computations during rendering to a minimum.
			override_appearance(appearance, data, msg, current_room, current_user, mod_icons) {
				if ( current_user ) {
					appearance.type = 'text';
					appearance.text = current_user.login.substr(0,2);
				}

				return appearance;
			},

			// Want to disable your action in certain cases, but still have
			// it rendered? Like with override_appearance, data is different
			// for this specific function.
			disabled(data, msg, current_room, current_user, mod_icons) {
				return current_room && current_user && current_room.id == current_user.id;
			},

			tooltip(data) {
				return this.i18n.t(
					'addon.example.action.tooltip',
					'The user is {user.login} and they said: {message.text}',
					data
				);
			},

			click(event, data) {
				// Yes, this example IS obnoxious. :D
				for(let i=0; i < data.options.thingy; i++)
					alert(this.i18n.t( // eslint-disable-line no-alert
						'addon.example.action',
						'Hey, you just clicked on {user.login}#{user.id}!\n\nMessage ID: {message.id}\nText: {message.text}',
						data
					));
			}
		})

	}

	// onDisable is called when the module should be disabled.
	// This happens when a module instance's ".disable()" method
	// is explicitly called, when a module instance's ".unload()"
	// method is explicitly called, or when a user clicks a module's
	// "Disable" button in the Add-On listing. If a module cannot
	// be fully disabled, this method should be omitted. If this
	// method is omitted, attempting to disable the module will
	// fail. The Add-Ons UI will tell users they must refresh
	// the pages for changes to apply. If this method returns a
	// Promise, FFZ will wait for the promise to resolve before
	// considering the module as disabled.
	onDisable() {
		// Re-defining our metadata as null effectively unloads it.
		this.metadata.define('example', null);
		this.metadata.define('example-two', null);
	}

	// onUnload is called when the module should be unloaded.
	// This happens when a module instance's ".unload()" method
	// is explicitly called. Just disabling a module will not
	// cause it to be unloaded. If a module cannot be unloaded
	// meaningfully, this method should be omitted. If this method
	// is omitted, attempting to unload the module will fail.
	async onUnload() {
		/* no-op */
	}

	async buildVue(data) {
		// Here, we're accessing a module we don't depend on.
		// The Vue module provides access to Vuejs, as well as
		// several custom components.
		const vue = this.resolve('vue');

		// We need to make sure Vue is enabled before we try
		// loading our custom Vue component, since the component
		// won't be able to load if the global Vue object does
		// not exist.
		await vue.enable();

		// Now, we import our custom Vue module. You'll notice
		// that we don't use a comment for webpack chunk splitting.
		// Our build-scripts automatically inject chunk names
		// for loaded resources, unless you specify one manually.
		const view = (await import('./views/example.vue')).default;

		// Create a new Vue root container, which renders our
		// component into an empty <div />
		const instance = new vue.Vue({
			el: createElement('div'),
			components: {
				'example-vue': view
			},
			render: h => h('example-vue')
		});

		// Finally, return that <div /> so that we can add it to the DOM.
		return instance.$el;
	}
}

// Addons should register themselves. Doing so adds
// them to FFZ's map of known modules, and also attempts
// to enable the module.
Example.register();
