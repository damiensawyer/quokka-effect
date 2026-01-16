import { Effect, pipe } from "effect";

const assert = (condition: boolean, message?: string) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  if (!!message) console.log(`✓ ${message}`);
};


// Set environment variable to ignore self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
type tokenType = {access_token:string, token_type:string, expires_in: number}
type OIDCConfig = {
    tokenEndpoint: string,
    clientId: string,
    clientSecret: string,
    scope: string
}

const oidcConfig: OIDCConfig = {
    tokenEndpoint: 'https://localhost:4000/auth/connect/token',
    clientId: 'ssr_backend',
    clientSecret: 'local_dev_ssr_secret',
    scope: 'api'
};

const superBasicExample = async () => {
   
    const getToken = Effect.gen(function* () {
        const response = yield* Effect.tryPromise(() =>
            fetch(oidcConfig.tokenEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: oidcConfig.clientId,
                    client_secret: oidcConfig.clientSecret,
                    scope: oidcConfig.scope
                })
            })
        )
        
        assert(response.status == 200, `got bad response ${response.status}`)
        
        return yield* Effect.tryPromise(() => response.json())
    })

    const testGetToken = async () => {
        try {
            const token:tokenType = await pipe(
                getToken,
                Effect.runPromise
            );
            
            token.access_token //?
            token.expires_in //?
            token.token_type //?
        } catch (error) {
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
    } catch (error) {
        console.error("Error running examples:", error);
    }
};

runExamples();

export {};