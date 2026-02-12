import Crypto from "node:crypto"
import fs from "node:fs";
import { generateSessionID, deleteSession, getSession } from "./session.service.js"

const ACCOUNT_DIR = "accounts"
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

class Account {
    username: string;
    password: string;
    displayName: string;

    constructor(username: string, password: Crypto.BinaryLike, displayName: string) {
        this.username = username;
        this.password = Crypto.createHash("sha256").update(password).digest("hex")
        this.displayName = displayName
    }
}

export type PublicAccount = {
    username: string;
    displayName: string;
};

type UpdatedAccount = Partial<{
    password: string;
    displayName: string;
}>;

function initAccountDir() {
    if(!fs.existsSync(ACCOUNT_DIR)) fs.mkdirSync(ACCOUNT_DIR);
}

function updateAccountFile(account: Account) {
    fs.writeFileSync(`${ACCOUNT_DIR}/${account.username}.json`, JSON.stringify(account, null, 4))
}

export function createAccount(username: string, password: string, displayName: string) {
    if(!USERNAME_REGEX.test(username) || username.trim() == "") throw new Error("Invalid username");
    if(displayName.trim() == "") throw new Error("Invalid display name");
    
    initAccountDir();

    if(getAccountByUsername(username) != null) throw new Error("Account already exists");
    const newAccount = new Account(username, password, displayName.trim());

    const sessionID = generateSessionID(newAccount.username);

    updateAccountFile(newAccount);

    return sessionID;
}

export function getAccountByUsername(username: string): Account | null {
    if(!USERNAME_REGEX.test(username) || username.trim() === "") throw new Error("Invalid username");

    initAccountDir();

    const accountFile = `${ACCOUNT_DIR}/${username}.json`;
    if (fs.existsSync(accountFile)) {
        return JSON.parse(fs.readFileSync(accountFile, "utf-8")) as Account;
    }
    return null;
}

export function getAccount(sessionID: string) {
    initAccountDir();

    const sessionData = getSession(sessionID);

    if (!sessionData) {
        throw new Error("Invalid session");
    }

    if(fs.existsSync(`${ACCOUNT_DIR}/${sessionData.username}.json`)) {
        return JSON.parse(fs.readFileSync(`${ACCOUNT_DIR}/${sessionData.username}.json`, "utf-8")) as Account;
    } else {
        deleteSession(sessionID);
        throw new Error("Invalid session")
    }
}

export function getPublicAccount(username: string): PublicAccount | null {
    initAccountDir();

    if (!USERNAME_REGEX.test(username)) {
        return null;
    }

    const accountFile = `${ACCOUNT_DIR}/${username}.json`;

    if (fs.existsSync(accountFile)) {
        const account = JSON.parse(fs.readFileSync(accountFile, "utf-8")) as Account;
        
        return {
            username: account.username,
            displayName: account.displayName
        } as PublicAccount;
    }
    
    return null;
}

export function getAllAccounts() {
    initAccountDir();

    return fs.readdirSync(ACCOUNT_DIR).map(file => file.replace(".json", ""));
}

export function deleteAccount(account: Account) {
    if(fs.existsSync(`${ACCOUNT_DIR}/${account.username}.json`)) {
        fs.unlinkSync(`${ACCOUNT_DIR}/${account.username}.json`)
    }
}

export function updateAccount(account: Account, updates: UpdatedAccount) {
    initAccountDir();

    if (updates.password) {
        account.password = Crypto.createHash("sha256").update(updates.password).digest("hex");
    }

    if (updates.displayName) {
        if(updates.displayName.trim() == "") throw new Error("Invalid display name");
        account.displayName = updates.displayName.trim();
    }

    updateAccountFile(account);
    return account;
}

export function login(username: string, password: string) {
    initAccountDir();

    if(!fs.existsSync(`${ACCOUNT_DIR}/${username}.json`)) {
        throw new Error("Invalid username or password")
    }

    const account = JSON.parse(fs.readFileSync(`${ACCOUNT_DIR}/${username}.json`, "utf-8")) as Account;

    if(!account) {
        throw new Error("Invalid username or password")
    }

    const hashedPassword = Crypto.createHash("sha256").update(password).digest("hex")

    if(hashedPassword != account.password) {
        throw new Error("Invalid username or password")
    }

    return generateSessionID(account.username);
}