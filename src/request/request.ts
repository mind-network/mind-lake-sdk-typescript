import axios, {
  AxiosInstance,
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { APP_KEY, CHAIN_KEY, TOKEN_KEY, WALLET_key } from '../util/constant';
import { MindLake } from '../MindLake';

const URL: string = `https://sdk.mindnetwork.xyz/node`;
enum RequestEnums {
  TIMEOUT = 20000,
  OVERDUE = 401,
  SUCCESS = 0,
}

const NOT_LOGIN_CODE = [401, 402, 403, 40003];

const config = {
  // baseURL: URL,
  timeout: RequestEnums.TIMEOUT,
};

class RequestHttp {
  service: AxiosInstance;
  public constructor(config: AxiosRequestConfig) {
    this.service = axios.create(config);

    this.service.interceptors.request.use(
      // @ts-ignore
      (config) => {
        // session token
        const token = localStorage.getItem(TOKEN_KEY) || '';
        // your wallet address
        const wa = localStorage.getItem(WALLET_key);
        //your dapp key
        const app = localStorage.getItem(APP_KEY);
        const chainStr = localStorage.getItem(CHAIN_KEY);
        let chain;
        try {
          chain = chainStr && JSON.parse(chainStr);
        } catch (error) {
          console.log(error);
        }
        const _config = {
          ...config,
          headers: {
            token: token,
            ver: `v${MindLake.version}`,
            wa,
            app,
            chain: chain?.clerk ? 0 : chain?.chainId,
          },
        };
        if (MindLake.log) {
          console.log('request data >>>', config.data);
        }
        return _config;
      },
      (error: AxiosError) => {
        Promise.reject(error);
      },
    );

    this.service.interceptors.response.use(
      (response: AxiosResponse) => {
        const { data, config } = response;
        if (MindLake.log) {
          console.log('response >>> ', JSON.stringify(data));
        }
        if (NOT_LOGIN_CODE.includes(data.code)) {
          localStorage.removeItem(TOKEN_KEY);
          MindLake.isConnected = false;
          return Promise.reject({ code: data.code, message: data.message });
        }
        if (data.code && data.code !== RequestEnums.SUCCESS) {
          return Promise.reject({ code: data.code, message: data.message });
        }
        return data.data;
      },
      (error: AxiosError) => {
        console.error(error);
      },
    );
  }

  get<T>(url: string, params?: object): Promise<T> {
    return this.service.get(url, { params });
  }
  post<T>(url: string, data?: any): Promise<T> {
    return this.service.post(url, data);
  }
}

export default new RequestHttp(config);
