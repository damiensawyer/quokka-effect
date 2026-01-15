import { Effect, Data, pipe } from "effect";

// Error types
class HttpError extends Data.TaggedError("HttpError")<{
    status: number;
    statusText: string;
}> { }

class ParseError extends Data.TaggedError("ParseError")<{
    message: string;
}> { }

// Token type
type Token = {
    access_token: string;
    token_type: string;
    expires_in: number;
};

type OIDCConfig = {
    tokenEndpoint: string;
    clientId: string;
    clientSecret: string;
    scope: string;
};
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const superBasicExample = async () => {
    const getToken = (config: OIDCConfig) => Effect.gen(function* () {
        const response = yield* Effect.tryPromise({
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
            catch: (error): HttpError => new HttpError({ status: 0, statusText: String(error) })
        });

        if (!response.ok) {
            return yield* Effect.fail(new HttpError({
                status: response.status,
                statusText: response.statusText
            }));
        }

        return yield* Effect.tryPromise({
            try: () => response.json(),
            catch: (): ParseError => new ParseError({ message: "Invalid JSON response" })
        });
    });


    // Usage with error handling
    const tokenProgram = pipe(
        getToken({
            tokenEndpoint: 'https://localhost:4000/auth/connect/token',
            clientId: 'ssr_backend',
            clientSecret: 'local_dev_ssr_secret',
            scope: 'api'
        }),
        Effect.catchTag("HttpError", error => {
            console.error(`HTTP Error: ${error.status} ${error.statusText}`);
            return Effect.fail(error);
        }),
        Effect.catchTag("ParseError", error => {
            console.error(`Parse Error: ${error.message}`);
            return Effect.fail(error);
        })
    );

    // Run it
    Effect.runPromise(tokenProgram)
        .then(token => console.log("Token:", token))
        .catch(error => console.error("Failed:", error));
}

const runExamples = async () => {
    await superBasicExample();
};
runExamples();