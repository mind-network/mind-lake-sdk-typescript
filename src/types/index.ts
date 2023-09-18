import { ClerkOptions, UserButtonProps } from '@clerk/types';
export type ResultType = {
  code: number;
  message?: string;
  result?: any;
};

/**
 * This enum can be used in conjunction with the Column class,
 * which represents a single column in a database table, to specify the data type of the column.
 * By utilizing the DataType enum,
 * you can ensure that your data is stored in the appropriate format and can be processed correctly by the system.
 */
export enum DataType {
  int4 = 1,
  int8 = 2,
  float4 = 3,
  float8 = 4,
  decimal = 5,
  text = 6,
  timestamp = 7,
}

export type ColumnType = {
  columnName: string;
  type: DataType;
  encrypt: boolean;
};

export type ServerInfo = {
  publicKey: string;
  mekId: string;
  isRegistered: boolean;
  isMekProvision: boolean;
  isSelfBcl: boolean;
};

export type ChainInfo = {
  id: number;
  chainId: string;
  chainName: string;
  hexadecimalChainId: string;
  currency: string;
  rpcNodeUrl: string;
  rpcOtherNodeUrl: string;
  abi: string;
  smartAddress: string;
  createTime: string;
  updateTime: string;
  status: number;
  feature: string;
};

export type RequestMekProvisionBody = {
  bizType: number;
  databasePublicKey: string;
  envelope: string;
};

export type RequestRegisterCertificateBody = {
  bizType: number;
  mekId: string;
  pukId: string;
  publicKey: string;
  privateSig: string;
  mekSig: string;
};

export type CCEntry = {
  ctxId: number;
  dekId: string;
  encryptedDek: string;
  algorithm: number;
  groupId: string;
};

export interface MkManager {
  getWalletAccount(): Promise<string>;
  checkConnection(): Promise<void>;
  getMekBytes(): Promise<Buffer>;
  getPkPem(): Promise<{
    privateKeyPem: string;
    publicKeyPem: string;
  }>;
  personalSignature(signData: string): Promise<string>;
  encrypt(str: string): Promise<Buffer | undefined>;
  decrypt(cipher: Buffer): Promise<Buffer>;
}

/**
 * target userButton dom node render to
 */
export type ClerkConfig = {
  target?: string | HTMLDivElement;
  options?: ClerkOptions;
  userButtonProps?: UserButtonProps;
};

export type MindLakeConfig = {
  clerk?: ClerkConfig;
};

export type ConnectChain = ChainInfo | { clerk: ClerkConfig };
