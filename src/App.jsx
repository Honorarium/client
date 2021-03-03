import React, { Component } from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';
import Intro from './Intro/Intro';
import Home from './Home/Home';
import Login from './Login/Login';
import Settings from './Settings/Settings';
import Info from './Info/Info';
import Api from './utils/api.js';
import Notify from './utils/notify.js';
import MoneroRPC from './utils/monero_rpc';
import isElectron from 'is-electron';

if (isElectron()) {
    var ipcRenderer = window.electron.ipcRenderer;
} else {
    alert('platform error');
}

export default class App extends Component {
    constructor(props) {
        super(props);

        const config = ipcRenderer.sendSync('get-config');

        this.state = {
            config: config,
            api: new Api(ipcRenderer, config.server_address),
            monero: new MoneroRPC(config.rpc_user, config.rpc_pass, config.daemon_address + ':' + config.daemon_port, ipcRenderer),
            notification: new Notify(ipcRenderer)
        };

        this.handleConfigChange = this.handleConfigChange.bind(this);
    }

    handleConfigChange(newConfig) {
        ipcRenderer.invoke('set-config', newConfig).then((savedConfig) => {
            this.setState({config: savedConfig});
        });
    }

    render() {
        return (
            <HashRouter>
                <Switch>
                    <Route exact path="/" render={(props) => <Intro config={this.state.config} monero={this.state.monero} api={this.state.api} {...props} /> } />
                    <Route exact path="/login" render={(props) => <Login config={this.state.config} api={this.state.api} {...props} /> } />
                    <Route exact path="/home" render={(props) => <Home config={this.state.config} monero={this.state.monero} api={this.state.api} notification={this.state.notification} {...props} /> } />
                    <Route exact path="/info/:payment_id" render={(props) => <Info config={this.state.config} monero={this.state.monero} api={this.state.api} notification={this.state.notification} {...props} /> } />
                    <Route exact path="/settings" render={(_props) => <Settings config={this.state.config} onConfigChange={this.handleConfigChange} />} />
                </Switch>
            </HashRouter>
        );
    }
}
