import ClerkJS from '@clerk/clerk-js';
import { SignInProps, UserButtonProps } from '@clerk/types';
import { ClerkConfig, MkManager } from 'src/types';
import { CipherHelper } from './cipher';
import { CLERK_PUBLISHABLE_KEY, TOKEN_KEY, WALLET_key } from './constant';
import Web3 from 'web3';
import {
  getEncryptionPublicKey,
  encrypt as metaMaskEncrypt,
  decrypt as metaMaskDecrypt,
} from '@metamask/eth-sig-util';

export default class Clerk implements MkManager {
  private mkBuffer: Buffer | undefined;
  private privateKeyCipherBuffer: Buffer | undefined;
  private waPk: string | undefined;

  private web3: Web3;
  public config: ClerkConfig | undefined;
  public clerkJs: ClerkJS;

  constructor(config?: ClerkConfig) {
    this.config = config;
    this.clerkJs = new ClerkJS(CLERK_PUBLISHABLE_KEY);
    this.web3 = new Web3();
  }

  async encrypt(str: string): Promise<Buffer | undefined> {
    if (!this.waPk) {
      throw new Error('Please connect first.');
    }
    const pubKey = getEncryptionPublicKey(this.waPk.substring(2));
    if (pubKey) {
      const enc = metaMaskEncrypt({
        publicKey: pubKey,
        data: Buffer.from(str, 'hex').toString('base64'),
        version: 'x25519-xsalsa20-poly1305',
      });
      const buf = Buffer.concat([
        Buffer.from(enc.ephemPublicKey, 'base64'),
        Buffer.from(enc.nonce, 'base64'),
        Buffer.from(enc.ciphertext, 'base64'),
      ]);
      return buf;
    }
  }
  async decrypt(cipher: Buffer): Promise<Buffer> {
    if (!this.waPk) {
      throw new Error('Please connect first.');
    }
    const encryptedData = {
      version: 'x25519-xsalsa20-poly1305',
      ephemPublicKey: cipher.slice(0, 32).toString('base64'),
      nonce: cipher.slice(32, 56).toString('base64'),
      ciphertext: cipher.slice(56).toString('base64'),
    };
    // Convert data to hex string required by MetaMask
    const decryptData = metaMaskDecrypt({
      encryptedData,
      privateKey: this.waPk.substring(2),
    });
    return Buffer.from(decryptData, 'base64');
  }
  async getWalletAccount(): Promise<string> {
    if (!this.waPk) {
      throw new Error('Please connect first.');
    }
    const account = await this.web3.eth.accounts.privateKeyToAccount(this.waPk);
    return account.address;
  }
  async checkConnection(): Promise<void> {}
  async getMekBytes(): Promise<Buffer> {
    const user = this.clerkJs.user;
    if (!user) {
      throw new Error('Please sign in first.');
    }
    if (this.mkBuffer) {
      return this.mkBuffer;
    }
    const mk = user.unsafeMetadata.mk as string;
    if (mk) {
      this.mkBuffer = Buffer.from(mk, 'hex');
    } else {
      this.mkBuffer = await this._setMk();
    }
    return this.mkBuffer;
  }
  async getPkPem(): Promise<{ privateKeyPem: string; publicKeyPem: string }> {
    const mkBuffer = await this.getMekBytes();
    const user = this.clerkJs.user;
    if (!this.privateKeyCipherBuffer) {
      const pk = user?.unsafeMetadata.pk as string;
      if (pk) {
        this.privateKeyCipherBuffer = Buffer.from(pk, 'hex');
      } else {
        this.privateKeyCipherBuffer = await this._setPk(mkBuffer);
      }
    }
    const iv = this.privateKeyCipherBuffer.slice(0, 16);
    const cipher = this.privateKeyCipherBuffer.slice(16);
    const decrypt = CipherHelper.aesDecrypt(mkBuffer, iv, cipher);
    const { publicKeyPem, privateKeyPem } =
      CipherHelper.getPublicKeyPemFromPrivate(decrypt);
    return { privateKeyPem, publicKeyPem };
  }
  async personalSignature(signData: string): Promise<string> {
    if (!this.waPk) {
      throw new Error('Please connect first.');
    }
    const account = await this.web3.eth.accounts.privateKeyToAccount(this.waPk);
    const sign = await account.sign(signData);
    return sign.signature;
  }

  public async init(): Promise<string | undefined> {
    await this.clerkJs.load(this.config?.options);
    if (this.clerkJs.user) {
      const email = this.clerkJs.user.primaryEmailAddress
        ?.emailAddress as string;
      localStorage.setItem(WALLET_key, email);
      const sesstion_token = (await this.clerkJs.session?.getToken({
        template: 'mindnetwork',
      })) as string;
      await this._initWaPk();
      return sesstion_token;
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  public renderUserButton(
    dom?: HTMLDivElement,
    userButtonProps?: UserButtonProps,
  ): void {
    const target = dom || this.config?.target;
    let compontens = null;
    if (typeof target === 'string') {
      compontens = document.querySelector(target) as HTMLDivElement;
    }
    if (target instanceof HTMLDivElement) {
      compontens = target;
    }
    if (!compontens) {
      throw new Error('clerk target dom node is not a HTMLDivElement');
    }
    this.clerkJs.mountUserButton(compontens, {
      ...this.config?.userButtonProps,
      ...userButtonProps,
    });
  }

  public async signIn(props?: SignInProps): Promise<void> {
    await this.clerkJs.openSignIn(props);
  }

  private async _setMk(): Promise<Buffer> {
    const mk: string = CipherHelper.generateMk();
    const user = this.clerkJs.user;
    await user?.update({
      unsafeMetadata: {
        ...user?.unsafeMetadata,
        mk,
      },
    });
    return Buffer.from(mk, 'hex');
  }

  private async _setPk(mekBuffer: Buffer): Promise<Buffer> {
    const keys = CipherHelper.createKeyPemString();
    const iv = CipherHelper.randomBytes();
    const privateKeyCipherBuffer = Buffer.concat([
      iv,
      CipherHelper.aesEncrypt(mekBuffer, iv, keys.privateKeyPem),
    ]);
    const user = this.clerkJs.user;
    await user?.update({
      unsafeMetadata: {
        ...user?.unsafeMetadata,
        pk: privateKeyCipherBuffer.toString('hex'),
      },
    });
    return privateKeyCipherBuffer;
  }

  private async _initWaPk(): Promise<void> {
    if (this.waPk) {
      return;
    }
    const user = this.clerkJs.user;
    if (!user) {
      return;
    }
    const waPk = user.unsafeMetadata.waPk as string;
    if (waPk) {
      this.waPk = waPk;
      return;
    }
    const privateKey = this.web3.eth.accounts.create().privateKey;
    await user?.update({
      unsafeMetadata: {
        ...user?.unsafeMetadata,
        waPk: privateKey,
      },
    });
    this.waPk = privateKey;
  }
}
