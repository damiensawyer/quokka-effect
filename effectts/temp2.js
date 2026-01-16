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
const runExamples = async () => {
    await sampleShowingHowToPassMultipleServicesToProgram();
};
runExamples();
//# sourceMappingURL=temp2.js.map