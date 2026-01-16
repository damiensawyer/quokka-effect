# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Effect-TS learning and playground repository. It contains TypeScript examples demonstrating various Effect library concepts. The examples are designed to be run with Quokka.js for interactive development.

## Commands

```bash
# Build the project
pnpm run build

# Type-check without emitting
pnpm run check
```

## Project Structure

- `effectts/` - Main directory containing Effect-TS learning examples
  - `Services and Layers/` - Examples for service patterns and layer composition
  - `OIDC/` - OIDC client credentials examples with Effect
- `.vscode/tasks.json` - VS Code build tasks for TypeScript compilation

## Key Patterns

The codebase uses Effect-TS patterns including:
- `Data.TaggedError` for typed error classes
- `Context.Tag` for service definitions with `Context.Tag.Service<T>` for type extraction
- `Effect.gen` generator syntax for composing effects
- `Effect.provideService` for dependency injection
- `pipe` for functional composition

## Running Examples

Examples are meant to be run with Quokka.js (VS Code extension). Many files use `// @ts-nocheck` at the top and include `//?` comments for Quokka inline output.


## Docs
This is demos for Effect TS. The docs for LLMs are https://effect.website/docs#docs-for-llms
