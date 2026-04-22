const {createElement} = FrankerFaceZ.utilities.dom;

const notificationRootSelector = ".persistent-notification .tw-interactable";
const buttonContainerStyling = `
    position: absolute !important;
    top: 4rem !important;
`

class CopyRedeemCode extends Addon {
	constructor(...args) {
		super(...args);
		this.regex = /(?:\w+-)+.+\./

		this.observerAdded = false
		this.inject('site.fine');
		this.NotificationManager = this.fine.define(
			'notification-manager',
			n => n.viewNotification
		);
	}

	async onLoad() { }

	onEnable() {
		// Trigger forceUpdate to get ready function to trigger when add-on is initially enabled, otherwise ready() does not fire.
		this.NotificationManager.forceUpdate();
		this.NotificationManager.ready(()=>{document.querySelector('.onsite-notifications button').addEventListener("click", this.notificationButtonCallback.bind(this))});
	}

	onDisable() {
		document.querySelector('.onsite-notifications button').removeEventListener("click", this.notificationButtonCallback.bind(this));
		
		if(this.observer){
			this.observer.disconnect();
			this.observerAdded = false
		}
	}

	async onUnload() { }

	registerObserver(){
		const monitorElement = document.querySelector('.persistent-notification').parentElement.parentElement;
		
		if(!this.observer)
			this.observer = new MutationObserver(this.observerCallback.bind(this));

		this.observer.observe(monitorElement, { attributes: false, childList: true, subtree: true});
		this.observerAdded = true
	}

	onOpenNotifications(){
		if (document.querySelectorAll('.tw-dialog-layer').length <= 0){
			return;
		}

		let notifications = document.querySelectorAll(notificationRootSelector);
		let notificationBodies = document.querySelectorAll(`${notificationRootSelector} .persistent-notification__body p`);

		for (let index = 0; index < notifications.length; index++) {
			const rootElement = notifications[index];
			const bodyElement = notificationBodies[index];
			const bodyText = bodyElement.innerText;

			let redeemBtnAdded = rootElement.parentElement.querySelector('.redeem-btn-container') == null ? false : true;

			if(bodyText.includes("Click here to redeem:") && this.regex.test(bodyText) && !redeemBtnAdded){
				this.addCopyButton(rootElement, bodyText);
			}
		}
	}

	addCopyButton(rootElement, bodyText){
		let regexResult = this.regex.exec(bodyText).toString();
    	let redeemCode = regexResult.substring(0, regexResult.length - 1);
		let button = this.buildCopyButton(redeemCode);

		rootElement.parentElement.appendChild(button);
	}

	buildCopyButton(redeemCode){
		const button = (<div class="persistent-notification__delete redeem-btn-container" style={buttonContainerStyling}>
			<button class="huqecI copy-redeem-code-btn"
			  title={this.i18n.t('addon.copy-mc-redeem-code.copy', 'Copy code')}
			  data-redeem-code={redeemCode} 
			  onClick={(event)=>{navigator.clipboard.writeText(event.currentTarget.dataset.redeemCode)}}>
				<span class="ffz--icon-holder">
					<figure class="ffz-i-docs"></figure>
				</span>
			</button>
		</div>);

		return button;
	}

	notificationButtonCallback(){
		setTimeout((e) => {
			this.onOpenNotifications();
			if(!this.observerAdded) { this.registerObserver(); }
		}, 500);
	}

	observerCallback(mutationList, _observer) {
		for (const mutation of mutationList) { 
			if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
				// Each added element is its own mutation, the node is therefore always index 0
				const node = mutation.addedNodes[0];
				if (node.classList.contains('persistent-notification')) { 
					const rootElement = node.querySelector('.tw-interactable'); 
					const bodyElement = node.querySelector('.tw-interactable .persistent-notification__body p'); 
					const bodyText = bodyElement.innerText;

					if (bodyText.includes('Click here to redeem:') && this.regex.test(bodyText)){
						this.addCopyButton(rootElement, bodyText);
					}
				}
			}
		}
	}
}

// Addons should register themselves. Doing so adds
// them to FFZ's map of known modules, and also attempts
// to enable the module.
CopyRedeemCode.register();