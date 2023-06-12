import { MindLake } from 'mind-lake-sdk';
import React from 'react';
import useUtils, { resultFormat } from '@/pages/useUtils';

const tableName = "table_encrypt";
const columns = [{columnName: 'id', type: MindLake.DataType.int4, encrypt: true}, {columnName: 'name', type: MindLake.DataType.text, encrypt: true}];


const Index = () => {

  const { result, login, logger} = useUtils();

  const quickStart = async () => {
    const mindLake = await login();
    if(!mindLake) {
      return ;
    }

    // create a table
    const dataLake = mindLake.dataLake;
    await dataLake.dropTable(tableName);

    let result = await dataLake.createTable(tableName, columns);
    logger(`create Table "${tableName}" columns "${JSON.stringify(columns)}" >>> ${resultFormat(result)}`);
    if(result.code !== 0) {
      return
    }

    // encrypt data
    const crypto = mindLake.crypto;
    result = await crypto.encrypt(1, `${tableName}.id`);
    logger(`encrypt(${tableName}.id, 1) >>> ${resultFormat(result)}`);
    if(result.code !== 0) {
      return
    }
    const encryptId = result.result;
    result = await crypto.encrypt("tom", `${tableName}.name`);
    logger(`encrypt(${tableName}.name, "tom") >>> ${resultFormat(result)}`);
    if(result.code !== 0) {
      return
    }
    const encryptName = result.result;
    // insert encrypted data
    const sql = `insert into ${tableName} (id, name) values ('${encryptId}', '${encryptName}')`;
    result = await dataLake.query(sql);
    logger(`${sql} >>> ${resultFormat(result)}`);
    if(result.code !== 0){
      return
    }

    //query encrypted data;
    const selectSql = `select * from ${tableName}`;
    result = await dataLake.query(selectSql);
    logger(`${selectSql} >>> ${resultFormat(result)}`);
    if(result.code === 0) {
      const columnList = result.result.columnList;
      for (const row of result.result.data) {
        for (const index in row) {
          const encryptData = row[index];
          const column = columnList[index];
          const decryptRes = await crypto.decrypt(encryptData);
          logger(`decrypt(${tableName}.${column}) >>> ${resultFormat(decryptRes)}`)
        }
      }
    }
  };


  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <div><button onClick={quickStart}>Quick start with your MetaMask (for development only)</button></div>
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
