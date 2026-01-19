// Look at https://effect.website/docs/schema/introduction/
// and the abiltity to generate Standards Schema https://standardschema.dev/

// Effect Schema Demo - Comprehensive Examples
// Based on https://effect.website/docs/schema/introduction/

import {
	Brand,
	Effect,
	Either,
	Option,
	ParseResult,
	pipe,
	Schema,
} from "effect";
import type { ParseError } from "effect/ParseResult";
import { runSync } from "effect/Runtime";

const assert = (condition: boolean, message?: string) => {
	if (!condition) {
		throw new Error(`Assertion failed: ${message}`);
	}
	if (!!message) console.log(`✓ ${message}`);
};

const parsingSchemasToOptionalBrandedTypes = () => {
	const parseWithSchema = <A, I>(
		schema: Schema.Schema<A, I>,
		value: I | null | undefined,
	): Option.Option<A> =>
		value == null
			? Option.none()
			: Either.getRight(Schema.decodeUnknownEither(schema)(value));

	type UserId = number & Brand.Brand<"UserId">;
	const UserId = Brand.nominal<UserId>();
	const MyUserIdSchema = Schema.Number.pipe(Schema.fromBrand(UserId));
	Option.isNone(parseWithSchema(MyUserIdSchema, undefined)); //?
	Option.isNone(parseWithSchema(MyUserIdSchema, null)); //?
	Option.isNone(parseWithSchema(MyUserIdSchema, 123)); //?
	Option.isNone(parseWithSchema(MyUserIdSchema, 0)); //?
};

// === BASIC SCHEMAS ===
const basicSchemasExample = () => {
	console.log("=== Basic Schemas ===");

	// Primitive schemas
	const StringSchema = Schema.String;
	const NumberSchema = Schema.Number;

	// Test decoding (parsing from unknown)
	const decodeString = Schema.decodeUnknownSync(StringSchema);
	const decodeNumber = Schema.decodeUnknownSync(NumberSchema);

	decodeString("hello"); //?
	decodeNumber(42); //?

	try {
		decodeString(123); // Should throw
	} catch (e: unknown) {
		if (ParseResult.isParseError(e)) {
			console.log("✓ String parsing failed correctly:", e.message);
		}
	}

	// Test encoding (back to wire format)
	const encodeString = Schema.encodeSync(StringSchema);
	encodeString("hello"); //?
};

const formattingEmail = () => {
	const UserSchema = Schema.Struct({
		id: Schema.Number,
		name: Schema.String.pipe(Schema.minLength(2), Schema.maxLength(50)),
		email: Schema.String.pipe(
			Schema.filter((s) => {
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				return emailRegex.test(s) || "Invalid email format";
			}),
		),
		age: Schema.Number.pipe(Schema.between(18, 120)),
	});

	interface User extends Schema.Schema.Type<typeof UserSchema> {}

	const parseUser = Schema.decodeUnknownSync(UserSchema);
	// Valid user
	const validUser: User = {
		id: 1,
		name: "John Doe",
		email: "john@example.com",
		age: 42,
	};

    const invalidUser:User = {
			id: 1,
			name: "John Doe",
			email: "bademail",
			age: 40,
		}

	validUser; //?
	invalidUser; //?
	const userIsValid = Schema.is(UserSchema);
	userIsValid(validUser); //?
    userIsValid(invalidUser); //?

	// Invalid user
	try {
		parseUser(invalidUser);
	} catch (e) {
		console.log("✓ User parsing failed correctly");
	}
};

// === OBJECT SCHEMAS ===
const objectSchemasExample = () => {
	console.log("=== Object Schemas ===");

	// Define user schema
	const UserSchema = Schema.Struct({
		id: Schema.Number,
		name: Schema.String,
		email: Schema.String,
		isActive: Schema.Boolean,
	});

	// Infer TypeScript type from schema
	type User = Schema.Schema.Type<typeof UserSchema>;

	// or... see this, which is apparently 'more peformant' https://effect.website/docs/schema/getting-started/#extracting-inferred-types
	interface UserMorePerformant extends Schema.Schema.Type<typeof UserSchema> {}
	const s: UserMorePerformant = {
		email: "",
		id: 2,
		name: "bill",
		isActive: false,
	};

	const parseUser = Schema.decodeUnknownSync(UserSchema);

	// Valid user
	const validUser: User = parseUser({
		id: 1,
		name: "John Doe",
		email: "john@example.com",
		isActive: true,
	});

	validUser; //?

	// Invalid user
	try {
		parseUser({
			id: "not-a-number",
			name: "John",
			email: "john@example.com",
			// missing isActive
		});
	} catch (e) {
		console.log("✓ User parsing failed correctly");
	}
};

// === OPTIONAL AND NULLABLE FIELDS ===
const optionalFieldsExample = () => {
	console.log("=== Optional and Nullable Fields ===");

	const ProductSchema = Schema.Struct({
		id: Schema.Number,
		name: Schema.String,
		description: Schema.optional(Schema.String), // Optional field
		price: Schema.NullOr(Schema.Number), // Can be null
		tags: Schema.Array(Schema.String).pipe(
			// Schema.propertySignature,
			// Schema.withConstructorDefault(() => [])
		),
	});

	type Product = Schema.Schema.Type<typeof ProductSchema>;

	const parseProduct = Schema.decodeUnknownSync(ProductSchema);

	// Product with minimal fields
	const product1: Product = parseProduct({
		id: 1,

		name: "Widget",
		price: null,
		tags: [],
	});

	product1; //?
	assert(product1!.tags.length === 0, "Default empty array applied");

	// Product with all fields
	const product2: Product = parseProduct({
		id: 2,
		name: "Gadget",
		description: "A useful gadget",
		price: 29.99,
		tags: ["electronics", "gadget"],
	});

	product2; //?
};

// === ARRAY AND RECORD SCHEMAS ===
const arrayRecordExample = () => {
	console.log("=== Arrays and Records ===");

	// Array schema
	const NumberArraySchema = Schema.Array(Schema.Number);
	const parseNumberArray = Schema.decodeUnknownSync(NumberArraySchema);

	parseNumberArray([1, 2, 3, 4]); //?

	// Record schema (like { [key: string]: number })
	const ScoresSchema = Schema.Record({
		key: Schema.String,
		value: Schema.Number,
	});
	const parseScores = Schema.decodeUnknownSync(ScoresSchema);

	const scores = parseScores({
		alice: 95,
		bob: 87,
		charlie: 92,
	});

	scores; //?
	type Scores = Schema.Schema.Type<typeof ScoresSchema>;
};

// === BRANDED TYPES ===
const brandedTypesExample = () => {
	console.log("=== Branded Types ===");

	// Create branded types for type safety
	const UserIdSchema = pipe(
		Schema.Number,
		Schema.int(), // Must be integer
		Schema.positive(), // Must be positive
		Schema.brand("UserId"),
	);

	const EmailSchema = pipe(
		Schema.String,
		Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/), // Email regex
		Schema.brand("Email"),
	);

	type UserId = Schema.Schema.Type<typeof UserIdSchema>;
	type Email = Schema.Schema.Type<typeof EmailSchema>;

	const parseUserId = Schema.decodeUnknownSync(UserIdSchema);
	const parseEmail = Schema.decodeUnknownSync(EmailSchema);

	const userId = parseUserId(123);
	const email = parseEmail("user@example.com");

	userId; //?
	email; //?

	try {
		parseUserId(-5); // Should fail (not positive)
	} catch (e) {
		console.log("✓ Negative UserId rejected");
	}

	try {
		parseEmail("invalid-email"); // Should fail (bad format)
	} catch (e) {
		console.log("✓ Invalid email rejected");
	}
};

// === TRANSFORMATIONS ===
const transformationsExample = () => {
	console.log("=== Transformations ===");

	// Transform string to Date
	const DateFromStringSchema = Schema.transform(
		Schema.String,
		Schema.DateFromSelf,
		{
			decode: (s) => new Date(s),
			encode: (d) => d.toISOString(),
		},
	);

	const parseDateFromString = Schema.decodeUnknownSync(DateFromStringSchema);
	const encodeDateToString = Schema.encodeSync(DateFromStringSchema);

	const date = parseDateFromString("2024-01-15T10:30:00Z");
	date; //?

	const dateString = encodeDateToString(new Date("2024-01-15T10:30:00Z"));
	dateString; //?

	// Transform between different representations
	const TemperatureSchema = Schema.transform(
		Schema.Struct({
			value: Schema.Number,
			unit: Schema.Literal("C", "F"),
		}),
		Schema.Struct({
			celsius: Schema.Number,
		}),
		{
			decode: ({ value, unit }) => ({
				celsius: unit === "C" ? value : ((value - 32) * 5) / 9,
			}),
			encode: ({ celsius }) => ({
				value: celsius,
				unit: "C" as const,
			}),
		},
	);

	const parseTemp = Schema.decodeUnknownSync(TemperatureSchema);

	parseTemp({ value: 32, unit: "F" }); //?
	parseTemp({ value: 0, unit: "C" }); //?
};

// === UNION TYPES (DISCRIMINATED UNIONS) ===
const unionTypesExample = () => {
	console.log("=== Union Types ===");

	// Simple union
	const StatusSchema = Schema.Union(
		Schema.Literal("pending"),
		Schema.Literal("approved"),
		Schema.Literal("rejected"),
	);

	// Discriminated union
	const ShapeSchema = Schema.Union(
		Schema.Struct({
			kind: Schema.Literal("circle"),
			radius: Schema.Number,
		}),
		Schema.Struct({
			kind: Schema.Literal("rectangle"),
			width: Schema.Number,
			height: Schema.Number,
		}),
		Schema.Struct({
			kind: Schema.Literal("triangle"),
			base: Schema.Number,
			height: Schema.Number,
		}),
	);

	type Shape = Schema.Schema.Type<typeof ShapeSchema>;

	const parseStatus = Schema.decodeUnknownSync(StatusSchema);
	const parseShape = Schema.decodeUnknownSync(ShapeSchema);

	parseStatus("approved"); //?

	const circle: Shape = parseShape({
		kind: "circle",
		radius: 5,
	});

	const rectangle: Shape = parseShape({
		kind: "rectangle",
		width: 10,
		height: 8,
	});

	circle; //?
	rectangle; //?
};

// === ERROR HANDLING WITH EFFECT ===
const errorHandlingExample = async () => {
	console.log("=== Error Handling with Effect ===");

	const PersonSchema = Schema.Struct({
		name: Schema.String,
		age: pipe(Schema.Number, Schema.int(), Schema.between(0, 150)),
		email: pipe(Schema.String, Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
	});

	// Using Effect for error handling
	const validatePerson = (input: unknown) =>
		Schema.decodeUnknown(PersonSchema)(input);

	// Valid person
	const validResult = await Effect.runPromise(
		validatePerson({
			name: "Alice",
			age: 30,
			email: "alice@example.com",
		}),
	);

	validResult; //?

	// Invalid person with detailed error handling
	const invalidResult = await Effect.runPromiseExit(
		validatePerson({
			name: "Bob",
			age: 200, // Invalid age
			email: "not-an-email", // Invalid email
		}),
	);

	if (invalidResult._tag === "Failure") {
		console.log("Validation errors:", invalidResult.cause);
	}
};

// === PARSING EXTERNAL DATA ===
const externalDataExample = () => {
	console.log("=== Parsing External Data ===");

	// API response schema
	const ApiResponseSchema = Schema.Struct({
		data: Schema.Array(
			Schema.Struct({
				id: Schema.Number,
				title: Schema.String,
				published_at: Schema.String, // Will transform to Date
				author: Schema.Struct({
					name: Schema.String,
					email: Schema.String,
				}),
				tags: Schema.Array(Schema.String),
				view_count: Schema.Number,
			}),
		),
		meta: Schema.Struct({
			total: Schema.Number,
			page: Schema.Number,
			per_page: Schema.Number,
		}),
	});

	// Transform the schema to have proper Date objects
	const ProcessedResponseSchema = Schema.transform(
		ApiResponseSchema,
		Schema.Struct({
			articles: Schema.Array(
				Schema.Struct({
					id: Schema.Number,
					title: Schema.String,
					publishedAt: Schema.DateFromSelf,
					author: Schema.Struct({
						name: Schema.String,
						email: Schema.String,
					}),
					tags: Schema.Array(Schema.String),
					viewCount: Schema.Number,
				}),
			),
			pagination: Schema.Struct({
				total: Schema.Number,
				page: Schema.Number,
				perPage: Schema.Number,
			}),
		}),
		{
			decode: (raw) => ({
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
		},
	);

	// Mock API response
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
	const processedData = parseResponse(apiResponse);

	processedData; //?
	processedData.articles[0].publishedAt instanceof Date; //?
};

// === COMPOSITION AND REUSABILITY ===
const compositionExample = () => {
	console.log("=== Schema Composition ===");

	// Base schemas
	const TimestampSchema = Schema.Struct({
		createdAt: Schema.DateFromSelf,
		updatedAt: Schema.DateFromSelf,
	});

	const AuditSchema = Schema.Struct({
		createdBy: Schema.String,
		updatedBy: Schema.String,
	});

	// Compose schemas
	const BaseEntitySchema = Schema.extend(TimestampSchema, AuditSchema);

	// Extend for specific entities
	const UserEntitySchema = Schema.extend(
		BaseEntitySchema,
		Schema.Struct({
			id: Schema.Number,
			name: Schema.String,
			email: Schema.String,
			role: Schema.Union(
				Schema.Literal("admin"),
				Schema.Literal("user"),
				Schema.Literal("guest"),
			),
		}),
	);

	type UserEntity = Schema.Schema.Type<typeof UserEntitySchema>;

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
};

// === RUN ALL EXAMPLES ===
const runAll = async () => {
	try {
		parsingSchemasToOptionalBrandedTypes(),
			//basicSchemasExample();
			// objectSchemasExample();
			formattingEmail();
		// optionalFieldsExample();
		// arrayRecordExample();
		// brandedTypesExample();
		// transformationsExample();
		// unionTypesExample();
		// await errorHandlingExample();
		// externalDataExample();
		// compositionExample();

		console.log("\n✅ All Schema examples completed!");
	} catch (error) {
		console.error("❌ Error:", error);
	}
};

runAll();
