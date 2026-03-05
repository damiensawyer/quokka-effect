// Effect Services - Best Practices Example
// This file demonstrates correct patterns for defining and using Effect services
// Updated for Effect v4

import { Effect, ServiceMap, Console } from "effect";

const assert = (condition: boolean, message?: string) => {
    if (!condition) {
        throw new Error(`Assertion failed`);
    }
    if (!!message) console.log(`✓ ${message}`);
};


const superBasicExample = async () => {
    console.log("\n=== Direct Effect Example ===");

    // Define service with method that takes a name parameter
    // v4: ServiceMap.Service<Self, Shape>()(id)
    class Greeter extends ServiceMap.Service<Greeter, {
        getMessage: (name: string) => Effect.Effect<string, never, never>
    }>()("Greeter") { }

    type GreeterService = ServiceMap.Service.Shape<typeof Greeter>

    // Program using the service
    const program = Effect.gen(function* () {
        const greeter = yield* Greeter;
        const message = yield* greeter.getMessage('Jimmy');
        return message;
    });

    // Kind implementation
    const kindGreeter: GreeterService = {
        getMessage: (name: string) => Effect.succeed(`Have a great day ${name}!`)
    };

    // Mean implementation
    const meanGreeter: GreeterService = {
        getMessage: (name: string) => Effect.gen(function* (){
            yield* Console.log('say some message')
            return `Go away ${name}!`})
    };

    // Run with kind greeter
    const kindResult = await Effect.runPromise(Effect.provideService(program, Greeter, kindGreeter))
    kindResult

    const meanResult = await Effect.runPromise(Effect.provideService(program, Greeter, meanGreeter))
    meanResult
    
};

// Simple Example passing multiple services to a program

const sampleShowingHowToPassMultipleServicesToProgram = async () => {

    // Service 1 and implementations
    class TextManipulator extends ServiceMap.Service<TextManipulator, {
        modify: (source: string) => string
    }>()("TextManipulator") { }
    type TextManipulatorType = ServiceMap.Service.Shape<typeof TextManipulator>

    const capitalizer: TextManipulatorType = { modify: (source: string) => source.toUpperCase() };
    const spacer: TextManipulatorType = { modify: (source: string) => source.split('').join(' ') };

    // Service 2 and implementations
    class Greeter extends ServiceMap.Service<Greeter, {
        readonly getMessage: (name: string) => Effect.Effect<string, never, never>
    }>()("Greeter") { }

    type GreeterType = ServiceMap.Service.Shape<typeof Greeter>

    // implementations
    const kindGreeter: GreeterType = { getMessage: (name: string) => Effect.succeed(`Have a great day ${name}!`) };
    const meanGreeter: GreeterType = { getMessage: (name: string) => Effect.succeed(`Go Away ${name}!`) };

    // Service 3 and implementations
    class TextDecorator extends ServiceMap.Service<TextDecorator, {
        modify: (source: string) => string
    }>()("TextDecorator") { }

    type TextDecoratorType = ServiceMap.Service.Shape<typeof TextDecorator>

    // implementations
    const dashDecorator: TextDecoratorType = { modify: (source: string) => `----- ${source} -----` };
    const starDecorator: TextDecoratorType = { modify: (source: string) => `***** ${source} *****` };


    // Program that uses both services
    const program = Effect.gen(function* () {
        const textManipulator = yield* TextManipulator;
        const decorator = yield* TextDecorator;
        const greeter = yield* Greeter;
        const message = yield* greeter.getMessage('Jimmy');
        const result = decorator.modify(textManipulator.modify(message));
        return result;
    });


    const map1 = ServiceMap.empty().pipe(
        ServiceMap.add(Greeter, kindGreeter),
        ServiceMap.add(TextDecorator, spacer),
        ServiceMap.add(TextManipulator, starDecorator)
    );

    const map2 = ServiceMap.empty().pipe(
        ServiceMap.add(Greeter, kindGreeter),
        ServiceMap.add(TextDecorator, capitalizer),
        ServiceMap.add(TextManipulator, dashDecorator)
    );

    // Provide the entire context at once (without using Layers)
    (await Effect.runPromise(Effect.provide(program, map1)));
    (await Effect.runPromise(Effect.provide(program, map2)));

};



// === APPROACH 1: PARAMETERLESS METHODS AS DIRECT EFFECTS ===
// This is the recommended approach for simple methods without parameters
const directEffectExample = async () => {
    console.log("\n=== Direct Effect Example ===");

    // Define service with parameterless method as direct Effect
    class Counter extends ServiceMap.Service<Counter, {
        // Define increment as a direct Effect (not a function)
        readonly increment: Effect.Effect<number>
    }>()("Counter") { }


    // Program using the service
    const program = Effect.gen(function* () {
        const counter = yield* Counter;


        // Access increment directly (no function call)
        const value = yield* counter.increment;

        console.log(`Counter value: ${value}`);
        return value;
    });

    // Implementation
    const counterImpl = {
        // Provide increment as an Effect
        increment: Effect.sync(() => {
            const value = Math.floor(Math.random() * 100);
            console.log(`Generated value: ${value}`);
            return value;
        })
    };

    // Run the program
    const result = await Effect.runPromise(
        Effect.provideService(program, Counter, counterImpl)
    );

    assert(typeof result === "number", "Result is a number");
};

// === APPROACH 2: METHODS WITH PARAMETERS ===
// For methods that take parameters, use functions that return Effects
const parametricMethodExample = async () => {
    console.log("\n=== Parametric Method Example ===");

    // Define service with methods that take parameters
    class Calculator extends ServiceMap.Service<Calculator, {
        // Define add as a function that takes parameters and returns an Effect
        readonly add: (a: number, b: number) => Effect.Effect<number>
    }>()("Calculator") { }

    // Program using the service
    const program = Effect.gen(function* () {
        const calculator = yield* Calculator;

        // Call the function and yield* its result
        const sum = yield* calculator.add(5, 7);

        console.log(`Sum: ${sum}`);
        return sum;
    });

    // Implementation
    const calculatorImpl = {
        // Implement add as a function that returns an Effect
        add: (a: number, b: number) =>
            Effect.sync(() => {
                console.log(`Adding ${a} + ${b}`);
                return a + b;
            })
    };

    // Run the program
    const result = await Effect.runPromise(
        Effect.provideService(program, Calculator, calculatorImpl)
    );

    assert(result === 12);
};

// === APPROACH 3: FUNCTION RETURNING EFFECT (ALTERNATIVE) ===
// This demonstrates the alternative approach for parameterless methods
const functionReturningEffectExample = async () => {
    console.log("\n=== Function Returning Effect Example ===");

    // Define service with parameterless method as a function returning an Effect
    class RandomGenerator extends ServiceMap.Service<RandomGenerator, {
        // Define nextInt as a function that returns an Effect
        readonly nextInt: () => Effect.Effect<number>
    }>()("RandomGenerator") { }

    // Program using the service
    const program = Effect.gen(function* () {
        const random = yield* RandomGenerator;

        // Call the function and yield* its result
        const value = yield* random.nextInt();

        console.log(`Random value: ${value}`);
        return value;
    });

    // Implementation
    const randomImpl = {
        // Implement nextInt as a function that returns an Effect
        nextInt: () => Effect.sync(() => {
            const value = Math.floor(Math.random() * 100);
            console.log(`Generated random int: ${value}`);
            return value;
        })
    };

    // Run the program
    const result = await Effect.runPromise(Effect.provideService(program, RandomGenerator, randomImpl));

    assert(typeof result === "number", "Result is a number");
};

// === APPROACH 4: USING PIPE SYNTAX ===
// This demonstrates using Effect.Do and pipe syntax rather than generators
const pipeStyleExample = async () => {
    console.log("\n=== Pipe Style Example ===");

    // Define service
    class Logger extends ServiceMap.Service<Logger, {
        readonly log: (message: string) => Effect.Effect<void>,
        readonly getCurrentLevel: Effect.Effect<string>
    }>()("Logger") { }

    // Program using Do/pipe syntax
    const program = Effect.gen(function* () {
        const logger = yield* Logger;
        const level = yield* logger.getCurrentLevel;
        yield* logger.log(`Current level: ${level}`);
        return level;
    });

    // Implementation
    const loggerImpl = {
        log: (message: string) =>
            Effect.sync(() => {
                console.log(`LOG: ${message}`);
            }),
        getCurrentLevel: Effect.succeed("INFO")
    };

    // Run the program
    const result = await Effect.runPromise(
        Effect.provideService(program, Logger, loggerImpl)
    );

    assert(result === "INFO", "Got correct log level");
};

// === APPROACH 5: COMBINING MULTIPLE SERVICES ===
// Shows how to work with multiple services using the recommended approach
const multiServiceExample = async () => {
    console.log("\n=== Multiple Services Example ===");

    // Define services
    class Config extends ServiceMap.Service<Config, {
        readonly get: (key: string) => Effect.Effect<string>,
        readonly isDevelopment: Effect.Effect<boolean>
    }>()("Config") { }

    class Database extends ServiceMap.Service<Database, {
        readonly query: (sql: string) => Effect.Effect<string[]>,
        readonly getConnectionInfo: Effect.Effect<string>
    }>()("Database") { }

    // Program using multiple services
    const program = Effect.gen(function* () {
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
        get: (key: string) =>
            Effect.succeed(key === "database.name" ? "myapp_db" : "default"),
        isDevelopment: Effect.succeed(true)
    };

    const dbImpl = {
        query: (sql: string) =>
            Effect.sync(() => {
                console.log(`Executing: ${sql}`);
                return ["user1", "user2", "user3"];
            }),
        getConnectionInfo: Effect.succeed("localhost:5432")
    };

    // Provide multiple services at once
    const map = ServiceMap.empty().pipe(
        ServiceMap.add(Config, configImpl),
        ServiceMap.add(Database, dbImpl)
    );

    // Run the program
    const result = await Effect.runPromise(
        Effect.provide(program, map)
    );

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
    } catch (error) {
        console.error("Error running examples:", error);
    }
};

// Run the examples
runExamples();
