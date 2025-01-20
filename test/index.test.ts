import { describe, expect, expectTypeOf, test } from 'vitest'

import {
  __TEST_ONLY,
  type __TEST_ONLY as TEST_ONLY,
  ew,
  type GetReturnTypeErrors,
  type TypedError,
  typedErrorToSentry,
  type WithEW,
} from '../src/index'

type NonEmptyString = TEST_ONLY['NonEmptyString']

type WithNoError<T> = T & { error?: never }

const { getParsedStack } = __TEST_ONLY

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

  test('return undefined or error', () => {
    const res = ew((err) => {
      if (Math.random() > 100) {
        return err('error')
      }
      return undefined
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<
      undefined | TypedError<NonEmptyString> | TypedError<'error'>
    >()

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

  test('return null or error', () => {
    const res = ew((err) => {
      if (Math.random() > 100) {
        return err('error')
      }
      return null
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<
      null | TypedError<NonEmptyString> | TypedError<'error'>
    >()

    if (res2?.error) {
      expect(1).toBe(2)
      return
    }

    expect(res2).toEqual(null)
  })

  test('return void', () => {
    const res = ew(() => {
      return
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<undefined | TypedError<NonEmptyString>>()
  })

  test('return void or error', () => {
    const res = ew((err) => {
      if (Math.random() > 100) {
        return err('error')
      }
      return
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<
      undefined | TypedError<NonEmptyString> | TypedError<'error'>
    >()
  })

  test('return void using WithEW', () => {
    const res = ew((err): WithEW<void, 'errorStr'> => {
      if (Math.random() > 100) {
        return
      }
      if (Math.random() > 100) {
        return err('errorStr')
      }
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<
      TypedError<NonEmptyString> | TypedError<'errorStr'> | undefined
    >()
  })

  test('non-return void using WithEW', () => {
    const res = ew((err): WithEW<void, 'error123'> => {
      if (Math.random() > 100) {
        return err('error123')
      }
      noOp(1)
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<
      TypedError<'error123'> | TypedError<NonEmptyString> | undefined
    >()
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
      if (Math.random() > 100) {
        return 123
      }
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
      if (Math.random() > 100) {
        return 123
      }
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
      if (Math.random() > 100) {
        return 123
      }
      return { error: 'err2' }
    })

    const res2 = res()
    // don't allow access to property without error check
    // @ts-expect-error can't access type on never
    noOp(res2.a)

    expectTypeOf(res2).toEqualTypeOf<never>()
  })

  test('incorrectly return err function', () => {
    const res = ew((err) => {
      if (Math.random() > 100) {
        return err('123')
      }
      return err
    })

    const res2 = res()

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

  test('return a Date object', () => {
    const res = ew(() => {
      return new Date()
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<
      WithNoError<Date> | TypedError<NonEmptyString>
    >()
  })

  test('return a Date object deep in an object', () => {
    const res = ew(() => {
      return { a: { b: new Date() } }
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<
      | TypedError<NonEmptyString, never>
      | {
          a: { b: Date }
          error?: never | undefined
        }
    >()
  })

  // test('return a Date object in extra data', () => {
  //   const res = ew((err) => {
  //     return err('error', { pizza: new Date() })
  //   })
  //   const res2 = res()

  //   expectTypeOf(res2).toEqualTypeOf<
  //     TypedError<'error', { pizza: Date }> | TypedError<NonEmptyString>
  //   >()
  // })

  test('return a function', () => {
    const res = ew(() => {
      return () => {
        return null
      }
    })
    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<
      TypedError<NonEmptyString, never> | WithNoError<() => null>
    >()
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

    expect(getParsedStack(res2?.rawError)?.lineNumber).toBe('428')

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
      expect(getParsedStack(res2.rawError)?.lineNumber).toBe('517')
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

  test('multi-function using WithEW', () => {
    const res = ew(
      (
        err,
      ): WithEW<
        { a: number },
        'deep-error-str' | { error: 'deep-error'; extraData: { pizza: 'pie' } }
      > => {
        return err('deep-error', { pizza: 'pie' })
      },
    )

    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<
      | TypedError<'deep-error-str'>
      | TypedError<'deep-error', { pizza: 'pie' }>
      | TypedError<NonEmptyString>
      | WithNoError<{ a: number }>
    >()

    const res3 = ew(
      (): WithEW<
        { b: number },
        { error: 'deep-error'; extraData: { pizza: 'pie' } } | 'deep-error-str'
      > => {
        const resInner = res()
        if (resInner.error) {
          return resInner
        }
        return { b: 1 }
      },
    )

    const res4 = res3()

    expectTypeOf(res4).toEqualTypeOf<
      | WithNoError<{ b: number }>
      | TypedError<'deep-error', { pizza: 'pie' }>
      | TypedError<'deep-error-str'>
      | TypedError<NonEmptyString>
    >()
  })

  test('multi-function using WithEW with attempt to throw away extra data', () => {
    const res = ew(
      (
        err,
      ): WithEW<
        { a: number },
        | 'deep-error-str'
        | 'deep-error'
        | { error: 'deep-error'; extraData: { pizza: 'pie' } }
      > => {
        return err('deep-error', { pizza: 'pie' })
      },
    )

    const res2 = res()

    expectTypeOf(res2).toEqualTypeOf<
      | TypedError<'deep-error-str'>
      | TypedError<'deep-error'>
      | TypedError<'deep-error', { pizza: 'pie' }>
      | TypedError<NonEmptyString>
      | WithNoError<{ a: number }>
    >()

    // this is a test to make sure that we can not throw away extra data
    // if we are returning an error
    const res5 = ew(
      (): WithEW<
        { b: number },
        'deep-error21' | 'deep-error' | 'deep-error-str'
      > => {
        const resInner = res()
        if (resInner.error) {
          // @ts-expect-error throwing away extra data
          return resInner
        }
        return { b: 1 }
      },
    )

    const res6 = res5()

    // the type will be valid since we trust WithEW, but typescript will
    // complain about the extra data being thrown away above in res5
    expectTypeOf(res6).toEqualTypeOf<
      | WithNoError<{ b: number }>
      | TypedError<'deep-error-str'>
      | TypedError<'deep-error'>
      | TypedError<'deep-error21'>
      | TypedError<NonEmptyString>
    >()
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
      expect(getParsedStack(res2.rawError)?.lineNumber).toBe('653')
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
      | WithNoError<[1, 2, 'hey']>
      | TypedError<'math-random-error'>
      | TypedError<NonEmptyString>
    >()

    if (res2.error) {
      expect(1).toBe(2)
      return
    }

    expectTypeOf(res2).toEqualTypeOf<WithNoError<[1, 2, 'hey']>>()
  })

  test('return array', () => {
    const res = ew(() => {
      return Array.from({ length: 10 }, (_, i) => i)
    })

    const res2 = res()
    expectTypeOf(res2).toEqualTypeOf<
      WithNoError<number[]> | TypedError<NonEmptyString>
    >()

    if (res2.error) {
      expect(1).toBe(2)
      return
    }

    expectTypeOf(res2).toEqualTypeOf<WithNoError<number[]>>()
  })

  test('allow settings explicit return type with error string', () => {
    // it's import to notice that we are setting any explicit error return
    // types, but we do not need to set the generic TypedError<NonEmptyString>
    // type, which is nice
    type ReturnType = { pizza: 'very good' | 'bad'; x: number }
    const res = ew(
      (
        err,
        num: number,
      ): WithEW<
        ReturnType,
        { error: "pizza doesn't exist"; extraData: { x: number } }
      > => {
        // this can never happen, but typescript doesn't know that
        if (Math.random() > 100) {
          return err("pizza doesn't exist", { x: 1 })
        }
        return { pizza: 'very good', x: num }
      },
    )

    const res2 = res(1)
    expectTypeOf(res2).toEqualTypeOf<
      | WithNoError<{
          pizza: 'very good' | 'bad'
          x: number
        }>
      | TypedError<NonEmptyString>
      | TypedError<"pizza doesn't exist", { x: number }>
    >()

    if (res2.error) {
      expect(1).toBe(2)
      return
    }

    expect(res2.pizza).toBe('very good')
  })

  test('allow settings explicit return type with error object - no extra data', () => {
    // it's import to notice that we are setting any explicit error return
    // types, but we do not need to set the generic TypedError<NonEmptyString>
    // type, which is nice
    type ReturnType = {
      deep: { x: string }
      pizza: 'very good' | 'bad'
      x: number
    }
    const res = ew(
      (
        err,
        num: number,
      ): WithEW<ReturnType, { error: "pizza doesn't exist" }> => {
        // this can never happen, but typescript doesn't know that
        if (Math.random() > 100) {
          return err("pizza doesn't exist")
        }
        return { deep: { x: 'hey' }, pizza: 'very good', x: num }
      },
    )

    const res2 = res(1)
    expectTypeOf(res2).toEqualTypeOf<
      | WithNoError<{
          deep: { x: string }
          pizza: 'very good' | 'bad'
          x: number
        }>
      | TypedError<NonEmptyString>
      | TypedError<"pizza doesn't exist">
    >()

    if (res2.error) {
      expect(1).toBe(2)
      return
    }

    res2.pizza = 'bad'
    res2.deep.x = 'bad'

    expect(res2.pizza).toBe('bad')
    expect(res2.deep.x).toBe('bad')
  })

  test('allow settings explicit readonly return type with error object - with extra data', () => {
    // one important but to notice is that we can't control
    type ReturnType = Readonly<{
      deep: Readonly<{ x: string }>
      pizza: 'very good' | 'bad'
      x: number
    }>

    const res = ew(
      (
        err,
        num: number,
      ): WithEW<
        ReturnType,
        { error: "pizza doesn't exist"; extraData: { x: number } }
      > => {
        // this can never happen, but typescript doesn't know that
        if (Math.random() > 100) {
          return err("pizza doesn't exist", { x: num })
        }
        return { deep: { x: 'hey' }, pizza: 'very good', x: num }
      },
    )

    const res2 = res(1)
    expectTypeOf(res2).toEqualTypeOf<
      | WithNoError<
          Readonly<{
            deep: Readonly<{ x: string }>
            pizza: 'very good' | 'bad'
            x: number
          }>
        >
      | TypedError<NonEmptyString>
      | TypedError<"pizza doesn't exist", { x: number }>
    >()

    if (res2.error) {
      expect(1).toBe(2)
      return
    }

    expectTypeOf(res2).toEqualTypeOf<
      WithNoError<
        Readonly<{
          deep: Readonly<{ x: string }>
          pizza: 'very good' | 'bad'
          x: number
        }>
      >
    >()

    // @ts-expect-error can't assign to read-only property
    res2.pizza = 'bad'
    // @ts-expect-error can't assign to read-only property
    res2.deep.x = 'bad'

    // we don't control that the value is immutable, only that it's readonly
    // if someone changes the value, we can't do anything about it
    expect(res2.pizza).toBe('bad')
    expect(res2.deep.x).toBe('bad')
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

    expect(getParsedStack(res3?.rawError)?.lineNumber).toBe('962')

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

  test('throw string', () => {
    const res = ew(() => {
      // eslint-disable-next-line no-throw-literal
      throw 'error'
    })

    const res2 = res()

    if (res2?.error) {
      expect(res2.error).toBe('error')
      return
    }
    expect(1).toBe(2)
  })

  test('throw object', () => {
    const res = ew(() => {
      // eslint-disable-next-line no-throw-literal
      throw { error: 'error' }
    })

    const res2 = res()

    if (res2?.error) {
      expect(res2.error).toBe('{"error":"error"}')
      return
    }
    expect(1).toBe(2)
  })

  test('throw number', () => {
    const res = ew(() => {
      // eslint-disable-next-line no-throw-literal
      throw 123
    })

    const res2 = res()

    if (res2?.error) {
      expect(res2.error).toBe('123')
      return
    }
    expect(1).toBe(2)
  })

  test('throw boolean', () => {
    const res = ew(() => {
      // eslint-disable-next-line no-throw-literal
      throw true
    })

    const res2 = res()

    if (res2?.error) {
      expect(res2.error).toBe('true')
      return
    }
    expect(1).toBe(2)
  })

  test('throw undefined', () => {
    const res = ew(() => {
      // eslint-disable-next-line no-throw-literal
      throw undefined
    })

    const res2 = res()

    if (res2?.error) {
      expect(res2.error).toBe('undefined')
      return
    }
    expect(1).toBe(2)
  })

  test('throw empty string', () => {
    const res = ew(() => {
      // eslint-disable-next-line no-throw-literal
      throw ''
    })

    const res2 = res()

    if (res2?.error) {
      expect(res2.error).toBe('e')
      return
    }
    expect(1).toBe(2)
  })
})

describe('GetReturnTypeErrors', () => {
  test('basic', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const res = ew(() => {
      // eslint-disable-next-line no-throw-literal
      throw 1
    })

    type x = GetReturnTypeErrors<typeof res>

    expectTypeOf<x>().toEqualTypeOf<TypedError<NonEmptyString>>()
  })

  test('with custom error - no extra data', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const res = ew((err) => {
      return err('error')
    })

    type errorReturnType = GetReturnTypeErrors<typeof res>

    expectTypeOf<errorReturnType>().toEqualTypeOf<
      TypedError<'error'> | TypedError<NonEmptyString>
    >()
  })

  test('with custom error - with extra data', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const res = ew((err) => {
      return err('error', { userID: 123 })
    })

    type errorReturnType = GetReturnTypeErrors<typeof res>

    expectTypeOf<errorReturnType>().toEqualTypeOf<
      TypedError<'error', { userID: 123 }> | TypedError<NonEmptyString>
    >()
  })

  test('with string return type', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const res = ew(() => {
      return 'pizza'
    })

    type errorReturnType = GetReturnTypeErrors<typeof res>

    expectTypeOf<errorReturnType>().toEqualTypeOf<TypedError<NonEmptyString>>()
  })

  test('with array return type', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const res = ew(() => {
      return [1, 2, 3]
    })

    type errorReturnType = GetReturnTypeErrors<typeof res>

    expectTypeOf<errorReturnType>().toEqualTypeOf<TypedError<NonEmptyString>>()
  })

  test('with object return type', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const res = ew(() => {
      return { pizza: 'very good' }
    })

    type errorReturnType = GetReturnTypeErrors<typeof res>

    expectTypeOf<errorReturnType>().toEqualTypeOf<TypedError<NonEmptyString>>()
  })

  test('with no return type', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const res = ew(() => {
      const x = 1
      noOp(x)
    })

    type errorReturnType = GetReturnTypeErrors<typeof res>

    expectTypeOf<errorReturnType>().toEqualTypeOf<TypedError<NonEmptyString>>()
  })

  test('with promise return type', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const res = ew(async (err) => {
      if (Math.random() > 100) {
        return err('error123', { x: 123 })
      }
      if (Math.random() > 100) {
        return err('error456')
      }
      return 'pizza'
    })

    type errorReturnType = GetReturnTypeErrors<typeof res>

    expectTypeOf<errorReturnType>().toEqualTypeOf<
      | TypedError<NonEmptyString>
      | TypedError<'error123', { x: 123 }>
      | TypedError<'error456'>
    >()
  })

  test('use a sub-error', () => {
    const res = ew((err) => {
      return err('error', { userID: 123 })
    })

    type errorReturnType = GetReturnTypeErrors<typeof res>

    expectTypeOf<errorReturnType>().toEqualTypeOf<
      TypedError<'error', { userID: 123 }> | TypedError<NonEmptyString>
    >()

    const res2 = ew(
      (err): WithEW<{ b: 1 }, errorReturnType | TypedError<'error'>> => {
        const resInner = res()
        if (resInner.error) {
          return resInner
        }
        if (Math.random() > 100) {
          return err('error')
        }
        if (Math.random() > 100) {
          return err('error', { userID: 123 })
        }
        if (Math.random() > 100) {
          // @ts-expect-error invalid extra data
          return err('error', { userID: 456 })
        }
        return { b: 1 }
      },
    )

    const res3 = res2()

    expectTypeOf(res3).toEqualTypeOf<
      | WithNoError<{ b: 1 }>
      | errorReturnType
      | TypedError<'error', { userID: 123 }>
      | TypedError<'error'>
    >()

    type errorReturnType2 = GetReturnTypeErrors<typeof res2>

    expectTypeOf<errorReturnType2>().toEqualTypeOf<
      | errorReturnType
      | TypedError<'error'>
      | TypedError<'error', { userID: 123 }>
    >()
  })
})

describe('typedErrorToSentry', () => {
  test('basic', () => {
    const res = ew((err) => {
      return err('error', { userID: 123 })
    })
    const sentryRes = typedErrorToSentry(res())

    expectTypeOf(sentryRes).toEqualTypeOf<{
      errorObj: Error
      extraData: { userID: 123 } | undefined
      message: string
    }>()

    expect(sentryRes.message).toBe('error')
    expect(sentryRes.extraData?.userID).toBe(123)
  })
})
