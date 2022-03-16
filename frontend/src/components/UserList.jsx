import React from "react";
import "../assets/css/styles.css";
import moment from "moment";
import { connect } from "react-redux";
import { getTab, getStartingChat, updateData, broadcastMessage, connection, broadcastToken } from "../redux/actions/getData";
import io from "socket.io-client";
import {API_URL} from "../constants/API";
import CryptoJS from "crypto-js";
import {createToken, verifyToken} from "../helper/auth";
import defaultImage from "../assets/img/defaultImage.jpg";

class UserList extends React.Component{

    state = {
        token: localStorage.getItem("config") ? JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config"))).token : null,
        filterUserList: [],
        opponentList: []
    }

    toChatUser = (address) => {
        if (parseInt(window.innerWidth) > 700) {
            this.props.getTab("")
        }else {
            this.props.getTab("chat")
        }
        this.props.getStartingChat(address)
        this.props.updateData(this.props.changed ? false : true)
    }


    toChatUserEmpty = (address) => {
        if (parseInt(window.innerWidth) > 700) {
            this.props.getTab("")
        }else {
            this.props.getTab("chat")
        }

        let arrayOpponentList = []
        let arrayUnreadMessage = []
        let dataOpponenetList = {
            "address": this.props.searchUser,
            "timestamp": Math.floor(Date.now()/10000),
        }    
        arrayOpponentList.push(dataOpponenetList)

        localStorage.setItem("opponentList", createToken(this.props.addressWallet, "opponentList", JSON.stringify(arrayOpponentList)))
        localStorage.setItem("unreadMessage", createToken(this.props.addressWallet, "unreadMessage", JSON.stringify(arrayUnreadMessage)))

        this.props.getStartingChat(address)
        this.props.updateData(this.props.changed ? false : true)
    }

    absent = () => {
        const absent = io.connect(`${API_URL}/absent`);
        absent.on('connected', () => {
            this.props.connection(this.props.notificationStatus, true, this.props.standbyStatus, this.props.onlineStatus);
        })
        absent.emit("absent", { address: this.props.addressWallet, token: this.props.token });
        absent.on('disconnect', () => {
            this.props.connection(this.props.notificationStatus, false, this.props.standbyStatus, this.props.onlineStatus);
        })
    }

    getMessages = () => {
        const socket = io.connect(API_URL, {
            query: {
                token: CryptoJS.AES.encrypt(`${parseInt(Math.floor(Date.now()/10000).toString())}`, this.props.addressWallet),
                address: this.props.addressWallet
            }
        });
        socket.on('connected', () => {
            this.props.connection(this.props.notificationStatus, this.props.absentStatus, true, this.props.onlineStatus);
        })
        socket.on('newMessage', data => {
            if(data.length > 0) {
                data.forEach(message => {
                    if(message.receiver === this.props.addressWallet) {
                        if(localStorage.getItem("opponentList")){
                            if(JSON.parse(verifyToken(this.props.addressWallet, "opponentList", localStorage.getItem('opponentList'))).findIndex(list => list.address === message.sender) > -1){
                                const getProfile = JSON.parse(verifyToken(this.props.addressWallet, "opponentList", localStorage.getItem('opponentList'))).filter(res => res.address === message.sender);
                                if(!getProfile[0].block){
                                    var getLastMessage = [];
                                    if(localStorage.getItem('unreadMessage')){
                                        getLastMessage = JSON.parse(verifyToken(this.props.addressWallet, "unreadMessage", localStorage.getItem('unreadMessage')));
                                    }
                                    getLastMessage.push({
                                        sender: message.sender,
                                        message: message.message,
                                        timestamp: message.timestamp,
                                        media: message.media,
                                    });
                                    localStorage.setItem('unreadMessage', createToken(this.props.addressWallet, "unreadMessage", JSON.stringify(getLastMessage)));

                                    const socket = io.connect(`${API_URL}/image`);
                                    socket.emit("standby", [{address: message.sender}]);
                                    socket.on("newImage", data => {
                                        data.forEach(val => {
                                            if(val.address === message.sender){
                                                const opponentList = JSON.parse(verifyToken(this.props.addressWallet, "opponentList", localStorage.getItem('opponentList'))).filter(res => res.address !== message.sender);
                                                opponentList.unshift({
                                                    address: message.sender,
                                                    timestamp: message.timestamp,
                                                    block: getProfile[0].block,
                                                    archive: getProfile[0].archive,
                                                    imageUrl: val.imageUrl ? val.imageUrl : defaultImage,
                                                    mintAddress: val.mintAddress ? val.mintAddress : ""
                                                });
                                                localStorage.setItem('opponentList', createToken(this.props.addressWallet, "opponentList", JSON.stringify(opponentList)));

                                                socket.disconnect();
                                            }
                                        })
                                    })
                                    this.props.broadcastMessage(message);
                                }
                            }else{
                                if(JSON.parse(verifyToken(this.props.addressWallet, "opponentList", localStorage.getItem('opponentList'))).length >= 0){
                                    const socket = io.connect(`${API_URL}/image`);
                                    socket.emit("standby", [{address: message.sender}]);
                                    socket.on("newImage", data => {
                                        data.forEach(val => {
                                            if(val.address === message.sender){
                                                const opponentList = JSON.parse(verifyToken(this.props.addressWallet, "opponentList", localStorage.getItem('opponentList'))).filter(res => res.address !== message.sender);
                                                opponentList.unshift({
                                                    address: message.sender,
                                                    timestamp: message.timestamp,
                                                    block: false,
                                                    archive: false,
                                                    imageUrl: val.imageUrl ? val.imageUrl : defaultImage,
                                                    mintAddress: val.mintAddress ? val.mintAddress : ""
                                                });
                                                localStorage.setItem('opponentList', createToken(this.props.addressWallet, "opponentList", JSON.stringify(opponentList)));

                                                socket.disconnect();
                                            }
                                        })
                                    })

                                    getLastMessage = [];
                                    if(localStorage.getItem('unreadMessage')){
                                        getLastMessage = JSON.parse(verifyToken(this.props.addressWallet, "unreadMessage", localStorage.getItem('unreadMessage')));
                                    }
                                    getLastMessage.push({
                                        sender: message.sender,
                                        message: message.message,
                                        timestamp: message.timestamp,
                                        media: message.media,
                                    });
                                    localStorage.setItem('unreadMessage', createToken(this.props.addressWallet, "unreadMessage", JSON.stringify(getLastMessage)));

                                    this.props.broadcastMessage(message);
                                }
                            }
                        }else{
                            const socket = io.connect(`${API_URL}/image`);
                                socket.emit("standby", [{address: message.sender}]);
                                socket.on("newImage", data => {
                                    data.forEach(val => {
                                        if(val.address === message.sender){
                                            const opponentList = [];
                                            opponentList.unshift({
                                                address: message.sender,
                                                timestamp: message.timestamp,
                                                block: false,
                                                archive: false,
                                                imageUrl: val.imageUrl ? val.imageUrl : defaultImage,
                                                mintAddress: val.mintAddress ? val.mintAddress : ""
                                            });
                                            localStorage.setItem('opponentList', createToken(this.props.addressWallet, "opponentList", JSON.stringify(opponentList)));
                                            this.setState({
                                                opponentList: opponentList
                                            })

                                            socket.disconnect();
                                        }
                                    })
                                })

                            const getLastMessage = [];
                            getLastMessage.push({
                                sender: message.sender,
                                message: message.message,
                                timestamp: message.timestamp,
                                media: message.media,
                            });
                            localStorage.setItem('unreadMessage', createToken(this.props.addressWallet, "unreadMessage", JSON.stringify(getLastMessage)));
                        }
                        
                        this.props.updateData(this.props.changed ? false : true)
                        this.props.broadcastMessage(message);
                    }
                })
            }
        })
        socket.on('disconnect', () => {
            this.props.connection(this.props.notificationStatus, this.props.absentStatus, false, this.props.onlineStatus);
        })
        socket.emit('standby', { address: this.props.addressWallet, token: this.props.token });
    }

    getImages = () => {
        if(this.state.opponentList.length === 0){
            const getOpponentList = localStorage.getItem("opponentList") ? JSON.parse(verifyToken(this.props.addressWallet, "opponentList", localStorage.getItem("opponentList"))) : [];
            const socket = io.connect(`${API_URL}/image`);
            socket.emit("standby", getOpponentList)
            socket.on("newImage", data => {
                if(data.length > 0){
                    data.forEach(image => {
                        const getIndex = getOpponentList.findIndex(x => x.address === image.address);
                        getOpponentList[getIndex].imageUrl = image.imageUrl ? image.imageUrl : defaultImage;
                        getOpponentList[getIndex].mintAddress = image.mintAddress ? image.mintAddress : "";
                    })
                    this.setState({opponentList: getOpponentList});
                    localStorage.setItem("opponentList", createToken(this.props.addressWallet, "opponentList", JSON.stringify(getOpponentList)));
                }
            })
        }
    }

    renderList = () => {
        if (localStorage.getItem('opponentList')) {
            let getOpponentList = JSON.parse(verifyToken(this.props.addressWallet, "opponentList", localStorage.getItem("opponentList")));
            let searchAddress = this.props.searchUser.toLowerCase();
            const filterUserList =  getOpponentList.filter((val) => val.address.toLowerCase().includes(searchAddress))
            if(this.props.lenSearchUser === 44){
                if(this.props.searchUser !== this.props.addressWallet){
                    return(
                        <div className={`row ${this.props.startingChat === this.props.searchUser ? "userListActive" : null}`} onClick={()=> this.toChatUser(this.props.searchUser)}>
                            <div className="boxProfileList">
                            <img src={this.state.searchImage} alt="photoProfileUser" />
                            </div>
                            <div className="col-10 col-md-10">
                                <div className="profileList">
                                    <b>{this.props.searchUser}</b>
                                </div>
                                <div className="chatList">
                                    <p className="text-muted">Lets start chat with {this.props.searchUser}</p>
                                </div>
                            </div>
                        </div>
                    )
                }
            } else if(this.props.lenSearchUser !== 44){
                if(filterUserList.length === 0){
                    return(
                        <div className="text-center mt-4 mx-2 normalFont">
                            <i className="bi bi-person-x h1 text-primary"></i>
                            <br />
                            <span>User not found!</span>
                            <br />
                            <span className="opacity-50">
                                Address user not found on your opponent list conversation
                            </span>
                        </div>
                    )
                } else if(filterUserList.length > 0){
                    return(
                        localStorage.getItem("opponentList") ?
                            filterUserList.filter(x => !x.block && x.archive === this.props.archived ? true : false).map(val => {
                                return(
                                    <div className={`row ${this.props.startingChat === val.address ? "userListActive" : null}`} onClick={()=> this.toChatUser(val.address)}>
                                        <div className="boxProfileList">
                                            <img src={val.imageUrl} alt="photoProfileUser" />
                                        </div>
                                        <div className="col-10 col-md-10">
                                            <div className="profileList">
                                                <b>{val.address}</b>
                                                <p className="mx-2 text-muted">{val.timestamp >= Math.floor(Date.now()/1000)-86400 ? moment.unix(val.timestamp).format("HH:mm") : val.timestamp >= Math.floor(Date.now()/1000)-31536000 ? moment.unix(val.timestamp).format("DD/MM") : moment.unix(val.timestamp).format("DD/MM/YY")}</p>
                                            </div>
                                            <div className="chatList">
                                                <p className="text-muted">
                                                    {   
                                                    //this mean 2 === [] length
                                                        verifyToken(this.props.addressWallet, "unreadMessage", localStorage.getItem("unreadMessage")).length === 2 ?
                                                        verifyToken(this.props.addressWallet, val.address, localStorage.getItem(val.address)).length === 2 ?
                                                        <p>Never start chat in this user, so chat empty</p>
                                                        : 
                                                        JSON.parse(verifyToken(this.props.addressWallet, val.address, localStorage.getItem(val.address)))[JSON.parse(verifyToken(this.props.addressWallet, val.address, localStorage.getItem(val.address))).length-1].message
                                                        :
                                                        verifyToken(this.props.addressWallet, "unreadMessage", localStorage.getItem("unreadMessage")) !== [] ?
                                                        JSON.parse(verifyToken(this.props.addressWallet, "unreadMessage", localStorage.getItem('unreadMessage'))).filter(list => list.sender === val.address).length > 0 ?
                                                            <><span className="badge rounded-pill bg-primary">{JSON.parse(verifyToken(this.props.addressWallet, "unreadMessage", localStorage.getItem('unreadMessage'))).filter(list => list.sender === val.address).length}</span> {JSON.parse(verifyToken(this.props.addressWallet, "unreadMessage", localStorage.getItem('unreadMessage'))).filter(list => list.sender === val.address)[JSON.parse(verifyToken(this.props.addressWallet, "unreadMessage", localStorage.getItem('unreadMessage'))).filter(list => list.sender === val.address).length-1].message}</>
                                                        : JSON.parse(verifyToken(this.props.addressWallet, val.address, localStorage.getItem(val.address)))[JSON.parse(verifyToken(this.props.addressWallet, val.address, localStorage.getItem(val.address))).length-1].message
                                                        : JSON.parse(verifyToken(this.props.addressWallet, val.address, localStorage.getItem(val.address)))[JSON.parse(verifyToken(this.props.addressWallet, val.address, localStorage.getItem(val.address))).length-1].message
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        : 
                        null
                    )
                }
            }
        }else{
            let searchAddress = this.props.searchUser.toLowerCase()
            if(searchAddress.length <= 0) {
                return(
                    <div className="text-center mt-4 mx-2 normalFont">
                        <i className="bi bi-person-lines-fill h1 text-primary"></i>
                        <br />
                        <span>You don't start any conversation</span>
                        <br />
                        <span className="opacity-50">
                            You never starting chat before
                        </span>
                    </div>
                )
            } else if(searchAddress.length === 44 && this.props.searchUser !== this.props.addressWallet) {
                return(
                    <div className={`row ${this.props.startingChat === this.props.searchUser ? "userListActive" : null}`} onClick={()=> this.toChatUserEmpty(this.props.searchUser)}>
                        <div className="boxProfileList">
                        <img src={this.state.searchImage} alt="photoProfileUser" />
                        </div>
                        <div className="col-10 col-md-10">
                            <div className="profileList">
                                <b>{this.props.searchUser}</b>
                            </div>
                            <div className="chatList">
                                <p className="text-muted">Lets start chat with {this.props.searchUser}</p>
                            </div>
                        </div>
                    </div>
                 )
            } else if(searchAddress.length > 0 && searchAddress.length !== 44) {
                return(
                    <div className="text-center mt-4 mx-2 normalFont">
                        <i className="bi bi-person-x h1 text-primary"></i>
                        <br />
                        <span>User not found!</span>
                        <br />
                        <span className="opacity-50">
                            Address user not found on your opponent list conversation
                        </span>
                    </div>
                )
            }
        }
    }

    componentDidMount(){
        if(this.props.token){
            this.setState({token: this.props.token})
            this.props.broadcastToken("");
            this.getMessages();
            this.absent();
        }
    }

    componentDidUpdate(prevProps, prevState){
        if(this.state.opponentList.length === 0){
            this.getImages();
        }
        if(this.props.lenSearchUser === 44 && prevProps.searchUser !== this.props.searchUser){
            const socket = io.connect(`${API_URL}/image`);
            socket.emit("standby", [{address: this.props.searchUser}]);
            socket.on("newImage", data => {
                var imageUrl = defaultImage;
                if(data[0].address === this.props.searchUser){
                    imageUrl = data[0].imageUrl ? data[0].imageUrl : defaultImage;
                }
                this.setState({searchImage: imageUrl});
            });
        }
        if(!prevProps.token && this.props.token){
            this.setState({token: this.props.token})
            this.props.broadcastToken("");
            this.getMessages();
            this.absent();
        }
    }

    render(){
        return(
            <div>
                {
                    !this.props.notificationStatus || !this.props.absentStatus || !this.props.standbyStatus || (this.props.startingChat && !this.props.onlineStatus) ?
                        <div className="connectionAlert bg-danger rounded">
                            <p><i className="bi bi-x-octagon-fill"></i> Oops, some connection was disconnected!</p>
                            <span>Some features may not work properly. Please check your internet connection and refresh this page. </span>
                        </div>
                    : null
                }
                <div className="userList overflowCustom chatList" data-theme={this.props.theme}>
                    {
                        this.props.changed ? 
                            this.renderList()
                        : this.renderList()
                    }
                </div>    
            </div>
        )
    }
}

const mapStateToProps = (state) => {
    return {
        tab: state.user.tab,
        startingChat: state.user.startingChat,
        addressWallet: state.user.myAddress,
        changed: state.user.changed,
        notification: state.user.notification,
        notificationStatus: state.user.notificationStatus,
        absentStatus: state.user.absentStatus,
        standbyStatus: state.user.standbyStatus,
        onlineStatus: state.user.onlineStatus,
        token: state.user.token,
        addressBlock: state.user.addressBlock,
        addressArchive: state.user.addressArchive
    }
}

const mapDispatchToProps = {
    getTab,
    getStartingChat,
    updateData,
    broadcastMessage,
    connection,
    broadcastToken,
}
export default connect(mapStateToProps, mapDispatchToProps)(UserList); 