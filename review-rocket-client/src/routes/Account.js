import React, { useState, useEffect } from 'react';
import { Navigate } from "react-router-dom";
import { ContextData } from "../components/App";
import Header from '../components/Header';
import Footer from '../components/Footer';
import Payment from '../components/Payment';
import Axios from 'axios';

function Account() {
    const sessionParameters = React.useContext(ContextData).sessionParameters;
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
    const [referralState, setReferralState] = useState({})

    useEffect(() => {
        Axios.get('http://localhost:4000/api/referral-state').then((res) => {
            if (!res.data.success) {
                setReferralState({})
            }
            setReferralState(res.data.referralState)
        })
    }, [])

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
            Axios.post('http://localhost:4000/api/validate-promo-code', {
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

    async function requestPayout(payoutAmount) {
        let button = document.getElementById("btn-payout");
        button.setAttribute("disabled", '')
        Axios.post('http://localhost:4000/api/request-payout', {
            amount: payoutAmount
        }).then(async (res) => {
            button.removeAttribute("disabled")
            if (!res.data.success) {
                window.alert("Payout could not be requested, please try later and contact the support if the issue is reoccuring.");
                return
            }
            window.alert("Payout has been requested.");
            window.location.reload()
        })
        return
    }

    function resendVerification() {
        let button = document.getElementById("btn-email-verification");
        button.setAttribute("disabled", '')
        Axios.get('http://localhost:4000/api/resend-verification').then(async (res) => {
            button.removeAttribute("disabled")
            if (!res.data.success) {
                window.alert("Could not send verification email.");
                return
            }
            window.alert("Verification email has been sent.");
        })
        return
    }

    function unsubscribe() {
        Axios.get('http://localhost:4000/api/unsubscribe').then(async (res) => {
            if (!res.data.success) {
                window.alert("Could not unsubscribe.");
                return
            }
            window.alert("Successfully unsubscribed.");
            window.location.reload()
        })
        return
    }

    const changePassValidation = (e) => {
        e.preventDefault()

        let passConfirmElement = document.getElementById("confirm-password");
        let inputs = document.querySelectorAll("input")
        inputs.forEach(element => element.setAttribute("disabled", ''))

        if (passRegister === passConfirmRegister) {
            Axios.post('http://localhost:4000/api/change-password', {
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
            Axios.post('http://localhost:4000/api/delete-account', {
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
            <div className='body'>
                <Header />
                <div className="generate-page container text-center p-5" >
                    Checking your credentials...
                </div>
                <Footer />
            </div>
        )
    }

    if (!sessionParameters.isLogged) {
        return (
            <div className='body'>
                <Header />
                <div className="account-page container text-center py-5">
                    Checking your credentials...
                </div>
                <Navigate replace to="/logout" />
                <Footer />
            </div>
        )
    }

    return (
        <div>
            <Header />

            <div className="account-page container text-center py-5">
                {!sessionParameters.isVerified ?
                    <div className="alert alert-danger mb-5" role="alert">
                        ⚠️ Please verify your account with the link sent to your inbox to start generating reviews. ⚠️
                        <button id="btn-email-verification" className="btn btn-alert active mt-3" onClick={() => { resendVerification() }}>
                            <>  Resend verification email</>
                        </button>
                    </div>
                    :
                    null
                }
                <h1>Account</h1>
                <div className="form-text"><h6>{sessionParameters.user}</h6></div>

                <hr className="hr-blurry my-5" />

                {referralState.isAffiliate ?
                    <>
                        <div className="container text-center px-5">
                            <h2>Affiliation</h2>
                            <div className="form-text mb-3">Your affiliation link: https://review-rocket.fr/?ref={referralState.referralId}</div>
                            <div>
                                You have referred {referralState.userCount} user(s).
                            </div>
                            {referralState.payoutAmount >= 10 ?
                                <>
                                    <div>
                                        You are eligible for a payout of {referralState.payoutAmount}$ since your last payout.
                                    </div>
                                    <button id="btn-payout" className="btn btn-primary mt-3" onClick={() => { requestPayout(referralState.payoutAmount) }}>
                                        <>  Request payout</>
                                    </button>
                                </>
                                :
                                <div>
                                    You are not yet eligible for a payout (minimum 10$).
                                </div>
                            }
                        </div>
                        <hr className="hr-blurry my-5" />
                    </>
                    :
                    null
                }


                <div className="container text-center px-5">
                    <h2>Tokens</h2>
                    <div className="form-text">
                        Select your plan to refill your tokens or subscribe to get unlimited access to ReviewRocket <br />
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
                                            <p className="card-text">This plan refills your account by {constPlans['refill100']['tokens']} tokens</p>
                                        </div>
                                    </div>
                                    <div className="card m-3 refill-choice" id="refill200" onClick={() => { displaySelected("refill200") }}>
                                        <div className="card-body">
                                            <h5 className="card-title">Average seller</h5>
                                            <h6 className="card-subtitle mb-2 text-muted">{constPlans['refill200']['price']}$</h6>
                                            <p className="card-text">This plan refills your account by {constPlans['refill200']['tokens']} tokens</p>
                                        </div>
                                    </div>
                                    <div className="card m-3 refill-choice" id="refill500" onClick={() => { displaySelected("refill500") }}>
                                        <div className="card-body">
                                            <h5 className="card-title">Ecom addict</h5>
                                            <h6 className="card-subtitle mb-2 text-muted">{constPlans['refill500']['price']}$</h6>
                                            <p className="card-text">This plan refills your account by {constPlans['refill500']['tokens']} tokens</p>
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
                                            <button className="btn active" target='_blank' onClick={() => { unsubscribe() }}>Unsubscribe</button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        }
                    </div>
                </div>

                <hr className="hr-blurry my-5" />

                <div className="container text-center px-5">
                    <h2>Change your password</h2>
                    <form className="register-form mb-2 mx-5" onSubmit={(e) => { changePassValidation(e) }}>
                        <label htmlFor="password" className="form-label change-password">Password:</label>
                        <input type="password" name="password" id="change-password" className="form-control change-password mb-2" required min-length="8" max-length="50" onChange={(e) => { setPassRegister(e.target.value) }} />
                        <label htmlFor="confirm-password" className="form-label change-password">Confirm password:</label>
                        <input type="password" name="confirm-password" id="confirm-password" className="form-control change-password mb-2" required min-length="8" max-length="50" onChange={(e) => { setPassConfirmRegister(e.target.value) }} />
                        <div id="password-help" className="form-text mb-3">
                            Your password must be 8-50 characters long, contain letters and numbers, and must not contain spaces, special characters, or emoji.
                        </div>
                        <input type="submit" value="Change password" className="change-submit btn btn-primary" />
                    </form>
                </div>

                <hr className="hr-blurry my-5" />

                <div className="container text-center px-5">
                    <h2>Delete your account</h2>
                    <form className="register-form mb-2 mx-5" onSubmit={(e) => { deleteAccount(e) }}>
                        <label htmlFor="password" className="form-label delete-password">Password:</label>
                        <input type="password" name="password" id="delete-password" className="form-control delete-password mb-2" required min-length="8" max-length="50" onChange={(e) => { setDeletePass(e.target.value) }} />
                        <input type="submit" value="Delete account" className="delete-submit btn btn-danger" />
                    </form>
                </div>
            </div>

            <Footer />
        </div >
    )
} export default Account;