// @ts-nocheck
// Layers in Effect Tutorial
// Based on documentation from https://effect.website/docs/service-management/layer

import { Effect, Context, Layer, Console, Scope, Exit, Equal, pipe, Data } from "effect";

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

  const program = Effect.gen(function* () {
    const greeter = yield* Greeter;
    const message = yield* greeter.getMessage('Jimmy');
    return message;
  });

  const kindGreeter = { getMessage: (name: string) => Effect.succeed(`Have a great day ${name}!`) };
  const meanGreeter = { getMessage: (name: string) => Effect.succeed(`Go Away ${name}!`) };

  const KindGreeterLayer = Layer.succeed(Greeter, kindGreeter)
  const MeanGreeterLayer = Layer.succeed(Greeter, meanGreeter)

  const kindProgram = Effect.provide(program, KindGreeterLayer)
  Effect.runPromise(kindProgram) //?

  const meanProgram = Effect.provide(program, MeanGreeterLayer)
  Effect.runPromise(meanProgram) //?
};

const minimalUsefulLayerExample = async () => {
  class TextManipulator extends Context.Tag("TextManipulator")<
    TextManipulator,
    {
      modify: (source: string) => string
    }
  >() { }

  const capitalizer = {
    modify: (source) => source.toUpperCase()
  };

  const spacer = {
    modify: (source) => source.split('').join(' ')
  };

  class Greeter extends Context.Tag("Greeter")<
    Greeter,
    {
      readonly getMessage: (name: string) => Effect.Effect<string, never, never> 
    }
  >() { }

  const kindGreeter = { getMessage: (name: string) => Effect.succeed(`Have a great day ${name}!`) };
  const meanGreeter = { getMessage: (name: string) => Effect.succeed(`Go Away ${name}!`) };

  const CapitalizerLayer = Layer.succeed(TextManipulator, capitalizer);
  const SpacerLayer = Layer.succeed(TextManipulator, spacer);

  const KindGreeterLayer = Layer.succeed(Greeter, kindGreeter);
  const MeanGreeterLayer = Layer.succeed(Greeter, meanGreeter);

  const program = Effect.gen(function* () {
    const textManipulator = yield* TextManipulator;
    const greeter = yield* Greeter;
    const message = yield* greeter.getMessage('Jimmy');
    const result = textManipulator.modify(message);
    return result;
  });

  const kindCapitalizeLayer = Layer.merge(KindGreeterLayer, CapitalizerLayer);
  const kindSpaceLayer = Layer.merge(KindGreeterLayer, SpacerLayer);
  const meanCapitalizeLayer = Layer.merge(MeanGreeterLayer, CapitalizerLayer);
  const meanSpaceLayer = Layer.merge(MeanGreeterLayer, SpacerLayer);

  (await Effect.runPromise(Effect.provide(program, kindCapitalizeLayer)));//?
  (await Effect.runPromise(Effect.provide(program, kindSpaceLayer)));//?
  (await Effect.runPromise(Effect.provide(program, meanCapitalizeLayer)));//?
  (await Effect.runPromise(Effect.provide(program, meanSpaceLayer)));//?
};

const basicLayerExample = async () => {
  console.log("=== Basic Layer Example ===");

  class Database extends Context.Tag("Database")<
    Database,
    { readonly query: (sql: string) => Effect.Effect<string[]> }
  >() { }

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

  const program = Effect.gen(function* () {
    const db = yield* Database;
    const results = yield* db.query("SELECT * FROM users");
    console.log("Query results:", results);
    return results;
  });

  const runnable = program.pipe(Effect.provide(DatabaseTest));
  const results = await Effect.runPromise(runnable);

  assert(results.length === 2, "Database query returned expected results");
  assert(results[0] === "result1", "First result is correct");
};

const layerConstructorsExample = async () => {
  console.log("=== Layer Constructors Example ===");

  class Logger extends Context.Tag("Logger")<
    Logger, 
    { readonly log: (message: string) => Effect.Effect<void> }
  >() {}

  class Config extends Context.Tag("Config")<
    Config,
    { readonly dbUrl: string }
  >() {}

  const LoggerLive = Layer.succeed(
    Logger,
    {
      log: (message) => Effect.sync(() => console.log(`[LOG] ${message}`))
    }
  );

  const ConfigTest = Layer.effect(
    Config,
    Effect.succeed({ dbUrl: "memory://test-db" })
  );

  class DbConnection extends Context.Tag("DbConnection")<
    DbConnection,
    { readonly connect: () => Effect.Effect<string> }
  >() {}

  const DbConnectionLive = Layer.effect(
    DbConnection,
    Effect.gen(function* () {
      const config = yield* Config; 
      
      return {
        connect: () => Effect.succeed(`Connected to ${config.dbUrl}`)
      };
    })
  );

  const program = Effect.gen(function* () {
    const logger = yield* Logger;
    const db = yield* DbConnection;

    yield* logger.log("Connecting to database...");
    const connectionResult = yield* db.connect();
    yield* logger.log(connectionResult);

    return connectionResult;
  });

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

const layerCompositionExample = async () => {
  console.log("=== Layer Composition Example ===");

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

  const ConfigLive = Layer.succeed(Config, { dbUrl: "postgres://localhost" });

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

  const dbLayer = Layer.provide(DatabaseLive, ConfigLive);
  const allLayers = Layer.provide(UserRepoLive, dbLayer);

  const program = Effect.gen(function* () {
    const userRepo = yield* UserRepo;
    const user = yield* userRepo.getUser("123");
    console.log("User:", user);
    return user;
  });

  const result = await Effect.runPromise(Effect.provide(program, allLayers));

  assert(result.includes("Result for SELECT"), "Program retrieved user data");
  assert(result.includes("postgres://localhost"), "Program used the correct database URL");
};

const scopedLayersExample = async () => {
  console.log("=== Scoped Layers Example ===");

  class DbConnection extends Context.Tag("DbConnection")<
    DbConnection,
    { readonly query: (sql: string) => Effect.Effect<string[]> }
  >() {}

  let connectionOpened = false;
  let connectionClosed = false;
  let queriesRun = 0;

  const DbConnectionLive = Layer.scoped(
    DbConnection,
    Effect.acquireRelease(
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
      () => Effect.sync(() => {
        console.log("Closing database connection");
        connectionClosed = true;
      })
    )
  );

  const program = Effect.gen(function* () {
    const db = yield* DbConnection;

    yield* db.query("SELECT * FROM users");
    yield* db.query("SELECT * FROM orders");

    return "Queries completed";
  });

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

  let serviceAInitCount = 0;

  const ServiceALive = Layer.effect(
    ServiceA,
    Effect.sync(() => {
      serviceAInitCount++;
      console.log(`ServiceA initialized (count: ${serviceAInitCount})`);
      return { value: `A-${serviceAInitCount}` };
    })
  );

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

  serviceAInitCount = 0;

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

  const ConfigLive = Layer.succeed(Config, { dbUrl: "postgres://localhost" });

  const ConfigErrorLayer = Layer.fail(Config, new ConfigError({message:"Missing database URL"} ));

  const DatabaseLive = Layer.effect(
    Database,
    Effect.gen(function* () {
      const config = yield* Config;

      if (config.dbUrl.includes("invalid")) {
        return yield* Effect.fail(new DatabaseError({message:"Failed to connect to database", code: "CONN_ERR"}));
      }

      return {
        query: (sql: string) => Effect.succeed([`Result for ${sql}`])
      };
    })
  );

  const program = Effect.gen(function* () {
    const db = yield* Database;
    return yield* db.query("SELECT 1");
  });

  const successResult = await Effect.runPromiseExit(
    program.pipe(Effect.provide(pipe(DatabaseLive, Layer.provide(ConfigLive))))
  );

  assert(successResult._tag === "Success", "Program succeeded with valid configuration");

  const configErrorResult = await Effect.runPromiseExit(
    program.pipe(Effect.provide(pipe(DatabaseLive, Layer.provide(ConfigErrorLayer))))
  );

  assert(configErrorResult._tag === "Failure", "Program failed with config error");
  assert(
    configErrorResult._tag === "Failure" && configErrorResult.cause.toString().includes("ConfigError"), 
    "Error was correctly propagated from config layer"
  );

  const recoveredConfigLayer = pipe(ConfigErrorLayer, Layer.orElse(() => ConfigLive));
  const recoveryLayer = Layer.provide(DatabaseLive, recoveredConfigLayer);

  const recoveryResult = await Effect.runPromiseExit(
    program.pipe(Effect.provide(recoveryLayer))
  );

  assert(recoveryResult._tag === "Success", "Program succeeded with fallback configuration");
};

const advancedLayersExample = async () => {
  console.log("=== Advanced Layer Patterns ===");

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

  let dbConnected = false;
  let dbDisconnected = false;

  const ConfigDev = Layer.succeed(Config, { 
    apiKey: "dev-api-key",
    dbUrl: "memory://dev-db" 
  });

  const ConfigProd = Layer.succeed(Config, { 
    apiKey: "prod-api-key",
    dbUrl: "postgres://prod-db" 
  });

  const DatabaseLive = Layer.scoped(
    Database,
    Effect.gen(function* () {
      const config = yield* Config;

      const connect = () => Effect.sync(() => {
        console.log(`Connecting to ${config.dbUrl}`);
        dbConnected = true;
      });

      const disconnect = () => Effect.sync(() => {
        console.log(`Disconnecting from ${config.dbUrl}`);
        dbDisconnected = true;
      });

      yield* connect();
      yield* Effect.addFinalizer(() => disconnect());

      return {
        connect,
        disconnect,
        query: (sql: string) => Effect.succeed([`Result for ${sql} from ${config.dbUrl}`])
      };
    })
  );

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

  const dbLayer = Layer.provide(DatabaseLive, ConfigDev);
  const repoLayer = Layer.provide(UserRepositoryLive, dbLayer);
  const apiLayer = Layer.provide(ExternalApiClientLive, ConfigDev);
  const userServiceDeps = Layer.merge(repoLayer, apiLayer);
  const userServiceLayer = Layer.provide(UserServiceLive, userServiceDeps);
  const AppLayerDev = Layer.merge(userServiceLayer, userServiceDeps);

  const program = Effect.gen(function* () {
    const userService = yield* UserService;
    const userDetails = yield* userService.getUserDetails("123");
    console.log("User details:", userDetails);
    return userDetails;
  });

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

  class UserRepository extends Context.Tag("UserRepository")<
    UserRepository,
    {
      readonly getUser: (id: string) => Effect.Effect<{ id: string, name: string } | null>;
      readonly saveUser: (user: { id: string, name: string }) => Effect.Effect<void>;
    }
  >() {}

  class UserService extends Context.Tag("UserService")<
    UserService,
    {
      readonly getUserById: (id: string) => Effect.Effect<{ id: string, name: string }, Error>;
      readonly createUser: (id: string, name: string) => Effect.Effect<void>;
    }
  >() {}

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

  const testGetExistingUser = Effect.gen(function* () {
    const userService = yield* UserService;
    const user = yield* userService.getUserById("1");

    assert(user.id === "1", "Retrieved correct user ID");
    assert(user.name === "Test User", "Retrieved correct user name");
  });

  const testGetNonExistentUser = Effect.gen(function* () {
    const userService = yield* UserService;

    const result = yield* Effect.either(userService.getUserById("999"));

    assert(result._tag === "Left", "Getting non-existent user returns an error");
    assert(
      result._tag === "Left" && result.left.message.includes("not found"), 
      "Error message indicates user not found"
    );
  });

  const testCreateUser = Effect.gen(function* () {
    const userService = yield* UserService;

    yield* userService.createUser("2", "New User");

    const user = yield* userService.getUserById("2");
    assert(user.id === "2", "Created user has correct ID");
    assert(user.name === "New User", "Created user has correct name");
  });

  const testLayer = pipe(UserServiceLive, Layer.provide(UserRepositoryTest));

  await Effect.runPromise(testGetExistingUser.pipe(Effect.provide(testLayer)));
  await Effect.runPromise(testGetNonExistentUser.pipe(Effect.provide(testLayer)));
  await Effect.runPromise(testCreateUser.pipe(Effect.provide(testLayer)));

  console.log("All tests passed!");
};

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

runAll();
