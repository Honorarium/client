export default class Notify {
    constructor(ipcRenderer) {
        this.ipcRenderer = ipcRenderer;
    }

    send(title, body) {
        this.ipcRenderer.invoke('notify', title, body);
    }
}
