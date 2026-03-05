import { Brand, Schema, Option, Exit, Types } from "effect"

type Top = Types.Top

export const parseWithSchema = <S extends Top & { readonly DecodingServices: never }>(
    schema: S,
    value: unknown
): Option.Option<S["Type"]> =>
    value == null
 ? Option.none() : Exit.getSuccess(Schema.decodeUnknownExit(schema)(value))

type UserId = number & Brand.Brand<"UserId">
const UserId = Brand.nominal<UserId>()
const MyUserIdSchema = Schema.Number.pipe(Schema.fromBrand("UserId", UserId))
Option.isNone(parseWithSchema(MyUserIdSchema, undefined)) //?
Option.isNone(parseWithSchema(MyUserIdSchema, null)) //?
Option.isNone(parseWithSchema(MyUserIdSchema, UserId(0))) //?
Option.isSome(parseWithSchema(MyUserIdSchema, UserId(0))) //?

type ProductId = number & Brand.Brand<"ProductId">
const ProductId = Brand.nominal<ProductId>()

// Type safety tests
const userId: UserId = UserId(1) 
const userId2: UserId = UserId(3) 
const productId: ProductId = ProductId(2)
// @ts-expect-error
assert(userId !== productId, "Different branded types")
userId === userId2 //?
// @ts-expect-error 
userId !== productId //?
// Refined branded types with validation
type Int = number & Brand.Brand<"Int">
const Int = Brand.make<Int>((n) => Number.isInteger(n) || `Expected ${n} to be an integer`)
type Positive = number & Brand.Brand<"Positive">
const Positive = Brand.make<Positive>((n) => n > 0 || `Expected ${n} to be positive`)
// Refined type tests
const validInt: Int = Int(5)
assert(validInt === 5, "Valid integer created")
try {
  Int(3.14)
  assert(false, "Should have thrown")
} catch (e: any) {
  assert(e.issue.message === "Expected 3.14 to be an integer", "Invalid integer throws")
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
const Email = Brand.make<Email>((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) || `Invalid email: ${s}`)
const email: Email = Email("test@example.com")
assert(email === "test@example.com", "Valid email created")
email //?
try {
    const s2 = Email("blah@a.b")
  } catch (e) {
    e //?
  }
// Type safety with functions
const getUserById = (id: UserId) => `User ${id}`
const getProductById = (id: ProductId) => `Product ${id}`
assert(getUserById(userId) === "User 1", "Function with correct type")
// @ts-expect-error
assert(() => { getUserById(productId) }, "Type mismatch errors")
// Advanced: Nested brands - creating AdminUseId as a subtype of UserId
type AdminUserId = UserId & Brand.Brand<"AdminUserId">
const AdminUserId = Brand.all(
  UserId,
  Brand.make<AdminUserId>((id) => id < 100 || `AdminUserId must be < 100, got ${id}`)
)
const adminId: AdminUserId = AdminUserId(50)
assert(getUserById(adminId) === "User 50", "Subtype compatibility")
console.log("All tests passed!")
