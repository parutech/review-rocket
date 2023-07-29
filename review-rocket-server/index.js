const dotenv = require('dotenv').config()
const axios = require('axios')
const nodemailer = require('nodemailer')
const handlebars = require('handlebars')
const morgan = require("morgan")

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
        expires: 1000 * 60 * 60 * 24,
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

const registerEmailTemplate = handlebars.compile('<nav style="background-color: rgba(33,37,41); position: relative; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; padding: 0.5rem 0;"><div style="display: flex; flex-wrap: inherit; align-items: center; justify-content: space-between; max-width: 100%; padding-top: 1rem !important; padding-bottom: 1rem !important;"><div style="text-align: center !important; display: flex; flex-wrap: inherit; align-items: center; justify-content: space-between; max-width: 900px; padding-top: 1rem !important; padding-bottom: 1rem !important;"><a href="https://review-rocket.fr/login" style="margin: 0 !important; color: #000; text-decoration: none;"><h1>🚀 ReviewRocket</h1></a></div></div></nav><div style="text-align: center !important;"><h2>Welcome to ReviewRocket!</h2><p>Thank you for creating a ReviewRocket account! <br />To be able to create reviews, you first need to verify your account by clicking on the link below:</p><a href="https://review-rocket.fr/verify?email={{uEmail}}&key={{vKey}}">Click here to verify your account</a></div>')
const changePassTemplate = '<nav style="background-color: rgba(33,37,41); position: relative; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;padding: 0.5rem 0;"><div style="display: flex;flex-wrap: inherit;align-items: center;justify-content: space-between;max-width: 900px;padding-top: 1rem !important;padding-bottom: 1rem !important;"><div style="text-align: center !important;display: flex;flex-wrap: inherit;align-items: center;justify-content: space-between;max-width: 900px;padding-top: 1rem !important;padding-bottom: 1rem !important;"><a href="https://review-rocket.fr/login" style="margin: 0 !important;color: #000;text-decoration: none;"><h1>🚀 ReviewRocket</h1></a></div></div></nav><div style="text-align: center !important;"><h2>Your ReviewRocket account</h2><p>Your password has been changed! <br />If you are the source of this change, you may ignore this email. Otherwise, please contact the ReviewRocket support ASAP:</p><a href="mailto:support@review-rocket.fr">ReviewRocket Support</a></div>'

async function sendRegisterEmail(userEmail, verificationKey) {
    const htmlToSend = registerEmailTemplate({ uEmail: userEmail, vKey: verificationKey.toString() })

    const info = await transporter.sendMail({
        from: '"🚀 ReviewRocket Support" <support@review-rocket.fr>',
        to: userEmail,
        subject: "Please confirm your email address",
        text: "this is a test",
        html: htmlToSend,
    });
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
const paypal_base = "https://api-m.sandbox.paypal.com";

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
            'Authorization': `Bearer ${accessToken}∫`,
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
    if (err) throw err; // not connected!
})

app.post("/api/", (req, res) => {
    res.send({ healthy: true })
});

app.post("/", (req, res) => {
    res.send({ healthy: true })
});

app.post("/api/captcha", async (req, res) => {
    const token = req.body.token;

    axios.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.CAPTCHA_SECRET_KEY}&response=${token}`
    ).then((response) => {
        res.send({ verification: response.data.success });
    })
});

app.post("/api/register", (req, res) => {
    const userEmail = req.body.userEmail
    const userPass = req.body.userPass
    const captcha = req.body.captcha

    const verificationKey = Buffer.from(uid.sync(128)).toString("base64")
    const referralId = jfe.encrypt(
        Buffer.from(process.env.UID_ENCRYPT, 'base64'),
        userEmail
    ).split(":")[0]

    if (!captcha) {
        res.send({ message: "Invalid reCAPTCHA" })
        return
    }

    bcrypt.hash(userPass, saltRounds, (err, hash) => {
        if (err) {
            console.log(err)
            res.send({ message: "Error trying to create your account", err: err })
            return
        }

        pool.query(
            "INSERT INTO users (email, password, verification, referral_id) VALUES (?, ?, ?, ?);",
            [userEmail, hash, verificationKey, referralId],
            (error, result) => {
                if (error) {
                    console.log(error, result)
                    res.send({ registered: false, message: "Error trying to create your account", err: error })
                    return
                }

                sendRegisterEmail(userEmail, verificationKey).catch(console.error)
                res.send({ registered: true })
                return
            }
        );
    })
})

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
                    tokens: req.session.tokens
                })
                return
            })

        }
    )

    return
})

app.get("/api/login", (req, res) => {
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
                    pool.query("UPDATE users SET tokens=0 WHERE email=?",
                        [userEmail])
                    req.session.tokens = 0
                } else {
                    req.session.tokens = result[0].tokens
                }
            } else if (result[0].subscription == "ADMIN") {
                pool.query("UPDATE users SET tokens=-1 WHERE email=?",
                    [userEmail])
                req.session.tokens = -1
            } else {
                response = await subscriptionState(result[0].subscription)

                if (response.status == "ACTIVE" && result[0].tokens != -1) {
                    pool.query("UPDATE users SET tokens=-1 WHERE email=?",
                        [userEmail])
                    req.session.tokens = -1
                } else if (response.status == "APPROVAL_PENDING" || response.status == "APPROVED") {
                    req.session.tokens = result[0].tokens
                } else {
                    pool.query("UPDATE users SET tokens=500, subscription=NULL WHERE email=?",
                        [userEmail])
                    req.session.tokens = 500
                }
            }

            req.session.verified = result[0].verified
            req.session.user = jfe.encrypt(
                Buffer.from(process.env.UID_ENCRYPT, 'base64'),
                JSON.stringify(result[0])
            )

            res.send({
                loggedIn: true,
                user: req.session.user,
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
    let userEmail = ""
    req.session.user ?
        userEmail = JSON.parse(jfe.decrypt(
            Buffer.from(process.env.UID_ENCRYPT, 'base64'),
            req.session.user)).email
        :
        userEmail = req.body.userEmail
    const verificationKey = req.body.verificationKey

    pool.query(
        "SELECT * FROM users WHERE email = ? AND verification = ? LIMIT 1;",
        [userEmail, verificationKey],
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

                    pool.query("INSERT INTO orders (email, ppl_id) VALUES (?, ?)",
                        [userEmail, orderID])
                    req.session.tokens = -1
                    res.send({
                        executed: true,
                        order: orderID,
                        user: req.session.user,
                        tokens: req.session.tokens
                    })
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
                            order: orderID,
                        })
                        return
                    }

                    if (result === undefined) {
                        console.error("Failed to execute pay order: Undefined");
                        res.send({
                            executed: false,
                            order: orderID,
                            message: "Undefined result, contact support to resolve the issue"
                        })
                        return
                    }

                    pool.query("INSERT INTO orders (email, ppl_id) VALUES (?, ?)",
                        [userEmail, orderID])
                    req.session.tokens = newUserTokens
                    res.send({
                        executed: true,
                        order: orderID,
                        user: req.session.user,
                        tokens: req.session.tokens
                    })
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

app.get("/api/get-oaikey", (req, res) => {
    if (!req.session.user) {
        res.send({ loggedIn: false })
        return
    }

    let items = process.env.OPENAI_KEY.split(",")
    let oai_key = items[Math.floor(Math.random() * items.length)];

    if (JSON.parse(jfe.decrypt(Buffer.from(process.env.UID_ENCRYPT, 'base64'), req.session.user)).email) {
        res.send({
            loggedIn: true,
            user: req.session.user,
            openai_key: oai_key
        })
        return
    }

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
    console.log("listening on https://review-rocket.fr:4000/");
});