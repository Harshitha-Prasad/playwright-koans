// 00 · JavaScript & TypeScript essentials
// Notes: notes/00-js-ts-essentials.md
//
// No browser in this file. Every Playwright call returns a promise, so the tool only makes
// sense once promises, await and the event loop do.

import { test, expect } from '@playwright/test';
import { todo } from '../support/koan';

/** Resolves with `value` after `ms` milliseconds. */
const later = <T>(value: T, ms = 20) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

test.describe('00 · JavaScript & TypeScript essentials', () => {
  test('an async function always returns a promise', { tag: '@diagnostic' }, async () => {
    const getPrice = async () => 3.5;

    const withoutAwait = getPrice();
    const withAwait = await getPrice();

    expect(withoutAwait instanceof Promise).toBe(todo('true or false?'));
    expect(typeof withAwait).toBe(todo("'number', 'object' or 'undefined'?"));
  });

  test('sync code first, then promise callbacks, then timers', async () => {
    const log: string[] = [];

    setTimeout(() => log.push('timer'), 0);
    Promise.resolve().then(() => log.push('promise'));
    log.push('sync');

    await later(null); // give everything time to run

    expect(log).toEqual(todo('the three entries in the order they were pushed'));
  });

  test('a forgotten await lets the test race ahead', { tag: '@diagnostic' }, async () => {
    const order = { saved: false };
    const save = async () => {
      await later(null);
      order.saved = true;
    };

    // Fix the bug. This is the single most common mistake in Playwright code.
    save();

    expect(order.saved).toBe(true);
  });

  test('forEach does not wait for async callbacks', async () => {
    const drinks = ['Espresso', 'Flat White', 'Cold Brew'];
    const fetchNameLength = (drink: string) => later(drink.length);
    const lengths: number[] = [];

    // Rewrite the loop so that every lookup has finished before the assertion runs.
    drinks.forEach(async (drink) => {
      lengths.push(await fetchNameLength(drink));
    });

    expect(lengths).toEqual([8, 10, 9]);
  });

  test('Promise.all starts everything at once', async () => {
    const log: string[] = [];
    const brew = async (drink: string, ms: number) => {
      log.push(`start ${drink}`);
      await later(null, ms);
      log.push(`done ${drink}`);
      return drink;
    };

    // The two drinks are brewed one after the other. Brew them in parallel instead.
    const served = [await brew('espresso', 60), await brew('latte', 20)];

    expect(log).toEqual(['start espresso', 'start latte', 'done latte', 'done espresso']);
    // Promise.all keeps the order of its input, not the order things finished in.
    expect(served).toEqual(['espresso', 'latte']);
  });

  test('try/catch only catches what it awaits', async () => {
    const brokenMachine = async (): Promise<string> => {
      await later(null);
      throw new Error('out of beans');
    };

    const brewSafely = async () => {
      try {
        // One keyword is missing: the promise leaves the try block before it rejects.
        return brokenMachine();
      } catch {
        return 'tea instead';
      }
    };

    expect(await brewSafely()).toBe('tea instead');
  });

  test('Promise.all fails fast, Promise.allSettled reports everything', async () => {
    const calls = () => [later('ok'), Promise.reject(new Error('503')), later('ok')];

    const firstFailure: string = todo('the message of the error that Promise.all rejects with');
    await expect(Promise.all(calls())).rejects.toThrow(firstFailure);

    const results = await Promise.allSettled(calls());
    expect(results.map((result) => result.status)).toEqual(todo('three status strings'));
  });

  test('?. and ?? handle missing values, || handles falsy ones', async () => {
    type Order = { id: number; customer?: { name: string }; tip?: number };
    const order: Order = { id: 1, tip: 0 };

    expect(order.customer?.name).toBe(todo('what does ?. give you when customer is missing?'));
    expect(order.customer?.name ?? 'Guest').toBe(todo());

    // The tip is 0: a real value that happens to be falsy.
    expect(order.tip ?? 1).toBe(todo('0 or 1?'));
    expect(order.tip || 1).toBe(todo('0 or 1?'));
  });

  test('spread copies, destructuring picks', async () => {
    const base = { size: 'Medium', milk: 'Oat', shots: 1 };

    const large = { ...base, size: 'Large' };
    const { size, ...rest } = large;

    expect(base.size).toBe(todo('did the spread change the original object?'));
    expect(size).toBe(todo());
    expect(rest).toEqual(todo('an object'));
  });

  test('union types and generics keep helpers honest', async () => {
    type Status = 'queued' | 'brewing' | 'done';
    interface Ticket {
      id: number;
      status: Status;
    }

    // Works for any object that has a status. `T` stays whatever type the caller passed in.
    function withStatus<T extends { status: Status }>(items: T[], status: Status): T[] {
      return todo('return only the items with the given status');
    }

    const tickets: Ticket[] = [
      { id: 1, status: 'queued' },
      { id: 2, status: 'done' },
      { id: 3, status: 'done' },
    ];

    expect(withStatus(tickets, 'done').map((ticket) => ticket.id)).toEqual([2, 3]);
    // Try withStatus(tickets, 'finished') and run `npm run typecheck`: the compiler stops you.
  });
});
