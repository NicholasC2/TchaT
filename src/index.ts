import { Account, Session } from "ts-accountd"
import { Config, defaultConfig } from "./config.js"
import { WebSocketServer } from "ws"

import { Message_Type, Socket_Close_Reason } from "./message_helper.js"

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

server.on("connection", (socket)=>{
    let heartbeatTime = Date.now()

    socket.on("message", (rawMessage)=>{
        const parsed = JSON.parse(rawMessage.toString());

        const type = parsed.t;
        const data = parsed.d;

        if(type !instanceof Number) throw new Error();

        if(type == Message_Type.HEARTBEAT) {
            heartbeatTime = Date.now();
        }
    })

    setInterval(()=>{
        if(heartbeatTime + 30000 < Date.now()) {
            socket.close(Socket_Close_Reason.HEARTBEAT_TIMEOUT);
        }
    }, 5000)
})