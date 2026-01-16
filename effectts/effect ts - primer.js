"use strict";
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
const effect_1 = require("effect");
// --- ERROR MODELS ---
class HttpClientError extends effect_1.Data.TaggedError("HttpClientError") {
    message;
    cause;
    constructor(message, cause) {
        super({ message, cause });
        this.message = message;
        this.cause = cause;
    }
}
class HttpStatusError extends effect_1.Data.TaggedError("HttpStatusError") {
    status;
    statusText;
    message;
    constructor(status, statusText, message) {
        super({ status, statusText, message });
        this.status = status;
        this.statusText = statusText;
        this.message = message;
    }
}
// --- API CLIENT FUNCTIONS ---
// Get a single post
const getPost = (postId) => effect_1.Effect.tryPromise({
    try: () => fetch(`https://jsonplaceholder.typicode.com/posts/${postId}`)
        .then(response => {
        if (!response.ok) {
            throw new HttpStatusError(response.status, response.statusText, `Failed to fetch post ${postId}`);
        }
        return response.json();
    }),
    catch: (error) => {
        if (error instanceof HttpStatusError)
            return error;
        return new HttpClientError(String(error));
    }
});
// Get user by ID
const getUser = (userId) => effect_1.Effect.tryPromise({
    try: () => fetch(`https://jsonplaceholder.typicode.com/users/${userId}`)
        .then(response => {
        if (!response.ok) {
            throw new HttpStatusError(response.status, response.statusText, `Failed to fetch user ${userId}`);
        }
        return response.json();
    }),
    catch: (error) => {
        if (error instanceof HttpStatusError)
            return error;
        return new HttpClientError(String(error));
    }
});
// Get comments for a post
const getComments = (postId) => effect_1.Effect.tryPromise({
    try: () => fetch(`https://jsonplaceholder.typicode.com/posts/${postId}/comments`)
        .then(response => {
        if (!response.ok) {
            throw new HttpStatusError(response.status, response.statusText, `Failed to fetch comments for post ${postId}`);
        }
        return response.json();
    }),
    catch: (error) => {
        if (error instanceof HttpStatusError)
            return error;
        return new HttpClientError(String(error));
    }
});
// Load a post with its author and comments
const loadPostWithDetails = (postId) => {
    return (0, effect_1.pipe)(getPost(postId), effect_1.Effect.flatMap(post => (0, effect_1.pipe)(
    // Run these two effects in parallel 
    effect_1.Effect.all([
        getUser(post.userId),
        getComments(post.id)
    ]), effect_1.Effect.map(([author, comments]) => ({
        post,
        author,
        comments,
        commentCount: comments.length
    })))));
};
// --- ERROR HANDLING EXAMPLE ---
// Simulate trying to get a non-existent post
const getNonExistentPost = () => getPost(999999); // This post ID doesn't exist
// Handle specific error types
const handlePostError = () => {
    return (0, effect_1.pipe)(getNonExistentPost(), effect_1.Effect.catchTag("HttpStatusError", error => {
        if (error.status === 404) {
            console.log("⚠️ Post not found");
            return effect_1.Effect.succeed({
                id: 0,
                userId: 0,
                title: "Not found",
                body: "This post does not exist"
            });
        }
        return effect_1.Effect.fail(error);
    }), effect_1.Effect.catchTag("HttpClientError", error => {
        console.log("⚠️ Network error:", error.message);
        return effect_1.Effect.succeed({
            id: 0,
            userId: 0,
            title: "Error",
            body: "Failed to load post due to network error"
        });
    }));
};
// --- RETRY FUNCTIONALITY EXAMPLE ---
// Demonstrates Effect's built-in retry capabilities
const getPostWithRetry = (postId) => {
    return (0, effect_1.pipe)(getPost(postId), effect_1.Effect.retry({
        times: 3,
        delay: 1000
    }));
};
// --- CANCELLATION EXAMPLE ---
// This shows how to make effects interruptible
const cancelableOperation = () => {
    const slowOperation = (0, effect_1.pipe)(effect_1.Effect.promise(() => new Promise(resolve => setTimeout(() => resolve("Done!"), 10000))), effect_1.Effect.interruptible);
    const fiber = effect_1.Effect.runFork(slowOperation);
    // After 2 seconds, interrupt the operation
    setTimeout(() => {
        console.log("Interrupting operation...");
        effect_1.Effect.runFork(effect_1.Effect.interruptWith(fiber));
    }, 2000);
};
// --- TEST FUNCTIONS ---
const testGetPost = async () => {
    try {
        const post = await (0, effect_1.pipe)(getPost(1), // Get the first post
        effect_1.Effect.runPromise);
        console.log("✅ Post retrieved:", post.title, post.id, post.userId);
        return post;
    }
    catch (error) {
        console.error("❌ Error:", error);
        return null;
    }
};
const testLoadPostWithDetails = async () => {
    try {
        const postDetails = await (0, effect_1.pipe)(loadPostWithDetails(1), // Get post #1 with all details
        effect_1.Effect.runPromise);
        console.log("✅ Post details:");
        console.log(`- Title: ${postDetails.post.title}`);
        console.log(`- Author: ${postDetails.author.name}`);
        console.log(`- Comments: ${postDetails.commentCount}`);
        return postDetails;
    }
    catch (error) {
        console.error("❌ Error:", error);
        return null;
    }
};
const testErrorHandling = async () => {
    try {
        const result = await (0, effect_1.pipe)(handlePostError(), effect_1.Effect.runPromise);
        console.log("✅ Error handled, received:", result);
        return result;
    }
    catch (error) {
        console.error("❌ Unhandled error:", error);
        return null;
    }
};
// --- RUN IN QUOKKA ---
// Uncomment one of these lines to run tests in Quokka:
testGetPost(); //?
testLoadPostWithDetails(); //?
testErrorHandling();
cancelableOperation();
//# sourceMappingURL=effect%20ts%20-%20primer.js.map