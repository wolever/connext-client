'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ParameterValidationError = exports.ContractError = exports.ChannelOpenError = exports.ThreadOpenError = exports.ChannelUpdateError = exports.ThreadUpdateError = exports.ChannelCloseError = exports.ThreadCloseError = undefined;

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

exports.validateTipPurchaseMeta = validateTipPurchaseMeta;
exports.validatePurchasePurchaseMeta = validatePurchasePurchaseMeta;
exports.validateBalance = validateBalance;
exports.validateWithdrawalPurchaseMeta = validateWithdrawalPurchaseMeta;
exports.validateExchangePurchaseMeta = validateExchangePurchaseMeta;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Web3 = require('web3');

var ThreadCloseError = exports.ThreadCloseError = function (_Error) {
  (0, _inherits3.default)(ThreadCloseError, _Error);

  function ThreadCloseError() {
    (0, _classCallCheck3.default)(this, ThreadCloseError);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var _this = (0, _possibleConstructorReturn3.default)(this, (ThreadCloseError.__proto__ || Object.getPrototypeOf(ThreadCloseError)).call(this, args));
    // [methodName, statusCode, message]


    _this.name = 'ChannelCloseError';
    if (args.length === 3) {
      _this.methodName = args[0];
      _this.statusCode = args[1];
      _this.message = '[' + args[1] + ': ' + args[0] + '] ' + args[2];
    } else if (args.length == 2) {
      _this.methodName = args[0];
      _this.statusCode = 650;
      _this.message = '[' + _this.statusCode + ': ' + args[0] + '] ' + args[1];
    }
    Error.captureStackTrace(_this, ThreadCloseError);
    return _this;
  }

  return ThreadCloseError;
}(Error);

var ChannelCloseError = exports.ChannelCloseError = function (_Error2) {
  (0, _inherits3.default)(ChannelCloseError, _Error2);

  function ChannelCloseError() {
    (0, _classCallCheck3.default)(this, ChannelCloseError);

    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    var _this2 = (0, _possibleConstructorReturn3.default)(this, (ChannelCloseError.__proto__ || Object.getPrototypeOf(ChannelCloseError)).call(this, args));
    // [methodName, statusCode, message]


    _this2.name = 'ChannelCloseError';
    if (args.length === 3) {
      _this2.methodName = args[0];
      _this2.statusCode = args[1];
      _this2.message = '[' + args[1] + ': ' + args[0] + '] ' + args[2];
    } else if (args.length == 2) {
      _this2.methodName = args[0];
      _this2.statusCode = 600;
      _this2.message = '[' + _this2.statusCode + ': ' + args[0] + '] ' + args[1];
    }
    Error.captureStackTrace(_this2, ChannelCloseError);
    return _this2;
  }

  return ChannelCloseError;
}(Error);

var ThreadUpdateError = exports.ThreadUpdateError = function (_Error3) {
  (0, _inherits3.default)(ThreadUpdateError, _Error3);

  function ThreadUpdateError() {
    (0, _classCallCheck3.default)(this, ThreadUpdateError);

    for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    var _this3 = (0, _possibleConstructorReturn3.default)(this, (ThreadUpdateError.__proto__ || Object.getPrototypeOf(ThreadUpdateError)).call(this, args));
    // [methodName, statusCode, message]


    _this3.name = 'UpdateStateError';
    if (args.length === 3) {
      _this3.methodName = args[0];
      _this3.statusCode = args[1];
      _this3.message = '[' + args[1] + ': ' + args[0] + '] ' + args[2];
    } else if (args.length == 2) {
      _this3.methodName = args[0];
      _this3.statusCode = 550;
      _this3.message = '[' + _this3.statusCode + ': ' + args[0] + '] ' + args[1];
    }
    Error.captureStackTrace(_this3, ThreadUpdateError);
    return _this3;
  }

  return ThreadUpdateError;
}(Error);

var ChannelUpdateError = exports.ChannelUpdateError = function (_Error4) {
  (0, _inherits3.default)(ChannelUpdateError, _Error4);

  function ChannelUpdateError() {
    (0, _classCallCheck3.default)(this, ChannelUpdateError);

    for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      args[_key4] = arguments[_key4];
    }

    var _this4 = (0, _possibleConstructorReturn3.default)(this, (ChannelUpdateError.__proto__ || Object.getPrototypeOf(ChannelUpdateError)).call(this, args));
    // [methodName, statusCode, message]


    _this4.name = 'UpdateStateError';
    if (args.length === 3) {
      _this4.methodName = args[0];
      _this4.statusCode = args[1];
      _this4.message = '[' + args[1] + ': ' + args[0] + '] ' + args[2];
    } else if (args.length == 2) {
      _this4.methodName = args[0];
      _this4.statusCode = 500;
      _this4.message = '[' + _this4.statusCode + ': ' + args[0] + '] ' + args[1];
    }
    Error.captureStackTrace(_this4, ChannelUpdateError);
    return _this4;
  }

  return ChannelUpdateError;
}(Error);

var ThreadOpenError = exports.ThreadOpenError = function (_Error5) {
  (0, _inherits3.default)(ThreadOpenError, _Error5);

  function ThreadOpenError() {
    (0, _classCallCheck3.default)(this, ThreadOpenError);

    for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      args[_key5] = arguments[_key5];
    }

    var _this5 = (0, _possibleConstructorReturn3.default)(this, (ThreadOpenError.__proto__ || Object.getPrototypeOf(ThreadOpenError)).call(this, args));
    // [methodName, statusCode, message]


    _this5.name = 'ThreadOpenError';
    _this5.methodName = args[0];
    if (args.length === 3) {
      _this5.statusCode = args[1];
      _this5.message = '[' + args[1] + ': ' + args[0] + '] ' + args[2];
    } else if (args.length == 2) {
      _this5.statusCode = 450;
      _this5.message = '[' + _this5.statusCode + ': ' + args[0] + '] ' + args[1];
    }
    Error.captureStackTrace(_this5, ThreadOpenError);
    return _this5;
  }

  return ThreadOpenError;
}(Error);

var ChannelOpenError = exports.ChannelOpenError = function (_Error6) {
  (0, _inherits3.default)(ChannelOpenError, _Error6);

  function ChannelOpenError() {
    (0, _classCallCheck3.default)(this, ChannelOpenError);

    for (var _len6 = arguments.length, args = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
      args[_key6] = arguments[_key6];
    }

    var _this6 = (0, _possibleConstructorReturn3.default)(this, (ChannelOpenError.__proto__ || Object.getPrototypeOf(ChannelOpenError)).call(this, args));
    // [methodName, statusCode, message]


    _this6.name = 'ChannelOpenError';
    if (args.length === 3) {
      _this6.methodName = args[0];
      _this6.statusCode = args[1];
      _this6.message = '[' + args[1] + ': ' + args[0] + '] ' + args[2];
    } else if (args.length == 2) {
      _this6.methodName = args[0];
      _this6.statusCode = 400;
      _this6.message = '[' + _this6.statusCode + ': ' + args[0] + '] ' + args[1];
    }
    Error.captureStackTrace(_this6, ChannelOpenError);
    return _this6;
  }

  return ChannelOpenError;
}(Error);

var ContractError = exports.ContractError = function (_Error7) {
  (0, _inherits3.default)(ContractError, _Error7);

  function ContractError() {
    var _ref;

    (0, _classCallCheck3.default)(this, ContractError);

    for (var _len7 = arguments.length, args = Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
      args[_key7] = arguments[_key7];
    }

    var _this7 = (0, _possibleConstructorReturn3.default)(this, (_ref = ContractError.__proto__ || Object.getPrototypeOf(ContractError)).call.apply(_ref, [this].concat(args)));

    _this7.name = _this7.constructor.name;
    _this7.methodName = args[0];
    if (args.length === 4) {
      // [methodName, statusCode, transactionHash, message]
      _this7.statusCode = args[1];
      _this7.transactionHash = args[2];
      _this7.message = '[' + args[1] + ': ' + args[0] + '] ' + args[3] + '. Tx: ' + args[2];
    } else if (args.length === 3) {
      // [methodName, statusCode, message]
      _this7.statusCode = args[1];
      _this7.transactionHash = args[2];
      _this7.message = '[' + args[1] + ': ' + args[0] + '] ' + args[2];
    } else if (args.length === 2) {
      // [methodName, message]
      _this7.statusCode = 300;
      _this7.message = '[' + _this7.statusCode + ': ' + args[0] + '] ' + args[1];
    }
    return _this7;
  }

  return ContractError;
}(Error);

var ParameterValidationError = exports.ParameterValidationError = function (_Error8) {
  (0, _inherits3.default)(ParameterValidationError, _Error8);

  function ParameterValidationError() {
    var _ref2;

    (0, _classCallCheck3.default)(this, ParameterValidationError);

    for (var _len8 = arguments.length, args = Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
      args[_key8] = arguments[_key8];
    }

    var _this8 = (0, _possibleConstructorReturn3.default)(this, (_ref2 = ParameterValidationError.__proto__ || Object.getPrototypeOf(ParameterValidationError)).call.apply(_ref2, [this].concat(args)));
    // [methodName, variableName, validatorResponse]


    _this8.name = _this8.constructor.name;
    _this8.statusCode = 200;
    _this8.methodName = args[0];
    _this8.variableName = args[1];
    _this8.message = '[' + args[0] + '][' + args[1] + '] : ' + args[2];
    Error.captureStackTrace(_this8, ParameterValidationError);
    return _this8;
  }

  return ParameterValidationError;
}(Error);

function validateTipPurchaseMeta(meta) {
  if (!meta.fields) {
    return false;
  }
  var _meta$fields = meta.fields,
      streamId = _meta$fields.streamId,
      performerId = _meta$fields.performerId,
      performerName = _meta$fields.performerName;

  if (!streamId || !performerId || !performerName) {
    return false;
  } else {
    return true;
  }
}

function validatePurchasePurchaseMeta(meta) {
  if (!meta.fields) {
    return false;
  }
  var _meta$fields2 = meta.fields,
      productSku = _meta$fields2.productSku,
      productName = _meta$fields2.productName;

  if (!productSku || !productName) {
    return false;
  } else {
    return true;
  }
}

function validateBalance(value) {
  if (!value) {
    return false;
  }
  if (!Web3.utils.isBN(value) || value.isNeg()) {
    return false;
  } else {
    return true;
  }
}

function validateWithdrawalPurchaseMeta(meta) {
  if (!meta.fields) {
    return false;
  }
  var recipient = meta.fields.recipient;

  return !!recipient && Web3.utils.isAddress(recipient);
}

function validateExchangePurchaseMeta(meta) {
  return !!meta.exchangeRate;
}