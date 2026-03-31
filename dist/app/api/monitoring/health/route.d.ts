import { NextRequest, NextResponse } from 'next/server';
export declare function GET(request: NextRequest): Promise<NextResponse<{
    status: string;
    timestamp: string;
    services: {
        api: string;
        redis: string;
        database: string;
    };
    version: string;
    environment: string;
}> | NextResponse<{
    status: string;
    timestamp: string;
    error: string;
}>>;
//# sourceMappingURL=route.d.ts.map