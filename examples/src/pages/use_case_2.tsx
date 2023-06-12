import useUtils, { resultFormat } from '@/pages/useUtils';
import React from 'react';
import { MindLake } from 'mind-lake-sdk';
// @ts-ignore
import md5 from 'js-md5';

const tableName2 = "album_1";
const columns2 = [{columnName: 'name', type: MindLake.DataType.text, encrypt: false}, {columnName: 'picture', type: MindLake.DataType.text, encrypt: true}];


const Index = () => {

  const { result, login, logger} = useUtils();

  const useCase2 = async () => {
    const mindLake = await login();
    if(!mindLake) {
      return ;
    }

    const response = await fetch("https://avatars.githubusercontent.com/u/97393721");
    if(!response || response.status !== 200) {
      return logger("Failed to get picture from github")
    }
    const image = await response.arrayBuffer();
    logger(`MD5 of the original picture pic_origin.png: >>> ${md5(image)}`);
    const base64 = Buffer.from(image).toString('base64');
    logger('get picture from github >>>');
    logger(<img src={'data:image/png;base64,' +base64} style={{width: 200}}/>)
    // create a table
    const dataLake = mindLake.dataLake;
    await dataLake.dropTable(tableName2);
    let result = await dataLake.createTable(tableName2, columns2);
    logger(`create Table "${tableName2}" columns "${JSON.stringify(columns2)}" >>> ${resultFormat(result)}`);
    if(result.code !==0 ) {
      return
    }
    const crypto = mindLake.crypto;
    result = await crypto.encrypt(base64, `${tableName2}.picture`);
    logger(`encrypt(${tableName2}.picture) >>>${resultFormat(result)}`);
    if(result.code !== 0) {
      return
    }
    const sql = `insert into ${tableName2} (name, picture) values ('mind.png', '${result.result}')`;
    result = await dataLake.query(sql);
    logger(`${sql} >>> ${resultFormat(result)}`);
    if(result.code !== 0) {
      return
    }

    const selectSql = `select * from ${tableName2}`;
    result = await dataLake.query(selectSql);
    logger(`${selectSql} >>> ${resultFormat(result)}`);
    if(result.code !== 0) {
      return
    }
    for (const row of result.result.data) {
      const decrypt = await crypto.decrypt(row[1]);
      logger(`decrypt(${tableName2}.picture) >>> ${JSON.stringify(md5(Buffer.from(decrypt.result, 'base64')))}`);
      logger('decrypt picture from mind lake >>>');
      logger(<img src={'data:image/png;base64,' + decrypt.result} style={{width: 200}}/>)
    }
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <div><button onClick={useCase2}>Test case two with your MetaMask (for development only)</button></div>
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
