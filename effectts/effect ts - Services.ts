// Effect Services - Best Practices Example
// This file demonstrates correct patterns for defining and using Effect services

import { Effect, Context, Console } from "effect";

const assert = (condition: boolean, message?: string) => {
    if (!condition) {
        throw new Error(`Assertion failed`);
    }
    if (!!message) console.log(`✓ ${message}`);
};


const superBasicExample = async () => {
    console.log("\n=== Direct Effect Example ===");

    // Define service with method that takes a name parameter
    class Greeter extends Context.Tag("Greeter")<
        Greeter,
        {
            getMessage: (name: string) => Effect.Effect<string, never, never>
        }
    >() { }

    type GreeterService = Context.Tag.Service<Greeter> // if you do this you can strongly type

    // Program using the service
    const program = Effect.gen(function* () {
        const greeter = yield* Greeter;
        const message = yield* greeter.getMessage('Jimmy');
        return message;
    });

    // Kind implementation
    const kindGreeter:GreeterService = {
        getMessage: (name: string) => Effect.succeed(`Have a great day ${name}!`)
    };

    // Mean implementation
    const meanGreeter:GreeterService = {
        getMessage: (name: string) => Effect.gen(function* (){
            yield* Console.log('say some message')
            return `Go away ${name}!`})
    };

    // Run with kind greeter
    const kindResult = await Effect.runPromise(Effect.provideService(program, Greeter, kindGreeter))
    kindResult //?

    const meanResult = await Effect.runPromise(Effect.provideService(program, Greeter, meanGreeter))
    meanResult //?
    
};

// Simple Example passing multiple services to a program

const sampleShowingHowToPassMultipleServicesToProgram = async () => {

    // Service 1 and implementations
    class TextManipulator extends Context.Tag("MyService")<
        TextManipulator,
        {
            modify: (source: string) => string
        }
    >() { }
    type TextManipulatorType = Context.Tag.Service<TextManipulator>

    const capitalizer: TextManipulatorType = { modify: (source) => source.toUpperCase() };
    const spacer: TextManipulatorType = { modify: (source) => source.split('').join(' ') };

    // Service 2 and implementations
    class Greeter extends Context.Tag("Greeter")<
        Greeter,
        {
            readonly getMessage: (name: string) => Effect.Effect<string, never, never>
        }
    >() { }

    type GreeterType = Context.Tag.Service<Greeter>

    // implementations
    const kindGreeter: GreeterType = { getMessage: (name: string) => Effect.succeed(`Have a great day ${name}!`) };
    const meanGreeter: GreeterType = { getMessage: (name: string) => Effect.succeed(`Go Away ${name}!`) };

    // Service 3 and implementations
    class TextDecorator extends Context.Tag("TextDecorator")<
        TextDecorator,
        {
            modify: (source: string) => string
        }
    >() { }

    type TextDecoratorType = Context.Tag.Service<TextDecorator>

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


    const context1 = Context.empty().pipe(
        Context.add(Greeter, kindGreeter),
        Context.add(TextDecorator, spacer),
        Context.add(TextManipulator, starDecorator)
    );

    const context2 = Context.empty().pipe(
        Context.add(Greeter, kindGreeter),
        Context.add(TextDecorator, capitalizer),
        Context.add(TextManipulator, dashDecorator)
    );

    // Provide the entire context at once (without using Layers)
    (await Effect.runPromise(Effect.provide(program, context1)));//?
    (await Effect.runPromise(Effect.provide(program, context2)));//?

};



// === APPROACH 1: PARAMETERLESS METHODS AS DIRECT EFFECTS ===
// This is the recommended approach for simple methods without parameters
const directEffectExample = async () => {
    console.log("\n=== Direct Effect Example ===");

    // Define service with parameterless method as direct Effect
    // Explaining Context.Tag https://claude.ai/chat/55e4b077-7b61-4e79-bdac-9571b8eb0826
    // it is KIND of like defining an interace in C# which services will implement
    class Counter extends Context.Tag("Counter")<
        Counter,
        {
            // Define increment as a direct Effect (not a function)
            readonly increment: Effect.Effect<number>
        }
    >() { }


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
    class Calculator extends Context.Tag("Calculator")<
        Calculator,
        {
            // Define add as a function that takes parameters and returns an Effect
            readonly add: (a: number, b: number) => Effect.Effect<number>
        }
    >() { }

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

    assert(result == 12);
};

// === APPROACH 3: FUNCTION RETURNING EFFECT (ALTERNATIVE) ===
// This demonstrates the alternative approach for parameterless methods
const functionReturningEffectExample = async () => {
    console.log("\n=== Function Returning Effect Example ===");

    // Define service with parameterless method as a function returning an Effect
    class RandomGenerator extends Context.Tag("RandomGenerator")<
        RandomGenerator,
        {
            // Define nextInt as a function that returns an Effect
            readonly nextInt: () => Effect.Effect<number>  // see in here for a discussion of the two versions: https://claude.ai/chat/55e4b077-7b61-4e79-bdac-9571b8eb0826
            /*
                Direct Effects (for parameterless operations):
                typescriptreadonly getCurrentLevel: Effect.Effect<string> // BUT Initialization happens once at service creation time, which may be unwanted for some effects

                Functions Returning Effects (for operations with parameters):
                typescriptreadonly log: (message: string) => Effect.Effect<void>
            */
        }
    >() { }

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
    class Logger extends Context.Tag("Logger")<
        Logger,
        {
            readonly log: (message: string) => Effect.Effect<void>,
            readonly getCurrentLevel: Effect.Effect<string>
        }
    >() { }

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
    class Config extends Context.Tag("Config")<
        Config,
        {
            readonly get: (key: string) => Effect.Effect<string>,
            readonly isDevelopment: Effect.Effect<boolean>
        }
    >() { }

    class Database extends Context.Tag("Database")<
        Database,
        {
            readonly query: (sql: string) => Effect.Effect<string[]>,
            readonly getConnectionInfo: Effect.Effect<string>
        }
    >() { }

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
    const context = Context.empty().pipe(
        Context.add(Config, configImpl),
        Context.add(Database, dbImpl)
    );

    // Run the program
    const result = await Effect.runPromise(
        Effect.provide(program, context)
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