import Header from '../components/Header';
import Footer from '../components/Footer';
import { Navigate, useSearchParams } from "react-router-dom";
import React, { useState } from 'react';
import Axios from 'axios';
import { ContextData } from "../components/App";

function Verify() {
    const sessionParameters = React.useContext(ContextData).sessionParameters;
    const searchParams = useSearchParams()[0];
    const [verificationSuccess, setVerificationSuccess] = useState(undefined)

    Axios.defaults.withCredentials = true;

    if (sessionParameters.isVerified) {
        return (
            <div>
                <Header />

                <Navigate to="/account"></Navigate>

                <Footer />
            </div>
        )
    }

    if (!searchParams.get('key') || !searchParams.get('email')) {
        return (
            <div>
                <Header />

                <div className="verify-page text-center p-5">
                    <div>
                        <h1>Oops!</h1>
                    </div>
                    We could not verify your account.
                    Please check that you have used the link provided in your verification email and try again.
                    If the problem persists, contact the support.
                </div>

                <Footer />
            </div>
        )
    }

    Axios.post('https://review-rocket.fr/api/verify', {
        userEmail: searchParams.get('email'),
        verificationKey: searchParams.get('key'),
    }).then((res) => {
        // console.log(res, sessionParameters)
        setVerificationSuccess(res.data.verified)
    })

    return (
        verificationSuccess === undefined ?
            <div>
                <Header />

                <div className="verify-page text-center p-5">
                    <div>
                        <h1>Please wait</h1>
                    </div>
                    We are trying to verify your account. This may take a few seconds.
                </div>

                <Footer />
            </div>
            :
            verificationSuccess === false ?
                <div>
                    <Header />

                    <div className="verify-page text-center p-5">
                        <div>
                            <h1>Oops!</h1>
                        </div>
                        We could not verify your account.
                        Please check that you have used the link provided in your verification email and try again.
                        If the problem persists, contact the support.
                    </div>

                    <Footer />
                </div>
                :
                <div>
                    <Header />

                    <div className="verify-page text-center p-5">
                        <div>
                            <h1>Success!</h1>
                        </div>
                        Your account has been successfully verified, you can close this page or connect to your account to start generating reviews.
                        {!sessionParameters.isLogged ? null : <Navigate to="/account"></Navigate>}
                    </div>

                    <Footer />
                </div>
    )
}

export default Verify;