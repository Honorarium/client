const fs = require('fs');
const path = require('path');

exports.default = async function(context) {

    const APP_NAME = context.packager.appInfo.productFilename;
    const APP_OUT_DIR = context.appOutDir;
    const PLATFORM = context.packager.platform.name;

    var origin;
    var destination;

    switch(PLATFORM)
    {
        case 'windows':
            origin = path.resolve(__dirname, 'resources/win/monero-wallet-rpc.exe');
            destination = path.join(`${APP_OUT_DIR}`, `/resources/monero-wallet-rpc.exe`);
            console.log('building for windows');
            break;

        case 'mac':
            origin = path.resolve(__dirname, 'resources/mac/monero-wallet-rpc.app');
            destination = path.join(`${APP_OUT_DIR}`, `${APP_NAME}.app/Contents/Resources/monero-wallet-rpc.app`);
            console.log('building for mac');
            break;

        case 'linux':
            origin = path.resolve(__dirname, 'resources/linux/monero-wallet-rpc');
            destination = path.join(`${APP_OUT_DIR}`, `/resources/monero-wallet-rpc`);
            console.log('building for linux');
            break;

        default:
            console.log('platform error');
    }
  
  fs.copyFile(origin, destination, (err) => {
    if (err) throw err;
  });
}
