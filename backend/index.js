const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
const socketIO = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const CryptoJS = require('crypto-js');
const fileUpload = require('express-fileupload');
const bearerToken = require("express-bearer-token");
const { create } = require('ipfs-http-client');
const Axios = require('axios');
const fs = require('fs');
var bodyParser = require('body-parser');
dotenv.config();

const {sign, verify} = require('./helper/token');
const db = require('better-sqlite3')(process.env.dbLocation); // SQLite3 database directory

const io = socketIO(server, {
  cors: {
      origin: "http://192.168.100.163:3000",
      methods: ["GET", "POST"],
      transports: ['websocket', 'polling'],
      credentials: true
  },
  allowEIO3: true
});

app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use(bearerToken());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.io = io;

let connected = 0;
const ipfs = create(process.env.ipfsEndpoint)

function getRoomSize(address, namespace){ // Get how many user in a room
  const rooms = Array.from(io.of(namespace).adapter.rooms, ([address, id]) => ({ address, id })); // Map to array of rooms
  var listRoom = [];
  rooms.forEach(room => { // Convert to readable array
    if(typeof room === 'object') {
      if(room.address.length === 44){
        const size = [...room.id]
        listRoom.push({
          address: room.address,
          size: size.length
        })
      }
    }
  })
  if(listRoom.findIndex(room => room.address === address) > -1){
    return listRoom[listRoom.findIndex(room => room.address === address)].size 
  }else{
    return 0
  }
}

function uploadFile(filePath, directory, fileName){
  const uploading = ipfs.add({
    path: `${directory}/${fileName}`,
    content: fs.createReadStream(filePath)
  },
  {
    pin: true,
  })
  return uploading;
}

function deleteFile(hash){
  const deleting = Axios.post(`${process.env.ipfsEndpoint}/api/v0/pin/rm?arg=/ipfs/${hash}`)
  return deleting
}

function restoreFile(hash){
  const deleting = Axios.post(`${process.env.ipfsEndpoint}/api/v0/pin/add?arg=/ipfs/${hash}`)
  return deleting
}

app.post('/ipfs/list', (req, res) => {
  if(req.body.address && req.token){
    const decodedToken = verify(req.token);
    if(decodedToken.address === req.body.address && decodedToken.ip === req.headers['x-forwarded-for'] || req.socket.remoteAddress){
      const getFiles = db.prepare('SELECT * FROM ipfs WHERE address = ? AND trash = ?').all(req.body.address, req.body.trash ? 1 : 0);
      return res.status(200).send({
        result: getFiles
      })
    }else{
      return res.status(500).send({
        result: false
      })
    }
  }
})

app.post('/ipfs/delete', (req, res) => {
  if(req.body.address && req.token && req.body.hash){
    const decodedToken = verify(req.token);
    if(decodedToken.address === req.body.address && decodedToken.ip === req.headers['x-forwarded-for'] || req.socket.remoteAddress){
      deleteFile(req.body.hash)
      .then(result => {
        if(result.data.Pins){
          const query = db.prepare('UPDATE ipfs SET trash = ?, date = ? WHERE hash = ?');
          exec = query.run(1, parseInt(Math.floor(Date.now()/1000)), req.body.hash);
          return res.status(200).send({
            result: true
          })
        }else{
          return res.status(400).send({
            result: false
          })
        }
      })
    }
  }
})

app.post('/ipfs/restore', (req, res) => {
  if(req.body.address && req.token && req.body.hash){
    const decodedToken = verify(req.token);
    if(decodedToken.address === req.body.address && decodedToken.ip === req.headers['x-forwarded-for'] || req.socket.remoteAddress){
      const getTotalSize = db.prepare('SELECT sum(size) as size FROM ipfs WHERE address = ? AND trash = ?').all(req.body.address, 0);
      const getFileSize = db.prepare('SELECT sum(size) as size FROM ipfs WHERE hash = ?').all(req.body.hash);
      if(getTotalSize[0].size + getFileSize[0].size < 5000000) {
        restoreFile(req.body.hash)
        .then(result => {
          if(result.data.Pins){
            const query = db.prepare('UPDATE ipfs SET trash = ?, date = ? WHERE hash = ?');
            exec = query.run(0, parseInt(Math.floor(Date.now()/1000)), req.body.hash);
            return res.status(200).send({
              result: true
            })
          }else{
            return res.status(400).send({
              result: false
            })
          }
        })
      }else{
        return res.status(500).send({
          result: false,
          error: "Disk usage exceeds the limit!"
        })
      }
    }
  }
})

app.post('/ipfs/upload', (req, res) => {
  if(req.body.address && req.token && req.files){
    const decodedToken = verify(req.token);
    if(decodedToken.address === req.body.address && decodedToken.ip === req.headers['x-forwarded-for'] || req.socket.remoteAddress){
      const getTotalSize = db.prepare('SELECT sum(size) as size FROM ipfs WHERE address = ? AND trash = ?').all(req.body.address, 0);
      if(getTotalSize[0].size < 5000000) {
        const file = req.files.file;
        const fileName = file.name;
        const filePath = `temp/${req.body.address}${fileName}`;
        file.mv(filePath,async(err)=>{
          if(err){
            return res.status(500).send({
              result: false
            })
          }else{
            if(fs.statSync(filePath).size + getTotalSize[0].size < 5000000){
              uploadFile(filePath, req.body.directory, fileName)
              .then(data => {
                fs.unlink(filePath, (err => {
                  if(err){
                    return res.status(500).send({
                      result: false
                    })
                  }else{
                    if(data.cid && data.size){
                      const query = db.prepare('INSERT INTO ipfs (id, hash, name, address, trash, date, size) VALUES (?, ?, ?, ?, ?, ?, ?)');
                      exec = query.run(null, data.cid.toString(), fileName, req.body.address, 0, parseInt(Math.floor(Date.now()/1000)), data.size);
                      return res.status(200).send({
                        result: true
                      })
                    }else{
                      return res.status(200).send({
                        result: false,
                      })
                    }
                  }
                }));
              })
            }else{
              return res.status(500).send({
                result: false,
                error: "Disk usage exceeds the limit!"
              })
            }
          }
        });
      }else{
        return res.status(500).send({
          result: false,
          error: "Disk usage exceeds the limit!"
        })
      }
    }
  }
})

app.post('/ipfs/profile', (req, res) => {
  if(req.body.address && req.token){
    const decodedToken = verify(req.token);
    if(decodedToken.address === req.body.address && decodedToken.ip === req.headers['x-forwarded-for'] || req.socket.remoteAddress){
      const getTotalSize = db.prepare('SELECT sum(size) as size FROM ipfs WHERE address = ? AND trash = ?').all(req.body.address, 0);
      return res.status(200).send({
        result: getTotalSize[0].size ? getTotalSize[0].size : 0
      })
    }
  }
})

app.post('/sendMessage', (req, res) => { // Send message
  if(req.body.address && req.body.receiver && req.body.message && req.token){
    const decodedToken = verify(req.token);
    if(decodedToken.address === req.body.address && decodedToken.ip === req.headers['x-forwarded-for'] || req.socket.remoteAddress){
      if(getRoomSize(req.body.receiver, '/absent') > 0){ // Check if user online
        if(typeof req.body === 'object') {
          if(req.body.address.length === 44 && req.body.receiver.length === 44 && req.body.message.length > 0) {
            io.in(req.body.receiver).emit('newMessage', [{
              sender: req.body.address,
              receiver: req.body.receiver,
              message: req.body.message,
              timestamp: parseInt(Math.floor(Date.now()/1000))
            }]) // Broadcast new message to receiver
          }
        }
      }else{ // If user offline
        const query = db.prepare('INSERT INTO chat (id, sender, receiver, message, timestamp) VALUES (?, ?, ?, ?, ?)');
        query.run(null, req.body.address, req.body.receiver, req.body.message, parseInt(Math.floor(Date.now()/1000))); // Add message as unread message
      }
      return res.status(200).send({
        result: true
      }) // Callback response to sender
    }else{
      return res.status(400).send({
        result: false
      })
    }
  }else{
    res.status(400).send({
      result: false
    }) // Callback response to sender
  }
})

app.patch('/setImage', (req, res) => { // Set photo profile from NFT details
  if(req.body.address && req.body.mintAddress && req.body.imageUrl && req.token){
    const decodedToken = verify(req.token);
    if(decodedToken.address === req.body.address && decodedToken.ip === req.headers['x-forwarded-for'] || req.socket.remoteAddress){
      if(req.body.mintAddress === "empty"){
        req.body.mintAddress = null
      }
      if(req.body.imageUrl === "empty"){
        req.body.imageUrl = null
      }
      const query = db.prepare('UPDATE users SET photo = ?, mint_address = ? WHERE address = ?');
      exec = query.run(req.body.imageUrl, req.body.mintAddress, req.body.address);
      if(exec.changes === 1){
        io.of("/image").in(req.body.address).emit("newImage", [{
          address: req.body.address,
          imageUrl: req.body.imageUrl,
          mintAddress: req.body.mintAddress
        }])
        return res.status(200).send({
          result: true
        })
      }
    }
  }else{
    res.status(400).send({
      result: false
    })
  }
})

io.use((socket, next) => {
  if(socket.handshake.query && socket.handshake.query.token && socket.handshake.query.address){
    const decoded = CryptoJS.AES.decrypt(socket.handshake.query.token, socket.handshake.query.address).toString(CryptoJS.enc.Utf8)
    if(decoded === Math.floor(Date.now()/10000).toString()){
      next();
    }else{
      io.to(socket.id).emit('unauthorized', {error: "Authentication failed"})
    }
  }
}).on('connection', socket => { // Start connection
  connected++;
  console.log(`New connection. Total ${connected} connections.`);
  io.to(socket.id).emit('newToken', {token: sign(socket.handshake.query.address, socket.request.connection.remoteAddress)});
  socket.on('standby', data => { // Standby to receive new message
    if(typeof data === 'object'){
      if(data.address && data.token){
        const decoded = verify(data.token);
        if(decoded.address === data.address && decoded.ip === socket.handshake.address){
          socket.join(data.address);
          const getUnreadMessage = db.prepare('SELECT sender, receiver, message, timestamp FROM chat WHERE receiver = ?').all(data.address); // Get unread message for given address
          const queryDelete = db.prepare('DELETE FROM chat WHERE receiver = ?');
          queryDelete.run(data.address); // Delete unread message
          io.to(socket.id).emit('connected', {address: data.address})
          io.in(data.address).emit('newMessage', getUnreadMessage); // Send response or callback new unread message
        }
      }
    }
  })
  socket.on('disconnect', () => { // Disconnect from connection
    connected--;
    console.log(`Connection disconnected. Total ${connected} connections.`);
  });
})

io.of('/absent').on('connection', socket => { // Start connection for online check namespace
  socket.on('absent', data => { // Absent for user for online status
    if(typeof data === 'object') {
      if(data.address && data.token){
        const decoded = verify(data.token);
        if(decoded.address === data.address && decoded.ip === socket.handshake.address){
          if(data.address.length === 44){
            var exec;
            const getUsers = db.prepare('SELECT count(*) as total FROM users WHERE address = ?').all(data.address); // Get user
            if(getUsers[0].total === 1){
              const query = db.prepare('UPDATE users SET socket_id = ? WHERE address = ?');
              exec = query.run(socket.id, data.address); // Add message as unread message
            }else{
              const query = db.prepare('INSERT INTO users (id, address, socket_id, storage) VALUES (?, ?, ?, ?)');
              exec = query.run(null, data.address, socket.id, 0); // Add message as unread message
            }
            if(exec.changes === 1){
              socket.join(data.address);
              io.of('absent').to(socket.id).emit('connected', {address: data.address});
              io.of('/isOnline').in(data.address).emit('isOnline', {
                result: true
              })
            }
          }
        }
      }
    }
  })
  socket.on('disconnect', ()=>{
    const getId = db.prepare('SELECT address FROM users WHERE socket_id = ?').all(socket.id); // Get socket id by address
    const query = db.prepare('UPDATE users SET last_online = ? WHERE socket_id = ?');
    exec = query.run(parseInt(Math.floor(Date.now()/1000)), socket.id); // Update the last online timestamp
    if(getId[0]){
      if(getId[0].address){
        io.of('/isOnline').in(getId[0].address).emit('isOnline', {
          result: false
        })
      }
    }
  })
})

io.of('/isOnline').on('connection', socket => {
  socket.on('check', data => { // Get online status for a user
    if(typeof data === "object"){
      if(data.address.length === 44){
        const decoded = verify(data.token);
        socket.leave(data.lastAddress);
        socket.join(data.address);
        if(getRoomSize(data.address, '/absent') > 0){
          io.of('/isOnline').to(socket.id).emit('isOnline', {
            result: true // User is online
          });
        }else{
          io.of('/isOnline').to(socket.id).emit('isOnline', {
            result: false // User is offline
          });
        }
      }
    }
  })
})

io.of('/notification').on('connection', socket => {
  socket.on('admin', data => {
    if(typeof data === 'object'){
      if(data.address && data.tx && data.title && data.message && data.timestamp){
        const getUsers = db.prepare('SELECT count(*) as total FROM users WHERE address = ?').all(data.address); // Get user
        if(getUsers[0].total === 1){
          if(getRoomSize(data.address, "/absent") > 0){
            io.of('/notification').in(data.address).emit('push', [{ 
              tx: data.tx,
              title: data.title,
              message: data.message,
              timestamp: data.timestamp
            }])
          }else{
            const query = db.prepare('INSERT INTO notification (id, address, message, tx, title, timestamp) VALUES (?, ?, ?, ?, ?, ?)');
            exec = query.run(null, data.address, data.message, data.tx, data.title, data.timestamp);
          }
        }
      }
    }
  })
  socket.on('standby', data => {
    if(typeof data === 'object'){
      if(data.address && data.token){
        if(data.address.length === 44){
          const decodedToken = verify(data.token);
          if(decodedToken.address === data.address && decodedToken.ip === socket.handshake.address){
            socket.join(data.address);
            const getNotifications = db.prepare('SELECT message, tx, title, timestamp FROM notification WHERE address = ?').all(data.address);
            const queryDelete = db.prepare('DELETE FROM notification WHERE address = ?');
            queryDelete.run(data.address);
            io.of('/notification').to(socket.id).emit('connected', {address: data.address})
            io.of('/notification').in(data.address).emit('push', getNotifications)
          }
        }
      }
    }
  })
})

io.of('/image').on('connection', socket => {
  socket.on('standby', data => {
    if(typeof data === 'object'){
      if(data.length > 0){
        var imageList = [];
        data.forEach(images => {
          if(images.address){
            const getImage = db.prepare('SELECT photo as imageUrl, mint_address as mintAddress FROM users WHERE address = ?').all(images.address);
            if(data.length === 1 && images.lastAddress){
              socket.leave(images.lastAddress);
            }
            socket.join(images.address);
            imageList.push({
              address: images.address,
              imageUrl: getImage.length > 0 ? getImage[0].imageUrl : null,
              mintAddress: getImage.length > 0 ? getImage[0].mintAddress : null
            });
          }
        })
        io.of("/image").to(socket.id).emit("newImage", imageList);
      }
    }
  })
})

server.listen(2200, () => {
  console.log('Socket server is running!')
});