import React from "react";
import { connect } from "react-redux";
import {createToken, verifyToken} from "../helper/auth";
import {changeTheme, toIPFS} from "../redux/actions/getData";
import ReactTooltip from "react-tooltip";
import { Dropdown, DropdownButton, Modal, ProgressBar } from "react-bootstrap";
import Axios from "axios";
import { API_URL, iconFile, IPFS_GATEWAY } from "../constants/API";
import { saveAs } from "file-saver";
import chat3 from "../assets/img/chat3_black.png";
import "../assets/css/styles.css";

class IPFS extends React.Component {
  state = {
    modalUpload: false,
    statusUpload: false,
    addFolder: false,
    token: JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config"))).token,
    addressWallet: JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config"))).address,
    listFile: [],
    addFolderValue: "",
    positionX: 0,
    positionY: 0,
    fileRight: "",
    hashRight: "",
    uploadFileName: "",
    uploadFile: "",
    sort: "name-down",
    searchValue: "",
    limit: 0
  }

  setChangeTheme = (theme) => {
    const getConfig = JSON.parse(verifyToken("00000000000000000000000000000000000000000000", "config", localStorage.getItem("config")))
    this.props.changeTheme(theme)
    localStorage.setItem("config", createToken("00000000000000000000000000000000000000000000", "config", JSON.stringify({
        ...getConfig,
        theme: theme,
    })))
  }

  uploadFile = () => {
    let formData = new FormData();
    
    formData.append('address', this.state.addressWallet);
    formData.append('file', this.state.uploadFile);
    Axios.post(`${API_URL}/ipfs/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${this.state.token}`
      }
    })
    .then(response => {
      if(response.data.result){
        this.getListFolder(false)
        this.setState({
          uploadFile: "",
          uploadFileName: "",
          modalUpload: false
        })
      }
    })
    .catch(err => this.setState({errorMessage: "Disk usage exceeds the limit!"}))
  }

  delete = (hash) => {
    Axios({
      method: "POST",
      url: `${API_URL}/ipfs/delete`,
      headers: {
        'Authorization': `Bearer ${this.state.token}`
      },
      data:{
        address: this.state.addressWallet,
        hash,
      }
    })
    .then(response => {
      if(response.data.result){
        this.getListFolder(false);
      }
    })
  }

  restore = (hash) => {
    Axios({
      method: "POST",
      url: `${API_URL}/ipfs/restore`,
      headers: {
        'Authorization': `Bearer ${this.state.token}`
      },
      timeout: 5000,
      data:{
        address: this.state.addressWallet,
        hash,
      }
    })
    .then(response => {
      if(response.data.result){
        this.getListFolder(true);
      }
    })
    .catch(err => this.setState({errorMessage: "Disk usage exceeds the limit!"}))
  }

  changeSort = () => {
    const data = this.state.listFile;
    var sort = this.state.sort
    if(sort === "name-down"){
      data.sort((x,y)=> (x.name > y.name ? 1 : -1))
      sort = "name-up";
    }else if(sort === "name-up"){
      data.sort((x,y)=> (x.name < y.name ? 1 : -1))
      sort = "number-down";
    }else if(sort === "number-down"){
      data.sort((x,y)=> (x.date > y.date ? 1 : -1))
      sort = "number-up";
    }else if(sort === "number-up"){
      data.sort((x,y)=> (x.date < y.date ? 1 : -1))
      sort = "name-down";
    }
    this.setState({
      sort,
      listFile: data
    })
  }

  openFile = (name) => {
    console.log(name)
  }

  getListFolder = (trash) => {
    this.setState({
      pathNow: trash ? true : false,
      positionX: 0,
      positionY: 0,
      listFile: [],
      addFolder: false,
      renameFrom: "",
      renameValue: "",
      errorMessage: ""
    })
    Axios({
      method: "POST",
      url: `${API_URL}/ipfs/list`,
      headers: {
        'Authorization': `Bearer ${this.state.token}`
      },
      data:{
        address: this.state.addressWallet,
        trash
      }
    })
    .then(response => {
      if(response.data.result){
        var data = response.data.result;
        if(this.state.sort === "name-down"){
          data.sort((x,y)=> (x.name > y.name ? 1 : -1))
        }else if(this.state.sort === "name-up"){
          data.sort((x,y)=> (x.name < y.name ? 1 : -1))
        }else if(this.state.sort === "number-down"){
          data.sort((x,y)=> (x.date > y.date ? 1 : -1))
        }else if(this.state.sort === "number-up"){
          data.sort((x,y)=> (x.date < y.date ? 1 : -1))
        }
        this.setState({
          listFile: response.data.result
        })
      }else{
        this.setState({
          listFile: []
        })
      }
    })
  }

  getLimit = () => {
    Axios({
      method: "POST",
      url: `${API_URL}/ipfs/profile`,
      headers: {
        'Authorization': `Bearer ${this.state.token}`
      },
      data:{
        address: this.state.addressWallet
      }
    })
    .then(response => {
      this.setState({limit: response.data.result});
    })
  }

  componentDidMount(){
    this.getListFolder(false);
  }
  
  render() {
    return (
      <div className="ipfsDiv" data-theme={this.props.theme} onClick={() => this.setState({positionX: 0, positionY: 0})} onContextMenu={(e) => e.preventDefault()}>
        <div className={`position-absolute rounded bg-white ${this.state.positionX > 0 && this.state.positionY > 0 ? "d-block" : "d-none"}`} style={{"margin-top": this.state.positionY, "margin-left": this.state.positionX}}>
          {
            this.state.fileRight && this.state.hashRight ? 
              <>
              {
                this.state.pathNow ? 
                  null
                :
                <Dropdown.Item className="rounded" onClick={() => saveAs(`${IPFS_GATEWAY}/${this.state.hashRight}/${this.state.fileRight}`, this.state.fileRight)}>
                  <i className="bi bi-download"></i>
                  <span className="mx-2">Download</span>
                </Dropdown.Item>
              }
              <Dropdown.Item className="rounded text-danger" onClick={() => this.state.pathNow ? this.restore(this.state.hashRight) : this.delete(this.state.hashRight)}>
                <i className="bi bi-folder-x"></i>
                <span className="mx-2">{this.state.pathNow ? "Restore" : "Move to trash"}</span>
              </Dropdown.Item>
              </>
            : null
          }
        </div>
        <div className="menu">
          <img src={chat3} alt="Chat3.app" className="mx-auto" width="40" height="40" onClick={() => this.props.toIPFS(false)} />
          <div className={`mt-5 ${this.state.pathNow ? null : "ipfsMenuActive"}`} onClick={() => this.getListFolder(false)}>
            <i className="bi bi-folder iconMenu"></i><span className="titleMenu"> Home</span>
          </div>
          <div className={this.state.pathNow ? "ipfsMenuActive" : null} onClick={() => this.getListFolder(true)}>
            <i className="bi bi-trash iconMenu text-danger"></i><span className="titleMenu"> Trash</span>
          </div>
        </div>
        <div className="ipfsHeader">
          <Modal show={this.state.modalUpload} onHide={() => this.setState({ modalUpload: false, uploadFile: "", uploadFileName: "" })} centered>
            <Modal.Body className="modalUpload" data-theme={this.props.theme}>
              <p className="title"><i className="bi bi-upload font-weight-bold"></i> Upload File</p>
              <hr/>
              <p>Choose file or drag to upload</p>
              <div className="uploadDiv">
                {
                  this.state.uploadFileName ?
                    <span className="text-center">
                      {
                        iconFile.filter(x => x === this.state.uploadFileName.split(".")[this.state.uploadFileName.split(".").length - 1].toLowerCase()).length === 1 ?
                          <i className={`mx-2 bi bi-filetype-${this.state.uploadFileName.split(".")[this.state.uploadFileName.split(".").length - 1]}`}></i>
                        : <i className="bi bi-file-earmark mx-2"></i>
                      }
                      {this.state.uploadFileName}
                    </span>
                  : null
                }
                <input type="file" onChange={(e) => this.setState({uploadFileName: e.target.files[0].name, uploadFile: e.target.files[0]})}/>
              </div>
              <div className="w-100 text-center mt-3">
                  <button className="btn btn-success mx-2" onClick={this.uploadFile}>Upload</button>
              </div>
            </Modal.Body>
          </Modal>
          <i className="bi bi-search"></i>
          <input type="text" placeholder="Search in file name" value={this.state.searchValue} onChange={(e) => this.setState({ searchValue: e.target.value })} disabled={this.state.listFile.length > 0 ? false : true} />
          <i className="bi bi-plus" onClick={() => this.setState({modalUpload: true})}></i>
          <ReactTooltip id="theme-guide" type="dark">
              Switch to {this.props.theme === "light" ? "dark" : "light"} theme
          </ReactTooltip>
          <i className={`bi ${this.props.theme === "dark" ? "bi-brightness-high" : "bi-moon-stars"}`} data-tip data-for="theme-guide" onClick={() => this.setChangeTheme(this.props.theme === "dark" ? "light" : "dark")}></i>
          <ReactTooltip id="sort-guide" type="dark">
              Sort by {this.state.sort === "name-down" || this.state.sort === "number-up" ? "name" : "date"}
          </ReactTooltip>
          <i className={`bi ${this.state.sort === "name-down" ? "bi-sort-alpha-down-alt" : this.state.sort === "number-up" ? "bi-sort-alpha-down" : this.state.sort === "number-down" ? "bi-sort-numeric-down" : "bi-sort-numeric-down-alt"}`} data-tip data-for="sort-guide" onClick={this.changeSort}></i>
          <DropdownButton size="sm" variant="bg-dark" className="forDropDown" title={<i className="bi bi-person"></i>} id="collasible-nav-dropdow" onClick={this.getLimit}>  
            <div className="ipfsProfile">
              <ReactTooltip id="copy-address" type="dark">
                Click to copy
              </ReactTooltip>
              <img className="ipfsProfileImage" src={this.props.imageUrl} alt={this.props.addressWallet} />
              <span className="mx-2 ipfsProfileAddress" data-tip data-for="copy-address" onClick={() => {navigator.clipboard.writeText(this.state.addressWallet)}}>{this.state.addressWallet}</span>
              <Dropdown.Item className="rounded normalFont text-dark" onClick={() => alert("Plans coming soon!")}>
                <i className="bi bi-hdd"></i>
                <span className="mx-2">{parseFloat(this.state.limit/1000000).toLocaleString(undefined, {maximumFractionDigits: 3})} / 5GB <span className="badge bg-primary">Free Plan</span></span>
              </Dropdown.Item>
              <Dropdown.Item className="rounded normalFont text-danger" onClick={() => this.props.toIPFS(false)}>
                <i className="bi bi-grid-1x2"></i>
                <span className="mx-2">Back to home</span>
              </Dropdown.Item>
            </div>
          </DropdownButton>
        </div>
        <div className="ipfsBody overflowCustom">
          {
            this.state.pathNow ?
              <div className="alert bg-danger text-light">
                <b><i className="bi bi-exclamation"></i> Warning!</b> Permanent deletion will run every hour.
              </div>
            : null
          }
          {
            this.state.errorMessage ?
              <div className="alert bg-danger text-light">
                <b><i className="bi bi-exclamation"></i> Oops!</b> {this.state.errorMessage}
              </div>
            : null
          }
          <div className="row list">
            {
              this.state.listFile.map((file, i) => {
                return (
                  this.state.searchValue.length > 1 ?
                    file.name.toLowerCase().includes(this.state.searchValue) ?
                      <div className="col-6 col-md-4 col-lg-3 col-xl-2 mt-2" data-tip data-for={`file-name-${i}`} onContextMenu={(e) => parseInt(file.date)+3600 >= Math.floor(Date.now()/1000) && this.state.pathNow ? this.setState({positionX: e.pageX, positionY: e.pageY, fileRight: file.name, hashRight: file.hash}) : !this.state.pathNow ? this.setState({positionX: e.pageX, positionY: e.pageY, fileRight: file.name, hashRight: file.hash}) : null}>
                        <div className="fileList">
                            {
                              iconFile.filter(x => x === file.name.split(".")[file.name.split(".").length - 1].toLowerCase()).length === 1 ?
                                <i className={`bi bi-filetype-${file.name.split(".")[file.name.split(".").length - 1]}`}></i>
                              : <i className="bi bi-file-earmark"></i>
                            }
                            <p onClick={() => this.openFile(file.name)}>{file.name}</p>
                        </div>
                      </div>
                    : null
                  :
                  <div className="col-6 col-md-4 col-lg-3 col-xl-2 mt-2" data-tip data-for={`file-name-${i}`} onContextMenu={(e) => parseInt(file.date)+3600 >= Math.floor(Date.now()/1000) && this.state.pathNow ? this.setState({positionX: e.pageX, positionY: e.pageY, fileRight: file.name, hashRight: file.hash}) : !this.state.pathNow ? this.setState({positionX: e.pageX, positionY: e.pageY, fileRight: file.name, hashRight: file.hash}) : null}>
                    <div className="fileList">
                        {
                          iconFile.filter(x => x === file.name.split(".")[file.name.split(".").length - 1].toLowerCase()).length === 1 ?
                            <i className={`bi bi-filetype-${file.name.split(".")[file.name.split(".").length - 1]}`}></i>
                          : <i className="bi bi-file-earmark"></i>
                        }
                        <p onClick={() => this.openFile(file.name)}>{file.name}</p>
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
      theme: state.user.theme,
      addressWallet: state.user.myAddress,
  }
}

const mapDispatchToProps = {
  changeTheme,
  toIPFS,
}

export default connect(mapStateToProps, mapDispatchToProps)(IPFS);