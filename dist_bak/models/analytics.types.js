"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportType = exports.InsightType = exports.ForecastModel = exports.AnalyticsType = void 0;
var AnalyticsType;
(function (AnalyticsType) {
    AnalyticsType["SALES"] = "SALES";
    AnalyticsType["INVENTORY"] = "INVENTORY";
    AnalyticsType["PERFORMANCE"] = "PERFORMANCE";
    AnalyticsType["DEMAND"] = "DEMAND";
    AnalyticsType["PRICING"] = "PRICING";
    AnalyticsType["CUSTOMER"] = "CUSTOMER";
    AnalyticsType["OPERATIONAL"] = "OPERATIONAL";
})(AnalyticsType || (exports.AnalyticsType = AnalyticsType = {}));
var ForecastModel;
(function (ForecastModel) {
    ForecastModel["ARIMA"] = "ARIMA";
    ForecastModel["PROPHET"] = "PROPHET";
    ForecastModel["LINEAR_REGRESSION"] = "LINEAR_REGRESSION";
    ForecastModel["RANDOM_FOREST"] = "RANDOM_FOREST";
    ForecastModel["LSTM"] = "LSTM";
    ForecastModel["ENSEMBLE"] = "ENSEMBLE";
})(ForecastModel || (exports.ForecastModel = ForecastModel = {}));
var InsightType;
(function (InsightType) {
    InsightType["TREND"] = "TREND";
    InsightType["ANOMALY"] = "ANOMALY";
    InsightType["OPPORTUNITY"] = "OPPORTUNITY";
    InsightType["WARNING"] = "WARNING";
    InsightType["RECOMMENDATION"] = "RECOMMENDATION";
    InsightType["PREDICTION"] = "PREDICTION";
})(InsightType || (exports.InsightType = InsightType = {}));
var ReportType;
(function (ReportType) {
    ReportType["DAILY"] = "DAILY";
    ReportType["WEEKLY"] = "WEEKLY";
    ReportType["MONTHLY"] = "MONTHLY";
    ReportType["QUARTERLY"] = "QUARTERLY";
    ReportType["YEARLY"] = "YEARLY";
    ReportType["CUSTOM"] = "CUSTOM";
})(ReportType || (exports.ReportType = ReportType = {}));
//# sourceMappingURL=analytics.types.js.map