import { Channel } from "./channel.js";
import { Account } from "ts-accountd";

const GUILD_NAME_REGEX = /^[a-zA-Z0-9_ -]+$/;
const ID_REGEX = /^[a-z0-9_-]+$/;

export class Guild {
    name: string = "";
    id: string = "";
    channels: Channel[] = [];
    accounts: Account[] = [];

    constructor(name: string) {
        this.setName(name);
        this.setID(Guild.convertNametoID(name));
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
}