// Scopes Docs https://effect.website/docs/resource-management/scope/


import { Effect, Scope, Console, Exit, Equal, SubscriptionRef, Ref, Stream, Random, Fiber } from "effect";
import { ChannelTypeId } from "effect/Channel";
import { first } from "lodash";

// Enhanced assert function that logs the successful assertion
const assert = (condition: boolean, message?: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  if (!!message) console.log(`✓ ${message}`);
};


// === First Example ===
const firstExample = async () => {

  const simpleExample = Effect.gen(function* () {
    // 1. Initialize the "Radio Station" with a value of 0
    const count = yield* SubscriptionRef.make(0);

    // 2. The Server: Increments the counter every 100ms
    const server = count.pipe(
      SubscriptionRef.update((n) => n + 1),
      Effect.delay("100 millis"),
      Effect.forever,
      Effect.fork // Run in the background
    );

    const serverFiber = yield* server;

    // 3. The Client: Subscribes to the "changes" stream
    // We only want to see the first 5 updates
    console.log("Client is tuning in...");

    const client1 = yield* count.changes.pipe(Stream.take(5), Stream.runCollect);
    const client2 = yield* count.changes.pipe(Stream.take(10), Stream.runCollect); // waits until client 1 is finished
    const groupedClients = yield* Effect.all([
      count.changes.pipe(Stream.take(5), Stream.runCollect),
      count.changes.pipe(Stream.take(5), Stream.runCollect)
    ], { concurrency: "unbounded" }); // waits until client 2 is finished, but then runs the two clients concurrently

    // 4. Cleanup
    yield* Fiber.interrupt(serverFiber);

    console.log("Client 1 received these values:", Array.from(client1));
    console.log("Client 2 received these values:", Array.from(client2));
    console.log("Grouped Clients received these values:", groupedClients.map(c => Array.from(c)));
  });

  Effect.runPromise(simpleExample);





};


// === Second Example ===
const secondExample = async () => {

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
  await firstExample();
  await secondExample();

  console.log("All tests passed successfully!");
};

runAll().catch(console.error);