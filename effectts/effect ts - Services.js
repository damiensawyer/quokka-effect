"use strict";
// Effect Services - Best Practices Example
// This file demonstrates correct patterns for defining and using Effect services
Object.defineProperty(exports, "__esModule", { value: true });
const effect_1 = require("effect");
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed`);
    }
    if (!!message)
        console.log(`✓ ${message}`);
};
const superBasicExample = async () => {
    console.log("\n=== Direct Effect Example ===");
    // Define service with method that takes a name parameter
    class Greeter extends effect_1.Context.Tag("Greeter")() {
    }
    // Program using the service
    const program = effect_1.Effect.gen(function* () {
        const greeter = yield* Greeter;
        const message = yield* greeter.getMessage('Jimmy');
        return message;
    });
    // Kind implementation
    const kindGreeter = {
        getMessage: (name) => effect_1.Effect.succeed(`Have a great day ${name}!`)
    };
    // Mean implementation
    const meanGreeter = {
        getMessage: (name) => effect_1.Effect.gen(function* () {
            yield* effect_1.Console.log('say some message');
            return `Go away ${name}!`;
        })
    };
    // Run with kind greeter
    const kindResult = await effect_1.Effect.runPromise(effect_1.Effect.provideService(program, Greeter, kindGreeter));
    kindResult; //?
    const meanResult = await effect_1.Effect.runPromise(effect_1.Effect.provideService(program, Greeter, meanGreeter));
    meanResult; //?
};
// Simple Example passing multiple services to a program
const sampleShowingHowToPassMultipleServicesToProgram = async () => {
    // Service 1 and implementations
    class TextManipulator extends effect_1.Context.Tag("MyService")() {
    }
    const capitalizer = { modify: (source) => source.toUpperCase() };
    const spacer = { modify: (source) => source.split('').join(' ') };
    // Service 2 and implementations
    class Greeter extends effect_1.Context.Tag("Greeter")() {
    }
    // implementations
    const kindGreeter = { getMessage: (name) => effect_1.Effect.succeed(`Have a great day ${name}!`) };
    const meanGreeter = { getMessage: (name) => effect_1.Effect.succeed(`Go Away ${name}!`) };
    // Service 3 and implementations
    class TextDecorator extends effect_1.Context.Tag("TextDecorator")() {
    }
    // implementations
    const dashDecorator = { modify: (source) => `----- ${source} -----` };
    const starDecorator = { modify: (source) => `***** ${source} *****` };
    // Program that uses both services
    const program = effect_1.Effect.gen(function* () {
        const textManipulator = yield* TextManipulator;
        const decorator = yield* TextDecorator;
        const greeter = yield* Greeter;
        const message = yield* greeter.getMessage('Jimmy');
        const result = decorator.modify(textManipulator.modify(message));
        return result;
    });
    const context1 = effect_1.Context.empty().pipe(effect_1.Context.add(Greeter, kindGreeter), effect_1.Context.add(TextDecorator, spacer), effect_1.Context.add(TextManipulator, starDecorator));
    const context2 = effect_1.Context.empty().pipe(effect_1.Context.add(Greeter, kindGreeter), effect_1.Context.add(TextDecorator, capitalizer), effect_1.Context.add(TextManipulator, dashDecorator));
    // Provide the entire context at once (without using Layers)
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, context1))); //?
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, context2))); //?
};
// === APPROACH 1: PARAMETERLESS METHODS AS DIRECT EFFECTS ===
// This is the recommended approach for simple methods without parameters
const directEffectExample = async () => {
    console.log("\n=== Direct Effect Example ===");
    // Define service with parameterless method as direct Effect
    // Explaining Context.Tag https://claude.ai/chat/55e4b077-7b61-4e79-bdac-9571b8eb0826
    // it is KIND of like defining an interace in C# which services will implement
    class Counter extends effect_1.Context.Tag("Counter")() {
    }
    // Program using the service
    const program = effect_1.Effect.gen(function* () {
        const counter = yield* Counter;
        // Access increment directly (no function call)
        const value = yield* counter.increment;
        console.log(`Counter value: ${value}`);
        return value;
    });
    // Implementation
    const counterImpl = {
        // Provide increment as an Effect
        increment: effect_1.Effect.sync(() => {
            const value = Math.floor(Math.random() * 100);
            console.log(`Generated value: ${value}`);
            return value;
        })
    };
    // Run the program
    const result = await effect_1.Effect.runPromise(effect_1.Effect.provideService(program, Counter, counterImpl));
    assert(typeof result === "number", "Result is a number");
};
// === APPROACH 2: METHODS WITH PARAMETERS ===
// For methods that take parameters, use functions that return Effects
const parametricMethodExample = async () => {
    console.log("\n=== Parametric Method Example ===");
    // Define service with methods that take parameters
    class Calculator extends effect_1.Context.Tag("Calculator")() {
    }
    // Program using the service
    const program = effect_1.Effect.gen(function* () {
        const calculator = yield* Calculator;
        // Call the function and yield* its result
        const sum = yield* calculator.add(5, 7);
        console.log(`Sum: ${sum}`);
        return sum;
    });
    // Implementation
    const calculatorImpl = {
        // Implement add as a function that returns an Effect
        add: (a, b) => effect_1.Effect.sync(() => {
            console.log(`Adding ${a} + ${b}`);
            return a + b;
        })
    };
    // Run the program
    const result = await effect_1.Effect.runPromise(effect_1.Effect.provideService(program, Calculator, calculatorImpl));
    assert(result == 12);
};
// === APPROACH 3: FUNCTION RETURNING EFFECT (ALTERNATIVE) ===
// This demonstrates the alternative approach for parameterless methods
const functionReturningEffectExample = async () => {
    console.log("\n=== Function Returning Effect Example ===");
    // Define service with parameterless method as a function returning an Effect
    class RandomGenerator extends effect_1.Context.Tag("RandomGenerator")() {
    }
    // Program using the service
    const program = effect_1.Effect.gen(function* () {
        const random = yield* RandomGenerator;
        // Call the function and yield* its result
        const value = yield* random.nextInt();
        console.log(`Random value: ${value}`);
        return value;
    });
    // Implementation
    const randomImpl = {
        // Implement nextInt as a function that returns an Effect
        nextInt: () => effect_1.Effect.sync(() => {
            const value = Math.floor(Math.random() * 100);
            console.log(`Generated random int: ${value}`);
            return value;
        })
    };
    // Run the program
    const result = await effect_1.Effect.runPromise(effect_1.Effect.provideService(program, RandomGenerator, randomImpl));
    assert(typeof result === "number", "Result is a number");
};
// === APPROACH 4: USING PIPE SYNTAX ===
// This demonstrates using Effect.Do and pipe syntax rather than generators
const pipeStyleExample = async () => {
    console.log("\n=== Pipe Style Example ===");
    // Define service
    class Logger extends effect_1.Context.Tag("Logger")() {
    }
    // Program using Do/pipe syntax
    const program = effect_1.Effect.gen(function* () {
        const logger = yield* Logger;
        const level = yield* logger.getCurrentLevel;
        yield* logger.log(`Current level: ${level}`);
        return level;
    });
    // Implementation
    const loggerImpl = {
        log: (message) => effect_1.Effect.sync(() => {
            console.log(`LOG: ${message}`);
        }),
        getCurrentLevel: effect_1.Effect.succeed("INFO")
    };
    // Run the program
    const result = await effect_1.Effect.runPromise(effect_1.Effect.provideService(program, Logger, loggerImpl));
    assert(result === "INFO", "Got correct log level");
};
// === APPROACH 5: COMBINING MULTIPLE SERVICES ===
// Shows how to work with multiple services using the recommended approach
const multiServiceExample = async () => {
    console.log("\n=== Multiple Services Example ===");
    // Define services
    class Config extends effect_1.Context.Tag("Config")() {
    }
    class Database extends effect_1.Context.Tag("Database")() {
    }
    // Program using multiple services
    const program = effect_1.Effect.gen(function* () {
        const config = yield* Config;
        const db = yield* Database;
        // Use parameterless method (direct Effect)
        const isDev = yield* config.isDevelopment;
        // Use methods with parameters
        const dbName = yield* config.get("database.name");
        const connectionInfo = yield* db.getConnectionInfo;
        if (isDev) {
            const users = yield* db.query("SELECT * FROM users LIMIT 3");
            console.log(`DEV MODE: Found ${users.length} users`);
        }
        return {
            development: isDev,
            database: dbName,
            connection: connectionInfo
        };
    });
    // Implementations
    const configImpl = {
        get: (key) => effect_1.Effect.succeed(key === "database.name" ? "myapp_db" : "default"),
        isDevelopment: effect_1.Effect.succeed(true)
    };
    const dbImpl = {
        query: (sql) => effect_1.Effect.sync(() => {
            console.log(`Executing: ${sql}`);
            return ["user1", "user2", "user3"];
        }),
        getConnectionInfo: effect_1.Effect.succeed("localhost:5432")
    };
    // Provide multiple services at once
    const context = effect_1.Context.empty().pipe(effect_1.Context.add(Config, configImpl), effect_1.Context.add(Database, dbImpl));
    // Run the program
    const result = await effect_1.Effect.runPromise(effect_1.Effect.provide(program, context));
    assert(result.development === true, "Development mode is enabled");
    assert(result.database === "myapp_db", "Got correct database name");
    assert(result.connection === "localhost:5432", "Got correct connection info");
};
// Run all examples
const runExamples = async () => {
    try {
        await superBasicExample();
        await sampleShowingHowToPassMultipleServicesToProgram();
        await directEffectExample();
        await parametricMethodExample();
        await functionReturningEffectExample();
        await pipeStyleExample();
        await multiServiceExample();
        console.log("\nAll examples completed successfully!");
    }
    catch (error) {
        console.error("Error running examples:", error);
    }
};
// Run the examples
runExamples();
//# sourceMappingURL=effect%20ts%20-%20Services.js.map