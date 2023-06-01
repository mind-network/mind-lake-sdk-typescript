export class Util {
  static ab2str(buf: Buffer) {
    // @ts-ignore
    return String.fromCharCode.apply(null, buf);
  }

  static structPackq(data: string) {
    let result!: Uint8Array;
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigInt64(0, BigInt(data), true);
    result = new Uint8Array(buffer);
    return result;
  }

  static stringToByte(str: string) {
    const bytes = new Array();
    let len, c;
    len = str.length;
    for (let i = 0; i < len; i++) {
      c = str.charCodeAt(i);
      if (c >= 0x010000 && c <= 0x10ffff) {
        bytes.push(((c >> 18) & 0x07) | 0xf0);
        bytes.push(((c >> 12) & 0x3f) | 0x80);
        bytes.push(((c >> 6) & 0x3f) | 0x80);
        bytes.push((c & 0x3f) | 0x80);
      } else if (c >= 0x000800 && c <= 0x00fff) {
        bytes.push(((c >> 12) & 0x07) | 0xf0);
        bytes.push(((c >> 6) & 0x3f) | 0x80);
        bytes.push((c & 0x3f) | 0x80);
      } else if (c >= 0x000800 && c <= 0x0007ff) {
        bytes.push(((c >> 6) & 0x3f) | 0x80);
        bytes.push((c & 0x3f) | 0x80);
      } else {
        bytes.push(c & 0xff);
      }
    }
    return bytes;
  }
}
