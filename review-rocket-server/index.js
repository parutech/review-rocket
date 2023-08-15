const dotenv = require('dotenv').config()
const axios = require('axios')
const nodemailer = require('nodemailer')
const handlebars = require('handlebars')
const morgan = require("morgan")
const { Configuration, OpenAIApi } = require("openai");

const mysql = require("mysql2");
const cors = require("cors");
const helmet = require('helmet')

const uid = require("uid-safe");
const jfe = require("json-file-encrypt");
//jfe.encrypt(Buffer.from(process.env.UID_ENCRYPT, 'base64'), JSON.stringify(VALUE))
//JSON.parse(jfe.decrypt(Buffer.from(process.env.UID_ENCRYPT, 'base64'), VALUE))
const bcrypt = require("bcrypt");
const saltRounds = 12;

const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const session = require("express-session");
const subdomain = require("express-subdomain");
const express = require("express");
const app = express();
const router = express.Router();

morgan.token('email', function (req, res) {
    if (!req.session) {
        return "-"
    }
    return JSON.parse(jfe.decrypt(Buffer.from(process.env.UID_ENCRYPT, 'base64'), req.session.user)).email
})
app.use(morgan(':email | :remote-addr <-> :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] in :response-time ms'))
app.use(express.json())
app.use(cors({
    origin: ["https://review-rocket.fr"],
    methods: ["GET", "POST"],
    credentials: true,
}))
app.use(helmet.frameguard())
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
//app.use(subdomain('api', router))

app.use(session({
    key: "id",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 1000 * 60 * 60,
    },
}))

const transporter = nodemailer.createTransport({
    host: "ssl0.ovh.net",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_SENDER_ADDRESS,
        pass: process.env.EMAIL_SENDER_PASSWORD
    }
});

const registerEmailTemplate = handlebars.compile('<div style="text-align: center !important;"><h2>🚀 Welcome to ReviewRocket!</h2><p>Thank you for creating a ReviewRocket account! <br />To be able to create reviews, you first need to verify your account by clicking on the link below:</p><a href="http://localhost/verify?email={{uEmail}}&key={{vKey}}">Click here to verify your account</a></div>')
const changePassTemplate = '<div style="text-align: center !important;"><h2>🚀 Your ReviewRocket account</h2><p>Your password has been changed! <br />If you are the source of this change, you may ignore this email. Otherwise, please contact the ReviewRocket support ASAP:</p><a href="mailto:support@review-rocket.fr">ReviewRocket Support</a></div>'

async function sendRegisterEmail(userEmail, verificationKey) {
    const htmlToSend = registerEmailTemplate({ uEmail: userEmail, vKey: verificationKey.toString() })

    const info = await transporter.sendMail({
        from: '"🚀 ReviewRocket Support" <support@review-rocket.fr>',
        to: userEmail,
        subject: "Please confirm your email address",
        text: "this is a test",
        html: htmlToSend,
    })
}

async function sendChangePassEmail(userEmail) {
    const htmlToSend = changePassTemplate

    const info = await transporter.sendMail({
        from: '"🚀 ReviewRocket Support" <support@review-rocket.fr>',
        to: userEmail,
        subject: "Your ReviewRocket account",
        text: "this is a test",
        html: htmlToSend,
    });
}

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const APP_SECRET = process.env.PAYPAL_APP_SECRET
const paypal_base = process.env.PAYPAL_BASE;

const generateAccessToken = async () => {
    try {
        const auth = Buffer.from(CLIENT_ID + ":" + APP_SECRET).toString("base64");
        const response = await fetch(`${paypal_base}/v1/oauth2/token`, {
            method: "post",
            body: "grant_type=client_credentials",
            headers: {
                'Authorization': `Basic ${auth}`,
            },
        });

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Failed to generate Access Token:", error);
    }
};

const capturePayment = async (orderID) => {
    const accessToken = await generateAccessToken();
    const url = `${paypal_base}/v2/checkout/orders/${orderID}/capture`;

    const response = await fetch(url, {
        method: "post",
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        }
    });

    return handleResponse(response);
};

const subscriptionState = async (orderID) => {
    const accessToken = await generateAccessToken();
    const url = `${paypal_base}/v1/billing/subscriptions/${orderID}`;

    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        }
    })

    return handleResponse(response);
};

const cancelSubscription = async (orderID) => {
    const accessToken = await generateAccessToken();
    const url = `${paypal_base}/v1/billing/subscriptions/${orderID}/cancel`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ "reason": "User unsubscribed" })
    })

    return handleResponse(response);
};

const subscriptionTransactionsAmount = async (orderID, startTime) => {
    const accessToken = await generateAccessToken();
    const endTime = new Date()
    const url = `${paypal_base}/v1/billing/subscriptions/${orderID}/transactions?start_time=${startTime.toISOString()}&end_time=${endTime.toISOString()}`;

    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        }
    })

    let totalAmount = 0
    try {
        const transactions = await handleResponse(response)
        transactions['transactions'].forEach((transaction) => {
            if (transaction['status'] == "COMPLETED") {
                totalAmount += transaction['amount_with_breakdown']['net_amount']['value'] * 0.10
            }
        })
    } catch (error) { }

    return totalAmount;
};

const orderTransactionAmount = async (orderID) => {
    const accessToken = await generateAccessToken();
    const url = `${paypal_base}/v2/payments/captures/${orderID}`;

    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        }
    })

    let totalAmount = 0
    try {
        const transaction = await handleResponse(response)
        if (transaction['status'] == "COMPLETED") {
            totalAmount += transaction['seller_receivable_breakdown']['net_amount']['value'] * 0.10
        }
    } catch (error) { }

    return totalAmount;
};

async function handleResponse(response) {
    if (response.status === 200 || response.status === 201) {
        return response.json();
    }

    const errorMessage = await response.text();
    throw new Error(errorMessage);
}

const pool = mysql.createPool({
    connectionLimit: 100,
    host: process.env.SQL_HOST,
    port: process.env.SQL_PORT,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DATABASE,
    debug: false
})

pool.getConnection(function (err, connection) {
    if (err) {
        throw err; // not connected!
    } else {
        console.log("connected to", process.env.SQL_HOST, process.env.SQL_DATABASE)
    }
})

app.post("/api/captcha", async (req, res) => {
    const token = req.body.token;

    axios.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.CAPTCHA_SECRET_KEY}&response=${token}`
    ).then((response) => {
        res.send({ verification: response.data.success });
    })
});

app.get("/api/resend-verification", async (req, res) => {
    if (!req.session.user) {
        res.send({ success: false })
        return
    }

    const userEmail = JSON.parse(jfe.decrypt(
        Buffer.from(process.env.UID_ENCRYPT, 'base64'),
        req.session.user)
    ).email

    pool.query(
        "SELECT verification FROM users WHERE email=?;",
        [userEmail],
        async (error, result) => {
            if (error) {
                res.send({ success: false, message: "Could not get verification", err: error })
                return
            }

            await sendRegisterEmail(userEmail, result[0]['verification']).catch((e) => {
                res.send({ success: false, message: "Could not send verification", err: e })
                return
            }).then(() => {
                res.send({ success: true })
                return
            });
        }
    );
});

app.post("/api/register", (req, res) => {
    const userEmail = req.body.userEmail
    const userPass = req.body.userPass
    const captcha = req.body.captcha
    const referrer = req.session.referrer

    const verificationKey = Buffer.from(uid.sync(128)).toString("base64")
    const referralId = jfe.encrypt(
        Buffer.from(process.env.UID_ENCRYPT, 'base64'),
        userEmail
    ).split(":")[0].slice(0, 10)

    if (!captcha) {
        res.send({ message: "Invalid reCAPTCHA" })
        return
    }

    bcrypt.hash(userPass, saltRounds, (err, hash) => {
        if (err) {
            res.send({ message: "Error trying to create your account", err: err })
            return
        }

        pool.query(
            "INSERT INTO users (email, password, verification, referral_id, referrer) VALUES (?, ?, ?, ?, ?);",
            [userEmail, hash, verificationKey, referralId, referrer],
            (error, result) => {
                if (error) {
                    res.send({ registered: false, message: "Error trying to create your account", err: error })
                    return
                }

                sendRegisterEmail(userEmail, verificationKey).catch(console.error)
                res.send({ registered: true })
                return
            }
        );
    })
});

app.get("/api/referral-state", async (req, res) => {
    if (!req.session.user) {
        res.send({ success: false })
        return
    }

    const userEmail = JSON.parse(jfe.decrypt(
        Buffer.from(process.env.UID_ENCRYPT, 'base64'),
        req.session.user)
    ).email

    pool.query(
        "SELECT referral_id, is_affiliate, last_payout FROM users WHERE email=?;",
        [userEmail],
        async (error, result) => {
            if (error) {
                res.send({ success: false, err: error })
                return
            }

            let referralState = {
                isAffiliate: result[0].is_affiliate
            }

            if (!referralState.isAffiliate) {
                res.send({
                    success: true, referralState: referralState
                })
                return
            }

            let referral_id = result[0].referral_id
            let last_payout = result[0].last_payout

            pool.query(
                "SELECT COUNT(_id) FROM users WHERE referrer=?;",
                [referral_id],
                async (error, resultCount) => {
                    if (error) {
                        res.send({ success: false, err: error })
                        return
                    }

                    referralState = {
                        ...referralState,
                        referralId: referral_id,
                        userCount: resultCount[0]['COUNT(_id)']
                    }

                    pool.query(
                        "(SELECT ppl_id, t_type, purchased_at FROM transactions WHERE t_type='subscription' AND email IN (SELECT email FROM users WHERE referrer=?)) UNION (SELECT ppl_id, t_type, purchased_at FROM transactions WHERE t_type='order' AND email IN (SELECT email FROM users WHERE referrer=?) AND purchased_at>?);",
                        [referral_id, referral_id, last_payout],
                        async (error, resultOrders) => {
                            if (error) {
                                res.send({ success: false, err: error })
                                return
                            }

                            let payoutAmount = 0
                            let resultPromises = resultOrders.map(async (result) => {
                                if (result['t_type'] == "subscription") {
                                    return await subscriptionTransactionsAmount(result['ppl_id'], last_payout)
                                } else if (result['t_type'] == "order") {
                                    return await orderTransactionAmount(result['ppl_id'])
                                }
                            })

                            Promise.allSettled(resultPromises).then((results) => {
                                results.forEach((result) => {
                                    if (result.status == 'fulfilled') {
                                        payoutAmount += result.value
                                    }
                                })

                                referralState = {
                                    ...referralState,
                                    payoutAmount: (Math.floor(payoutAmount * 100) / 100).toFixed(2)
                                }

                                res.send({ success: true, referralState: referralState })
                                return
                            })


                        }
                    );
                }
            );
        }
    );
});

app.post("/api/request-payout", async (req, res) => {
    if (!req.session.user) {
        res.send({ success: false })
        return
    }

    const userEmail = JSON.parse(jfe.decrypt(
        Buffer.from(process.env.UID_ENCRYPT, 'base64'),
        req.session.user)
    ).email
    const payoutAmount = req.body.amount
    const accessToken = await generateAccessToken();
    const url = `${paypal_base}/v1/payments/payouts`;

    pool.query(
        "SELECT referral_id FROM users WHERE email=?;",
        [userEmail],
        async (error, result) => {
            if (error) {
                res.send({ success: false, message: "Could not get ID", err: error })
                return
            }

            const senderId = result[0]['referral_id'] + "_" + Date.now()

            // console.log(JSON.stringify({
            //     "sender_batch_header": {
            //         "sender_batch_id": `Payout_${senderId}`,
            //         "email_subject": "You have a payout!",
            //         "email_message": "You have received a payout! Thanks for using ReviewRocket!"
            //     },
            //     "items": [{
            //         "recipient_type": "EMAIL",
            //         "amount": { "value": `${payoutAmount}`, "currency": "USD" },
            //         "note": "Thanks for your support!",
            //         "sender_item_id": `Item_${senderId}`,
            //         "receiver": `${userEmail}`,
            //         "recipient_wallet": "PAYPAL"
            //     }]
            // }))
            // res.send({ success: true })
            // return

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    "sender_batch_header": {
                        "sender_batch_id": `Payout_${senderId}`,
                        "email_subject": "You have a payout!",
                        "email_message": "You have received a payout! Thanks for using ReviewRocket!"
                    },
                    "items": [{
                        "recipient_type": "EMAIL",
                        "amount": { "value": `${payoutAmount}`, "currency": "USD" },
                        "note": "Thanks for your support!",
                        "sender_item_id": `${senderId}`,
                        "receiver": `${userEmail}`,
                        "recipient_wallet": "PAYPAL"
                    }]
                })
            })

            try {
                const transaction = await handleResponse(response);

                pool.query("INSERT INTO transactions (email, ppl_id, t_type) VALUES (?, ?, ?); UPDATE users SET last_payout=CURRENT_TIMESTAMP() WHERE email=?;",
                    [userEmail, transaction['batch_header']['payout_batch_id'], "payout", userEmail],
                    (qerr, qres) => {
                        if (qerr) {
                            res.send({ success: false, message: "Could not insert transaction", err: qerr })
                            return
                        }

                        res.send({ success: true })
                        return
                    }
                )
            } catch (error) {
                res.send({ success: false })
                return
            }
        }
    );
});

app.post("/api/change-password", (req, res) => {
    if (!req.session.user) {
        res.send({ success: false })
        return
    }

    const userEmail = JSON.parse(jfe.decrypt(
        Buffer.from(process.env.UID_ENCRYPT, 'base64'),
        req.session.user)
    ).email
    const userPass = req.body.userPass

    bcrypt.hash(userPass, saltRounds, (err, hash) => {
        if (err) {
            res.send({ err: err })
            return
        }

        pool.query(
            "UPDATE users SET password=? WHERE email=?;",
            [hash, userEmail],
            (error, result) => {
                if (error) {
                    res.send({ success: false, err: error })
                    return
                }

                sendChangePassEmail(userEmail).catch(console.error)
                res.send({ success: true })
                return
            }
        );
    })
})

app.post("/api/delete-account", (req, res) => {
    if (!req.session.user) {
        res.send({ success: false })
        return
    }

    const userEmail = JSON.parse(jfe.decrypt(
        Buffer.from(process.env.UID_ENCRYPT, 'base64'),
        req.session.user)
    ).email
    const userPass = req.body.userPass

    pool.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1;",
        [userEmail],
        (err, result) => {
            if (err) {
                res.send({ success: false, err: err })
                return
            }

            if (result === undefined) {
                res.send({ success: false, message: "Undefined result, try again later" })
                return
            }

            if (result.length === 0) {
                res.send({ success: false, message: "Wrong email/password combination" })
                return
            }

            bcrypt.compare(userPass, result[0].password, (error, response) => {
                if (!response) {
                    res.send({ success: false })
                    return
                }

                pool.query(
                    "DELETE FROM users WHERE email=?;",
                    [userEmail],
                    (error, result) => {
                        if (error) {
                            res.send({ success: false, err: error })
                            return
                        }

                        req.session.verified = undefined
                        req.session.tokens = undefined
                        req.session.isLogged = undefined
                        req.session.user = undefined
                        res.send({
                            success: true
                        })
                    }
                );
            })
        }
    )
})

app.get("/api/unsubscribe", async (req, res) => {
    if (!req.session.user) {
        res.send({ success: false })
        return
    }

    const userEmail = JSON.parse(jfe.decrypt(
        Buffer.from(process.env.UID_ENCRYPT, 'base64'),
        req.session.user)
    ).email

    pool.query(
        "SELECT subscription FROM users WHERE email=?;",
        [userEmail],
        async (error, result) => {
            if (error) {
                res.send({ success: false, err: error })
                return
            }

            if (result[0]['subscription'] == "ADMIN") {
                pool.query(
                    "UPDATE users SET subscription=NULL WHERE email=?;",
                    [userEmail],
                    (error, result) => {
                        if (error) {
                            res.send({ success: false, err: error })
                            return
                        }

                        res.send({ success: true })
                        return
                    }
                );
            } else {
                try {
                    let response = await cancelSubscription(result[0]['subscription'])
                    pool.query(
                        "UPDATE users SET subscription=NULL WHERE email=?;",
                        [userEmail],
                        (error, result) => {
                            if (error) {
                                res.send({ success: false, err: error })
                                return
                            }

                            res.send({ success: true })
                            return
                        }
                    );
                } catch (error) {
                    res.send({ success: false, message: "Could not unsubscribe", err: e })
                    return
                }
            }
        }
    );
})

app.post("/api/login", (req, res) => {
    const userEmail = req.body.userEmail
    const userPass = req.body.userPass
    const captcha = req.body.captcha

    if (!captcha) {
        res.send({ message: "Invalid reCAPTCHA" })
        return
    }

    pool.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1;",
        [userEmail],
        (err, result) => {
            if (err) {
                res.send({ err: err })
                return
            }

            if (result === undefined) {
                res.send({ message: "Undefined result, try again later" })
                return
            }

            if (result.length === 0) {
                res.send({ message: "Wrong email/password combination" })
                return
            }

            bcrypt.compare(userPass, result[0].password, (error, response) => {
                if (!response) {
                    res.send({ message: "Wrong email/password combination" })
                    return
                }
                // bcrypt.hash(String(result[0]), saltRounds, (err, hash) => {
                //     if (err) {
                //         console.log(err)
                //     } else {
                //         console.log(hash)
                //         req.session.user = hash
                //         res.send(hash)
                //     }
                // })

                delete result[0]["password"]
                req.session.verified = result[0].verified
                req.session.tokens = result[0].tokens
                req.session.user = jfe.encrypt(
                    Buffer.from(process.env.UID_ENCRYPT, 'base64'),
                    JSON.stringify(result[0])
                )
                res.send({
                    loggedIn: true,
                    user: req.session.user,
                    verified: req.session.verified,
                    tokens: req.session.tokens,
                })
                return
            })

        }
    )

    return
})

app.post("/api/set-referrer", (req, res) => {
    req.session.referrer = req.body.referrer
    res.send({
        referred: true
    })
})

app.get("/api/login", async (req, res) => {
    if (!req.session.user) {
        res.send({ loggedIn: false })
        return
    }

    userEmail = JSON.parse(jfe.decrypt(
        Buffer.from(process.env.UID_ENCRYPT, 'base64'),
        req.session.user)
    ).email

    pool.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1;",
        [userEmail],
        async (err, result) => {
            if (err) {
                res.send({ err: err })
                return
            }

            if (result === undefined) {
                res.send({
                    loggedIn: false,
                    message: "Undefined result, try again later"
                })
                return
            }

            if (result.length == 0) {
                res.send({
                    loggedIn: false,
                    message: "User not found"
                })
                return
            }

            if (!result[0].subscription) {
                if (result[0].tokens < 0) {
                    pool.query("UPDATE users SET tokens=0 WHERE email=?", [userEmail])
                    req.session.tokens = 0
                } else {
                    req.session.tokens = result[0].tokens
                }
            } else if (result[0].subscription == "ADMIN") {
                pool.query("UPDATE users SET tokens=-1 WHERE email=?", [userEmail])
                req.session.tokens = -1
            } else {
                try {
                    let response = await subscriptionState(result[0].subscription)
                    if (response.status == "ACTIVE") {
                        if (result[0].tokens != -1) {
                            pool.query("UPDATE users SET tokens=-1 WHERE email=?", [userEmail])
                        }
                        req.session.tokens = -1
                    } else {
                        if (result[0].tokens < 0) {
                            pool.query("UPDATE users SET tokens=0 WHERE email=?", [userEmail])
                            req.session.tokens = 0
                        } else {
                            req.session.tokens = result[0].tokens
                        }
                    }
                } catch (error) {
                    console.error("Failed to create order:", error);
                    res.send({ loggedIn: false });
                    return
                }
            }

            req.session.user = jfe.encrypt(
                Buffer.from(process.env.UID_ENCRYPT, 'base64'),
                JSON.stringify(result[0])
            )
            req.session.verified = result[0].verified

            res.send({
                loggedIn: true,
                user: userEmail,
                verified: req.session.verified,
                tokens: req.session.tokens
            })
            return
        }
    )
})

app.post("/api/logout", (req, res) => {
    req.session.destroy()
    res.send({
        loggedIn: false,
        user: undefined,
        verified: undefined,
        tokens: undefined
    })
    return
})

app.post("/api/verify", (req, res) => {
    req.session.user ?
        userEmail = JSON.parse(jfe.decrypt(
            Buffer.from(process.env.UID_ENCRYPT, 'base64'),
            req.session.user)).email
        :
        userEmail = req.body.userEmail
    const verificationKey = req.body.verificationKey

    pool.query(
        "SELECT email FROM users WHERE verification = ? LIMIT 1;",
        [verificationKey],
        (qerr, qres) => {
            if (qerr) {
                res.send({
                    verified: false,
                    message: qerr
                })
                return
            }

            if (qres === undefined) {
                res.send({
                    verified: false,
                    message: "Undefined result, try again later"
                })
                return
            }

            if (qres.length === 0) {
                res.send({
                    verified: false,
                    message: "Wrong email/key combination"
                })
                return
            }

            const userEmail = qres[0]['email']

            pool.query(
                "UPDATE users SET verified=1 WHERE email=?",
                [userEmail],
                (qerror, qresult) => {
                    if (qerror) {
                        res.send({
                            verified: false,
                            message: qerror
                        })
                        return
                    }

                    if (qresult === undefined) {
                        res.send({
                            verified: false,
                            message: "Undefined result, try again later"
                        })
                        return
                    }

                    res.send({
                        verified: true,
                        message: "Successful verification"
                    })
                    return
                }
            )
        }
    );
})

app.post("/api/generated-tokens", async (req, res) => {
    if (!req.session.user) {
        res.send({ loggedIn: false })
    }

    const userEmail = JSON.parse(jfe.decrypt(
        Buffer.from(process.env.UID_ENCRYPT, 'base64'),
        req.session.user)
    ).email

    if (req.session.tokens > 0) {
        if (req.session.tokens < req.body.quantity) {
            res.send({
                executed: false,
                message: "Not enough tokens"
            })
            return
        }

        const newUserTokens = req.session.tokens - req.body.quantity
        pool.query(
            "UPDATE users SET tokens=? WHERE email=?",
            [newUserTokens, userEmail],
            (err, result) => {
                if (err) {
                    res.send({
                        err: err,
                        executed: false,
                        message: "Error encountered"
                    })
                    return
                }

                if (result === undefined) {
                    console.error("Failed to execute pay order: Undefined");
                    res.send({
                        executed: false,
                        message: "Undefined result, contact support to resolve the issue"
                    })
                    return
                }

                req.session.tokens = newUserTokens
                res.send({
                    executed: true,
                    tokens: req.session.tokens
                })
            }
        )
    } else {
        res.send({
            executed: true,
            tokens: req.session.tokens
        })
    }
});

app.post("/api/orders/:orderID/capture", async (req, res) => {
    try {
        const { orderID } = req.params;
        const response = await capturePayment(orderID);
        res.json(response);
    } catch (error) {
        console.error("Failed to create order:", error);
        res.send({ error: "Failed to capture order." });
    }
});

app.post("/api/orders/:orderID/execute", (req, res) => {
    if (!req.session.user) {
        res.send({ loggedIn: false })
    }

    try {
        const { orderID } = req.params;
        const orderTokens = req.body.tokens
        const orderTransaction = req.body.transaction
        const userEmail = JSON.parse(jfe.decrypt(
            Buffer.from(process.env.UID_ENCRYPT, 'base64'),
            req.session.user)
        ).email

        if (orderTokens === -1) {
            pool.query(
                "UPDATE users SET tokens=-1, subscription=? WHERE email=?",
                [orderID, userEmail],
                (err, result) => {
                    if (err) {
                        console.error("Failed to execute sub order", err);
                        res.send({
                            err: err,
                            executed: false,
                            order: orderID,
                        })
                        return
                    }

                    if (result === undefined) {
                        console.error("Failed to execute sub order: Undefined");
                        res.send({
                            executed: false,
                            order: orderID,
                            message: "Undefined result, contact support to resolve the issue"
                        })
                        return
                    }

                    pool.query("INSERT INTO transactions (email, ppl_id, t_type) VALUES (?, ?, ?)",
                        [userEmail, orderID, "subscription"],
                        (qerr, qres) => {
                            if (qerr) {
                                console.error("Failed to execute pay order:", err);
                                res.send({
                                    err: err,
                                    executed: false,
                                    order: orderTransaction,
                                })
                                return
                            }

                            req.session.tokens = -1
                            res.send({
                                executed: true,
                                order: orderID,
                                user: req.session.user,
                                tokens: req.session.tokens
                            })
                        }
                    )
                }
            )
        } else {
            const newUserTokens = req.session.tokens + orderTokens
            pool.query(
                "UPDATE users SET tokens=? WHERE email=?",
                [newUserTokens, userEmail],
                (err, result) => {
                    if (err) {
                        console.error("Failed to execute pay order:", err);
                        res.send({
                            err: err,
                            executed: false,
                            order: orderTransaction,
                        })
                        return
                    }

                    if (result === undefined) {
                        console.error("Failed to execute pay order: Undefined");
                        res.send({
                            executed: false,
                            order: orderTransaction,
                            message: "Undefined result, contact support to resolve the issue"
                        })
                        return
                    }

                    pool.query("INSERT INTO transactions (email, ppl_id, t_type) VALUES (?, ?, ?)",
                        [userEmail, orderTransaction, "order"],
                        (qerr, qres) => {
                            if (qerr) {
                                console.error("Failed to execute pay order:", err);
                                res.send({
                                    err: err,
                                    executed: false,
                                    order: orderTransaction,
                                })
                                return
                            }

                            req.session.tokens = newUserTokens
                            res.send({
                                executed: true,
                                order: orderTransaction,
                                user: req.session.user,
                                tokens: req.session.tokens
                            })
                        }
                    )
                }
            )
        }
    } catch (error) {
        console.error("Failed to try execute order:", error);
        res.send({
            error: "Failed to execute order, contact support to resolve the issue",
            executed: false,
            order: orderID
        });
    }
})

app.post("/api/get-reviews", async (req, res) => {
    let items = process.env.OPENAI_KEY.split(",")
    let amount = req.body.amount
    let language = req.body.language
    let keywords = req.body.keywords
    let gender = req.body.gender
    let age = req.body.age

    const batch_size = 50
    const quotient = Math.floor(amount / batch_size)
    const last_batch = amount % batch_size
    const quantities = Array(quotient).fill(batch_size)
    if (last_batch > 0) { quantities.push(last_batch) }

    const promises = quantities.map(async (quantity) => {
        let oai_key = items[Math.floor(Math.random() * items.length)];
        const configuration = new Configuration({
            apiKey: oai_key,
        });
        const openai = new OpenAIApi(configuration);

        let userPrompt = 'Generate a JSON-formatted answer containing short, belivable reviews using the given information.\
        The information will follow the JSON format, and will be composed of the amount of reviews to generate, the language the reviews are written in, the keywords describing the product reviewed, the age and gender of the people writing the reviews, and the start and end of the period in which the reviews are written. This is an example of such information:\
        {"quantity":"3","language":"english","keywords":["handbag","leather","black","high-quality","luxurious"],"gender":"male","age":"senior"}\
        The output should be JSON-formatted and contain the following fields : author (First and last names of the person writing the review), body_text (The review itself). The keywords should be rarely used. The reviews should be short and reflect one quality that the product may have. The reviews must not contain commas. This is an example of such an answer:\
        {"reviews":[{"author":"John Smith","body_text":"I recently purchased this handbag and I must say it exceeded my expectations. The leather is top-notch and the black color gives it a sleek look."},{"author":"Robert Johnson","body_text":"Very good. Highly recommended!"},{"author":"Michael Williams","body_text":"I\'m impressed by the handbag\'s quality."}]}\
        Here is the information to use: '+ JSON.stringify({ quantity, language, keywords, gender, age })

        let ai_response = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: userPrompt }],
        });

        json_response = JSON.parse(ai_response.data.choices[0].message.content.replace(/,(?=\s*?[}\]])/g, '')).reviews

        return json_response
    })

    const response = await Promise.allSettled(promises)

    res.send({
        success: true,
        results: response
    })
})

app.post("/api/validate-promo-code", (req, res) => {
    if (!req.session.user) {
        res.send({ success: false })
        return
    }

    const promoCode = req.body.code
    const userEmail = JSON.parse(jfe.decrypt(
        Buffer.from(process.env.UID_ENCRYPT, 'base64'),
        req.session.user)
    ).email

    if (promoCode == process.env.ADMIN_SECRET) {
        pool.query(
            "UPDATE users SET tokens=-1, subscription='ADMIN' WHERE email=?",
            [userEmail]
        )
    }

    pool.query(
        "SELECT * FROM promotions WHERE promo_code = ? LIMIT 1;",
        [promoCode],
        (qerr, qres) => {
            if (qerr) {
                res.send({
                    success: false,
                    message: qerr
                })
                return
            }

            if (qres === undefined) {
                res.send({
                    success: false,
                    message: "Undefined result, try again later"
                })
                return
            }

            if (qres.length === 0) {
                res.send({
                    success: false,
                    message: "Promo code doesn't exist"
                })
                return
            }

            if (qres[0].max_use) {
                if (qres[0].uses >= qres[0].max_use) {
                    res.send({
                        success: false,
                        message: "Promo code is expired"
                    })
                    return
                }
            }

            if (qres[0].expiration) {
                if (new Date() >= new Date(qres[0].expiration.toString())) {
                    res.send({
                        success: false,
                        message: "Promo code is expired"
                    })
                    return
                }
            }

            pool.query(
                "(SELECT * FROM plans WHERE _id = ?)\
                UNION\
                (SELECT * FROM plans WHERE _id = ?)\
                UNION\
                (SELECT * FROM plans WHERE _id = ?)\
                UNION\
                (SELECT * FROM plans WHERE _id = ?)",
                [
                    qres[0].subscribe,
                    qres[0].refill100,
                    qres[0].refill200,
                    qres[0].refill500
                ],
                (qerror, qresult) => {
                    if (qerror) {
                        res.send({
                            success: false,
                            message: qerror
                        })
                        return
                    }

                    if (qresult === undefined) {
                        res.send({
                            success: false,
                            message: "Undefined result, try again later"
                        })
                        return
                    }

                    if (qres.length === 0) {
                        res.send({
                            success: false,
                            message: "Plans not found"
                        })
                        return
                    }

                    let newPlans = {}
                    qresult.forEach((e) => {
                        newPlans[e.plan_type] = {
                            "price": e.price,
                            ...(e.plan_type == "subscribe") && { "plan-id": e.sub_id }
                        }
                    })

                    pool.query("UPDATE promotions SET uses=? WHERE promo_code=?",
                        [qres[0].uses + 1, promoCode]
                    )

                    res.send({
                        success: true,
                        changes: newPlans,
                        promo_desc: qres[0].promo_desc
                    })
                    return
                }
            )
        }
    );
})

app.listen(4000, () => {
    console.log("listening on http://localhost:4000/");
});