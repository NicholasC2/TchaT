import type { Account } from "./account.service.js";

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
