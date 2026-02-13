import { generateSessionID, deleteSession, getSession } from "./session.service.js"
import Crypto from "node:crypto"
import path from "node:path";
import fs from "node:fs";

const ACCOUNT_DIR = "accounts"
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

export class Account {
    username: string = "";
    password: {
        value: string;
        salt: string;
    };
    displayName: string = "";

    constructor(username: string, hashedPassword: string, salt: string, displayName: string) {
        this.setUsername(username);
        this.password = { value:hashedPassword, salt };
        this.setDisplayName(displayName);
    }

    static create(username: string, password: string, displayName: string) {
        const account = new Account(username, "", "", displayName);
        account.setPassword(password);
        return account;
    }

    setPassword(password: string) {
        const newPassword = password.trim();
        if (newPassword === "" || !PASSWORD_REGEX.test(newPassword)) {
            throw new Error("Password must contain one letter, one number, and be 6 characters or longer");
        }
        const salt = Crypto.randomBytes(16).toString("hex");
        const hash = Account.deriveKey(newPassword, salt);
        this.password = { value: hash, salt };
    }

    setUsername(username: string) {
        const newUsername = username.trim();
        if (newUsername === "" || !USERNAME_REGEX.test(newUsername)) {
            throw new Error("Username cannot contain spaces or special characters");
        }
        this.username = newUsername;
    }

    setDisplayName(displayName: string) {
        const newDisplayName = displayName.trim();
        if (newDisplayName === "") {
            throw new Error("Display name cannot be blank");
        }
        this.displayName = newDisplayName;
    }

    private static deriveKey(string: string, salt:string) {
        return Crypto.pbkdf2Sync( string, salt, 100000, 64, "sha512" ).toString("hex");
    }
    
    verifyPassword(password: string) {
        const trimmed = password.trim();
        const hash = Account.deriveKey(trimmed, this.password.salt);
    
        return Crypto.timingSafeEqual(
            Buffer.from(hash, "hex"),
            Buffer.from(this.password.value, "hex")
        );
    }

    serialize() {
        return {
            username: this.username,
            displayName: this.displayName,
            password: this.password,
        };
    }

    static deserialize(data: { username: string, displayName: string, password: { value: string, salt: string;} }) {
        return new Account(data.username, data.password.value, data.password.salt, data.displayName);
    }

    save() {
        initAccountDir();
    
        fs.writeFileSync(
            path.join(ACCOUNT_DIR, `${this.username}.json`),
            JSON.stringify(this.serialize(), null, 4)
        );
    }

    static load(username: string) {
        username = username.trim()
        if(!USERNAME_REGEX.test(username) || username === "") throw new Error("Invalid username");

        initAccountDir();

        const accountFile = path.join(ACCOUNT_DIR, `${username}.json`);

        if (!fs.existsSync(accountFile)) return null;

        return Account.deserialize(JSON.parse(fs.readFileSync(accountFile).toString()));
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
    if(!fs.existsSync(ACCOUNT_DIR)) fs.mkdirSync(ACCOUNT_DIR, {recursive:true});
}

export function createAccount(username: string, password: string, displayName: string) {
    if(Account.load(username) !== null) throw new Error("Account already exists");

    const newAccount = Account.create(username, password, displayName);
    newAccount.save();

    return generateSessionID(newAccount.username);
}

export function getAccount(sessionID: string) {
    const sessionData = getSession(sessionID);

    if (!sessionData) {
        throw new Error("Invalid session");
    }

    const account = Account.load(sessionData.username);

    if(account === null) {
        deleteSession(sessionID);
        throw new Error("Invalid session")
    }
    
    return account;
}

export function getPublicAccount(username: string): PublicAccount | null {
    const account = Account.load(username);

    if(account) {
        return {
            username: account.username,
            displayName: account.displayName
        } as PublicAccount;
    }

    return null;
}

export function getAllAccounts() {
    initAccountDir();
    return fs.readdirSync(ACCOUNT_DIR)
        .filter(file => file.endsWith(".json"))
        .map(file => file.replace(".json", ""));
}

export function deleteAccount(account: Account) {
    const accountFile = path.join(ACCOUNT_DIR, `${account.username}.json`);
    if(fs.existsSync(accountFile)) {
        fs.unlinkSync(accountFile)
    }
}

export function updateAccount(account: Account, updates: UpdatedAccount) {
    if (updates.password) account.setPassword(updates.password);
    if (updates.displayName) account.setDisplayName(updates.displayName);

    account.save();
    return account;
}

export function login(username: string, password: string) {
    password = password.trim()
    const account = Account.load(username)

    if(!account) {
        throw new Error("Account doesn't exist")
    }

    if(!account.verifyPassword(password)) {
        throw new Error("Invalid username or password")
    }

    return generateSessionID(account.username);
}