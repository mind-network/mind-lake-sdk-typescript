import { Service } from './request';
import { MindLake } from './MindLake';
import Result from './util/result';
import { ColumnType, ResultType } from './types';

export default class DataLake {
  private service!: Service;

  constructor(sdk: MindLake) {
    this.service = sdk.service;
  }

  public async query(executeSql: string,) {
    try {
      const res = await this.service.execute({bizType: 114, executeSql});
      return Result.success(res);
    }catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  public async createCocoon(cocoonName: string): Promise<ResultType> {
    try {
      await this.service.execute({ bizType: 121, cocoonName });
      return Result.success(true);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  public async dropCocoon(cocoonName: string): Promise<ResultType> {
    try {
      await this.service.execute({ bizType: 129, cocoonName });
      return Result.success(true);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  public async createTable(
    tableName: string,
    columns: Array<ColumnType>,
    pkColumns?: Array<string>,
  ): Promise<ResultType> {
    try {
      await this.service.execute({
        bizType: 123,
        tableName,
        columns,
        pkColumns,
      });
      return Result.success(true);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  public async dropTable(tableName: string): Promise<ResultType> {
    try {
      await this.service.execute({ bizType: 128, tableName });
      return Result.success(true);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  public async listCocoon(): Promise<ResultType> {
    try {
      const data = await this.service.execute({ bizType: 122 });
      return Result.success(data);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  public async listTablesByCocoon(cocoonName: string): Promise<ResultType> {
    try {
      const data = await this.service.execute({
        bizType: 125,
        cocoonName,
      });
      return Result.success(data);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  public async linkTableToCocoon(
    tableName: string,
    cocoonName: string,
  ): Promise<ResultType> {
    try {
      const data = await this.service.execute({
        bizType: 124,
        tableName,
        cocoonName,
      });
      return Result.success(data);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }

  public async listTableByWalletAddress(): Promise<ResultType>{
    try {
      const data = await this.service.execute({
        bizType: 301
      });
      return Result.success(data);
    } catch (e) {
      console.error(e);
      return Result.fail(e);
    }
  }
}
