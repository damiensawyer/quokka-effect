
import { Effect, Layer } from "effect";
import { Context } from "effect/Context";
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

  const appendExclamation = { append: (source: string) => `${source} !!!!` };
  const appendSmily = { append: (source: string) => `${source} :-)` };


  // servuce 2
  class TextManipulatorService extends Context.Tag("TextManipulator")<
    TextManipulatorService,
    {
      modify: (source: string) => string
    }
  >() { }

  const capitalizer = { modify: (source: string) => source.toUpperCase() };
  const spacer = { modify: (source: string) => source.split('').join(' ') };

  // Service 3
  class TextDecoratorService extends Context.Tag("TextDecorator")<
    TextDecoratorService,
    {
      modify: (source: string) => string
    }
  >() { }

  const dashDecorator = { modify: (source: string) => `----- ${source} -----` };
  const starDecorator = { modify: (source: string) => `***** ${source} *****` };

  // Now - define a service which has a requirement for other services, in one hit.
  // Using Context.Tag with static layer properties

  class CombinedTextService extends Context.Tag("CombinedTextService")<
    CombinedTextService,
    (s: string) => string
  >() {
    static Live = Layer.effect(
      CombinedTextService,
      Effect.gen(function* () {
        const appender = yield* AppenderService;
        const manipulator = yield* TextManipulatorService;
        const decorator = yield* TextDecoratorService;
        return (s: string) => appender.append(decorator.modify(manipulator.modify(s)))
      })
    )

    static Default = CombinedTextService.Live.pipe(
      Layer.provide(Layer.mergeAll(
        Layer.succeed(TextDecoratorService, starDecorator),
        Layer.succeed(TextManipulatorService, capitalizer),
        Layer.succeed(AppenderService, appendSmily)
      ))
    )

    static DefaultWithoutDependencies = CombinedTextService.Live
  }


  const program = Effect.gen(function* () {
    const textService = yield* CombinedTextService;
    var result = textService('hello')
    return result

  });

  // run default implementation
  const combinedTextServiceWithDefaults = CombinedTextService.Default
  Effect.runSync(Effect.provide(program, combinedTextServiceWithDefaults)) //?

  // run alternatives to default
  const alternatives = Layer.mergeAll(
    Layer.succeed(TextDecoratorService, dashDecorator),
    Layer.succeed(TextManipulatorService, spacer),
    Layer.succeed(AppenderService, appendExclamation)
  )
  const combinedTextServiceWithAlternativeServices = Layer.provide(CombinedTextService.DefaultWithoutDependencies, alternatives)
  Effect.runSync(Effect.provide(program, combinedTextServiceWithAlternativeServices)) //?

}


// Run examples
const runExamples = async () => {
  await minimalUsefulLayerExample();

};

runExamples();
