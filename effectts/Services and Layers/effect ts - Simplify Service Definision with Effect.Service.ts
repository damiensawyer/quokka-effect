
import { Effect, Console, Layer, Context } from "effect";
import { upperCase } from "lodash";
// https://effect.website/docs/requirements-management/layers/#simplifying-service-definitions-with-effectservice
// This demo shows a way to create a service / tag but giving it default implmentations of requirements


const minimalUsefulLayerExample = async () => {
  // Service 1
  class AppenderService extends Context.Tag("Appender")<
    AppenderService,
    {
      append: (s: string) => string
    }
  >() { }
  type AppenderType = Context.Tag.Service<AppenderService>
  const appendExclamation: AppenderType = { append: (source) => `${source} !!!!` };
  const appendSmily: AppenderType = { append: (source) => `${source} :-)` };


  // servuce 2
  class TextManipulatorService extends Context.Tag("TextManipulator")<
    TextManipulatorService,
    {
      modify: (source: string) => string
    }
  >() { }
  type TextManipulatorType = Context.Tag.Service<TextManipulatorService>

  const capitalizer: TextManipulatorType = { modify: (source) => source.toUpperCase() };
  const spacer: TextManipulatorType = { modify: (source) => source.split('').join(' ') };

  // Service 3
  class TextDecoratorService extends Context.Tag("TextDecorator")<
    TextDecoratorService,
    {
      modify: (source: string) => string
    }
  >() { }

  type TextDecoratorServiceType = Context.Tag.Service<TextDecoratorService>

  const dashDecorator: TextDecoratorServiceType = { modify: (source: string) => `----- ${source} -----` };
  const starDecorator: TextDecoratorServiceType = { modify: (source: string) => `***** ${source} *****` };

  // Now - define a service which has a requirement for other services, in one hit.
  // This is instead of HAVING to define a Layer and then pass dependencies to it (but you still can)

  class CombinedTextServiceLive extends Effect.Service<CombinedTextServiceLive>()("combined", {
    effect: Effect.gen(function* () {
      const appender = yield* AppenderService;
      const manipulator = yield* TextManipulatorService;
      const decorator = yield* TextDecoratorService;
      return (s: string) => appender.append(decorator.modify(manipulator.modify(s)))
    }),
    dependencies: [
      Layer.succeed(TextDecoratorService, starDecorator),
      Layer.succeed(TextManipulatorService, capitalizer),
      Layer.succeed(AppenderService, appendSmily)]

  }) { }


  const program = Effect.gen(function* () {
    const textService = yield* CombinedTextServiceLive;
    var result = textService('hello')
    return result

  });

  // run default implementation
  const combinedTextServiceWithDefaults = CombinedTextServiceLive.Default
  Effect.runSync(Effect.provide(program, combinedTextServiceWithDefaults)) //?

  // run alternatives to default
  const alternatives = Layer.mergeAll(
    Layer.succeed(TextDecoratorService, dashDecorator),
    Layer.succeed(TextManipulatorService, spacer),
    Layer.succeed(AppenderService, appendExclamation)
  )
  const combinedTextServiceWithAlternativeServices = Layer.provide(CombinedTextServiceLive.DefaultWithoutDependencies, alternatives)
  Effect.runSync(Effect.provide(program, combinedTextServiceWithAlternativeServices)) //?

}


// Run examples
const runExamples = async () => {
  await minimalUsefulLayerExample();

};

runExamples();