"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//import { Effect, Console, Logger, LogLevel, Layer, Context, FiberRef, pipe } from "effect";
const effect_1 = require("effect");
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    if (!!message)
        console.log(`✓ ${message}`);
};
// === BASIC LOGGING ===
const basicLoggingExample = async () => {
    console.log("=== Basic Logging ===");
    const program = effect_1.Effect.gen(function* () {
        yield* effect_1.Effect.log("Starting application");
        yield* effect_1.Effect.logInfo("This is an info message");
        yield* effect_1.Effect.logWarning("This is a warning");
        yield* effect_1.Effect.logError("This is an error");
        yield* effect_1.Effect.logDebug("This is debug info");
        return "done";
    });
    await effect_1.Effect.runPromise(program);
};
// === LOG LEVELS ===
const logLevelsExample = async () => {
    console.log("\n=== Log Levels ===");
    const program = effect_1.Effect.gen(function* () {
        yield* effect_1.Effect.logTrace("Trace message");
        yield* effect_1.Effect.logDebug("Debug message");
        yield* effect_1.Effect.logInfo("Info message");
        yield* effect_1.Effect.logWarning("Warning message");
        yield* effect_1.Effect.logError("Error message");
        yield* effect_1.Effect.logFatal("Fatal message");
        return "completed";
    });
    // Run with different log levels
    const debugLevel = effect_1.Logger.withMinimumLogLevel(effect_1.LogLevel.Debug);
    const warningLevel = effect_1.Logger.withMinimumLogLevel(effect_1.LogLevel.Warning);
    console.log("With Debug level:");
    await effect_1.Effect.runPromise(program.pipe(effect_1.Logger.withMinimumLogLevel(effect_1.LogLevel.Debug)));
    console.log("\nWith Warning level:");
    await effect_1.Effect.runPromise(program.pipe(effect_1.Logger.withMinimumLogLevel(effect_1.LogLevel.Warning)));
};
// === STRUCTURED LOGGING ===
const structuredLoggingExample = async () => {
    console.log("\n=== Structured Logging ===");
    const user = { id: 123, name: "Alice" };
    const program = effect_1.Effect.gen(function* () {
        // Log with annotations
        yield* effect_1.Effect.logInfo("User login").pipe(effect_1.Effect.annotateLogs("userId", user.id), effect_1.Effect.annotateLogs("userName", user.name));
        // Log with structured data
        yield* effect_1.Effect.logInfo("Processing order").pipe(effect_1.Effect.annotateLogs({
            orderId: "ORD-001",
            amount: 99.99,
            currency: "USD"
        }));
        // Log spans (grouping related logs)
        yield* effect_1.Effect.gen(function* () {
            yield* effect_1.Effect.logInfo("Connecting to database");
            yield* effect_1.Effect.sleep("100 millis");
            yield* effect_1.Effect.logInfo("Query executed");
            return "result";
        }).pipe(effect_1.Effect.withLogSpan("database-operation"));
        return "completed";
    });
    await effect_1.Effect.runPromise(program);
};
// === CUSTOM LOGGER ===
const customLoggerExample = async () => {
    console.log("\n=== Custom Logger ===");
    // Custom logger that formats messages differently
    const customLogger = effect_1.Logger.make(({ logLevel, message, annotations }) => {
        const timestamp = new Date().toISOString();
        const level = logLevel.label.toUpperCase();
        const annotationsStr = Object.keys(annotations).length > 0
            ? ` | ${JSON.stringify(annotations)}`
            : '';
        console.log(`[${timestamp}] ${level}: ${message}${annotationsStr}`);
    });
    const customLoggerLayer = effect_1.Logger.replace(effect_1.Logger.defaultLogger, customLogger);
    const program = effect_1.Effect.gen(function* () {
        yield* effect_1.Effect.logInfo("Custom logger message").pipe(effect_1.Effect.annotateLogs("service", "user-service"), effect_1.Effect.annotateLogs("requestId", "req-456"));
        return "done";
    });
    await effect_1.Effect.runPromise(program.pipe(effect_1.Effect.provide(customLoggerLayer)));
};
// === LOGGING WITH SERVICES ===
const loggingWithServicesExample = async () => {
    console.log("\n=== Logging with Services ===");
    // Service that logs its operations
    class UserService extends effect_1.Context.Tag("UserService")() {
    }
    const userServiceImpl = {
        getUser: (id) => effect_1.Effect.gen(function* () {
            yield* effect_1.Effect.logInfo(`Retrieving user`).pipe(effect_1.Effect.annotateLogs("userId", id), effect_1.Effect.annotateLogs("operation", "getUser"));
            // Simulate work
            yield* effect_1.Effect.sleep("50 millis");
            const user = { id, name: `User${id}` };
            yield* effect_1.Effect.logDebug(`User retrieved successfully`).pipe(effect_1.Effect.annotateLogs("user", JSON.stringify(user)));
            return user;
        }),
        saveUser: (user) => effect_1.Effect.gen(function* () {
            yield* effect_1.Effect.logInfo(`Saving user`).pipe(effect_1.Effect.annotateLogs("userId", user.id), effect_1.Effect.annotateLogs("operation", "saveUser"));
            // Simulate save operation
            yield* effect_1.Effect.sleep("100 millis");
            yield* effect_1.Effect.logInfo(`User saved successfully`);
        })
    };
    const program = effect_1.Effect.gen(function* () {
        const userService = yield* UserService;
        const user = yield* userService.getUser(123);
        yield* userService.saveUser({ ...user, name: "Updated Name" });
        return user;
    });
    const layer = effect_1.Layer.succeed(UserService, userServiceImpl);
    await effect_1.Effect.runPromise(program.pipe(effect_1.Effect.provide(layer)));
};
// === ERROR LOGGING ===
const errorLoggingExample = async () => {
    console.log("\n=== Error Logging ===");
    class DatabaseError extends Error {
        code;
        constructor(message, code) {
            super(message);
            this.code = code;
            this.name = "DatabaseError";
        }
    }
    const flakyOperation = effect_1.Effect.gen(function* () {
        yield* effect_1.Effect.logInfo("Starting flaky operation");
        if (Math.random() > 0.5) {
            yield* effect_1.Effect.logError("Operation failed").pipe(effect_1.Effect.annotateLogs("error", "connection_timeout"), effect_1.Effect.annotateLogs("retryable", true));
            return yield* effect_1.Effect.fail(new DatabaseError("Connection timeout", "CONN_TIMEOUT"));
        }
        yield* effect_1.Effect.logInfo("Operation completed successfully");
        return "success";
    });
    const program = effect_1.Effect.gen(function* () {
        const result = yield* effect_1.Effect.either(flakyOperation);
        if (result._tag === "Left") {
            yield* effect_1.Effect.logError(`Caught error: ${result.left.message}`).pipe(effect_1.Effect.annotateLogs("errorType", result.left.constructor.name));
            return "failed";
        }
        return result.right;
    });
    // Run multiple times to see both success and failure cases
    for (let i = 0; i < 3; i++) {
        console.log(`\nAttempt ${i + 1}:`);
        await effect_1.Effect.runPromise(program);
    }
};
// === LOGGING WITH LAYERS ===
const loggingWithLayersExample = async () => {
    console.log("\n=== Logging with Layers ===");
    // Logger configuration
    class LoggerConfig extends effect_1.Context.Tag("LoggerConfig")() {
    }
    // Custom logger layer that uses configuration
    // === LOGGING WITH LAYERS ===
    const loggingWithLayersExample = async () => {
        console.log("\n=== Logging with Layers ===");
        // Logger configuration
        class LoggerConfig extends effect_1.Context.Tag("LoggerConfig")() {
        }
        // Custom logger layer that uses configuration
        const LoggerLive = effect_1.Layer.unwrapEffect(effect_1.Effect.gen(function* () {
            const config = yield* LoggerConfig;
            const customLogger = effect_1.Logger.make(({ logLevel, message, annotations }) => {
                if (effect_1.LogLevel.lessThan(logLevel, config.level))
                    return;
                const timestamp = config.includeTimestamp ? `[${new Date().toISOString()}] ` : '';
                const level = config.enableColors
                    ? `\x1b[36m${logLevel.label.toUpperCase()}\x1b[0m`
                    : logLevel.label.toUpperCase();
                const annotationsStr = Object.keys(annotations).length > 0
                    ? ` ${JSON.stringify(annotations)}`
                    : '';
                console.log(`${timestamp}${level}: ${message}${annotationsStr}`);
            });
            return effect_1.Logger.replace(effect_1.Logger.defaultLogger, customLogger);
        }));
        // Configuration layers
        const DevConfig = effect_1.Layer.succeed(LoggerConfig, {
            level: effect_1.LogLevel.Debug,
            enableColors: true,
            includeTimestamp: true
        });
        const ProdConfig = effect_1.Layer.succeed(LoggerConfig, {
            level: effect_1.LogLevel.Info,
            enableColors: false,
            includeTimestamp: true
        });
        const program = effect_1.Effect.gen(function* () {
            yield* effect_1.Effect.logDebug("Debug message");
            yield* effect_1.Effect.logInfo("Info message");
            yield* effect_1.Effect.logWarning("Warning message");
            return "done";
        });
        console.log("Development config:");
        const devLayer = (0, effect_1.pipe)(LoggerLive, effect_1.Layer.provide(DevConfig));
        await effect_1.Effect.runPromise(program.pipe(effect_1.Effect.provide(devLayer)));
        console.log("\nProduction config:");
        const prodLayer = (0, effect_1.pipe)(LoggerLive, effect_1.Layer.provide(ProdConfig));
        await effect_1.Effect.runPromise(program.pipe(effect_1.Effect.provide(prodLayer)));
    };
};
// === LOG CONTEXT AND FIBER REFS ===
const logContextExample = async () => {
    console.log("\n=== Log Context with FiberRef ===");
    // Create a FiberRef for request ID
    const RequestId = effect_1.FiberRef.unsafeMake("unknown");
    const withRequestId = (requestId) => (effect) => effect_1.Effect.locally(RequestId, requestId)(effect);
    const logWithRequestId = (message) => effect_1.Effect.gen(function* () {
        const requestId = yield* effect_1.FiberRef.get(RequestId);
        yield* effect_1.Effect.logInfo(message).pipe(effect_1.Effect.annotateLogs("requestId", requestId));
    });
    const handleRequest = (requestId) => withRequestId(requestId)(effect_1.Effect.gen(function* () {
        yield* logWithRequestId("Processing request");
        yield* effect_1.Effect.sleep("100 millis");
        yield* logWithRequestId("Request completed");
        return "response";
    }));
    // Simulate concurrent requests
    const program = effect_1.Effect.gen(function* () {
        yield* effect_1.Effect.all([
            handleRequest("req-001"),
            handleRequest("req-002"),
            handleRequest("req-003")
        ], { concurrency: "unbounded" });
    });
    await effect_1.Effect.runPromise(program);
};
// === COMBINING CONSOLE AND LOGGER ===
const consoleVsLoggerExample = async () => {
    console.log("\n=== Console vs Logger ===");
    const program = effect_1.Effect.gen(function* () {
        // Console methods - simpler, direct output
        yield* effect_1.Console.log("Console.log message");
        yield* effect_1.Console.error("Console.error message");
        yield* effect_1.Console.warn("Console.warn message");
        // Logger methods - structured, configurable
        yield* effect_1.Effect.logInfo("Logger info message").pipe(effect_1.Effect.annotateLogs("type", "structured"));
        yield* effect_1.Effect.logError("Logger error message").pipe(effect_1.Effect.annotateLogs("type", "structured"));
        return "comparison complete";
    });
    await effect_1.Effect.runPromise(program);
};
// === RUN ALL EXAMPLES ===
const runAll = async () => {
    try {
        await basicLoggingExample();
        await logLevelsExample();
        await structuredLoggingExample();
        await customLoggerExample();
        await loggingWithServicesExample();
        await errorLoggingExample();
        await loggingWithLayersExample();
        await logContextExample();
        await consoleVsLoggerExample();
        console.log("\n✅ All logging examples completed!");
    }
    catch (error) {
        console.error("❌ Error running examples:", error);
    }
};
runAll();
//# sourceMappingURL=effect%20ts%20-%20Logging.js.map