import { describe, expect, expectTypeOf, test } from 'vitest'

import {
  __TEST_ONLY_getParsedStack as getParsedStack,
  type __TEST_ONLY_NON_EMPTY_STRING as NonEmptyString,
  ew,
  type TypedError,
  TypedErrorToSentry,
  WithNoError,
} from '../src/index'

const noOp = <T extends any[]>(...args: T) => args

describe('ew', () => {
  test('adds two numbers together', () => {
    const res = ew((err, a: number, b: number) => {
      // this can never happen, but typescript doesn't know that
      if (Math.random() > 100) {
        return err('error')
      }
      return a + b
    })
    const res2 = res(1, 2)

    expectTypeOf(res2).toEqualTypeOf<
      WithNoError<number> | TypedError<NonEmptyString> | TypedError<'error'>
    >()

    // @ts-expect-error can't access property before error check
    noOp(res2.toExponential())
    if (res2.error) {
      expect(1).toBe(2)
      return
    }
    expectTypeOf(res2.error).toEqualTypeOf<undefined>()
    const isNumber = (_: number) => {}
    isNumber(res2)
  })

  test('return string', () => {
    const res = ew(() => {
      return '123'
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<
      WithNoError<string> | TypedError<NonEmptyString>
    >()

    expect(res2).toEqual('123')
  })

  test('return boolean', () => {
    const res = ew(() => {
      return true
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<
      WithNoError<boolean> | TypedError<NonEmptyString>
    >()

    expect(res2).toEqual(true)
  })

  test('return undefined', () => {
    const res = ew(() => {
      return undefined
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<undefined | TypedError<NonEmptyString>>()

    if (res2?.error) {
      expect(1).toBe(2)
      return
    }

    expect(res2).toEqual(undefined)
  })

  test('return null', () => {
    const res = ew(() => {
      return null
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<null | TypedError<NonEmptyString>>()

    if (res2?.error) {
      expect(1).toBe(2)
      return
    }

    expect(res2).toEqual(null)
  })

  test('return object', () => {
    const res = ew(() => {
      return { a: 1 }
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<
      { a: 1; error?: never } | TypedError<NonEmptyString>
    >()

    if (res2.error) {
      expectTypeOf(res2).toHaveProperty('error')
      expect(1).toBe(2)
      return
    }
    expectTypeOf(res2.error).toEqualTypeOf<undefined>()
    expect(res2).toEqual({ a: 1 })
  })

  test('try to return error object', () => {
    const res = ew(() => {
      return { error: new Error('error') }
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<never>()

    // @ts-expect-error can't access type on never
    if (res2.error) {
      expect(1).toBe(1)
      return
    }
  })

  test('try to return non error string', () => {
    const res = ew(() => {
      return { error: 123, pizza: 123 }
    })

    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<never>()

    // @ts-expect-error can't access type on never
    if (res2.error) {
      expect(1).toBe(1)
      return
    }
    // @ts-expect-error can't access type on never
    noOp(res2.pizza)
  })

  test('try to return only an error string', () => {
    const res = ew(() => {
      return { error: 'err2' }
    })

    const res2 = res()
    // don't allow access to property without error check
    // @ts-expect-error can't access type on never
    noOp(res2.a)

    expectTypeOf(res2).toEqualTypeOf<never>()
  })

  test('try to return an optional error string', () => {
    const res = ew(() => {
      // this can never happen, but typescript doesn't know that
      if (Math.random() > 100) {
        return { pizza: 123 }
      }
      return { error: 'err2' }
    })

    const res2 = res()
    // don't allow access to property without error check
    // @ts-expect-error can't access type on never
    noOp(res2.a)

    expectTypeOf(res2).toEqualTypeOf<never>()
  })

  test('edit object', () => {
    const res = ew((_, a: { a: number }) => {
      return { ...a, b: 2 }
    })
    const res2 = res({ a: 1 })

    expectTypeOf(res2).toEqualTypeOf<
      { a: number; b: 2; error?: never } | TypedError<NonEmptyString>
    >()

    if (res2.error) {
      // @ts-expect-error can't access non-error property
      noOp(res2.a)
      expect(1).toBe(2)
      noOp(res2)
      return
    }
    expectTypeOf(res2.error).toEqualTypeOf<undefined>()
    noOp(res2.b)
    res2.a = 200
    expect(res2).toEqual({ a: 200, b: 2 })
  })

  test('return error or object', () => {
    const res = ew((err) => {
      // this can never happen, but typescript doesn't know that
      if (Math.random() > 100) {
        return { a: 123 }
      }
      return err('error')
    })

    const res2 = res()
    // don't allow access to property without error check
    // @ts-expect-error can't access non-error property
    noOp(res2.a)

    expectTypeOf(res2).toEqualTypeOf<
      | TypedError<'error'>
      | TypedError<NonEmptyString>
      | { a: 123; error?: never }
    >()

    if (res2.error === 'error') {
      const hasErrorString = (_: 'error') => {}
      hasErrorString(res2.error)
      return
    }
    // don't allow access to property without error check
    // @ts-expect-error can't access non-error property
    noOp(res2.a)

    expectTypeOf(res2).toEqualTypeOf<
      TypedError<NonEmptyString> | { a: 123; error?: never }
    >()

    if (res2.error) {
      // @ts-expect-error can't access non-error property
      noOp(res2.a)
      expect(1).toBe(2)
      return
    }
    expectTypeOf(res2.error).toEqualTypeOf<undefined>()
    noOp(res2.a)
  })

  test('no return', () => {
    const res = ew(() => {
      noOp(1)
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<TypedError<NonEmptyString> | undefined>()

    // if we don't have a return type, we need to check for nullish
    // vs being able to access the optional error property in order for
    // typescript to narrow the type
    if (res2) {
      expectTypeOf(res2).toEqualTypeOf<TypedError<NonEmptyString>>()
      expect(1).toBe(2)
      return
    }

    expectTypeOf(res2).toEqualTypeOf<undefined>()
  })

  test('throws error', () => {
    const res = ew(() => {
      noOp(123)
      throw new Error('error')
    })
    const res2 = res()

    expect(getParsedStack(res2?.rawError)?.lineNumber).toBe('269')

    expectTypeOf(res2).toEqualTypeOf<TypedError<NonEmptyString> | undefined>()

    // if we don't have a return type, we need to check for nullish
    // vs being able to access the optional error property in order for
    // typescript to narrow the type
    if (res2) {
      expectTypeOf(res2).toEqualTypeOf<TypedError<NonEmptyString>>()
      expect(res2.error).toBe('error')
      return
    }

    // For some reason, we can't get res2 down to only an undefined type
    // it's still `{error: NonEmptyString} | undefined` even though we've
    // checked for the error property above
    expectTypeOf(res2).toEqualTypeOf<undefined>()
  })

  test('returns empty error string', () => {
    const res = ew(() => {
      return { error: '' }
    })

    const res2 = res()
    expectTypeOf(res2).toEqualTypeOf<never>()
  })

  test('multi-level return', () => {
    const res = ew(() => {
      return { a: { b: { c: 1 } } }
    })

    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<
      { a: { b: { c: 1 } }; error?: never } | TypedError<NonEmptyString>
    >()

    // make sure we can't access error if we don't have it
    // @ts-expect-error can't access error property
    const { a, error } = res()
    if (error) {
      expect(1).toBe(2)
      return
    }
    const isNumber = (_: number) => {}
    isNumber(a.b.c)
  })

  test('try to return error string', () => {
    const res = ew(() => {
      // this can never happen, but typescript doesn't know that
      if (Math.random() > 100) {
        return 'error1' as NonEmptyString
      }
      return { a: 1 }
    })
    const res2 = res()
    expectTypeOf(res2).toEqualTypeOf<never>()
  })

  test('incorrect sub-error return', () => {
    const res = ew((err) => {
      return err('deep-error')
    })

    // if the end developer returns the error string, the return type should be
    // never so that they know they've made a mistake

    const res2 = ew(() => {
      const resInner = res()
      if (resInner.error) {
        return resInner.error
      }
      return { a: 1 }
    })

    const res3 = res2()

    expectTypeOf(res3).toEqualTypeOf<never>()
  })

  test('multi-function with new object', () => {
    const res = ew((err) => {
      return err('deep-error')
    })

    const topLevelRes = ew(() => {
      const resInner = res()
      if (resInner.error) {
        return resInner
      }
      // noOp(resInner.a);
      return { a: 1 }
    })

    const res2 = topLevelRes()

    expectTypeOf(res2).toEqualTypeOf<
      | { a: 1; error?: never }
      | TypedError<'deep-error'>
      | TypedError<NonEmptyString>
    >()

    if (res2.error) {
      expect(getParsedStack(res2.rawError)?.lineNumber).toBe('358')
      expectTypeOf(res2).toEqualTypeOf<
        TypedError<NonEmptyString> | TypedError<'deep-error'>
      >()
      expect(res2.error).toBe('deep-error')
      return
    }

    expectTypeOf(res2.error).toEqualTypeOf<undefined>()
    expectTypeOf(res2).toEqualTypeOf<{ a: 1; error?: never }>()

    noOp(res2.a)
    const isNumber = (_: number) => {}
    isNumber(res2.a)
  })

  test('multi-function with sub-object', () => {
    const res = ew((err) => {
      return err('deep-error')
    })

    const topLevelRes = ew(() => {
      const resInner = res()
      if (resInner.error) {
        return resInner
      }
      return { a: 1 }
    })

    const res2 = topLevelRes()

    expectTypeOf(res2).toEqualTypeOf<
      | { a: 1; error?: never }
      | TypedError<NonEmptyString>
      | TypedError<'deep-error'>
    >()

    if (res2.error) {
      expectTypeOf(res2).toEqualTypeOf<
        TypedError<NonEmptyString> | TypedError<'deep-error'>
      >()
      expect(getParsedStack(res2.rawError)?.lineNumber).toBe('397')
      expect(res2.error).toBe('deep-error')
      return
    }

    expectTypeOf(res2.error).toEqualTypeOf<undefined>()
    expectTypeOf(res2).toEqualTypeOf<{ a: 1; error?: never }>()

    noOp(res2.a)
    const isNumber = (_: number) => {}
    isNumber(res2.a)
  })

  test('return tuple', () => {
    const res = ew((err) => {
      // this can never happen, but typescript doesn't know that
      if (Math.random() > 100) {
        return err('math-random-error')
      }
      return [1, 2, 'hey']
    })

    const res2 = res()
    expectTypeOf(res2).toEqualTypeOf<
      | ([1, 2, 'hey'] & { error?: never })
      | TypedError<'math-random-error'>
      | TypedError<NonEmptyString>
    >()

    if (res2.error) {
      expect(1).toBe(2)
      return
    }

    expectTypeOf(res2).toEqualTypeOf<[1, 2, 'hey'] & { error?: never }>()
  })

  test('return array', () => {
    const res = ew(() => {
      return Array.from({ length: 10 }, (_, i) => i)
    })

    const res2 = res()
    expectTypeOf(res2).toEqualTypeOf<
      (number[] & { error?: never }) | TypedError<NonEmptyString>
    >()

    if (res2.error) {
      expect(1).toBe(2)
      return
    }

    expectTypeOf(res2).toEqualTypeOf<number[] & { error?: never }>()
  })

  test('allow settings explicit return type', () => {
    // it's import to notice that we are setting any explicit error return
    // types, but we do not need to set the generic TypedError<NonEmptyString>
    // type, which is nice
    type PizzaError = TypedError<"pizza doesn't exist">
    type ReturnType = { pizza: 'very good' | 'bad'; x: number }
    const res = ew((err): ReturnType | PizzaError => {
      // this can never happen, but typescript doesn't know that
      if (Math.random() > 100) {
        return err("pizza doesn't exist")
      }
      return { pizza: 'very good', x: 1 }
    })

    const res2 = res()
    expectTypeOf(res2).toEqualTypeOf<
      | {
          error?: never
          pizza: 'very good' | 'bad'
          x: number
        }
      | TypedError<NonEmptyString>
      | TypedError<"pizza doesn't exist">
    >()

    if (res2.error) {
      expect(1).toBe(2)
      return
    }

    expect(res2.pizza).toBe('very good')
  })

  test('allow returning extra data with the error', () => {
    const res = ew((err) => {
      return err('error', { thisIsAnItemOfExtraData: 123 })
    })

    const res2 = res()

    expectTypeOf(res2.rawError.extraData).toEqualTypeOf<
      { thisIsAnItemOfExtraData: 123 } | undefined
    >()

    expectTypeOf(res2).toEqualTypeOf<
      | TypedError<'error', { thisIsAnItemOfExtraData: 123 }>
      | TypedError<NonEmptyString>
    >()

    if (res2.error === 'error') {
      expect(res2.rawError.extraData.thisIsAnItemOfExtraData).toBe(123)
      return
    }
  })

  test('allow returning extra data with the error multi-level', () => {
    const res = ew((err) => {
      return err('error', { userID: 123 })
    })

    const res2 = ew((_) => {
      const resInner = res()
      if (resInner.error) {
        return resInner
      }
      return { a: 1 }
    })

    const res3 = res2()
    expectTypeOf(res3).toEqualTypeOf<
      | { a: 1; error?: never }
      | TypedError<NonEmptyString>
      | TypedError<'error', { userID: 123 }>
    >()

    if (res3.error === 'error') {
      expect(res3.rawError.extraData.userID).toBe(123)
      return
    }
  })

  test('allow async functions', async () => {
    const res = ew(async (err, a: number, b: number) => {
      // this can never happen, but typescript doesn't know that
      if (Math.random() > 100) {
        return err('error')
      }
      return a + b
    })
    const res2 = res(1, 2)

    expectTypeOf(res2).toEqualTypeOf<
      Promise<
        WithNoError<number> | TypedError<NonEmptyString> | TypedError<'error'>
      >
    >()

    const res3 = await res2

    expectTypeOf(res3).toEqualTypeOf<
      WithNoError<number> | TypedError<NonEmptyString> | TypedError<'error'>
    >()

    // @ts-expect-error can't access property before error check
    noOp(res3.toExponential())
    if (res3.error) {
      expect(1).toBe(2)
      return
    }
    expectTypeOf(res3.error).toEqualTypeOf<undefined>()
    const isNumber = (_: number) => {}
    isNumber(res3)
  })

  test('throws async error', async () => {
    const res = ew(async () => {
      noOp(123)
      throw new Error('error')
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<
      Promise<TypedError<NonEmptyString> | undefined>
    >()

    const res3 = await res2

    expectTypeOf(res3).toEqualTypeOf<TypedError<NonEmptyString> | undefined>()

    expect(getParsedStack(res3?.rawError)?.lineNumber).toBe('592')

    // if we don't have a return type, we need to check for nullish
    // vs being able to access the optional error property in order for
    // typescript to narrow the type
    if (res3) {
      expectTypeOf(res3).toEqualTypeOf<TypedError<NonEmptyString>>()
      expect(res3.error).toBe('error')
      return
    }

    // For some reason, we can't get res2 down to only an undefined type
    // it's still `{error: NonEmptyString} | undefined` even though we've
    // checked for the error property above
    expectTypeOf(res3).toEqualTypeOf<undefined>()
  })
})

describe('TypedErrorToSentry', () => {
  test('basic', () => {
    const res = ew((err) => {
      return err('error', { userID: 123 })
    })
    const sentryRes = TypedErrorToSentry(res())

    expectTypeOf(sentryRes).toEqualTypeOf<{
      errorObj: Error
      extraData: { userID: 123 } | undefined
      message: string
    }>()

    expect(sentryRes.message).toBe('error')
    expect(sentryRes.extraData?.userID).toBe(123)
  })
})
