import path from "node:path";
import fs from "node:fs";
import { Channel } from "./channel.js";

const GUILD_DIR = "guilds"
const GUILD_NAME_REGEX = /^[a-zA-Z0-9_ -]+$/;
const ID_REGEX = /^[a-z0-9_-]+$/;

export class Guild {
    name: string = "";
    id: string = "";
    channels: Channel[] = [];

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

    serialize() {
        const serializedChannels = this.channels.map(c => c.serialize());

        return {
            id: this.id,
            name: this.name,
            channels: serializedChannels
        };
    }

    static deserialize(data: { name: string, id: string, channels: any[] }) {
        const newGuild = new Guild(data.name);
        newGuild.setID(data.id);
        newGuild.channels = (data.channels ?? []).map((c: any) => Channel.deserialize(c));
            
        return newGuild;
    }

    save() {
        initGuildDir();

        fs.writeFileSync(path.join(GUILD_DIR, `${this.id}.json`), JSON.stringify(this.serialize(), null, 4));
    }

    static load(id: string) {
        initGuildDir();

        const guildFile = path.join(GUILD_DIR, `${id}.json`);

        if (fs.existsSync(guildFile)) {
            return Guild.deserialize(JSON.parse(fs.readFileSync(guildFile, "utf-8")));
        }

        return null;
    }
}

type UpdatedGuild = Partial<{
    name: string;
}>;

function initGuildDir() {
    if(!fs.existsSync(GUILD_DIR)) fs.mkdirSync(GUILD_DIR, {recursive:true});
}

export function createGuild(name: string) {
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

    return Guild.load(id);
}

export function updateGuild(guild: Guild, updates: UpdatedGuild) {
    if (updates.name) guild.setName(updates.name);

    guild.save()
    return guild;
}