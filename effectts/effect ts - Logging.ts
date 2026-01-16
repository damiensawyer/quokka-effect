//import { Effect, Console, Logger, LogLevel, Layer, Context, FiberRef, pipe } from "effect";
import { Effect, Console, Logger, LogLevel, Layer, Context, FiberRef, pipe, Data } from "effect";

const assert = (condition: boolean, message?: string) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    if (!!message) console.log(`✓ ${message}`);
};

// === BASIC LOGGING ===
const basicLoggingExample = async () => {
    console.log("=== Basic Logging ===");

    const program = Effect.gen(function* () {
        yield* Effect.log("Starting application");
        yield* Effect.logInfo("This is an info message");
        yield* Effect.logWarning("This is a warning");
        yield* Effect.logError("This is an error");
        yield* Effect.logDebug("This is debug info");
        return "done";
    });

    await Effect.runPromise(program);
};

// === LOG LEVELS ===
const logLevelsExample = async () => {
    console.log("\n=== Log Levels ===");

    const program = Effect.gen(function* () {
        yield* Effect.logTrace("Trace message");
        yield* Effect.logDebug("Debug message");
        yield* Effect.logInfo("Info message");
        yield* Effect.logWarning("Warning message");
        yield* Effect.logError("Error message");
        yield* Effect.logFatal("Fatal message");
        return "completed";
    });

    // Run with different log levels
    // const debugLevel = Logger.withMinimumLogLevel(LogLevel.Debug);
    // const warningLevel = Logger.withMinimumLogLevel(LogLevel.Warning);

    console.log("With Debug level:");
    await Effect.runPromise(program.pipe(Logger.withMinimumLogLevel(LogLevel.Debug)));

    console.log("\nWith Warning level:");
    await Effect.runPromise(program.pipe(Logger.withMinimumLogLevel(LogLevel.Warning)));
};

// === STRUCTURED LOGGING ===
const structuredLoggingExample = async () => {
    console.log("\n=== Structured Logging ===");

    interface User {
        id: number;
        name: string;
    }

    const user: User = { id: 123, name: "Alice" };

    const program = Effect.gen(function* () {
        // Log with annotations
        yield* Effect.logInfo("User login").pipe(
            Effect.annotateLogs("userId", user.id),
            Effect.annotateLogs("userName", user.name)
        );

        // Log with structured data
        yield* Effect.logInfo("Processing order").pipe(
            Effect.annotateLogs({
                orderId: "ORD-001",
                amount: 99.99,
                currency: "USD"
            })
        );

        // Log spans (grouping related logs)
        yield* Effect.gen(function* () {
            yield* Effect.logInfo("Connecting to database");
            yield* Effect.sleep("100 millis");
            yield* Effect.logInfo("Query executed");
            return "result";
        }).pipe(Effect.withLogSpan("database-operation"));

        return "completed";
    });

    await Effect.runPromise(program);
};

// === CUSTOM LOGGER ===
const customLoggerExample = async () => {
    console.log("\n=== Custom Logger ===");

    // Custom logger that formats messages differently
    const customLogger = Logger.make(({ logLevel, message, annotations }) => {
        const timestamp = new Date().toISOString();
        const level = logLevel.label.toUpperCase();
        const annotationsStr = Object.keys(annotations).length > 0
            ? ` | ${JSON.stringify(annotations)}`
            : '';

        console.log(`[${timestamp}] ${level}: ${message}${annotationsStr}`);
    });

    const customLoggerLayer = Logger.replace(Logger.defaultLogger, customLogger);

    const program = Effect.gen(function* () {
        yield* Effect.logInfo("Custom logger message").pipe(
            Effect.annotateLogs("service", "user-service"),
            Effect.annotateLogs("requestId", "req-456")
        );
        return "done";
    });

    await Effect.runPromise(program.pipe(Effect.provide(customLoggerLayer)));
};

// === LOGGING WITH SERVICES ===
const loggingWithServicesExample = async () => {
    console.log("\n=== Logging with Services ===");

    // Service that logs its operations
    class UserService extends Context.Tag("UserService")<
        UserService,
        {
            getUser: (id: number) => Effect.Effect<{ id: number; name: string }>;
            saveUser: (user: { id: number; name: string }) => Effect.Effect<void>;
        }
    >() { }

    const userServiceImpl = {
        getUser: (id: number) =>
            Effect.gen(function* () {
                yield* Effect.logInfo(`Retrieving user`).pipe(
                    Effect.annotateLogs("userId", id),
                    Effect.annotateLogs("operation", "getUser")
                );

                // Simulate work
                yield* Effect.sleep("50 millis");

                const user = { id, name: `User${id}` };
                yield* Effect.logDebug(`User retrieved successfully`).pipe(
                    Effect.annotateLogs("user", JSON.stringify(user))
                );

                return user;
            }),

        saveUser: (user: { id: number; name: string }) =>
            Effect.gen(function* () {
                yield* Effect.logInfo(`Saving user`).pipe(
                    Effect.annotateLogs("userId", user.id),
                    Effect.annotateLogs("operation", "saveUser")
                );

                // Simulate save operation
                yield* Effect.sleep("100 millis");

                yield* Effect.logInfo(`User saved successfully`);
            })
    };

    const program = Effect.gen(function* () {
        const userService = yield* UserService;

        const user = yield* userService.getUser(123);
        yield* userService.saveUser({ ...user, name: "Updated Name" });

        return user;
    });

    const layer = Layer.succeed(UserService, userServiceImpl);
    await Effect.runPromise(program.pipe(Effect.provide(layer)));
};

// === ERROR LOGGING ===
const errorLoggingExample = async () => {
    console.log("\n=== Error Logging ===");

    class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string;
  readonly code: string;
}> {}

    const flakyOperation = Effect.gen(function* () {
        yield* Effect.logInfo("Starting flaky operation");

        if (Math.random() > 0.5) {
            yield* Effect.logError("Operation failed").pipe(
                Effect.annotateLogs("error", "connection_timeout"),
                Effect.annotateLogs("retryable", true)
            );
            return yield* Effect.fail(new DatabaseError({message:"Connection timeout", code: "CONN_TIMEOUT"} ));
        }

        yield* Effect.logInfo("Operation completed successfully");
        return "success";
    });

    const program = Effect.gen(function* () {
        const result = yield* Effect.either(flakyOperation);

        if (result._tag === "Left") {
            yield* Effect.logError(`Caught error: ${result.left.message}`).pipe(
                Effect.annotateLogs("errorType", result.left.constructor.name)
            );
            return "failed";
        }

        return result.right;
    });

    // Run multiple times to see both success and failure cases
    for (let i = 0; i < 3; i++) {
        console.log(`\nAttempt ${i + 1}:`);
        await Effect.runPromise(program);
    }
};


// === LOGGING WITH LAYERS ===
const loggingWithLayersExample = async () => {
    console.log("\n=== Logging with Layers ===");

    // Logger configuration
    class LoggerConfig extends Context.Tag("LoggerConfig")<
        LoggerConfig,
        {
            level: LogLevel.LogLevel;
            enableColors: boolean;
            includeTimestamp: boolean;
        }
    >() { }

    // Custom logger layer that uses configuration
    // === LOGGING WITH LAYERS ===
    const loggingWithLayersExample = async () => {
        console.log("\n=== Logging with Layers ===");

        // Logger configuration
        class LoggerConfig extends Context.Tag("LoggerConfig")<
            LoggerConfig,
            {
                level: LogLevel.LogLevel;
                enableColors: boolean;
                includeTimestamp: boolean;
            }
        >() { }

        // Custom logger layer that uses configuration
        const LoggerLive = Layer.unwrapEffect(
            Effect.gen(function* () {
                const config = yield* LoggerConfig;

                const customLogger = Logger.make(({ logLevel, message, annotations }) => {
                    if (LogLevel.lessThan(logLevel, config.level)) return;

                    const timestamp = config.includeTimestamp ? `[${new Date().toISOString()}] ` : '';
                    const level = config.enableColors
                        ? `\x1b[36m${logLevel.label.toUpperCase()}\x1b[0m`
                        : logLevel.label.toUpperCase();

                    const annotationsStr = Object.keys(annotations).length > 0
                        ? ` ${JSON.stringify(annotations)}`
                        : '';

                    console.log(`${timestamp}${level}: ${message}${annotationsStr}`);
                });

                return Logger.replace(Logger.defaultLogger, customLogger);
            })
        );

        // Configuration layers
        const DevConfig = Layer.succeed(LoggerConfig, {
            level: LogLevel.Debug,
            enableColors: true,
            includeTimestamp: true
        });

        const ProdConfig = Layer.succeed(LoggerConfig, {
            level: LogLevel.Info,
            enableColors: false,
            includeTimestamp: true
        });

        const program = Effect.gen(function* () {
            yield* Effect.logDebug("Debug message");
            yield* Effect.logInfo("Info message");
            yield* Effect.logWarning("Warning message");
            return "done";
        });

        console.log("Development config:");
        const devLayer = pipe(LoggerLive, Layer.provide(DevConfig));
        await Effect.runPromise(program.pipe(Effect.provide(devLayer)));

        console.log("\nProduction config:");
        const prodLayer = pipe(LoggerLive, Layer.provide(ProdConfig));
        await Effect.runPromise(program.pipe(Effect.provide(prodLayer)));
    };

};



// === LOG CONTEXT AND FIBER REFS ===
const logContextExample = async () => {
    console.log("\n=== Log Context with FiberRef ===");

    // Create a FiberRef for request ID
    const RequestId = FiberRef.unsafeMake<string>("unknown");

    const withRequestId = (requestId: string) =>
        <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
            Effect.locally(RequestId, requestId)(effect);

    const logWithRequestId = (message: string) =>
        Effect.gen(function* () {
            const requestId = yield* FiberRef.get(RequestId);
            yield* Effect.logInfo(message).pipe(
                Effect.annotateLogs("requestId", requestId)
            );
        });

    const handleRequest = (requestId: string): Effect.Effect<string, never, never> =>
        withRequestId(requestId)(
            Effect.gen(function* () {
                yield* logWithRequestId("Processing request");
                yield* Effect.sleep("100 millis");
                yield* logWithRequestId("Request completed");
                return "response";
            })
        );

    // Simulate concurrent requests
    const program = Effect.gen(function* () {
        yield* Effect.all([
            handleRequest("req-001"),
            handleRequest("req-002"),
            handleRequest("req-003")
        ], { concurrency: "unbounded" });
    });

    await Effect.runPromise(program);
};

// === COMBINING CONSOLE AND LOGGER ===
const consoleVsLoggerExample = async () => {
    console.log("\n=== Console vs Logger ===");

    const program = Effect.gen(function* () {
        // Console methods - simpler, direct output
        yield* Console.log("Console.log message");
        yield* Console.error("Console.error message");
        yield* Console.warn("Console.warn message");

        // Logger methods - structured, configurable
        yield* Effect.logInfo("Logger info message").pipe(
            Effect.annotateLogs("type", "structured")
        );
        yield* Effect.logError("Logger error message").pipe(
            Effect.annotateLogs("type", "structured")
        );

        return "comparison complete";
    });

    await Effect.runPromise(program);
};

// === RUN ALL EXAMPLES ===
const runAll = async () => {
    try {
        // await basicLoggingExample();
        // await logLevelsExample();
        // await structuredLoggingExample();
        // await customLoggerExample();
        // await loggingWithServicesExample();
        await errorLoggingExample();
        // await loggingWithLayersExample();
        // await logContextExample();
        // await consoleVsLoggerExample();

        console.log("\n✅ All logging examples completed!");
    } catch (error) {
        console.error("❌ Error running examples:", error);
    }
};

runAll();