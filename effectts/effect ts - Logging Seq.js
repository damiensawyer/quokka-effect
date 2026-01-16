"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeqLoggerLayer = void 0;
const effect_1 = require("effect");
const platform_1 = require("@effect/platform");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const toSeqLevel = (level) => {
    switch (level._tag) {
        case "Fatal": return "Fatal";
        case "Error": return "Error";
        case "Warning": return "Warning";
        case "Info": return "Information";
        case "Debug": return "Debug";
        case "Trace": return "Verbose";
        default: return "Information";
    }
};
const makeSeqLogger = (config) => effect_1.Logger.make(({ annotations, cause, context, fiberId, logLevel, message, spans, date }) => {
    const event = {
        "@t": date.toISOString(),
        "@mt": String(message), // Ensure message is string
        "@l": toSeqLevel(logLevel),
        fiberId: fiberId.toString(),
        ...effect_1.HashMap.reduce(annotations, {}, (acc, value, key) => ({
            ...acc,
            [key]: value
        })),
        ...(cause._tag !== "Empty" && { cause: effect_1.Cause.pretty(cause) }),
        ...(effect_1.List.size(spans) > 0 && {
            spans: effect_1.List.toArray(spans).map(span => ({
                name: span.label,
                duration: Date.now() - span.startTime
            }))
        })
    };
    const sendToSeq = effect_1.Effect.gen(function* () {
        const client = yield* platform_1.HttpClient.HttpClient;
        const eventString = JSON.stringify(event);
        const body = platform_1.HttpBody.text(eventString);
        const url = `${config.url}/ingest/clef`;
        yield* client.post(url, {
            body,
            headers: {
                'Content-Type': 'application/vnd.serilog.clef',
                ...(config.apiKey && { "X-Seq-ApiKey": config.apiKey })
            }
        });
    }).pipe(effect_1.Effect.provide(platform_1.FetchHttpClient.layer), effect_1.Effect.catchAll(() => effect_1.Effect.void));
    effect_1.Effect.runPromise(sendToSeq).catch(() => { });
});
const SeqLoggerLayer = (config) => effect_1.Layer.merge(effect_1.Logger.replace(effect_1.Logger.defaultLogger, makeSeqLogger(config)), effect_1.Logger.minimumLogLevel(effect_1.LogLevel.All));
exports.SeqLoggerLayer = SeqLoggerLayer;
const program = effect_1.Effect.gen(function* () {
    yield* effect_1.Effect.log("Application started");
    yield* effect_1.Effect.logDebug("Debug information");
    yield* effect_1.Effect.log("User action").pipe(effect_1.Effect.annotateLogs({
        userId: "user-123",
        action: "login",
        ip: "192.168.1.1"
    }));
    for (let index = 0; index < 10; index++) {
        var s = `jimmy Was hairy ${index}`;
        yield* effect_1.Effect.log(s);
    }
    yield* effect_1.Effect.log("Application completed 123");
});
effect_1.Effect.runFork(program.pipe(effect_1.Effect.provide((0, exports.SeqLoggerLayer)({
    url: "https://localhost:4000/seq"
}))));
//# sourceMappingURL=effect%20ts%20-%20Logging%20Seq.js.map