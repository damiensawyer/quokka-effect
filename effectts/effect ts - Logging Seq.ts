import { Effect, Logger, LogLevel, Layer, HashMap, List, Cause } from "effect"
import { HttpClient, HttpBody, FetchHttpClient } from "@effect/platform"

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface SeqConfig {
  readonly url: string
  readonly apiKey?: string
}

const toSeqLevel = (level: LogLevel.LogLevel): string => {
  switch (level._tag) {
    case "Fatal": return "Fatal"
    case "Error": return "Error"
    case "Warning": return "Warning"
    case "Info": return "Information"
    case "Debug": return "Debug"
    case "Trace": return "Verbose"
    default: return "Information"
  }
}

const makeSeqLogger = (config: SeqConfig) =>
  Logger.make(({ annotations, cause, context, fiberId, logLevel, message, spans, date }) => {
    const event = {
      "@t": date.toISOString(),
      "@mt": String(message), // Ensure message is string
      "@l": toSeqLevel(logLevel),
      fiberId: fiberId.toString(),
      ...HashMap.reduce(annotations, {} as Record<string, unknown>, (acc, value, key) => ({
        ...acc,
        [key]: value
      })),
      ...(cause._tag !== "Empty" && { cause: Cause.pretty(cause) }),
      ...(List.size(spans) > 0 && {
        spans: List.toArray(spans).map(span => ({
          name: span.label,
          duration: Date.now() - span.startTime
        }))
      })
    }

    const sendToSeq = Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient
      const eventString = JSON.stringify(event);
      const body = HttpBody.text(eventString)
      const url = `${config.url}/ingest/clef`
      yield* client.post(url, {
        body,
        headers: {
          'Content-Type': 'application/vnd.serilog.clef',
          ...(config.apiKey && { "X-Seq-ApiKey": config.apiKey })
        }
      })
    }).pipe(
      Effect.provide(FetchHttpClient.layer)
      //Effect.catchAll(() => Effect.void)
    )

    Effect.runPromise(sendToSeq).catch(() => {})
  })

export const SeqLoggerLayer = (config: SeqConfig) =>
  Layer.merge(
    Logger.replace(Logger.defaultLogger, makeSeqLogger(config)),
    Logger.minimumLogLevel(LogLevel.All)
  )

const program = Effect.gen(function* () {
  yield* Effect.log("Application started")
  yield* Effect.logDebug("Debug information")
  
  yield* Effect.log("User action").pipe(
    Effect.annotateLogs({
      userId: "user-123",
      action: "login",
      ip: "192.168.1.1"
    })
  )
  
  for (let index = 0; index < 10; index++) {
    var s  = `jimmy Was hairy ${index}`
    yield* Effect.log(s)

  }

  yield* Effect.log("Application completed 123")
})

Effect.runFork(program.pipe(
  Effect.provide(SeqLoggerLayer({
    url: "https://localhost:4000/seq"
  }))
))