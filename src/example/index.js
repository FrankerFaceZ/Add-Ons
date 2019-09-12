const createElement = FrankerFaceZ.utilities.dom.createElement;

class Example extends Addon {
	constructor(...args) {
		super(...args);

		this.inject('metadata');
	}

	onEnable() {
		this.log.info('Hey, I\'m an example addon!');

		this.metadata.define('example', {
			order: 150,
			button: true,

			click: data => {
				alert('Did you know that alerts block JavaScript thread till you close them?');
			},

			popup: async (data, tip) => {
				await tip.waitForDom();
				tip.element.classList.add('tw-balloon--lg');

				return this.buildVue(data);
			},

			icon: 'ffz-i-zreknarf',

			label: data => 'Example',

			tooltip: data => `You are watching ${data.channel.login}.`
		});
	}

	async buildVue(data) {
		const vue = this.resolve('vue');

		const [, view] = await Promise.all([
			vue.enable(),
            import('./views/example.vue')
		]);

		vue.component('example-vue', view.default);

		const instance = new vue.Vue({
			el: createElement('div'),
			render: h => h('example-vue')
		});

		return instance.$el;
	}
}

Example.register();
