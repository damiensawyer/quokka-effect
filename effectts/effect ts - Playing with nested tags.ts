import { Context, Effect, Layer } from 'effect';

// Base interface for all people
type AllPeopleType = {
  name: () => Effect.Effect<string>
};

// Teacher interface extends the base with uni-specific info
type TeacherType = AllPeopleType & {
  uniName: () => Effect.Effect<string>
};

// Student interface extends the base with school-specific info
type StudentType = AllPeopleType & {
  schoolName: () => Effect.Effect<string>,
  uniName: string // Note: this is a string, not a function returning an Effect
};

class AllPeople extends Context.Tag("AllPeople")<AllPeople, AllPeopleType>() { }
class Teachers extends Context.Tag("Teachers")<Teachers, TeacherType>() { }
class Students extends Context.Tag("Students")<Students, StudentType>() { }

// Sample implementations

// Sample implementation for a generic person
const personImpl: AllPeopleType = {
  name: () => Effect.succeed("John Doe"),
};

// Sample implementation for a teacher
const teacherImpl: TeacherType = {
  name: () => Effect.succeed("Professor Smith"),
  uniName: () => Effect.succeed("Harvard University")
};

// Sample implementation for a student
const studentImpl: StudentType = {
  name: () => Effect.succeed("Alice Johnson"),
  schoolName: () => Effect.succeed("High School 123"),
  uniName: "MIT" // Direct string value
};

// Create layers for providing these implementations
const personLayer = Layer.succeed(AllPeople, personImpl);
const teacherLayer = Layer.succeed(Teachers, teacherImpl);
const studentLayer = Layer.succeed(Students, studentImpl);

// Example program using these services
const program = Effect.gen(function* () {
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
  return {personName,teacherName, teacherUni, studentName,studentSchool}
});

// Run the program with all services provided
const runnable = program.pipe(
  Effect.provide(personLayer),
  Effect.provide(teacherLayer),
  Effect.provide(studentLayer)
);

// Execute the program
Effect.runPromise(runnable).then(x=>{
  x //?
})

// merging all the layers
const l = Layer.mergeAll(personLayer, teacherLayer,studentLayer);
const runnable2 = program.pipe(Effect.provide(l))
Effect.runPromise(runnable2).then(x=>{
  x //?
})
