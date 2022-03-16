export const toIPFS = (val) => {
  return(dispatch) => {
    dispatch({
      type: "TO_IPFS",
      data: val
    })
  }
}

export const broadcastToken = (token) => {
  return(dispatch) => {
    dispatch({
      type: "BROADCAST_TOKEN",
      data: token
    })
  }
}

export const broadcastArchive = (address) => {
  return(dispatch) => {
    dispatch({
      type: "BROADCAST_ARCHIVE",
      data: address
    })
  }
}

export const broadcastBlock = (address) => {
  return(dispatch) => {
    dispatch({
      type: "BROADCAST_BLOCK",
      data: address
    })
  }
}

export const connection = (notification, absent, standby, online) => {
  return(dispatch) => {
    dispatch({
      type: "CONNECTION",
      data: {
        notification,
        absent,
        standby,
        online
      }
    })
  }
}

export const broadcastMessage = (message) => {
  return(dispatch) => {
    dispatch({
      type: "BROADCAST_MESSAGE",
      data: message
    })
  }
}

export const updateData = (val) => {
  return(dispatch) => {
    dispatch({
     type: "UPDATE_DATA",
     data: val
    })
   }
}

export const getTab = (position) => {
  return(dispatch) => {
   dispatch({
    type: "GET_POSITION",
    data: position
   })
  }
}

export const changeTheme = (theme) => {
  return(dispatch) => {
    dispatch({
      type: "CHANGE_THEME",
      data: theme
    })
  }
}

export const getStartingChat = (address) => {
  return(dispatch) => {
    dispatch({
      type: "GET_STARTING_CHAT",
      data: address
    })
  }
}

export const getMyAddress = (address) => {
  return(dispatch) => {
    dispatch({
      type: "GET_MY_ADDRESS",
      data: address
    })
  }
}