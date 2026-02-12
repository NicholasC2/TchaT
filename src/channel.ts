import { getAccountByUsername } from "./account.service.js";
import { Message } from "./message.service.js";

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