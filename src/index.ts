import { Config, defaultConfig } from "./config.js"
import { WebSocketServer } from "ws"

import { User, Profile } from "./user.js"
import { Message_Type, Socket_Close_Reason } from "./messageTypes.js"

import dotenv from "dotenv"
import Database from "better-sqlite3";

dotenv.config();

console.log("Starting TchaT server...");

console.log("Initializing DB...");
const db = new Database("tchat.db");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        public_key TEXT NOT NULL,
        display_name TEXT,
        profile_image_url TEXT,
        bio TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        author TEXT NOT NULL,
        encrypted_content TEXT NOT NULL,
        created_at INTEGER NOT NULL,

        FOREIGN KEY(author) REFERENCES users(username)
    );

    CREATE TABLE IF NOT EXISTS message_keys (
        message_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        encrypted_key TEXT NOT NULL,

        PRIMARY KEY(message_id, username),

        FOREIGN KEY(message_id) REFERENCES messages(id),
        FOREIGN KEY(username) REFERENCES users(username)
    );
`); // create users and messages table if it does not exist

console.log(db)

let config = defaultConfig;

try {
    config = Config.readConfig("./config.json");
} catch(err) {
    console.warn("No config found, using default.");
}

const server = new WebSocketServer({
    port: config.getPort()
})

server.on("listening", ()=>{
    console.log(`Server running at ws://localhost:${config.getPort()}`)
})

server.on("connection", (socket, req)=>{
    const timestamp = Date.now();

    console.log(`Client Connected: ${req.socket.remoteAddress}`)

    let heartbeatTime = timestamp

    socket.on("message", (rawMessage)=>{
        const parsed = JSON.parse(rawMessage.toString());

        const type = parsed.t;
        const data = parsed.d;

        if(type !instanceof Number) throw new Error();
        
        heartbeatTime = timestamp

        switch(type) {
            case Message_Type.NONE: {
                break;
            }

            case Message_Type.CREATE_ACCOUNT: {
                const { username, publicKey, profileInfo } = data;
                const { displayName, profileImageURL, bio } = profileInfo

                const newUser = new User(new Profile(displayName, profileImageURL, bio), username, publicKey);

                
            }
        }

        console.log(parsed);
    })

    const interval = setInterval(()=>{
        if(heartbeatTime + 30000 < timestamp) {
            socket.close(Socket_Close_Reason.HEARTBEAT_TIMEOUT);
        }
    }, 5000)

    socket.on("close", ()=>{
        clearInterval(interval);
        console.log(`Client Disconnected: ${req.socket.remoteAddress}`)
    })
})