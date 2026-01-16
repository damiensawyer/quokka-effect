"use strict";
// Layers in Effect Tutorial
// Based on documentation from https://effect.website/docs/service-management/layer
Object.defineProperty(exports, "__esModule", { value: true });
const effect_1 = require("effect");
// Enhanced assert function that logs successful assertions
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    if (!!message)
        console.log(`✓ ${message}`);
};
const minimalLayerExample = async () => {
    class Greeter extends effect_1.Context.Tag("Greeter")() {
    }
    const program = effect_1.Effect.gen(function* () {
        const greeter = yield* Greeter;
        const message = yield* greeter.getMessage('Jimmy');
        return message;
    });
    // implementations
    const kindGreeter = { getMessage: (name) => effect_1.Effect.succeed(`Have a great day ${name}!`) };
    const meanGreeter = { getMessage: (name) => effect_1.Effect.succeed(`Go Away ${name}!`) };
    // Create layers for each implementation
    const KindGreeterLayer = effect_1.Layer.succeed(Greeter, kindGreeter);
    const MeanGreeterLayer = effect_1.Layer.succeed(Greeter, meanGreeter);
    // NOTE - this isn't really achieving anything with Layers, because you COULD just have passed in services... this is the very basic. https://claude.ai/chat/a1912c70-5c07-436a-af77-4a3dc4dfd1f1
    // Run with kind greeter
    const kindProgram = effect_1.Effect.provide(program, KindGreeterLayer);
    effect_1.Effect.runPromise(kindProgram); //?
    // Run with mean greeter
    const meanProgram = effect_1.Effect.provide(program, MeanGreeterLayer);
    effect_1.Effect.runPromise(meanProgram); //?
};
const minimalUsefulLayerExample = async () => {
    // Service 1 and implementations
    class TextManipulator extends effect_1.Context.Tag("TextManipulator")() {
    }
    const capitalizer = {
        modify: (source) => source.toUpperCase()
    };
    const spacer = {
        modify: (source) => source.split('').join(' ')
    };
    // Service 2 and implementations
    class Greeter extends effect_1.Context.Tag("Greeter")() {
    }
    // implementations
    const kindGreeter = { getMessage: (name) => effect_1.Effect.succeed(`Have a great day ${name}!`) };
    const meanGreeter = { getMessage: (name) => effect_1.Effect.succeed(`Go Away ${name}!`) };
    // Create layers for each TextManipulator implementation
    const CapitalizerLayer = effect_1.Layer.succeed(TextManipulator, capitalizer);
    const SpacerLayer = effect_1.Layer.succeed(TextManipulator, spacer);
    // Create layers for each Greeter implementation
    const KindGreeterLayer = effect_1.Layer.succeed(Greeter, kindGreeter);
    const MeanGreeterLayer = effect_1.Layer.succeed(Greeter, meanGreeter);
    // Program that uses both services
    const program = effect_1.Effect.gen(function* () {
        const textManipulator = yield* TextManipulator;
        const greeter = yield* Greeter;
        const message = yield* greeter.getMessage('Jimmy');
        const result = textManipulator.modify(message);
        return result;
    });
    // Combine layers for different scenarios
    const kindCapitalizeLayer = effect_1.Layer.merge(KindGreeterLayer, CapitalizerLayer);
    const kindSpaceLayer = effect_1.Layer.merge(KindGreeterLayer, SpacerLayer);
    const meanCapitalizeLayer = effect_1.Layer.merge(MeanGreeterLayer, CapitalizerLayer);
    const meanSpaceLayer = effect_1.Layer.merge(MeanGreeterLayer, SpacerLayer);
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, kindCapitalizeLayer))); //?
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, kindSpaceLayer))); //?
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, meanCapitalizeLayer))); //?
    (await effect_1.Effect.runPromise(effect_1.Effect.provide(program, meanSpaceLayer))); //?
};
// === BASIC LAYER CONCEPTS ===
// Layers are used to construct and compose service implementations
const basicLayerExample = async () => {
    console.log("=== Basic Layer Example ===");
    // Define a service tag for a database service
    class Database extends effect_1.Context.Tag("Database")() {
    }
    // Create a layer that provides the Database service (test implementation)
    const DatabaseTest = effect_1.Layer.succeed(Database, {
        query: (sql) => effect_1.Effect.sync(() => {
            console.log(`Executing query: ${sql}`);
            return ["result1", "result2"];
        })
    });
    // A program that uses the Database service
    const program = effect_1.Effect.gen(function* () {
        const db = yield* Database;
        const results = yield* db.query("SELECT * FROM users");
        console.log("Query results:", results);
        return results;
    });
    // Run the program with the database layer
    const runnable = program.pipe(effect_1.Effect.provide(DatabaseTest));
    const results = await effect_1.Effect.runPromise(runnable);
    assert(results.length === 2, "Database query returned expected results");
    assert(results[0] === "result1", "First result is correct");
};
// // === LAYER CONSTRUCTORS ===
// // Different ways to create layers
const layerConstructorsExample = async () => {
    console.log("=== Layer Constructors Example ===");
    // 1. Define service tags
    class Logger extends effect_1.Context.Tag("Logger")() {
    }
    class Config extends effect_1.Context.Tag("Config")() {
    }
    // 2. Create layers using different constructors
    // Layer.succeed - Create a layer with a fixed implementation
    const LoggerLive = effect_1.Layer.succeed(Logger, {
        log: (message) => effect_1.Effect.sync(() => console.log(`[LOG] ${message}`))
    });
    // Layer.effect - Create a layer using an effect
    const ConfigTest = effect_1.Layer.effect(Config, effect_1.Effect.succeed({ dbUrl: "memory://test-db" }));
    // Layer.function - Create a layer from a function that requires other services
    class DbConnection extends effect_1.Context.Tag("DbConnection")() {
    }
    const DbConnectionLive = effect_1.Layer.effect(DbConnection, effect_1.Effect.gen(function* () {
        // Access other services or configs here
        const config = yield* Config;
        return {
            connect: () => effect_1.Effect.succeed(`Connected to ${config.dbUrl}`)
        };
    }));
    // Create a program that uses both services
    const program = effect_1.Effect.gen(function* () {
        const logger = yield* Logger;
        const db = yield* DbConnection;
        yield* logger.log("Connecting to database...");
        const connectionResult = yield* db.connect();
        yield* logger.log(connectionResult);
        return connectionResult;
    });
    // Combine layers and run the program
    const combinedLayer = (0, effect_1.pipe)(DbConnectionLive, effect_1.Layer.provide(ConfigTest), effect_1.Layer.merge(LoggerLive));
    const runnable = program.pipe(effect_1.Effect.provide(combinedLayer));
    const result = await effect_1.Effect.runPromise(runnable);
    assert(result.includes("Connected to"), "Program connected to the database");
    assert(result.includes("memory://test-db"), "Program used the correct connection URL");
};
// // === LAYER COMPOSITION ===
// // Ways to compose layers together
const layerCompositionExample = async () => {
    console.log("=== Layer Composition Example ===");
    // Define service tags
    class UserRepo extends effect_1.Context.Tag("UserRepo")() {
    }
    class Database extends effect_1.Context.Tag("Database")() {
    }
    class Config extends effect_1.Context.Tag("Config")() {
    }
    // Create layers with dependencies
    const ConfigLive = effect_1.Layer.succeed(Config, { dbUrl: "postgres://localhost" });
    // Database layer depends on Config
    const DatabaseLive = effect_1.Layer.effect(Database, effect_1.Effect.gen(function* () {
        const config = yield* Config;
        console.log(`Initializing database with ${config.dbUrl}`);
        return {
            query: (sql) => effect_1.Effect.succeed([`Result for ${sql} from ${config.dbUrl}`])
        };
    }));
    // UserRepo layer depends on Database
    const UserRepoLive = effect_1.Layer.effect(UserRepo, effect_1.Effect.gen(function* () {
        const db = yield* Database;
        return {
            getUser: (id) => (0, effect_1.pipe)(db.query(`SELECT * FROM users WHERE id = '${id}'`), effect_1.Effect.map(results => results[0] || "User not found"))
        };
    }));
    // 1. Compose layers using provide (vertical composition)
    const dbLayer = effect_1.Layer.provide(DatabaseLive, ConfigLive);
    // 2. Compose layers using merge (horizontal composition)
    const allLayers = effect_1.Layer.provide(UserRepoLive, dbLayer);
    // Create a program that uses UserRepo
    const program = effect_1.Effect.gen(function* () {
        const userRepo = yield* UserRepo;
        const user = yield* userRepo.getUser("123");
        console.log("User:", user);
        return user;
    });
    // Run the program with all layers 
    // The layer combination ensures all required services (Config and Database) are provided
    const result = await effect_1.Effect.runPromise(effect_1.Effect.provide(program, allLayers));
    assert(result.includes("Result for SELECT"), "Program retrieved user data");
    assert(result.includes("postgres://localhost"), "Program used the correct database URL");
};
const scopedLayersExample = async () => {
    console.log("=== Scoped Layers Example ===");
    // Service tag for a database connection
    class DbConnection extends effect_1.Context.Tag("DbConnection")() {
    }
    // Track resource lifecycles
    let connectionOpened = false;
    let connectionClosed = false;
    let queriesRun = 0;
    // Create a scoped layer that acquires and releases a connection
    const DbConnectionLive = effect_1.Layer.scoped(DbConnection, effect_1.Effect.acquireRelease(
    // Acquire connection
    effect_1.Effect.sync(() => {
        console.log("Opening database connection");
        connectionOpened = true;
        return {
            query: (sql) => effect_1.Effect.sync(() => {
                console.log(`Executing query: ${sql}`);
                queriesRun++;
                return ["result1", "result2"];
            })
        };
    }), 
    // Release connection
    () => effect_1.Effect.sync(() => {
        console.log("Closing database connection");
        connectionClosed = true;
    })));
    // Program that uses the connection to run multiple queries
    const program = effect_1.Effect.gen(function* () {
        const db = yield* DbConnection;
        yield* db.query("SELECT * FROM users");
        yield* db.query("SELECT * FROM orders");
        return "Queries completed";
    });
    // Run the program with the scoped layer
    const runnable = effect_1.Effect.scoped(program.pipe(effect_1.Effect.provide(DbConnectionLive)));
    await effect_1.Effect.runPromise(runnable);
    assert(connectionOpened, "Database connection was opened");
    assert(connectionClosed, "Database connection was properly closed");
    assert(queriesRun === 2, "Two queries were executed");
};
const layerMemoizationExample = async () => {
    console.log("=== Layer Memoization Example ===");
    // Define service tags
    class ServiceA extends effect_1.Context.Tag("ServiceA")() {
    }
    class ServiceB extends effect_1.Context.Tag("ServiceB")() {
    }
    class ServiceC extends effect_1.Context.Tag("ServiceC")() {
    }
    // Track initialization
    let serviceAInitCount = 0;
    // Service A layer with side effect to track initialization
    const ServiceALive = effect_1.Layer.effect(ServiceA, effect_1.Effect.sync(() => {
        serviceAInitCount++;
        console.log(`ServiceA initialized (count: ${serviceAInitCount})`);
        return { value: `A-${serviceAInitCount}` };
    }));
    // Service B and C both depend on Service A
    const ServiceBLive = effect_1.Layer.effect(ServiceB, effect_1.Effect.gen(function* () {
        const serviceA = yield* ServiceA;
        return {
            useA: () => effect_1.Effect.succeed(`B using ${serviceA.value}`)
        };
    }));
    const ServiceCLive = effect_1.Layer.effect(ServiceC, effect_1.Effect.gen(function* () {
        const serviceA = yield* ServiceA;
        return {
            useA: () => effect_1.Effect.succeed(`C using ${serviceA.value}`)
        };
    }));
    // 1. Global memoization example
    const BLayer = effect_1.Layer.provide(ServiceBLive, ServiceALive);
    const CLayer = effect_1.Layer.provide(ServiceCLive, ServiceALive);
    const combinedLayer = effect_1.Layer.merge(BLayer, CLayer);
    const program = effect_1.Effect.gen(function* () {
        const serviceB = yield* ServiceB;
        const serviceC = yield* ServiceC;
        const bResult = yield* serviceB.useA();
        const cResult = yield* serviceC.useA();
        return { bResult, cResult };
    });
    const result = await effect_1.Effect.runPromise(program.pipe(effect_1.Effect.provide(combinedLayer)));
    assert(serviceAInitCount === 1, "ServiceA was initialized only once (memoized)");
    assert(result.bResult === "B using A-1", "ServiceB uses the correct ServiceA instance");
    assert(result.cResult === "C using A-1", "ServiceC uses the same ServiceA instance");
    // 2. Using Layer.fresh to bypass memoization
    serviceAInitCount = 0; // Reset counter
    const nonMemoizedLayer = effect_1.Layer.merge(effect_1.Layer.provide(ServiceBLive, effect_1.Layer.fresh(ServiceALive)), effect_1.Layer.provide(ServiceCLive, effect_1.Layer.fresh(ServiceALive)));
    const result2 = await effect_1.Effect.runPromise(program.pipe(effect_1.Effect.provide(nonMemoizedLayer)));
    assert(serviceAInitCount === 2, "ServiceA was initialized twice (non-memoized)");
    assert(result2.bResult !== result2.cResult, "ServiceB and ServiceC use different ServiceA instances");
};
const layerErrorHandlingExample = async () => {
    console.log("=== Layer Error Handling Example ===");
    // Define error classes
    class ConfigError extends Error {
        _tag = "ConfigError";
        constructor(message) {
            super(message);
            this.name = "ConfigError";
        }
    }
    class DatabaseError extends Error {
        _tag = "DatabaseError";
        constructor(message) {
            super(message);
            this.name = "DatabaseError";
        }
    }
    // Define service tags
    class Config extends effect_1.Context.Tag("Config")() {
    }
    class Database extends effect_1.Context.Tag("Database")() {
    }
    // Create layers with potential errors
    const ConfigLive = effect_1.Layer.succeed(Config, { dbUrl: "postgres://localhost" });
    const ConfigErrorLayer = effect_1.Layer.fail(new ConfigError("Missing database URL"));
    const DatabaseLive = effect_1.Layer.effect(Database, effect_1.Effect.gen(function* () {
        const config = yield* Config;
        // Simulate a database connection error
        if (config.dbUrl.includes("invalid")) {
            return yield* effect_1.Effect.fail(new DatabaseError("Failed to connect to database"));
        }
        return {
            query: (sql) => effect_1.Effect.succeed([`Result for ${sql}`])
        };
    }));
    // Create programs to test layer error handling
    const program = effect_1.Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query("SELECT 1");
    });
    // 1. Success case
    const successResult = await effect_1.Effect.runPromiseExit(program.pipe(effect_1.Effect.provide((0, effect_1.pipe)(DatabaseLive, effect_1.Layer.provide(ConfigLive)))));
    assert(successResult._tag === "Success", "Program succeeded with valid configuration");
    // 2. Config error case
    const configErrorResult = await effect_1.Effect.runPromiseExit(program.pipe(effect_1.Effect.provide((0, effect_1.pipe)(DatabaseLive, effect_1.Layer.provide(ConfigErrorLayer)))));
    assert(configErrorResult._tag === "Failure", "Program failed with config error");
    assert(configErrorResult._tag === "Failure" && configErrorResult.cause.toString().includes("ConfigError"), "Error was correctly propagated from config layer");
    // 3. Error recovery with orElse
    const recoveredConfigLayer = effect_1.Layer.orElse(ConfigErrorLayer, () => ConfigLive);
    const recoveryLayer = effect_1.Layer.provide(DatabaseLive, recoveredConfigLayer);
    const recoveryResult = await effect_1.Effect.runPromiseExit(program.pipe(effect_1.Effect.provide(recoveryLayer)));
    assert(recoveryResult._tag === "Success", "Program succeeded with fallback configuration");
};
const advancedLayersExample = async () => {
    console.log("=== Advanced Layer Patterns ===");
    // Define a set of service tags for a more realistic example
    class Config extends effect_1.Context.Tag("Config")() {
    }
    class Database extends effect_1.Context.Tag("Database")() {
    }
    class UserRepository extends effect_1.Context.Tag("UserRepository")() {
    }
    class UserService extends effect_1.Context.Tag("UserService")() {
    }
    class ExternalApiClient extends effect_1.Context.Tag("ExternalApiClient")() {
    }
    // Track service lifecycle
    let dbConnected = false;
    let dbDisconnected = false;
    // 1. Environment-specific configurations using Layer.succeed
    const ConfigDev = effect_1.Layer.succeed(Config, {
        apiKey: "dev-api-key",
        dbUrl: "memory://dev-db"
    });
    const ConfigProd = effect_1.Layer.succeed(Config, {
        apiKey: "prod-api-key",
        dbUrl: "postgres://prod-db"
    });
    // 2. Resource management with Layer.scoped
    const DatabaseLive = effect_1.Layer.scoped(Database, effect_1.Effect.gen(function* () {
        const config = yield* Config;
        // Resource acquisition
        const connect = () => effect_1.Effect.sync(() => {
            console.log(`Connecting to ${config.dbUrl}`);
            dbConnected = true;
        });
        // Resource cleanup
        const disconnect = () => effect_1.Effect.sync(() => {
            console.log(`Disconnecting from ${config.dbUrl}`);
            dbDisconnected = true;
        });
        // Make sure connection is established before returning the service
        yield* connect();
        // Add finalizer to ensure disconnection
        yield* effect_1.Effect.addFinalizer(() => disconnect());
        return {
            connect,
            disconnect,
            query: (sql) => effect_1.Effect.succeed([`Result for ${sql} from ${config.dbUrl}`])
        };
    }));
    // 3. Service implementation depending on other services
    const UserRepositoryLive = effect_1.Layer.effect(UserRepository, effect_1.Effect.gen(function* () {
        const db = yield* Database;
        return {
            getUser: (id) => (0, effect_1.pipe)(db.query(`SELECT * FROM users WHERE id = '${id}'`), effect_1.Effect.map(results => ({ id, name: results[0] || "Unknown" }))),
            saveUser: (user) => (0, effect_1.pipe)(db.query(`INSERT INTO users VALUES ('${user.id}', '${user.name}')`), effect_1.Effect.map(() => undefined))
        };
    }));
    const ExternalApiClientLive = effect_1.Layer.effect(ExternalApiClient, effect_1.Effect.gen(function* () {
        const config = yield* Config;
        return {
            enrichUserData: (user) => effect_1.Effect.succeed({
                ...user,
                enriched: true
            })
        };
    }));
    // 4. Composing multiple dependencies
    const UserServiceLive = effect_1.Layer.effect(UserService, effect_1.Effect.gen(function* () {
        const userRepo = yield* UserRepository;
        const apiClient = yield* ExternalApiClient;
        return {
            getUserDetails: (id) => (0, effect_1.pipe)(userRepo.getUser(id), effect_1.Effect.flatMap(user => apiClient.enrichUserData(user)))
        };
    }));
    // 5. Putting it all together with a comprehensive layer
    const dbLayer = effect_1.Layer.provide(DatabaseLive, ConfigDev);
    const repoLayer = effect_1.Layer.provide(UserRepositoryLive, dbLayer);
    const apiLayer = effect_1.Layer.provide(ExternalApiClientLive, ConfigDev);
    const userServiceDeps = effect_1.Layer.merge(repoLayer, apiLayer);
    const userServiceLayer = effect_1.Layer.provide(UserServiceLive, userServiceDeps);
    const AppLayerDev = effect_1.Layer.merge(userServiceLayer, userServiceDeps);
    // Create a program that uses the UserService
    const program = effect_1.Effect.gen(function* () {
        const userService = yield* UserService;
        const userDetails = yield* userService.getUserDetails("123");
        console.log("User details:", userDetails);
        return userDetails;
    });
    // Run the program with the dev layer configuration
    const result = await effect_1.Effect.runPromise(effect_1.Effect.scoped(program.pipe(effect_1.Effect.provide(AppLayerDev))));
    assert(result.id === "123", "Program returned the correct user ID");
    assert(result.enriched === true, "User data was properly enriched");
    assert(dbConnected, "Database connection was established");
    assert(dbDisconnected, "Database connection was properly closed");
};
const testingWithLayersExample = async () => {
    console.log("=== Testing with Layers ===");
    // Define a service for a user repository
    class UserRepository extends effect_1.Context.Tag("UserRepository")() {
    }
    // Define a service that uses the repository
    class UserService extends effect_1.Context.Tag("UserService")() {
    }
    // Implementation of UserService that depends on UserRepository
    const UserServiceLive = effect_1.Layer.effect(UserService, effect_1.Effect.gen(function* () {
        const repo = yield* UserRepository;
        return {
            getUserById: (id) => (0, effect_1.pipe)(repo.getUser(id), effect_1.Effect.flatMap(user => user ? effect_1.Effect.succeed(user) : effect_1.Effect.fail(new Error(`User ${id} not found`)))),
            createUser: (id, name) => repo.saveUser({ id, name })
        };
    }));
    // 1. Create a test implementation with in-memory repository
    const testUsers = {
        "1": { id: "1", name: "Test User" }
    };
    const UserRepositoryTest = effect_1.Layer.succeed(UserRepository, {
        getUser: (id) => effect_1.Effect.succeed(testUsers[id] || null),
        saveUser: (user) => effect_1.Effect.sync(() => {
            testUsers[user.id] = user;
        })
    });
    // 2. Create test cases
    // Test case 1: Get existing user
    const testGetExistingUser = effect_1.Effect.gen(function* () {
        const userService = yield* UserService;
        const user = yield* userService.getUserById("1");
        assert(user.id === "1", "Retrieved correct user ID");
        assert(user.name === "Test User", "Retrieved correct user name");
    });
    // Test case 2: Get non-existent user
    const testGetNonExistentUser = effect_1.Effect.gen(function* () {
        const userService = yield* UserService;
        const result = yield* effect_1.Effect.either(userService.getUserById("999"));
        assert(result._tag === "Left", "Getting non-existent user returns an error");
        assert(result._tag === "Left" && result.left.message.includes("not found"), "Error message indicates user not found");
    });
    // Test case 3: Create a new user
    const testCreateUser = effect_1.Effect.gen(function* () {
        const userService = yield* UserService;
        yield* userService.createUser("2", "New User");
        const user = yield* userService.getUserById("2");
        assert(user.id === "2", "Created user has correct ID");
        assert(user.name === "New User", "Created user has correct name");
    });
    // 3. Run the tests with the test layer
    const testLayer = (0, effect_1.pipe)(UserServiceLive, effect_1.Layer.provide(UserRepositoryTest));
    await effect_1.Effect.runPromise(testGetExistingUser.pipe(effect_1.Effect.provide(testLayer)));
    await effect_1.Effect.runPromise(testGetNonExistentUser.pipe(effect_1.Effect.provide(testLayer)));
    await effect_1.Effect.runPromise(testCreateUser.pipe(effect_1.Effect.provide(testLayer)));
    console.log("All tests passed!");
};
// === RUN ALL EXAMPLES ===
const runAll = async () => {
    try {
        await minimalLayerExample();
        await minimalUsefulLayerExample();
        await basicLayerExample();
        await layerConstructorsExample();
        await layerCompositionExample();
        await scopedLayersExample();
        await layerMemoizationExample();
        await layerErrorHandlingExample();
        await advancedLayersExample();
        await testingWithLayersExample();
        console.log("\n✅ All Layer examples completed successfully!");
    }
    catch (error) {
        console.error("❌ Error running examples:", error);
    }
};
// Execute all examples
runAll();
//# sourceMappingURL=effect%20ts%20-%20Layers%20detailed.js.map