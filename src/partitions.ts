import fs from 'node:fs';
import readline from 'node:readline';
import { Readable } from 'stream';

// https://espressif-docs.readthedocs-hosted.com/projects/arduino-esp32/en/latest/tutorials/partition_table.html#introduction
export type PartitionScheme = Record<string, PartitionOption>;

const typeLiterals = ['app', 'data'] as const;
type Type = (typeof typeLiterals)[number];
function isType(arg: unknown): arg is Type {
  return (
    typeof arg === 'string' && typeLiterals.some((literal) => literal === arg)
  );
}

// Taken from https://stackoverflow.com/a/39495173/5529090
type Enumerate<
  N extends number,
  Acc extends number[] = []
> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>;
type IntRange<F extends number, T extends number> = Exclude<
  Enumerate<T>,
  Enumerate<F>
>;

const dataSubtypeLiteral = [
  'ota',
  'nvs',
  'coredump',
  'nvs_keys',
  'fat',
  'spiffs',
] as const;
type DataSubtype = (typeof dataSubtypeLiteral)[number];
type OTASubtype = `ota_${IntRange<0, 15>}`;
function isOTASubtype(arg: unknown): arg is OTASubtype {
  if (typeof arg === 'string') {
    const rest = arg.replace(/^ota_/g, '');
    const maybeNumber = parseInt(rest, 10);
    return maybeNumber >= 0 && maybeNumber <= 15;
  }
  return false;
}
const appSubtypeLiterals = ['factory', 'test'] as const;
type AppSubtype = (typeof appSubtypeLiterals)[number] | OTASubtype;
type Subtype = DataSubtype | AppSubtype;
function isSubtype(arg: unknown): arg is Subtype {
  return (
    typeof arg === 'string' &&
    (dataSubtypeLiteral.some((literal) => literal === arg) ||
      appSubtypeLiterals.some((literal) => literal === arg) ||
      isOTASubtype(arg))
  );
}

export interface PartitionOption {
  readonly name: string;
  readonly type: Type;
  readonly subType: Subtype;
  readonly offset: number | 'auto'; // bytes
  readonly size: number; // bytes
  readonly flags: string;
}

function isPartitionOption(arg: unknown): arg is PartitionOption {
  return (
    Boolean(arg) &&
    typeof arg === 'object' &&
    (<PartitionOption>arg).name !== undefined &&
    typeof (<PartitionOption>arg).name === 'string' &&
    (<PartitionOption>arg).type !== undefined &&
    isType((<PartitionOption>arg).type) &&
    (<PartitionOption>arg).subType !== undefined &&
    isSubtype((<PartitionOption>arg).subType) &&
    (<PartitionOption>arg).offset !== undefined &&
    ((<PartitionOption>arg).offset === 'auto' ||
      typeof (<PartitionOption>arg).offset === 'number') &&
    (<PartitionOption>arg).size !== undefined &&
    typeof (<PartitionOption>arg).size === 'number' &&
    (<PartitionOption>arg).flags !== undefined &&
    typeof (<PartitionOption>arg).flags === 'string'
  );
}

export async function loadPartitionScheme(
  partitionSchemaPath: string
): Promise<PartitionScheme> {
  const fileStream = fs.createReadStream(partitionSchemaPath);
  return parsePartitionScheme(fileStream);
}

const kilo = 1_024;
const mega = kilo * kilo;
/**
 * Parses the raw size string can be formatted as decimal, hex numbers (0x prefix), or using unit prefix K (kilo) or M (mega) i.e: 4096 = 4K = 0x1000
 */
function parseByteSize(raw: string): number {
  let size: number;
  if (raw.startsWith('0x')) {
    size = parseInt(raw.slice(2), 16);
  } else if (/^.*k$/gi) {
    size = parseInt(raw.slice(0, -1)) * kilo;
  } else if (/^.*m$/gi) {
    size = parseInt(raw.slice(0, -1)) * mega;
  } else {
    size = parseInt(raw, 10);
  }
  if (isNaN(size)) {
    throw new Error(`Could not parse raw size into bytes: '${raw}'`);
  }
  return size;
}

async function parsePartitionScheme(
  content: string | NodeJS.ReadableStream
): Promise<PartitionScheme> {
  const scheme: PartitionScheme = {};
  const input = typeof content === 'string' ? Readable.from(content) : content;
  const lines = readline.createInterface({
    input,
    crlfDelay: Infinity, // handles `\r\n` as one line break
  });
  for await (const line of lines) {
    if (line.trimStart().charAt(0) === '#') {
      continue; // CSV comment
    }
    const [name, rawType, subType, rawOffset, rawSize, flags] = line
      .split(',')
      .map((value) => value.trim());
    const type = isType(rawType) && rawType;
    const offset = rawOffset ? parseByteSize(rawOffset) : 'auto';
    const size = parseByteSize(rawSize);
    const option = {
      name,
      type,
      subType,
      offset,
      size,
      flags,
    };
    if (!isPartitionOption(option)) {
      throw new Error(
        `Invalid partition option: ${JSON.stringify(
          option
        )}. Could not parse line: '${line}'`
      );
    }
    scheme[option.name] = option;
  }
  return scheme;
}

export const __test = {
  parseByteSize,
  parsePartitionScheme,
} as const;
