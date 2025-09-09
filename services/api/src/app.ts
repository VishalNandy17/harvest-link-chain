import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import pino from 'pino';

const app = express();
const logger = pino();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url });
  next();
});

export default app;
