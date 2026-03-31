declare class APIGateway {
    private app;
    private cache;
    private metrics;
    private healthChecker;
    private circuitBreakers;
    constructor();
    private setupMiddleware;
    private setupRoutes;
    private setupServiceRoutes;
    private createServiceProxy;
    private setupCircuitBreakers;
    private setupHealthChecks;
    start(): void;
}
export default APIGateway;
//# sourceMappingURL=api-gateway.d.ts.map