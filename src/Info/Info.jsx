import React from 'react';
import { Redirect, Link } from "react-router-dom";
import Flower from '../utils/flower';
import './info.css';
import '../index.css';

export default class Info extends React.Component {
    constructor(props) {
        super(props);

        this.rpc = this.props.monero;
        this.api = this.props.api;

        this.state = {
            redirect: '',
            param: this.props.match.params,
            interval: null,
            loading: true,
            exec_action: false,
            error: false,
            error_msg: '',
            payment: null,
            wallet: null,
            wallet_filename: '',
            wallet_ready: false,
            wallet_balance: -1,
            incoming_transfer: false,
            incoming_transfer_confirmed: false,
        };
    }

    showError(err) {
        this.setState({loading: false, exec_action: false, error: true, error_msg: err});
    }

    componentWillUnmount() {
        if(!this.state.error)
            this.rpc.close_wallet();

        if(this.state.interval != null)
            clearInterval(this.state.interval);
    }

    // ---------------- START COMPONENT DID MOUNT ----------------
    async componentDidMount() {
        const { payment_id } = this.props.match.params;

        // Get data about payment
        let response = await this.api.get('payments/'+payment_id);
        if (response.status === 200) {
            this.setState({payment: response.data.message});
        } else {
            window.electron.log.error('API Error');
            window.electron.log.error(response.status);
            window.electron.log.error(response.data);
            this.setState({redirect: 'login'});
            return;
        }

        // Get data about wallet
        response = await this.api.get('multisig/transfer/'+payment_id);
        if (response.status === 200) {
            this.setState({wallet: response.data.message});
        } else {
            window.electron.log.error('API Error');
            window.electron.log.error(response.status);
            window.electron.log.error(response.data);

            this.showError(response.data);
            return;
        }

        // Check wallet status
        let walletOk = await this.initWallet();
        if(!walletOk) { 
            this.showError("Wallet inconsistent status");
            return;
        }

        // we have finished loaded
        this.setState({loading: false});
    }
    // ---------------- END COMPONENT DID MOUNT ----------------

    // ---------------- START INIT WALLET ----------------
    async initWallet() {
        this.setState({wallet_filename: this.state.payment.id+"_wallet"});

        // Open wallet or create new if it doesn't exist
        window.electron.log.log('opening wallet...');
        try {
            await this.rpc.open_wallet(this.state.wallet_filename, "password");
            window.electron.log.log('...ok');
        } catch(error) {
            window.electron.log.error(error);
            window.electron.log.error('...fail');

            this.showError(error);

            return false;
        }

        this.updateWalletInfo();
        let intervalId = setInterval(async () => {
            await this.updateWalletInfo()
        }, 5000);
        this.setState({interval: intervalId});

        return true;

    }
    // ---------------- END INIT WALLET ----------------

    // ---------------- START UPDATE WALLET INFO ----------------
    async updateWalletInfo() {
        // Get balance
        window.electron.log.log('getting the wallet balance...');
        try {
            let rawBalance = await this.rpc.get_balance();
            rawBalance = rawBalance / Math.pow(10, 12);
            this.setState({wallet_balance: rawBalance.toString()});
            window.electron.log.log('...ok');
        } catch(error) {
            window.electron.log.error(error);
            window.electron.log.error('...fail');

            this.showError(error);

            return;
        }

        // Get multisig info
        window.electron.log.log('checking multisig status...');
        try {
            let multisigInfo = await this.rpc.is_multisig();
            if(multisigInfo.state.isMultisig === true && multisigInfo.state.isReady === true && multisigInfo.state.threshold === 2) {
                this.setState({wallet_ready: true});
            } else {
                window.electron.log.warn('wallet not multisig');
            }
            window.electron.log.log('...ok');
        } catch(error) {
            window.electron.log.error(error);
            window.electron.log.error('...fail');

            this.showError(error);

            return;
        }

        // Get address
        window.electron.log.log('getting the wallet address...');
        try {
            let address = await this.rpc.get_address();
            this.setState({wallet_address: address});
            window.electron.log.log('...ok');
        } catch(error) {
            window.electron.log.error(error);
            window.electron.log.error('...fail');

            this.showError(error);

            return;
        }

        window.electron.log.log('getting transactions from the pool...')
        try {
            let transfers = await this.rpc.get_transfers();
            window.electron.log.log('...ok');

            if(transfers[0] == null) return;
            this.setState({incoming_transfer: true});

            if(transfers[0].getTx().getNumConfirmations() >= 10)
                this.setState({incoming_transfer_confirmed: true});

        } catch(error) {
            window.electron.log.error(error);
            window.electron.log.error('...fail');

            this.showError(error);
        }
    }
    // ---------------- END UPDATE WALLET INFO ----------------

    // ---------------- START SYNC ----------------
    syncWallet = async () => {
        // Export
        let exportMs;
        try {
            window.electron.log.log('exporting...');
            exportMs = await this.rpc.export_multisig_info();
            window.electron.log.log('...ok');
        } catch(error) {
            window.electron.log.error('Monero fail');
            window.electron.log.error(error);

            this.showError(error);

            return false;
        }

        window.electron.log.log('sending data to server...');
        let response = await this.api.post('multisig/sync/'+this.state.payment.id, {"info": exportMs});
        if (response.status === 200) {
            window.electron.log.log('...ok');
        } else {
            window.electron.log.error('API Error');
            window.electron.log.error(response.status);
            window.electron.log.error(response.data);

            this.showError(response.data);

            return false;
        }

        // Import
        window.electron.log.log('getting data from server...');
        let importMsResponse = await this.api.get('multisig/sync/'+this.state.payment.id);
        if (importMsResponse.status === 200) {
            window.electron.log.log('...ok');
        } else {
            window.electron.log.error('API Error');
            window.electron.log.error(importMsResponse.status);
            window.electron.log.error(importMsResponse.data);

            this.showError(importMsResponse.data);

            return false;
        }

        try {
            window.electron.log.log('importing...');
            await this.rpc.import_multisig_info([importMsResponse.data.message.info]);
            window.electron.log.log('...ok');
        } catch(error) {
            window.electron.log.error('Monero fail');
            window.electron.log.error(error);

            this.showError(error);

            return false;
        }

        return true;
    }
    // ---------------- END SYNC ----------------

    // ---------------- START CLOSE TRADE ----------------
    closeTrade = async () => {
        this.setState({exec_action: true});

        let syncOk = await this.syncWallet();
        if(!syncOk) {
            this.showError("Sync error");

            return;
        }

        let tx;
        if(this.state.wallet.marketplace !== null)
        {
            window.electron.log.log('marketplace involved');

            window.electron.log.log('transferring...');
            try {
                tx = await this.rpc.transfer_split(this.state.wallet.closing_address, this.state.wallet.amount_xmr, this.state.wallet.commission_address, this.state.wallet.commission_xmr);
                window.electron.log.log(tx[0].getTxSet().getMultisigTxHex()); // TODO cannot relay until fixed
                window.electron.log.log('...ok');
            } catch(error) {
                window.electron.log.error(error);
                window.electron.log.error('Monero fail');

                this.showError(error);

                return;
            }
        } else {
            window.electron.log.log('no marketplace involved');

            // Sweep all/send funds to merchant wallet
            window.electron.log.log('sweeping...');
            try {
                tx = await this.rpc.sweep_all(this.state.wallet.closing_address);
                window.electron.log.log(tx[0].getTxSet().getMultisigTxHex());
                window.electron.log.log('...ok');
            } catch(error) {
                window.electron.log.error(error);
                window.electron.log.error('Monero fail');

                this.showError(error);

                return;
            }
        }

        // Send txKey to the server
        window.electron.log.log('sending data to server...');
        let response = await this.api.post('multisig/transfer/'+this.state.payment.id, {
                txinfo: tx[0].getTxSet().getMultisigTxHex(),
                action: 90,
            });
        if (response.status === 200) {
            window.electron.log.log('...ok');
        } else {
            window.electron.log.error('API Error');
            window.electron.log.error(response.status);
            window.electron.log.error(response.data);

            this.showError(response.data);
        }

        this.setState({exec_action: false});
    }
    // ---------------- END CLOSE TRADE ----------------

    // ---------------- START REFUND ----------------
    refund = async () => {
        this.setState({exec_action: true});

        let syncOk = await this.syncWallet();
        if(!syncOk) {

            this.showError("Sync error");

            return;
        }

        // Sweep all/send funds to merchant wallet
        window.electron.log.log('sweeping...');
        let tx;
        try {
            tx = await this.rpc.sweep_all(this.state.wallet.refunding_address);
            window.electron.log.log(tx[0].getTxSet().getMultisigTxHex());
            window.electron.log.log('...ok');
        } catch(error) {
            window.electron.log.error(error);
            window.electron.log.error('Monero fail');

            this.showError(error);

            return;
        }

        // Send txKey to the server
        window.electron.log.log('sending data to server...');
        let response = await this.api.post('multisig/transfer/'+this.state.payment.id, {
                txinfo: tx[0].getTxSet().getMultisigTxHex(),
                action: 91,
            });
        if (response.status === 200) {
            window.electron.log.log('...ok');
        } else {
            window.electron.log.error('API Error');
            window.electron.log.error(response.status);
            window.electron.log.error(response.data);

            this.showError(response.data);
        }

        this.setState({exec_action: false});
    }
    // ---------------- END REFUND ----------------

    render() {
        const { loading, exec_action, error, error_msg, payment, wallet_balance, wallet_ready, incoming_transfer, incoming_transfer_confirmed } = this.state;

        if (this.state.redirect) {
            return <Redirect to={this.state.redirect} />
        }

        return (
            <>
            {loading &&
                <div className="loader" id="loader2">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            }

            {!loading &&
            <div className="form-signin">
                <div className="text-center mb-4">
                    <Flower></Flower>
                    <h1 className="h3 mb-3 font-weight-normal">Payment Request Info</h1>
                </div>

                {error &&
                <div className="alert alert-danger" role="alert">
                    {error_msg}
                </div>
                }

                {!error &&
                <>
                    {!wallet_ready &&
                    <div className="alert alert-danger" role="alert">
                        Wallet inconsistent status
                    </div>
                    }

                    <br />

                    <ul className="list-group">
                        {wallet_ready &&
                        <>
                            <li className="list-group-item d-flex justify-content-between align-items-center list-group-item-success">Wallet Ready: YES</li>
                            {incoming_transfer &&
                                <>
                                    {!incoming_transfer_confirmed && 
                                    <li className="list-group-item d-flex justify-content-between align-items-center list-group-item-warning">Incoming transfer still not confirmed</li>
                                    }
                                </>
                            }
                            {!incoming_transfer &&
                            <li className="list-group-item d-flex justify-content-between align-items-center list-group-item-warning">No incoming transfers</li>
                            }
                        </>
                        }
                        {!wallet_ready &&
                        <li className="list-group-item d-flex justify-content-between align-items-center list-group-item-danger">Wallet Ready: NO</li>
                        }
                        <li className="list-group-item d-flex justify-content-between align-items-center">ID: <i>{payment.id}</i></li>
                        <li className="list-group-item d-flex justify-content-between align-items-center">Payment Status: <i>{payment.status}</i></li>
                        <li className="list-group-item d-flex justify-content-between align-items-center">Your Role: <i>{payment.whoami}</i></li>
                    </ul>

                    <br />

                    {payment.whoami === 'CUSTOMER' && payment.status === 'FUNDED' && wallet_ready && wallet_balance > 0 && !exec_action &&
                    <button onClick={() => { if (window.confirm('Are you sure you wish to send the payment to the merchant?')) this.closeTrade() } } className="btn btn-outline-info btn-block">Close Trade</button>
                    }
                    {payment.whoami === 'CUSTOMER' && payment.status === 'CUSTOMER_PAYOUT' && wallet_ready && wallet_balance > 0 && !exec_action &&
                        <button onClick={() => { if (window.confirm('Are you sure you wish to accept the incoming transfer?')) this.refund() } } className="btn btn-outline-info btn-block">Accept Refund</button>
                    }

                    {payment.whoami === 'MERCHANT' && payment.status === 'FUNDED' && wallet_ready && wallet_balance > 0 && !exec_action &&
                        <button onClick={() => { if (window.confirm('Are you sure you wish to refund the customer?')) this.refund() } } className="btn btn-outline-danger btn-block">Refund</button>
                    }
                    {payment.whoami === 'MERCHANT' && payment.status === 'MERCHANT_PAYOUT' && wallet_ready && wallet_balance > 0 && !exec_action &&
                    <button onClick={() => { if (window.confirm('Are you sure you wish to accept the incoming transfer?')) this.closeTrade() } } className="btn btn-outline-info btn-block">Accept Closing</button>
                    }

                    <hr />
                </>
                }

                {!exec_action &&
                <Link to="/home" className="btn btn-lg btn-primary btn-block">Close and Go Back</Link>
                }

                {exec_action &&
                    <button className="btn btn-lg btn-primary btn-block" type="button" disabled>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>&nbsp;
                        Loading...
                    </button>
                    }
            </div>
            }
            </>
        );
    }
}
