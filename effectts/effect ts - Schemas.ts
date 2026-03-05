import { Brand, Effect, Exit, Issue, Option, pipe, Result, Schema, SchemaGetter, SchemaTransformation } from "effect";

const assert = (condition: boolean, message?: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  if (message) console.log(`✓ ${message}`);
};

const parsingSchemasToOptionalBrandedTypes = () => {
  console.log("=== Parsing Schemas to Optional Branded Types ===");
  
  const parseWithSchema = <A>(
    schema: Schema.Schema<A>,
    value: unknown
  ): Option.Option<A> => {
    const result = Schema.decodeUnknownSync(schema)(value);
    return Option.some(result);
  };

  type UserId = number & Brand.Brand<"UserId">;
  const UserId = Brand.nominal<UserId>();
  const UserIdSchema = Schema.Number.pipe(Schema.fromBrand(UserId));

  Option.isNone(parseWithSchema(UserIdSchema, undefined)); //?
  Option.isNone(parseWithSchema(UserIdSchema, null)); //?
  Option.isNone(parseWithSchema(UserIdSchema, 0)); //?
  Option.isSome(parseWithSchema(UserIdSchema, 0)); //?

  const validUserId = parseWithSchema(UserIdSchema, 42);
  Option.isSome(validUserId); //?

  console.log("✓ Branded type parsing with Brand.nominal demonstrated");
};

const basicSchemasExample = () => {
  console.log("=== Basic Schemas ===");

  const StringSchema = Schema.String;
  const NumberSchema = Schema.Number;
  const BooleanSchema = Schema.Boolean;

  const parseString = Schema.decodeUnknownSync(StringSchema);
  const parseNumber = Schema.decodeUnknownSync(NumberSchema);

  parseString("hello"); //?
  parseNumber(42); //?
  parseNumber(3.14); //?

  const isString = Schema.is(StringSchema);
  isString("test"); //?
  isString(123); //?

  console.log("✓ Basic String, Number, Boolean schemas demonstrated");
};

const formattingEmail = () => {
  console.log("=== Formatting Email with Checks ===");

  const UserSchema = Schema.Struct({
    id: Schema.Number,
    name: Schema.String.pipe(
      Schema.check(Schema.isMinLength(2)),
      Schema.check(Schema.isMaxLength(50))
    ),
    email: Schema.String.pipe(
      Schema.check(Schema.makeFilter((s: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(s) || "Invalid email format";
      }))
    ),
    age: Schema.Number.pipe(
      Schema.check(Schema.isBetween({ minimum: 18, maximum: 120 }))
    ),
  });

  type User = (typeof UserSchema)["Type"];

  const validUser: User = {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    age: 42,
  };

  const parseUser = Schema.decodeUnknownSync(UserSchema);
  
  validUser; //?
  parseUser(validUser); //?

  const userIsValid = Schema.is(UserSchema);
  userIsValid(validUser); //?

  try {
    parseUser({
      id: 1,
      name: "J",
      email: "bademail",
      age: 200,
    });
  } catch (e: unknown) {
    console.log("✓ User validation with multiple checks failed correctly");
  }

  console.log("✓ Email formatting with Schema.check demonstrated");
};

const objectSchemasExample = () => {
  console.log("=== Object Schemas ===");

  const UserSchema = Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
    email: Schema.String,
    isActive: Schema.Boolean,
  });

  type User = (typeof UserSchema)["Type"];

  const parseUser = Schema.decodeUnknownSync(UserSchema);

  const validUser: User = parseUser({
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    isActive: true,
  });

  validUser; //?

  const anotherUser: User = {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    isActive: false,
  };

  anotherUser; //?

  try {
    parseUser({
      id: "not-a-number",
      name: "John",
      email: "john@example.com",
    });
  } catch (e: unknown) {
    console.log("✓ Invalid object parsing failed correctly");
  }

  console.log("✓ Schema.Struct basics demonstrated");
};

const optionalFieldsExample = () => {
  console.log("=== Optional and Nullable Fields ===");

  const ProductSchema = Schema.Struct({
    id: Schema.Number,
    name: Schema.String,
    description: Schema.optional(Schema.String),
    price: Schema.NullOr(Schema.Number),
    tags: Schema.Array(Schema.String).pipe(
      Schema.withDecodingDefault(() => [])
    ),
  });

  type Product = (typeof ProductSchema)["Type"];

  const parseProduct = Schema.decodeUnknownSync(ProductSchema);

  const product1: Product = parseProduct({
    id: 1,
    name: "Widget",
    price: null,
  });

  product1; //?
  assert(product1.tags.length === 0, "Default empty array applied");

  const product2: Product = parseProduct({
    id: 2,
    name: "Gadget",
    description: "A useful gadget",
    price: 29.99,
    tags: ["electronics", "gadget"],
  });

  product2; //?
  assert(product2.tags.length === 2, "Provided tags preserved");

  console.log("✓ Schema.optional and Schema.NullOr demonstrated");
};

const arrayRecordExample = () => {
  console.log("=== Arrays and Records ===");

  const NumberArraySchema = Schema.Array(Schema.Number);
  const parseNumberArray = Schema.decodeUnknownSync(NumberArraySchema);
  
  parseNumberArray([1, 2, 3, 4]); //?

  const StringArraySchema = Schema.Array(Schema.String);
  parseNumberArray([]); //?

  const ScoresSchema = Schema.Record(
    Schema.String,
    Schema.Number
  );

  const parseScores = Schema.decodeUnknownSync(ScoresSchema);

  const validScores = {
    alice: 95,
    bob: 87,
    charlie: 92,
  };

  parseScores(validScores); //?

  const LiteralKeySchema = Schema.Record(
    Schema.Literal("alice", "bob", "charlie"),
    Schema.Number
  );

  const parseLiteralScores = Schema.decodeUnknownSync(LiteralKeySchema);
  parseLiteralScores({ alice: 90, bob: 85, charlie: 95 }); //?

  console.log("✓ Schema.Array and Schema.Record demonstrated");
};

const brandedTypesExample = () => {
  console.log("=== Branded Types ===");

  const UserIdSchema = Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isGreaterThan(0)),
    Schema.brand("UserId")
  );

  const EmailSchema = Schema.String.pipe(
    Schema.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
    Schema.brand("Email")
  );

  type UserId = (typeof UserIdSchema)["Type"];
  type Email = (typeof EmailSchema)["Type"];

  const parseUserId = Schema.decodeUnknownSync(UserIdSchema);
  const parseEmail = Schema.decodeUnknownSync(EmailSchema);

  const validId = parseUserId(123);
  validId; //?

  const validEmail = parseEmail("user@example.com");
  validEmail; //?

  try {
    parseUserId(-5);
  } catch (e: unknown) {
    console.log("✓ Negative UserId rejected");
  }

  try {
    parseUserId(3.14);
  } catch (e: unknown) {
    console.log("✓ Non-integer UserId rejected");
  }

  try {
    parseEmail("invalid-email");
  } catch (e: unknown) {
    console.log("✓ Invalid email rejected");
  }

  console.log("✓ Schema.brand demonstrated");
};

const transformationsExample = () => {
  console.log("=== Transformations ===");

  const DateFromStringSchema = Schema.transform(
    Schema.String,
    Schema.Date,
    {
      decode: (s: string) => new Date(s),
      encode: (d: Date) => d.toISOString(),
    }
  );

  const parseDateFromString = Schema.decodeUnknownSync(DateFromStringSchema);
  const encodeDateToString = Schema.encodeSync(DateFromStringSchema);

  const date = parseDateFromString("2024-01-15T10:30:00Z");
  date; //?
  date instanceof Date; //?

  const dateString = encodeDateToString(new Date("2024-01-15T10:30:00Z"));
  dateString; //?

  const TemperatureSchema = Schema.transform(
    Schema.Struct({
      value: Schema.Number,
      unit: Schema.Literal("C", "F"),
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
  );

  const parseTemp = Schema.decodeUnknownSync(TemperatureSchema);
  parseTemp({ value: 32, unit: "F" }); //?
  parseTemp({ value: 0, unit: "C" }); //?

  const BooleanFromString = Schema.transform(
    Schema.Literal("on", "off"),
    Schema.Boolean,
    {
      strict: true,
      decode: (literal: "on" | "off") => literal === "on",
      encode: (bool: boolean) => (bool ? "on" : "off"),
    }
  );

  type EncodedType = (typeof BooleanFromString)["Encoded"];
  type DecodedType = (typeof BooleanFromString)["Type"];

  const encoded: EncodedType = "on";
  encoded; //?

  const decoded: DecodedType = true;
  decoded; //?

  Schema.decodeUnknownSync(BooleanFromString)("on"); //?
  Schema.decodeUnknownSync(BooleanFromString)("off"); //?
  Schema.encodeSync(BooleanFromString)(true); //?
  Schema.encodeSync(BooleanFromString)(false); //?

  const BooleanFromStringWithFail = Schema.transformOrFail(
    Schema.Literal("happy", "sad"),
    Schema.Boolean,
    {
      strict: true,
      decode: (input: "happy" | "sad", _options, ast) => {
        if (input === "happy") return Effect.succeed(true);
        if (input === "sad") return Effect.succeed(false);
        return Effect.fail(new Schema.Type(ast, input));
      },
      encode: (toI: boolean, _options, _ast) =>
        Effect.succeed(toI ? ("happy" as const) : ("sad" as const)),
    }
  );

  type EncodedType2 = (typeof BooleanFromStringWithFail)["Encoded"];
  type DecodedType2 = (typeof BooleanFromStringWithFail)["Type"];

  const encoded2: EncodedType2 = "happy";
  encoded2; //?

  const decoded2: DecodedType2 = true;
  decoded2; //?

  Exit.isSuccess(Schema.decodeUnknownExit(BooleanFromStringWithFail)("happy")); //?
  Exit.isSuccess(Schema.decodeUnknownExit(BooleanFromStringWithFail)("sad")); //?
  Exit.getOrThrow(Schema.decodeUnknownExit(BooleanFromStringWithFail)("happy")); //?
  Exit.getOrThrow(Schema.decodeUnknownExit(BooleanFromStringWithFail)("sad")); //?

  console.log("✓ Schema.transform and transformOrFail demonstrated");
};

const unionTypesExample = () => {
  console.log("=== Union Types ===");

  const StatusSchema = Schema.Union([
    Schema.Literal("pending"),
    Schema.Literal("approved"),
    Schema.Literal("rejected"),
  ]);

  const positiveNumber = Schema.Number.pipe(Schema.check(Schema.isGreaterThan(0)));

  const ShapeSchema = Schema.Union([
    Schema.Struct({
      kind: Schema.Literal("circle"),
      radius: positiveNumber,
    }),
    Schema.Struct({
      kind: Schema.Literal("rectangle"),
      width: positiveNumber,
      height: positiveNumber,
    }),
    Schema.Struct({
      kind: Schema.Literal("triangle"),
      base: positiveNumber,
      height: positiveNumber,
    }),
  ]);

  type Shape = (typeof ShapeSchema)["Type"];

  const parseStatus = Schema.decodeUnknownSync(StatusSchema);
  const parseShape = Schema.decodeUnknownSync(ShapeSchema);

  parseStatus("approved"); //?
  parseStatus("pending"); //?

  const circle: Shape = {
    kind: "circle",
    radius: 5,
  };

  const rectangle: Shape = {
    kind: "rectangle",
    width: 10,
    height: 8,
  };

  parseShape(circle); //?
  parseShape(rectangle); //?

  try {
    parseShape({
      kind: "triangle",
      base: -4,
      height: 8,
    });
  } catch (e) {
    console.log("✓ Invalid shape with negative dimension rejected");
  }

  try {
    parseStatus("unknown");
  } catch (e) {
    console.log("✓ Invalid status literal rejected");
  }

  console.log("✓ Schema.Union with discriminated unions demonstrated");
};

const errorHandlingExample = async () => {
  console.log("=== Error Handling with Effect ===");

  const PersonSchema = Schema.Struct({
    name: Schema.String,
    age: Schema.Number.pipe(
      Schema.check(Schema.isInt()),
      Schema.check(Schema.isBetween({ minimum: 0, maximum: 150 }))
    ),
    email: Schema.String.pipe(
      Schema.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
    ),
  });

  const validatePerson = (input: unknown) =>
    Schema.decodeUnknown(PersonSchema)(input);

  const validResult = await Effect.runPromise(
    validatePerson({
      name: "Alice",
      age: 30,
      email: "alice@example.com",
    })
  );

  validResult; //?

  const invalidResult = await Effect.runPromiseExit(
    validatePerson({
      name: "Bob",
      age: 200,
      email: "not-an-email",
    })
  );

  if (Exit.isFailure(invalidResult)) {
    console.log("✓ Validation errors captured:", invalidResult.cause._tag);
  }

  const anotherValidResult = await Effect.runPromise(
    validatePerson({
      name: "Charlie",
      age: 25,
      email: "charlie@test.org",
    })
  );

  anotherValidResult; //?

  console.log("✓ Schema.decodeUnknown with Effect demonstrated");
};

const externalDataExample = () => {
  console.log("=== Parsing External Data ===");

  const ApiResponseSchema = Schema.Struct({
    data: Schema.Array(
      Schema.Struct({
        id: Schema.Number,
        title: Schema.String,
        published_at: Schema.String,
        author: Schema.Struct({
          name: Schema.String,
          email: Schema.String,
        }),
        tags: Schema.Array(Schema.String),
        view_count: Schema.Number,
      })
    ),
    meta: Schema.Struct({
      total: Schema.Number,
      page: Schema.Number,
      per_page: Schema.Number,
    }),
  });

  type ApiResponse = (typeof ApiResponseSchema)["Type"];

  const ProcessedResponseSchema = Schema.transform(
    ApiResponseSchema,
    Schema.Struct({
      articles: Schema.Array(
        Schema.Struct({
          id: Schema.Number,
          title: Schema.String,
          publishedAt: Schema.Date,
          author: Schema.Struct({
            name: Schema.String,
            email: Schema.String,
          }),
          tags: Schema.Array(Schema.String),
          viewCount: Schema.Number,
        })
      ),
      pagination: Schema.Struct({
        total: Schema.Number,
        page: Schema.Number,
        perPage: Schema.Number,
      }),
    }),
    {
      decode: (raw: ApiResponse) => ({
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
      encode: (processed) => ({
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
  );

  type ProcessedResponse = (typeof ProcessedResponseSchema)["Type"];

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
  };

  const parseResponse = Schema.decodeUnknownSync(ProcessedResponseSchema);
  const processedData: ProcessedResponse = parseResponse(apiResponse);

  processedData; //?
  processedData.articles[0].publishedAt instanceof Date; //?
  processedData.pagination.perPage; //?

  console.log("✓ Complex schema transformation demonstrated");
};

const compositionExample = () => {
  console.log("=== Schema Composition ===");

  const TimestampSchema = Schema.Struct({
    createdAt: Schema.Date,
    updatedAt: Schema.Date,
  });

  const AuditSchema = Schema.Struct({
    createdBy: Schema.String,
    updatedBy: Schema.String,
  });

  const BaseEntitySchema = Schema.Struct({
    ...TimestampSchema.fields,
    ...AuditSchema.fields,
  });

  const UserEntitySchema = Schema.Struct({
    ...BaseEntitySchema.fields,
    id: Schema.Number,
    name: Schema.String,
    email: Schema.String,
    role: Schema.Union([
      Schema.Literal("admin"),
      Schema.Literal("user"),
      Schema.Literal("guest"),
    ]),
  });

  type UserEntity = (typeof UserEntitySchema)["Type"];

  const user: UserEntity = {
    id: 1,
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "system",
    updatedBy: "system",
  };

  user; //?

  const parseUserEntity = Schema.decodeUnknownSync(UserEntitySchema);
  parseUserEntity(user); //?

  const ProductEntitySchema = Schema.Struct({
    ...BaseEntitySchema.fields,
    id: Schema.Number,
    name: Schema.String,
    price: Schema.Number,
  });

  type ProductEntity = (typeof ProductEntitySchema)["Type"];

  const product: ProductEntity = {
    id: 101,
    name: "Widget",
    price: 29.99,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "admin",
    updatedBy: "admin",
  };

  product; //?

  console.log("✓ Schema composition with spread demonstrated");
};

const runAll = async () => {
  try {
    parsingSchemasToOptionalBrandedTypes();
    basicSchemasExample();
    formattingEmail();
    objectSchemasExample();
    optionalFieldsExample();
    arrayRecordExample();
    brandedTypesExample();
    transformationsExample();
    unionTypesExample();
    await errorHandlingExample();
    externalDataExample();
    compositionExample();
    console.log("\n✅ All Schema examples completed!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
};

runAll();
