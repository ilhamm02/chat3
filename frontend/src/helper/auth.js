import CryptoJS from "crypto-js";

export const createToken = (address, keyName, value) => {
  if(typeof value === "object"){
    value = JSON.stringify(value);
  }
  return CryptoJS.AES.encrypt(value, `${address} ${keyName}`).toString();
}

export const verifyToken = (address, keyName, token) => {
  return CryptoJS.AES.decrypt(token, `${address} ${keyName}`).toString(CryptoJS.enc.Utf8);
}