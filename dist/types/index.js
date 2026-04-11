"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelTier = exports.BadgeCategory = exports.BadgeRarity = exports.ChallengeStatus = exports.ChallengeType = exports.AppointmentStatus = exports.PartnerType = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["PATIENT"] = "PATIENT";
    UserRole["PARTNER"] = "PARTNER";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var PartnerType;
(function (PartnerType) {
    PartnerType["DOCTOR"] = "DOCTOR";
    PartnerType["CLINIC"] = "CLINIC";
    PartnerType["LABORATORY"] = "LABORATORY";
})(PartnerType || (exports.PartnerType = PartnerType = {}));
var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["SCHEDULED"] = "SCHEDULED";
    AppointmentStatus["CONFIRMED"] = "CONFIRMED";
    AppointmentStatus["COMPLETED"] = "COMPLETED";
    AppointmentStatus["CANCELLED"] = "CANCELLED";
    AppointmentStatus["NO_SHOW"] = "NO_SHOW";
})(AppointmentStatus || (exports.AppointmentStatus = AppointmentStatus = {}));
var ChallengeType;
(function (ChallengeType) {
    ChallengeType["DAILY"] = "DAILY";
    ChallengeType["WEEKLY"] = "WEEKLY";
    ChallengeType["MONTHLY"] = "MONTHLY";
    ChallengeType["SPECIAL"] = "SPECIAL";
})(ChallengeType || (exports.ChallengeType = ChallengeType = {}));
var ChallengeStatus;
(function (ChallengeStatus) {
    ChallengeStatus["ACTIVE"] = "ACTIVE";
    ChallengeStatus["COMPLETED"] = "COMPLETED";
    ChallengeStatus["EXPIRED"] = "EXPIRED";
})(ChallengeStatus || (exports.ChallengeStatus = ChallengeStatus = {}));
var BadgeRarity;
(function (BadgeRarity) {
    BadgeRarity["COMMON"] = "COMMON";
    BadgeRarity["RARE"] = "RARE";
    BadgeRarity["EPIC"] = "EPIC";
    BadgeRarity["LEGENDARY"] = "LEGENDARY";
    BadgeRarity["MYTHIC"] = "MYTHIC";
})(BadgeRarity || (exports.BadgeRarity = BadgeRarity = {}));
var BadgeCategory;
(function (BadgeCategory) {
    BadgeCategory["CONSISTENCY"] = "CONSISTENCY";
    BadgeCategory["EXPLORATION"] = "EXPLORATION";
    BadgeCategory["SOCIAL"] = "SOCIAL";
    BadgeCategory["MASTERY"] = "MASTERY";
})(BadgeCategory || (exports.BadgeCategory = BadgeCategory = {}));
var LevelTier;
(function (LevelTier) {
    LevelTier["BRONZE"] = "BRONZE";
    LevelTier["SILVER"] = "SILVER";
    LevelTier["GOLD"] = "GOLD";
    LevelTier["PLATINUM"] = "PLATINUM";
    LevelTier["DIAMOND"] = "DIAMOND";
    LevelTier["LEGEND"] = "LEGEND";
})(LevelTier || (exports.LevelTier = LevelTier = {}));
//# sourceMappingURL=index.js.map