"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.POST = exports.GET = undefined;

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var axios = require("axios");

var GET = exports.GET = "GET";
var POST = exports.POST = "POST";

module.exports = function networking(baseUrl, useAxios) {
  var request = function () {
    var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(url, method, body) {
      var opts, res, data;
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              opts = {
                method: method
              };
              res = void 0;

              if (!(useAxios === false)) {
                _context.next = 11;
                break;
              }

              if (method === POST) {
                opts.body = JSON.stringify(body);
                opts.headers = {
                  "Content-Type": "application/json"
                };
              }
              opts.mode = "cors";
              opts.credentials = "include";
              _context.next = 8;
              return fetch(baseUrl + "/" + url, opts);

            case 8:
              res = _context.sent;
              _context.next = 22;
              break;

            case 11:
              if (method === POST) {
                opts.data = body;
              }
              opts.headers = {
                Authorization: "Bearer " + process.env.HUB_AUTH
              };
              _context.prev = 13;
              _context.next = 16;
              return axios(baseUrl + "/" + url, opts);

            case 16:
              res = _context.sent;
              _context.next = 22;
              break;

            case 19:
              _context.prev = 19;
              _context.t0 = _context["catch"](13);

              res = _context.t0.response;

            case 22:
              if (!(res.status < 200 || res.status > 299)) {
                _context.next = 24;
                break;
              }

              throw errorResponse(res.status, res.body, "Received non-200 response: " + res.status);

            case 24:
              if (!(res.status === 204)) {
                _context.next = 26;
                break;
              }

              return _context.abrupt("return", {
                data: null
              });

            case 26:
              if (!useAxios) {
                _context.next = 30;
                break;
              }

              _context.t1 = res.data;
              _context.next = 33;
              break;

            case 30:
              _context.next = 32;
              return res.json();

            case 32:
              _context.t1 = _context.sent;

            case 33:
              data = _context.t1;
              return _context.abrupt("return", {
                data: data
              });

            case 35:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this, [[13, 19]]);
    }));

    return function request(_x, _x2, _x3) {
      return _ref.apply(this, arguments);
    };
  }();

  return {
    get: get,
    post: post
  };

  function get(url) {
    return request(url, GET);
  }

  function post(url, body) {
    return request(url, POST, body);
  }
};

function errorResponse(status, body, message) {
  return {
    status: status,
    body: body,
    message: message
  };
}