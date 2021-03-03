<h1 align="center">
  <img src="https://raw.githubusercontent.com/Honorarium/client/master/docs/header.png" alt="Honorarium Client Banner">
</h1>

<h4 align="center">A desktop app to manage payments on Honorarium and seamlessly handle multisig wallet creation</h4>

<p align="center">
<img alt="Made with JavaScript" src="https://forthebadge.com/images/badges/made-with-javascript.svg">
</p>

<p align="center">
<img alt="GitHub code size in bytes" src="https://img.shields.io/github/languages/code-size/Honorarium/client">
<img alt="Lines of code" src="https://img.shields.io/tokei/lines/github/Honorarium/client">
<img alt="GitHub contributors" src="https://img.shields.io/github/contributors-anon/Honorarium/client">
</p>

<p align="center">
  <a href="#key-features">Key Features</a> •
  <a href="#how-to-use">How To Use</a> •
  <a href="#download-and-run">Download</a> •
  <a href="#credits">Credits</a> •
  <a href="#support">Support</a> •
  <a href="#license">License</a>
</p>

![screenshot](https://raw.githubusercontent.com/Honorarium/client/master/docs/screen.png)

## Key Features

* Same interface for customers and merchants
* Non-interactive Monero multisignature wallet creation
  - The wallet private keys never leave your computer!
* Informative interface
* Tor and proxy support
* Highly configurable
* Handle payments and refunds with a click of a button
* Cross platform
  - Windows, macOS and Linux ready.

## How To Use

### Download and run

You can [download](https://github.com/Honorarium/client/releases) the latest installable version of this app for Windows, macOS and Linux.

### Build it yourself

To clone and build this application, you'll need [Git](https://git-scm.com), [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) and [yarn](https://yarnpkg.com/getting-started/install) installed on your computer. From your command line:

```bash
# Clone this repository
$ git clone https://github.com/Honorarium/client

# Go into the repository
$ cd client

# Install dependencies
$ yarn install

# Run the app in development mode
$ yarn run dev

# Build the release version of the app
$ yarn electron-package
```
The release versions for win, mac and linux will be created under "dist" directory.
**The last command will fail if not on Mac OS**, since Mac OS builds can only be created on an Apple machine.
Simply edit the file _package.json_ line 64 and change `-mwl` (mac win linux) to `-wl` (win linux). 

*Note:* If you're using Linux Bash for Windows, [see this guide](https://www.howtogeek.com/261575/how-to-run-graphical-linux-desktop-applications-from-windows-10s-bash-shell/) or use `node` from the command prompt.

## Payments
A payment request can be created by a merchant or a marketplace on behalf of a merchant via OAuth API. It can be either **ESCROW** (moderated) or **FINALIZE EARY** (not moderated). Only in the case of escrow payments a multisig wallet is generated. FE payments are listed for informative reasons only.

## Learn More
Visit [honorarium.github.io](https://honorarium.github.io) to learn more about the desktop app.

## Support
Open an issue using the template.

## Contributors
- [tinkerwithtor](https://github.com/tinkerwithtor)
- [Onion Ltd](https://github.com/onionltd)

## License

GNU GPL v3

## Credits

This software exists thanks to the following open source projects:

- [Electron](https://electron.atom.io/)
- [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/)
- [Tor](https://www.torproject.org/)
- [Monero](https://www.getmonero.org/)
