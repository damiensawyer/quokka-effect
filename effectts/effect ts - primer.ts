// @ts-nocheck

import { Effect, pipe, Data } from "effect";

// --- ERROR MODELS ---
class HttpClientError extends Data.TaggedError("HttpClientError") {
  constructor(readonly message: string, readonly cause?: unknown) {
    super({ message, cause });
  }
}

class HttpStatusError extends Data.TaggedError("HttpStatusError") {
  constructor(
    readonly status: number, 
    readonly statusText: string, 
    readonly message: string
  ) {
    super({ status, statusText, message });
  }
}

// --- API MODELS ---
interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
}

interface Comment {
  id: number;
  postId: number;
  name: string;
  email: string;
  body: string;
}

// --- API CLIENT FUNCTIONS ---
// Get a single post
const getPost = (postId: number): Effect.Effect<Post, HttpStatusError | HttpClientError> => 
  Effect.tryPromise({
    try: () => 
      fetch(`https://jsonplaceholder.typicode.com/posts/${postId}`)
        .then(response => {
          if (!response.ok) {
            throw new HttpStatusError(
              response.status, 
              response.statusText, 
              `Failed to fetch post ${postId}`
            );
          }
          return response.json();
        }),
    catch: (error) => {
      if (error instanceof HttpStatusError) return error;
      return new HttpClientError(String(error));
    }
  });

// Get user by ID
const getUser = (userId: number): Effect.Effect<User, HttpStatusError | HttpClientError> => 
  Effect.tryPromise({
    try: () => 
      fetch(`https://jsonplaceholder.typicode.com/users/${userId}`)
        .then(response => {
          if (!response.ok) {
            throw new HttpStatusError(
              response.status, 
              response.statusText, 
              `Failed to fetch user ${userId}`
            );
          }
          return response.json();
        }),
    catch: (error) => {
      if (error instanceof HttpStatusError) return error;
      return new HttpClientError(String(error));
    }
  });

// Get comments for a post
const getComments = (postId: number): Effect.Effect<Comment[], HttpStatusError | HttpClientError> => 
  Effect.tryPromise({
    try: () => 
      fetch(`https://jsonplaceholder.typicode.com/posts/${postId}/comments`)
        .then(response => {
          if (!response.ok) {
            throw new HttpStatusError(
              response.status, 
              response.statusText, 
              `Failed to fetch comments for post ${postId}`
            );
          }
          return response.json();
        }),
    catch: (error) => {
      if (error instanceof HttpStatusError) return error;
      return new HttpClientError(String(error));
    }
  });

// --- COMPOSITION EXAMPLE ---
// This demonstrates chaining API calls - similar to your RxJS mergeMap pattern
interface PostWithDetails {
  post: Post;
  author: User;
  comments: Comment[];
  commentCount: number;
}

// Load a post with its author and comments
const loadPostWithDetails = (postId: number): Effect.Effect<PostWithDetails, HttpStatusError | HttpClientError> => {
  return pipe(
    getPost(postId),
    Effect.flatMap(post => 
      pipe(
        // Run these two effects in parallel 
        Effect.all([
          getUser(post.userId),
          getComments(post.id)
        ]),
        Effect.map(([author, comments]) => ({
          post,
          author,
          comments,
          commentCount: comments.length
        }))
      )
    )
  );
};

// --- ERROR HANDLING EXAMPLE ---
// Simulate trying to get a non-existent post
const getNonExistentPost = (): Effect.Effect<Post, HttpStatusError | HttpClientError> =>
  getPost(999999); // This post ID doesn't exist

// Handle specific error types
const handlePostError = () => {
  return pipe(
    getNonExistentPost(),
    Effect.catchTag(HttpStatusError.name, error => {
      if (error.status === 404) {
        console.log("⚠️ Post not found");
        return Effect.succeed({ 
          id: 0, 
          userId: 0, 
          title: "Not found", 
          body: "This post does not exist" 
        });
      }
      return Effect.fail(error);
    }),
    Effect.catchTag(HttpClientError.name, error => {
      console.log("⚠️ Network error:", error.message);
      return Effect.succeed({ 
        id: 0, 
        userId: 0, 
        title: "Error", 
        body: "Failed to load post due to network error" 
      });
    })
  );
};

// --- RETRY FUNCTIONALITY EXAMPLE ---
// Demonstrates Effect's built-in retry capabilities
const getPostWithRetry = (postId: number) => {
  return pipe(
    getPost(postId),
    Effect.retry({
      times: 3,
      delay: 1000
    })
  );
};

// --- CANCELLATION EXAMPLE ---
// This shows how to make effects interruptible
// const cancelableOperation = () => {
//   const slowOperation = pipe(
//     Effect.promise(() => new Promise(resolve => setTimeout(() => resolve("Done!"), 5000))), // if you make this shorter than 2000 you'll see the log
//     Effect.interruptible,
//     Effect.tap((message) => Effect.log(message)),
//   );
  
//   const fiber = Effect.runFork(slowOperation);
  
//   // After 2 seconds, interrupt the operation
//   setTimeout(() => {
//     console.log("Interrupting operation...");
//     Effect.runFork(Effect.interruptWith(fiber));
//   }, 2000);
// };

const cancelableOperation = () => {
  const slowOperation = Effect.log("Done!").pipe(
    Effect.delay("5 seconds"), // Automatically interruptible timer
    Effect.interruptible
  );

  const fiber = Effect.runFork(slowOperation);

  // Interrupt after 2 seconds
  Effect.runFork(Effect.delay(fiber.interruptAsFork(fiber.id()), "2 seconds"));
};


// --- TEST FUNCTIONS ---
const testGetPost = async () => {
  try {
    const post = await pipe(
      getPost(1), // Get the first post
      Effect.runPromise
    );
    
    console.log("✅ Post retrieved:", post.title, post.id, post.userId);
    return post;
  } catch (error) {
    console.error("❌ Error:", error);
    return null;
  }
};

const testLoadPostWithDetails = async () => {
  try {
    const postDetails = await pipe(
      loadPostWithDetails(1), // Get post #1 with all details
      Effect.runPromise
    );
    
    console.log("✅ Post details:");
    console.log(`- Title: ${postDetails.post.title}`);
    console.log(`- Author: ${postDetails.author.name}`);
    console.log(`- Comments: ${postDetails.commentCount}`);
    return postDetails;
  } catch (error) {
    console.error("❌ Error:", error);
    return null;
  }
};

const testErrorHandling = async () => {
  try {
    const result = await pipe(
      handlePostError(),
      Effect.runPromise
    );
    
    console.log("✅ Error handled, received:", result);
    return result;
  } catch (error) {
    console.error("❌ Unhandled error:", error);
    return null;
  }
};

// --- RUN IN QUOKKA ---
// Uncomment one of these lines to run tests in Quokka:
 //testGetPost();//?
 //testLoadPostWithDetails(); //?
testErrorHandling();
//cancelableOperation();