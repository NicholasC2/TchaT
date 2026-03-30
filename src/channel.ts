import { getAccountByUsername, Account } from "./account.service.js";

export class Message {
    content: string;
    author: Account;

    constructor(content: string, author: Account) {
        this.content = content;
        this.author = author;
    }

    serialize() {
        return {
            content: this.content,
            author: this.author.username
        };
    }

    static deserialize(data: { content: string, author: string }, getAccountByUsername: (username: string) => Account | null) {
        const author = getAccountByUsername(data.author);
        if (!author) throw new Error("Author account not found");
        return new Message(data.content, author);
    }
}


export class Channel {
    name: string;
    messages: Message[] = [];

    constructor(name: string) {
        this.name = name
    }

    serialize() {
        return {
            name: this.name,
            messages: this.messages.map(m => m.serialize())
        };
    }

    static deserialize(data: { name: string, messages: Array<{content: string, author: string}> }) {
        const newChannel = new Channel(data.name);
        newChannel.messages = data.messages.map(m => Message.deserialize(m, getAccountByUsername));
        return newChannel;
    }
}