import { useEffect } from "react";
import Axios from 'axios';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer, FUNDING } from "@paypal/react-paypal-js";

const ButtonWrapper = ({ showSpinner, refillBundle }) => {
    // usePayPalScriptReducer can be use only inside children of PayPalScriptProviders
    // This is the main reason to wrap the PayPalButtons in a new component
    const [{ options, isInitial, isPending, isResolved, isRejected }, dispatch] = usePayPalScriptReducer();

    let optionsSub = {
        clientId: "AXsk3F5hth3P49NyOSY8M9XqctKCA9EFcSAF753xW_dLhNB8ky-fiFFbunbE1yxqOVfXCY6sUdmZguWN",
        components: "buttons",
        intent: "subscription",
        vault: true,
    }

    let optionsBuy = {
        clientId: "AXsk3F5hth3P49NyOSY8M9XqctKCA9EFcSAF753xW_dLhNB8ky-fiFFbunbE1yxqOVfXCY6sUdmZguWN",
        components: "buttons",
        intent: "capture"
    }

    let currOptions
    refillBundle["tokens"] < 0 ? currOptions = optionsSub : currOptions = optionsBuy

    useEffect(() => {
        if (options !== currOptions) {
            dispatch({
                type: "resetOptions",
                value: {
                    ...currOptions,
                },
            });
        }
    }, [refillBundle]);

    // useEffect(() => {
    //     console.log({ "isInitial": isInitial, "isPending": isPending, "isResolved": isResolved, "isRejected": isRejected })
    //     console.log(refillBundle)
    // }, [isInitial, isPending, isResolved, isRejected]);

    if (refillBundle["tokens"] < 0) {
        return (
            <>
                {(showSpinner && isPending) ? <div className="spinner-border" role="status" /> : null}
                <PayPalButtons
                    forceReRender={[refillBundle]}
                    fundingSource={undefined}

                    style={{
                        shape: 'rect',
                        layout: 'vertical',
                        label: 'subscribe'
                    }}

                    createSubscription={async (data, actions) => {
                        return actions.subscription.create({
                            plan_id: refillBundle["plan-id"],
                        });
                    }}

                    onApprove={async (data, actions) => {
                        alert("Your subscription has been successfully approved"); // You can add optional success message for the subscriber here

                        Axios.post(`https://review-rocket.fr/api/orders/${data.subscriptionID}/execute`, {
                            tokens: refillBundle["tokens"],
                        }).then((res) => {
                            // console.log(res)
                        })
                    }}
                />
            </>
        )
    }
    else {
        return (
            <>
                {(showSpinner && isPending) ? <div className="spinner-border" role="status" /> : null}
                <PayPalButtons
                    forceReRender={[refillBundle]}
                    fundingSource={undefined}

                    style={{
                        shape: 'rect',
                        layout: 'vertical',
                        label: 'checkout'
                    }}

                    createOrder={async (data, actions) => {
                        return actions.order
                            .create({
                                purchase_units: [
                                    {
                                        amount: {
                                            currency_code: "USD",
                                            value: refillBundle["price"],
                                        },
                                    },
                                ],
                            })
                            .then((orderId) => {
                                // Your code here after create the order
                                return orderId;
                            });
                    }}

                    onApprove={async (data, actions) => {
                        try {
                            const response = await fetch(`/api/orders/${data.orderID}/capture`, {
                                method: "POST"
                            });

                            const details = await response.json();
                            // Three cases to handle:
                            //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
                            //   (2) Other non-recoverable errors -> Show a failure message
                            //   (3) Successful transaction -> Show confirmation or thank you message

                            // This example reads a v2/checkout/orders capture response, propagated from the server
                            // You could use a different API or structure for your 'orderData'
                            const errorDetail = Array.isArray(details.details) && details.details[0];

                            if (errorDetail && errorDetail.issue === 'INSTRUMENT_DECLINED') {
                                return actions.restart();
                                // https://developer.paypal.com/docs/checkout/integration-features/funding-failure/
                            }

                            if (errorDetail) {
                                let msg = 'Sorry, your transaction could not be processed.';
                                msg += errorDetail.description ? ' ' + errorDetail.description : '';
                                msg += details.debug_id ? ' (' + details.debug_id + ')' : '';
                                alert(msg);
                                return
                            }

                            // Successful capture! For demo purposes:
                            // console.log('Capture result', details, JSON.stringify(details, null, 2));
                            // const transaction = details.purchase_units[0].payments.captures[0];
                            // alert('Transaction ' + transaction.status + ': ' + transaction.id + 'See console for all available details');

                            Axios.post(`https://review-rocket.fr/api/orders/${data.orderID}/execute`, {
                                tokens: refillBundle["tokens"],
                            }).then((res) => {
                                // console.log(res)
                            })
                        } catch (error) {
                            console.error(error, data.orderID);
                            // Handle the error or display an appropriate error message to the user
                        }
                    }}
                />
            </>
        )
    }
}

function Payment(refillBundle) {
    if (refillBundle !== undefined) {
        return (
            <PayPalScriptProvider>
                <ButtonWrapper
                    showSpinner={true}
                    refillBundle={refillBundle}
                />
            </PayPalScriptProvider>
        );
    } else {
        return (
            <PayPalScriptProvider>
            </PayPalScriptProvider>
        );
    }
}

export default Payment;
