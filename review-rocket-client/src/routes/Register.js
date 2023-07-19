import Header from '../components/Header';
import Footer from '../components/Footer';
import { ContextData } from "../components/App";
import { NavLink, Navigate, useNavigate } from 'react-router-dom';
import React, { useState, useRef } from 'react';
import Axios from 'axios';
import Reaptcha from 'reaptcha';

function Register() {
    const { sessionParameters, setSessionParameters } = React.useContext(ContextData);
    const [emailRegister, setEmailRegister] = useState('')
    const [passRegister, setPassRegister] = useState('')
    const [passConfirmRegister, setPassConfirmRegister] = useState('')
    const [captchaSuccess, setCaptchaSuccess] = useState(undefined)
    const [registerMessage, setRegisterMessage] = useState("")
    const navigate = useNavigate();
    const captchaRef = useRef(null)

    Axios.defaults.withCredentials = true;

    const captchaValidation = () => {
        captchaRef.current.getResponse().then(res => {
            Axios.post('https://review-rocket.fr:4000/api/captcha', {
                token: res
            }).then((response) => {
                setCaptchaSuccess(response.data.verification)
                document.getElementsByClassName("register-submit")[0].removeAttribute('disabled')
            })
        })
    }

    const registerValidation = (e) => {
        e.preventDefault()

        let passConfirmElement = document.getElementById("confirm-password");
        let inputs = document.querySelectorAll("input")
        inputs.forEach(element => element.setAttribute("disabled", ''))

        if (passRegister === passConfirmRegister) {
            Axios.post('https://review-rocket.fr:4000/api/register', {
                userEmail: emailRegister,
                userPass: passRegister,
                captcha: captchaSuccess
            }).then((res) => {
                if (res.data.registered) {
                    navigate("/login")
                }
                setRegisterMessage(res.data.message)
                inputs.forEach(element => element.removeAttribute("disabled"))
                document.getElementsByClassName("register-submit")[0].setAttribute("disabled", '')
                captchaRef.current.reset();
            })
        } else {
            passConfirmElement.setCustomValidity("Passwords do not match")
        }

        return false
    }

    if (!sessionParameters.isLogged) {
        return (
            <div>
                <Header />

                <div className="register-page container">
                    <div className="text-center pt-5 px-5">
                        <h1>Create a new account</h1>
                    </div>

                    <div className="container-fluid text-center p-5" onSubmit={(e) => { registerValidation(e) }}>
                        <div className="register container p-5">
                            <form className="register-form mb-2 mx-5">
                                <label htmlFor="email" className="form-label register-email">Email:</label>
                                <input type="email" name="email" id="email" className="form-control register-email mb-2" required onChange={(e) => { setEmailRegister(e.target.value) }} />
                                <label htmlFor="password" className="form-label register-password">Password:</label>
                                <input type="password" name="password" id="password" className="form-control register-password mb-2" required min-length="8" onChange={(e) => { setPassRegister(e.target.value) }} />
                                <label htmlFor="confirm-password" className="form-label register-password">Confirm password:</label>
                                <input type="password" name="confirm-password" id="confirm-password" className="form-control register-password mb-2" required min-length="8" onChange={(e) => { setPassConfirmRegister(e.target.value) }} />
                                <div id="password-help" className="form-text mb-3">
                                    Your password must be 8-250 characters long, contain letters and numbers, and must not contain spaces, special characters, or emoji.
                                </div>
                                <div className="d-flex justify-content-center">
                                    <Reaptcha className="register-captcha mb-2" sitekey="6LdVsMMmAAAAAMPZXnQiGv-_Tb5FQ6HvjAR3LHyV" ref={captchaRef} onVerify={captchaValidation} />
                                </div>
                                <input type="submit" value="Register" className="register-submit btn btn-primary" disabled />
                            </form>
                            <div>{registerMessage}</div>
                        </div>
                        <div className="mt-3">Already registered? <NavLink to="/login">Click here to login</NavLink>!</div>
                    </div>
                </div>

                <Footer />
            </div>
        )
    }

    if (!sessionParameters.isVerified) {
        return (
            <div className="login-page text-center p-5">
                Checking your credentials...
                <Navigate replace to={"/account"} />
            </div>
        )
    }

    return (
        <div className="login-page text-center p-5">
            Checking your credentials...
            <Navigate replace to={"/generate"} />
        </div>
    )
}

export default Register;
