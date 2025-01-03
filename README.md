# Enwrap

[![bundlephobia minzip](https://badgen.net/bundlephobia/minzip/enwrap)](https://bundlephobia.com/package/enwrap)
[![bundlephobia tree shaking](https://badgen.net/bundlephobia/tree-shaking/enwrap)](https://bundlephobia.com/package/enwrap)
[![bundlephobia dependency count](https://badgen.net/bundlephobia/dependency-count/enwrap?color=black)](https://github.com/ahoylabs/enwrap/blob/main/package.json)

Enwrap is a very small (752 bytes) and dependency free library that allows you to wrap functions and return typed errors, with a focus on ease of use and developer experience.

Unlike other libraries, Enwrap does not require you to learn a new dramatically different syntax, most TypeScript developers will feel right at home after a few minutes.

## Installation

```bash
yarn add enwrap
```

## Usage

Enwrap has one main function, `ew`, which takes a function and returns a fully typed function with error handling.

### Basic Example

```ts
import { ew } from 'enwrap'

// notice the first argument, `err`, this is a function we will call whenever
// we want to return an error
// any other arguments are the arguments we want to pass to the function
// in this case, we want to pass a number to the function
const getPositiveNumber = ew((err, num: number) => {
  if (num < 0) {
    return err('number must be positive')
  }
  return num
})

const res = getPositiveNumber(1)
//    ^? `WithNoError<number> | TypedError<NonEmptyString> | TypedError<'number must be positive'>`

// if we want to access the number, we need to check if the error is present
if (res.error) {
  console.log(res.error)
} else {
  console.log(res) // 1
}
```

Enwrap supports returning any value from the wrapped function, and will type the value with `WithNoError<T>`, which is a type that represents a value that is not an error. There's nothing special about `WithNoError<T>` from a runtime perspective, it's just a normal type.

### Typed Error Handling

One massive advantage of Enwrap, vs `new Error()` is that all explicit errors are typed. This allows you to handle different types of errors in a type safe manner & with editor autocomplete!

One important thing to note is that since there's no way to type or detect errors that are thrown in a function, Enwrap includes a generic `TypedError<NonEmptyString>` return type for all functions, even ones that don't explicitly return an error.

```ts
const sometimesThrow = () => {
  if (Math.random() > 0.5) {
    throw new Error('this is an error')
  }
}

const getPrimeNumber = ew((err, num: number) => {
  if (num <= 0) {
    return err('number must be greater than 0')
  }
  if (num < 2) {
    return err('number must be greater than 1')
  }

  // if we have a function which throws an error, it will be caught and returned
  // as a `TypedError<NonEmptyString>`
  sometimesThrow()

  // lol this is not a prime number check (but these are example docs)
  return num % 2 !== 0
})

const is50Prime = getPrimeNumber(50)
//    ^? `WithNoError<boolean> | TypedError<NonEmptyString> | TypedError<'number must be greater than 0'> | TypedError<'number must be greater than 1'>`

if (is50Prime.error === 'number must be greater than 0') {
  // shame the number for not being greater than 0
  alert('shame for negative numbers')
}
if (is50Prime.error === 'number must be greater than 1') {
  // look up if 1 is a prime number on wikipedia
  window.open('https://en.wikipedia.org/wiki/Prime_number', '_blank')
}
if (is50Prime.error) {
  // this is an error that we didn't expect, and we should probably log it
  console.error(is50Prime.error)
  // and then we get the raw error for debugging/sentry/logging/etc
  console.error(is50Prime.error.rawError)
}
```

As we can see above, Enwrap will return a union of all possible errors that can occur in the function. This allows you to handle all errors in a type safe manner, while also being able to access the raw error for debugging/sentry/logging/etc.

Every `TypedError<T>` includes a `rawError` property, which is the raw error that was thrown. This is useful if you want to access additional properties on the error, or if you want to pass the error to a function that expects a normal `Error` object.

### Extra Error Data

There are times when you may want to include extra context/metadata that you want to include when sending the error to error tracking services like Sentry.

Enwrap allows you to do this by passing an object as the second argument to `err`.

```ts
const getUserName = ew(async (err, userId: number) => {
  const user = await database.getUser(userId)

  if (!user) {
    return err('user not found', { userId })
  }

  return user.name
})
const userName = await getUserName(1)
//    ^? `Promise<WithNoError<string> | TypedError<NonEmptyString> | TypedError<'user not found', { userId: number }>>`

if (userName.error) {
  // the extra data is available on the error object
  console.error(userName.rawError.extraData.userId)
}
```

### Invalid Return Types

Enwrap takes an opinionated stance on error types, which allows it to provide more helpful error messages and better integration with TypeScript. However, this means that any type returned from the wrapped function must be a valid error type or non-error type.

**You cannot return an object with a `.error` property from any Enwrap function**

Enwrap is designed to prevent footguns, so anytime you try to return an object with an `.error` property, the function return type will be `never`. If you are seeing `never` as the return type of your Enwrap function, you are doing something wrong. (if you don't think you are, please open an issue)

```ts
const getUser = ew((err, userId: number) => {
  // this is invalid, and will cause a typescript error
  return { error: 'this is an error' }
})

const res = getUser(1)
//    ^? `never`
```

### Getting the stack trace

Enwrap insures that the stack trace is captured correctly, so you don't have to worry about it. You can access the stack trace via the `rawError.stack` property.

```ts
const getPositiveNumber = ew((err, num: number) => {
  if (num < 0) {
    return err('number must be positive')
  }

  return num + 1
})

const nextNumber = getPositiveNumber(1)
//    ^? `WithNoError<number> | TypedError<NonEmptyString> | TypedError<'number must be positive'>`

if (nextNumber.error) {
  console.error(nextNumber.rawError.stack)
}
```

### Returning Explicit Types

As your TypeScript codebase grows, you may find yourself wanting to return predefined types from your Enwrap functions. Enwrap allows you to do this by setting the return type of the Enwrap function to the type you want to return.

**The only caveat to this is that you must set any explicit error types manually.**

In order to return an explicit type, we will use the `WithEW` helper type.

```ts
import { type WithEW, ew } from 'enwrap'
// a type that represents a user used in our codebase
type User = {
  id: number
  name: string
}

// notice the return type, we are setting it to `WithEW<User, 'missing user'>`
// no need to manually set `TypedError<NonEmptyString>`
const getUser = ew((err, userId: number): WithEW<User, 'missing user'> => {
  const user = database.getUser(userId)
  if (!user) {
    return err('missing user')
  }
  return user
})
const user = getUser(1)
//    ^? `WithNoError<User> | TypedError<'missing user'> | TypedError<NonEmptyString>`
```

If we want to return extra data with our error, we can do so by passing an object
as the second argument to `WithEW`:

```ts
import { type WithEW, ew } from 'enwrap'

const getUser = ew((err, userId: number): WithEW<User, { error: 'missing user', { userId: number } }> => {
  const user = database.getUser(userId)
  if (!user) {
    return err('missing user', { userId })
  }
  return user
})

const user = getUser(1)
//    ^? `WithNoError<User> | TypedError<'missing user', { userId: number }> | TypedError<NonEmptyString>`
```

You can also use the `GetReturnTypeErrors` helper type to get error types from a function, to make combining multiple levels of Enwrap easier.

```ts
// continuing from above

type GetUserErrors = GetReturnTypeErrors<typeof getUser>
//    ^? `TypedError<'missing user', { userId: number }> | TypedError<NonEmptyString>`

const getUserName = ew(
  async (
    err,
    userId: number,
  ): WithEW<string, GetUserErrors | 'empty username'> => {
    const user = await getUser(userId)
    if (user.error) {
      return user // return the full type, not just the error
    }
    if (user.name === '') {
      return err('empty username')
    }
    return user.name
  },
)

const userName = await getUserName(1)
//    ^? `WithNoError<string> | TypedError<NonEmptyString> | TypedError<'empty username'> | TypedError<'missing user', { userId: number }>`
```

## FAQ

### Does Enwrap support async functions?

Yes, Enwrap supports async functions. All returns types are preserved and wrapped in a `Promise`.

### Why not just use `throw` and `try/catch`?

Using `throw` and `try/catch` is a valid approach to error handling, but lacks the type safety that Enwrap provides. Enwrap intentionally takes a different approach by allowing you to keep using your existing error handling patterns, while incrementally adding more safety. You can still use `throw` and `try/catch` with Enwrap, it just won't be type safe.

### Why not use a library like `ts-results` or `neverthrow`?

Enwrap is designed to be a simple, lightweight library that allows you to add typed errors to your functions without learning a new syntax. With only one main export, it is designed to be easy to add to existing codebases, incrementally adopted, and easy for developers on your team to understand.

If you are looking for a library that provides a more complex error handling system and more features, you may want to look into [`ts-results`](https://github.com/vultix/ts-results) or [`neverthrow`](https://github.com/supermacro/neverthrow).

### What kind of values can I return from an Enwrap function?

Enwrap functions can return any value, and will type the value with `WithNoError<T>`, which is a type that represents a value that is not an error. There's nothing special about `WithNoError<T>` from a runtime perspective, it's just a normal type.

### What happens if I throw a non-error value?

As you may know, you can throw any value in JavaScript/TypeScript. Enwrap will catch any value thrown from a wrapped function, and return it as a `TypedError<NonEmptyString>` with the value of the thrown error as the error message. If it's a non-string value, it will be converted to a string using `String(error)`. If it's an object, it will be converted to a string using `JSON.stringify(error)`. If it's an empty string, it will be converted to `'e'`.

Using ESLint's [`no-throw-literal`](https://eslint.org/docs/latest/rules/no-throw-literal) rule is recommended to prevent yourself from throwing non-error values.

For example:

```ts
const throwNumber = ew(() => {
  throw 123
})
const res = throwNumber()
//    ^? TypedError<NonEmptyString>
```

### How can I send the error to Sentry or other error tracking services?

Enwrap makes this easy by providing the `rawError` property on all errors. `rawError` is a normal `Error` object, so you can pass it to any function that expects a normal `Error` object. For Sentry, you can use the `TypedErrorToSentry` helper function.

```ts
import { TypedErrorToSentry } from 'enwrap'

// ... your getUser function ...

const res = getUser(1)

const sentryRes = TypedErrorToSentry(res)
//    ^? `{ errorObj: Error, extraData: { userId: number } | undefined, message: string }`
```

### How can I get the errors returned from an Enwrap function?

You can use the `GetReturnTypeErrors` helper type to get the errors from an Enwrap function.

```ts
import { ew, type GetReturnTypeErrors } from 'enwrap'

const getUser = ew((err, userId: number) => {
  // ...
})
type GetUserErrors = GetReturnTypeErrors<typeof getUser>
//    ^? `TypedError<NonEmptyString> | ...`
```

###

### I think I found a bug, what should I do?

Please open a [GitHub Issue](https://github.com/biw/enwrap/issues).

## License

[MIT](https://github.com/ahoylabs/enwrap/blob/main/LICENSE)
