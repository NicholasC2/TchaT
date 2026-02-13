import { Server } from "socket.io"
import { createAccount, login } from "./account.service.js"

const server = new Server({
    cors: {
        origin: "*"
    }
})

server.on("connection", socket => {
    console.log("Client connected:", socket.id)

    socket.on("message", message => {
        try {
            const type = message.type.split("/");

            switch(type[0]) {
                case "account": {
                    switch(type[1]) {
                        case "create": {
                            try  {
                                let session = createAccount(message.data.username, message.data.password, message.data.displayName);
                                socket.emit("message", {type: "account/creation_successful", data: {sessionID: session}})
                            } catch(err) {
                                if(err instanceof Error) {
                                    socket.emit("message", {type: "account/creation_unsuccessful", data: {message: err.message}})
                                }
                            }
                            
                            break;
                        }
                        case "login": {
                            try  {
                                let session = login(message.data.username, message.data.password);
                                socket.emit("message", {type: "account/login_successful", data: {sessionID: session}})
                            } catch(err) {
                                if(err instanceof Error) {
                                    socket.emit("message", {type: "account/login_unsuccessful", data: {message: err.message}})
                                }
                            }
                            
                            break;
                        }
                    }

                    break;
                }
            }
            
        } catch(err) {
            if(err instanceof Error) {
                socket.emit("error", err.message)
            }
        }
    })
})

server.listen(443)