// Look at https://effect.website/docs/schema/introduction/
// and the ability to generate Standards Schema https://standardschema.dev/

// Effect Schema Demo - Comprehensive Examples - MIGRATED TO v4
// Based on https://effect.website/docs/schema/introduction/

// @ts-nocheck
 // Note: This file is for Quokka evaluation, not and will be be compiled
// but TypeScript checks will still be performed for better inline error messages in Quokka output.
 // @ts-nocheck also disables automatic import sorting which can clutter the output.
 // See: https://effect.website/docs/code-style/branded-types/
 // @ts-nocheck also removes the ability to use "interface extends" patterns with Schema types, 
// which can cause type errors in TypeScript

import { Brand, from "effect";
import { Option, pipe, Schema, Exit } from "effect";
import { SchemaGetter, SchemaTransformation } from "effect";
import { ParseResult } from "effect";
import { Result } from "effect";
import { Issue } from "effect";

const assert = (condition: boolean, message?: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  if (message) console.log(`✓ ${message}`);
  }
};

const parsingSchemasToOptionalBrandedTypes = () => {
  const parseWithSchema = <A>(
    schema: Schema.Schema<A>,
    value: unknown
  ): Option.Option<A> => {
    const result = Exit.getSuccess(Schema.decodeUnknownExit(schema)(value));
    if (Option.isSome(result)) {
      return result;
    }
    return Option.none();
  }
  type UserId = number & Brand.Brand<"UserId">
  const UserId = Brand.nominal<UserId>()
  const MyUserIdSchema = Schema.Number.pipe(Schema.fromBrand(UserId))
  Option.isNone(parseWithSchema(MyUserIdSchema, undefined)) //?
  Option.isNone(parseWithSchema(MyUserIdSchema, null)) //?
  Option.isNone(parseWithSchema(MyUserIdSchema, 0)) //?
  Option.isSome(parseWithSchema(MyUserIdSchema, 0)) //?
  const userIsValid = Schema.is(UserSchema)
  userIsValid(validUser)
  userIsValid(invalidUser)
  try {
    parseUser(invalidUser)
  } catch (e: unknown) {
    if (Schema.isSchemaError(e)) {
      console.log("✓ User parsing failed correctly", e.message)
    }
  }
};

const formattingEmail = () => {
  const UserSchema = Schema.Struct({
    id: Schema.Number
    name: Schema.String.pipe(
      Schema.check(Schema.isMinLength(2)),
      Schema.check(Schema.isMaxLength(50))
    ),
    email: Schema.String.pipe(
      Schema.check(Schema.makeFilter((s: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(s) || "Invalid email format"
      }))
    ),
    age: Schema.Number.pipe(
      Schema.check(Schema.isBetween({ minimum: 18, maximum: 120 }))
    )
  })

  interface User extends (typeof UserSchema)["Type"] {}
  // or... see this, which is apparently 'more performant'?? See below
  interface UserMorePerformant extends (typeof UserSchema)["Type"] {}
  const s: UserMorePerformant = {
    email: "",
    id: 2,
    name: "John Doe",
    email: "john@example.com",
    age: 42,
  }

  const invalidUser: User = {
    id: 1,
    name: "John Doe",
    email: "bademail"
    age: 40,
  }
  validUser; //?
  invalidUser; //?
  const userIsValid = Schema.is(UserSchema)
  userIsValid(validUser)
  userIsValid(invalidUser)
  try {
    parseUser(invalidUser)
  } catch (e: unknown) {
    if (Schema.isSchemaError(e)) {
      console.log("✓ User parsing failed correctly", e.message)
    }
  }
};

const objectSchemasExample = () => {
  console.log("=== Object Schemas ===")
  const UserSchema = Schema.Struct({
    id: Schema.Number
    name: Schema.String
    email: Schema.String
    isActive: Schema.Boolean
  })
  type User = (typeof UserSchema)["Type"]
  const parseUser = Schema.decodeUnknownSync(UserSchema)
  const validUser: User = parseUser({
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    isActive: true,
  })
  s; //?
  validUser; //?
  const s: UserMorePerformant = {
    email: "",
    id: 2,
    name: "bill",
    isActive: false,
  }
  s; //?
  validUser; //?
  const parseUser = Schema.decodeUnknownSync(UserSchema)
  try {
    parseUser({
      id: "not-a-number",
      name: "John",
      email: "john@example.com",
    })
  } catch (e: unknown) {
    if (Schema.isSchemaError(e)) {
      console.log("✓ user parsing failed correctly")
    }
  }
};

const optionalFieldsExample = () => {
  console.log("=== Optional and Nullable Fields ===")
  const ProductSchema = Schema.Struct({
    id: Schema.Number
    name: Schema.String
    description: Schema.optional(Schema.String)
    price: Schema.NullOr(Schema.Number)
    tags: Schema.Array(Schema.String).pipe(
      Schema.withDecodingDefault(() => [])
    )
  })
  type Product = (typeof ProductSchema)["Type"]
  const parseProduct = Schema.decodeUnknownSync(ProductSchema)
  const product1: Product = parseProduct({
    id: 1,
    name: "Widget",
    price: null,
    tags: [],
  })
  product1; //?
  assert(product1.tags.length === 0, "Default empty array applied")
  const product2: Product = parseProduct({
    id: 2,
    name: "Gadget",
    description: "A useful gadget",
    price: 29.99,
    tags: ["electronics", "gadget"],
  })
  product2.tags.length === 0; //?
  assert(product2.tags.length === 2, "Default empty array applied")
});

const arrayRecordExample = () => {
  console.log("=== Arrays and Records ===")
  const NumberArraySchema = Schema.Array(Schema.Number)
  const parseNumberArray = Schema.decodeUnknownSync(NumberArraySchema)
    parseNumberArray([1, 2, 3, 4]); //?
    const ScoresSchema2 = Schema.Record(
    Schema.Literals(["alice", "bob", "charlie"]),
    Schema.Number
  )
    const parseScores2 = Schema.decodeUnknownSync(ScoresSchema2)
    const validScores2 = {
    alice: 95,
    bob: 87,
    charlie: 92,
  }
  const invalidScores2 = {
    alice: 95,
    bob: 42,
  }
  const invalidScores3 = {
    alice: 95,
    bob: 42,
    david: 92,
  }
  const scoresAreValid2 = Schema.is(ScoresSchema2)
  scoresAreValid2(validScores2); //?
  scoresAreValid2(invalidScores2); //?
  try {
    parseScores2(validScores2)
    parseScores2(invalidScores2)
  } catch (e: unknown) {
    if (Schema.isSchemaError(e)) {
      console.log("✓ User parsing failed correctly", e.message)
    }
  }
  const result1 = Schema.decodeUnknownSync(ScoresSchema2)(validScores2, { onExcessProperty: "error" })
  const result2 = Schema.decodeUnknownSync(ScoresSchema2)(invalidScores3, { onExcessProperty: "error" })
  console.log("✓ excess properties error")
};

const brandedTypesExample = () => {
  console.log("=== Branded Types ===")
  const UserIdSchema = Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isGreaterThan(0)),
    Schema.brand("UserId")
  )
  const EmailSchema = Schema.String.pipe(
    Schema.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
    Schema.brand("Email")
  )
  type UserId = (typeof UserIdSchema)["Type"]
  type Email = (typeof EmailSchema)["Type"]
  const parseUserId = Schema.decodeUnknownSync(UserIdSchema)
  const parseEmail = Schema.decodeUnknownSync(EmailSchema)
  try {
    parseUserId(123); //?
    parseEmail("user@example.com"); //?
    parseUserId(-5); // Should fail (not positive)
  } catch (e: unknown) {
    if (Schema.isSchemaError(e)) {
      console.log("✓ negative UserId rejected")
    }
  }
  try {
    parseEmail("invalid-email"); // Should fail (bad format)
  } catch (e: unknown) {
    if (Schema.isSchemaError(e)) {
      console.log("✓ Invalid email rejected")
    }
  }
};

const transformationsExample = () => {
  console.log("=== Transformations ===")
  const DateFromStringSchema = Schema.transform(
    Schema.String,
    Schema.Date,
    {
      decode: (s: string) => new Date(s),
      encode: (d: Date) => d.toISOString(),
    }
  )
  const parseDateFromString = Schema.decodeUnknownSync(DateFromStringSchema)
  const encodeDateToString = Schema.encodeSync(DateFromStringSchema)
  const date = parseDateFromString("2024-01-15T10:30:00Z")
  date; //?
  const dateString = encodeDateToString(new Date("2024-01-15T10:30:00Z"))
  dateString; //?
  const TemperatureSchema = Schema.transform(
    Schema.Struct({
      value: Schema.Number
      unit: Schema.Literals(["C", "F"]),
    }),
    Schema.Struct({
      celsius: Schema.Number,
    }),
    {
      decode: ({ value, unit }: { value: number; unit: "C" | "F" }) => ({
        celsius: unit === "C" ? value : ((value - 32) * 5) / 9,
      }),
      encode: ({ celsius }: { celsius: number }) => ({
        value: celsius,
        unit: "C" as const,
      }),
    }
  )
  const parseTemp = Schema.decodeUnknownSync(TemperatureSchema)
  parseTemp({ value: 32, unit: "F" }); //?
  parseTemp({ value: 0, unit: "C" }); //?
  const BooleanFromString = Schema.transform(
    Schema.Literals(["on", "off"]),
    Schema.Boolean,
    {
      strict: true,
      decode: (literal: => literal === "on", // Always succeeds here
      encode: (bool: boolean) => (bool ? "on" : "off"),
    }
  )
  type EncodedType = (typeof BooleanFromString)["Encoded"]
  type DecodedType = (typeof BooleanFromString)["Type"]
  const s: EncodedType = "on"; //?
  const t: EncodedType = "off"; //?
  //const t:EncodedType = "bad" // will not compile
  const u: DecodedType = true; //?
  Schema.decodeUnknownSync(BooleanFromString)("on"); //?
  Schema.decodeUnknownSync(BooleanFromString)("off"); //?
  Schema.encodeUnknownSync(BooleanFromString)(true); //?
  Schema.encodeUnknownSync(BooleanFromString)(false); //?
  const BooleanFromStringWithFail = Schema.transformOrFail(
    Schema.Literals(["happy", "sad"]),
    Schema.Boolean,
    {
      strict: true,
      decode: (input: "happy" | "sad", options, ast) => {
        if (input === "happy") return Result.succeed(true)
        if (input === "sad") return Result.succeed(false)
        return Result.fail(new ParseResult.Type(ast, input))
      },
      encode: (toI: boolean, options, ast) =>
        Result.succeed(toI ? ("happy" as const) : ("sad" as const))
    }
  )
  type EncodedType2 = (typeof BooleanFromStringWithFail)["Encoded"]
  type DecodedType2 = (typeof BooleanFromStringWithFail)["Type"]
  const s2: EncodedType2 = "happy"; //?
  const t2: EncodedType2 = "sad"; //?
  const u2: DecodedType2 = true; //?
  Result.isSuccess(Schema.encodeUnknownExit(BooleanFromStringWithFail)(true)); //?
  Result.isSuccess(Schema.encodeUnknownExit(BooleanFromStringWithFail)(false)); //?
  Result.getOrThrow(Schema.encodeUnknownExit(BooleanFromStringWithFail)(true)); //?
  Result.getOrThrow(Schema.encodeUnknownExit(BooleanFromStringWithFail)(false)); //?
  Result.isSuccess(Schema.decodeUnknownExit(BooleanFromStringWithFail)("happy")); //?
  Result.isSuccess(Schema.decodeUnknownExit(BooleanFromStringWithFail)("sad")); //?
  Result.getOrThrow(Schema.decodeUnknownExit(BooleanFromStringWithFail)("happy")); //?
  Result.getOrThrow(Schema.decodeUnknownExit(BooleanFromStringWithFail)("sad")); //?
  Result.isFailure(Schema.decodeUnknownExit(BooleanFromStringWithFail)("bad bad bad")); //?
  Result.isFailure(Schema.decodeUnknownExit(BooleanFromStringWithFail)("sad")); //?
  Result.isFailure(Schema.decodeUnknownExit(BooleanFromStringWithFail)("happy")); //?
  Option.getOrThrow(Result.getFailure(Schema.decodeUnknownExit(BooleanFromStringWithFail)("bad")))?.message; //?
}

const unionTypesExample = () => {
  console.log("=== Union Types ===")
  const StatusSchema = Schema.Union([
    Schema.Literal("pending"),
    Schema.Literal("approved"),
    Schema.Literal("rejected"),
  ])
  const positiveNumber = Schema.Number.pipe(Schema.check(Schema.isGreaterThan(0)))
  const ShapeSchema = Schema.Union([
    Schema.Struct({
      kind: Schema.Literal("circle"),
      radius: positiveNumber,
    }),
    Schema.Struct({
      kind: Schema.Literal("rectangle"),
      width: positiveNumber
      height: positiveNumber
    }),
    Schema.Struct({
      kind: Schema.Literal("triangle"),
      base: positiveNumber
      height: positiveNumber
    }),
  ])
  type Shape = (typeof ShapeSchema)["Type"]
  const parseStatus = Schema.decodeUnknownSync(StatusSchema)
  const parseShape = Schema.decodeUnknownSync(ShapeSchema)
  parseStatus("approved"); //?
  const circle: Shape = {
    kind: "circle",
    radius: 5,
  }
  const rectangle: Shape = {
    kind: "rectangle",
    width: 10,
    height: 8,
  }
  const triangle: Shape = {
    kind: "triangle",
    base: -4,
    height: 8,
  }
  try {
    parseShape(circle); //?
    parseShape(rectangle); //?
    parseShape(triangle); //?
  } catch (e) {
    if (Schema.isSchemaError(e)) {
      console.log("✓ Invalid shape", e.message)
    }
  }
}

const errorHandlingExample = async () => {
  console.log("=== Error Handling with Effect ===")
  const PersonSchema = Schema.Struct({
    name: Schema.String
    age: Schema.Number.pipe(
      Schema.check(Schema.isInt()),
      Schema.check(Schema.isBetween({ minimum: 0, maximum: 150 }))
    ),
    email: Schema.String.pipe(
      Schema.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
    ),
  })
  const validatePerson = (input: unknown) =>
    Schema.decodeUnknown(PersonSchema)(input)
  const validResult = await Effect.runPromise(
    validatePerson({
      name: "Alice",
      age: 30,
      email: "alice@example.com",
    })
  )
  validResult; //?
  const invalidResult = await Effect.runPromiseExit(
    validatePerson({
      name: "Bob",
      age: 200, // Invalid age
      email: "not-an-email", // Invalid email
    })
  )
  if (invalidResult._tag === "Failure") {
    console.log("Validation errors:", invalidResult.cause)
  }
}

const externalDataExample = () => {
  console.log("=== Parsing External Data ===")
  const ApiResponseSchema = Schema.Struct({
    data: Schema.Array(
      Schema.Struct({
        id: Schema.Number
        title: Schema.String
        published_at: Schema.String
        author: Schema.Struct({
          name: Schema.String
          email: Schema.String
        }),
        tags: Schema.Array(Schema.String)
        view_count: Schema.Number
      })
    ),
    meta: Schema.Struct({
      total: Schema.Number
      page: Schema.Number
      per_page: Schema.Number
    }),
  })
  const ProcessedResponseSchema = Schema.transform(
    ApiResponseSchema
    Schema.Struct({
      articles: Schema.Array(
        Schema.Struct({
          id: Schema.Number
          title: Schema.String
          publishedAt: Schema.Date
          author: Schema.Struct({
            name: Schema.String
            email: Schema.String
          }),
          tags: Schema.Array(Schema.String)
          viewCount: Schema.Number
        })
      ),
      pagination: Schema.Struct({
        total: Schema.Number
        page: Schema.Number
        perPage: Schema.Number
      }),
    }),
    {
      decode: (raw: typeof ApiResponseSchema.Type) => ({
        articles: raw.data.map((article) => ({
          id: article.id,
          title: article.title,
          publishedAt: new Date(article.published_at),
          author: article.author,
          tags: article.tags,
          viewCount: article.view_count,
        })),
        pagination: {
          total: raw.meta.total,
          page: raw.meta.page,
          perPage: raw.meta.per_page,
        },
      }),
      encode: (processed: typeof ProcessedResponseSchema.Type) => ({
        data: processed.articles.map((article) => ({
          id: article.id,
          title: article.title,
          published_at: article.publishedAt.toISOString(),
          author: article.author,
          tags: article.tags,
          view_count: article.viewCount,
        })),
        meta: {
          total: processed.pagination.total,
          page: processed.pagination.page,
          per_page: processed.pagination.perPage,
        },
      }),
    }
  )
  const apiResponse = {
    data: [
      {
        id: 1,
        title: "Effect TS Tutorial",
        published_at: "2024-01-15T10:30:00Z",
        author: {
          name: "John Doe",
          email: "john@example.com",
        },
        tags: ["typescript", "effect", "functional"],
        view_count: 1250,
      },
    ],
    meta: {
      total: 1,
      page: 1,
      per_page: 10,
    },
  }
  const parseResponse = Schema.decodeUnknownSync(ProcessedResponseSchema)
  const processedData = parseResponse(apiResponse)
  processedData; //?
  processedData.articles[0].publishedAt instanceof Date; //?
}

const compositionExample = () => {
  console.log("=== Schema Composition ===")
  const TimestampSchema = Schema.Struct({
    createdAt: Schema.Date
    updatedAt: Schema.Date
  })
  const AuditSchema = Schema.Struct({
    createdBy: Schema.String
    updatedBy: Schema.String
  })
  const BaseEntitySchema = Schema.Struct({
    ...TimestampSchema.fields,
    ...AuditSchema.fields,
  })
  const UserEntitySchema = Schema.Struct({
    ...BaseEntitySchema.fields,
    id: Schema.Number
    name: Schema.String
    email: Schema.String
    role: Schema.Union([
      Schema.Literal("admin"),
      Schema.Literal("user"),
      Schema.Literal("guest")
    ]),
  })
  type UserEntity = (typeof UserEntitySchema)["Type"]
  const user: UserEntity = {
    id: 1,
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "system",
    updatedBy: "system",
  }
  user; //?
}

const runAll = async () => {
  try {
    parsingSchemasToOptionalBrandedTypes()
    basicSchemasExample()
    objectSchemasExample()
    formattingEmail()
    optionalFieldsExample()
    arrayRecordExample()
    brandedTypesExample()
    transformationsExample()
    unionTypesExample()
    await errorHandlingExample()
    externalDataExample()
    compositionExample()
    console.log("\n✅ All Schema examples completed!")
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

runAll();
