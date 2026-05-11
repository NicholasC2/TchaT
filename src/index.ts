import { Config, defaultConfig } from "./config.js"
import { WebSocketServer } from "ws"

import { User, Profile } from "./user.js"
import { Message_Type, Socket_Close_Reason } from "./TchaT-common.js"

import pg from "pg"
import dotenv from "dotenv"

dotenv.config();

const { Pool } = pg;

const db = new Pool({
    connectionString: process.env.DATABASE_URL
})

const result = await db.query("SELECT NOW()");

console.log(result.rows);

console.log("Starting TchaT server...")

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
    console.log(`Server listening on port ${config.getPort()}`)
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