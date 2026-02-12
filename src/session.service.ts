import Crypto from "node:crypto"
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
}


function initSessionDir() {
    if(!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, {recursive:true});
}

export function getSession(sessionID: string) {
    if (!UUID_REGEX.test(sessionID)) {
        return null;
    }

    const sessionFile = `${SESSION_DIR}/${sessionID}.json`;

    if(fs.existsSync(sessionFile)) {
        let sessionData;
        try {
            sessionData = JSON.parse(fs.readFileSync(sessionFile, "utf-8"));
        } catch {
            deleteSession(sessionID);
            throw new Error("Invalid session");
        }
    
        if(!sessionData.username) {
            deleteSession(sessionID);
            throw new Error("Invalid session")
        }
            
        if(!USERNAME_REGEX.test(sessionData.username) || sessionData.username.trim() == "") {
            deleteSession(sessionID);
            throw new Error("Invalid session");
        }
        
        if(!sessionData.createdAt || typeof sessionData.createdAt !== "number") {
            deleteSession(sessionID);
            throw new Error("Invalid session")
        }
    
        if (Date.now() - sessionData.createdAt > MAX_SESSION_AGE) {
            deleteSession(sessionID);
            throw new Error("Session expired");
        }        
    
        return sessionData as Session;
    }
    return null;
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