import { isAbsolute, relative, resolve } from 'path'

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

export function safeFolderName(name: string): string {
  const clean = name
    // eslint-disable-next-line no-control-regex
    .replace(/[/:\\*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
  const stem = clean.split('.')[0]
  return RESERVED.test(stem) ? `${stem}_${clean.slice(stem.length)}` : clean
}

export const isInside = (parent: string, child: string): boolean => {
  const rel = relative(resolve(parent), resolve(child))
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}
