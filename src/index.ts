/**
 * This parses the error from a try catch block, so that we can get a
 * more accurate error message.
 */
const parseTryCatchError = (error: unknown): Error => {
  if (error instanceof Error) return error
  const err = new Error(String(error).padStart(1, 'e'))
  if (err.message === '[object Object]') {
    return new Error(JSON.stringify(error))
  }
  return err
}

/**
 * This is a helper type to make type checking easier for error handling
 *
 * While the type technically requires a space, in practice with the below
 * code, it's actual requirements are to make sure the string is not empty.
 *
 * For example, 'hi' is a valid NonEmptyString, but '' is not.
 *
 * **DO NOT USE THIS TYPE DIRECTLY - For testing purposes only**
 */
type NonEmptyString = `${string} ${string}` & { __nonEmptyString: never }

/**
 * Merges types to allow for better type descriptions when the user
 * hovers over types in the editor.
 */
type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

/**
 * By making the type arguments of ew const, we can do much more detailed type
 * checking, but if we keep the return type const, it forces the end developer
 * to deal with readonly properties.
 *
 * To get the best of both worlds, we make the type arguments const, but the
 * return type non-const with the DeepWriteable type.
 */
type DeepWriteable<T> = {
  -readonly [P in keyof T]: Prettify<DeepWriteable<T[P]>>
}

/**
 * Same as DeepWriteable, but for tuples. Allowing us to remove readonly
 * properties from tuples, so that the end developer doesn't have to deal with
 * readonly properties (if they don't want to).
 */
type RemoveReadonlyTuple<T> = T extends readonly [infer U, ...infer U2]
  ? [U, ...U2]
  : T

/**
 * This allows us to add an extra error property to primitive types, without
 * casting all the primitive types as Object types and showing their prototype
 * methods in the IDE type description.
 */
type WithNoError<T = any> = T & { error?: never }

type WithNoErrorC<T> = WithNoError<Omit<T, '__isCustomEWReturnType'>>

/**
 * This parses the return type of actual function correctly, handling
 * void, undefined, primitive types, and finally objects.
 */
type GetNonErrorTypes<T> = [T] extends [never | null]
  ? [T] extends [null]
    ? null
    : TypedError<NonEmptyString> | undefined
  : T extends void
    ? undefined
    : T extends null
      ? null
      : T extends
            | number
            | string
            | boolean
            | bigint
            | symbol
            | any[]
            | readonly any[]
            | readonly [any, ...any]
        ? WithNoError<RemoveReadonlyTuple<T>>
        : T extends { error: string }
          ? never
          : T extends { __isCustomEWReturnType?: never }
            ? WithNoErrorC<T>
            : Prettify<DeepWriteable<T> & { error?: never }>

/**
 * This types all returned errors as the actual string, alongside
 * the NonEmptyString type (so autocomplete works as expected).
 */
type GetHardcodedErrors<T> = T extends never | void
  ? never | undefined
  : T extends { __isTypedError: any }
    ? T
    : never

/**
 * Returns true if the error type is invalid.
 * A valid string is undefined, null, or a non-empty string.
 */
type HasInvalidErrorType<T> = [T] extends [{ __nonEmptyString: any }]
  ? true
  : [T] extends [{ error?: any }]
    ? T extends { __isTypedError: any }
      ? // eslint-disable-next-line @typescript-eslint/no-unused-vars
        T extends WithNoError<infer U>
        ? true
        : 1
      : true
    : [keyof T] extends ['error']
      ? T extends { __nonEmptyString: any }
        ? true
        : // eslint-disable-next-line @typescript-eslint/no-unused-vars
          T extends WithNoError<infer U>
          ? true
          : 1
      : 1

export type TypedError<
  T extends string extends infer J ? (J extends '' ? never : J) : never,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  ExtraData extends Record<string, any> = {},
> = {
  __isTypedError: true
  error: T
  rawError: keyof ExtraData extends never
    ? Error & { extraData?: never }
    : Error & { extraData: ExtraData }
}

const errorCallback = <
  T extends string | TypedError<string>,
  ReturnT extends T extends ''
    ? never
    : T extends TypedError<infer J>
      ? J
      : never,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  const ExtraData extends Record<string, any> | {} = {},
>(
  msg: ReturnT,
  extraData?: ExtraData,
): TypedError<ReturnT, Prettify<DeepWriteable<ExtraData>>> => {
  const rawError = new Error(msg) as keyof ExtraData extends never
    ? Error & { extraData?: never }
    : Error & { extraData: ExtraData }
  rawError.stack = getParsedStack(rawError, { popOffStack: true })?.editedStack
  rawError.extraData = extraData || ({} as any)
  return {
    __isTypedError: true,
    error: msg,
    rawError,
  }
}
type ErrorCallback = typeof errorCallback

export const ew = <
  const args extends any[],
  const Ret,
  AwaitedRet extends Awaited<Ret>,
  NonErrorTypes extends GetNonErrorTypes<AwaitedRet>,
  HardcodedErrors extends GetHardcodedErrors<AwaitedRet>,
  InvalidErrorType extends HasInvalidErrorType<AwaitedRet>,
  IsPromise extends [Ret] extends [AwaitedRet] ? false : true,
  // if we have a function that only throws and does not return anything,
  // we need to type check it and return a NonEmptyString since it is wrapped
  // and will return the error
  FinalRet1 extends [AwaitedRet] extends [never]
    ? TypedError<NonEmptyString> | undefined
    : // if the function we are trying to wrap has an invalid error type,
      // we mark it as a never type so the end developer knows that they need
      // to fix the error type
      InvalidErrorType extends boolean
      ? never
      : // otherwise we return the set of return types we have for the function
        | NonErrorTypes
          // if the function is trying to return an key with error
          | (HardcodedErrors extends never | undefined
              ? never
              : HardcodedErrors)
          | TypedError<NonEmptyString>,
  FinalRet extends IsPromise extends true ? Promise<FinalRet1> : FinalRet1,
>(
  fn: (firstArgs: ErrorCallback, ...a: args) => Ret,
) => {
  return (...args: args): FinalRet => {
    const handleError = (e: unknown) => {
      const rawError = parseTryCatchError(e)
      return {
        __isTypedError: true,
        error: rawError.message,
        rawError,
      } as any
    }
    try {
      if (fn.constructor.name === 'AsyncFunction') {
        return (fn(errorCallback, ...args) as any)
          .then((res: any) => res as any)
          .catch((e: unknown) => handleError(e))
      }
      return fn(errorCallback, ...args) as any
    } catch (e) {
      return handleError(e)
    }
  }
}

type FilterOutEmptyStrings<
  T extends string | { error: string; extraData?: Record<string, any> },
> = T extends string
  ? T extends ''
    ? never
    : T
  : T extends { error: infer J }
    ? J extends ''
      ? never
      : T
    : never

type C<T> = T & { __isCustomEWReturnType?: never }

export type WithEW<
  T,
  errors extends
    | string
    | { error: string; extraData?: Record<string, any> }
    | TypedError<any> = NonEmptyString,
  validErrors extends
    FilterOutEmptyStrings<errors> = FilterOutEmptyStrings<errors>,
> =
  | C<T>
  | (validErrors extends string
      ? TypedError<validErrors>
      : validErrors extends { error: string }
        ? validErrors extends TypedError<infer J, infer K>
          ? TypedError<J, K>
          : validErrors extends {
                error: infer J extends string
                extraData: infer K extends Record<string, any>
              }
            ? TypedError<J, K>
            : validErrors extends { error: infer J extends string }
              ? TypedError<J>
              : never
        : never)

/**
 * Helper function to get the line number of the error.
 *
 * This is useful for debugging/testing, as it allows us to see the exact line
 * that the error occurred on.
 *
 * **This should only be used for testing purposes, please don't use this
 * function directly.**
 */
const getParsedStack = (
  e: Error | undefined,
  // if we parse the error in the file, we want to pop off the first line
  // since the first line points to the library code, not the user code
  opts: { popOffStack: boolean } = { popOffStack: false },
) => {
  const lines = (e?.stack?.split('\n') || []).filter((_, i) =>
    opts.popOffStack ? i !== 1 : true,
  )

  const firstLine = lines[1]
  if (!firstLine) return null
  const colonSplit = firstLine.split(':')
  const colon = colonSplit[colonSplit.length - 2]
  // const files = lines.slice(1).map((line) => {
  //   const byColon = line.split(':')
  //   return byColon[byColon.length - 2],
  // })

  const editedStack = lines.join('\n')
  return {
    editedStack,
    lineNumber: colon,
    // files,
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export const typedErrorToSentry = <T extends TypedError<string, {}>>(
  error: T,
): {
  errorObj: Error
  extraData: T['rawError']['extraData']
  message: string
} => {
  const { extraData, ...errorObj } = error.rawError
  return {
    errorObj,
    extraData: extraData,
    message: error.error,
  }
}

/**
 * A helper type to get the return type errors of a function.
 *
 * This can be useful when calling multiple levels of enwrap with explicit
 * return types.
 */
export type GetReturnTypeErrors<
  T extends (...args: any[]) => any,
  AwaitedT = Awaited<ReturnType<T>>,
> = AwaitedT extends TypedError<any, any> ? AwaitedT : never

export type __TEST_ONLY = {
  NonEmptyString: NonEmptyString
  WithNoError: WithNoError
}

export const __TEST_ONLY = {
  getParsedStack,
}
