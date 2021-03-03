const {
  app,
  BrowserWindow,
  ipcMain,
  Notification,
  dialog,
} = require('electron');
const isDev = require('electron-is-dev');
const Store = require('electron-store');
const fs = require('fs');
const log = require('electron-log');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const tor_axios = require('tor-axios');
const platform = require('os');
const IS_PROD = process.env.NODE_ENV === 'production';
const root = process.cwd();

function randomString(len, bits) {
  bits = bits || 36;
  var outStr = '',
    newStr;
  while (outStr.length < len) {
    newStr = Math.random().toString(bits).slice(2);
    outStr += newStr.slice(0, Math.min(newStr.length, len - outStr.length));
  }
  return outStr;
}

/**
 * Config file
 */
const schema = {
  daemon_address: {
    type: 'string',
    default: 'http://stagenet.community.xmr.to',
    format: 'url',
  },
  daemon_port: {
    type: 'number',
    minimum: 2000,
    maximum: 40000,
    default: 38081,
  },
  server_address: {
    type: 'string',
    default: 'http://honorareaye6hhoe2z3aievotso5vli2ccwi2ezjxfjip4xg7sthttad.onion',
  },
  rpc_user: {
    type: 'string',
    default: randomString(12),
  },
  rpc_pass: {
    type: 'string',
    default: randomString(12),
  },
  socks_host: {
    type: 'string',
    default: '127.0.0.1',
  },
  socks_port: {
    type: 'number',
    default: 9050,
  },
  auto_update_interval: {
    type: 'number',
    default: 15,
  }
};
const config = new Store({ schema });

/**
 * Tor proxy
 */
let tor = tor_axios.torSetup({
  ip: config.socks_host,
  port: config.socks_port,
});

// If we cannot use tor, fallback to no proxy
(async function () {
  const torWorking = await isTorWorking();
  if (!torWorking) {
    dialog.showErrorBox('Proxy Error', 'Tor not installed or wrong app settings, falling back to clearnet.');
    tor = axios;
  }
})();

/**
 * @brief Check if a connection can be made via tor
 * @param {string} [url='https://check.torproject.org/'] The url to make a request.
 * @returns true if the url can be reached with tor, false otherwise
 */
async function isTorWorking(url = 'https://check.torproject.org/') {
  let isTorWorking = false;
  try {
    const response = await tor.get(url);
    if (response.status === 200) isTorWorking = true;
  } catch (error) {
    log.log(error);
  }
  return isTorWorking;
}

/**
 * IPC
 */
ipcMain.handle('set-config', async (event, newConfig) => {
  config.set(newConfig);
  return config.store;
});

ipcMain.on('get-config', (event, _args) => {
  event.returnValue = config.store;
});

ipcMain.handle('notify', (event, title, body) => {
  const notification = {
    title: title,
    body: body,
  };
  new Notification(notification).show();
});

ipcMain.handle('remove-wallet', (event, wallet_name) => {
  fs.unlink(path.join(app.getPath('home'), '/honorarium_wallets/'+wallet_name+'.keys'), (err) => {
    if (err) {
      console.error(err);
      return false;
    }
  
    //file removed
    return true;
  });
});

// Restarts the aplication
ipcMain.handle('restart', (event) => {
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('tor-get', async (event, url, options) => {
  try {
    const response = await tor.get(url, options);
    return { status: response.status, data: response.data };
  } catch (error) {
    if (error.response === undefined) return null;
    return { status: error.response.status, data: error.response.data };
  }
});

ipcMain.handle('tor-post', async (event, url, data, options) => {
  try {
    const response = await tor.post(url, data, options);
    return { status: response.status, data: response.data };
  } catch (error) {
    if (error.response === undefined) return null;
    return { status: error.response.status, data: error.response.data };
  }
});

/**
 * Monero RPC
 */

// Bundle monero app inside Resources and get its path

const binariesPath =
  isDev
    ? path.join(root, './resources', getPlatform())
    : path.dirname(app.getAppPath())
const moneroPath = path.resolve(binariesPath);

// monero-wallet-rpc
const out = fs.openSync(
  path.join(app.getPath('home'), '/monero-wallet-rpc.log'),
  'a'
);
const err = fs.openSync(
  path.join(app.getPath('home'), '/monero-wallet-rpc.log'),
  'a'
);

const parameters = [
  '--rpc-bind-port',
  '18083',
  '--daemon-address',
  config.get('daemon_address') + ':' + config.get('daemon_port'),
  '--stagenet',
  '--rpc-login',
  config.get('rpc_user') + ':' + config.get('rpc_pass'),
  '--wallet-dir',
  path.join(app.getPath('home'), '/honorarium_wallets'),
  '--rpc-access-control-origins',
  'http://localhost:3000', // TODO replace
];

function getPlatform() { 
  switch(platform.type())
  {
    case 'Windows_NT':
      return 'win';
    case 'Darwin':
      return 'mac';
    case 'Linux':
      return 'linux';

    default:
      dialog.showErrorBox(
        'Electron Error',
        'OS not supported'
      );
      app.exit(-1);
  }
 }

 function getExecName()
 {
   switch(getPlatform())
   {
     case 'win':
        return './monero-wallet-rpc.exe';

      case 'mac':
        return './monero-wallet-rpc.app';

      case 'linux':
        return './monero-wallet-rpc';
   }
 }

const moneroWalletRpc = spawn(
  path.join(moneroPath, getExecName()),
  parameters,
  {
    detached: true,
    stdio: ['ignore', out, err],
  }
);

/* When spawning the process fails. */
moneroWalletRpc.on('error', function (err) {
  dialog.showErrorBox(
    'Monero RPC Error',
    `Monero Wallet RPC process failed: \n${err}.`
  );
  app.exit(-1);
});

/* Then the spawned process exits with errors. */
moneroWalletRpc.on('exit', function (code) {
  if (code > 0)
    dialog.showErrorBox(
      'Monero RPC Error',
      `Monero Wallet RPC process exited with exit code: ${code}. \nPlease check your settings and the logfile. `
    );
    app.exit(-1);
});

/**
 * Main renderer process
 */

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
  const getSourceDirectory = () => isDev
    ? path.join(process.cwd(), 'build', 'src') // or wherever your local build is compiled
    : path.join(process.resourcesPath, 'app', 'src'); // asar location

  mainWindow = new BrowserWindow({
    width: 900,
    height: 730,
    title: 'Honorarium Client',
    webPreferences: {
      nodeIntegration: false, // is default value after Electron v5
      contextIsolation: true, // protect against prototype pollution
      enableRemoteModule: false, // turn off remote
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on('closed', () => (mainWindow = null));
}

/**
 * App events listeners
 */

app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  moneroWalletRpc.kill();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
