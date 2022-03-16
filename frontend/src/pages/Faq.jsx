import React from "react";
import "../assets/css/styles.css";
import {Helmet} from "react-helmet";
import { connect } from "react-redux";
import { changeTheme } from "../redux/actions/getData";
import { verifyToken } from "../helper/auth";

class Faq extends React.Component {
    componentDidMount() {
        if(localStorage.getItem("config") !== null) {
            if(JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config"))).theme === "dark") {
                document.body.style.backgroundColor = "#2D2B3F";
            } else if(JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config"))).theme === "light") {
                document.body.style.backgroundColor = "#fff";
            }
        }
    }
    
    render(){
        return(
            <div className="container">
                <Helmet>
                    <title>
                        C3 SolanaScan Faq
                    </title>
                </Helmet>
                <div className="col-12 col-md-12 textAnnounce" data-theme={this.props.theme}>
                    <div className="text-center mt-4">
                        <p className="headAnnounce2">Frequently Asked Questions</p>
                        <p className="normalFont3">Our curated list for most frequently asked questions.</p>
                    </div>
                    <div className="mt-4 pt-4">
                        <div className="mt-4 flex justify-content-center mx-4">
                            <div className="col-12 mb-2">
                                <p className="semiHeadFont">What is C3 SolanaScan Chat?</p>
                                <p className="normalFont3 text-break">Made by the Etherscan Team, Blockscan Chat was built to introduce the concept of Signing in with Web3 and as a messaging platform for users to simply and instantly message each other, wallet-to-wallet.</p>
                                <hr />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

const mapStateToProps = (state) => {
    return {
        theme: state.user.theme,
    }
}

const mapDispatchToProps = {
    changeTheme,
}

export default connect(mapStateToProps, mapDispatchToProps)(Faq);