import { Service } from './request';
import { APP_KEY, TOKEN_KEY } from './util/constant';
import { CipherHelper } from './util/cipher';
import { Web3Interact } from './util/web3';
import { Util } from './util/util';
import Crypto from './Crypto';
import DataLake from './DataLake';
import { Bcl } from './util/bcl';
import {
  ServerInfo,
  RequestMekProvisionBody,
  RequestRegisterCertificateBody, ResultType, DataType,
} from './types';
import Permission from './Permission';
import Result from './util/result';
import pkConfig from '../package.json'

/**
 *
 */
export class MindLake {
  public service!: Service;

  /**
   * mindLake version
   */
  public static readonly version = pkConfig.version;

  /**
   * isConnected mindDB
   */
  public static isConnected = false;

  /**
   * mind db is init
   */
  public isRegistered: boolean = false;

  /**
   * server publicKey
   * */
  public publicKey!: string;

  /**
   *registerPukId
   */
  public registerPukId!: string;

  /**
   * mek id
   */
  public mekId!: string;

  /**
   * crypto instance
   */
  public crypto!: Crypto;

  public web3!: Web3Interact;

  public dataLake!: DataLake;

  public permission!: Permission;

  private static instance: MindLake;

  public static log = false;

  public static readonly DataType = DataType;

  public static async getInstance(appKey: string, nodeUrl?: string): Promise<MindLake> {
    if (this.instance === undefined) {
        this.instance = new MindLake(appKey, nodeUrl);
        await this.instance.web3.checkConnection();
        await this.instance._getServerInfo();
        this.instance.crypto = new Crypto(this.instance);
        this.instance.dataLake = new DataLake(this.instance);
        this.instance.permission = new Permission(this.instance);
    }
    return this.instance;
  }

  private constructor(appKey: string, nodeUrl?: string) {
      localStorage.setItem(APP_KEY, appKey);
      this.service = new Service(nodeUrl);
      this.web3 = new Web3Interact();
  }

  /**
   *connect db
   */
  public async connect(): Promise<ResultType> {
    try {
      const walletAddress = await this.web3.getWalletAccount();
      const nonce = await this.service.execute<any, string>({
        bizType: 203,
        walletAddress,
      });
      const signature = await this.web3.personalSignature(nonce);
      const res = await this.service.execute<any, { token: string }>({
        bizType: 201,
        walletAddress,
        signature,
      });
      if (res && res.token) {
        localStorage.setItem(TOKEN_KEY, res.token);
        await this._init();
        MindLake.isConnected = true;
        return Result.success(true);
      }
      return Result.fail(false);
    } catch (e) {
      console.error(e);
      localStorage.removeItem(TOKEN_KEY);
      return Result.fail(e);
    }
  }

  /**
   * disconnect db
   */
  public async disConnect(): Promise<ResultType> {
    try {
      await this.service.execute({ bizType: 202 });
      return Result.success(true);
    } catch (e) {
      console.error(e);
      return Result.fail(e)
    }
  }

  /**
   * getEnclaveInfo
   */
  private async _getServerInfo() {
    const info = await this.service.execute<any, ServerInfo>({
      bizType: 120,
    }).catch(e => console.error(e));
    if (info) {
      MindLake.isConnected = true;
      this.publicKey = info.publicKey;
      this.isRegistered = info.isRegistered && info.isMekProvision && info.isSelfBcl;
      this.mekId = info.mekId;
      if (this.isRegistered && this.mekId) {
        await this._getAccount();
      }
    }
  }

  private async _init() {
    await this._getServerInfo();
    if (!this.isRegistered) {
      const provisionRes = await this._mekProvision();
      if (!provisionRes) {
        throw new Error('Provision failed');
      }
      const { privateKeyPem, publicKeyPem } = await this.web3.getPkPem();
      const registerPukId = await this._registerCertificate(
        publicKeyPem,
        privateKeyPem,
      );
      if (!registerPukId) {
        throw new Error('Register key pair failed');
      }
      this.registerPukId = registerPukId;
      const sn = await this._issueBclForSelf(privateKeyPem);
      if (!sn) {
        throw new Error('Grant for self failed');
      }
      this.isRegistered = true;
    }
  }

  /**
   * mek provision
   * @private
   */
  private async _mekProvision() {
    if (!this.publicKey) {
      return;
    }
    const pubKey = this.publicKey.replace('\\n', '\n');
    const ephemeralKey = CipherHelper.randomBytes();
    const sealedEphemeralKey: Uint8Array = CipherHelper.rsaEncrypt(
      pubKey,
      ephemeralKey,
    );
    const sealedEphemeralKeyLenBytes = new Buffer([
      sealedEphemeralKey.length & 0xff,
      (sealedEphemeralKey.length >> 8) & 0xff,
    ]);
    const iv = CipherHelper.randomBytes();
    const envelope_json = await this._genEnvelope();
    const envelope_enc = CipherHelper.aesEncrypt(
      ephemeralKey,
      iv,
      envelope_json,
    );
    const big_envelope = Buffer.concat([
      sealedEphemeralKeyLenBytes,
      sealedEphemeralKey,
      iv,
      envelope_enc,
    ]);
    const big_envelopeBase64 = Buffer.from(big_envelope).toString('base64');
    return await this.service.execute<RequestMekProvisionBody, boolean>({
      bizType: 102,
      databasePublicKey: this.publicKey,
      envelope: big_envelopeBase64,
    });
  }

  /**
   * registerCertificate pukId
   * @private
   */
  private async _registerCertificate(
    publicKeyPem: string,
    privateKeyPem: string,
  ): Promise<string | undefined> {
    const mekId = this.mekId;
    const mek = await this.web3.getMekBytes();
    const pukId = CipherHelper.sha256Hash(publicKeyPem);
    const toBeSignedBytes = Buffer.concat([
      Buffer.from(Util.structPackq(mekId)),
      Buffer.from(pukId, 'latin1'),//important
    ]);
    const rsaSign = Buffer.concat([
      Buffer.from('01', 'hex'),
      CipherHelper.rsaSign(privateKeyPem, toBeSignedBytes),
    ]);
    const private_sig = rsaSign.toString('base64');
    const mekSign = Buffer.concat([
      Buffer.from('00', 'hex'),
      CipherHelper.hmacHash(mek, toBeSignedBytes),
    ]);
    const mek_sign = mekSign.toString('base64');
    const res = await this.service.execute<
      RequestRegisterCertificateBody,
      boolean
    >({
      bizType: 104,
      mekId,
      pukId,
      publicKey: publicKeyPem,
      privateSig: private_sig,
      mekSig: mek_sign,
    });
    if (res) {
      return pukId;
    }
  }

  /**
   * issueBclForSelf
   * @param privateKeyPem
   * @private
   */
  private async _issueBclForSelf(privateKeyPem: string) {
    //
    const bcl = new Bcl(this.service);
    await bcl.createBclBody(this.registerPukId, this.registerPukId, '');
    const defaultGroup = await this.service.execute<
      any,
      { groupId: string }
    >({ bizType: 108 });
    if (!defaultGroup || !defaultGroup.groupId) {
      throw new Error('Get default group error');
    }
    const selfDekGroup = {
      groupid: defaultGroup.groupId,
      min: 1,
      max: 1000,
    };
    bcl.addDekGroup(selfDekGroup, selfDekGroup);
    return await bcl.issueBcl(privateKeyPem, 106);
  }

  private async _genEnvelope() {
    const mek = await this.web3.getMekBytes();
    let envelope: any = {};
    const base64Mek = Buffer.from(mek).toString('base64');
    envelope['mek'] = base64Mek;
    envelope['expire'] = 0;
    let envelope_json = JSON.stringify(envelope).replace(' ', '');
    return envelope_json;
  }

  private async _getAccount() {
    const registerPukId = await this.service.execute<any, string>({
      bizType: 103,
      mekId: this.mekId,
    });
    this.registerPukId = registerPukId;
  }

  public static checkLogin() {
    if (!MindLake.isConnected) {
      throw new Error('Please connect first');
    }
  }

  public checkRegistered () {
    if(!this.isRegistered) {
      throw new Error("Register error, please reLogin to register")
    }
  }
}
