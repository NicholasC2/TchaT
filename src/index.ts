import { Account, Session } from "ts-accountd"
import { Config, defaultConfig } from "./config.js"
import { WebSocketServer } from "ws"

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