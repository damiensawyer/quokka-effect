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
const minimalUsefulLayerExample = async () => {
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
    // Run via services
    const context1 = effect_1.Context.empty().pipe(effect_1.Context.add(Greeter, kindGreeter), effect_1.Context.add(TextDecorator, spacer), effect_1.Context.add(TextManipulator, starDecorator));
    const context2 = effect_1.Context.empty().pipe(effect_1.Context.add(Greeter, kindGreeter), effect_1.Context.add(TextDecorator, capitalizer), effect_1.Context.add(TextManipulator, dashDecorator));
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, context1))); //?
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, context2))); //?
    // Now Run using Layers
    //Create layers for each TextManipulator implementation
    const CapitalizerLayer = effect_1.Layer.succeed(TextManipulator, capitalizer); // you're basically saying use this capitlizer service for the TextManip Interface
    const SpacerLayer = effect_1.Layer.succeed(TextManipulator, spacer);
    // Create layers for each Greeter implementation
    const KindGreeterLayer = effect_1.Layer.succeed(Greeter, kindGreeter);
    const MeanGreeterLayer = effect_1.Layer.succeed(Greeter, meanGreeter);
    const DashDecoratorLayer = effect_1.Layer.succeed(TextDecorator, dashDecorator);
    const StarDecoratorLayer = effect_1.Layer.succeed(TextDecorator, starDecorator);
    // Concise layer combinations
    const kindCapDashLayer = effect_1.Layer.mergeAll(KindGreeterLayer, CapitalizerLayer, DashDecoratorLayer);
    const kindCapStarLayer = effect_1.Layer.mergeAll(KindGreeterLayer, CapitalizerLayer, StarDecoratorLayer);
    const kindSpaceDashLayer = effect_1.Layer.mergeAll(KindGreeterLayer, SpacerLayer, DashDecoratorLayer);
    const kindSpaceStarLayer = effect_1.Layer.mergeAll(KindGreeterLayer, SpacerLayer, StarDecoratorLayer);
    const meanCapDashLayer = effect_1.Layer.mergeAll(MeanGreeterLayer, CapitalizerLayer, DashDecoratorLayer);
    const meanCapStarLayer = effect_1.Layer.mergeAll(MeanGreeterLayer, CapitalizerLayer, StarDecoratorLayer);
    const meanSpaceDashLayer = effect_1.Layer.mergeAll(MeanGreeterLayer, SpacerLayer, DashDecoratorLayer);
    const meanSpaceStarLayer = effect_1.Layer.mergeAll(MeanGreeterLayer, SpacerLayer, StarDecoratorLayer);
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, kindCapDashLayer))); //?
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, kindCapStarLayer))); //?
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, kindSpaceDashLayer))); //?
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, kindSpaceStarLayer))); //?
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, meanCapDashLayer))); //?
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, meanCapStarLayer))); //?
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, meanSpaceDashLayer))); //?
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, meanSpaceStarLayer))); //?
};
const runExamples = async () => {
    await minimalUsefulLayerExample();
};
runExamples();
//# sourceMappingURL=effect%20temp%20services%20and%20layers.js.map