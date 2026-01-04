import type { User } from "./User";

export type MessageData = { 
    content: string;
    author: User;
}

export class Message {
    content: string;
    author: User;

    constructor({ content, author }: MessageData) {
        this.content = content;
        this.author = author;
    }
}