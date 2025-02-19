import { getParsedStack } from './getParsedStack'
import { NonEmptyString, TypedError, WithNoError } from './helperTypes'

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
 * Merges types to allow for better type descriptions when the user
 * hovers over types in the editor.
 */
type Prettify<T> = { [K in keyof T]: T[K] } & {}

/**
 * By making the type arguments of ew const, we can do much more detailed type
 * checking, but if we keep the return type const, it forces the end developer
 * to deal with readonly properties.
 *
 * To get the best of both worlds, we make the type arguments const, but the
 * return type non-const with the DeepWriteable type.
 */
type DeepWriteable<T> = {
  -readonly [P in keyof T]: T[P] extends
    | number
    | string
    | boolean
    | bigint
    | symbol
    | any[]
    | readonly any[]
    | readonly [any, ...any]
    | ((...args: never) => unknown)
    | Date
    ? T[P]
    : Prettify<DeepWriteable<T[P]>>
}

/**
 * Same as DeepWriteable, but for tuples. Allowing us to remove readonly
 * properties from tuples, so that the end developer doesn't have to deal with
 * readonly properties (if they don't want to).
 */
type RemoveReadonlyTuple<T> = T extends readonly [infer U, ...infer U2]
  ? [U, ...U2]
  : T

type WithNoErrorC<T> = WithNoError<Omit<T, '__isCustomEWReturnType'>>

/**
 * This parses the return type of actual function correctly, handling
 * void, undefined, primitive types, and finally objects.
 */
type GetNonErrorTypes<T> = [T] extends [never]
  ? TypedError<NonEmptyString, true> | undefined
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
            | ((...args: never) => unknown)
            | Date
        ? WithNoError<RemoveReadonlyTuple<T>>
        : T extends { error: string }
          ? never
          : T extends { __isTypedError: any }
            ? never
            : T extends { __isTypedErrorValue: any }
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

type ClearInvalidErrorType<J> = [J] extends [never]
  ? undefined
  : HasInvalidErrorType<J> extends null
    ? J
    : never

/**
 * Returns true if the error type is invalid.
 * A valid string is undefined, null, or a non-empty string.
 */
type HasInvalidErrorType<T> = T extends { __invalidCustomEWReturnType: true }
  ? true
  : T extends { __nonEmptyString: any }
    ? true
    : T extends { __isTypedErrorValue: any }
      ? true
      : T extends { error?: any }
        ? T extends { __isTypedError: any }
          ? // eslint-disable-next-line @typescript-eslint/no-unused-vars
            T extends WithNoError<infer U>
            ? T extends (...args: never) => unknown
              ? null
              : true
            : null
          : true
        : [keyof T] extends ['error']
          ? T extends { __nonEmptyString: any }
            ? true
            : // eslint-disable-next-line @typescript-eslint/no-unused-vars
              T extends WithNoError<infer U>
              ? T extends (...args: never) => unknown
                ? null
                : true
              : null
          : T extends { __isErrorCallback: true }
            ? true
            : null

const errorCallback = <
  T extends string,
  ReturnT extends T extends '' ? never : T,
  const ExtraData extends Record<string, any> | never = never,
>(
  msg: BlockEmptyString<BlockGenericString<ReturnT>>,
  extraData?: ExtraData,
): TypedError<
  ReturnT,
  false,
  ExtraData extends never
    ? never
    : ExtraData extends undefined
      ? never
      : ExtraData extends
            | number
            | string
            | boolean
            | bigint
            | symbol
            | any[]
            | readonly any[]
            | readonly [any, ...any]
            | ((...args: never) => unknown)
            | Date
        ? ExtraData
        : Prettify<DeepWriteable<ExtraData>>
> => {
  const rawError = new Error(msg) as any as TypedError<
    ReturnT,
    false,
    any
  >['error']
  rawError.stack = getParsedStack(rawError)?.[0]
  rawError.extraData = extraData || ({} as any)
  rawError.wasThrown = false
  return { error: rawError } as {
    __isTypedError: never
    error: typeof rawError
  }
}
type ErrorCallback = typeof errorCallback & { __isErrorCallback: true }

export const ew = <
  const args extends any[],
  const Ret,
  AwaitedRet extends Awaited<Ret>,
  NonErrorTypes extends GetNonErrorTypes<AwaitedRet>,
  HardcodedErrors extends GetHardcodedErrors<AwaitedRet>,
  ErrorTypesWithoutInvalid extends ClearInvalidErrorType<AwaitedRet>,
  IsPromise extends [Ret] extends [AwaitedRet] ? false : true,
  // if we have a function that only throws and does not return anything,
  // we need to type check it and return a NonEmptyString since it is wrapped
  // and will return the error
  FinalRet1 extends [ErrorTypesWithoutInvalid] extends [never]
    ? never
    : [AwaitedRet] extends never
      ? TypedError<NonEmptyString, true> | undefined
      : // if the function we are trying to wrap has an invalid error type,
        // we mark it as a never type so the end developer knows that they need
        // to fix the error type
        // otherwise we return the set of return types we have for the function
        | NonErrorTypes
          // if the function is trying to return an key with error
          | (HardcodedErrors extends never | undefined
              ? never
              : HardcodedErrors)
          | TypedError<NonEmptyString, true>,
  FinalRet extends IsPromise extends true ? Promise<FinalRet1> : FinalRet1,
>(
  fn: (firstArgs: ErrorCallback, ...a: args) => Ret,
) => {
  return (...args: args): FinalRet => {
    const handleError = (e: unknown) => {
      const rawError = parseTryCatchError(e) as TypedError<
        NonEmptyString,
        false,
        any
      >['error']
      rawError.extraData = {}
      rawError.wasThrown = false
      return { error: rawError } as any
    }
    try {
      if (fn.constructor.name === 'AsyncFunction') {
        return (fn(errorCallback as ErrorCallback, ...args) as any)
          .then((res: any) => res as any)
          .catch((e: unknown) => handleError(e))
      }
      return fn(errorCallback as ErrorCallback, ...args) as any
    } catch (e) {
      return handleError(e)
    }
  }
}

type FromErrorStringToTypedError<
  T extends
    | string
    | { error: string; extraData?: Record<string, any> }
    | TypedError<string, any, any>,
> = T extends string
  ? T extends ''
    ? never
    : TypedError<T>
  : T extends { error: infer J }
    ? J extends ''
      ? never
      : T extends { __isTypedError: true }
        ? T
        : T extends { error: infer J }
          ? J extends string
            ? J extends ''
              ? never
              : T extends { extraData: infer K }
                ? K extends Record<string, any>
                  ? TypedError<J, false, K>
                  : never
                : TypedError<J>
            : T
          : never
    : never

type BlockEmptyString<T> = T extends '' ? never : T

type IsGenericString<T> = T extends string
  ? string extends T
    ? true // `T` is exactly `string`
    : false // `T` is a string literal
  : false // `T` is not a string

type BlockGenericString<T> =
  IsGenericString<T> extends false
    ? T
    : IsGenericString<T> extends true
      ? never
      : IsGenericString<T> extends boolean
        ? never
        : T

type IsGenericErrorString<T> = T extends { error: string }
  ? IsGenericString<T['error']>
  : false

type BlockGenericErrorString<T> =
  IsGenericErrorString<T> extends false
    ? T
    : IsGenericErrorString<T> extends true
      ? never
      : IsGenericErrorString<T> extends boolean
        ? never
        : T

type C<T> = T & { __isCustomEWReturnType?: never }

export type WithEW<
  T,
  Errors extends
    | string
    | { error: string; extraData?: Record<string, any> }
    | TypedError<string, any, any> = NonEmptyString,
  ValidErrors extends FromErrorStringToTypedError<
    BlockGenericErrorString<BlockGenericString<Errors>>
  > = FromErrorStringToTypedError<
    BlockGenericErrorString<BlockGenericString<Errors>>
  >,
> = [ValidErrors] extends [never]
  ? { __invalidCustomEWReturnType: true }
  :
      | (T extends void ? undefined : T extends null ? null : C<T>)
      | ValidErrors
      | TypedError<NonEmptyString, true>

/**
 * A helper type to get the return type errors of a function.
 *
 * This can be useful when calling multiple levels of enwrap with explicit
 * return types.
 */
export type GetReturnTypeErrors<
  T extends (...args: any[]) => any,
  AwaitedT = Awaited<ReturnType<T>>,
> = AwaitedT extends TypedError<any, any, any> ? AwaitedT : never
