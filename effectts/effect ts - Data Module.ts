
import { Data, Equal } from "effect"

const assert = (condition: boolean, message?: string) => {
  if (!condition) throw new Error(message ?? "Assertion failed")
}

// ============================================================================
// VALUE EQUALITY (Object/Array Literals)
// ============================================================================
// In Effect v4, Data.struct/tuple/array are removed - use literals directly

// Simple struct equality
const person1 = { name: "Alice", age: 30 }
const person2 = { name: "Alice", age: 30 }
assert(Equal.equals(person1, person2))

// Tuple equality
const tuple1 = [1, "hello", true] as const
const tuple2 = [1, "hello", true] as const
assert(Equal.equals(tuple1, tuple2))

// Array equality
const arr1 = [1, 2, 3]
const arr2 = [1, 2, 3]
assert(Equal.equals(arr1, arr2))

// Nested structures
const nested1 = { user: { id: 1, name: "Bob" }, tags: ["a", "b"] }
const nested2 = { user: { id: 1, name: "Bob" }, tags: ["a", "b"] }
assert(Equal.equals(nested1, nested2))

console.log("Value equality tests passed!")

// ============================================================================
// DATA.CLASS - Generic Class Constructor
// ============================================================================
// Data.case<T>() is replaced by Data.Class<T>() in v4

interface Point { readonly x: number; readonly y: number }
const Point = Data.Class<Point>()

const p1 = new Point({ x: 10, y: 20 })
const p2 = new Point({ x: 10, y: 20 })
assert(Equal.equals(p1, p2))
assert(p1.x === 10 && p1.y === 20)

// Extending Data.Class with custom methods
class Vector extends Data.Class<{ x: number; y: number }> {
  get magnitude() {
    return Math.sqrt(this.x ** 2 + this.y ** 2)
  }
  
  add(other: Vector): Vector {
    return new Vector({ x: this.x + other.x, y: this.y + other.y })
  }
}

const v1 = new Vector({ x: 3, y: 4 })
const v2 = new Vector({ x: 3, y: 4 })
assert(Equal.equals(v1, v2))
assert(v1.magnitude === 5)

const v3 = v1.add(new Vector({ x: 1, y: 0 }))
assert(v3.x === 4 && v3.y === 4)
assert(!Equal.equals(v1, v3))

console.log("Data.Class tests passed!")

// ============================================================================
// DATA.TAGGEDCLASS - Classes with _tag Field
// ============================================================================
// Data.tagged<T>() is replaced by Data.TaggedClass<T>()("tag") in v4

// Using the curried form
interface Product { readonly _tag: "Product"; readonly id: number; readonly name: string }
const Product = Data.TaggedClass<Product>()("Product")

const prod1 = new Product({ id: 1, name: "Widget" })
const prod2 = new Product({ id: 1, name: "Widget" })
assert(prod1._tag === "Product")
assert(Equal.equals(prod1, prod2))

// Extending TaggedClass with methods
class Order extends Data.TaggedClass("Order")<{ 
  readonly orderId: string
  readonly items: ReadonlyArray<string>
  readonly total: number
}> {
  get itemCount() {
    return this.items.length
  }
  
  get isExpensive() {
    return this.total > 100
  }
}

const order1 = new Order({ orderId: "ORD-001", items: ["item1", "item2"], total: 150 })
const order2 = new Order({ orderId: "ORD-001", items: ["item1", "item2"], total: 150 })
assert(order1._tag === "Order")
assert(order1.itemCount === 2)
assert(order1.isExpensive)
assert(Equal.equals(order1, order2))

console.log("Data.TaggedClass tests passed!")

// ============================================================================
// DATA.TAGGEDENUM - Tagged Unions with Pattern Matching
// ============================================================================
// Data.taggedEnum returns constructors plus $match and $is helpers

type Result = Data.TaggedEnum<{
  Success: { readonly value: number }
  Failure: { readonly error: string }
  Pending: {}
}>

const { Success, Failure, Pending, $match, $is } = Data.taggedEnum<Result>()

const success = Success({ value: 42 })
const failure = Failure({ error: "Something went wrong" })
const pending = Pending()

assert(success._tag === "Success")
assert(failure._tag === "Failure")
assert(pending._tag === "Pending")

// $is - Type guard function
const isSuccessGuard = $is("Success")
const isFailureGuard = $is("Failure")

assert(isSuccessGuard(success))
assert(!isSuccessGuard(failure))
assert(isFailureGuard(failure))

// Type narrowing with $is
if (isSuccessGuard(success)) {
  assert(success.value === 42)
}

// $match - Exhaustive pattern matching
const describe = $match({
  Success: ({ value }) => `Got value: ${value}`,
  Failure: ({ error }) => `Error: ${error}`,
  Pending: () => "Still loading..."
})

assert(describe(success) === "Got value: 42")
assert(describe(failure) === "Error: Something went wrong")
assert(describe(pending) === "Still loading...")

// Practical example: State machine
type ConnectionState = Data.TaggedEnum<{
  Disconnected: {}
  Connecting: { readonly attempt: number }
  Connected: { readonly sessionId: string }
  Error: { readonly message: string; readonly retryable: boolean }
}>

const { 
  Disconnected, 
  Connecting, 
  Connected, 
  Error: ConnectionError,
  $match: matchState,
  $is: isState
} = Data.taggedEnum<ConnectionState>()

const states = [
  Disconnected(),
  Connecting({ attempt: 1 }),
  Connecting({ attempt: 2 }),
  Connected({ sessionId: "abc-123" }),
  ConnectionError({ message: "Timeout", retryable: true })
]

const getStateInfo = matchState({
  Disconnected: () => "Not connected",
  Connecting: ({ attempt }) => `Connecting (attempt ${attempt})...`,
  Connected: ({ sessionId }) => `Connected with session: ${sessionId}`,
  Error: ({ message, retryable }) => `Error: ${message}${retryable ? " (will retry)" : ""}`
})

assert(getStateInfo(states[0]) === "Not connected")
assert(getStateInfo(states[1]) === "Connecting (attempt 1)...")
assert(getStateInfo(states[3]) === "Connected with session: abc-123")
assert(getStateInfo(states[4]) === "Error: Timeout (will retry)")

console.log("Data.TaggedEnum tests passed!")

// ============================================================================
// DATA.ERROR - Custom Error Classes
// ============================================================================

class DatabaseError extends Data.Error<{
  readonly query: string
  readonly cause: string
}> {}

const dbError = new DatabaseError({ 
  query: "SELECT * FROM users", 
  cause: "Connection refused" 
})

assert(dbError instanceof Error)
assert(dbError.query === "SELECT * FROM users")
assert(dbError.cause === "Connection refused")
assert(dbError.message.includes("Connection refused"))

console.log("Data.Error tests passed!")

// ============================================================================
// DATA.TAGGEDERROR - Tagged Error Classes
// ============================================================================

class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly field: string
  readonly reason: string
}> {}

class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly url: string
  readonly statusCode: number
}> {}

const validationErr = new ValidationError({ field: "email", reason: "Invalid format" })
const networkErr = new NetworkError({ url: "/api/users", statusCode: 500 })

assert(validationErr._tag === "ValidationError")
assert(networkErr._tag === "NetworkError")
assert(validationErr instanceof Error)
assert(networkErr instanceof Error)
assert(validationErr.field === "email")
assert(networkErr.statusCode === 500)

// TaggedError equality
const validationErr2 = new ValidationError({ field: "email", reason: "Invalid format" })
assert(Equal.equals(validationErr, validationErr2))

// Pattern matching on errors (useful in Effect error handling)
const handleError = (err: ValidationError | NetworkError) => {
  switch (err._tag) {
    case "ValidationError":
      return `Validation failed on '${err.field}': ${err.reason}`
    case "NetworkError":
      return `Network request to ${err.url} failed with status ${err.statusCode}`
  }
}

assert(handleError(validationErr) === "Validation failed on 'email': Invalid format")
assert(handleError(networkErr) === "Network request to /api/users failed with status 500")

console.log("Data.TaggedError tests passed!")
console.log("\n✓ All Data module tests passed!")
