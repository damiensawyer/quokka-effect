"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const effect_1 = require("effect");
/**
    This script shows Why we need layers, and not just services
    IT WORKS, BUT SHOWS AN ANTI PATTERN.
    https://effect.website/docs/requirements-management/layers/#avoiding-requirement-leakage
 */
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed`);
    }
    if (!!message)
        console.log(`✓ ${message}`);
};
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
const dashDecorator = { modify: (source) => `----- ${source} -----` };
const starDecorator = { modify: (source) => `***** ${source} *****` };
// service 4 and impolentation (a service which uses other services)
class CombinedTextService extends effect_1.Context.Tag("CombinedTextService")() {
}
const combinedTextServiceImpl = {
    formatText: (source) => effect_1.Effect.gen(function* () {
        const manipulator = yield* TextManipulator;
        const decorator = yield* TextDecorator;
        const manipulated = manipulator.modify(source);
        const decorated = decorator.modify(manipulated);
        return decorated;
    })
};
const minimalUsefulLayerExample = async () => {
    // Program that uses both services
    const program = effect_1.Effect.gen(function* () {
        const textService = yield* CombinedTextService;
        const greeter = yield* Greeter;
        const message = yield* greeter.getMessage('Jimmy');
        const result = yield* textService.formatText(message);
        return result;
    });
    // Run via services
    const context1 = effect_1.Context.empty().pipe(effect_1.Context.add(Greeter, meanGreeter), effect_1.Context.add(TextDecorator, starDecorator), effect_1.Context.add(TextManipulator, spacer), effect_1.Context.add(CombinedTextService, combinedTextServiceImpl));
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, context1))); //?
};
const runExamples = async () => {
    await minimalUsefulLayerExample();
};
runExamples();
//# sourceMappingURL=effect%20ts%20-%20anti%20pattern%20with%20services%20showing%20why%20we%20use%20layers.js.map