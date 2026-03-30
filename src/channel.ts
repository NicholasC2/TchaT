import { getPublicAccount, Account, type PublicAccount } from "./account.service.js";

export class Message {
    content: string;
    author: PublicAccount;

    constructor(content: string, author: PublicAccount) {
        this.content = content;
        this.author = author;
    }

    serialize() {
        return {
            content: this.content,
            author: this.author.username
        };
    }

    static deserialize(data: { content: string, author: string }) {
        const author = getPublicAccount(data.author);
        if (!author) throw new Error("Author account not found");
        return new Message(data.content, author);
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

    serialize() {
        return {
            name: this.name,
            id: this.id,
            messages: this.messages.map(m => m.serialize())
        };
    }

    static deserialize(data: { name: string, messages: any[] }) {
        const newChannel = new Channel(data.name);
        newChannel.messages = data.messages.map(m => Message.deserialize(m));
        return newChannel;
    }

    createMessage(content: string, author: PublicAccount) {
        const message = new Message(content, author);

        if(message) this.messages.push(message);

        return message;
    }
}