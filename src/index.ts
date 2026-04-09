import { Server, Socket } from "socket.io"
import { Account, Session } from "ts-accountd"
import { Low } from "lowdb"
import { JSONFile } from "lowdb/node"
import { verify, randomBytes } from "node:crypto";

type AccountStored = {
    username: string;
    pubKey: string;
    displayName: string;
    messages?: { [key: string]: string[] };
}

type SessionStored = {
    id: string;
    username: string;
    createdAt: number;
}

type DBSchema = {
    accounts: AccountStored[]
    sessions: SessionStored[]
}

const adapter = new JSONFile<DBSchema>("db.json")
const db = new Low(adapter, { accounts: [], sessions: [] });

type ServerMessage = { type: string; data: any };

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
    } while (db.data.sessions.find(ss => ss.id === session.getId()));

    db.data.sessions.push(session.toJSON());
    
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
        db.data.sessions.push(session.toJSON());

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
        
        if (!isValid) throw new Error("Invalid signature");

        loginValues.delete(accountObj.getUsername());

        const session = Session.create(accountObj.getUsername());
        db.data.sessions.push(session.toJSON());
        await db.write();

        return { type: "account/loginSuccessful", data: { sessionID: session.getId() } };
    },

    "user/sendMessage": async (socket, data) => {
        await db.read();
        const session = db.data.sessions.find(session => session.id === data.sessionID)

        if(!session) throw new Error("Invalid session");
        if(Date.now() - session.createdAt > 86400000 * 10) {
            throw new Error("Session timed out, please login again")
        }

        const sendingAccount = db.data.accounts.find(account => account.username === session.username);
        if(!sendingAccount) throw new Error("Invalid account");
        
        const recievingAccount = db.data.accounts.find(account => account.username === data.username);
        if(!recievingAccount) throw new Error("Invalid Reciving account");

        if(!sendingAccount.messages) sendingAccount.messages = {};
        if(!sendingAccount.messages[recievingAccount.username]) sendingAccount.messages[recievingAccount.username] = [];

        sendingAccount.messages[recievingAccount.username].push(data.content)

        await db.write();

        return { type: "user/sendMessageSuccessful", data: {} };
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