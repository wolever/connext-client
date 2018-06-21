import {BigNumber} from 'bignumber.js'

export = Connext;

declare class Connext {
  constructor (opts: Connext.ConnextOptions);

  register (initialDeposit: BigNumber): Promise<any>;

  deposit (amount: BigNumber): Promise<any>;

  withdraw (): Promise<any>;

  withdrawFinal (): Promise<any>;

  checkpoint(): Promise<any>;

  openChannel (opts: Connext.OpenChannelOptions): Promise<any>;

  joinChannel (channelId: string): Promise<any>;

  updateBalance (opts: Connext.UpdateBalanceOptions): Promise<any>;

  cosignBalanceUpdate (opts: Connext.CosignBalanceUpdateOptions): Promise<string>;

  fastCloseChannel (channelId: string): Promise<any>;

  closeChannel (channelId: string): Promise<any>;

  closeChannels (channels: Connext.Channel[]): Promise<any>;
}


declare namespace Connext {
  export interface ConnextOptions {
    web3: any;
    ingridAddress: string;
    watcherUrl: string;
    ingridUrl: string;
    contractAddress: string;
  }

  export interface OpenChannelOptions {
    to: string;
    deposit: BigNumber;
  }

  export interface UpdateBalanceOptions {
    channelId: string;
    balanceA: BigNumber;
    balanceB: BigNumber;
  }

  export interface CosignBalanceUpdateOptions {
    channelId: string;
    balance: BigNumber;
    sig: string;
  }

  export interface Channel {
    channelId: string;
    balance: BigNumber;
  }
}