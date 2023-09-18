import { Service } from './request';
import { CipherHelper } from './util/cipher';
import { MindLake } from './MindLake';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { CCEntry, DataType, ResultType, MkManager } from './types';
import Result from './util/result';

export default class Crypto {
  private service!: Service;

  private mkManager!: MkManager;

  private sdk!: MindLake;

  constructor(sdk: MindLake) {
    this.service = sdk.service;
    this.mkManager = sdk.mkManager;
    this.sdk = sdk;
  }

  /**
   * encrypt method
   * @param tableName
   * @param columnName
   * @param data
   * @param schema
   */
  public async encrypt(
    data: any,
    tableNameColumnName: string | DataType,
  ): Promise<ResultType> {
    try {
      MindLake.checkLogin();
      this.sdk.checkRegistered();
      const walletAddress = await this.mkManager.getWalletAccount();
      let encType!: number;
      //const { ctxId, decryptedDek, algorithm }
      let ccEntry!: { ctxId: number; algorithm: number; decryptedDek: Buffer };
      if (typeof tableNameColumnName === 'string') {
        const [tableName, columnName] = tableNameColumnName.split('.');
        encType = await this.service.execute<any, number>({
          bizType: 107,
          tableName,
          column: columnName,
        });
        // @ts-ignore
        ccEntry = await this._getOrGenDek(tableName, columnName, walletAddress);
      } else {
        encType = tableNameColumnName;
        const { ctxId, algorithm, encryptedDek } = await this.service.execute<
          any,
          { ctxId: number; algorithm: number; encryptedDek: string }
        >({ bizType: 108 });
        const mekBuffer = await this.mkManager.getMekBytes();
        const [_, decryptedDek] = CipherHelper.decryptDekToBase64(
          mekBuffer,
          encryptedDek,
        );
        ccEntry = { ctxId, algorithm, decryptedDek };
      }

      if (encType > 4) {
        encType += 1;
      }
      const encodeDataBuffer = CipherHelper.encodeDataByType(data, encType);

      const header = this._genCryptoHeader(ccEntry.ctxId, encType);
      const checkCode = this._genCheckCode(encodeDataBuffer, 1);
      const data_to_enc = Buffer.concat([
        encodeDataBuffer,
        Buffer.from(checkCode),
      ]);
      let encrypted_data;
      const iv = CipherHelper.randomBytes();
      if (ccEntry.algorithm === 3) {
        encrypted_data = CipherHelper.aesEncrypt(
          ccEntry.decryptedDek,
          iv,
          data_to_enc,
        );
      }
      if (!encrypted_data) {
        throw new Error('aesEncrypt error');
      }
      const buf = Buffer.concat([header, iv, encrypted_data]);
      const temp = buf.slice(1);
      const checkCode2 = this._genCheckCode(temp, 1);
      const result = Buffer.concat([checkCode2, temp]);
      return Result.success(`\\x${Buffer.from(result).toString('hex')}`);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  /**
   *
   * @param hex
   */
  public async decrypt(hex: string): Promise<ResultType> {
    try {
      MindLake.checkLogin();
      this.sdk.checkRegistered();
      const mek = await this.mkManager.getMekBytes();
      const encryptData = hex.replace('\\x', '');
      const encryptDataBuffer = Buffer.from(encryptData, 'hex');
      const header = this._extractCryptoHeader(encryptDataBuffer);
      const cxtId = this._extractCtxId(header);
      const { encryptedDek, algorithm } = await this.service.execute<
        any,
        { encryptedDek: string; algorithm: number }
      >({
        bizType: 111,
        ctxId: String(cxtId),
      });
      const [_, dek] = CipherHelper.decryptDekToBase64(mek, encryptedDek);
      const afterEncType = this._extractEncType(header);
      const idx = (header[1] & 0x7) + 2;
      const iv = encryptDataBuffer.slice(idx, idx + 16);
      const cipherBlob = encryptDataBuffer.slice(idx + 16);
      // @ts-ignore
      const plainBlob = CipherHelper.aesDecrypt(dek, iv, cipherBlob);
      const encodeResult = plainBlob.subarray(0, -1);
      const checkCode = plainBlob.slice(-1);
      const checkCode2 = this._genCheckCode(encodeResult, 1);
      if (checkCode[0] != checkCode2[0]) {
        throw new Error('Check code is not correct');
      }
      const decryptData = CipherHelper.decodeDataByType(
        Uint8Array.from(encodeResult),
        afterEncType,
      );
      return Result.success(decryptData);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  /**
   * get dek
   * @param schema
   * @param table
   * @param column
   * @param walletAddress
   * @private
   */
  private async _getOrGenDek(
    table: string,
    column: string,
    walletAddress: string,
  ) {
    const mekBuffer = await this.mkManager.getMekBytes();
    let cc = await this._queryCCEntryByName(table, column, walletAddress).catch(
      (e) => {},
    );
    if (!cc) {
      cc = await this._genCCEntryFromLocal(table, column);
    }
    const { ctxId, dekId, encryptedDek, algorithm } = cc;
    const [, decryptedDek] = CipherHelper.decryptDekToBase64(
      mekBuffer,
      encryptedDek,
    );
    return { ctxId: ctxId, decryptedDek, algorithm };
  }

  private async _queryCCEntryByName(
    table: string,
    column: string,
    walletAddress: string,
  ) {
    return await this.service.execute<any, CCEntry>({
      bizType: 108,
      table: table,
      column: column,
      walletAddress,
    });
  }

  private async _genCCEntryFromLocal(table: string, column: string) {
    const dekId = await this.service.execute<any, number>({
      bizType: 109,
      mekId: this.sdk.mekId,
    });
    const dek: Buffer = CipherHelper.randomBytes();
    const mek = await this.mkManager.getMekBytes();
    return this._genSQLInsertDek(
      this.sdk.mekId,
      dekId,
      mek,
      dek,
      3,
      table,
      column,
    );
  }

  private async _genSQLInsertDek(
    mekId: string,
    dekId: number,
    mek: Buffer,
    dek: Buffer,
    alg = 3,
    table: string,
    column: string,
  ) {
    const dekCipherStr = CipherHelper.encryptDekToBase64(mek, dekId, dek);
    const grpIdStr = uuidv4();
    const uuidStringWithoutHyphen = grpIdStr.replace(/-/g, '');
    const _gripId = Buffer.from(
      uuidStringWithoutHyphen
        .match(/.{1,2}/g)
        ?.map((byte: string) => parseInt(byte, 16)) || [],
    );
    const gAuthStr = CipherHelper.digest_gAuth(mek, _gripId, dekId);
    return this.service.execute<any, CCEntry>({
      bizType: 110,
      table: table,
      column: column,
      schema: 'public',
      mekId,
      dekId,
      dekCipherStr,
      grpIdStr,
      groupAuthStr: gAuthStr,
    });
  }

  private _genCryptoHeader(ctxId: number, encType: number): Buffer {
    let head = Buffer.from('0000', 'hex');
    let tmp_value = head[1];
    tmp_value = tmp_value & 0xffffff07;
    tmp_value = tmp_value | (encType << 3);
    head[1] = tmp_value;
    let tmp = ctxId;
    while (tmp != 0) {
      head = Buffer.concat([head, Buffer.alloc(1).fill(tmp & 0xff)]);
      tmp >>= 8;
    }
    const ctxLen = head.length - 2;
    let tmp_val = head[1];
    tmp_val = (tmp_val & 0xfffffff8) | (ctxLen & 0x7);
    head[1] = tmp_val;
    return head;
  }

  private _extractCryptoHeader(data: Uint8Array): Buffer {
    let header = [];
    let index = 0;
    for (let i = 0; i < 1; i++) {
      header.push(data[index]);
      // header[index] = data[index];
      index++;
    }
    if (index !== 1) {
      throw new Error('Invalid header index');
    }
    header.push(data[index]);
    //header[index] = data[index];
    index++;
    const rng = header[1] & 0x7;
    for (let i = 0; i < rng; i++) {
      header.push(data[index]);
      // header[index] = data[index];
      index++;
    }
    return Buffer.from(header);
  }

  private _extractEncType(header: Buffer): number {
    const tmp_value = header[1];
    const type_value = (tmp_value & 0xf8) >> 3;
    return type_value;
  }

  private _extractCtxId(header: Buffer): number {
    const ctxIdLen = header[1] & 0x7;
    if (header.length !== ctxIdLen + 2) {
      throw new Error('Invalid header length');
    }
    let ctxId = 0;
    for (let i = 0; i < ctxIdLen; i++) {
      const index = header.length - 1 - i;
      ctxId = (ctxId << 8) | (header[index] & 0xff);
    }
    return ctxId;
  }

  private _genCheckCode(encodeData: Uint8Array, resultSize: number) {
    let tmpCode = new Uint8Array(resultSize);
    for (let i = 0; i < encodeData.length; i++) {
      let n = i % resultSize;
      tmpCode[n] ^= encodeData[i];
    }
    return Buffer.from(tmpCode);
  }
}
