"use strict";
// Scopes Docs https://effect.website/docs/resource-management/scope/
Object.defineProperty(exports, "__esModule", { value: true });
// Effect Scope provides resource management capabilities, ensuring resources
// are properly acquired and released. It's particularly useful for managing
// things like file handles, network connections, or any resource that needs
// cleanup.
const effect_1 = require("effect");
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// Enhanced assert function that logs the successful assertion
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    if (!!message)
        console.log(`✓ ${message}`);
};
// === BASIC SCOPE USAGE ===
// A scope represents a lifetime of resources
// When closed, all finalizers (cleanup functions) are executed
// Simple scope creation and closure
const basicScopeExample = async () => {
    console.log("=== Basic Scope Example ===");
    // Track finalizer execution order
    const executionOrder = [];
    // Create a scope and add finalizers
    const program = effect_1.Scope.make().pipe(
    // Add finalizer 1
    effect_1.Effect.tap((scope) => effect_1.Scope.addFinalizer(scope, effect_1.Effect.gen(function* () {
        executionOrder.push("f1");
        yield* effect_1.Console.log(`f1`); // notice different way of yielding log
    }))), 
    // Add finalizer 2
    effect_1.Effect.tap((scope) => effect_1.Scope.addFinalizer(scope, effect_1.Effect.sync(() => {
        executionOrder.push("f2");
    }).pipe(effect_1.Effect.tap(() => effect_1.Console.log("f2"))))) // notice different way of yielding log
    , 
    // Close the scope with success
    effect_1.Effect.andThen((scope) => effect_1.Scope.close(scope, effect_1.Exit.succeed("done"))));
    await effect_1.Effect.runPromise(program);
    // Assert that finalizers run in reverse order (LIFO)
    assert(executionOrder.length === 2, "Both finalizers were executed");
    assert(executionOrder[0] === "f2", "Second finalizer executed first");
    assert(executionOrder[1] === "f1", "First finalizer executed last");
};
// === ADDING FINALIZERS WITH EXIT STATE ===
// Finalizers have access to the exit state
const finalizerWithExitExample = async () => {
    console.log("=== Finalizers With Exit State ===");
    let successExitState = null;
    let failureExitState = null;
    let interruptExitState = null;
    // Success case
    const successProgram = effect_1.Effect.gen(function* () {
        yield* effect_1.Effect.addFinalizer((exit) => {
            successExitState = exit._tag;
            return effect_1.Console.log(`Exit: ${exit._tag}`);
        });
        return "ok";
    });
    // Failure case
    const failureProgram = effect_1.Effect.gen(function* () {
        yield* effect_1.Effect.addFinalizer((exit) => {
            failureExitState = exit._tag;
            return effect_1.Console.log(`Exit: ${exit._tag}`);
        });
        return yield* effect_1.Effect.fail("my error message");
    });
    // Interruption case
    const interruptProgram = effect_1.Effect.gen(function* () {
        yield* effect_1.Effect.addFinalizer((exit) => {
            interruptExitState = exit._tag;
            // can use built in functions as well which are better.
            effect_1.Exit.isFailure(exit); //?
            //return Console.log(`Exit: ${exit._tag}`); ... or just void (you have to reutrn some effect)
            return effect_1.Effect.void;
        });
        return yield* effect_1.Effect.interrupt;
    });
    // Run each program in its own scope
    await effect_1.Effect.runPromise(effect_1.Effect.scoped(successProgram))
        .then((s) => console.log(`Success completed ${s}`));
    await effect_1.Effect.runPromise(effect_1.Effect.scoped(failureProgram))
        .then(() => { })
        .catch((message) => console.log(`Failure completed  ${message}`));
    await effect_1.Effect.runPromise(effect_1.Effect.scoped(interruptProgram))
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
    // Acquire a resource
    const acquire = effect_1.Effect.sync(() => {
        resourceAcquired = true;
        console.log("Resource acquired");
        return {
            id: "r1",
            close: async () => {
                resourceReleased = true;
                console.log("Resource released async");
            }
        };
    });
    // Define release function
    const release = (res) => effect_1.Effect.promise(res.close);
    // Create resource management workflow
    const resource = effect_1.Effect.acquireRelease(acquire, x => release(x));
    // Use the resource
    const program = effect_1.Effect.gen(function* () {
        const res = yield* resource;
        resourceUsed = true;
        console.log(`Using ${res.id}`, res);
        // Resource will be released when scope closes
        return 'cat';
    });
    var r = await effect_1.Effect.runPromise(effect_1.Effect.scoped(program));
    // Assert resource lifecycle
    assert(r == 'cat');
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
    const resourceA = effect_1.Effect.acquireRelease(effect_1.Effect.sync(() => {
        console.log("A acquired");
        return "a";
    }), (_, exit) => {
        if (effect_1.Exit.isSuccess(exit)) {
            states.successCase.aReleased = true;
        }
        else {
            states.failureCase.aReleased = true;
        }
        return effect_1.Console.log(`A released (${exit._tag})`);
    });
    const resourceB = effect_1.Effect.acquireRelease(effect_1.Effect.sync(() => {
        console.log("B acquired");
        return "b";
    }), (_, exit) => {
        states.successCase.bReleased = true;
        return effect_1.Console.log(`B released (${exit._tag})`);
    });
    // Success case - use both resources
    const successProgram = effect_1.Effect.gen(function* () {
        const a = yield* resourceA;
        states.successCase.aAcquired = true;
        const b = yield* resourceB;
        states.successCase.bAcquired = true;
        states.successCase.bothUsed = true;
        console.log(`Using ${a} and ${b}`);
    });
    // Failure case - second resource fails
    const failProgram = effect_1.Effect.gen(function* () {
        const a = yield* resourceA;
        states.failureCase.aAcquired = true;
        console.log(`Using ${a}`);
        yield* effect_1.Effect.fail("err");
        // We never reach this point
        states.failureCase.bNeverAcquired = false; // Should never be set to false
        const b = yield* resourceB;
        console.log(`Using ${b}`);
    });
    await effect_1.Effect.runPromise(effect_1.Effect.scoped(successProgram));
    await effect_1.Effect.runPromise(effect_1.Effect.scoped(failProgram))
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
        releaseOrder: []
    };
    const resourceA = effect_1.Effect.acquireRelease(effect_1.Effect.sync(() => {
        states.aAcquired = true;
        console.log("A acquired");
        return "a";
    }), () => {
        states.aReleased = true;
        states.releaseOrder.push("a");
        return effect_1.Console.log("A released");
    });
    const resourceB = effect_1.Effect.acquireRelease(effect_1.Effect.sync(() => {
        states.bAcquired = true;
        console.log("B acquired");
        return "b";
    }), () => {
        states.bReleased = true;
        states.releaseOrder.push("b");
        return effect_1.Console.log("B released");
    });
    let workBetweenClosures = false;
    const program = effect_1.Effect.gen(function* () {
        // Create two separate scopes
        const scopeA = yield* effect_1.Scope.make();
        const scopeB = yield* effect_1.Scope.make();
        // Use each resource with its own scope
        yield* resourceA.pipe(effect_1.Scope.extend(scopeA));
        yield* resourceB.pipe(effect_1.Scope.extend(scopeB));
        // Close scopeA before scopeB
        yield* effect_1.Scope.close(scopeA, effect_1.Exit.void);
        workBetweenClosures = true;
        console.log("Doing work between scope closures");
        yield* effect_1.Scope.close(scopeB, effect_1.Exit.void);
    });
    await effect_1.Effect.runPromise(program);
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
    const delayedTask = effect_1.Effect.gen(function* () {
        // Set task started flag first before any other operations
        console.log("Task starting");
        states.taskStarted = true;
        // Sleep to simulate long-running task (remember, this isn't executed until the effect is run)
        yield* effect_1.Effect.sleep(500);
        // Mark task as completed after the delay
        states.taskCompleted = true;
        console.log("Task completed");
        // Add finalizer to track cleanup
        yield* effect_1.Effect.addFinalizer(() => {
            states.taskCleanedUp = true;
            return effect_1.Console.log("Task cleanup");
        });
    });
    const program = effect_1.Effect.gen(function* () {
        const scope = yield* effect_1.Scope.make();
        // Execute the task in the scope - this starts the task
        // We need to run this task before the scope is closed
        // for the state flags to be set correctly
        const taskFiber = yield* delayedTask.pipe(effect_1.Effect.fork, effect_1.Scope.extend(scope));
        // Give the task time to start before closing the scope
        yield* effect_1.Effect.sleep(100);
        // Close scope immediately after task has started but before it completes
        yield* effect_1.Scope.close(scope, effect_1.Exit.void);
        states.scopeClosed = true;
        console.log("Scope closed");
        // Check if scope was closed before task completed
        states.closedBeforeCompleted = !states.taskCompleted;
        // Wait for the task to complete
        yield* effect_1.Effect.sleep("1 second");
    });
    await effect_1.Effect.runPromise(program);
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
        {
            aCreated: false,
            bCreated: false,
            cCreated: false,
            aDeleted: false,
            bDeleted: false,
            cDeleted: false,
            failed: false
        },
        {
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
        delete(id) {
            attemptStates[currentAttempt].aDeleted = true;
            console.log(`Attempt ${currentAttempt + 1}: A deleted (${id})`);
        }
    }
    class ServiceB {
        create(dependsOn) {
            attemptStates[currentAttempt].bCreated = true;
            console.log(`Attempt ${currentAttempt + 1}: B created (depends on ${dependsOn})`);
            return "b";
        }
        delete(id) {
            attemptStates[currentAttempt].bDeleted = true;
            console.log(`Attempt ${currentAttempt + 1}: B deleted (${id})`);
        }
    }
    class ServiceC {
        create(a, b) {
            // Force a failure on first attempt for testing
            if (currentAttempt === 0) {
                throw new Error("First attempt failure");
            }
            attemptStates[currentAttempt].cCreated = true;
            console.log(`Attempt ${currentAttempt + 1}: C created (depends on ${a}, ${b})`);
            return "c";
        }
        delete(id) {
            attemptStates[currentAttempt].cDeleted = true;
            console.log(`Attempt ${currentAttempt + 1}: C deleted (${id})`);
        }
    }
    // Create service instances
    const serviceA = new ServiceA();
    const serviceB = new ServiceB();
    const serviceC = new ServiceC();
    // Define operations with rollback capability
    const createA = effect_1.Effect.acquireRelease(effect_1.Effect.sync(() => serviceA.create()), (a, exit) => effect_1.Exit.isFailure(exit)
        ? effect_1.Effect.sync(() => serviceA.delete(a))
        : effect_1.Effect.void);
    const createB = (a) => effect_1.Effect.acquireRelease(effect_1.Effect.sync(() => serviceB.create(a)), (b, exit) => effect_1.Exit.isFailure(exit)
        ? effect_1.Effect.sync(() => serviceB.delete(b))
        : effect_1.Effect.void);
    const createC = (a, b) => effect_1.Effect.acquireRelease(effect_1.Effect.try({
        try: () => serviceC.create(a, b),
        catch: (e) => {
            attemptStates[currentAttempt].failed = true;
            return effect_1.Effect.fail(`C creation failed: ${e}`);
        }
    }), (c, exit) => effect_1.Exit.isFailure(exit)
        ? effect_1.Effect.sync(() => serviceC.delete(c))
        : effect_1.Effect.void);
    // Transaction workflow
    const transaction = effect_1.Effect.scoped(effect_1.Effect.gen(function* () {
        const a = yield* createA;
        const b = yield* createB(a);
        const result = yield* effect_1.Effect.either(createC(a, b));
        if (result._tag === "Left") {
            console.log(`Attempt ${currentAttempt + 1}: Transaction failed: ${result.left}`);
            return null;
        }
        else {
            const c = result.right;
            attemptStates[currentAttempt].succeeded = true;
            return { a, b, c };
        }
    }));
    // Run the transaction for the first attempt (expected to fail)
    console.log("Attempt 1 (should fail):");
    await effect_1.Effect.runPromise(transaction)
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
    await effect_1.Effect.runPromise(transaction)
        .then(result => console.log(`Result: ${result ? JSON.stringify(result) : 'failed'}`));
    // Verify second attempt results
    assert(attemptStates[1].aCreated, "A was created in successful attempt");
    assert(attemptStates[1].bCreated, "B was created in successful attempt");
    assert(attemptStates[1].cCreated, "C was created in successful attempt");
    assert(!attemptStates[1].aDeleted, "A was not deleted in successful attempt");
    assert(!attemptStates[1].bDeleted, "B was not deleted in successful attempt");
    assert(!attemptStates[1].cDeleted, "C was not deleted in successful attempt");
    assert(attemptStates[1].succeeded, "Second attempt was successful");
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
//# sourceMappingURL=effect%20ts%20-%20Scopes.js.map