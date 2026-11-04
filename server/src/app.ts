import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp() {
    const app = express();

    // Render/Railway terminate TLS in front of us — trust that single proxy hop
    // so req.ip and req.secure are correct.
    app.set('trust proxy', 1);

    app.use(helmet());
    app.use(
        cors({
            origin: env.CLIENT_ORIGIN,
            credentials: true, // required for cookies across origins
        }),
    );
    app.use(express.json({ limit: '1mb' }));
    app.use(cookieParser());

    app.use('/api', routes);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
