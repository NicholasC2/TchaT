import { Server, Socket } from "socket.io"
import { Account, Session } from "ts-accountd"
import { Low } from "lowdb"
import { JSONFile } from "lowdb/node"

type DBSchema = {
    accounts: Account[]
    sessions: Session[]
}

const adapter = new JSONFile<DBSchema>("db.json")
const db = new Low(adapter, { accounts: [], sessions: [] });

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

async function createSession(username: string): Promise<Session> {
    await db.read();

    let session = Session.create(username);
    do {
        session = Session.create(username);
    } while (db.data.sessions.find(ss => ss.id === session.id));

    db.data.sessions.push(session);
    
    await db.write();

    return session
}

const handlers: Record<string, Handler> = {
    "account/create": async (socket, data) => {
        await db.read();

        // Create Account
        const account = await Account.create({username: data.username, password: data.password, displayName: data.displayName});
        db.data.accounts.push(account);

        // Create Session

        const session = await createSession(account.username);

        return { type: "account/creationSuccessful", data: { sessionID: session.id } };
    },

    "account/login": async (socket, data) => {
        await db.read();
        const account = db.data.accounts.find(acc => acc.username === data.username)

        if(!account || !account.verifyPassword(data.password)) throw new Error("Invalid Username or Password");

        const session = await createSession(account.username);

        return { type: "account/loginSuccessful", data: { sessionID: session.id } };
    },

    // "guild/create": async (socket, data) => {
    //     const guild = new Guild(data.name);

    //     if (!guild) throw new Error("Guild Invalid");

    //     return { type: "guild/creationSuccessful", data: guild.serialize() };
    // },

    // "channel/get": async (socket, data) => {
    //     const guild = getGuild(data.guildID);
    //     const channel = guild?.channels.find(c => c.id === data.channelID);

    //     if (!channel) throw new Error("Channel Not Found");

    //     return { type: "channel/getSuccessful", data: channel?.serialize() };
    // },

    // "channel/sendMessage": async (socket, data) => {
    //     const guild = getGuild(data.guildID);
    //     const channel = guild?.channels.find(c => c.id === data.channelID);

    //     const session = sessionStore.get(data.sessionID);
    //     if(!session) throw new Error("Invalid SessionID");
    //     const account = accStore.get(session.username);

    //     const msg = channel?.createMessage(
    //         data.content,
    //         account?.getPublicAccount()
    //     );

    //     if (!msg) throw new Error("Message Invalid");

    //     return { type: "channel/sendMessageSuccessful", data: msg?.serialize() };
    // }
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