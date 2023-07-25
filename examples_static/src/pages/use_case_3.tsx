import useUtils, { resultFormat } from '@/pages/useUtils';
import React, { useRef, useState } from 'react';
import { MindLake } from 'mind-lake-sdk';
// import { aliceWalletAddress as alice, bobWalletAddress as bob, charlieWalletAddress as charlie} from '@/myconfig';

const tableName3 = "transaction";
const columns3 = [{columnName: 'WalletAddress', type: MindLake.DataType.text, encrypt: false}, {columnName: 'Token', type: MindLake.DataType.text, encrypt: true}, {columnName: 'Volume', type: MindLake.DataType.float4, encrypt: true}];

const dataAlice = [
  { WalletAddress: "0x8CFB38b2cba74757431B205612E349B8b9a9E661", Token: 'USDT', Volume: 5.6 },
  { WalletAddress: "0xD862D48f36ce6298eFD00474eC852b8838a54F66", Token: 'BUSD', Volume: 6.3 },
  { WalletAddress: "0x8CFB38b2cba74757431B205612E349B8b9a9E661", Token: 'BUSD', Volume: 10.3},
];

const dataBob = [
  { WalletAddress: '0xD862D48f36ce6298eFD00474eC852b8838a54F66', Token: 'USDT', Volume: 3.3},
  { WalletAddress: '0x70dBcC09edF6D9AdD4A235e2D8346E78A79ac770', Token: 'BUSD', Volume: 9.8},
  { WalletAddress: '0x70dBcC09edF6D9AdD4A235e2D8346E78A79ac770', Token: 'USDT', Volume: 7.7}
];

const Index = () => {

  const { result: resultAlice, login: loginAlice, logger: loggerAlice, loading: loadingAlice } = useUtils();

  const { result: resultBob, login: loginBob, logger: loggerBob, loading: loadingBob } = useUtils();

  const { result: resultCharlie, login: loginCharlie, logger: loggerCharlie, loading: loadingCharlie } = useUtils();

  const policyList = useRef<Array<string>>([]);

  const [alice, setAlice] = useState("");
  const [bob, setBob] = useState("");
  const [charlie, setCharlie] = useState("");

  const insertData = async (data: Array<any>, role: string) => {
    let login,logger;
    if(role === 'alice') {
      login = loginAlice;
      logger = loggerAlice;
    }else{
      login = loginBob;
      logger = loggerBob;
    }
    if(!alice || !bob || !charlie) {
      logger(`Please input alice , bob and charlie wallet address`);
      return ;
    }

    const mindLake = await login(false);
    if(!mindLake) {
      return
    }
    // create a table
    const dataLake = mindLake.dataLake;
    await dataLake.dropTable(tableName3);
    let result = await dataLake.createTable(tableName3, columns3);
    logger(`create Table ${tableName3} columns ${JSON.stringify(columns3)} >>> ${resultFormat(result)}`);
    if(result.code !==0 ) {
      return
    }

    // encrypt data
    const crypto = mindLake.crypto;
    for (const row of data) {
      const walletAddress = row.WalletAddress;
      const encryptToken = await crypto.encrypt(row.Token, `${tableName3}.Token`);
      logger(`encrypt(${walletAddress}.${tableName3}.Token, ${row.Token}) >>> ${encryptToken.result}`);
      const encryptVolume = await crypto.encrypt(row.Volume, `${tableName3}.Volume`);
      logger(`encrypt(${walletAddress}.${tableName3}.Volume, ${row.Volume}) >>> ${encryptVolume.result}`);
      const sql = `insert into transaction ("WalletAddress", "Token", "Volume") values ('${walletAddress}', '${encryptToken.result}', '${encryptVolume.result}')`;
      result = await dataLake.query(sql);
      logger(`${sql} >>> ${resultFormat(result)}`);
      if(result.code !== 0) {
        return
      }
    }
    const permission = mindLake.permission;
    result = await permission.grant(charlie, [`${tableName3}.Token`, `${tableName3}.Volume`]);
    logger(`grant columns ${JSON.stringify([`${tableName3}.Token`, `${tableName3}.Volume`])} to charlie >>> ${resultFormat(result)}`);
    if(result.code !==0 ) {
      return
    }
    logger(`Insert data done`);
    await mindLake.disConnect();
    if(policyList.current) {
      if(policyList.current.length > 2) {
        policyList.current = [];
      }
      policyList.current.push(result.result)
    }
  };

  const charlieQuery = async () => {
    const logger = loggerCharlie;
    const login = loginCharlie;
    if(!alice || !bob || !charlie) {
      logger(`Please input alice , bob and charlie wallet address`);
      return ;
    }

    if(!policyList.current || policyList.current.length != 2) {
      return logger(`Please wait Alice or Bob grant data`)
    }
    console.log(policyList.current);
    // @ts-ignore
    const [policyAliceID, policyBobID] = policyList.current;
    const mindLake = await login(false);
    if(!mindLake) {
      return ;
    }
    const permission =  mindLake.permission;
    const dataLake =  mindLake.dataLake;
    const crypto = mindLake.crypto;
    let result = await permission.confirm(policyAliceID);
    logger(`charlie confirm grant policyAliceId=${policyAliceID} >>> ${resultFormat(result)}`);
    if(result.code !== 0) {
      return
    }
    result = await permission.confirm(policyBobID);
    logger(`charlie confirm grant policyAliceId=${policyBobID} >>> ${resultFormat(result)}`);
    if(result.code !== 0) {
      return
    }

    const sql = `SELECT combine."WalletAddress", SUM(combine."Volume") FROM
(SELECT "WalletAddress","Volume" FROM "${alice.slice(2).toLocaleLowerCase()}"."transaction"
UNION ALL
SELECT "WalletAddress","Volume" FROM "${bob.slice(2).toLocaleLowerCase()}"."transaction") as combine
GROUP BY "WalletAddress"`;
    result = await dataLake.query(sql);
    logger(`${sql} >>> ${resultFormat(result)}`);
    if(result.code !== 0) {
      return
    }
    const columnList = result.result.columnList;
    for (const row of result.result.data) {
      const walletAddress = row[0];
      result = await crypto.decrypt(row[1]);
      logger(`${walletAddress}.${columnList[1]} >>> ${resultFormat(result)}`);
      if(result.code !== 0) {
        return
      }
    }
  };


  return (
    <>
      <div style={{textAlign: 'center', margin: '30px 0'}}>Before starting this use case, please confirm that the 3 wallets have been registered on the <a href="https://scan.mindnetwork.xyz" target="_blank">https://scan.mindnetwork.xyz</a> </div>
      <div style={{paddingInline: 20, marginBottom: 10}}>
        <div style={{display: 'flex', gap: 20}}><div style={{width: 150, textAlign: 'right'}}>Alice address: </div><input style={{width: 400, marginBottom: 10 }} placeholder="Please input alice wallet address" value={alice} onChange={e => setAlice(e.target.value)}/></div>
        <div style={{display: 'flex', gap: 20}}><div style={{width: 150, textAlign: 'right'}}>Bob address: </div><input style={{width: 400, marginBottom: 10}} value={bob} placeholder="Please input bob wallet address" onChange={e => setBob(e.target.value)}/></div>
        <div style={{display: 'flex', gap: 20}}><div style={{width: 150, textAlign: 'right'}}>Charlie address: </div><input style={{width: 400, marginBottom: 10}} placeholder="Please input charlie wallet address" value={charlie} onChange={e => setCharlie(e.target.value)}/></div>
      </div>
      <div style={{display: 'flex',  justifyContent: "space-between", gap: 50, paddingInline: 20}}>
      <div style={{flex: 1}}>
        <button onClick={() => insertData(dataAlice, 'alice')} disabled={loadingAlice}>
          Insert Alice Data And Share To Charlie
          <br />
          (Please change wallet account to Alice)
        </button>
        <div style={{marginTop: 30, fontSize: 16}}>
          Logs output: <br />
          {
            resultAlice.map((log, k) => <div key={k} style={{padding: 10}}>{ log }</div>)
          }
        </div>
      </div>
      <div style={{flex: 1}}>
        <button onClick={() => insertData(dataBob, 'bob')} disabled={loadingBob}>
          Insert Bob Data And Share To Charlie<br />
          (Please change wallet account to Bob)
        </button>
        <div style={{marginTop: 30, fontSize: 16}}>
          Logs output: <br />
          {
            resultBob.map((log, k) => <div key={k} style={{padding: 10}}>{ log }</div>)
          }
        </div>
      </div>
      <div style={{flex: 1}}>
        <button onClick={() => charlieQuery()} disabled={loadingCharlie}>
          Charlie Select Data And Decrypt Data<br />
          (Please change wallet account to Charlie)
        </button>
        <div style={{marginTop: 30, fontSize: 16}}>
          Logs output: <br />
          {
            resultCharlie.map((log, k) => <div key={k} style={{padding: 10}}>{ log }</div>)
          }
        </div>
      </div>
    </div>
    </>
  )

};

export default Index;
