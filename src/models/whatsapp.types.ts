export enum MessageType {
    TEXT = "TEXT",
    IMAGE = "IMAGE",
    DOCUMENT = "DOCUMENT",
    AUDIO = "AUDIO",
    VIDEO = "VIDEO",
    STICKER = "STICKER",
    LOCATION = "LOCATION",
    CONTACT = "CONTACT",
    INTERACTIVE = "INTERACTIVE",
    TEMPLATE = "TEMPLATE",
}

export enum MessageDirection {
    INBOUND = "INBOUND",
    OUTBOUND = "OUTBOUND", // Mensagem enviada para o paciente
}

export enum ConversationStatus {
    ACTIVE = "ACTIVE",
    WAITING = "WAITING",
    CLOSED = "CLOSED",
    ARCHIVED = "ARCHIVED",
}

export enum MessageStatus {
    PENDING = "PENDING",
    SENT = "SENT",
    DELIVERED = "DELIVERED",
    READ = "READ",
    FAILED = "FAILED",
}
