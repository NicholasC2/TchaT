import Crypto from "node:crypto";
declare class Account {
    username: string;
    password: string;
    displayName: string;
    constructor(username: string, password: Crypto.BinaryLike, displayName: string);
}
type UpdatedAccount = Partial<{
    password: string;
    displayName: string;
}>;
export declare function createAccount(username: string, password: string, displayName: string): Account;
export declare function getAccount(username: string): Account | null;
export declare function getAllAccounts(): string[];
export declare function checkPassword(account: Account, password: string): boolean;
export declare function deleteAccount(account: Account): void;
export declare function updateAccount(account: Account, updates: UpdatedAccount): Account;
export {};
//# sourceMappingURL=account.d.ts.map