import { Request, Response } from 'express';
interface MetricData {
    timestamp: number;
    value: number;
    tags?: Record<string, string>;
}
interface AlertRule {
    name: string;
    metric: string;
    condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    enabled: boolean;
    callback?: (alert: Alert) => void;
}
interface Alert {
    id: string;
    ruleName: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: number;
    resolved: boolean;
    resolvedAt?: number;
}
interface HealthCheck {
    name: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    lastCheck: number;
    responseTime?: number;
    error?: string;
    metadata?: Record<string, any>;
}
export declare class MonitoringService {
    private redis;
    private metrics;
    private alerts;
    private alertRules;
    private healthChecks;
    private activeRequests;
    constructor();
    /**
     * Record a metric value
     */
    recordMetric(name: string, value: number, tags?: Record<string, string>): void;
    /**
     * Increment a counter metric
     */
    incrementCounter(name: string, value?: number, tags?: Record<string, string>): void;
    /**
     * Record a timer metric (duration in milliseconds)
     */
    recordTimer(name: string, duration: number, tags?: Record<string, string>): void;
    /**
     * Record a gauge metric (current value)
     */
    recordGauge(name: string, value: number, tags?: Record<string, string>): void;
    /**
     * Get metrics for a time range
     */
    getMetrics(name: string, startTime?: number, endTime?: number): Promise<MetricData[]>;
    /**
     * Get aggregated metrics
     */
    getAggregatedMetrics(name: string, aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count', timeWindow?: number): Promise<number>;
    /**
     * Express middleware for request monitoring
     */
    requestMiddleware(): (req: Request, res: Response, next: Function) => void;
    /**
     * Register a health check
     */
    registerHealthCheck(name: string, checkFunction: () => Promise<{
        healthy: boolean;
        responseTime?: number;
        error?: string;
        metadata?: any;
    }>): void;
    /**
     * Get all health checks
     */
    getHealthChecks(): Promise<HealthCheck[]>;
    /**
     * Get overall system health
     */
    getSystemHealth(): Promise<{
        status: 'healthy' | 'unhealthy' | 'degraded';
        checks: HealthCheck[];
        uptime: number;
        activeRequests: number;
    }>;
    /**
     * Register an alert rule
     */
    registerAlertRule(rule: AlertRule): void;
    /**
     * Get active alerts
     */
    getActiveAlerts(): Alert[];
    /**
     * Get all alerts
     */
    getAllAlerts(): Alert[];
    /**
     * Resolve an alert
     */
    resolveAlert(alertId: string): void;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): Promise<{
        requestsPerSecond: number;
        averageResponseTime: number;
        errorRate: number;
        activeConnections: number;
        memoryUsage: NodeJS.MemoryUsage;
        cpuUsage: NodeJS.CpuUsage;
    }>;
    private storeMetricInRedis;
    private getMetricsFromRedis;
    private setupDefaultAlerts;
    private startMetricsCleanup;
    private startHealthChecks;
    private startAlertEvaluation;
    private evaluateCondition;
}
export declare const monitoringService: MonitoringService;
export default monitoringService;
//# sourceMappingURL=monitoring.service.d.ts.map