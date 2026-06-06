declare class APIGateway {
    private app;
    private cache;
    private metrics;
    private healthChecker;
    private circuitBreakers;
    private monolithProxy;
    private socketProxy;
    constructor();
    private setupMiddleware;
    private setupRoutes;
    private setupServiceRoutes;
    private createServiceProxy;
    private setupCircuitBreakers;
    private setupHealthChecks;
    start(): any;
}
export default APIGateway;
//# sourceMappingURL=api-gateway.d.ts.map