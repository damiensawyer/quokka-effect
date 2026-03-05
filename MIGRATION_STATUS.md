# Effect v4 Schema Migration Status

## ✅ Completed Migrations

### Schema Validation API
- `Schema.minLength(n)` → `Schema.check(Schema.isMinLength(n))`
- `Schema.maxLength(n)` → `Schema.check(Schema.isMaxLength(n))`
- `Schema.between(min, max)` → `Schema.check(Schema.isBetween({ minimum: min, maximum: max }))`
- `Schema.pattern(regex)` → `Schema.check(Schema.isPattern(regex))`
- `Schema.filter(fn)` → `Schema.check(Schema.makeFilter(fn))`
- `Schema.int()` → `Schema.isInt()`
- `Schema.positive()` → `Schema.isGreaterThan(0)`

### Type Extraction
- `Schema.Schema.Type<typeof X>` → `(typeof X)["Type"]`

### Schemas
- `Schema.DateFromSelf` → `Schema.Date`
- `Schema.Record({ key, value })` → `Schema.Record(keySchema, valueSchema)`
- `Schema.Literal("a", "b", "c")` (when used for keys) → `Schema.Literals(["a", "b", "c"])`
- `Schema.Union(a, b, c)` → `Schema.Union([a, b, c])` (array syntax)

### Composition
- `Schema.extend(a, b)` → `Schema.Struct({ ...a.fields, ...b.fields })`

### Error Handling
- `ParseResult.isParseError` → `Schema.isSchemaError`

## ❌ Still To Fix

### 1. Transform Functions
The transform API has changed completely. Instead of:
```ts
Schema.transform(from, to, { decode, encode })
```

Use:
```ts
from.pipe(
  Schema.decodeTo(to, {
    decode: SchemaGetter.transform(decodeFn),
    encode: SchemaGetter.transform(encodeFn)
  })
)
```

**Files affected:**
- `effectts/effect ts - Schemas.ts` (lines 322, 341, 366, 391)

### 2. Either/Result Types
- `Schema.decodeUnknownEither` → `Schema.decodeUnknownExit`
- `Schema.encodeUnknownEither` → `Schema.encodeUnknownExit`
- `Result.succeed/fail` → Need to check new API
- `Result.isSuccess/isFailure` → Exit.isSuccess/isFailure

**Files affected:**
- `effectts/effect ts - Schemas.ts` (lines 32, 411-418)

### 3. Schema Type Parameters
- `Schema.Schema<A, I>` → `Schema.Schema<A>` (only one type parameter in v4)

**Files affected:**
- `effectts/effect ts - Schemas.ts` (line 26)

### 4. Brand.nominal
- `Brand.nominal<UserId>()` - needs to check if this API still exists

**Files affected:**
- `effectts/effect ts - Schemas.ts` (line 35)

### 5. Interface Extension
Interface extending schema types needs proper syntax:
```ts
// Wrong:
interface User extends (typeof UserSchema)["Type"] {}

// Correct:
type User = (typeof UserSchema)["Type"]
```

**Files affected:**
- `effectts/effect ts - Schemas.ts` (lines 89, 140)

## 📋 Migration Tasks

1. **Transform functions** - Replace all Schema.transform calls with pipe + decodeTo pattern
2. **Either/Result/Exit** - Replace Result with Exit, update all isSuccess/isFailure calls
3. **Schema type parameters** - Remove second type parameter from Schema.Schema
4. **Brand.nominal** - Check if still exists or replacement
5. **Interface extensions** - Change to type aliases
6. **ParseResult.Type** - Check if still exists or replacement for transformOrFail

## 🔍 Run Typecheck

```bash
./typecheck.sh
```

This will show all remaining type errors across the project.

## 📚 Key Resources

- [Schema v4 Migration Guide](https://github.com/Effect-TS/effect-smol/blob/main/packages/effect/SCHEMA.md)
- [Services Migration Guide](https://github.com/Effect-TS/effect-smol/blob/main/migration/services.md)
- [Error Handling Migration](https://github.com/Effect-TS/effect-smol/blob/main/migration/error-handling.md)
