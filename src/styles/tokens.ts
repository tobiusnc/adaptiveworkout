// src/styles/tokens.ts
// Design token baseline for the skeleton implementation.
// Expected to be revised when visual design is applied.

export const colors = {
  background:     '#FFFFFF',
  surface:        '#F5F5F5',
  primary:        '#1A73E8',
  text:           '#1A1A1A',
  textSecondary:  '#6B6B6B',
  border:         '#E0E0E0',
  error:          '#D32F2F',
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
} as const;

export const typography = {
  heading: { fontSize: 20, fontWeight: '700' as const },
  subheading: { fontSize: 16, fontWeight: '600' as const },
  body:    { fontSize: 15, fontWeight: '400' as const },
  label:   { fontSize: 13, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
} as const;
