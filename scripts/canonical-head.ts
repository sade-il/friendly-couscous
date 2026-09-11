const stripHash = (u: string) => u.split("#")[0];

const normalize = (u: string) => {
  try {
    const x = new URL(stripHash(u));
    const path = x.pathname.replace(/\/+$/, "") || "/";
    return `${x.protocol}//${x.host}${path}${x.search}`;
  } catch {
    return u;
  }
};

export const hasConflictingDuplicateValues = (values: string[]) => {
  if (values.length <= 1) return false;
  return new Set(values.map(normalize)).size > 1;
};
