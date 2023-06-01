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
