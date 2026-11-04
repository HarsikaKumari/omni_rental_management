import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

async function main() {
    // Fail fast if the DB is unreachable — better than serving errors on first request.
    await prisma.$connect();

    const app = createApp();
    app.listen(env.PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`🚀 API ready on http://localhost:${env.PORT} (env=${env.NODE_ENV})`);
    });
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', err);
    process.exit(1);
});
