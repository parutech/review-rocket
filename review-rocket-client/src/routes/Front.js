import Header from '../components/Header';
import Footer from '../components/Footer';
import { useNavigate } from 'react-router-dom';

function Front() {
    const navigate = useNavigate();
    return (
        <div>
            <Header />

            <div className="container front-page py-5">
                <div className="row align-items-center">
                    <div className='col text-center'>
                        <h1>Better reviews for a successful Ecom store</h1>
                        <button className="btn btn-warning" onClick={() => { navigate("/login") }}>
                            Try it now!
                        </button>
                    </div>
                    <div className='col text-end'>
                        <img alt='reviews-smartphone' src={require("../social-proof.png")} className="img-fluid" style={{ "width": "40vh" }}></img>
                    </div>
                </div>
                <div className="text-center py-5">
                    <h3>Generate thousands of reviews in a few clicks to improve your business' social proof thanks to the power of AI</h3>
                </div>
                <div className="row align-items-center">
                    <div className='col text-center'>
                        <h5>Test your products faster</h5>
                        <img alt='tick' src={require("../tick.png")} className="img-fluid" style={{ "height": "5vh" }}></img>
                    </div>
                    <div className='col text-center'>
                        <h5>Quick generation</h5>
                        <img alt='tick' src={require("../tick.png")} className="img-fluid" style={{ "height": "5vh" }}></img>
                    </div>
                    <div className='col text-center'>
                        <h5>Legit-looking reviews</h5>
                        <img alt='tick' src={require("../tick.png")} className="img-fluid" style={{ "height": "5vh" }}></img>
                    </div>
                </div>
            </div>

            <Footer />
        </div >
    );
}

export default Front;