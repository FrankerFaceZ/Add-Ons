'use strict';

import CSS_URL from './style.scss';

const { createElement } = FrankerFaceZ.utilities.dom;

class ClipsManagerFullscreenButton extends Addon {
    constructor ( ...args ) {
        super( ...args );

        this.eventListenerCallbacks = {
            detectClipsManager:   this.detectClipsManager.bind( this ),
            detectClipRowClick:   this.detectClipRowClick.bind( this ),
            fullscreenHotkey:     this.fullscreenHotkey.bind( this ),
            swapFullscreenButton: this.swapFullscreenButton.bind( this )
        };

        this.inject( 'site.router' );
    }

    detectClipsManager( route, _match ) {
        let isClipsManager = false;

        if ( ! route ) {
            isClipsManager = location.hostname === 'dashboard.twitch.tv' && location.pathname.toLowerCase().includes( '/content/clips/' );
        } else {
            isClipsManager = route.name === 'dash-clips';
        }

        if ( isClipsManager ) {
            this.activateFunctionality();
        } else {
            this.deactivateFunctionality();
        }

        return isClipsManager;
    }

    insertCSS() {
        if ( ! this.clipsManagerFullscreenButtonCSS ) {
            this.clipsManagerFullscreenButtonCSS = document.createElement( 'link' );
            
            this.clipsManagerFullscreenButtonCSS.rel  = 'stylesheet';
            this.clipsManagerFullscreenButtonCSS.id   = 'ffz-clips-manager-fullscreen-button-css';
            this.clipsManagerFullscreenButtonCSS.href = CSS_URL;
        }

        document.head.appendChild( this.clipsManagerFullscreenButtonCSS );
    }

    removeCSS() {
        this.clipsManagerFullscreenButtonCSS?.remove();
    }

    activeStatusMessage( addonStatus ) {
        if ( addonStatus === 'active' ) {
            this.log.info( 'Clips Manager Fullscreen Button add-on is currently active.' );
        } else if ( addonStatus === 'inactive' ) {
            this.log.info( 'Clips Manager Fullscreen Button add-on is currently inactive: you are not currently viewing the Clips Manager.' );
        }
    }

    activateFunctionality() {
        this.insertCSS();

        this.pageContent = document.querySelector( '.sunlight-default-root__root-wrapper' );

        this.pageContent?.addEventListener( 'click', this.eventListenerCallbacks.detectClipRowClick );

        document.addEventListener( 'fullscreenchange', this.eventListenerCallbacks.swapFullscreenButton );

        document.addEventListener( 'keypress', this.eventListenerCallbacks.fullscreenHotkey );

        this.addFullscreenButton();

        this.activeStatusMessage( 'active' );
    }

    deactivateFunctionality() {
        this.removeCSS();

        this.pageContent?.removeEventListener( 'click', this.eventListenerCallbacks.detectClipRowClick );

        document.removeEventListener( 'fullscreenchange', this.eventListenerCallbacks.swapFullscreenButton );

        document.removeEventListener( 'keypress', this.eventListenerCallbacks.fullscreenHotkey );

        this.removeFullscreenButton();

        this.activeStatusMessage( 'inactive' );
    }

    detectClipRowClick( _e ) {
        window.setTimeout( this.addFullscreenButton.bind( this ), 500 );
    }

    requestFullscreen( e ) {
        e?.stopPropagation();

        if ( this.clipsPlayer ) {
            if ( ! this.playerIsFullscreen() ) {
                this.clipsPlayer.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        }
    }

    addFullscreenButton( _e ) {
        this.clipsPlayer        = this.pageContent?.querySelector( '.clips-player-container' );
        this.fullscreenSVGPaths = {
            enter: ( <path d="M7 3H2v5h2V5h3V3zm11 5V3h-5v2h3v3h2zm-5 9v-2h3v-3h2v5h-5zm-9-5H2v5h5v-2H4v-3z"></path> ),
            exit: ( <path d="M8 8V3H6v3H2v2h6zm4 0h6V6h-4V3h-2v5zm0 9v-5h6v2h-4v3h-2zm-4-5H2v2h4v3h2v-5z"></path> )
        };

        if ( ! this.clipsPlayer?.contains( this.fullscreenButton ) ) {
            this.playerBackground = this.clipsPlayer?.querySelector( '.clips-player-background' );
            this.fullscreenButton = (
                <div class="ffz-cmfb-clips-player-right-controls">
                    <div class="ffz-cmfb-clips-player-fullscreen-button-contain" aria-label="fullscreen-button">
                        <button class="ffz-cmfb-clips-player-fullscreen-button" aria-label="Fullscreen (f)" aria-haspopup="menu" data-a-target="player-fullscreen-button" onClick={ this.requestFullscreen.bind( this ) }>
                            <div class="ffz-cmfb-clips-player-fullscreen-button-inner">
                                <div class="tw-svg">
                                    <svg width="20" height="20" viewBox="0 0 20 20" focusable="false" aria-hidden="true" role="presentation">
                                        {this.fullscreenSVGPaths.enter}
                                    </svg>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            );

            this.playerBackground?.append( this.fullscreenButton );
        }
    }

    removeFullscreenButton() {
        this.fullscreenButton?.remove();
    }

    playerIsFullscreen() {
        return document.fullscreenElement === this.clipsPlayer;
    }

    swapFullscreenButton( _e ) {
        const fullscreenSVGPath =  this.fullscreenButton.querySelector( 'path' );

        if (  ! this.playerIsFullscreen() ) {
            fullscreenSVGPath.replaceWith( this.fullscreenSVGPaths.enter );
        } else {
            fullscreenSVGPath.replaceWith( this.fullscreenSVGPaths.exit );
        }
    }

    fullscreenHotkey( e ) {
        if ( e.key === 'f' ) {
            this.log.info( e );
            if ( [ 'text', 'search' ].includes( e.target.type ) || document.querySelector( '.ReactModalPortal .ReactModal__Overlay' ) ) {
                return;
            }

            this.requestFullscreen();
        }
    }

    onDisable() {
        this.router.off( ':route', this.eventListenerCallbacks.detectClipsManager );

        this.deactivateFunctionality();

        this.log.info( 'Clips Manager Fullscreen Button add-on has been successfully disabled.' );
    }

    onEnable() {
        this.router.on( ':route', this.eventListenerCallbacks.detectClipsManager );

        if ( this.detectClipsManager() ) {
            this.activateFunctionality();

        } else {
            this.deactivateFunctionality();
        }

        this.log.info( 'Clips Manager Fullscreen Button add-on has been successfully enabled.' );
    }
}

ClipsManagerFullscreenButton.register();
