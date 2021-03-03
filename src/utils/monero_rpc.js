import * as monerojs from 'monero-javascript';

export default class MoneroRPC {
    constructor(user, pass, daemon_url, ipcRenderer) {
        this.baseUrl = "http://localhost:18083";
        this.rpc_user = user;
        this.rpc_pass = pass;
        this.rcp_connection = monerojs.connectToWalletRpc({ uri: this.baseUrl, username: this.rpc_user, password: this.rpc_pass });
        this.daemon = daemon_url;
        this.ipcRenderer = ipcRenderer;
    }

    async create_wallet (filename, password) {
        //let walletRpc = monerojs.connectToWalletRpc(this.baseUrl, this.rpc_user, this.rpc_pass);

        let wallet = await this.rcp_connection.createWallet({path: filename, password: password});

        return wallet;
    }

    async delete_wallet(filename) {
        let res = await this.ipcRenderer.invoke('remove-wallet', filename);
        return res;
    }

    async open_wallet (filename, password){
        //let walletRpc = monerojs.connectToWalletRpc(this.baseUrl, this.rpc_user, this.rpc_pass);

        let wallet = await this.rcp_connection.openWallet({path: filename, password: password});

        return wallet;
    }

    async close_wallet () {
        //let walletRpc = monerojs.connectToWalletRpc(this.baseUrl, this.rpc_user, this.rpc_pass);

        let closed = await this.rcp_connection.close(true);

        return closed;
    }

    async get_address() {
        //let walletRpc = monerojs.connectToWalletRpc(this.baseUrl, this.rpc_user, this.rpc_pass);

        let primaryAddress = await this.rcp_connection.getPrimaryAddress();

        return primaryAddress;
    }

    async get_balance() {
        //let walletRpc = monerojs.connectToWalletRpc(this.baseUrl, this.rpc_user, this.rpc_pass);

        let balance = await this.rcp_connection.getUnlockedBalance();

        return balance;
    }

    async is_multisig() {
        //let walletRpc = monerojs.connectToWalletRpc(this.baseUrl, this.rpc_user, this.rpc_pass);

        let multisig_info = await this.rcp_connection.getMultisigInfo();

        return multisig_info;
    }

    async prepare_multisig() {
        //let walletRpc = monerojs.connectToWalletRpc(this.baseUrl, this.rpc_user, this.rpc_pass);

        let info = await this.rcp_connection.prepareMultisig();

        return info;
    }

    async make_multisig(hexes, password) {
        //let walletRpc = monerojs.connectToWalletRpc(this.baseUrl, this.rpc_user, this.rpc_pass);

        let peerMultisigHexes = [];
        for (let j = 0; j < hexes.length; j++) peerMultisigHexes.push(hexes[j]);
        let info = await this.rcp_connection.makeMultisig(peerMultisigHexes, 2, password);

        return info;
    }

    async finalize_multisig(hex, password) {
        //let walletRpc = monerojs.connectToWalletRpc(this.baseUrl, this.rpc_user, this.rpc_pass);
        let info = await this.rcp_connection.exchangeMultisigKeys(hex, password);

        return info;
    }

    async import_multisig_info(hex) {
        //let walletRpc = monerojs.connectToWalletRpc(this.baseUrl, this.rpc_user, this.rpc_pass);
        await this.rcp_connection.sync();
        let info = await this.rcp_connection.importMultisigHex(hex);

        return info;
    }

    async export_multisig_info() {
        //let walletRpc = monerojs.connectToWalletRpc(this.baseUrl, this.rpc_user, this.rpc_pass);
        await this.rcp_connection.sync();
        let info = await this.rcp_connection.getMultisigHex();

        return info;
    }

    async sweep_all(to) {
        //let walletRpc = monerojs.connectToWalletRpc(this.baseUrl, this.rpc_user, this.rpc_pass);

        let tx = await this.rcp_connection.sweepUnlocked({
            address: to,
            relay: false,
        });

        return tx;
    }

    async transfer_split(addr1, amount1, addr2, amount2) {
        //let walletRpc = monerojs.connectToWalletRpc(this.baseUrl, this.rpc_user, this.rpc_pass);

        let tx = await this.rcp_connection.createTxs({
            accountIndex: 0,
            destinations: [{
                address: addr1,
                amount: amount1,
            }, {
                address: addr2,
                amount: amount2,
            }],
            relay: true,
        });

        return tx;
    }

    async get_transfers() {
        let transfers = await this.rcp_connection.getIncomingTransfers();

        return transfers;
    }

    async check_remotenode_sync() {
        return true;
        // TODO decomment when using mainnet
        /*
        let daemon = await monerojs.connectToDaemonRpc("https://cors-anywhere.herokuapp.com/"+this.daemon, "", "", true, 5000, false);
        let height = await daemon.getHeight(); 
        const response = await fetch('https://localmonero.co/blocks/api/get_stats');
        const myJson = await response.json();

        return Math.abs(myJson.height - height) < 5;
        */
    }
}
