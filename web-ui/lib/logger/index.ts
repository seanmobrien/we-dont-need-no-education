import winston from 'winston';

const ServerLoggerId = 'nextjs-server';
const ClientLoggerId = 'nextjs-client';

const getServerSideLogger = () => {
  let ret = winston.loggers.get(ServerLoggerId);
  if (ret) {
    return ret;
  }
  ret = winston.loggers.add(ServerLoggerId, {
    level: process.env.LOG_LEVEL_SERVER || 'error',
    format: winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: { service: ServerLoggerId },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
    exceptionHandlers: [
      new winston.transports.File({ filename: 'exception.log' }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'rejections.log' }),
    ],
  });
  ret.verbose('Server logger created for process %s', process.pid);
  return ret;
};
const getClientSideLogger = () => {
  let ret = winston.loggers.get(ClientLoggerId);
  if (ret) {
    return ret;
  }
  ret = winston.loggers.add(ClientLoggerId, {
    level: process.env.LOG_LEVEL_CLIENT || 'error',
    format: winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: { service: ClientLoggerId },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
    exceptionHandlers: [
      new winston.transports.File({ filename: 'exception.log' }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'rejections.log' }),
    ],
  });
  ret.verbose('Client logger created for process %s', process.pid);
  return ret;
};

export const logger = (id?: string) => {
  if (id) {
    return winston.loggers.get(id);
  }
  return typeof window === 'undefined'
    ? getServerSideLogger()
    : getClientSideLogger();
};
