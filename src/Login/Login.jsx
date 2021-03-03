import React from 'react';
import { Redirect, Link } from "react-router-dom";
import './login.css';

export default class Login extends React.Component {
    constructor(props) {
        super(props);

        this.api = this.props.api;

        this.state = {
            username: '',
            password: '',
            loginSuccess: false,
            loginError: false,
            serverError: false,
            redirect: '',
        };

        this.handleChange = this.handleChange.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
    }

    async componentDidMount() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    handleChange = (name, e) => {
        this.setState({ [name]: e.target.value });
    }

    onSubmit = async (event) => {
        event.preventDefault();
        const { username, password } = this.state;
        this.setState({ loginError: false, serverError: false, loginSuccess: false });

        try {
            let response = await this.api.login(username, password);
            if(response.status === 200) {
                localStorage.setItem('token', response.data.access_token);
            } else {
                this.setState({ loginError: true });
                setTimeout(() => this.setState({ loginError: false }), 3000);
            }

            let res = await this.api.get('whoami');
            if(res.status === 200) {
                localStorage.setItem('user', JSON.stringify(res.data.message.user));
                setTimeout(() => this.setState({ redirect: 'home' }), 1000);
            } else {
                this.setState({ loginError: true });
                setTimeout(() => this.setState({ loginError: false }), 3000);
            }
        } catch(error) {
            alert('connection error, check settings and restart the program');
        }
    }

    render() {
        const { loginSuccess, loginError, serverError } = this.state;

        if (this.state.redirect) {
            return <Redirect to={this.state.redirect} />
        }

        return (
            <>
                <form className="form-signin" onSubmit={this.onSubmit} autoComplete="off">
                    <div className="text-center mb-4">
                        <img className="mb-4" src="logo.png" alt="logo" width="80" height="89" />
                        <h1 className="h3 mb-3 font-weight-normal">Login</h1>

                        {loginSuccess &&
                            <div className="alert alert-info" role="alert">
                                Login successful
                            </div>
                        }

                        {loginError &&
                            <div className="alert alert-danger" role="alert">
                                Wrong username or password
                            </div>
                        }

                        {serverError &&
                            <div className="alert alert-danger" role="alert">
                                Server error, retry
                            </div>
                        }
                    </div>

                    <div className="form-label-group">
                        <input type="text" name="username" id="username" className="form-control" placeholder="Username" autoComplete="username" onChange={(e) => this.handleChange("username", e)} required autoFocus />
                        <label htmlFor="username">Username</label>
                    </div>

                    <div className="form-label-group">
                        <input type="password" name="password" id="password" className="form-control" placeholder="Password" autoComplete="current-password" onChange={(e) => this.handleChange("password", e)} required />
                        <label htmlFor="password">Password</label>
                    </div>

                    {!loginSuccess &&
                        <button className="btn btn-lg btn-primary btn-block" type="submit">Sign in</button>
                    }

                    {loginSuccess &&
                    <button className="btn btn-lg btn-primary btn-block" type="button" disabled>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>&nbsp;
                        Loading...
                    </button>
                    }

                    <br />
                    <Link to="/settings" className="mt-5 mb-3 text-muted text-center">settings</Link>
                </form>
            </>
        );
    }
}
