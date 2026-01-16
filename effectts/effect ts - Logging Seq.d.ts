export {};
import { Layer } from "effect";
interface SeqConfig {
    readonly url: string;
    readonly apiKey?: string;
}
export declare const SeqLoggerLayer: (config: SeqConfig) => Layer.Layer<never, never, never>;
//# sourceMappingURL=effect%20ts%20-%20Logging%20Seq.d.ts.map