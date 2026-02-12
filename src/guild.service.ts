import { Message } from "./message.service.js"
import path from "node:path";
import fs from "node:fs";
import { getAccountByUsername, type Account } from "./account.service.js";

const GUILD_DIR = "guilds"
const GUILD_NAME_REGEX = /^[a-zA-Z0-9_ -]+$/;
const ID_REGEX = /^[a-z0-9_-]+$/;

export class Guild {
    name: string = "";
    id: string = "";
    messages: Message[] = [];

    constructor(name: string) {
        this.setName(name);
    }

    setName(name: string) {
        const newName = name.trim();
        if(newName === "" || !GUILD_NAME_REGEX.test(newName)) {
            throw new Error("Guild name must not contain special characters");
        }

        this.name = newName;
    }

    setID(id: string) {
        if(id === "" || !ID_REGEX.test(id)) {
            throw new Error("ID must not contain special characters, spaces or uppercase characters");
        }

        this.id = id
    }

    static convertNametoID(name: string) {
        return name.trim().toLowerCase().replace(/\s+/g, "-");
    }

    createMessage(content: string, author: Account) {
        this.messages.push(new Message(content, author))
    }

    save() {
        const serializedMessages = this.messages.map(m => m.serialize());
        fs.writeFileSync(path.join(GUILD_DIR, `${this.id}.json`), JSON.stringify({ ...this, messages: serializedMessages }, null, 4));
    }
}

type UpdatedGuild = Partial<{
    name: string;
}>;

function initGuildDir() {
    if(!fs.existsSync(GUILD_DIR)) fs.mkdirSync(GUILD_DIR);
}

export function createGuild(name: string) {
    initGuildDir();

    const guildID = Guild.convertNametoID(name);

    if(getGuild(guildID) !== null) throw new Error("Guild already exists");

    const newGuild = new Guild(name);
    newGuild.setID(guildID);
    newGuild.save();

    return newGuild;
}

export function getGuild(id: string) {
    id = id.trim()
    if(id === "" || !ID_REGEX.test(id)) throw new Error("Invalid ID");

    initGuildDir();

    const guildFile = path.join(GUILD_DIR, `${id}.json`);
    if (fs.existsSync(guildFile)) {
        const data = JSON.parse(fs.readFileSync(guildFile, "utf-8"));
        const newGuild = new Guild(data.name);
        newGuild.setID(data.id);
        newGuild.messages = (data.messages ?? []).map((m: any) => Message.deserialize(m, getAccountByUsername));
        return newGuild;
    }

    return null;
}

export function updateGuild(guild: Guild, updates: UpdatedGuild) {
    initGuildDir();

    if (updates.name) guild.setName(updates.name);

    guild.save()
    return guild;
}