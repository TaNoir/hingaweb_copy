// Test helper for the guidance screens: a fake client whose tables and RPCs return set results.
// A table entry may be: one result, a list of results (used in call order), or a function
// (calls) => result that picks a result from the query's recorded calls.
import { vi } from 'vitest';
import { createMockSupabase } from '../../test/mockSupabase.js';

const METHODS = [
  'select',
  'insert',
  'update',
  'delete',
  'eq',
  'neq',
  'not',
  'is',
  'in',
  'gte',
  'lte',
  'lt',
  'gt',
  'order',
  'limit',
  'single',
  'maybeSingle',
  'range',
];

function lazyQuery(resolve) {
  const calls = [];
  const q = {
    calls,
    then: (ok, bad) =>
      Promise.resolve()
        .then(() => resolve(calls))
        .then(ok, bad),
  };
  for (const m of METHODS) {
    q[m] = (...args) => {
      calls.push([m, ...args]);
      return q;
    };
  }
  return q;
}

export function guidanceClient({ tables = {}, rpc = {} } = {}) {
  const c = createMockSupabase();
  const queries = {};
  c.from.mockImplementation((table) => {
    const spec = tables[table];
    let resolve;
    if (typeof spec === 'function') resolve = spec;
    else if (Array.isArray(spec)) {
      const result = spec.length > 1 ? spec.shift() : spec[0];
      resolve = () => result;
    } else resolve = () => spec ?? { data: [], error: null };
    const q = lazyQuery(resolve);
    (queries[table] ??= []).push(q);
    return q;
  });
  c.rpc.mockImplementation(async (name, args) => {
    const r = rpc[name];
    return typeof r === 'function' ? r(args) : (r ?? { data: null, error: null });
  });
  const channel = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) };
  c.channel.mockReturnValue(channel);
  return { client: c, queries, channel };
}
