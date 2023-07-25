import { useState } from 'react';
import { MindLake } from 'mind-lake-sdk';
import { appKey, nodeUrl } from '@/myconfig';

export const resultFormat = (result: any) => {
  if(typeof result === 'string') {
    return result
  }
  if(result.code === 0) {
    return result.result ? JSON.stringify(result.result) : true
  }else {
    return result.message
  }
};


const useUtils = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Array<string | object>>([]);

  const logger = (info: string | object, init?: boolean) => {
    setResult(pre => !init ? [...pre, info] : [info]);
    window.scrollTo(0, document.documentElement.scrollHeight)
  };

  const login = async (init = true) => {
    const mindLake = await MindLake.getInstance(appKey, nodeUrl).catch(e => logger(`mind lake init error >>> ${JSON.stringify(e)}`, init));
    if(!mindLake) {
      return
    }
    setLoading(true);
    logger("logging...please wait...", init);
    let result = await mindLake.connect();
    setLoading(false);
    if(result.code === 403) {
      logger(`login >>> ${JSON.stringify({message: `Thanks for your interest. The product is under active development and limit to invited users only until full release. Your wallets are currently not in the early trial and you can apply via: https://bit.ly/mindalphatest`})}`);
      return ;
    }else if(result.code !==0 ){
      logger(`login >>> ${JSON.stringify(result)}`);
      return
    }

    logger(`login >>> ${JSON.stringify(result.result)}`);
    return mindLake;
  };

  return {
    result,
    logger,
    login,
    loading
  }
};

export default useUtils;
