const init_state = {
    tab: "",
    theme: "",
    startingChat: "",
    myAddress: "",
    changed: false,
    newMessage: "",
    notification: [],
    notificationStatus: false,
    absentStatus: false,
    standbyStatus: false,
    onlineStatus: false,
    token: "",
    addressBlock: "",
    addressArchive: "",
    ipfs: false
}

const reducer = (state = init_state, action) => {
    switch(action.type) {
        case "GET_POSITION":
            return {...state, tab: action.data}
        case "CHANGE_THEME":
            return {...state, theme: action.data}
        case "GET_STARTING_CHAT":
            return {...state, startingChat: action.data}
        case "GET_MY_ADDRESS":
            return {...state, myAddress: action.data}
        case "UPDATE_DATA":
            return {...state, changed: action.data}
        case "BROADCAST_MESSAGE":
            return {...state, newMessage: action.data}
        case "CONNECTION":
            return {...state, notificationStatus: action.data.notification, absentStatus: action.data.absent, standbyStatus: action.data.standby, onlineStatus: action.data.online}
        case "BROADCAST_TOKEN":
            return {...state, token: action.data}
        case "BROADCAST_BLOCK":
            return {...state, addressBlock: action.data}
        case "BROADCAST_ARCHIVE":
            return {...state, addressArchive: action.data}
        case "TO_IPFS":
            return {...state, ipfs: action.data}
        default:
            return state
    }
}

export default reducer;