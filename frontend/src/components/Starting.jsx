import React from "react";
import "../assets/css/styles.css";
import {Link} from "react-router-dom"

class Starting extends React.Component {
    render(){
        return(
            <div className="d-flex justify-content-center startingBox mt-5" data-theme={this.props.theme}>
                <div className="w-50 boxText">
                   <div className="mx-4 pt-3 mb-3">
                    <p className="semiHeadFont">Welcome to Chat3 <span className="badge bg-secondary normalFont">Beta</span> </p>
                    <p className="text-justify normalFont">
                        Peer-to-peer and encrypted text messanger. Built on Solana and IPFS for Solana user.
                    </p>
                    <p className="text-justify normalFont">
                        Be careful when sending your message. Do not send messages that contain sensitive information.
                    </p>
                   </div>
                </div>
            </div>
        )
    }
}

export default Starting;