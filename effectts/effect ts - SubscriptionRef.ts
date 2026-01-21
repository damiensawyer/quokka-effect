// Scopes Docs https://effect.website/docs/resource-management/scope/


import { Effect, Scope, Console, Exit, Equal, SubscriptionRef, Ref, Stream, Random, Fiber } from "effect";
import { ChannelTypeId } from "effect/Channel";

// Enhanced assert function that logs the successful assertion
const assert = (condition: boolean, message?: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  if (!!message) console.log(`✓ ${message}`);
};

// === BASIC SCOPE USAGE ===
const basicExample = async () => {

  // Server function that increments a shared value forever
  const server = (ref: Ref.Ref<number>) => Ref.update(ref, (n) => n + 1).pipe(Effect.forever)

  // Client function that observes the stream of changes
  const client = (changes: Stream.Stream<number>) =>
    Effect.gen(function* () {
      const n = yield* Random.nextIntBetween(1, 10)
      const chunk = yield* Stream.runCollect(Stream.take(changes, n))
      return chunk
    })


  const program = Effect.gen(function* () {
    // Create a SubscriptionRef with an initial value of 0
    const ref = yield* SubscriptionRef.make(0)

    // Fork the server to run concurrently
    const serverFiber = yield* Effect.fork(server(ref))

    // Create 5 clients that subscribe to the changes stream
    const clients = new Array(5).fill(null).map(() => client(ref.changes))

    // Run all clients in concurrently and collect their results
    const chunks = yield* Effect.all(clients, { concurrency: "unbounded" })

    // Interrupt the server when clients are done
    yield* Fiber.interrupt(serverFiber)

    // Output the results collected by each client
    for (const chunk of chunks) {
      console.log(chunk)
    }
  })

  Effect.runPromise(program)



};



// Run all examples
const runAll = async () => {
  await basicExample();

  console.log("All tests passed successfully!");
};

runAll().catch(console.error);