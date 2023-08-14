import Header from '../components/Header';
import Footer from '../components/Footer';
import { ContextData } from "../components/App";
import { NavLink, Navigate } from 'react-router-dom';
import React, { useState, useRef } from 'react';
import Axios from 'axios';
import Reaptcha from 'reaptcha';

function Login() {
    const { sessionParameters, setSessionParameters } = React.useContext(ContextData);
    const [emailLogin, setEmailLogin] = useState('')
    const [passLogin, setPassLogin] = useState('')
    const [loginMessage, setLoginMessage] = useState("")
    const [captchaSuccess, setCaptchaSuccess] = useState(undefined)
    const captchaRef = useRef(null)

    Axios.defaults.withCredentials = true;

    const captchaValidation = () => {
        captchaRef.current.getResponse().then(res => {
            Axios.post('http://localhost:4000/api/captcha', {
                token: res
            }).then((response) => {
                setCaptchaSuccess(response.data.verification)
                document.getElementsByClassName("login-submit")[0].removeAttribute('disabled')
            })
        })
    }

    const loginValidation = (e) => {
        e.preventDefault()

        let inputs = document.querySelectorAll("input")
        inputs.forEach(element => element.setAttribute("disabled", ''))

        Axios.post('http://localhost:4000/api/login', {
            userEmail: emailLogin,
            userPass: passLogin,
            captcha: captchaSuccess
        }).then((res) => {
            if (res.data.loggedIn) {
                let newSessionParameters = {
                    ...sessionParameters,
                    isLogged: res.data.loggedIn,
                    isVerified: res.data.verified,
                    tokens: res.data.tokens,
                }
                setSessionParameters(newSessionParameters)
            }
            setLoginMessage(res.data.message)
            inputs.forEach(element => element.removeAttribute("disabled"))
            document.getElementsByClassName("login-submit")[0].setAttribute("disabled", '')
            captchaRef.current.reset();
        })
        return false
    }

    if (!sessionParameters.isLogged) {
        return (
            <div>
                <Header />

                <div className="login-page container">
                    <div className="text-center pt-5 px-5">
                        <h1>Connect to your account</h1>
                    </div>

                    <div className="container-fluid text-center p-5" onSubmit={(e) => { loginValidation(e) }}>
                        <div className="login container p-5">
                            <form className="login-form mb-2 mx-5">
                                <label htmlFor="email" className="form-label register-email">Email:</label>
                                <input type="email" name="email" id="email" className="form-control register-email mb-2" required onChange={(e) => { setEmailLogin(e.target.value) }} />
                                <label htmlFor="password" className="form-label login-password">Password:</label>
                                <input type="password" name="password" id="password" className="form-control login-password mb-2" required min-length="8" max-length="50" onChange={(e) => { setPassLogin(e.target.value) }} />
                                <div className="d-flex justify-content-center">
                                    <Reaptcha className="login-captcha mb-2" sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" ref={captchaRef} onVerify={captchaValidation} />
                                </div>
                                <input type="submit" value="Login" className="login-submit btn btn-primary" disabled />
                            </form>
                            <div>{loginMessage}</div>
                        </div>
                        <div className="mt-3">You don't have an account yet? <NavLink to="/register">Click here to register</NavLink>!</div>
                    </div>
                </div>

                <Footer />
            </div>
        );
    }

    if (!sessionParameters.isVerified) {
        return (
            <div className='body'>
                <Header />
                <div className="login-page text-center p-5">
                    Checking your credentials...
                    <Navigate replace to="/account" />
                </div>
                <Footer />
            </div>
        )
    }

    return (
        <div className='body'>
            <Header />
            <div className="login-page text-center p-5">
                Checking your credentials...
                <Navigate replace to="/generate" />
            </div>
            <Footer />
        </div>
    )
} export default Login;
