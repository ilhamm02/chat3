import React from "react";
import "../assets/css/styles.css";
import "../assets/css/Home.css";
import moment from "moment";
import { connect } from "react-redux";
import { getTab, changeTheme, getMyAddress, getStartingChat, connection, broadcastToken, broadcastBlock, toIPFS } from "../redux/actions/getData";
import { Dropdown, DropdownButton, Modal } from "react-bootstrap";
import ReactTooltip from "react-tooltip";
import Axios from "axios";
import io from "socket.io-client";
import {API_URL} from "../constants/API";
import {createToken, verifyToken} from "../helper/auth";
import CryptoJS from "crypto-js";
import { Connection, programs } from '@metaplex/js';
import defaultImage from "../assets/img/defaultImage.jpg";
import chat3 from "../assets/img/chat3.png";
import phantom from "../assets/img/phantom-icon-purple.png";
import solana from "../assets/img/solana.png";
import ipfs from "../assets/img/ipfs.png";

//import pages components
import UserList from "../components/UserList"
import UserChat from "../components/UserChat";
import Starting from "../components/Starting";
import ExportChat from "../components/ExportChat";
import IPFS from "../components/IPFS";
import ImportChat from "../components/ImportChat";

const { metadata: { Metadata } } = programs;

class Home extends React.Component {
    state = {
        addressWallet: "",
        statusConnectWallet: false,
        statusSignWallet: false,
        statusLocalStorage: false,
        valueSolana: 0,
        searchUser: "",
        statusSearchUser: true,
        lenSearchUser: 0,
        name: [],
        value: [],
        notification: [],
        tokens: [],
        settingsModal: false,
        settingsExport: false,
        settingsImport: false,
        nftList: [],
        totalNFT: 0,
        archive: false,
        imageUrl: defaultImage,
        mintAddress: ""
    }

    getNotifications = (token) => {
        this.setState({
            notification: localStorage.getItem("notification") ? JSON.parse(verifyToken(this.state.addressWallet, "notification", localStorage.getItem("notification"))) : []
        })
        const notification = io.connect(`${API_URL}/notification`);
        notification.on('connected', data => {
            if(data.address === this.state.addressWallet){
                this.props.connection(true, this.props.absentStatus, this.props.standbyStatus, this.props.onlineStatus);
            }
        })
        notification.emit("standby", { address: this.state.addressWallet, token });
        notification.on("push", data => {
            if(data.length > 0) {
                if(data.filter(x => x.title && x.message && x.tx && x.timestamp)){
                    var listNotifications = this.state.notification;
                    data.filter(x => x.title && x.message && x.tx && x.timestamp).forEach(notifications => {
                        listNotifications.unshift({...notifications, read: false});
                    });
                    localStorage.setItem("notification", createToken(this.state.addressWallet, "notification", JSON.stringify(listNotifications)))
                    this.setState({ notification: listNotifications });
                    this.getSolanaVal();
                }
            }
        })
        notification.on('disconnect', () => {
            this.props.connection(false, this.props.absentStatus, this.props.standbyStatus, this.props.onlineStatus);
        })
    }

    markReadUnread = (index, read) => {
        if(index >= 0){
            var getNotifications = this.state.notification;
            getNotifications[index].read = read ? true : false
            this.setState({ notification: getNotifications });
            localStorage.setItem("notification", createToken(this.state.addressWallet, "notification", JSON.stringify(getNotifications)));
        }
    }

    markAllReadUnread = (read) => {
        if(this.state.notification.length > 0){
            const listNotifications = this.state.notification.map(notifications => {
                return { ...notifications, read: read ? true : false }
            })
            this.setState({notification: listNotifications})
            localStorage.setItem("notification", createToken(this.state.addressWallet, "notification", JSON.stringify(listNotifications)))
        }
    }

    connectPhantomWallet = async() => {
        if("solana" in window) {
            const provider = window.solana
            if (provider.isPhantom) {
                const resp = await window.solana.connect();
                if(window.solana.isConnected){
                    this.props.getMyAddress(resp.publicKey.toString())
                    this.setState({
                        addressWallet: resp.publicKey.toString(),
                        statusConnectWallet: true,
                        statusSignWallet: localStorage.getItem("config") ? JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config"))).address === resp.publicKey.toString() ? true : false : false
                    })
                    this.getSolanaVal()
                }
            }
        }else{
            window.open("https://phantom.app", "_blank")
        }
    }

    signPhantomWallet = () => {
        const dateCreate = moment().format("DD-MM-YYYY hh:mm:ss")
        const message = `
        Proof of sign in to Web3 P2P Messaging. 
        
        Note: If you connect to a different address than before, the message and another data that was previously there will be lost. So please backup first if needed.
        
        Address : ${this.state.addressWallet}
        Issued  : ${dateCreate}
        `;

        const encodedMessage = new TextEncoder().encode(message);
        window.solana.signMessage(encodedMessage, "utf8")
        .then(async(data) => {
            if(data.signature){
                const resp = await window.solana.connect();
                const configValue = JSON.stringify({
                    address: resp.publicKey.toString(),
                    theme: localStorage.getItem("config") ? JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config"))).theme === "light" || JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config"))).theme === "dark" ? "light" : "light" : "light"
                });
                if(localStorage.getItem("config")){
                    localStorage.clear();
                }
                localStorage.setItem("config", createToken("00000000000000000000000000000000000000000000", "config", configValue));
                this.setState({
                    statusSignWallet: true,
                    addressWallet: resp.publicKey.toString()
                })
            }
        })
        .catch(err => {
            this.setState({
                statusSignWallet: false,
            })
        })
    }

    getToken = () => {
        const socket = io.connect(API_URL, {
            query: {
                token: CryptoJS.AES.encrypt(`${Math.floor(Date.now()/10000)}`, this.state.addressWallet).toString(),
                address: this.state.addressWallet
            }
        });
        socket.on('newToken', data => {
            if(data.token){
                this.getNotifications(data.token);
                this.props.broadcastToken(data.token);
                const getConfig = JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config")));
                localStorage.setItem('config', createToken("00000000000000000000000000000000000000000000", "config", JSON.stringify({
                    ...getConfig,
                    token: data.token
                })));
                socket.disconnect();
            }
        })
    }

    getSolanaVal = () => {
        Axios({
            method: "post",
            url: "https://api.mainnet-beta.solana.com",
            headers: {
                "Content-Type": "application/json"
            },
            data:{"jsonrpc":"2.0", "id":1, "method":"getBalance", "params":[this.state.addressWallet]}
        })
        .then(result =>{
            this.setState({
                valueSolana: result.data.result.value,
            })
        })
    }

    searchInputHandler = (event) => {
        const value = event.target.value
        
        this.setState({ searchUser: value, lenSearchUser: value.length})
        
    }

    setChangeTheme = (theme) => {
        const getConfig = JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config")))
        this.props.changeTheme(theme)
        localStorage.setItem("config", createToken("00000000000000000000000000000000000000000000", "config", JSON.stringify({
            ...getConfig,
            theme: theme,
        })))
    }

    renderNotifications = () => {
        if(this.state.tokens.length > 0){
            var listNotifications = []
            this.state.notification.forEach((notification, i) => {
                const tokenAddress = notification.message.split(" ")[1]
                if(tokenAddress.length === 44){
                    var ticker = this.state.tokens.filter(x => x.address === tokenAddress)
                    if(ticker.length === 1){
                        ticker = ticker[0].symbol
                    }else{
                        ticker = "UNKNOWN"
                    }
                    notification.message = notification.message.replace(tokenAddress, ticker)
                    notification.message = notification.message.replace(tokenAddress, ticker)
                }
                listNotifications.push(
                    <Dropdown.Item className="notificationList">
                        <div className="flexBox">
                            <div>
                                <i className={`bi bi-check-circle-fill ${notification.read ? "text-success" : "text-warning readNotification"}`} onClick={() => this.markReadUnread(i, notification.read ? false : true)}></i>
                            </div>
                            <div>
                                <p onClick={() => window.open(`https://solscan.io/tx/${notification.tx}`, '_blank')}>{notification.title}</p>
                                <p onClick={() => window.open(`https://solscan.io/tx/${notification.tx}`, '_blank')}>{notification.message}</p>
                                <p className="opacity-50">{moment.unix(notification.timestamp).format("DD MMMM YYYY HH:mm:ss")}</p>
                            </div>
                        </div>
                    </Dropdown.Item>
                )
            })

            return listNotifications;
        }
    }

    setDisconnect = async() => {
        try{
            await window.solana.disconnect()
            this.setState({
                addressWallet: "",
                statusConnectWallet: false,
                statusSignWallet: false,
            })
            this.props.getStartingChat("")
            window.location.reload();
        } catch (err) {
            //catch error
        }
    }

    setProfile = (mintAddress, imageUrl) => {
        if(localStorage.getItem("config")){
            const getConfig = JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config")))
            Axios({
                method: "PATCH",
                url: `${API_URL}/setImage`,
                headers: {
                    'Authorization': `Bearer ${getConfig.token}`
                },
                data:{"address": this.state.addressWallet, "imageUrl": imageUrl, "mintAddress": mintAddress}
            })
            .then(result =>{
                if(result.data.result){
                    this.setState({imageUrl: imageUrl === "empty" ? defaultImage : imageUrl, mintAddress: mintAddress === "empty" ? "" : mintAddress});
                    localStorage.setItem("config", createToken("00000000000000000000000000000000000000000000", "config", JSON.stringify({
                        ...getConfig
                    })))
                }
            })
        }
    }

    componentDidMount() {
        if(!this.state.statusLocalStorage){
            localStorage.setItem("checking", "This is sample for checking local storage");
            if(localStorage.getItem("checking")){
                this.setState({ statusLocalStorage: true });
                localStorage.removeItem("checking");
            }
        }
        if (parseInt(window.innerWidth) > 700) {
            this.props.getTab("")
        }else {
            this.props.getTab("list")
        }

        if(localStorage.getItem("config")){
            if(JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config"))).theme){
                this.props.changeTheme(JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config"))).theme)
            }
        }
        Axios.get("https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json")
        .then(result =>{
            this.setState({
                tokens: result.data.tokens
            })
        })
    }

    componentDidUpdate(prevProps, prevState){
        if(this.state.statusConnectWallet && this.state.statusSignWallet){
            if((localStorage.getItem("config")) !== null) {
                if((JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config"))).theme) === "dark") {
                    document.body.style.backgroundColor = "#2D2B3F";
                }else if ((JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config"))).theme) === "light") {
                    document.body.style.backgroundColor = "#fff";
                }
            }
        }else{
            document.body.style.backgroundColor = "#000";
        }
        if(!prevState.statusSignWallet && this.state.statusSignWallet && this.state.addressWallet.length === 44){
            this.getToken();
            this.props.getMyAddress(this.state.addressWallet);
            const connection = new Connection("mainnet-beta");
            if(localStorage.getItem("config")){
                const getConfig = JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config")));
                if(getConfig.imageUrl){
                    this.setState({imageUrl: getConfig.imageUrl, mintAddress: getConfig.mintAddress})
                }
            }
            const socket = io.connect(`${API_URL}/image`);
            socket.emit("standby", [{address: this.state.addressWallet}]);
            socket.on("newImage", data => {
                var image = data.filter(x => x.address === this.state.addressWallet)[0];
                const mintAddress = image.mintAddress ? image.mintAddress : "";
                image = image.imageUrl ? image.imageUrl : defaultImage;
                this.setState({
                    mintAddress,
                    imageUrl: image
                })
                socket.disconnect();
            })
            Metadata.findDataByOwner(connection, this.state.addressWallet)
            .then(nfts => {
                this.setState({
                    totalNFT: nfts.length,
                    isCheckedNFT: true
                })
                var nftList = [];
                nfts.forEach(nfts => {
                    Axios.get(nfts.data.uri)
                    .then(imageNft => {
                        nftList.push({
                            image: imageNft.data.image,
                            name: imageNft.data.name,
                            description: imageNft.data.description,
                            mintAddress: nfts.mint
                        })
                    })
                })
                this.setState({
                    nftList
                })
            })
        }
        if(this.state.isCheckedNFT && this.state.statusSignWallet){
            if(this.state.nftList.length === this.state.totalNFT){
                if(this.state.totalNFT > 0){
                    if(this.state.nftList.findIndex(x => x.mintAddress === this.state.mintAddress) === -1){
                        this.setProfile(this.state.nftList[0].mintAddress, this.state.nftList[0].image)
                        this.setState({
                            mintAddress: this.state.nftList[0].mintAddress,
                            imageUrl: this.state.nftList[0].image
                        })
                    }
                }else{
                    this.setProfile("empty", "empty")
                    this.setState({isCheckedNFT: false})
                }
            }
        }
    }
   
    render(){
        return(
            <div data-theme={this.props.theme}>
                {
                    this.props.ipfs ? 
                        <IPFS theme={this.props.theme} imageUrl={this.state.imageUrl} />
                    : null
                }
                {/* modal settings */}
                <Modal show={this.state.settingsModal} onHide={() => this.setState({ settingsModal: false })} centered>
                    <Modal.Body className="settingsModal" data-theme={this.props.theme}>
                        <p className="settings"><i className="bi bi-gear font-weight-bold"></i> Account Settings</p>
                        <hr/>
                        <div className="photoProfile">
                            <p className="sectionTitle"><i className="bi bi-image-alt"></i> Photo Profile</p>
                            <div className="nftList overflowCustom">
                                {
                                    this.state.nftList.length > 0 ?
                                        this.state.nftList.map(nfts => {
                                            return(
                                                <div className="col-4">
                                                    <img src={nfts.image} alt={nfts.name} onClick={() => window.open(`https://magiceden.io/item-details/${nfts.mintAddress}`, "_blank")} />
                                                    <p>{nfts.name}</p>
                                                    <button className="btn btn-outline-primary" onClick={() => this.setProfile(nfts.mintAddress, nfts.image)} disabled={this.state.mintAddress === nfts.mintAddress}>{this.state.mintAddress === nfts.mintAddress ? "Selected" : "Select"}</button>
                                                </div>
                                            )
                                        })
                                    : <p className="opacity-50">No NFT found at this address</p>
                                }
                            </div>
                        </div>
                        <div className="blockList">
                            <p className="sectionTitle"><i className="bi bi-send-slash"></i> Blocked Address</p>
                            <div className="addressList overflowCustom">
                                {
                                    this.state.settingsModal && this.state.addressWallet.length === 44 && localStorage.getItem("opponentList") ?
                                        JSON.parse(verifyToken(this.state.addressWallet, "opponentList", localStorage.getItem("opponentList"))).filter(x => x.block).length > 0 ?
                                            JSON.parse(verifyToken(this.state.addressWallet, "opponentList", localStorage.getItem("opponentList"))).filter(x => x.block).map(addr => {
                                                return(
                                                    <div className="flexBox">
                                                        <p onClick={() => {this.props.getStartingChat(addr.address); this.setState({settingsModal: false}); parseInt(window.innerWidth) > 700 ? this.props.getTab("") : this.props.getTab("chat")}}><i className="bi bi-person"></i> {addr.address}</p>
                                                    </div>
                                                )
                                            })
                                        : <p className="opacity-50">No address was blocked</p>
                                    : <p className="opacity-50">No address was blocked</p>
                                }
                            </div>
                        </div>
                        {/* <div className="w-100 text-center">
                            <button className="btn btn-secondary mx-2" onClick={() => this.setState({ settingsModal: false })}>Close</button>
                            <button className="btn btn-success mx-2" onClick={() => this.setState({ settingsModal: false })}>Save Changes</button>
                        </div> */}
                    </Modal.Body>
                </Modal>
                {/* modal export chat*/}
                <Modal show={this.state.settingsExport} onHide={() => this.setState({ settingsExport: false })} className="w-100" centered>
                    <Modal.Body className="settingsModal w-100" data-theme={this.props.theme}>
                        <ExportChat />
                    </Modal.Body>
                </Modal>
                {/* modal import chat */}
                <Modal show={this.state.settingsImport} onHide={() => this.setState({ settingsImport: false })}  centered>
                    <Modal.Body className="settingsModal" data-theme={this.props.theme}>
                        <p className="semiHeadFont">Input your encrypted export</p>
                        <hr />
                        <ImportChat />
                    </Modal.Body>
                </Modal>
                {
                    !this.state.statusConnectWallet || !this.state.statusSignWallet ?
                        <div className="homeDiv" data-theme="dark">
                            <div className="homeHeader">
                                <img src={chat3} alt="Chat3.app" />
                                <div>
                                    <button className={`btn ${this.state.statusConnectWallet && this.state.statusLocalStorage ? "d-none" : null}`} onClick={this.connectPhantomWallet}><img src={phantom} alt="Connect to Phantom" />Try Now!</button>
                                    <button className={`btn ${this.state.statusConnectWallet && this.state.statusLocalStorage ? null : "d-none"}`} disabled={this.state.statusConnectWallet && this.state.statusLocalStorage ? false : true} onClick={this.signPhantomWallet}><img src={phantom} alt="Connect to Phantom" />Sign</button>
                                </div>
                            </div>
                            <div className="homeBody">
                                <h1>Your daily application on Web3.</h1>
                                <h5 className="text-center mt-3">Peer-to-peer text messager. Built for Solana user.</h5>
                                <div className="text-center w-100">
                                    <button className="btn" disabled={this.state.statusConnectWallet && this.state.statusLocalStorage ? true : false} onClick={this.connectPhantomWallet}><img src={phantom} alt="Connect to Phantom" />Try Now!</button>
                                    <button className="btn" disabled={this.state.statusConnectWallet && this.state.statusLocalStorage ? false : true} onClick={this.signPhantomWallet}><img src={phantom} alt="Connect to Phantom" />Sign</button>
                                </div>
                                <div className="builtOn text-center w-100 mt-4">
                                    <span className="d-inline">Built on</span>
                                    <div className="d-inline rounded">
                                        <img src={solana} alt="Solana" className="d-inline" />
                                    </div>
                                    <div className="d-inline rounded">
                                        <img src={ipfs} alt="IPFS" className="d-inline" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    : 
                    <div className="flexBox mainBox">
                        <div className={this.props.tab === "chat" ? `leftSide d-none` : `leftSide d-block`}>    
                            <div className="fixed-top">
                                <div className="flexBox boxProfile">
                                    <img src={this.state.imageUrl} alt="photoProfileUser" />
                                    <i className="bi bi-record-circle-fill"></i>
                                    <i className="bi bi-circle-fill text-success"></i>
                                    <ReactTooltip id="copy-text" type="dark">
                                        Click to copy
                                    </ReactTooltip>
                                    <p className="profileAddress" data-tip data-for="copy-text" type="button" onClick={() => {navigator.clipboard.writeText(this.state.addressWallet)}}>{this.state.addressWallet}</p>
                                    <p className="profileBalance"><img src="https://cryptologos.cc/logos/solana-sol-logo.png" alt="solanaCoin" /> <span>{(this.state.valueSolana / 10**9).toLocaleString(undefined, {maximumFractionDigits: 9})}</span></p>
                                    {this.state.notification.filter(x => !x.read).length > 0 ? <span className="bi bi-circle-fill text-danger notificationAlert"></span> : null}
                                    <DropdownButton size="sm" variant="bg-dark" className="forDropDown" title={<i className="bi bi-bell dots3"></i>} id="collasible-nav-dropdow">
                                        {
                                            this.state.notification.length > 0 ?
                                            <>
                                                <ReactTooltip id="notification-limit" type="dark">
                                                    If notifications more than 99 will be deleted automatically.
                                                </ReactTooltip>
                                                <span className="notificationCount" data-tip data-for="notification-limit"><span className="badge rounded-pill bg-primary">{this.state.notification.filter(x => !x.read).length}</span> Unread notifications</span>
                                                <span className="markAsRead" onClick={() => this.markAllReadUnread(this.state.notification.filter(x => !x.read).length === 0 ? false : true)}><i className="bi bi-check2-circle"></i> Mark all as {this.state.notification.filter(x => !x.read).length === 0 ? "unread" : "read"}</span>
                                                <div className="notifications overflowCustom">
                                                    {this.renderNotifications()}
                                                </div>
                                            </>
                                            : 
                                            <div className="text-center mt-5 mb-5 mx-1 p-2 notificationWarning">
                                                <i className="bi bi-journal-minus h1 text-primary pe-none"></i>
                                                <p className="text-dark">Oops, we can't find on-chain notification.</p>
                                                <p className="text-dark opacity-50">If there's a transaction related to this address, <br/> it will be displayed here.</p>
                                            </div>
                                        }
                                    </DropdownButton>
                                    <DropdownButton size="sm" variant="bg-dark" className="forDropDown" title={<i className="bi bi-three-dots-vertical dots3"></i>} id="collasible-nav-dropdow">
                                        <Dropdown.Item onClick={() => this.setChangeTheme(this.props.theme === "dark" ? "light" : "dark")}>
                                            <i className={`bi ${this.props.theme === "dark" ? "bi-brightness-high" : "bi-moon-stars"}`}></i>
                                            <span className="mx-2">{this.props.theme === "dark" ? "Light" : "Dark"} Mode</span>
                                        </Dropdown.Item>
                                        <Dropdown.Item onClick={() => this.setState({archive: this.state.archive ? false : true})}>
                                            <i className="bi bi-chat-dots"></i>
                                            <span className="mx-2">{this.state.archive ? "Hide" : "Show"} Archive</span>
                                        </Dropdown.Item>
                                        <Dropdown.Item onClick={() => this.setState({ settingsImport: true })}>
                                            <i className="bi bi-box-arrow-in-down"></i>
                                            <span className="mx-2">Import Chat</span>
                                        </Dropdown.Item>
                                        <Dropdown.Item onClick={() => this.setState({ settingsExport: true })}>
                                            <i className="bi bi-box-arrow-in-up"></i>
                                            <span className="mx-2">Export Chat</span>
                                        </Dropdown.Item>
                                        <Dropdown.Item onClick={() => this.props.toIPFS(true)}>
                                            <i className="bi bi-box"></i>
                                            <span className="mx-2">IPFS Storage</span>
                                        </Dropdown.Item>
                                        <Dropdown.Item onClick={() => this.setState({ settingsModal: true })}>
                                            <i className="bi bi-gear"></i>
                                            <span className="mx-2">Settings</span>
                                        </Dropdown.Item>
                                        <Dropdown.Item onClick={this.setDisconnect}>
                                            <i className="bi bi-box-arrow-in-left text-danger"></i>
                                            <span className="mx-2 text-danger">Disconnect</span>
                                        </Dropdown.Item>
                                    </DropdownButton>
                                </div>
                                <div className="searchInput">
                                    <input
                                    onChange={this.searchInputHandler}
                                    type="text"
                                    placeholder="Search User Here" 
                                    name="searchUser"
                                    />
                                </div>
                            </div>
                            <UserList statusSearchUser={this.state.statusSearchUser} lenSearchUser={this.state.lenSearchUser} searchUser={this.state.searchUser} archived={this.state.archive ? true : false} />
                        </div>
                        <div className={this.props.tab === "list" ? `rightSide d-none` : `rightSide d-block`}>
                            {
                                this.props.startingChat === ""  || this.props.startingChat === undefined ?
                                    <Starting theme={this.props.theme} />
                                : 
                                <UserChat />
                            }
                        </div>
                    </div>
                }
            </div>
        )
    }
}

const mapStateToProps = (state) => {
    return {
        tab: state.user.tab,
        theme: state.user.theme,
        startingChat: state.user.startingChat,
        notification: state.user.notification,
        notificationStatus: state.user.notificationStatus,
        absentStatus: state.user.absentStatus,
        standbyStatus: state.user.standbyStatus,
        onlineStatus: state.user.onlineStatus,
        addressBlock: state.user.addressBlock,
        ipfs: state.user.ipfs
    }
}

const mapDispatchToProps = {
    getTab,
    changeTheme,
    getMyAddress,
    getStartingChat,
    connection,
    broadcastToken,
    broadcastBlock,
    toIPFS
}

export default connect(mapStateToProps, mapDispatchToProps)(Home);