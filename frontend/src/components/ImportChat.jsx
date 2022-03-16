import React from "react";
import "../assets/css/styles.css";
import {verifyToken, createToken} from "../helper/auth";
import { connect } from "react-redux";
import { AlertContainer, alert } from 'react-custom-alert';
import 'react-custom-alert/dist/index.css';

class ImportChat extends React.Component {
    state = {
        inputImport: "",
    }

    inputHandler = (event) => {
        const value = event.target.value
        this.setState({inputImport: value})
    }

    fetchToLocalStorage = () => {
        try {
            if(this.state.inputImport === "" || null){
                alert({ message: 'Export data empty', type: 'warning' });
            } else {
                let parsingData = JSON.parse(verifyToken(this.props.addressWallet, "exportChat", (this.state.inputImport)))
                let dataUnread = []
                
                parsingData.map(val => {
                    localStorage.setItem(val.addressOpponent, createToken(this.props.addressWallet, val.addressOpponent, JSON.stringify(val.data)))
                })
                
                parsingData.map(val => {
                    localStorage.setItem("opponentList", createToken(this.props.addressWallet, "opponentList", JSON.stringify(val.opponentList)))
                })

                
                localStorage.setItem("unreadMessage", createToken(this.props.addressWallet, "unreadMessage", JSON.stringify(dataUnread)))

                alert({ message: 'Import Success', type: 'success' });
                return window.location.reload()
            }
        }
        catch {
            alert({ message: 'Export data different with your address', type: 'error' });
        }
    }

    render(){
        return(
            <>
                <div className="form-group mb-2">
                    <input type="text" className="form-control"  placeholder="Input your encrypted export" onChange={this.inputHandler} />
                    <button className="btn btn-primary mt-3" onClick={this.fetchToLocalStorage}>Import</button>
                </div>
                <AlertContainer floatingTime={4000} />
            </>
        )
    }
}

const mapStateToProps = (state) => {
    return {
        addressWallet: state.user.myAddress,
        startingChat: state.user.startingChat,
    }
}

export default connect(mapStateToProps)(ImportChat);