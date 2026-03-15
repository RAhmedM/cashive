import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  ...(isProduction
    ? {
        // JSON output in production (parseable by log aggregators)
        formatters: {
          level(label) {
            return { level: label };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        // Pretty output in development
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }),
});

// Named child loggers for each subsystem
export const apiLogger = logger.child({ service: "api" });
export const socketLogger = logger.child({ service: "socket" });
export const workerLogger = logger.child({ service: "worker" });
export const postbackLogger = logger.child({ service: "postback" });
export const paymentLogger = logger.child({ service: "payment" });
export const emailLogger = logger.child({ service: "email" });
export const authLogger = logger.child({ service: "auth" });
