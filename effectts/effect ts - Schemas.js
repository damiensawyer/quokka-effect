"use strict";
// Look at https://effect.website/docs/schema/introduction/
// and the abiltity to generate Standards Schema https://standardschema.dev/
Object.defineProperty(exports, "__esModule", { value: true });
// Effect Schema Demo - Comprehensive Examples
// Based on https://effect.website/docs/schema/introduction/
const effect_1 = require("effect");
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    if (!!message)
        console.log(`✓ ${message}`);
};
const parsingSchemasToOptionalBrandedTypes = () => {
    const parseWithSchema = (schema, value) => value == null ? effect_1.Option.none() :
        effect_1.Either.getRight(effect_1.Schema.decodeUnknownEither(schema)(value));
    const UserId = effect_1.Brand.nominal();
    const MyUserIdSchema = effect_1.Schema.Number.pipe(effect_1.Schema.fromBrand(UserId));
    effect_1.Option.isNone(parseWithSchema(MyUserIdSchema, undefined)); //?
    effect_1.Option.isNone(parseWithSchema(MyUserIdSchema, null)); //?
    effect_1.Option.isNone(parseWithSchema(MyUserIdSchema, 123)); //?
    effect_1.Option.isNone(parseWithSchema(MyUserIdSchema, 0)); //?
};
// === BASIC SCHEMAS ===
const basicSchemasExample = () => {
    console.log("=== Basic Schemas ===");
    // Primitive schemas
    const StringSchema = effect_1.Schema.String;
    const NumberSchema = effect_1.Schema.Number;
    const BooleanSchema = effect_1.Schema.Boolean;
    // Test decoding (parsing from unknown)
    const parseString = effect_1.Schema.decodeUnknownSync(StringSchema);
    const parseNumber = effect_1.Schema.decodeUnknownSync(NumberSchema);
    parseString("hello"); //?
    parseNumber(42); //?
    try {
        parseString(123); // Should throw
    }
    catch (e) {
        if (effect_1.ParseResult.isParseError(e)) {
            console.log("✓ String parsing failed correctly:", e.message);
        }
    }
    // Test encoding (back to wire format)
    const encodeString = effect_1.Schema.encodeSync(StringSchema);
    encodeString("hello"); //?
};
const formattingEmail = () => {
    const UserSchema = effect_1.Schema.Struct({
        id: effect_1.Schema.Number,
        name: effect_1.Schema.String.pipe(effect_1.Schema.minLength(2), effect_1.Schema.maxLength(50)),
        email: effect_1.Schema.String.pipe(effect_1.Schema.filter((s) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(s) || "Invalid email format";
        })),
        age: effect_1.Schema.Number.pipe(effect_1.Schema.between(18, 120))
    });
    const parseUser = effect_1.Schema.decodeUnknownSync(UserSchema);
    // Valid user
    const validUser = parseUser({
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        age: 40
    });
    //validUser; //?
    // Invalid user
    try {
        parseUser({
            id: 1,
            name: "John Doe",
            email: "john@@example.com",
            age: 40
        });
    }
    catch (e) {
        console.log("✓ User parsing failed correctly");
    }
};
// === OBJECT SCHEMAS ===
const objectSchemasExample = () => {
    console.log("=== Object Schemas ===");
    // Define user schema
    const UserSchema = effect_1.Schema.Struct({
        id: effect_1.Schema.Number,
        name: effect_1.Schema.String,
        email: effect_1.Schema.String,
        isActive: effect_1.Schema.Boolean
    });
    const s = { email: '', id: 2, name: 'bill', isActive: false };
    const parseUser = effect_1.Schema.decodeUnknownSync(UserSchema);
    // Valid user
    const validUser = parseUser({
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        isActive: true
    });
    validUser; //?
    // Invalid user
    try {
        parseUser({
            id: "not-a-number",
            name: "John",
            email: "john@example.com"
            // missing isActive
        });
    }
    catch (e) {
        console.log("✓ User parsing failed correctly");
    }
};
// === OPTIONAL AND NULLABLE FIELDS ===
const optionalFieldsExample = () => {
    console.log("=== Optional and Nullable Fields ===");
    const ProductSchema = effect_1.Schema.Struct({
        id: effect_1.Schema.Number,
        name: effect_1.Schema.String,
        description: effect_1.Schema.optional(effect_1.Schema.String), // Optional field
        price: effect_1.Schema.NullOr(effect_1.Schema.Number), // Can be null
        tags: effect_1.Schema.Array(effect_1.Schema.String).pipe(effect_1.Schema.propertySignature, effect_1.Schema.withConstructorDefault(() => []))
    });
    const parseProduct = effect_1.Schema.decodeUnknownSync(ProductSchema);
    // Product with minimal fields
    const product1 = parseProduct({
        id: 1,
        name: "Widget",
        price: null
    });
    product1; //?
    assert(product1.tags.length === 0, "Default empty array applied");
    // Product with all fields
    const product2 = parseProduct({
        id: 2,
        name: "Gadget",
        description: "A useful gadget",
        price: 29.99,
        tags: ["electronics", "gadget"]
    });
    product2; //?
};
// === ARRAY AND RECORD SCHEMAS ===
const arrayRecordExample = () => {
    console.log("=== Arrays and Records ===");
    // Array schema
    const NumberArraySchema = effect_1.Schema.Array(effect_1.Schema.Number);
    const parseNumberArray = effect_1.Schema.decodeUnknownSync(NumberArraySchema);
    parseNumberArray([1, 2, 3, 4]); //?
    // Record schema (like { [key: string]: number })
    const ScoresSchema = effect_1.Schema.Record({ key: effect_1.Schema.String, value: effect_1.Schema.Number });
    const parseScores = effect_1.Schema.decodeUnknownSync(ScoresSchema);
    const scores = parseScores({
        alice: 95,
        bob: 87,
        charlie: 92
    });
    scores; //?
};
// === BRANDED TYPES ===
const brandedTypesExample = () => {
    console.log("=== Branded Types ===");
    // Create branded types for type safety
    const UserIdSchema = (0, effect_1.pipe)(effect_1.Schema.Number, effect_1.Schema.int(), // Must be integer
    effect_1.Schema.positive(), // Must be positive
    effect_1.Schema.brand("UserId"));
    const EmailSchema = (0, effect_1.pipe)(effect_1.Schema.String, effect_1.Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/), // Email regex
    effect_1.Schema.brand("Email"));
    const parseUserId = effect_1.Schema.decodeUnknownSync(UserIdSchema);
    const parseEmail = effect_1.Schema.decodeUnknownSync(EmailSchema);
    const userId = parseUserId(123);
    const email = parseEmail("user@example.com");
    userId; //?
    email; //?
    try {
        parseUserId(-5); // Should fail (not positive)
    }
    catch (e) {
        console.log("✓ Negative UserId rejected");
    }
    try {
        parseEmail("invalid-email"); // Should fail (bad format)
    }
    catch (e) {
        console.log("✓ Invalid email rejected");
    }
};
// === TRANSFORMATIONS ===
const transformationsExample = () => {
    console.log("=== Transformations ===");
    // Transform string to Date
    const DateFromStringSchema = effect_1.Schema.transform(effect_1.Schema.String, effect_1.Schema.DateFromSelf, {
        decode: (s) => new Date(s),
        encode: (d) => d.toISOString()
    });
    const parseDateFromString = effect_1.Schema.decodeUnknownSync(DateFromStringSchema);
    const encodeDateToString = effect_1.Schema.encodeSync(DateFromStringSchema);
    const date = parseDateFromString("2024-01-15T10:30:00Z");
    date; //?
    const dateString = encodeDateToString(new Date("2024-01-15T10:30:00Z"));
    dateString; //?
    // Transform between different representations
    const TemperatureSchema = effect_1.Schema.transform(effect_1.Schema.Struct({
        value: effect_1.Schema.Number,
        unit: effect_1.Schema.Literal("C", "F")
    }), effect_1.Schema.Struct({
        celsius: effect_1.Schema.Number
    }), {
        decode: ({ value, unit }) => ({
            celsius: unit === "C" ? value : (value - 32) * 5 / 9
        }),
        encode: ({ celsius }) => ({
            value: celsius,
            unit: "C"
        })
    });
    const parseTemp = effect_1.Schema.decodeUnknownSync(TemperatureSchema);
    parseTemp({ value: 32, unit: "F" }); //?
    parseTemp({ value: 0, unit: "C" }); //?
};
// === UNION TYPES (DISCRIMINATED UNIONS) ===
const unionTypesExample = () => {
    console.log("=== Union Types ===");
    // Simple union
    const StatusSchema = effect_1.Schema.Union(effect_1.Schema.Literal("pending"), effect_1.Schema.Literal("approved"), effect_1.Schema.Literal("rejected"));
    // Discriminated union
    const ShapeSchema = effect_1.Schema.Union(effect_1.Schema.Struct({
        kind: effect_1.Schema.Literal("circle"),
        radius: effect_1.Schema.Number
    }), effect_1.Schema.Struct({
        kind: effect_1.Schema.Literal("rectangle"),
        width: effect_1.Schema.Number,
        height: effect_1.Schema.Number
    }), effect_1.Schema.Struct({
        kind: effect_1.Schema.Literal("triangle"),
        base: effect_1.Schema.Number,
        height: effect_1.Schema.Number
    }));
    const parseStatus = effect_1.Schema.decodeUnknownSync(StatusSchema);
    const parseShape = effect_1.Schema.decodeUnknownSync(ShapeSchema);
    parseStatus("approved"); //?
    const circle = parseShape({
        kind: "circle",
        radius: 5
    });
    const rectangle = parseShape({
        kind: "rectangle",
        width: 10,
        height: 8
    });
    circle; //?
    rectangle; //?
};
// === ERROR HANDLING WITH EFFECT ===
const errorHandlingExample = async () => {
    console.log("=== Error Handling with Effect ===");
    const PersonSchema = effect_1.Schema.Struct({
        name: effect_1.Schema.String,
        age: (0, effect_1.pipe)(effect_1.Schema.Number, effect_1.Schema.int(), effect_1.Schema.between(0, 150)),
        email: (0, effect_1.pipe)(effect_1.Schema.String, effect_1.Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
    });
    // Using Effect for error handling
    const validatePerson = (input) => effect_1.Schema.decodeUnknown(PersonSchema)(input);
    // Valid person
    const validResult = await effect_1.Effect.runPromise(validatePerson({
        name: "Alice",
        age: 30,
        email: "alice@example.com"
    }));
    validResult; //?
    // Invalid person with detailed error handling
    const invalidResult = await effect_1.Effect.runPromiseExit(validatePerson({
        name: "Bob",
        age: 200, // Invalid age
        email: "not-an-email" // Invalid email
    }));
    if (invalidResult._tag === "Failure") {
        console.log("Validation errors:", invalidResult.cause);
    }
};
// === PARSING EXTERNAL DATA ===
const externalDataExample = () => {
    console.log("=== Parsing External Data ===");
    // API response schema
    const ApiResponseSchema = effect_1.Schema.Struct({
        data: effect_1.Schema.Array(effect_1.Schema.Struct({
            id: effect_1.Schema.Number,
            title: effect_1.Schema.String,
            published_at: effect_1.Schema.String, // Will transform to Date
            author: effect_1.Schema.Struct({
                name: effect_1.Schema.String,
                email: effect_1.Schema.String
            }),
            tags: effect_1.Schema.Array(effect_1.Schema.String),
            view_count: effect_1.Schema.Number
        })),
        meta: effect_1.Schema.Struct({
            total: effect_1.Schema.Number,
            page: effect_1.Schema.Number,
            per_page: effect_1.Schema.Number
        })
    });
    // Transform the schema to have proper Date objects
    const ProcessedResponseSchema = effect_1.Schema.transform(ApiResponseSchema, effect_1.Schema.Struct({
        articles: effect_1.Schema.Array(effect_1.Schema.Struct({
            id: effect_1.Schema.Number,
            title: effect_1.Schema.String,
            publishedAt: effect_1.Schema.DateFromSelf,
            author: effect_1.Schema.Struct({
                name: effect_1.Schema.String,
                email: effect_1.Schema.String
            }),
            tags: effect_1.Schema.Array(effect_1.Schema.String),
            viewCount: effect_1.Schema.Number
        })),
        pagination: effect_1.Schema.Struct({
            total: effect_1.Schema.Number,
            page: effect_1.Schema.Number,
            perPage: effect_1.Schema.Number
        })
    }), {
        decode: (raw) => ({
            articles: raw.data.map(article => ({
                id: article.id,
                title: article.title,
                publishedAt: new Date(article.published_at),
                author: article.author,
                tags: article.tags,
                viewCount: article.view_count
            })),
            pagination: {
                total: raw.meta.total,
                page: raw.meta.page,
                perPage: raw.meta.per_page
            }
        }),
        encode: (processed) => ({
            data: processed.articles.map(article => ({
                id: article.id,
                title: article.title,
                published_at: article.publishedAt.toISOString(),
                author: article.author,
                tags: article.tags,
                view_count: article.viewCount
            })),
            meta: {
                total: processed.pagination.total,
                page: processed.pagination.page,
                per_page: processed.pagination.perPage
            }
        })
    });
    // Mock API response
    const apiResponse = {
        data: [
            {
                id: 1,
                title: "Effect TS Tutorial",
                published_at: "2024-01-15T10:30:00Z",
                author: {
                    name: "John Doe",
                    email: "john@example.com"
                },
                tags: ["typescript", "effect", "functional"],
                view_count: 1250
            }
        ],
        meta: {
            total: 1,
            page: 1,
            per_page: 10
        }
    };
    const parseResponse = effect_1.Schema.decodeUnknownSync(ProcessedResponseSchema);
    const processedData = parseResponse(apiResponse);
    processedData; //?
    processedData.articles[0].publishedAt instanceof Date; //?
};
// === COMPOSITION AND REUSABILITY ===
const compositionExample = () => {
    console.log("=== Schema Composition ===");
    // Base schemas
    const TimestampSchema = effect_1.Schema.Struct({
        createdAt: effect_1.Schema.DateFromSelf,
        updatedAt: effect_1.Schema.DateFromSelf
    });
    const AuditSchema = effect_1.Schema.Struct({
        createdBy: effect_1.Schema.String,
        updatedBy: effect_1.Schema.String
    });
    // Compose schemas
    const BaseEntitySchema = effect_1.Schema.extend(TimestampSchema, AuditSchema);
    // Extend for specific entities
    const UserEntitySchema = effect_1.Schema.extend(BaseEntitySchema, effect_1.Schema.Struct({
        id: effect_1.Schema.Number,
        name: effect_1.Schema.String,
        email: effect_1.Schema.String,
        role: effect_1.Schema.Union(effect_1.Schema.Literal("admin"), effect_1.Schema.Literal("user"), effect_1.Schema.Literal("guest"))
    }));
    const user = {
        id: 1,
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "system",
        updatedBy: "system"
    };
    user; //?
};
// === RUN ALL EXAMPLES ===
const runAll = async () => {
    try {
        parsingSchemasToOptionalBrandedTypes(),
            basicSchemasExample();
        objectSchemasExample();
        formattingEmail();
        optionalFieldsExample();
        arrayRecordExample();
        brandedTypesExample();
        transformationsExample();
        unionTypesExample();
        await errorHandlingExample();
        externalDataExample();
        compositionExample();
        console.log("\n✅ All Schema examples completed!");
    }
    catch (error) {
        console.error("❌ Error:", error);
    }
};
runAll();
//# sourceMappingURL=effect%20ts%20-%20Schemas.js.map