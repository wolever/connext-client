const axios = require('axios')
const channelManagerAbi = require('../artifacts/LedgerChannel.json')
const util = require('ethereumjs-util')
import Web3 from 'web3'
import validate from "validate.js"
const MerkleTree = require('./helpers/MerkleTree')
const Utils = require('./helpers/utils')
const crypto = require('crypto')

validate.validators.isBN = value => {
  if (Web3.utils.isBN(value)) {
    return null
  } else {
    return `${value} is not BN.`
  }
}

validate.validators.isHex = value => {
  if (Web3.utils.isHex(value)) {
    return null
  } else {
    return `${value} is not hex string.`
  }
}

validate.validators.isHexStrict = value => {
  // for ledgerIDs
  if (Web3.utils.isHexStrict(value)) {
    return null
  } else {
    return `${value} is not hex string prefixed with 0x.`
  }
}

validate.validators.isArray = value => {
  if (Array.isArray(value)) {
    return null
  } else {
    return `${value} is not an array.`
  }
}

validate.validators.isAddress = value => {
  if (Web3.utils.isAddress(value)) {
    return null
  } else {
    return `${value} is not address.`
  }
}

validate.validators.isBool = value => {
  if (typeof value === typeof true) {
    return null
  } else {
    return `${value} is not a boolean.`
  }
}

validate.validators.isPositiveInt = value => {
  if (value >= 0) {
    return null
  } else {
    return `${value} is not a positive integer.`
  }
}

// const logger = (arrayOfValidatorReturns) => arrayOfValidatorReturns.map((()console.log)

/**
 *
 * Class representing an instance of a Connext client.
 */
class Connext {
  /**
   *
   * Create an instance of the Connext client.
   *
   * @constructor
   * @example
   * const Connext = require('connext')
   * const connext = new Connext(web3)
   * @param {Object} params - The constructor object.
   * @param {Web3} params.web3 - the web3 instance.
   * @param {String} params.ingridAddress Eth address of intermediary (defaults to Connext hub).
   * @param {String} params.watcherUrl Url of watcher server (defaults to Connext hub).
   * @param {String} params.ingridUrl Url of intermediary server (defaults to Connext hub).
   * @param {String} params.contractAddress Address of deployed contract (defaults to latest deployed contract).
   */
  constructor (
    {
      web3,
      ingridAddress = '',
      watcherUrl = '',
      ingridUrl = '',
      contractAddress = '0xf25186b5081ff5ce73482ad761db0eb0d25abfbf'
    },
    web3Lib = Web3
  ) {
    this.web3 = new web3Lib(web3.currentProvider) // convert legacy web3 0.x to 1.x
    this.ingridAddress = ingridAddress
    this.watcherUrl = watcherUrl
    this.ingridUrl = ingridUrl
    this.channelManagerInstance = new this.web3.eth.Contract(
      channelManagerAbi.abi,
      contractAddress
    )
  }

  // WALLET FUNCTIONS
  /**
   * Opens a ledger channel with ingridAddress and bonds initialDeposit. Ledger channel challenge timer is determined by Ingrid.
   *
   * Uses web3 to call openLC function on the contract, and pings Ingrid with opening signature and initial deposit.
   *
   * Ingrid should verify the signature and call "joinChannel" on the contract.
   *
   * If Ingrid is unresponsive, the client function "LCOpenTimeoutContractHandler" can be called by the client to recover the funds, or the client can call the contract function directly.
   *
   * @example
   * // get a BN
   * const deposit = web3.utils.toBN(10000)
   * await connext.register(deposit)
   *
   * @param {BigNumber} initialDeposit deposit in wei
   * @returns {String} result of calling openLedgerChannel on the channelManager instance.
   */
  async register (initialDeposit) {
    // validate params
    const methodName = 'register'
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(initialDeposit, isBN),
      methodName,
      'initialDeposit'
    )
    // get challenge timer from ingrid
    const accounts = await this.web3.eth.getAccounts()
    const challenge = await this.getLedgerChannelChallengeTimer()
    // generate additional initial lc params
    const nonce = 0
    const openVCs = 0
    const lcId = Connext.getNewChannelId()
    console.log('register lcId (subchanAI):', lcId)
    const vcRootHash = Connext.generateVcRootHash({ vc0s: [] })
    const partyA = accounts[0]
    const sig = await this.createLCStateUpdate({
      lcId,
      nonce,
      openVCs,
      vcRootHash,
      partyA,
      balanceA: initialDeposit,
      balanceI: Web3.utils.toBN('0')
    })
    console.log('register sig:', sig)

    // create LC on contract
    // TO DO: better error handling here
    // /**
    //  * Descriptive error message back to wallet here
    //  *
    //  * Atomicity -- roll back to a previous state if there are inconsistencies here
    //  *
    //  * Return to a recoverable state based on block history
    //  *
    //  * Fail point so Ingrid can retry if join fails, make sure if ingrid cant join, the funds are recoverable.
    //  */
    const contractResult = await this.createLedgerChannelContractHandler({
      lcId,
      challenge,
      initialDeposit
    })
    if (contractResult.transactionHash) {
      console.log('tx hash:', contractResult.transactionHash)
    } else {
      throw new Error(`[${methodName}] Transaction was not successfully mined.`)
    }
    // ping ingrid
    const response = this.requestJoinLc({ lcId, sig, balanceA: initialDeposit })
    return response
  }

  /**
   * Adds a deposit to an existing ledger channel. Calls contract function "deposit".
   *
   * Can be used by either party in a ledger channel.
   *
   * @example
   * // get a BN
   * const deposit = web3.utils.toBN(10000)
   * await connext.deposit(deposit)
   * @param {BigNumber} depositInWei - Value of the deposit.
   */
  async deposit (depositInWei) {
    // validate params
    const methodName = 'deposit'
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(depositInWei, isBN),
      methodName,
      'depositInWei'
    )
    // call contract handler
    const result = await this.depositContractHandler(depositInWei)
    return result
  }

  /**
   * Withdraws bonded funds from ledger channel with ingrid.
   * All virtual channels must be closed before a ledger channel can be closed.
   *
   * Generates the state update from the latest ingrid signed state with fast-close flag.
   * Ingrid should countersign if the state update matches what she has signed previously, and the channel will fast close by calling consensusCloseChannel on the Channel Manager contract.
   *
   * If the state update doesn't match what Ingrid previously signed, then updateLCState is called with the latest state and a challenge flag.
   *
   * @example
   * const success = await connext.withdraw()
   * @returns {boolean} Returns true if successfully withdrawn, false if challenge process commences.
   * @returns {String} Flag indicating whether the channel was consensus-closed or if lc was challenge-closed.
   */
  async withdraw () {
    const lcId = await this.getLcId()
    console.log(lcId)
    const lcState = await this.getLatestLedgerStateUpdate(lcId)
    if (Number(lcState.openVCs) !== 0) {
      throw new Error(
        `LC id ${lcId} still has open virtual channels. Number: ${lcState.openVCs}`
      )
    }
    if (lcState.vcRootHash !== '0x0') {
      throw new Error(
        `vcRootHash for lcId ${lcId} does not match empty root hash. Value: ${lcState.vcRootHash}`
      )
    }
    // /**
    //  * lcState = {
    //  *  sigA,
    //  *  sigI,
    //  *  nonce,
    //  *  openVCs,
    //  *  vcRootHash,
    //  *  partyA,
    //  *  partyI,
    //  *  balanceA,
    //  *  balanceI
    //  * }
    //  */
    // check ingrid signed
    // TO DO: probably should check with values that don't come from
    // the same source
    const signer = Connext.recoverSignerFromLCStateUpdate({
      sig: lcState.sigI,
      isClose: false,
      lcId,
      nonce: lcState.nonce,
      openVCs: lcState.openVCs,
      vcRootHash: lcState.vcRootHash,
      partyA: lcState.partyA,
      partyI: lcState.partyI,
      balanceA: Web3.utils.toBN(lcState.balanceA),
      balanceI: Web3.utils.toBN(lcState.balanceI)
    })
    if (signer !== this.ingridAddress.toLowerCase()) {
      throw new Error(`[${methodName}] Ingrid did not sign this state update.`)
    }
    // generate same update with fast close flag and post
    const sigParams = {
      isClose: true,
      lcId,
      nonce: lcState.nonce,
      openVCs: lcState.openVCs,
      vcRootHash: lcState.vcRootHash,
      partyA: lcState.partyA,
      partyI: lcState.partyI,
      balanceA: Web3.utils.toBN(lcState.balanceA),
      balanceI: Web3.utils.toBN(lcState.balanceI)
    }
    const sig = await this.createLCStateUpdate(sigParams)
    console.log('withdraw sigA:', sig)
    const sigI = await this.fastCloseLcHandler({ sig, lcId })
    console.log('closing channel sigI:', sigI)
    let response
    if (sigI) {
      // call consensus close channel
      response = await this.consensusCloseChannelContractHandler({
        lcId,
        nonce: lcState.nonce,
        balanceA: Web3.utils.toBN(lcState.balanceA),
        balanceI: Web3.utils.toBN(lcState.balanceI),
        sigA: sig,
        sigI: sigI
      })
    } else {
      // call updateLCState
      response = await this.updateLcStateContractHandler({
        // challenge flag..?
        lcId,
        nonce: lcState.nonce,
        openVCs: lcState.openVCs,
        balanceA: Web3.utils.toBN(lcState.balanceA),
        balanceI: Web3.utils.toBN(lcState.balanceI),
        vcRootHash: lcState.vcRootHash,
        sigA: sig,
        sigI: lcState.sigI
      })
    }
    return response
  }

  /**
   * Withdraw bonded funds from ledger channel after a channel is challenge-closed after the challenge period expires by calling withdrawFinal using Web3.
   *
   * Looks up LC by the account address of the client-side user.
   *
   * Calls the "byzantineCloseChannel" function on the contract.
   *
   * @example
   * const success = await connext.withdraw()
   * if (!success) {
   *   // wait out challenge timer
   *   await connext.withdrawFinal()
   * }
   *
   */
  async withdrawFinal () {
    const methodName = 'withdrawFinal'
    const lc = await this.getLcByPartyA()
    if (lc.openVCs > 0) {
      throw new Error(`[${methodName}] Close open VCs before withdraw final.`)
    }
    // to do: dependent on lc status
    if (!lc.isSettling) {
      throw new Error('Ledger channel is not in settlement state.')
    }
    const results = await this.byzantineCloseChannelContractHandler(lc.channelId)
    return results
  }

  /**
   * Sync signed state updates with chain.
   *
   * Generates client signature on latest Ingrid-signed state update, and uses web3 to call updateLCState on the contract without challenge flag.
   *
   * @example
   * await connext.checkpoint()
   */
  async checkpoint () {
    // get latest ingrid signed state update
    const lcId = await this.getLcId()
    const lcState = await this.getLatestLedgerStateUpdate(lcId)
    const signer = Connext.recoverSignerFromLCStateUpdate({
      sig: lcState.sigI,
      isClose: false,
      lcId,
      nonce: lcState.nonce,
      openVCs: lcState.openVCs,
      vcRootHash: lcState.vcRootHash,
      partyA: lcState.partyA,
      partyI: lcState.partyI,
      balanceA: Web3.utils.toBN(lcState.balanceA),
      balanceI: Web3.utils.toBN(lcState.balanceI)
    })
    if (signer !== this.ingridAddress.toLowerCase()) {
      throw new Error(`[${methodName}] Hub did not sign this state update.`)
    }
    const sig = await this.createLCStateUpdate({
      lcId,
      nonce: lcState.nonce,
      openVCs: lcState.openVCs,
      vcRootHash: lcState.vcRootHash,
      partyA: lcState.partyA,
      balanceA: Web3.utils.toBN(lcState.balanceA),
      balanceI: Web3.utils.toBN(lcState.balanceI)
    })
    const result = await this.updateLcStateContractHandler({
      lcId,
      nonce: lcState.nonce,
      openVCs: lcState.openVCs,
      balanceA: Web3.utils.toBN(lcState.balanceA),
      balanceI: Web3.utils.toBN(lcState.balanceI),
      vcRootHash: lcState.vcRootHash,
      sigA: sig,
      sigI: lcState.sigI
    })

    return result
  }

  /**
   * Opens a virtual channel between to and caller with Ingrid as the hub. Both users must have a ledger channel open with ingrid.
   *
   * If there is no deposit provided, then 100% of the ledger channel balance is added to VC deposit. This function is to be called by the "A" party in a unidirectional scheme.
   *
   * Sends a proposed LC update for countersigning that updates the VCRootHash of the ledger channel state.
   *
   * This proposed LC update (termed VC0 throughout documentation) serves as the opening certificate for the virtual channel.
   *
   *
   * @example
   * const myFriendsAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57"
   * await connext.openChannel({ to: myFriendsAddress })
   *
   * @param {Object} params - The method object.
   * @param {String} params.to Wallet address to wallet for partyB in virtual channel
   * @param {BigNumber} params.deposit User deposit for VC, in wei. Optional.
   */
  // /**
  //  * add error handling for calling openChannel twice as a viewer or something
  //  *
  //  * should fail if you try calling openChannel if it doesnt let you
  //  *
  //  * validate the state update against lc is valid
  //  */
  async openChannel ({ to, deposit = null }) {
    // validate params
    const methodName = 'openChannel'
    const isAddress = { presence: true, isAddress: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(to, isAddress),
      methodName,
      'to'
    )
    if (deposit) {
      Connext.validatorsResponseToError(
        validate.single(deposit, isBN),
        methodName,
        'deposit'
      )
    }
    const lcA = await this.getLcByPartyA()
    const lcIdB = await this.getLcId(to)
    // validate the subchannels exist
    if (lcIdB === null || lcIdA === null) {
      throw new Error(
        `[${methodName}] Missing one or more required subchannels for VC.`
      )
    }
    // generate initial vcstate
    const vcId = Connext.getNewChannelId()
    console.log('subchanAI id:', lcA.channelId)
    console.log('subchanBI id:', lcIdB)
    console.log('openChannel vcID:', vcId)
    const vc0 = {
      vcId,
      nonce: 0,
      partyA: lcA.partyA,
      partyB: to,
      partyI: this.ingridAddress,
      subchanAI: lcA.channelId,
      subchanBI: lcIdB,
      balanceA: deposit || Web3.utils.toBN(lcA.balanceA),
      balanceB: Web3.utils.toBN(0)
    }
    const sigVC0 = await this.createVCStateUpdate(vc0)
    console.log('sigVC0:', vc0)
    let vc0s = await this.getVcInitialStates(lcA.channelId) // array of vc state objs
    vc0s.push(vc0)
    const newVcRootHash = Connext.generateVcRootHash({
      vc0s
    })
    console.log('newVcRootHash:', newVcRootHash)
    // ping ingrid
    const result = await this.openVc({
      balanceA: deposit || Web3.utils.toBN(lcA.balanceA),
      to,
      vcRootHash: newVcRootHash,
      sig: sigVC0
    })
    return result
  }

  /**
   * Joins channel by channelId with a deposit of 0 (unidirectional channels).
   *
   * This function is to be called by the "B" party in a unidirectional scheme.
   * Sends opening cert (VC0) to message queue, so it is accessible by Ingrid and Watchers.
   *
   * @example
   * const channelId = 10 // accessed by getChannelId method
   * await connext.joinChannel(channelId)
   * @param {String} channelId - ID of the virtual channel.
   */
  async joinChannel (channelId) {
    // validate params
    const methodName = 'joinChannel'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    // get channel
    const vc = await this.getChannel(channelId)
    const vc0 = {
      vcId: channelId,
      nonce: 0,
      partyA: vc.partyA, // depending on ingrid for this value
      partyB: vc.partyB,
      partyI: vc.partyI,
      balanceA: Web3.utils.toBN(vc.balanceA), // depending on ingrid for this value
      balanceB: Web3.utils.toBN(0)
    }
    const sig = await this.createVCStateUpdate(vc0)
    console.log('vc0:', vc0)
    console.log('sigB of vc0:', sig)
    // add vc0 to initial states
    let vc0s = await this.getVcInitialStates(vc.subchanBI)
    vc0s.push(vc0)
    const newVcRootHash = Connext.generateVcRootHash({
      vc0s
    })
    console.log('newVcRootHash for subchanBI:', newVcRootHash)
    // ping ingrid with vc0 (hub decomposes to lc)
    const result = await this.joinVcHandler({
      sig: sig,
      vcRootHash: newVcRootHash,
      channelId
    })
    return result.data
  }

  /**
   * Updates channel balance by provided ID.
   *
   * In the unidirectional scheme, this function is called by the "A" party only.
   * Increments the nonce and generates a signed state update, which is then posted to the hub/watcher.
   *
   * @example
   * await connext.updateBalance({
   *   channelId: 10,
   *   balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
   * })
   * @param {Object} params - The method object.
   * @param {HexString} params.channelId ID of channel.
   * @param {BigNumber} params.balanceA Channel balance in Wei (of "A" party).
   * @param {BigNumber} params.balanceB Channel balance in Wei (of "B" party)
   * @returns {String} Returns signature of balance update.
   */
  async updateBalance ({ channelId, balanceA, balanceB }) {
    // validate params
    const methodName = 'updateBalance'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceB'
    )
    // get the vc
    const vc = await this.getChannel(channelId)
    // generate new state update
    const state = {
      vcId: channelId,
      nonce: vc.nonce + 1,
      partyA: vc.partyA,
      partyB: vc.partyB,
      balanceA: Web3.utils.toBN(balanceA),
      balanceB: Web3.utils.toBN(balanceB)
    }
    const sig = await this.createVCStateUpdate(state)
    console.log('state:', state)
    console.log('state sigA:', sig)
    // post signed update to watcher
    const response = await this.vcStateUpdateHandler({
      channelId,
      sig,
      balanceA,
      balanceB
    })
    return response
  }

  /**
   * Verifies signature on balance update and co-signs update.
   *
   * In the unidirectional scheme, this function is called by the "B" party only.
   * Signature is posted to the hub/watcher.
   * @param {Object} params - The method object.
   * @param {HexString} params.channelId ID of channel.
   * @param {BigNumber} params.balance Channel balance in Wei (of "A" party).
   * @param {String} params.sig Signature received from "A" party to be verified before co-signing.
   * @returns {String} Returns signature of balance update.
   */
  async cosignBalanceUpdate ({ channelId, balance, sig }) {
    // validate params
    const methodName = 'cosignBalanceUpdate'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(balance, isBN),
      methodName,
      'balance'
    )
    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )
    // check sig
    const accounts = await this.web3.eth.getAccounts()
    const vc = await this.getChannel(channelId)
    const subchanAI = await this.getLcId(vc.partyA)
    const subchanBI = await this.getLcId(vc.partyB)
    const balanceB =
      Web3.utils.toBN(vc.balanceB) + (Web3.utils.toBN(vc.balanceA) - balance)
    const signer = Connext.recoverSignerFromVCStateUpdate({
      sig,
      vcId: channelId,
      nonce: vc.nonce, // will this be stored in vc after updateState?
      partyA: vc.partyA,
      partyB: vc.partyB,
      partyI: this.ingridAddress,
      subchanAI,
      subchanBI,
      balanceA: balance,
      balanceB: Web3.utils.toBN(balanceB) // will this be stored in vc after updateState?
    })
    if (accounts[0].toLowerCase() === vc.partyB && signer !== vc.partyA) {
      throw new Error(`[${methodName}] partyA did not sign this state update.`)
    } else if (
      accounts[0].toLowerCase() === vc.partyA &&
      signer !== vc.partyB
    ) {
      throw new Error(`[${methodName}] partyB did not sign this state update.`)
    } else if (
      accounts[0].toLowerCase() !== vc.partyA &&
      accounts[0].toLowerCase() !== vc.partyB
    ) {
      throw new Error(`[${methodName}] Not your virtual channel`)
    }
    // generate sigB
    const sigB = await this.createVCStateUpdate({
      vcId: channelId,
      nonce: vc.nonce, // will this be stored in vc after updateState?
      partyA: vc.partyA,
      partyB: vc.partyB,
      balanceA: balance,
      balanceB: Web3.utils.toBN(balanceB) // will this be stored in vc after updateState?
    })
    console.log('sig:', sigB)
    // post sig to hub
    const response = await axios.post(
      `${this.ingridUrl}/virtualchannel/${channelId}/cosign`,
      {
        channelId,
        sig: sigB,
        balance
      }
    )
    return response.data
  }

  /**
   * Closes specified channel using latest double signed update.
   *
   * Requests Ingrid to decompose into LC update based on latest double signed virtual channel state.
   *
   * @example
   * await connext.fastCloseChannel(10)
   * @param {String} channelId - virtual channel ID
   */
  async fastCloseChannel (channelId) {
    // validate params
    const methodName = 'fastCloseChannel'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    const accounts = await this.web3.eth.getAccounts()
    // get latest double signed updates
    const latestVcState = await this.getLatestVirtualDoubleSignedStateUpdate(
      channelId
    )
    console.log(latestVcState)
    if (
      latestVcState.partyA !== accounts[0].toLowerCase() &&
      latestVcState.partyB !== accounts[0].toLowerCase()
    ) {
      throw new Error(`[${methodName}] Not your virtual channel.`)
    }

    // have ingrid decompose since this is the happy case closing
    const results = await this.requestDecomposeLC(channelId)
    // NOTE: client doesnt sign lc update, it is just generated

    return results
  }

  /**
   * Closes a channel in a dispute.
   *
   * Retrieves decomposed LC updates from Ingrid, and countersigns updates if needed (i.e. if they are recieving funds).
   *
   * Settle VC is called on chain for each vcID if Ingrid does not provide decomposed state updates, and closeVirtualChannel is called for each vcID.
   *
   * @example
   * await connext.closeChannel({
   *   channelId: 0xadsf11..,
   *   balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
   * })
   * @param {Object} params - Object containing { vcId, balance }
   * @param {Number} params.channelId Virtual channel ID to close.
   */
  async closeChannel (channelId) {
    // validate params
    const methodName = 'closeChannel'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )

    // get decomposed lc updates from ingrid
    const subchan = await this.getLcId()   
    // ping ingrid for decomposed updates
    // if doesnt respond, then settleVC for all VCIDs in LC
    let lcStates = await this.getDecomposedLcStates(channelId)
    // the lc update for this subchan should be signed by ingrid
    // should you just call checkpoint to update the LC on chain with this?
    if (lcStates[subchan]) {
      // const result = await this.checkpoint() // maybe just post update cosig to ingrid?
      // type casting, returns not as BN type so validation fails
      lcStates[subchan].balanceA = Web3.utils.toBN(lcStates[subchan].balanceA)
      lcStates[subchan].balanceI = Web3.utils.toBN(lcStates[subchan].balanceI)
      const sig = await this.createLCStateUpdate(lcStates[subchan])
      // post sig to ingrid
      const result = await axios.post(
        `${this.ingridUrl}/ledgerchannel/${subchan}/cosign`,
        {
          sig
        }
      )
      return result.data
    } else {
      // ingrid MIA, call settle vc on chain for each vcID
      // get initial states of VCs
      const result = await this.byzantineCloseVc(channelId)
      return result
    }
  }

  /**
   * Close many virtual channels
   *
   * @example
   * const channels = [
   *   {
   *     channelId: 0xasd310..,
   *     balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
   *   },
   *   {
   *     channelId: 0xadsf11..,
   *     balance: web3.utils.toBN(web3.utils.toWei(0.2, 'ether'))
   *   }
   * ]
   * await connext.closeChannels(channels)
   * @param {Object[]} channels - Array of objects with {vcId, balance} to close
   * @param {String} channels.$.channelId Channel ID to close
   * @param {BigNumber} channels.$.balance Channel balance.
   */
  async closeChannels (channels) {
    const methodName = 'closeChannels'
    const isArray = { presence: true, isArray: true }
    Connext.validatorsResponseToError(
      validate.single(channels, isArray),
      methodName,
      'channels'
    )
    // should this try to fast close any of the channels?
    // or just immediately force close in dispute many channels
    channels.forEach(async channel => {
      // async ({ channelId, balance }) maybe?
      console.log('Closing channel:', channel.channelId)
      await this.closeChannel(channel.channelId)
      console.log('Channel closed.')
    })
  }

  // ************************
  // **** static methods ****
  // ************************
  /**
   * Returns a new channel id that is a random hex string.
   *
   * @returns {String} a random 32 byte channel ID.
   */
  static getNewChannelId () {
    const buf = crypto.randomBytes(32)
    const channelId = Web3.utils.bytesToHex(buf)
    return channelId
  }

  // SIGNATURE FUNCTIONS
  static createLCStateUpdateFingerprint ({
    isClose,
    lcId,
    nonce,
    openVCs,
    vcRootHash,
    partyA,
    partyI,
    balanceA,
    balanceI
  }) {
    // validate params
    const methodName = 'createLCStateUpdateFingerprint'
    // validate
    // validatorOpts
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBool = { presence: true, isBool: true }

    Connext.validatorsResponseToError(
      validate.single(isClose, isBool),
      methodName,
      'isClose'
    )

    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(openVCs, isPositiveInt),
      methodName,
      'openVCs'
    )
    Connext.validatorsResponseToError(
      validate.single(vcRootHash, isHex),
      methodName,
      'vcRootHash'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyI, isAddress),
      methodName,
      'partyI'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
      methodName,
      'balanceI'
    )
    // generate state update to sign
    const hash = Web3.utils.soliditySha3(
      { type: 'bool', value: isClose },
      { type: 'uint256', value: nonce },
      { type: 'uint256', value: openVCs },
      { type: 'bytes32', value: vcRootHash },
      { type: 'address', value: partyA }, // address will be returned bytepadded
      { type: 'address', value: partyI }, // address is returned bytepadded
      { type: 'uint256', value: balanceA },
      { type: 'uint256', value: balanceI }
    )
    return hash
  }

  static recoverSignerFromLCStateUpdate ({
    sig,
    isClose,
    lcId,
    nonce,
    openVCs,
    vcRootHash,
    partyA,
    partyI,
    balanceA,
    balanceI
  }) {
    const methodName = 'recoverSignerFromLCStateUpdate'
    // validate
    // validatorOpts
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBool = { presence: true, isBool: true }

    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )

    Connext.validatorsResponseToError(
      validate.single(isClose, isBool),
      methodName,
      'isClose'
    )

    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(openVCs, isPositiveInt),
      methodName,
      'openVCs'
    )
    Connext.validatorsResponseToError(
      validate.single(vcRootHash, isHex),
      methodName,
      'vcRootHash'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyI, isAddress),
      methodName,
      'partyI'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
      methodName,
      'balanceI'
    )

    // generate fingerprint
    let fingerprint = Connext.createLCStateUpdateFingerprint({
      isClose,
      lcId,
      nonce,
      openVCs,
      vcRootHash,
      partyA,
      partyI,
      balanceA,
      balanceI
    })
    fingerprint = util.toBuffer(fingerprint)

    const prefix = Buffer.from('\x19Ethereum Signed Message:\n')
    const prefixedMsg = util.sha3(
      Buffer.concat([
        prefix,
        Buffer.from(String(fingerprint.length)),
        fingerprint
      ])
    )
    const res = util.fromRpcSig(sig)
    const pubKey = util.ecrecover(prefixedMsg, res.v, res.r, res.s)
    const addrBuf = util.pubToAddress(pubKey)
    const addr = util.bufferToHex(addrBuf)

    return addr
  }

  async createLCStateUpdate ({
    isClose = false, // default isnt close LC
    lcId,
    nonce,
    openVCs,
    vcRootHash,
    partyA,
    partyI = this.ingridAddress, // default to ingrid
    balanceA,
    balanceI,
    // unlockedAccountPresent = false // true if hub or ingrid,
    unlockedAccountPresent = true // FOR TESTING, CHANGE
  }) {
    const methodName = 'createLCStateUpdate'
    // validate
    // validatorOpts
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBool = { presence: true, isBool: true }

    Connext.validatorsResponseToError(
      validate.single(isClose, isBool),
      methodName,
      'isClose'
    )
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(openVCs, isPositiveInt),
      methodName,
      'openVCs'
    )
    Connext.validatorsResponseToError(
      validate.single(vcRootHash, isHex),
      methodName,
      'vcRootHash'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyI, isAddress),
      methodName,
      'partyI'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
      methodName,
      'balanceI'
    )

    // TO DO:
    // additional validation to only allow clients to call correct state updates

    // generate sig
    const accounts = await this.web3.eth.getAccounts()
    // personal sign?
    const hash = Connext.createLCStateUpdateFingerprint({
      isClose,
      lcId,
      nonce,
      openVCs,
      vcRootHash,
      partyA,
      partyI,
      balanceA,
      balanceI
    })
    let sig
    if (unlockedAccountPresent) {
      sig = await this.web3.eth.sign(hash, accounts[0])
    } else {
      sig = await this.web3.eth.personal.sign(hash, accounts[0])
    }
    return sig
  }

  static createVCStateUpdateFingerprint ({
    vcId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB
  }) {
    const methodName = 'createVCStateUpdateFingerprint'
    // typecast balances incase chained
    balanceA = Web3.utils.toBN(balanceA)
    balanceB = Web3.utils.toBN(balanceB)
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )

    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )

    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )

    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )
    // generate state update to sign
    const hash = Web3.utils.soliditySha3(
      { type: 'bytes32', value: vcId },
      { type: 'uint256', value: nonce },
      { type: 'address', value: partyA },
      { type: 'address', value: partyB },
      { type: 'uint256', value: balanceA },
      { type: 'uint256', value: balanceB }
    )
    return hash
  }

  static recoverSignerFromVCStateUpdate ({
    sig,
    vcId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB
  }) {
    const methodName = 'recoverSignerFromVCStateUpdate'
    // validate
    // typecast balances incase chained
    balanceA = Web3.utils.toBN(balanceA)
    balanceB = Web3.utils.toBN(balanceB)
    // validatorOpts'
    const isHex = { presence: true, isHex: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }

    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )

    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )

    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )

    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )

    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )

    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )

    let fingerprint = Connext.createVCStateUpdateFingerprint({
      vcId,
      nonce,
      partyA,
      partyB,
      balanceA,
      balanceB
    })
    fingerprint = util.toBuffer(fingerprint)
    const prefix = Buffer.from('\x19Ethereum Signed Message:\n')
    const prefixedMsg = util.sha3(
      Buffer.concat([
        prefix,
        Buffer.from(String(fingerprint.length)),
        fingerprint
      ])
    )
    const res = util.fromRpcSig(sig)
    const pubKey = util.ecrecover(prefixedMsg, res.v, res.r, res.s)
    const addrBuf = util.pubToAddress(pubKey)
    const addr = util.bufferToHex(addrBuf)

    return addr
  }

  async createVCStateUpdate ({
    vcId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB,
    // unlockedAccountPresent = false // if true, use sign over personal.sign
    unlockedAccountPresent = true // CHANGE TO DEFAULT FALSE WHEN NOT TESTING
  }) {
    // validate
    const methodName = 'createVCStateUpdate'
    // validate
    // validatorOpts'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }

    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )

    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )

    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )

    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )

    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )
    // get accounts
    const accounts = await this.web3.eth.getAccounts()
    // // get subchans
    // let subchanAI, subchanBI
    // // is this partyA or B?
    // if (accounts[0].toLowerCase() === partyA) {
    //   subchanAI = await this.getLcId()
    //   subchanBI = await this.getLcId(partyB)
    // } else if (accounts[0].toLowerCase() === partyB) {
    //   subchanAI = await this.getLcId(partyA)
    //   subchanBI = await this.getLcId()
    // } else {
    //   throw new Error(`[${methodName}] Not your virtual channel.`)
    // }

    // // keep in here? probably separate out into a validation of state update
    // // params fn
    // if (subchanAI === null || subchanBI === null) {
    //   throw new Error(`[${methodName}] Missing one or more required subchannels.`)
    // }

    // generate and sign hash
    const hash = Connext.createVCStateUpdateFingerprint({
      vcId,
      nonce,
      partyA,
      partyB,
      balanceA,
      balanceB
    })
    let sig
    if (unlockedAccountPresent) {
      sig = await this.web3.eth.sign(hash, accounts[0])
    } else {
      sig = await this.web3.eth.personal.sign(hash, accounts[0])
    }
    return sig
  }

  // vc0 is array of all existing vc0 sigs for open vcs
  static generateVcRootHash ({ vc0s }) {
    const methodName = 'generateVcRootHash'
    const isArray = { presence: true, isArray: true }
    Connext.validatorsResponseToError(
      validate.single(vc0s, isArray),
      methodName,
      'vc0s'
    )
    let elems, vcRootHash
    if (vc0s.length === 0) {
      // reset to initial value -- no open VCs
      vcRootHash = '0x0'
    } else {
      elems = vc0s.map(vc0 => {
        // vc0 is the initial state of each vc
        // hash each initial state and convert hash to buffer
        const hash = Connext.createVCStateUpdateFingerprint(vc0)
        const vcBuf = Utils.hexToBuffer(hash)
        return vcBuf
      })
      const merkle = new MerkleTree.default(elems)
      vcRootHash = Utils.bufferToHex(merkle.getRoot())
    }

    return vcRootHash
  }

  // HELPER FUNCTIONS

  // ***************************************
  // ******** CONTRACT HANDLERS ************
  // ***************************************
  async createLedgerChannelContractHandler ({
    ingridAddress = this.ingridAddress,
    lcId,
    // challenge,
    initialDeposit
  }) {
    const methodName = 'createLedgerChannelContractHandler'
    // validate
    // validatorOpts'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(ingridAddress, isAddress),
      methodName,
      'ingridAddress'
    )
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    // Connext.validatorsResponseToError(
    //   validate.single(challenge, isPositiveInt),
    //   methodName,
    //   'challenge'
    // )
    Connext.validatorsResponseToError(
      validate.single(initialDeposit, isBN),
      methodName,
      'initialDeposit'
    )
    const accounts = await this.web3.eth.getAccounts()
    const result = await this.channelManagerInstance.methods
      .createChannel(lcId, ingridAddress)
      .send(
        // in contract yet?
        // challenge,
      {
        from: accounts[0],
        value: initialDeposit,
        gas: 3000000 // NOT GREAT
      }
      )
    // should be transaction receipt in form:
    // {
    //   transactionHash: '0x22a2db0cb80c36064b4d49c8bea54874d9f4bb68c6ac6c69748724df9425c87e',
    //   transactionIndex: 0,
    //   blockHash: '0x15df3dfb11b9a4cc5a3286330cc4b0d34eb5c8174f6e4b23fdcb1d498b2aca4e',
    //   blockNumber: 15,
    //   gasUsed: 111623,
    //   cumulativeGasUsed: 111623,
    //   contractAddress: null,
    //   status: true,
    //   logsBloom: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    //   events: {}
    // }
    if (!result.transactionHash) {
      throw new Error(`[${methodName}] createChannel transaction failed.`)
    }
    return result
  }

  async LCOpenTimeoutContractHandler (lcId) {
    const methodName = 'LCOpenTimeoutContractHandler'
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    const accounts = await this.web3.eth.getAccounts()
    const result = await this.channelManagerInstance.methods
      .LCOpenTimeout(lcId)
      .send({
        from: accounts[0]
      })
    if (!result.transactionHash) {
      throw new Error(`[${methodName}] LCOpenTimeout transaction failed.`)
    }
    return result
  }

  async depositContractHandler (depositInWei) {
    const methodName = 'depositContractHandler'
    // validate
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(depositInWei, isBN),
      methodName,
      'depositInWei'
    )
    // find ledger channel by mine and ingrids address
    const lcId = await this.getLcId()
    // call LC method
    const accounts = await this.web3.eth.getAccounts()
    const result = await this.channelManagerInstance.methods
      .deposit(
        lcId, // PARAM NOT IN CONTRACT YET, SHOULD BE
        accounts[0]
      )
      .send({
        from: accounts[0],
        value: depositInWei
      })
    if (!result.transactionHash) {
      throw new Error(`[${methodName}] deposit transaction failed.`)
    }
    return result
  }

  async consensusCloseChannelContractHandler ({
    lcId,
    nonce,
    balanceA,
    balanceI,
    sigA,
    sigI
  }) {
    const methodName = 'consensusCloseChannelContractHandler'
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
      methodName,
      'balanceI'
    )
    Connext.validatorsResponseToError(
      validate.single(sigA, isHex),
      methodName,
      'sigA'
    )
    Connext.validatorsResponseToError(
      validate.single(sigI, isHex),
      methodName,
      'sigI'
    )
    const accounts = await this.web3.eth.getAccounts()
    const result = await this.channelManagerInstance.methods
      .consensusCloseChannel(lcId, nonce, balanceA, balanceI, sigA, sigI)
      // .consensusCloseChannel(lcId, nonce, balances, sigA)
      .send({
        from: accounts[0],
        gas: 3000000 // FIX THIS, WHY HAPPEN, TRUFFLE CONFIG???
      })
    if (!result.transactionHash) {
      throw new Error(
        `[${methodName}] consensusCloseChannel transaction failed.`
      )
    }
    return result
  }

  // default null means join with 0 deposit
  async joinLedgerChannelContractHandler ({ lcId, deposit = null }) {
    const methodName = 'joinLedgerChannelContractHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    if (deposit) {
      Connext.validatorsResponseToError(
        validate.single(lcId, isBN),
        methodName,
        'deposit'
      )
    } else {
      deposit = Web3.utils.toBN('0')
    }
    const result = await this.channelManagerInstance.methods
      .joinChannel(lcId)
      .send({
        from: this.ingridAddress, // can also be accounts[0], easier for testing
        value: deposit,
        gas: 3000000 // FIX THIS, WHY HAPPEN, TRUFFLE CONFIG???
      })
    if (!result.transactionHash) {
      throw new Error(`[${methodName}] joinLedgerChannel transaction failed.`)
    }
    return result
  }

  async updateLcStateContractHandler ({
    lcId,
    nonce,
    openVCs,
    balanceA,
    balanceI,
    vcRootHash,
    sigA,
    sigI
  }) {
    const methodName = 'updateLcStateContractHandler'
    // validate
    const isHexStrict = { presence: true, isHexStrict: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(openVCs, isPositiveInt),
      methodName,
      'openVCs'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceI, isBN),
      methodName,
      'balanceI'
    )
    Connext.validatorsResponseToError(
      validate.single(vcRootHash, isHex),
      methodName,
      'vcRootHash'
    )
    Connext.validatorsResponseToError(
      validate.single(sigA, isHex),
      methodName,
      'sigA'
    )
    Connext.validatorsResponseToError(
      validate.single(sigI, isHex),
      methodName,
      'sigI'
    )
    const accounts = await this.web3.eth.getAccounts()
    const result = await this.channelManagerInstance.methods
      .updateLCstate(
        lcId,
        nonce,
        openVCs,
        balanceA,
        balanceI,
        Web3.utils.padRight(vcRootHash, 64),
        sigA,
        sigI
      )
      .send({
        from: accounts[0],
        gas: 4700000 // FIX THIS, WHY HAPPEN, TRUFFLE CONFIG???
      })
    if (!result.transactionHash) {
      throw new Error(`[${methodName}] updateLCstate transaction failed.`)
    }
    return result
  }

  async initVcStateContractHandler ({
    subchanId,
    vcId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB,
    sigA
  }) {
    const methodName = 'initVcStateContractHandler'
    // validate
    const isAddress = { presence: true, isAddress: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    Connext.validatorsResponseToError(
      validate.single(subchanId, isHexStrict),
      methodName,
      'subchanId'
    )
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )
    Connext.validatorsResponseToError(
      validate.single(sigA, isHex),
      methodName,
      'sigA'
    )
    const accounts = await this.web3.eth.getAccounts()
    // generate proof from lc
    const vc0s = await this.getVcInitialStates(subchanId)
    console.log('vc0s:', vc0s)
    const vcRootHash = Connext.generateVcRootHash({ vc0s })
    let proof = [vcRootHash]
    proof = Utils.marshallState(proof)
    // proof = this.web3.utils.soliditySha3({ type: 'bytes32', value: vcRootHash })
    console.log('proof:', proof)
    const results = await this.channelManagerInstance.methods
      .initVCstate(
        subchanId,
        vcId,
        proof,
        nonce,
        partyA,
        partyB,
        balanceA,
        balanceB,
        sigA
      )
      .send({
        from: accounts[0],
        gas: 4700000
      })
    // if (!results.transactionHash) {
    //   throw new Error(`[${methodName}] initVCState transaction failed.`)
    // }
    return results
  }

  async settleVcContractHandler ({
    subchanId,
    vcId,
    nonce,
    partyA,
    partyB,
    balanceA,
    balanceB,
    sigA,
    sigB
  }) {
    const methodName = 'settleVcContractHandler'
    // validate
    const isAddress = { presence: true, isAddress: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(subchanId, isHexStrict),
      methodName,
      'subchanId'
    )
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )
    Connext.validatorsResponseToError(
      validate.single(sigA, isHex),
      methodName,
      'sigA'
    )
    const accounts = await this.web3.eth.getAccounts()
    const results = await this.channelManagerInstance.methods
      .settleVC(
        subchanId,
        vcId,
        nonce,
        partyA,
        partyB,
        balanceA,
        balanceB,
        sigA
      )
      .send({
        from: accounts[0],
        gas: 4700000

      })
    if (!results.transactionHash) {
      throw new Error(`[${methodName}] settleVC transaction failed.`)
    }
    return results
  }

  async closeVirtualChannelContractHandler ({lcId, vcId}) {
    const methodName = 'closeVirtualChannelContractHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    const accounts = await this.web3.eth.getAccounts()
    const results = await this.channelManagerInstance.methods
      .closeVirtualChannel(lcId, vcId)
      .send({
        from: accounts[0]
      })
    if (!results.transactionHash) {
      throw new Error(
        `[${methodName}] transaction failed.`
      )
    }
    return results
  }

  async byzantineCloseChannelContractHandler (lcId) {
    const methodName = 'byzantineCloseChannelContractHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    const accounts = await this.web3.eth.getAccounts()
    const results = await this.channelManagerInstance.methods
      .byzantineCloseChannel(lcId)
      .send({
        from: accounts[0]
      })
    if (!results.transactionHash) {
      throw new Error(
        `[${methodName}] transaction failed.`
      )
    }
    return results
  }

  // ***************************************
  // ********** ERROR HELPERS ************
  // ***************************************
  static validatorsResponseToError (validatorResponse, methodName, varName) {
    if (validatorResponse !== undefined) {
      const errorMessage = `[${methodName}][${varName}] : ${validatorResponse}`
      throw new Error(errorMessage)
    }
  }

  // ***************************************
  // *********** INGRID HELPERS ************
  // ***************************************
  /**
   * Returns the latest ingrid-signed ledger state update.
   *
   * @example
   * // returns highest nonce ledger channel state update
   * const lcId = await connext.getLcId()
   * const lcState = await connext.getLatestLedgerStateUpdate(lcId)
   *
   *
   * @param {HexString} ledgerChannelId
   * @returns {Object} containing the latest signed state update for the ledger channel. May or may not be double signed.
   */
  async getLatestLedgerStateUpdate (ledgerChannelId) {
    // lcState == latest ingrid signed state
    const methodName = 'getLatestLedgerStateUpdate'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(ledgerChannelId, isHexStrict),
      methodName,
      'ledgerChannelId'
    )
    const response = await axios.get(
      `${this.ingridUrl}/ledgerchannel/${ledgerChannelId}/lateststate`
    )
    return response.data
  }

  /**
   * Returns the ledger channel id between the supplied address and ingrid.
   *
   * If no address is supplied, accounts[0] is used as partyA.
   *
   * @param {String} partyA - address of the partyA in the channel with Ingrid.
   */
  async getLcId (partyA = null) {
    const methodName = 'getLcId'
    const isAddress = { presence: true, isAddress: true }
    if (partyA) {
      Connext.validatorsResponseToError(
        validate.single(partyA, isAddress),
        methodName,
        'partyA'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      partyA = accounts[0]
    }
    // get my LC with ingrid
    const response = await axios.get(
      `${this.ingridUrl}/ledgerchannel?a=${partyA}`
    )
    return response.data
  }

  /**
   * Returns an object representing the virtual channel in the database.
   *
   * @param {String} channelId - the ID of the virtual channel
   */
  async getChannel (channelId) {
    const methodName = 'getChannel'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    const response = await axios.get(
      `${this.ingridUrl}/virtualchannel/${channelId}`
    )
    return response.data
  }

  /**
   * Returns an object representing the virtual channel in the database.
   *
   * @param {String} channelId - the ID of the virtual channel
   */
  async getChannelByParties ({ partyA, partyB }) {
    const methodName = 'getChannelByParties'
    const isAddress = { presence: true, isAddress: true }
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )
    const response = await axios.get(
      `${this.ingridUrl}/virtualchannel?a=${partyA}&b=${partyB}`
    )
    return response.data
  }

  /**
   * Returns the ledger channel id for partyB in the virtual channel.
   *
   *
   * @param {String} vcId - the virtual channel id
   */
  async getOtherLcId (vcId) {
    const methodName = 'getOtherLcId'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    // get LC for other VC party and ingrid
    const vc = await this.getChannel(vcId)
    return vc.subchanBI
  }

  /**
   * Returns an object representing a ledger channel.
   *
   * @param {String} lcId - the ledgerchannel id
   */
  async getLcById (lcId) {
    const methodName = 'getLcById'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    const response = await axios.get(`${this.ingridUrl}/ledgerchannel/${lcId}`)
    return response.data
  }

  /**
   * Returns object representing the ledger channel between partyA and Ingrid
   * 
   * @param {String} partyA - partyA in ledger channel. Default is accounts[0]
   * @returns {Object} Ledger channel object
   */
  async getLcByPartyA (partyA = null) {
    const methodName = 'getLcByPartyA'
    const isAddress = { presence: true, isAddress: true }
    if (partyA !== null) {
      Connext.validatorsResponseToError(
        validate.single(partyA, isAddress),
        methodName,
        'partyA'
      )
    } else {
      const accounts = await this.web3.eth.getAccounts()
      partyA = accounts[0]
    }
    const response = await axios.get(`${this.ingridUrl}/ledgerchannel/a/${partyA}`)
    return response.data
  }

  /**
   * Returns the default ledger channel challenge period from ingrid.
   *
   * Challenge timers are used when constructing an LC.
   *
   */
  async getLedgerChannelChallengeTimer () {
    const response = await axios.get(`${this.ingridUrl}/ledgerchannel/challenge`)
    if (response.data) {
      return response.data.challenge
    } else {
      return response.data
    }
  }

  // posts signature of lc0 to ingrid
  // requests to open a ledger channel with the hub
  async requestJoinLc ({ lcId, sig, balanceA }) {
    // validate params
    const methodName = 'requestJoinLc'
    const isHex = { presence: true, isHex: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )

    const accounts = await this.web3.eth.getAccounts()
    const response = await axios.post(
      `${this.ingridUrl}/ledgerchannel/join?a=${accounts[0]}`,
      {
        lcId,
        sig,
        balanceA
      }
    )
    return response.data
  }

  // HELPER FUNCTION TO HAVE INGRID SET UP VC
  async openVc ({ sig, balanceA, to, vcRootHash }) {
    // validate params
    const methodName = 'openVc'
    const isAddress = { presence: true, isAddress: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(to, isAddress),
      methodName,
      'to'
    )
    Connext.validatorsResponseToError(
      validate.single(vcRootHash, isHex),
      methodName,
      'vcRootHash'
    )

    const accounts = await this.web3.eth.getAccounts()
    // ingrid should add vc params to db
    console.log(`${this.ingridUrl}/virtualchannel/open?a=${accounts[0]}`)
    const response = await axios.post(
      `${this.ingridUrl}/virtualchannel/open?a=${accounts[0]}`,
      {
        sig,
        balanceA,
        to,
        vcRootHash
      }
    )
    return response.data
  }

  // ingrid verifies the vc0s and sets up vc and countersigns lc updates
  async joinVcHandler ({ sig, vcRootHash, channelId }) {
    // validate params
    const methodName = 'joinVcHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )
    Connext.validatorsResponseToError(
      validate.single(vcRootHash, isHex),
      methodName,
      'vcRootHash'
    )
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    // ingrid should verify vcS0A and vcS0b
    const response = await axios.post(
      `${this.ingridUrl}/virtualchannel/${channelId}/join`,
      {
        sig,
        vcRootHash
      }
    )
    return response.data
  }

  // posts to ingrid endpoint to decompose ledger channel
  // based on latest double signed update
  // should return ingrids signature on the closing lc update used in
  // consensusCloseChannel

  // as called in withdraw: requests ingrid cosigns final ledger update
  // if she cosigns, call consensus
  async fastCloseLcHandler ({ sig, lcId }) {
    // validate params
    const methodName = 'fastCloseLcHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    const response = await axios.post(
      `${this.ingridUrl}/ledgerchannel/${lcId}/fastclose`,
      {
        sig
      }
    )
    return response.data
  }

  async vcStateUpdateHandler ({ channelId, sig, balanceA, balanceB }) {
    // validate params
    const methodName = 'vcStateUpdateHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )
    const response = await axios.post(
      `${this.ingridUrl}/virtualchannel/${channelId}/update`,
      {
        sig,
        balanceA,
        balanceB
      }
    )
    return response.data
  }

  async cosignVcStateUpdateHandler ({ channelId, sig, balance }) {
    // validate params
    const methodName = 'cosignVcStateUpdateHandler'
    const isHexStrict = { presence: true, isHexStrict: true }
    const isHex = { presence: true, isHex: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(sig, isHex),
      methodName,
      'sig'
    )
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    Connext.validatorsResponseToError(
      validate.single(balance, isBN),
      methodName,
      'balance'
    )
    const response = await axios.post(
      `${this.ingridUrl}/virtualchannel/${channelId}/cosign`,
      {
        sig,
        balance
      }
    )
    return response.data
  }

  // Should generate an object like this:
  // const vcState = {
  //   sigA,
  //   sigB,
  //   vcId,
  //   nonce,
  //   partyA,
  //   partyB,
  //   partyI,
  //   subchanAI,
  //   subchanBI,
  //   balanceA,
  //   balanceB
  // }
  /**
   * Returns the latest double signed virtual channel state as an object.
   *
   * Signatures from both parties are included as fields in that object.
   *
   * @param {String} channelId - ID of the virtual channel
   * @returns {Object} representing the latest double signed virtual channel state.
   */
  async getLatestVirtualDoubleSignedStateUpdate (channelId) {
    // validate params
    const methodName = 'getLatestVirtualDoubleSignedStateUpdate'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(channelId, isHexStrict),
      methodName,
      'channelId'
    )
    const response = await axios.get(
      `${this.ingridUrl}/virtualchannel/${channelId}/lateststate/doublesigned`
    )
    return response.data
  }

  /**
   * Generates the decomposed ledger channel updates needed when closing a virtual channel.
   *
   * @param {Object} params
   * @param {String} params.sigA - signature of partyA on closing virtual channel state
   * @param {String} params.sigB - signature of partyB on closing virtual channel state
   * @param {String} params.vcId - virtual channel id
   * @param {Number} params.nonce - nonce of the virtual channel
   * @param {String} params.partyA - wallet address of partyA
   * @param {String} params.partyB - wallet address of partyB
   * @param {String} params.partyI - wallet address of Ingrid
   * @param {String} params.subchanAI - ledger channel id of the ledger channel between partyA and partyI
   * @param {String} params.subchanBI - ledger channel id of the ledger channel between partyB and partyI
   * @param {BigNumber} params.balanceA - balanceA in the virtual channel
   * @param {BigNumber} params.balanceB - balanceB in the virtual channel
   */
  async createDecomposedLcUpdates ({
    sigA,
    sigB,
    vcId,
    nonce,
    partyA,
    partyB,
    partyI,
    subchanAI,
    subchanBI,
    balanceA,
    balanceB
  }) {
    // validate params
    const methodName = 'createDecomposedLcUpdates'
    const isHex = { presence: true, isHex: true }
    const isHexStrict = { presence: true, isHexStrict: true }
    const isPositiveInt = { presence: true, isPositiveInt: true }
    const isAddress = { presence: true, isAddress: true }
    const isBN = { presence: true, isBN: true }
    Connext.validatorsResponseToError(
      validate.single(sigA, isHex),
      methodName,
      'sigA'
    )
    Connext.validatorsResponseToError(
      validate.single(sigB, isHex),
      methodName,
      'sigB'
    )
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    Connext.validatorsResponseToError(
      validate.single(nonce, isPositiveInt),
      methodName,
      'nonce'
    )
    Connext.validatorsResponseToError(
      validate.single(partyA, isAddress),
      methodName,
      'partyA'
    )
    Connext.validatorsResponseToError(
      validate.single(partyB, isAddress),
      methodName,
      'partyB'
    )
    Connext.validatorsResponseToError(
      validate.single(partyI, isAddress),
      methodName,
      'partyI'
    )
    Connext.validatorsResponseToError(
      validate.single(subchanAI, isHexStrict),
      methodName,
      'subchanAI'
    )
    Connext.validatorsResponseToError(
      validate.single(subchanBI, isHexStrict),
      methodName,
      'subchanBI'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceA, isBN),
      methodName,
      'balanceA'
    )
    Connext.validatorsResponseToError(
      validate.single(balanceB, isBN),
      methodName,
      'balanceB'
    )
    // get correct lc info
    const accounts = await this.web3.eth.getAccounts()
    let lc, lcState, vc0s
    if (accounts[0].toLowerCase() === partyA) {
      // accounts[0] is vcpartyA, lcAgentA is paying money
      lc = await this.getLcById(subchanAI)
      vc0s = await this.getVcInitialStates(subchanAI)
      lcState.lcId = subchanAI
      lcState.balanceA = lc.balanceA - balanceB // balanceB in VC is amount A paid
      lcState.balanceI = lc.balanceI + balanceB
    } else if (accounts[0].toLowerCase() === partyB) {
      // accounts[0] is partyB, vcAgentA is making money
      lc = await this.getLcById(subchanBI)
      vc0s = await this.getVcInitialStates(subchanBI)
      lcState.lcId = subchanBI
      lcState.balanceA = lc.balanceA + balanceB // lc balance inc. by amount earned
      lcState.balanceI = lc.balanceI - balanceB
    } else {
      // does this condition make it so watchers cant call this function
      throw new Error(`[${methodName}] Not your virtual channel to decompose.`)
    }
    // create vc root hash
    const vc0 = await this.getVcInitialState(vcId)
    vc0s = vc0s.pop(vc0)
    lcState.vCRootHash = Connext.generateVcRootHash({ vc0s })
    // add additional state params to create vc update
    lcState.nonce = lc.nonce + 1
    lcState.openVCs = lc.openVCs - 1
    lcState.partyA = accounts[0]
    lcState.sigA = await this.createLCStateUpdate(lcState)

    return lcState
  }

  // should return a list of initial vc state objects
  // for all open VCs for a given LC
  // list of objects in form detailed below
  /**
   * Returns a list of initial vc state objects that correspond to the open VCs for this ledger channel.
   *
   * These initial states are used when generating the vcRootHash for ledger channel updates.
   * @param {String} lcId - ledger channel ID
   */
  async getVcInitialStates (lcId) {
    // validate params
    const methodName = 'getVcInitialStates'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(lcId, isHexStrict),
      methodName,
      'lcId'
    )
    const response = await axios.get(
      `${this.ingridUrl}/ledgerchannel/${lcId}/virtualchannel/initialstates`
    )
    return response.data
  }

  // returns initial vc state object for given vc
  // object:
  // partyA: vc0.partyA,
  //     partyB: vc0.partyB,
  //     balanceA: vc0.balanceA,
  //     balanceB: vc0.balanceB,
  //     sigA: vc0.sigA,
  //     sigB: vc0.sigB
  //   }
  /**
   * Returns an object representing the initial state of the virtual channel when it was opened.
   *
   * @param {String} vcId the virtual channel id
   */
  async getVcInitialState (vcId) {
    // validate params
    const methodName = 'getVcInitialState'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    const response = await axios.get(
      `${this.ingridUrl}/virtualchannel/${vcId}/intialstate`
    )
    return response.data
  }

  // requests both decomposed lc state updates from ingrid.
  // returns labeled lc state object (i.e. indexed by lc channel id)
  // lcState obj should match whats submitted to createLcUpdate
  // const decomposedLcStates = {
  //   subchanBI: {},
  //   subchanAI: {}
  // }
  async getDecomposedLcStates (vcId) {
    // validate params
    const methodName = 'getDecomposedLcStates'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    const response = await axios.get(
      `${this.ingridUrl}/virtualchannel/${vcId}/decompose`
    )
    return response.data
  }

  // asks ingrid to decompose virtual channel at latest double signed update
  // to ledger channel updates
  // called from fastCloseChannel
  async requestDecomposeLC (vcId) {
    // validate params
    const methodName = 'requestDecomposeLC'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    const response = await axios.post(
      `${this.ingridUrl}/virtualchannel/${vcId}/decompose`
    )
    return response.data
  }

  // settles all vcs on chain in the case of a dispute (used in close channel)
  // first calls init vc
  // then calls settleVc

  /// SHOULD WE JUST POST THIS DIRECTLY TO THE WATCHER URL FROM OUR PACKAGE

  // then posts to watcher (?) -- maybe just post all of this to the watcher url (?)
  /**
   * Settles all virtual channels on chain in the case of a displute (i.e. Ingrid doesn't return decomposed state updates in "closeChannel").
   *
   * First, calls "initVC" on the contract. If that transaction was successful, "settleVC" is called. Otherwise, returns the result of calling "initVC".
   *
   * @param {String} vcId - id of the virtual channel to close in dispute
   */
  async byzantineCloseVc (vcId) {
    // validate params
    const methodName = 'byzantineCloseVc'
    const isHexStrict = { presence: true, isHexStrict: true }
    Connext.validatorsResponseToError(
      validate.single(vcId, isHexStrict),
      methodName,
      'vcId'
    )
    const accounts = await this.web3.eth.getAccounts()
    const vc0 = await this.getVcInitialState(vcId)
    let subchan
    if (accounts[0] === vc0.partyA) {
      subchan = vc0.subchanAI
    } else if (accounts[0] == vc0.partyB) {
      subchan = vc0.subchanBI
    }
    const initResult = await this.initVcStateContractHandler({
      subchanId: subchan,
      vcId,
      partyA: vc0.partyA,
      partyB: vc0.partyB,
      balanceA: Web3.utils.toBN(vc0.balanceA),
      balanceB: Web3.utils.toBN(vc0.balanceB),
      sigA: vc0.sigA,
      nonce: vc0.nonce
    })
    if (initResult) {
      const vcState = await this.getLatestVirtualDoubleSignedStateUpdate(vcId)
      const settleResult = await this.settleVcContractHandler({
        subchanId: subchan,
        vcId,
        nonce: vcState.nonce,
        partyA: vcState.partyA,
        partyB: vcState.partyB,
        balanceA: Web3.utils.toBN(vcState.balanceA),
        balanceB: Web3.utils.toBN(vcState.balanceB),
        sigA: vcState.sigA,
      })
      return settleResult
    } else {
      return initResult
    }
  }
}

module.exports = Connext
