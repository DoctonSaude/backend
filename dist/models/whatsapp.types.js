"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageStatus = exports.ConversationStatus = exports.MessageDirection = exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    MessageType["TEXT"] = "TEXT";
    MessageType["IMAGE"] = "IMAGE";
    MessageType["DOCUMENT"] = "DOCUMENT";
    MessageType["AUDIO"] = "AUDIO";
    MessageType["VIDEO"] = "VIDEO";
    MessageType["STICKER"] = "STICKER";
    MessageType["LOCATION"] = "LOCATION";
    MessageType["CONTACT"] = "CONTACT";
    MessageType["INTERACTIVE"] = "INTERACTIVE";
    MessageType["TEMPLATE"] = "TEMPLATE";
})(MessageType || (exports.MessageType = MessageType = {}));
var MessageDirection;
(function (MessageDirection) {
    MessageDirection["INBOUND"] = "INBOUND";
    MessageDirection["OUTBOUND"] = "OUTBOUND";
})(MessageDirection || (exports.MessageDirection = MessageDirection = {}));
var ConversationStatus;
(function (ConversationStatus) {
    ConversationStatus["ACTIVE"] = "ACTIVE";
    ConversationStatus["WAITING"] = "WAITING";
    ConversationStatus["CLOSED"] = "CLOSED";
    ConversationStatus["ARCHIVED"] = "ARCHIVED";
})(ConversationStatus || (exports.ConversationStatus = ConversationStatus = {}));
var MessageStatus;
(function (MessageStatus) {
    MessageStatus["PENDING"] = "PENDING";
    MessageStatus["SENT"] = "SENT";
    MessageStatus["DELIVERED"] = "DELIVERED";
    MessageStatus["READ"] = "READ";
    MessageStatus["FAILED"] = "FAILED";
})(MessageStatus || (exports.MessageStatus = MessageStatus = {}));
//# sourceMappingURL=whatsapp.types.js.map