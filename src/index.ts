import { Server, Socket } from "socket.io"
import { Account, Session, AccountData } from "ts-accountd"
import { Low } from "lowdb"
import { JSONFile } from "lowdb/node"
import { verify, randomBytes } from "node:crypto";

type DBSchema = {
    accounts: AccountData[]
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
    } while (db.data.sessions.find(ss => ss.getId() === session.getId()));

    db.data.sessions.push(session);
    
    await db.write();

    return session
}

function toPEM(base64: string): string {
    const lines = base64.match(/.{1,64}/g)?.join("\n");
    return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

type LoginValue = {
    challenge: Buffer;
    timestamp: number;
};

const loginValues = new Map<String, LoginValue>();

const handlers: Record<string, Handler> = {
    "account/create": async (socket, data) => {
        await db.read();

        if(db.data.accounts.find(acc => acc.username === data.username)) {
            throw new Error("Account already exists")
        }

        const account = Account.create(data);
        db.data.accounts.push(account.toJSON());

        const session = Session.create(account.getUsername());
        db.data.sessions.push(session);

        await db.write();

        return { type: "account/creationSuccessful", data: { sessionID: session.getId() } };
    },

    "account/login": async (socket, data) => {
        await db.read();
        const account = db.data.accounts.find(acc => acc.username === data.username)

        if(!account) throw new Error("Invalid username");

        const challenge = randomBytes(32);
        loginValues.set(account.username, {challenge: challenge, timestamp: Date.now()});

        return { type: "account/challengeSend", data: { value: challenge.toString("base64") } };
    },

    "account/challengeRecieve": async (socket, data) => {
        if (typeof data.signature !== "string") throw new Error("Invalid signature format");

        await db.read();
        const account = db.data.accounts.find(acc => acc.username === data.username)

        if(!account) throw new Error("Invalid username");

        const accountObj = Account.fromJSON(account);

        const loginvalue = loginValues.get(account.username);
        if (!loginvalue) throw new Error("No challenge for this account");

        if(Date.now() - loginvalue.timestamp > 60000) {
            loginValues.delete(accountObj.getUsername())
            throw new Error("Challenge timed out")
        }

        const isValid = verify(
            "RSA-SHA256",
            Buffer.from(loginvalue.challenge),
            toPEM(account.pubKey),
            Buffer.from(data.signature, "base64")
        );

        console.log(toPEM(account.pubKey));
        console.log(data.signature);
        console.log(loginvalue.challenge);
        
        if (!isValid) throw new Error("Invalid signature");

        loginValues.delete(accountObj.getUsername());

        const session = Session.create(accountObj.getUsername());
        db.data.sessions.push(session);
        await db.write();

        return { type: "account/loginSuccessful", data: { sessionID: session.getId() } };
    }

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