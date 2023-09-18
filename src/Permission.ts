import { MindLake } from './MindLake';
import { Service } from './request';
import { Bcl } from './util/bcl';
import { ResultType } from './types';
import Result from './util/result';
import { MkManager } from './types';

export default class Permission {
  private readonly service!: Service;

  private readonly mkManager!: MkManager;

  private readonly sdk!: MindLake;

  constructor(sdk: MindLake) {
    this.service = sdk.service;
    this.mkManager = sdk.mkManager;
    this.sdk = sdk;
  }

  /**
   *
   * @param targetWalletAddress
   */
  public async grant(
    targetChain: string,
    targetWalletAddress: string,
    columns: Array<string>,
  ): Promise<ResultType> {
    try {
      MindLake.checkLogin();
      this.sdk.checkRegistered();
      if (!columns.length) {
        throw new Error('no columns to need grant');
      }

      const bcl = new Bcl(this.service);
      //get subjectPublicId
      const res = await this.service.execute<any, { publicKeyId: string }>({
        bizType: 119,
        targetWalletAddress: targetWalletAddress,
        targetChain,
      });
      if (!res || !res.publicKeyId) {
        throw new Error(
          "Peer user (Subject)'s certificate hasn't been registered.",
        );
      }
      await bcl.createBclBody(this.sdk.registerPukId, res.publicKeyId, '');

      const eachFunc = async (data: Array<string>) => {
        for (const tableColumn of data) {
          const [table, column] = tableColumn.split('.');
          await this._addColumnIntoBcl(bcl, table, column);
        }
      };

      await eachFunc(columns);
      const { privateKeyPem } = await this.sdk.mkManager.getPkPem();
      const sn = await bcl.issueBcl(privateKeyPem, 115);
      return Result.success(sn);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  /**
   *
   * @param policyId
   */
  public async confirm(policyId: string): Promise<ResultType> {
    try {
      MindLake.checkLogin();
      this.sdk.checkRegistered();
      if (!policyId) {
        throw new Error('The policy id is empty');
      }
      const bcl = new Bcl(this.service);
      await bcl.loadBclBodyBySN(policyId);
      if (!bcl.bclBody || !bcl.bclBody.serial_num) {
        throw new Error('The policyID is not correct');
      }
      const { privateKeyPem } = await this.mkManager.getPkPem();
      const sn = await bcl.issueBcl(privateKeyPem, 117);
      return Result.success(sn);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  /**
   * revoke grant
   * @param targetWalletAddress
   * @param columns, if the columns is empty ,will revoke all
   */
  public async revoke(
    targetWalletAddress: string,
    targetChain: string,
    columns?: Array<{ table: string; column: string }>,
  ): Promise<ResultType> {
    try {
      MindLake.checkLogin();
      this.sdk.checkRegistered();
      const bcl = new Bcl(this.service);
      //get subjectPublicId
      const res = await this.service.execute<any, { publicKeyId: string }>({
        bizType: 119,
        targetWalletAddress: targetWalletAddress,
        targetChain,
      });
      if (!res || !res.publicKeyId) {
        throw new Error(
          "Peer user (Subject)'s certificate hasn't been registered.",
        );
      }
      await bcl.loadBclBodyByPukId(this.sdk.registerPukId, res.publicKeyId);
      if (!bcl.bclBody || !bcl.bclBody.serial_num) {
        throw new Error('No grant required to revoke!');
      }
      if (!columns || !columns.length) {
        bcl.removeDekGroupAll();
      } else {
        const groupIdArray = new Array<string>();
        const eachFunc = async (
          data: Array<{ table: string; column: string }>,
        ) => {
          for (const column of data) {
            const ccSelf = await this.service.execute<any, { groupId: string }>(
              {
                bizType: 108,
                schema: 'public',
                table: column.table,
                column: column.column,
              },
            );
            if (!ccSelf.groupId) {
              throw new Error('groupId is not exist');
            }
            groupIdArray.push(ccSelf.groupId);
          }
        };
        await eachFunc(columns);
        bcl.removeDekGroup(groupIdArray);
      }
      const { privateKeyPem } = await this.mkManager.getPkPem();
      const sn = await bcl.issueBcl(privateKeyPem, 115);
      return Result.success(sn);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  public async listGrantee(): Promise<ResultType> {
    try {
      const data = await this.service.execute({ bizType: 126 });
      return Result.success(data);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  public async listOwner(): Promise<ResultType> {
    try {
      const data = await this.service.execute({ bizType: 130 });
      return Result.success(data);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  public async listOwnerColumn(
    targetWalletAddress: string,
    targetChain: string,
  ): Promise<ResultType> {
    try {
      const data = await this.service.execute({
        bizType: 131,
        targetWalletAddress,
        targetChain,
      });
      return Result.success(data);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  public async listGrantedColumn(
    targetWalletAddress: string,
    targetChain: string,
  ): Promise<ResultType> {
    try {
      const data = await this.service.execute({
        bizType: 127,
        targetWalletAddress,
        targetChain,
      });
      return Result.success(data);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  public async _addColumnIntoBcl(
    bcl: Bcl,
    table: string,
    column: string,
    minId = 1,
    maxId = 1000,
  ) {
    const ccSelf = await this.service.execute<any, { groupId: string }>({
      bizType: 108,
      table: table,
      column: column,
    });
    if (!ccSelf.groupId) {
      throw new Error('groupId is not exist');
    }
    const issuerDekGroup = { groupid: ccSelf.groupId, min: minId, max: maxId };
    bcl.addDekGroup(issuerDekGroup);
  }
}
