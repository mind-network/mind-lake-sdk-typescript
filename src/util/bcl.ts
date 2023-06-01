import { Service } from '../request';
// @ts-ignore
import dayjs from 'dayjs';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { CipherHelper } from './cipher';

export interface IDekGroup {
  groupid: string;
  min: number;
  max: number;
}

export interface IPolicies {
  issuer_dek_group: Array<IDekGroup>;
  subject_dek_group: Array<IDekGroup>;
  result_dek: string;
  operation: Array<string>;
  post_proc: string;
  pre_proc: string;
}

/**
 *
 */
export class Bcl {
  public bclBody = {
    version: 1,
    serial_num: '',
    issuer_pukid: '',
    subject_pukid: '',
    validity: {
      not_after: '',
      not_before: '',
    },
    policies: {
      issuer_dek_group: new Array<IDekGroup>(),
      subject_dek_group: new Array<IDekGroup>(),
      result_dek: '',
      operation: '',
      postproc: '',
      preproc: '',
    },
  };

  private service!: Service;

  constructor(service: Service) {
    this.service = service;
  }

  /**
   *
   * @param issuerPukid
   * @param subjectPukid
   * @param serialNum
   * @param resultDek
   * @param operation
   * @param postProc
   * @param preProc
   * @param version
   * @param notBefore
   * @param notAfter
   */
  public async createBclBody(
    issuerPukid: string,
    subjectPukid: string,
    serialNum: string,
    version = 1,
    resultDek = 'SUBJECT',
    operation = ['*'],
    postProc = 'NULL',
    preProc = 'NULL',
    notBefore?: number,
    notAfter?: number,
  ): Promise<Bcl> {
    if (issuerPukid && subjectPukid) {
      await this.loadBclBodyByPukId(issuerPukid, subjectPukid);
    } else if (serialNum) {
      await this.loadBclBodyBySN(serialNum);
    }

    if (this.bclBody.serial_num) {
      return this;
    }

    if (!serialNum) {
      serialNum = uuidv4();
    }
    this.bclBody.version = version;
    this.bclBody['serial_num'] = serialNum;
    this.bclBody['issuer_pukid'] = issuerPukid;
    this.bclBody['subject_pukid'] = subjectPukid;
    const nowDate = dayjs();
    if (!notBefore) {
      notBefore = nowDate.valueOf();
    }
    if (!notAfter) {
      notAfter = nowDate.add(365, 'day').valueOf();
    }

    this.bclBody['validity']['not_after'] =
      dayjs(notAfter).format('YYYYMMDDHHmmssZZ');
    this.bclBody['validity']['not_before'] =
      dayjs(notBefore).format('YYYYMMDDHHmmssZZ');
    // @ts-ignore
    this.bclBody['policies'] = this._initBlankBclPolicies(
      resultDek,
      operation,
      postProc,
      preProc,
    );
    return this;
  }

  /**
   * get bcl body by serialNum
   * @param serialNum
   */
  public async loadBclBodyBySN(serialNum: string): Promise<Bcl> {
    const bclBodyJson = await this.service.execute<any, string>({
      bizType: 116,
      serialNum,
    });
    if (bclBodyJson) {
      this.bclBody = JSON.parse(bclBodyJson);
    }
    return this;
  }

  public async loadBclBodyByPukId(issuePukId: string, subjectPukId: string) {
    const bclBodyJson = await this.service.execute<any, string>({
      bizType: 118,
      issuePukId: issuePukId,
      subjectPukId: subjectPukId,
    });
    if (bclBodyJson) {
      this.bclBody = JSON.parse(bclBodyJson);
    }
    return this;
  }

  /**
   *
   * @param issuerDekGroup
   * @param subjectDekGroup
   */
  public addDekGroup(
    issuerDekGroup: IDekGroup,
    subjectDekGroup?: IDekGroup,
  ): Bcl {
    const preIssueDekGroup = this.bclBody['policies'][
      'issuer_dek_group'
    ].filter((p) => p.groupid !== issuerDekGroup.groupid);
    preIssueDekGroup.push(issuerDekGroup);
    this.bclBody['policies']['issuer_dek_group'] = preIssueDekGroup;
    if (subjectDekGroup) {
      const preSubjectDekGroup = this.bclBody['policies'][
        'subject_dek_group'
      ].filter((p) => p.groupid !== subjectDekGroup.groupid);
      preSubjectDekGroup.push(subjectDekGroup);
      this.bclBody['policies']['subject_dek_group'] = preSubjectDekGroup;
    }
    return this;
  }

  public removeDekGroup(
    issueGroupId: Array<string>,
    subjectDekGroupId?: Array<string>,
  ): Bcl {
    const newIssueDekGroup = this.bclBody['policies'][
      'issuer_dek_group'
    ].filter((d) => !issueGroupId.includes(d.groupid));
    this.bclBody['policies']['issuer_dek_group'] = newIssueDekGroup;
    if (subjectDekGroupId && subjectDekGroupId.length) {
      const newSubjectDekGroup = this.bclBody['policies'][
        'subject_dek_group'
      ].filter((d) => !subjectDekGroupId.includes(d.groupid));
      this.bclBody['policies']['subject_dek_group'] = newSubjectDekGroup;
    }
    return this;
  }

  public removeDekGroupAll(): Bcl {
    this.bclBody['policies']['issuer_dek_group'] = [];
    this.bclBody['policies']['subject_dek_group'] = [];
    return this;
  }

  /**
   *
   * @param privateKeyPem
   */
  private _signBclBody(privateKeyPem: string): Buffer {
    const toBeSignedBytes = Buffer.from(JSON.stringify(this.bclBody), 'utf8');
    const buffer = Buffer.concat([
      Buffer.from('01', 'hex'),
      CipherHelper.rsaSign(privateKeyPem, toBeSignedBytes),
    ]);
    return buffer;
  }

  /**
   *
   * @param privateKeyPem
   */
  public async issueBcl(
    privateKeyPem: string,
    bizType = 106,
  ): Promise<string | undefined> {
    if (!this.bclBody.serial_num) {
      throw new Error('Bcl is not init');
    }
    const bclRequestJson = JSON.stringify(this.bclBody);
    const bclSignBuffer = this._signBclBody(privateKeyPem);
    return await this.service.execute<any, string>({
      bizType,
      bclBody: bclRequestJson,
      privateSig: bclSignBuffer.toString('base64'),
    });
  }

  /**
   *
   * @param result_dek
   * @param operation
   * @param postproc
   * @param preproc
   * @private
   */
  private _initBlankBclPolicies(
    result_dek: string,
    operation: Array<string>,
    postproc: string,
    preproc: string,
  ): IPolicies {
    const policies = {
      issuer_dek_group: [],
      subject_dek_group: [],
      result_dek,
      operation,
      post_proc: postproc,
      pre_proc: preproc,
    };
    return policies;
  }
}
