export enum Message_Type {
    NONE,

    CREATE_ACCOUNT,
    DELETE_ACCOUNT
}

export const Socket_Close_Reason = {
    UNKNOWN: 1000,
    HEARTBEAT_TIMEOUT: 1001
}