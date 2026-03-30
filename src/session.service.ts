import Crypto from "node:crypto"
import path from "node:path";
import fs from "node:fs";

const SESSION_DIR = "sessions"
const UUID_REGEX = /^[0-9a-f-]{36}$/i;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_SESSION_AGE = 1000 * 60 * 60 * 24;

class Session {
    id: string;
    username: string;
    createdAt: number;

    constructor(sessionID: string, username: string, createdAt: number) {
        this.id = sessionID;
        this.username = username;
        this.createdAt = createdAt;
    }

    serialize() {
        return {
            id: this.id,
            username: this.username,
            createdAt: this.createdAt
        };
    }

    static deserialize(data: { id: string, username: string, createdAt: number }) {
        const session = new Session(data.id, data.username, data.createdAt);
        
        if(!session) {
            deleteSession(data.id);
            throw new Error("Invalid session")
        }
        
        if(!session.username) {
            deleteSession(data.id);
            throw new Error("Invalid session")
        }
                
        if(!USERNAME_REGEX.test(session.username) || session.username.trim() == "") {
            deleteSession(data.id);
            throw new Error("Invalid session");
        }
            
        if(!session.createdAt || typeof session.createdAt !== "number") {
            deleteSession(data.id);
            throw new Error("Invalid session")
        }
        
        if (Date.now() - session.createdAt > MAX_SESSION_AGE) {
            deleteSession(data.id);
            throw new Error("Session expired");
        }

        return session;
    }

    save() {
        initSessionDir();
    
        fs.writeFileSync(
            path.join(SESSION_DIR, `${this.id}.json`),
            JSON.stringify(this.serialize(), null, 4)
        );
    }

    static load(id: string) {
        id = id.trim()
        if (!UUID_REGEX.test(id)) {
            throw new Error("Invalid session ID");
        }

        initSessionDir();

        const accountFile = path.join(SESSION_DIR, `${id}.json`);

        if (!fs.existsSync(accountFile)) return null;
        
        try {
            return Session.deserialize(JSON.parse(fs.readFileSync(accountFile).toString()));
        } catch {
            return null;
        }
    }
}

function initSessionDir() {
    if(!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, {recursive:true});
}

export function getSession(sessionID: string) {
    let sessionData = Session.load(sessionID);  
    
    return sessionData;
}

export function generateSessionID(username: string): string {
    initSessionDir();

    let sessionID: string;
    let sessionFile: string;

    do {
        sessionID = Crypto.randomUUID();
        sessionFile = `${SESSION_DIR}/${sessionID}.json`;
    } while (fs.existsSync(sessionFile));

    const sessionData = {
        id: sessionID,
        username,
        createdAt: Date.now()
    };

    fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 4));

    return sessionID;
}

export function deleteSession(sessionID: string) {
    if (!UUID_REGEX.test(sessionID)) {
        return null;
    }

    initSessionDir();

    const sessionFile = `${SESSION_DIR}/${sessionID}.json`;

    if(fs.existsSync(sessionFile)) {
        fs.unlinkSync(sessionFile);
    }
}