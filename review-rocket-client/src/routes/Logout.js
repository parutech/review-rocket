import Header from '../components/Header';
import Footer from '../components/Footer';
import { ContextData } from "../components/App";
import { Navigate } from 'react-router-dom';
import React from 'react';
import Axios from 'axios';

function Logout() {
    const { sessionParameters, setSessionParameters } = React.useContext(ContextData);

    Axios.defaults.withCredentials = true;

    Axios.post('https://review-rocket.fr/api/logout').then((res) => {
        // console.log(res)
        if (!res.data.loggedIn) {
            let newSessionParameters = {
                ...sessionParameters,
                isLogged: res.data.loggedIn,
                isVerified: res.data.verified,
                tokens: res.data.tokens,
            }
            setSessionParameters(newSessionParameters)
        }
    })

    if (!sessionParameters.isLogged) {
        return (
            <div className='body'>
                <Header />
                <div className="logout-page text-center p-5">
                    Logging out...
                    <Navigate replace to="/login" />
                </div>
                <Footer />
            </div>
        )
    }

    return (
        <div className='body'>
            <Header />
            <div className="logout-page text-center p-5">
                Logging out...
            </div>
            <Footer />
        </div>
    )
}

export default Logout;
