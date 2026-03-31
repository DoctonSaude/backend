import { PrismaClient } from '../../lib/generated/prisma';
import 'dotenv/config';
declare const prisma: PrismaClient<{
    log: ("error" | "warn")[];
    datasources: {
        db: {
            url: string;
        };
    };
}, never, import("../../lib/generated/prisma/runtime/library").DefaultArgs>;
export default prisma;
//# sourceMappingURL=prisma.d.ts.map