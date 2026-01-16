"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrValue = getOrValue;
const effect_1 = require("effect");
const O = __importStar(require("effect/Option"));
const Option_1 = require("effect/Option");
O.match(O.some('name'), { onNone: () => "nothing", onSome: x => x }); //?
O.match(O.none(), { onNone: () => "nothing", onSome: x => x }); //?
O.map(O.some('name'), x => x.toUpperCase()); //?
O.orElse(O.none(), () => O.some("nothing")); //?
O.orElse(O.some("blah"), () => O.some("nothing")); //?
O.orElseSome(O.none(), () => "hello"); //?
O.orElseSome(O.some("dog"), () => "hello"); //?
(0, Option_1.orElseSome)(O.some("dog"), () => "hello"); //?
(0, Option_1.orElseSome)(O.none(), () => "hello"); //?
(0, effect_1.pipe)(O.some("dog"), O.orElseSome(() => "blah")); //?
(0, effect_1.pipe)(O.none(), O.orElseSome(() => "blah")); //?
(0, effect_1.flow)(O.orElseSome(() => "blah"))(O.none()); //?
(0, effect_1.flow)(O.orElseSome(() => "blah"))(O.some("chicken")); //?
const s = O.some("dog");
if (O.isSome(s))
    s.value; //?
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
function getOrValue(self, defaultValue) {
    return (0, effect_1.pipe)(self, O.getOrElse(() => defaultValue));
}
getOrValue(O.some('name'), 'blah'); //?
getOrValue(O.none(), 'blah'); //?
//# sourceMappingURL=effect%20ts%20-%20Options.js.map