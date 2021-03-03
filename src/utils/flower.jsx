import React from 'react';

export default class Flower extends React.Component {

    getFlower() {
        let user = JSON.parse(localStorage.getItem('user'));
        if(user === null) return 'logo.png';

        return String(user.flower+'.png');
    }

    render() {
        return (
            <img className="mb-4" src={this.getFlower()} alt="flower" width="80" height="80" />
        );
    }
}