// Scopes Docs https://effect.website/docs/resource-management/scope/

// Effect Scope provides resource management capabilities, ensuring resources
// are properly acquired and released. It's particularly useful for managing
// things like file handles, network connections, or any resource that needs
// cleanup.

import { Effect, Scope, Console, Exit, Equal } from "effect";
import { ChannelTypeId } from "effect/Channel";

const delay = (ms:number) => new Promise(resolve => setTimeout(resolve, ms));
// Enhanced assert function that logs the successful assertion
const assert = (condition: boolean, message?: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  if (!!message) console.log(`✓ ${message}`);
};

// === BASIC SCOPE USAGE ===
// A scope represents a lifetime of resources
// When closed, all finalizers (cleanup functions) are executed

// Simple scope creation and closure
const basicScopeExample = async () => {
  console.log("=== Basic Scope Example ===");

  // Track finalizer execution order
  const executionOrder: string[] = [];

  // Create a scope and add finalizers
  const program = Scope.make().pipe(
    // Add finalizer 1
    Effect.tap((scope) =>
      Scope.addFinalizer(scope, Effect.gen(function* () {
        executionOrder.push("f1");
        yield* Console.log(`f1`); // notice different way of yielding log
      }))
    ),
    // Add finalizer 2
    Effect.tap((scope) =>
      Scope.addFinalizer(scope, Effect.sync(() => {
        executionOrder.push("f2");
      }).pipe(Effect.tap(() => Console.log("f2"))))) // notice different way of yielding log
    ,
    // Close the scope with success
    Effect.andThen((scope) =>
      Scope.close(scope, Exit.succeed("done"))
    )
  );

  await Effect.runPromise(program)

  // Assert that finalizers run in reverse order (LIFO)
  assert(executionOrder.length === 2, "Both finalizers were executed");
  assert(executionOrder[0] === "f2", "Second finalizer executed first");
  assert(executionOrder[1] === "f1", "First finalizer executed last");
};

// === ADDING FINALIZERS WITH EXIT STATE ===
// Finalizers have access to the exit state
const finalizerWithExitExample = async () => {
  console.log("=== Finalizers With Exit State ===");

  let successExitState: string | null = null;
  let failureExitState: string | null = null;
  let interruptExitState: string | null = null;

  // Success case
  const successProgram = Effect.gen(function* () {
    yield* Effect.addFinalizer((exit) => {
      successExitState = exit._tag;
      return Console.log(`Exit: ${exit._tag}`);
    });
    return "ok";
  });

  // Failure case
  const failureProgram = Effect.gen(function* () {
    yield* Effect.addFinalizer((exit) => {
      failureExitState = exit._tag;
      return Console.log(`Exit: ${exit._tag}`);
    });
    return yield* Effect.fail("my error message");
  });

  // Interruption case
  const interruptProgram = Effect.gen(function* () {
    yield* Effect.addFinalizer((exit) => {
      interruptExitState = exit._tag; 
      // can use built in functions as well which are better.
      Exit.isFailure(exit) //?
      //return Console.log(`Exit: ${exit._tag}`); ... or just void (you have to reutrn some effect)
      return Effect.void
    });
    return yield* Effect.interrupt;
  });

  // Run each program in its own scope
  await Effect.runPromise(Effect.scoped(successProgram))
    .then((s) => console.log(`Success completed ${s}`));

  await Effect.runPromise(Effect.scoped(failureProgram))
    .then(() => { })
    .catch((message) => console.log(`Failure completed  ${message}`));

  await Effect.runPromise(Effect.scoped(interruptProgram))
    .then(() => { })
    .catch(() => console.log("Interrupt completed"));

  // Assert exit states
  assert(successExitState === "Success", "Success case has Success exit state");
  assert(failureExitState === "Failure", "Failure case has Failure exit state");
  assert(interruptExitState === "Failure", "Interrupt case has Failure exit state");
};

// === RESOURCE ACQUISITION AND RELEASE ===
// Ensures resources are always released even if operations fail
const acquireReleaseExample = async () => {
  console.log("=== Acquire/Release Example ===");

  let resourceAcquired = false;
  let resourceReleased = false;
  let resourceUsed = false;

  // Define a simple resource
  interface Resource {
    id: string;
    close: ()=>Promise<void>;
  }

  // Acquire a resource
  const acquire = Effect.sync(() => {
    resourceAcquired = true;
    console.log("Resource acquired");
    return {
      id: "r1",
      close: async () => {
        resourceReleased = true;
        console.log("Resource released async");
      }
    } as Resource;
  });

  // Define release function
  const release = (res: Resource) => Effect.promise(res.close);

  // Create resource management workflow
  const resource = Effect.acquireRelease(acquire, x=> release(x));

  // Use the resource
  const program = Effect.gen(function* () {
    const res = yield* resource;
    resourceUsed = true;
    console.log(`Using ${res.id}`, res);
    // Resource will be released when scope closes
    return 'cat'
  });

  var r = await Effect.runPromise(Effect.scoped(program));
  
  

  // Assert resource lifecycle
  assert(r=='cat')
  assert(resourceAcquired, "Resource was acquired");
  assert(resourceUsed, "Resource was used");
  assert(resourceReleased, "Resource was released");
};

// === MULTIPLE SCOPED RESOURCES ===
// Shows how multiple resources are managed together
const multipleResourcesExample = async () => {
  console.log("=== Multiple Resources Example ===");

  // Track resource states
  const states = {
    successCase: {
      aAcquired: false,
      bAcquired: false,
      aReleased: false,
      bReleased: false,
      bothUsed: false
    },
    failureCase: {
      aAcquired: false,
      aReleased: false,
      bNeverAcquired: true, // Should remain true
      failureHandled: false
    }
  };

  // Define two resources
  const resourceA = Effect.acquireRelease(
    Effect.sync(() => {
      console.log("A acquired");
      return "a";
    }),
    (_, exit) => {

      if (Exit.isSuccess(exit)) {
        states.successCase.aReleased = true;
      } else {
        states.failureCase.aReleased = true;
      }
      return Console.log(`A released (${exit._tag})`);
    }
  );

  const resourceB = Effect.acquireRelease(
    Effect.sync(() => {
      console.log("B acquired");
      return "b";
    }),
    (_, exit) => {
      states.successCase.bReleased = true;
      return Console.log(`B released (${exit._tag})`);
    }
  );

  // Success case - use both resources
  const successProgram = Effect.gen(function* () {
    const a = yield* resourceA;
    states.successCase.aAcquired = true;

    const b = yield* resourceB;
    states.successCase.bAcquired = true;

    states.successCase.bothUsed = true;
    console.log(`Using ${a} and ${b}`);
  });

  // Failure case - second resource fails
  const failProgram = Effect.gen(function* () {
    const a = yield* resourceA;
    states.failureCase.aAcquired = true;

    console.log(`Using ${a}`);
    yield* Effect.fail("err");

    // We never reach this point
    states.failureCase.bNeverAcquired = false; // Should never be set to false
    const b = yield* resourceB;
    console.log(`Using ${b}`);
  });

  await Effect.runPromise(Effect.scoped(successProgram));
  await Effect.runPromise(Effect.scoped(failProgram))
    .catch(() => {
      states.failureCase.failureHandled = true;
      console.log("Failure handled");
    });

  // Assert success case
  assert(states.successCase.aAcquired, "Resource A was acquired in success case");
  assert(states.successCase.bAcquired, "Resource B was acquired in success case");
  assert(states.successCase.bothUsed, "Both resources were used in success case");
  assert(states.successCase.aReleased, "Resource A was released in success case");
  assert(states.successCase.bReleased, "Resource B was released in success case");

  // Assert failure case
  assert(states.failureCase.aAcquired, "Resource A was acquired in failure case");
  assert(states.failureCase.aReleased, "Resource A was released in failure case");
  assert(states.failureCase.bNeverAcquired, "Resource B was never acquired in failure case");
  assert(states.failureCase.failureHandled, "Failure was properly handled");
};

  // === MANUAL SCOPE CONTROL ===
// Demonstrates creating and closing scopes manually
const manualScopeExample = async () => {
  console.log("=== Manual Scope Control ===");

  // Track resource states and closure order
  const states = {
    aAcquired: false,
    bAcquired: false,
    aReleased: false,
    bReleased: false,
    releaseOrder: [] as string[]
  };

  const resourceA = Effect.acquireRelease(
    Effect.sync(() => {
      states.aAcquired = true;
      console.log("A acquired");
      return "a";
    }),
    () => {
      states.aReleased = true;
      states.releaseOrder.push("a");
      return Console.log("A released");
    }
  );

  const resourceB = Effect.acquireRelease(
    Effect.sync(() => {
      states.bAcquired = true;
      console.log("B acquired");
      return "b";
    }),
    () => {
      states.bReleased = true;
      states.releaseOrder.push("b");
      return Console.log("B released");
    }
  );

  let workBetweenClosures = false;

  const program = Effect.gen(function* () {
    // Create two separate scopes
    const scopeA = yield* Scope.make();
    const scopeB = yield* Scope.make();

    // Use each resource with its own scope
    yield* resourceA.pipe(Scope.extend(scopeA));
    yield* resourceB.pipe(Scope.extend(scopeB));

    // Close scopeA before scopeB
    yield* Scope.close(scopeA, Exit.void);
    workBetweenClosures = true;
    console.log("Doing work between scope closures");
    yield* Scope.close(scopeB, Exit.void);
  });

  await Effect.runPromise(program);

  // Assert resource lifecycle and closure order
  assert(states.aAcquired, "Resource A was acquired");
  assert(states.bAcquired, "Resource B was acquired");
  assert(states.aReleased, "Resource A was released");
  assert(states.bReleased, "Resource B was released");
  assert(workBetweenClosures, "Work was done between scope closures");
  assert(states.releaseOrder[0] === "a", "Resource A was released first");
  assert(states.releaseOrder[1] === "b", "Resource B was released second");
};

// === SCOPE WITH ASYNC OPERATIONS ===
// Shows how scope closing interacts with pending async operations
const asyncScopeExample = async () => {
  console.log("=== Async Scope Example ===");

  const states = {
    taskStarted: false,
    taskCompleted: false,
    taskCleanedUp: false,
    scopeClosed: false,
    closedBeforeCompleted: false
  };

  // Create a delayed task that sets state flags
  const delayedTask = Effect.gen(function* () {
    // Set task started flag first before any other operations
    console.log("Task starting");
    states.taskStarted = true;

    // Sleep to simulate long-running task (remember, this isn't executed until the effect is run)
    yield* Effect.sleep(500);

    // Mark task as completed after the delay
    states.taskCompleted = true;
    console.log("Task completed");

    // Add finalizer to track cleanup
    yield* Effect.addFinalizer(() => {
      states.taskCleanedUp = true;
      return Console.log("Task cleanup");
    });
  });

  const program = Effect.gen(function* () {
    const scope = yield* Scope.make();

    // Execute the task in the scope - this starts the task
    // We need to run this task before the scope is closed
    // for the state flags to be set correctly
    const taskFiber = yield* delayedTask.pipe(
      Effect.fork,
      Scope.extend(scope)
    );

    // Give the task time to start before closing the scope
    yield* Effect.sleep(100);

    // Close scope immediately after task has started but before it completes
    yield* Scope.close(scope, Exit.void);
    states.scopeClosed = true;
    console.log("Scope closed");

    // Check if scope was closed before task completed
    states.closedBeforeCompleted = !states.taskCompleted;

    // Wait for the task to complete
    yield* Effect.sleep("1 second");
  });

  await Effect.runPromise(program);

  // Assert async behavior
  assert(states.taskStarted, "Task was started");
  assert(states.taskCompleted, "Task was completed even after scope closure");
  assert(states.taskCleanedUp, "Task was cleaned up");
  assert(states.scopeClosed, "Scope was closed");
  assert(states.closedBeforeCompleted, "Scope was closed before task completed");
};

// === COMPLEX TRANSACTION PATTERN ===
// Simulates a multi-step operation with rollback
const transactionExample = async () => {
  console.log("=== Transaction Pattern Example ===");

  // Create separate state tracking for each attempt
  const attemptStates = [
    { // First attempt (expected to fail)
      aCreated: false,
      bCreated: false,
      cCreated: false,
      aDeleted: false,
      bDeleted: false,
      cDeleted: false,
      failed: false
    },
    { // Second attempt (expected to succeed)
      aCreated: false,
      bCreated: false,
      cCreated: false,
      aDeleted: false,
      bDeleted: false,
      cDeleted: false,
      succeeded: false
    }
  ];

  let currentAttempt = 0;

  // Define services for our transaction
  class ServiceA {
    create() {
      attemptStates[currentAttempt].aCreated = true;
      console.log(`Attempt ${currentAttempt + 1}: A created`);
      return "a";
    }
    delete(id: string) {
      attemptStates[currentAttempt].aDeleted = true;
      console.log(`Attempt ${currentAttempt + 1}: A deleted (${id})`);
    }
  }

  class ServiceB {
    create(dependsOn: string) {
      attemptStates[currentAttempt].bCreated = true;
      console.log(`Attempt ${currentAttempt + 1}: B created (depends on ${dependsOn})`);
      return "b";
    }
    delete(id: string) {
      attemptStates[currentAttempt].bDeleted = true;
      console.log(`Attempt ${currentAttempt + 1}: B deleted (${id})`);
    }
  }

  class ServiceC {
    create(a: string, b: string) {
      // Force a failure on first attempt for testing
      if (currentAttempt === 0) {
        throw new Error("First attempt failure");
      }
      attemptStates[currentAttempt].cCreated = true;
      console.log(`Attempt ${currentAttempt + 1}: C created (depends on ${a}, ${b})`);
      return "c";
    }
    delete(id: string) {
      attemptStates[currentAttempt].cDeleted = true;
      console.log(`Attempt ${currentAttempt + 1}: C deleted (${id})`);
    }
  }

  // Create service instances
  const serviceA = new ServiceA();
  const serviceB = new ServiceB();
  const serviceC = new ServiceC();

  // Define operations with rollback capability
  const createA = Effect.acquireRelease(
    Effect.sync(() => serviceA.create()),
    (a, exit) => Exit.isFailure(exit)
      ? Effect.sync(() => serviceA.delete(a))
      : Effect.void
  );

  const createB = (a: string) => Effect.acquireRelease(
    Effect.sync(() => serviceB.create(a)),
    (b, exit) => Exit.isFailure(exit)
      ? Effect.sync(() => serviceB.delete(b))
      : Effect.void
  );

  const createC = (a: string, b: string) => Effect.acquireRelease(
    Effect.try({
      try: () => serviceC.create(a, b),
      catch: (e) => {
        attemptStates[currentAttempt].failed = true;
        return Effect.fail(`C creation failed: ${e}`);
      }
    }),
    (c, exit) => Exit.isFailure(exit)
      ? Effect.sync(() => serviceC.delete(c))
      : Effect.void
  );

  // Transaction workflow
  const transaction = Effect.scoped(
    Effect.gen(function* () {
      const a = yield* createA;
      const b = yield* createB(a);
      const result = yield* Effect.either(createC(a, b));

      if (result._tag === "Left") {
        console.log(`Attempt ${currentAttempt + 1}: Transaction failed: ${result.left}`);
        return null;
      } else {
        const c = result.right;
        attemptStates[currentAttempt].succeeded = true;
        return { a, b, c };
      }
    })
  );

  // Run the transaction for the first attempt (expected to fail)
  console.log("Attempt 1 (should fail):");
  await Effect.runPromise(transaction)
    .then(result => console.log(`Result: ${result ? JSON.stringify(result) : 'failed'}`))
    .catch(err => {
      console.log(`Error caught: ${err}`);
      attemptStates[0].failed = true;
    });

  // Verify first attempt results
  assert(attemptStates[0].aCreated, "A was created in failed attempt");
  assert(attemptStates[0].bCreated, "B was created in failed attempt");
  assert(!attemptStates[0].cCreated, "C was not created in failed attempt");
  assert(attemptStates[0].aDeleted, "A was deleted during rollback");
  assert(attemptStates[0].bDeleted, "B was deleted during rollback");
  assert(!attemptStates[0].cDeleted, "C was not deleted (never created)");

  // Update for second attempt
  currentAttempt = 1;

  // Run the transaction for the second attempt (expected to succeed)
  console.log("Attempt 2 (should succeed):");
  await Effect.runPromise(transaction)
    .then(result => console.log(`Result: ${result ? JSON.stringify(result) : 'failed'}`));

  // Verify second attempt results
  assert(attemptStates[1].aCreated, "A was created in successful attempt");
  assert(attemptStates[1].bCreated, "B was created in successful attempt");
  assert(attemptStates[1].cCreated, "C was created in successful attempt");
  assert(!attemptStates[1].aDeleted, "A was not deleted in successful attempt");
  assert(!attemptStates[1].bDeleted, "B was not deleted in successful attempt");
  assert(!attemptStates[1].cDeleted, "C was not deleted in successful attempt");
  assert(attemptStates[1].succeeded!, "Second attempt was successful");
};

// Run all examples
const runAll = async () => {
  await basicScopeExample();
  await finalizerWithExitExample();
  await acquireReleaseExample();
  await multipleResourcesExample();
  await manualScopeExample();
  await asyncScopeExample();
  await transactionExample();
  console.log("All tests passed successfully!");
};

runAll().catch(console.error);