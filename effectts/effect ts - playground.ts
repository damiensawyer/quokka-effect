import { Effect as E } from "effect/index"

const a = E.succeed(2)
const b = E.succeed(3)
const c = E.succeed(5)
const d = E.sleep(100).pipe(E.as(10))
const straightpass = a.pipe(E.andThen(a => b)) // no operation... b overwrites a

const add = a.pipe(E.andThen(a => b.pipe(E.map(b => b + a))))


const add2 = E.all([a, b, c]).pipe(
  E.map(([a, b, c]) => a + b + c)
)

const mapReduce = E.all([a, b, c]).pipe(
  E.map(values => values.reduce((sum, val) => sum + val, 0))
)


const mapReduce2 = E.all([a, b, c, d]).pipe(
  E.map(values => values.reduce((sum, val) => sum + val, 0))
)

E.runSync(a) //?
E.runSync(straightpass) //?
E.runSync(add) //?
E.runSync(add2) //?
E.runSync(mapReduce) //?
E.runPromise(mapReduce2) //?

