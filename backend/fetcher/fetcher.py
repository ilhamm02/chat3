from http.client import responses
import requests, time, datetime
from colorama import Fore, Style
import socketio

sio = socketio.Client()
sio.connect("http://localhost:2200", namespaces=["/notification"])

url = "https://api.mainnet-beta.solana.com";
setHeaders = {"Content-Type": "application/json"}
dataParams = 122727237
while True:
   rawData = {
      "jsonrpc": "2.0",
      "id":1,
      "method":"getBlock",
      "params":[
         dataParams, 
         {
            "encoding": "json",
            "transactionDetails":"full",
            "rewards": False
         }
      ]
   }

   responseStatus = requests.post(url, headers=setHeaders, json=rawData)
   response = responseStatus.json()
   
   if "error" in response:
      print(f"{Fore.RED}block not found {Style.RESET_ALL}", dataParams)
      time.sleep(18)
      dataParams += 1
      continue
    
   print(f"{Fore.GREEN}bot keep running on block {Style.RESET_ALL}", dataParams)
   dataParams += 1
   #get anything from transactions result
   getTransactions = response["result"]["transactions"]
   blockTime = response["result"]["blockTime"]
   
   #loop all transaction in this blocks
   for tx in range(len(getTransactions)):
      #get postbalances, prebalances, account keys
      if getTransactions[tx]["meta"]["err"] == None:
         txid = getTransactions[tx]["transaction"]["signatures"][0]
         if len(getTransactions[tx]["meta"]["postBalances"]) > 0 and len(getTransactions[tx]["meta"]["preBalances"]) > 0:
            for sol in range(len(getTransactions[tx]["meta"]["preBalances"])):
               preBalance = getTransactions[tx]["meta"]["preBalances"][sol]
               postBalance = getTransactions[tx]["meta"]["postBalances"][sol]
               if preBalance != postBalance:
                  accountKey = getTransactions[tx]["transaction"]["message"]["accountKeys"][sol]
                  sio.emit('admin', {
                     "address": accountKey,
                     "tx": txid,
                     "title": "Your SOL balance was changed!",
                     "message": f"{preBalance/10**9:9f} SOL to {postBalance/10**9:9f} SOL",
                     "timestamp": blockTime
                  }, namespace='/notification')
            
         if len(getTransactions[tx]["meta"]["postTokenBalances"]) > 0 and len(getTransactions[tx]["meta"]["preTokenBalances"]) > 0:
            for token in range(len(getTransactions[tx]["meta"]["preTokenBalances"])):
               preAmount = getTransactions[tx]["meta"]["preTokenBalances"][token]["uiTokenAmount"]["uiAmountString"]
               try:
                  postAmount = getTransactions[tx]["meta"]["postTokenBalances"][token]["uiTokenAmount"]["uiAmountString"]
               except IndexError:
                  postAmount = ""
               if preAmount != postAmount:
                  mintAddress = getTransactions[tx]["meta"]["preTokenBalances"][token]["mint"]
                  try:
                     accountKey = getTransactions[tx]["meta"]["preTokenBalances"][token]["owner"]               
                  except KeyError:
                     accountKey = ""
                  
                  if accountKey != "" and postAmount != "":
                     sio.emit('admin', {
                        "address": accountKey,
                        "tx": txid,
                        "title": f"Your token balance was changed!",
                        "message": f"{preAmount} {mintAddress} to {postAmount} {mintAddress}",
                        "timestamp": blockTime
                     }, namespace='/notification')
       
   time.sleep(5)