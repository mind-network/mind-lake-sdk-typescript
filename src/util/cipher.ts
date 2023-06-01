import * as CRYPTO from 'crypto';
const Rsa = require('node-rsa');
// @ts-ignore
import forge from 'node-forge';
import { Util } from './util';
import Decimal from 'decimal.js';
import { DataType } from '../types';

/**
 * Helper related to encryption
 */
export class CipherHelper {
  /**
   * Obtain bytes of random length
   * @param length
   * @return Buffer
   */
  static randomBytes(length = 16): Buffer {
    return CRYPTO.randomBytes(length);
  }

  /**
   * get hash
   * @param data
   */
  static sha256Hash(data: string): string {
    return CRYPTO.createHash('sha256').update(data).digest('base64');
  }

  /**
   * rsa sign
   * @param privateKeyPem
   * @param data
   */
  static rsaSign(privateKeyPem: string, data: string | Buffer): Buffer {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md.sha256.create();
    if(typeof data === 'string') {
      md.update(data, 'utf8');
    }else {
      const str = data.toString('latin1');
      md.update(str, 'latin1');
    }
    const pss = forge.pss.create({
      md: forge.md.sha256.create(),
      mgf: forge.mgf.mgf1.create(forge.md.sha256.create()),
      saltLength: 32
    });
    const signature = privateKey.sign(md, pss);
    return Buffer.from(signature, "latin1");
  }

  static rsaEncrypt(pubKey: string, data: Buffer): Buffer {
    const forgePublicKey = forge.pki.publicKeyFromPem(pubKey);
    const byteString = Util.ab2str(data);
    const encrypted = forgePublicKey.encrypt(byteString, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create(),
      },
    });
    return Buffer.from(encrypted, 'latin1');
  }

  /**
   * get hmac hash
   * @param key
   * @param data
   */
  static hmacHash(key: Buffer, data: string | Uint8Array): Buffer {
    const h = CRYPTO.createHmac('sha256', key);
    h.update(data);
    return h.digest();
  }

  /**
   * create RSA keys
   * @param b
   */
  static createKeyPemString(b = 2048): {
    publicKeyPem: string;
    privateKeyPem: string;
  } {
    const key = new Rsa({ b: 2048 });
    const publicKeyPem = key.exportKey('pkcs8-public-der');
    const privateKeyPem = key.exportKey('pkcs8-private-der');
    return { publicKeyPem, privateKeyPem };
  }

  static getPublicKeyPemFromPrivate(privateKeyDer: Buffer) {
    const key = new Rsa(privateKeyDer, 'pkcs8-der');
    const publicKeyPem = key.exportKey('pkcs8-public-pem');
    const privateKeyPem = key.exportKey("pkcs8-private-pem");
    return {publicKeyPem, privateKeyPem};
  }

  /**
   * aes encrypt
   * @param key
   * @param iv
   * @param data
   */
  static aesEncrypt(
    key: Buffer,
    iv: Uint8Array,
    data: string | Buffer,
  ): Buffer {
    const cipher = CRYPTO.createCipheriv('aes-128-cbc', key, iv);
    let encrypted_data;
    cipher.setAutoPadding(true);
    encrypted_data = cipher.update(data);
    encrypted_data = Buffer.concat([encrypted_data, cipher.final()]);
    return encrypted_data as Buffer;
  }

  /**
   * aes decrypt
   * @param key
   * @param iv
   * @param data
   */
  static aesDecrypt(key: Buffer, iv: Buffer, data: Buffer): Buffer {
    const cipher = CRYPTO.createDecipheriv('aes-128-cbc', key, iv);
    const encrypted_data_b64 = Buffer.from(data).toString('base64');
    let decrypted_data = cipher.update(encrypted_data_b64, 'base64');
    decrypted_data = Buffer.concat([decrypted_data, cipher.final()]);
    return decrypted_data;
  }

  /**
   * Generate hexadecimal mk
   */
  static generateMk(): string {
    const mk = CipherHelper.randomBytes();
    return mk.toString('hex');
  }

  /**
   *
   * @param mk
   * @param dekId
   * @param dek
   */
  static encryptDekToBase64(mk: Buffer, dekId: number, dek: Buffer) {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(0, dekId & 0xffffffff, true);
    view.setUint32(4, Math.floor(dekId / 0x100000000), true);
    const dekid_dek = Buffer.concat([Buffer.from(buffer), dek], 24);
    const iv = CipherHelper.randomBytes();
    const encrypted_data = CipherHelper.aesEncrypt(mk, iv, dekid_dek);
    const dekCipher = Buffer.concat([Buffer.from([3]), iv, encrypted_data]);
    return dekCipher.toString('base64');
  }

  static decryptDekToBase64(mek: Buffer, dekCipherStr: string): [number, Buffer] {
    const dekCipher = Buffer.from(dekCipherStr, 'base64');
    const dekid_dek = CipherHelper.aesDecrypt(
      mek,
      dekCipher.slice(1, 17),
      dekCipher.slice(17),
    );
    const dekid = new DataView(dekid_dek.slice(0, 8).buffer).getUint16(0, true);
    const dek = dekid_dek.slice(8);
    return [dekid, dek];
  }

  static digest_gAuth(mek: Buffer, grp_id: Buffer, dek_id: number): string {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigInt64(0, BigInt(dek_id), true);
    const dek_id_array = Buffer.from(buffer);
    const buf = Buffer.concat([grp_id, dek_id_array]);
    const gAuth = CipherHelper.hmacHash(mek, buf);
    return gAuth.toString('base64');
  }

  public static encodeDataByType(data: any, encType: number): Buffer {
    let result!: Uint8Array;
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    switch (encType) {
      case DataType.int4:
        view.setInt32(0, data, true);
        result = new Uint8Array(buffer, 0, 4);
        break;
      case DataType.int8:
        view.setBigInt64(0, BigInt(data), true);
        result = new Uint8Array(buffer);
        break;
      case DataType.float4:
        view.setFloat32(0, data, true);
        result = new Uint8Array(buffer, 0, 4);
        break;
      case DataType.float8:
        view.setFloat64(0, data, true);
        result = new Uint8Array(buffer);
        break;
      case 6:
        const val = new Decimal(data);
        result = new TextEncoder().encode(val.toString());
        break;
      case 7:
        result = new TextEncoder().encode(data);
        break;
      case 8:
        const uSec = BigInt(Math.floor(data * 1000));
        const offset = BigInt(
          Math.floor(new Date().getTimezoneOffset() * 60 * 1000000),
        );
        const adjustedUSec = uSec - BigInt(946684800000000) + offset;
        view.setBigInt64(0, adjustedUSec, true);
        result = new Uint8Array(buffer);
        break;
      default:
        throw new Error('Unsupported encryption type');
    }
    return Buffer.from(result);
  }

  static decodeDataByType(data: any, encType: number): any {
    let result: any;
    if (encType === DataType.int4) {
      // enc_int4
      const size = 4;
      const buf = data.slice(0, size);
      result = new Int32Array(buf.buffer)[0];
    } else if (encType === DataType.int8) {
      // enc_int8
      const size = 8;
      const buf = data.slice(0, size);
      result = new BigInt64Array(buf.buffer)[0];
      result = result.toString();//end n ?
    } else if (encType === DataType.float4) {
      // enc_float4
      const size = 4;
      const buf = data.slice(0, size);
      result = new Float32Array(buf.buffer)[0];
    } else if (encType === DataType.float8) {
      // enc_float8
      const size = 8;
      const buf = data.slice(0, size);
      result = new Float64Array(buf.buffer)[0];
    } else if (encType === 6) {
      // enc_decimal
      result = new Decimal(Buffer.from(data).toString());
      result = result.toString();
    } else if (encType === 7) {
      // enc_text
      result = new TextDecoder().decode(data);
    } else if (encType === 8) {
      // enc_timestamp
      const size = 8;
      const buf = data.slice(0, size);
      let u_sec = new BigInt64Array(buf.buffer)[0];
      u_sec += BigInt(946684800000000);
      u_sec -= BigInt(new Date().getTimezoneOffset() * 60 * 1000000);
      const time_stamp = Number(u_sec) / 1000000.0;
      result = time_stamp * 1000;
    } else {
      throw new Error('Unsupported encryption type');
    }
    return result;
  }
}
