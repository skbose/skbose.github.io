---
title: "The Aha Moments We Risk Losing"
date: 2026-10-27
tags: ["python", "c", "programming", "agentic-coding"]
summary: "A tiny surprise in Python, -1 // 2, and the rabbit hole it sent me down. With toys to play with."
ShowToc: true
---

## Introduction

I was introduced to coding in my 10th standard. The language was C. It was unforgiving of mistakes, but also very much rewarding. Back then, the hardest problems were to print `*` in triangles, squares, and some weird shapes. As a school-kid, there was a joy in successfully printing a k-row triangle, and then extending the design to a diamond pattern. Boring as it sounds, the act of struggling to find the correct loop-invariant made me internalize loops. The pattern repeated in grad school: seg-faults forced me to go deeper and that's how pointers finally clicked.

{{< stars >}}

Yesterday, a tiny surprise in Python sent me down a rabbit hole. I was writing simple code to divide two integers. I expected -1 divided by 2 to be 0. Python gave me -1.

```python
-1 // 2     # -1
```

My C instincts said the result should be truncated toward zero. It wasn't a bug. It was a design choice, and going deeper into it brought back an aha moment I had almost forgotten with agentic coding.

Before I explain, check your own instincts:

{{< quiz >}}

## The Math

Back to my bug: why -1? Because -1 divided by 2 has two reasonable answers, and Python and C pick different ones.

```text
Truncate:  q =  0, r = -1    (2 * 0 + -1 = -1)
Floor:     q = -1, r =  1    (2 * -1 + 1 = -1)
```

Both satisfy the same rule. Python's `//` and `%` are a pair, and they must always satisfy:

```python
a == b * (a // b) + a % b
```

The only question is which quotient you pick when the division isn't exact.

- Floor the quotient (round toward negative infinity), and the remainder stays in the range `0 <= r < b` for positive `b`.
- Truncate the quotient (round toward zero), and the remainder takes the sign of `a`.

Neither is wrong. They are both self-consistent. But there is a deeper reason the floored version is attractive. In number theory, "mod n" is not really about computing a remainder. It is about sorting integers into groups. Two integers are congruent mod n if their difference is a multiple of n. For n = 2, that splits every integer into two groups:

```text
Evens: ..., -4, -2, 0, 2, 4, ...
Odds:  ..., -3, -1, 1, 3, 5, ...
```

Each group is an equivalence class. Everything in a class is "the same thing" as far as mod 2 is concerned. A mod function is then a representative picker: given any integer, it returns one standard member of that integer's class, by convention the one in `[0, n)`.

A well-behaved mod should return the same answer for every member of a class. Compare two members of the "odd" class, -3 and 3:

```text
Python:  -3 % 2 ->  1
Python:   3 % 2 ->  1     (same class, same answer)

C:       -3 % 2 -> -1
C:        3 % 2 ->  1     (same class, different answers)
```

Play with it. Change `n` and watch which integers C reports differently:

{{< mods >}}

The -1 isn't wrong as a congruence, since -1 and 1 are in the same class. But it is a different representative. That is why the classic odd check:

```python
n % 2 == 1
```

works for negative odd numbers in Python but fails for them in C, Java, JavaScript, and Go. The portable fix is `n % 2 != 0`.

A precision note: the textbook convention is called Euclidean division, where the remainder is always non-negative. For positive divisors, it gives exactly the same answers as floored division. They only differ when the divisor is negative. Since number theory almost always uses positive moduli, Python's `%` matches the mathematician's answer in the cases that matter most.

## A Story: The Rocket That Counted Wrong

Here is why this matters outside of puzzles. Imagine you are writing attitude-control code for a small rocket with two side thrusters. To stay balanced, the thrusters take turns: odd ticks fire the left one, even ticks fire the right one. The countdown runs from T-10 to T-0, so `th` runs from -10 to 0, and the logic could not be simpler:

```python
for th in range(-10, 1):
    if th % 2 == 1:
        fire(LEFT)
    else:
        fire(RIGHT)
```

You test it in Python and it works perfectly. Then the flight computer team ports it to C. Watch both versions run the same countdown:

{{< rocket >}}

In C, `-9 % 2` is `-1`, never `1`. Every odd tick quietly falls through to the `else` branch, so the right thruster fires on every single tick and the left one never fires. Nothing throws, nothing warns, and every test with positive numbers passes. The rocket just spins itself out of the sky. Tick the "apply the fix" box and launch again: `th % 2 != 0` is true for odd numbers of either sign, and both rockets fly.

## Different Languages, Different Choices

**Truncate toward zero** (remainder takes the sign of the dividend): C (C99 onward), C++, Java, JavaScript, Go, Rust.

**Floor** (remainder takes the sign of the divisor): Python, Ruby, Haskell (`div`/`mod`).

Many languages offer both under different names. Haskell has `div`/`mod` (floor) and `quot`/`rem` (truncate). Java has `Math.floorMod` and `Math.floorDiv` alongside `%` and `/`. Rust offers `rem_euclid` and `div_euclid` for the Euclidean flavor.

Neither camp is "wrong". Truncation has a property floor lacks: `(-a) / b` equals `-(a / b)`. Floor has a property truncation lacks: results that are consistent across the whole number line. Each is a legitimate trade-off.

Even inside Python, the choice isn't absolute. The `//` operator floors, but `int()` truncates:

```python
-5 // 2         # -3
int(-5 / 2)     # -2   (-2.5 chopped toward zero)
```

That's because `int()` is a conversion, not a division.

## Why Guido Chose Flooring

Guido van Rossum, creator of the Python programming language, explained his reasoning in a 2010 post on the Python History blog. His main argument is the pairing described above: `//` and `%` must stay consistent with each other, and flooring gives a remainder with the sign you usually want.

His practical example is Unix time. A timestamp counts seconds since 1970-01-01, and a day has 86400 seconds, so splitting a timestamp into a day and a time of day is:

```python
day, secs = divmod(t, 86400)
```

For a time before 1970, `t` is negative. Take `t = -1`, one second before the epoch:

```python
divmod(-1, 86400)    # (-1, 86399)
```

That is the day before the epoch, at second 86399: 23:59:59. Correct. With truncation you would get day 0 and second -1, which is the wrong day and an impossible time of day. Drag the slider into the past:

{{< epoch >}}

The same pattern shows up wherever values wrap around:

- **Clock hours and weekdays:** `(d - 1) % 7` always lands in 0-6.
- **Circular buffers:** `(i - 1) % n` goes from index 0 to n-1 without any special-casing. With truncating `%`, you have to write `(i - 1 + n) % n`.
- **Pixel positions and grid cells with negative coordinates:** `x // 10` puts -1 and -9 in the same cell (cell -1). With truncation, everything from -9 to 9 lands in cell 0, making that cell twice as wide as every other.

{{< grid >}}

Flooring keeps all of these working across zero without special cases.

It is not free of surprises. A commenter on Guido's post described a bug splitting integer cents into dollars and cents for negative amounts: `divmod(-150, 100)` gives `(-2, 50)`, not `(-1, -50)`. Floor semantics are not always what you want. They are a deliberate choice.

## Why C Does it Differently?

The history here is messier than you might expect.

Early C left the behavior of `/` and `%` on negative operands implementation-defined. Compilers mostly used whatever the CPU's divide instruction did. On x86, Intel's IDIV documentation states that non-integral results are truncated toward zero and the remainder takes the sign of the dividend. Fortran, an earlier and hugely influential language, also truncates. When C99 finally standardized the behavior, it picked truncation toward zero, which is what practically every implementation already did.

There is a plausible hardware reason for that default, too. The simplest way to build signed division is to remember the signs, divide the absolute values, and apply the signs at the end. That gives truncation for free. Flooring needs an extra correction when the signs differ and the remainder is non-zero.

## What Python Does on Top of the Hardware

Python didn't need to change the hardware. In fact, CPython mostly doesn't use the CPU's divide for Python ints at all. Python integers are arbitrary-precision: stored as arrays of digits with the sign kept separately. The interpreter runs its own long-division routine on the magnitudes, which naturally produces a truncated result.

Flooring is then a small fix-up. In CPython's `l_divmod`, after computing the quotient and remainder, the code checks whether the remainder's sign disagrees with the divisor's. If so, it adds the divisor to the remainder and subtracts one from the quotient.

For -5 and 2:

```text
Truncated result:   q = -2, r = -1    (remainder sign differs from divisor's)
After fix-up:       q = -3, r =  1
```

Step through it with your own numbers:

{{< fixup >}}

The identity `a == b*q + r` still holds, because subtracting 1 from `q` costs `b`, and adding `b` to `r` pays it back. Later versions added fast paths for single-digit integers, but the semantics are unchanged.

So Python pays a few extra instructions to give you floor semantics. A small, deliberate runtime cost for a cleaner `%`.

## The Bigger Point

With agentic coding, aha moments like this are rare. The details are mostly black-boxed. I would never have gone down this rabbit hole if something had silently patched my code and moved on.

This little episode is also a reminder of how the tech landscape got built. It is layers upon layers of design choices that engineers made, sometimes for reasons that no longer apply. A hardware default became a language guarantee, and decades of code now depends on it. Python needed a PEP and years of migration just to change what `/` does on integers. Part of our job is understanding the quirks we inherited and building products around them.

I don't know if the fast-moving AI world will accept me, but I still manually review code and ask Claude about every design choice before starting work. Because of this, I almost always cannot leave agents working overnight, or attempt tasks that are cognitively impossible to review for my meek human brain. I do not write the code myself, but I am in absolute control of the code that is shipped. To me, that sounds like a middle ground. Agents often surprise me with new ways to think about designs, and I often throw impossible ideas at them and watch them implement it with grace (yes, they never say no).

I started coding in C, and I have watched languages get simpler ever since. I feel fortunate to be coding in an era where the way people code is changing. It feels a bit like watching the birth of C. The future is exciting. I just hope we keep some curiosity for the rabbit holes.

## Sources and Further Reading

- Guido van Rossum, ["Why Python's Integer Division Floors"](https://python-history.blogspot.com/2010/08/why-pythons-integer-division-floors.html) (2010)
- [Hacker News discussion](https://news.ycombinator.com/item?id=39518329) of the above
- Wikipedia, ["Modulo operation"](https://en.wikipedia.org/wiki/Modulo_operation) (per-language table, floored vs. truncated vs. Euclidean)
- Daan Leijen, ["Division and Modulus for Computer Scientists"](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/divmodnote-letter.pdf)
- [SEI CERT C wiki](https://wiki.sei.cmu.edu/confluence/x/HAw-BQ), on the implementation-defined sign of `%` before C99
- [Intel IDIV (signed divide) reference](https://laruence.com/x86/IDIV.html)
- [CPython `l_divmod` fix-up](https://remotebranch.eu/Stowage/cpython/commit/113b2d7583cdbf79da18e696f299a9aca24b599b) (mirror of the CPython repo; primary source: `Objects/longobject.c`)
