'use strict';

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var channelManagerAbi = require('../artifacts/LedgerChannel.json');
var util = require('ethereumjs-util');
var Web3 = require('web3');
var validate = require('validate.js');

var _require = require('./helpers/Errors'),
    validateBalance = _require.validateBalance,
    validateTipPurchaseMeta = _require.validateTipPurchaseMeta,
    validatePurchasePurchaseMeta = _require.validatePurchasePurchaseMeta,
    validateWithdrawalPurchaseMeta = _require.validateWithdrawalPurchaseMeta,
    validateExchangePurchaseMeta = _require.validateExchangePurchaseMeta,
    ChannelOpenError = _require.ChannelOpenError,
    ParameterValidationError = _require.ParameterValidationError,
    ContractError = _require.ContractError,
    ThreadOpenError = _require.ThreadOpenError,
    ChannelUpdateError = _require.ChannelUpdateError,
    ThreadUpdateError = _require.ThreadUpdateError,
    ChannelCloseError = _require.ChannelCloseError,
    ThreadCloseError = _require.ThreadCloseError;

var MerkleTree = require('./helpers/MerkleTree');
var Utils = require('./helpers/utils');
var crypto = require('crypto');
var networking = require('./helpers/networking');
var interval = require('interval-promise');
var tokenAbi = require('human-standard-token-abi');

// Channel enums
var CHANNEL_STATES = {
  'LCS_OPENING': 0,
  'LCS_OPENED': 1,
  'LCS_SETTLING': 2,
  'LCS_SETTLED': 3

  // thread enums
};var THREAD_STATES = {
  'VCS_OPENING': 0,
  'VCS_OPENED': 1,
  'VCS_SETTLING': 2,
  'VCS_SETTLED': 3

  // Purchase metadata enum
};var META_TYPES = {
  'TIP': 'TIP',
  'PURCHASE': 'PURCHASE',
  'UNCATEGORIZED': 'UNCATEGORIZED',
  'WITHDRAWAL': 'WITHDRAWAL',
  'EXCHANGE': 'EXCHANGE',
  'FEE': 'FEE'
};

var PAYMENT_TYPES = {
  'LEDGER': 0,
  'VIRTUAL': 1
};

var CHANNEL_TYPES = {
  'ETH': 0,
  'TOKEN': 1,
  'TOKEN_ETH': 2

  // ***************************************
  // ******* PARAMETER VALIDATION **********
  // ***************************************
};validate.validators.isPositiveBnString = function (value) {
  var bnVal = void 0;
  if (Web3.utils.isBN(value)) {
    bnVal = value;
  } else {
    // try to convert to BN
    try {
      bnVal = Web3.utils.toBN(value);
    } catch (e) {
      return value + ' cannot be converted to BN';
    }
  }

  if (bnVal.isNeg()) {
    return value + ' cannot be negative';
  } else {
    return null;
  }
};
validate.validators.isValidChannelType = function (value) {
  if (!value) {
    return 'Value vannot be undefined';
  } else if (CHANNEL_TYPES[value] === -1) {
    return value + ' is not a valid channel type';
  }
};
validate.validators.isValidDepositObject = function (value) {
  if (!value) {
    return 'Value cannot be undefined';
  } else if (!value.tokenDeposit && !value.ethDeposit) {
    return value + ' does not contain tokenDeposit or ethDeposit fields';
  }
  if (value.tokenDeposit && !validateBalance(value.tokenDeposit)) {
    return value.tokenDeposit + ' is not a valid token deposit';
  }

  if (value.ethDeposit && !validateBalance(value.ethDeposit)) {
    return value.ethDeposit + ' is not a valid eth deposit';
  }

  return null;
};

validate.validators.isValidMeta = function (value) {
  if (!value) {
    return 'Value cannot be undefined.';
  } else if (!value.receiver) {
    return value + ' does not contain a receiver field';
  } else if (!Web3.utils.isAddress(value.receiver)) {
    return value.receiver + ' is not a valid ETH address';
  } else if (!value.type) {
    return value + ' does not contain a type field';
  }

  var isValid = void 0,
      ans = void 0;

  switch (META_TYPES[value.type]) {
    case 'TIP':
      isValid = validateTipPurchaseMeta(value);
      ans = isValid ? null : JSON.stringify(value) + ' is not a valid TIP purchase meta, missing one or more fields: streamId, performerId, performerName';
      return ans;
    case 'PURCHASE':
      isValid = validatePurchasePurchaseMeta(value);
      ans = isValid ? null : JSON.stringify(value) + ' is not a valid PURCHASE purchase meta, missing one or more fields: productSku, productName';
      return ans;
    case 'UNCATEGORIZED':
      return null;
    case 'WITHDRAWAL':
      isValid = validateWithdrawalPurchaseMeta(value);
      ans = isValid ? null : JSON.stringify(value) + ' is not a valid WITHDRAWAL purchase meta.';
      return ans;
    case 'EXCHANGE':
      isValid = validateExchangePurchaseMeta(value);
      ans = isValid ? null : JSON.stringify(value) + ' is not a valid EXCHANGE purchase meta.';
      return ans;
    case 'FEE':
      return null;
    default:
      return value.type + ' is not a valid purchase meta type';
  }
};

validate.validators.isChannelStatus = function (value) {
  if (CHANNEL_STATES[value] === -1) {
    return null;
  } else {
    return value + ' is not a valid lc state';
  }
};

validate.validators.isBN = function (value) {
  if (Web3.utils.isBN(value)) {
    return null;
  } else {
    return value + ' is not BN.';
  }
};

validate.validators.isHex = function (value) {
  if (Web3.utils.isHex(value)) {
    return null;
  } else {
    return value + ' is not hex string.';
  }
};

validate.validators.isHexStrict = function (value) {
  // for ledgerIDs
  if (Web3.utils.isHexStrict(value)) {
    return null;
  } else {
    return value + ' is not hex string prefixed with 0x.';
  }
};

validate.validators.isArray = function (value) {
  if (Array.isArray(value)) {
    return null;
  } else {
    return value + ' is not an array.';
  }
};

validate.validators.isObj = function (value) {
  if (value instanceof Object && value) {
    return null;
  } else {
    return value + ' is not an object.';
  }
};

validate.validators.isAddress = function (value) {
  if (Web3.utils.isAddress(value)) {
    return null;
  } else {
    return value + ' is not address.';
  }
};

validate.validators.isBool = function (value) {
  if ((typeof value === 'undefined' ? 'undefined' : (0, _typeof3.default)(value)) === (0, _typeof3.default)(true)) {
    return null;
  } else {
    return value + ' is not a boolean.';
  }
};

validate.validators.isPositiveInt = function (value) {
  if (value >= 0) {
    return null;
  } else {
    return value + ' is not a positive integer.';
  }
};

validate.validators.isThreadState = function (value) {
  if (!value.channelId || !Web3.utils.isHexStrict(value.channelId)) {
    return 'Thread state does not contain valid channelId: ' + JSON.stringify(value);
  }
  if (value.nonce == null || value.nonce < 0) {
    return 'Thread state does not contain valid nonce: ' + JSON.stringify(value);
  }
  if (!value.partyA || !Web3.utils.isAddress(value.partyA)) {
    return 'Thread state does not contain valid partyA: ' + JSON.stringify(value);
  }
  if (!value.partyB || !Web3.utils.isAddress(value.partyB)) {
    return 'Thread state does not contain valid partyB: ' + JSON.stringify(value);
  }
  // valid state may have ethBalanceA/tokenBalanceA
  // or valid states may have balanceA objects
  if (value.ethBalanceA != null) {
    // must also contain all other fields
    if (value.ethBalanceB == null || value.tokenBalanceA == null || value.tokenBalanceB == null) {
      return 'Thread state does not contain valid balances: ' + JSON.stringify(value);
    }
  } else if (value.balanceA != null) {
    if (validate.validators.isValidDepositObject(value.balanceA) || validate.validators.isValidDepositObject(value.balanceB)) {
      return 'Thread state does not contain valid balances: ' + JSON.stringify(value);
    }
  } else {
    return 'Thread state does not contain valid balances: ' + JSON.stringify(value);
  }

  return null;
};

validate.validators.isChannelObj = function (value) {
  if (CHANNEL_STATES[value.state] === -1) {
    return 'Channel object does not contain valid state: ' + JSON.stringify(value);
  }
  if (!value.channelId || !Web3.utils.isHexStrict(value.channelId)) {
    return 'Channel object does not contain valid channelId: ' + JSON.stringify(value);
  }
  if (value.nonce == null || value.nonce < 0) {
    return 'Channel object does not contain valid nonce: ' + JSON.stringify(value);
  }
  if (!value.partyA || !Web3.utils.isAddress(value.partyA)) {
    return 'Channel object does not contain valid partyA: ' + JSON.stringify(value);
  }
  if (!value.partyI || !Web3.utils.isAddress(value.partyI)) {
    return 'Channel object does not contain valid partyI: ' + JSON.stringify(value);
  }
  if (value.openVcs == null || value.openVcs < 0) {
    return 'Channel object does not contain valid number of openVcs: ' + JSON.stringify(value);
  }
  if (!value.vcRootHash || !Web3.utils.isHexStrict(value.vcRootHash)) {
    return 'Channel object does not contain valid vcRootHash: ' + JSON.stringify(value);
  }
  if (value.ethBalanceA == null) {
    return 'Channel object does not contain valid ethBalanceA: ' + JSON.stringify(value);
  }
  if (value.ethBalanceI == null) {
    return 'Channel object does not contain valid ethBalanceI: ' + JSON.stringify(value);
  }
  if (value.tokenBalanceA == null) {
    return 'Channel object does not contain valid tokenBalanceA: ' + JSON.stringify(value);
  }
  if (value.tokenBalanceI == null) {
    return 'Channel object does not contain valid tokenBalanceI: ' + JSON.stringify(value);
  }
  return null;
};

/**
 *
 * Class representing an instance of a Connext client.
 */

var Connext = function () {
  /**
   *
   * Create an instance of the Connext client.
   *
   * @constructor
   * @example
   * const Connext = require('connext')
   * const connext = new Connext(web3)
   * @param {Object} params - the constructor object
   * @param {Web3} params.web3 - the web3 instance
   * @param {String} params.ingridAddress - ETH address of intermediary (defaults to Connext hub)
   * @param {String} params.watcherUrl - url of watcher server (defaults to Connext hub)
   * @param {String} params.ingridUrl - url of intermediary server (defaults to Connext hub)
   * @param {String} params.contractAddress - address of deployed contract (defaults to latest deployed contract)
   * @param {String} params.hubAuth - token authorizing client package to make requests to hub
   */
  function Connext(_ref) {
    var web3 = _ref.web3,
        _ref$ingridAddress = _ref.ingridAddress,
        ingridAddress = _ref$ingridAddress === undefined ? '' : _ref$ingridAddress,
        _ref$watcherUrl = _ref.watcherUrl,
        watcherUrl = _ref$watcherUrl === undefined ? '' : _ref$watcherUrl,
        _ref$ingridUrl = _ref.ingridUrl,
        ingridUrl = _ref$ingridUrl === undefined ? '' : _ref$ingridUrl,
        _ref$contractAddress = _ref.contractAddress,
        contractAddress = _ref$contractAddress === undefined ? '' : _ref$contractAddress,
        _ref$hubAuth = _ref.hubAuth,
        hubAuth = _ref$hubAuth === undefined ? '' : _ref$hubAuth,
        _ref$useAxios = _ref.useAxios,
        useAxios = _ref$useAxios === undefined ? false : _ref$useAxios;
    var web3Lib = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Web3;
    (0, _classCallCheck3.default)(this, Connext);

    this.web3 = new web3Lib(web3.currentProvider); // convert legacy web3 0.x to 1.x
    this.ingridAddress = ingridAddress.toLowerCase();
    this.watcherUrl = watcherUrl;
    this.ingridUrl = ingridUrl;
    this.channelManagerInstance = new this.web3.eth.Contract(channelManagerAbi.abi, contractAddress);
    this.config = {
      headers: {
        Cookie: 'hub.sid=' + hubAuth + ';',
        Authorization: 'Bearer ' + hubAuth
      },
      withAuth: true
    };
    this.networking = networking(ingridUrl, useAxios);
  }

  // ***************************************
  // *********** HAPPY CASE FNS ************
  // ***************************************

  /**
   * Opens a ledger channel with Ingrid (Hub) at the address provided when instantiating the Connext instance with the given initial deposit.
   *
   * Sender defaults to accounts[0] if not supplied to the openChannel function.
   *
   * Ledger channel challenge timer is determined by Ingrid (Hub) if the parameter is not supplied. Current default value is 3600s (1 hour).
   *
   * Uses the internal web3 instance to call the createChannel function on the Channel Manager contract, and logs the transaction hash of the channel creation. The function returns the ID of the created channel.
   *
   * Once the channel is created on chain, users should call the requestJoinLc function to request that the hub joins the channel. This function should be called on a timeout sufficient for the hub to detect the channel and add it to its database.
   *
   * If Ingrid is unresponsive, or does not join the channel within the challenge period, the client function "ChannelOpenTimeoutContractHandler" can be called by the client to recover the funds.
   *
   * @example
   * const deposit = Web3.utils.toBN(Web3.utils.toWei('1', 'ether))
   * const lcId = await connext.openChannel(deposit)
   *
   * @param {Object} initialDeposits - deposits in wei (must have at least one deposit)
   * @param {BN} initialDeposits.ethDeposit - deposit in eth (may be null)
   * @param {BN} initialDeposits.tokenDeposit - deposit in tokens (may be null)
   * @param {String} sender - (optional) counterparty with hub in ledger channel, defaults to accounts[0]
   * @param {Number} challenge - (optional) challenge period in seconds
   * @returns {Promise} resolves to the ledger channel id of the created channel
   */


  (0, _createClass3.default)(Connext, [{
    key: 'openChannel',
    value: function () {
      var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(initialDeposits) {
        var tokenAddress = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var sender = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var challenge = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
        var methodName, isValidDepositObject, isAddress, isPositiveInt, accounts, ethDeposit, tokenDeposit, channelType, channel, channelId, contractResult;
        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                // validate params
                methodName = 'openChannel';
                isValidDepositObject = { presence: true, isValidDepositObject: true };
                isAddress = { presence: true, isAddress: true };
                isPositiveInt = { presence: true, isPositiveInt: true };

                Connext.validatorsResponseToError(validate.single(initialDeposits, isValidDepositObject), methodName, 'initialDeposits');
                if (tokenAddress) {
                  // should probably do a better check for contract specific addresses
                  // maybe a whitelisted token address array
                  Connext.validatorsResponseToError(validate.single(tokenAddress, isAddress), methodName, 'tokenAddress');
                }

                if (!sender) {
                  _context.next = 10;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context.next = 14;
                break;

              case 10:
                _context.next = 12;
                return this.web3.eth.getAccounts();

              case 12:
                accounts = _context.sent;

                sender = accounts[0].toLowerCase();

              case 14:
                if (!challenge) {
                  _context.next = 18;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(challenge, isPositiveInt), methodName, 'isPositiveInt');
                _context.next = 21;
                break;

              case 18:
                _context.next = 20;
                return this.getChallengeTimer();

              case 20:
                challenge = _context.sent;

              case 21:
                // determine channel type
                ethDeposit = initialDeposits.ethDeposit, tokenDeposit = initialDeposits.tokenDeposit;
                channelType = void 0;

                if (!(tokenAddress && ethDeposit)) {
                  _context.next = 27;
                  break;
                }

                channelType = Object.keys(CHANNEL_TYPES)[2];
                _context.next = 36;
                break;

              case 27:
                if (tokenAddress) {
                  _context.next = 31;
                  break;
                }

                channelType = Object.keys(CHANNEL_TYPES)[0];
                _context.next = 36;
                break;

              case 31:
                if (!(tokenAddress && tokenDeposit && !ethDeposit)) {
                  _context.next = 35;
                  break;
                }

                channelType = Object.keys(CHANNEL_TYPES)[1];
                _context.next = 36;
                break;

              case 35:
                throw new ChannelOpenError(methodName, 'Error determining channel deposit types.');

              case 36:
                _context.next = 38;
                return this.getChannelByPartyA(sender);

              case 38:
                channel = _context.sent;

                if (!(channel != null && CHANNEL_STATES[channel.state] === 1)) {
                  _context.next = 41;
                  break;
                }

                throw new ChannelOpenError(methodName, 401, 'PartyA has open channel with hub, ID: ' + channel.channelId);

              case 41:
                if (!(sender.toLowerCase() === this.ingridAddress.toLowerCase())) {
                  _context.next = 43;
                  break;
                }

                throw new ChannelOpenError(methodName, 'Cannot open a channel with yourself');

              case 43:

                // generate additional initial lc params
                channelId = Connext.getNewChannelId();
                _context.next = 46;
                return this.createChannelContractHandler({
                  channelId: channelId,
                  challenge: challenge,
                  initialDeposits: initialDeposits,
                  channelType: channelType,
                  tokenAddress: tokenAddress ? tokenAddress : null,
                  sender: sender
                });

              case 46:
                contractResult = _context.sent;

                console.log('tx hash:', contractResult.transactionHash);

                return _context.abrupt('return', channelId);

              case 49:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function openChannel(_x5) {
        return _ref2.apply(this, arguments);
      }

      return openChannel;
    }()

    /**
     * Adds a deposit to an existing ledger channel by calling the contract function "deposit" using the internal web3 instance.
     *
     * Can be used by any either channel party.
     *
     * If sender is not supplied, it defaults to accounts[0]. If the recipient is not supplied, it defaults to the sender.
     *
     *
     * @example
     * // get a BN
     * const deposit = Web3.utils.toBN(Web3.utils.toWei('1','ether'))
     * const txHash = await connext.deposit(deposit)
     *
     * @param {Object} deposits - deposit object
     * @param {BN} deposits.ethDeposit - value of the channel deposit in ETH
     * @param {BN} deposits.tokenDeposit - value of the channel deposit in tokens
     * @param {String} sender - (optional) ETH address sending funds to the ledger channel
     * @param {String} recipient - (optional) ETH address recieving funds in their ledger channel
     * @param {String} tokenAddress - (optional, for testing) contract address of channel tokens
     * @returns {Promise} resolves to the transaction hash of the onchain deposit.
     */

  }, {
    key: 'deposit',
    value: function () {
      var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(deposits) {
        var sender = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

        var _this = this;

        var recipient = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : sender;
        var tokenAddress = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
        var methodName, isValidDepositObject, isAddress, accounts, channel, contractResult, initialUntrackedDeposits, untrackedDeposits, results;
        return _regenerator2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                // validate params
                methodName = 'deposit';
                isValidDepositObject = { presence: true, isValidDepositObject: true };
                isAddress = { presence: true, isAddress: true };

                Connext.validatorsResponseToError(validate.single(deposits, isValidDepositObject), methodName, 'deposits');
                _context3.next = 6;
                return this.web3.eth.getAccounts();

              case 6:
                accounts = _context3.sent;

                if (sender) {
                  Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                } else {
                  sender = accounts[0].toLowerCase();
                }
                if (recipient) {
                  Connext.validatorsResponseToError(validate.single(recipient, isAddress), methodName, 'recipient');
                } else {
                  recipient = accounts[0].toLowerCase();
                }

                _context3.next = 11;
                return this.getChannelByPartyA(recipient);

              case 11:
                channel = _context3.sent;

                if (!(CHANNEL_STATES[channel.state] !== CHANNEL_STATES.LCS_OPENED)) {
                  _context3.next = 14;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Channel is not in the right state');

              case 14:
                if (!(channel.partyA.toLowerCase() !== recipient.toLowerCase() && channel.partyI.toLowerCase() !== recipient.toLowerCase())) {
                  _context3.next = 16;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Recipient is not member of channel');

              case 16:
                if (!(sender.toLowerCase() !== channel.partyA)) {
                  _context3.next = 18;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Cannot sign for deposit state update unless it is your channel.');

              case 18:
                _context3.next = 20;
                return this.depositContractHandler({
                  channelId: channel.channelId,
                  deposits: deposits,
                  recipient: recipient,
                  sender: sender,
                  tokenAddress: tokenAddress
                });

              case 20:
                contractResult = _context3.sent;

                if (contractResult) {
                  _context3.next = 23;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Error with on chain deposit');

              case 23:
                _context3.next = 25;
                return this.getUntrackedDeposits(channel.channelId);

              case 25:
                initialUntrackedDeposits = _context3.sent.length;
                untrackedDeposits = void 0;
                _context3.next = 29;
                return interval(function () {
                  var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(iterationNumber, stop) {
                    return _regenerator2.default.wrap(function _callee2$(_context2) {
                      while (1) {
                        switch (_context2.prev = _context2.next) {
                          case 0:
                            _context2.next = 2;
                            return _this.getUntrackedDeposits(channel.channelId);

                          case 2:
                            untrackedDeposits = _context2.sent;

                            if (untrackedDeposits !== [] && untrackedDeposits.length === initialUntrackedDeposits + 1) {
                              stop();
                            }

                          case 4:
                          case 'end':
                            return _context2.stop();
                        }
                      }
                    }, _callee2, _this);
                  }));

                  return function (_x10, _x11) {
                    return _ref4.apply(this, arguments);
                  };
                }(), 2000);

              case 29:
                _context3.next = 31;
                return this.signUntrackedDeposits({
                  untrackedDeposits: untrackedDeposits,
                  channelId: channel.channelId,
                  sender: sender
                });

              case 31:
                results = _context3.sent;

                if (!(results.length === 0)) {
                  _context3.next = 36;
                  break;
                }

                return _context3.abrupt('return', results[0]);

              case 36:
                return _context3.abrupt('return', results);

              case 37:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));

      function deposit(_x9) {
        return _ref3.apply(this, arguments);
      }

      return deposit;
    }()
  }, {
    key: 'getUntrackedDeposits',
    value: function () {
      var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(channelId) {
        var methodName, isHex, response;
        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                methodName = 'getUntrackedDeposits';
                isHex = { presence: true, isHex: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHex), methodName, 'channelId');
                _context4.next = 5;
                return this.networking.get('ledgerchannel/' + channelId + '/untrackeddeposits');

              case 5:
                response = _context4.sent;
                return _context4.abrupt('return', response.data);

              case 7:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function getUntrackedDeposits(_x12) {
        return _ref5.apply(this, arguments);
      }

      return getUntrackedDeposits;
    }()
  }, {
    key: 'signUntrackedDeposits',
    value: function () {
      var _ref7 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5(_ref6) {
        var untrackedDeposits = _ref6.untrackedDeposits,
            channelId = _ref6.channelId,
            _ref6$sender = _ref6.sender,
            sender = _ref6$sender === undefined ? null : _ref6$sender;

        var methodName, isHex, isAddress, accounts, channel, depositedWithoutUpdates, channelEthBalance, channelTokenBalance, nonce, signedDeposits, totalTokenDeposit, totalEthDeposit, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, untrackedDeposit, amountDeposited, sig, obj, results, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, signedDeposit, result;

        return _regenerator2.default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                methodName = 'signUntrackedDeposits';
                isHex = { presence: true, isHex: true };
                isAddress = { presence: true, isAddress: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHex), methodName, 'channelId');
                // add deposit object validation

                if (!sender) {
                  _context5.next = 8;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context5.next = 12;
                break;

              case 8:
                _context5.next = 10;
                return this.web3.eth.getAccounts();

              case 10:
                accounts = _context5.sent;

                sender = accounts[0];

              case 12:
                _context5.next = 14;
                return this.getChannelById(channelId);

              case 14:
                channel = _context5.sent;
                depositedWithoutUpdates = channel.nonce === 0;
                channelEthBalance = Web3.utils.toBN(channel.ethBalanceA);
                channelTokenBalance = Web3.utils.toBN(channel.tokenBalanceA);
                nonce = channel.nonce;
                signedDeposits = [];
                totalTokenDeposit = Web3.utils.toBN('0');
                totalEthDeposit = Web3.utils.toBN('0');
                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context5.prev = 25;
                _iterator = untrackedDeposits[Symbol.iterator]();

              case 27:
                if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                  _context5.next = 48;
                  break;
                }

                untrackedDeposit = _step.value;
                amountDeposited = Web3.utils.toBN(untrackedDeposit.deposit);

                if (!(untrackedDeposit.recipient === channel.partyI)) {
                  _context5.next = 32;
                  break;
                }

                return _context5.abrupt('continue', 45);

              case 32:
                sig = '';

                if (!(untrackedDeposit.recipient === channel.partyA)) {
                  _context5.next = 42;
                  break;
                }

                nonce = nonce + 1;
                untrackedDeposit.isToken ? depositedWithoutUpdates ? totalTokenDeposit = totalTokenDeposit : totalTokenDeposit = totalTokenDeposit.add(amountDeposited) : depositedWithoutUpdates ? totalEthDeposit = totalEthDeposit : totalEthDeposit = totalEthDeposit.add(amountDeposited);

                untrackedDeposit.isToken ? depositedWithoutUpdates ? channelTokenBalance = channelTokenBalance : channelTokenBalance = channelTokenBalance.add(amountDeposited) : depositedWithoutUpdates ? channelEthBalance = channelEthBalance : channelEthBalance = channelEthBalance.add(amountDeposited);
                _context5.next = 39;
                return this.createChannelStateUpdate({
                  channelId: channel.channelId,
                  nonce: nonce,
                  openVcs: channel.openVcs,
                  vcRootHash: channel.vcRootHash,
                  partyA: channel.partyA,
                  partyI: channel.partyI,
                  balanceA: {
                    ethDeposit: channelEthBalance,
                    tokenDeposit: channelTokenBalance
                  },
                  balanceI: {
                    ethDeposit: Web3.utils.toBN(channel.ethBalanceI),
                    tokenDeposit: Web3.utils.toBN(channel.tokenBalanceI)
                  },
                  deposit: {
                    tokenDeposit: totalTokenDeposit,
                    ethDeposit: totalEthDeposit
                  },
                  signer: sender
                });

              case 39:
                sig = _context5.sent;
                _context5.next = 43;
                break;

              case 42:
                throw new ChannelUpdateError(methodName, 'Deposit recipient is not channel member.');

              case 43:
                obj = {
                  sig: sig,
                  depositId: untrackedDeposit.depositId,
                  isToken: untrackedDeposit.isToken,
                  deposit: untrackedDeposit.deposit
                };

                signedDeposits.push(obj);

              case 45:
                _iteratorNormalCompletion = true;
                _context5.next = 27;
                break;

              case 48:
                _context5.next = 54;
                break;

              case 50:
                _context5.prev = 50;
                _context5.t0 = _context5['catch'](25);
                _didIteratorError = true;
                _iteratorError = _context5.t0;

              case 54:
                _context5.prev = 54;
                _context5.prev = 55;

                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }

              case 57:
                _context5.prev = 57;

                if (!_didIteratorError) {
                  _context5.next = 60;
                  break;
                }

                throw _iteratorError;

              case 60:
                return _context5.finish(57);

              case 61:
                return _context5.finish(54);

              case 62:

                signedDeposits = signedDeposits.filter(function (d) {
                  return d.sig !== '';
                });

                // post to hub
                results = [];
                _iteratorNormalCompletion2 = true;
                _didIteratorError2 = false;
                _iteratorError2 = undefined;
                _context5.prev = 67;
                _iterator2 = signedDeposits[Symbol.iterator]();

              case 69:
                if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
                  _context5.next = 88;
                  break;
                }

                signedDeposit = _step2.value;

                console.log('Posting signed ' + (signedDeposit.isToken ? 'ERC20' : 'ETH') + ' deposit of ' + signedDeposit.deposit + ' to hub');
                result = void 0;
                _context5.prev = 73;
                _context5.next = 76;
                return this.networking.post('ledgerchannel/' + channel.channelId + '/deposit', signedDeposit);

              case 76:
                result = _context5.sent.data;

                console.log('Successfully posted.');
                _context5.next = 84;
                break;

              case 80:
                _context5.prev = 80;
                _context5.t1 = _context5['catch'](73);

                console.log('Error posting update.');
                result = _context5.t1.message;

              case 84:
                results.push(result);

              case 85:
                _iteratorNormalCompletion2 = true;
                _context5.next = 69;
                break;

              case 88:
                _context5.next = 94;
                break;

              case 90:
                _context5.prev = 90;
                _context5.t2 = _context5['catch'](67);
                _didIteratorError2 = true;
                _iteratorError2 = _context5.t2;

              case 94:
                _context5.prev = 94;
                _context5.prev = 95;

                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                  _iterator2.return();
                }

              case 97:
                _context5.prev = 97;

                if (!_didIteratorError2) {
                  _context5.next = 100;
                  break;
                }

                throw _iteratorError2;

              case 100:
                return _context5.finish(97);

              case 101:
                return _context5.finish(94);

              case 102:
                return _context5.abrupt('return', results);

              case 103:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, this, [[25, 50, 54, 62], [55,, 57, 61], [67, 90, 94, 102], [73, 80], [95,, 97, 101]]);
      }));

      function signUntrackedDeposits(_x13) {
        return _ref7.apply(this, arguments);
      }

      return signUntrackedDeposits;
    }()

    /**
     * Opens a virtual channel between "to" and sender with Ingrid as the hub. Both users must have a ledger channel open with ingrid.
     *
     * If there is no deposit provided, then 100% of the ledger channel balance is added to virtual channel deposit. This function is to be called by the "A" party in a unidirectional scheme.
     *
     * Signs a copy of the initial virtual channel state, and generates a proposed ledger channel update to the hub for countersigning that updates the number of open virtual channels and the root hash of the ledger channel state.
     *
     * This proposed state update serves as the opening certificate for the virtual channel, and is used to verify Ingrid agreed to facilitate the creation of the virtual channel and take on the counterparty risk.
     *
     *
     * @example
     * const myFriendsAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57"
     * await connext.openThread({ to: myFriendsAddress })
     *
     * @param {Object} params - the method object
     * @param {String} params.to - ETH address you want to open a virtual channel with
     * @param {BN} params.deposit - (optional) deposit in wei for the virtual channel, defaults to the entire LC balance
     * @param {String} params.sender - (optional) who is initiating the virtual channel creation, defaults to accounts[0]
     * @returns {Promise} resolves to the virtual channel ID recieved by Ingrid
     */

  }, {
    key: 'openThread',
    value: function () {
      var _ref9 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6(_ref8) {
        var to = _ref8.to,
            _ref8$deposit = _ref8.deposit,
            deposit = _ref8$deposit === undefined ? null : _ref8$deposit,
            _ref8$sender = _ref8.sender,
            sender = _ref8$sender === undefined ? null : _ref8$sender;
        var methodName, isAddress, isValidDepositObject, accounts, subchanA, subchanB, channel, updateType, channelId, threadInitialState, sigVC0, sigAtoI, response;
        return _regenerator2.default.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                // validate params
                methodName = 'openThread';
                isAddress = { presence: true, isAddress: true };
                isValidDepositObject = { presence: true, isValidDepositObject: true };

                Connext.validatorsResponseToError(validate.single(to, isAddress), methodName, 'to');
                if (deposit) {
                  Connext.validatorsResponseToError(validate.single(deposit, isValidDepositObject), methodName, 'deposit');
                }

                if (!sender) {
                  _context6.next = 9;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context6.next = 13;
                break;

              case 9:
                _context6.next = 11;
                return this.web3.eth.getAccounts();

              case 11:
                accounts = _context6.sent;

                sender = accounts[0].toLowerCase();

              case 13:
                if (!(sender.toLowerCase() === to.toLowerCase())) {
                  _context6.next = 15;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Cannot open a channel with yourself');

              case 15:
                _context6.next = 17;
                return this.getChannelByPartyA(sender);

              case 17:
                subchanA = _context6.sent;
                _context6.next = 20;
                return this.getChannelByPartyA(to);

              case 20:
                subchanB = _context6.sent;

                if (!(!subchanB || !subchanA)) {
                  _context6.next = 23;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Missing one or more required subchannels');

              case 23:
                if (!(CHANNEL_STATES[subchanB.state] !== 1 || CHANNEL_STATES[subchanA.state] !== 1)) {
                  _context6.next = 25;
                  break;
                }

                throw new ThreadOpenError(methodName, 'One or more required subchannels are in the incorrect state');

              case 25:

                // validate lcA has enough to deposit or set deposit
                if (deposit === null) {
                  // use entire subchanA balance
                  deposit = {
                    tokenDeposit: Web3.utils.toBN(subchanA.tokenBalanceA),
                    ethDeposit: Web3.utils.toBN(subchanA.ethBalanceA)
                  };
                }

                if (!(deposit.tokenDeposit && Web3.utils.toBN(subchanA.tokenBalanceA).lt(deposit.tokenDeposit))) {
                  _context6.next = 28;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Insufficient value to open channel with provided token deposit');

              case 28:
                if (!(deposit.ethDeposit && Web3.utils.toBN(subchanA.ethBalanceA).lt(deposit.ethDeposit))) {
                  _context6.next = 30;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Insufficient value to open channel with provided ETH deposit');

              case 30:
                _context6.next = 32;
                return this.getThreadByParties({ partyA: sender, partyB: to });

              case 32:
                channel = _context6.sent;

                if (!channel) {
                  _context6.next = 35;
                  break;
                }

                throw new ThreadOpenError(methodName, 451, 'Parties already have open virtual channel: ' + channel.channelId);

              case 35:

                // detemine update type
                updateType = void 0;

                if (!(deposit.ethDeposit && deposit.tokenDeposit)) {
                  _context6.next = 40;
                  break;
                }

                // token and eth
                updateType = Object.keys(CHANNEL_TYPES)[2];
                _context6.next = 49;
                break;

              case 40:
                if (!deposit.tokenDeposit) {
                  _context6.next = 44;
                  break;
                }

                updateType = Object.keys(CHANNEL_TYPES)[1];
                _context6.next = 49;
                break;

              case 44:
                if (!deposit.ethDeposit) {
                  _context6.next = 48;
                  break;
                }

                updateType = Object.keys(CHANNEL_TYPES)[0];
                _context6.next = 49;
                break;

              case 48:
                throw new ThreadOpenError(methodName, 'Error determining channel deposit types.');

              case 49:

                // generate initial vcstate
                channelId = Connext.getNewChannelId();
                threadInitialState = {
                  channelId: channelId,
                  nonce: 0,
                  partyA: sender,
                  partyB: to.toLowerCase(),
                  balanceA: deposit,
                  balanceB: {
                    tokenDeposit: Web3.utils.toBN('0'),
                    ethDeposit: Web3.utils.toBN('0')
                  },
                  updateType: updateType,
                  signer: sender
                };
                _context6.next = 53;
                return this.createThreadStateUpdate(threadInitialState);

              case 53:
                sigVC0 = _context6.sent;
                _context6.next = 56;
                return this.createChannelUpdateOnThreadOpen({
                  threadInitialState: threadInitialState,
                  channel: subchanA,
                  signer: sender
                });

              case 56:
                sigAtoI = _context6.sent;


                // ingrid should add vc params to db
                response = void 0;
                _context6.prev = 58;
                _context6.next = 61;
                return this.networking.post('virtualchannel/', {
                  channelId: channelId,
                  partyA: sender.toLowerCase(),
                  partyB: to.toLowerCase(),
                  ethBalance: deposit.ethDeposit ? deposit.ethDeposit.toString() : '0',
                  tokenBalance: deposit.tokenDeposit ? deposit.tokenDeposit.toString() : '0',
                  vcSig: sigVC0,
                  lcSig: sigAtoI
                });

              case 61:
                response = _context6.sent;
                _context6.next = 67;
                break;

              case 64:
                _context6.prev = 64;
                _context6.t0 = _context6['catch'](58);
                throw new ThreadOpenError(methodName, _context6.t0.message);

              case 67:
                return _context6.abrupt('return', response.data.channelId);

              case 68:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, this, [[58, 64]]);
      }));

      function openThread(_x14) {
        return _ref9.apply(this, arguments);
      }

      return openThread;
    }()

    /**
     * Joins virtual channel with provided channelId with a deposit of 0 (unidirectional channels).
     *
     * This function is to be called by the "B" party in a unidirectional scheme.
     *
     * @example
     * const channelId = 10 // pushed to partyB from Ingrid
     * await connext.joinThread(channelId)
     * @param {String} channelId - ID of the virtual channel
     * @param {String} sender - (optional) ETH address of the person joining the virtual channel (partyB)
     * @returns {Promise} resolves to the virtual channel ID
     */

  }, {
    key: 'joinThread',
    value: function () {
      var _ref10 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee7(threadId) {
        var sender = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var methodName, isHexStrict, isAddress, thread, accounts, subchanA, subchanB, thread0, threadSig, subchanSig, result;
        return _regenerator2.default.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                // validate params
                methodName = 'joinThread';
                isHexStrict = { presence: true, isHexStrict: true };
                isAddress = { presence: true, isAddress: true };

                Connext.threadId(validate.single(channelId, isHexStrict), methodName, 'threadId');
                _context7.next = 6;
                return this.getThreadById(threadId);

              case 6:
                thread = _context7.sent;

                if (!(thread === null)) {
                  _context7.next = 9;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Channel not found');

              case 9:
                _context7.next = 11;
                return this.web3.eth.getAccounts();

              case 11:
                accounts = _context7.sent;

                if (sender) {
                  Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                } else {
                  sender = accounts[0];
                }

                if (!(sender.toLowerCase() !== thread.partyB)) {
                  _context7.next = 15;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Incorrect channel counterparty');

              case 15:
                _context7.next = 17;
                return this.getChannelByPartyA(thread.partyA);

              case 17:
                subchanA = _context7.sent;
                _context7.next = 20;
                return this.getChannelByPartyA(sender);

              case 20:
                subchanB = _context7.sent;

                if (!(subchanB === null || subchanA === null)) {
                  _context7.next = 23;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Missing one or more required subchannels');

              case 23:
                if (!(CHANNEL_STATES[subchanB.state] !== CHANNEL_STATES.LCS_OPENED || CHANNEL_STATES[subchanA.state] !== CHANNEL_STATES.LCS_OPENED)) {
                  _context7.next = 25;
                  break;
                }

                throw new ThreadOpenError(methodName, 'One or more required subchannels are in the incorrect state');

              case 25:
                thread0 = {
                  channelId: channelId,
                  nonce: 0,
                  partyA: thread.partyA, // depending on ingrid for this value
                  partyB: sender,
                  ethBalanceA: Web3.utils.toBN(thread.ethBalanceA), // depending on ingrid for this value
                  ethBalanceB: Web3.utils.toBN(0),
                  tokenBalanceA: Web3.utils.toBN(thread.tokenBalanceA),
                  tokenBalanceB: Web3.utils.toBN(0),
                  signer: sender
                };
                _context7.next = 28;
                return this.createThreadStateUpdate(thread0);

              case 28:
                threadSig = _context7.sent;
                _context7.next = 31;
                return this.createChannelUpdateOnThreadOpen({
                  threadInitialState: thread0,
                  channel: subchanB,
                  signer: sender
                });

              case 31:
                subchanSig = _context7.sent;
                _context7.next = 34;
                return this.joinThreadHandler({
                  threadSig: threadSig,
                  subchanSig: subchanSig,
                  channelId: channelId
                });

              case 34:
                result = _context7.sent;
                return _context7.abrupt('return', result);

              case 36:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));

      function joinThread(_x16) {
        return _ref10.apply(this, arguments);
      }

      return joinThread;
    }()

    /**
     * Send multiple balance updates simultaneously from a single account.
     * 
     * @param {Object[]} payments - payments object
     * @param {String} sender - (optional) defaults to accounts[0]
     */

  }, {
    key: 'updateBalances',
    value: function () {
      var _ref11 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee9(payments) {
        var _this2 = this;

        var sender = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var methodName, isAddress, isArray, accounts, updatedPayments, response;
        return _regenerator2.default.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                methodName = 'updateBalances';
                isAddress = { presence: true, isAddress: true };
                isArray = { presence: true, isArray: true };

                Connext.validatorsResponseToError(validate.single(payments, isArray), methodName, 'payments');

                if (sender) {
                  _context9.next = 9;
                  break;
                }

                _context9.next = 7;
                return this.web3.eth.getAccounts();

              case 7:
                accounts = _context9.sent;

                sender = accounts[0];

              case 9:
                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context9.next = 12;
                return Promise.all(payments.map(function () {
                  var _ref12 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee8(payment, idx) {
                    var updatedPayment;
                    return _regenerator2.default.wrap(function _callee8$(_context8) {
                      while (1) {
                        switch (_context8.prev = _context8.next) {
                          case 0:
                            // generate payment
                            updatedPayment = void 0;
                            _context8.t0 = PAYMENT_TYPES[payment.type];
                            _context8.next = _context8.t0 === PAYMENT_TYPES.LEDGER ? 4 : _context8.t0 === PAYMENT_TYPES.VIRTUAL ? 8 : 12;
                            break;

                          case 4:
                            _context8.next = 6;
                            return _this2.channelUpdateHandler(payment, sender, idx);

                          case 6:
                            updatedPayment = _context8.sent;
                            return _context8.abrupt('break', 13);

                          case 8:
                            _context8.next = 10;
                            return _this2.threadUpdateHandler(payment, sender, idx);

                          case 10:
                            updatedPayment = _context8.sent;
                            return _context8.abrupt('break', 13);

                          case 12:
                            throw new ChannelUpdateError(methodName, 'Incorrect channel type specified. Must be CHANNEL, THREAD, or EXCHANGE. Type: ' + payment.type);

                          case 13:
                            updatedPayment.type = payment.type;
                            return _context8.abrupt('return', updatedPayment);

                          case 15:
                          case 'end':
                            return _context8.stop();
                        }
                      }
                    }, _callee8, _this2);
                  }));

                  return function (_x19, _x20) {
                    return _ref12.apply(this, arguments);
                  };
                }()));

              case 12:
                updatedPayments = _context9.sent;
                _context9.next = 15;
                return this.networking.post('payments/', {
                  payments: updatedPayments
                });

              case 15:
                response = _context9.sent;
                return _context9.abrupt('return', response.data);

              case 17:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, this);
      }));

      function updateBalances(_x18) {
        return _ref11.apply(this, arguments);
      }

      return updateBalances;
    }()
  }, {
    key: 'channelUpdateHandler',
    value: function () {
      var _ref14 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee10(_ref13) {
        var payment = _ref13.payment,
            meta = _ref13.meta;
        var sender = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var nonceOffset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var methodName, isAddress, isHexStrict, isValidDepositObject, isValidMeta, isObj, accounts, balanceA, balanceB, channelId, channel, proposedEthBalance, proposedTokenBalance, sig, state;
        return _regenerator2.default.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                methodName = 'channelUpdateHandler';
                isAddress = { presence: true, isAddress: true };
                isHexStrict = { presence: true, isHexStrict: true };
                isValidDepositObject = { presence: true, isValidDepositObject: true };
                isValidMeta = { presence: true, isValidMeta: true };
                isObj = { presence: true, isObj: true };

                if (sender) {
                  _context10.next = 11;
                  break;
                }

                _context10.next = 9;
                return this.web3.eth.getAccounts();

              case 9:
                accounts = _context10.sent;

                sender = accounts[0];

              case 11:
                Connext.validatorsResponseToError(validate.single(payment, isObj), methodName, 'payment');
                balanceA = payment.balanceA, balanceB = payment.balanceB, channelId = payment.channelId;
                // validate inputs

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                Connext.validatorsResponseToError(validate.single(balanceA, isValidDepositObject), methodName, 'balanceA');
                Connext.validatorsResponseToError(validate.single(balanceB, isValidDepositObject), methodName, 'balanceB');
                // validate meta
                Connext.validatorsResponseToError(validate.single(meta, isValidMeta), methodName, 'meta');
                _context10.next = 20;
                return this.getChannelById(channelId);

              case 20:
                channel = _context10.sent;

                if (channel) {
                  _context10.next = 23;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Channel not found');

              case 23:
                if (!(CHANNEL_STATES[channel.state] !== 1 && CHANNEL_STATES[channel.state] !== 2)) {
                  _context10.next = 25;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Channel is in invalid state');

              case 25:
                if (!(channel.partyA.toLowerCase() !== sender.toLowerCase() && channel.partyI.toLowerCase() !== sender.toLowerCase())) {
                  _context10.next = 27;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Not your channel');

              case 27:
                proposedEthBalance = balanceA.ethDeposit && balanceB.ethDeposit && Web3.utils.toBN(balanceA.ethDeposit).add(balanceB.ethDeposit);
                proposedTokenBalance = balanceA.tokenDeposit && balanceB.tokenDeposit && Web3.utils.toBN(balanceA.tokenDeposit).add(balanceB.tokenDeposit);

                // generate signature

                _context10.next = 31;
                return this.createChannelStateUpdate({
                  channelId: channelId,
                  nonce: channel.nonce + 1 + (nonceOffset || 0),
                  openVcs: channel.openVcs,
                  vcRootHash: channel.vcRootHash,
                  partyA: channel.partyA,
                  partyI: channel.partyI,
                  balanceA: balanceA,
                  balanceI: balanceB,
                  signer: sender
                });

              case 31:
                sig = _context10.sent;

                // return sig
                state = {
                  ethBalanceA: proposedEthBalance ? balanceA.ethDeposit.toString() : Web3.utils.toBN(channel.ethBalanceA).toString(),
                  ethBalanceB: proposedEthBalance ? balanceB.ethDeposit.toString() : Web3.utils.toBN(channel.ethBalanceI).toString(),
                  tokenBalanceA: proposedTokenBalance ? balanceA.tokenDeposit.toString() : Web3.utils.toBN(channel.tokenBalanceA).toString(),
                  tokenBalanceB: proposedTokenBalance ? balanceB.tokenDeposit.toString() : Web3.utils.toBN(channel.tokenBalanceI).toString(),
                  channelId: channelId,
                  nonce: channel.nonce + 1 + (nonceOffset || 0),
                  sig: sig
                };
                return _context10.abrupt('return', { payment: state, meta: meta });

              case 34:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, this);
      }));

      function channelUpdateHandler(_x23) {
        return _ref14.apply(this, arguments);
      }

      return channelUpdateHandler;
    }()

    // handle thread state updates from updateBalances
    // payment object contains fields balanceA and balanceB

  }, {
    key: 'threadUpdateHandler',
    value: function () {
      var _ref16 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee11(_ref15) {
        var payment = _ref15.payment,
            meta = _ref15.meta;
        var sender = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var nonceOffset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
        var methodName, isHexStrict, isValidDepositObject, isValidMeta, isObj, isAddress, accounts, channelId, balanceA, balanceB, thread, updateType, threadEthBalance, threadTokenBalance, proposedEthBalance, proposedTokenBalance, sig, state;
        return _regenerator2.default.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                // validate params
                methodName = 'threadUpdateHandler';
                isHexStrict = { presence: true, isHexStrict: true };
                isValidDepositObject = { presence: true, isValidDepositObject: true };
                isValidMeta = { presence: true, isValidMeta: true };
                isObj = { presence: true, isObj: true };
                isAddress = { presence: true, isAddress: true };

                if (sender) {
                  _context11.next = 11;
                  break;
                }

                _context11.next = 9;
                return this.web3.eth.getAccounts();

              case 9:
                accounts = _context11.sent;

                sender = accounts[0];

              case 11:
                Connext.validatorsResponseToError(validate.single(payment, isObj), methodName, 'payment');
                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                channelId = payment.channelId, balanceA = payment.balanceA, balanceB = payment.balanceB;

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                Connext.validatorsResponseToError(validate.single(balanceA, isValidDepositObject), methodName, 'balanceA');
                Connext.validatorsResponseToError(validate.single(balanceB, isValidDepositObject), methodName, 'balanceB');
                // validate meta
                Connext.validatorsResponseToError(validate.single(meta, isValidMeta), methodName, 'meta');
                // get the vc
                _context11.next = 20;
                return this.getThreadById(channelId);

              case 20:
                thread = _context11.sent;

                if (thread) {
                  _context11.next = 23;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread not found');

              case 23:
                if (!(THREAD_STATES[thread.state] === 3)) {
                  _context11.next = 25;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread is in invalid state');

              case 25:
                if (!(sender.toLowerCase() !== thread.partyA.toLowerCase())) {
                  _context11.next = 27;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread updates can only be made by partyA.');

              case 27:

                // check what type of update
                updateType = void 0;

                if (balanceA.ethDeposit && balanceA.tokenDeposit && balanceB.ethDeposit && balanceB.tokenDeposit) {
                  // token and eth
                  updateType = Object.keys(CHANNEL_TYPES)[2];
                } else if (balanceA.tokenDeposit && balanceB.tokenDeposit) {
                  updateType = Object.keys(CHANNEL_TYPES)[1];
                } else if (balanceA.ethDeposit && balanceB.ethDeposit) {
                  updateType = Object.keys(CHANNEL_TYPES)[0];
                }

                threadEthBalance = Web3.utils.toBN(thread.ethBalanceA).add(Web3.utils.toBN(thread.ethBalanceB));
                threadTokenBalance = Web3.utils.toBN(thread.tokenBalanceA).add(Web3.utils.toBN(thread.tokenBalanceB));
                proposedEthBalance = void 0, proposedTokenBalance = void 0;
                _context11.t0 = CHANNEL_TYPES[updateType];
                _context11.next = _context11.t0 === CHANNEL_TYPES.ETH ? 35 : _context11.t0 === CHANNEL_TYPES.TOKEN ? 39 : _context11.t0 === CHANNEL_TYPES.TOKEN_ETH ? 43 : 50;
                break;

              case 35:
                if (!balanceB.ethDeposit.lte(Web3.utils.toBN(thread.ethBalanceB))) {
                  _context11.next = 37;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread updates can only increase partyB ETH balance');

              case 37:
                proposedEthBalance = Web3.utils.toBN(balanceA.ethDeposit).add(balanceB.ethDeposit); // proposed balance
                return _context11.abrupt('break', 51);

              case 39:
                if (!balanceB.tokenDeposit.lte(Web3.utils.toBN(thread.tokenBalanceB))) {
                  _context11.next = 41;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread updates can only increase partyB token balance');

              case 41:
                proposedTokenBalance = Web3.utils.toBN(balanceA.tokenDeposit).add(balanceB.tokenDeposit);
                return _context11.abrupt('break', 51);

              case 43:
                if (!balanceB.ethDeposit.lte(Web3.utils.toBN(thread.ethBalanceB))) {
                  _context11.next = 45;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread updates can only increase partyB ETH balance');

              case 45:
                if (!balanceB.tokenDeposit.lte(Web3.utils.toBN(thread.tokenBalanceB))) {
                  _context11.next = 47;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread updates can only increase partyB token balance');

              case 47:
                proposedEthBalance = Web3.utils.toBN(balanceA.ethDeposit).add(balanceB.ethDeposit);
                proposedTokenBalance = Web3.utils.toBN(balanceA.tokenDeposit).add(balanceB.tokenDeposit);
                return _context11.abrupt('break', 51);

              case 50:
                throw new ThreadUpdateError(methodName, 'Error determining thread deposit types.');

              case 51:
                if (!(proposedEthBalance && !proposedEthBalance.eq(threadEthBalance))) {
                  _context11.next = 53;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread ETH balance cannot change');

              case 53:
                if (!(proposedTokenBalance && !proposedTokenBalance.eq(threadTokenBalance))) {
                  _context11.next = 55;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread token balance cannot change');

              case 55:
                _context11.next = 57;
                return this.createThreadStateUpdate({
                  channelId: channelId,
                  nonce: thread.nonce + 1 + (nonceOffset || 0),
                  partyA: thread.partyA,
                  partyB: thread.partyB,
                  balanceA: balanceA,
                  balanceB: balanceB,
                  updateType: updateType,
                  signer: sender
                });

              case 57:
                sig = _context11.sent;

                // return sig
                state = {
                  // balanceA: proposedEthBalance ? balanceA.ethDeposit.toString() : Web3.utils.toBN(thread.ethBalanceA).toString(),
                  // balanceB: proposedEthBalance ? balanceB.ethDeposit.toString() : Web3.utils.toBN(thread.ethBalanceB).toString(),
                  ethBalanceA: proposedEthBalance ? balanceA.ethDeposit.toString() : Web3.utils.toBN(thread.ethBalanceA).toString(),
                  ethBalanceB: proposedEthBalance ? balanceB.ethDeposit.toString() : Web3.utils.toBN(thread.ethBalanceB).toString(),
                  tokenBalanceA: proposedTokenBalance ? balanceA.tokenDeposit.toString() : Web3.utils.toBN(thread.tokenBalanceA).toString(),
                  tokenBalanceB: proposedTokenBalance ? balanceB.tokenDeposit.toString() : Web3.utils.toBN(thread.tokenBalanceB).toString(),
                  // channelId,
                  channelId: channelId,
                  nonce: thread.nonce + 1 + (nonceOffset || 0),
                  sig: sig
                };
                return _context11.abrupt('return', { payment: state, meta: meta });

              case 60:
              case 'end':
                return _context11.stop();
            }
          }
        }, _callee11, this);
      }));

      function threadUpdateHandler(_x26) {
        return _ref16.apply(this, arguments);
      }

      return threadUpdateHandler;
    }()

    /**
     * Closes a virtual channel.
     *
     * Retrieves the latest virtual state update, and decomposes the virtual channel into their respective ledger channel updates.
     *
     * The virtual channel agent who called this function signs the closing ledger-channel update, and forwards the signature to Ingrid.
     *
     * Ingrid verifies the signature, returns her signature of the proposed virtual channel decomposition, and proposes the LC update for the other virtual channel participant.
     *
     * If Ingrid does not return her signature on the proposed virtual channel decomposition, the caller goes to chain by calling initVC and settleVC.
     *
     * @example
     * await connext.closeThread({
     *   channelId: 0xadsf11..,
     *   balance: web3.utils.toBN(web3.utils.toWei(0.5, 'ether'))
     * })
     * @param {Number} channelId - ID of the virtual channel to close
     * @returns {Promise} resolves to the signature of the hub on the generated update if accepted, or the result of closing the channel on chain if there is a dispute
     */

  }, {
    key: 'closeThread',
    value: function () {
      var _ref17 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee12(threadId) {
        var sender = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var methodName, isHexStrict, isAddress, accounts, thread, latestThreadState, signer, subchan, updateAtoI, sigAtoI, fastCloseSig;
        return _regenerator2.default.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                // validate params
                methodName = 'closeThread';
                isHexStrict = { presence: true, isHexStrict: true };
                isAddress = { presence: true, isAddress: true };

                Connext.validatorsResponseToError(validate.single(threadId, isHexStrict), methodName, 'threadId');

                if (!sender) {
                  _context12.next = 8;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context12.next = 12;
                break;

              case 8:
                _context12.next = 10;
                return this.web3.eth.getAccounts();

              case 10:
                accounts = _context12.sent;

                sender = accounts[0].toLowerCase();

              case 12:
                _context12.next = 14;
                return this.getThreadById(threadId);

              case 14:
                thread = _context12.sent;

                if (thread) {
                  _context12.next = 17;
                  break;
                }

                throw new ThreadCloseError(methodName, 'Thread not found');

              case 17:
                if (!(THREAD_STATES[thread.state] !== THREAD_STATES.VCS_OPENING && THREAD_STATES[thread.state] !== THREAD_STATES.VCS_OPENED)) {
                  _context12.next = 19;
                  break;
                }

                throw new ThreadCloseError(methodName, 'Thread is in invalid state');

              case 19:
                _context12.next = 21;
                return this.getLatestThreadState(threadId);

              case 21:
                latestThreadState = _context12.sent;

                // verify latestThreadState was signed by agentA
                signer = Connext.recoverSignerFromThreadStateUpdate({
                  sig: latestThreadState.sigA,
                  channelId: threadId,
                  nonce: latestThreadState.nonce,
                  partyA: thread.partyA,
                  partyB: thread.partyB,
                  ethBalanceA: Web3.utils.toBN(latestThreadState.ethBalanceA),
                  ethBalanceB: Web3.utils.toBN(latestThreadState.ethBalanceB),
                  tokenBalanceA: Web3.utils.toBN(latestThreadState.tokenBalanceA),
                  tokenBalanceB: Web3.utils.toBN(latestThreadState.tokenBalanceB)
                });

                if (!(signer.toLowerCase() !== thread.partyA.toLowerCase())) {
                  _context12.next = 25;
                  break;
                }

                throw new ThreadCloseError(methodName, 'Incorrect signer detected on latest thread update');

              case 25:

                latestThreadState.channelId = threadId;
                latestThreadState.partyA = thread.partyA;
                latestThreadState.partyB = thread.partyB;
                // get partyA ledger channel
                _context12.next = 30;
                return this.getChannelByPartyA(sender);

              case 30:
                subchan = _context12.sent;
                _context12.next = 33;
                return this.createChannelStateOnThreadClose({ latestThreadState: latestThreadState, subchan: subchan, signer: sender.toLowerCase() });

              case 33:
                updateAtoI = _context12.sent;
                _context12.next = 36;
                return this.createChannelStateUpdate(updateAtoI);

              case 36:
                sigAtoI = _context12.sent;
                _context12.next = 39;
                return this.fastCloseThreadHandler({
                  sig: sigAtoI,
                  signer: sender.toLowerCase(),
                  channelId: threadId
                });

              case 39:
                fastCloseSig = _context12.sent;

                if (fastCloseSig) {
                  _context12.next = 42;
                  break;
                }

                throw new ThreadCloseError(methodName, 651, 'Hub did not cosign proposed channel update, call initThread and settleThread');

              case 42:
                return _context12.abrupt('return', fastCloseSig);

              case 43:
              case 'end':
                return _context12.stop();
            }
          }
        }, _callee12, this);
      }));

      function closeThread(_x28) {
        return _ref17.apply(this, arguments);
      }

      return closeThread;
    }()

    /**
     * Closes many virtual channels by calling closeThread on each channel ID in the provided array.
     *
     * @example
     * const channels = [
     *     0xasd310..,
     *     0xadsf11..,
     * ]
     * await connext.closeThreads(channels)
     * @param {String[]} channelIds - array of virtual channel IDs you wish to close
     */

  }, {
    key: 'closeThreads',
    value: function () {
      var _ref18 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee13(channelIds) {
        var _this3 = this;

        var sender = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

        var methodName, isArray, isAddress, accounts, fnMap, results, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, _ref19, _ref20, parameters, fn, result;

        return _regenerator2.default.wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                methodName = 'closeThreads';
                isArray = { presence: true, isArray: true };
                isAddress = { presence: true, isAddress: true };

                Connext.validatorsResponseToError(validate.single(channelIds, isArray), methodName, 'channels');

                if (sender) {
                  _context13.next = 9;
                  break;
                }

                _context13.next = 7;
                return this.web3.eth.getAccounts();

              case 7:
                accounts = _context13.sent;

                sender = accounts[0];

              case 9:
                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                // should this try to fast close any of the channels?
                // or just immediately force close in dispute many channels
                fnMap = new Map();

                channelIds.map(function (channelId) {
                  return fnMap.set([channelId, sender], _this3.closeThread);
                });
                results = [];
                _iteratorNormalCompletion3 = true;
                _didIteratorError3 = false;
                _iteratorError3 = undefined;
                _context13.prev = 16;
                _iterator3 = fnMap.entries()[Symbol.iterator]();

              case 18:
                if (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done) {
                  _context13.next = 39;
                  break;
                }

                _ref19 = _step3.value;
                _ref20 = (0, _slicedToArray3.default)(_ref19, 2);
                parameters = _ref20[0];
                fn = _ref20[1];
                _context13.prev = 23;

                console.log('Closing channel: ' + parameters[0] + '...');
                _context13.next = 27;
                return fn.apply(this, parameters);

              case 27:
                result = _context13.sent;

                results.push(result);
                console.log('Channel closed.');
                _context13.next = 36;
                break;

              case 32:
                _context13.prev = 32;
                _context13.t0 = _context13['catch'](23);

                console.log('Error closing channel.');
                results.push(new ThreadCloseError(methodName, _context13.t0.message));

              case 36:
                _iteratorNormalCompletion3 = true;
                _context13.next = 18;
                break;

              case 39:
                _context13.next = 45;
                break;

              case 41:
                _context13.prev = 41;
                _context13.t1 = _context13['catch'](16);
                _didIteratorError3 = true;
                _iteratorError3 = _context13.t1;

              case 45:
                _context13.prev = 45;
                _context13.prev = 46;

                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                  _iterator3.return();
                }

              case 48:
                _context13.prev = 48;

                if (!_didIteratorError3) {
                  _context13.next = 51;
                  break;
                }

                throw _iteratorError3;

              case 51:
                return _context13.finish(48);

              case 52:
                return _context13.finish(45);

              case 53:
                return _context13.abrupt('return', results);

              case 54:
              case 'end':
                return _context13.stop();
            }
          }
        }, _callee13, this, [[16, 41, 45, 53], [23, 32], [46,, 48, 52]]);
      }));

      function closeThreads(_x30) {
        return _ref18.apply(this, arguments);
      }

      return closeThreads;
    }()

    /**
     * Withdraws bonded funds from an existing ledger channel.
     *
     * All virtual channels must be closed before a ledger channel can be closed.
     *
     * Generates the state update from the latest ingrid signed state with fast-close flag.
     *
     * Ingrid should countersign the closing update if it matches what she has signed previously, and the channel will fast close by calling consensuscloseThread on the contract.
     *
     * If the state update doesn't match what Ingrid previously signed, then updateLCState is called with the latest state and a challenge flag.
     *
     * @example
     * const success = await connext.closeChannel()
     * @param {String} - (optional) who the transactions should be sent from, defaults to account[0]
     * @returns {Promise} resolves to an object with the structure: { response: transactionHash, fastClosed: true}
     */

  }, {
    key: 'closeChannel',
    value: function () {
      var _ref21 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee14() {
        var sender = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var methodName, isAddress, accounts, channel, channelState, finalState, sig, cosigned, response;
        return _regenerator2.default.wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                methodName = 'closeChannel';
                isAddress = { presence: true, isAddress: true };

                if (!sender) {
                  _context14.next = 6;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context14.next = 10;
                break;

              case 6:
                _context14.next = 8;
                return this.web3.eth.getAccounts();

              case 8:
                accounts = _context14.sent;

                sender = accounts[0].toLowerCase();

              case 10:
                _context14.next = 12;
                return this.getChannelByPartyA(sender.toLowerCase());

              case 12:
                channel = _context14.sent;

                if (!(CHANNEL_STATES[channel.state] !== CHANNEL_STATES.LCS_OPENED)) {
                  _context14.next = 15;
                  break;
                }

                throw new ChannelCloseError(methodName, 'Channel is in invalid state');

              case 15:
                if (!(sender.toLowerCase() !== channel.partyA && sender.toLowerCase() !== channel.partyI)) {
                  _context14.next = 17;
                  break;
                }

                throw new ChannelCloseError(methodName, 'Not your channel');

              case 17:
                _context14.next = 19;
                return this.getLatestChannelState(channel.channelId, ['sigI']);

              case 19:
                channelState = _context14.sent;

                // transform if needed
                if (!channelState.balanceA || !channelState.balanceI) {
                  channelState.balanceA = {
                    ethDeposit: Web3.utils.toBN(channelState.ethBalanceA),
                    tokenDeposit: Web3.utils.toBN(channelState.tokenBalanceA)
                  };
                  channelState.balanceI = {
                    ethDeposit: Web3.utils.toBN(channelState.ethBalanceI),
                    tokenDeposit: Web3.utils.toBN(channelState.tokenBalanceI)
                  };
                }

                // channelState.channelId = channel.channelId
                _context14.next = 23;
                return this.createCloseChannelState(channelState, sender);

              case 23:
                finalState = _context14.sent;
                _context14.next = 26;
                return this.createChannelStateUpdate(finalState, sender);

              case 26:
                sig = _context14.sent;
                _context14.next = 29;
                return this.fastCloseChannelHandler({
                  sig: sig,
                  channelId: channel.channelId
                });

              case 29:
                cosigned = _context14.sent;

                if (cosigned.sigI) {
                  _context14.next = 32;
                  break;
                }

                throw new ChannelCloseError(methodName, 601, 'Hub did not countersign proposed update, channel could not be fast closed.');

              case 32:
                _context14.next = 34;
                return this.consensusCloseChannelContractHandler({
                  channelId: channel.channelId,
                  nonce: finalState.nonce,
                  balanceA: finalState.balanceA,
                  balanceI: finalState.balanceI,
                  sigA: sig,
                  sigI: cosigned.sigI,
                  sender: sender.toLowerCase()
                });

              case 34:
                response = _context14.sent;
                return _context14.abrupt('return', response.transactionHash);

              case 36:
              case 'end':
                return _context14.stop();
            }
          }
        }, _callee14, this);
      }));

      function closeChannel() {
        return _ref21.apply(this, arguments);
      }

      return closeChannel;
    }()

    // ***************************************
    // ************* DISPUTE FNS *************
    // ***************************************

    /**
     * closeChannel bonded funds from ledger channel after a channel is challenge-closed and the challenge period expires by calling withdraw using the internal web3 instance.
     *
     * Looks up LC by the account address of the client-side user if sender parameter is not supplied.
     *
     * Calls the "byzantinecloseThread" function on the contract.
     *
     * @example
     * const success = await connext.closeChannel()
     * if (!success) {
     *   // wait out challenge timer
     *   await connext.withdraw()
     * }
     * @param {String} sender - (optional) the person sending the on chain transaction, defaults to accounts[0]
     * @returns {Promise} resolves to the transaction hash from calling byzantinecloseThread
     */

  }, {
    key: 'withdraw',
    value: function () {
      var _ref22 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee15() {
        var sender = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var methodName, isAddress, accounts, lc, results;
        return _regenerator2.default.wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                methodName = 'withdraw';
                isAddress = { presence: true, isAddress: true };

                if (!sender) {
                  _context15.next = 6;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context15.next = 10;
                break;

              case 6:
                _context15.next = 8;
                return this.web3.eth.getAccounts();

              case 8:
                accounts = _context15.sent;

                sender = accounts[0].toLowerCase();

              case 10:
                _context15.next = 12;
                return this.getChannelByPartyA(sender);

              case 12:
                lc = _context15.sent;
                _context15.next = 15;
                return this.byzantineCloseThreadContractHandler({
                  lcId: lc.channelId,
                  sender: sender
                });

              case 15:
                results = _context15.sent;
                return _context15.abrupt('return', results);

              case 17:
              case 'end':
                return _context15.stop();
            }
          }
        }, _callee15, this);
      }));

      function withdraw() {
        return _ref22.apply(this, arguments);
      }

      return withdraw;
    }()

    /**
     * Verifies and cosigns the latest ledger state update.
     *
     * @example
     * const lcId = await connext.getChannelIdByPartyA() // get ID by accounts[0] and open status by default
     * await connext.cosignLatestChannelUpdate(channelId)
     *
     * @param {String} lcId - ledger channel id
     * @param {String} sender - (optional) the person who cosigning the update, defaults to accounts[0]
     * @returns {Promise} resolves to the cosigned ledger channel state update
     */

  }, {
    key: 'cosignLatestChannelUpdate',
    value: function () {
      var _ref23 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee16(channelId) {
        var sender = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var methodName, isHexStrict, accounts, channel, latestState, result;
        return _regenerator2.default.wrap(function _callee16$(_context16) {
          while (1) {
            switch (_context16.prev = _context16.next) {
              case 0:
                methodName = 'cosignLatestChannelUpdate';
                isHexStrict = { presence: true, isHexStrict: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');

                if (!sender) {
                  _context16.next = 7;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context16.next = 11;
                break;

              case 7:
                _context16.next = 9;
                return this.web3.eth.getAccounts();

              case 9:
                accounts = _context16.sent;

                sender = accounts[0].toLowerCase();

              case 11:
                _context16.next = 13;
                return this.getChannelById(channelId);

              case 13:
                channel = _context16.sent;

                if (!(channel == null)) {
                  _context16.next = 16;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Channel not found');

              case 16:
                if (!(channel.partyA !== sender.toLowerCase())) {
                  _context16.next = 18;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Incorrect signer detected');

              case 18:
                if (!(CHANNEL_STATES[channel.state] !== CHANNEL_STATES.LCS_OPENED)) {
                  _context16.next = 20;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Channel is in invalid state');

              case 20:
                _context16.next = 22;
                return this.getLatestChannelState(lcId, ['sigI']);

              case 22:
                latestState = _context16.sent;
                _context16.next = 25;
                return this.cosignChannelUpdate({
                  channelId: channelId,
                  nonce: latestState.nonce,
                  sender: sender
                });

              case 25:
                result = _context16.sent;
                return _context16.abrupt('return', result);

              case 27:
              case 'end':
                return _context16.stop();
            }
          }
        }, _callee16, this);
      }));

      function cosignLatestChannelUpdate(_x34) {
        return _ref23.apply(this, arguments);
      }

      return cosignLatestChannelUpdate;
    }()

    /**
     * Verifies and cosigns the ledger state update indicated by the provided nonce.
     *
     * @example
     * const lcId = await connext.getChannelIdByPartyA() // get ID by accounts[0] and open status by default
     * await connext.cosignLatestChannelUpdate(lcId)
     *
     * @param {Object} params - the method object
     * @param {String} params.lcId - ledger channel id
     * @param {String} params.sender - (optional) the person who cosigning the update, defaults to accounts[0]
     * @returns {Promise} resolves to the cosigned ledger channel state update
     */

  }, {
    key: 'cosignChannelUpdate',
    value: function () {
      var _ref25 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee17(_ref24) {
        var channelId = _ref24.channelId,
            nonce = _ref24.nonce,
            _ref24$sender = _ref24.sender,
            sender = _ref24$sender === undefined ? null : _ref24$sender;
        var methodName, isHexStrict, isPositiveInt, accounts, channel, state, signer, sigA, response;
        return _regenerator2.default.wrap(function _callee17$(_context17) {
          while (1) {
            switch (_context17.prev = _context17.next) {
              case 0:
                methodName = 'cosignChannelUpdate';
                isHexStrict = { presence: true, isHexStrict: true };
                isPositiveInt = { presence: true, isPositiveInt: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                Connext.validatorsResponseToError(validate.single(nonce, isPositiveInt), methodName, 'nonce');

                if (!sender) {
                  _context17.next = 9;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context17.next = 13;
                break;

              case 9:
                _context17.next = 11;
                return this.web3.eth.getAccounts();

              case 11:
                accounts = _context17.sent;

                sender = accounts[0].toLowerCase();

              case 13:
                _context17.next = 15;
                return this.getChannelById(channelId);

              case 15:
                channel = _context17.sent;

                if (!(channel == null)) {
                  _context17.next = 18;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Channel not found');

              case 18:
                if (!(channel.partyA !== sender.toLowerCase())) {
                  _context17.next = 20;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Incorrect signer detected');

              case 20:
                if (!(CHANNEL_STATES[channel.state] !== CHANNEL_STATES.LCS_OPENED)) {
                  _context17.next = 22;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Channel is in invalid state');

              case 22:
                if (!(nonce > channel.nonce)) {
                  _context17.next = 24;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Invalid nonce detected');

              case 24:
                _context17.next = 26;
                return this.getChannelStateByNonce({ channelId: channelId, nonce: nonce });

              case 26:
                state = _context17.sent;


                // verify sigI
                signer = Connext.recoverSignerFromChannelStateUpdate({
                  sig: state.sigI,
                  isClose: state.isClose,
                  channelId: channelId,
                  nonce: nonce,
                  openVcs: state.openVcs,
                  vcRootHash: state.vcRootHash,
                  partyA: sender,
                  partyI: this.ingridAddress,
                  ethBalanceA: Web3.utils.toBN(state.ethBalanceA),
                  ethBalanceI: Web3.utils.toBN(state.ethBalanceI),
                  tokenBalanceA: Web3.utils.toBN(state.tokenBalanceA),
                  tokenBalanceI: Web3.utils.toBN(state.tokenBalanceI)
                });

                if (!(signer.toLowerCase() !== this.ingridAddress.toLowerCase())) {
                  _context17.next = 30;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Invalid signature detected');

              case 30:

                state.signer = state.partyA;
                state.channelId = channelId;
                _context17.next = 34;
                return this.createChannelStateUpdate(state);

              case 34:
                sigA = _context17.sent;
                _context17.next = 37;
                return this.networking.post('ledgerchannel/' + channelId + '/update/' + nonce + '/cosign', {
                  sig: sigA
                });

              case 37:
                response = _context17.sent;
                return _context17.abrupt('return', response.data);

              case 39:
              case 'end':
                return _context17.stop();
            }
          }
        }, _callee17, this);
      }));

      function cosignChannelUpdate(_x35) {
        return _ref25.apply(this, arguments);
      }

      return cosignChannelUpdate;
    }()

    // ***************************************
    // *********** STATIC METHODS ************
    // ***************************************

    /**
     * Returns a new channel id that is a random hex string.
     *
     * @returns {String} a random 32 byte channel ID.
     */

  }, {
    key: 'createChannelStateUpdate',


    // ***************************************
    // ********** SIGNATURE METHODS **********
    // ***************************************

    // /**
    //  * Generates a signed ledger channel state update.
    //  *
    //  * @param {Object} params - the method object
    //  * @param {Boolean} params.isClose - (optional) flag indicating whether or not this is closing state, defaults to false
    //  * @param {String} params.channelId - ID of the ledger channel you are creating a state update for
    //  * @param {Number} params.nonce - the sequence of the ledger channel update
    //  * @param {Number} params.openVcs - the number of open virtual channels associated with this ledger channel
    //  * @param {String} params.vcRootHash - the root hash of the Merkle tree containing all initial states of the open virtual channels
    //  * @param {String} params.partyA - ETH address of partyA in the ledgerchannel
    //  * @param {String} params.partyI - (optional) ETH address of the hub, defaults to this.ingridAddress
    //  * @param {Number} params.balanceA - updated balance of partyA
    //  * @param {Number} params.balanceI - updated balance of partyI
    //  * @param {Boolean} params.unlockedAccountPresent - (optional) whether to use sign or personal sign, defaults to false if in prod and true if in dev
    //  * @param {String} params.signer - (optional) ETH address of person signing data, defaults to account[0]
    //  * @returns {String} signature of signer on data provided
    //  */
    value: function () {
      var _ref27 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee18(_ref26) {
        var _ref26$isClose = _ref26.isClose,
            isClose = _ref26$isClose === undefined ? false : _ref26$isClose,
            channelId = _ref26.channelId,
            nonce = _ref26.nonce,
            openVcs = _ref26.openVcs,
            vcRootHash = _ref26.vcRootHash,
            partyA = _ref26.partyA,
            _ref26$partyI = _ref26.partyI,
            partyI = _ref26$partyI === undefined ? this.ingridAddress : _ref26$partyI,
            balanceA = _ref26.balanceA,
            balanceI = _ref26.balanceI,
            _ref26$unlockedAccoun = _ref26.unlockedAccountPresent,
            unlockedAccountPresent = _ref26$unlockedAccoun === undefined ? process.env.DEV ? process.env.DEV : false : _ref26$unlockedAccoun,
            _ref26$signer = _ref26.signer,
            signer = _ref26$signer === undefined ? null : _ref26$signer,
            _ref26$hubBond = _ref26.hubBond,
            hubBond = _ref26$hubBond === undefined ? null : _ref26$hubBond,
            _ref26$deposit = _ref26.deposit,
            deposit = _ref26$deposit === undefined ? null : _ref26$deposit;
        var methodName, isHexStrict, isHex, isBN, isAddress, isPositiveInt, isBool, isValidDepositObject, accounts, emptyRootHash, channel, proposedEthBalance, proposedTokenBalance, isOpeningVc, ethChannelBalance, tokenChannelBalance, hash, sig;
        return _regenerator2.default.wrap(function _callee18$(_context18) {
          while (1) {
            switch (_context18.prev = _context18.next) {
              case 0:
                methodName = 'createChannelStateUpdate';
                // validate
                // validatorOpts

                isHexStrict = { presence: true, isHexStrict: true };
                isHex = { presence: true, isHex: true };
                isBN = { presence: true, isBN: true };
                isAddress = { presence: true, isAddress: true };
                isPositiveInt = { presence: true, isPositiveInt: true };
                isBool = { presence: true, isBool: true };
                isValidDepositObject = { presence: true, isValidDepositObject: true };


                Connext.validatorsResponseToError(validate.single(isClose, isBool), methodName, 'isClose');
                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                Connext.validatorsResponseToError(validate.single(nonce, isPositiveInt), methodName, 'nonce');
                Connext.validatorsResponseToError(validate.single(openVcs, isPositiveInt), methodName, 'openVcs');
                Connext.validatorsResponseToError(validate.single(vcRootHash, isHex), methodName, 'vcRootHash');
                Connext.validatorsResponseToError(validate.single(partyA, isAddress), methodName, 'partyA');
                Connext.validatorsResponseToError(validate.single(partyI, isAddress), methodName, 'partyI');
                Connext.validatorsResponseToError(validate.single(balanceA, isValidDepositObject), methodName, 'balanceA');
                Connext.validatorsResponseToError(validate.single(balanceI, isValidDepositObject), methodName, 'balanceI');
                if (hubBond) {
                  Connext.validatorsResponseToError(validate.single(hubBond, isValidDepositObject), methodName, 'hubBond');
                  hubBond.tokenDeposit = hubBond.tokenDeposit ? hubBond.tokenDeposit : Web3.utils.toBN('0');
                  hubBond.ethDeposit = hubBond.ethDeposit ? hubBond.ethDeposit : Web3.utils.toBN('0');
                } else {
                  // set to zero
                  hubBond = {
                    ethDeposit: Web3.utils.toBN('0'),
                    tokenDeposit: Web3.utils.toBN('0')
                  };
                }

                if (deposit) {
                  Connext.validatorsResponseToError(validate.single(deposit, isValidDepositObject), methodName, 'deposit');
                  deposit.ethDeposit = deposit.ethDeposit ? deposit.ethDeposit : Web3.utils.toBN('0');
                  deposit.tokenDeposit = deposit.tokenDeposit ? deposit.tokenDeposit : Web3.utils.toBN('0');
                } else {
                  deposit = {
                    ethDeposit: Web3.utils.toBN('0'),
                    tokenDeposit: Web3.utils.toBN('0')
                  };
                }

                if (!signer) {
                  _context18.next = 23;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(signer, isAddress), methodName, 'signer');
                _context18.next = 27;
                break;

              case 23:
                _context18.next = 25;
                return this.web3.eth.getAccounts();

              case 25:
                accounts = _context18.sent;

                signer = accounts[0].toLowerCase();

              case 27:
                if (!(signer.toLowerCase() !== partyA.toLowerCase() && signer.toLowerCase() !== partyI.toLowerCase())) {
                  _context18.next = 29;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Invalid signer detected');

              case 29:

                // validate update
                emptyRootHash = Connext.generateThreadRootHash({ threadInitialStates: [] });
                _context18.next = 32;
                return this.getChannelById(channelId);

              case 32:
                channel = _context18.sent;
                proposedEthBalance = void 0, proposedTokenBalance = void 0;

                if (!(channel == null)) {
                  _context18.next = 51;
                  break;
                }

                // set initial balances to 0 if thread does not exist
                channel.ethBalanceA = '0';
                channel.ethBalanceB = '0';
                channel.tokenBalanceA = '0';
                channel.tokenBalanceB = '0';
                // generating opening cert

                if (!(nonce !== 0)) {
                  _context18.next = 41;
                  break;
                }

                throw new ChannelOpenError(methodName, 'Invalid nonce detected');

              case 41:
                if (!(openVcs !== 0)) {
                  _context18.next = 43;
                  break;
                }

                throw new ChannelOpenError(methodName, 'Invalid openVcs detected');

              case 43:
                if (!(vcRootHash !== emptyRootHash)) {
                  _context18.next = 45;
                  break;
                }

                throw new ChannelOpenError(methodName, 'Invalid vcRootHash detected');

              case 45:
                if (!(partyA === partyI)) {
                  _context18.next = 47;
                  break;
                }

                throw new ChannelOpenError(methodName, 'Cannot open channel with yourself');

              case 47:
                if (balanceA.ethDeposit && balanceI.ethDeposit) {
                  // channel includes ETH
                  proposedEthBalance = balanceA.ethDeposit.add(balanceI.ethDeposit);
                }
                if (balanceA.tokenDeposit && balanceI.tokenDeposit) {
                  // channel includes token
                  proposedTokenBalance = balanceA.tokenDeposit.add(balanceI.tokenDeposit);
                }
                _context18.next = 64;
                break;

              case 51:
                if (!(CHANNEL_STATES[channel.state] === 3)) {
                  _context18.next = 53;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Channel is in invalid state to accept updates');

              case 53:
                if (!(nonce < channel.nonce)) {
                  _context18.next = 55;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Invalid nonce');

              case 55:
                if (!(Math.abs(Number(openVcs) - Number(channel.openVcs)) !== 1 && Math.abs(Number(openVcs) - Number(channel.openVcs)) !== 0)) {
                  _context18.next = 57;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Invalid number of openVcs proposed');

              case 57:
                if (!(partyA.toLowerCase() !== channel.partyA.toLowerCase() || partyI.toLowerCase() !== channel.partyI.toLowerCase())) {
                  _context18.next = 59;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Invalid channel parties');

              case 59:
                if (balanceA.ethDeposit && balanceI.ethDeposit) {
                  // channel includes ETH
                  proposedEthBalance = balanceA.ethDeposit.add(balanceI.ethDeposit);
                }
                if (balanceA.tokenDeposit && balanceI.tokenDeposit) {
                  // channel includes token
                  proposedTokenBalance = balanceA.tokenDeposit.add(balanceI.tokenDeposit);
                }
                // no change in total balance
                // add ledger channel balances of both parties from previously, subctract new balance of vc being opened
                isOpeningVc = openVcs - channel.openVcs === 1;
                // verify updates dont change channel balance

                ethChannelBalance = isOpeningVc ? Web3.utils.toBN(channel.ethBalanceA).add(Web3.utils.toBN(channel.ethBalanceI)).add(deposit.ethDeposit).sub(hubBond.ethDeposit) : Web3.utils.toBN(channel.ethBalanceA).add(Web3.utils.toBN(channel.ethBalanceI)).add(deposit.ethDeposit).add(hubBond.ethDeposit);
                tokenChannelBalance = isOpeningVc ? Web3.utils.toBN(channel.tokenBalanceA).add(Web3.utils.toBN(channel.tokenBalanceI)).add(deposit.tokenDeposit).sub(hubBond.tokenDeposit) : Web3.utils.toBN(channel.tokenBalanceA).add(Web3.utils.toBN(channel.tokenBalanceI)).add(deposit.tokenDeposit).add(hubBond.tokenDeposit);

              case 64:

                console.log('signing:', JSON.stringify({
                  isClose: isClose,
                  channelId: channelId,
                  nonce: nonce,
                  openVcs: openVcs,
                  vcRootHash: vcRootHash,
                  partyA: partyA,
                  partyI: partyI,
                  ethBalanceA: proposedEthBalance ? balanceA.ethDeposit.toString() : '0',
                  ethBalanceI: proposedEthBalance ? balanceI.ethDeposit.toString() : '0',
                  tokenBalanceA: proposedTokenBalance ? balanceA.tokenDeposit.toString() : '0',
                  tokenBalanceI: proposedTokenBalance ? balanceI.tokenDeposit.toString() : '0'
                }));
                // generate sig
                hash = Connext.createChannelStateUpdateFingerprint({
                  channelId: channelId,
                  isClose: isClose,
                  nonce: nonce,
                  openVcs: openVcs,
                  vcRootHash: vcRootHash,
                  partyA: partyA,
                  partyI: partyI,
                  ethBalanceA: proposedEthBalance ? balanceA.ethDeposit : Web3.utils.toBN('0'),
                  ethBalanceI: proposedEthBalance ? balanceI.ethDeposit : Web3.utils.toBN('0'),
                  tokenBalanceA: proposedTokenBalance ? balanceA.tokenDeposit : Web3.utils.toBN('0'),
                  tokenBalanceI: proposedTokenBalance ? balanceI.tokenDeposit : Web3.utils.toBN('0')
                });
                sig = void 0;

                if (!unlockedAccountPresent) {
                  _context18.next = 73;
                  break;
                }

                _context18.next = 70;
                return this.web3.eth.sign(hash, signer);

              case 70:
                sig = _context18.sent;
                _context18.next = 76;
                break;

              case 73:
                _context18.next = 75;
                return this.web3.eth.personal.sign(hash, signer);

              case 75:
                sig = _context18.sent;

              case 76:
                console.log('sig:', sig);
                return _context18.abrupt('return', sig);

              case 78:
              case 'end':
                return _context18.stop();
            }
          }
        }, _callee18, this);
      }));

      function createChannelStateUpdate(_x36) {
        return _ref27.apply(this, arguments);
      }

      return createChannelStateUpdate;
    }()

    // /**
    //  * Creates a signed virtual channel state update
    //  *
    //  * @param {Object} params - the method object
    //  * @param {String} params.channelId - ID of the virtual channel you are creating a state update for
    //  * @param {Number} params.nonce - the sequence of the state update
    //  * @param {String} params.partyA - ETH address of partyA
    //  * @param {String} params.partyB - ETH address of partyB
    //  * @param {Number} params.balanceA - updated balance of partyA
    //  * @param {Number} params.balanceB - updated balance of partyB
    //  * @param {Boolean} params.unlockedAccountPresent - (optional) whether to use sign or personal sign, defaults to false if in prod and true if in dev
    //  * @param {String} params.signer - (optional) ETH address of person signing data, defaults to account[0]
    //  * @returns {String} signature of signer on data provided
    //  */

  }, {
    key: 'createThreadStateUpdate',
    value: function () {
      var _ref29 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee19(_ref28) {
        var channelId = _ref28.channelId,
            nonce = _ref28.nonce,
            partyA = _ref28.partyA,
            partyB = _ref28.partyB,
            balanceA = _ref28.balanceA,
            balanceB = _ref28.balanceB,
            updateType = _ref28.updateType,
            _ref28$unlockedAccoun = _ref28.unlockedAccountPresent,
            unlockedAccountPresent = _ref28$unlockedAccoun === undefined ? process.env.DEV ? process.env.DEV : false : _ref28$unlockedAccoun,
            _ref28$signer = _ref28.signer,
            signer = _ref28$signer === undefined ? null : _ref28$signer;
        var methodName, isHexStrict, isValidDepositObject, isAddress, isPositiveInt, subchanA, thread, proposedEthBalance, proposedTokenBalance, threadEthBalance, threadTokenBalance, accounts, state, hash, sig;
        return _regenerator2.default.wrap(function _callee19$(_context19) {
          while (1) {
            switch (_context19.prev = _context19.next) {
              case 0:
                // validate
                methodName = 'createThreadStateUpdate';
                // validate
                // validatorOpts'

                isHexStrict = { presence: true, isHexStrict: true };
                isValidDepositObject = { presence: true, isValidDepositObject: true };
                isAddress = { presence: true, isAddress: true };
                isPositiveInt = { presence: true, isPositiveInt: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                Connext.validatorsResponseToError(validate.single(nonce, isPositiveInt), methodName, 'nonce');
                Connext.validatorsResponseToError(validate.single(partyA, isAddress), methodName, 'partyA');
                Connext.validatorsResponseToError(validate.single(partyB, isAddress), methodName, 'partyB');
                Connext.validatorsResponseToError(validate.single(balanceA, isValidDepositObject), methodName, 'balanceA');
                Connext.validatorsResponseToError(validate.single(balanceB, isValidDepositObject), methodName, 'balanceB');
                // verify subchannel
                _context19.next = 13;
                return this.getChannelByPartyA(partyA);

              case 13:
                subchanA = _context19.sent;
                _context19.next = 16;
                return this.getThreadById(channelId);

              case 16:
                thread = _context19.sent;
                proposedEthBalance = void 0, proposedTokenBalance = void 0;

                if (!(thread === null)) {
                  _context19.next = 37;
                  break;
                }

                if (!(nonce !== 0)) {
                  _context19.next = 21;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Invalid nonce detected');

              case 21:
                if (!(balanceB.ethDeposit && !balanceB.ethDeposit.isZero())) {
                  _context19.next = 23;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Invalid initial ETH balanceB detected');

              case 23:
                if (!(balanceB.tokenDeposit && !balanceB.tokenDeposit.isZero())) {
                  _context19.next = 25;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Invalid initial token balanceB detected');

              case 25:
                if (!(partyA.toLowerCase() === partyB.toLowerCase())) {
                  _context19.next = 27;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Cannot open thread with yourself');

              case 27:
                if (!balanceA.ethDeposit) {
                  _context19.next = 31;
                  break;
                }

                if (!Web3.utils.toBN(subchanA.ethBalanceA).lt(balanceA.ethDeposit)) {
                  _context19.next = 30;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Insufficient ETH channel balance detected');

              case 30:
                proposedEthBalance = balanceA.ethDeposit;

              case 31:
                if (!balanceA.tokenDeposit) {
                  _context19.next = 35;
                  break;
                }

                if (!Web3.utils.toBN(subchanA.tokenBalanceA).lt(balanceA.tokenDeposit)) {
                  _context19.next = 34;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Insufficient ETH channel balance detected');

              case 34:
                proposedTokenBalance = balanceA.tokenDeposit;

              case 35:
                _context19.next = 68;
                break;

              case 37:
                if (!(THREAD_STATES[thread.state] === 3)) {
                  _context19.next = 39;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread is in invalid state');

              case 39:
                if (!(nonce < thread.nonce + 1 && nonce !== 0)) {
                  _context19.next = 41;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Invalid nonce');

              case 41:
                if (!(partyA.toLowerCase() !== thread.partyA || partyB.toLowerCase() !== thread.partyB)) {
                  _context19.next = 43;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Invalid parties detected');

              case 43:
                // verify updates dont change channel balance
                threadEthBalance = Web3.utils.toBN(thread.ethBalanceA).add(Web3.utils.toBN(thread.ethBalanceB));
                threadTokenBalance = Web3.utils.toBN(thread.tokenBalanceA).add(Web3.utils.toBN(thread.tokenBalanceB));
                _context19.t0 = CHANNEL_TYPES[updateType];
                _context19.next = _context19.t0 === CHANNEL_TYPES.ETH ? 48 : _context19.t0 === CHANNEL_TYPES.TOKEN ? 52 : _context19.t0 === CHANNEL_TYPES.TOKEN_ETH ? 56 : 63;
                break;

              case 48:
                if (!balanceB.ethDeposit.lt(Web3.utils.toBN(thread.ethBalanceB))) {
                  _context19.next = 50;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread updates can only increase partyB ETH balance');

              case 50:
                proposedEthBalance = Web3.utils.toBN(balanceA.ethDeposit).add(balanceB.ethDeposit); // proposed balance
                return _context19.abrupt('break', 64);

              case 52:
                if (!balanceB.tokenDeposit.lt(Web3.utils.toBN(thread.tokenBalanceB))) {
                  _context19.next = 54;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread updates can only increase partyB token balance');

              case 54:
                proposedTokenBalance = Web3.utils.toBN(balanceA.tokenDeposit).add(balanceB.tokenDeposit);
                return _context19.abrupt('break', 64);

              case 56:
                if (!balanceB.ethDeposit.lt(Web3.utils.toBN(thread.ethBalanceB))) {
                  _context19.next = 58;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread updates can only increase partyB ETH balance');

              case 58:
                if (!balanceB.tokenDeposit.lt(Web3.utils.toBN(thread.tokenBalanceB))) {
                  _context19.next = 60;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread updates can only increase partyB token balance');

              case 60:
                proposedEthBalance = Web3.utils.toBN(balanceA.ethDeposit).add(balanceB.ethDeposit);
                proposedTokenBalance = Web3.utils.toBN(balanceA.tokenDeposit).add(balanceB.tokenDeposit);
                return _context19.abrupt('break', 64);

              case 63:
                throw new ThreadUpdateError(methodName, 'Invalid thread update type.');

              case 64:
                if (!(proposedEthBalance && !proposedEthBalance.eq(threadEthBalance))) {
                  _context19.next = 66;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread ETH balance cannot change');

              case 66:
                if (!(proposedTokenBalance && !proposedTokenBalance.eq(threadTokenBalance))) {
                  _context19.next = 68;
                  break;
                }

                throw new ThreadUpdateError(methodName, 'Thread token balance cannot change');

              case 68:
                _context19.next = 70;
                return this.web3.eth.getAccounts();

              case 70:
                accounts = _context19.sent;

                // generate and sign hash
                state = {
                  channelId: channelId,
                  nonce: nonce,
                  partyA: partyA,
                  partyB: partyB,
                  // if balance change proposed, use balance
                  // else use thread balance if thread exists (will be null on open)
                  // else use 0
                  ethBalanceA: proposedEthBalance ? balanceA.ethDeposit : thread ? Web3.utils.toBN(thread.ethBalanceA) : Web3.utils.toBN('0'),
                  ethBalanceB: proposedEthBalance ? balanceB.ethDeposit : thread ? Web3.utils.toBN(thread.ethBalanceB) : Web3.utils.toBN('0'),
                  tokenBalanceA: proposedTokenBalance ? balanceA.tokenDeposit : thread ? Web3.utils.toBN(thread.tokenBalanceA) : Web3.utils.toBN('0'),
                  tokenBalanceB: proposedTokenBalance ? balanceB.tokenDeposit : thread ? Web3.utils.toBN(thread.tokenBalanceB) : Web3.utils.toBN('0')
                };
                hash = Connext.createThreadStateUpdateFingerprint(state);

                console.log('signing:', JSON.stringify({
                  channelId: channelId,
                  nonce: nonce,
                  partyA: partyA,
                  partyB: partyB,
                  ethBalanceA: proposedEthBalance ? balanceA.ethDeposit.toString() : thread ? Web3.utils.toBN(thread.ethBalanceA).toString() : Web3.utils.toBN('0').toString(),
                  ethBalanceB: proposedEthBalance ? balanceB.ethDeposit.toString() : thread ? Web3.utils.toBN(thread.ethBalanceB).toString() : Web3.utils.toBN('0').toString(),
                  tokenBalanceA: proposedTokenBalance ? balanceA.tokenDeposit.toString() : thread ? Web3.utils.toBN(thread.tokenBalanceA).toString() : Web3.utils.toBN('0').toString(),
                  tokenBalanceB: proposedTokenBalance ? balanceB.tokenDeposit.toString() : thread ? Web3.utils.toBN(thread.tokenBalanceB).toString() : Web3.utils.toBN('0').toString()
                }));
                sig = void 0;

                if (!(signer && unlockedAccountPresent)) {
                  _context19.next = 81;
                  break;
                }

                _context19.next = 78;
                return this.web3.eth.sign(hash, signer);

              case 78:
                sig = _context19.sent;
                _context19.next = 96;
                break;

              case 81:
                if (!signer) {
                  _context19.next = 87;
                  break;
                }

                _context19.next = 84;
                return this.web3.eth.personal.sign(hash, signer);

              case 84:
                sig = _context19.sent;
                _context19.next = 96;
                break;

              case 87:
                if (!unlockedAccountPresent) {
                  _context19.next = 93;
                  break;
                }

                _context19.next = 90;
                return this.web3.eth.sign(hash, accounts[0]);

              case 90:
                sig = _context19.sent;
                _context19.next = 96;
                break;

              case 93:
                _context19.next = 95;
                return this.web3.eth.personal.sign(hash, accounts[0]);

              case 95:
                sig = _context19.sent;

              case 96:
                console.log('sig:', sig);
                return _context19.abrupt('return', sig);

              case 98:
              case 'end':
                return _context19.stop();
            }
          }
        }, _callee19, this);
      }));

      function createThreadStateUpdate(_x37) {
        return _ref29.apply(this, arguments);
      }

      return createThreadStateUpdate;
    }()

    // vc0 is array of all existing vc0 sigs for open vcs

  }, {
    key: 'createChannelContractHandler',


    // HELPER FUNCTIONS

    // ***************************************
    // ******** CONTRACT HANDLERS ************
    // ***************************************

    value: function () {
      var _ref31 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee20(_ref30) {
        var _ref30$ingridAddress = _ref30.ingridAddress,
            ingridAddress = _ref30$ingridAddress === undefined ? this.ingridAddress : _ref30$ingridAddress,
            channelId = _ref30.channelId,
            initialDeposits = _ref30.initialDeposits,
            challenge = _ref30.challenge,
            channelType = _ref30.channelType,
            _ref30$tokenAddress = _ref30.tokenAddress,
            tokenAddress = _ref30$tokenAddress === undefined ? null : _ref30$tokenAddress,
            _ref30$sender = _ref30.sender,
            sender = _ref30$sender === undefined ? null : _ref30$sender;
        var methodName, isHexStrict, isAddress, isPositiveInt, isValidDepositObject, accounts, result, token, tokenApproval, contractEth, contractToken;
        return _regenerator2.default.wrap(function _callee20$(_context20) {
          while (1) {
            switch (_context20.prev = _context20.next) {
              case 0:
                methodName = 'createChannelContractHandler';
                // validate

                isHexStrict = { presence: true, isHexStrict: true };
                isAddress = { presence: true, isAddress: true };
                isPositiveInt = { presence: true, isPositiveInt: true };
                isValidDepositObject = { presence: true, isValidDepositObject: true };

                Connext.validatorsResponseToError(validate.single(ingridAddress, isAddress), methodName, 'ingridAddress');
                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                Connext.validatorsResponseToError(validate.single(initialDeposits, isValidDepositObject), methodName, 'initialDeposits');
                Connext.validatorsResponseToError(validate.single(challenge, isPositiveInt), methodName, 'challenge');
                if (tokenAddress) {
                  Connext.validatorsResponseToError(validate.single(tokenAddress, isAddress), methodName, 'tokenAddress');
                }

                if (!sender) {
                  _context20.next = 14;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context20.next = 18;
                break;

              case 14:
                _context20.next = 16;
                return this.web3.eth.getAccounts();

              case 16:
                accounts = _context20.sent;

                sender = accounts[0].toLowerCase();

              case 18:
                if (!(sender === ingridAddress)) {
                  _context20.next = 20;
                  break;
                }

                throw new ChannelOpenError(methodName, 'Cannot open a channel with yourself');

              case 20:
                result = void 0, token = void 0, tokenApproval = void 0;
                _context20.t0 = CHANNEL_TYPES[channelType];
                _context20.next = _context20.t0 === CHANNEL_TYPES.ETH ? 24 : _context20.t0 === CHANNEL_TYPES.TOKEN ? 29 : _context20.t0 === CHANNEL_TYPES.TOKEN_ETH ? 33 : 39;
                break;

              case 24:
                // ETH
                tokenAddress = '0x0';
                _context20.next = 27;
                return this.channelManagerInstance.methods.createChannel(channelId, ingridAddress, challenge, tokenAddress, [initialDeposits.ethDeposit, Web3.utils.toBN('0')]).send({
                  from: sender,
                  value: initialDeposits.ethDeposit,
                  gas: 750000
                });

              case 27:
                result = _context20.sent;
                return _context20.abrupt('break', 40);

              case 29:
                _context20.next = 31;
                return this.channelManagerInstance.methods.createChannel(channelId, ingridAddress, challenge, tokenAddress, [Web3.utils.toBN('0'), initialDeposits.tokenDeposit]).send({
                  from: sender,
                  gas: 750000
                });

              case 31:
                result = _context20.sent;
                return _context20.abrupt('break', 40);

              case 33:
                // ETH/TOKEN
                // wallet must approve contract token transfer
                contractEth = initialDeposits.ethDeposit ? initialDeposits.ethDeposit : Web3.utils.toBN('0');
                contractToken = initialDeposits.tokenDeposit ? initialDeposits.tokenDeposit : Web3.utils.toBN('0');
                _context20.next = 37;
                return this.channelManagerInstance.methods.createChannel(channelId, ingridAddress, challenge, tokenAddress, [contractEth, contractToken]).send({
                  from: sender,
                  value: contractEth,
                  gas: 750000
                });

              case 37:
                result = _context20.sent;
                return _context20.abrupt('break', 40);

              case 39:
                throw new ChannelOpenError(methodName, 'Invalid channel type');

              case 40:
                if (result.transactionHash) {
                  _context20.next = 42;
                  break;
                }

                throw new ContractError(methodName, 301, 'Transaction failed to broadcast');

              case 42:
                if (result.blockNumber) {
                  _context20.next = 44;
                  break;
                }

                throw new ContractError(methodName, 302, result.transactionHash, 'Transaction failed');

              case 44:
                return _context20.abrupt('return', result);

              case 45:
              case 'end':
                return _context20.stop();
            }
          }
        }, _callee20, this);
      }));

      function createChannelContractHandler(_x38) {
        return _ref31.apply(this, arguments);
      }

      return createChannelContractHandler;
    }()

    /**
     * Watchers or users should call this to recover bonded funds if Ingrid fails to join the ledger channel within the challenge window.
     *
     * @param {String} lcId - ledger channel id the hub did not join
     * @param {String} sender - (optional) who is calling the transaction (defaults to accounts[0])
     * @returns {Promise} resolves to the result of sending the transaction
     */

  }, {
    key: 'ChannelOpenTimeoutContractHandler',
    value: function () {
      var _ref32 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee21(channelId) {
        var sender = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var methodName, isAddress, isHexStrict, accounts, channel, result;
        return _regenerator2.default.wrap(function _callee21$(_context21) {
          while (1) {
            switch (_context21.prev = _context21.next) {
              case 0:
                methodName = 'ChannelOpenTimeoutContractHandler';
                // validate

                isAddress = { presence: true, isAddress: true };
                isHexStrict = { presence: true, isHexStrict: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');

                if (!sender) {
                  _context21.next = 8;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context21.next = 12;
                break;

              case 8:
                _context21.next = 10;
                return this.web3.eth.getAccounts();

              case 10:
                accounts = _context21.sent;

                sender = accounts[0].toLowerCase();

              case 12:
                _context21.next = 14;
                return this.getChannelById(channelId);

              case 14:
                channel = _context21.sent;

                if (!(CHANNEL_STATES[channel.state] !== CHANNEL_STATES.LCS_OPENING)) {
                  _context21.next = 17;
                  break;
                }

                throw new ChannelOpenError(methodName, 'Channel is in incorrect state');

              case 17:
                if (!(channel.partyA.toLowerCase() !== sender.toLowerCase())) {
                  _context21.next = 19;
                  break;
                }

                throw new ContractError(methodName, 'Caller must be partyA in ledger channel');

              case 19:
                _context21.next = 21;
                return this.channelManagerInstance.methods.LCOpenTimeout(channelId).send({
                  from: sender,
                  gas: 470000
                });

              case 21:
                result = _context21.sent;

                if (result.transactionHash) {
                  _context21.next = 24;
                  break;
                }

                throw new ContractError(methodName, 301, 'Transaction failed to broadcast');

              case 24:
                if (result.blockNumber) {
                  _context21.next = 26;
                  break;
                }

                throw new ContractError(methodName, 302, result.transactionHash, 'Transaction failed');

              case 26:
                return _context21.abrupt('return', result);

              case 27:
              case 'end':
                return _context21.stop();
            }
          }
        }, _callee21, this);
      }));

      function ChannelOpenTimeoutContractHandler(_x40) {
        return _ref32.apply(this, arguments);
      }

      return ChannelOpenTimeoutContractHandler;
    }()
  }, {
    key: 'depositContractHandler',
    value: function () {
      var _ref34 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee22(_ref33) {
        var channelId = _ref33.channelId,
            deposits = _ref33.deposits,
            _ref33$sender = _ref33.sender,
            sender = _ref33$sender === undefined ? null : _ref33$sender,
            _ref33$recipient = _ref33.recipient,
            recipient = _ref33$recipient === undefined ? sender : _ref33$recipient,
            _ref33$tokenAddress = _ref33.tokenAddress,
            tokenAddress = _ref33$tokenAddress === undefined ? null : _ref33$tokenAddress;
        var methodName, isHexStrict, isValidDepositObject, isAddress, accounts, channel, ethDeposit, tokenDeposit, depositType, result;
        return _regenerator2.default.wrap(function _callee22$(_context22) {
          while (1) {
            switch (_context22.prev = _context22.next) {
              case 0:
                methodName = 'depositContractHandler';
                // validate

                isHexStrict = { presence: true, isHexStrict: true };
                isValidDepositObject = { presence: true, isValidDepositObject: true };
                isAddress = { presence: true, isAddress: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                Connext.validatorsResponseToError(validate.single(deposits, isValidDepositObject), methodName, 'deposits');
                _context22.next = 8;
                return this.web3.eth.getAccounts();

              case 8:
                accounts = _context22.sent;

                if (sender) {
                  Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                } else {
                  sender = accounts[0].toLowerCase();
                }
                if (recipient) {
                  Connext.validatorsResponseToError(validate.single(recipient, isAddress), methodName, 'recipient');
                } else {
                  // unspecified, defaults to active account
                  recipient = sender;
                }

                // verify requires --> already checked in deposit() fn, necessary?
                _context22.next = 13;
                return this.getChannelById(channelId);

              case 13:
                channel = _context22.sent;

                if (!(CHANNEL_STATES[channel.state] !== CHANNEL_STATES.LCS_OPENED)) {
                  _context22.next = 16;
                  break;
                }

                throw new ContractError(methodName, 'Channel is not open');

              case 16:
                if (!(recipient.toLowerCase() !== channel.partyA.toLowerCase() && recipient.toLowerCase() !== channel.partyI.toLowerCase())) {
                  _context22.next = 18;
                  break;
                }

                throw new ContractError(methodName, 'Recipient is not a member of the ledger channel');

              case 18:

                // determine deposit type
                ethDeposit = deposits.ethDeposit, tokenDeposit = deposits.tokenDeposit;
                depositType = void 0;

                if (ethDeposit && !ethDeposit.isZero() && tokenDeposit && !tokenDeposit.isZero()) {
                  // token and eth
                  tokenAddress = tokenAddress ? tokenAddress : channel.tokenAddress;
                  depositType = Object.keys(CHANNEL_TYPES)[2];
                } else if (tokenDeposit && !tokenDeposit.isZero()) {
                  tokenAddress = tokenAddress ? tokenAddress : channel.tokenAddress;
                  depositType = Object.keys(CHANNEL_TYPES)[1];
                } else if (ethDeposit && !ethDeposit.isZero()) {
                  depositType = Object.keys(CHANNEL_TYPES)[0];
                }

                result = void 0;
                _context22.t0 = CHANNEL_TYPES[depositType];
                _context22.next = _context22.t0 === CHANNEL_TYPES.ETH ? 25 : _context22.t0 === CHANNEL_TYPES.TOKEN ? 29 : 33;
                break;

              case 25:
                _context22.next = 27;
                return this.channelManagerInstance.methods.deposit(channelId, // PARAM NOT IN CONTRACT YET, SHOULD BE
                recipient, deposits.ethDeposit, false).send({
                  from: sender,
                  value: deposits.ethDeposit,
                  gas: 1000000
                });

              case 27:
                result = _context22.sent;
                return _context22.abrupt('break', 34);

              case 29:
                _context22.next = 31;
                return this.channelManagerInstance.methods.deposit(channelId, recipient, deposits.tokenDeposit, true).send({
                  from: sender,
                  gas: 1000000
                });

              case 31:
                result = _context22.sent;
                return _context22.abrupt('break', 34);

              case 33:
                throw new ChannelUpdateError(methodName, 'Invalid deposit type detected');

              case 34:
                if (result.transactionHash) {
                  _context22.next = 36;
                  break;
                }

                throw new ContractError(methodName, 301, 'Transaction failed to broadcast');

              case 36:
                if (result.blockNumber) {
                  _context22.next = 38;
                  break;
                }

                throw new ContractError(methodName, 302, result.transactionHash, 'Transaction failed');

              case 38:
                return _context22.abrupt('return', result);

              case 39:
              case 'end':
                return _context22.stop();
            }
          }
        }, _callee22, this);
      }));

      function depositContractHandler(_x41) {
        return _ref34.apply(this, arguments);
      }

      return depositContractHandler;
    }()
  }, {
    key: 'consensusCloseChannelContractHandler',
    value: function () {
      var _ref36 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee23(_ref35) {
        var channelId = _ref35.channelId,
            nonce = _ref35.nonce,
            balanceA = _ref35.balanceA,
            balanceI = _ref35.balanceI,
            sigA = _ref35.sigA,
            sigI = _ref35.sigI,
            _ref35$sender = _ref35.sender,
            sender = _ref35$sender === undefined ? null : _ref35$sender;
        var methodName, isHexStrict, isPositiveInt, isValidDepositObject, isHex, isAddress, accounts, emptyRootHash, state, signer, result;
        return _regenerator2.default.wrap(function _callee23$(_context23) {
          while (1) {
            switch (_context23.prev = _context23.next) {
              case 0:
                methodName = 'consensusCloseChannelContractHandler';
                // validate

                isHexStrict = { presence: true, isHexStrict: true };
                isPositiveInt = { presence: true, isPositiveInt: true };
                isValidDepositObject = { presence: true, isValidDepositObject: true };
                isHex = { presence: true, isHex: true };
                isAddress = { presence: true, isAddress: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                Connext.validatorsResponseToError(validate.single(nonce, isPositiveInt), methodName, 'nonce');
                Connext.validatorsResponseToError(validate.single(balanceA, isValidDepositObject), methodName, 'balanceA');
                Connext.validatorsResponseToError(validate.single(balanceI, isValidDepositObject), methodName, 'balanceI');
                Connext.validatorsResponseToError(validate.single(sigA, isHex), methodName, 'sigA');
                Connext.validatorsResponseToError(validate.single(sigI, isHex), methodName, 'sigI');

                if (!sender) {
                  _context23.next = 16;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context23.next = 20;
                break;

              case 16:
                _context23.next = 18;
                return this.web3.eth.getAccounts();

              case 18:
                accounts = _context23.sent;

                sender = accounts[0].toLowerCase();

              case 20:
                // verify sigs
                emptyRootHash = Connext.generateThreadRootHash({ threadInitialStates: [] });
                state = {
                  sig: sigI,
                  isClose: true,
                  channelId: channelId,
                  nonce: nonce,
                  openVcs: 0,
                  vcRootHash: emptyRootHash,
                  partyA: sender,
                  partyI: this.ingridAddress,
                  ethBalanceA: balanceA.ethDeposit ? balanceA.ethDeposit : Web3.utils.toBN('0'),
                  ethBalanceI: balanceI.ethDeposit ? balanceI.ethDeposit : Web3.utils.toBN('0'),
                  tokenBalanceA: balanceA.tokenDeposit ? balanceA.tokenDeposit : Web3.utils.toBN('0'),
                  tokenBalanceI: balanceI.tokenDeposit ? balanceI.tokenDeposit : Web3.utils.toBN('0')
                };
                signer = Connext.recoverSignerFromChannelStateUpdate(state);

                if (!(signer.toLowerCase() !== this.ingridAddress.toLowerCase())) {
                  _context23.next = 25;
                  break;
                }

                throw new ChannelCloseError(methodName, 'Hub did not sign closing update');

              case 25:
                state.sig = sigA;
                signer = Connext.recoverSignerFromChannelStateUpdate(state);

                if (!(signer.toLowerCase() !== sender.toLowerCase())) {
                  _context23.next = 29;
                  break;
                }

                throw new ChannelCloseError(methodName, 'PartyA did not sign closing update');

              case 29:
                _context23.next = 31;
                return this.channelManagerInstance.methods.consensusCloseChannel(channelId, nonce, [state.ethBalanceA, state.ethBalanceI, state.tokenBalanceA, state.tokenBalanceI], sigA, sigI).send({
                  from: sender,
                  gas: 1000000
                });

              case 31:
                result = _context23.sent;

                if (result.transactionHash) {
                  _context23.next = 34;
                  break;
                }

                throw new ContractError(methodName, 301, 'Transaction failed to broadcast');

              case 34:
                if (result.blockNumber) {
                  _context23.next = 36;
                  break;
                }

                throw new ContractError(methodName, 302, result.transactionHash, 'Transaction failed');

              case 36:
                return _context23.abrupt('return', result);

              case 37:
              case 'end':
                return _context23.stop();
            }
          }
        }, _callee23, this);
      }));

      function consensusCloseChannelContractHandler(_x42) {
        return _ref36.apply(this, arguments);
      }

      return consensusCloseChannelContractHandler;
    }()

    // default null means join with 0 deposit

  }, {
    key: 'joinChannelContractHandler',
    value: function () {
      var _ref38 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee24(_ref37) {
        var lcId = _ref37.lcId,
            _ref37$deposit = _ref37.deposit,
            deposit = _ref37$deposit === undefined ? null : _ref37$deposit,
            _ref37$sender = _ref37.sender,
            sender = _ref37$sender === undefined ? null : _ref37$sender;
        var methodName, isAddress, isHexStrict, isBN, lc, result;
        return _regenerator2.default.wrap(function _callee24$(_context24) {
          while (1) {
            switch (_context24.prev = _context24.next) {
              case 0:
                methodName = 'joinChannelContractHandler';
                isAddress = { presence: true, isAddress: true };
                isHexStrict = { presence: true, isHexStrict: true };
                isBN = { presence: true, isBN: true };

                Connext.validatorsResponseToError(validate.single(lcId, isHexStrict), methodName, 'lcId');

                if (!deposit) {
                  _context24.next = 11;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(deposit, isBN), methodName, 'deposit');

                if (!deposit.isNeg()) {
                  _context24.next = 9;
                  break;
                }

                throw new ChannelOpenError(methodName, 'Invalid deposit provided');

              case 9:
                _context24.next = 12;
                break;

              case 11:
                deposit = Web3.utils.toBN('0');

              case 12:
                if (sender) {
                  Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                }
                _context24.next = 15;
                return this.getChannelById(lcId);

              case 15:
                lc = _context24.sent;

                if (lc) {
                  _context24.next = 18;
                  break;
                }

                throw new ChannelOpenError(methodName, 'Channel is not openChanneled with hub');

              case 18:
                if (!(sender && sender.toLowerCase() === lc.partyA)) {
                  _context24.next = 20;
                  break;
                }

                throw new ChannelOpenError(methodName, 'Cannot create channel with yourself');

              case 20:
                if (!(sender && sender !== lc.partyI)) {
                  _context24.next = 22;
                  break;
                }

                throw new ChannelOpenError(methodName, 'Incorrect channel counterparty');

              case 22:
                if (!(CHANNEL_STATES[lc.state] !== 0)) {
                  _context24.next = 24;
                  break;
                }

                throw new ChannelOpenError(methodName, 'Channel is not in correct state');

              case 24:
                _context24.next = 26;
                return this.channelManagerInstance.methods.joinThread(lcId).send({
                  from: sender || this.ingridAddress, // can also be accounts[0], easier for testing
                  value: deposit,
                  gas: 3000000 // FIX THIS, WHY HAPPEN, TRUFFLE CONFIG???
                });

              case 26:
                result = _context24.sent;

                if (result.transactionHash) {
                  _context24.next = 29;
                  break;
                }

                throw new ContractError(methodName, 301, 'Transaction failed to broadcast');

              case 29:
                if (result.blockNumber) {
                  _context24.next = 31;
                  break;
                }

                throw new ContractError(methodName, 302, result.transactionHash, 'Transaction failed');

              case 31:
                return _context24.abrupt('return', result);

              case 32:
              case 'end':
                return _context24.stop();
            }
          }
        }, _callee24, this);
      }));

      function joinChannelContractHandler(_x43) {
        return _ref38.apply(this, arguments);
      }

      return joinChannelContractHandler;
    }()
  }, {
    key: 'updateChannelStateContractHandler',
    value: function () {
      var _ref40 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee25(_ref39) {
        var channelId = _ref39.channelId,
            nonce = _ref39.nonce,
            openVcs = _ref39.openVcs,
            balanceA = _ref39.balanceA,
            balanceI = _ref39.balanceI,
            vcRootHash = _ref39.vcRootHash,
            sigA = _ref39.sigA,
            sigI = _ref39.sigI,
            _ref39$sender = _ref39.sender,
            sender = _ref39$sender === undefined ? null : _ref39$sender;
        var methodName, isHexStrict, isPositiveInt, isValidDepositObject, isHex, isAddress, accounts, ethBalanceA, ethBalanceI, tokenBalanceA, tokenBalanceI, result;
        return _regenerator2.default.wrap(function _callee25$(_context25) {
          while (1) {
            switch (_context25.prev = _context25.next) {
              case 0:
                methodName = 'updateChannelStateContractHandler';
                // validate

                isHexStrict = { presence: true, isHexStrict: true };
                isPositiveInt = { presence: true, isPositiveInt: true };
                isValidDepositObject = { presence: true, isValidDepositObject: true };
                isHex = { presence: true, isHex: true };
                isAddress = { presence: true, isAddress: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                Connext.validatorsResponseToError(validate.single(nonce, isPositiveInt), methodName, 'nonce');
                Connext.validatorsResponseToError(validate.single(openVcs, isPositiveInt), methodName, 'openVcs');
                Connext.validatorsResponseToError(validate.single(balanceA, isValidDepositObject), methodName, 'balanceA');
                Connext.validatorsResponseToError(validate.single(balanceI, isValidDepositObject), methodName, 'balanceI');
                Connext.validatorsResponseToError(validate.single(vcRootHash, isHex), methodName, 'vcRootHash');
                Connext.validatorsResponseToError(validate.single(sigA, isHex), methodName, 'sigA');
                Connext.validatorsResponseToError(validate.single(sigI, isHex), methodName, 'sigI');

                if (!sender) {
                  _context25.next = 18;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context25.next = 22;
                break;

              case 18:
                _context25.next = 20;
                return this.web3.eth.getAccounts();

              case 20:
                accounts = _context25.sent;

                sender = accounts[0].toLowerCase();

              case 22:
                ethBalanceA = balanceA.ethDeposit ? balanceA.ethDeposit : Web3.utils.toBN('0');
                ethBalanceI = balanceI.ethDeposit ? balanceI.ethDeposit : Web3.utils.toBN('0');
                tokenBalanceA = balanceA.tokenDeposit ? balanceA.tokenDeposit : Web3.utils.toBN('0');
                tokenBalanceI = balanceI.tokenDeposit ? balanceI.tokenDeposit : Web3.utils.toBN('0');
                _context25.next = 28;
                return this.channelManagerInstance.methods.updateLCstate(channelId, [nonce, openVcs, ethBalanceA, ethBalanceI, tokenBalanceA, tokenBalanceI], Web3.utils.padRight(vcRootHash, 64), sigA, sigI).send({
                  from: sender,
                  gas: '6721975'
                });

              case 28:
                result = _context25.sent;

                if (result.transactionHash) {
                  _context25.next = 31;
                  break;
                }

                throw new ContractError(methodName, 301, 'Transaction failed to broadcast');

              case 31:
                if (result.blockNumber) {
                  _context25.next = 33;
                  break;
                }

                throw new ContractError(methodName, 302, result.transactionHash, 'Transaction failed');

              case 33:
                return _context25.abrupt('return', result);

              case 34:
              case 'end':
                return _context25.stop();
            }
          }
        }, _callee25, this);
      }));

      function updateChannelStateContractHandler(_x44) {
        return _ref40.apply(this, arguments);
      }

      return updateChannelStateContractHandler;
    }()
  }, {
    key: 'initThreadContractHandler',
    value: function () {
      var _ref42 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee26(_ref41) {
        var subchanId = _ref41.subchanId,
            threadId = _ref41.threadId,
            _ref41$proof = _ref41.proof,
            proof = _ref41$proof === undefined ? null : _ref41$proof,
            partyA = _ref41.partyA,
            partyB = _ref41.partyB,
            balanceA = _ref41.balanceA,
            sigA = _ref41.sigA,
            _ref41$sender = _ref41.sender,
            sender = _ref41$sender === undefined ? null : _ref41$sender;
        var methodName, isAddress, isHexStrict, isValidDepositObject, isHex, accounts, ethBalanceA, tokenBalanceA, merkle, stateHash, threadInitialStates, mproof, i, results;
        return _regenerator2.default.wrap(function _callee26$(_context26) {
          while (1) {
            switch (_context26.prev = _context26.next) {
              case 0:
                methodName = 'initThreadContractHandler';
                // validate

                isAddress = { presence: true, isAddress: true };
                isHexStrict = { presence: true, isHexStrict: true };
                isValidDepositObject = { presence: true, isValidDepositObject: true };
                isHex = { presence: true, isHex: true };

                Connext.validatorsResponseToError(validate.single(subchanId, isHexStrict), methodName, 'subchanId');
                Connext.validatorsResponseToError(validate.single(threadId, isHexStrict), methodName, 'threadId');
                Connext.validatorsResponseToError(validate.single(partyA, isAddress), methodName, 'partyA');
                Connext.validatorsResponseToError(validate.single(partyB, isAddress), methodName, 'partyB');
                Connext.validatorsResponseToError(validate.single(balanceA, isValidDepositObject), methodName, 'balanceA');
                Connext.validatorsResponseToError(validate.single(sigA, isHex), methodName, 'sigA');

                if (!sender) {
                  _context26.next = 15;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context26.next = 19;
                break;

              case 15:
                _context26.next = 17;
                return this.web3.eth.getAccounts();

              case 17:
                accounts = _context26.sent;

                sender = accounts[0].toLowerCase();

              case 19:
                ethBalanceA = balanceA.ethDeposit ? balanceA.ethDeposit : Web3.utils.toBN('0');
                tokenBalanceA = balanceA.tokenDeposit ? balanceA.tokenDeposit : Web3.utils.toBN('0');
                merkle = void 0, stateHash = void 0;

                if (!(proof === null)) {
                  _context26.next = 33;
                  break;
                }

                // generate proof from lc
                stateHash = Connext.createThreadStateUpdateFingerprint({
                  channelId: threadId,
                  nonce: 0,
                  partyA: partyA,
                  partyB: partyB,
                  ethBalanceA: ethBalanceA,
                  ethBalanceB: Web3.utils.toBN('0'),
                  tokenBalanceA: tokenBalanceA,
                  tokenBalanceB: Web3.utils.toBN('0')
                });
                _context26.next = 26;
                return this.getThreadInitialStates(subchanId);

              case 26:
                threadInitialStates = _context26.sent;

                merkle = Connext.generateMerkleTree(threadInitialStates);
                mproof = merkle.proof(Utils.hexToBuffer(stateHash));


                proof = [];
                for (i = 0; i < mproof.length; i++) {
                  proof.push(Utils.bufferToHex(mproof[i]));
                }

                proof.unshift(stateHash);

                proof = Utils.marshallState(proof);

              case 33:
                _context26.next = 35;
                return this.channelManagerInstance.methods.initVCstate(subchanId, threadId, proof, 0, partyA, partyB, [ethBalanceA, tokenBalanceA], [ethBalanceA, Web3.utils.toBN('0'), tokenBalanceA, Web3.utils.toBN('0')], sigA)
                // .estimateGas({
                //   from: sender,
                // })
                .send({
                  from: sender,
                  gas: 6721975
                });

              case 35:
                results = _context26.sent;

                if (results.transactionHash) {
                  _context26.next = 38;
                  break;
                }

                throw new Error('[' + methodName + '] initVCState transaction failed.');

              case 38:
                if (results.transactionHash) {
                  _context26.next = 40;
                  break;
                }

                throw new ContractError(methodName, 301, 'Transaction failed to broadcast');

              case 40:
                if (results.blockNumber) {
                  _context26.next = 42;
                  break;
                }

                throw new ContractError(methodName, 302, results.transactionHash, 'Transaction failed');

              case 42:
                return _context26.abrupt('return', results);

              case 43:
              case 'end':
                return _context26.stop();
            }
          }
        }, _callee26, this);
      }));

      function initThreadContractHandler(_x45) {
        return _ref42.apply(this, arguments);
      }

      return initThreadContractHandler;
    }()
  }, {
    key: 'settleThreadContractHandler',
    value: function () {
      var _ref44 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee27(_ref43) {
        var subchanId = _ref43.subchanId,
            threadId = _ref43.threadId,
            nonce = _ref43.nonce,
            partyA = _ref43.partyA,
            partyB = _ref43.partyB,
            balanceA = _ref43.balanceA,
            balanceB = _ref43.balanceB,
            sigA = _ref43.sigA,
            _ref43$sender = _ref43.sender,
            sender = _ref43$sender === undefined ? null : _ref43$sender;
        var methodName, isAddress, isPositiveInt, isHexStrict, isValidDepositObject, isHex, accounts, ethBalanceA, ethBalanceB, tokenBalanceA, tokenBalanceB, results;
        return _regenerator2.default.wrap(function _callee27$(_context27) {
          while (1) {
            switch (_context27.prev = _context27.next) {
              case 0:
                methodName = 'settleThreadContractHandler';
                // validate

                isAddress = { presence: true, isAddress: true };
                isPositiveInt = { presence: true, isPositiveInt: true };
                isHexStrict = { presence: true, isHexStrict: true };
                isValidDepositObject = { presence: true, isValidDepositObject: true };
                isHex = { presence: true, isHex: true };

                Connext.validatorsResponseToError(validate.single(subchanId, isHexStrict), methodName, 'subchanId');
                Connext.validatorsResponseToError(validate.single(threadId, isHexStrict), methodName, 'threadId');
                Connext.validatorsResponseToError(validate.single(nonce, isPositiveInt), methodName, 'nonce');
                Connext.validatorsResponseToError(validate.single(partyA, isAddress), methodName, 'partyA');
                Connext.validatorsResponseToError(validate.single(partyB, isAddress), methodName, 'partyB');
                Connext.validatorsResponseToError(validate.single(balanceA, isValidDepositObject), methodName, 'balanceA');
                Connext.validatorsResponseToError(validate.single(balanceB, isValidDepositObject), methodName, 'balanceB');
                Connext.validatorsResponseToError(validate.single(sigA, isHex), methodName, 'sigA');

                if (!sender) {
                  _context27.next = 18;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context27.next = 22;
                break;

              case 18:
                _context27.next = 20;
                return this.web3.eth.getAccounts();

              case 20:
                accounts = _context27.sent;

                sender = accounts[0].toLowerCase();

              case 22:
                ethBalanceA = balanceA.ethDeposit ? balanceA.ethDeposit : Web3.utils.toBN('0');
                ethBalanceB = balanceB.ethDeposit ? balanceB.ethDeposit : Web3.utils.toBN('0');
                tokenBalanceA = balanceA.tokenDeposit ? balanceA.tokenDeposit : Web3.utils.toBN('0');
                tokenBalanceB = balanceB.tokenDeposit ? balanceB.tokenDeposit : Web3.utils.toBN('0');
                _context27.next = 28;
                return this.channelManagerInstance.methods.settleVC(subchanId, threadId, nonce, partyA, partyB, [ethBalanceA, ethBalanceB, tokenBalanceA, tokenBalanceB], sigA).send({
                  from: sender,
                  gas: 6721975
                });

              case 28:
                results = _context27.sent;

                if (results.transactionHash) {
                  _context27.next = 31;
                  break;
                }

                throw new ContractError(methodName, 301, 'Transaction failed to broadcast');

              case 31:
                if (results.blockNumber) {
                  _context27.next = 33;
                  break;
                }

                throw new ContractError(methodName, 302, results.transactionHash, 'Transaction failed');

              case 33:
                return _context27.abrupt('return', results);

              case 34:
              case 'end':
                return _context27.stop();
            }
          }
        }, _callee27, this);
      }));

      function settleThreadContractHandler(_x46) {
        return _ref44.apply(this, arguments);
      }

      return settleThreadContractHandler;
    }()
  }, {
    key: 'closeVirtualChannelContractHandler',
    value: function () {
      var _ref46 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee28(_ref45) {
        var lcId = _ref45.lcId,
            vcId = _ref45.vcId,
            _ref45$sender = _ref45.sender,
            sender = _ref45$sender === undefined ? null : _ref45$sender;
        var methodName, isHexStrict, isAddress, accounts, results;
        return _regenerator2.default.wrap(function _callee28$(_context28) {
          while (1) {
            switch (_context28.prev = _context28.next) {
              case 0:
                methodName = 'closeVirtualChannelContractHandler';
                isHexStrict = { presence: true, isHexStrict: true };
                isAddress = { presence: true, isAddress: true };

                Connext.validatorsResponseToError(validate.single(lcId, isHexStrict), methodName, 'lcId');
                Connext.validatorsResponseToError(validate.single(vcId, isHexStrict), methodName, 'vcId');

                if (!sender) {
                  _context28.next = 9;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context28.next = 13;
                break;

              case 9:
                _context28.next = 11;
                return this.web3.eth.getAccounts();

              case 11:
                accounts = _context28.sent;

                sender = accounts[0].toLowerCase();

              case 13:
                _context28.next = 15;
                return this.channelManagerInstance.methods.closeVirtualChannel(lcId, vcId).send({
                  from: sender
                });

              case 15:
                results = _context28.sent;

                if (results.transactionHash) {
                  _context28.next = 18;
                  break;
                }

                throw new ContractError(methodName, 301, 'Transaction failed to broadcast');

              case 18:
                if (results.blockNumber) {
                  _context28.next = 20;
                  break;
                }

                throw new ContractError(methodName, 302, results.transactionHash, 'Transaction failed');

              case 20:
                return _context28.abrupt('return', results);

              case 21:
              case 'end':
                return _context28.stop();
            }
          }
        }, _callee28, this);
      }));

      function closeVirtualChannelContractHandler(_x47) {
        return _ref46.apply(this, arguments);
      }

      return closeVirtualChannelContractHandler;
    }()
  }, {
    key: 'byzantineCloseChannelContractHandler',
    value: function () {
      var _ref48 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee29(_ref47) {
        var channelId = _ref47.channelId,
            _ref47$sender = _ref47.sender,
            sender = _ref47$sender === undefined ? null : _ref47$sender;
        var methodName, isHexStrict, isAddress, accounts, results;
        return _regenerator2.default.wrap(function _callee29$(_context29) {
          while (1) {
            switch (_context29.prev = _context29.next) {
              case 0:
                methodName = 'byzantineCloseChannelContractHandler';
                isHexStrict = { presence: true, isHexStrict: true };
                isAddress = { presence: true, isAddress: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');

                if (!sender) {
                  _context29.next = 8;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context29.next = 12;
                break;

              case 8:
                _context29.next = 10;
                return this.web3.eth.getAccounts();

              case 10:
                accounts = _context29.sent;

                sender = accounts[0].toLowerCase();

              case 12:
                _context29.next = 14;
                return this.channelManagerInstance.methods.byzantineCloseChannel(channelId).send({
                  from: sender,
                  gas: '470000'
                });

              case 14:
                results = _context29.sent;

                if (results.transactionHash) {
                  _context29.next = 17;
                  break;
                }

                throw new ContractError(methodName, 301, 'Transaction failed to broadcast');

              case 17:
                if (results.blockNumber) {
                  _context29.next = 19;
                  break;
                }

                throw new ContractError(methodName, 302, results.transactionHash, 'Transaction failed');

              case 19:
                return _context29.abrupt('return', results);

              case 20:
              case 'end':
                return _context29.stop();
            }
          }
        }, _callee29, this);
      }));

      function byzantineCloseChannelContractHandler(_x48) {
        return _ref48.apply(this, arguments);
      }

      return byzantineCloseChannelContractHandler;
    }()

    // ***************************************
    // ********** ERROR HELPERS **************
    // ***************************************

  }, {
    key: 'getUnjoinedThreads',


    // ***************************************
    // *********** INGRID GETTERS ************
    // ***************************************

    /**
     * Requests the unjoined virtual channels that have been initiated with you. All threads are unidirectional, and only the reciever of payments may have unjoined threads.
     *
     * @param {String} partyB - (optional) ETH address of party who has yet to join virtual channel threads.
     * @returns {Promise} resolves to an array of unjoined virtual channel objects
     */
    value: function () {
      var _ref49 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee30() {
        var partyB = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var methodName, isAddress, accounts, response;
        return _regenerator2.default.wrap(function _callee30$(_context30) {
          while (1) {
            switch (_context30.prev = _context30.next) {
              case 0:
                methodName = 'getUnjoinedThreads';
                isAddress = { presence: true, isAddress: true };

                if (!partyB) {
                  _context30.next = 6;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(partyB, isAddress), methodName, 'partyB');
                _context30.next = 10;
                break;

              case 6:
                _context30.next = 8;
                return this.web3.eth.getAccounts();

              case 8:
                accounts = _context30.sent;

                partyB = accounts[0].toLowerCase();

              case 10:
                _context30.next = 12;
                return this.networking.get('virtualchannel/address/' + partyB.toLowerCase() + '/opening');

              case 12:
                response = _context30.sent;
                return _context30.abrupt('return', response.data);

              case 14:
              case 'end':
                return _context30.stop();
            }
          }
        }, _callee30, this);
      }));

      function getUnjoinedThreads() {
        return _ref49.apply(this, arguments);
      }

      return getUnjoinedThreads;
    }()
  }, {
    key: 'getThreadStateByNonce',
    value: function () {
      var _ref51 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee31(_ref50) {
        var channelId = _ref50.channelId,
            nonce = _ref50.nonce;
        var methodName, isHexStrict, isPositiveInt, response;
        return _regenerator2.default.wrap(function _callee31$(_context31) {
          while (1) {
            switch (_context31.prev = _context31.next) {
              case 0:
                methodName = 'getThreadStateByNonce';
                isHexStrict = { presence: true, isHexStrict: true };
                isPositiveInt = { presence: true, isPositiveInt: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                Connext.validatorsResponseToError(validate.single(nonce, isPositiveInt), methodName, 'nonce');
                _context31.next = 7;
                return this.networking.get('virtualchannel/' + channelId + '/update/nonce/' + nonce);

              case 7:
                response = _context31.sent;
                return _context31.abrupt('return', response.data);

              case 9:
              case 'end':
                return _context31.stop();
            }
          }
        }, _callee31, this);
      }));

      function getThreadStateByNonce(_x50) {
        return _ref51.apply(this, arguments);
      }

      return getThreadStateByNonce;
    }()
  }, {
    key: 'getChannelStateByNonce',
    value: function () {
      var _ref53 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee32(_ref52) {
        var channelId = _ref52.channelId,
            nonce = _ref52.nonce;
        var methodName, isHexStrict, isPositiveInt, response;
        return _regenerator2.default.wrap(function _callee32$(_context32) {
          while (1) {
            switch (_context32.prev = _context32.next) {
              case 0:
                methodName = 'getChannelStateByNonce';
                isHexStrict = { presence: true, isHexStrict: true };
                isPositiveInt = { presence: true, isPositiveInt: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                Connext.validatorsResponseToError(validate.single(nonce, isPositiveInt), methodName, 'nonce');
                _context32.next = 7;
                return this.networking.get('ledgerchannel/' + channelId + '/update/nonce/' + nonce);

              case 7:
                response = _context32.sent;
                return _context32.abrupt('return', response.data);

              case 9:
              case 'end':
                return _context32.stop();
            }
          }
        }, _callee32, this);
      }));

      function getChannelStateByNonce(_x51) {
        return _ref53.apply(this, arguments);
      }

      return getChannelStateByNonce;
    }()
  }, {
    key: 'getLatestChannelState',
    value: function () {
      var _ref54 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee33(channelId) {
        var sigs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var methodName, isHexStrict, response;
        return _regenerator2.default.wrap(function _callee33$(_context33) {
          while (1) {
            switch (_context33.prev = _context33.next) {
              case 0:
                // lcState == latest ingrid signed state
                methodName = 'getLatestChannelState';
                isHexStrict = { presence: true, isHexStrict: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                if (!sigs) {
                  sigs = ['sigI', 'sigA'];
                }

                _context33.next = 6;
                return this.networking.get('ledgerchannel/' + channelId + '/update/latest?sig[]=sigI');

              case 6:
                response = _context33.sent;
                return _context33.abrupt('return', response.data);

              case 8:
              case 'end':
                return _context33.stop();
            }
          }
        }, _callee33, this);
      }));

      function getLatestChannelState(_x53) {
        return _ref54.apply(this, arguments);
      }

      return getLatestChannelState;
    }()

    /**
     * Returns an array of the virtual channel states associated with the given ledger channel.
     *
     * @param {String} channelId - ID of the ledger channel
     * @returns {Promise} resolves to an Array of virtual channel objects
     */

  }, {
    key: 'getThreadsByChannelId',
    value: function () {
      var _ref55 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee34(channelId) {
        var methodName, isHexStrict, response;
        return _regenerator2.default.wrap(function _callee34$(_context34) {
          while (1) {
            switch (_context34.prev = _context34.next) {
              case 0:
                // lcState == latest ingrid signed state
                methodName = 'getThreadsByChannelId';
                isHexStrict = { presence: true, isHexStrict: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');

                _context34.next = 5;
                return this.networking.get('ledgerchannel/' + channelId + '/vcs');

              case 5:
                response = _context34.sent;
                return _context34.abrupt('return', response.data);

              case 7:
              case 'end':
                return _context34.stop();
            }
          }
        }, _callee34, this);
      }));

      function getThreadsByChannelId(_x54) {
        return _ref55.apply(this, arguments);
      }

      return getThreadsByChannelId;
    }()

    /**
     * Returns the ledger channel id between the supplied address and ingrid.
     *
     * If no address is supplied, accounts[0] is used as partyA.
     *
     * @param {String} partyA - (optional) address of the partyA in the channel with Ingrid.
     * @param {Number} status - (optional) state of virtual channel, can be 0 (opening), 1 (opened), 2 (settling), or 3 (settled). Defaults to open channel.
     * @returns {Promise} resolves to either the ledger channel id between hub and supplied partyA, or an Array of the channel IDs between hub and partyA.
     */

  }, {
    key: 'getChannelIdByPartyA',
    value: function () {
      var _ref56 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee35() {
        var partyA = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var status = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var methodName, isAddress, accounts, response;
        return _regenerator2.default.wrap(function _callee35$(_context35) {
          while (1) {
            switch (_context35.prev = _context35.next) {
              case 0:
                methodName = 'getChannelIdByPartyA';
                isAddress = { presence: true, isAddress: true };

                if (!partyA) {
                  _context35.next = 6;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(partyA, isAddress), methodName, 'partyA');
                _context35.next = 10;
                break;

              case 6:
                _context35.next = 8;
                return this.web3.eth.getAccounts();

              case 8:
                accounts = _context35.sent;

                partyA = accounts[0].toLowerCase();

              case 10:
                if (status !== null) {
                  Connext.validatorsResponseToError(validate.single(status, isChannelStatus), methodName, 'status');
                } else {
                  status = Object.keys(CHANNEL_STATES)[1];
                }
                // get my LC with ingrid
                _context35.next = 13;
                return this.networking.get('ledgerchannel/a/' + partyA + '?status=' + status);

              case 13:
                response = _context35.sent;

                if (!(status === Object.keys(CHANNEL_STATES)[1])) {
                  _context35.next = 18;
                  break;
                }

                return _context35.abrupt('return', response.data[0].channelId);

              case 18:
                return _context35.abrupt('return', response.data.map(function (val) {
                  return val.channelId;
                }));

              case 19:
              case 'end':
                return _context35.stop();
            }
          }
        }, _callee35, this);
      }));

      function getChannelIdByPartyA() {
        return _ref56.apply(this, arguments);
      }

      return getChannelIdByPartyA;
    }()

    /**
     * Returns an object representing the virtual channel in the database.
     *
     * @param {String} threadId - the ID of the virtual channel
     * @returns {Promise} resolves to an object representing the virtual channel
     */

  }, {
    key: 'getThreadById',
    value: function () {
      var _ref57 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee36(threadId) {
        var methodName, isHexStrict, response;
        return _regenerator2.default.wrap(function _callee36$(_context36) {
          while (1) {
            switch (_context36.prev = _context36.next) {
              case 0:
                methodName = 'getThreadById';
                isHexStrict = { presence: true, isHexStrict: true };

                Connext.validatorsResponseToError(validate.single(threadId, isHexStrict), methodName, 'threadId');
                _context36.prev = 3;
                _context36.next = 6;
                return this.networking.get('virtualchannel/' + threadId);

              case 6:
                response = _context36.sent;
                return _context36.abrupt('return', response.data);

              case 10:
                _context36.prev = 10;
                _context36.t0 = _context36['catch'](3);

                if (!(_context36.t0.status === 400)) {
                  _context36.next = 16;
                  break;
                }

                return _context36.abrupt('return', null);

              case 16:
                throw _context36.t0;

              case 17:
              case 'end':
                return _context36.stop();
            }
          }
        }, _callee36, this, [[3, 10]]);
      }));

      function getThreadById(_x57) {
        return _ref57.apply(this, arguments);
      }

      return getThreadById;
    }()

    /**
     * Returns an object representing the open virtual channel between the two parties in the database.
     *
     * @param {Object} params - the method object
     * @param {String} params.partyA - ETH address of partyA in virtual channel
     * @param {String} params.partyB - ETH address of partyB in virtual channel
     * @returns {Promise} resolves to the virtual channel
     */

  }, {
    key: 'getThreadByParties',
    value: function () {
      var _ref59 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee37(_ref58) {
        var partyA = _ref58.partyA,
            partyB = _ref58.partyB;
        var methodName, isAddress, openResponse;
        return _regenerator2.default.wrap(function _callee37$(_context37) {
          while (1) {
            switch (_context37.prev = _context37.next) {
              case 0:
                methodName = 'getThreadByParties';
                isAddress = { presence: true, isAddress: true };

                Connext.validatorsResponseToError(validate.single(partyA, isAddress), methodName, 'partyA');
                Connext.validatorsResponseToError(validate.single(partyB, isAddress), methodName, 'partyB');
                openResponse = void 0;
                _context37.prev = 5;
                _context37.next = 8;
                return this.networking.get('virtualchannel/a/' + partyA.toLowerCase() + '/b/' + partyB.toLowerCase() + '/open');

              case 8:
                openResponse = _context37.sent;

                if (!(openResponse.data.length === 0)) {
                  _context37.next = 13;
                  break;
                }

                openResponse = null;
                _context37.next = 14;
                break;

              case 13:
                return _context37.abrupt('return', openResponse.data);

              case 14:
                _context37.next = 19;
                break;

              case 16:
                _context37.prev = 16;
                _context37.t0 = _context37['catch'](5);

                if (_context37.t0.status === 400) {
                  // no open channel
                  openResponse = null;
                }

              case 19:
                if (!(openResponse === null)) {
                  _context37.next = 34;
                  break;
                }

                _context37.prev = 20;
                _context37.next = 23;
                return this.networking.get('virtualchannel/address/' + partyA.toLowerCase() + '/opening');

              case 23:
                openResponse = _context37.sent;

                if (!(openResponse.data.length === 0)) {
                  _context37.next = 28;
                  break;
                }

                openResponse = null;
                _context37.next = 29;
                break;

              case 28:
                return _context37.abrupt('return', openResponse.data);

              case 29:
                _context37.next = 34;
                break;

              case 31:
                _context37.prev = 31;
                _context37.t1 = _context37['catch'](20);

                if (_context37.t1.status === 400) {
                  // no open channel
                  openResponse = null;
                }

              case 34:
                return _context37.abrupt('return', openResponse);

              case 35:
              case 'end':
                return _context37.stop();
            }
          }
        }, _callee37, this, [[5, 16], [20, 31]]);
      }));

      function getThreadByParties(_x58) {
        return _ref59.apply(this, arguments);
      }

      return getThreadByParties;
    }()
  }, {
    key: 'getOtherSubchanId',
    value: function () {
      var _ref60 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee38(threadId) {
        var methodName, isHexStrict, thread;
        return _regenerator2.default.wrap(function _callee38$(_context38) {
          while (1) {
            switch (_context38.prev = _context38.next) {
              case 0:
                methodName = 'getOtherSubchanId';
                isHexStrict = { presence: true, isHexStrict: true };

                Connext.validatorsResponseToError(validate.single(threadId, isHexStrict), methodName, 'threadId');
                // get LC for other VC party and ingrid
                _context38.next = 5;
                return this.getThreadById(threadId);

              case 5:
                thread = _context38.sent;
                return _context38.abrupt('return', thread.subchanBI);

              case 7:
              case 'end':
                return _context38.stop();
            }
          }
        }, _callee38, this);
      }));

      function getOtherSubchanId(_x59) {
        return _ref60.apply(this, arguments);
      }

      return getOtherSubchanId;
    }()

    /**
     * Returns an object representing a ledger channel.
     *
     * @param {String} lcId - the ledger channel id
     * @returns {Promise} resolves to the ledger channel object
     */

  }, {
    key: 'getChannelById',
    value: function () {
      var _ref61 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee39(channelId) {
        var methodName, isHexStrict, res;
        return _regenerator2.default.wrap(function _callee39$(_context39) {
          while (1) {
            switch (_context39.prev = _context39.next) {
              case 0:
                methodName = 'getChannelById';
                isHexStrict = { presence: true, isHexStrict: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                _context39.prev = 3;
                _context39.next = 6;
                return this.networking.get('ledgerchannel/' + channelId);

              case 6:
                res = _context39.sent;
                return _context39.abrupt('return', res.data);

              case 10:
                _context39.prev = 10;
                _context39.t0 = _context39['catch'](3);

                if (!(_context39.t0.status === 404)) {
                  _context39.next = 14;
                  break;
                }

                return _context39.abrupt('return', null);

              case 14:
                throw _context39.t0;

              case 15:
              case 'end':
                return _context39.stop();
            }
          }
        }, _callee39, this, [[3, 10]]);
      }));

      function getChannelById(_x60) {
        return _ref61.apply(this, arguments);
      }

      return getChannelById;
    }()

    /**
     * Returns object representing the ledger channel between partyA and Ingrid
     *
     * @param {String} partyA - (optional) partyA in ledger channel. Default is accounts[0]
     * @param {Number} status - (optional) state of virtual channel, can be 0 (opening), 1 (opened), 2 (settling), or 3 (settled). Defaults to open channel.
     * @returns {Promise} resolves to ledger channel object
     */

  }, {
    key: 'getChannelByPartyA',
    value: function () {
      var _ref62 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee40() {
        var partyA = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var status = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var methodName, isChannelStatus, isAddress, accounts, response;
        return _regenerator2.default.wrap(function _callee40$(_context40) {
          while (1) {
            switch (_context40.prev = _context40.next) {
              case 0:
                methodName = 'getChannelByPartyA';
                isChannelStatus = { presence: true, isChannelStatus: true };
                isAddress = { presence: true, isAddress: true };

                if (!(partyA !== null)) {
                  _context40.next = 7;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(partyA, isAddress), methodName, 'partyA');
                _context40.next = 11;
                break;

              case 7:
                _context40.next = 9;
                return this.web3.eth.getAccounts();

              case 9:
                accounts = _context40.sent;

                partyA = accounts[0];

              case 11:
                if (status !== null) {
                  Connext.validatorsResponseToError(validate.single(status, isChannelStatus), methodName, 'status');
                } else {
                  status = Object.keys(CHANNEL_STATES)[1];
                }

                _context40.next = 14;
                return this.networking.get('ledgerchannel/a/' + partyA.toLowerCase() + '?status=' + status);

              case 14:
                response = _context40.sent;

                if (!(status === Object.keys(CHANNEL_STATES)[1])) {
                  _context40.next = 19;
                  break;
                }

                return _context40.abrupt('return', response.data[0]);

              case 19:
                return _context40.abrupt('return', response.data);

              case 20:
              case 'end':
                return _context40.stop();
            }
          }
        }, _callee40, this);
      }));

      function getChannelByPartyA() {
        return _ref62.apply(this, arguments);
      }

      return getChannelByPartyA;
    }()
  }, {
    key: 'getChallengeTimer',
    value: function () {
      var _ref63 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee41() {
        var response;
        return _regenerator2.default.wrap(function _callee41$(_context41) {
          while (1) {
            switch (_context41.prev = _context41.next) {
              case 0:
                _context41.next = 2;
                return this.networking.get('ledgerchannel/challenge');

              case 2:
                response = _context41.sent;
                return _context41.abrupt('return', response.data.challenge);

              case 4:
              case 'end':
                return _context41.stop();
            }
          }
        }, _callee41, this);
      }));

      function getChallengeTimer() {
        return _ref63.apply(this, arguments);
      }

      return getChallengeTimer;
    }()
  }, {
    key: 'getContractAddress',
    value: function () {
      var _ref64 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee42(channelId) {
        var methodName, isHexStrict, response;
        return _regenerator2.default.wrap(function _callee42$(_context42) {
          while (1) {
            switch (_context42.prev = _context42.next) {
              case 0:
                methodName = 'getLatestThreadState';
                isHexStrict = { presence: true, isHexStrict: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                _context42.next = 5;
                return this.networking.get('ledgerchannel/' + channelId + '/contract');

              case 5:
                response = _context42.sent;
                return _context42.abrupt('return', response.data.address);

              case 7:
              case 'end':
                return _context42.stop();
            }
          }
        }, _callee42, this);
      }));

      function getContractAddress(_x63) {
        return _ref64.apply(this, arguments);
      }

      return getContractAddress;
    }()
  }, {
    key: 'getLatestThreadState',
    value: function () {
      var _ref65 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee43(channelId) {
        var methodName, isHexStrict, response;
        return _regenerator2.default.wrap(function _callee43$(_context43) {
          while (1) {
            switch (_context43.prev = _context43.next) {
              case 0:
                // validate params
                methodName = 'getLatestThreadState';
                isHexStrict = { presence: true, isHexStrict: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                _context43.next = 5;
                return this.networking.get('virtualchannel/' + channelId + '/update/latest');

              case 5:
                response = _context43.sent;
                return _context43.abrupt('return', response.data);

              case 7:
              case 'end':
                return _context43.stop();
            }
          }
        }, _callee43, this);
      }));

      function getLatestThreadState(_x64) {
        return _ref65.apply(this, arguments);
      }

      return getLatestThreadState;
    }()
  }, {
    key: 'getThreadInitialStates',
    value: function () {
      var _ref66 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee44(channelId) {
        var methodName, isHexStrict, response;
        return _regenerator2.default.wrap(function _callee44$(_context44) {
          while (1) {
            switch (_context44.prev = _context44.next) {
              case 0:
                // validate params
                methodName = 'getThreadInitialStates';
                isHexStrict = { presence: true, isHexStrict: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                _context44.next = 5;
                return this.networking.get('ledgerchannel/' + channelId + '/vcinitialstates');

              case 5:
                response = _context44.sent;
                return _context44.abrupt('return', response.data);

              case 7:
              case 'end':
                return _context44.stop();
            }
          }
        }, _callee44, this);
      }));

      function getThreadInitialStates(_x65) {
        return _ref66.apply(this, arguments);
      }

      return getThreadInitialStates;
    }()
  }, {
    key: 'getThreadInitialState',
    value: function () {
      var _ref67 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee45(threadId) {
        var methodName, isHexStrict, response;
        return _regenerator2.default.wrap(function _callee45$(_context45) {
          while (1) {
            switch (_context45.prev = _context45.next) {
              case 0:
                // validate params
                methodName = 'getThreadInitialState';
                isHexStrict = { presence: true, isHexStrict: true };

                Connext.validatorsResponseToError(validate.single(threadId, isHexStrict), methodName, 'threadId');
                _context45.next = 5;
                return this.networking.get('virtualchannel/' + threadId + '/update/nonce/0');

              case 5:
                response = _context45.sent;
                return _context45.abrupt('return', response.data);

              case 7:
              case 'end':
                return _context45.stop();
            }
          }
        }, _callee45, this);
      }));

      function getThreadInitialState(_x66) {
        return _ref67.apply(this, arguments);
      }

      return getThreadInitialState;
    }()
  }, {
    key: 'getDecomposedChannelStates',
    value: function () {
      var _ref68 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee46(threadId) {
        var methodName, isHexStrict, response;
        return _regenerator2.default.wrap(function _callee46$(_context46) {
          while (1) {
            switch (_context46.prev = _context46.next) {
              case 0:
                // validate params
                methodName = 'getDecomposedChannelStates';
                isHexStrict = { presence: true, isHexStrict: true };

                Connext.validatorsResponseToError(validate.single(threadId, isHexStrict), methodName, 'threadId');
                _context46.next = 5;
                return this.networking.get('virtualchannel/' + threadId + '/decompose');

              case 5:
                response = _context46.sent;
                return _context46.abrupt('return', response.data);

              case 7:
              case 'end':
                return _context46.stop();
            }
          }
        }, _callee46, this);
      }));

      function getDecomposedChannelStates(_x67) {
        return _ref68.apply(this, arguments);
      }

      return getDecomposedChannelStates;
    }()

    // ***************************************
    // *********** INGRID HELPERS ************
    // ***************************************

    // requests ingrid deposits in a given subchan
    /**
     * Requests ingrid deposits into a given subchannel. Ingrid must have sufficient balance in the "B" subchannel to cover the virtual channel balance of "A" since Ingrid is assuming the financial counterparty risk.
     *
     * This function is to be used if the hub has insufficient balance in the ledger channel to create proposed virtual channels.
     *
     * @param {Object} params - the method object
     * @param {String} params.channelId - id of the ledger channel
     * @param {BN} params.deposit - the deposit in Wei
     * @returns {Promise} resolves to the transaction hash of Ingrid calling the deposit function
     */

  }, {
    key: 'requestHubDeposit',
    value: function () {
      var _ref70 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee47(_ref69) {
        var channelId = _ref69.channelId,
            deposit = _ref69.deposit;
        var methodName, isHexStrict, isValidDepositObject, accountBalance, response;
        return _regenerator2.default.wrap(function _callee47$(_context47) {
          while (1) {
            switch (_context47.prev = _context47.next) {
              case 0:
                methodName = 'requestHubDeposit';
                isHexStrict = { presence: true, isHexStrict: true };
                isValidDepositObject = { presence: true, isValidDepositObject: true };

                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                Connext.validatorsResponseToError(validate.single(deposit, isValidDepositObject), methodName, 'deposit');
                _context47.next = 7;
                return this.web3.eth.getBalance(this.ingridAddress);

              case 7:
                accountBalance = _context47.sent;

                if (!(deposit.ethDeposit && deposit.ethDeposit.gt(Web3.utils.toBN(accountBalance)))) {
                  _context47.next = 10;
                  break;
                }

                throw new ChannelUpdateError(methodName, 'Hub does not have sufficient ETH balance for requested deposit');

              case 10:
                _context47.next = 12;
                return this.networking.post('ledgerchannel/' + channelId + '/requestdeposit', {
                  ethDeposit: deposit.ethDeposit ? deposit.ethDeposit.toString() : '0',
                  tokenDeposit: deposit.tokenDeposit ? deposit.tokenDeposit.toString() : '0'
                });

              case 12:
                response = _context47.sent;
                return _context47.abrupt('return', response.data.txHash);

              case 14:
              case 'end':
                return _context47.stop();
            }
          }
        }, _callee47, this);
      }));

      function requestHubDeposit(_x68) {
        return _ref70.apply(this, arguments);
      }

      return requestHubDeposit;
    }()

    // ingrid verifies the threadInitialStates and sets up vc and countersigns lc updates

  }, {
    key: 'joinThreadHandler',
    value: function () {
      var _ref72 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee48(_ref71) {
        var subchanSig = _ref71.subchanSig,
            threadSig = _ref71.threadSig,
            channelId = _ref71.channelId;
        var methodName, isHexStrict, isHex, response;
        return _regenerator2.default.wrap(function _callee48$(_context48) {
          while (1) {
            switch (_context48.prev = _context48.next) {
              case 0:
                // validate params
                methodName = 'joinThreadHandler';
                isHexStrict = { presence: true, isHexStrict: true };
                isHex = { presence: true, isHex: true };

                Connext.validatorsResponseToError(validate.single(threadSig, isHex), methodName, 'threadSig');
                Connext.validatorsResponseToError(validate.single(subchanSig, isHex), methodName, 'subchanSig');
                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                // ingrid should verify vcS0A and vcS0b
                _context48.next = 8;
                return this.networking.post('virtualchannel/' + channelId + '/join', {
                  vcSig: threadSig,
                  lcSig: subchanSig
                });

              case 8:
                response = _context48.sent;
                return _context48.abrupt('return', response.data.channelId);

              case 10:
              case 'end':
                return _context48.stop();
            }
          }
        }, _callee48, this);
      }));

      function joinThreadHandler(_x69) {
        return _ref72.apply(this, arguments);
      }

      return joinThreadHandler;
    }()
  }, {
    key: 'fastCloseThreadHandler',
    value: function () {
      var _ref74 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee49(_ref73) {
        var sig = _ref73.sig,
            signer = _ref73.signer,
            channelId = _ref73.channelId;
        var methodName, isHex, isHexStrict, isAddress, response;
        return _regenerator2.default.wrap(function _callee49$(_context49) {
          while (1) {
            switch (_context49.prev = _context49.next) {
              case 0:
                // validate params
                methodName = 'fastCloseThreadHandler';
                isHex = { presence: true, isHex: true };
                isHexStrict = { presence: true, isHexStrict: true };
                isAddress = { presence: true, isAddress: true };

                Connext.validatorsResponseToError(validate.single(sig, isHex), methodName, 'sig');
                Connext.validatorsResponseToError(validate.single(signer, isAddress), methodName, 'signer');
                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');

                _context49.next = 9;
                return this.networking.post('virtualchannel/' + channelId + '/close', {
                  sig: sig,
                  signer: signer
                });

              case 9:
                response = _context49.sent;

                if (!response.data.sigI) {
                  _context49.next = 14;
                  break;
                }

                return _context49.abrupt('return', response.data.sigI);

              case 14:
                return _context49.abrupt('return', false);

              case 15:
              case 'end':
                return _context49.stop();
            }
          }
        }, _callee49, this);
      }));

      function fastCloseThreadHandler(_x70) {
        return _ref74.apply(this, arguments);
      }

      return fastCloseThreadHandler;
    }()
  }, {
    key: 'fastCloseChannelHandler',
    value: function () {
      var _ref76 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee50(_ref75) {
        var sig = _ref75.sig,
            channelId = _ref75.channelId;
        var methodName, isHexStrict, isHex, response;
        return _regenerator2.default.wrap(function _callee50$(_context50) {
          while (1) {
            switch (_context50.prev = _context50.next) {
              case 0:
                // validate params
                methodName = 'fastCloseChannelHandler';
                isHexStrict = { presence: true, isHexStrict: true };
                isHex = { presence: true, isHex: true };

                Connext.validatorsResponseToError(validate.single(sig, isHex), methodName, 'sig');
                Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
                _context50.next = 7;
                return this.networking.post('ledgerchannel/' + channelId + '/fastclose', {
                  sig: sig
                });

              case 7:
                response = _context50.sent;
                return _context50.abrupt('return', response.data);

              case 9:
              case 'end':
                return _context50.stop();
            }
          }
        }, _callee50, this);
      }));

      function fastCloseChannelHandler(_x71) {
        return _ref76.apply(this, arguments);
      }

      return fastCloseChannelHandler;
    }()
  }, {
    key: 'createChannelUpdateOnThreadOpen',
    value: function () {
      var _ref78 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee51(_ref77) {
        var threadInitialState = _ref77.threadInitialState,
            channel = _ref77.channel,
            _ref77$signer = _ref77.signer,
            signer = _ref77$signer === undefined ? null : _ref77$signer;
        var methodName, isThreadState, isChannelObj, isAddress, accounts, thread, threadInitialStates, newRootHash, channelEthBalanceA, channelTokenBalanceA, channelTokenBalanceI, channelEthBalanceI, updateAtoI, sigAtoI;
        return _regenerator2.default.wrap(function _callee51$(_context51) {
          while (1) {
            switch (_context51.prev = _context51.next) {
              case 0:
                methodName = 'createChannelUpdateOnThreadOpen';
                isThreadState = { presence: true, isThreadState: true };
                isChannelObj = { presence: true, isChannelObj: true };
                isAddress = { presence: true, isAddress: true };

                Connext.validatorsResponseToError(validate.single(threadInitialState, isThreadState), methodName, 'threadInitialState');
                Connext.validatorsResponseToError(validate.single(channel, isChannelObj), methodName, 'channel');

                if (!signer) {
                  _context51.next = 10;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(signer, isAddress), methodName, 'signer');
                _context51.next = 14;
                break;

              case 10:
                _context51.next = 12;
                return this.web3.eth.getAccounts();

              case 12:
                accounts = _context51.sent;

                signer = accounts[0].toLowerCase();

              case 14:
                if (!(signer.toLowerCase() !== channel.partyA)) {
                  _context51.next = 16;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Invalid signer detected');

              case 16:
                if (!(signer.toLowerCase() !== threadInitialState.partyA.toLowerCase() && signer.toLowerCase() !== threadInitialState.partyB.toLowerCase())) {
                  _context51.next = 18;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Invalid signer detected');

              case 18:
                if (!(CHANNEL_STATES[channel.state] !== 1)) {
                  _context51.next = 20;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Invalid subchannel state');

              case 20:
                _context51.next = 22;
                return this.getThreadById(threadInitialState.channelId);

              case 22:
                thread = _context51.sent;

                if (!(thread && THREAD_STATES[thread.state] !== 0)) {
                  _context51.next = 25;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Invalid channel id in threadInitialState');

              case 25:
                if (!(threadInitialState.nonce !== 0)) {
                  _context51.next = 27;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Thread nonce is nonzero');

              case 27:
                if (!(threadInitialState.balanceA.ethDeposit && Web3.utils.toBN(channel.ethBalanceA).lt(threadInitialState.balanceA.ethDeposit))) {
                  _context51.next = 29;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Insufficient ETH deposit detected for balanceA');

              case 29:
                if (!(threadInitialState.balanceA.tokenDeposit && Web3.utils.toBN(channel.tokenBalanceA).lt(threadInitialState.balanceA.tokenDeposit))) {
                  _context51.next = 31;
                  break;
                }

                throw new ThreadOpenError(methodName, 'Insufficient token deposit detected for balanceA');

              case 31:
                if (!(threadInitialState.balanceB.ethDeposit && !threadInitialState.balanceB.ethDeposit.isZero())) {
                  _context51.next = 33;
                  break;
                }

                throw new ThreadOpenError(methodName, 'The ETH balanceB must be 0 when creating thread.');

              case 33:
                if (!(threadInitialState.balanceB.tokenDeposit && !threadInitialState.balanceB.tokenDeposit.isZero())) {
                  _context51.next = 35;
                  break;
                }

                throw new ThreadOpenError(methodName, 'The token balanceB must be 0 when creating thread.');

              case 35:
                // manipulate threadInitialState to have the right data structure
                threadInitialState.ethBalanceA = threadInitialState.balanceA.ethDeposit ? threadInitialState.balanceA.ethDeposit : Web3.utils.toBN('0');
                threadInitialState.ethBalanceB = Web3.utils.toBN('0');
                threadInitialState.tokenBalanceA = threadInitialState.balanceA.tokenDeposit ? threadInitialState.balanceA.tokenDeposit : Web3.utils.toBN('0');
                threadInitialState.tokenBalanceB = Web3.utils.toBN('0');

                _context51.next = 41;
                return this.getThreadInitialStates(channel.channelId);

              case 41:
                threadInitialStates = _context51.sent;

                threadInitialStates.push(threadInitialState); // add new vc state to hash
                newRootHash = Connext.generateThreadRootHash({ threadInitialStates: threadInitialStates });

                // new LC balances should reflect the VC deposits
                // new balanceA = balanceA - (their VC balance)

                channelEthBalanceA = signer.toLowerCase() === threadInitialState.partyA.toLowerCase() ? Web3.utils.toBN(channel.ethBalanceA).sub(threadInitialState.ethBalanceA) // viewer is signing LC update
                : Web3.utils.toBN(channel.ethBalanceA).sub(threadInitialState.ethBalanceB); // performer is signing LC update

                channelTokenBalanceA = signer.toLowerCase() === threadInitialState.partyA.toLowerCase() ? Web3.utils.toBN(channel.tokenBalanceA).sub(threadInitialState.tokenBalanceA) : Web3.utils.toBN(channel.tokenBalanceA).sub(threadInitialState.tokenBalanceB);

                // new balanceI = balanceI - (counterparty VC balance)

                channelTokenBalanceI = signer.toLowerCase() === threadInitialState.partyA.toLowerCase() ? Web3.utils.toBN(channel.tokenBalanceI).sub(threadInitialState.tokenBalanceB) : Web3.utils.toBN(channel.tokenBalanceI).sub(threadInitialState.tokenBalanceA);
                channelEthBalanceI = signer.toLowerCase() === threadInitialState.partyA.toLowerCase() ? Web3.utils.toBN(channel.ethBalanceI).sub(threadInitialState.ethBalanceB) : Web3.utils.toBN(channel.ethBalanceI).sub(threadInitialState.ethBalanceA); //

                updateAtoI = {
                  channelId: channel.channelId,
                  nonce: channel.nonce + 1,
                  openVcs: threadInitialStates.length,
                  vcRootHash: newRootHash,
                  partyA: channel.partyA,
                  partyI: this.ingridAddress,
                  balanceA: {
                    ethDeposit: channelEthBalanceA,
                    tokenDeposit: channelTokenBalanceA
                  },
                  balanceI: {
                    ethDeposit: channelEthBalanceI,
                    tokenDeposit: channelTokenBalanceI
                  },
                  signer: signer,
                  hubBond: {
                    ethDeposit: threadInitialState.ethBalanceA.add(threadInitialState.ethBalanceB),
                    tokenDeposit: threadInitialState.tokenBalanceA.add(threadInitialState.tokenBalanceB)
                  }
                };
                _context51.next = 51;
                return this.createChannelStateUpdate(updateAtoI);

              case 51:
                sigAtoI = _context51.sent;
                return _context51.abrupt('return', sigAtoI);

              case 53:
              case 'end':
                return _context51.stop();
            }
          }
        }, _callee51, this);
      }));

      function createChannelUpdateOnThreadOpen(_x72) {
        return _ref78.apply(this, arguments);
      }

      return createChannelUpdateOnThreadOpen;
    }()
  }, {
    key: 'createChannelStateOnThreadClose',
    value: function () {
      var _ref80 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee52(_ref79) {
        var latestThreadState = _ref79.latestThreadState,
            subchan = _ref79.subchan,
            _ref79$signer = _ref79.signer,
            signer = _ref79$signer === undefined ? null : _ref79$signer;
        var methodName, isThreadState, isChannelObj, isAddress, accounts, threadInitialStates, newRootHash, subchanEthBalanceA, subchanEthBalanceI, subchanTokenBalanceA, subchanTokenBalanceI, updateAtoI;
        return _regenerator2.default.wrap(function _callee52$(_context52) {
          while (1) {
            switch (_context52.prev = _context52.next) {
              case 0:
                methodName = 'createChannelStateOnThreadClose';
                isThreadState = { presence: true, isThreadState: true };
                isChannelObj = { presence: true, isChannelObj: true };
                isAddress = { presence: true, isAddress: true };

                Connext.validatorsResponseToError(validate.single(latestThreadState, isThreadState), methodName, 'latestThreadState');
                Connext.validatorsResponseToError(validate.single(subchan, isChannelObj), methodName, 'subchan');

                if (!signer) {
                  _context52.next = 10;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(signer, isAddress), methodName, 'signer');
                _context52.next = 14;
                break;

              case 10:
                _context52.next = 12;
                return this.web3.eth.getAccounts();

              case 12:
                accounts = _context52.sent;

                signer = accounts[0].toLowerCase();

              case 14:
                if (!(signer.toLowerCase() !== subchan.partyA)) {
                  _context52.next = 16;
                  break;
                }

                throw new ThreadCloseError(methodName, 'Incorrect signer detected');

              case 16:
                if (!(signer.toLowerCase() !== latestThreadState.partyA.toLowerCase() && signer.toLowerCase() !== latestThreadState.partyB.toLowerCase())) {
                  _context52.next = 18;
                  break;
                }

                throw new ThreadCloseError(methodName, 'Not your channel');

              case 18:
                if (!(CHANNEL_STATES[subchan.state] !== CHANNEL_STATES.LCS_OPENED && CHANNEL_STATES[subchan.state] !== CHANNEL_STATES.LCS_SETTLING)) {
                  _context52.next = 20;
                  break;
                }

                throw new ThreadCloseError(methodName, 'Channel is in invalid state');

              case 20:
                _context52.next = 22;
                return this.getThreadInitialStates(subchan.channelId);

              case 22:
                threadInitialStates = _context52.sent;

                // array of state objects, which include the channel id and nonce
                // remove initial state of vcN
                threadInitialStates = threadInitialStates.filter(function (threadState) {
                  return threadState.channelId !== latestThreadState.channelId;
                });
                newRootHash = Connext.generateThreadRootHash({ threadInitialStates: threadInitialStates });

                // add balance from thread to channel balance

                subchanEthBalanceA = signer.toLowerCase() === latestThreadState.partyA ? Web3.utils.toBN(subchan.ethBalanceA).add(Web3.utils.toBN(latestThreadState.ethBalanceA)) : Web3.utils.toBN(subchan.ethBalanceA).add(Web3.utils.toBN(latestThreadState.ethBalanceB));
                // add counterparty balance from thread to channel balance

                subchanEthBalanceI = signer.toLowerCase() === latestThreadState.partyA ? Web3.utils.toBN(subchan.ethBalanceI).add(Web3.utils.toBN(latestThreadState.ethBalanceB)) : Web3.utils.toBN(subchan.ethBalanceI).add(Web3.utils.toBN(latestThreadState.ethBalanceA));
                subchanTokenBalanceA = signer.toLowerCase() === latestThreadState.partyA ? Web3.utils.toBN(subchan.tokenBalanceA).add(Web3.utils.toBN(latestThreadState.tokenBalanceA)) : Web3.utils.toBN(subchan.tokenBalanceA).add(Web3.utils.toBN(latestThreadState.tokenBalanceB));
                subchanTokenBalanceI = signer.toLowerCase() === latestThreadState.partyA ? Web3.utils.toBN(subchan.tokenBalanceI).add(Web3.utils.toBN(latestThreadState.tokenBalanceB)) : Web3.utils.toBN(subchan.tokenBalanceI).add(Web3.utils.toBN(latestThreadState.tokenBalanceA));
                updateAtoI = {
                  channelId: subchan.channelId,
                  nonce: subchan.nonce + 1,
                  openVcs: threadInitialStates.length,
                  vcRootHash: newRootHash,
                  partyA: signer,
                  partyI: this.ingridAddress,
                  balanceA: {
                    ethDeposit: subchanEthBalanceA,
                    tokenDeposit: subchanTokenBalanceA
                  },
                  balanceI: {
                    ethDeposit: subchanEthBalanceI,
                    tokenDeposit: subchanTokenBalanceI
                  },
                  hubBond: {
                    ethDeposit: Web3.utils.toBN(latestThreadState.ethBalanceA).add(Web3.utils.toBN(latestThreadState.ethBalanceB)),
                    tokenDeposit: Web3.utils.toBN(latestThreadState.tokenBalanceA).add(Web3.utils.toBN(latestThreadState.tokenBalanceB))
                  },
                  signer: signer
                };
                return _context52.abrupt('return', updateAtoI);

              case 31:
              case 'end':
                return _context52.stop();
            }
          }
        }, _callee52, this);
      }));

      function createChannelStateOnThreadClose(_x73) {
        return _ref80.apply(this, arguments);
      }

      return createChannelStateOnThreadClose;
    }()
  }, {
    key: 'createCloseChannelState',
    value: function () {
      var _ref81 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee53(channelState) {
        var sender = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
        var methodName, isAddress, accounts, channel, signer, finalState;
        return _regenerator2.default.wrap(function _callee53$(_context53) {
          while (1) {
            switch (_context53.prev = _context53.next) {
              case 0:
                methodName = 'createCloseChannelState';
                isAddress = { presence: true, isAddress: true };

                if (!sender) {
                  _context53.next = 6;
                  break;
                }

                Connext.validatorsResponseToError(validate.single(sender, isAddress), methodName, 'sender');
                _context53.next = 10;
                break;

              case 6:
                _context53.next = 8;
                return this.web3.eth.getAccounts();

              case 8:
                accounts = _context53.sent;

                sender = accounts[0].toLowerCase();

              case 10:
                _context53.next = 12;
                return this.getChannelByPartyA(sender.toLowerCase());

              case 12:
                channel = _context53.sent;

                if (!channelState) {
                  _context53.next = 23;
                  break;
                }

                if (!(Number(channelState.openVcs) !== 0)) {
                  _context53.next = 16;
                  break;
                }

                throw new ChannelCloseError(methodName, 'Cannot close channel with open VCs');

              case 16:
                if (!(channelState.vcRootHash !== Connext.generateThreadRootHash({ threadInitialStates: [] }))) {
                  _context53.next = 18;
                  break;
                }

                throw new ChannelCloseError(methodName, 'Cannot close channel with open VCs');

              case 18:
                // member-signed?
                signer = Connext.recoverSignerFromChannelStateUpdate({
                  sig: channelState.sigI ? channelState.sigI : channelState.sigA,
                  isClose: false,
                  channelId: channel.channelId,
                  nonce: channelState.nonce,
                  openVcs: channelState.openVcs,
                  vcRootHash: channelState.vcRootHash,
                  partyA: channel.partyA,
                  partyI: this.ingridAddress,
                  ethBalanceA: Web3.utils.toBN(channelState.balanceA.ethDeposit),
                  ethBalanceI: Web3.utils.toBN(channelState.balanceI.ethDeposit),
                  tokenBalanceA: Web3.utils.toBN(channelState.balanceA.tokenDeposit),
                  tokenBalanceI: Web3.utils.toBN(channelState.balanceI.tokenDeposit)
                });

                if (!(signer.toLowerCase() !== channel.partyI && signer.toLowerCase() !== channel.partyA)) {
                  _context53.next = 21;
                  break;
                }

                throw new ChannelCloseError(methodName, 'Channel member did not sign update');

              case 21:
                _context53.next = 24;
                break;

              case 23:
                // no state updates made in LC
                // PROBLEM: ingrid doesnt return lcState, just uses empty
                channelState = {
                  isClose: false,
                  channelId: channel.channelId,
                  nonce: 0,
                  openVcs: 0,
                  vcRootHash: Connext.generateThreadRootHash({ threadInitialStates: [] }),
                  partyA: channel.partyA,
                  partyI: this.ingridAddress,
                  balanceA: {
                    tokenDeposit: Web3.utils.toBN(channel.tokenBalanceA),
                    ethDeposit: Web3.utils.toBN(channel.ethBalanceA)
                  },
                  balanceI: {
                    tokenDeposit: Web3.utils.toBN(channel.tokenBalanceI),
                    ethDeposit: Web3.utils.toBN(channel.ethBalanceI)
                  }
                };

              case 24:

                // generate same update with fast close flag and post
                finalState = {
                  isClose: true,
                  channelId: channel.channelId,
                  nonce: channelState.nonce + 1,
                  openVcs: channelState.openVcs,
                  vcRootHash: channelState.vcRootHash,
                  partyA: channel.partyA,
                  partyI: this.ingridAddress,
                  balanceA: channelState.balanceA,
                  balanceI: channelState.balanceI,
                  signer: sender,
                  hubBond: channelState.hubBond
                };
                return _context53.abrupt('return', finalState);

              case 26:
              case 'end':
                return _context53.stop();
            }
          }
        }, _callee53, this);
      }));

      function createCloseChannelState(_x75) {
        return _ref81.apply(this, arguments);
      }

      return createCloseChannelState;
    }()
  }], [{
    key: 'getNewChannelId',
    value: function getNewChannelId() {
      var buf = crypto.randomBytes(32);
      var channelId = Web3.utils.bytesToHex(buf);
      return channelId;
    }

    /**
     * Hashes the ledger channel state update information using soliditySha3.
     *
     * @param {Object} params - the method object
     * @param {Boolean} params.isClose - flag indicating whether or not this is closing state
     * @param {Number} params.nonce - the sequence of the ledger channel update
     * @param {Number} params.openVcs - the number of open virtual channels associated with this ledger channel
     * @param {String} params.vcRootHash - the root hash of the Merkle tree containing all initial states of the open virtual channels
     * @param {String} params.partyA - ETH address of partyA in the ledgerchannel
     * @param {String} params.partyI - ETH address of the hub (Ingrid)
     * @param {Number} params.balanceA - updated balance of partyA
     * @param {Number} params.balanceI - updated balance of partyI
     * @returns {String} the hash of the state data
     */

  }, {
    key: 'createChannelStateUpdateFingerprint',
    value: function createChannelStateUpdateFingerprint(_ref82) {
      var channelId = _ref82.channelId,
          isClose = _ref82.isClose,
          nonce = _ref82.nonce,
          openVcs = _ref82.openVcs,
          vcRootHash = _ref82.vcRootHash,
          partyA = _ref82.partyA,
          partyI = _ref82.partyI,
          ethBalanceA = _ref82.ethBalanceA,
          ethBalanceI = _ref82.ethBalanceI,
          tokenBalanceA = _ref82.tokenBalanceA,
          tokenBalanceI = _ref82.tokenBalanceI;

      // validate params
      var methodName = 'createChannelStateUpdateFingerprint';
      // validate
      // validatorOpts
      var isHex = { presence: true, isHex: true };
      var isHexStrict = { presence: true, isHexStrict: true };
      var isBN = { presence: true, isBN: true };
      var isAddress = { presence: true, isAddress: true };
      var isPositiveInt = { presence: true, isPositiveInt: true };
      var isBool = { presence: true, isBool: true };
      Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
      Connext.validatorsResponseToError(validate.single(isClose, isBool), methodName, 'isClose');
      Connext.validatorsResponseToError(validate.single(nonce, isPositiveInt), methodName, 'nonce');
      Connext.validatorsResponseToError(validate.single(openVcs, isPositiveInt), methodName, 'openVcs');
      Connext.validatorsResponseToError(validate.single(vcRootHash, isHex), methodName, 'vcRootHash');
      Connext.validatorsResponseToError(validate.single(partyA, isAddress), methodName, 'partyA');
      Connext.validatorsResponseToError(validate.single(partyI, isAddress), methodName, 'partyI');
      Connext.validatorsResponseToError(validate.single(ethBalanceA, isBN), methodName, 'ethBalanceA');
      Connext.validatorsResponseToError(validate.single(ethBalanceI, isBN), methodName, 'ethBalanceI');
      Connext.validatorsResponseToError(validate.single(tokenBalanceA, isBN), methodName, 'tokenBalanceA');
      Connext.validatorsResponseToError(validate.single(tokenBalanceI, isBN), methodName, 'tokenBalanceI');
      // generate state update to sign
      var hash = Web3.utils.soliditySha3({ type: 'bytes32', value: channelId }, { type: 'bool', value: isClose }, { type: 'uint256', value: nonce }, { type: 'uint256', value: openVcs }, { type: 'bytes32', value: vcRootHash }, { type: 'address', value: partyA }, // address will be returned bytepadded
      { type: 'address', value: partyI }, // address is returned bytepadded
      { type: 'uint256', value: ethBalanceA }, { type: 'uint256', value: ethBalanceI }, { type: 'uint256', value: tokenBalanceA }, { type: 'uint256', value: tokenBalanceI });
      return hash;
    }

    /**
     * Recovers the signer from the hashed data generated by the Connext.createChannelStateUpdateFingerprint function.
     *
     * @param {Object} params - the method object
     * @param {String} params.sig - the signature of the data from an unknown agent
     * @param {Boolean} params.isClose - flag indicating whether or not this is closing state
     * @param {String} params.channelId - ID of the ledger channel you are creating a state update for
     * @param {Number} params.nonce - the sequence of the ledger channel update
     * @param {Number} params.openVcs - the number of open virtual channels associated with this ledger channel
     * @param {String} params.vcRootHash - the root hash of the Merkle tree containing all initial states of the open virtual channels
     * @param {String} params.partyA - ETH address of partyA in the ledgerchannel
     * @param {String} params.partyI - ETH address of the hub (Ingrid)
     * @param {Number} params.balanceA - updated balance of partyA
     * @param {Number} params.balanceI - updated balance of partyI
     * @returns {String} the ETH address of the person who signed the data
     */

  }, {
    key: 'recoverSignerFromChannelStateUpdate',
    value: function recoverSignerFromChannelStateUpdate(_ref83) {
      var channelId = _ref83.channelId,
          sig = _ref83.sig,
          isClose = _ref83.isClose,
          nonce = _ref83.nonce,
          openVcs = _ref83.openVcs,
          vcRootHash = _ref83.vcRootHash,
          partyA = _ref83.partyA,
          partyI = _ref83.partyI,
          ethBalanceA = _ref83.ethBalanceA,
          ethBalanceI = _ref83.ethBalanceI,
          tokenBalanceA = _ref83.tokenBalanceA,
          tokenBalanceI = _ref83.tokenBalanceI;

      var methodName = 'recoverSignerFromChannelStateUpdate';
      // validate
      // validatorOpts
      var isHexStrict = { presence: true, isHexStrict: true };
      var isHex = { presence: true, isHex: true };
      var isBN = { presence: true, isBN: true };
      var isAddress = { presence: true, isAddress: true };
      var isPositiveInt = { presence: true, isPositiveInt: true };
      var isBool = { presence: true, isBool: true };
      Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');

      Connext.validatorsResponseToError(validate.single(sig, isHex), methodName, 'sig');

      Connext.validatorsResponseToError(validate.single(isClose, isBool), methodName, 'isClose');

      Connext.validatorsResponseToError(validate.single(nonce, isPositiveInt), methodName, 'nonce');
      Connext.validatorsResponseToError(validate.single(openVcs, isPositiveInt), methodName, 'openVcs');
      Connext.validatorsResponseToError(validate.single(vcRootHash, isHex), methodName, 'vcRootHash');
      Connext.validatorsResponseToError(validate.single(partyA, isAddress), methodName, 'partyA');
      Connext.validatorsResponseToError(validate.single(partyI, isAddress), methodName, 'partyI');
      Connext.validatorsResponseToError(validate.single(ethBalanceA, isBN), methodName, 'ethBalanceA');
      Connext.validatorsResponseToError(validate.single(ethBalanceI, isBN), methodName, 'ethBalanceI');
      Connext.validatorsResponseToError(validate.single(tokenBalanceA, isBN), methodName, 'tokenBalanceA');
      Connext.validatorsResponseToError(validate.single(tokenBalanceI, isBN), methodName, 'tokenBalanceI');

      console.log('recovering signer from:', JSON.stringify({
        sig: sig,
        channelId: channelId,
        isClose: isClose,
        nonce: nonce,
        openVcs: openVcs,
        vcRootHash: vcRootHash,
        partyA: partyA,
        partyI: partyI,
        ethBalanceA: ethBalanceA.toString(),
        ethBalanceI: ethBalanceI.toString(),
        tokenBalanceA: tokenBalanceA.toString(),
        tokenBalanceI: tokenBalanceI.toString()
      }));
      // generate fingerprint
      var fingerprint = Connext.createChannelStateUpdateFingerprint({
        channelId: channelId,
        isClose: isClose,
        nonce: nonce,
        openVcs: openVcs,
        vcRootHash: vcRootHash,
        partyA: partyA,
        partyI: partyI,
        ethBalanceA: ethBalanceA,
        ethBalanceI: ethBalanceI,
        tokenBalanceA: tokenBalanceA,
        tokenBalanceI: tokenBalanceI
      });
      fingerprint = util.toBuffer(fingerprint);

      var prefix = Buffer.from('\x19Ethereum Signed Message:\n');
      var prefixedMsg = util.sha3(Buffer.concat([prefix, Buffer.from(String(fingerprint.length)), fingerprint]));
      var res = util.fromRpcSig(sig);
      var pubKey = util.ecrecover(prefixedMsg, res.v, res.r, res.s);
      var addrBuf = util.pubToAddress(pubKey);
      var addr = util.bufferToHex(addrBuf);

      console.log('recovered:', addr);
      return addr;
    }

    /**
     * Hashes data from a virtual channel state update using soliditySha3.
     *
     * @param {Object} params - the method object
     * @param {String} params.channelId - ID of the virtual channel you are creating a state update for
     * @param {Number} params.nonce - the sequence of the state update
     * @param {String} params.partyA - ETH address of partyA
     * @param {String} params.partyB - ETH address of partyB
     * @param {Number} params.balanceA - updated balance of partyA
     * @param {Number} params.balanceB - updated balance of partyB
     * @returns {String} hash of the virtual channel state data
     */

  }, {
    key: 'createThreadStateUpdateFingerprint',
    value: function createThreadStateUpdateFingerprint(_ref84) {
      var channelId = _ref84.channelId,
          nonce = _ref84.nonce,
          partyA = _ref84.partyA,
          partyB = _ref84.partyB,
          ethBalanceA = _ref84.ethBalanceA,
          ethBalanceB = _ref84.ethBalanceB,
          tokenBalanceA = _ref84.tokenBalanceA,
          tokenBalanceB = _ref84.tokenBalanceB;

      var methodName = 'createThreadStateUpdateFingerprint';
      // typecast balances incase chained
      var isPositiveBnString = { presence: true, isPositiveBnString: true };
      Connext.validatorsResponseToError(validate.single(ethBalanceA, isPositiveBnString), methodName, 'ethBalanceA');
      Connext.validatorsResponseToError(validate.single(ethBalanceB, isPositiveBnString), methodName, 'ethBalanceB');
      Connext.validatorsResponseToError(validate.single(tokenBalanceA, isPositiveBnString), methodName, 'tokenBalanceA');
      Connext.validatorsResponseToError(validate.single(tokenBalanceB, isPositiveBnString), methodName, 'tokenBalanceB');
      ethBalanceA = Web3.utils.toBN(ethBalanceA);
      ethBalanceB = Web3.utils.toBN(ethBalanceB);
      tokenBalanceA = Web3.utils.toBN(tokenBalanceA);
      tokenBalanceB = Web3.utils.toBN(tokenBalanceB);
      // validate
      var isHexStrict = { presence: true, isHexStrict: true };
      var isAddress = { presence: true, isAddress: true };
      var isPositiveInt = { presence: true, isPositiveInt: true };
      Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
      Connext.validatorsResponseToError(validate.single(nonce, isPositiveInt), methodName, 'nonce');
      Connext.validatorsResponseToError(validate.single(partyA, isAddress), methodName, 'partyA');

      Connext.validatorsResponseToError(validate.single(partyB, isAddress), methodName, 'partyB');

      var hubBondEth = ethBalanceA.add(ethBalanceB);
      var hubBondToken = tokenBalanceA.add(tokenBalanceB);

      // generate state update to sign
      var hash = Web3.utils.soliditySha3({ type: 'bytes32', value: channelId }, { type: 'uint256', value: nonce }, { type: 'address', value: partyA }, { type: 'address', value: partyB }, { type: 'uint256', value: hubBondEth }, { type: 'uint256', value: hubBondToken }, { type: 'uint256', value: ethBalanceA }, { type: 'uint256', value: ethBalanceB }, { type: 'uint256', value: tokenBalanceA }, { type: 'uint256', value: tokenBalanceB });
      return hash;
    }

    /**
     * Recovers the signer from the hashed data generated by the Connext.createThreadStateUpdateFingerprint function.
     *
     * @param {Object} params - the method object
     * @param {String} params.sig - signature of the data created in Connext.createThreadStateUpdate
     * @param {String} params.channelId - ID of the virtual channel you are creating a state update for
     * @param {Number} params.nonce - the sequence of the state update
     * @param {String} params.partyA - ETH address of partyA
     * @param {String} params.partyB - ETH address of partyB
     * @param {Number} params.balanceA - updated balance of partyA
     * @param {Number} params.balanceB - updated balance of partyB
     * @returns {String} ETH address of the person who signed the data
     */

  }, {
    key: 'recoverSignerFromThreadStateUpdate',
    value: function recoverSignerFromThreadStateUpdate(_ref85) {
      var sig = _ref85.sig,
          channelId = _ref85.channelId,
          nonce = _ref85.nonce,
          partyA = _ref85.partyA,
          partyB = _ref85.partyB,
          ethBalanceA = _ref85.ethBalanceA,
          ethBalanceB = _ref85.ethBalanceB,
          tokenBalanceA = _ref85.tokenBalanceA,
          tokenBalanceB = _ref85.tokenBalanceB;

      var methodName = 'recoverSignerFromThreadStateUpdate';
      // validate
      // typecast balances incase chained
      var isPositiveBnString = { presence: true, isPositiveBnString: true };
      Connext.validatorsResponseToError(validate.single(ethBalanceA, isPositiveBnString), methodName, 'ethBalanceA');
      Connext.validatorsResponseToError(validate.single(ethBalanceB, isPositiveBnString), methodName, 'ethBalanceB');
      Connext.validatorsResponseToError(validate.single(tokenBalanceA, isPositiveBnString), methodName, 'tokenBalanceA');
      Connext.validatorsResponseToError(validate.single(tokenBalanceB, isPositiveBnString), methodName, 'tokenBalanceB');
      ethBalanceA = Web3.utils.toBN(ethBalanceA);
      ethBalanceB = Web3.utils.toBN(ethBalanceB);
      tokenBalanceA = Web3.utils.toBN(tokenBalanceA);
      tokenBalanceB = Web3.utils.toBN(tokenBalanceB);
      // validatorOpts'
      var isHex = { presence: true, isHex: true };
      var isHexStrict = { presence: true, isHexStrict: true };
      var isBN = { presence: true, isBN: true };
      var isAddress = { presence: true, isAddress: true };
      var isPositiveInt = { presence: true, isPositiveInt: true };

      Connext.validatorsResponseToError(validate.single(sig, isHex), methodName, 'sig');

      Connext.validatorsResponseToError(validate.single(channelId, isHexStrict), methodName, 'channelId');
      Connext.validatorsResponseToError(validate.single(nonce, isPositiveInt), methodName, 'nonce');

      Connext.validatorsResponseToError(validate.single(partyA, isAddress), methodName, 'partyA');

      Connext.validatorsResponseToError(validate.single(partyB, isAddress), methodName, 'partyB');

      console.log('recovering signer from:', JSON.stringify({
        sig: sig,
        channelId: channelId,
        nonce: nonce,
        partyA: partyA,
        partyB: partyB,
        ethBalanceA: ethBalanceA.toString(),
        ethBalanceB: ethBalanceB.toString(),
        tokenBalanceA: tokenBalanceA.toString(),
        tokenBalanceB: tokenBalanceB.toString()
      }));
      var fingerprint = Connext.createThreadStateUpdateFingerprint({
        channelId: channelId,
        nonce: nonce,
        partyA: partyA,
        partyB: partyB,
        ethBalanceA: ethBalanceA,
        ethBalanceB: ethBalanceB,
        tokenBalanceA: tokenBalanceA,
        tokenBalanceB: tokenBalanceB
      });
      fingerprint = util.toBuffer(fingerprint);
      var prefix = Buffer.from('\x19Ethereum Signed Message:\n');
      var prefixedMsg = util.sha3(Buffer.concat([prefix, Buffer.from(String(fingerprint.length)), fingerprint]));
      var res = util.fromRpcSig(sig);
      var pubKey = util.ecrecover(prefixedMsg, res.v, res.r, res.s);
      var addrBuf = util.pubToAddress(pubKey);
      var addr = util.bufferToHex(addrBuf);
      console.log('recovered:', addr);

      return addr;
    }
  }, {
    key: 'generateThreadRootHash',
    value: function generateThreadRootHash(_ref86) {
      var threadInitialStates = _ref86.threadInitialStates;

      var methodName = 'generateThreadRootHash';
      var isArray = { presence: true, isArray: true };
      Connext.validatorsResponseToError(validate.single(threadInitialStates, isArray), methodName, 'threadInitialStates');
      var emptyRootHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
      var threadRootHash = void 0;
      if (threadInitialStates.length === 0) {
        // reset to initial value -- no open VCs
        threadRootHash = emptyRootHash;
      } else {
        var merkle = Connext.generateMerkleTree(threadInitialStates);
        threadRootHash = Utils.bufferToHex(merkle.getRoot());
      }

      return threadRootHash;
    }
  }, {
    key: 'generateMerkleTree',
    value: function generateMerkleTree(threadInitialStates) {
      var methodName = 'generateMerkleTree';
      var isArray = { presence: true, isArray: true };
      Connext.validatorsResponseToError(validate.single(threadInitialStates, isArray), methodName, 'threadInitialStates');
      if (threadInitialStates.length === 0) {
        throw new Error('Cannot create a Merkle tree with 0 leaves.');
      }
      var emptyRootHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
      var merkle = void 0;
      var elems = threadInitialStates.map(function (threadInitialState) {
        // vc0 is the initial state of each vc
        // hash each initial state and convert hash to buffer
        var hash = Connext.createThreadStateUpdateFingerprint(threadInitialState);
        var vcBuf = Utils.hexToBuffer(hash);
        return vcBuf;
      });
      if (elems.length % 2 !== 0) {
        // cant have odd number of leaves
        elems.push(Utils.hexToBuffer(emptyRootHash));
      }
      merkle = new MerkleTree.default(elems);

      return merkle;
    }
  }, {
    key: 'validatorsResponseToError',
    value: function validatorsResponseToError(validatorResponse, methodName, varName) {
      if (validatorResponse !== undefined) {
        throw new ParameterValidationError(methodName, varName, validatorResponse);
      }
    }
  }]);
  return Connext;
}();

module.exports = Connext;