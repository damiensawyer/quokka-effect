"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const effect_1 = require("effect");
// https://effect.website/docs/requirements-management/layers/#simplifying-service-definitions-with-effectservice
// This demo shows a way to create a service / tag but giving it default implmentations of requirements
const minimalUsefulLayerExample = async () => {
    // Service 1
    class AppenderService extends effect_1.Context.Tag("Appender")() {
    }
    const appendExclamation = { append: (source) => `${source} !!!!` };
    const appendSmily = { append: (source) => `${source} :-)` };
    // servuce 2
    class TextManipulatorService extends effect_1.Context.Tag("TextManipulator")() {
    }
    const capitalizer = { modify: (source) => source.toUpperCase() };
    const spacer = { modify: (source) => source.split('').join(' ') };
    // Service 3
    class TextDecoratorService extends effect_1.Context.Tag("TextDecorator")() {
    }
    const dashDecorator = { modify: (source) => `----- ${source} -----` };
    const starDecorator = { modify: (source) => `***** ${source} *****` };
    // Now - define a service which has a requirement for other services, in one hit.
    // This is instead of HAVING to define a Layer and then pass dependencies to it (but you still can)
    class CombinedTextServiceLive extends effect_1.Effect.Service()("combined", {
        effect: effect_1.Effect.gen(function* () {
            const appender = yield* AppenderService;
            const manipulator = yield* TextManipulatorService;
            const decorator = yield* TextDecoratorService;
            return (s) => appender.append(decorator.modify(manipulator.modify(s)));
        }),
        dependencies: [
            effect_1.Layer.succeed(TextDecoratorService, starDecorator),
            effect_1.Layer.succeed(TextManipulatorService, capitalizer),
            effect_1.Layer.succeed(AppenderService, appendSmily)
        ]
    }) {
    }
    const program = effect_1.Effect.gen(function* () {
        const textService = yield* CombinedTextServiceLive;
        var result = textService('hello');
        return result;
    });
    // run default implementation
    const combinedTextServiceWithDefaults = CombinedTextServiceLive.Default;
    effect_1.Effect.runSync(effect_1.Effect.provide(program, combinedTextServiceWithDefaults)); //?
    // run alternatives to default
    const alternatives = effect_1.Layer.mergeAll(effect_1.Layer.succeed(TextDecoratorService, dashDecorator), effect_1.Layer.succeed(TextManipulatorService, spacer), effect_1.Layer.succeed(AppenderService, appendExclamation));
    const combinedTextServiceWithAlternativeServices = effect_1.Layer.provide(CombinedTextServiceLive.DefaultWithoutDependencies, alternatives);
    effect_1.Effect.runSync(effect_1.Effect.provide(program, combinedTextServiceWithAlternativeServices)); //?
};
// Run examples
const runExamples = async () => {
    await minimalUsefulLayerExample();
};
runExamples();
//# sourceMappingURL=effect%20ts%20-%20Simplify%20Service%20Definision%20with%20Effect.Service.js.map