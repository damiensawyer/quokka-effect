// Effect Services - Best Practices Example
// This file demonstrates correct patterns for defining and using Effect services

import { Effect, Context, Console, Layer } from "effect";

const assert = (condition: boolean, message?: string) => {
    if (!condition) {
        throw new Error(`Assertion failed`);
    }
    if (!!message) console.log(`✓ ${message}`);
};

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

const runExamples = async () => {
    await sampleShowingHowToPassMultipleServicesToProgram();
};
runExamples();