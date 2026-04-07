import { Account } from "ts-accountd";

export class Message {
    content: string;
    author: Account;

    constructor(content: string, author: Account) {
        this.content = content;
        this.author = author;
    }
}


const CHANNEL_NAME_REGEX = /^[a-zA-Z0-9_ -]+$/;
const ID_REGEX = /^[a-z0-9_-]+$/;

export class Channel {
    name: string = "";
    id: string = "";
    messages: Message[] = [];

    constructor(name: string) {
        this.setName(name);
    }

    setName(name: string) {
        const newName = name.trim();
        if(newName === "" || !CHANNEL_NAME_REGEX.test(newName)) {
            throw new Error("Channel name must not contain special characters");
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

    addMessage(message: Message) {
        this.messages.push(message);
    }
}