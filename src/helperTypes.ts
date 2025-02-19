/**
 * This is a helper type to make type checking easier for error handling
 *
 * While the type technically requires a space, in practice with the below
 * code, it's actual requirements are to make sure the string is not empty.
 *
 * For example, 'hi' is a valid NonEmptyString, but '' is not.
 *
 * **DO NOT USE THIS TYPE DIRECTLY - INTERNAL USE ONLY**
 */
export type NonEmptyString = `${string} ${string}` & { __nonEmptyString: never }

/**
 * This is a internal type that is used to create the TypedError type.
 *
 * We do this so the auto-complete looks better in the IDE.
 */
type TypedErrorValue<
  M extends string extends infer J ? (J extends '' ? never : J) : never,
  wasThrown extends boolean = false,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  ExtraData extends Record<string, any> | never = never,
> = Omit<Error, 'message'> & {
  __isTypedErrorValue: never
  message: M
  wasThrown: wasThrown
} & ([ExtraData] extends [never]
    ? { extraData?: never }
    : keyof ExtraData extends never
      ? { extraData?: never }
      : { extraData: ExtraData })

/**
 * An error type that includes a non-empty string
 *
 * We don't use the extends/class setup since it will create a new error
 * that may break other custom errors that the end user's application will
 * throw. We just patch those errors
 */
export type TypedError<
  M extends string extends infer J ? (J extends '' ? never : J) : never,
  wasThrown extends boolean = M extends NonEmptyString ? true : false,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  ExtraData extends Record<string, any> | never = never,
> = {
  __isTypedError: never
  error: TypedErrorValue<M, wasThrown, ExtraData>
}

/**
 * This allows us to add an extra error property to primitive types, without
 * casting all the primitive types as Object types and showing their prototype
 * methods in the IDE type description.
 */
export type WithNoError<T = any> = T & { error?: never }
