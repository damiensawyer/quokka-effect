"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWithSchema = void 0;
const effect_1 = require("effect");
// https://effect.website/docs/code-style/branded-types/
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    if (!!message)
        console.log(`✓ ${message}`);
};
const parseWithSchema = (schema, value) => value == null ? effect_1.Option.none() :
    effect_1.Either.getRight(effect_1.Schema.decodeUnknownEither(schema)(value));
exports.parseWithSchema = parseWithSchema;
const UserId = effect_1.Brand.nominal();
const MyUserIdSchema = effect_1.Schema.Number.pipe(effect_1.Schema.fromBrand(UserId));
effect_1.Option.isNone((0, exports.parseWithSchema)(MyUserIdSchema, undefined)); //?
effect_1.Option.isNone((0, exports.parseWithSchema)(MyUserIdSchema, null)); //?
effect_1.Option.isNone((0, exports.parseWithSchema)(MyUserIdSchema, 123)); //?
effect_1.Option.isNone((0, exports.parseWithSchema)(MyUserIdSchema, 0)); //?
const ProductId = effect_1.Brand.nominal();
// Type safety tests
const userId = UserId(1);
const userId2 = UserId(1);
const userId3 = UserId(3);
const productId = ProductId(2);
// @ts-expect-error
assert(userId !== productId, "Different branded types");
userId === userId2; //?
userId === userId3; //?
// @ts-expect-error 
userId !== productId; //?
// @ts-expect-error
const wrong = 1; // Direct assignement fails
// @ts-expect-error
const wrong2 = productId; //"Cross-assignment fails")
const Int = effect_1.Brand.refined((n) => Number.isInteger(n), (n) => effect_1.Brand.error(`Expected ${n} to be an integer`));
const Positive = effect_1.Brand.refined((n) => n > 0, (n) => effect_1.Brand.error(`Expected ${n} to be positive`));
// Refined type tests
const validInt = Int(5);
assert(validInt === 5, "Valid integer created");
try {
    Int(3.14);
    assert(false, "Should have thrown");
}
catch (e) {
    assert(e[0].message === "Expected 3.14 to be an integer", "Invalid integer throws");
}
// Combined branded types
const PositiveInt = effect_1.Brand.all(Int, Positive);
// Combined type tests
const validPositiveInt = PositiveInt(10);
assert(validPositiveInt === 10, "Valid positive integer");
try {
    PositiveInt(-5);
}
catch (e) {
    e; //?
}
try {
    PositiveInt(3.14);
    // assert(false, "Should have thrown")
}
catch (e) {
    e; //?
}
const Email = effect_1.Brand.refined((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), (s) => effect_1.Brand.error(`Invalid email: ${s}`));
const email = Email("test@example.com");
assert(email === "test@example.com", "Valid email created");
email; //?
try {
    var s2 = Email("blah@a.b");
}
catch (e) {
    e; //?
}
// Type safety with functions
const getUserById = (id) => `User ${id}`;
const getProductById = (id) => `Product ${id}`;
assert(getUserById(userId) === "User 1", "Function with correct type");
// @ts-expect-error
assert(() => { getUserById(productId); }, "Type mismatch errors");
const AdminUserId = effect_1.Brand.all(UserId, effect_1.Brand.refined((id) => id < 100, (id) => effect_1.Brand.error(`AdminUserId must be < 100, got ${id}`)));
const adminId = AdminUserId(50);
assert(getUserById(adminId) === "User 50", "Subtype compatibility");
console.log("All tests passed!");
//# sourceMappingURL=effect%20ts%20-%20Branded%20Types.js.map