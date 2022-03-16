# About
## Original repo
- Front-end: https://github.com/azfarwisnu/Riptide-Solana-Hackathon
- Back-end: https://github.com/ilhamm02/riptide-hackathon-backend

# How to Install
1. Install Node.js (tested on v16.14.0)
2. Install NPM (tested on 8.3.1)

## Back-end
1. Build IPFS node and open port for gateway and API (If API in different location)
2. Go to back-end folder
3. Install all required modules
4. Create database with sqlite3
```
CREATE TABLE chat (id INTEGER PRIMARY KEY AUTOINCREMENT, sender VARCHAR(44) NOT NULL, receiver VARCHAR(44) NOT NULL, message TEXT NOT NULL, timestamp VARCHAR(10));
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, address VARCHAR(44) NOT NULL, photo TEXT, mint_address TEXT, socket_id text, last_online varchar(10), storage INT);
CREATE TABLE notification (id INTEGER PRIMARY KEY AUTOINCREMENT, address text NOT NULL, message text NOT NULL, tx text, title text, timestamp VARCHAR(10));
CREATE TABLE ipfs (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, name text NOT NULL, address varchar(44) NOT NULL, trash BOOL NOT NULL, date varchar(10) NOT NULL, size INT);
```
6. Create `.env` file. Which is contains
```
dbLocation = ${YOUR_DB_LOCATION}
KEY = ${BEARER_TOKEN_KEY}
ipfsEndpoint = ${IPFS_NODE}
```
5. Create temporary disrectory for uploading file to IPFS node. Named `temp`
6. Edit origin cors of socket on index.js with front-end ip/domain
7. Run

## Front-end
1. Edit `API_URL` and `IPFS_GATEWAY` variables on `src/contants/API.js` with your setup before
2. Install all required modules
3. Run `npm start` for develop mode or `npm run build` for product
