import Crypto from "node:crypto"
import fs from "node:fs";

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

type UpdatedAccount = Partial<{
    password: string;
    displayName: string;
}>;

function initAccountDir() {
    if(!fs.existsSync(ACCOUNT_DIR)) fs.mkdirSync(ACCOUNT_DIR);
}

function updateAccountFile(account: Account) {
    fs.writeFileSync(`${ACCOUNT_DIR}/${account.username}.json`, JSON.stringify(account, null, 4));
}

export function createAccount(username: string, password: string, displayName: string) {
    if(!USERNAME_REGEX.test(username) || username.trim() == "") throw new Error("Invalid username");
    if(displayName.trim() == "") throw new Error("Invalid display name");
    
    initAccountDir();

    if(getAccount(username) != null) throw new Error("Account already exists");
    const newAccount = new Account(username, password, displayName.trim());

    updateAccountFile(newAccount);

    return newAccount;
}

export function getAccount(username: string) {
    if(!USERNAME_REGEX.test(username) || username.trim() == "") throw new Error("Invalid username");

    initAccountDir();

    if(fs.existsSync(`${ACCOUNT_DIR}/${username}.json`)) {
        return JSON.parse(fs.readFileSync(`${ACCOUNT_DIR}/${username}.json`, "utf-8")) as Account;
    }
    return null;
}

export function getAllAccounts() {
    initAccountDir();

    return fs.readdirSync(ACCOUNT_DIR).map(file => file.replace(".json", ""));
}

export function checkPassword(account: Account, password: string) {
    const hashedPassword = Crypto.createHash("sha256").update(password).digest("hex");
    return account.password == hashedPassword;
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
