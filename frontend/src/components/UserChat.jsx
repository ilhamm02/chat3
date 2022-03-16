import React from "react";
import "../assets/css/styles.css";
import { connect } from "react-redux";
import { getTab, updateData, broadcastMessage, connection, broadcastBlock, broadcastArchive } from "../redux/actions/getData";
import moment from "moment";
import ReactTooltip from "react-tooltip";
import { Dropdown, DropdownButton, Modal } from "react-bootstrap";
import io from "socket.io-client";
import {API_URL} from '../constants/API';
import InputEmoji from "react-input-emoji";
import Axios from "axios";
import {createToken, verifyToken} from "../helper/auth";
import defaultImage from "../assets/img/defaultImage.jpg";
import { Connection, programs } from '@metaplex/js';

const { metadata: { Metadata } } = programs;

class UserChat extends React.Component{
  constructor(props){
    super(props);
    this.state = {
      unread: 0,
      message: [],
      name: [],
      value: [],
      text: "",
      token: localStorage.getItem("config") ? JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config"))).token : null,
      statusSearchMsg: false,
      searchMsgUser: "",
      statusBlock: false,
      statusArchive: false,
      settingsNftList: false,
      nftList: [],
      maxPage: 0,
      myImage: defaultImage,
      imageUrl: defaultImage
    }

    this.renderLocalStorage = this.renderLocalStorage.bind(this);
    this.getOnline = this.getOnline.bind(this);
  }

  toListUser = () => {
    this.props.getTab("list")
    this.setState({unread: 0, statusSearchMsg: false, searchMsgUser: ""})
  }

  searchUserHandler = (event) => {
    this.setState({searchMsgUser: event.target.value})
  }

  directSearch = (index) => {
    const searchDiv = this.refs[`chatMessage${index}`];
    var chatBox = this.refs.chatBox;
    chatBox.scrollTop = searchDiv.offsetTop-100;
    this.setState({statusSearchMsg: false})
  }

  renderSearch = () => {
    let searchMsg = this.state.searchMsgUser.toLowerCase();
    var searchList = [];
    this.state.message.forEach((msg, i) => {
      if(msg.message.toLowerCase().includes(searchMsg)){
        searchList.push(
          <div className="searchList" onClick={() => this.directSearch(i)}>
            <span>{msg.timestamp >= Math.floor(Date.now()/1000)-86400 ? moment.unix(msg.timestamp).format("HH:ss") : msg.timestamp >= Math.floor(Date.now()/1000)-31536000 ? moment.unix(msg.timestamp).format("DD/MM") : moment.unix(msg.timestamp).format("DD/MM/YY")}</span>
            <p className="addressSearch">{msg.sender === this.props.addressWallet ? "You" : `${msg.sender.substring(0, 10)}...${msg.sender.substring(34, 44)}`}</p>
            <p className="messageSearch">{msg.message}</p>
          </div>
        )
      }
    })
    return searchList.reverse();
   }

  renderLocalStorage = () => {
   if(localStorage.getItem("unreadMessage") !== null) {
      var unread = JSON.parse(verifyToken(this.props.addressWallet, "unreadMessage", localStorage.getItem('unreadMessage')));
      var message = [];
      if(localStorage.getItem(this.props.startingChat)){
        message = JSON.parse(verifyToken(this.props.addressWallet, this.props.startingChat, localStorage.getItem(this.props.startingChat)));
      }
      this.setState({
        unread: unread !== null ? unread.filter(message => message.sender === this.props.startingChat).length : 0,
        message: message.concat(unread.filter(message => message.sender === this.props.startingChat))
      })
      localStorage.setItem(this.props.startingChat, createToken(this.props.addressWallet, this.props.startingChat, JSON.stringify(message.concat(unread.filter(message => message.sender === this.props.startingChat)))));
      unread = unread.filter(message => message.sender !== this.props.startingChat);
      localStorage.setItem('unreadMessage', createToken(this.props.addressWallet, "unreadMessage", JSON.stringify(unread)));
    } 
  }

  getOnline = () => {
    const socket = io.connect(`${API_URL}/isOnline`, {
      'reconnection': true,
      'reconnectionDelay': 500,
    });
    socket.emit('check', { address: this.props.startingChat, lastAddress: this.state.lastAddress, token: this.state.token});
    socket.on('connect', () => {
      this.props.connection(this.props.notificationStatus, this.props.absentStatus, this.props.standbyStatus, true);
    })
    socket.on('isOnline', data => {
      this.setState({
        online: data.result ? true : false
      })
    })
    socket.on('disconnect', () => {
      this.props.connection(this.props.notificationStatus, this.props.absentStatus, this.props.standbyStatus, false);
    })
    const image = io.connect(`${API_URL}/image`);
    image.emit("standby", [{address: this.props.startingChat, lastAddress: this.state.lastAddress}]);
    image.emit("standby", [{address: this.props.addressWallet}]);
    image.on("newImage", data => {
      if(data.length > 0) {
        if(data[0].address === this.props.addressWallet){
          this.setState({
            myImage: data[0].imageUrl ? data[0].imageUrl : defaultImage,
            myMintAddress: data[0].mintAddress ? data[0].mintAddress : ""
          })
        }else{
          this.setState({
            imageUrl: data[0].imageUrl ? data[0].imageUrl : defaultImage,
            mintAddress: data[0].mintAddress ? data[0].mintAddress : ""
          })
        }
      }
    })
  }

  renderMessage = (data, i) => {
    if(typeof data === 'object'){
      return (
        data.sender === this.props.addressWallet ?
          <div className="you mx-3 flexBox" ref={`chatMessage${i}`}>
            <div className="mx-3">
              <div>
                <b>You</b>
                <br />
                <p>{data.message}</p>
              </div>
            </div>
            <img src={this.state.myImage} alt="photo_profile" className="mx-4" /> 
            <span>{moment.unix(data.timestamp).format("HH:mm")}</span>
            <i className="bi bi-circle-fill"></i>
            <i className="bi bi-check text-muted"></i>
          </div>
        : data.sender !== this.props.addressWallet ?
          <div className="opponent mx-3" ref={`chatMessage${i}`}>
            <img src={this.state.imageUrl} alt="photo_profile" onClick={() => this.setState({settingsNftList: true})} />
            <span>{moment.unix(data.timestamp).format("HH:mm")}</span>
            <div className="mx-3">
              <div>
                <b>{data.sender}</b> 
                <br />
                <p>{data.message}</p>
              </div>
            </div>
          </div>
        : null
      )
    }
  }

  getTextInput = (text) => {
    Axios({
      method: "POST",
      url: `${API_URL}/sendMessage`,
      headers: {
          'Authorization': `Bearer ${this.state.token}`
      },
      data:{"address":this.props.addressWallet, "receiver": this.props.startingChat, "message": text}
    })
    .then(result =>{
      if(result.data.result){
        var getMessages = this.state.message;
        getMessages.push({
          sender: this.props.addressWallet,
          message: text,
          timestamp: parseInt(Math.floor(Date.now()/1000))
        })
        this.setState({messages: getMessages});
        localStorage.setItem(this.props.startingChat, createToken(this.props.addressWallet, this.props.startingChat, JSON.stringify(getMessages)));
        const socket = io.connect(`${API_URL}/image`)
        socket.emit("standby", [{address: this.props.startingChat}])
        socket.on("newImage", data => {
          if(data.length > 0){
            var image = data.filter(x => x.address === this.props.startingChat)[0];
            var opponentList = JSON.parse(verifyToken(this.props.addressWallet, "opponentList", localStorage.getItem("opponentList"))).filter(val => val.address !== this.props.startingChat);
            opponentList.unshift({
              address: this.props.startingChat,
              timestamp: parseInt(Math.floor(Date.now()/1000)),
              block: false,
              archive: false,
              imageUrl: image.imageUrl ? image.imageUrl : defaultImage,
              mintAddress: image.mintAddress ? image.mintAddress : ""
            })
            localStorage.setItem('opponentList', createToken(this.props.addressWallet, "opponentList",JSON.stringify(opponentList)))
            this.props.updateData(this.props.changed ? false : true)
            this.setState({ unread: 0 })
          }
        })
      }
    })

    this.setState({
      text: ""
    })
  }

  chatInputHandler = (e) => {
    this.setState({
      text: e
    })
  }

  fetchArchive = (status) => {
    if(localStorage.getItem('opponentList') !== null){
      let getOpponentList = JSON.parse(verifyToken(this.props.addressWallet, "opponentList", localStorage.getItem("opponentList")))

      const filterUserBlockir = getOpponentList.findIndex(val => val.address === this.props.startingChat)
      if(filterUserBlockir >- 1){
        getOpponentList[filterUserBlockir].archive = status ? true : false
        this.setState({statusArchive: status ? true : false})
      }
      this.props.broadcastArchive("")
      this.props.broadcastArchive(this.props.startingChat);
      localStorage.setItem('opponentList', createToken(this.props.addressWallet, "opponentList", JSON.stringify(getOpponentList)))
    }
  }

  fetchBlock = (status) => {
    if(localStorage.getItem("opponentList") !== null) {
      let getOpponentList = JSON.parse(verifyToken(this.props.addressWallet, "opponentList", localStorage.getItem("opponentList")))

      const filterUserBlockir = getOpponentList.findIndex(val => val.address === this.props.startingChat)
      if(filterUserBlockir > -1){
        getOpponentList[filterUserBlockir].block = status ? true : false
        this.setState({statusBlock: status ? true : false})
      }
      this.props.broadcastBlock(this.props.addressBlock.length === 44 ? "" : this.props.startingChat);
      localStorage.setItem('opponentList', createToken(this.props.addressWallet, "opponentList", JSON.stringify(getOpponentList)))
    }
  }

  fetchInputArchive = () => {
    if(localStorage.getItem("opponentList")){
      let getOpponentList = JSON.parse(verifyToken(this.props.addressWallet, "opponentList", localStorage.getItem("opponentList")))
      if(getOpponentList.findIndex(val => val.address === this.props.startingChat) > -1){
        if(getOpponentList.filter(val => val.address === this.props.startingChat)[0].archive){
          this.setState({statusArchive: true})
        } else {
          this.setState({statusArchive: false})
        }
      }else{
        this.setState({statusArchive: false})
      }
    }
  }

  fetchInputBlock = () => {
    if(localStorage.getItem("opponentList")){
      let getOpponentList = JSON.parse(verifyToken(this.props.addressWallet, "opponentList", localStorage.getItem("opponentList")))
      if(getOpponentList.findIndex(val => val.address === this.props.startingChat) > -1){
        if(getOpponentList.filter(val => val.address === this.props.startingChat)[0].block){
          this.setState({statusBlock: true})
        } else {
          this.setState({statusBlock: false})
        }
      } else {
        this.setState({statusBlock: false})
      }
    }
  }

  fetchNftList = () => {
    const connection = new Connection("mainnet-beta")
    Metadata.findDataByOwner(connection, this.props.startingChat)
    .then(ntfs => {
      var nftList = []
      ntfs.forEach(ntfs => {
        Axios.get(ntfs.data.uri)
        .then(imageNft => {
          nftList.push({
            image: imageNft.data.image,
            name: imageNft.data.name,
            description: imageNft.data.description,
            mintAddress: ntfs.mint,
          })
        })
      })
      this.setState({nftList})
    })
  }


  componentDidMount(){  
    this.fetchNftList()
    this.getOnline();
    this.renderLocalStorage();
    this.setState({lastAddress: this.props.startingChat});
    this.fetchInputBlock();
    this.fetchInputArchive();
  }

  componentDidUpdate(prevProps, prevState) {
    if(this.state.text.length === 0 && this.state.searchMsgUser.length === 0){
      var el = this.refs.chatBox;
      el.scrollTop = el.scrollHeight;
    }
    if(prevProps.newMessage !== this.props.newMessage && this.props.newMessage !== ""){
      this.renderLocalStorage();
      this.setState({
        unread: 0
      })
      this.props.broadcastMessage("");
    }
    if(prevProps.startingChat !== this.props.startingChat){
      this.setState({
        statusSearchMsg: false,
        searchMsgUser: ""
      })
      this.fetchNftList()
      this.getOnline();
      this.renderLocalStorage();
      this.fetchInputBlock();
      this.fetchInputArchive();
    }
  }
  
  render(){
      return(
        <>
        {/* modal nftlist */}
        <Modal show={this.state.settingsNftList} onHide={() => this.setState({settingsNftList: false })} centered>
          <Modal.Body className="settingsModal" data-theme={this.props.theme}>
            <div className="col-12 col-md-12">
              <div className="d-flex">
                <img src={this.state.imageUrl} alt="photoProfileChat" className="imgProfile border border-1" />
                <div className="mx-2 mt-1 col-10 col-md-10 text-truncate">
                  <strong>Address</strong>
                  <br />
                  <span className="normalFont">{this.props.startingChat}</span>
                </div>
              </div>
              <hr />
              <div className="col-12 col-md-12 bodyNft">
                <div className="row">
                  {
                    this.state.nftList.length > 0 ?
                      this.state.nftList.slice(0,48).map(val => {
                        return(
                          <div className="col-3 col-md-3">
                            <div className="text-center">
                              <a href={`https://magiceden.io/item-details/${val.mintAddress}`} target="_blank" rel="noreferrer">
                                <img src={val.image} alt={val.name} className="rounded" />
                              </a>
                              <p className="normalFont mt-2">{val.name}</p>
                            </div>
                          </div>
                        )
                      })
                    : <p className="text-muted">No NFT found at this address</p>
                  }
                </div>
              </div>
              {
                this.state.nftList.length > 48 ?
                  <div className="text-center mt-3">
                    <a href={`https://solanart.io/user/${this.props.startingChat}`} target="_blank" rel="noreferrer"><button className="btn btn-primary rounded">Show More</button></a>
                  </div>
                  : null
              }
            </div>
          </Modal.Body>
        </Modal>
        <ReactTooltip id="online-text" type="dark">
          {
            this.state.online ?
              "Online"
            : "Offline"
          }
        </ReactTooltip>
        <ReactTooltip id="copy-text" type="dark">
          Click to copy
        </ReactTooltip>
        <div className="row">
          <div className="rightBox" data-theme={this.props.theme}>
            <div className={`searchBox shadow-sm ${this.state.statusSearchMsg ? "d-block" : "d-none"}`}>
              <div className="headerSearch">
                <span onClick={() => this.setState({statusSearchMsg: false, searchMsgUser: ""})}><i className="bi bi-x"></i> Close</span>
                <input type="text" placeholder="Input some message..." value={this.state.searchMsgUser} onChange={this.searchUserHandler} />
              </div>
              <div className="listSearch overflowCustom">
                {
                  this.state.searchMsgUser.length > 1 ?
                    this.renderSearch()
                  : <div className="text-center mt-3">
                      <p className="text-muted normalFont">Search Messages</p>
                    </div>
                }
              </div>
            </div>
            <div className="flexBox chatHead shadow-sm">
              <i className="bi bi-arrow-left" onClick={this.toListUser} type="button"></i>
              <img src={this.state.imageUrl} alt="photoProfileChat" onClick={() => this.setState({settingsNftList: true})} />
              <i className="bi bi-record-circle-fill"></i>
              <i className={`bi bi-circle-fill ${this.state.online ? 'text-success' : 'text-muted'}`} data-tip data-for="online-text"></i>
              <span data-tip data-for="copy-text" onClick={() => {navigator.clipboard.writeText(this.props.startingChat)}}>{this.props.startingChat}</span>
              <div className="d-flex float-right">
                <i className="bi bi-search iconSearch mt-1" onClick={() => this.setState({statusSearchMsg: true})}></i>
                <DropdownButton size="sm" variant="bg-dark" className="forDropDown" title={<i className="bi bi-three-dots-vertical dots3"></i>} id="collasible-nav-dropdow">  
                  <Dropdown.Item  onClick={() => this.state.statusBlock === false ? this.fetchBlock(true) : this.fetchBlock(false)}>
                    <i className={this.state.statusBlock === false ? `bi bi-send-dash` : `bi bi-send-check`}></i>  
                    <span className="mx-2">{this.state.statusBlock === false ? `Block` : `Unblock`}</span>
                  </Dropdown.Item>
                  {
                    !this.state.statusBlock?
                      <Dropdown.Item onClick={() => this.state.statusArchive === false ? this.fetchArchive(true) : this.fetchArchive(false)}>
                        <i className="bi bi-list-nested"></i>
                        <span className="mx-2">{this.state.statusArchive === false ? `Archive` : `Unarchive`}</span>
                      </Dropdown.Item>
                    : null
                  }
                  <Dropdown.Item onClick={() => this.setState({ settingsNftList: true })}>
                    <i className="bi bi-person"></i>
                    <span className="mx-2">Address Profile</span>
                  </Dropdown.Item>
                </DropdownButton>
              </div>
            </div>
              {/* box chat sender */}    
            <div className="bubbleChatBox overflowCustom mt-3" ref="chatBox">
              {
                this.state.message ?
                  this.state.message.length > 0 ?
                    this.state.message.map((val, i, arr) => {
                      return(
                        <>
                        {
                          i > 0 ?
                            moment.unix(arr[i-1].timestamp).format("DD") === moment.unix(val.timestamp).format("DD") ?
                              null
                            : 
                            <div className="w-100 text-center mb-2 mt-2">
                              <span className="badge bg-secondary rounded-pill text-center">{moment.unix(val.timestamp).format("DD MMM YYYY")}</span>
                            </div>
                          :
                          <div className="w-100 text-center mb-2 mt-2">
                            <span className="badge bg-secondary rounded-pill">{moment.unix(val.timestamp).format("DD MMM YYYY")}</span>
                          </div>
                        }
                        {
                          i === this.state.message.length-this.state.unread && this.state.unread > 0 ?
                            <>
                            <div className="w-100 text-center mb-1">
                              <span className="badge rounded-pill bg-danger">{this.state.unread} New message</span>
                            </div>
                            {this.renderMessage(val, i)}
                            </>
                          : this.renderMessage(val, i)
                        }
                        </>
                      );
                    })
                  : null
                : null
              }
            </div>
            <div className={`inputChat flexBox ${this.state.statusBlock ? `d-none` : `d-block`}`}>
              <InputEmoji
              value={this.state.text}
              onChange={(e) => this.chatInputHandler(e)}
              cleanOnEnter
              onEnter={()=> this.getTextInput(this.state.text)}
              placeholder="Type a message, enter for send"
              />
            </div>
          </div>
        </div>
        </>
      )
  }
}


const mapStateToProps = (state) => {
  return {
    tab: state.user.tab,
    startingChat: state.user.startingChat,
    addressWallet: state.user.myAddress,
    changed: state.user.changed,
    newMessage: state.user.newMessage,
    notificationStatus: state.user.notificationStatus,
    absentStatus: state.user.absentStatus,
    standbyStatus: state.user.standbyStatus,
    onlineStatus: state.user.onlineStatus,
    addressBlock: state.user.addressBlock,
    theme: state.user.theme,
  }
}

const mapDispatchToProps = {
  getTab,
  updateData,
  broadcastMessage,
  connection,
  broadcastBlock,
  broadcastArchive
}

export default connect(mapStateToProps, mapDispatchToProps)(UserChat);