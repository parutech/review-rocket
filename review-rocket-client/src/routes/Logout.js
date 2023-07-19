import { ContextData } from "../components/App";
import { Navigate, useNavigate } from 'react-router-dom';
import React from 'react';
import Axios from 'axios';

function Logout() {
    const { sessionParameters, setSessionParameters } = React.useContext(ContextData);
    const navigate = useNavigate();

    Axios.defaults.withCredentials = true;

    Axios.post('https://review-rocket.fr:4000/api/logout').then((res) => {
        // console.log(res)
        if (!res.data.loggedIn) {
            setSessionParameters({
                isLogged: res.data.loggedIn,
                isVerified: res.data.verified,
                tokens: res.data.tokens,
            })
            navigate("/login")
        }
    })

    return (
        <div className="logout-page text-center p-5">
            Logging out...
            <Navigate replace to="/login" />
        </div>
    )
}

export default Logout;
