import React from "react";
import "../assets/css/styles.css";
import {verifyToken, createToken} from "../helper/auth";
import { connect } from "react-redux";
import ReactTooltip from "react-tooltip";
import 'react-custom-alert/dist/index.css';

class ExportChat extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            statusExport: false,
            data: [],
            encryptExport: "",
            statusResultExport: false,
            statusGenerate: false,
        }
    }

    handleClick = (event) => {
        let data = this.state.data
        if(event.target.checked === true){
            data.push({
                address: event.target.value,
            })
        } else {
            const filterUserCheck = data.findIndex(val => val.address === event.target.value)
            data.splice(filterUserCheck, 1)
        }
        this.setState({data})
    }

    fetchInputExport = () => {
        if(localStorage.getItem("opponentList")){
            let getOpponentList = JSON.parse(verifyToken(this.props.addressWallet, "opponentList", localStorage.getItem("opponentList")))
            console.log("opponentlist", getOpponentList)
            if(getOpponentList.findIndex(val => val.address === this.props.startingChat) > -1){
              if(getOpponentList.filter(val => val.address === this.props.startingChat)[0].export){
                this.setState({statusExport: true})
              } else {
                this.setState({statusExport: false})
              }
            }else{
              this.setState({statusExport: false})
            }
          }
    }

    fetchExportChat = () => {
        let exportChatData = []
        this.state.data.map(val => {
            let localStorageData = JSON.parse((verifyToken(this.props.addressWallet, val.address, localStorage.getItem(val.address))))
            let opponentList = JSON.parse((verifyToken(this.props.addressWallet, "opponentList", localStorage.getItem("opponentList"))))
            return exportChatData.push({opponentList, addressOpponent:val.address, data: localStorageData})
        })
        if(exportChatData.length > 0) {
            let encryptExport = createToken(this.props.addressWallet, "exportChat", JSON.stringify(exportChatData))
            this.setState({encryptExport, statusResultExport: true, statusGenerate: true})
        }
    }


    componentDidMount() {
        this.fetchInputExport()
    }
    
    render(){
        return(
            <>
            {
                this.state.statusGenerate ? 
                <>
                <span className="semiHeadFont">Save Key</span>
                <ReactTooltip id="copy-text" type="dark">
                    Click to copy
                </ReactTooltip>
                <span onClick={() => {navigator.clipboard.writeText(this.state.encryptExport)}} data-tip data-for="copy-text" className="bi bi-clipboard mx-2 mt-2" type="button"></span>
                </>
                : 
                <>
                <p className="semiHeadFont">Choose User</p>
                <hr />
                </>
            }
            {   
                localStorage.getItem("opponentList") !== null ?
                    JSON.parse(verifyToken(this.props.addressWallet, "opponentList", localStorage.getItem("opponentList"))).map((val, i) => {
                        return(
                            <>
                             <div className={`form-check text-truncate normalFont ${this.state.statusGenerate ? 'd-none' : 'd-block'}`}>
                                <div className="col-11 col-md-11">
                                    <input className="form-check-input" type="checkbox" value={val.address} id={`flexCheckDefault-${i}`} onClick={this.handleClick} checked={this.state.data.findIndex(data => data.address === val.address) > -1 ? true : false} />
                                    <label className="form-check-label" for={`flexCheckDefault-${i}`}>
                                        {val.address}
                                    </label>
                                </div>
                            </div>
                            </>
                        )
                    })
                :
                <p className="normalFont text-muted">Cannot Export Chat Empty</p>
            }   
            <div className="w-70">
                <hr />
                <div className={`w-70 bodyNft normalFont ${this.state.statusResultExport ? "d-block" : "d-none"}`}>
                    <p className="text-break normalFont border rounded p-2">{this.state.encryptExport}</p>
                </div>
            </div>
            {
                localStorage.getItem("opponentList") !== null ?
                <button className={`btn btn-primary mt-1 ${this.state.statusGenerate ? "d-none" : "d-block"}`} onClick={this.fetchExportChat}>Export Chat</button>
                : null
            }    
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

export default connect(mapStateToProps)(ExportChat);
