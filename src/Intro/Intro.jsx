import React from 'react';
import { Redirect } from "react-router-dom";
import './intro.css';
import '../index.css'

export default class Intro extends React.Component {
    constructor(props) {
        super(props);

        this.rpc = this.props.monero;
        this.api = this.props.api;

        this.state = {
            redirect: '',
            daemon_error: false,
        };
    }

    async componentDidMount() {
        localStorage.removeItem('user');

        // Check if local or remote node is in sync
        let moneroOk = await this.rpc.check_remotenode_sync();
        if(!moneroOk) { 
            this.setState({daemon_error: true});
            window.electron.log.error('Monero daemon not in sync');

            return;
        }
        window.electron.log.log('monero node ok');

        try {
            let response = await this.api.get('whoami');
            
            if(response.status === 200) {
                localStorage.setItem('user', JSON.stringify(response.data.message.user));
                setTimeout(() => this.setState({ redirect: 'home' }), 3000);
            } else {
                this.setState({ redirect: 'login' });
            }
        } catch(error) {
            alert('connection error, check settings and restart the program');
            this.setState({ redirect: 'login' });
        }
    }

    render() {
        const { daemon_error } = this.state;

        if (this.state.redirect) {
            return <Redirect to={this.state.redirect} />
        }

        return (
            <>
                {daemon_error &&
                    <div className="alert alert-danger" role="alert">
                        Monero daemon not in sync
                    </div>
                }

                {!daemon_error &&
                <div className="loader" id="loader2">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                }
            </>
        );
    }
}
