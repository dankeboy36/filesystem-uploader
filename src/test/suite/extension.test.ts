import assert from 'node:assert/strict';
import { __test } from '../../partitions';

const { parsePartitionScheme } = __test;

const partition1 = `
# ESP-IDF Partition Table
# Name,   Type, SubType, Offset,  Size, Flags
nvs,      data, nvs,     0x9000,  0x5000,
otadata,  data, ota,     0xe000,  0x2000,
app0,     app,  ota_0,   0x10000, 0x100000,
spiffs,   data, spiffs,  0x110000,0x2E0000,
coredump, data, coredump,0x3F0000,0x10000,
`.trim();

const partition2 = `
# Name,   Type, SubType, Offset,  Size, Flags
nvs,      data, nvs,     36K,     20K,
otadata,  data, ota,     56K,     8K,
app0,     app,  ota_0,   64K,     2M,
app1,     app,  ota_1,   ,        2M,
spiffs,   data, spiffs,  ,        3M,
`.trim();

const partition3 = `
# Name,   Type, SubType, Offset,  Size, Flags
nvs,      data, nvs,     0x9000,  0x5000,
otadata,  data, ota,     0xe000,  0x2000,
app0,     app,  ota_0,   0x10000, 0x200000,
app1,     app,  ota_1,   0x210000,0x200000,
ffat,     data, fat,     0x410000,0xBE0000,
coredump, data, coredump,0xFF0000,0x10000,
# to create/use ffat, see https://github.com/marcmerlin/esp32_fatfsimage
`.trim();

describe('partitions', () => {
  describe('parsePartitionScheme', () => {
    it('should parse partitions', async () => {
      const actual = await parsePartitionScheme(partition1);
      assert.deepStrictEqual(actual['coredump'], {
        name: 'coredump',
        type: 'data',
        subType: 'coredump',
        offset: 4128768,
        size: 65536,
        flags: '',
      });
    });

    it('should handle auto offset', async () => {
      const actual = await parsePartitionScheme(partition2);
      assert.deepStrictEqual(actual['app1'], {
        name: 'app1',
        type: 'app',
        subType: 'ota_1',
        offset: 'auto',
        size: 2048,
        flags: '',
      });
    });

    it('should handle comments', async () => {
      const actual = await parsePartitionScheme(partition3);
      assert.deepStrictEqual(actual['ffat'], {
        name: 'ffat',
        type: 'data',
        subType: 'fat',
        offset: 4259840,
        size: 12451840,
        flags: '',
      });
    });
  });
});
