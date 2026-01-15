import { Brand, Either, Schema, Option } from "effect"
// https://effect.website/docs/code-style/branded-types/

const assert = (condition: boolean, message?: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  if (!!message) console.log(`✓ ${message}`);
};

export const parseWithSchema = <A, I>(
    schema: Schema.Schema<A, I>,
    value: I | null | undefined
): Option.Option<A> =>
    value == null ? Option.none() :
        Either.getRight(Schema.decodeUnknownEither(schema)(value))



// Basic branded types with nominal
type UserId = number & Brand.Brand<"UserId">
const UserId = Brand.nominal<UserId>()
const MyUserIdSchema = Schema.Number.pipe(Schema.fromBrand(UserId))
Option.isNone(parseWithSchema(MyUserIdSchema, undefined)) //?
Option.isNone(parseWithSchema(MyUserIdSchema, null)) //?
Option.isNone(parseWithSchema(MyUserIdSchema, 123)) //?
Option.isNone(parseWithSchema(MyUserIdSchema, 0)) //?


type ProductId = number & Brand.Brand<"ProductId">
const ProductId = Brand.nominal<ProductId>()

// Type safety tests
const userId: UserId = UserId(1) 
const userId2: UserId = UserId(1) 
const userId3: UserId = UserId(3) 
const productId: ProductId = ProductId(2)

// @ts-expect-error
assert(userId !== productId, "Different branded types")

userId === userId2 //?
userId === userId3 //?

// @ts-expect-error 
userId !== productId //?

// @ts-expect-error
 const wrong: UserId = 1  // Direct assignement fails

// @ts-expect-error
const wrong2: UserId = productId; //"Cross-assignment fails")

// Refined branded types with validation
type Int = number & Brand.Brand<"Int">
const Int = Brand.refined<Int>(
  (n) => Number.isInteger(n),
  (n) => Brand.error(`Expected ${n} to be an integer`)
)

type Positive = number & Brand.Brand<"Positive">
const Positive = Brand.refined<Positive>(
  (n) => n > 0,
  (n) => Brand.error(`Expected ${n} to be positive`)
)

// Refined type tests
const validInt: Int = Int(5)
assert(validInt === 5, "Valid integer created")

try {
  Int(3.14)
  assert(false, "Should have thrown")
} catch (e:any) {
  assert(e[0].message === "Expected 3.14 to be an integer", "Invalid integer throws")
}

// Combined branded types
const PositiveInt = Brand.all(Int, Positive)
type PositiveInt = Brand.Brand.FromConstructor<typeof PositiveInt>

// Combined type tests
const validPositiveInt: PositiveInt = PositiveInt(10)
assert(validPositiveInt === 10, "Valid positive integer")

try {
  PositiveInt(-5)
} catch (e) {
    e //?
}

try {
  PositiveInt(3.14)
  // assert(false, "Should have thrown")
} catch (e) {
  e //?
}

// Custom branded types with symbols
type Email = string & Brand.Brand<"Email">
const Email = Brand.refined<Email>(
  (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
  (s) => Brand.error(`Invalid email: ${s}`)
)

const email: Email = Email("test@example.com")
assert(email === "test@example.com", "Valid email created")
email //?


try {
    var s2 = Email("blah@a.b")
  } catch (e) {
    e //?
  }


// Type safety with functions
const getUserById = (id: UserId) => `User ${id}`
const getProductById = (id: ProductId) => `Product ${id}`

assert(getUserById(userId) === "User 1", "Function with correct type")
// @ts-expect-error
assert(() => { getUserById(productId) }, "Type mismatch errors")

// Advanced: Nested brands - this is creating AdminUseId as a subtype of UserId (https://claude.ai/chat/a97deb15-b30a-45a6-96fe-d2c4a5e3f9c5)
type AdminUserId = UserId & Brand.Brand<"AdminUserId">
const AdminUserId = Brand.all(
  UserId,
  Brand.refined<AdminUserId>(
    (id) => id < 100,
    (id) => Brand.error(`AdminUserId must be < 100, got ${id}`)
  )
)

const adminId: AdminUserId = AdminUserId(50)
assert(getUserById(adminId) === "User 50", "Subtype compatibility")

console.log("All tests passed!")