import * as O from 'effect/Option';
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
export declare function getOrValue<A>(self: O.Option<A>, defaultValue: A): A;
//# sourceMappingURL=effect%20ts%20-%20Options.d.ts.map