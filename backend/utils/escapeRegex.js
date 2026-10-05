// ============================================================
// REGEX ESCAPE HELPER
//
// Escapes user-supplied search text before it is used inside a
// MongoDB $regex / RegExp query. Without this, crafted input such
// as "((a+)+)+$" can trigger catastrophic backtracking (ReDoS)
// and hang the database. Also neutralises non-string input by
// coercing everything to a plain string first.
// ============================================================

const escapeRegex = (value) =>
  String(value ?? '').replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

module.exports = {
  escapeRegex,
};
