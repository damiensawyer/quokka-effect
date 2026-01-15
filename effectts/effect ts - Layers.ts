import { Effect, Context, Layer, Exit, pipe } from "effect";

// === HELPERS ===
const assert = (condition: boolean, message?: string) => {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  if (message) console.log(`✓ ${message}`);
};

// === 1. BASIC LAYER CONCEPTS ===
const basicLayerExample = async () => {
  console.log("\n=== Basic Layer Example ===");

  class Database extends Context.Tag("Database")<
    Database,
    { readonly query: (sql: string) => Effect.Effect<string[]> }
  >() {}

  const DatabaseLive = Layer.succeed(
    Database,
    Database.of({
      query: (sql) => Effect.sync(() => {
        console.log(`Executing query: ${sql}`);
        return ["result1", "result2"];
      })
    })
  );

  const program = Effect.gen(function* () {
    const db = yield* Database;
    return yield* db.query("SELECT * FROM users");
  });

  const results = await Effect.runPromise(program.pipe(Effect.provide(DatabaseLive)));
  assert(results.length === 2, "Database query returned expected results");
};

// === 2. LAYER COMPOSITION (The Modern Way) ===
const layerCompositionExample = async () => {
  console.log("\n=== Layer Composition Example ===");

  class Config extends Context.Tag("Config")<Config, { readonly url: string }>() {}
  class Database extends Context.Tag("Database")<Database, { readonly connect: Effect.Effect<string> }>() {}

  const ConfigLive = Layer.succeed(Config, { url: "postgres://localhost" });

  const DatabaseLive = Layer.effect(
    Database,
    Effect.gen(function* () {
      const config = yield* Config;
      return { connect: Effect.succeed(`Connected to ${config.url}`) };
    })
  );

  // Modern usage: Layer.provide(target, source) 
  // Reads: "Provide ConfigLive to DatabaseLive"
  const MainLayer = DatabaseLive.pipe(Layer.provide(ConfigLive));

  const program = Effect.gen(function* () {
    const db = yield* Database;
    return yield* db.connect;
  });

  const result = await Effect.runPromise(program.pipe(Effect.provide(MainLayer)));
  assert(result.includes("postgres://localhost"), "Vertical composition worked");
};

// === 3. SCOPED LAYERS (Resource Management) ===
const scopedLayersExample = async () => {
  console.log("\n=== Scoped Layers Example ===");

  class Connection extends Context.Tag("Connection")<Connection, { readonly status: string }>() {}

  let isClosed = false;

  const ConnectionLive = Layer.scoped(
    Connection,
    Effect.acquireRelease(
      Effect.sync(() => {
        console.log("Opening connection...");
        return { status: "open" };
      }),
      () => Effect.sync(() => {
        console.log("Closing connection...");
        isClosed = true;
      })
    )
  );

  const program = Effect.gen(function* () {
    const conn = yield* Connection;
    assert(conn.status === "open");
  });

  // Effect.scoped ensures the layer's finalizers run
  await Effect.runPromise(program.pipe(Effect.provide(ConnectionLive), Effect.scoped));
  assert(isClosed, "Scoped resource was cleaned up");
};

// === 4. LAYER ERROR HANDLING (Fixing the Exit type error) ===
const layerErrorHandlingExample = async () => {
  console.log("\n=== Layer Error Handling Example ===");

  class Config extends Context.Tag("Config")<Config, { readonly val: string }>() {}
  const ConfigFailure = Layer.fail(new Error("Missing Config"));

  const program = Effect.gen(function* () {
    return yield* Config;
  });

  const exit = await Effect.runPromiseExit(
    program.pipe(Effect.provide(ConfigFailure))
  );

  // FIX: Type Guard to access .cause safely
  if (Exit.isFailure(exit)) {
    assert(exit.cause.toString().includes("Missing Config"), "Caught expected layer error");
  } else {
    throw new Error("Program should have failed");
  }
};

// === 5. MEMOIZATION & FRESH ===
const layerMemoizationExample = async () => {
  console.log("\n=== Layer Memoization Example ===");

  let initCount = 0;
  class Service extends Context.Tag("Service")<Service, { readonly id: number }>() {}

  const ServiceLive = Layer.effect(
    Service,
    Effect.sync(() => {
      initCount++;
      return { id: initCount };
    })
  );

  const program = Effect.gen(function* () {
    yield* Service;
    yield* Service;
  });

  // Memoized: Service is initialized only once even if merged multiple times
  const MemoizedLayer = Layer.merge(ServiceLive, ServiceLive);
  await Effect.runPromise(program.pipe(Effect.provide(MemoizedLayer)));
  assert(initCount === 1, "Default layers are memoized");

  // Non-Memoized: Using Layer.fresh
  initCount = 0;
  const FreshLayer = Layer.provide(
    Layer.merge(ServiceLive, ServiceLive), // Note: This internal merge will still share the instance
    Layer.fresh(ServiceLive)
  );
  // In practice, Layer.fresh is used when you want a completely new instance for a specific dependency tree
};

// === RUNNER ===
const runAll = async () => {
  try {
    await basicLayerExample();
    await layerCompositionExample();
    await scopedLayersExample();
    await layerErrorHandlingExample();
    await layerMemoizationExample();
    console.log("\n✅ All Layer examples completed successfully!");
  } catch (error) {
    console.error("❌ Suite Error:", error);
  }
};

runAll();