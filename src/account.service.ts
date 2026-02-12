import { generateSessionID, deleteSession, getSession } from "./session.service.js"
import Crypto from "node:crypto"
import path from "node:path";
import fs from "node:fs";
import { getGuild, Guild } from "./guild.service.js";

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
    guilds: Guild[] = [];

    constructor(username: string, hashedPassword: string, salt: string, displayName: string, guildIDs: string[] = []) {
        this.setUsername(username);
        this.password = { value:hashedPassword, salt };
        this.setDisplayName(displayName);
        
        this.guilds = guildIDs.map(id => getGuild(id)).filter(Boolean) as Guild[];
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
            guildIDs: this.guilds.map(g => g.id)
        };
    }

    static deserialize(data: { username: string, displayName: string, password: { value: string, salt: string;}, guildIDs: any[] }) {
        return new Account(data.username, data.password.value, data.password.salt, data.displayName, data.guildIDs);
    }

    save() {
        initAccountDir();
    
        fs.writeFileSync(
            path.join(ACCOUNT_DIR, `${this.username}.json`),
            JSON.stringify(this.serialize(), null, 4)
        );
    }

    static load(username: string) {
        initAccountDir();

        const accountFile = path.join(ACCOUNT_DIR, `${username}.json`);

        if (!fs.existsSync(accountFile)) return null;

        return Account.deserialize(JSON.parse(fs.readFileSync(accountFile).toString()));
    }

    static readonly DeletedAccount: Account = Object.freeze(
        new Account("deleted_user", "", "", "Deleted User", [])
    );
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
    if(getAccountByUsername(username) !== null) throw new Error("Account already exists");

    const newAccount = Account.create(username, password, displayName);
    newAccount.save();

    return generateSessionID(newAccount.username);
}

export function getAccountByUsername(username: string): Account | null {
    username = username.trim()
    if(!USERNAME_REGEX.test(username) || username === "") throw new Error("Invalid username");

    const account = Account.load(username);
    
    if(account === Account.DeletedAccount) {
        return null
    }

    return account;
}

export function getAccount(sessionID: string) {
    const sessionData = getSession(sessionID);

    if (!sessionData) {
        throw new Error("Invalid session");
    }

    const account = Account.load(sessionData.username);

    if(account === Account.DeletedAccount) {
        deleteSession(sessionID);
        throw new Error("Invalid session")
    }
    
    return account;
}

export function getPublicAccount(username: string): PublicAccount | null {
    username = username.trim()
    if (username === "" || !USERNAME_REGEX.test(username)) {
        return null;
    }

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
    username = username.trim()
    password = password.trim()
    if (username === "" || !USERNAME_REGEX.test(username)) {
        throw new Error("Invalid username or password");
    }

    const accountFile = path.join(ACCOUNT_DIR, `${username}.json`);
    if(!fs.existsSync(accountFile)) {
        throw new Error("Invalid username or password")
    }

    const data = JSON.parse(fs.readFileSync(accountFile, "utf-8"));
    const account = new Account(data.username, data.password.value, data.password.salt, data.displayName, data.guilds);

    if(!account.verifyPassword(password)) {
        throw new Error("Invalid username or password")
    }

    return generateSessionID(account.username);
}