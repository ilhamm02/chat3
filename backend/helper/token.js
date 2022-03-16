const jwt = require('jsonwebtoken');;
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  sign: (address, ip) => {
    return jwt.sign({
      address,
      ip,
    }, process.env.KEY, {
      expiresIn: "24h"
    })
  },
  verify: (token) => {
    return jwt.verify(token, process.env.KEY, (err, decoded) => {
      if(err){
        return false
      }else{
        return decoded
      }
    })
  }
}