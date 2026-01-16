"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("effect/index");
const a = index_1.Effect.succeed(2);
const b = index_1.Effect.succeed(3);
const c = index_1.Effect.succeed(5);
const d = index_1.Effect.sleep(100).pipe(index_1.Effect.as(10));
const straightpass = a.pipe(index_1.Effect.andThen(a => b)); // no operation... b overwrites a
const add = a.pipe(index_1.Effect.andThen(a => b.pipe(index_1.Effect.map(b => b + a))));
const add2 = index_1.Effect.all([a, b, c]).pipe(index_1.Effect.map(([a, b, c]) => a + b + c));
const mapReduce = index_1.Effect.all([a, b, c]).pipe(index_1.Effect.map(values => values.reduce((sum, val) => sum + val, 0)));
const mapReduce2 = index_1.Effect.all([a, b, c, d]).pipe(index_1.Effect.map(values => values.reduce((sum, val) => sum + val, 0)));
index_1.Effect.runSync(a); //?
index_1.Effect.runSync(straightpass); //?
index_1.Effect.runSync(add); //?
index_1.Effect.runSync(add2); //?
index_1.Effect.runSync(mapReduce); //?
index_1.Effect.runPromise(mapReduce2); //?
//# sourceMappingURL=effect%20ts%20-%20playground.js.map