const {createElement} = FrankerFaceZ.utilities.dom;

const notificationRootSelector = ".persistent-notification";
const CustomStylesElement = document.createElement('style');
CustomStylesElement.classList.add('crcb-styles');
CustomStylesElement.innerHTML = `
.copy-redeem-code-btn {
    display: inline-flex;
    -webkit-box-align: center;
    align-items: center;
    -webkit-box-pack: center;
    justify-content: center;
    user-select: none;
    border-radius: var(--border-radius-rounded);
    height: var(--button-size-small);
    width: var(--button-size-small);
    background-color: var(--color-background-button-text-default);
    color: var(--color-fill-button-icon);
}
.copy-redeem-code-btn:hover {
    background-color: var(--color-background-button-text-hover);
    color: var(--color-fill-button-icon-hover);
}
.redeem-btn-container {
    position: absolute !important;
    top: 4rem !important;
}
`;

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
		document.head.appendChild(CustomStylesElement);
		// Trigger forceUpdate to get ready function to trigger when add-on is initially enabled, otherwise ready() does not fire.
		this.NotificationManager.forceUpdate();
		this.NotificationManager.ready(()=>{document.querySelector('.onsite-notifications button').addEventListener("click", this.notificationButtonCallback.bind(this))});
	}

	onDisable() {
		document.head.removeChild(document.getElementsByClassName('crcb-styles')[0]);
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
			const appendTarget = rootElement.querySelector('div');
			const bodyElement = notificationBodies[index];
			const bodyText = bodyElement.innerText;

			let redeemBtnAdded = rootElement.parentElement.querySelector('.redeem-btn-container') == null ? false : true;

			if(bodyText.includes("Click here to redeem:") && this.regex.test(bodyText) && !redeemBtnAdded){
				this.addCopyButton(appendTarget, bodyText);
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
		const button = (<div class="persistent-notification__delete redeem-btn-container">
			<button class="copy-redeem-code-btn"
			  title={this.i18n.t('addon.copy-redeem-code.copy', 'Copy code')}
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
					const appendTarget = node.querySelector('div');
					const rootElement = node.querySelector('.persistent-notification__body'); 
					const bodyText = rootElement.innerText;

					if (bodyText.includes('Click here to redeem:') && this.regex.test(bodyText)){
						this.addCopyButton(appendTarget, bodyText);
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