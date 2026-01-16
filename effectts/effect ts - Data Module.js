"use strict";
// The Effect Data module provides utilities for creating data structures with built-in
// structural equality, tagged unions, and custom error types. It streamlines working with
// immutable data by handling equality checks, pattern matching, and type narrowing.
// It's particularly useful for functional programming approaches in TypeScript.
Object.defineProperty(exports, "__esModule", { value: true });
const effect_1 = require("effect");
// Assert function: throws if condition is false
const assert = (fn) => { if (!fn())
    throw new Error(); };
// === VALUE EQUALITY ===
// Enables comparing values by structure instead of reference
// Rather than comparing object references (===), Data provides structural equality
// where two objects with the same content are considered equal
// Struct examples
const p1 = effect_1.Data.struct({ name: "Alice", age: 30 }); // Basic struct
const p2 = effect_1.Data.struct({ name: "Alice", age: 30 });
assert(() => effect_1.Equal.equals(p1, p2));
// Nested structs - showing deep equality with Data.struct
const nested1 = effect_1.Data.struct({ user: effect_1.Data.struct({ id: 1 }), active: true });
const nested2 = effect_1.Data.struct({ user: effect_1.Data.struct({ id: 1 }), active: true });
assert(() => effect_1.Equal.equals(nested1, nested2));
// Deep equality fails if inner objects aren't Data structures
const badNested1 = effect_1.Data.struct({ user: { id: 1 }, active: true }); // Regular JS object inside
const badNested2 = effect_1.Data.struct({ user: { id: 1 }, active: true });
assert(() => !effect_1.Equal.equals(badNested1, badNested2)); // This fails - inner objects compared by reference
// Tuple examples
const t1 = effect_1.Data.tuple("Alice", 30); // Basic tuple
const t2 = effect_1.Data.tuple("Alice", 30);
assert(() => effect_1.Equal.equals(t1, t2));
// Array examples
const arr1 = effect_1.Data.array([1, 2, 3]); // Array with structural equality
const arr2 = effect_1.Data.array([1, 2, 3]);
assert(() => effect_1.Equal.equals(arr1, arr2));
// Complex array with nested structures
const complexArr1 = effect_1.Data.array([
    effect_1.Data.struct({ id: 1, tags: effect_1.Data.array(["important", "urgent"]) }),
    effect_1.Data.struct({ id: 2, tags: effect_1.Data.array(["normal"]) })
]);
const complexArr2 = effect_1.Data.array([
    effect_1.Data.struct({ id: 1, tags: effect_1.Data.array(["important", "urgent"]) }),
    effect_1.Data.struct({ id: 2, tags: effect_1.Data.array(["normal"]) })
]);
// Deep structural equality works at all levels
assert(() => effect_1.Equal.equals(complexArr1, complexArr2));
const User = effect_1.Data.case(); // Create constructor
const u1 = User({ id: 1, name: "Alice" });
const u2 = User({ id: 1, name: "Alice" });
assert(() => effect_1.Equal.equals(u1, u2));
const Customer = effect_1.Data.tagged("Customer"); // Auto adds _tag
const c1 = Customer({ id: 1 }); // No need to specify _tag
const c1_b = Customer({ id: 1 });
assert(() => effect_1.Equal.equals(c1, c1_b));
assert(() => c1._tag === "Customer");
// Class example
class Person extends effect_1.Data.Class {
    get isAdult() { return this.age >= 18; } // Add custom methods
}
const person1 = new Person({ name: "Bob", age: 25 });
const person2 = new Person({ name: "Bob", age: 25 });
assert(() => effect_1.Equal.equals(person1, person2));
assert(() => person1.isAdult);
assert(() => person2.isAdult);
// Tagged Class
// Tagged classes provide the best of both worlds:
// 1. The type discrimination capabilities of tagged unions via the _tag field
// 2. The ability to define methods and behavior like regular classes
// This makes them ideal when you need both pattern matching AND object methods
class Employee extends effect_1.Data.TaggedClass("Employee") {
    get description() { return `${this.role} (ID: ${this.id})`; }
}
const e1 = new Employee({ id: 101, role: "Dev" });
assert(() => e1._tag === "Employee");
assert(() => e1.description === "Dev (ID: 101)");
// Create constructors for each level of the structure
const Address = effect_1.Data.case();
const Contact = effect_1.Data.case();
const DeepPerson = effect_1.Data.case();
// Create two deeply nested structures with the same data
const deepPerson1 = DeepPerson({
    name: "Alice",
    address: Address({ street: "123 Main St", city: "Boston" }),
    contacts: effect_1.Data.array([
        Contact({ email: "alice@example.com", phone: "555-1234" }),
        Contact({ email: "alice.work@example.com", phone: "555-5678" })
    ])
});
const deepPerson2 = DeepPerson({
    name: "Alice",
    address: Address({ street: "123 Main St", city: "Boston" }),
    contacts: effect_1.Data.array([
        Contact({ email: "alice@example.com", phone: "555-1234" }),
        Contact({ email: "alice.work@example.com", phone: "555-5678" })
    ])
});
const deepPerson4 = DeepPerson({
    name: "Alice Smith",
    address: Address({ street: "123 Main St", city: "Boston" }),
    contacts: effect_1.Data.array([
        Contact({ email: "alice@example.com", phone: "555-1234" }),
        Contact({ email: "alice.work@example.com", phone: "555-5678" })
    ])
});
assert(() => effect_1.Equal.equals(deepPerson1, deepPerson2));
const deepPerson3 = DeepPerson({
    ...deepPerson1, // Include all original properties 
    name: "Alice Smith" // Override just this property
});
assert(() => !effect_1.Equal.equals(deepPerson1, deepPerson3));
assert(() => effect_1.Equal.equals(deepPerson3, deepPerson4));
// To modify nested properties, you need to rebuild that path
const deepPerson1NewAddress = DeepPerson({
    ...deepPerson1,
    address: Address({
        ...deepPerson1.address, // Spread the nested object
        street: "456 Park Ave" // Just change this field
    })
});
const deepPerson2NewAddress = DeepPerson({
    ...deepPerson2,
    address: Address({
        ...deepPerson2.address, // Spread the nested object
        street: "456 Park Ave" // Just change this field
    })
});
// Despite being complex nested structures, they compare as equal
// The key is using Data structures at EVERY level (including the array)
assert(() => effect_1.Equal.equals(deepPerson1, deepPerson2));
assert(() => !effect_1.Equal.equals(deepPerson1, deepPerson3));
assert(() => !effect_1.Equal.equals(deepPerson1, deepPerson1NewAddress));
assert(() => effect_1.Equal.equals(deepPerson1NewAddress, deepPerson2NewAddress));
// Only create constructor for the top-level BlogPost
const BlogPost = effect_1.Data.case();
// Create blog post with comments - using Data.struct directly for nested objects
const post1 = BlogPost({
    id: "post-123",
    title: "Understanding Effect Data Module",
    content: "Effect provides powerful tools for immutable data...",
    comments: effect_1.Data.array([
        effect_1.Data.struct({ authorId: "user-456", text: "Great article!", timestamp: 1650123456789 }),
        effect_1.Data.struct({ authorId: "user-789", text: "Thanks for the explanation", timestamp: 1650123500000 })
    ])
});
// Create identical post - structural equality works across all nested levels
const post2 = BlogPost({
    id: "post-123",
    title: "Understanding Effect Data Module",
    content: "Effect provides powerful tools for immutable data...",
    comments: effect_1.Data.array([
        effect_1.Data.struct({ authorId: "user-456", text: "Great article!", timestamp: 1650123456789 }),
        effect_1.Data.struct({ authorId: "user-789", text: "Thanks for the explanation", timestamp: 1650123500000 })
    ])
});
// Add a new comment - only recreate the parts of the structure that change
const postWithNewComment = BlogPost({
    ...post1,
    comments: effect_1.Data.array([
        ...post1.comments,
        effect_1.Data.struct({ authorId: "user-321", text: "I have a question about this...", timestamp: 1650123600000 })
    ])
});
// Structural equality checks
assert(() => effect_1.Equal.equals(post1, post2)); // Same content = equal
assert(() => !effect_1.Equal.equals(post1, postWithNewComment)); // Different content = not equal
console.log("Deep equality example complete!");
// The $ prefix is a convention indicating these are utility functions generated from the union
// These functions are automatically created when you call Data.taggedEnum
const { Loading, Success, LogInfo, Failure, $is, $match } = effect_1.Data.taggedEnum();
const loading = Loading(); // Tagged with "Loading"
const success = Success({ data: "result" }); // Tagged with "Success"
const failure = Failure({ error: "not found" }); // Tagged with "Failure"
// Type guard usage ($is)
// Type guards are functions that help TypeScript narrow down types
// $is creates a function that checks if an object has a specific _tag value
// This enables TypeScript to know exactly which properties are available after the check
const isSuccess = $is("Success");
//const logInfoAccessGreater5 = $is('LogInfo')
assert(() => isSuccess(success)); // TypeScript knows this is the Success variant
assert(() => !isSuccess(loading)); // Not a Success variant
// Pattern matching ($match)
// Pattern matching lets you handle all variants of a union in a type-safe way
// $match takes an object with handlers for each possible tag
// TypeScript ensures you handle all possible variants and provides type checking for each handler
const getMessage = $match({
    Loading: () => "Loading...",
    Success: ({ data }) => `Data: ${data}`, // TypeScript knows 'data' exists in Success variant
    Failure: ({ error }) => `Error: ${error}`, // TypeScript knows 'error' exists in Failure variant
    LogInfo: ({ accessCount }) => `Access Count was ${accessCount}`
});
assert(() => getMessage(loading) === "Loading...");
assert(() => getMessage(success) === "Data: result");
assert(() => getMessage(failure) === "Error: not found");
// === ERROR HANDLING ===
// Specialized error types that work well with Effect's error handling
// Custom Error - properly defining with correct type
class NotFoundError extends effect_1.Data.Error {
}
const err1 = new NotFoundError({ item: "file.txt" });
assert(() => err1 instanceof Error);
assert(() => err1.item === "file.txt");
// Tagged Error
class ApiError extends effect_1.Data.TaggedError("ApiError") {
}
const err2 = new ApiError({ code: 404 });
assert(() => err2._tag === "ApiError");
assert(() => err2.code === 404);
// Print out "All tests passed" if we made it this far
console.log("All assertions passed!");
// Async example with Effect would go here in a real application
//# sourceMappingURL=effect%20ts%20-%20Data%20Module.js.map