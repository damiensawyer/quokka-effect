"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const effect_1 = require("effect");
// Error types
class HttpError extends effect_1.Data.TaggedError("HttpError") {
}
class ParseError extends effect_1.Data.TaggedError("ParseError") {
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const superBasicExample = async () => {
    const getToken = (config) => effect_1.Effect.gen(function* () {
        const response = yield* effect_1.Effect.tryPromise({
            try: () => fetch(config.tokenEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                    scope: config.scope
                })
            }),
            catch: (error) => new HttpError({ status: 0, statusText: String(error) })
        });
        if (!response.ok) {
            return yield* effect_1.Effect.fail(new HttpError({
                status: response.status,
                statusText: response.statusText
            }));
        }
        return yield* effect_1.Effect.tryPromise({
            try: () => response.json(),
            catch: () => new ParseError({ message: "Invalid JSON response" })
        });
    });
    // Usage with error handling
    const tokenProgram = (0, effect_1.pipe)(getToken({
        tokenEndpoint: 'https://localhost:4000/auth/connect/token',
        clientId: 'ssr_backend',
        clientSecret: 'local_dev_ssr_secret',
        scope: 'api'
    }), effect_1.Effect.catchTag("HttpError", error => {
        console.error(`HTTP Error: ${error.status} ${error.statusText}`);
        return effect_1.Effect.fail(error);
    }), effect_1.Effect.catchTag("ParseError", error => {
        console.error(`Parse Error: ${error.message}`);
        return effect_1.Effect.fail(error);
    }));
    // Run it
    effect_1.Effect.runPromise(tokenProgram)
        .then(token => console.log("Token:", token))
        .catch(error => console.error("Failed:", error));
};
const runExamples = async () => {
    await superBasicExample();
};
runExamples();
//# sourceMappingURL=oidc2%20effect.js.map