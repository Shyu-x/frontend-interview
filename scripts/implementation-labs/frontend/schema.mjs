const issue = (path, expected, received) => ({ path, expected, received });
export const string = () => (value, path) => typeof value === 'string' ? { ok: true, value } : { ok: false, issues: [issue(path, 'string', value)] };
export const array = (itemSchema) => (value, path) => {
  if (!Array.isArray(value)) return { ok: false, issues: [issue(path, 'array', value)] };
  const output = []; const issues = [];
  value.forEach((item, index) => { const result = itemSchema(item, [...path, index]); if (result.ok) output.push(result.value); else issues.push(...result.issues); });
  return issues.length ? { ok: false, issues } : { ok: true, value: output };
};
export const object = (shape) => (value, path = []) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return { ok: false, issues: [issue(path, 'object', value)] };
  const output = {}; const issues = [];
  for (const [key, schema] of Object.entries(shape)) { const result = schema(value[key], [...path, key]); if (result.ok) output[key] = result.value; else issues.push(...result.issues); }
  return issues.length ? { ok: false, issues } : { ok: true, value: output };
};
