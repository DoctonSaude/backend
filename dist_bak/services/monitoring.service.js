"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringService = exports.MonitoringService = void 0;
const redis_js_1 = require("../lib/redis.js");
const perf_hooks_1 = require("perf_hooks");
class MonitoringService {
    redis;
    metrics = new Map();
    alerts = new Map();
    alertRules = new Map();
    healthChecks = new Map();
    activeRequests = new Map();
    constructor() {
        this.redis = (0, redis_js_1.getRedisClient)();
        // Start background tasks
        this.startMetricsCleanup();
        this.startHealthChecks();
        this.startAlertEvaluation();
        // Setup default alert rules
        this.setupDefaultAlerts();
    }
    /**
     * Record a metric value
     */
    recordMetric(name, value, tags) {
        const timestamp = Date.now();
        const metricData = { timestamp, value, tags };
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        const metricList = this.metrics.get(name);
        metricList.push(metricData);
        // Keep only last 1000 data points in memory
        if (metricList.length > 1000) {
            metricList.splice(0, metricList.length - 1000);
        }
        // Also store in Redis for persistence
        this.storeMetricInRedis(name, metricData);
    }
    /**
     * Increment a counter metric
     */
    incrementCounter(name, value = 1, tags) {
        this.recordMetric(`${name}_count`, value, tags);
    }
    /**
     * Record a timer metric (duration in milliseconds)
     */
    recordTimer(name, duration, tags) {
        this.recordMetric(`${name}_duration`, duration, tags);
    }
    /**
     * Record a gauge metric (current value)
     */
    recordGauge(name, value, tags) {
        this.recordMetric(name, value, tags);
    }
    /**
     * Get metrics for a time range
     */
    async getMetrics(name, startTime, endTime) {
        if (startTime || endTime) {
            // Get from Redis for historical data
            return this.getMetricsFromRedis(name, startTime, endTime);
        }
        return this.metrics.get(name) || [];
    }
    /**
     * Get aggregated metrics
     */
    async getAggregatedMetrics(name, aggregation, timeWindow // in milliseconds
    ) {
        const now = Date.now();
        const startTime = timeWindow ? now - timeWindow : 0;
        const metrics = await this.getMetrics(name, startTime, now);
        if (metrics.length === 0)
            return 0;
        switch (aggregation) {
            case 'avg':
                return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
            case 'sum':
                return metrics.reduce((sum, m) => sum + m.value, 0);
            case 'min':
                return Math.min(...metrics.map(m => m.value));
            case 'max':
                return Math.max(...metrics.map(m => m.value));
            case 'count':
                return metrics.length;
            default:
                return 0;
        }
    }
    /**
     * Express middleware for request monitoring
     */
    requestMiddleware() {
        return (req, res, next) => {
            const startTime = perf_hooks_1.performance.now();
            const requestId = req.headers['x-request-id'] || Math.random().toString(36);
            // Track active requests
            this.activeRequests.set(requestId, startTime);
            // Record request start
            this.incrementCounter('requests_total', 1, {
                method: req.method,
                route: req.route?.path || req.path,
                ip: req.ip || 'unknown'
            });
            res.on('finish', () => {
                const duration = perf_hooks_1.performance.now() - startTime;
                this.activeRequests.delete(requestId);
                // Record response time
                this.recordTimer('response_time', duration, {
                    method: req.method,
                    route: req.route?.path || req.path,
                    status: res.statusCode.toString()
                });
                // Record status code
                this.incrementCounter('responses_total', 1, {
                    method: req.method,
                    status: res.statusCode.toString()
                });
                // Record error if applicable
                if (res.statusCode >= 400) {
                    this.incrementCounter('errors_total', 1, {
                        method: req.method,
                        status: res.statusCode.toString()
                    });
                }
            });
            next();
        };
    }
    /**
     * Register a health check
     */
    registerHealthCheck(name, checkFunction) {
        this.healthChecks.set(name, {
            name,
            status: 'unhealthy',
            lastCheck: 0
        });
        this.healthChecks.get(name).checkFunction = checkFunction;
    }
    /**
     * Get all health checks
     */
    async getHealthChecks() {
        return Array.from(this.healthChecks.values());
    }
    /**
     * Get overall system health
     */
    async getSystemHealth() {
        const checks = await this.getHealthChecks();
        const healthyCount = checks.filter(c => c.status === 'healthy').length;
        const totalCount = checks.length;
        let status;
        if (healthyCount === totalCount) {
            status = 'healthy';
        }
        else if (healthyCount === 0) {
            status = 'unhealthy';
        }
        else {
            status = 'degraded';
        }
        return {
            status,
            checks,
            uptime: process.uptime(),
            activeRequests: this.activeRequests.size
        };
    }
    /**
     * Register an alert rule
     */
    registerAlertRule(rule) {
        this.alertRules.set(rule.name, rule);
    }
    /**
     * Get active alerts
     */
    getActiveAlerts() {
        return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
    }
    /**
     * Get all alerts
     */
    getAllAlerts() {
        return Array.from(this.alerts.values());
    }
    /**
     * Resolve an alert
     */
    resolveAlert(alertId) {
        const alert = this.alerts.get(alertId);
        if (alert && !alert.resolved) {
            alert.resolved = true;
            alert.resolvedAt = Date.now();
        }
    }
    /**
     * Get performance metrics
     */
    async getPerformanceMetrics() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const [requestsTotal, responseTimes, errorsTotal] = await Promise.all([
            this.getAggregatedMetrics('requests_total', 'count', 60000),
            this.getAggregatedMetrics('response_time', 'avg', 60000),
            this.getAggregatedMetrics('errors_total', 'count', 60000)
        ]);
        const requestsPerSecond = requestsTotal / 60;
        const averageResponseTime = responseTimes;
        const errorRate = requestsTotal > 0 ? (errorsTotal / requestsTotal) * 100 : 0;
        return {
            requestsPerSecond,
            averageResponseTime,
            errorRate,
            activeConnections: this.activeRequests.size,
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage()
        };
    }
    // Private methods
    async storeMetricInRedis(name, data) {
        try {
            if (!this.redis)
                return;
            const key = `metrics:${name}:${data.timestamp}`;
            await this.redis.setex(key, 3600, JSON.stringify(data)); // Keep for 1 hour
        }
        catch (error) {
            console.error('Error storing metric in Redis:', error);
        }
    }
    async getMetricsFromRedis(name, startTime, endTime) {
        try {
            if (!this.redis)
                return [];
            const pattern = `metrics:${name}:*`;
            const keys = await this.redis.keys(pattern);
            if (keys.length === 0)
                return [];
            const values = await this.redis.mget(...keys);
            const metrics = [];
            for (const value of values) {
                if (value) {
                    const metric = JSON.parse(value);
                    if ((!startTime || metric.timestamp >= startTime) &&
                        (!endTime || metric.timestamp <= endTime)) {
                        metrics.push(metric);
                    }
                }
            }
            return metrics.sort((a, b) => a.timestamp - b.timestamp);
        }
        catch (error) {
            console.error('Error getting metrics from Redis:', error);
            return [];
        }
    }
    setupDefaultAlerts() {
        // High error rate alert
        this.registerAlertRule({
            name: 'high_error_rate',
            metric: 'error_rate',
            condition: 'gt',
            threshold: 5, // 5%
            duration: 300, // 5 minutes
            severity: 'high',
            enabled: true
        });
        // High response time alert
        this.registerAlertRule({
            name: 'high_response_time',
            metric: 'response_time',
            condition: 'gt',
            threshold: 2000, // 2 seconds
            duration: 180, // 3 minutes
            severity: 'medium',
            enabled: true
        });
        // High memory usage alert
        this.registerAlertRule({
            name: 'high_memory_usage',
            metric: 'memory_usage',
            condition: 'gt',
            threshold: 80, // 80%
            duration: 300, // 5 minutes
            severity: 'critical',
            enabled: true
        });
        // Service down alert
        this.registerAlertRule({
            name: 'service_down',
            metric: 'health_check',
            condition: 'eq',
            threshold: 0, // unhealthy
            duration: 60, // 1 minute
            severity: 'critical',
            enabled: true
        });
    }
    startMetricsCleanup() {
        setInterval(() => {
            const now = Date.now();
            const oneHourAgo = now - 3600000;
            for (const [name, metrics] of this.metrics.entries()) {
                const filtered = metrics.filter(m => m.timestamp > oneHourAgo);
                this.metrics.set(name, filtered);
            }
        }, 300000); // Cleanup every 5 minutes
    }
    startHealthChecks() {
        setInterval(async () => {
            for (const [name, healthCheck] of this.healthChecks.entries()) {
                try {
                    const checkFunction = healthCheck.checkFunction;
                    if (checkFunction) {
                        const result = await checkFunction();
                        healthCheck.status = result.healthy ? 'healthy' : 'unhealthy';
                        healthCheck.lastCheck = Date.now();
                        healthCheck.responseTime = result.responseTime;
                        healthCheck.error = result.error;
                        healthCheck.metadata = result.metadata;
                        // Record health check metric
                        this.recordGauge('health_check', result.healthy ? 1 : 0, { service: name });
                    }
                }
                catch (error) {
                    healthCheck.status = 'unhealthy';
                    healthCheck.lastCheck = Date.now();
                    healthCheck.error = error instanceof Error ? error.message : 'Unknown error';
                }
            }
        }, 30000); // Check every 30 seconds
    }
    startAlertEvaluation() {
        setInterval(async () => {
            for (const [ruleName, rule] of this.alertRules.entries()) {
                if (!rule.enabled)
                    continue;
                try {
                    const currentValue = await this.getAggregatedMetrics(rule.metric, 'avg', rule.duration * 1000);
                    const isTriggered = this.evaluateCondition(currentValue, rule.condition, rule.threshold);
                    const existingAlert = Array.from(this.alerts.values())
                        .find(alert => alert.ruleName === ruleName && !alert.resolved);
                    if (isTriggered && !existingAlert) {
                        // Create new alert
                        const alert = {
                            id: Math.random().toString(36),
                            ruleName,
                            message: `Alert: ${ruleName} - ${rule.metric} is ${currentValue} (threshold: ${rule.threshold})`,
                            severity: rule.severity,
                            timestamp: Date.now(),
                            resolved: false
                        };
                        this.alerts.set(alert.id, alert);
                        // Call callback if provided
                        if (rule.callback) {
                            rule.callback(alert);
                        }
                        console.warn(`🚨 Alert triggered: ${alert.message}`);
                    }
                    else if (!isTriggered && existingAlert) {
                        // Resolve alert
                        this.resolveAlert(existingAlert.id);
                        console.log(`✅ Alert resolved: ${existingAlert.message}`);
                    }
                }
                catch (error) {
                    console.error(`Error evaluating alert rule ${ruleName}:`, error);
                }
            }
        }, 60000); // Evaluate every minute
    }
    evaluateCondition(value, condition, threshold) {
        switch (condition) {
            case 'gt': return value > threshold;
            case 'gte': return value >= threshold;
            case 'lt': return value < threshold;
            case 'lte': return value <= threshold;
            case 'eq': return value === threshold;
            default: return false;
        }
    }
}
exports.MonitoringService = MonitoringService;
// Singleton instance
exports.monitoringService = new MonitoringService();
exports.default = exports.monitoringService;
//# sourceMappingURL=monitoring.service.js.map