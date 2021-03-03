import React from 'react';
import { confirmAlert } from 'react-confirm-alert';
import { Redirect } from 'react-router-dom';
import Flower from '../utils/flower';
import './settings.css';
import 'react-confirm-alert/src/react-confirm-alert.css';

export default class Settings extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      redirect: '',
      error_flag: false,
      error_msg: '',
      daemon_address: props.config.daemon_address,
      daemon_port: props.config.daemon_port,
      server_address: props.config.server_address,
      socks_host: props.config.socks_host,
      socks_port: props.config.socks_port,
      auto_update_interval: props.config.auto_update_interval,
    };

    this.originalConfig = this.props.config;
    this.onFormChange = this.onFormChange.bind(this);
    this.saveConfig = this.saveConfig.bind(this);
  }

  showError(err) {
      this.setState({error_flag: true, error_msg: err});
  }

  isSameConfig(original, modified) {
    let result = true;
    Object.keys(modified).forEach((key) => {
      if (modified[key] !== original[key]) result = false;
    });
    return result;
  }

  validateConfig(config) {

    if(config.daemon_port < 1024 || config.daemon_port > 40000) {
        this.showError('daemon port cannot be lower than 1024 or higher than 10000');
        return false;
    }

    if(config.socks_port < 1024 || config.socks_port > 40000) {
        this.showError('socks port cannot be lower than 1024 or higher than 10000');
        return false;
    }

    if(config.auto_update_interval < 15 || config.auto_update_interval > 300) {
        this.showError('auto update interval cannot be lower than 15 seconds or higher than 300 (5 minutes)');
        return false;
    }

    return true;
  }

  saveConfig() {
    let config = {
        daemon_address: this.state.daemon_address,
        daemon_port: this.state.daemon_port,
        server_address: this.state.server_address,
        socks_host: this.state.socks_host,
        socks_port: Number.parseInt(this.state.socks_port),
        auto_update_interval: Number.parseInt(this.state.auto_update_interval),
    };

    if(!this.validateConfig(config)) return;

    this.props.onConfigChange(config);

    if (!this.isSameConfig(this.originalConfig, config)) {
      confirmAlert({
        title: 'Restart Needed',
        message: 'A restart is needed for the new settings to take effect.',
        buttons: [
          {
            label: 'Restart',
            onClick: () => {
              window.electron.ipcRenderer.invoke('restart');
            },
          },
        ],
      });
    } else {
      this.setState({ redirect: 'home' });
    }
  }

  onFormChange(e) {
    var state = {};
    state[e.target.name] = e.target.value;
    this.setState(state);
  }

  render() {
    const { error_flag, error_msg } = this.state;

    if (this.state.redirect) {
      return <Redirect to={this.state.redirect} />;
    }

    return (
      <form className="form-signin" onSubmit={this.saveConfig} autoComplete="off">
        <div className="text-center mb-4">
          <Flower></Flower>
          <h1 className="h3 mb-3 font-weight-normal">Settings</h1>
        </div>

        {error_flag &&
        <div className="alert alert-danger" role="alert">
            {error_msg}
        </div>
        }

        <div className="form-label-group">
          <input
            id="daemon_address"
            name="daemon_address"
            type="url"
            pattern="http://.*"
            value={this.state.daemon_address}
            className="form-control"
            onChange={this.onFormChange}
            placeholder="Monero Daemon Address"
            required
            autoFocus
          />
          <label htmlFor="daemon_address">Monero Daemon Address</label>
        </div>

        <div className="form-label-group">
          <input
            id="daemon_port"
            name="daemon_port"
            type="number"
            pattern='[0-9]{0,5}'
            value={this.state.daemon_port}
            className="form-control"
            onChange={this.onFormChange}
            placeholder="Monero Daemon Port"
            required
          />
          <label htmlFor="daemon_port">Monero Daemon Port</label>
        </div>

        <div className="form-label-group">
          <input
            id="server_address"
            name="server_address"
            type="url"
            pattern="http://.*"
            value={this.state.server_address}
            className="form-control"
            onChange={this.onFormChange}
            placeholder="Server Address"
            required
          />
          <label htmlFor="server_address">Server Address</label>
        </div>

        <div className="form-label-group">
          <input
            id="socks_host"
            name="socks_host"
            type="text"
            value={this.state.socks_host}
            className="form-control"
            onChange={this.onFormChange}
            placeholder="Socks Host"
            required
          />
          <label htmlFor="socks_host">Socks Host</label>
        </div>

        <div className="form-label-group">
          <input
            id="socks_port"
            name="socks_port"
            type="number"
            pattern='[0-9]{0,5}'
            value={this.state.socks_port}
            className="form-control"
            onChange={this.onFormChange}
            placeholder="Socks Port"
            required
          />
          <label htmlFor="socks_port">Socks Port</label>
        </div>

        <div className="form-label-group">
          <input
            id="auto_update_interval"
            name="auto_update_interval"
            type="number"
            value={this.state.auto_update_interval}
            className="form-control"
            onChange={this.onFormChange}
            placeholder="Auto-update Interval"
            min="10"
            max="100"
            required
          />
          <label htmlFor="auto_update_interval">
            Auto-update Interval (Seconds)
          </label>
        </div>

        <div
          className="btn btn-lg btn-primary btn-block"
          onClick={this.saveConfig}
        >
          Save and Go Back
        </div>
      </form>
    );
  }
}
