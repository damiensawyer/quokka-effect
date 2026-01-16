"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const effect_1 = require("effect");
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
    if (!!message)
        console.log(`✓ ${message}`);
};
// Set environment variable to ignore self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const oidcConfig = {
    tokenEndpoint: 'https://localhost:4000/auth/connect/token',
    clientId: 'ssr_backend',
    clientSecret: 'local_dev_ssr_secret',
    scope: 'api'
};
const superBasicExample = async () => {
    const getToken = effect_1.Effect.gen(function* () {
        const response = yield* effect_1.Effect.tryPromise(() => fetch(oidcConfig.tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: oidcConfig.clientId,
                client_secret: oidcConfig.clientSecret,
                scope: oidcConfig.scope
            })
        }));
        assert(response.status == 200, `got bad response ${response.status}`);
        return yield* effect_1.Effect.tryPromise(() => response.json());
    });
    const testGetToken = async () => {
        try {
            const token = await (0, effect_1.pipe)(getToken, effect_1.Effect.runPromise);
            token.access_token; //?
            token.expires_in; //?
            token.token_type; //?
        }
        catch (error) {
            console.error("❌ Error:", error);
            return null;
        }
    };
    return await testGetToken();
};
const runExamples = async () => {
    try {
        const result = await superBasicExample();
        console.log("\n✓ Example completed. Result:", result);
    }
    catch (error) {
        console.error("Error running examples:", error);
    }
};
runExamples();
//# sourceMappingURL=effect%20ts%20-%20OIDC%20Client%20Credentials.js.map