import { Effect, Context, Console, Layer } from "effect";

/**
    This script shows Why we need layers, and not just services
    IT WORKS, BUT SHOWS AN ANTI PATTERN. 
    https://effect.website/docs/requirements-management/layers/#avoiding-requirement-leakage
 */

const assert = (condition: boolean, message?: string) => {
    if (!condition) {
        throw new Error(`Assertion failed`);
    }
    if (!!message) console.log(`✓ ${message}`);
};


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

const dashDecorator: TextDecoratorType = { modify: (source: string) => `----- ${source} -----` };
const starDecorator: TextDecoratorType = { modify: (source: string) => `***** ${source} *****` };



// service 4 and impolentation (a service which uses other services)
class CombinedTextService extends Context.Tag("CombinedTextService")<
    CombinedTextService,
    {
        // You don't want to do this - passing in TextManipulator | TextDecorator, because it is leaking the abstraction
        // It works .... but there is a better way with Layers
        // https://effect.website/docs/requirements-management/layers/#avoiding-requirement-leakage
        formatText: (source: string) => Effect.Effect<string, never, TextManipulator | TextDecorator>

    }
>() { }

type CombinedTextServiceType = Context.Tag.Service<CombinedTextService>

const combinedTextServiceImpl: CombinedTextServiceType = {
    formatText: (source: string) => Effect.gen(function* () {
        const manipulator = yield* TextManipulator;
        const decorator = yield* TextDecorator;
        const manipulated = manipulator.modify(source);
        const decorated = decorator.modify(manipulated);
        return decorated;
    })
}

const minimalUsefulLayerExample = async () => {
    // Program that uses both services
    const program = Effect.gen(function* () {
        const textService = yield* CombinedTextService;
        const greeter = yield* Greeter;
        const message = yield* greeter.getMessage('Jimmy');
        const result = yield* textService.formatText(message);
        return result;
    });

    // Run via services
    const context1 = Context.empty().pipe(
        Context.add(Greeter, meanGreeter),
        Context.add(TextDecorator, starDecorator),
        Context.add(TextManipulator, spacer),
        Context.add(CombinedTextService, combinedTextServiceImpl),
    );

    (await Effect.runPromise(Effect.provide(program, context1)));//?

};

const runExamples = async () => {
    await minimalUsefulLayerExample();
};
runExamples();