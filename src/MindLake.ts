import { Service } from './request';
import { APP_KEY, CHAIN_KEY, TOKEN_KEY } from './util/constant';
import { CipherHelper } from './util/cipher';
import { Web3Interact } from './util/web3';
import { Util } from './util/util';
import Crypto from './Crypto';
import DataLake from './DataLake';
import { Bcl } from './util/bcl';
import {
  ServerInfo,
  RequestMekProvisionBody,
  RequestRegisterCertificateBody,
  ResultType,
  DataType,
  MkManager,
  ChainInfo,
  ClerkConfig,
} from './types';
import Permission from './Permission';
import Result from './util/result';
import pkConfig from '../package.json';
import Clerk from './util/clerk';
import { SignInProps, UserButtonProps } from '@clerk/types';
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

  public mkManager!: MkManager;

  public dataLake!: DataLake;

  public permission!: Permission;

  private chainList: Array<ChainInfo> | undefined;

  private static instance: MindLake;

  public static log = false;

  public static readonly DataType = DataType;

  public static async getInstance(
    appKey: string,
    nodeUrl?: string,
  ): Promise<MindLake> {
    if (this.instance === undefined) {
      this.instance = new MindLake(appKey, nodeUrl);
      await this.instance._getServerInfo();
      await this.instance.supportChaninList();
      const chainStr = localStorage.getItem(CHAIN_KEY);
      let chain;
      try {
        chain = chainStr && JSON.parse(chainStr);
      } catch (error) {
        console.error(error);
      }
      if (chain?.clerk) {
        this.instance.mkManager = new Clerk(chain.clerk);
        let sessionToken;
        if (this.instance.mkManager instanceof Clerk) {
          sessionToken = await this.instance.mkManager.init();
        }
        if (sessionToken) {
          const res = await this.instance.service.execute<
            any,
            { token: string }
          >({
            bizType: 206,
            clerkToken: sessionToken,
          });
          if (res && res.token) {
            localStorage.setItem(TOKEN_KEY, res.token);
            await this.instance._init();
            MindLake.isConnected = true;
          }
        } else {
          MindLake.isConnected = false;
        }
      } else {
        this.instance.mkManager = new Web3Interact();
        await this.instance.mkManager.checkConnection();
        if (chain && this.instance.mkManager instanceof Web3Interact) {
          chain && this.instance.mkManager.setChain(chain);
        }
      }
      this.instance.crypto = new Crypto(this.instance);
      this.instance.dataLake = new DataLake(this.instance);
      this.instance.permission = new Permission(this.instance);
    }
    return this.instance;
  }

  private constructor(appKey: string, nodeUrl?: string) {
    localStorage.setItem(APP_KEY, appKey);
    this.service = new Service(nodeUrl);
  }

  /**
   *connect db
   */
  public async connect(chainId: string | number): Promise<ResultType> {
    try {
      if (!(this.mkManager instanceof Web3Interact)) {
        this.mkManager = new Web3Interact();
        this.crypto = new Crypto(this);
        this.permission = new Permission(this);
      }
      if (typeof chainId !== 'number' && typeof chainId !== 'string') {
        return Result.fail('chainId must be a number or string');
      }
      const chain = this.chainList?.find((c) => c.chainId == chainId);
      if (!chain) {
        return Result.fail('chain not supported');
      }
      if (this.mkManager instanceof Web3Interact) {
        this.mkManager.setChain(chain);
        await this.mkManager._changeChainToSupportChain();
      }
      const walletAddress = await this.mkManager.getWalletAccount();
      localStorage.setItem(CHAIN_KEY, JSON.stringify(chain));
      const nonce = await this.service.execute<any, string>({
        bizType: 203,
        walletAddress,
      });
      const signature = await this.mkManager.personalSignature(nonce);
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

  public async clerkConnect(
    config?: ClerkConfig,
    signProps?: SignInProps,
  ): Promise<ResultType | void> {
    try {
      this.mkManager = new Clerk(config);
      localStorage.setItem(CHAIN_KEY, JSON.stringify({ clerk: { ...config } }));
      if (this.mkManager instanceof Clerk) {
        await this.mkManager.init();
        await this.mkManager.signIn(signProps);
      }
    } catch (e) {
      return Result.fail(e);
    }
  }

  public renderClerkUserBotton(dom: HTMLDivElement, props?: UserButtonProps) {
    if (this.mkManager instanceof Clerk) {
      this.mkManager.renderUserButton(dom, props);
    }
  }

  public async supportChaninList(): Promise<Array<ChainInfo>> {
    if (!this.chainList) {
      const result = await this.service.execute<any, Array<ChainInfo>>({
        bizType: 205,
      });
      this.chainList = result;
    }
    return this.chainList;
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
      return Result.fail(e);
    }
  }

  /**
   * getEnclaveInfo
   */
  private async _getServerInfo() {
    const info = await this.service
      .execute<any, ServerInfo>({
        bizType: 120,
      })
      .catch((e) => console.error(e));
    if (info) {
      MindLake.isConnected = true;
      this.publicKey = info.publicKey;
      this.isRegistered =
        info.isRegistered && info.isMekProvision && info.isSelfBcl;
      this.mekId = info.mekId;
      if (this.isRegistered && this.mekId) {
        await this._getAccount();
      }
    }
  }

  private async _init() {
    await this._getServerInfo();
    const provisionRes = await this._mekProvision();
    if (!provisionRes) {
      throw new Error('Provision failed');
    }
    if (!this.isRegistered) {
      const { privateKeyPem, publicKeyPem } = await this.mkManager.getPkPem();
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
      throw new Error('Provision failed: The public key is not empty');
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
    const mek = await this.mkManager.getMekBytes();
    const pukId = CipherHelper.sha256Hash(publicKeyPem);
    const toBeSignedBytes = Buffer.concat([
      Buffer.from(Util.structPackq(mekId)),
      Buffer.from(pukId, 'latin1'), //important
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
    const defaultGroup = await this.service.execute<any, { groupId: string }>({
      bizType: 108,
    });
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
    const mek = await this.mkManager.getMekBytes();
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

  public checkRegistered() {
    if (!this.isRegistered) {
      throw new Error('Register error, please reLogin to register');
    }
  }
}
