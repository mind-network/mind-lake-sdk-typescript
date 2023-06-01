import { ResultType } from '../types';

export default class Result {
  static success(data: any): ResultType {
    return { code: 0, result: data };
  }

  static fail(error: any): ResultType {
    if (error.code) {
      return { code: error.code, message: error.message };
    }
    return { code: 50000, message: error.toString() };
  }
}
