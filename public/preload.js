const {
    contextBridge,
    ipcRenderer,
} = require("electron");
const log = require("electron-log");

contextBridge.exposeInMainWorld(
    "electron", {
        ipcRenderer: ipcRenderer,
        log: log.functions,
    }
);
