import { MindLake } from 'mind-lake-sdk';
import React from 'react';
import useUtils, { resultFormat } from '@/pages/useUtils';

const tableName1 = "wallet_balance";
const columns1 = [{columnName: 'WalletAddress', type: MindLake.DataType.text, encrypt: false}, {columnName: 'Name', type: MindLake.DataType.text, encrypt: true}, {columnName: 'Balance', type: MindLake.DataType.float4, encrypt: true}];


const Index = () => {

  const { result, login, logger} = useUtils();

  const useCase1 = async () => {
    const mindLake = await login();
    if(!mindLake) {
      return ;
    }

    // create a table
    const dataLake = mindLake.dataLake;
    await dataLake.dropTable(tableName1);
    let result = await dataLake.createTable("wallet_balance", columns1, ["WalletAddress"]);
    logger(`create Table "${tableName1}" columns "${JSON.stringify(columns1)}" >>> ${resultFormat(result)}`);
    if(result.code !== 0) {
      return
    }

    // encrypt data
    const crypto = mindLake.crypto;
    result = await crypto.encrypt("Alice", `${tableName1}.Name`);
    logger(`encrypt(${tableName1}.Name, "Alice") >>> ${resultFormat(result)}`);
    if(result.code !== 0) {
      return
    }
    let encryptedName = result.result;
    result = await crypto.encrypt(10.5, `${tableName1}.Balance`);
    logger(`encrypt(${tableName1}.Balance, 10.5") >>> ${resultFormat(result)}`);
    if(result.code !==0 ) {
      return
    }
    let encryptedBalance = result.result;

    // insert encrypted data
    const sql_alice = `insert into wallet_balance ("WalletAddress", "Name", "Balance") values ('0xB2F588A50E43f58FEb0c05ff86a30D0d0b1BF065', '${encryptedName}', '${encryptedBalance}')`;
    result = await dataLake.query(sql_alice);
    logger(`${sql_alice} >>> ${resultFormat(result)}`);
    if(result.code !== 0){
      return
    }

    result = await crypto.encrypt("Bob", `${tableName1}.Name`);
    logger(`encrypt(${tableName1}.Name, "Bob") >>> ${resultFormat(result)}`);
    if(result.code !== 0) {
      return
    }
    encryptedName = result.result;

    result = await crypto.encrypt(20.8, `${tableName1}.Balance`);
    logger(`encrypt(${tableName1}.Balance, 20.8") >>> ${resultFormat(result)}`);
    if(result.code !==0 ) {
      return
    }
    encryptedBalance = result.result;

    // insert encrypted data
    const sql_bob = `insert into wallet_balance ("WalletAddress", "Name", "Balance") values ('0x420c08373E2ba9C7566Ba0D210fB42A20a1eD2f8', '${encryptedName}', '${encryptedBalance}')`;
    result = await dataLake.query(sql_bob);
    logger(`${sql_bob} >>> ${resultFormat(result)}`);
    if(result.code !== 0){
      return
    }
    //query encrypted data;
    const selectSql = `select * from ${tableName1}`;
    result = await dataLake.query(selectSql);
    logger(`${selectSql} >>> ${resultFormat(result)}`);
    if(result.code === 0) {
      const columnList = result.result.columnList;
      for (const row of result.result.data) {
        for (const index in row) {
          // @ts-ignore
          if(index > 0) {
            const encryptData = row[index];
            const column = columnList[index];
            const decryptRes = await crypto.decrypt(encryptData);
            logger(`decrypt(${tableName1}.${column}) >>> ${resultFormat(decryptRes)}`)
          }
        }
      }
    }

  };


  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <div><button onClick={useCase1}>Test case one with your MetaMask (for development only)</button></div>
      <div style={{marginTop: 30, fontSize: 16}}>
        Logs output: <br />
        {
          result.map((log, k) => <div key={k} style={{padding: 10}}>{ log }</div>)
        }
      </div>
    </div>
  )


};

export default Index;
