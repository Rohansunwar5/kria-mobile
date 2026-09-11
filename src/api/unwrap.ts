/**
 * `next(response)` hands the whole `SuccessResponse` over as the body's `data`,
 * and that carries its own `.data`, so the payload sits two levels below the
 * body and three below the axios response. A few routes answer one level
 * shallower, which is what the `lvl2` fallback is for.
 *
 * Returns `null` — never `undefined` — when there is no payload, so callers
 * pick their own empty value with `??`.
 *
 * ponytail: `T` defaults to `any` so the eleven call-site-compatible copies
 * this replaced keep compiling untouched. Pass the type explicitly in new code
 * (`unwrap<Foo[]>(res)`); tighten the default to `unknown` once every caller
 * does.
 */
export function unwrap<T = any>(res: unknown): T {
  const lvl1 = (res as { data?: unknown } | null)?.data;
  const lvl2 = (lvl1 as { data?: unknown } | null)?.data;
  const lvl3 = (lvl2 as { data?: unknown } | null)?.data;
  return (lvl3 ?? lvl2 ?? null) as T;
}
