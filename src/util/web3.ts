import { Web3Provider } from '@ethersproject/providers';
import web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { CipherHelper } from './cipher';
import { encrypt } from '@metamask/eth-sig-util';
import { CHAIN_KEY, WALLET_key } from './constant';
import { MindLake } from '../MindLake';
import { ChainInfo, MkManager } from '../types';
// const encrypt = {};

export interface RequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}

export interface Web3WithWalletProvider extends Web3Provider {
  request(args: RequestArguments): Promise<unknown>;
  selectedAddress: string;
}

/**
 * web3 helper
 */
export class Web3Interact implements MkManager {
  private readonly provider: Web3WithWalletProvider;

  /**
   * wallet address
   */
  private account!: string;

  /**
   * web3 instance
   */
  private web3!: web3;

  /**
   * contract instance
   */
  private contract!: Contract;

  /**
   * contract address
   */
  public static CONTRACT_ADDRESS = '0xF5932e67e84F08965DC6D62C2B67f47a6826E5a7';

  public static SUPPORT_CHAIN = 5;

  /**
   * currnt chaind
   */
  public chain: ChainInfo | undefined;

  /**
   * wallet publicKe
   */
  private publicKey!: string;

  /**
   * encrypt mk buffer
   */
  private mkCipherBuffer!: Buffer;

  /**
   * decrypt mk buffer
   */
  private mkBuffer!: Buffer;

  /**
   * encrypt privateKey buffer
   */
  private privateKeyCipherBuffer!: Buffer;

  constructor() {
    if (!window.ethereum) {
      throw new Error('Please install a wallet');
    }
    let currentProvider;
    // @ts-ignore
    if (window.ethereum.providers) {
      // @ts-ignore
      currentProvider = window.ethereum.providers.find(
        (p: any) => p.isMetaMask,
      );
    } else {
      currentProvider = window.ethereum;
    }
    if (!currentProvider.isMetaMask) {
      throw new Error(
        'Only MetamMask wallet is supported currently. Please install or replace',
      );
    }
    this.provider = currentProvider;
    this.web3 = new web3(currentProvider);
    this._onListen();
  }
  async encrypt(str: string): Promise<Buffer | undefined> {
    const pubKey = await this._getEncryptionPublicKey();
    if (pubKey) {
      const enc = encrypt({
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
    const structuredData = {
      version: 'x25519-xsalsa20-poly1305',
      ephemPublicKey: cipher.slice(0, 32).toString('base64'),
      nonce: cipher.slice(32, 56).toString('base64'),
      ciphertext: cipher.slice(56).toString('base64'),
    };
    // Convert data to hex string required by MetaMask
    const ct = `0x${Buffer.from(
      JSON.stringify(structuredData),
      'utf8',
    ).toString('hex')}`;
    const decrypt = (await this.provider.request({
      method: 'eth_decrypt',
      params: [ct, this.account],
    })) as string;
    return Buffer.from(decrypt, 'base64');
  }

  public setChain(chain: ChainInfo) {
    this.chain = chain;
  }

  private _onListen() {
    this.provider.on('accountsChanged', this._onAccountsChanged.bind(this));
    this.provider.on('chainChanged', this._onChainChanged.bind(this));
    this.provider.on('disconnect', this._onDisconnect.bind(this));
  }

  /**
   * connected wallet account change event
   * @param accounts
   * @private
   */
  private _onAccountsChanged(accounts: string[]) {
    console.log('Wallet address changed:', accounts && accounts[0]);
    localStorage.setItem(WALLET_key, accounts && accounts[0]);
    this.account = accounts && accounts[0];
    this._walletChange();
  }

  /**
   * chain change event
   * @param chainId
   * @private
   */
  private _onChainChanged(chainId: number) {
    console.log(
      'Chain changed:  ',
      web3.utils.hexToNumber(chainId),
      this.account,
    );
    localStorage.setItem(
      CHAIN_KEY,
      JSON.stringify({ chainId: web3.utils.hexToNumber(chainId) as string }),
    );
    this._walletChange();
  }

  private _walletChange() {
    if (this.account) {
      this.mkCipherBuffer = undefined!;
      this.mkBuffer = undefined!;
      this.privateKeyCipherBuffer = undefined!;
      this.publicKey = undefined!;
    }
  }

  /**
   * wallet disconnect
   * @private
   */
  private _onDisconnect() {
    console.log('Wallet disconnect: ');
  }

  /**
   * get walletAddress
   */
  public async getWalletAccount(): Promise<string> {
    if (!this.account || !MindLake.isConnected) {
      const accounts = (await this.provider.request({
        method: 'eth_requestAccounts',
      })) as string[];
      if (!accounts.length) {
        throw new Error('No accounts returned');
      }
      this.account = accounts[0];
    }
    localStorage.setItem(WALLET_key, this.account);
    return this.account;
  }

  public async checkConnection() {
    try {
      const accounts = (await this.provider.request({
        method: 'eth_accounts',
      })) as Array<string>;
      if (accounts.length) {
        this.account = accounts[0];
        localStorage.setItem(WALLET_key, accounts[0]);
      }
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * wallet signature
   * @param signData
   */
  public async personalSignature(signData: string): Promise<string> {
    const signature = await this.provider.request({
      method: 'personal_sign',
      params: [web3.utils.fromUtf8(signData), this.account],
    });
    return signature as string;
  }

  /**
   * get wallet publicKey
   * @private
   */
  public async _getEncryptionPublicKey(): Promise<string | undefined> {
    if (this.provider) {
      if (this.publicKey) {
        return this.publicKey;
      }
      const keyB64: string = (await this.provider.request({
        method: 'eth_getEncryptionPublicKey',
        params: [this.account],
      })) as string;
      this.publicKey = keyB64;
      return this.publicKey;
    }
  }

  /**
   * get mk
   */
  public async getMekBytes(): Promise<Buffer> {
    await this._changeChainToSupportChain();
    await this._loadKeysCipherFromChain();
    if (!this.mkCipherBuffer) {
      await this._generateKeysCipherToChain();
    }
    if (!this.mkBuffer) {
      this.mkBuffer = await this._decryptMk(this.mkCipherBuffer);
    }
    // console.log("mk", this.mkBuffer.toString("hex"))
    return this.mkBuffer;
  }

  /**
   * get pk
   */
  public async getPkPem(): Promise<{
    privateKeyPem: string;
    publicKeyPem: string;
  }> {
    const mk = await this.getMekBytes();
    const iv = this.privateKeyCipherBuffer.slice(0, 16);
    const cipher = this.privateKeyCipherBuffer.slice(16);
    const decrypt = CipherHelper.aesDecrypt(mk, iv, cipher);
    const { publicKeyPem, privateKeyPem } =
      CipherHelper.getPublicKeyPemFromPrivate(decrypt);
    return { privateKeyPem, publicKeyPem };
  }

  /**
   *load keys form chain
   */
  private async _loadKeysCipherFromChain() {
    if (this.mkCipherBuffer && this.privateKeyCipherBuffer) {
      return;
    }
    const account = await this.getWalletAccount();
    const keys = await this.contract.methods.getKeys(account).call();
    if (keys && keys.MK && keys.SK) {
      this.mkCipherBuffer = Buffer.from(keys.MK.slice(2), 'hex');
      this.privateKeyCipherBuffer = Buffer.from(keys.SK.slice(2), 'hex');
    }
  }

  /**
   * generateKeys form local to chain
   * @private
   */
  private async _generateKeysCipherToChain() {
    if (this.mkCipherBuffer && this.privateKeyCipherBuffer) {
      return;
    }
    const account = await this.getWalletAccount();
    const checkAccount = await this.web3.utils.toChecksumAddress(account);
    const mk = CipherHelper.generateMk();
    const mekBuffer = Buffer.from(mk, 'hex');
    const keys = CipherHelper.createKeyPemString();
    const iv = CipherHelper.randomBytes();
    const privateKeyCipherBuffer = Buffer.concat([
      iv,
      CipherHelper.aesEncrypt(mekBuffer, iv, keys.privateKeyPem),
    ]);
    const mkCipherBuffer = await this._encryptMk(mk);
    if (!mkCipherBuffer) {
      throw new Error('mk encrypt error');
    }
    const txHash = await this.contract.methods
      .setKeys(mkCipherBuffer, privateKeyCipherBuffer)
      .send({ from: checkAccount });
    if (txHash && txHash.blockHash) {
      this.mkCipherBuffer = mkCipherBuffer;
      this.privateKeyCipherBuffer = privateKeyCipherBuffer;
    }
  }

  /**
   * encrypt mk
   * @param mk
   * @private
   */
  private async _encryptMk(mk: string): Promise<Buffer | undefined> {
    return this.encrypt(mk);
  }

  /**
   * decrypt mk
   * @param data
   * @private
   */
  private async _decryptMk(data: Buffer): Promise<Buffer> {
    return this.decrypt(data);
  }

  /**
   *
   * @param chainId support chainId
   * @private
   */
  public async _changeChainToSupportChain() {
    if (!this.chain) {
      throw new Error('chain not found');
    }
    const abi = JSON.parse(this.chain.abi);
    this.contract = new this.web3.eth.Contract(
      // @ts-ignore
      abi,
      this.chain.smartAddress,
    );
    const currentNetworkId = await this.web3.eth.net.getId();
    console.log(
      'currentNetworkId',
      currentNetworkId,
      'target chainId ',
      this.chain.chainId,
    );
    if (currentNetworkId != Number(this.chain.chainId)) {
      try {
        await this.provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: this.web3.utils.toHex(this.chain.chainId) }],
        });
      } catch (error: any) {
        if (error?.code === 4902) {
          // Add chain to MetaMask
          await this.provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainName: this.chain.chainName,
                chainId: web3.utils.toHex(this.chain.chainId),
                nativeCurrency: {
                  name: this.chain.currency,
                  decimals: 18,
                  symbol: this.chain.currency,
                },
                rpcUrls: [this.chain.rpcNodeUrl],
              },
            ],
          });
        } else {
          throw new Error(error);
        }
      }
    }
  }
}
