'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Buffer = require('buffer').Buffer;
var util = require('ethereumjs-util');
var Web3 = require('web3');

module.exports = {
  latestTime: function latestTime() {
    return web3.eth.getBlock('latest').timestamp;
  },

  increaseTime: function increaseTime(duration) {
    var id = Date.now();

    return new Promise(function (resolve, reject) {
      web3.currentProvider.sendAsync({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [duration],
        id: id
      }, function (e1) {
        if (e1) return reject(e1);

        web3.currentProvider.sendAsync({
          jsonrpc: '2.0',
          method: 'evm_mine',
          id: id + 1
        }, function (e2, res) {
          return e2 ? reject(e2) : resolve(res);
        });
      });
    });
  },

  increaseTimeTo: function increaseTimeTo(target) {
    var now = this.latestTime();
    if (target < now) {
      throw Error('Cannot increase current time(' + now + ') to a moment in the past(' + target + ')');
    }
    var diff = target - now;
    return this.increaseTime(diff);
  },

  assertThrowsAsync: function () {
    var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(fn, regExp) {
      var f;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              f = function f() {};

              _context.prev = 1;
              _context.next = 4;
              return fn();

            case 4:
              _context.next = 9;
              break;

            case 6:
              _context.prev = 6;
              _context.t0 = _context['catch'](1);

              f = function f() {
                throw _context.t0;
              };

            case 9:
              _context.prev = 9;

              assert.throws(f, regExp);
              return _context.finish(9);

            case 12:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, this, [[1, 6, 9, 12]]);
    }));

    function assertThrowsAsync(_x, _x2) {
      return _ref.apply(this, arguments);
    }

    return assertThrowsAsync;
  }(),

  duration: {
    seconds: function seconds(val) {
      return val;
    },
    minutes: function minutes(val) {
      return val * this.seconds(60);
    },
    hours: function hours(val) {
      return val * this.minutes(60);
    },
    days: function days(val) {
      return val * this.hours(24);
    },
    weeks: function weeks(val) {
      return val * this.days(7);
    },
    years: function years(val) {
      return val * this.days(365);
    }
  },

  getBytes: function getBytes(input) {
    if (Buffer.isBuffer(input)) input = '0x' + input.toString('hex');
    if (66 - input.length <= 0) return Web3.utils.toHex(input);
    return this.padBytes32(Web3.utils.toHex(input));
  },

  marshallState: function marshallState(inputs) {
    var m = this.getBytes(inputs[0]);

    for (var i = 1; i < inputs.length; i++) {
      var x = this.getBytes(inputs[i]);
      m += x.substr(2, x.length);
    }
    return m;
  },

  getCTFaddress: function () {
    var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(_r) {
      return _regenerator2.default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              return _context2.abrupt('return', web3.sha3(_r, { encoding: 'hex' }));

            case 1:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, this);
    }));

    function getCTFaddress(_x3) {
      return _ref2.apply(this, arguments);
    }

    return getCTFaddress;
  }(),

  getCTFstate: function () {
    var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(_contract, _signers, _args) {
      var _m, _r;

      return _regenerator2.default.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              _args.unshift(_contract);
              _m = this.marshallState(_args);

              _signers.push(_contract.length);
              _signers.push(_m);
              _r = this.marshallState(_signers);
              return _context3.abrupt('return', _r);

            case 6:
            case 'end':
              return _context3.stop();
          }
        }
      }, _callee3, this);
    }));

    function getCTFstate(_x4, _x5, _x6) {
      return _ref3.apply(this, arguments);
    }

    return getCTFstate;
  }(),

  padBytes32: function padBytes32(data) {
    // TODO: check input is hex / move to TS
    var l = 66 - data.length;

    var x = data.substr(2, data.length);

    for (var i = 0; i < l; i++) {
      x = 0 + x;
    }
    return '0x' + x;
  },

  rightPadBytes32: function rightPadBytes32(data) {
    var l = 66 - data.length;

    for (var i = 0; i < l; i++) {
      data += 0;
    }
    return data;
  },

  hexToBuffer: function hexToBuffer(hexString) {
    return new Buffer(hexString.substr(2, hexString.length), 'hex');
  },

  bufferToHex: function bufferToHex(buffer) {
    return '0x' + buffer.toString('hex');
  },

  isHash: function isHash(buffer) {
    return buffer.length === 32 && Buffer.isBuffer(buffer);
  }
};