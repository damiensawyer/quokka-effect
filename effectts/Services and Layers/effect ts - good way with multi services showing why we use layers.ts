// @ts-nocheck
import { Effect, Context, Layer, pipe } from "effect";

/**
 * Demonstrates proper use of layers for service dependencies
 * without leaking implementation details.
 */

const assert = (condition: boolean, message?: string) => {
    if (!condition) {
        throw new Error(`Assertion failed`);
    }
    if (!!message) console.log(`✓ ${message}`);
};

// Service 0
class AppenderService extends Context.Tag("Appender")<
    AppenderService,
    {
        append: (s: string) => string
    }
>() { }

const appendExclamation = { append: (source: string) => `${source} !!!!` };
const appendSmily = { append: (source: string) => `${source} :-)` };


// Service 1 and implementations
class TextManipulatorService extends Context.Tag("TextManipulator")<
    TextManipulatorService,
    {
        modify: (source: string) => string
    }
>() { }

const capitalizer = { modify: (source: string) => source.toUpperCase() };
const spacer = { modify: (source: string) => source.split('').join(' ') };
const capitalizeAndSpace = { modify: (source: string) => spacer.modify(capitalizer.modify(source)) };

// Service 2 and implementations
class GreeterService extends Context.Tag("Greeter")<
    GreeterService,
    {
        getMessage: (name: string) => Effect.Effect<string, never, never>
    }
>() { }

// implementations
const kindGreeter = { getMessage: (name: string) => Effect.succeed(`Have a great day ${name}!`) };
const meanGreeter = { getMessage: (name: string) => Effect.succeed(`Go Away ${name}!`) };

// Service 3 and implementations
class TextDecoratorService extends Context.Tag("TextDecorator")<
    TextDecoratorService,
    {
        modify: (source: string) => string
    }
>() { }

const dashDecorator = { modify: (source: string) => `----- ${source} -----` };
const starDecorator = { modify: (source: string) => `***** ${source} *****` };



// service 4 and impolentation (a service which uses other services)
class CombinedTextService extends Context.Tag("CombinedTextService")<
    CombinedTextService,
    {
        // Clean interface without leaking dependencies
        // Could also do this formatText: (source: string) => string
        formatText: (source: string) => Effect.Effect<string>
    }
>() { }


const CombinedTextServiceLive = Layer.effect(
    CombinedTextService,
    Effect.gen(function* () {
        // Access dependencies during layer creation
        const manipulator = yield* TextManipulatorService;
        const decorator = yield* TextDecoratorService;
        const appender = yield* AppenderService;

        // Return an implementation where formatText doesn't expose dependencies
        return {
            formatText: (source: string) => Effect.succeed(
                appender.append(decorator.modify(manipulator.modify(source)))
                //decorator.modify(manipulator.modify(source))
            )
        };
    })
);

const minimalUsefulLayerExample = async () => {
    // Program that uses both services
    const program = Effect.gen(function* () {
        const textService = yield* CombinedTextService;
        const greeter = yield* GreeterService;
        const message = yield* greeter.getMessage('Jimmy');
        const result = yield* textService.formatText(message);
        return result;
    });

    // STOP Quokka and hover hover the classes to see their requiement signatures
    const mergeOfLayersWithHaveNoDependencies = Layer.mergeAll(
        Layer.succeed(TextManipulatorService, capitalizer),
        Layer.succeed(TextDecoratorService, starDecorator),
        Layer.succeed(GreeterService, kindGreeter),
        Layer.succeed(AppenderService, appendSmily)
    )

    const appLayer = pipe(
        CombinedTextServiceLive,
        Layer.provideMerge(mergeOfLayersWithHaveNoDependencies)
    )



    Effect.runPromise(Effect.provide(program, appLayer)) //?
};

const runExamples = async () => {
    await minimalUsefulLayerExample();
};
runExamples();
