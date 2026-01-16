"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const effect_1 = require("effect");
/**
 * Demonstrates proper use of layers for service dependencies
 * without leaking implementation details.
 */
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed`);
    }
    if (!!message)
        console.log(`✓ ${message}`);
};
// Service 0
class AppenderService extends effect_1.Context.Tag("Appender")() {
}
const appendExclamation = { append: (source) => `${source} !!!!` };
const appendSmily = { append: (source) => `${source} :-)` };
// Service 1 and implementations
class TextManipulatorService extends effect_1.Context.Tag("TextManipulator")() {
}
const capitalizer = { modify: (source) => source.toUpperCase() };
const spacer = { modify: (source) => source.split('').join(' ') };
const capitalizeAndSpace = { modify: (source) => spacer.modify(capitalizer.modify(source)) };
// Service 2 and implementations
class GreeterService extends effect_1.Context.Tag("Greeter")() {
}
// implementations
const kindGreeter = { getMessage: (name) => effect_1.Effect.succeed(`Have a great day ${name}!`) };
const meanGreeter = { getMessage: (name) => effect_1.Effect.succeed(`Go Away ${name}!`) };
// Service 3 and implementations
class TextDecoratorService extends effect_1.Context.Tag("TextDecorator")() {
}
const dashDecorator = { modify: (source) => `----- ${source} -----` };
const starDecorator = { modify: (source) => `***** ${source} *****` };
// service 4 and impolentation (a service which uses other services)
class CombinedTextService extends effect_1.Context.Tag("CombinedTextService")() {
}
const CombinedTextServiceLive = effect_1.Layer.effect(CombinedTextService, effect_1.Effect.gen(function* () {
    // Access dependencies during layer creation
    const manipulator = yield* TextManipulatorService;
    const decorator = yield* TextDecoratorService;
    const appender = yield* AppenderService;
    // Return an implementation where formatText doesn't expose dependencies
    return {
        formatText: (source) => effect_1.Effect.succeed(appender.append(decorator.modify(manipulator.modify(source))))
    };
}));
const minimalUsefulLayerExample = async () => {
    // Program that uses both services
    const program = effect_1.Effect.gen(function* () {
        const textService = yield* CombinedTextService;
        const greeter = yield* GreeterService;
        const message = yield* greeter.getMessage('Jimmy');
        const result = yield* textService.formatText(message);
        return result;
    });
    // STOP Quokka and hover hover the classes to see their requiement signatures
    const mergeOfLayersWithHaveNoDependencies = effect_1.Layer.mergeAll(effect_1.Layer.succeed(TextManipulatorService, capitalizer), effect_1.Layer.succeed(TextDecoratorService, starDecorator), effect_1.Layer.succeed(GreeterService, kindGreeter), effect_1.Layer.succeed(AppenderService, appendSmily));
    const appLayer = (0, effect_1.pipe)(CombinedTextServiceLive, effect_1.Layer.provideMerge(mergeOfLayersWithHaveNoDependencies));
    effect_1.Effect.runPromise(effect_1.Effect.provide(program, appLayer)); //?
};
const runExamples = async () => {
    await minimalUsefulLayerExample();
};
runExamples();
//# sourceMappingURL=effect%20ts%20-%20good%20way%20with%20multi%20services%20showing%20why%20we%20use%20layers.js.map