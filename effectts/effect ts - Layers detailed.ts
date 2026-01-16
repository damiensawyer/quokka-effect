// Layers in Effect Tutorial
// Based on documentation from https://effect.website/docs/service-management/layer

import { Effect, Context, Layer, Console, Scope, Exit, Equal, pipe, Data } from "effect";

// Enhanced assert function that logs successful assertions
const assert = (condition: boolean, message?: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  if (!!message) console.log(`✓ ${message}`);
};

const minimalLayerExample = async () => {
  class Greeter extends Context.Tag("Greeter")<
    Greeter,
    {
      getMessage: (name: string) => Effect.Effect<string, never, never>
    }
  >() { }

  type GreeterShape = Context.Tag.Service<Greeter> // if you do this you can strongly type
  const program = Effect.gen(function* () {
    const greeter = yield* Greeter;
    const message = yield* greeter.getMessage('Jimmy');
    return message;
  });

  // implementations
  const kindGreeter: GreeterShape = { getMessage: (name: string) => Effect.succeed(`Have a great day ${name}!`) };
  const meanGreeter: GreeterShape = { getMessage: (name: string) => Effect.succeed(`Go Away ${name}!`) };

  // Create layers for each implementation
  const KindGreeterLayer = Layer.succeed(Greeter, kindGreeter)
  const MeanGreeterLayer = Layer.succeed(Greeter, meanGreeter)

  // NOTE - this isn't really achieving anything with Layers, because you COULD just have passed in services... this is the very basic. https://claude.ai/chat/a1912c70-5c07-436a-af77-4a3dc4dfd1f1
  // Run with kind greeter
  const kindProgram = Effect.provide(program, KindGreeterLayer)
  Effect.runPromise(kindProgram) //?

  // Run with mean greeter
  const meanProgram = Effect.provide(program, MeanGreeterLayer)
  Effect.runPromise(meanProgram) //?
};



const minimalUsefulLayerExample = async () => {

    // Service 1 and implementations
    class TextManipulator extends Context.Tag("TextManipulator")<
        TextManipulator,
        {
            modify: (source: string) => string
        }
    >() { }
    type TextManipulatorType = Context.Tag.Service<TextManipulator>

    const capitalizer: TextManipulatorType = {
        modify: (source) => source.toUpperCase()
    };

    const spacer: TextManipulatorType = {
        modify: (source) => source.split('').join(' ')
    };

    // Service 2 and implementations
    class Greeter extends Context.Tag("Greeter")<
        Greeter,
        {
          // this DOESN'T HAVE TO BE AN EFFECT..... could just be a plain funciton. Only add Effect if it brings something to the table
          readonly getMessage: (name: string) => Effect.Effect<string, never, never> 
        }
    >() { }

    type GreeterType = Context.Tag.Service<Greeter>

    // implementations
    const kindGreeter: GreeterType = { getMessage: (name: string) => Effect.succeed(`Have a great day ${name}!`) };
    const meanGreeter: GreeterType = { getMessage: (name: string) => Effect.succeed(`Go Away ${name}!`) };

    // Create layers for each TextManipulator implementation
    const CapitalizerLayer = Layer.succeed(TextManipulator, capitalizer);
    const SpacerLayer = Layer.succeed(TextManipulator, spacer);

    // Create layers for each Greeter implementation
    const KindGreeterLayer = Layer.succeed(Greeter, kindGreeter);
    const MeanGreeterLayer = Layer.succeed(Greeter, meanGreeter);

    // Program that uses both services
    const program = Effect.gen(function* () {
        const textManipulator = yield* TextManipulator;
        const greeter = yield* Greeter;
        const message = yield* greeter.getMessage('Jimmy');
        const result = textManipulator.modify(message);
        return result;
    });

    // Combine layers for different scenarios
    const kindCapitalizeLayer = Layer.merge(KindGreeterLayer, CapitalizerLayer);
    const kindSpaceLayer = Layer.merge(KindGreeterLayer, SpacerLayer);
    const meanCapitalizeLayer = Layer.merge(MeanGreeterLayer, CapitalizerLayer);
    const meanSpaceLayer = Layer.merge(MeanGreeterLayer, SpacerLayer);

    (await Effect.runPromise(Effect.provide(program, kindCapitalizeLayer)));//?
    (await Effect.runPromise(Effect.provide(program, kindSpaceLayer)));//?
    (await Effect.runPromise(Effect.provide(program, meanCapitalizeLayer)));//?
    (await Effect.runPromise(Effect.provide(program, meanSpaceLayer)));//?

};


// === BASIC LAYER CONCEPTS ===
// Layers are used to construct and compose service implementations
const basicLayerExample = async () => {
  console.log("=== Basic Layer Example ===");

  // Define a service tag for a database service
  class Database extends Context.Tag("Database")<
    Database,
    { readonly query: (sql: string) => Effect.Effect<string[]> }
  >() { }

  // Create a layer that provides the Database service (test implementation)
  const DatabaseTest = Layer.succeed(
    Database,
    {
      query: (sql: string) =>
        Effect.sync(() => {
          console.log(`Executing query: ${sql}`);
          return ["result1", "result2"];
        })
    }
  );



  // A program that uses the Database service
  const program = Effect.gen(function* () {
    const db = yield* Database;
    const results = yield* db.query("SELECT * FROM users");
    console.log("Query results:", results);
    return results;
  });

  // Run the program with the database layer
  const runnable = program.pipe(Effect.provide(DatabaseTest));
  const results = await Effect.runPromise(runnable);

  assert(results.length === 2, "Database query returned expected results");
  assert(results[0] === "result1", "First result is correct");
};

// // === LAYER CONSTRUCTORS ===
// // Different ways to create layers
const layerConstructorsExample = async () => {
  console.log("=== Layer Constructors Example ===");

  // 1. Define service tags
  class Logger extends Context.Tag("Logger")<
    Logger, 
    { readonly log: (message: string) => Effect.Effect<void> }
  >() {}

  class Config extends Context.Tag("Config")<
    Config,
    { readonly dbUrl: string }
  >() {}

  // 2. Create layers using different constructors

  // Layer.succeed - Create a layer with a fixed implementation
  const LoggerLive = Layer.succeed(
    Logger,
    {
      log: (message) => Effect.sync(() => console.log(`[LOG] ${message}`))
    }
  );

  // Layer.effect - Create a layer using an effect
  const ConfigTest = Layer.effect(
    Config,
    Effect.succeed({ dbUrl: "memory://test-db" })
  );

  // Layer.function - Create a layer from a function that requires other services
  class DbConnection extends Context.Tag("DbConnection")<
    DbConnection,
    { readonly connect: () => Effect.Effect<string> }
  >() {}

  const DbConnectionLive = Layer.effect(
    DbConnection,
    Effect.gen(function* () {
      // Access other services or configs here
      const config = yield* Config; 
      
      return {
        connect: () => Effect.succeed(`Connected to ${config.dbUrl}`)
      };
    })
  );

  // Create a program that uses both services
  const program = Effect.gen(function* () {
    const logger = yield* Logger;
    const db = yield* DbConnection;

    yield* logger.log("Connecting to database...");
    const connectionResult = yield* db.connect();
    yield* logger.log(connectionResult);

    return connectionResult;
  });

  // Combine layers and run the program
  const combinedLayer = pipe(
    DbConnectionLive,
    Layer.provide(ConfigTest),
    Layer.merge(LoggerLive)
  );

  const runnable = program.pipe(Effect.provide(combinedLayer));
  const result = await Effect.runPromise(runnable);

  assert(result.includes("Connected to"), "Program connected to the database");
  assert(result.includes("memory://test-db"), "Program used the correct connection URL");
};

// // === LAYER COMPOSITION ===
// // Ways to compose layers together
const layerCompositionExample = async () => {
  console.log("=== Layer Composition Example ===");

  // Define service tags
  class UserRepo extends Context.Tag("UserRepo")<
    UserRepo,
    { readonly getUser: (id: string) => Effect.Effect<string> }
  >() {}

  class Database extends Context.Tag("Database")<
    Database,
    { readonly query: (sql: string) => Effect.Effect<string[]> }
  >() {}

  class Config extends Context.Tag("Config")<
    Config,
    { readonly dbUrl: string }
  >() {}

  // Create layers with dependencies
  const ConfigLive = Layer.succeed(Config, { dbUrl: "postgres://localhost" });

  // Database layer depends on Config
  const DatabaseLive = Layer.effect(
    Database,
    Effect.gen(function* () {
      const config = yield* Config;
      console.log(`Initializing database with ${config.dbUrl}`);
      return {
        query: (sql: string) => Effect.succeed([`Result for ${sql} from ${config.dbUrl}`])
      };
    })
  );

  // UserRepo layer depends on Database
  const UserRepoLive = Layer.effect(
    UserRepo,
    Effect.gen(function* () {
      const db = yield* Database;
      return {
        getUser: (id: string) => 
          pipe(
            db.query(`SELECT * FROM users WHERE id = '${id}'`),
            Effect.map(results => results[0] || "User not found")
          )
      };
    })
  );

  // 1. Compose layers using provide (vertical composition)
  const dbLayer = Layer.provide(DatabaseLive, ConfigLive);

  // 2. Compose layers using merge (horizontal composition)
  const allLayers = Layer.provide(UserRepoLive, dbLayer);

  // Create a program that uses UserRepo
  const program = Effect.gen(function* () {
    const userRepo = yield* UserRepo;
    const user = yield* userRepo.getUser("123");
    console.log("User:", user);
    return user;
  });

  // Run the program with all layers 
  // The layer combination ensures all required services (Config and Database) are provided
  const result = await Effect.runPromise(Effect.provide(program, allLayers));

  assert(result.includes("Result for SELECT"), "Program retrieved user data");
  assert(result.includes("postgres://localhost"), "Program used the correct database URL");
};

const scopedLayersExample = async () => {
  console.log("=== Scoped Layers Example ===");

  // Service tag for a database connection
  class DbConnection extends Context.Tag("DbConnection")<
    DbConnection,
    { readonly query: (sql: string) => Effect.Effect<string[]> }
  >() {}

  // Track resource lifecycles
  let connectionOpened = false;
  let connectionClosed = false;
  let queriesRun = 0;

  // Create a scoped layer that acquires and releases a connection
  const DbConnectionLive = Layer.scoped(
    DbConnection,
    Effect.acquireRelease(
      // Acquire connection
      Effect.sync(() => {
        console.log("Opening database connection");
        connectionOpened = true;
        return {
          query: (sql: string) => Effect.sync(() => {
            console.log(`Executing query: ${sql}`);
            queriesRun++;
            return ["result1", "result2"];
          })
        };
      }),
      // Release connection
      () => Effect.sync(() => {
        console.log("Closing database connection");
        connectionClosed = true;
      })
    )
  );

  // Program that uses the connection to run multiple queries
  const program = Effect.gen(function* () {
    const db = yield* DbConnection;

    yield* db.query("SELECT * FROM users");
    yield* db.query("SELECT * FROM orders");

    return "Queries completed";
  });

  // Run the program with the scoped layer
  const runnable = Effect.scoped(
    program.pipe(Effect.provide(DbConnectionLive))
  );

  await Effect.runPromise(runnable);

  assert(connectionOpened, "Database connection was opened");
  assert(connectionClosed, "Database connection was properly closed");
  assert(queriesRun === 2, "Two queries were executed");
};

const layerMemoizationExample = async () => {
  console.log("=== Layer Memoization Example ===");

  // Define service tags
  class ServiceA extends Context.Tag("ServiceA")<
    ServiceA,
    { readonly value: string }
  >() {}

  class ServiceB extends Context.Tag("ServiceB")<
    ServiceB,
    { readonly useA: () => Effect.Effect<string> }
  >() {}

  class ServiceC extends Context.Tag("ServiceC")<
    ServiceC,
    { readonly useA: () => Effect.Effect<string> }
  >() {}

  // Track initialization
  let serviceAInitCount = 0;

  // Service A layer with side effect to track initialization
  const ServiceALive = Layer.effect(
    ServiceA,
    Effect.sync(() => {
      serviceAInitCount++;
      console.log(`ServiceA initialized (count: ${serviceAInitCount})`);
      return { value: `A-${serviceAInitCount}` };
    })
  );

  // Service B and C both depend on Service A
  const ServiceBLive = Layer.effect(
    ServiceB,
    Effect.gen(function* () {
      const serviceA = yield* ServiceA;
      return { 
        useA: () => Effect.succeed(`B using ${serviceA.value}`) 
      };
    })
  );

  const ServiceCLive = Layer.effect(
    ServiceC,
    Effect.gen(function* () {
      const serviceA = yield* ServiceA;
      return { 
        useA: () => Effect.succeed(`C using ${serviceA.value}`) 
      };
    })
  );

  // 1. Global memoization example
  const BLayer = Layer.provide(ServiceBLive, ServiceALive);
  const CLayer = Layer.provide(ServiceCLive, ServiceALive);
  const combinedLayer = Layer.merge(BLayer, CLayer);

  const program = Effect.gen(function* () {
    const serviceB = yield* ServiceB;
    const serviceC = yield* ServiceC;

    const bResult = yield* serviceB.useA();
    const cResult = yield* serviceC.useA();

    return { bResult, cResult };
  });

  const result = await Effect.runPromise(program.pipe(Effect.provide(combinedLayer)));

  assert(serviceAInitCount === 1, "ServiceA was initialized only once (memoized)");
  assert(result.bResult === "B using A-1", "ServiceB uses the correct ServiceA instance");
  assert(result.cResult === "C using A-1", "ServiceC uses the same ServiceA instance");

  // 2. Using Layer.fresh to bypass memoization
  serviceAInitCount = 0; // Reset counter

  const nonMemoizedLayer = Layer.merge(
    Layer.provide(ServiceBLive, Layer.fresh(ServiceALive)),
    Layer.provide(ServiceCLive, Layer.fresh(ServiceALive))
  );

  const result2 = await Effect.runPromise(program.pipe(Effect.provide(nonMemoizedLayer)));

  assert(serviceAInitCount === 2, "ServiceA was initialized twice (non-memoized)");
  assert(result2.bResult !== result2.cResult, "ServiceB and ServiceC use different ServiceA instances");
};

const layerErrorHandlingExample = async () => {
  console.log("=== Layer Error Handling Example ===");

  

  class ConfigError extends Data.TaggedError("ConfigError")<{
    readonly message: string;
  }> {}

  // Define service tags
  class Config extends Context.Tag("Config")<
    Config,
    { readonly dbUrl: string }
  >() {}

  
  class DatabaseError extends Data.TaggedError("DatabaseError")<{
    readonly message: string;
    readonly code: string;
  }> {}
  class Database extends Context.Tag("Database")<
    Database,
    { readonly query: (sql: string) => Effect.Effect<string[]> }
  >() {}

  // Create layers with potential errors
  const ConfigLive = Layer.succeed(Config, { dbUrl: "postgres://localhost" });

  const ConfigErrorLayer = Layer.fail(new ConfigError({message:"Missing database URL"} ));

  const DatabaseLive = Layer.effect(
    Database,
    Effect.gen(function* () {
      const config = yield* Config;

      // Simulate a database connection error
      if (config.dbUrl.includes("invalid")) {
        return yield* Effect.fail(new DatabaseError({message:"Failed to connect to database", code: "CONN_ERR"}));
      }

      return {
        query: (sql: string) => Effect.succeed([`Result for ${sql}`])
      };
    })
  );

  // Create programs to test layer error handling
  const program = Effect.gen(function* () {
    const db = yield* Database;
    return yield* db.query("SELECT 1");
  });

  // 1. Success case
  const successResult = await Effect.runPromiseExit(
    program.pipe(Effect.provide(pipe(DatabaseLive, Layer.provide(ConfigLive))))
  );

  assert(successResult._tag === "Success", "Program succeeded with valid configuration");

  // 2. Config error case
  const configErrorResult = await Effect.runPromiseExit(
    program.pipe(Effect.provide(pipe(DatabaseLive, Layer.provide(ConfigErrorLayer))))
  );

  assert(configErrorResult._tag === "Failure", "Program failed with config error");
  assert(
    configErrorResult._tag === "Failure" && configErrorResult.cause.toString().includes("ConfigError"), 
    "Error was correctly propagated from config layer"
  );

  // 3. Error recovery with orElse
  const recoveredConfigLayer = Layer.orElse(ConfigErrorLayer, () => ConfigLive);
  const recoveryLayer = Layer.provide(DatabaseLive, recoveredConfigLayer);

  const recoveryResult = await Effect.runPromiseExit(
    program.pipe(Effect.provide(recoveryLayer))
  );

  assert(recoveryResult._tag === "Success", "Program succeeded with fallback configuration");
};

const advancedLayersExample = async () => {
  console.log("=== Advanced Layer Patterns ===");

  // Define a set of service tags for a more realistic example
  class Config extends Context.Tag("Config")<
    Config,
    { readonly apiKey: string; readonly dbUrl: string }
  >() {}

  class Database extends Context.Tag("Database")<
    Database,
    { 
      readonly connect: () => Effect.Effect<void>;
      readonly query: (sql: string) => Effect.Effect<string[]>;
      readonly disconnect: () => Effect.Effect<void>;
    }
  >() {}

  class UserRepository extends Context.Tag("UserRepository")<
    UserRepository,
    { 
      readonly getUser: (id: string) => Effect.Effect<{ id: string, name: string }>;
      readonly saveUser: (user: { id: string, name: string }) => Effect.Effect<void>;
    }
  >() {}

  class UserService extends Context.Tag("UserService")<
    UserService,
    {
      readonly getUserDetails: (id: string) => Effect.Effect<{ id: string, name: string, enriched: boolean }>;
    }
  >() {}

  class ExternalApiClient extends Context.Tag("ExternalApiClient")<
    ExternalApiClient,
    {
      readonly enrichUserData: (user: { id: string, name: string }) => 
        Effect.Effect<{ id: string, name: string, enriched: boolean }>;
    }
  >() {}

  // Track service lifecycle
  let dbConnected = false;
  let dbDisconnected = false;

  // 1. Environment-specific configurations using Layer.succeed
  const ConfigDev = Layer.succeed(Config, { 
    apiKey: "dev-api-key",
    dbUrl: "memory://dev-db" 
  });

  const ConfigProd = Layer.succeed(Config, { 
    apiKey: "prod-api-key",
    dbUrl: "postgres://prod-db" 
  });

  // 2. Resource management with Layer.scoped
  const DatabaseLive = Layer.scoped(
    Database,
    Effect.gen(function* () {
      const config = yield* Config;

      // Resource acquisition
      const connect = () => Effect.sync(() => {
        console.log(`Connecting to ${config.dbUrl}`);
        dbConnected = true;
      });

      // Resource cleanup
      const disconnect = () => Effect.sync(() => {
        console.log(`Disconnecting from ${config.dbUrl}`);
        dbDisconnected = true;
      });

      // Make sure connection is established before returning the service
      yield* connect();

      // Add finalizer to ensure disconnection
      yield* Effect.addFinalizer(() => disconnect());

      return {
        connect,
        disconnect,
        query: (sql: string) => Effect.succeed([`Result for ${sql} from ${config.dbUrl}`])
      };
    })
  );

  // 3. Service implementation depending on other services
  const UserRepositoryLive = Layer.effect(
    UserRepository,
    Effect.gen(function* () {
      const db = yield* Database;

      return {
        getUser: (id: string) => 
          pipe(
            db.query(`SELECT * FROM users WHERE id = '${id}'`),
            Effect.map(results => ({ id, name: results[0] || "Unknown" }))
          ),
        saveUser: (user) => 
          pipe(
            db.query(`INSERT INTO users VALUES ('${user.id}', '${user.name}')`),
            Effect.map(() => undefined)
          )
      };
    })
  );

  const ExternalApiClientLive = Layer.effect(
    ExternalApiClient,
    Effect.gen(function* () {
      const config = yield* Config;

      return {
        enrichUserData: (user) => Effect.succeed({
          ...user,
          enriched: true
        })
      };
    })
  );

  // 4. Composing multiple dependencies
  const UserServiceLive = Layer.effect(
    UserService,
    Effect.gen(function* () {
      const userRepo = yield* UserRepository;
      const apiClient = yield* ExternalApiClient;

      return {
        getUserDetails: (id: string) => 
          pipe(
            userRepo.getUser(id),
            Effect.flatMap(user => apiClient.enrichUserData(user))
          )
      };
    })
  );

  // 5. Putting it all together with a comprehensive layer
  const dbLayer = Layer.provide(DatabaseLive, ConfigDev);
  const repoLayer = Layer.provide(UserRepositoryLive, dbLayer);
  const apiLayer = Layer.provide(ExternalApiClientLive, ConfigDev);
  const userServiceDeps = Layer.merge(repoLayer, apiLayer);
  const userServiceLayer = Layer.provide(UserServiceLive, userServiceDeps);
  const AppLayerDev = Layer.merge(userServiceLayer, userServiceDeps);

  // Create a program that uses the UserService
  const program = Effect.gen(function* () {
    const userService = yield* UserService;
    const userDetails = yield* userService.getUserDetails("123");
    console.log("User details:", userDetails);
    return userDetails;
  });

  // Run the program with the dev layer configuration
  const result = await Effect.runPromise(Effect.scoped(
    program.pipe(Effect.provide(AppLayerDev))
  ));

  assert(result.id === "123", "Program returned the correct user ID");
  assert(result.enriched === true, "User data was properly enriched");
  assert(dbConnected, "Database connection was established");
  assert(dbDisconnected, "Database connection was properly closed");
};

const testingWithLayersExample = async () => {
  console.log("=== Testing with Layers ===");

  // Define a service for a user repository
  class UserRepository extends Context.Tag("UserRepository")<
    UserRepository,
    {
      readonly getUser: (id: string) => Effect.Effect<{ id: string, name: string } | null>;
      readonly saveUser: (user: { id: string, name: string }) => Effect.Effect<void>;
    }
  >() {}

  // Define a service that uses the repository
  class UserService extends Context.Tag("UserService")<
    UserService,
    {
      readonly getUserById: (id: string) => Effect.Effect<{ id: string, name: string }, Error>;
      readonly createUser: (id: string, name: string) => Effect.Effect<void>;
    }
  >() {}

  // Implementation of UserService that depends on UserRepository
  const UserServiceLive = Layer.effect(
    UserService,
    Effect.gen(function* () {
      const repo = yield* UserRepository;

      return {
        getUserById: (id: string) => 
          pipe(
            repo.getUser(id),
            Effect.flatMap(user => 
              user ? Effect.succeed(user) : Effect.fail(new Error(`User ${id} not found`))
            )
          ),
        createUser: (id: string, name: string) => 
          repo.saveUser({ id, name })
      };
    })
  );

  // 1. Create a test implementation with in-memory repository
  const testUsers: Record<string, { id: string, name: string }> = {
    "1": { id: "1", name: "Test User" }
  };

  const UserRepositoryTest = Layer.succeed(
    UserRepository,
    {
      getUser: (id: string) => Effect.succeed(testUsers[id] || null),
      saveUser: (user) => Effect.sync(() => {
        testUsers[user.id] = user;
      })
    }
  );

  // 2. Create test cases

  // Test case 1: Get existing user
  const testGetExistingUser = Effect.gen(function* () {
    const userService = yield* UserService;
    const user = yield* userService.getUserById("1");

    assert(user.id === "1", "Retrieved correct user ID");
    assert(user.name === "Test User", "Retrieved correct user name");
  });

  // Test case 2: Get non-existent user
  const testGetNonExistentUser = Effect.gen(function* () {
    const userService = yield* UserService;

    const result = yield* Effect.either(userService.getUserById("999"));

    assert(result._tag === "Left", "Getting non-existent user returns an error");
    assert(
      result._tag === "Left" && result.left.message.includes("not found"), 
      "Error message indicates user not found"
    );
  });

  // Test case 3: Create a new user
  const testCreateUser = Effect.gen(function* () {
    const userService = yield* UserService;

    yield* userService.createUser("2", "New User");

    const user = yield* userService.getUserById("2");
    assert(user.id === "2", "Created user has correct ID");
    assert(user.name === "New User", "Created user has correct name");
  });

  // 3. Run the tests with the test layer
  const testLayer = pipe(UserServiceLive, Layer.provide(UserRepositoryTest));

  await Effect.runPromise(testGetExistingUser.pipe(Effect.provide(testLayer)));
  await Effect.runPromise(testGetNonExistentUser.pipe(Effect.provide(testLayer)));
  await Effect.runPromise(testCreateUser.pipe(Effect.provide(testLayer)));

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
  } catch (error) {
    console.error("❌ Error running examples:", error);
  }
};

// Execute all examples
runAll();