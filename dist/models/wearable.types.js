"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionStatus = exports.WearableDataType = exports.WearableProvider = void 0;
var WearableProvider;
(function (WearableProvider) {
    WearableProvider["APPLE_HEALTH"] = "APPLE_HEALTH";
    WearableProvider["GOOGLE_FIT"] = "GOOGLE_FIT";
    WearableProvider["FITBIT"] = "FITBIT";
    WearableProvider["GARMIN"] = "GARMIN";
    WearableProvider["WHOOP"] = "WHOOP";
    WearableProvider["OURA"] = "OURA";
    WearableProvider["POLAR"] = "POLAR";
    WearableProvider["SAMSUNG_HEALTH"] = "SAMSUNG_HEALTH";
})(WearableProvider || (exports.WearableProvider = WearableProvider = {}));
var WearableDataType;
(function (WearableDataType) {
    WearableDataType["HEART_RATE"] = "HEART_RATE";
    WearableDataType["BLOOD_PRESSURE"] = "BLOOD_PRESSURE";
    WearableDataType["SPO2"] = "SPO2";
    WearableDataType["STEPS"] = "STEPS";
    WearableDataType["CALORIES"] = "CALORIES";
    WearableDataType["SLEEP"] = "SLEEP";
    WearableDataType["ACTIVITY"] = "ACTIVITY";
    WearableDataType["TEMPERATURE"] = "TEMPERATURE";
    WearableDataType["WEIGHT"] = "WEIGHT";
    WearableDataType["ECG"] = "ECG";
    WearableDataType["BLOOD_GLUCOSE"] = "BLOOD_GLUCOSE";
})(WearableDataType || (exports.WearableDataType = WearableDataType = {}));
var ConnectionStatus;
(function (ConnectionStatus) {
    ConnectionStatus["PENDING"] = "PENDING";
    ConnectionStatus["CONNECTED"] = "CONNECTED";
    ConnectionStatus["DISCONNECTED"] = "DISCONNECTED";
    ConnectionStatus["ERROR"] = "ERROR";
    ConnectionStatus["EXPIRED"] = "EXPIRED";
})(ConnectionStatus || (exports.ConnectionStatus = ConnectionStatus = {}));
//# sourceMappingURL=wearable.types.js.map