const stripHash = (u: string) => u.split("#")[0];
const INVALID_URL_NORMALIZED = "__invalid-url__";

const normalize = (u: string) => {
  try {
    const x = new URL(stripHash(u));
    const path = x.pathname.replace(/\/+$/, "") || "/";
    return `${x.protocol}//${x.host}${path}${x.search}`;
  } catch {
    return INVALID_URL_NORMALIZED;
  }
};

type DuplicateTagCheck = {
  tagCount: number;
  values: string[];
};

export const hasConflictingDuplicateValues = ({ tagCount, values }: DuplicateTagCheck) => {
  if (tagCount <= 1) return false;
  return new Set(values.map(normalize)).size > 1;
};
