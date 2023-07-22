import React, { useState } from 'react';
import { Navigate, NavLink } from "react-router-dom";
import { ContextData } from "../components/App";
import Header from '../components/Header';
import Footer from '../components/Footer';
import Payment from '../components/Payment';
import Axios from 'axios';

function Account() {
    const { sessionParameters, setSessionParameters } = React.useContext(ContextData);
    const [promoCodeMessage, setPromoCodeMessage] = useState("")
    const [promoCode, setPromoCode] = useState("")
    const [selectedPlanId, setSelectedPlanId] = useState("")
    const [constPlans, setConstPlans] = useState({
        "refill100": { "tokens": 100, "price": "5.00" },
        "refill200": { "tokens": 200, "price": "10.00" },
        "refill500": { "tokens": 500, "price": "20.00" },
        "subscribe": { "tokens": -1, "price": "50.00", "plan-id": "P-9UL502108D798502VMSIIS7Y" },
    })
    const [passRegister, setPassRegister] = useState('')
    const [passConfirmRegister, setPassConfirmRegister] = useState('')
    const [deletePass, setDeletePass] = useState('')

    const displaySelected = (newSelectedPlan) => {
        if (selectedPlanId) {
            document.getElementById(selectedPlanId).classList.remove("active")
        }
        setSelectedPlanId(newSelectedPlan)
        document.getElementById(newSelectedPlan).classList.add("active")
    }

    function promoCodeValidation() {
        let newPromoCode = document.getElementById("input-promo").value

        if (newPromoCode && newPromoCode !== promoCode) {
            setPromoCode(newPromoCode)
            Axios.post('https://review-rocket.fr:4000/api/validate-promo-code', {
                code: newPromoCode
            }).then(async (res) => {
                // console.log(newPromoCode, res)
                if (res.data.success) {
                    let plans = {
                        ...constPlans,
                        ...res.data.changes
                    }
                    setConstPlans({ ...plans })
                    setPromoCodeMessage("Promo code applied: " + newPromoCode + " (" + res.data.promo_desc + ")")
                    return
                }
                setPromoCodeMessage(res.data.message)
            })
        }
    }

    const changePassValidation = (e) => {
        e.preventDefault()

        let passConfirmElement = document.getElementById("confirm-password");
        let inputs = document.querySelectorAll("input")
        inputs.forEach(element => element.setAttribute("disabled", ''))

        if (passRegister === passConfirmRegister) {
            Axios.post('https://review-rocket.fr:4000/api/change-password', {
                userPass: passRegister
            }).then((res) => {
                if (res.data.success) {
                    window.alert("Your password has been succesfully changed");
                }
            })
        } else {
            passConfirmElement.setCustomValidity("Passwords do not match")
        }

        inputs.forEach(element => element.removeAttribute("disabled"))
        return false
    }

    const deleteAccount = (e) => {
        e.preventDefault()

        let inputs = document.querySelectorAll("input")
        inputs.forEach(element => element.setAttribute("disabled", ''))

        if (window.confirm("Do you really want to delete your account?")) {
            Axios.post('https://review-rocket.fr:4000/api/delete-account', {
                userPass: deletePass
            }).then((res) => {
                if (!res.data.success) {
                    alert("Error when trying to delete the account");
                } else {
                    window.location.reload()
                }
            })
        }

        inputs.forEach(element => element.removeAttribute("disabled"))
        return false
    }

    if (sessionParameters.isLogged === undefined) {
        return (
            <div className="login-page text-center p-5">
                Checking your credentials...
            </div>
        )
    }

    if (!sessionParameters.isLogged) {
        return (
            <div className="login-page text-center p-5">
                Checking your credentials...
                <Navigate replace to={"/login"} />
            </div>
        )
    }

    return (
        <div>
            <Header />

            <div className="account-page container text-center py-5">
                <h1>Account</h1>
                {!sessionParameters.isVerified ?
                    <div className="alert alert-danger" role="alert">
                        ⚠️ Please verify your account with the link sent to your inbox to start generating reviews. ⚠️
                    </div>
                    :
                    null
                }
                <div className="container pt-5">
                    <h2>Manage your account</h2>
                    <div className="pt-3">
                        <div className="card m-3">
                            <div className="card-header">
                                Change password
                            </div>
                            <div className="card-body">
                                <form className="register-form mb-2 mx-5" onSubmit={(e) => { changePassValidation(e) }}>
                                    <label htmlFor="password" className="form-label change-password">Password:</label>
                                    <input type="password" name="password" id="change-password" className="form-control change-password mb-2" required min-length="8" onChange={(e) => { setPassRegister(e.target.value) }} />
                                    <label htmlFor="confirm-password" className="form-label change-password">Confirm password:</label>
                                    <input type="password" name="confirm-password" id="confirm-password" className="form-control change-password mb-2" required min-length="8" onChange={(e) => { setPassConfirmRegister(e.target.value) }} />
                                    <div id="password-help" className="form-text mb-3">
                                        Your password must be 8-250 characters long, contain letters and numbers, and must not contain spaces, special characters, or emoji.
                                    </div>
                                    <input type="submit" value="Change password" className="change-submit btn btn-primary" />
                                </form>
                            </div>
                        </div>
                        <div className="card m-3">
                            <div className="card-header">
                                Delete account
                            </div>
                            <div className="card-body">
                                <form className="register-form mb-2 mx-5" onSubmit={(e) => { deleteAccount(e) }}>
                                    <label htmlFor="password" className="form-label delete-password">Password:</label>
                                    <input type="password" name="password" id="delete-password" className="form-control delete-password mb-2" required min-length="8" onChange={(e) => { setDeletePass(e.target.value) }} />
                                    <input type="submit" value="Delete account" className="delete-submit btn btn-danger" />
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="refill" className="container pt-5">
                    <h2>Get more tokens</h2>
                    <div className="form-text">
                        Select your plan to refill your tokens or subscribe for unlimited access to ReviewRocket <br />
                        (1 token = 1 review)
                    </div>
                    <div className="pt-3">
                        {(sessionParameters.tokens >= 0) ?
                            <>
                                <div className="card m-3 refill-choice" id="subscribe" onClick={() => { displaySelected("subscribe") }}>
                                    <div className="card-body">
                                        <h5 className="card-title">Unlimited power</h5>
                                        <h6 className="card-subtitle mb-2 text-muted">{constPlans['subscribe']['price']}$ / month</h6>
                                        <p className="card-text">This plan grants you unlimited access to ReviewRocket</p>
                                    </div>
                                </div>
                                <div className="d-flex flex-column flex-md-row">
                                    <div className="card m-3 refill-choice" id="refill100" onClick={() => { displaySelected("refill100") }}>
                                        <div className="card-body">
                                            <h5 className="card-title">Beginner pack</h5>
                                            <h6 className="card-subtitle mb-2 text-muted">{constPlans['refill100']['price']}$</h6>
                                            <p className="card-text">This plan refills your account by 100 tokens</p>
                                        </div>
                                    </div>
                                    <div className="card m-3 refill-choice" id="refill200" onClick={() => { displaySelected("refill200") }}>
                                        <div className="card-body">
                                            <h5 className="card-title">Average seller</h5>
                                            <h6 className="card-subtitle mb-2 text-muted">{constPlans['refill200']['price']}$</h6>
                                            <p className="card-text">This plan refills your account by 200 tokens</p>
                                        </div>
                                    </div>
                                    <div className="card m-3 refill-choice" id="refill500" onClick={() => { displaySelected("refill500") }}>
                                        <div className="card-body">
                                            <h5 className="card-title">Ecom addict</h5>
                                            <h6 className="card-subtitle mb-2 text-muted">{constPlans['refill500']['price']}$</h6>
                                            <p className="card-text">This plan refills your account by 500 tokens</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="d-flex flex-column flex-md-row justify-content-between mx-5 my-3 px-5">
                                    <input type="text" className="form-control" id="input-promo" placeholder="Promo code" />
                                    <input type="submit" value="Enter" className="btn btn-primary" onClick={(e) => { promoCodeValidation() }} />
                                </div>
                                <p>{promoCodeMessage}</p>


                                <div className="d-flex justify-content-center pt-3">
                                    <div className="col-sm-7">
                                        {Payment(constPlans[selectedPlanId])}
                                    </div>
                                </div>
                            </>
                            :
                            <>
                                <div>
                                    <div className="card m-3">
                                        <div className="card-body">
                                            <h5 className="card-title">Unlimited tokens</h5>
                                            <h6 className="card-subtitle mb-2 text-muted">You currently have this plan</h6>
                                            <p className="card-text">This plan grants you unlimited access to ReviewRocket</p>
                                            <NavLink to="https://www.paypal.com/myaccount/autopay/" className="btn active" target='_blank'>Unsubscribe</NavLink>
                                        </div>
                                    </div>
                                </div>
                            </>
                        }
                    </div>
                </div>
            </div>

            <Footer />
        </div >
    )
} export default Account;