
import { pipe,flow } from 'effect'
import * as O from 'effect/Option'
import { orElseSome } from 'effect/Option'



O.match(O.some('name'), { onNone: () => "nothing", onSome: x => x }) //?
O.match(O.none<string>(), { onNone: () => "nothing", onSome: x => x }) //?
O.map(O.some('name'), x => x.toUpperCase())  //?


O.orElse(O.none<string>(), ()=>O.some("nothing")) //?
O.orElse(O.some("blah"), ()=>O.some("nothing")) //?
O.orElseSome(O.none(),() => "hello") //?
O.orElseSome(O.some("dog"),() => "hello") //?

orElseSome(O.some("dog"),() => "hello") //?
orElseSome(O.none("dog"),() => "hello") //?
pipe(O.some("dog"),O.orElseSome(() => "blah")) //?
pipe(O.none(),O.orElseSome(() => "blah")) //?
flow(O.orElseSome(() => "blah"))(O.none()) //?
flow(O.orElseSome(() => "blah"))(O.some("chicken")) //?

const s = O.some("dog")
if (O.isSome(s))
    s.value //?



/**
 * A helper function to get the value from an Option, or a default value
 * if the Option is None. This helper allows passing a direct value for
 * the default, making it slightly more convenient for simple defaults,
 * but be mindful of eager evaluation for complex default values.
 *
 * @param self The Option to extract the value from.
 * @param defaultValue The value to return if the Option is None.
 * @returns The value from the Option, or the defaultValue.
 */
export function getOrValue<A>(self: O.Option<A>, defaultValue: A): A {
  return pipe(
    self,
    O.getOrElse(() => defaultValue)
  );
}

getOrValue(O.some('name'),'blah') //?
getOrValue(O.none(),'blah') //?