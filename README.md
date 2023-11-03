# FrankerFaceZ Add-Ons

This is the official repository for [FrankerFaceZ](https://www.frankerfacez.com/)
Add-Ons. Add-Ons are additional scripts that users can choose to load to add
additional functionality to FrankerFaceZ and Twitch.

All Add-Ons available through FrankerFaceZ have their source code
available here. Each mod has a unique directory within `src` that
contains a manifest file, as well as all its scripts, styles, and
other assets.

> This package uses the [pnpm](https://pnpm.io/) package manager.

## Getting Started

1.  Clone the repository.
2.  Copy the `src/example` directory, making a new directory within `src` with
    the name of your add-on.
3.  Edit your new `manifest.json` with details about your add-on.
4.  Make sure you have node.js and pnpm set up and working.
5.  Run `pnpm install` within the repository to install dependencies.
6.  Run `pnpm start` to start the development server.
7.  In the FrankerFaceZ Control Center, under Add-ons, make sure to enable the
    setting `Use Local Development Server`.
8.  Ensure that your browser will accept the self-signed certificate issued by
    the development server. You can visit https://localhost:8001/ with the
    development server running to see if it works.
9.  Develop your add-on.
    > **Note:** Changes made to your add-on's manifest will require that you
    > restart the development server to take effect.
10.  When you're ready, set `enabled` to `true` in your add-on's manifest, then
    submit a pull request to bring your code into this repository's master branch.
11. Once your code is accepted, the new add-on will automatically be built,
    uploaded, and made available for end-users.

## Documentation

Unfortunately, we lack significant documentation at this time. Please study the
source code of existing add-ons for examples, and the source of FFZ itself.

You can always ask for help and implementation suggestions.

## Dos and Don'ts

* **Do** use existing FrankerFaceZ systems, such as settings, whenever possible.
* **Do** ask for tips, suggestions, and support in our public Discord, on Twitter,
  or within GitHub issues. We're glad to help.

* **Don't** include external scripts in your add-on. We don't want to increase
  the security vulnerability surface if we can help it.
* **Don't** interfere with Twitch's revenue streams. Attempting to interfere
  with advertisements is outside the scope of FrankerFaceZ and will not be accepted.
  There are other extensions better prepared to take up that fight.
* **Don't** use `FFZ` or `FrankerFaceZ` in the name of your add-on. In the past,
  we allowed certain add-ons to share the name to demonstrate their association
  with FrankerFaceZ and this has resulted in confusion amongst end users. We wish
  to avoid the situation going forward.
* **Don't** mess with eslint or babel settings without asking about it.
* **Don't** recreate FFZ functionality when a pull request to the main FrankerFaceZ
  project would be more productive.


## Contact Us

For matters regarding extension development, please join our public
[FrankerFaceZ Discord](http://discord.gg/UrAkGhT). Upon joining, please
request the `Developer` role for access to developer specific channels.

For other matters regarding FrankerFaceZ or Add-Ons for it, please contact
the Add-On developer or FrankerFaceZ staff as described at:
https://www.frankerfacez.com/contact
