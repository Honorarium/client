import React from 'react';
import { Redirect } from "react-router-dom";

export default class Payment extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            payment: this.props.payment,
            redirect_url: '',
            redirect_param: ''
        };
    }

    viewDetails(payment) {
        this.setState({redirect_param: payment, redirect_url: 'info'});
    }

    timeSince = (inputDate) => {
        var now = new Date();
        var timeStamp = new Date(inputDate);
        var secondsPast = (now.getTime() - timeStamp.getTime()) / 1000;

        if (secondsPast < 60) {
          return parseInt(secondsPast) + 's';
        }
        if (secondsPast < 3600) {
          return parseInt(secondsPast / 60) + 'm';
        }
        if (secondsPast <= 86400) {
          return parseInt(secondsPast / 3600) + 'h';
        }
        if (secondsPast > 86400) {
          var day = timeStamp.getDate();
          var month = timeStamp.toDateString().match(/ [a-zA-Z]*/)[0].replace(" ", "");
          var year = timeStamp.getFullYear() === now.getFullYear() ? "" : " " + timeStamp.getFullYear();
          return day + " " + month + year;
        }
    }

    displayTotalUSD(payment) {
        return parseFloat(payment.amount_usd) + parseFloat(payment.shipping_usd);
    }

    getStatusColor(status) {
        switch(status) {
            case 'closed':
                return 'secondary';

            case 'funded':
                return 'success';

            case 'expired':
            case 'cancelled':
                return 'warning';

            case 'reported':
                return 'danger';

            case 'refunded':
                return 'warning';

            case 'confirming':
                return 'info';

            default:
                return 'primary';
        }
    }

    render() {
        const { payment } = this.state;

        if (this.state.redirect_url) {
            return <Redirect to={this.state.redirect_url + '/' + this.state.redirect_param} />
        }

        return (
            <div className={`card mb-4 box-shadow border-${this.getStatusColor(payment.status)}`} key={payment.id}>
                <div className="card-header">
                    <p className={`my-0 font-weight-light text-${this.getStatusColor(payment.status)}`}><span className={`badge badge-${this.getStatusColor(payment.status)}`}>{payment.status.toUpperCase()}</span></p>
                </div>
                <div className="card-body">
                    <h1 className={`card-title pricing-card-title text-${this.getStatusColor(payment.status)}`}>${this.displayTotalUSD(payment)}</h1>
                    {payment.payment_type === 'ESCROW' && !payment.wallet_ready && payment.progressbar !== -1 &&
                        <>
                        {payment.status !== 'PENDING' &&
                            <div className="alert alert-danger" role="alert">
                            Inconsistent wallet status
                            </div>
                        }

                        {payment.status === 'PENDING' &&
                        <div className="progress">
                            <div className={`progress-bar progress-bar-striped progress-bar-animated bg-${this.getStatusColor(payment.status)}`} role="progressbar" aria-valuenow={payment.progressbar} aria-valuemin="0" aria-valuemax="100" style={{width: payment.progressbar+"%" }}>creating...</div>
                        </div>
                        }
                        </>
                    }
                    { payment.payment_type === 'ESCROW' && !payment.wallet_ready && payment.progressbar === -1 &&
                    <div className={`spinner-border text-${this.getStatusColor(payment.status)}`} role="status">
                        <span className="sr-only">Loading...</span>
                    </div>
                    }
                    <ul className="list-unstyled mt-3 mb-4">
                        {payment.item_list == null
                        ? <li>{payment.description}</li>
                        : payment.item_list.map(item => (
                        <li>{item.description}</li>
                        ))
                        }
                        <hr />
                        <li>Customer: <i>{payment.customer}</i></li>
                        <li>Merchant: <i>{payment.merchant}</i></li>
                    </ul>
                    {payment.payment_type === 'ESCROW' && payment.wallet_ready && <button type="button" className={`btn btn-lg btn-block btn-outline-${this.getStatusColor(payment.status)}`} onClick={() => this.viewDetails(payment.id)}>View Details</button> }
                </div>
                <div className="card-footer text-muted">
                    Last updated {this.timeSince(payment.updated_at)}
                </div>
            </div>
        );
    }
}