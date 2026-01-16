"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const effect_1 = require("effect");
// === HELPERS ===
const assert = (condition, message) => {
    if (!condition)
        throw new Error(`Assertion failed: ${message}`);
    if (message)
        console.log(`✓ ${message}`);
};
// === 1. BASIC LAYER CONCEPTS ===
const basicLayerExample = async () => {
    console.log("\n=== Basic Layer Example ===");
    class Database extends effect_1.Context.Tag("Database")() {
    }
    const DatabaseLive = effect_1.Layer.succeed(Database, Database.of({
        query: (sql) => effect_1.Effect.sync(() => {
            console.log(`Executing query: ${sql}`);
            return ["result1", "result2"];
        })
    }));
    const program = effect_1.Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query("SELECT * FROM users");
    });
    const results = await effect_1.Effect.runPromise(program.pipe(effect_1.Effect.provide(DatabaseLive)));
    assert(results.length === 2, "Database query returned expected results");
};
// === 2. LAYER COMPOSITION (The Modern Way) ===
const layerCompositionExample = async () => {
    console.log("\n=== Layer Composition Example ===");
    class Config extends effect_1.Context.Tag("Config")() {
    }
    class Database extends effect_1.Context.Tag("Database")() {
    }
    const ConfigLive = effect_1.Layer.succeed(Config, { url: "postgres://localhost" });
    const DatabaseLive = effect_1.Layer.effect(Database, effect_1.Effect.gen(function* () {
        const config = yield* Config;
        return { connect: effect_1.Effect.succeed(`Connected to ${config.url}`) };
    }));
    // Modern usage: Layer.provide(target, source) 
    // Reads: "Provide ConfigLive to DatabaseLive"
    const MainLayer = DatabaseLive.pipe(effect_1.Layer.provide(ConfigLive));
    const program = effect_1.Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.connect;
    });
    const result = await effect_1.Effect.runPromise(program.pipe(effect_1.Effect.provide(MainLayer)));
    assert(result.includes("postgres://localhost"), "Vertical composition worked");
};
// === 3. SCOPED LAYERS (Resource Management) ===
const scopedLayersExample = async () => {
    console.log("\n=== Scoped Layers Example ===");
    class Connection extends effect_1.Context.Tag("Connection")() {
    }
    let isClosed = false;
    const ConnectionLive = effect_1.Layer.scoped(Connection, effect_1.Effect.acquireRelease(effect_1.Effect.sync(() => {
        console.log("Opening connection...");
        return { status: "open" };
    }), () => effect_1.Effect.sync(() => {
        console.log("Closing connection...");
        isClosed = true;
    })));
    const program = effect_1.Effect.gen(function* () {
        const conn = yield* Connection;
        assert(conn.status === "open");
    });
    // Effect.scoped ensures the layer's finalizers run
    await effect_1.Effect.runPromise(program.pipe(effect_1.Effect.provide(ConnectionLive), effect_1.Effect.scoped));
    assert(isClosed, "Scoped resource was cleaned up");
};
// === 4. LAYER ERROR HANDLING (Fixing the Exit type error) ===
const layerErrorHandlingExample = async () => {
    console.log("\n=== Layer Error Handling Example ===");
    class Config extends effect_1.Context.Tag("Config")() {
    }
    const ConfigFailure = effect_1.Layer.fail(new Error("Missing Config"));
    const program = effect_1.Effect.gen(function* () {
        return yield* Config;
    });
    const exit = await effect_1.Effect.runPromiseExit(program.pipe(effect_1.Effect.provide(ConfigFailure)));
    // FIX: Type Guard to access .cause safely
    if (effect_1.Exit.isFailure(exit)) {
        assert(exit.cause.toString().includes("Missing Config"), "Caught expected layer error");
    }
    else {
        throw new Error("Program should have failed");
    }
};
// === 5. MEMOIZATION & FRESH ===
const layerMemoizationExample = async () => {
    console.log("\n=== Layer Memoization Example ===");
    let initCount = 0;
    class Service extends effect_1.Context.Tag("Service")() {
    }
    const ServiceLive = effect_1.Layer.effect(Service, effect_1.Effect.sync(() => {
        initCount++;
        return { id: initCount };
    }));
    const program = effect_1.Effect.gen(function* () {
        yield* Service;
        yield* Service;
    });
    // Memoized: Service is initialized only once even if merged multiple times
    const MemoizedLayer = effect_1.Layer.merge(ServiceLive, ServiceLive);
    await effect_1.Effect.runPromise(program.pipe(effect_1.Effect.provide(MemoizedLayer)));
    assert(initCount === 1, "Default layers are memoized");
    // Non-Memoized: Using Layer.fresh
    initCount = 0;
    const FreshLayer = effect_1.Layer.provide(effect_1.Layer.merge(ServiceLive, ServiceLive), // Note: This internal merge will still share the instance
    effect_1.Layer.fresh(ServiceLive));
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
    }
    catch (error) {
        console.error("❌ Suite Error:", error);
    }
};
runAll();
//# sourceMappingURL=effect%20ts%20-%20Layers.js.map