# Effect-TS Refresher

This file provides a brief refresher on the core concepts of Effect-TS, based on your learning samples.

## Core Concepts

### Effect
The `Effect<A, E, R>` data type is the heart of Effect-TS. It's a lazy, immutable value that describes a computation. An `Effect` can model synchronous, asynchronous, and resourceful operations. It can succeed with a value of type `A`, fail with an error of type `E`, and requires a context of type `R` (dependencies) to run. Effects are composed together to build complex programs.

### Option & Either
`Option<A>` is a data type that represents an optional value: it can be `Some<A>` (containing a value) or `None` (representing the absence of a value). It's used to handle nullable or potentially missing values in a safe and explicit way. `Either<E, A>` represents a value that can be one of two types, typically a `Left<E>` for failure cases and a `Right<A>` for success cases, allowing for explicit error handling channels.

### Schema
The `Schema` module is used for data validation, encoding, and decoding. You can define a schema for a data structure, and then use it to parse and validate raw data (e.g., from an API response) into a typed model. Schemas can also be used to transform data and generate codecs for various formats.

### Services & Tags
Services are the mechanism for dependency injection in Effect-TS. A service is typically defined as an interface, and a `Context.Tag` is used to create a unique identifier for that service within the Effect context. This allows different parts of your application to depend on abstract interfaces, which can be swapped with different implementations.

### Layers
A `Layer<R_out, E, R_in>` describes how to build and provide the dependencies (`R_out`) that an `Effect` needs. It can be thought of as a recipe for constructing services. Layers can be composed together, allowing you to build up the dependency graph for your application in a modular and testable way. Layers can also manage the lifecycle of services, including acquiring and releasing resources.

### Scope
A `Scope` represents the lifetime of a resource. It's used for resource management, ensuring that resources like file handles, database connections, or network sockets are safely acquired and released, even in the presence of errors or interruptions. The `Effect.acquireRelease` constructor is a common way to create a scoped resource.

### Branded Types
Branded types allow you to create nominal types from primitive types like `string` or `number`. This helps prevent accidental misuse of values that have the same underlying type but different semantic meanings (e.g., a `UserId` vs. a `ProductId`, both of which might be numbers). It adds a layer of type safety to your domain model.

### Logging
Effect-TS comes with a built-in, context-aware logging system. You can log messages at different levels (`info`, `debug`, `error`, etc.) and annotate logs with structured data. The logging system is integrated with the Effect context, so you can add contextual information (like a `requestId`) that will be automatically included in all log messages within that context.

### Data
The `Data` module provides utilities for creating immutable data structures with structural equality. Using `Data.case` or `Data.struct`, you can create objects and classes that are compared by their value rather than by their reference. This is particularly useful in functional programming, where you often compare data structures to check for changes in state.
