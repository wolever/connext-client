'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Buffer = require('buffer').Buffer;
var util = require('ethereumjs-util');
var localUtils = require('./utils');

function combinedHash(first, second) {
  if (!second) {
    return first;
  }
  if (!first) {
    return second;
  }
  var sorted = Buffer.concat([first, second].sort(Buffer.compare));

  return util.sha3(sorted);
}

function deduplicate(buffers) {
  return buffers.filter(function (buffer, i) {
    return buffers.findIndex(function (e) {
      return e.equals(buffer);
    }) === i;
  });
}

function getPair(index, layer) {
  var pairIndex = index % 2 ? index - 1 : index + 1;
  if (pairIndex < layer.length) {
    return layer[pairIndex];
  } else {
    return null;
  }
}

function getLayers(elements) {
  if (elements.length === 0) {
    return [[Buffer.from('')]];
  }
  var layers = [];
  layers.push(elements);
  while (layers[layers.length - 1].length > 1) {
    layers.push(getNextLayer(layers[layers.length - 1]));
  }
  return layers;
}

function getNextLayer(elements) {
  return elements.reduce(function (layer, element, index, arr) {
    if (index % 2 === 0) {
      layer.push(combinedHash(element, arr[index + 1]));
    }
    return layer;
  }, []);
}

var MerkleTree = function () {
  function MerkleTree(_elements) {
    (0, _classCallCheck3.default)(this, MerkleTree);

    if (!_elements.every(localUtils.isHash)) {
      throw new Error('elements must be 32 byte buffers');
    }
    var e = { elements: deduplicate(_elements) };
    Object.assign(this, e);
    this.elements.sort(Buffer.compare);

    var l = { layers: getLayers(this.elements) };
    Object.assign(this, l);
  }

  (0, _createClass3.default)(MerkleTree, [{
    key: 'getRoot',
    value: function getRoot() {
      if (!this.root) {
        var r = { root: this.layers[this.layers.length - 1][0] };
        Object.assign(this, r);
      }
      return this.root;
    }
  }, {
    key: 'verify',
    value: function verify(proof, element) {
      return this.root.equals(proof.reduce(function (hash, pair) {
        return combinedHash(hash, pair);
      }, element));
    }
  }, {
    key: 'proof',
    value: function proof(element) {
      var index = this.elements.findIndex(function (e) {
        return e.equals(element);
      });

      if (index === -1) {
        throw new Error('element not found in merkle tree');
      }

      return this.layers.reduce(function (proof, layer) {
        var pair = getPair(index, layer);
        if (pair) {
          proof.push(pair);
        }
        index = Math.floor(index / 2);
        return proof;
      }, []);
    }
  }]);
  return MerkleTree;
}();

exports.default = MerkleTree;