import { appKey, nodeUrl } from '@/myconfig';
import {MindLake} from 'mind-lake-sdk';
import { useState } from 'react';


export default function IndexPage() {

  const [result, setResult] = useState({});

  const onLogin = async () => {
    const mindLake = await MindLake.getInstance(appKey, nodeUrl);
    const result = await mindLake.connect();
    if(result.code === 403) {
      setResult({...result, message: `Thanks for your interest. The product is under active development and limit to invited users only until full release. Your wallets are currently not in the early trial and you can apply via: https://bit.ly/mindalphatest`})
    }else {
      setResult(result)
    }
  };


  return (
    <div>
      <button onClick={onLogin}>Login with your MetaMask (for development only)</button>
      <div style={{marginTop: 30, fontSize: 16}}>
        Log: { JSON.stringify(result) }
      </div>
    </div>
  );
}
