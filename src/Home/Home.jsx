import React from 'react';
import { Redirect, Link } from 'react-router-dom';
import { Mutex } from 'async-mutex';
import Payment from './Payment';
import Flower from '../utils/flower';
import './home.css';
import '../index.css';

export default class Home extends React.Component {
    rpc;
    api;

    constructor(props) {
        super(props);

        this.rpc = this.props.monero;
        this.api = this.props.api;
        this.notification = this.props.notification;

        this.state = {
            payments: [],
            escrow_payments: [],
            interval: null,
            loading: true,
            error_flag: false,
            error_msg: '',
            redirect: '',
            param: this.props.match.params,
            wsMutex: new Mutex(),
        };

        this.logout = this.logout.bind(this);
    }

    showError(err) {
        this.setState({loading: false, error_flag: true, error_msg: err});
    }

    async showErrorAndCloseWallet(err, wallet_filename) {
        this.showError(err);
        await this.rpc.close_wallet(wallet_filename);
    }

    updateProgressbar(id, value) {
        const paymentsEdited = this.state.payments.slice();
        paymentsEdited.find(function (element) {
            return element.id === id;
        }).progressbar = value;
        this.setState({ payments: paymentsEdited });
    }

    markWalletReady(id) {
        const paymentsEdited = this.state.payments.slice();
        paymentsEdited.find(function (element) {
            return element.id === id;
        }).wallet_ready = true;
        this.setState({ payments: paymentsEdited });
    }

    componentWillUnmount() {
        if (this.state.interval != null) clearInterval(this.state.interval);
    }

    /*
    * Add the payment to local storage.
    * Next time performWalletUpdate is run, this payment will be ignored if useCache:true
    */
   addPaymentToCache(paymentId) {
       let paymentsCache = JSON.parse(localStorage.getItem('paymentsCache'));
       if (!paymentsCache) paymentsCache = [];
       if (!paymentsCache[paymentId]) paymentsCache.push(paymentId);
       localStorage.setItem('paymentsCache', JSON.stringify(paymentsCache));
    }

    async componentDidMount() {
        try {
            let response = await this.api.get('payments');
            if (response.status === 200) {
                response.data.message.forEach(function (element) {
                    element.wallet_filename = element.id + '_wallet';
                    element.wallet_ready = false;
                    element.progressbar = -1;
                });

                let allPayments = response.data.message;
                let escrowPayments = allPayments.filter(
                    (element) => element.payment_type === 'ESCROW'
                );

                this.setState({ payments: allPayments, escrow_payments: escrowPayments });
            } else {
                if (response.status === 401) {
                    this.setState({ redirect: 'login' });
                }

                window.electron.log.error(response.status);
                window.electron.log.error(response.data);

                this.showError(response.data.error);

                return;
            }
        } catch(error) {
            alert('connection error, check settings and restart the program');
            this.setState({ redirect: 'settings' });
            return;
        }

        await this.performWalletUpdate({ useCache: true });

        var delayTime = Number.parseInt(this.props.config.auto_update_interval * 1000);
        if(delayTime < 10000) delayTime = 15000;
        let intervalId = setInterval(async () => {
            await this.performWalletUpdate({ useCache: true });
        }, delayTime);

        this.setState({ interval: intervalId });

        // we have finished loaded
        this.setState({ loading: false });
    }

    async performWalletUpdate({ useCache }) {
        let paymentsCache = JSON.parse(localStorage.getItem('paymentsCache'));
        if (!paymentsCache) paymentsCache = [];

        this.state.escrow_payments.forEach(async (payment) => {
            /* Skips all operations if we are using cache and payment is on the list. */
            if (useCache && paymentsCache.includes(payment.id)) {
                this.markWalletReady(payment.id);
                return;
            }

            await this.state.wsMutex.runExclusive(async () => {
                window.electron.log.log('START PROCESSING PAYMENT ID#' + payment.id);

                let multisig;
                let response = await this.api.get('multisig/create/' + payment.id);
                if (response.status === 200) {
                    multisig = response.data.message; // TODO check what happens if payment not found or wallet not created yet
                } else {
                    window.electron.log.error(response.status);
                    window.electron.log.error(response.data);

                    return;
                }

                // Open wallet or create new if it doesn't exist
                window.electron.log.log('[' + payment.id + '] opening wallet...');
                try {
                    await this.rpc.open_wallet(payment.wallet_filename, 'password');
                    window.electron.log.log('[' + payment.id + '] ...ok');
                } catch (error) {
                    window.electron.log.warn(error);
                    window.electron.log.warn('[' + payment.id + '] ...fail, fallback to creating it');
                    window.electron.log.log('[' + payment.id + '] creating wallet...');

                    try {
                        await this.rpc.create_wallet(payment.wallet_filename, 'password');
                        window.electron.log.log('[' + payment.id + '] ...ok');
                    } catch (error) {
                        window.electron.log.error(error);
                        window.electron.log.error('[' + payment.id + '] ...fail');

                        this.showError(error);

                        return;
                    }
                }

                // Process through multisig wallet creation steps
                switch (multisig.status) {
                    case 'created':
                        window.electron.log.log('[' + payment.id + '] status CREATED');
                        this.updateProgressbar(payment.id, 25);

                        if (multisig.multisig_info === null) {
                            let ms_info;
                            try {
                                window.electron.log.log('[' + payment.id + '] preparing...');
                                ms_info = await this.rpc.prepare_multisig();
                                window.electron.log.log('[' + payment.id + '] ...ok');
                            } catch (error) {
                                window.electron.log.error('[' + payment.id + '] Monero fail:');
                                window.electron.log.error(error);

                                await this.showErrorAndCloseWallet(error, payment.wallet_filename);

                                break;
                            }

                            window.electron.log.log('[' + payment.id + '] sending data to server...');
                            let response = await this.api.post('multisig/create/' + payment.id, { multisig_info: ms_info });
                            if (response.status === 200) {
                                window.electron.log.log('[' + payment.id + '] ...ok');
                            } else {
                                window.electron.log.error('[' + payment.id + '] API fail preparing step');
                                window.electron.log.error(response.status);
                                window.electron.log.error(response.data);

                                await this.showErrorAndCloseWallet(response.data.error, payment.wallet_filename);
                            }
                        }
                    break;

                    case 'prepared':
                        window.electron.log.log('[' + payment.id + '] status PREPARED');
                        this.updateProgressbar(payment.id, 50);

                        if (multisig.multisig_info === null) {
                            let ms_info;
                            try {
                                window.electron.log.log('[' + payment.id + '] making...');
                                ms_info = await this.rpc.make_multisig(multisig.multisig_info_peers, 'password');
                                window.electron.log.log('[' + payment.id + '] ...ok');
                            } catch (error) {
                                window.electron.log.error('[' + payment.id + '] Monero fail:');
                                window.electron.log.error(error);

                                await this.showErrorAndCloseWallet(error, payment.wallet_filename);

                                break;
                            }

                            window.electron.log.log('[' + payment.id + '] sending data to server...');
                            let response = await this.api.post('multisig/create/' + payment.id, { multisig_info: ms_info.getMultisigHex() });
                            if (response.status === 200) {
                                window.electron.log.log('[' + payment.id + '] ...ok');
                            } else {
                                window.electron.log.error('[' + payment.id + '] API fail making step');
                                window.electron.log.error(response.status);
                                window.electron.log.error(response.data);

                                await this.showErrorAndCloseWallet(response.data.error, payment.wallet_filename);
                            }
                        }
                    break;

          case 'made':
            window.electron.log.log('[' + payment.id + '] status MADE');
            this.updateProgressbar(payment.id, 75);

            if (multisig.multisig_address === null) {
              let ms_info;
              try {
                window.electron.log.log('[' + payment.id + '] finalizing...');
                ms_info = await this.rpc.finalize_multisig(
                  multisig.multisig_info_peers,
                  'password'
                );
                window.electron.log.log('[' + payment.id + '] ...ok');
              } catch (error) {
                window.electron.log.error('[' + payment.id + '] Monero fail:');
                window.electron.log.error(error);

                await this.showErrorAndCloseWallet(error, payment.wallet_filename);

                break;
              }

              window.electron.log.log(
                '[' + payment.id + '] sending data to server...'
              );
              let response = await this.api.post(
                'multisig/create/' + payment.id,
                { multisig_address: ms_info.getAddress() }
              );
              if (response.status === 200) {
                window.electron.log.log('[' + payment.id + '] ...ok');
              } else {
                window.electron.log.error(
                  '[' + payment.id + '] API fail finalizing step'
                );
                window.electron.log.error(response.status);
                window.electron.log.error(response.data);

                await this.showErshowErrorAndCloseWalletror(response.data.message, payment.wallet_filename);
              }
            }
            break;

          case 'finalized':
            window.electron.log.log('[' + payment.id + '] status FINALIZED');
            this.updateProgressbar(payment.id, 100);
            setTimeout(
              () => this.markWalletReady(multisig.payment_request_id),
              3000
            );

            this.addPaymentToCache(payment.id);
            break;

          default:
            window.electron.log.error('[' + payment.id + '] invalid status');
            this.updateProgressbar(payment.id, 0);
        }

        await this.rpc.close_wallet(payment.wallet_filename);

        window.electron.log.log('END PROCESSING PAYMENT ID#' + payment.id);
      });
    });
  }

  logout() {
    this.setState({ redirect: 'login' });
  }

  render() {
    const {
      payments,
      loading,
      error_flag,
      error_msg,
    } = this.state;

    let user = JSON.parse(localStorage.getItem('user'));

    if (this.state.redirect) {
      return <Redirect to={this.state.redirect} />;
    }

    return (
      <>
        {loading && (
          <div className="loader" id="loader2">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        {!loading && (
          <>
            {error_flag &&
            <div className="alert alert-danger" role="alert">
                {error_msg}
            </div>
            }

            {!error_flag && (
              <>
                <nav className="fixed-top d-flex flex-column flex-md-row align-items-center p-3 px-md-4 mb-3 bg-white border-bottom box-shadow">
                  <h5 className="my-0 mr-md-auto font-weight-normal">
                    Hello <b>{user.username}</b>!
                  </h5>
                  <nav className="my-2 my-md-0 mr-md-3">
                    <Link className="p-2 text-dark" to="/settings">
                      Settings
                    </Link>
                  </nav>
                  <button
                    className="btn btn-outline-danger"
                    type="button"
                    onClick={this.logout}
                  >
                    Logout
                  </button>
                </nav>

                <div className="container content">

                  <div className="pricing-header px-3 py-3 pt-md-5 pb-md-4 mx-auto text-center">
                    <Flower></Flower>
                    <h2 className="display-4">My Payments</h2>
                  </div>

                  {user.account === 'merchant' && (
                    <>
                      <nav aria-label="breadcrumb">
                        <ol className="breadcrumb">
                          <li
                            className="breadcrumb-item active"
                            aria-current="page"
                          >
                            As Merchant
                          </li>
                        </ol>
                      </nav>
                      <div className="card-deck mb-3 text-center">
                        {payments.filter((p) => {
                          return p.merchant === user.username;
                        }).length === 0 ? (
                          <div className="card">
                            <div className="card-body">Empty</div>
                          </div>
                        ) : (
                          payments
                            .filter((p) => {
                              return p.merchant === user.username;
                            })
                            .map((payment) => (
                              <Payment payment={payment} key={payment.id} />
                            ))
                        )}
                      </div>
                    </>
                  )}

                  <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                      <li
                        className="breadcrumb-item active"
                        aria-current="page"
                      >
                        As Customer
                      </li>
                    </ol>
                  </nav>
                  <div className="card-deck mb-3 text-center">
                    {payments.filter((p) => {
                      return p.customer === user.username;
                    }).length === 0 ? (
                      <div className="card">
                        <div className="card-body">Empty</div>
                      </div>
                    ) : (
                      payments
                        .filter((p) => {
                          return p.customer === user.username;
                        })
                        .map((payment) => (
                          <Payment payment={payment} key={payment.id} />
                        ))
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </>
    );
  }
}
