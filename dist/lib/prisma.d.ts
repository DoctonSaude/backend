import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
declare const prisma: PrismaClient<{
    log: ("warn" | "error")[];
    datasources: {
        db: {
            url: string;
        };
    };
}, never, import("@prisma/client/runtime/library.js").DefaultArgs>;
export default prisma;
//# sourceMappingURL=prisma.d.ts.map