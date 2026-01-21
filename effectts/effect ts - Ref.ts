// Scopes Docs https://effect.website/docs/resource-management/scope/


import { Effect, Scope, Console, Exit, Equal, SubscriptionRef, Ref, Stream, Random, Fiber, Context } from "effect";
import { ChannelTypeId } from "effect/Channel";

// Enhanced assert function that logs the successful assertion
const assert = (condition: boolean, message?: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  if (!!message) console.log(`✓ ${message}`);
};


class Counter {
  inc: Effect.Effect<void>
  dec: Effect.Effect<void>
  get: Effect.Effect<number>

  constructor(private value: Ref.Ref<number>) {
    this.inc = Ref.update(this.value, (n) => n + 1)
    this.dec = Ref.update(this.value, (n) => n - 1)
    this.get = Ref.get(this.value)
  }
}

const make = Effect.andThen(Ref.make(0), (value) => new Counter(value))


// === BASIC Ref USAGE ===
const basicRefExample = async () => {
  const program = Effect.gen(function* () {
    const counter = yield* make
    yield* counter.inc
    yield* counter.inc
    yield* counter.inc
    yield* counter.dec
    yield* counter.inc
    const value = yield* counter.get
    console.log(`This counter has a value of ${value}.`)
  })

  Effect.runPromise(program)
};


// === Concurrent ===
const concurrentRefExample = async () => {
  const program = Effect.gen(function* () {
    const counter = yield* make

    // Helper to log the counter's value before running an effect
    const logCounter = <R, E, A>(
      label: string,
      effect: Effect.Effect<A, E, R>
    ) =>
      Effect.gen(function* () {
        const value = yield* counter.get
        yield* Effect.log(`${label} get: ${value}`)
        return yield* effect
      })

    yield* logCounter("task 1", counter.inc).pipe(
      Effect.zip(logCounter("task 2", counter.inc), { concurrent: true }),
      Effect.zip(logCounter("task 3", counter.dec), { concurrent: true }),
      Effect.zip(logCounter("task 4", counter.inc), { concurrent: true })
    )
    const value = yield* counter.get
    const message = `This counter has a value of ${value}.` //?
    yield* Effect.log(message)
  })

  Effect.runPromise(program)
};



// === Use ref as Service to pass state around program ===
const refAsService = async () => {
  // Create a Tag for our state
  class MyState extends Context.Tag("MyState")<
    MyState,
    Ref.Ref<number>
  >() { }

  // Subprogram 1: Increment the state value twice
  const subprogram1 = Effect.gen(function* () {
    const state = yield* MyState
    yield* Ref.update(state, (n) => n + 1000)
    yield* Ref.update(state, (n) => n + 100)
  })

  // Subprogram 2: Decrement the state value and then increment it
  const subprogram2 = Effect.gen(function* () {
    const state = yield* MyState
    yield* Ref.update(state, (n) => n - 1)
    yield* Ref.update(state, (n) => n + 1)
  })

  // Subprogram 3: Read and log the current value of the state
  const subprogram3 = Effect.gen(function* () {
    const state = yield* MyState
    const value = yield* Ref.get(state)
    console.log(`MyState has a value of ${value}.`)
  })

  // Compose subprograms 1, 2, and 3 to create the main program
  const program = Effect.gen(function* () {
    
    yield* subprogram1
    yield* subprogram2
    yield* subprogram3
    
  })

  // Create a Ref instance with an initial value of 0
  const initialState = Ref.make(0)

  // Provide the Ref as a service
  const runnable = program.pipe(
    Effect.provideServiceEffect(MyState, initialState)
  )

  // Run the program and observe the output
  Effect.runPromise(runnable)
};



// === Use for state across fibres===
const refStateAcrossFibers = async () => {
  //see https://effect.website/docs/state-management/ref/#sharing-state-between-fibers 
};






// Run all examples
const runAll = async () => {
  await basicRefExample();
  await concurrentRefExample();
  await refAsService();
  await refStateAcrossFibers()

  console.log("All tests passed successfully!");
};

runAll().catch(console.error);