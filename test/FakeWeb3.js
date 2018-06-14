export class fakeWeb3 {
  constructor () {
    this.eth = {
      Contract: () => {},
      getAccounts: () => [],
      sign: () => '',
      personal: {
        sign: () => ''
      }
    }
    this.utils = {
      isBN: value => true,
      isHex: value => true,
      isHexStrict: value => true,
      isAddress: value => true
    }
  }
}
