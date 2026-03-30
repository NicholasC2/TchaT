import { Server, Socket } from "socket.io"
import { createAccount, getAccount, getPublicAccount, login } from "./account.service.js"
import { Channel, Message } from "./channel.js"
import { createGuild, getGuild } from "./guild.service.js"

type ServerMessage =
    | { type: "account/creationSuccessful"; data: { sessionID: string } }
    | { type: "account/loginSuccessful"; data: { sessionID: string } }
    | { type: "error"; data: { message: string } }
    | { type: string; data: any };

type Handler = (socket: Socket, data: any) => Promise<ServerMessage>;

const server = new Server({
    cors: {
        origin: "*"
    }
})

const handlers: Record<string, Handler> = {
    "account/create": async (socket, data) => {
        const session = createAccount(data.username, data.password, data.displayName);
        return { type: "account/creationSuccessful", data: { sessionID: session } };
    },

    "account/login": async (socket, data) => {
        const session = login(data.username, data.password);
        return { type: "account/loginSuccessful", data: { sessionID: session } };
    },

    "guild/create": async (socket, data) => {
        const guild = createGuild(data.name);

        if (!guild) throw new Error("Guild Invalid");

        return { type: "guild/creationSuccessful", data: guild.serialize() };
    },

    "channel/get": async (socket, data) => {
        const guild = getGuild(data.guildID);
        const channel = guild?.channels.find(c => c.id === data.channelID);

        if (!channel) throw new Error("Channel Not Found");

        return { type: "channel/getSuccessful", data: channel?.serialize() };
    },

    "channel/sendMessage": async (socket, data) => {
        const guild = getGuild(data.guildID);
        const channel = guild?.channels.find(c => c.id === data.channelID);

        const session = getAccount(data.sessionID);
        const msg = channel?.createMessage(
            data.content,
            getPublicAccount(session.username)
        );

        if (!msg) throw new Error("Message Invalid");

        return { type: "channel/sendMessageSuccessful", data: msg?.serialize() };
    }
};

server.on("connection", socket => {
    socket.emit("message", {"is-tchat-server": true});

    socket.on("message", async (message) => {
        try {
            const handler = handlers[message.type];

            if (!handler) {
                throw new Error("Unknown message type");
            }

            const response = await handler(socket, message.data);
            socket.emit("message", response);

        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Unknown error";

            socket.emit("message", {
                type: "error",
                data: { message }
            });
        }
    });
})

server.listen(8000)