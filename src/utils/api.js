export default class Api {
    constructor(ipcRenderer, base_url) {
        this.ipcRenderer = ipcRenderer;
        this.base_url = base_url;
    }

    async get(url, options) {
        const full_url = this.base_url + '/api/v1/' + url;
        const default_options = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token') || '',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:78.0) Gecko/20100101 Firefox/78.0',
            }
        };
        const all_options = {...default_options, ...options};

        const result = await this.ipcRenderer.invoke('tor-get', full_url, all_options);

        if(result === null) throw new Error('tor connection error');

        return result;
    }

    async post(url, data, options) {
        const full_url = this.base_url + '/api/v1/' + url;
        const default_options = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token') || '',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:78.0) Gecko/20100101 Firefox/78.0',
            },
        };
        const all_options = {...default_options, ...options};

        const result = await this.ipcRenderer.invoke('tor-post', full_url, data, all_options);

        if(result === null) throw new Error('tor connection error');

        return result;
    }

    async login(username, password) {
        const full_url = this.base_url + '/oauth/token';
        const options = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:78.0) Gecko/20100101 Firefox/78.0',
            },
        };
        const data = {
            "grant_type": "password",
            "client_id": "2",
            "client_secret": "k2qG54XQ75mXWp5g3KygZrwUBE90WQ4qZyHJC6jV",
            "username": username,
            "password": password,
            "scope": "*",
        }
        const result = await this.ipcRenderer.invoke('tor-post', full_url, data, options);

        if(result === null) throw new Error('tor connection error');

        return result;
    }
}
