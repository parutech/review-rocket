import Header from '../components/Header';
import Footer from '../components/Footer';
import { ContextData } from "../components/App";
import { Navigate } from "react-router-dom";
import Axios from 'axios';
import React, { useState } from 'react';

function Generate() {
    const sessionParameters = React.useContext(ContextData).sessionParameters
    const maxTokens = (sessionParameters.tokens > 200 || sessionParameters.tokens < 0) ?
        "200"
        :
        sessionParameters.tokens >= 5 ?
            sessionParameters.tokens
            :
            "0"
    const [productHandle, setProductHandle] = useState("")
    const [productTitle, setProductTitle] = useState("")
    const [amount, setAmount] = useState(5)
    const [countryCode, setCountryCode] = useState("UK")
    const countryCodeToLanguage = {
        "US": "english",
        "UK": "english",
        "FR": "french",
        "ES": "spanish",
        "DE": "german"
    }
    const [keywords, setKeywords] = useState([])
    const [gender, setGender] = useState("none")
    const [age, setAge] = useState("none")
    const [periodStart, setPeriodStart] = useState("")
    const [periodEnd, setPeriodEnd] = useState("")
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [isGenerated, setIsGenerated] = useState(false)
    const [csvData, setCsvData] = useState(undefined)

    const generationFormPage = () => {
        return (
            <div className="container generate-container">
                <form className="form form-generate" onSubmit={(e) => { generationSubmit(e) }}>
                    <div><h2 className="mb-0">Preset</h2></div>
                    <label htmlFor="keywords" className="form-label generate-keywords">Configuration</label>
                    <div className="form-text">
                        Add your product handle and product title.
                    </div>
                    <div className="d-flex flex-column flex-md-row justify-content-between">
                        <input type="text" className="form-control" id="input-handle" placeholder="Example: leather-handbag-model-midnight" required onChange={(e) => { setProductHandle(e.target.value) }} />
                        <input type="text" className="form-control" id="input-title" placeholder="Example: Midnight Leather Handbag" required onChange={(e) => { setProductTitle(e.target.value) }} />
                    </div>

                    <hr className="hr-blurry my-5" />

                    <h2 className="mb-0">Step 1</h2>
                    <label htmlFor="amount" className="form-label generate-amount">Amount</label>
                    <div className="form-text">
                        Select the amount of reviews you want to generate (max: 200) <br />
                        (1 token = 1 review)
                    </div>
                    <input type="range" className="form-range" id="input-amount" min="5" max={maxTokens} step="5" defaultValue="5" required onChange={(e) => { setAmount(e.target.value) }} />
                    <div>Generate {amount} review(s)</div>

                    <hr className="hr-blurry my-5" />

                    <h2 className="mb-0">Step 2</h2>
                    <label htmlFor="language" className="form-label generate-language">Language</label>
                    <div className="form-text">
                        Select the country in which your reviews are written
                    </div>
                    <select className="form-select" id="input-language" required onChange={(e) => { setCountryCode(e.target.value) }} >
                        <option value="UK">United Kingdom</option>
                        <option value="US">United States</option>
                        <option value="FR">France</option>
                        <option value="ES">Spain</option>
                        <option value="DE">Germany</option>
                    </select>

                    <hr className="hr-blurry my-5" />

                    <h2 className="mb-0">Step 3</h2>
                    <label htmlFor="keywords" className="form-label generate-keywords">Keywords</label>
                    <div className="form-text">
                        Add keywords describing your product, in lowercase and separated by commas
                    </div>
                    <input type="text" className="form-control" id="input-keywords" placeholder="Example: black,leather,handbag,high-quality,luxurious" required onChange={(e) => { generationKeywordsValidation(e) }} />

                    <hr className="hr-blurry my-5" />

                    <h2 className="mb-0">Step 4</h2>
                    <label htmlFor="gender" className="form-label generate-gender">Demographic</label>
                    <div className="form-text">
                        Select the age and gender range of the people writing your reviews
                    </div>
                    <div className="d-flex flex-column flex-md-row justify-content-between">
                        <select className="form-select" id="input-age" required onChange={(e) => { setAge(e.target.value) }} >
                            <option value="none">No specific age</option>
                            <option value="young">Young</option>
                            <option value="adult">Adult</option>
                            <option value="senior">Senior</option>
                        </select>
                        <select className="form-select" id="input-gender" required onChange={(e) => { setGender(e.target.value) }} >
                            <option value="none">No specific gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>

                    <hr className="hr-blurry my-5" />

                    <h2 className="mb-0">Step 5</h2>
                    <label htmlFor="time-period" className="form-label generate-time-period">Time period</label>
                    <div className="form-text">
                        Select the time period during which your reviews are written
                    </div>
                    <div className="d-flex flex-column flex-md-row justify-content-around pb-5">
                        <div>
                            <label htmlFor="time-period-start" className="form-label generate-period-start mb-0">Start</label>
                            <input type="date" className="form-control" id="input-period-start" max={periodEnd} required onChange={(e) => { setPeriodStart(e.target.value) }} />
                        </div>
                        <div>
                            <label htmlFor="time-period-end" className="form-label generate-period-end mb-0">End</label>
                            <input type="date" className="form-control" id="input-period-end" min={periodStart} required onChange={(e) => { setPeriodEnd(e.target.value) }} />
                        </div>
                    </div>
                    <input type="submit" value="Generate" className="btn btn-primary" />
                </form>
            </div>
        )
    }

    const waitForReviewsPage = () => {
        return (
            <div className="container">
                <div className="card" aria-hidden="true">
                    <div className="card-header">
                        Your reviews
                    </div>
                    <div className="card-body">
                        <p className="card-text">
                            Your reviews are currently being generated <br />
                            Keep this page open and wait for it to complete
                        </p>
                    </div>
                    <div className="progress">
                        <div className="progress-bar" id="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" style={{ width: "0%" }}>
                            <span className="sr-only"></span>
                        </div>
                    </div>
                    <button className="btn btn-primary disabled placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-download" viewBox="0 0 16 16">
                            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
                        </svg>
                        <>  Please wait...</>
                    </button>
                </div>
            </div>
        )
    }

    const downloadReviewsPage = () => {
        return (
            <div className="container">
                <div className="card" aria-hidden="true">
                    <div className="card-header">
                        Your reviews
                    </div>
                    <div className="card-body">
                        <p className="card-text">
                            Your reviews have succesfully been generated! <br />
                            You account has been deducted of the appropriate number of tokens
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={function () {
                        var downloadLink = document.createElement("a");
                        var blob = new Blob([csvData]);
                        var url = URL.createObjectURL(blob);
                        downloadLink.href = url;
                        downloadLink.download = "reviews.csv";

                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-download" viewBox="0 0 16 16">
                            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
                        </svg>
                        <>  Download</>
                    </button>
                </div>
                <div className="mt-5">
                    <button className="btn active" onClick={() => { window.location.reload() }}>Generate new reviews</button>
                </div>
            </div>
        )
    }

    const errorPage = () => {
        return (
            <div className="container">
                <div className="card" aria-hidden="true">
                    <div className="card-header">
                        Your reviews
                    </div>
                    <div className="card-body">
                        <p className="card-text">
                            An issue has occured, and we could not generate your requested reviews <br />
                            No tokens have been deduced from your account <br />
                            Please retry later and contact the support if the issue is reoccuring
                        </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => { window.location.reload() }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-clockwise" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
                        </svg>
                        <>  Generate new reviews</>
                    </button>
                </div>
            </div>
        )
    }

    function generationKeywordsValidation(e) {
        let generationKeywords = e.target.value
        let regex = /([a-zé]+[-]?[^\s][a-zé]+[,])+([a-zé]+[-]?[^\s][a-zé]+)/g

        if (generationKeywords.match(regex) !== null) {
            if (generationKeywords.match(regex)[0] === generationKeywords) {
                setKeywords(generationKeywords.match(regex)[0].split(','))
                document.getElementById("input-keywords").setCustomValidity("")
                return
            }
        }
        document.getElementById("input-keywords").setCustomValidity("Words are not lowercase, or not separated by commas only")
    }

    function JSON2CSV(objArray) {
        let jsonArray = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
        let str = 'product_handle,rating,title,author,email,body_text,body_urls,created_at,avatar,country_code,status,featured\r\n';

        for (var i = 0; i < jsonArray.length; i++) {
            var line = [
                jsonArray[i]["product_handle"],
                jsonArray[i]["rating"],
                jsonArray[i]["title"],
                jsonArray[i]["author"],
                jsonArray[i]["email"],
                jsonArray[i]["body_text"],
                jsonArray[i]["body_urls"],
                jsonArray[i]["created_at"],
                jsonArray[i]["avatar"],
                jsonArray[i]["country_code"],
                jsonArray[i]["status"],
                jsonArray[i]["featured"],
            ].join(',')
            str += line + '\r\n';
        }

        return str;
    }

    async function generationSubmit(e) {
        e.preventDefault()
        setIsSubmitted(true)

        const language = countryCodeToLanguage[countryCode]

        let counterValue = 0
        let counterETA = Math.ceil(Math.min(50, amount) * 2)
        const counterUp = setInterval(function () {
            counterValue += 0.25;
            let counterPercent = counterValue * 100 / counterETA
            if (counterPercent < 100) {
                document.getElementById('progress-bar').style.width = counterPercent + '%'
            }
            if (window.location.href !== "https://review-rocket.fr/generate") {
                clearInterval(counterUp);
            }
        }, 250);

        let reviews = []
        let missingAmount = amount
        let retries = 0
        while (missingAmount > 0 && retries <= 4) {
            counterValue = Math.max(1, counterValue - missingAmount)

            const missingReviews = await Axios.post('https://review-rocket.fr/api/get-reviews', {
                amount: missingAmount,
                language: language,
                keywords: keywords,
                gender: gender,
                age: age,
            })
            console.log(missingReviews)

            missingReviews.data.results.forEach((results) => {
                if (results.status === "fulfilled") {
                    results.value.forEach((review) => {
                        review["product_handle"] = productHandle;
                        review["title"] = productTitle;
                        review["rating"] = Math.round(Math.random() + 4)
                        review["email"] = review["author"].toLowerCase().split(" ").join(".") + "@mail.com"
                        review["body_text"] = review["body_text"].replace(',', '.')
                        review["body_urls"] = ""
                        let dateStart = new Date(periodStart)
                        let dateEnd = new Date(periodEnd)
                        let newDateString = new Date(dateStart.getTime() + Math.random() * (dateEnd.getTime() - dateStart.getTime())).toLocaleString('en-GB')
                        review["created_at"] = newDateString.substring(0, newDateString.length - 3).replace(',', '')
                        review["avatar"] = ""
                        review["country_code"] = countryCode
                        review["status"] = "enable"
                        review["featured"] = "0"
                        reviews.push(review)
                    })
                }
            });

            missingAmount = amount - reviews.length
            retries += 1
        }

        if (missingAmount > 0) {
            clearInterval(counterUp)
            setIsGenerated(true)
            throw new Error('Could not generate the required reviews');
        }

        clearInterval(counterUp)

        Axios.post('https://review-rocket.fr/api/generated-tokens', { quantity: amount }).then(async (res) => {
            if (!res.data.executed) {
                throw new Error('Could not withdraw tokens from account');
            }

            let resultsCsv = JSON2CSV(reviews.slice(0, amount))
            setCsvData(resultsCsv)
            return
        })

        setIsGenerated(true)
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

    if (!sessionParameters.isVerified) {
        return (
            <div className='body'>
                <Header />
                <div className="generate-page container text-center p-5">
                    Checking your credentials...
                </div>
                <Navigate replace to="/account" />
                <Footer />
            </div>
        )
    }

    return (
        <div className='body'>
            <Header />

            <div className="generate-page container text-center p-5">
                <div>
                    <div>
                        <h1>Generate</h1>
                    </div>
                    <hr className="hr-blurry my-5" />
                    {maxTokens >= 5 ?
                        !isSubmitted ?
                            generationFormPage()
                            :
                            !isGenerated ?
                                waitForReviewsPage()
                                :
                                csvData !== undefined ?
                                    downloadReviewsPage()
                                    :
                                    errorPage()
                        :
                        <div className="pt-3">You need at least 5 tokens to generate reviews</div>
                    }
                </div>
            </div>

            <Footer />
        </div >
    )
}

export default Generate;
