"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const effect_1 = require("effect");
class AllPeople extends effect_1.Context.Tag("AllPeople")() {
}
class Teachers extends effect_1.Context.Tag("Teachers")() {
}
class Students extends effect_1.Context.Tag("Students")() {
}
// Sample implementations
// Sample implementation for a generic person
const personImpl = {
    name: () => effect_1.Effect.succeed("John Doe"),
};
// Sample implementation for a teacher
const teacherImpl = {
    name: () => effect_1.Effect.succeed("Professor Smith"),
    uniName: () => effect_1.Effect.succeed("Harvard University")
};
// Sample implementation for a student
const studentImpl = {
    name: () => effect_1.Effect.succeed("Alice Johnson"),
    schoolName: () => effect_1.Effect.succeed("High School 123"),
    uniName: "MIT" // Direct string value
};
// Create layers for providing these implementations
const personLayer = effect_1.Layer.succeed(AllPeople, personImpl);
const teacherLayer = effect_1.Layer.succeed(Teachers, teacherImpl);
const studentLayer = effect_1.Layer.succeed(Students, studentImpl);
// Example program using these services
const program = effect_1.Effect.gen(function* () {
    // Get the services
    const people = yield* AllPeople;
    const teachers = yield* Teachers;
    const students = yield* Students;
    // Use the services
    const personName = yield* people.name();
    const teacherName = yield* teachers.name();
    const teacherUni = yield* teachers.uniName();
    const studentName = yield* students.name();
    const studentSchool = yield* students.schoolName();
    console.log(`Person: ${personName}`);
    console.log(`Teacher: ${teacherName} at ${teacherUni}`);
    console.log(`Student: ${studentName} at ${studentSchool} (planning to attend ${students.uniName})`);
    return { personName, teacherName, teacherUni, studentName, studentSchool };
});
// Run the program with all services provided
const runnable = program.pipe(effect_1.Effect.provide(personLayer), effect_1.Effect.provide(teacherLayer), effect_1.Effect.provide(studentLayer));
// Execute the program
effect_1.Effect.runPromise(runnable).then(x => {
    x; //?
});
// merging all the layers
const l = effect_1.Layer.mergeAll(personLayer, teacherLayer, studentLayer);
const runnable2 = program.pipe(effect_1.Effect.provide(l));
effect_1.Effect.runPromise(runnable2).then(x => {
    x; //?
});
//# sourceMappingURL=effect%20ts%20-%20Playing%20with%20nested%20tags.js.map