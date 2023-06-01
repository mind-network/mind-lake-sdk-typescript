import request from './request';

export class Service {

  nodeUrl = "https://sdk.mindnetwork.xyz";

  constructor(nodeUrl?: string) {
    if(nodeUrl) {
      this.nodeUrl = nodeUrl
    }
  }

  async execute<R, T>(data: R): Promise<T> {
    return await request.post<T>(this.nodeUrl + '/node', data);
  }

}

// Service.execute<RequestMekProvisionBody, {}>({databasePublicKey: '', envelope: ''});
