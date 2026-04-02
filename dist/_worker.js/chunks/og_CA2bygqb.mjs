globalThis.process ??= {}; globalThis.process.env ??= {};
import { j as jsxRuntimeExports } from './jsx-runtime_DoH26EBh.mjs';
import { l as getDefaultExportFromCjs } from './astro/server_DD7PPlaL.mjs';

var tinyInflate;
var hasRequiredTinyInflate;

function requireTinyInflate () {
	if (hasRequiredTinyInflate) return tinyInflate;
	hasRequiredTinyInflate = 1;
	var TINF_OK = 0;
	var TINF_DATA_ERROR = -3;

	function Tree() {
	  this.table = new Uint16Array(16);   /* table of code length counts */
	  this.trans = new Uint16Array(288);  /* code -> symbol translation table */
	}

	function Data(source, dest) {
	  this.source = source;
	  this.sourceIndex = 0;
	  this.tag = 0;
	  this.bitcount = 0;
	  
	  this.dest = dest;
	  this.destLen = 0;
	  
	  this.ltree = new Tree();  /* dynamic length/symbol tree */
	  this.dtree = new Tree();  /* dynamic distance tree */
	}

	/* --------------------------------------------------- *
	 * -- uninitialized global data (static structures) -- *
	 * --------------------------------------------------- */

	var sltree = new Tree();
	var sdtree = new Tree();

	/* extra bits and base tables for length codes */
	var length_bits = new Uint8Array(30);
	var length_base = new Uint16Array(30);

	/* extra bits and base tables for distance codes */
	var dist_bits = new Uint8Array(30);
	var dist_base = new Uint16Array(30);

	/* special ordering of code length codes */
	var clcidx = new Uint8Array([
	  16, 17, 18, 0, 8, 7, 9, 6,
	  10, 5, 11, 4, 12, 3, 13, 2,
	  14, 1, 15
	]);

	/* used by tinf_decode_trees, avoids allocations every call */
	var code_tree = new Tree();
	var lengths = new Uint8Array(288 + 32);

	/* ----------------------- *
	 * -- utility functions -- *
	 * ----------------------- */

	/* build extra bits and base tables */
	function tinf_build_bits_base(bits, base, delta, first) {
	  var i, sum;

	  /* build bits table */
	  for (i = 0; i < delta; ++i) bits[i] = 0;
	  for (i = 0; i < 30 - delta; ++i) bits[i + delta] = i / delta | 0;

	  /* build base table */
	  for (sum = first, i = 0; i < 30; ++i) {
	    base[i] = sum;
	    sum += 1 << bits[i];
	  }
	}

	/* build the fixed huffman trees */
	function tinf_build_fixed_trees(lt, dt) {
	  var i;

	  /* build fixed length tree */
	  for (i = 0; i < 7; ++i) lt.table[i] = 0;

	  lt.table[7] = 24;
	  lt.table[8] = 152;
	  lt.table[9] = 112;

	  for (i = 0; i < 24; ++i) lt.trans[i] = 256 + i;
	  for (i = 0; i < 144; ++i) lt.trans[24 + i] = i;
	  for (i = 0; i < 8; ++i) lt.trans[24 + 144 + i] = 280 + i;
	  for (i = 0; i < 112; ++i) lt.trans[24 + 144 + 8 + i] = 144 + i;

	  /* build fixed distance tree */
	  for (i = 0; i < 5; ++i) dt.table[i] = 0;

	  dt.table[5] = 32;

	  for (i = 0; i < 32; ++i) dt.trans[i] = i;
	}

	/* given an array of code lengths, build a tree */
	var offs = new Uint16Array(16);

	function tinf_build_tree(t, lengths, off, num) {
	  var i, sum;

	  /* clear code length count table */
	  for (i = 0; i < 16; ++i) t.table[i] = 0;

	  /* scan symbol lengths, and sum code length counts */
	  for (i = 0; i < num; ++i) t.table[lengths[off + i]]++;

	  t.table[0] = 0;

	  /* compute offset table for distribution sort */
	  for (sum = 0, i = 0; i < 16; ++i) {
	    offs[i] = sum;
	    sum += t.table[i];
	  }

	  /* create code->symbol translation table (symbols sorted by code) */
	  for (i = 0; i < num; ++i) {
	    if (lengths[off + i]) t.trans[offs[lengths[off + i]]++] = i;
	  }
	}

	/* ---------------------- *
	 * -- decode functions -- *
	 * ---------------------- */

	/* get one bit from source stream */
	function tinf_getbit(d) {
	  /* check if tag is empty */
	  if (!d.bitcount--) {
	    /* load next tag */
	    d.tag = d.source[d.sourceIndex++];
	    d.bitcount = 7;
	  }

	  /* shift bit out of tag */
	  var bit = d.tag & 1;
	  d.tag >>>= 1;

	  return bit;
	}

	/* read a num bit value from a stream and add base */
	function tinf_read_bits(d, num, base) {
	  if (!num)
	    return base;

	  while (d.bitcount < 24) {
	    d.tag |= d.source[d.sourceIndex++] << d.bitcount;
	    d.bitcount += 8;
	  }

	  var val = d.tag & (0xffff >>> (16 - num));
	  d.tag >>>= num;
	  d.bitcount -= num;
	  return val + base;
	}

	/* given a data stream and a tree, decode a symbol */
	function tinf_decode_symbol(d, t) {
	  while (d.bitcount < 24) {
	    d.tag |= d.source[d.sourceIndex++] << d.bitcount;
	    d.bitcount += 8;
	  }
	  
	  var sum = 0, cur = 0, len = 0;
	  var tag = d.tag;

	  /* get more bits while code value is above sum */
	  do {
	    cur = 2 * cur + (tag & 1);
	    tag >>>= 1;
	    ++len;

	    sum += t.table[len];
	    cur -= t.table[len];
	  } while (cur >= 0);
	  
	  d.tag = tag;
	  d.bitcount -= len;

	  return t.trans[sum + cur];
	}

	/* given a data stream, decode dynamic trees from it */
	function tinf_decode_trees(d, lt, dt) {
	  var hlit, hdist, hclen;
	  var i, num, length;

	  /* get 5 bits HLIT (257-286) */
	  hlit = tinf_read_bits(d, 5, 257);

	  /* get 5 bits HDIST (1-32) */
	  hdist = tinf_read_bits(d, 5, 1);

	  /* get 4 bits HCLEN (4-19) */
	  hclen = tinf_read_bits(d, 4, 4);

	  for (i = 0; i < 19; ++i) lengths[i] = 0;

	  /* read code lengths for code length alphabet */
	  for (i = 0; i < hclen; ++i) {
	    /* get 3 bits code length (0-7) */
	    var clen = tinf_read_bits(d, 3, 0);
	    lengths[clcidx[i]] = clen;
	  }

	  /* build code length tree */
	  tinf_build_tree(code_tree, lengths, 0, 19);

	  /* decode code lengths for the dynamic trees */
	  for (num = 0; num < hlit + hdist;) {
	    var sym = tinf_decode_symbol(d, code_tree);

	    switch (sym) {
	      case 16:
	        /* copy previous code length 3-6 times (read 2 bits) */
	        var prev = lengths[num - 1];
	        for (length = tinf_read_bits(d, 2, 3); length; --length) {
	          lengths[num++] = prev;
	        }
	        break;
	      case 17:
	        /* repeat code length 0 for 3-10 times (read 3 bits) */
	        for (length = tinf_read_bits(d, 3, 3); length; --length) {
	          lengths[num++] = 0;
	        }
	        break;
	      case 18:
	        /* repeat code length 0 for 11-138 times (read 7 bits) */
	        for (length = tinf_read_bits(d, 7, 11); length; --length) {
	          lengths[num++] = 0;
	        }
	        break;
	      default:
	        /* values 0-15 represent the actual code lengths */
	        lengths[num++] = sym;
	        break;
	    }
	  }

	  /* build dynamic trees */
	  tinf_build_tree(lt, lengths, 0, hlit);
	  tinf_build_tree(dt, lengths, hlit, hdist);
	}

	/* ----------------------------- *
	 * -- block inflate functions -- *
	 * ----------------------------- */

	/* given a stream and two trees, inflate a block of data */
	function tinf_inflate_block_data(d, lt, dt) {
	  while (1) {
	    var sym = tinf_decode_symbol(d, lt);

	    /* check for end of block */
	    if (sym === 256) {
	      return TINF_OK;
	    }

	    if (sym < 256) {
	      d.dest[d.destLen++] = sym;
	    } else {
	      var length, dist, offs;
	      var i;

	      sym -= 257;

	      /* possibly get more bits from length code */
	      length = tinf_read_bits(d, length_bits[sym], length_base[sym]);

	      dist = tinf_decode_symbol(d, dt);

	      /* possibly get more bits from distance code */
	      offs = d.destLen - tinf_read_bits(d, dist_bits[dist], dist_base[dist]);

	      /* copy match */
	      for (i = offs; i < offs + length; ++i) {
	        d.dest[d.destLen++] = d.dest[i];
	      }
	    }
	  }
	}

	/* inflate an uncompressed block of data */
	function tinf_inflate_uncompressed_block(d) {
	  var length, invlength;
	  var i;
	  
	  /* unread from bitbuffer */
	  while (d.bitcount > 8) {
	    d.sourceIndex--;
	    d.bitcount -= 8;
	  }

	  /* get length */
	  length = d.source[d.sourceIndex + 1];
	  length = 256 * length + d.source[d.sourceIndex];

	  /* get one's complement of length */
	  invlength = d.source[d.sourceIndex + 3];
	  invlength = 256 * invlength + d.source[d.sourceIndex + 2];

	  /* check length */
	  if (length !== (~invlength & 0x0000ffff))
	    return TINF_DATA_ERROR;

	  d.sourceIndex += 4;

	  /* copy block */
	  for (i = length; i; --i)
	    d.dest[d.destLen++] = d.source[d.sourceIndex++];

	  /* make sure we start next block on a byte boundary */
	  d.bitcount = 0;

	  return TINF_OK;
	}

	/* inflate stream from source to dest */
	function tinf_uncompress(source, dest) {
	  var d = new Data(source, dest);
	  var bfinal, btype, res;

	  do {
	    /* read final block flag */
	    bfinal = tinf_getbit(d);

	    /* read block type (2 bits) */
	    btype = tinf_read_bits(d, 2, 0);

	    /* decompress block */
	    switch (btype) {
	      case 0:
	        /* decompress uncompressed block */
	        res = tinf_inflate_uncompressed_block(d);
	        break;
	      case 1:
	        /* decompress block with fixed huffman trees */
	        res = tinf_inflate_block_data(d, sltree, sdtree);
	        break;
	      case 2:
	        /* decompress block with dynamic huffman trees */
	        tinf_decode_trees(d, d.ltree, d.dtree);
	        res = tinf_inflate_block_data(d, d.ltree, d.dtree);
	        break;
	      default:
	        res = TINF_DATA_ERROR;
	    }

	    if (res !== TINF_OK)
	      throw new Error('Data error');

	  } while (!bfinal);

	  if (d.destLen < d.dest.length) {
	    if (typeof d.dest.slice === 'function')
	      return d.dest.slice(0, d.destLen);
	    else
	      return d.dest.subarray(0, d.destLen);
	  }
	  
	  return d.dest;
	}

	/* -------------------- *
	 * -- initialization -- *
	 * -------------------- */

	/* build fixed huffman trees */
	tinf_build_fixed_trees(sltree, sdtree);

	/* build extra bits and base tables */
	tinf_build_bits_base(length_bits, length_base, 4, 3);
	tinf_build_bits_base(dist_bits, dist_base, 2, 1);

	/* fix a special case */
	length_bits[28] = 0;
	length_base[28] = 258;

	tinyInflate = tinf_uncompress;
	return tinyInflate;
}

var swap_1;
var hasRequiredSwap;

function requireSwap () {
	if (hasRequiredSwap) return swap_1;
	hasRequiredSwap = 1;
	const isBigEndian = (new Uint8Array(new Uint32Array([0x12345678]).buffer)[0] === 0x12);

	const swap = (b, n, m) => {
	  let i = b[n];
	  b[n] = b[m];
	  b[m] = i;
	};

	const swap32 = array => {
	  const len = array.length;
	  for (let i = 0; i < len; i += 4) {
	    swap(array, i, i + 3);
	    swap(array, i + 1, i + 2);
	  }
	};

	const swap32LE = array => {
	  if (isBigEndian) {
	    swap32(array);
	  }
	};

	swap_1 = {
	  swap32LE: swap32LE
	};
	return swap_1;
}

var unicodeTrie;
var hasRequiredUnicodeTrie;

function requireUnicodeTrie () {
	if (hasRequiredUnicodeTrie) return unicodeTrie;
	hasRequiredUnicodeTrie = 1;
	const inflate = requireTinyInflate();
	const { swap32LE } = requireSwap();

	// Shift size for getting the index-1 table offset.
	const SHIFT_1 = 6 + 5;

	// Shift size for getting the index-2 table offset.
	const SHIFT_2 = 5;

	// Difference between the two shift sizes,
	// for getting an index-1 offset from an index-2 offset. 6=11-5
	const SHIFT_1_2 = SHIFT_1 - SHIFT_2;

	// Number of index-1 entries for the BMP. 32=0x20
	// This part of the index-1 table is omitted from the serialized form.
	const OMITTED_BMP_INDEX_1_LENGTH = 0x10000 >> SHIFT_1;

	// Number of entries in an index-2 block. 64=0x40
	const INDEX_2_BLOCK_LENGTH = 1 << SHIFT_1_2;

	// Mask for getting the lower bits for the in-index-2-block offset. */
	const INDEX_2_MASK = INDEX_2_BLOCK_LENGTH - 1;

	// Shift size for shifting left the index array values.
	// Increases possible data size with 16-bit index values at the cost
	// of compactability.
	// This requires data blocks to be aligned by DATA_GRANULARITY.
	const INDEX_SHIFT = 2;

	// Number of entries in a data block. 32=0x20
	const DATA_BLOCK_LENGTH = 1 << SHIFT_2;

	// Mask for getting the lower bits for the in-data-block offset.
	const DATA_MASK = DATA_BLOCK_LENGTH - 1;

	// The part of the index-2 table for U+D800..U+DBFF stores values for
	// lead surrogate code _units_ not code _points_.
	// Values for lead surrogate code _points_ are indexed with this portion of the table.
	// Length=32=0x20=0x400>>SHIFT_2. (There are 1024=0x400 lead surrogates.)
	const LSCP_INDEX_2_OFFSET = 0x10000 >> SHIFT_2;
	const LSCP_INDEX_2_LENGTH = 0x400 >> SHIFT_2;

	// Count the lengths of both BMP pieces. 2080=0x820
	const INDEX_2_BMP_LENGTH = LSCP_INDEX_2_OFFSET + LSCP_INDEX_2_LENGTH;

	// The 2-byte UTF-8 version of the index-2 table follows at offset 2080=0x820.
	// Length 32=0x20 for lead bytes C0..DF, regardless of SHIFT_2.
	const UTF8_2B_INDEX_2_OFFSET = INDEX_2_BMP_LENGTH;
	const UTF8_2B_INDEX_2_LENGTH = 0x800 >> 6;  // U+0800 is the first code point after 2-byte UTF-8

	// The index-1 table, only used for supplementary code points, at offset 2112=0x840.
	// Variable length, for code points up to highStart, where the last single-value range starts.
	// Maximum length 512=0x200=0x100000>>SHIFT_1.
	// (For 0x100000 supplementary code points U+10000..U+10ffff.)
	//
	// The part of the index-2 table for supplementary code points starts
	// after this index-1 table.
	//
	// Both the index-1 table and the following part of the index-2 table
	// are omitted completely if there is only BMP data.
	const INDEX_1_OFFSET = UTF8_2B_INDEX_2_OFFSET + UTF8_2B_INDEX_2_LENGTH;

	// The alignment size of a data block. Also the granularity for compaction.
	const DATA_GRANULARITY = 1 << INDEX_SHIFT;

	class UnicodeTrie {
	  constructor(data) {
	    const isBuffer = (typeof data.readUInt32BE === 'function') && (typeof data.slice === 'function');

	    if (isBuffer || data instanceof Uint8Array) {
	      // read binary format
	      let uncompressedLength;
	      if (isBuffer) {
	        this.highStart = data.readUInt32LE(0);
	        this.errorValue = data.readUInt32LE(4);
	        uncompressedLength = data.readUInt32LE(8);
	        data = data.slice(12);
	      } else {
	        const view = new DataView(data.buffer);
	        this.highStart = view.getUint32(0, true);
	        this.errorValue = view.getUint32(4, true);
	        uncompressedLength = view.getUint32(8, true);
	        data = data.subarray(12);
	      }

	      // double inflate the actual trie data
	      data = inflate(data, new Uint8Array(uncompressedLength));
	      data = inflate(data, new Uint8Array(uncompressedLength));

	      // swap bytes from little-endian
	      swap32LE(data);

	      this.data = new Uint32Array(data.buffer);

	    } else {
	      // pre-parsed data
	      ({ data: this.data, highStart: this.highStart, errorValue: this.errorValue } = data);
	    }
	  }

	  get(codePoint) {
	    let index;
	    if ((codePoint < 0) || (codePoint > 0x10ffff)) {
	      return this.errorValue;
	    }

	    if ((codePoint < 0xd800) || ((codePoint > 0xdbff) && (codePoint <= 0xffff))) {
	      // Ordinary BMP code point, excluding leading surrogates.
	      // BMP uses a single level lookup.  BMP index starts at offset 0 in the index.
	      // data is stored in the index array itself.
	      index = (this.data[codePoint >> SHIFT_2] << INDEX_SHIFT) + (codePoint & DATA_MASK);
	      return this.data[index];
	    }

	    if (codePoint <= 0xffff) {
	      // Lead Surrogate Code Point.  A Separate index section is stored for
	      // lead surrogate code units and code points.
	      //   The main index has the code unit data.
	      //   For this function, we need the code point data.
	      index = (this.data[LSCP_INDEX_2_OFFSET + ((codePoint - 0xd800) >> SHIFT_2)] << INDEX_SHIFT) + (codePoint & DATA_MASK);
	      return this.data[index];
	    }

	    if (codePoint < this.highStart) {
	      // Supplemental code point, use two-level lookup.
	      index = this.data[(INDEX_1_OFFSET - OMITTED_BMP_INDEX_1_LENGTH) + (codePoint >> SHIFT_1)];
	      index = this.data[index + ((codePoint >> SHIFT_2) & INDEX_2_MASK)];
	      index = (index << INDEX_SHIFT) + (codePoint & DATA_MASK);
	      return this.data[index];
	    }

	    return this.data[this.data.length - DATA_GRANULARITY];
	  }
	}

	unicodeTrie = UnicodeTrie;
	return unicodeTrie;
}

var unicodeTrieExports = requireUnicodeTrie();
const $hJqJp$unicodetrie = /*@__PURE__*/getDefaultExportFromCjs(unicodeTrieExports);

var b64 = {};

var hasRequiredB64;

function requireB64 () {
	if (hasRequiredB64) return b64;
	hasRequiredB64 = 1;
	(function (exports$1) {
		var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
(function (exports$1) {

		  var Arr = (typeof Uint8Array !== 'undefined')
		    ? Uint8Array
		    : Array;

			var PLUS   = '+'.charCodeAt(0);
			var SLASH  = '/'.charCodeAt(0);
			var NUMBER = '0'.charCodeAt(0);
			var LOWER  = 'a'.charCodeAt(0);
			var UPPER  = 'A'.charCodeAt(0);
			var PLUS_URL_SAFE = '-'.charCodeAt(0);
			var SLASH_URL_SAFE = '_'.charCodeAt(0);

			function decode (elt) {
				var code = elt.charCodeAt(0);
				if (code === PLUS ||
				    code === PLUS_URL_SAFE)
					return 62 // '+'
				if (code === SLASH ||
				    code === SLASH_URL_SAFE)
					return 63 // '/'
				if (code < NUMBER)
					return -1 //no match
				if (code < NUMBER + 10)
					return code - NUMBER + 26 + 26
				if (code < UPPER + 26)
					return code - UPPER
				if (code < LOWER + 26)
					return code - LOWER + 26
			}

			function b64ToByteArray (b64) {
				var i, j, l, tmp, placeHolders, arr;

				if (b64.length % 4 > 0) {
					throw new Error('Invalid string. Length must be a multiple of 4')
				}

				// the number of equal signs (place holders)
				// if there are two placeholders, than the two characters before it
				// represent one byte
				// if there is only one, then the three characters before it represent 2 bytes
				// this is just a cheap hack to not do indexOf twice
				var len = b64.length;
				placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0;

				// base64 is 4/3 + up to two characters of the original data
				arr = new Arr(b64.length * 3 / 4 - placeHolders);

				// if there are placeholders, only get up to the last complete 4 chars
				l = placeHolders > 0 ? b64.length - 4 : b64.length;

				var L = 0;

				function push (v) {
					arr[L++] = v;
				}

				for (i = 0, j = 0; i < l; i += 4, j += 3) {
					tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3));
					push((tmp & 0xFF0000) >> 16);
					push((tmp & 0xFF00) >> 8);
					push(tmp & 0xFF);
				}

				if (placeHolders === 2) {
					tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4);
					push(tmp & 0xFF);
				} else if (placeHolders === 1) {
					tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2);
					push((tmp >> 8) & 0xFF);
					push(tmp & 0xFF);
				}

				return arr
			}

			function uint8ToBase64 (uint8) {
				var i,
					extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
					output = "",
					temp, length;

				function encode (num) {
					return lookup.charAt(num)
				}

				function tripletToBase64 (num) {
					return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
				}

				// go through the array every three bytes, we'll deal with trailing stuff later
				for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
					temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
					output += tripletToBase64(temp);
				}

				// pad the end with zeros, but make sure to not forget the extra bytes
				switch (extraBytes) {
					case 1:
						temp = uint8[uint8.length - 1];
						output += encode(temp >> 2);
						output += encode((temp << 4) & 0x3F);
						output += '==';
						break
					case 2:
						temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
						output += encode(temp >> 10);
						output += encode((temp >> 4) & 0x3F);
						output += encode((temp << 2) & 0x3F);
						output += '=';
						break
				}

				return output
			}

			exports$1.toByteArray = b64ToByteArray;
			exports$1.fromByteArray = uint8ToBase64;
		}(exports$1)); 
	} (b64));
	return b64;
}

var b64Exports = requireB64();
const $hJqJp$base64js = /*@__PURE__*/getDefaultExportFromCjs(b64Exports);

var $557adaaeb0c7885f$exports = {};
const $1627905f8be2ef3f$export$fb4028874a74450 = 5; // Non-starters
const $1627905f8be2ef3f$export$1bb1140fe1358b00 = 12; // Alphabetic
const $1627905f8be2ef3f$export$f3e416a182673355 = 13; // Hebrew Letter
const $1627905f8be2ef3f$export$24aa617c849a894a = 16; // Hyphen
const $1627905f8be2ef3f$export$a73c4d14459b698d = 17; // Break after
const $1627905f8be2ef3f$export$9e5d732f3676a9ba = 22; // Word joiner
const $1627905f8be2ef3f$export$1dff41d5c0caca01 = 28; // Regional Indicator
const $1627905f8be2ef3f$export$30a74a373318dec6 = 31; // Zero Width Joiner
const $1627905f8be2ef3f$export$d710c5f50fc7496a = 33; // Ambiguous (Alphabetic or Ideograph)
const $1627905f8be2ef3f$export$66498d28055820a9 = 34; // Break (mandatory)
const $1627905f8be2ef3f$export$eb6c6d0b7c8826f2 = 35; // Conditional Japanese Starter
const $1627905f8be2ef3f$export$de92be486109a1df = 36; // Carriage return
const $1627905f8be2ef3f$export$606cfc2a8896c91f = 37; // Line feed
const $1627905f8be2ef3f$export$e51d3c675bb0140d = 38; // Next line
const $1627905f8be2ef3f$export$da51c6332ad11d7b = 39; // South-East Asian
const $1627905f8be2ef3f$export$bea437c40441867d = 40; // Surrogates
const $1627905f8be2ef3f$export$c4c7eecbfed13dc9 = 41; // Space
const $1627905f8be2ef3f$export$98e1f8a379849661 = 42; // Unknown


const $32627af916ac1b00$export$98f50d781a474745 = 0; // Direct break opportunity
const $32627af916ac1b00$export$12ee1f8f5315ca7e = 1; // Indirect break opportunity
const $32627af916ac1b00$export$e4965ce242860454 = 2; // Indirect break opportunity for combining marks
const $32627af916ac1b00$export$8f14048969dcd45e = 3; // Prohibited break for combining marks
const $32627af916ac1b00$export$133eb141bf58aff4 = 4; // Prohibited break
const $32627af916ac1b00$export$5bdb8ccbf5c57afc = [
    //OP   , CL    , CP    , QU    , GL    , NS    , EX    , SY    , IS    , PR    , PO    , NU    , AL    , HL    , ID    , IN    , HY    , BA    , BB    , B2    , ZW    , CM    , WJ    , H2    , H3    , JL    , JV    , JT    , RI    , EB    , EM    , ZWJ   , CB
    [
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$8f14048969dcd45e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e
    ],
    [
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ],
    [
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$e4965ce242860454,
        $32627af916ac1b00$export$133eb141bf58aff4,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$98f50d781a474745,
        $32627af916ac1b00$export$12ee1f8f5315ca7e,
        $32627af916ac1b00$export$98f50d781a474745
    ] // CB
];


const $557adaaeb0c7885f$var$data = $hJqJp$base64js.toByteArray("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");
const $557adaaeb0c7885f$var$classTrie = new $hJqJp$unicodetrie($557adaaeb0c7885f$var$data);
const $557adaaeb0c7885f$var$mapClass = function(c) {
    switch(c){
        case $1627905f8be2ef3f$export$d710c5f50fc7496a:
            return $1627905f8be2ef3f$export$1bb1140fe1358b00;
        case $1627905f8be2ef3f$export$da51c6332ad11d7b:
        case $1627905f8be2ef3f$export$bea437c40441867d:
        case $1627905f8be2ef3f$export$98e1f8a379849661:
            return $1627905f8be2ef3f$export$1bb1140fe1358b00;
        case $1627905f8be2ef3f$export$eb6c6d0b7c8826f2:
            return $1627905f8be2ef3f$export$fb4028874a74450;
        default:
            return c;
    }
};
const $557adaaeb0c7885f$var$mapFirst = function(c) {
    switch(c){
        case $1627905f8be2ef3f$export$606cfc2a8896c91f:
        case $1627905f8be2ef3f$export$e51d3c675bb0140d:
            return $1627905f8be2ef3f$export$66498d28055820a9;
        case $1627905f8be2ef3f$export$c4c7eecbfed13dc9:
            return $1627905f8be2ef3f$export$9e5d732f3676a9ba;
        default:
            return c;
    }
};
class $557adaaeb0c7885f$var$Break {
    constructor(position, required = false){
        this.position = position;
        this.required = required;
    }
}
class $557adaaeb0c7885f$var$LineBreaker {
    nextCodePoint() {
        const code = this.string.charCodeAt(this.pos++);
        const next = this.string.charCodeAt(this.pos);
        // If a surrogate pair
        if (0xd800 <= code && code <= 0xdbff && 0xdc00 <= next && next <= 0xdfff) {
            this.pos++;
            return (code - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
        }
        return code;
    }
    nextCharClass() {
        return $557adaaeb0c7885f$var$mapClass($557adaaeb0c7885f$var$classTrie.get(this.nextCodePoint()));
    }
    getSimpleBreak() {
        // handle classes not handled by the pair table
        switch(this.nextClass){
            case $1627905f8be2ef3f$export$c4c7eecbfed13dc9:
                return false;
            case $1627905f8be2ef3f$export$66498d28055820a9:
            case $1627905f8be2ef3f$export$606cfc2a8896c91f:
            case $1627905f8be2ef3f$export$e51d3c675bb0140d:
                this.curClass = $1627905f8be2ef3f$export$66498d28055820a9;
                return false;
            case $1627905f8be2ef3f$export$de92be486109a1df:
                this.curClass = $1627905f8be2ef3f$export$de92be486109a1df;
                return false;
        }
        return null;
    }
    getPairTableBreak(lastClass) {
        // if not handled already, use the pair table
        let shouldBreak = false;
        switch($32627af916ac1b00$export$5bdb8ccbf5c57afc[this.curClass][this.nextClass]){
            case $32627af916ac1b00$export$98f50d781a474745:
                shouldBreak = true;
                break;
            case $32627af916ac1b00$export$12ee1f8f5315ca7e:
                shouldBreak = lastClass === $1627905f8be2ef3f$export$c4c7eecbfed13dc9;
                break;
            case $32627af916ac1b00$export$e4965ce242860454:
                shouldBreak = lastClass === $1627905f8be2ef3f$export$c4c7eecbfed13dc9;
                if (!shouldBreak) {
                    shouldBreak = false;
                    return shouldBreak;
                }
                break;
            case $32627af916ac1b00$export$8f14048969dcd45e:
                if (lastClass !== $1627905f8be2ef3f$export$c4c7eecbfed13dc9) return shouldBreak;
                break;
        }
        if (this.LB8a) shouldBreak = false;
        // Rule LB21a
        if (this.LB21a && (this.curClass === $1627905f8be2ef3f$export$24aa617c849a894a || this.curClass === $1627905f8be2ef3f$export$a73c4d14459b698d)) {
            shouldBreak = false;
            this.LB21a = false;
        } else this.LB21a = this.curClass === $1627905f8be2ef3f$export$f3e416a182673355;
        // Rule LB30a
        if (this.curClass === $1627905f8be2ef3f$export$1dff41d5c0caca01) {
            this.LB30a++;
            if (this.LB30a == 2 && this.nextClass === $1627905f8be2ef3f$export$1dff41d5c0caca01) {
                shouldBreak = true;
                this.LB30a = 0;
            }
        } else this.LB30a = 0;
        this.curClass = this.nextClass;
        return shouldBreak;
    }
    nextBreak() {
        // get the first char if we're at the beginning of the string
        if (this.curClass == null) {
            let firstClass = this.nextCharClass();
            this.curClass = $557adaaeb0c7885f$var$mapFirst(firstClass);
            this.nextClass = firstClass;
            this.LB8a = firstClass === $1627905f8be2ef3f$export$30a74a373318dec6;
            this.LB30a = 0;
        }
        while(this.pos < this.string.length){
            this.lastPos = this.pos;
            const lastClass = this.nextClass;
            this.nextClass = this.nextCharClass();
            // explicit newline
            if (this.curClass === $1627905f8be2ef3f$export$66498d28055820a9 || this.curClass === $1627905f8be2ef3f$export$de92be486109a1df && this.nextClass !== $1627905f8be2ef3f$export$606cfc2a8896c91f) {
                this.curClass = $557adaaeb0c7885f$var$mapFirst($557adaaeb0c7885f$var$mapClass(this.nextClass));
                return new $557adaaeb0c7885f$var$Break(this.lastPos, true);
            }
            let shouldBreak = this.getSimpleBreak();
            if (shouldBreak === null) shouldBreak = this.getPairTableBreak(lastClass);
            // Rule LB8a
            this.LB8a = this.nextClass === $1627905f8be2ef3f$export$30a74a373318dec6;
            if (shouldBreak) return new $557adaaeb0c7885f$var$Break(this.lastPos);
        }
        if (this.lastPos < this.string.length) {
            this.lastPos = this.string.length;
            return new $557adaaeb0c7885f$var$Break(this.string.length);
        }
        return null;
    }
    constructor(string){
        this.string = string;
        this.pos = 0;
        this.lastPos = 0;
        this.curClass = null;
        this.nextClass = null;
        this.LB8a = false;
        this.LB21a = false;
        this.LB30a = 0;
    }
}
$557adaaeb0c7885f$exports = $557adaaeb0c7885f$var$LineBreaker;

var cssToReactNative = {};

var parse$1;
var hasRequiredParse;

function requireParse () {
	if (hasRequiredParse) return parse$1;
	hasRequiredParse = 1;
	var openParentheses = "(".charCodeAt(0);
	var closeParentheses = ")".charCodeAt(0);
	var singleQuote = "'".charCodeAt(0);
	var doubleQuote = '"'.charCodeAt(0);
	var backslash = "\\".charCodeAt(0);
	var slash = "/".charCodeAt(0);
	var comma = ",".charCodeAt(0);
	var colon = ":".charCodeAt(0);
	var star = "*".charCodeAt(0);
	var uLower = "u".charCodeAt(0);
	var uUpper = "U".charCodeAt(0);
	var plus = "+".charCodeAt(0);
	var isUnicodeRange = /^[a-f0-9?-]+$/i;

	parse$1 = function(input) {
	  var tokens = [];
	  var value = input;

	  var next,
	    quote,
	    prev,
	    token,
	    escape,
	    escapePos,
	    whitespacePos,
	    parenthesesOpenPos;
	  var pos = 0;
	  var code = value.charCodeAt(pos);
	  var max = value.length;
	  var stack = [{ nodes: tokens }];
	  var balanced = 0;
	  var parent;

	  var name = "";
	  var before = "";
	  var after = "";

	  while (pos < max) {
	    // Whitespaces
	    if (code <= 32) {
	      next = pos;
	      do {
	        next += 1;
	        code = value.charCodeAt(next);
	      } while (code <= 32);
	      token = value.slice(pos, next);

	      prev = tokens[tokens.length - 1];
	      if (code === closeParentheses && balanced) {
	        after = token;
	      } else if (prev && prev.type === "div") {
	        prev.after = token;
	        prev.sourceEndIndex += token.length;
	      } else if (
	        code === comma ||
	        code === colon ||
	        (code === slash &&
	          value.charCodeAt(next + 1) !== star &&
	          (!parent ||
	            (parent && parent.type === "function" && parent.value !== "calc")))
	      ) {
	        before = token;
	      } else {
	        tokens.push({
	          type: "space",
	          sourceIndex: pos,
	          sourceEndIndex: next,
	          value: token
	        });
	      }

	      pos = next;

	      // Quotes
	    } else if (code === singleQuote || code === doubleQuote) {
	      next = pos;
	      quote = code === singleQuote ? "'" : '"';
	      token = {
	        type: "string",
	        sourceIndex: pos,
	        quote: quote
	      };
	      do {
	        escape = false;
	        next = value.indexOf(quote, next + 1);
	        if (~next) {
	          escapePos = next;
	          while (value.charCodeAt(escapePos - 1) === backslash) {
	            escapePos -= 1;
	            escape = !escape;
	          }
	        } else {
	          value += quote;
	          next = value.length - 1;
	          token.unclosed = true;
	        }
	      } while (escape);
	      token.value = value.slice(pos + 1, next);
	      token.sourceEndIndex = token.unclosed ? next : next + 1;
	      tokens.push(token);
	      pos = next + 1;
	      code = value.charCodeAt(pos);

	      // Comments
	    } else if (code === slash && value.charCodeAt(pos + 1) === star) {
	      next = value.indexOf("*/", pos);

	      token = {
	        type: "comment",
	        sourceIndex: pos,
	        sourceEndIndex: next + 2
	      };

	      if (next === -1) {
	        token.unclosed = true;
	        next = value.length;
	        token.sourceEndIndex = next;
	      }

	      token.value = value.slice(pos + 2, next);
	      tokens.push(token);

	      pos = next + 2;
	      code = value.charCodeAt(pos);

	      // Operation within calc
	    } else if (
	      (code === slash || code === star) &&
	      parent &&
	      parent.type === "function" &&
	      parent.value === "calc"
	    ) {
	      token = value[pos];
	      tokens.push({
	        type: "word",
	        sourceIndex: pos - before.length,
	        sourceEndIndex: pos + token.length,
	        value: token
	      });
	      pos += 1;
	      code = value.charCodeAt(pos);

	      // Dividers
	    } else if (code === slash || code === comma || code === colon) {
	      token = value[pos];

	      tokens.push({
	        type: "div",
	        sourceIndex: pos - before.length,
	        sourceEndIndex: pos + token.length,
	        value: token,
	        before: before,
	        after: ""
	      });
	      before = "";

	      pos += 1;
	      code = value.charCodeAt(pos);

	      // Open parentheses
	    } else if (openParentheses === code) {
	      // Whitespaces after open parentheses
	      next = pos;
	      do {
	        next += 1;
	        code = value.charCodeAt(next);
	      } while (code <= 32);
	      parenthesesOpenPos = pos;
	      token = {
	        type: "function",
	        sourceIndex: pos - name.length,
	        value: name,
	        before: value.slice(parenthesesOpenPos + 1, next)
	      };
	      pos = next;

	      if (name === "url" && code !== singleQuote && code !== doubleQuote) {
	        next -= 1;
	        do {
	          escape = false;
	          next = value.indexOf(")", next + 1);
	          if (~next) {
	            escapePos = next;
	            while (value.charCodeAt(escapePos - 1) === backslash) {
	              escapePos -= 1;
	              escape = !escape;
	            }
	          } else {
	            value += ")";
	            next = value.length - 1;
	            token.unclosed = true;
	          }
	        } while (escape);
	        // Whitespaces before closed
	        whitespacePos = next;
	        do {
	          whitespacePos -= 1;
	          code = value.charCodeAt(whitespacePos);
	        } while (code <= 32);
	        if (parenthesesOpenPos < whitespacePos) {
	          if (pos !== whitespacePos + 1) {
	            token.nodes = [
	              {
	                type: "word",
	                sourceIndex: pos,
	                sourceEndIndex: whitespacePos + 1,
	                value: value.slice(pos, whitespacePos + 1)
	              }
	            ];
	          } else {
	            token.nodes = [];
	          }
	          if (token.unclosed && whitespacePos + 1 !== next) {
	            token.after = "";
	            token.nodes.push({
	              type: "space",
	              sourceIndex: whitespacePos + 1,
	              sourceEndIndex: next,
	              value: value.slice(whitespacePos + 1, next)
	            });
	          } else {
	            token.after = value.slice(whitespacePos + 1, next);
	            token.sourceEndIndex = next;
	          }
	        } else {
	          token.after = "";
	          token.nodes = [];
	        }
	        pos = next + 1;
	        token.sourceEndIndex = token.unclosed ? next : pos;
	        code = value.charCodeAt(pos);
	        tokens.push(token);
	      } else {
	        balanced += 1;
	        token.after = "";
	        token.sourceEndIndex = pos + 1;
	        tokens.push(token);
	        stack.push(token);
	        tokens = token.nodes = [];
	        parent = token;
	      }
	      name = "";

	      // Close parentheses
	    } else if (closeParentheses === code && balanced) {
	      pos += 1;
	      code = value.charCodeAt(pos);

	      parent.after = after;
	      parent.sourceEndIndex += after.length;
	      after = "";
	      balanced -= 1;
	      stack[stack.length - 1].sourceEndIndex = pos;
	      stack.pop();
	      parent = stack[balanced];
	      tokens = parent.nodes;

	      // Words
	    } else {
	      next = pos;
	      do {
	        if (code === backslash) {
	          next += 1;
	        }
	        next += 1;
	        code = value.charCodeAt(next);
	      } while (
	        next < max &&
	        !(
	          code <= 32 ||
	          code === singleQuote ||
	          code === doubleQuote ||
	          code === comma ||
	          code === colon ||
	          code === slash ||
	          code === openParentheses ||
	          (code === star &&
	            parent &&
	            parent.type === "function" &&
	            parent.value === "calc") ||
	          (code === slash &&
	            parent.type === "function" &&
	            parent.value === "calc") ||
	          (code === closeParentheses && balanced)
	        )
	      );
	      token = value.slice(pos, next);

	      if (openParentheses === code) {
	        name = token;
	      } else if (
	        (uLower === token.charCodeAt(0) || uUpper === token.charCodeAt(0)) &&
	        plus === token.charCodeAt(1) &&
	        isUnicodeRange.test(token.slice(2))
	      ) {
	        tokens.push({
	          type: "unicode-range",
	          sourceIndex: pos,
	          sourceEndIndex: next,
	          value: token
	        });
	      } else {
	        tokens.push({
	          type: "word",
	          sourceIndex: pos,
	          sourceEndIndex: next,
	          value: token
	        });
	      }

	      pos = next;
	    }
	  }

	  for (pos = stack.length - 1; pos; pos -= 1) {
	    stack[pos].unclosed = true;
	    stack[pos].sourceEndIndex = value.length;
	  }

	  return stack[0].nodes;
	};
	return parse$1;
}

var walk;
var hasRequiredWalk;

function requireWalk () {
	if (hasRequiredWalk) return walk;
	hasRequiredWalk = 1;
	walk = function walk(nodes, cb, bubble) {
	  var i, max, node, result;

	  for (i = 0, max = nodes.length; i < max; i += 1) {
	    node = nodes[i];
	    if (!bubble) {
	      result = cb(node, i, nodes);
	    }

	    if (
	      result !== false &&
	      node.type === "function" &&
	      Array.isArray(node.nodes)
	    ) {
	      walk(node.nodes, cb, bubble);
	    }

	    if (bubble) {
	      cb(node, i, nodes);
	    }
	  }
	};
	return walk;
}

var stringify_1;
var hasRequiredStringify;

function requireStringify () {
	if (hasRequiredStringify) return stringify_1;
	hasRequiredStringify = 1;
	function stringifyNode(node, custom) {
	  var type = node.type;
	  var value = node.value;
	  var buf;
	  var customResult;

	  if (custom && (customResult = custom(node)) !== undefined) {
	    return customResult;
	  } else if (type === "word" || type === "space") {
	    return value;
	  } else if (type === "string") {
	    buf = node.quote || "";
	    return buf + value + (node.unclosed ? "" : buf);
	  } else if (type === "comment") {
	    return "/*" + value + (node.unclosed ? "" : "*/");
	  } else if (type === "div") {
	    return (node.before || "") + value + (node.after || "");
	  } else if (Array.isArray(node.nodes)) {
	    buf = stringify(node.nodes, custom);
	    if (type !== "function") {
	      return buf;
	    }
	    return (
	      value +
	      "(" +
	      (node.before || "") +
	      buf +
	      (node.after || "") +
	      (node.unclosed ? "" : ")")
	    );
	  }
	  return value;
	}

	function stringify(nodes, custom) {
	  var result, i;

	  if (Array.isArray(nodes)) {
	    result = "";
	    for (i = nodes.length - 1; ~i; i -= 1) {
	      result = stringifyNode(nodes[i], custom) + result;
	    }
	    return result;
	  }
	  return stringifyNode(nodes, custom);
	}

	stringify_1 = stringify;
	return stringify_1;
}

var unit;
var hasRequiredUnit;

function requireUnit () {
	if (hasRequiredUnit) return unit;
	hasRequiredUnit = 1;
	var minus = "-".charCodeAt(0);
	var plus = "+".charCodeAt(0);
	var dot = ".".charCodeAt(0);
	var exp = "e".charCodeAt(0);
	var EXP = "E".charCodeAt(0);

	// Check if three code points would start a number
	// https://www.w3.org/TR/css-syntax-3/#starts-with-a-number
	function likeNumber(value) {
	  var code = value.charCodeAt(0);
	  var nextCode;

	  if (code === plus || code === minus) {
	    nextCode = value.charCodeAt(1);

	    if (nextCode >= 48 && nextCode <= 57) {
	      return true;
	    }

	    var nextNextCode = value.charCodeAt(2);

	    if (nextCode === dot && nextNextCode >= 48 && nextNextCode <= 57) {
	      return true;
	    }

	    return false;
	  }

	  if (code === dot) {
	    nextCode = value.charCodeAt(1);

	    if (nextCode >= 48 && nextCode <= 57) {
	      return true;
	    }

	    return false;
	  }

	  if (code >= 48 && code <= 57) {
	    return true;
	  }

	  return false;
	}

	// Consume a number
	// https://www.w3.org/TR/css-syntax-3/#consume-number
	unit = function(value) {
	  var pos = 0;
	  var length = value.length;
	  var code;
	  var nextCode;
	  var nextNextCode;

	  if (length === 0 || !likeNumber(value)) {
	    return false;
	  }

	  code = value.charCodeAt(pos);

	  if (code === plus || code === minus) {
	    pos++;
	  }

	  while (pos < length) {
	    code = value.charCodeAt(pos);

	    if (code < 48 || code > 57) {
	      break;
	    }

	    pos += 1;
	  }

	  code = value.charCodeAt(pos);
	  nextCode = value.charCodeAt(pos + 1);

	  if (code === dot && nextCode >= 48 && nextCode <= 57) {
	    pos += 2;

	    while (pos < length) {
	      code = value.charCodeAt(pos);

	      if (code < 48 || code > 57) {
	        break;
	      }

	      pos += 1;
	    }
	  }

	  code = value.charCodeAt(pos);
	  nextCode = value.charCodeAt(pos + 1);
	  nextNextCode = value.charCodeAt(pos + 2);

	  if (
	    (code === exp || code === EXP) &&
	    ((nextCode >= 48 && nextCode <= 57) ||
	      ((nextCode === plus || nextCode === minus) &&
	        nextNextCode >= 48 &&
	        nextNextCode <= 57))
	  ) {
	    pos += nextCode === plus || nextCode === minus ? 3 : 2;

	    while (pos < length) {
	      code = value.charCodeAt(pos);

	      if (code < 48 || code > 57) {
	        break;
	      }

	      pos += 1;
	    }
	  }

	  return {
	    number: value.slice(0, pos),
	    unit: value.slice(pos)
	  };
	};
	return unit;
}

var lib;
var hasRequiredLib;

function requireLib () {
	if (hasRequiredLib) return lib;
	hasRequiredLib = 1;
	var parse = requireParse();
	var walk = requireWalk();
	var stringify = requireStringify();

	function ValueParser(value) {
	  if (this instanceof ValueParser) {
	    this.nodes = parse(value);
	    return this;
	  }
	  return new ValueParser(value);
	}

	ValueParser.prototype.toString = function() {
	  return Array.isArray(this.nodes) ? stringify(this.nodes) : "";
	};

	ValueParser.prototype.walk = function(cb, bubble) {
	  walk(this.nodes, cb, bubble);
	  return this;
	};

	ValueParser.unit = requireUnit();

	ValueParser.walk = walk;

	ValueParser.stringify = stringify;

	lib = ValueParser;
	return lib;
}

var camelize;
var hasRequiredCamelize;

function requireCamelize () {
	if (hasRequiredCamelize) return camelize;
	hasRequiredCamelize = 1;

	camelize = function (obj) {
		if (typeof obj === 'string') { return camelCase(obj); }
		return walk(obj);
	};

	function walk(obj) {
		if (!obj || typeof obj !== 'object') { return obj; }
		if (isDate(obj) || isRegex(obj)) { return obj; }
		if (isArray(obj)) { return map(obj, walk); }
		return reduce(objectKeys(obj), function (acc, key) {
			var camel = camelCase(key);
			acc[camel] = walk(obj[key]);
			return acc;
		}, {});
	}

	function camelCase(str) {
		return str.replace(/[_.-](\w|$)/g, function (_, x) {
			return x.toUpperCase();
		});
	}

	var isArray = Array.isArray || function (obj) {
		return Object.prototype.toString.call(obj) === '[object Array]';
	};

	var isDate = function (obj) {
		return Object.prototype.toString.call(obj) === '[object Date]';
	};

	var isRegex = function (obj) {
		return Object.prototype.toString.call(obj) === '[object RegExp]';
	};

	var has = Object.prototype.hasOwnProperty;
	var objectKeys = Object.keys || function (obj) {
		var keys = [];
		for (var key in obj) {
			if (has.call(obj, key)) { keys.push(key); }
		}
		return keys;
	};

	function map(xs, f) {
		if (xs.map) { return xs.map(f); }
		var res = [];
		for (var i = 0; i < xs.length; i++) {
			res.push(f(xs[i], i));
		}
		return res;
	}

	function reduce(xs, f, acc) {
		if (xs.reduce) { return xs.reduce(f, acc); }
		for (var i = 0; i < xs.length; i++) {
			acc = f(acc, xs[i], i);
		}
		return acc;
	}
	return camelize;
}

const black = "#000000";
const silver = "#c0c0c0";
const gray = "#808080";
const white = "#ffffff";
const maroon = "#800000";
const red = "#ff0000";
const purple = "#800080";
const fuchsia = "#ff00ff";
const green = "#008000";
const lime = "#00ff00";
const olive = "#808000";
const yellow = "#ffff00";
const navy = "#000080";
const blue = "#0000ff";
const teal = "#008080";
const aqua = "#00ffff";
const orange = "#ffa500";
const aliceblue = "#f0f8ff";
const antiquewhite = "#faebd7";
const aquamarine = "#7fffd4";
const azure = "#f0ffff";
const beige = "#f5f5dc";
const bisque = "#ffe4c4";
const blanchedalmond = "#ffebcd";
const blueviolet = "#8a2be2";
const brown = "#a52a2a";
const burlywood = "#deb887";
const cadetblue = "#5f9ea0";
const chartreuse = "#7fff00";
const chocolate = "#d2691e";
const coral = "#ff7f50";
const cornflowerblue = "#6495ed";
const cornsilk = "#fff8dc";
const crimson = "#dc143c";
const darkblue = "#00008b";
const darkcyan = "#008b8b";
const darkgoldenrod = "#b8860b";
const darkgray = "#a9a9a9";
const darkgreen = "#006400";
const darkgrey = "#a9a9a9";
const darkkhaki = "#bdb76b";
const darkmagenta = "#8b008b";
const darkolivegreen = "#556b2f";
const darkorange = "#ff8c00";
const darkorchid = "#9932cc";
const darkred = "#8b0000";
const darksalmon = "#e9967a";
const darkseagreen = "#8fbc8f";
const darkslateblue = "#483d8b";
const darkslategray = "#2f4f4f";
const darkslategrey = "#2f4f4f";
const darkturquoise = "#00ced1";
const darkviolet = "#9400d3";
const deeppink = "#ff1493";
const deepskyblue = "#00bfff";
const dimgray = "#696969";
const dimgrey = "#696969";
const dodgerblue = "#1e90ff";
const firebrick = "#b22222";
const floralwhite = "#fffaf0";
const forestgreen = "#228b22";
const gainsboro = "#dcdcdc";
const ghostwhite = "#f8f8ff";
const gold = "#ffd700";
const goldenrod = "#daa520";
const greenyellow = "#adff2f";
const grey = "#808080";
const honeydew = "#f0fff0";
const hotpink = "#ff69b4";
const indianred = "#cd5c5c";
const indigo = "#4b0082";
const ivory = "#fffff0";
const khaki = "#f0e68c";
const lavender = "#e6e6fa";
const lavenderblush = "#fff0f5";
const lawngreen = "#7cfc00";
const lemonchiffon = "#fffacd";
const lightblue = "#add8e6";
const lightcoral = "#f08080";
const lightcyan = "#e0ffff";
const lightgoldenrodyellow = "#fafad2";
const lightgray = "#d3d3d3";
const lightgreen = "#90ee90";
const lightgrey = "#d3d3d3";
const lightpink = "#ffb6c1";
const lightsalmon = "#ffa07a";
const lightseagreen = "#20b2aa";
const lightskyblue = "#87cefa";
const lightslategray = "#778899";
const lightslategrey = "#778899";
const lightsteelblue = "#b0c4de";
const lightyellow = "#ffffe0";
const limegreen = "#32cd32";
const linen = "#faf0e6";
const mediumaquamarine = "#66cdaa";
const mediumblue = "#0000cd";
const mediumorchid = "#ba55d3";
const mediumpurple = "#9370db";
const mediumseagreen = "#3cb371";
const mediumslateblue = "#7b68ee";
const mediumspringgreen = "#00fa9a";
const mediumturquoise = "#48d1cc";
const mediumvioletred = "#c71585";
const midnightblue = "#191970";
const mintcream = "#f5fffa";
const mistyrose = "#ffe4e1";
const moccasin = "#ffe4b5";
const navajowhite = "#ffdead";
const oldlace = "#fdf5e6";
const olivedrab = "#6b8e23";
const orangered = "#ff4500";
const orchid = "#da70d6";
const palegoldenrod = "#eee8aa";
const palegreen = "#98fb98";
const paleturquoise = "#afeeee";
const palevioletred = "#db7093";
const papayawhip = "#ffefd5";
const peachpuff = "#ffdab9";
const peru = "#cd853f";
const pink = "#ffc0cb";
const plum = "#dda0dd";
const powderblue = "#b0e0e6";
const rosybrown = "#bc8f8f";
const royalblue = "#4169e1";
const saddlebrown = "#8b4513";
const salmon = "#fa8072";
const sandybrown = "#f4a460";
const seagreen = "#2e8b57";
const seashell = "#fff5ee";
const sienna = "#a0522d";
const skyblue = "#87ceeb";
const slateblue = "#6a5acd";
const slategray = "#708090";
const slategrey = "#708090";
const snow = "#fffafa";
const springgreen = "#00ff7f";
const steelblue = "#4682b4";
const tan = "#d2b48c";
const thistle = "#d8bfd8";
const tomato = "#ff6347";
const turquoise = "#40e0d0";
const violet = "#ee82ee";
const wheat = "#f5deb3";
const whitesmoke = "#f5f5f5";
const yellowgreen = "#9acd32";
const rebeccapurple = "#663399";
const require$$0 = {
  black,
  silver,
  gray,
  white,
  maroon,
  red,
  purple,
  fuchsia,
  green,
  lime,
  olive,
  yellow,
  navy,
  blue,
  teal,
  aqua,
  orange,
  aliceblue,
  antiquewhite,
  aquamarine,
  azure,
  beige,
  bisque,
  blanchedalmond,
  blueviolet,
  brown,
  burlywood,
  cadetblue,
  chartreuse,
  chocolate,
  coral,
  cornflowerblue,
  cornsilk,
  crimson,
  darkblue,
  darkcyan,
  darkgoldenrod,
  darkgray,
  darkgreen,
  darkgrey,
  darkkhaki,
  darkmagenta,
  darkolivegreen,
  darkorange,
  darkorchid,
  darkred,
  darksalmon,
  darkseagreen,
  darkslateblue,
  darkslategray,
  darkslategrey,
  darkturquoise,
  darkviolet,
  deeppink,
  deepskyblue,
  dimgray,
  dimgrey,
  dodgerblue,
  firebrick,
  floralwhite,
  forestgreen,
  gainsboro,
  ghostwhite,
  gold,
  goldenrod,
  greenyellow,
  grey,
  honeydew,
  hotpink,
  indianred,
  indigo,
  ivory,
  khaki,
  lavender,
  lavenderblush,
  lawngreen,
  lemonchiffon,
  lightblue,
  lightcoral,
  lightcyan,
  lightgoldenrodyellow,
  lightgray,
  lightgreen,
  lightgrey,
  lightpink,
  lightsalmon,
  lightseagreen,
  lightskyblue,
  lightslategray,
  lightslategrey,
  lightsteelblue,
  lightyellow,
  limegreen,
  linen,
  mediumaquamarine,
  mediumblue,
  mediumorchid,
  mediumpurple,
  mediumseagreen,
  mediumslateblue,
  mediumspringgreen,
  mediumturquoise,
  mediumvioletred,
  midnightblue,
  mintcream,
  mistyrose,
  moccasin,
  navajowhite,
  oldlace,
  olivedrab,
  orangered,
  orchid,
  palegoldenrod,
  palegreen,
  paleturquoise,
  palevioletred,
  papayawhip,
  peachpuff,
  peru,
  pink,
  plum,
  powderblue,
  rosybrown,
  royalblue,
  saddlebrown,
  salmon,
  sandybrown,
  seagreen,
  seashell,
  sienna,
  skyblue,
  slateblue,
  slategray,
  slategrey,
  snow,
  springgreen,
  steelblue,
  tan,
  thistle,
  tomato,
  turquoise,
  violet,
  wheat,
  whitesmoke,
  yellowgreen,
  rebeccapurple,
};

var cssColorKeywords;
var hasRequiredCssColorKeywords;

function requireCssColorKeywords () {
	if (hasRequiredCssColorKeywords) return cssColorKeywords;
	hasRequiredCssColorKeywords = 1;

	cssColorKeywords = require$$0;
	return cssColorKeywords;
}

var hasRequiredCssToReactNative;

function requireCssToReactNative () {
	if (hasRequiredCssToReactNative) return cssToReactNative;
	hasRequiredCssToReactNative = 1;
	(function (exports$1) {
		Object.defineProperty(exports$1, "__esModule", {
		  value: true
		});
		function _interopDefault(ex) {
		  return ex && typeof ex === "object" && "default" in ex ? ex["default"] : ex;
		}
		var parse = requireLib();
		var parse__default = _interopDefault(parse);
		var camelizeStyleName = _interopDefault(requireCamelize());
		var cssColorKeywords = _interopDefault(requireCssColorKeywords());
		var matchString = function matchString2(node) {
		  if (node.type !== "string") return null;
		  return node.value.replace(/\\([0-9a-f]{1,6})(?:\s|$)/gi, function(match, charCode) {
		    return String.fromCharCode(parseInt(charCode, 16));
		  }).replace(/\\/g, "");
		};
		var hexColorRe = /^(#(?:[0-9a-f]{3,4}){1,2})$/i;
		var cssFunctionNameRe = /^(rgba?|hsla?|hwb|lab|lch|gray|color)$/;
		var matchColor = function matchColor2(node) {
		  if (node.type === "word" && (hexColorRe.test(node.value) || node.value in cssColorKeywords || node.value === "transparent")) {
		    return node.value;
		  } else if (node.type === "function" && cssFunctionNameRe.test(node.value)) {
		    return parse.stringify(node);
		  }
		  return null;
		};
		var noneRe = /^(none)$/i;
		var autoRe = /^(auto)$/i;
		var identRe = /(^-?[_a-z][_a-z0-9-]*$)/i;
		var numberRe = /^([+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?)$/i;
		var lengthRe = /^(0$|(?:[+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?)(?=px$))/i;
		var unsupportedUnitRe = /^([+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?(ch|em|ex|rem|vh|vw|vmin|vmax|cm|mm|in|pc|pt))$/i;
		var angleRe = /^([+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?(?:deg|rad))$/i;
		var percentRe = /^([+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?%)$/i;
		var noopToken = function noopToken2(predicate) {
		  return function(node) {
		    return predicate(node) ? "<token>" : null;
		  };
		};
		var valueForTypeToken = function valueForTypeToken2(type) {
		  return function(node) {
		    return node.type === type ? node.value : null;
		  };
		};
		var regExpToken = function regExpToken2(regExp, transform3) {
		  if (transform3 === void 0) {
		    transform3 = String;
		  }
		  return function(node) {
		    if (node.type !== "word") return null;
		    var match = node.value.match(regExp);
		    if (match === null) return null;
		    var value = transform3(match[1]);
		    return value;
		  };
		};
		var SPACE = noopToken(function(node) {
		  return node.type === "space";
		});
		var SLASH = noopToken(function(node) {
		  return node.type === "div" && node.value === "/";
		});
		var COMMA = noopToken(function(node) {
		  return node.type === "div" && node.value === ",";
		});
		var WORD = valueForTypeToken("word");
		var NONE = regExpToken(noneRe);
		var AUTO = regExpToken(autoRe);
		var NUMBER = regExpToken(numberRe, Number);
		var LENGTH = regExpToken(lengthRe, Number);
		var UNSUPPORTED_LENGTH_UNIT = regExpToken(unsupportedUnitRe);
		var ANGLE = regExpToken(angleRe, function(angle) {
		  return angle.toLowerCase();
		});
		var PERCENT = regExpToken(percentRe);
		var IDENT = regExpToken(identRe);
		var STRING = matchString;
		var COLOR = matchColor;
		var LINE = regExpToken(/^(none|underline|line-through)$/i);
		var aspectRatio = function aspectRatio2(tokenStream) {
		  var aspectRatio3 = tokenStream.expect(NUMBER);
		  if (tokenStream.hasTokens()) {
		    tokenStream.expect(SLASH);
		    aspectRatio3 /= tokenStream.expect(NUMBER);
		  }
		  return {
		    aspectRatio: aspectRatio3
		  };
		};
		var BORDER_STYLE = regExpToken(/^(solid|dashed|dotted)$/);
		var defaultBorderWidth = 1;
		var defaultBorderColor = "black";
		var defaultBorderStyle = "solid";
		var border = function border2(tokenStream) {
		  var borderWidth2;
		  var borderColor2;
		  var borderStyle;
		  if (tokenStream.matches(NONE)) {
		    tokenStream.expectEmpty();
		    return {
		      borderWidth: 0,
		      borderColor: "black",
		      borderStyle: "solid"
		    };
		  }
		  var partsParsed = 0;
		  while (partsParsed < 3 && tokenStream.hasTokens()) {
		    if (partsParsed !== 0) tokenStream.expect(SPACE);
		    if (borderWidth2 === void 0 && tokenStream.matches(LENGTH, UNSUPPORTED_LENGTH_UNIT)) {
		      borderWidth2 = tokenStream.lastValue;
		    } else if (borderColor2 === void 0 && tokenStream.matches(COLOR)) {
		      borderColor2 = tokenStream.lastValue;
		    } else if (borderStyle === void 0 && tokenStream.matches(BORDER_STYLE)) {
		      borderStyle = tokenStream.lastValue;
		    } else {
		      tokenStream["throw"]();
		    }
		    partsParsed += 1;
		  }
		  tokenStream.expectEmpty();
		  if (borderWidth2 === void 0) borderWidth2 = defaultBorderWidth;
		  if (borderColor2 === void 0) borderColor2 = defaultBorderColor;
		  if (borderStyle === void 0) borderStyle = defaultBorderStyle;
		  return {
		    borderWidth: borderWidth2,
		    borderColor: borderColor2,
		    borderStyle
		  };
		};
		var directionFactory = function directionFactory2(_ref) {
		  var _ref$types = _ref.types, types = _ref$types === void 0 ? [LENGTH, UNSUPPORTED_LENGTH_UNIT, PERCENT] : _ref$types, _ref$directions = _ref.directions, directions = _ref$directions === void 0 ? ["Top", "Right", "Bottom", "Left"] : _ref$directions, _ref$prefix = _ref.prefix, prefix = _ref$prefix === void 0 ? "" : _ref$prefix, _ref$suffix = _ref.suffix, suffix = _ref$suffix === void 0 ? "" : _ref$suffix;
		  return function(tokenStream) {
		    var _ref2;
		    var values = [];
		    values.push(tokenStream.expect.apply(tokenStream, types));
		    while (values.length < 4 && tokenStream.hasTokens()) {
		      tokenStream.expect(SPACE);
		      values.push(tokenStream.expect.apply(tokenStream, types));
		    }
		    tokenStream.expectEmpty();
		    var top = values[0], _values$ = values[1], right = _values$ === void 0 ? top : _values$, _values$2 = values[2], bottom = _values$2 === void 0 ? top : _values$2, _values$3 = values[3], left = _values$3 === void 0 ? right : _values$3;
		    var keyFor = function keyFor2(n) {
		      return "" + prefix + directions[n] + suffix;
		    };
		    return _ref2 = {}, _ref2[keyFor(0)] = top, _ref2[keyFor(1)] = right, _ref2[keyFor(2)] = bottom, _ref2[keyFor(3)] = left, _ref2;
		  };
		};
		var parseShadowOffset = function parseShadowOffset2(tokenStream) {
		  var width = tokenStream.expect(LENGTH);
		  var height = tokenStream.matches(SPACE) ? tokenStream.expect(LENGTH) : width;
		  tokenStream.expectEmpty();
		  return {
		    width,
		    height
		  };
		};
		var parseShadow = function parseShadow2(tokenStream) {
		  var offsetX;
		  var offsetY;
		  var radius;
		  var color;
		  if (tokenStream.matches(NONE)) {
		    tokenStream.expectEmpty();
		    return {
		      offset: {
		        width: 0,
		        height: 0
		      },
		      radius: 0,
		      color: "black"
		    };
		  }
		  var didParseFirst = false;
		  while (tokenStream.hasTokens()) {
		    if (didParseFirst) tokenStream.expect(SPACE);
		    if (offsetX === void 0 && tokenStream.matches(LENGTH, UNSUPPORTED_LENGTH_UNIT)) {
		      offsetX = tokenStream.lastValue;
		      tokenStream.expect(SPACE);
		      offsetY = tokenStream.expect(LENGTH, UNSUPPORTED_LENGTH_UNIT);
		      tokenStream.saveRewindPoint();
		      if (tokenStream.matches(SPACE) && tokenStream.matches(LENGTH, UNSUPPORTED_LENGTH_UNIT)) {
		        radius = tokenStream.lastValue;
		      } else {
		        tokenStream.rewind();
		      }
		    } else if (color === void 0 && tokenStream.matches(COLOR)) {
		      color = tokenStream.lastValue;
		    } else {
		      tokenStream["throw"]();
		    }
		    didParseFirst = true;
		  }
		  if (offsetX === void 0) tokenStream["throw"]();
		  return {
		    offset: {
		      width: offsetX,
		      height: offsetY
		    },
		    radius: radius !== void 0 ? radius : 0,
		    color: color !== void 0 ? color : "black"
		  };
		};
		var boxShadow = function boxShadow2(tokenStream) {
		  var _parseShadow = parseShadow(tokenStream), offset = _parseShadow.offset, radius = _parseShadow.radius, color = _parseShadow.color;
		  return {
		    shadowOffset: offset,
		    shadowRadius: radius,
		    shadowColor: color,
		    shadowOpacity: 1
		  };
		};
		var defaultFlexGrow = 1;
		var defaultFlexShrink = 1;
		var defaultFlexBasis = 0;
		var flex = function flex2(tokenStream) {
		  var flexGrow;
		  var flexShrink;
		  var flexBasis;
		  if (tokenStream.matches(NONE)) {
		    tokenStream.expectEmpty();
		    return {
		      flexGrow: 0,
		      flexShrink: 0,
		      flexBasis: "auto"
		    };
		  }
		  tokenStream.saveRewindPoint();
		  if (tokenStream.matches(AUTO) && !tokenStream.hasTokens()) {
		    return {
		      flexGrow: 1,
		      flexShrink: 1,
		      flexBasis: "auto"
		    };
		  }
		  tokenStream.rewind();
		  var partsParsed = 0;
		  while (partsParsed < 2 && tokenStream.hasTokens()) {
		    if (partsParsed !== 0) tokenStream.expect(SPACE);
		    if (flexGrow === void 0 && tokenStream.matches(NUMBER)) {
		      flexGrow = tokenStream.lastValue;
		      tokenStream.saveRewindPoint();
		      if (tokenStream.matches(SPACE) && tokenStream.matches(NUMBER)) {
		        flexShrink = tokenStream.lastValue;
		      } else {
		        tokenStream.rewind();
		      }
		    } else if (flexBasis === void 0 && tokenStream.matches(LENGTH, UNSUPPORTED_LENGTH_UNIT, PERCENT)) {
		      flexBasis = tokenStream.lastValue;
		    } else if (flexBasis === void 0 && tokenStream.matches(AUTO)) {
		      flexBasis = "auto";
		    } else {
		      tokenStream["throw"]();
		    }
		    partsParsed += 1;
		  }
		  tokenStream.expectEmpty();
		  if (flexGrow === void 0) flexGrow = defaultFlexGrow;
		  if (flexShrink === void 0) flexShrink = defaultFlexShrink;
		  if (flexBasis === void 0) flexBasis = defaultFlexBasis;
		  return {
		    flexGrow,
		    flexShrink,
		    flexBasis
		  };
		};
		var FLEX_WRAP = regExpToken(/(nowrap|wrap|wrap-reverse)/);
		var FLEX_DIRECTION = regExpToken(/(row|row-reverse|column|column-reverse)/);
		var defaultFlexWrap = "nowrap";
		var defaultFlexDirection = "row";
		var flexFlow = function flexFlow2(tokenStream) {
		  var flexWrap;
		  var flexDirection;
		  var partsParsed = 0;
		  while (partsParsed < 2 && tokenStream.hasTokens()) {
		    if (partsParsed !== 0) tokenStream.expect(SPACE);
		    if (flexWrap === void 0 && tokenStream.matches(FLEX_WRAP)) {
		      flexWrap = tokenStream.lastValue;
		    } else if (flexDirection === void 0 && tokenStream.matches(FLEX_DIRECTION)) {
		      flexDirection = tokenStream.lastValue;
		    } else {
		      tokenStream["throw"]();
		    }
		    partsParsed += 1;
		  }
		  tokenStream.expectEmpty();
		  if (flexWrap === void 0) flexWrap = defaultFlexWrap;
		  if (flexDirection === void 0) flexDirection = defaultFlexDirection;
		  return {
		    flexWrap,
		    flexDirection
		  };
		};
		var fontFamily = function fontFamily2(tokenStream) {
		  var fontFamily3;
		  if (tokenStream.matches(STRING)) {
		    fontFamily3 = tokenStream.lastValue;
		  } else {
		    fontFamily3 = tokenStream.expect(IDENT);
		    while (tokenStream.hasTokens()) {
		      tokenStream.expect(SPACE);
		      var nextIdent = tokenStream.expect(IDENT);
		      fontFamily3 += " " + nextIdent;
		    }
		  }
		  tokenStream.expectEmpty();
		  return {
		    fontFamily: fontFamily3
		  };
		};
		var NORMAL = regExpToken(/^(normal)$/);
		var STYLE = regExpToken(/^(italic)$/);
		var WEIGHT = regExpToken(/^([1-9]00|bold)$/);
		var VARIANT = regExpToken(/^(small-caps)$/);
		var defaultFontStyle = "normal";
		var defaultFontWeight = "normal";
		var defaultFontVariant = [];
		var font = function font2(tokenStream) {
		  var fontStyle;
		  var fontWeight3;
		  var fontVariant3;
		  var lineHeight;
		  var numStyleWeightVariantMatched = 0;
		  while (numStyleWeightVariantMatched < 3 && tokenStream.hasTokens()) {
		    if (tokenStream.matches(NORMAL)) ;
		    else if (fontStyle === void 0 && tokenStream.matches(STYLE)) {
		      fontStyle = tokenStream.lastValue;
		    } else if (fontWeight3 === void 0 && tokenStream.matches(WEIGHT)) {
		      fontWeight3 = tokenStream.lastValue;
		    } else if (fontVariant3 === void 0 && tokenStream.matches(VARIANT)) {
		      fontVariant3 = [tokenStream.lastValue];
		    } else {
		      break;
		    }
		    tokenStream.expect(SPACE);
		    numStyleWeightVariantMatched += 1;
		  }
		  var fontSize = tokenStream.expect(LENGTH, UNSUPPORTED_LENGTH_UNIT);
		  if (tokenStream.matches(SLASH)) {
		    lineHeight = tokenStream.expect(LENGTH, UNSUPPORTED_LENGTH_UNIT);
		  }
		  tokenStream.expect(SPACE);
		  var _fontFamily = fontFamily(tokenStream), fontFamily$1 = _fontFamily.fontFamily;
		  if (fontStyle === void 0) fontStyle = defaultFontStyle;
		  if (fontWeight3 === void 0) fontWeight3 = defaultFontWeight;
		  if (fontVariant3 === void 0) fontVariant3 = defaultFontVariant;
		  var out = {
		    fontStyle,
		    fontWeight: fontWeight3,
		    fontVariant: fontVariant3,
		    fontSize,
		    fontFamily: fontFamily$1
		  };
		  if (lineHeight !== void 0) out.lineHeight = lineHeight;
		  return out;
		};
		var fontVariant = function fontVariant2(tokenStream) {
		  var values = [tokenStream.expect(IDENT)];
		  while (tokenStream.hasTokens()) {
		    tokenStream.expect(SPACE);
		    values.push(tokenStream.expect(IDENT));
		  }
		  return {
		    fontVariant: values
		  };
		};
		var ALIGN_CONTENT = regExpToken(/(flex-(?:start|end)|center|stretch|space-(?:between|around))/);
		var JUSTIFY_CONTENT = regExpToken(/(flex-(?:start|end)|center|space-(?:between|around|evenly))/);
		var placeContent = function placeContent2(tokenStream) {
		  var alignContent = tokenStream.expect(ALIGN_CONTENT);
		  var justifyContent;
		  if (tokenStream.hasTokens()) {
		    tokenStream.expect(SPACE);
		    justifyContent = tokenStream.expect(JUSTIFY_CONTENT);
		  } else {
		    justifyContent = "stretch";
		  }
		  tokenStream.expectEmpty();
		  return {
		    alignContent,
		    justifyContent
		  };
		};
		var STYLE$1 = regExpToken(/^(solid|double|dotted|dashed)$/);
		var defaultTextDecorationLine = "none";
		var defaultTextDecorationStyle = "solid";
		var defaultTextDecorationColor = "black";
		var textDecoration = function textDecoration2(tokenStream) {
		  var line;
		  var style;
		  var color;
		  var didParseFirst = false;
		  while (tokenStream.hasTokens()) {
		    if (didParseFirst) tokenStream.expect(SPACE);
		    if (line === void 0 && tokenStream.matches(LINE)) {
		      var lines = [tokenStream.lastValue.toLowerCase()];
		      tokenStream.saveRewindPoint();
		      if (lines[0] !== "none" && tokenStream.matches(SPACE) && tokenStream.matches(LINE)) {
		        lines.push(tokenStream.lastValue.toLowerCase());
		        lines.sort().reverse();
		      } else {
		        tokenStream.rewind();
		      }
		      line = lines.join(" ");
		    } else if (style === void 0 && tokenStream.matches(STYLE$1)) {
		      style = tokenStream.lastValue;
		    } else if (color === void 0 && tokenStream.matches(COLOR)) {
		      color = tokenStream.lastValue;
		    } else {
		      tokenStream["throw"]();
		    }
		    didParseFirst = true;
		  }
		  return {
		    textDecorationLine: line !== void 0 ? line : defaultTextDecorationLine,
		    textDecorationColor: color !== void 0 ? color : defaultTextDecorationColor,
		    textDecorationStyle: style !== void 0 ? style : defaultTextDecorationStyle
		  };
		};
		var textDecorationLine = function textDecorationLine2(tokenStream) {
		  var lines = [];
		  var didParseFirst = false;
		  while (tokenStream.hasTokens()) {
		    if (didParseFirst) tokenStream.expect(SPACE);
		    lines.push(tokenStream.expect(LINE).toLowerCase());
		    didParseFirst = true;
		  }
		  lines.sort().reverse();
		  return {
		    textDecorationLine: lines.join(" ")
		  };
		};
		var textShadow = function textShadow2(tokenStream) {
		  var _parseShadow2 = parseShadow(tokenStream), offset = _parseShadow2.offset, radius = _parseShadow2.radius, color = _parseShadow2.color;
		  return {
		    textShadowOffset: offset,
		    textShadowRadius: radius,
		    textShadowColor: color
		  };
		};
		var oneOfType = function oneOfType2(tokenType) {
		  return function(functionStream) {
		    var value = functionStream.expect(tokenType);
		    functionStream.expectEmpty();
		    return value;
		  };
		};
		var singleNumber = oneOfType(NUMBER);
		var singleLength = oneOfType(LENGTH);
		var singleAngle = oneOfType(ANGLE);
		var xyTransformFactory = function xyTransformFactory2(tokenType) {
		  return function(key, valueIfOmitted) {
		    return function(functionStream) {
		      var _ref3, _ref4;
		      var x = functionStream.expect(tokenType);
		      var y;
		      if (functionStream.hasTokens()) {
		        functionStream.expect(COMMA);
		        y = functionStream.expect(tokenType);
		      } else if (valueIfOmitted !== void 0) {
		        y = valueIfOmitted;
		      } else {
		        return x;
		      }
		      functionStream.expectEmpty();
		      return [(_ref3 = {}, _ref3[key + "Y"] = y, _ref3), (_ref4 = {}, _ref4[key + "X"] = x, _ref4)];
		    };
		  };
		};
		var xyNumber = xyTransformFactory(NUMBER);
		var xyLength = xyTransformFactory(LENGTH);
		var xyAngle = xyTransformFactory(ANGLE);
		var partTransforms = {
		  perspective: singleNumber,
		  scale: xyNumber("scale"),
		  scaleX: singleNumber,
		  scaleY: singleNumber,
		  translate: xyLength("translate", 0),
		  translateX: singleLength,
		  translateY: singleLength,
		  rotate: singleAngle,
		  rotateX: singleAngle,
		  rotateY: singleAngle,
		  rotateZ: singleAngle,
		  skewX: singleAngle,
		  skewY: singleAngle,
		  skew: xyAngle("skew", "0deg")
		};
		var transform = function transform2(tokenStream) {
		  var transforms2 = [];
		  var didParseFirst = false;
		  while (tokenStream.hasTokens()) {
		    if (didParseFirst) tokenStream.expect(SPACE);
		    var functionStream = tokenStream.expectFunction();
		    var functionName = functionStream.functionName;
		    var transformedValues = partTransforms[functionName](functionStream);
		    if (!Array.isArray(transformedValues)) {
		      var _ref5;
		      transformedValues = [(_ref5 = {}, _ref5[functionName] = transformedValues, _ref5)];
		    }
		    transforms2 = transformedValues.concat(transforms2);
		    didParseFirst = true;
		  }
		  return {
		    transform: transforms2
		  };
		};
		var background = function background2(tokenStream) {
		  return {
		    backgroundColor: tokenStream.expect(COLOR)
		  };
		};
		var borderColor = directionFactory({
		  types: [COLOR],
		  prefix: "border",
		  suffix: "Color"
		});
		var borderRadius = directionFactory({
		  directions: ["TopLeft", "TopRight", "BottomRight", "BottomLeft"],
		  prefix: "border",
		  suffix: "Radius"
		});
		var borderWidth = directionFactory({
		  prefix: "border",
		  suffix: "Width"
		});
		var margin = directionFactory({
		  types: [LENGTH, UNSUPPORTED_LENGTH_UNIT, PERCENT, AUTO],
		  prefix: "margin"
		});
		var padding = directionFactory({
		  prefix: "padding"
		});
		var fontWeight = function fontWeight2(tokenStream) {
		  return {
		    fontWeight: tokenStream.expect(WORD)
		    // Also match numbers as strings
		  };
		};
		var shadowOffset = function shadowOffset2(tokenStream) {
		  return {
		    shadowOffset: parseShadowOffset(tokenStream)
		  };
		};
		var textShadowOffset = function textShadowOffset2(tokenStream) {
		  return {
		    textShadowOffset: parseShadowOffset(tokenStream)
		  };
		};
		var transforms = {
		  aspectRatio,
		  background,
		  border,
		  borderColor,
		  borderRadius,
		  borderWidth,
		  boxShadow,
		  flex,
		  flexFlow,
		  font,
		  fontFamily,
		  fontVariant,
		  fontWeight,
		  margin,
		  padding,
		  placeContent,
		  shadowOffset,
		  textShadow,
		  textShadowOffset,
		  textDecoration,
		  textDecorationLine,
		  transform
		};
		var SYMBOL_MATCH = "SYMBOL_MATCH";
		var TokenStream = /* @__PURE__ */ (function() {
		  function TokenStream2(nodes, parent) {
		    this.index = 0;
		    this.nodes = nodes;
		    this.functionName = parent != null ? parent.value : null;
		    this.lastValue = null;
		    this.rewindIndex = -1;
		  }
		  var _proto = TokenStream2.prototype;
		  _proto.hasTokens = function hasTokens() {
		    return this.index <= this.nodes.length - 1;
		  };
		  _proto[SYMBOL_MATCH] = function() {
		    if (!this.hasTokens()) return null;
		    var node = this.nodes[this.index];
		    for (var i = 0; i < arguments.length; i += 1) {
		      var tokenDescriptor = i < 0 || arguments.length <= i ? void 0 : arguments[i];
		      var value = tokenDescriptor(node);
		      if (value !== null) {
		        this.index += 1;
		        this.lastValue = value;
		        return value;
		      }
		    }
		    return null;
		  };
		  _proto.matches = function matches() {
		    return this[SYMBOL_MATCH].apply(this, arguments) !== null;
		  };
		  _proto.expect = function expect() {
		    var value = this[SYMBOL_MATCH].apply(this, arguments);
		    return value !== null ? value : this["throw"]();
		  };
		  _proto.matchesFunction = function matchesFunction() {
		    var node = this.nodes[this.index];
		    if (node.type !== "function") return null;
		    var value = new TokenStream2(node.nodes, node);
		    this.index += 1;
		    this.lastValue = null;
		    return value;
		  };
		  _proto.expectFunction = function expectFunction() {
		    var value = this.matchesFunction();
		    return value !== null ? value : this["throw"]();
		  };
		  _proto.expectEmpty = function expectEmpty() {
		    if (this.hasTokens()) this["throw"]();
		  };
		  _proto["throw"] = function _throw() {
		    throw new Error("Unexpected token type: " + this.nodes[this.index].type);
		  };
		  _proto.saveRewindPoint = function saveRewindPoint() {
		    this.rewindIndex = this.index;
		  };
		  _proto.rewind = function rewind() {
		    if (this.rewindIndex === -1) throw new Error("Internal error");
		    this.index = this.rewindIndex;
		    this.lastValue = null;
		  };
		  return TokenStream2;
		})();
		var numberOrLengthRe = /^([+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?)(?:px)?$/i;
		var boolRe = /^true|false$/i;
		var nullRe = /^null$/i;
		var undefinedRe = /^undefined$/i;
		var transformRawValue = function transformRawValue2(propName, value) {
		  var numberMatch = value.match(numberOrLengthRe);
		  if (numberMatch !== null) return Number(numberMatch[1]);
		  var boolMatch = value.match(boolRe);
		  if (boolMatch !== null) return boolMatch[0].toLowerCase() === "true";
		  var nullMatch = value.match(nullRe);
		  if (nullMatch !== null) return null;
		  var undefinedMatch = value.match(undefinedRe);
		  if (undefinedMatch !== null) return void 0;
		  return value;
		};
		var baseTransformShorthandValue = function baseTransformShorthandValue2(propName, value) {
		  var ast = parse__default(value);
		  var tokenStream = new TokenStream(ast.nodes);
		  return transforms[propName](tokenStream);
		};
		var transformShorthandValue = baseTransformShorthandValue ;
		var getStylesForProperty = function getStylesForProperty2(propName, inputValue, allowShorthand) {
		  var _ref6;
		  var isRawValue = allowShorthand === false || !(propName in transforms);
		  var value = inputValue.trim();
		  var propValues = isRawValue ? (_ref6 = {}, _ref6[propName] = transformRawValue(propName, value), _ref6) : transformShorthandValue(propName, value);
		  return propValues;
		};
		var getPropertyName = function getPropertyName2(propName) {
		  var isCustomProp = /^--\w+/.test(propName);
		  if (isCustomProp) {
		    return propName;
		  }
		  return camelizeStyleName(propName);
		};
		var index = function index2(rules, shorthandBlacklist) {
		  if (shorthandBlacklist === void 0) {
		    shorthandBlacklist = [];
		  }
		  return rules.reduce(function(accum, rule) {
		    var propertyName = getPropertyName(rule[0]);
		    var value = rule[1];
		    var allowShorthand = shorthandBlacklist.indexOf(propertyName) === -1;
		    return Object.assign(accum, getStylesForProperty(propertyName, value, allowShorthand));
		  }, {});
		};
		exports$1["default"] = index;
		exports$1.getPropertyName = getPropertyName;
		exports$1.getStylesForProperty = getStylesForProperty;
		exports$1.transformRawValue = transformRawValue; 
	} (cssToReactNative));
	return cssToReactNative;
}

var cssToReactNativeExports = requireCssToReactNative();

var cssBackgroundParser$1 = {exports: {}};

/*!
 * https://github.com/gilmoreorless/css-background-parser
 * Copyright © 2015 Gilmore Davidson under the MIT license: http://gilmoreorless.mit-license.org/
 */
var cssBackgroundParser = cssBackgroundParser$1.exports;

var hasRequiredCssBackgroundParser;

function requireCssBackgroundParser () {
	if (hasRequiredCssBackgroundParser) return cssBackgroundParser$1.exports;
	hasRequiredCssBackgroundParser = 1;
	(function (module) {
		(function (exports$1) {

		    function BackgroundList(backgrounds) {
		        if (!(this instanceof BackgroundList)) {
		            return new BackgroundList();
		        }
		        this.backgrounds = backgrounds || [];
		    }

		    BackgroundList.prototype.toString = function () {
		        return this.backgrounds.join(', ');
		    };


		    function Background(props) {
		        if (!(this instanceof Background)) {
		            return new Background(props);
		        }
		        props = props || {};
		        var bg = this;

		        function defprop(name, defaultValue) {
		            bg[name] = (name in props) ? props[name] : defaultValue;
		        }

		        // http://www.w3.org/TR/css3-background/#backgrounds
		        defprop('color', '');
		        defprop('image', 'none');
		        defprop('attachment', 'scroll');
		        defprop('clip', 'border-box');
		        defprop('origin', 'padding-box');
		        defprop('position', '0% 0%');
		        defprop('repeat', 'repeat');
		        defprop('size', 'auto');
		    }

		    Background.prototype.toString = function () {
		        var list = [
		            this.image,
		            this.repeat,
		            this.attachment,
		            this.position + ' / ' + this.size,
		            this.origin,
		            this.clip
		        ];
		        if (this.color) {
		            list.unshift(this.color);
		        }
		        return list.join(' ');
		    };

		    exports$1.BackgroundList = BackgroundList;
		    exports$1.Background = Background;


		    function parseImages(cssText) {
		        var images = [];
		        var tokens = /[,\(\)]/;
		        var parens = 0;
		        var buffer = '';

		        if (cssText == null) {
		            return images;
		        }

		        while (cssText.length) {
		            var match = tokens.exec(cssText);
		            if (!match) {
		                break;
		            }
		            var char = match[0];
		            var ignoreChar = false;
		            switch (char) {
		                case ',':
		                    if (!parens) {
		                        images.push(buffer.trim());
		                        buffer = '';
		                        ignoreChar = true;
		                    }
		                    break;
		                case '(':
		                    parens++;
		                    break;
		                case ')':
		                    parens--;
		                    break;
		            }

		            var index = match.index + 1;
		            buffer += cssText.slice(0, ignoreChar ? index - 1 : index);
		            cssText = cssText.slice(index);
		        }

		        if (buffer.length || cssText.length) {
		            images.push((buffer + cssText).trim());
		        }

		        return images;
		    }

		    // Helper for .map()
		    function trim(str) {
		        return str.trim();
		    }

		    function parseSimpleList(cssText) {
		        return (cssText || '').split(',').map(trim);
		    }

		    exports$1.parseElementStyle = function (styleObject) {
		        var list = new BackgroundList();
		        if (styleObject == null) {
		            return list;
		        }

		        var bgImage = parseImages(styleObject.backgroundImage);
		        var bgColor = styleObject.backgroundColor;
		        var bgAttachment = parseSimpleList(styleObject.backgroundAttachment);
		        var bgClip       = parseSimpleList(styleObject.backgroundClip);
		        var bgOrigin     = parseSimpleList(styleObject.backgroundOrigin);
		        var bgPosition   = parseSimpleList(styleObject.backgroundPosition);
		        var bgRepeat     = parseSimpleList(styleObject.backgroundRepeat);
		        var bgSize       = parseSimpleList(styleObject.backgroundSize);
		        var background;

		        for (var i = 0, ii = bgImage.length; i < ii; i++) {
		            background = new Background({
		                image:      bgImage[i],
		                attachment: bgAttachment[i % bgAttachment.length],
		                clip:       bgClip[i % bgClip.length],
		                origin:     bgOrigin[i % bgOrigin.length],
		                position:   bgPosition[i % bgPosition.length],
		                repeat:     bgRepeat[i % bgRepeat.length],
		                size:       bgSize[i % bgSize.length]
		            });
		            if (i === ii - 1) {
		                background.color = bgColor;
		            }
		            list.backgrounds.push(background);
		        }

		        return list;
		    };

		    // exports.parseCssString = function (cssString) {
		    //     return new Background();
		    // };

		    // exports.parseBackgroundValue = function (cssString) {
		    //     return new Background();
		    // };

		})((function (root) {
		    // CommonJS
		    if (module.exports !== undefined) return module.exports;
		    // Global `cssBgParser`
		    return (root.cssBgParser = {});
		})(cssBackgroundParser)); 
	} (cssBackgroundParser$1));
	return cssBackgroundParser$1.exports;
}

var cssBackgroundParserExports = requireCssBackgroundParser();

var cssBoxShadow;
var hasRequiredCssBoxShadow;

function requireCssBoxShadow () {
	if (hasRequiredCssBoxShadow) return cssBoxShadow;
	hasRequiredCssBoxShadow = 1;
	const VALUES_REG = /,(?![^\(]*\))/;
	const PARTS_REG = /\s(?![^(]*\))/;
	const LENGTH_REG = /^[0-9]+[a-zA-Z%]+?$/;

	const parseValue = str => {
	  const parts = str.split(PARTS_REG);
	  const inset = parts.includes('inset');
	  const last = parts.slice(-1)[0];
	  const color = !isLength(last) ? last : undefined;

	  const nums = parts
	    .filter(n => n !== 'inset')
	    .filter(n => n !== color)
	    .map(toNum);
	  const [ offsetX, offsetY, blurRadius, spreadRadius ] = nums;

	  return {
	    inset,
	    offsetX,
	    offsetY,
	    blurRadius,
	    spreadRadius,
	    color
	  }
	};

	const stringifyValue = obj => {
	  const {
	    inset,
	    offsetX = 0,
	    offsetY = 0,
	    blurRadius = 0,
	    spreadRadius,
	    color
	  } = obj || {};

	  return [
	    (inset ? 'inset' : null),
	    offsetX,
	    offsetY,
	    blurRadius ,
	    spreadRadius,
	    color
	  ].filter(v => v !== null && v !== undefined)
	    .map(toPx)
	    .map(s => ('' + s).trim())
	    .join(' ')
	};

	const isLength = v => v === '0' || LENGTH_REG.test(v);
	const toNum = v => {
	  if (!/px$/.test(v) && v !== '0') return v
	  const n = parseFloat(v);
	  return !isNaN(n) ? n : v
	};
	const toPx = n => typeof n === 'number' && n !== 0 ? (n + 'px') : n;

	const parse = str => str.split(VALUES_REG).map(s => s.trim()).map(parseValue);
	const stringify = arr => arr.map(stringifyValue).join(', ');

	cssBoxShadow = {
	  parse,
	  stringify
	};
	return cssBoxShadow;
}

var cssBoxShadowExports = requireCssBoxShadow();

var colorName$1;
var hasRequiredColorName;

function requireColorName () {
	if (hasRequiredColorName) return colorName$1;
	hasRequiredColorName = 1;

	colorName$1 = {
		"aliceblue": [240, 248, 255],
		"antiquewhite": [250, 235, 215],
		"aqua": [0, 255, 255],
		"aquamarine": [127, 255, 212],
		"azure": [240, 255, 255],
		"beige": [245, 245, 220],
		"bisque": [255, 228, 196],
		"black": [0, 0, 0],
		"blanchedalmond": [255, 235, 205],
		"blue": [0, 0, 255],
		"blueviolet": [138, 43, 226],
		"brown": [165, 42, 42],
		"burlywood": [222, 184, 135],
		"cadetblue": [95, 158, 160],
		"chartreuse": [127, 255, 0],
		"chocolate": [210, 105, 30],
		"coral": [255, 127, 80],
		"cornflowerblue": [100, 149, 237],
		"cornsilk": [255, 248, 220],
		"crimson": [220, 20, 60],
		"cyan": [0, 255, 255],
		"darkblue": [0, 0, 139],
		"darkcyan": [0, 139, 139],
		"darkgoldenrod": [184, 134, 11],
		"darkgray": [169, 169, 169],
		"darkgreen": [0, 100, 0],
		"darkgrey": [169, 169, 169],
		"darkkhaki": [189, 183, 107],
		"darkmagenta": [139, 0, 139],
		"darkolivegreen": [85, 107, 47],
		"darkorange": [255, 140, 0],
		"darkorchid": [153, 50, 204],
		"darkred": [139, 0, 0],
		"darksalmon": [233, 150, 122],
		"darkseagreen": [143, 188, 143],
		"darkslateblue": [72, 61, 139],
		"darkslategray": [47, 79, 79],
		"darkslategrey": [47, 79, 79],
		"darkturquoise": [0, 206, 209],
		"darkviolet": [148, 0, 211],
		"deeppink": [255, 20, 147],
		"deepskyblue": [0, 191, 255],
		"dimgray": [105, 105, 105],
		"dimgrey": [105, 105, 105],
		"dodgerblue": [30, 144, 255],
		"firebrick": [178, 34, 34],
		"floralwhite": [255, 250, 240],
		"forestgreen": [34, 139, 34],
		"fuchsia": [255, 0, 255],
		"gainsboro": [220, 220, 220],
		"ghostwhite": [248, 248, 255],
		"gold": [255, 215, 0],
		"goldenrod": [218, 165, 32],
		"gray": [128, 128, 128],
		"green": [0, 128, 0],
		"greenyellow": [173, 255, 47],
		"grey": [128, 128, 128],
		"honeydew": [240, 255, 240],
		"hotpink": [255, 105, 180],
		"indianred": [205, 92, 92],
		"indigo": [75, 0, 130],
		"ivory": [255, 255, 240],
		"khaki": [240, 230, 140],
		"lavender": [230, 230, 250],
		"lavenderblush": [255, 240, 245],
		"lawngreen": [124, 252, 0],
		"lemonchiffon": [255, 250, 205],
		"lightblue": [173, 216, 230],
		"lightcoral": [240, 128, 128],
		"lightcyan": [224, 255, 255],
		"lightgoldenrodyellow": [250, 250, 210],
		"lightgray": [211, 211, 211],
		"lightgreen": [144, 238, 144],
		"lightgrey": [211, 211, 211],
		"lightpink": [255, 182, 193],
		"lightsalmon": [255, 160, 122],
		"lightseagreen": [32, 178, 170],
		"lightskyblue": [135, 206, 250],
		"lightslategray": [119, 136, 153],
		"lightslategrey": [119, 136, 153],
		"lightsteelblue": [176, 196, 222],
		"lightyellow": [255, 255, 224],
		"lime": [0, 255, 0],
		"limegreen": [50, 205, 50],
		"linen": [250, 240, 230],
		"magenta": [255, 0, 255],
		"maroon": [128, 0, 0],
		"mediumaquamarine": [102, 205, 170],
		"mediumblue": [0, 0, 205],
		"mediumorchid": [186, 85, 211],
		"mediumpurple": [147, 112, 219],
		"mediumseagreen": [60, 179, 113],
		"mediumslateblue": [123, 104, 238],
		"mediumspringgreen": [0, 250, 154],
		"mediumturquoise": [72, 209, 204],
		"mediumvioletred": [199, 21, 133],
		"midnightblue": [25, 25, 112],
		"mintcream": [245, 255, 250],
		"mistyrose": [255, 228, 225],
		"moccasin": [255, 228, 181],
		"navajowhite": [255, 222, 173],
		"navy": [0, 0, 128],
		"oldlace": [253, 245, 230],
		"olive": [128, 128, 0],
		"olivedrab": [107, 142, 35],
		"orange": [255, 165, 0],
		"orangered": [255, 69, 0],
		"orchid": [218, 112, 214],
		"palegoldenrod": [238, 232, 170],
		"palegreen": [152, 251, 152],
		"paleturquoise": [175, 238, 238],
		"palevioletred": [219, 112, 147],
		"papayawhip": [255, 239, 213],
		"peachpuff": [255, 218, 185],
		"peru": [205, 133, 63],
		"pink": [255, 192, 203],
		"plum": [221, 160, 221],
		"powderblue": [176, 224, 230],
		"purple": [128, 0, 128],
		"rebeccapurple": [102, 51, 153],
		"red": [255, 0, 0],
		"rosybrown": [188, 143, 143],
		"royalblue": [65, 105, 225],
		"saddlebrown": [139, 69, 19],
		"salmon": [250, 128, 114],
		"sandybrown": [244, 164, 96],
		"seagreen": [46, 139, 87],
		"seashell": [255, 245, 238],
		"sienna": [160, 82, 45],
		"silver": [192, 192, 192],
		"skyblue": [135, 206, 235],
		"slateblue": [106, 90, 205],
		"slategray": [112, 128, 144],
		"slategrey": [112, 128, 144],
		"snow": [255, 250, 250],
		"springgreen": [0, 255, 127],
		"steelblue": [70, 130, 180],
		"tan": [210, 180, 140],
		"teal": [0, 128, 128],
		"thistle": [216, 191, 216],
		"tomato": [255, 99, 71],
		"turquoise": [64, 224, 208],
		"violet": [238, 130, 238],
		"wheat": [245, 222, 179],
		"white": [255, 255, 255],
		"whitesmoke": [245, 245, 245],
		"yellow": [255, 255, 0],
		"yellowgreen": [154, 205, 50]
	};
	return colorName$1;
}

var colorNameExports = requireColorName();
const colorName = /*@__PURE__*/getDefaultExportFromCjs(colorNameExports);

var hexRgb;
var hasRequiredHexRgb;

function requireHexRgb () {
	if (hasRequiredHexRgb) return hexRgb;
	hasRequiredHexRgb = 1;

	const hexCharacters = 'a-f\\d';
	const match3or4Hex = `#?[${hexCharacters}]{3}[${hexCharacters}]?`;
	const match6or8Hex = `#?[${hexCharacters}]{6}([${hexCharacters}]{2})?`;
	const nonHexChars = new RegExp(`[^#${hexCharacters}]`, 'gi');
	const validHexSize = new RegExp(`^${match3or4Hex}$|^${match6or8Hex}$`, 'i');

	hexRgb = (hex, options = {}) => {
		if (typeof hex !== 'string' || nonHexChars.test(hex) || !validHexSize.test(hex)) {
			throw new TypeError('Expected a valid hex string');
		}

		hex = hex.replace(/^#/, '');
		let alphaFromHex = 1;

		if (hex.length === 8) {
			alphaFromHex = Number.parseInt(hex.slice(6, 8), 16) / 255;
			hex = hex.slice(0, 6);
		}

		if (hex.length === 4) {
			alphaFromHex = Number.parseInt(hex.slice(3, 4).repeat(2), 16) / 255;
			hex = hex.slice(0, 3);
		}

		if (hex.length === 3) {
			hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
		}

		const number = Number.parseInt(hex, 16);
		const red = number >> 16;
		const green = (number >> 8) & 255;
		const blue = number & 255;
		const alpha = typeof options.alpha === 'number' ? options.alpha : alphaFromHex;

		if (options.format === 'array') {
			return [red, green, blue, alpha];
		}

		if (options.format === 'css') {
			const alphaString = alpha === 1 ? '' : ` / ${Number((alpha * 100).toFixed(2))}%`;
			return `rgb(${red} ${green} ${blue}${alphaString})`;
		}

		return {red, green, blue, alpha};
	};
	return hexRgb;
}

var hexRgbExports = requireHexRgb();
const hex2Rgb = /*@__PURE__*/getDefaultExportFromCjs(hexRgbExports);

const pattern = /^#([a-f0-9]{3,4}|[a-f0-9]{4}(?:[a-f0-9]{2}){1,2})\b$/;
var hexRe = new RegExp(pattern, 'i');

const float = '-?\\d*(?:\\.\\d+)';

const number = `(${float}?)`;
const percentage = `(${float}?%)`;
const numberOrPercentage = `(${float}?%?)`;

const pattern$1 = `^
  hsla?\\(
    \\s*(-?\\d*(?:\\.\\d+)?(?:deg|rad|turn)?)\\s*,
    \\s*${percentage}\\s*,
    \\s*${percentage}\\s*
    (?:,\\s*${numberOrPercentage}\\s*)?
  \\)
  $
`.replace(/\n|\s/g, '');

var hsl3Re = new RegExp(pattern$1);

const pattern$2 = `^
  hsla?\\(
    \\s*(-?\\d*(?:\\.\\d+)?(?:deg|rad|turn)?)\\s*
    \\s+${percentage}
    \\s+${percentage}
    \\s*(?:\\s*\\/\\s*${numberOrPercentage}\\s*)?
  \\)
  $
`.replace(/\n|\s/g, '');

var hsl4Re = new RegExp(pattern$2);

const pattern$3 = `^
  rgba?\\(
    \\s*${number}\\s*,
    \\s*${number}\\s*,
    \\s*${number}\\s*
    (?:,\\s*${numberOrPercentage}\\s*)?
  \\)
  $
`.replace(/\n|\s/g, '');

var rgb3NumberRe = new RegExp(pattern$3);

const pattern$4 = `^
  rgba?\\(
    \\s*${percentage}\\s*,
    \\s*${percentage}\\s*,
    \\s*${percentage}\\s*
    (?:,\\s*${numberOrPercentage}\\s*)?
  \\)
  $
`.replace(/\n|\s/g, '');

var rgb3PercentageRe = new RegExp(pattern$4);

const pattern$5 = `^
  rgba?\\(
    \\s*${number}
    \\s+${number}
    \\s+${number}
    \\s*(?:\\s*\\/\\s*${numberOrPercentage}\\s*)?
  \\)
$
`.replace(/\n|\s/g, '');

var rgb4NumberRe = new RegExp(pattern$5);

const pattern$6 = `^
  rgba?\\(
    \\s*${percentage}
    \\s+${percentage}
    \\s+${percentage}
    \\s*(?:\\s*\\/\\s*${numberOrPercentage}\\s*)?
  \\)
$
`.replace(/\n|\s/g, '');

var rgb4PercentageRe = new RegExp(pattern$6);

const pattern$7 = /^transparent$/;
var transparentRe = new RegExp(pattern$7, 'i');

const clamp = (num, min, max) => Math.min(Math.max(min, num), max);

/* 500 => 255, -10 => 0, 128 => 128 */
const parseRGB = (num) => {
  let n = num;
  if (typeof n !== 'number') n = n.endsWith('%') ? (parseFloat(n) * 255) / 100 : parseFloat(n);
  return clamp(Math.round(n), 0, 255);
};

/* 200 => 100, -100 => 0, 50 => 50 */
const parsePercentage = (percentage) => clamp(parseFloat(percentage), 0, 100);

/* '50%' => 5.0, 200 => 1, -10 => 0 */
function parseAlpha(alpha) {
  let a = alpha;
  if (typeof a !== 'number') a = a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a);
  return clamp(a, 0, 1);
}

function getHEX(hex) {
  const [r, g, b, a] = hex2Rgb(hex, { format: 'array' });
  return getRGB([null, ...[r, g, b, a]]);
}

function getHSL([, h, s, l, a = 1]) {
  let hh = h;
  if (hh.endsWith('turn')) {
    hh = (parseFloat(hh) * 360) / 1;
  } else if (hh.endsWith('rad')) {
    hh = Math.round((parseFloat(hh) * 180) / Math.PI);
  } else {
    hh = parseFloat(hh);
  }
  return {
    type: 'hsl',
    values: [hh, parsePercentage(s), parsePercentage(l)],
    alpha: parseAlpha(a === null ? 1 : a)
  };
}

function getRGB([, r, g, b, a = 1]) {
  return {
    type: 'rgb',
    values: [r, g, b].map(parseRGB),
    alpha: parseAlpha(a === null ? 1 : a)
  };
}

/**
 * parse-css-color
 * @version v0.2.1
 * @link http://github.com/noeldelgado/parse-css-color/
 * @license MIT
 */

const parseCSSColor = (str) => {
  if (typeof str !== 'string') return null;

  const hex = hexRe.exec(str);
  if (hex) return getHEX(hex[0]);

  const hsl = hsl4Re.exec(str) || hsl3Re.exec(str);
  if (hsl) return getHSL(hsl);

  const rgb =
    rgb4NumberRe.exec(str) ||
    rgb4PercentageRe.exec(str) ||
    rgb3NumberRe.exec(str) ||
    rgb3PercentageRe.exec(str);
  if (rgb) return getRGB(rgb);

  if (transparentRe.exec(str)) return getRGB([null, 0, 0, 0, 0]);

  const cn = colorName[str.toLowerCase()];
  if (cn) return getRGB([null, cn[0], cn[1], cn[2], 1]);

  return null;
};

var libExports = requireLib();
const TI = /*@__PURE__*/getDefaultExportFromCjs(libExports);

/*!
 * escape-html
 * Copyright(c) 2012-2013 TJ Holowaychuk
 * Copyright(c) 2015 Andreas Lubbe
 * Copyright(c) 2015 Tiancheng "Timothy" Gu
 * MIT Licensed
 */

var escapeHtml_1;
var hasRequiredEscapeHtml;

function requireEscapeHtml () {
	if (hasRequiredEscapeHtml) return escapeHtml_1;
	hasRequiredEscapeHtml = 1;

	/**
	 * Module variables.
	 * @private
	 */

	var matchHtmlRegExp = /["'&<>]/;

	/**
	 * Module exports.
	 * @public
	 */

	escapeHtml_1 = escapeHtml;

	/**
	 * Escape special characters in the given string of html.
	 *
	 * @param  {string} string The string to escape for inserting into HTML
	 * @return {string}
	 * @public
	 */

	function escapeHtml(string) {
	  var str = '' + string;
	  var match = matchHtmlRegExp.exec(str);

	  if (!match) {
	    return str;
	  }

	  var escape;
	  var html = '';
	  var index = 0;
	  var lastIndex = 0;

	  for (index = match.index; index < str.length; index++) {
	    switch (str.charCodeAt(index)) {
	      case 34: // "
	        escape = '&quot;';
	        break;
	      case 38: // &
	        escape = '&amp;';
	        break;
	      case 39: // '
	        escape = '&#39;';
	        break;
	      case 60: // <
	        escape = '&lt;';
	        break;
	      case 62: // >
	        escape = '&gt;';
	        break;
	      default:
	        continue;
	    }

	    if (lastIndex !== index) {
	      html += str.substring(lastIndex, index);
	    }

	    lastIndex = index + 1;
	    html += escape;
	  }

	  return lastIndex !== index
	    ? html + str.substring(lastIndex, index)
	    : html;
	}
	return escapeHtml_1;
}

var escapeHtmlExports = requireEscapeHtml();
const Xs = /*@__PURE__*/getDefaultExportFromCjs(escapeHtmlExports);

function c(e,o=","){let t=[],n=0,i=0;o=new RegExp(o);for(let r=0;r<e.length;r++)e[r]==="("?i++:e[r]===")"&&i--,i===0&&o.test(e[r])&&(t.push(e.slice(n,r).trim()),n=r+1);return t.push(e.slice(n).trim()),t}function g(e){let o=[];for(let t=0,n=e.length;t<n;){let[i,r]=c(e[t],/\s+/);m(e[t+1])?(o.push({color:i,offset:l(r),hint:l(e[t+1])}),t+=2):(o.push({color:i,offset:l(r)}),t++);}return o}var u=/^(-?\d+\.?\d*)(%|vw|vh|px|em|rem|deg|rad|grad|turn|ch|vmin|vmax)?$/;function m(e){return u.test(e)}function l(e){if(!e)return;let[,o,t]=e.trim().match(u)||[];return {value:o,unit:t??"px"}}function P(e){if(!/^(repeating-)?linear-gradient/.test(e))throw new SyntaxError(`could not find syntax for this item: ${e}`);let[,o,t]=e.match(/(repeating-)?linear-gradient\((.+)\)/),n={orientation:{type:"directional",value:"bottom"},repeating:!!o,stops:[]},i=c(t),r=x$1(i[0]);return r&&(n.orientation=r,i.shift()),{...n,stops:g(i)}}function x$1(e){return e.startsWith("to ")?{type:"directional",value:e.replace("to ","")}:["turn","deg","grad","rad"].some(o=>e.endsWith(o))?{type:"angular",value:l(e)}:null}var v=new Set(["closest-corner","closest-side","farthest-corner","farthest-side"]),w=new Set(["center","left","top","right","bottom"]);function d(e){return v.has(e)}function h(e){return w.has(e)}function R$1(e){let o=Array(2).fill("");for(let t=0;t<2;t++)e[t]?o[t]=e[t]:o[t]="center";return o}function K(e){if(!/(repeating-)?radial-gradient/.test(e))throw new SyntaxError(`could not find syntax for this item: ${e}`);let[,o,t]=e.match(/(repeating-)?radial-gradient\((.+)\)/),n={shape:"ellipse",repeating:!!o,size:[{type:"keyword",value:"farthest-corner"}],position:{x:{type:"keyword",value:"center"},y:{type:"keyword",value:"center"}},stops:[]},i=c(t);if(S(i[0]))return {...n,stops:g(i)};let r=i[0].split("at").map(f=>f.trim()),p=((r[0]||"").match(/(circle|ellipse)/)||[])[1],a=(r[0]||"").match(/(-?\d+\.?\d*(vw|vh|px|em|rem|%|rad|grad|turn|deg)?|closest-corner|closest-side|farthest-corner|farthest-side)/g)||[],s=R$1((r[1]||"").split(" "));return p?n.shape=p:a.length===1&&!d(a[0])?n.shape="circle":n.shape="ellipse",a.length===0&&a.push("farthest-corner"),n.size=a.map(f=>d(f)?{type:"keyword",value:f}:{type:"length",value:l(f)}),n.position.x=h(s[0])?{type:"keyword",value:s[0]}:{type:"length",value:l(s[0])},n.position.y=h(s[1])?{type:"keyword",value:s[1]}:{type:"length",value:l(s[1])},(p||a.length>0||r[1])&&i.shift(),{...n,stops:g(i)}}function S(e){return /(circle|ellipse|at)/.test(e)?false:/^(rgba?|hwb|hsl|lab|lch|oklab|color|#|[a-zA-Z]+)/.test(e)}

/**
 * https://opentype.js.org v1.3.5 | (c) Frederik De Bleser and other contributors | MIT License | Uses fflate by 101arrowz and string.prototype.codepointat polyfill by Mathias Bynens
 */

// DEFLATE is a complex format; to read this code, you should probably check the RFC first:

// aliases for shorter compressed code (most minifers don't do this)
var u8 = Uint8Array, u16 = Uint16Array, u32 = Uint32Array;
// fixed length extra bits
var fleb = new u8([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, /* unused */ 0, 0, /* impossible */ 0]);
// fixed distance extra bits
// see fleb note
var fdeb = new u8([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, /* unused */ 0, 0]);
// code length index map
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
// get base, reverse index map from extra bits
var freb = function (eb, start) {
    var b = new u16(31);
    for (var i = 0; i < 31; ++i) {
        b[i] = start += 1 << eb[i - 1];
    }
    // numbers here are at max 18 bits
    var r = new u32(b[30]);
    for (var i = 1; i < 30; ++i) {
        for (var j = b[i]; j < b[i + 1]; ++j) {
            r[j] = ((j - b[i]) << 5) | i;
        }
    }
    return [b, r];
};
var _a = freb(fleb, 2), fl$1 = _a[0], revfl = _a[1];
// we can ignore the fact that the other numbers are wrong; they never happen anyway
fl$1[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0), fd = _b[0];
// map of value to reverse (assuming 16 bits)
var rev = new u16(32768);
for (var i = 0; i < 32768; ++i) {
    // reverse table algorithm from SO
    var x = ((i & 0xAAAA) >>> 1) | ((i & 0x5555) << 1);
    x = ((x & 0xCCCC) >>> 2) | ((x & 0x3333) << 2);
    x = ((x & 0xF0F0) >>> 4) | ((x & 0x0F0F) << 4);
    rev[i] = (((x & 0xFF00) >>> 8) | ((x & 0x00FF) << 8)) >>> 1;
}
// create huffman tree from u8 "map": index -> code length for code index
// mb (max bits) must be at most 15
// TODO: optimize/split up?
var hMap = (function (cd, mb, r) {
    var s = cd.length;
    // index
    var i = 0;
    // u16 "map": index -> # of codes with bit length = index
    var l = new u16(mb);
    // length of cd must be 288 (total # of codes)
    for (; i < s; ++i) {
        if (cd[i])
            { ++l[cd[i] - 1]; }
    }
    // u16 "map": index -> minimum code for bit length = index
    var le = new u16(mb);
    for (i = 0; i < mb; ++i) {
        le[i] = (le[i - 1] + l[i - 1]) << 1;
    }
    var co;
    {
        // u16 "map": index -> number of actual bits, symbol for code
        co = new u16(1 << mb);
        // bits to remove for reverser
        var rvb = 15 - mb;
        for (i = 0; i < s; ++i) {
            // ignore 0 lengths
            if (cd[i]) {
                // num encoding both symbol and bits read
                var sv = (i << 4) | cd[i];
                // free bits
                var r_1 = mb - cd[i];
                // start value
                var v = le[cd[i] - 1]++ << r_1;
                // m is end value
                for (var m = v | ((1 << r_1) - 1); v <= m; ++v) {
                    // every 16 bit value starting with the code yields the same result
                    co[rev[v] >>> rvb] = sv;
                }
            }
        }
    }
    return co;
});
// fixed length tree
var flt = new u8(288);
for (var i = 0; i < 144; ++i)
    { flt[i] = 8; }
for (var i = 144; i < 256; ++i)
    { flt[i] = 9; }
for (var i = 256; i < 280; ++i)
    { flt[i] = 7; }
for (var i = 280; i < 288; ++i)
    { flt[i] = 8; }
// fixed distance tree
var fdt = new u8(32);
for (var i = 0; i < 32; ++i)
    { fdt[i] = 5; }
// fixed length map
var flrm = /*#__PURE__*/ hMap(flt, 9);
// fixed distance map
var fdrm = /*#__PURE__*/ hMap(fdt, 5);
// find max of array
var max = function (a) {
    var m = a[0];
    for (var i = 1; i < a.length; ++i) {
        if (a[i] > m)
            { m = a[i]; }
    }
    return m;
};
// read d, starting at bit p and mask with m
var bits = function (d, p, m) {
    var o = (p / 8) | 0;
    return ((d[o] | (d[o + 1] << 8)) >> (p & 7)) & m;
};
// read d, starting at bit p continuing for at least 16 bits
var bits16 = function (d, p) {
    var o = (p / 8) | 0;
    return ((d[o] | (d[o + 1] << 8) | (d[o + 2] << 16)) >> (p & 7));
};
// get end of byte
var shft = function (p) { return ((p + 7) / 8) | 0; };
// typed array slice - allows garbage collector to free original reference,
// while being more compatible than .slice
var slc = function (v, s, e) {
    if (e == null || e > v.length)
        { e = v.length; }
    // can't use .constructor in case user-supplied
    var n = new (v.BYTES_PER_ELEMENT == 2 ? u16 : v.BYTES_PER_ELEMENT == 4 ? u32 : u8)(e - s);
    n.set(v.subarray(s, e));
    return n;
};
// error codes
var ec = [
    'unexpected EOF',
    'invalid block type',
    'invalid length/literal',
    'invalid distance',
    'stream finished',
    'no stream handler',
    ,
    'no callback',
    'invalid UTF-8 data',
    'extra field too long',
    'date not in range 1980-2099',
    'filename too long',
    'stream finishing',
    'invalid zip data'
    // determined by unknown compression method
];
var err = function (ind, msg, nt) {
    var e = new Error(msg || ec[ind]);
    e.code = ind;
    if (Error.captureStackTrace)
        { Error.captureStackTrace(e, err); }
    if (!nt)
        { throw e; }
    return e;
};
// expands raw DEFLATE data
var inflt = function (dat, buf, st) {
    // source length
    var sl = dat.length;
    if (!sl || (st && st.f && !st.l))
        { return buf || new u8(0); }
    // have to estimate size
    var noBuf = !buf || st;
    // no state
    var noSt = !st || st.i;
    if (!st)
        { st = {}; }
    // Assumes roughly 33% compression ratio average
    if (!buf)
        { buf = new u8(sl * 3); }
    // ensure buffer can fit at least l elements
    var cbuf = function (l) {
        var bl = buf.length;
        // need to increase size to fit
        if (l > bl) {
            // Double or set to necessary, whichever is greater
            var nbuf = new u8(Math.max(bl * 2, l));
            nbuf.set(buf);
            buf = nbuf;
        }
    };
    //  last chunk         bitpos           bytes
    var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
    // total bits
    var tbts = sl * 8;
    do {
        if (!lm) {
            // BFINAL - this is only 1 when last chunk is next
            final = bits(dat, pos, 1);
            // type: 0 = no compression, 1 = fixed huffman, 2 = dynamic huffman
            var type = bits(dat, pos + 1, 3);
            pos += 3;
            if (!type) {
                // go to end of byte boundary
                var s = shft(pos) + 4, l = dat[s - 4] | (dat[s - 3] << 8), t = s + l;
                if (t > sl) {
                    if (noSt)
                        { err(0); }
                    break;
                }
                // ensure size
                if (noBuf)
                    { cbuf(bt + l); }
                // Copy over uncompressed data
                buf.set(dat.subarray(s, t), bt);
                // Get new bitpos, update byte count
                st.b = bt += l, st.p = pos = t * 8, st.f = final;
                continue;
            }
            else if (type == 1)
                { lm = flrm, dm = fdrm, lbt = 9, dbt = 5; }
            else if (type == 2) {
                //  literal                            lengths
                var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
                var tl = hLit + bits(dat, pos + 5, 31) + 1;
                pos += 14;
                // length+distance tree
                var ldt = new u8(tl);
                // code length tree
                var clt = new u8(19);
                for (var i = 0; i < hcLen; ++i) {
                    // use index map to get real code
                    clt[clim[i]] = bits(dat, pos + i * 3, 7);
                }
                pos += hcLen * 3;
                // code lengths bits
                var clb = max(clt), clbmsk = (1 << clb) - 1;
                // code lengths map
                var clm = hMap(clt, clb);
                for (var i = 0; i < tl;) {
                    var r = clm[bits(dat, pos, clbmsk)];
                    // bits read
                    pos += r & 15;
                    // symbol
                    var s = r >>> 4;
                    // code length to copy
                    if (s < 16) {
                        ldt[i++] = s;
                    }
                    else {
                        //  copy   count
                        var c = 0, n = 0;
                        if (s == 16)
                            { n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1]; }
                        else if (s == 17)
                            { n = 3 + bits(dat, pos, 7), pos += 3; }
                        else if (s == 18)
                            { n = 11 + bits(dat, pos, 127), pos += 7; }
                        while (n--)
                            { ldt[i++] = c; }
                    }
                }
                //    length tree                 distance tree
                var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
                // max length bits
                lbt = max(lt);
                // max dist bits
                dbt = max(dt);
                lm = hMap(lt, lbt);
                dm = hMap(dt, dbt);
            }
            else
                { err(1); }
            if (pos > tbts) {
                if (noSt)
                    { err(0); }
                break;
            }
        }
        // Make sure the buffer can hold this + the largest possible addition
        // Maximum chunk size (practically, theoretically infinite) is 2^17;
        if (noBuf)
            { cbuf(bt + 131072); }
        var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
        var lpos = pos;
        for (;; lpos = pos) {
            // bits read, code
            var c = lm[bits16(dat, pos) & lms], sym = c >>> 4;
            pos += c & 15;
            if (pos > tbts) {
                if (noSt)
                    { err(0); }
                break;
            }
            if (!c)
                { err(2); }
            if (sym < 256)
                { buf[bt++] = sym; }
            else if (sym == 256) {
                lpos = pos, lm = null;
                break;
            }
            else {
                var add = sym - 254;
                // no extra bits needed if less
                if (sym > 264) {
                    // index
                    var i = sym - 257, b = fleb[i];
                    add = bits(dat, pos, (1 << b) - 1) + fl$1[i];
                    pos += b;
                }
                // dist
                var d = dm[bits16(dat, pos) & dms], dsym = d >>> 4;
                if (!d)
                    { err(3); }
                pos += d & 15;
                var dt = fd[dsym];
                if (dsym > 3) {
                    var b = fdeb[dsym];
                    dt += bits16(dat, pos) & ((1 << b) - 1), pos += b;
                }
                if (pos > tbts) {
                    if (noSt)
                        { err(0); }
                    break;
                }
                if (noBuf)
                    { cbuf(bt + 131072); }
                var end = bt + add;
                for (; bt < end; bt += 4) {
                    buf[bt] = buf[bt - dt];
                    buf[bt + 1] = buf[bt + 1 - dt];
                    buf[bt + 2] = buf[bt + 2 - dt];
                    buf[bt + 3] = buf[bt + 3 - dt];
                }
                bt = end;
            }
        }
        st.l = lm, st.p = lpos, st.b = bt, st.f = final;
        if (lm)
            { final = 1, st.m = lbt, st.d = dm, st.n = dbt; }
    } while (!final);
    return bt == buf.length ? buf : slc(buf, 0, bt);
};
// empty
var et$1 = /*#__PURE__*/ new u8(0);
/**
 * Expands DEFLATE data with no wrapper
 * @param data The data to decompress
 * @param out Where to write the data. Saves memory if you know the decompressed size and provide an output buffer of that length.
 * @returns The decompressed version of the data
 */
function inflateSync(data, out) {
    return inflt(data, out);
}
// text decoder
var td = typeof TextDecoder != 'undefined' && /*#__PURE__*/ new TextDecoder();
// text decoder stream
var tds = 0;
try {
    td.decode(et$1, { stream: true });
    tds = 1;
}
catch (e) { }

// Geometric objects

// import BoundingBox from './bbox';

/**
 * A bézier path containing a set of path commands similar to a SVG path.
 * Paths can be drawn on a context using `draw`.
 * @exports opentype.Path
 * @class
 * @constructor
 */
function Path() {
    this.commands = [];
    this.fill = 'black';
    this.stroke = null;
    this.strokeWidth = 1;
}

/**
 * @param  {number} x
 * @param  {number} y
 */
Path.prototype.moveTo = function (x, y) {
    this.commands.push({
        type: 'M',
        x: x,
        y: y,
    });
};

/**
 * @param  {number} x
 * @param  {number} y
 */
Path.prototype.lineTo = function (x, y) {
    this.commands.push({
        type: 'L',
        x: x,
        y: y,
    });
};

/**
 * Draws cubic curve
 * @function
 * curveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */

/**
 * Draws cubic curve
 * @function
 * bezierCurveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control 1
 * @param  {number} y1 - y of control 1
 * @param  {number} x2 - x of control 2
 * @param  {number} y2 - y of control 2
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 * @see curveTo
 */
Path.prototype.curveTo = Path.prototype.bezierCurveTo = function (
    x1,
    y1,
    x2,
    y2,
    x,
    y
) {
    this.commands.push({
        type: 'C',
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        x: x,
        y: y,
    });
};

/**
 * Draws quadratic curve
 * @function
 * quadraticCurveTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */

/**
 * Draws quadratic curve
 * @function
 * quadTo
 * @memberof opentype.Path.prototype
 * @param  {number} x1 - x of control
 * @param  {number} y1 - y of control
 * @param  {number} x - x of path point
 * @param  {number} y - y of path point
 */
Path.prototype.quadTo = Path.prototype.quadraticCurveTo = function (
    x1,
    y1,
    x,
    y
) {
    this.commands.push({
        type: 'Q',
        x1: x1,
        y1: y1,
        x: x,
        y: y,
    });
};

/**
 * Closes the path
 * @function closePath
 * @memberof opentype.Path.prototype
 */

/**
 * Close the path
 * @function close
 * @memberof opentype.Path.prototype
 */
Path.prototype.close = Path.prototype.closePath = function () {
    this.commands.push({
        type: 'Z',
    });
};

/**
 * Add the given path or list of commands to the commands of this path.
 * @param  {Array} pathOrCommands - another opentype.Path, an opentype.BoundingBox, or an array of commands.
 */
Path.prototype.extend = function (pathOrCommands) {
    if (pathOrCommands.commands) {
        pathOrCommands = pathOrCommands.commands;
    }
    // else if (pathOrCommands instanceof BoundingBox) {
    //     const box = pathOrCommands;
    //     this.moveTo(box.x1, box.y1);
    //     this.lineTo(box.x2, box.y1);
    //     this.lineTo(box.x2, box.y2);
    //     this.lineTo(box.x1, box.y2);
    //     this.close();
    //     return;
    // }

    Array.prototype.push.apply(this.commands, pathOrCommands);
};

/**
 * Convert the Path to a string of path data instructions
 * See http://www.w3.org/TR/SVG/paths.html#PathData
 * @param  {number} [decimalPlaces=2] - The amount of decimal places for floating-point values
 * @return {string}
 */
Path.prototype.toPathData = function (decimalPlaces) {
    decimalPlaces = decimalPlaces !== undefined ? decimalPlaces : 2;

    function floatToString(v) {
        if (Math.round(v) === v) {
            return '' + Math.round(v);
        } else {
            return v.toFixed(decimalPlaces);
        }
    }

    function packValues() {
        var arguments$1 = arguments;

        var s = '';
        for (var i = 0; i < arguments.length; i += 1) {
            var v = arguments$1[i];
            if (v >= 0 && i > 0) {
                s += ' ';
            }

            s += floatToString(v);
        }

        return s;
    }

    var d = '';
    for (var i = 0; i < this.commands.length; i += 1) {
        var cmd = this.commands[i];
        if (cmd.type === 'M') {
            d += 'M' + packValues(cmd.x, cmd.y);
        } else if (cmd.type === 'L') {
            d += 'L' + packValues(cmd.x, cmd.y);
        } else if (cmd.type === 'C') {
            d += 'C' + packValues(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        } else if (cmd.type === 'Q') {
            d += 'Q' + packValues(cmd.x1, cmd.y1, cmd.x, cmd.y);
        } else if (cmd.type === 'Z') {
            d += 'Z';
        }
    }

    return d;
};

// Glyph encoding

var cffStandardStrings = [
    '.notdef',
    'space',
    'exclam',
    'quotedbl',
    'numbersign',
    'dollar',
    'percent',
    'ampersand',
    'quoteright',
    'parenleft',
    'parenright',
    'asterisk',
    'plus',
    'comma',
    'hyphen',
    'period',
    'slash',
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'colon',
    'semicolon',
    'less',
    'equal',
    'greater',
    'question',
    'at',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
    'bracketleft',
    'backslash',
    'bracketright',
    'asciicircum',
    'underscore',
    'quoteleft',
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
    'braceleft',
    'bar',
    'braceright',
    'asciitilde',
    'exclamdown',
    'cent',
    'sterling',
    'fraction',
    'yen',
    'florin',
    'section',
    'currency',
    'quotesingle',
    'quotedblleft',
    'guillemotleft',
    'guilsinglleft',
    'guilsinglright',
    'fi',
    'fl',
    'endash',
    'dagger',
    'daggerdbl',
    'periodcentered',
    'paragraph',
    'bullet',
    'quotesinglbase',
    'quotedblbase',
    'quotedblright',
    'guillemotright',
    'ellipsis',
    'perthousand',
    'questiondown',
    'grave',
    'acute',
    'circumflex',
    'tilde',
    'macron',
    'breve',
    'dotaccent',
    'dieresis',
    'ring',
    'cedilla',
    'hungarumlaut',
    'ogonek',
    'caron',
    'emdash',
    'AE',
    'ordfeminine',
    'Lslash',
    'Oslash',
    'OE',
    'ordmasculine',
    'ae',
    'dotlessi',
    'lslash',
    'oslash',
    'oe',
    'germandbls',
    'onesuperior',
    'logicalnot',
    'mu',
    'trademark',
    'Eth',
    'onehalf',
    'plusminus',
    'Thorn',
    'onequarter',
    'divide',
    'brokenbar',
    'degree',
    'thorn',
    'threequarters',
    'twosuperior',
    'registered',
    'minus',
    'eth',
    'multiply',
    'threesuperior',
    'copyright',
    'Aacute',
    'Acircumflex',
    'Adieresis',
    'Agrave',
    'Aring',
    'Atilde',
    'Ccedilla',
    'Eacute',
    'Ecircumflex',
    'Edieresis',
    'Egrave',
    'Iacute',
    'Icircumflex',
    'Idieresis',
    'Igrave',
    'Ntilde',
    'Oacute',
    'Ocircumflex',
    'Odieresis',
    'Ograve',
    'Otilde',
    'Scaron',
    'Uacute',
    'Ucircumflex',
    'Udieresis',
    'Ugrave',
    'Yacute',
    'Ydieresis',
    'Zcaron',
    'aacute',
    'acircumflex',
    'adieresis',
    'agrave',
    'aring',
    'atilde',
    'ccedilla',
    'eacute',
    'ecircumflex',
    'edieresis',
    'egrave',
    'iacute',
    'icircumflex',
    'idieresis',
    'igrave',
    'ntilde',
    'oacute',
    'ocircumflex',
    'odieresis',
    'ograve',
    'otilde',
    'scaron',
    'uacute',
    'ucircumflex',
    'udieresis',
    'ugrave',
    'yacute',
    'ydieresis',
    'zcaron',
    'exclamsmall',
    'Hungarumlautsmall',
    'dollaroldstyle',
    'dollarsuperior',
    'ampersandsmall',
    'Acutesmall',
    'parenleftsuperior',
    'parenrightsuperior',
    '266 ff',
    'onedotenleader',
    'zerooldstyle',
    'oneoldstyle',
    'twooldstyle',
    'threeoldstyle',
    'fouroldstyle',
    'fiveoldstyle',
    'sixoldstyle',
    'sevenoldstyle',
    'eightoldstyle',
    'nineoldstyle',
    'commasuperior',
    'threequartersemdash',
    'periodsuperior',
    'questionsmall',
    'asuperior',
    'bsuperior',
    'centsuperior',
    'dsuperior',
    'esuperior',
    'isuperior',
    'lsuperior',
    'msuperior',
    'nsuperior',
    'osuperior',
    'rsuperior',
    'ssuperior',
    'tsuperior',
    'ff',
    'ffi',
    'ffl',
    'parenleftinferior',
    'parenrightinferior',
    'Circumflexsmall',
    'hyphensuperior',
    'Gravesmall',
    'Asmall',
    'Bsmall',
    'Csmall',
    'Dsmall',
    'Esmall',
    'Fsmall',
    'Gsmall',
    'Hsmall',
    'Ismall',
    'Jsmall',
    'Ksmall',
    'Lsmall',
    'Msmall',
    'Nsmall',
    'Osmall',
    'Psmall',
    'Qsmall',
    'Rsmall',
    'Ssmall',
    'Tsmall',
    'Usmall',
    'Vsmall',
    'Wsmall',
    'Xsmall',
    'Ysmall',
    'Zsmall',
    'colonmonetary',
    'onefitted',
    'rupiah',
    'Tildesmall',
    'exclamdownsmall',
    'centoldstyle',
    'Lslashsmall',
    'Scaronsmall',
    'Zcaronsmall',
    'Dieresissmall',
    'Brevesmall',
    'Caronsmall',
    'Dotaccentsmall',
    'Macronsmall',
    'figuredash',
    'hypheninferior',
    'Ogoneksmall',
    'Ringsmall',
    'Cedillasmall',
    'questiondownsmall',
    'oneeighth',
    'threeeighths',
    'fiveeighths',
    'seveneighths',
    'onethird',
    'twothirds',
    'zerosuperior',
    'foursuperior',
    'fivesuperior',
    'sixsuperior',
    'sevensuperior',
    'eightsuperior',
    'ninesuperior',
    'zeroinferior',
    'oneinferior',
    'twoinferior',
    'threeinferior',
    'fourinferior',
    'fiveinferior',
    'sixinferior',
    'seveninferior',
    'eightinferior',
    'nineinferior',
    'centinferior',
    'dollarinferior',
    'periodinferior',
    'commainferior',
    'Agravesmall',
    'Aacutesmall',
    'Acircumflexsmall',
    'Atildesmall',
    'Adieresissmall',
    'Aringsmall',
    'AEsmall',
    'Ccedillasmall',
    'Egravesmall',
    'Eacutesmall',
    'Ecircumflexsmall',
    'Edieresissmall',
    'Igravesmall',
    'Iacutesmall',
    'Icircumflexsmall',
    'Idieresissmall',
    'Ethsmall',
    'Ntildesmall',
    'Ogravesmall',
    'Oacutesmall',
    'Ocircumflexsmall',
    'Otildesmall',
    'Odieresissmall',
    'OEsmall',
    'Oslashsmall',
    'Ugravesmall',
    'Uacutesmall',
    'Ucircumflexsmall',
    'Udieresissmall',
    'Yacutesmall',
    'Thornsmall',
    'Ydieresissmall',
    '001.000',
    '001.001',
    '001.002',
    '001.003',
    'Black',
    'Bold',
    'Book',
    'Light',
    'Medium',
    'Regular',
    'Roman',
    'Semibold' ];

var cffStandardEncoding = [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'space',
    'exclam',
    'quotedbl',
    'numbersign',
    'dollar',
    'percent',
    'ampersand',
    'quoteright',
    'parenleft',
    'parenright',
    'asterisk',
    'plus',
    'comma',
    'hyphen',
    'period',
    'slash',
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'colon',
    'semicolon',
    'less',
    'equal',
    'greater',
    'question',
    'at',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
    'bracketleft',
    'backslash',
    'bracketright',
    'asciicircum',
    'underscore',
    'quoteleft',
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
    'braceleft',
    'bar',
    'braceright',
    'asciitilde',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'exclamdown',
    'cent',
    'sterling',
    'fraction',
    'yen',
    'florin',
    'section',
    'currency',
    'quotesingle',
    'quotedblleft',
    'guillemotleft',
    'guilsinglleft',
    'guilsinglright',
    'fi',
    'fl',
    '',
    'endash',
    'dagger',
    'daggerdbl',
    'periodcentered',
    '',
    'paragraph',
    'bullet',
    'quotesinglbase',
    'quotedblbase',
    'quotedblright',
    'guillemotright',
    'ellipsis',
    'perthousand',
    '',
    'questiondown',
    '',
    'grave',
    'acute',
    'circumflex',
    'tilde',
    'macron',
    'breve',
    'dotaccent',
    'dieresis',
    '',
    'ring',
    'cedilla',
    '',
    'hungarumlaut',
    'ogonek',
    'caron',
    'emdash',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'AE',
    '',
    'ordfeminine',
    '',
    '',
    '',
    '',
    'Lslash',
    'Oslash',
    'OE',
    'ordmasculine',
    '',
    '',
    '',
    '',
    '',
    'ae',
    '',
    '',
    '',
    'dotlessi',
    '',
    '',
    'lslash',
    'oslash',
    'oe',
    'germandbls' ];

var cffExpertEncoding = [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'space',
    'exclamsmall',
    'Hungarumlautsmall',
    '',
    'dollaroldstyle',
    'dollarsuperior',
    'ampersandsmall',
    'Acutesmall',
    'parenleftsuperior',
    'parenrightsuperior',
    'twodotenleader',
    'onedotenleader',
    'comma',
    'hyphen',
    'period',
    'fraction',
    'zerooldstyle',
    'oneoldstyle',
    'twooldstyle',
    'threeoldstyle',
    'fouroldstyle',
    'fiveoldstyle',
    'sixoldstyle',
    'sevenoldstyle',
    'eightoldstyle',
    'nineoldstyle',
    'colon',
    'semicolon',
    'commasuperior',
    'threequartersemdash',
    'periodsuperior',
    'questionsmall',
    '',
    'asuperior',
    'bsuperior',
    'centsuperior',
    'dsuperior',
    'esuperior',
    '',
    '',
    'isuperior',
    '',
    '',
    'lsuperior',
    'msuperior',
    'nsuperior',
    'osuperior',
    '',
    '',
    'rsuperior',
    'ssuperior',
    'tsuperior',
    '',
    'ff',
    'fi',
    'fl',
    'ffi',
    'ffl',
    'parenleftinferior',
    '',
    'parenrightinferior',
    'Circumflexsmall',
    'hyphensuperior',
    'Gravesmall',
    'Asmall',
    'Bsmall',
    'Csmall',
    'Dsmall',
    'Esmall',
    'Fsmall',
    'Gsmall',
    'Hsmall',
    'Ismall',
    'Jsmall',
    'Ksmall',
    'Lsmall',
    'Msmall',
    'Nsmall',
    'Osmall',
    'Psmall',
    'Qsmall',
    'Rsmall',
    'Ssmall',
    'Tsmall',
    'Usmall',
    'Vsmall',
    'Wsmall',
    'Xsmall',
    'Ysmall',
    'Zsmall',
    'colonmonetary',
    'onefitted',
    'rupiah',
    'Tildesmall',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'exclamdownsmall',
    'centoldstyle',
    'Lslashsmall',
    '',
    '',
    'Scaronsmall',
    'Zcaronsmall',
    'Dieresissmall',
    'Brevesmall',
    'Caronsmall',
    '',
    'Dotaccentsmall',
    '',
    '',
    'Macronsmall',
    '',
    '',
    'figuredash',
    'hypheninferior',
    '',
    '',
    'Ogoneksmall',
    'Ringsmall',
    'Cedillasmall',
    '',
    '',
    '',
    'onequarter',
    'onehalf',
    'threequarters',
    'questiondownsmall',
    'oneeighth',
    'threeeighths',
    'fiveeighths',
    'seveneighths',
    'onethird',
    'twothirds',
    '',
    '',
    'zerosuperior',
    'onesuperior',
    'twosuperior',
    'threesuperior',
    'foursuperior',
    'fivesuperior',
    'sixsuperior',
    'sevensuperior',
    'eightsuperior',
    'ninesuperior',
    'zeroinferior',
    'oneinferior',
    'twoinferior',
    'threeinferior',
    'fourinferior',
    'fiveinferior',
    'sixinferior',
    'seveninferior',
    'eightinferior',
    'nineinferior',
    'centinferior',
    'dollarinferior',
    'periodinferior',
    'commainferior',
    'Agravesmall',
    'Aacutesmall',
    'Acircumflexsmall',
    'Atildesmall',
    'Adieresissmall',
    'Aringsmall',
    'AEsmall',
    'Ccedillasmall',
    'Egravesmall',
    'Eacutesmall',
    'Ecircumflexsmall',
    'Edieresissmall',
    'Igravesmall',
    'Iacutesmall',
    'Icircumflexsmall',
    'Idieresissmall',
    'Ethsmall',
    'Ntildesmall',
    'Ogravesmall',
    'Oacutesmall',
    'Ocircumflexsmall',
    'Otildesmall',
    'Odieresissmall',
    'OEsmall',
    'Oslashsmall',
    'Ugravesmall',
    'Uacutesmall',
    'Ucircumflexsmall',
    'Udieresissmall',
    'Yacutesmall',
    'Thornsmall',
    'Ydieresissmall' ];

/**
 * This is the encoding used for fonts created from scratch.
 * It loops through all glyphs and finds the appropriate unicode value.
 * Since it's linear time, other encodings will be faster.
 * @exports opentype.DefaultEncoding
 * @class
 * @constructor
 * @param {opentype.Font}
 */
function DefaultEncoding(font) {
    this.font = font;
}

DefaultEncoding.prototype.charToGlyphIndex = function (c) {
    var code = c.codePointAt(0);
    var glyphs = this.font.glyphs;
    if (glyphs) {
        for (var i = 0; i < glyphs.length; i += 1) {
            var glyph = glyphs.get(i);
            for (var j = 0; j < glyph.unicodes.length; j += 1) {
                if (glyph.unicodes[j] === code) {
                    return i;
                }
            }
        }
    }
    return null;
};

/**
 * @exports opentype.CmapEncoding
 * @class
 * @constructor
 * @param {Object} cmap - a object with the cmap encoded data
 */
function CmapEncoding(cmap) {
    this.cmap = cmap;
}

/**
 * @param  {string} c - the character
 * @return {number} The glyph index.
 */
CmapEncoding.prototype.charToGlyphIndex = function (c) {
    return this.cmap.glyphIndexMap[c.codePointAt(0)] || 0;
};

/**
 * @exports opentype.CffEncoding
 * @class
 * @constructor
 * @param {string} encoding - The encoding
 * @param {Array} charset - The character set.
 */
function CffEncoding(encoding, charset) {
    this.encoding = encoding;
    this.charset = charset;
}

/**
 * @param  {string} s - The character
 * @return {number} The index.
 */
CffEncoding.prototype.charToGlyphIndex = function (s) {
    var code = s.codePointAt(0);
    var charName = this.encoding[code];
    return this.charset.indexOf(charName);
};

function addGlyphNamesAll(font) {
    var glyph;
    var glyphIndexMap = font.tables.cmap.glyphIndexMap;
    var charCodes = Object.keys(glyphIndexMap);

    for (var i = 0; i < charCodes.length; i += 1) {
        var c = charCodes[i];
        var glyphIndex = glyphIndexMap[c];
        glyph = font.glyphs.get(glyphIndex);
        glyph.addUnicode(parseInt(c));
    }
}

function addGlyphNamesToUnicodeMap(font) {
    font._IndexToUnicodeMap = {};

    var glyphIndexMap = font.tables.cmap.glyphIndexMap;
    var charCodes = Object.keys(glyphIndexMap);

    for (var i = 0; i < charCodes.length; i += 1) {
        var c = charCodes[i];
        var glyphIndex = glyphIndexMap[c];
        if (font._IndexToUnicodeMap[glyphIndex] === undefined) {
            font._IndexToUnicodeMap[glyphIndex] = {
                unicodes: [parseInt(c)],
            };
        } else {
            font._IndexToUnicodeMap[glyphIndex].unicodes.push(parseInt(c));
        }
    }
}

/**
 * @alias opentype.addGlyphNames
 * @param {opentype.Font}
 * @param {Object}
 */
function addGlyphNames(font, opt) {
    if (opt.lowMemory) {
        addGlyphNamesToUnicodeMap(font);
    } else {
        addGlyphNamesAll(font);
    }
}

// Run-time checking of preconditions.

function fail(message) {
    throw new Error(message);
}

// Precondition function that checks if the given predicate is true.
// If not, it will throw an error.
function argument(predicate, message) {
    if (!predicate) {
        fail(message);
    }
}
var check = { fail: fail, argument: argument, assert: argument };

// The Glyph object
// import glyf from './tables/glyf' Can't be imported here, because it's a circular dependency

function getPathDefinition(glyph, path) {
    var _path = path || new Path();
    return {
        configurable: true,

        get: function () {
            if (typeof _path === 'function') {
                _path = _path();
            }

            return _path;
        },

        set: function (p) {
            _path = p;
        },
    };
}
/**
 * @typedef GlyphOptions
 * @type Object
 * @property {string} [name] - The glyph name
 * @property {number} [unicode]
 * @property {Array} [unicodes]
 * @property {number} [xMin]
 * @property {number} [yMin]
 * @property {number} [xMax]
 * @property {number} [yMax]
 * @property {number} [advanceWidth]
 */

// A Glyph is an individual mark that often corresponds to a character.
// Some glyphs, such as ligatures, are a combination of many characters.
// Glyphs are the basic building blocks of a font.
//
// The `Glyph` class contains utility methods for drawing the path and its points.
/**
 * @exports opentype.Glyph
 * @class
 * @param {GlyphOptions}
 * @constructor
 */
function Glyph(options) {
    // By putting all the code on a prototype function (which is only declared once)
    // we reduce the memory requirements for larger fonts by some 2%
    this.bindConstructorValues(options);
}

/**
 * @param  {GlyphOptions}
 */
Glyph.prototype.bindConstructorValues = function (options) {
    this.index = options.index || 0;

    // These three values cannot be deferred for memory optimization:
    this.name = options.name || null;
    this.unicode = options.unicode || undefined;
    this.unicodes =
        options.unicodes || options.unicode !== undefined
            ? [options.unicode]
            : [];

    // But by binding these values only when necessary, we reduce can
    // the memory requirements by almost 3% for larger fonts.
    if ('xMin' in options) {
        this.xMin = options.xMin;
    }

    if ('yMin' in options) {
        this.yMin = options.yMin;
    }

    if ('xMax' in options) {
        this.xMax = options.xMax;
    }

    if ('yMax' in options) {
        this.yMax = options.yMax;
    }

    if ('advanceWidth' in options) {
        this.advanceWidth = options.advanceWidth;
    }

    // The path for a glyph is the most memory intensive, and is bound as a value
    // with a getter/setter to ensure we actually do path parsing only once the
    // path is actually needed by anything.
    Object.defineProperty(this, 'path', getPathDefinition(this, options.path));
};

/**
 * @param {number}
 */
Glyph.prototype.addUnicode = function (unicode) {
    if (this.unicodes.length === 0) {
        this.unicode = unicode;
    }

    this.unicodes.push(unicode);
};

// /**
//  * Calculate the minimum bounding box for this glyph.
//  * @return {opentype.BoundingBox}
//  */
// Glyph.prototype.getBoundingBox = function() {
//     return this.path.getBoundingBox();
// };

/**
 * Convert the glyph to a Path we can draw on a drawing context.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {Object=} options - xScale, yScale to stretch the glyph.
 * @param  {opentype.Font} if hinting is to be used, the font
 * @return {opentype.Path}
 */
Glyph.prototype.getPath = function (x, y, fontSize, options, font) {
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    var commands;
    var hPoints;
    if (!options) { options = {}; }
    var xScale = options.xScale;
    var yScale = options.yScale;

    if (options.hinting && font && font.hinting) {
        // in case of hinting, the hinting engine takes care
        // of scaling the points (not the path) before hinting.
        hPoints = this.path && font.hinting.exec(this, fontSize);
        // in case the hinting engine failed hPoints is undefined
        // and thus reverts to plain rending
    }

    if (hPoints) {
        // Call font.hinting.getCommands instead of `glyf.getPath(hPoints).commands` to avoid a circular dependency
        commands = font.hinting.getCommands(hPoints);
        x = Math.round(x);
        y = Math.round(y);
        // TODO in case of hinting xyScaling is not yet supported
        xScale = yScale = 1;
    } else {
        commands = this.path.commands;
        var scale = (1 / (this.path.unitsPerEm || 1000)) * fontSize;
        if (xScale === undefined) { xScale = scale; }
        if (yScale === undefined) { yScale = scale; }
    }

    var p = new Path();
    for (var i = 0; i < commands.length; i += 1) {
        var cmd = commands[i];
        if (cmd.type === 'M') {
            p.moveTo(x + cmd.x * xScale, y + -cmd.y * yScale);
        } else if (cmd.type === 'L') {
            p.lineTo(x + cmd.x * xScale, y + -cmd.y * yScale);
        } else if (cmd.type === 'Q') {
            p.quadraticCurveTo(
                x + cmd.x1 * xScale,
                y + -cmd.y1 * yScale,
                x + cmd.x * xScale,
                y + -cmd.y * yScale
            );
        } else if (cmd.type === 'C') {
            p.curveTo(
                x + cmd.x1 * xScale,
                y + -cmd.y1 * yScale,
                x + cmd.x2 * xScale,
                y + -cmd.y2 * yScale,
                x + cmd.x * xScale,
                y + -cmd.y * yScale
            );
        } else if (cmd.type === 'Z') {
            p.closePath();
        }
    }

    return p;
};

/**
 * Split the glyph into contours.
 * This function is here for backwards compatibility, and to
 * provide raw access to the TrueType glyph outlines.
 * @return {Array}
 */
Glyph.prototype.getContours = function () {
    if (this.points === undefined) {
        return [];
    }

    var contours = [];
    var currentContour = [];
    for (var i = 0; i < this.points.length; i += 1) {
        var pt = this.points[i];
        currentContour.push(pt);
        if (pt.lastPointOfContour) {
            contours.push(currentContour);
            currentContour = [];
        }
    }

    check.argument(
        currentContour.length === 0,
        'There are still points left in the current contour.'
    );
    return contours;
};

/**
 * Calculate the xMin/yMin/xMax/yMax/lsb/rsb for a Glyph.
 * @return {Object}
 */
Glyph.prototype.getMetrics = function () {
    var commands = this.path.commands;
    var xCoords = [];
    var yCoords = [];
    for (var i = 0; i < commands.length; i += 1) {
        var cmd = commands[i];
        if (cmd.type !== 'Z') {
            xCoords.push(cmd.x);
            yCoords.push(cmd.y);
        }

        if (cmd.type === 'Q' || cmd.type === 'C') {
            xCoords.push(cmd.x1);
            yCoords.push(cmd.y1);
        }

        if (cmd.type === 'C') {
            xCoords.push(cmd.x2);
            yCoords.push(cmd.y2);
        }
    }

    var metrics = {
        xMin: Math.min.apply(null, xCoords),
        yMin: Math.min.apply(null, yCoords),
        xMax: Math.max.apply(null, xCoords),
        yMax: Math.max.apply(null, yCoords),
        leftSideBearing: this.leftSideBearing,
    };

    if (!isFinite(metrics.xMin)) {
        metrics.xMin = 0;
    }

    if (!isFinite(metrics.xMax)) {
        metrics.xMax = this.advanceWidth;
    }

    if (!isFinite(metrics.yMin)) {
        metrics.yMin = 0;
    }

    if (!isFinite(metrics.yMax)) {
        metrics.yMax = 0;
    }

    metrics.rightSideBearing =
        this.advanceWidth -
        metrics.leftSideBearing -
        (metrics.xMax - metrics.xMin);
    return metrics;
};

// The GlyphSet object

// Define a property on the glyph that depends on the path being loaded.
function defineDependentProperty(glyph, externalName, internalName) {
    Object.defineProperty(glyph, externalName, {
        get: function () {
            // Request the path property to make sure the path is loaded.
            glyph.path; // jshint ignore:line
            return glyph[internalName];
        },
        set: function (newValue) {
            glyph[internalName] = newValue;
        },
        enumerable: true,
        configurable: true,
    });
}

/**
 * A GlyphSet represents all glyphs available in the font, but modelled using
 * a deferred glyph loader, for retrieving glyphs only once they are absolutely
 * necessary, to keep the memory footprint down.
 * @exports opentype.GlyphSet
 * @class
 * @param {opentype.Font}
 * @param {Array}
 */
function GlyphSet(font, glyphs) {
    this.font = font;
    this.glyphs = {};
    if (Array.isArray(glyphs)) {
        for (var i = 0; i < glyphs.length; i++) {
            var glyph = glyphs[i];
            glyph.path.unitsPerEm = font.unitsPerEm;
            this.glyphs[i] = glyph;
        }
    }

    this.length = (glyphs && glyphs.length) || 0;
}

/**
 * @param  {number} index
 * @return {opentype.Glyph}
 */
GlyphSet.prototype.get = function (index) {
    // this.glyphs[index] is 'undefined' when low memory mode is on. glyph is pushed on request only.
    if (this.glyphs[index] === undefined) {
        this.font._push(index);
        if (typeof this.glyphs[index] === 'function') {
            this.glyphs[index] = this.glyphs[index]();
        }

        var glyph = this.glyphs[index];
        var unicodeObj = this.font._IndexToUnicodeMap[index];

        if (unicodeObj) {
            for (var j = 0; j < unicodeObj.unicodes.length; j++)
                { glyph.addUnicode(unicodeObj.unicodes[j]); }
        }

        this.glyphs[index].advanceWidth =
            this.font._hmtxTableData[index].advanceWidth;
        this.glyphs[index].leftSideBearing =
            this.font._hmtxTableData[index].leftSideBearing;
    } else {
        if (typeof this.glyphs[index] === 'function') {
            this.glyphs[index] = this.glyphs[index]();
        }
    }

    return this.glyphs[index];
};

/**
 * @param  {number} index
 * @param  {Object}
 */
GlyphSet.prototype.push = function (index, loader) {
    this.glyphs[index] = loader;
    this.length++;
};

/**
 * @alias opentype.glyphLoader
 * @param  {opentype.Font} font
 * @param  {number} index
 * @return {opentype.Glyph}
 */
function glyphLoader(font, index) {
    return new Glyph({ index: index, font: font });
}

/**
 * Generate a stub glyph that can be filled with all metadata *except*
 * the "points" and "path" properties, which must be loaded only once
 * the glyph's path is actually requested for text shaping.
 * @alias opentype.ttfGlyphLoader
 * @param  {opentype.Font} font
 * @param  {number} index
 * @param  {Function} parseGlyph
 * @param  {Object} data
 * @param  {number} position
 * @param  {Function} buildPath
 * @return {opentype.Glyph}
 */
function ttfGlyphLoader(font, index, parseGlyph, data, position, buildPath) {
    return function () {
        var glyph = new Glyph({ index: index, font: font });

        glyph.path = function () {
            parseGlyph(glyph, data, position);
            var path = buildPath(font.glyphs, glyph);
            path.unitsPerEm = font.unitsPerEm;
            return path;
        };

        defineDependentProperty(glyph, 'xMin', '_xMin');
        defineDependentProperty(glyph, 'xMax', '_xMax');
        defineDependentProperty(glyph, 'yMin', '_yMin');
        defineDependentProperty(glyph, 'yMax', '_yMax');

        return glyph;
    };
}
/**
 * @alias opentype.cffGlyphLoader
 * @param  {opentype.Font} font
 * @param  {number} index
 * @param  {Function} parseCFFCharstring
 * @param  {string} charstring
 * @return {opentype.Glyph}
 */
function cffGlyphLoader(font, index, parseCFFCharstring, charstring) {
    return function () {
        var glyph = new Glyph({ index: index, font: font });

        glyph.path = function () {
            var path = parseCFFCharstring(font, glyph, charstring);
            path.unitsPerEm = font.unitsPerEm;
            return path;
        };

        return glyph;
    };
}

var glyphset = { GlyphSet: GlyphSet, glyphLoader: glyphLoader, ttfGlyphLoader: ttfGlyphLoader, cffGlyphLoader: cffGlyphLoader };

// The Layout object is the prototype of Substitution objects, and provides

function searchTag(arr, tag) {
    /* jshint bitwise: false */
    var imin = 0;
    var imax = arr.length - 1;
    while (imin <= imax) {
        var imid = (imin + imax) >>> 1;
        var val = arr[imid].tag;
        if (val === tag) {
            return imid;
        } else if (val < tag) {
            imin = imid + 1;
        } else {
            imax = imid - 1;
        }
    }
    // Not found: return -1-insertion point
    return -imin - 1;
}

function binSearch(arr, value) {
    /* jshint bitwise: false */
    var imin = 0;
    var imax = arr.length - 1;
    while (imin <= imax) {
        var imid = (imin + imax) >>> 1;
        var val = arr[imid];
        if (val === value) {
            return imid;
        } else if (val < value) {
            imin = imid + 1;
        } else {
            imax = imid - 1;
        }
    }
    // Not found: return -1-insertion point
    return -imin - 1;
}

// binary search in a list of ranges (coverage, class definition)
function searchRange(ranges, value) {
    // jshint bitwise: false
    var range;
    var imin = 0;
    var imax = ranges.length - 1;
    while (imin <= imax) {
        var imid = (imin + imax) >>> 1;
        range = ranges[imid];
        var start = range.start;
        if (start === value) {
            return range;
        } else if (start < value) {
            imin = imid + 1;
        } else {
            imax = imid - 1;
        }
    }
    if (imin > 0) {
        range = ranges[imin - 1];
        if (value > range.end) { return 0; }
        return range;
    }
}

/**
 * @exports opentype.Layout
 * @class
 */
function Layout(font, tableName) {
    this.font = font;
    this.tableName = tableName;
}

Layout.prototype = {
    /**
     * Binary search an object by "tag" property
     * @instance
     * @function searchTag
     * @memberof opentype.Layout
     * @param  {Array} arr
     * @param  {string} tag
     * @return {number}
     */
    searchTag: searchTag,

    /**
     * Binary search in a list of numbers
     * @instance
     * @function binSearch
     * @memberof opentype.Layout
     * @param  {Array} arr
     * @param  {number} value
     * @return {number}
     */
    binSearch: binSearch,

    /**
     * Get or create the Layout table (GSUB, GPOS etc).
     * @param  {boolean} create - Whether to create a new one.
     * @return {Object} The GSUB or GPOS table.
     */
    getTable: function (create) {
        var layout = this.font.tables[this.tableName];
        if (!layout && create) {
            layout = this.font.tables[this.tableName] =
                this.createDefaultTable();
        }
        return layout;
    },

    /**
     * Returns the best bet for a script name.
     * Returns 'DFLT' if it exists.
     * If not, returns 'latn' if it exists.
     * If neither exist, returns undefined.
     */
    getDefaultScriptName: function () {
        var layout = this.getTable();
        if (!layout) {
            return;
        }
        var hasLatn = false;
        for (var i = 0; i < layout.scripts.length; i++) {
            var name = layout.scripts[i].tag;
            if (name === 'DFLT') { return name; }
            if (name === 'latn') { hasLatn = true; }
        }
        if (hasLatn) { return 'latn'; }
    },

    /**
     * Returns all LangSysRecords in the given script.
     * @instance
     * @param {string} [script='DFLT']
     * @param {boolean} create - forces the creation of this script table if it doesn't exist.
     * @return {Object} An object with tag and script properties.
     */
    getScriptTable: function (script, create) {
        var layout = this.getTable(create);
        if (layout) {
            script = script || 'DFLT';
            var scripts = layout.scripts;
            var pos = searchTag(layout.scripts, script);
            if (pos >= 0) {
                return scripts[pos].script;
            } else if (create) {
                var scr = {
                    tag: script,
                    script: {
                        defaultLangSys: {
                            reserved: 0,
                            reqFeatureIndex: 0xffff,
                            featureIndexes: [],
                        },
                        langSysRecords: [],
                    },
                };
                scripts.splice(-1 - pos, 0, scr);
                return scr.script;
            }
        }
    },

    /**
     * Returns a language system table
     * @instance
     * @param {string} [script='DFLT']
     * @param {string} [language='dlft']
     * @param {boolean} create - forces the creation of this langSysTable if it doesn't exist.
     * @return {Object}
     */
    getLangSysTable: function (script, language, create) {
        var scriptTable = this.getScriptTable(script, create);
        if (scriptTable) {
            if (!language || language === 'dflt' || language === 'DFLT') {
                return scriptTable.defaultLangSys;
            }
            var pos = searchTag(scriptTable.langSysRecords, language);
            if (pos >= 0) {
                return scriptTable.langSysRecords[pos].langSys;
            } else if (create) {
                var langSysRecord = {
                    tag: language,
                    langSys: {
                        reserved: 0,
                        reqFeatureIndex: 0xffff,
                        featureIndexes: [],
                    },
                };
                scriptTable.langSysRecords.splice(-1 - pos, 0, langSysRecord);
                return langSysRecord.langSys;
            }
        }
    },

    /**
     * Get a specific feature table.
     * @instance
     * @param {string} [script='DFLT']
     * @param {string} [language='dlft']
     * @param {string} feature - One of the codes listed at https://www.microsoft.com/typography/OTSPEC/featurelist.htm
     * @param {boolean} create - forces the creation of the feature table if it doesn't exist.
     * @return {Object}
     */
    getFeatureTable: function (script, language, feature, create) {
        var langSysTable = this.getLangSysTable(script, language, create);
        if (langSysTable) {
            var featureRecord;
            var featIndexes = langSysTable.featureIndexes;
            var allFeatures = this.font.tables[this.tableName].features;
            // The FeatureIndex array of indices is in arbitrary order,
            // even if allFeatures is sorted alphabetically by feature tag.
            for (var i = 0; i < featIndexes.length; i++) {
                featureRecord = allFeatures[featIndexes[i]];
                if (featureRecord.tag === feature) {
                    return featureRecord.feature;
                }
            }
            if (create) {
                var index = allFeatures.length;
                // Automatic ordering of features would require to shift feature indexes in the script list.
                check.assert(
                    index === 0 || feature >= allFeatures[index - 1].tag,
                    'Features must be added in alphabetical order.'
                );
                featureRecord = {
                    tag: feature,
                    feature: { params: 0, lookupListIndexes: [] },
                };
                allFeatures.push(featureRecord);
                featIndexes.push(index);
                return featureRecord.feature;
            }
        }
    },

    /**
     * Get the lookup tables of a given type for a script/language/feature.
     * @instance
     * @param {string} [script='DFLT']
     * @param {string} [language='dlft']
     * @param {string} feature - 4-letter feature code
     * @param {number} lookupType - 1 to 9
     * @param {boolean} create - forces the creation of the lookup table if it doesn't exist, with no subtables.
     * @return {Object[]}
     */
    getLookupTables: function (script, language, feature, lookupType, create) {
        var featureTable = this.getFeatureTable(
            script,
            language,
            feature,
            create
        );
        var tables = [];
        if (featureTable) {
            var lookupTable;
            var lookupListIndexes = featureTable.lookupListIndexes;
            var allLookups = this.font.tables[this.tableName].lookups;
            // lookupListIndexes are in no particular order, so use naive search.
            for (var i = 0; i < lookupListIndexes.length; i++) {
                lookupTable = allLookups[lookupListIndexes[i]];
                if (lookupTable.lookupType === lookupType) {
                    tables.push(lookupTable);
                }
            }
            if (tables.length === 0 && create) {
                lookupTable = {
                    lookupType: lookupType,
                    lookupFlag: 0,
                    subtables: [],
                    markFilteringSet: undefined,
                };
                var index = allLookups.length;
                allLookups.push(lookupTable);
                lookupListIndexes.push(index);
                return [lookupTable];
            }
        }
        return tables;
    },

    /**
     * Find a glyph in a class definition table
     * https://docs.microsoft.com/en-us/typography/opentype/spec/chapter2#class-definition-table
     * @param {object} classDefTable - an OpenType Layout class definition table
     * @param {number} glyphIndex - the index of the glyph to find
     * @returns {number} -1 if not found
     */
    getGlyphClass: function (classDefTable, glyphIndex) {
        switch (classDefTable.format) {
            case 1:
                if (
                    classDefTable.startGlyph <= glyphIndex &&
                    glyphIndex <
                        classDefTable.startGlyph + classDefTable.classes.length
                ) {
                    return classDefTable.classes[
                        glyphIndex - classDefTable.startGlyph
                    ];
                }
                return 0;
            case 2:
                var range = searchRange(classDefTable.ranges, glyphIndex);
                return range ? range.classId : 0;
        }
    },

    /**
     * Find a glyph in a coverage table
     * https://docs.microsoft.com/en-us/typography/opentype/spec/chapter2#coverage-table
     * @param {object} coverageTable - an OpenType Layout coverage table
     * @param {number} glyphIndex - the index of the glyph to find
     * @returns {number} -1 if not found
     */
    getCoverageIndex: function (coverageTable, glyphIndex) {
        switch (coverageTable.format) {
            case 1:
                var index = binSearch(coverageTable.glyphs, glyphIndex);
                return index >= 0 ? index : -1;
            case 2:
                var range = searchRange(coverageTable.ranges, glyphIndex);
                return range ? range.index + glyphIndex - range.start : -1;
        }
    },

    /**
     * Returns the list of glyph indexes of a coverage table.
     * Format 1: the list is stored raw
     * Format 2: compact list as range records.
     * @instance
     * @param  {Object} coverageTable
     * @return {Array}
     */
    expandCoverage: function (coverageTable) {
        if (coverageTable.format === 1) {
            return coverageTable.glyphs;
        } else {
            var glyphs = [];
            var ranges = coverageTable.ranges;
            for (var i = 0; i < ranges.length; i++) {
                var range = ranges[i];
                var start = range.start;
                var end = range.end;
                for (var j = start; j <= end; j++) {
                    glyphs.push(j);
                }
            }
            return glyphs;
        }
    },
};

// The Position object provides utility methods to manipulate

/**
 * @exports opentype.Position
 * @class
 * @extends opentype.Layout
 * @param {opentype.Font}
 * @constructor
 */
function Position(font) {
    Layout.call(this, font, 'gpos');
}

Position.prototype = Layout.prototype;

/**
 * Init some data for faster and easier access later.
 */
Position.prototype.init = function() {
    var script = this.getDefaultScriptName();
    this.defaultKerningTables = this.getKerningTables(script);
};

/**
 * Find a glyph pair in a list of lookup tables of type 2 and retrieve the xAdvance kerning value.
 *
 * @param {integer} leftIndex - left glyph index
 * @param {integer} rightIndex - right glyph index
 * @returns {integer}
 */
Position.prototype.getKerningValue = function(kerningLookups, leftIndex, rightIndex) {
    for (var i = 0; i < kerningLookups.length; i++) {
        var subtables = kerningLookups[i].subtables;
        for (var j = 0; j < subtables.length; j++) {
            var subtable = subtables[j];
            var covIndex = this.getCoverageIndex(subtable.coverage, leftIndex);
            if (covIndex < 0) { continue; }
            switch (subtable.posFormat) {
                case 1:
                    // Search Pair Adjustment Positioning Format 1
                    var pairSet = subtable.pairSets[covIndex];
                    for (var k = 0; k < pairSet.length; k++) {
                        var pair = pairSet[k];
                        if (pair.secondGlyph === rightIndex) {
                            return pair.value1 && pair.value1.xAdvance || 0;
                        }
                    }
                    break;      // left glyph found, not right glyph - try next subtable
                case 2:
                    // Search Pair Adjustment Positioning Format 2
                    var class1 = this.getGlyphClass(subtable.classDef1, leftIndex);
                    var class2 = this.getGlyphClass(subtable.classDef2, rightIndex);
                    var pair$1 = subtable.classRecords[class1][class2];
                    return pair$1.value1 && pair$1.value1.xAdvance || 0;
            }
        }
    }
    return 0;
};

/**
 * List all kerning lookup tables.
 *
 * @param {string} [script='DFLT'] - use font.position.getDefaultScriptName() for a better default value
 * @param {string} [language='dflt']
 * @return {object[]} The list of kerning lookup tables (may be empty), or undefined if there is no GPOS table (and we should use the kern table)
 */
Position.prototype.getKerningTables = function(script, language) {
    if (this.font.tables.gpos) {
        return this.getLookupTables(script, language, 'kern', 2);
    }
};

// The Substitution object provides utility methods to manipulate

/**
 * @exports opentype.Substitution
 * @class
 * @extends opentype.Layout
 * @param {opentype.Font}
 * @constructor
 */
function Substitution(font) {
    Layout.call(this, font, 'gsub');
}

// Check if 2 arrays of primitives are equal.
function arraysEqual(ar1, ar2) {
    var n = ar1.length;
    if (n !== ar2.length) {
        return false;
    }
    for (var i = 0; i < n; i++) {
        if (ar1[i] !== ar2[i]) {
            return false;
        }
    }
    return true;
}

// Find the first subtable of a lookup table in a particular format.
function getSubstFormat(lookupTable, format, defaultSubtable) {
    var subtables = lookupTable.subtables;
    for (var i = 0; i < subtables.length; i++) {
        var subtable = subtables[i];
        if (subtable.substFormat === format) {
            return subtable;
        }
    }
    if (defaultSubtable) {
        subtables.push(defaultSubtable);
        return defaultSubtable;
    }
    return undefined;
}

Substitution.prototype = Layout.prototype;

/**
 * Create a default GSUB table.
 * @return {Object} gsub - The GSUB table.
 */
Substitution.prototype.createDefaultTable = function () {
    // Generate a default empty GSUB table with just a DFLT script and dflt lang sys.
    return {
        version: 1,
        scripts: [
            {
                tag: 'DFLT',
                script: {
                    defaultLangSys: {
                        reserved: 0,
                        reqFeatureIndex: 0xffff,
                        featureIndexes: [],
                    },
                    langSysRecords: [],
                },
            } ],
        features: [],
        lookups: [],
    };
};

/**
 * List all single substitutions (lookup type 1) for a given script, language, and feature.
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 * @param {string} feature - 4-character feature name ('aalt', 'salt', 'ss01'...)
 * @return {Array} substitutions - The list of substitutions.
 */
Substitution.prototype.getSingle = function (feature, script, language) {
    var substitutions = [];
    var lookupTables = this.getLookupTables(script, language, feature, 1);
    for (var idx = 0; idx < lookupTables.length; idx++) {
        var subtables = lookupTables[idx].subtables;
        for (var i = 0; i < subtables.length; i++) {
            var subtable = subtables[i];
            var glyphs = this.expandCoverage(subtable.coverage);
            var j = (void 0);
            if (subtable.substFormat === 1) {
                var delta = subtable.deltaGlyphId;
                for (j = 0; j < glyphs.length; j++) {
                    var glyph = glyphs[j];
                    substitutions.push({ sub: glyph, by: glyph + delta });
                }
            } else {
                var substitute = subtable.substitute;
                for (j = 0; j < glyphs.length; j++) {
                    substitutions.push({ sub: glyphs[j], by: substitute[j] });
                }
            }
        }
    }
    return substitutions;
};

/**
 * List all multiple substitutions (lookup type 2) for a given script, language, and feature.
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 * @param {string} feature - 4-character feature name ('ccmp', 'stch')
 * @return {Array} substitutions - The list of substitutions.
 */
Substitution.prototype.getMultiple = function (feature, script, language) {
    var substitutions = [];
    var lookupTables = this.getLookupTables(script, language, feature, 2);
    for (var idx = 0; idx < lookupTables.length; idx++) {
        var subtables = lookupTables[idx].subtables;
        for (var i = 0; i < subtables.length; i++) {
            var subtable = subtables[i];
            var glyphs = this.expandCoverage(subtable.coverage);
            var j = (void 0);

            for (j = 0; j < glyphs.length; j++) {
                var glyph = glyphs[j];
                var replacements = subtable.sequences[j];
                substitutions.push({ sub: glyph, by: replacements });
            }
        }
    }
    return substitutions;
};

/**
 * List all alternates (lookup type 3) for a given script, language, and feature.
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 * @param {string} feature - 4-character feature name ('aalt', 'salt'...)
 * @return {Array} alternates - The list of alternates
 */
Substitution.prototype.getAlternates = function (feature, script, language) {
    var alternates = [];
    var lookupTables = this.getLookupTables(script, language, feature, 3);
    for (var idx = 0; idx < lookupTables.length; idx++) {
        var subtables = lookupTables[idx].subtables;
        for (var i = 0; i < subtables.length; i++) {
            var subtable = subtables[i];
            var glyphs = this.expandCoverage(subtable.coverage);
            var alternateSets = subtable.alternateSets;
            for (var j = 0; j < glyphs.length; j++) {
                alternates.push({ sub: glyphs[j], by: alternateSets[j] });
            }
        }
    }
    return alternates;
};

/**
 * List all ligatures (lookup type 4) for a given script, language, and feature.
 * The result is an array of ligature objects like { sub: [ids], by: id }
 * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 * @return {Array} ligatures - The list of ligatures.
 */
Substitution.prototype.getLigatures = function (feature, script, language) {
    var ligatures = [];
    var lookupTables = this.getLookupTables(script, language, feature, 4);
    for (var idx = 0; idx < lookupTables.length; idx++) {
        var subtables = lookupTables[idx].subtables;
        for (var i = 0; i < subtables.length; i++) {
            var subtable = subtables[i];
            var glyphs = this.expandCoverage(subtable.coverage);
            var ligatureSets = subtable.ligatureSets;
            for (var j = 0; j < glyphs.length; j++) {
                var startGlyph = glyphs[j];
                var ligSet = ligatureSets[j];
                for (var k = 0; k < ligSet.length; k++) {
                    var lig = ligSet[k];
                    ligatures.push({
                        sub: [startGlyph].concat(lig.components),
                        by: lig.ligGlyph,
                    });
                }
            }
        }
    }
    return ligatures;
};

/**
 * Add or modify a single substitution (lookup type 1)
 * Format 2, more flexible, is always used.
 * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
 * @param {Object} substitution - { sub: id, by: id } (format 1 is not supported)
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 */
Substitution.prototype.addSingle = function (
    feature,
    substitution,
    script,
    language
) {
    var lookupTable = this.getLookupTables(
        script,
        language,
        feature,
        1,
        true
    )[0];
    var subtable = getSubstFormat(lookupTable, 2, {
        // lookup type 1 subtable, format 2, coverage format 1
        substFormat: 2,
        coverage: { format: 1, glyphs: [] },
        substitute: [],
    });
    check.assert(
        subtable.coverage.format === 1,
        'Single: unable to modify coverage table format ' +
            subtable.coverage.format
    );
    var coverageGlyph = substitution.sub;
    var pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
    if (pos < 0) {
        pos = -1 - pos;
        subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
        subtable.substitute.splice(pos, 0, 0);
    }
    subtable.substitute[pos] = substitution.by;
};

/**
 * Add or modify a multiple substitution (lookup type 2)
 * @param {string} feature - 4-letter feature name ('ccmp', 'stch')
 * @param {Object} substitution - { sub: id, by: [id] } for format 2.
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 */
Substitution.prototype.addMultiple = function (
    feature,
    substitution,
    script,
    language
) {
    check.assert(
        substitution.by instanceof Array && substitution.by.length > 1,
        'Multiple: "by" must be an array of two or more ids'
    );
    var lookupTable = this.getLookupTables(
        script,
        language,
        feature,
        2,
        true
    )[0];
    var subtable = getSubstFormat(lookupTable, 1, {
        // lookup type 2 subtable, format 1, coverage format 1
        substFormat: 1,
        coverage: { format: 1, glyphs: [] },
        sequences: [],
    });
    check.assert(
        subtable.coverage.format === 1,
        'Multiple: unable to modify coverage table format ' +
            subtable.coverage.format
    );
    var coverageGlyph = substitution.sub;
    var pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
    if (pos < 0) {
        pos = -1 - pos;
        subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
        subtable.sequences.splice(pos, 0, 0);
    }
    subtable.sequences[pos] = substitution.by;
};

/**
 * Add or modify an alternate substitution (lookup type 3)
 * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
 * @param {Object} substitution - { sub: id, by: [ids] }
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 */
Substitution.prototype.addAlternate = function (
    feature,
    substitution,
    script,
    language
) {
    var lookupTable = this.getLookupTables(
        script,
        language,
        feature,
        3,
        true
    )[0];
    var subtable = getSubstFormat(lookupTable, 1, {
        // lookup type 3 subtable, format 1, coverage format 1
        substFormat: 1,
        coverage: { format: 1, glyphs: [] },
        alternateSets: [],
    });
    check.assert(
        subtable.coverage.format === 1,
        'Alternate: unable to modify coverage table format ' +
            subtable.coverage.format
    );
    var coverageGlyph = substitution.sub;
    var pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
    if (pos < 0) {
        pos = -1 - pos;
        subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
        subtable.alternateSets.splice(pos, 0, 0);
    }
    subtable.alternateSets[pos] = substitution.by;
};

/**
 * Add a ligature (lookup type 4)
 * Ligatures with more components must be stored ahead of those with fewer components in order to be found
 * @param {string} feature - 4-letter feature name ('liga', 'rlig', 'dlig'...)
 * @param {Object} ligature - { sub: [ids], by: id }
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 */
Substitution.prototype.addLigature = function (
    feature,
    ligature,
    script,
    language
) {
    var lookupTable = this.getLookupTables(
        script,
        language,
        feature,
        4,
        true
    )[0];
    var subtable = lookupTable.subtables[0];
    if (!subtable) {
        subtable = {
            // lookup type 4 subtable, format 1, coverage format 1
            substFormat: 1,
            coverage: { format: 1, glyphs: [] },
            ligatureSets: [],
        };
        lookupTable.subtables[0] = subtable;
    }
    check.assert(
        subtable.coverage.format === 1,
        'Ligature: unable to modify coverage table format ' +
            subtable.coverage.format
    );
    var coverageGlyph = ligature.sub[0];
    var ligComponents = ligature.sub.slice(1);
    var ligatureTable = {
        ligGlyph: ligature.by,
        components: ligComponents,
    };
    var pos = this.binSearch(subtable.coverage.glyphs, coverageGlyph);
    if (pos >= 0) {
        // ligatureSet already exists
        var ligatureSet = subtable.ligatureSets[pos];
        for (var i = 0; i < ligatureSet.length; i++) {
            // If ligature already exists, return.
            if (arraysEqual(ligatureSet[i].components, ligComponents)) {
                return;
            }
        }
        // ligature does not exist: add it.
        ligatureSet.push(ligatureTable);
    } else {
        // Create a new ligatureSet and add coverage for the first glyph.
        pos = -1 - pos;
        subtable.coverage.glyphs.splice(pos, 0, coverageGlyph);
        subtable.ligatureSets.splice(pos, 0, [ligatureTable]);
    }
};

/**
 * List all feature data for a given script and language.
 * @param {string} feature - 4-letter feature name
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 * @return {Array} substitutions - The list of substitutions.
 */
Substitution.prototype.getFeature = function (feature, script, language) {
    if (/ss\d\d/.test(feature)) {
        // ss01 - ss20
        return this.getSingle(feature, script, language);
    }
    switch (feature) {
        case 'aalt':
        case 'salt':
            return this.getSingle(feature, script, language).concat(
                this.getAlternates(feature, script, language)
            );
        case 'dlig':
        case 'liga':
        case 'rlig':
            return this.getLigatures(feature, script, language);
        case 'ccmp':
            return this.getMultiple(feature, script, language).concat(
                this.getLigatures(feature, script, language)
            );
        case 'stch':
            return this.getMultiple(feature, script, language);
    }
    return undefined;
};

/**
 * Add a substitution to a feature for a given script and language.
 * @param {string} feature - 4-letter feature name
 * @param {Object} sub - the substitution to add (an object like { sub: id or [ids], by: id or [ids] })
 * @param {string} [script='DFLT']
 * @param {string} [language='dflt']
 */
Substitution.prototype.add = function (feature, sub, script, language) {
    if (/ss\d\d/.test(feature)) {
        // ss01 - ss20
        return this.addSingle(feature, sub, script, language);
    }
    switch (feature) {
        case 'aalt':
        case 'salt':
            if (typeof sub.by === 'number') {
                return this.addSingle(feature, sub, script, language);
            }
            return this.addAlternate(feature, sub, script, language);
        case 'dlig':
        case 'liga':
        case 'rlig':
            return this.addLigature(feature, sub, script, language);
        case 'ccmp':
            if (sub.by instanceof Array) {
                return this.addMultiple(feature, sub, script, language);
            }
            return this.addLigature(feature, sub, script, language);
    }
    return undefined;
};

function checkArgument(expression, message) {
    if (!expression) {
        throw message;
    }
}

// Parsing utility functions

// Retrieve an unsigned byte from the DataView.
function getByte(dataView, offset) {
    return dataView.getUint8(offset);
}

// Retrieve an unsigned 16-bit short from the DataView.
// The value is stored in big endian.
function getUShort(dataView, offset) {
    return dataView.getUint16(offset, false);
}

// Retrieve a signed 16-bit short from the DataView.
// The value is stored in big endian.
function getShort(dataView, offset) {
    return dataView.getInt16(offset, false);
}

// Retrieve an unsigned 32-bit long from the DataView.
// The value is stored in big endian.
function getULong(dataView, offset) {
    return dataView.getUint32(offset, false);
}

// Retrieve a 32-bit signed fixed-point number (16.16) from the DataView.
// The value is stored in big endian.
function getFixed(dataView, offset) {
    var decimal = dataView.getInt16(offset, false);
    var fraction = dataView.getUint16(offset + 2, false);
    return decimal + fraction / 65535;
}

// Retrieve a 4-character tag from the DataView.
// Tags are used to identify tables.
function getTag(dataView, offset) {
    var tag = '';
    for (var i = offset; i < offset + 4; i += 1) {
        tag += String.fromCharCode(dataView.getInt8(i));
    }

    return tag;
}

// Retrieve an offset from the DataView.
// Offsets are 1 to 4 bytes in length, depending on the offSize argument.
function getOffset(dataView, offset, offSize) {
    var v = 0;
    for (var i = 0; i < offSize; i += 1) {
        v <<= 8;
        v += dataView.getUint8(offset + i);
    }

    return v;
}

// Retrieve a number of bytes from start offset to the end offset from the DataView.
function getBytes(dataView, startOffset, endOffset) {
    var bytes = [];
    for (var i = startOffset; i < endOffset; i += 1) {
        bytes.push(dataView.getUint8(i));
    }

    return bytes;
}

// Convert the list of bytes to a string.
function bytesToString(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 1) {
        s += String.fromCharCode(bytes[i]);
    }

    return s;
}

var typeOffsets = {
    byte: 1,
    uShort: 2,
    short: 2,
    uLong: 4,
    fixed: 4,
    longDateTime: 8,
    tag: 4
};

// A stateful parser that changes the offset whenever a value is retrieved.
// The data is a DataView.
function Parser(data, offset) {
    this.data = data;
    this.offset = offset;
    this.relativeOffset = 0;
}

Parser.prototype.parseByte = function() {
    var v = this.data.getUint8(this.offset + this.relativeOffset);
    this.relativeOffset += 1;
    return v;
};

Parser.prototype.parseChar = function() {
    var v = this.data.getInt8(this.offset + this.relativeOffset);
    this.relativeOffset += 1;
    return v;
};

Parser.prototype.parseCard8 = Parser.prototype.parseByte;

Parser.prototype.parseUShort = function() {
    var v = this.data.getUint16(this.offset + this.relativeOffset);
    this.relativeOffset += 2;
    return v;
};

Parser.prototype.parseCard16 = Parser.prototype.parseUShort;
Parser.prototype.parseSID = Parser.prototype.parseUShort;
Parser.prototype.parseOffset16 = Parser.prototype.parseUShort;

Parser.prototype.parseShort = function() {
    var v = this.data.getInt16(this.offset + this.relativeOffset);
    this.relativeOffset += 2;
    return v;
};

Parser.prototype.parseF2Dot14 = function() {
    var v = this.data.getInt16(this.offset + this.relativeOffset) / 16384;
    this.relativeOffset += 2;
    return v;
};

Parser.prototype.parseULong = function() {
    var v = getULong(this.data, this.offset + this.relativeOffset);
    this.relativeOffset += 4;
    return v;
};

Parser.prototype.parseOffset32 = Parser.prototype.parseULong;

Parser.prototype.parseFixed = function() {
    var v = getFixed(this.data, this.offset + this.relativeOffset);
    this.relativeOffset += 4;
    return v;
};

Parser.prototype.parseString = function(length) {
    var dataView = this.data;
    var offset = this.offset + this.relativeOffset;
    var string = '';
    this.relativeOffset += length;
    for (var i = 0; i < length; i++) {
        string += String.fromCharCode(dataView.getUint8(offset + i));
    }

    return string;
};

Parser.prototype.parseTag = function() {
    return this.parseString(4);
};

// LONGDATETIME is a 64-bit integer.
// JavaScript and unix timestamps traditionally use 32 bits, so we
// only take the last 32 bits.
// + Since until 2038 those bits will be filled by zeros we can ignore them.
Parser.prototype.parseLongDateTime = function() {
    var v = getULong(this.data, this.offset + this.relativeOffset + 4);
    // Subtract seconds between 01/01/1904 and 01/01/1970
    // to convert Apple Mac timestamp to Standard Unix timestamp
    v -= 2082844800;
    this.relativeOffset += 8;
    return v;
};

Parser.prototype.parseVersion = function(minorBase) {
    var major = getUShort(this.data, this.offset + this.relativeOffset);

    // How to interpret the minor version is very vague in the spec. 0x5000 is 5, 0x1000 is 1
    // Default returns the correct number if minor = 0xN000 where N is 0-9
    // Set minorBase to 1 for tables that use minor = N where N is 0-9
    var minor = getUShort(this.data, this.offset + this.relativeOffset + 2);
    this.relativeOffset += 4;
    if (minorBase === undefined) { minorBase = 0x1000; }
    return major + minor / minorBase / 10;
};

Parser.prototype.skip = function(type, amount) {
    if (amount === undefined) {
        amount = 1;
    }

    this.relativeOffset += typeOffsets[type] * amount;
};

///// Parsing lists and records ///////////////////////////////

// Parse a list of 32 bit unsigned integers.
Parser.prototype.parseULongList = function(count) {
    if (count === undefined) { count = this.parseULong(); }
    var offsets = new Array(count);
    var dataView = this.data;
    var offset = this.offset + this.relativeOffset;
    for (var i = 0; i < count; i++) {
        offsets[i] = dataView.getUint32(offset);
        offset += 4;
    }

    this.relativeOffset += count * 4;
    return offsets;
};

// Parse a list of 16 bit unsigned integers. The length of the list can be read on the stream
// or provided as an argument.
Parser.prototype.parseOffset16List =
Parser.prototype.parseUShortList = function(count) {
    if (count === undefined) { count = this.parseUShort(); }
    var offsets = new Array(count);
    var dataView = this.data;
    var offset = this.offset + this.relativeOffset;
    for (var i = 0; i < count; i++) {
        offsets[i] = dataView.getUint16(offset);
        offset += 2;
    }

    this.relativeOffset += count * 2;
    return offsets;
};

// Parses a list of 16 bit signed integers.
Parser.prototype.parseShortList = function(count) {
    var list = new Array(count);
    var dataView = this.data;
    var offset = this.offset + this.relativeOffset;
    for (var i = 0; i < count; i++) {
        list[i] = dataView.getInt16(offset);
        offset += 2;
    }

    this.relativeOffset += count * 2;
    return list;
};

// Parses a list of bytes.
Parser.prototype.parseByteList = function(count) {
    var list = new Array(count);
    var dataView = this.data;
    var offset = this.offset + this.relativeOffset;
    for (var i = 0; i < count; i++) {
        list[i] = dataView.getUint8(offset++);
    }

    this.relativeOffset += count;
    return list;
};

/**
 * Parse a list of items.
 * Record count is optional, if omitted it is read from the stream.
 * itemCallback is one of the Parser methods.
 */
Parser.prototype.parseList = function(count, itemCallback) {
    if (!itemCallback) {
        itemCallback = count;
        count = this.parseUShort();
    }
    var list = new Array(count);
    for (var i = 0; i < count; i++) {
        list[i] = itemCallback.call(this);
    }
    return list;
};

Parser.prototype.parseList32 = function(count, itemCallback) {
    if (!itemCallback) {
        itemCallback = count;
        count = this.parseULong();
    }
    var list = new Array(count);
    for (var i = 0; i < count; i++) {
        list[i] = itemCallback.call(this);
    }
    return list;
};

/**
 * Parse a list of records.
 * Record count is optional, if omitted it is read from the stream.
 * Example of recordDescription: { sequenceIndex: Parser.uShort, lookupListIndex: Parser.uShort }
 */
Parser.prototype.parseRecordList = function(count, recordDescription) {
    // If the count argument is absent, read it in the stream.
    if (!recordDescription) {
        recordDescription = count;
        count = this.parseUShort();
    }
    var records = new Array(count);
    var fields = Object.keys(recordDescription);
    for (var i = 0; i < count; i++) {
        var rec = {};
        for (var j = 0; j < fields.length; j++) {
            var fieldName = fields[j];
            var fieldType = recordDescription[fieldName];
            rec[fieldName] = fieldType.call(this);
        }
        records[i] = rec;
    }
    return records;
};

Parser.prototype.parseRecordList32 = function(count, recordDescription) {
    // If the count argument is absent, read it in the stream.
    if (!recordDescription) {
        recordDescription = count;
        count = this.parseULong();
    }
    var records = new Array(count);
    var fields = Object.keys(recordDescription);
    for (var i = 0; i < count; i++) {
        var rec = {};
        for (var j = 0; j < fields.length; j++) {
            var fieldName = fields[j];
            var fieldType = recordDescription[fieldName];
            rec[fieldName] = fieldType.call(this);
        }
        records[i] = rec;
    }
    return records;
};

// Parse a data structure into an object
// Example of description: { sequenceIndex: Parser.uShort, lookupListIndex: Parser.uShort }
Parser.prototype.parseStruct = function(description) {
    if (typeof description === 'function') {
        return description.call(this);
    } else {
        var fields = Object.keys(description);
        var struct = {};
        for (var j = 0; j < fields.length; j++) {
            var fieldName = fields[j];
            var fieldType = description[fieldName];
            struct[fieldName] = fieldType.call(this);
        }
        return struct;
    }
};

/**
 * Parse a GPOS valueRecord
 * https://docs.microsoft.com/en-us/typography/opentype/spec/gpos#value-record
 * valueFormat is optional, if omitted it is read from the stream.
 */
Parser.prototype.parseValueRecord = function(valueFormat) {
    if (valueFormat === undefined) {
        valueFormat = this.parseUShort();
    }
    if (valueFormat === 0) {
        // valueFormat2 in kerning pairs is most often 0
        // in this case return undefined instead of an empty object, to save space
        return;
    }
    var valueRecord = {};

    if (valueFormat & 0x0001) { valueRecord.xPlacement = this.parseShort(); }
    if (valueFormat & 0x0002) { valueRecord.yPlacement = this.parseShort(); }
    if (valueFormat & 0x0004) { valueRecord.xAdvance = this.parseShort(); }
    if (valueFormat & 0x0008) { valueRecord.yAdvance = this.parseShort(); }

    // Device table (non-variable font) / VariationIndex table (variable font) not supported
    // https://docs.microsoft.com/fr-fr/typography/opentype/spec/chapter2#devVarIdxTbls
    if (valueFormat & 0x0010) { valueRecord.xPlaDevice = undefined; this.parseShort(); }
    if (valueFormat & 0x0020) { valueRecord.yPlaDevice = undefined; this.parseShort(); }
    if (valueFormat & 0x0040) { valueRecord.xAdvDevice = undefined; this.parseShort(); }
    if (valueFormat & 0x0080) { valueRecord.yAdvDevice = undefined; this.parseShort(); }

    return valueRecord;
};

/**
 * Parse a list of GPOS valueRecords
 * https://docs.microsoft.com/en-us/typography/opentype/spec/gpos#value-record
 * valueFormat and valueCount are read from the stream.
 */
Parser.prototype.parseValueRecordList = function() {
    var valueFormat = this.parseUShort();
    var valueCount = this.parseUShort();
    var values = new Array(valueCount);
    for (var i = 0; i < valueCount; i++) {
        values[i] = this.parseValueRecord(valueFormat);
    }
    return values;
};

Parser.prototype.parsePointer = function(description) {
    var structOffset = this.parseOffset16();
    if (structOffset > 0) {
        // NULL offset => return undefined
        return new Parser(this.data, this.offset + structOffset).parseStruct(description);
    }
    return undefined;
};

Parser.prototype.parsePointer32 = function(description) {
    var structOffset = this.parseOffset32();
    if (structOffset > 0) {
        // NULL offset => return undefined
        return new Parser(this.data, this.offset + structOffset).parseStruct(description);
    }
    return undefined;
};

/**
 * Parse a list of offsets to lists of 16-bit integers,
 * or a list of offsets to lists of offsets to any kind of items.
 * If itemCallback is not provided, a list of list of UShort is assumed.
 * If provided, itemCallback is called on each item and must parse the item.
 * See examples in tables/gsub.js
 */
Parser.prototype.parseListOfLists = function(itemCallback) {
    var offsets = this.parseOffset16List();
    var count = offsets.length;
    var relativeOffset = this.relativeOffset;
    var list = new Array(count);
    for (var i = 0; i < count; i++) {
        var start = offsets[i];
        if (start === 0) {
            // NULL offset
            // Add i as owned property to list. Convenient with assert.
            list[i] = undefined;
            continue;
        }
        this.relativeOffset = start;
        if (itemCallback) {
            var subOffsets = this.parseOffset16List();
            var subList = new Array(subOffsets.length);
            for (var j = 0; j < subOffsets.length; j++) {
                this.relativeOffset = start + subOffsets[j];
                subList[j] = itemCallback.call(this);
            }
            list[i] = subList;
        } else {
            list[i] = this.parseUShortList();
        }
    }
    this.relativeOffset = relativeOffset;
    return list;
};

///// Complex tables parsing //////////////////////////////////

// Parse a coverage table in a GSUB, GPOS or GDEF table.
// https://www.microsoft.com/typography/OTSPEC/chapter2.htm
// parser.offset must point to the start of the table containing the coverage.
Parser.prototype.parseCoverage = function() {
    var startOffset = this.offset + this.relativeOffset;
    var format = this.parseUShort();
    var count = this.parseUShort();
    if (format === 1) {
        return {
            format: 1,
            glyphs: this.parseUShortList(count)
        };
    } else if (format === 2) {
        var ranges = new Array(count);
        for (var i = 0; i < count; i++) {
            ranges[i] = {
                start: this.parseUShort(),
                end: this.parseUShort(),
                index: this.parseUShort()
            };
        }
        return {
            format: 2,
            ranges: ranges
        };
    }
    throw new Error('0x' + startOffset.toString(16) + ': Coverage format must be 1 or 2.');
};

// Parse a Class Definition Table in a GSUB, GPOS or GDEF table.
// https://www.microsoft.com/typography/OTSPEC/chapter2.htm
Parser.prototype.parseClassDef = function() {
    var startOffset = this.offset + this.relativeOffset;
    var format = this.parseUShort();
    if (format === 1) {
        return {
            format: 1,
            startGlyph: this.parseUShort(),
            classes: this.parseUShortList()
        };
    } else if (format === 2) {
        return {
            format: 2,
            ranges: this.parseRecordList({
                start: Parser.uShort,
                end: Parser.uShort,
                classId: Parser.uShort
            })
        };
    }
    throw new Error('0x' + startOffset.toString(16) + ': ClassDef format must be 1 or 2.');
};

///// Static methods ///////////////////////////////////
// These convenience methods can be used as callbacks and should be called with "this" context set to a Parser instance.

Parser.list = function(count, itemCallback) {
    return function() {
        return this.parseList(count, itemCallback);
    };
};

Parser.list32 = function(count, itemCallback) {
    return function() {
        return this.parseList32(count, itemCallback);
    };
};

Parser.recordList = function(count, recordDescription) {
    return function() {
        return this.parseRecordList(count, recordDescription);
    };
};

Parser.recordList32 = function(count, recordDescription) {
    return function() {
        return this.parseRecordList32(count, recordDescription);
    };
};

Parser.pointer = function(description) {
    return function() {
        return this.parsePointer(description);
    };
};

Parser.pointer32 = function(description) {
    return function() {
        return this.parsePointer32(description);
    };
};

Parser.tag = Parser.prototype.parseTag;
Parser.byte = Parser.prototype.parseByte;
Parser.uShort = Parser.offset16 = Parser.prototype.parseUShort;
Parser.uShortList = Parser.prototype.parseUShortList;
Parser.uLong = Parser.offset32 = Parser.prototype.parseULong;
Parser.uLongList = Parser.prototype.parseULongList;
Parser.struct = Parser.prototype.parseStruct;
Parser.coverage = Parser.prototype.parseCoverage;
Parser.classDef = Parser.prototype.parseClassDef;

///// Script, Feature, Lookup lists ///////////////////////////////////////////////
// https://www.microsoft.com/typography/OTSPEC/chapter2.htm

var langSysTable = {
    reserved: Parser.uShort,
    reqFeatureIndex: Parser.uShort,
    featureIndexes: Parser.uShortList
};

Parser.prototype.parseScriptList = function() {
    return this.parsePointer(Parser.recordList({
        tag: Parser.tag,
        script: Parser.pointer({
            defaultLangSys: Parser.pointer(langSysTable),
            langSysRecords: Parser.recordList({
                tag: Parser.tag,
                langSys: Parser.pointer(langSysTable)
            })
        })
    })) || [];
};

Parser.prototype.parseFeatureList = function() {
    return this.parsePointer(Parser.recordList({
        tag: Parser.tag,
        feature: Parser.pointer({
            featureParams: Parser.offset16,
            lookupListIndexes: Parser.uShortList
        })
    })) || [];
};

Parser.prototype.parseLookupList = function(lookupTableParsers) {
    return this.parsePointer(Parser.list(Parser.pointer(function() {
        var lookupType = this.parseUShort();
        check.argument(1 <= lookupType && lookupType <= 9, 'GPOS/GSUB lookup type ' + lookupType + ' unknown.');
        var lookupFlag = this.parseUShort();
        var useMarkFilteringSet = lookupFlag & 0x10;
        return {
            lookupType: lookupType,
            lookupFlag: lookupFlag,
            subtables: this.parseList(Parser.pointer(lookupTableParsers[lookupType])),
            markFilteringSet: useMarkFilteringSet ? this.parseUShort() : undefined
        };
    }))) || [];
};

Parser.prototype.parseFeatureVariationsList = function() {
    return this.parsePointer32(function() {
        var majorVersion = this.parseUShort();
        var minorVersion = this.parseUShort();
        check.argument(majorVersion === 1 && minorVersion < 1, 'GPOS/GSUB feature variations table unknown.');
        var featureVariations = this.parseRecordList32({
            conditionSetOffset: Parser.offset32,
            featureTableSubstitutionOffset: Parser.offset32
        });
        return featureVariations;
    }) || [];
};

var parse = {
    getByte: getByte,
    getCard8: getByte,
    getUShort: getUShort,
    getCard16: getUShort,
    getShort: getShort,
    getULong: getULong,
    getFixed: getFixed,
    getTag: getTag,
    getOffset: getOffset,
    getBytes: getBytes,
    bytesToString: bytesToString,
    Parser: Parser,
};

// The `glyf` table describes the glyphs in TrueType outline format.

// Parse the coordinate data for a glyph.
function parseGlyphCoordinate(p, flag, previousValue, shortVectorBitMask, sameBitMask) {
    var v;
    if ((flag & shortVectorBitMask) > 0) {
        // The coordinate is 1 byte long.
        v = p.parseByte();
        // The `same` bit is re-used for short values to signify the sign of the value.
        if ((flag & sameBitMask) === 0) {
            v = -v;
        }

        v = previousValue + v;
    } else {
        //  The coordinate is 2 bytes long.
        // If the `same` bit is set, the coordinate is the same as the previous coordinate.
        if ((flag & sameBitMask) > 0) {
            v = previousValue;
        } else {
            // Parse the coordinate as a signed 16-bit delta value.
            v = previousValue + p.parseShort();
        }
    }

    return v;
}

// Parse a TrueType glyph.
function parseGlyph(glyph, data, start) {
    var p = new parse.Parser(data, start);
    glyph.numberOfContours = p.parseShort();
    glyph._xMin = p.parseShort();
    glyph._yMin = p.parseShort();
    glyph._xMax = p.parseShort();
    glyph._yMax = p.parseShort();
    var flags;
    var flag;

    if (glyph.numberOfContours > 0) {
        // This glyph is not a composite.
        var endPointIndices = glyph.endPointIndices = [];
        for (var i = 0; i < glyph.numberOfContours; i += 1) {
            endPointIndices.push(p.parseUShort());
        }

        glyph.instructionLength = p.parseUShort();
        glyph.instructions = [];
        for (var i$1 = 0; i$1 < glyph.instructionLength; i$1 += 1) {
            glyph.instructions.push(p.parseByte());
        }

        var numberOfCoordinates = endPointIndices[endPointIndices.length - 1] + 1;
        flags = [];
        for (var i$2 = 0; i$2 < numberOfCoordinates; i$2 += 1) {
            flag = p.parseByte();
            flags.push(flag);
            // If bit 3 is set, we repeat this flag n times, where n is the next byte.
            if ((flag & 8) > 0) {
                var repeatCount = p.parseByte();
                for (var j = 0; j < repeatCount; j += 1) {
                    flags.push(flag);
                    i$2 += 1;
                }
            }
        }

        check.argument(flags.length === numberOfCoordinates, 'Bad flags.');

        if (endPointIndices.length > 0) {
            var points = [];
            var point;
            // X/Y coordinates are relative to the previous point, except for the first point which is relative to 0,0.
            if (numberOfCoordinates > 0) {
                for (var i$3 = 0; i$3 < numberOfCoordinates; i$3 += 1) {
                    flag = flags[i$3];
                    point = {};
                    point.onCurve = !!(flag & 1);
                    point.lastPointOfContour = endPointIndices.indexOf(i$3) >= 0;
                    points.push(point);
                }

                var px = 0;
                for (var i$4 = 0; i$4 < numberOfCoordinates; i$4 += 1) {
                    flag = flags[i$4];
                    point = points[i$4];
                    point.x = parseGlyphCoordinate(p, flag, px, 2, 16);
                    px = point.x;
                }

                var py = 0;
                for (var i$5 = 0; i$5 < numberOfCoordinates; i$5 += 1) {
                    flag = flags[i$5];
                    point = points[i$5];
                    point.y = parseGlyphCoordinate(p, flag, py, 4, 32);
                    py = point.y;
                }
            }

            glyph.points = points;
        } else {
            glyph.points = [];
        }
    } else if (glyph.numberOfContours === 0) {
        glyph.points = [];
    } else {
        glyph.isComposite = true;
        glyph.points = [];
        glyph.components = [];
        var moreComponents = true;
        while (moreComponents) {
            flags = p.parseUShort();
            var component = {
                glyphIndex: p.parseUShort(),
                xScale: 1,
                scale01: 0,
                scale10: 0,
                yScale: 1,
                dx: 0,
                dy: 0
            };
            if ((flags & 1) > 0) {
                // The arguments are words
                if ((flags & 2) > 0) {
                    // values are offset
                    component.dx = p.parseShort();
                    component.dy = p.parseShort();
                } else {
                    // values are matched points
                    component.matchedPoints = [p.parseUShort(), p.parseUShort()];
                }

            } else {
                // The arguments are bytes
                if ((flags & 2) > 0) {
                    // values are offset
                    component.dx = p.parseChar();
                    component.dy = p.parseChar();
                } else {
                    // values are matched points
                    component.matchedPoints = [p.parseByte(), p.parseByte()];
                }
            }

            if ((flags & 8) > 0) {
                // We have a scale
                component.xScale = component.yScale = p.parseF2Dot14();
            } else if ((flags & 64) > 0) {
                // We have an X / Y scale
                component.xScale = p.parseF2Dot14();
                component.yScale = p.parseF2Dot14();
            } else if ((flags & 128) > 0) {
                // We have a 2x2 transformation
                component.xScale = p.parseF2Dot14();
                component.scale01 = p.parseF2Dot14();
                component.scale10 = p.parseF2Dot14();
                component.yScale = p.parseF2Dot14();
            }

            glyph.components.push(component);
            moreComponents = !!(flags & 32);
        }
        if (flags & 0x100) {
            // We have instructions
            glyph.instructionLength = p.parseUShort();
            glyph.instructions = [];
            for (var i$6 = 0; i$6 < glyph.instructionLength; i$6 += 1) {
                glyph.instructions.push(p.parseByte());
            }
        }
    }
}

// Transform an array of points and return a new array.
function transformPoints(points, transform) {
    var newPoints = [];
    for (var i = 0; i < points.length; i += 1) {
        var pt = points[i];
        var newPt = {
            x: transform.xScale * pt.x + transform.scale01 * pt.y + transform.dx,
            y: transform.scale10 * pt.x + transform.yScale * pt.y + transform.dy,
            onCurve: pt.onCurve,
            lastPointOfContour: pt.lastPointOfContour
        };
        newPoints.push(newPt);
    }

    return newPoints;
}

function getContours(points) {
    var contours = [];
    var currentContour = [];
    for (var i = 0; i < points.length; i += 1) {
        var pt = points[i];
        currentContour.push(pt);
        if (pt.lastPointOfContour) {
            contours.push(currentContour);
            currentContour = [];
        }
    }

    check.argument(currentContour.length === 0, 'There are still points left in the current contour.');
    return contours;
}

// Convert the TrueType glyph outline to a Path.
function getPath(points) {
    var p = new Path();
    if (!points) {
        return p;
    }

    var contours = getContours(points);

    for (var contourIndex = 0; contourIndex < contours.length; ++contourIndex) {
        var contour = contours[contourIndex];

        var prev = null;
        var curr = contour[contour.length - 1];
        var next = contour[0];

        if (curr.onCurve) {
            p.moveTo(curr.x, curr.y);
        } else {
            if (next.onCurve) {
                p.moveTo(next.x, next.y);
            } else {
                // If both first and last points are off-curve, start at their middle.
                var start = {x: (curr.x + next.x) * 0.5, y: (curr.y + next.y) * 0.5};
                p.moveTo(start.x, start.y);
            }
        }

        for (var i = 0; i < contour.length; ++i) {
            prev = curr;
            curr = next;
            next = contour[(i + 1) % contour.length];

            if (curr.onCurve) {
                // This is a straight line.
                p.lineTo(curr.x, curr.y);
            } else {
                var next2 = next;

                if (!prev.onCurve) {
                    ({ x: (curr.x + prev.x) * 0.5, y: (curr.y + prev.y) * 0.5 });
                }

                if (!next.onCurve) {
                    next2 = { x: (curr.x + next.x) * 0.5, y: (curr.y + next.y) * 0.5 };
                }

                p.quadraticCurveTo(curr.x, curr.y, next2.x, next2.y);
            }
        }

        p.closePath();
    }
    return p;
}

function buildPath(glyphs, glyph) {
    if (glyph.isComposite) {
        for (var j = 0; j < glyph.components.length; j += 1) {
            var component = glyph.components[j];
            var componentGlyph = glyphs.get(component.glyphIndex);
            // Force the ttfGlyphLoader to parse the glyph.
            componentGlyph.getPath();
            if (componentGlyph.points) {
                var transformedPoints = (void 0);
                if (component.matchedPoints === undefined) {
                    // component positioned by offset
                    transformedPoints = transformPoints(componentGlyph.points, component);
                } else {
                    // component positioned by matched points
                    if ((component.matchedPoints[0] > glyph.points.length - 1) ||
                        (component.matchedPoints[1] > componentGlyph.points.length - 1)) {
                        throw Error('Matched points out of range in ' + glyph.name);
                    }
                    var firstPt = glyph.points[component.matchedPoints[0]];
                    var secondPt = componentGlyph.points[component.matchedPoints[1]];
                    var transform = {
                        xScale: component.xScale, scale01: component.scale01,
                        scale10: component.scale10, yScale: component.yScale,
                        dx: 0, dy: 0
                    };
                    secondPt = transformPoints([secondPt], transform)[0];
                    transform.dx = firstPt.x - secondPt.x;
                    transform.dy = firstPt.y - secondPt.y;
                    transformedPoints = transformPoints(componentGlyph.points, transform);
                }
                glyph.points = glyph.points.concat(transformedPoints);
            }
        }
    }

    return getPath(glyph.points);
}

function parseGlyfTableAll(data, start, loca, font) {
    var glyphs = new glyphset.GlyphSet(font);

    // The last element of the loca table is invalid.
    for (var i = 0; i < loca.length - 1; i += 1) {
        var offset = loca[i];
        var nextOffset = loca[i + 1];
        if (offset !== nextOffset) {
            glyphs.push(i, glyphset.ttfGlyphLoader(font, i, parseGlyph, data, start + offset, buildPath));
        } else {
            glyphs.push(i, glyphset.glyphLoader(font, i));
        }
    }

    return glyphs;
}

function parseGlyfTableOnLowMemory(data, start, loca, font) {
    var glyphs = new glyphset.GlyphSet(font);

    font._push = function(i) {
        var offset = loca[i];
        var nextOffset = loca[i + 1];
        if (offset !== nextOffset) {
            glyphs.push(i, glyphset.ttfGlyphLoader(font, i, parseGlyph, data, start + offset, buildPath));
        } else {
            glyphs.push(i, glyphset.glyphLoader(font, i));
        }
    };

    return glyphs;
}

// Parse all the glyphs according to the offsets from the `loca` table.
function parseGlyfTable(data, start, loca, font, opt) {
    if (opt.lowMemory)
        { return parseGlyfTableOnLowMemory(data, start, loca, font); }
    else
        { return parseGlyfTableAll(data, start, loca, font); }
}

var glyf = { getPath: getPath, parse: parseGlyfTable};

/* A TrueType font hinting interpreter.
*
* (c) 2017 Axel Kittenberger
*
* This interpreter has been implemented according to this documentation:
* https://developer.apple.com/fonts/TrueType-Reference-Manual/RM05/Chap5.html
*
* According to the documentation F24DOT6 values are used for pixels.
* That means calculation is 1/64 pixel accurate and uses integer operations.
* However, Javascript has floating point operations by default and only
* those are available. One could make a case to simulate the 1/64 accuracy
* exactly by truncating after every division operation
* (for example with << 0) to get pixel exactly results as other TrueType
* implementations. It may make sense since some fonts are pixel optimized
* by hand using DELTAP instructions. The current implementation doesn't
* and rather uses full floating point precision.
*
* xScale, yScale and rotation is currently ignored.
*
* A few non-trivial instructions are missing as I didn't encounter yet
* a font that used them to test a possible implementation.
*
* Some fonts seem to use undocumented features regarding the twilight zone.
* Only some of them are implemented as they were encountered.
*
* The exports.DEBUG statements are removed on the minified distribution file.
*/

var instructionTable;
var exec;
var execGlyph;
var execComponent;

/*
* Creates a hinting object.
*
* There ought to be exactly one
* for each truetype font that is used for hinting.
*/
function Hinting(font) {
    // the font this hinting object is for
    this.font = font;

    this.getCommands = function (hPoints) {
        return glyf.getPath(hPoints).commands;
    };

    // cached states
    this._fpgmState  =
    this._prepState  =
        undefined;

    // errorState
    // 0 ... all okay
    // 1 ... had an error in a glyf,
    //       continue working but stop spamming
    //       the console
    // 2 ... error at prep, stop hinting at this ppem
    // 3 ... error at fpeg, stop hinting for this font at all
    this._errorState = 0;
}

/*
* Not rounding.
*/
function roundOff(v) {
    return v;
}

/*
* Rounding to grid.
*/
function roundToGrid(v) {
    //Rounding in TT is supposed to "symmetrical around zero"
    return Math.sign(v) * Math.round(Math.abs(v));
}

/*
* Rounding to double grid.
*/
function roundToDoubleGrid(v) {
    return Math.sign(v) * Math.round(Math.abs(v * 2)) / 2;
}

/*
* Rounding to half grid.
*/
function roundToHalfGrid(v) {
    return Math.sign(v) * (Math.round(Math.abs(v) + 0.5) - 0.5);
}

/*
* Rounding to up to grid.
*/
function roundUpToGrid(v) {
    return Math.sign(v) * Math.ceil(Math.abs(v));
}

/*
* Rounding to down to grid.
*/
function roundDownToGrid(v) {
    return Math.sign(v) * Math.floor(Math.abs(v));
}

/*
* Super rounding.
*/
var roundSuper = function (v) {
    var period = this.srPeriod;
    var phase = this.srPhase;
    var threshold = this.srThreshold;
    var sign = 1;

    if (v < 0) {
        v = -v;
        sign = -1;
    }

    v += threshold - phase;

    v = Math.trunc(v / period) * period;

    v += phase;

    // according to http://xgridfit.sourceforge.net/round.html
    if (v < 0) { return phase * sign; }

    return v * sign;
};

/*
* Unit vector of x-axis.
*/
var xUnitVector = {
    x: 1,

    y: 0,

    axis: 'x',

    // Gets the projected distance between two points.
    // o1/o2 ... if true, respective original position is used.
    distance: function (p1, p2, o1, o2) {
        return (o1 ? p1.xo : p1.x) - (o2 ? p2.xo : p2.x);
    },

    // Moves point p so the moved position has the same relative
    // position to the moved positions of rp1 and rp2 than the
    // original positions had.
    //
    // See APPENDIX on INTERPOLATE at the bottom of this file.
    interpolate: function (p, rp1, rp2, pv) {
        var do1;
        var do2;
        var doa1;
        var doa2;
        var dm1;
        var dm2;
        var dt;

        if (!pv || pv === this) {
            do1 = p.xo - rp1.xo;
            do2 = p.xo - rp2.xo;
            dm1 = rp1.x - rp1.xo;
            dm2 = rp2.x - rp2.xo;
            doa1 = Math.abs(do1);
            doa2 = Math.abs(do2);
            dt = doa1 + doa2;

            if (dt === 0) {
                p.x = p.xo + (dm1 + dm2) / 2;
                return;
            }

            p.x = p.xo + (dm1 * doa2 + dm2 * doa1) / dt;
            return;
        }

        do1 = pv.distance(p, rp1, true, true);
        do2 = pv.distance(p, rp2, true, true);
        dm1 = pv.distance(rp1, rp1, false, true);
        dm2 = pv.distance(rp2, rp2, false, true);
        doa1 = Math.abs(do1);
        doa2 = Math.abs(do2);
        dt = doa1 + doa2;

        if (dt === 0) {
            xUnitVector.setRelative(p, p, (dm1 + dm2) / 2, pv, true);
            return;
        }

        xUnitVector.setRelative(p, p, (dm1 * doa2 + dm2 * doa1) / dt, pv, true);
    },

    // Slope of line normal to this
    normalSlope: Number.NEGATIVE_INFINITY,

    // Sets the point 'p' relative to point 'rp'
    // by the distance 'd'.
    //
    // See APPENDIX on SETRELATIVE at the bottom of this file.
    //
    // p   ... point to set
    // rp  ... reference point
    // d   ... distance on projection vector
    // pv  ... projection vector (undefined = this)
    // org ... if true, uses the original position of rp as reference.
    setRelative: function (p, rp, d, pv, org) {
        if (!pv || pv === this) {
            p.x = (org ? rp.xo : rp.x) + d;
            return;
        }

        var rpx = org ? rp.xo : rp.x;
        var rpy = org ? rp.yo : rp.y;
        var rpdx = rpx + d * pv.x;
        var rpdy = rpy + d * pv.y;

        p.x = rpdx + (p.y - rpdy) / pv.normalSlope;
    },

    // Slope of vector line.
    slope: 0,

    // Touches the point p.
    touch: function (p) {
        p.xTouched = true;
    },

    // Tests if a point p is touched.
    touched: function (p) {
        return p.xTouched;
    },

    // Untouches the point p.
    untouch: function (p) {
        p.xTouched = false;
    }
};

/*
* Unit vector of y-axis.
*/
var yUnitVector = {
    x: 0,

    y: 1,

    axis: 'y',

    // Gets the projected distance between two points.
    // o1/o2 ... if true, respective original position is used.
    distance: function (p1, p2, o1, o2) {
        return (o1 ? p1.yo : p1.y) - (o2 ? p2.yo : p2.y);
    },

    // Moves point p so the moved position has the same relative
    // position to the moved positions of rp1 and rp2 than the
    // original positions had.
    //
    // See APPENDIX on INTERPOLATE at the bottom of this file.
    interpolate: function (p, rp1, rp2, pv) {
        var do1;
        var do2;
        var doa1;
        var doa2;
        var dm1;
        var dm2;
        var dt;

        if (!pv || pv === this) {
            do1 = p.yo - rp1.yo;
            do2 = p.yo - rp2.yo;
            dm1 = rp1.y - rp1.yo;
            dm2 = rp2.y - rp2.yo;
            doa1 = Math.abs(do1);
            doa2 = Math.abs(do2);
            dt = doa1 + doa2;

            if (dt === 0) {
                p.y = p.yo + (dm1 + dm2) / 2;
                return;
            }

            p.y = p.yo + (dm1 * doa2 + dm2 * doa1) / dt;
            return;
        }

        do1 = pv.distance(p, rp1, true, true);
        do2 = pv.distance(p, rp2, true, true);
        dm1 = pv.distance(rp1, rp1, false, true);
        dm2 = pv.distance(rp2, rp2, false, true);
        doa1 = Math.abs(do1);
        doa2 = Math.abs(do2);
        dt = doa1 + doa2;

        if (dt === 0) {
            yUnitVector.setRelative(p, p, (dm1 + dm2) / 2, pv, true);
            return;
        }

        yUnitVector.setRelative(p, p, (dm1 * doa2 + dm2 * doa1) / dt, pv, true);
    },

    // Slope of line normal to this.
    normalSlope: 0,

    // Sets the point 'p' relative to point 'rp'
    // by the distance 'd'
    //
    // See APPENDIX on SETRELATIVE at the bottom of this file.
    //
    // p   ... point to set
    // rp  ... reference point
    // d   ... distance on projection vector
    // pv  ... projection vector (undefined = this)
    // org ... if true, uses the original position of rp as reference.
    setRelative: function (p, rp, d, pv, org) {
        if (!pv || pv === this) {
            p.y = (org ? rp.yo : rp.y) + d;
            return;
        }

        var rpx = org ? rp.xo : rp.x;
        var rpy = org ? rp.yo : rp.y;
        var rpdx = rpx + d * pv.x;
        var rpdy = rpy + d * pv.y;

        p.y = rpdy + pv.normalSlope * (p.x - rpdx);
    },

    // Slope of vector line.
    slope: Number.POSITIVE_INFINITY,

    // Touches the point p.
    touch: function (p) {
        p.yTouched = true;
    },

    // Tests if a point p is touched.
    touched: function (p) {
        return p.yTouched;
    },

    // Untouches the point p.
    untouch: function (p) {
        p.yTouched = false;
    }
};

Object.freeze(xUnitVector);
Object.freeze(yUnitVector);

/*
* Creates a unit vector that is not x- or y-axis.
*/
function UnitVector(x, y) {
    this.x = x;
    this.y = y;
    this.axis = undefined;
    this.slope = y / x;
    this.normalSlope = -x / y;
    Object.freeze(this);
}

/*
* Gets the projected distance between two points.
* o1/o2 ... if true, respective original position is used.
*/
UnitVector.prototype.distance = function(p1, p2, o1, o2) {
    return (
        this.x * xUnitVector.distance(p1, p2, o1, o2) +
        this.y * yUnitVector.distance(p1, p2, o1, o2)
    );
};

/*
* Moves point p so the moved position has the same relative
* position to the moved positions of rp1 and rp2 than the
* original positions had.
*
* See APPENDIX on INTERPOLATE at the bottom of this file.
*/
UnitVector.prototype.interpolate = function(p, rp1, rp2, pv) {
    var dm1;
    var dm2;
    var do1;
    var do2;
    var doa1;
    var doa2;
    var dt;

    do1 = pv.distance(p, rp1, true, true);
    do2 = pv.distance(p, rp2, true, true);
    dm1 = pv.distance(rp1, rp1, false, true);
    dm2 = pv.distance(rp2, rp2, false, true);
    doa1 = Math.abs(do1);
    doa2 = Math.abs(do2);
    dt = doa1 + doa2;

    if (dt === 0) {
        this.setRelative(p, p, (dm1 + dm2) / 2, pv, true);
        return;
    }

    this.setRelative(p, p, (dm1 * doa2 + dm2 * doa1) / dt, pv, true);
};

/*
* Sets the point 'p' relative to point 'rp'
* by the distance 'd'
*
* See APPENDIX on SETRELATIVE at the bottom of this file.
*
* p   ...  point to set
* rp  ... reference point
* d   ... distance on projection vector
* pv  ... projection vector (undefined = this)
* org ... if true, uses the original position of rp as reference.
*/
UnitVector.prototype.setRelative = function(p, rp, d, pv, org) {
    pv = pv || this;

    var rpx = org ? rp.xo : rp.x;
    var rpy = org ? rp.yo : rp.y;
    var rpdx = rpx + d * pv.x;
    var rpdy = rpy + d * pv.y;

    var pvns = pv.normalSlope;
    var fvs = this.slope;

    var px = p.x;
    var py = p.y;

    p.x = (fvs * px - pvns * rpdx + rpdy - py) / (fvs - pvns);
    p.y = fvs * (p.x - px) + py;
};

/*
* Touches the point p.
*/
UnitVector.prototype.touch = function(p) {
    p.xTouched = true;
    p.yTouched = true;
};

/*
* Returns a unit vector with x/y coordinates.
*/
function getUnitVector(x, y) {
    var d = Math.sqrt(x * x + y * y);

    x /= d;
    y /= d;

    if (x === 1 && y === 0) { return xUnitVector; }
    else if (x === 0 && y === 1) { return yUnitVector; }
    else { return new UnitVector(x, y); }
}

/*
* Creates a point in the hinting engine.
*/
function HPoint(
    x,
    y,
    lastPointOfContour,
    onCurve
) {
    this.x = this.xo = Math.round(x * 64) / 64; // hinted x value and original x-value
    this.y = this.yo = Math.round(y * 64) / 64; // hinted y value and original y-value

    this.lastPointOfContour = lastPointOfContour;
    this.onCurve = onCurve;
    this.prevPointOnContour = undefined;
    this.nextPointOnContour = undefined;
    this.xTouched = false;
    this.yTouched = false;

    Object.preventExtensions(this);
}

/*
* Returns the next touched point on the contour.
*
* v  ... unit vector to test touch axis.
*/
HPoint.prototype.nextTouched = function(v) {
    var p = this.nextPointOnContour;

    while (!v.touched(p) && p !== this) { p = p.nextPointOnContour; }

    return p;
};

/*
* Returns the previous touched point on the contour
*
* v  ... unit vector to test touch axis.
*/
HPoint.prototype.prevTouched = function(v) {
    var p = this.prevPointOnContour;

    while (!v.touched(p) && p !== this) { p = p.prevPointOnContour; }

    return p;
};

/*
* The zero point.
*/
var HPZero = Object.freeze(new HPoint(0, 0));

/*
* The default state of the interpreter.
*
* Note: Freezing the defaultState and then deriving from it
* makes the V8 Javascript engine going awkward,
* so this is avoided, albeit the defaultState shouldn't
* ever change.
*/
var defaultState = {
    cvCutIn: 17 / 16,    // control value cut in
    deltaBase: 9,
    deltaShift: 0.125,
    loop: 1,             // loops some instructions
    minDis: 1,           // minimum distance
    autoFlip: true
};

/*
* The current state of the interpreter.
*
* env  ... 'fpgm' or 'prep' or 'glyf'
* prog ... the program
*/
function State(env, prog) {
    this.env = env;
    this.stack = [];
    this.prog = prog;

    switch (env) {
        case 'glyf' :
            this.zp0 = this.zp1 = this.zp2 = 1;
            this.rp0 = this.rp1 = this.rp2 = 0;
            /* fall through */
        case 'prep' :
            this.fv = this.pv = this.dpv = xUnitVector;
            this.round = roundToGrid;
    }
}

/*
* Executes a glyph program.
*
* This does the hinting for each glyph.
*
* Returns an array of moved points.
*
* glyph: the glyph to hint
* ppem: the size the glyph is rendered for
*/
Hinting.prototype.exec = function(glyph, ppem) {
    if (typeof ppem !== 'number') {
        throw new Error('Point size is not a number!');
    }

    // Received a fatal error, don't do any hinting anymore.
    if (this._errorState > 2) { return; }

    var font = this.font;
    var prepState = this._prepState;

    if (!prepState || prepState.ppem !== ppem) {
        var fpgmState = this._fpgmState;

        if (!fpgmState) {
            // Executes the fpgm state.
            // This is used by fonts to define functions.
            State.prototype = defaultState;

            fpgmState =
            this._fpgmState =
                new State('fpgm', font.tables.fpgm);

            fpgmState.funcs = [ ];
            fpgmState.font = font;

            if (exports.DEBUG) {
                console.log('---EXEC FPGM---');
                fpgmState.step = -1;
            }

            try {
                exec(fpgmState);
            } catch (e) {
                console.log('Hinting error in FPGM:' + e);
                this._errorState = 3;
                return;
            }
        }

        // Executes the prep program for this ppem setting.
        // This is used by fonts to set cvt values
        // depending on to be rendered font size.

        State.prototype = fpgmState;
        prepState =
        this._prepState =
            new State('prep', font.tables.prep);

        prepState.ppem = ppem;

        // Creates a copy of the cvt table
        // and scales it to the current ppem setting.
        var oCvt = font.tables.cvt;
        if (oCvt) {
            var cvt = prepState.cvt = new Array(oCvt.length);
            var scale = ppem / font.unitsPerEm;
            for (var c = 0; c < oCvt.length; c++) {
                cvt[c] = oCvt[c] * scale;
            }
        } else {
            prepState.cvt = [];
        }

        if (exports.DEBUG) {
            console.log('---EXEC PREP---');
            prepState.step = -1;
        }

        try {
            exec(prepState);
        } catch (e) {
            if (this._errorState < 2) {
                console.log('Hinting error in PREP:' + e);
            }
            this._errorState = 2;
        }
    }

    if (this._errorState > 1) { return; }

    try {
        return execGlyph(glyph, prepState);
    } catch (e) {
        if (this._errorState < 1) {
            console.log('Hinting error:' + e);
            console.log('Note: further hinting errors are silenced');
        }
        this._errorState = 1;
        return undefined;
    }
};

/*
* Executes the hinting program for a glyph.
*/
execGlyph = function(glyph, prepState) {
    // original point positions
    var xScale = prepState.ppem / prepState.font.unitsPerEm;
    var yScale = xScale;
    var components = glyph.components;
    var contours;
    var gZone;
    var state;

    State.prototype = prepState;
    if (!components) {
        state = new State('glyf', glyph.instructions);
        if (exports.DEBUG) {
            console.log('---EXEC GLYPH---');
            state.step = -1;
        }
        execComponent(glyph, state, xScale, yScale);
        gZone = state.gZone;
    } else {
        var font = prepState.font;
        gZone = [];
        contours = [];
        for (var i = 0; i < components.length; i++) {
            var c = components[i];
            var cg = font.glyphs.get(c.glyphIndex);

            state = new State('glyf', cg.instructions);

            if (exports.DEBUG) {
                console.log('---EXEC COMP ' + i + '---');
                state.step = -1;
            }

            execComponent(cg, state, xScale, yScale);
            // appends the computed points to the result array
            // post processes the component points
            var dx = Math.round(c.dx * xScale);
            var dy = Math.round(c.dy * yScale);
            var gz = state.gZone;
            var cc = state.contours;
            for (var pi = 0; pi < gz.length; pi++) {
                var p = gz[pi];
                p.xTouched = p.yTouched = false;
                p.xo = p.x = p.x + dx;
                p.yo = p.y = p.y + dy;
            }

            var gLen = gZone.length;
            gZone.push.apply(gZone, gz);
            for (var j = 0; j < cc.length; j++) {
                contours.push(cc[j] + gLen);
            }
        }

        if (glyph.instructions && !state.inhibitGridFit) {
            // the composite has instructions on its own
            state = new State('glyf', glyph.instructions);

            state.gZone = state.z0 = state.z1 = state.z2 = gZone;

            state.contours = contours;

            // note: HPZero cannot be used here, since
            //       the point might be modified
            gZone.push(
                new HPoint(0, 0),
                new HPoint(Math.round(glyph.advanceWidth * xScale), 0)
            );

            if (exports.DEBUG) {
                console.log('---EXEC COMPOSITE---');
                state.step = -1;
            }

            exec(state);

            gZone.length -= 2;
        }
    }

    return gZone;
};

/*
* Executes the hinting program for a component of a multi-component glyph
* or of the glyph itself for a non-component glyph.
*/
execComponent = function(glyph, state, xScale, yScale)
{
    var points = glyph.points || [];
    var pLen = points.length;
    var gZone = state.gZone = state.z0 = state.z1 = state.z2 = [];
    var contours = state.contours = [];

    // Scales the original points and
    // makes copies for the hinted points.
    var cp; // current point
    for (var i = 0; i < pLen; i++) {
        cp = points[i];

        gZone[i] = new HPoint(
            cp.x * xScale,
            cp.y * yScale,
            cp.lastPointOfContour,
            cp.onCurve
        );
    }

    // Chain links the contours.
    var sp; // start point
    var np; // next point

    for (var i$1 = 0; i$1 < pLen; i$1++) {
        cp = gZone[i$1];

        if (!sp) {
            sp = cp;
            contours.push(i$1);
        }

        if (cp.lastPointOfContour) {
            cp.nextPointOnContour = sp;
            sp.prevPointOnContour = cp;
            sp = undefined;
        } else {
            np = gZone[i$1 + 1];
            cp.nextPointOnContour = np;
            np.prevPointOnContour = cp;
        }
    }

    if (state.inhibitGridFit) { return; }

    if (exports.DEBUG) {
        console.log('PROCESSING GLYPH', state.stack);
        for (var i$2 = 0; i$2 < pLen; i$2++) {
            console.log(i$2, gZone[i$2].x, gZone[i$2].y);
        }
    }

    gZone.push(
        new HPoint(0, 0),
        new HPoint(Math.round(glyph.advanceWidth * xScale), 0)
    );

    exec(state);

    // Removes the extra points.
    gZone.length -= 2;

    if (exports.DEBUG) {
        console.log('FINISHED GLYPH', state.stack);
        for (var i$3 = 0; i$3 < pLen; i$3++) {
            console.log(i$3, gZone[i$3].x, gZone[i$3].y);
        }
    }
};

/*
* Executes the program loaded in state.
*/
exec = function(state) {
    var prog = state.prog;

    if (!prog) { return; }

    var pLen = prog.length;
    var ins;

    for (state.ip = 0; state.ip < pLen; state.ip++) {
        if (exports.DEBUG) { state.step++; }
        ins = instructionTable[prog[state.ip]];

        if (!ins) {
            throw new Error(
                'unknown instruction: 0x' +
                Number(prog[state.ip]).toString(16)
            );
        }

        ins(state);

        // very extensive debugging for each step
        /*
        if (exports.DEBUG) {
            var da;
            if (state.gZone) {
                da = [];
                for (let i = 0; i < state.gZone.length; i++)
                {
                    da.push(i + ' ' +
                        state.gZone[i].x * 64 + ' ' +
                        state.gZone[i].y * 64 + ' ' +
                        (state.gZone[i].xTouched ? 'x' : '') +
                        (state.gZone[i].yTouched ? 'y' : '')
                    );
                }
                console.log('GZ', da);
            }

            if (state.tZone) {
                da = [];
                for (let i = 0; i < state.tZone.length; i++) {
                    da.push(i + ' ' +
                        state.tZone[i].x * 64 + ' ' +
                        state.tZone[i].y * 64 + ' ' +
                        (state.tZone[i].xTouched ? 'x' : '') +
                        (state.tZone[i].yTouched ? 'y' : '')
                    );
                }
                console.log('TZ', da);
            }

            if (state.stack.length > 10) {
                console.log(
                    state.stack.length,
                    '...', state.stack.slice(state.stack.length - 10)
                );
            } else {
                console.log(state.stack.length, state.stack);
            }
        }
        */
    }
};

/*
* Initializes the twilight zone.
*
* This is only done if a SZPx instruction
* refers to the twilight zone.
*/
function initTZone(state)
{
    var tZone = state.tZone = new Array(state.gZone.length);

    // no idea if this is actually correct...
    for (var i = 0; i < tZone.length; i++)
    {
        tZone[i] = new HPoint(0, 0);
    }
}

/*
* Skips the instruction pointer ahead over an IF/ELSE block.
* handleElse .. if true breaks on matching ELSE
*/
function skip(state, handleElse)
{
    var prog = state.prog;
    var ip = state.ip;
    var nesting = 1;
    var ins;

    do {
        ins = prog[++ip];
        if (ins === 0x58) // IF
            { nesting++; }
        else if (ins === 0x59) // EIF
            { nesting--; }
        else if (ins === 0x40) // NPUSHB
            { ip += prog[ip + 1] + 1; }
        else if (ins === 0x41) // NPUSHW
            { ip += 2 * prog[ip + 1] + 1; }
        else if (ins >= 0xB0 && ins <= 0xB7) // PUSHB
            { ip += ins - 0xB0 + 1; }
        else if (ins >= 0xB8 && ins <= 0xBF) // PUSHW
            { ip += (ins - 0xB8 + 1) * 2; }
        else if (handleElse && nesting === 1 && ins === 0x1B) // ELSE
            { break; }
    } while (nesting > 0);

    state.ip = ip;
}

/*----------------------------------------------------------*
*          And then a lot of instructions...                *
*----------------------------------------------------------*/

// SVTCA[a] Set freedom and projection Vectors To Coordinate Axis
// 0x00-0x01
function SVTCA(v, state) {
    if (exports.DEBUG) { console.log(state.step, 'SVTCA[' + v.axis + ']'); }

    state.fv = state.pv = state.dpv = v;
}

// SPVTCA[a] Set Projection Vector to Coordinate Axis
// 0x02-0x03
function SPVTCA(v, state) {
    if (exports.DEBUG) { console.log(state.step, 'SPVTCA[' + v.axis + ']'); }

    state.pv = state.dpv = v;
}

// SFVTCA[a] Set Freedom Vector to Coordinate Axis
// 0x04-0x05
function SFVTCA(v, state) {
    if (exports.DEBUG) { console.log(state.step, 'SFVTCA[' + v.axis + ']'); }

    state.fv = v;
}

// SPVTL[a] Set Projection Vector To Line
// 0x06-0x07
function SPVTL(a, state) {
    var stack = state.stack;
    var p2i = stack.pop();
    var p1i = stack.pop();
    var p2 = state.z2[p2i];
    var p1 = state.z1[p1i];

    if (exports.DEBUG) { console.log('SPVTL[' + a + ']', p2i, p1i); }

    var dx;
    var dy;

    if (!a) {
        dx = p1.x - p2.x;
        dy = p1.y - p2.y;
    } else {
        dx = p2.y - p1.y;
        dy = p1.x - p2.x;
    }

    state.pv = state.dpv = getUnitVector(dx, dy);
}

// SFVTL[a] Set Freedom Vector To Line
// 0x08-0x09
function SFVTL(a, state) {
    var stack = state.stack;
    var p2i = stack.pop();
    var p1i = stack.pop();
    var p2 = state.z2[p2i];
    var p1 = state.z1[p1i];

    if (exports.DEBUG) { console.log('SFVTL[' + a + ']', p2i, p1i); }

    var dx;
    var dy;

    if (!a) {
        dx = p1.x - p2.x;
        dy = p1.y - p2.y;
    } else {
        dx = p2.y - p1.y;
        dy = p1.x - p2.x;
    }

    state.fv = getUnitVector(dx, dy);
}

// SPVFS[] Set Projection Vector From Stack
// 0x0A
function SPVFS(state) {
    var stack = state.stack;
    var y = stack.pop();
    var x = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SPVFS[]', y, x); }

    state.pv = state.dpv = getUnitVector(x, y);
}

// SFVFS[] Set Freedom Vector From Stack
// 0x0B
function SFVFS(state) {
    var stack = state.stack;
    var y = stack.pop();
    var x = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SPVFS[]', y, x); }

    state.fv = getUnitVector(x, y);
}

// GPV[] Get Projection Vector
// 0x0C
function GPV(state) {
    var stack = state.stack;
    var pv = state.pv;

    if (exports.DEBUG) { console.log(state.step, 'GPV[]'); }

    stack.push(pv.x * 0x4000);
    stack.push(pv.y * 0x4000);
}

// GFV[] Get Freedom Vector
// 0x0C
function GFV(state) {
    var stack = state.stack;
    var fv = state.fv;

    if (exports.DEBUG) { console.log(state.step, 'GFV[]'); }

    stack.push(fv.x * 0x4000);
    stack.push(fv.y * 0x4000);
}

// SFVTPV[] Set Freedom Vector To Projection Vector
// 0x0E
function SFVTPV(state) {
    state.fv = state.pv;

    if (exports.DEBUG) { console.log(state.step, 'SFVTPV[]'); }
}

// ISECT[] moves point p to the InterSECTion of two lines
// 0x0F
function ISECT(state)
{
    var stack = state.stack;
    var pa0i = stack.pop();
    var pa1i = stack.pop();
    var pb0i = stack.pop();
    var pb1i = stack.pop();
    var pi = stack.pop();
    var z0 = state.z0;
    var z1 = state.z1;
    var pa0 = z0[pa0i];
    var pa1 = z0[pa1i];
    var pb0 = z1[pb0i];
    var pb1 = z1[pb1i];
    var p = state.z2[pi];

    if (exports.DEBUG) { console.log('ISECT[], ', pa0i, pa1i, pb0i, pb1i, pi); }

    // math from
    // en.wikipedia.org/wiki/Line%E2%80%93line_intersection#Given_two_points_on_each_line

    var x1 = pa0.x;
    var y1 = pa0.y;
    var x2 = pa1.x;
    var y2 = pa1.y;
    var x3 = pb0.x;
    var y3 = pb0.y;
    var x4 = pb1.x;
    var y4 = pb1.y;

    var div = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    var f1 = x1 * y2 - y1 * x2;
    var f2 = x3 * y4 - y3 * x4;

    p.x = (f1 * (x3 - x4) - f2 * (x1 - x2)) / div;
    p.y = (f1 * (y3 - y4) - f2 * (y1 - y2)) / div;
}

// SRP0[] Set Reference Point 0
// 0x10
function SRP0(state) {
    state.rp0 = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SRP0[]', state.rp0); }
}

// SRP1[] Set Reference Point 1
// 0x11
function SRP1(state) {
    state.rp1 = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SRP1[]', state.rp1); }
}

// SRP1[] Set Reference Point 2
// 0x12
function SRP2(state) {
    state.rp2 = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SRP2[]', state.rp2); }
}

// SZP0[] Set Zone Pointer 0
// 0x13
function SZP0(state) {
    var n = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SZP0[]', n); }

    state.zp0 = n;

    switch (n) {
        case 0:
            if (!state.tZone) { initTZone(state); }
            state.z0 = state.tZone;
            break;
        case 1 :
            state.z0 = state.gZone;
            break;
        default :
            throw new Error('Invalid zone pointer');
    }
}

// SZP1[] Set Zone Pointer 1
// 0x14
function SZP1(state) {
    var n = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SZP1[]', n); }

    state.zp1 = n;

    switch (n) {
        case 0:
            if (!state.tZone) { initTZone(state); }
            state.z1 = state.tZone;
            break;
        case 1 :
            state.z1 = state.gZone;
            break;
        default :
            throw new Error('Invalid zone pointer');
    }
}

// SZP2[] Set Zone Pointer 2
// 0x15
function SZP2(state) {
    var n = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SZP2[]', n); }

    state.zp2 = n;

    switch (n) {
        case 0:
            if (!state.tZone) { initTZone(state); }
            state.z2 = state.tZone;
            break;
        case 1 :
            state.z2 = state.gZone;
            break;
        default :
            throw new Error('Invalid zone pointer');
    }
}

// SZPS[] Set Zone PointerS
// 0x16
function SZPS(state) {
    var n = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SZPS[]', n); }

    state.zp0 = state.zp1 = state.zp2 = n;

    switch (n) {
        case 0:
            if (!state.tZone) { initTZone(state); }
            state.z0 = state.z1 = state.z2 = state.tZone;
            break;
        case 1 :
            state.z0 = state.z1 = state.z2 = state.gZone;
            break;
        default :
            throw new Error('Invalid zone pointer');
    }
}

// SLOOP[] Set LOOP variable
// 0x17
function SLOOP(state) {
    state.loop = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SLOOP[]', state.loop); }
}

// RTG[] Round To Grid
// 0x18
function RTG(state) {
    if (exports.DEBUG) { console.log(state.step, 'RTG[]'); }

    state.round = roundToGrid;
}

// RTHG[] Round To Half Grid
// 0x19
function RTHG(state) {
    if (exports.DEBUG) { console.log(state.step, 'RTHG[]'); }

    state.round = roundToHalfGrid;
}

// SMD[] Set Minimum Distance
// 0x1A
function SMD(state) {
    var d = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SMD[]', d); }

    state.minDis = d / 0x40;
}

// ELSE[] ELSE clause
// 0x1B
function ELSE(state) {
    // This instruction has been reached by executing a then branch
    // so it just skips ahead until matching EIF.
    //
    // In case the IF was negative the IF[] instruction already
    // skipped forward over the ELSE[]

    if (exports.DEBUG) { console.log(state.step, 'ELSE[]'); }

    skip(state, false);
}

// JMPR[] JuMP Relative
// 0x1C
function JMPR(state) {
    var o = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'JMPR[]', o); }

    // A jump by 1 would do nothing.
    state.ip += o - 1;
}

// SCVTCI[] Set Control Value Table Cut-In
// 0x1D
function SCVTCI(state) {
    var n = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SCVTCI[]', n); }

    state.cvCutIn = n / 0x40;
}

// DUP[] DUPlicate top stack element
// 0x20
function DUP(state) {
    var stack = state.stack;

    if (exports.DEBUG) { console.log(state.step, 'DUP[]'); }

    stack.push(stack[stack.length - 1]);
}

// POP[] POP top stack element
// 0x21
function POP(state) {
    if (exports.DEBUG) { console.log(state.step, 'POP[]'); }

    state.stack.pop();
}

// CLEAR[] CLEAR the stack
// 0x22
function CLEAR(state) {
    if (exports.DEBUG) { console.log(state.step, 'CLEAR[]'); }

    state.stack.length = 0;
}

// SWAP[] SWAP the top two elements on the stack
// 0x23
function SWAP(state) {
    var stack = state.stack;

    var a = stack.pop();
    var b = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SWAP[]'); }

    stack.push(a);
    stack.push(b);
}

// DEPTH[] DEPTH of the stack
// 0x24
function DEPTH(state) {
    var stack = state.stack;

    if (exports.DEBUG) { console.log(state.step, 'DEPTH[]'); }

    stack.push(stack.length);
}

// LOOPCALL[] LOOPCALL function
// 0x2A
function LOOPCALL(state) {
    var stack = state.stack;
    var fn = stack.pop();
    var c = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'LOOPCALL[]', fn, c); }

    // saves callers program
    var cip = state.ip;
    var cprog = state.prog;

    state.prog = state.funcs[fn];

    // executes the function
    for (var i = 0; i < c; i++) {
        exec(state);

        if (exports.DEBUG) { console.log(
            ++state.step,
            i + 1 < c ? 'next loopcall' : 'done loopcall',
            i
        ); }
    }

    // restores the callers program
    state.ip = cip;
    state.prog = cprog;
}

// CALL[] CALL function
// 0x2B
function CALL(state) {
    var fn = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'CALL[]', fn); }

    // saves callers program
    var cip = state.ip;
    var cprog = state.prog;

    state.prog = state.funcs[fn];

    // executes the function
    exec(state);

    // restores the callers program
    state.ip = cip;
    state.prog = cprog;

    if (exports.DEBUG) { console.log(++state.step, 'returning from', fn); }
}

// CINDEX[] Copy the INDEXed element to the top of the stack
// 0x25
function CINDEX(state) {
    var stack = state.stack;
    var k = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'CINDEX[]', k); }

    // In case of k == 1, it copies the last element after popping
    // thus stack.length - k.
    stack.push(stack[stack.length - k]);
}

// MINDEX[] Move the INDEXed element to the top of the stack
// 0x26
function MINDEX(state) {
    var stack = state.stack;
    var k = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'MINDEX[]', k); }

    stack.push(stack.splice(stack.length - k, 1)[0]);
}

// FDEF[] Function DEFinition
// 0x2C
function FDEF(state) {
    if (state.env !== 'fpgm') { throw new Error('FDEF not allowed here'); }
    var stack = state.stack;
    var prog = state.prog;
    var ip = state.ip;

    var fn = stack.pop();
    var ipBegin = ip;

    if (exports.DEBUG) { console.log(state.step, 'FDEF[]', fn); }

    while (prog[++ip] !== 0x2D){ }

    state.ip = ip;
    state.funcs[fn] = prog.slice(ipBegin + 1, ip);
}

// MDAP[a] Move Direct Absolute Point
// 0x2E-0x2F
function MDAP(round, state) {
    var pi = state.stack.pop();
    var p = state.z0[pi];
    var fv = state.fv;
    var pv = state.pv;

    if (exports.DEBUG) { console.log(state.step, 'MDAP[' + round + ']', pi); }

    var d = pv.distance(p, HPZero);

    if (round) { d = state.round(d); }

    fv.setRelative(p, HPZero, d, pv);
    fv.touch(p);

    state.rp0 = state.rp1 = pi;
}

// IUP[a] Interpolate Untouched Points through the outline
// 0x30
function IUP(v, state) {
    var z2 = state.z2;
    var pLen = z2.length - 2;
    var cp;
    var pp;
    var np;

    if (exports.DEBUG) { console.log(state.step, 'IUP[' + v.axis + ']'); }

    for (var i = 0; i < pLen; i++) {
        cp = z2[i]; // current point

        // if this point has been touched go on
        if (v.touched(cp)) { continue; }

        pp = cp.prevTouched(v);

        // no point on the contour has been touched?
        if (pp === cp) { continue; }

        np = cp.nextTouched(v);

        if (pp === np) {
            // only one point on the contour has been touched
            // so simply moves the point like that

            v.setRelative(cp, cp, v.distance(pp, pp, false, true), v, true);
        }

        v.interpolate(cp, pp, np, v);
    }
}

// SHP[] SHift Point using reference point
// 0x32-0x33
function SHP(a, state) {
    var stack = state.stack;
    var rpi = a ? state.rp1 : state.rp2;
    var rp = (a ? state.z0 : state.z1)[rpi];
    var fv = state.fv;
    var pv = state.pv;
    var loop = state.loop;
    var z2 = state.z2;

    while (loop--)
    {
        var pi = stack.pop();
        var p = z2[pi];

        var d = pv.distance(rp, rp, false, true);
        fv.setRelative(p, p, d, pv);
        fv.touch(p);

        if (exports.DEBUG) {
            console.log(
                state.step,
                (state.loop > 1 ?
                   'loop ' + (state.loop - loop) + ': ' :
                   ''
                ) +
                'SHP[' + (a ? 'rp1' : 'rp2') + ']', pi
            );
        }
    }

    state.loop = 1;
}

// SHC[] SHift Contour using reference point
// 0x36-0x37
function SHC(a, state) {
    var stack = state.stack;
    var rpi = a ? state.rp1 : state.rp2;
    var rp = (a ? state.z0 : state.z1)[rpi];
    var fv = state.fv;
    var pv = state.pv;
    var ci = stack.pop();
    var sp = state.z2[state.contours[ci]];
    var p = sp;

    if (exports.DEBUG) { console.log(state.step, 'SHC[' + a + ']', ci); }

    var d = pv.distance(rp, rp, false, true);

    do {
        if (p !== rp) { fv.setRelative(p, p, d, pv); }
        p = p.nextPointOnContour;
    } while (p !== sp);
}

// SHZ[] SHift Zone using reference point
// 0x36-0x37
function SHZ(a, state) {
    var stack = state.stack;
    var rpi = a ? state.rp1 : state.rp2;
    var rp = (a ? state.z0 : state.z1)[rpi];
    var fv = state.fv;
    var pv = state.pv;

    var e = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SHZ[' + a + ']', e); }

    var z;
    switch (e) {
        case 0 : z = state.tZone; break;
        case 1 : z = state.gZone; break;
        default : throw new Error('Invalid zone');
    }

    var p;
    var d = pv.distance(rp, rp, false, true);
    var pLen = z.length - 2;
    for (var i = 0; i < pLen; i++)
    {
        p = z[i];
        fv.setRelative(p, p, d, pv);
        //if (p !== rp) fv.setRelative(p, p, d, pv);
    }
}

// SHPIX[] SHift point by a PIXel amount
// 0x38
function SHPIX(state) {
    var stack = state.stack;
    var loop = state.loop;
    var fv = state.fv;
    var d = stack.pop() / 0x40;
    var z2 = state.z2;

    while (loop--) {
        var pi = stack.pop();
        var p = z2[pi];

        if (exports.DEBUG) {
            console.log(
                state.step,
                (state.loop > 1 ? 'loop ' + (state.loop - loop) + ': ' : '') +
                'SHPIX[]', pi, d
            );
        }

        fv.setRelative(p, p, d);
        fv.touch(p);
    }

    state.loop = 1;
}

// IP[] Interpolate Point
// 0x39
function IP(state) {
    var stack = state.stack;
    var rp1i = state.rp1;
    var rp2i = state.rp2;
    var loop = state.loop;
    var rp1 = state.z0[rp1i];
    var rp2 = state.z1[rp2i];
    var fv = state.fv;
    var pv = state.dpv;
    var z2 = state.z2;

    while (loop--) {
        var pi = stack.pop();
        var p = z2[pi];

        if (exports.DEBUG) {
            console.log(
                state.step,
                (state.loop > 1 ? 'loop ' + (state.loop - loop) + ': ' : '') +
                'IP[]', pi, rp1i, '<->', rp2i
            );
        }

        fv.interpolate(p, rp1, rp2, pv);

        fv.touch(p);
    }

    state.loop = 1;
}

// MSIRP[a] Move Stack Indirect Relative Point
// 0x3A-0x3B
function MSIRP(a, state) {
    var stack = state.stack;
    var d = stack.pop() / 64;
    var pi = stack.pop();
    var p = state.z1[pi];
    var rp0 = state.z0[state.rp0];
    var fv = state.fv;
    var pv = state.pv;

    fv.setRelative(p, rp0, d, pv);
    fv.touch(p);

    if (exports.DEBUG) { console.log(state.step, 'MSIRP[' + a + ']', d, pi); }

    state.rp1 = state.rp0;
    state.rp2 = pi;
    if (a) { state.rp0 = pi; }
}

// ALIGNRP[] Align to reference point.
// 0x3C
function ALIGNRP(state) {
    var stack = state.stack;
    var rp0i = state.rp0;
    var rp0 = state.z0[rp0i];
    var loop = state.loop;
    var fv = state.fv;
    var pv = state.pv;
    var z1 = state.z1;

    while (loop--) {
        var pi = stack.pop();
        var p = z1[pi];

        if (exports.DEBUG) {
            console.log(
                state.step,
                (state.loop > 1 ? 'loop ' + (state.loop - loop) + ': ' : '') +
                'ALIGNRP[]', pi
            );
        }

        fv.setRelative(p, rp0, 0, pv);
        fv.touch(p);
    }

    state.loop = 1;
}

// RTG[] Round To Double Grid
// 0x3D
function RTDG(state) {
    if (exports.DEBUG) { console.log(state.step, 'RTDG[]'); }

    state.round = roundToDoubleGrid;
}

// MIAP[a] Move Indirect Absolute Point
// 0x3E-0x3F
function MIAP(round, state) {
    var stack = state.stack;
    var n = stack.pop();
    var pi = stack.pop();
    var p = state.z0[pi];
    var fv = state.fv;
    var pv = state.pv;
    var cv = state.cvt[n];

    if (exports.DEBUG) {
        console.log(
            state.step,
            'MIAP[' + round + ']',
            n, '(', cv, ')', pi
        );
    }

    var d = pv.distance(p, HPZero);

    if (round) {
        if (Math.abs(d - cv) < state.cvCutIn) { d = cv; }

        d = state.round(d);
    }

    fv.setRelative(p, HPZero, d, pv);

    if (state.zp0 === 0) {
        p.xo = p.x;
        p.yo = p.y;
    }

    fv.touch(p);

    state.rp0 = state.rp1 = pi;
}

// NPUSB[] PUSH N Bytes
// 0x40
function NPUSHB(state) {
    var prog = state.prog;
    var ip = state.ip;
    var stack = state.stack;

    var n = prog[++ip];

    if (exports.DEBUG) { console.log(state.step, 'NPUSHB[]', n); }

    for (var i = 0; i < n; i++) { stack.push(prog[++ip]); }

    state.ip = ip;
}

// NPUSHW[] PUSH N Words
// 0x41
function NPUSHW(state) {
    var ip = state.ip;
    var prog = state.prog;
    var stack = state.stack;
    var n = prog[++ip];

    if (exports.DEBUG) { console.log(state.step, 'NPUSHW[]', n); }

    for (var i = 0; i < n; i++) {
        var w = (prog[++ip] << 8) | prog[++ip];
        if (w & 0x8000) { w = -((w ^ 0xffff) + 1); }
        stack.push(w);
    }

    state.ip = ip;
}

// WS[] Write Store
// 0x42
function WS(state) {
    var stack = state.stack;
    var store = state.store;

    if (!store) { store = state.store = []; }

    var v = stack.pop();
    var l = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'WS', v, l); }

    store[l] = v;
}

// RS[] Read Store
// 0x43
function RS(state) {
    var stack = state.stack;
    var store = state.store;

    var l = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'RS', l); }

    var v = (store && store[l]) || 0;

    stack.push(v);
}

// WCVTP[] Write Control Value Table in Pixel units
// 0x44
function WCVTP(state) {
    var stack = state.stack;

    var v = stack.pop();
    var l = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'WCVTP', v, l); }

    state.cvt[l] = v / 0x40;
}

// RCVT[] Read Control Value Table entry
// 0x45
function RCVT(state) {
    var stack = state.stack;
    var cvte = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'RCVT', cvte); }

    stack.push(state.cvt[cvte] * 0x40);
}

// GC[] Get Coordinate projected onto the projection vector
// 0x46-0x47
function GC(a, state) {
    var stack = state.stack;
    var pi = stack.pop();
    var p = state.z2[pi];

    if (exports.DEBUG) { console.log(state.step, 'GC[' + a + ']', pi); }

    stack.push(state.dpv.distance(p, HPZero, a, false) * 0x40);
}

// MD[a] Measure Distance
// 0x49-0x4A
function MD(a, state) {
    var stack = state.stack;
    var pi2 = stack.pop();
    var pi1 = stack.pop();
    var p2 = state.z1[pi2];
    var p1 = state.z0[pi1];
    var d = state.dpv.distance(p1, p2, a, a);

    if (exports.DEBUG) { console.log(state.step, 'MD[' + a + ']', pi2, pi1, '->', d); }

    state.stack.push(Math.round(d * 64));
}

// MPPEM[] Measure Pixels Per EM
// 0x4B
function MPPEM(state) {
    if (exports.DEBUG) { console.log(state.step, 'MPPEM[]'); }
    state.stack.push(state.ppem);
}

// FLIPON[] set the auto FLIP Boolean to ON
// 0x4D
function FLIPON(state) {
    if (exports.DEBUG) { console.log(state.step, 'FLIPON[]'); }
    state.autoFlip = true;
}

// LT[] Less Than
// 0x50
function LT(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'LT[]', e2, e1); }

    stack.push(e1 < e2 ? 1 : 0);
}

// LTEQ[] Less Than or EQual
// 0x53
function LTEQ(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'LTEQ[]', e2, e1); }

    stack.push(e1 <= e2 ? 1 : 0);
}

// GTEQ[] Greater Than
// 0x52
function GT(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'GT[]', e2, e1); }

    stack.push(e1 > e2 ? 1 : 0);
}

// GTEQ[] Greater Than or EQual
// 0x53
function GTEQ(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'GTEQ[]', e2, e1); }

    stack.push(e1 >= e2 ? 1 : 0);
}

// EQ[] EQual
// 0x54
function EQ(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'EQ[]', e2, e1); }

    stack.push(e2 === e1 ? 1 : 0);
}

// NEQ[] Not EQual
// 0x55
function NEQ(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'NEQ[]', e2, e1); }

    stack.push(e2 !== e1 ? 1 : 0);
}

// ODD[] ODD
// 0x56
function ODD(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'ODD[]', n); }

    stack.push(Math.trunc(n) % 2 ? 1 : 0);
}

// EVEN[] EVEN
// 0x57
function EVEN(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'EVEN[]', n); }

    stack.push(Math.trunc(n) % 2 ? 0 : 1);
}

// IF[] IF test
// 0x58
function IF(state) {
    var test = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'IF[]', test); }

    // if test is true it just continues
    // if not the ip is skipped until matching ELSE or EIF
    if (!test) {
        skip(state, true);

        if (exports.DEBUG) { console.log(state.step,  'EIF[]'); }
    }
}

// EIF[] End IF
// 0x59
function EIF(state) {
    // this can be reached normally when
    // executing an else branch.
    // -> just ignore it

    if (exports.DEBUG) { console.log(state.step, 'EIF[]'); }
}

// AND[] logical AND
// 0x5A
function AND(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'AND[]', e2, e1); }

    stack.push(e2 && e1 ? 1 : 0);
}

// OR[] logical OR
// 0x5B
function OR(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'OR[]', e2, e1); }

    stack.push(e2 || e1 ? 1 : 0);
}

// NOT[] logical NOT
// 0x5C
function NOT(state) {
    var stack = state.stack;
    var e = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'NOT[]', e); }

    stack.push(e ? 0 : 1);
}

// DELTAP1[] DELTA exception P1
// DELTAP2[] DELTA exception P2
// DELTAP3[] DELTA exception P3
// 0x5D, 0x71, 0x72
function DELTAP123(b, state) {
    var stack = state.stack;
    var n = stack.pop();
    var fv = state.fv;
    var pv = state.pv;
    var ppem = state.ppem;
    var base = state.deltaBase + (b - 1) * 16;
    var ds = state.deltaShift;
    var z0 = state.z0;

    if (exports.DEBUG) { console.log(state.step, 'DELTAP[' + b + ']', n, stack); }

    for (var i = 0; i < n; i++) {
        var pi = stack.pop();
        var arg = stack.pop();
        var appem = base + ((arg & 0xF0) >> 4);
        if (appem !== ppem) { continue; }

        var mag = (arg & 0x0F) - 8;
        if (mag >= 0) { mag++; }
        if (exports.DEBUG) { console.log(state.step, 'DELTAPFIX', pi, 'by', mag * ds); }

        var p = z0[pi];
        fv.setRelative(p, p, mag * ds, pv);
    }
}

// SDB[] Set Delta Base in the graphics state
// 0x5E
function SDB(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SDB[]', n); }

    state.deltaBase = n;
}

// SDS[] Set Delta Shift in the graphics state
// 0x5F
function SDS(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SDS[]', n); }

    state.deltaShift = Math.pow(0.5, n);
}

// ADD[] ADD
// 0x60
function ADD(state) {
    var stack = state.stack;
    var n2 = stack.pop();
    var n1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'ADD[]', n2, n1); }

    stack.push(n1 + n2);
}

// SUB[] SUB
// 0x61
function SUB(state) {
    var stack = state.stack;
    var n2 = stack.pop();
    var n1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SUB[]', n2, n1); }

    stack.push(n1 - n2);
}

// DIV[] DIV
// 0x62
function DIV(state) {
    var stack = state.stack;
    var n2 = stack.pop();
    var n1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'DIV[]', n2, n1); }

    stack.push(n1 * 64 / n2);
}

// MUL[] MUL
// 0x63
function MUL(state) {
    var stack = state.stack;
    var n2 = stack.pop();
    var n1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'MUL[]', n2, n1); }

    stack.push(n1 * n2 / 64);
}

// ABS[] ABSolute value
// 0x64
function ABS(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'ABS[]', n); }

    stack.push(Math.abs(n));
}

// NEG[] NEGate
// 0x65
function NEG(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'NEG[]', n); }

    stack.push(-n);
}

// FLOOR[] FLOOR
// 0x66
function FLOOR(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'FLOOR[]', n); }

    stack.push(Math.floor(n / 0x40) * 0x40);
}

// CEILING[] CEILING
// 0x67
function CEILING(state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'CEILING[]', n); }

    stack.push(Math.ceil(n / 0x40) * 0x40);
}

// ROUND[ab] ROUND value
// 0x68-0x6B
function ROUND(dt, state) {
    var stack = state.stack;
    var n = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'ROUND[]'); }

    stack.push(state.round(n / 0x40) * 0x40);
}

// WCVTF[] Write Control Value Table in Funits
// 0x70
function WCVTF(state) {
    var stack = state.stack;
    var v = stack.pop();
    var l = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'WCVTF[]', v, l); }

    state.cvt[l] = v * state.ppem / state.font.unitsPerEm;
}

// DELTAC1[] DELTA exception C1
// DELTAC2[] DELTA exception C2
// DELTAC3[] DELTA exception C3
// 0x73, 0x74, 0x75
function DELTAC123(b, state) {
    var stack = state.stack;
    var n = stack.pop();
    var ppem = state.ppem;
    var base = state.deltaBase + (b - 1) * 16;
    var ds = state.deltaShift;

    if (exports.DEBUG) { console.log(state.step, 'DELTAC[' + b + ']', n, stack); }

    for (var i = 0; i < n; i++) {
        var c = stack.pop();
        var arg = stack.pop();
        var appem = base + ((arg & 0xF0) >> 4);
        if (appem !== ppem) { continue; }

        var mag = (arg & 0x0F) - 8;
        if (mag >= 0) { mag++; }

        var delta = mag * ds;

        if (exports.DEBUG) { console.log(state.step, 'DELTACFIX', c, 'by', delta); }

        state.cvt[c] += delta;
    }
}

// SROUND[] Super ROUND
// 0x76
function SROUND(state) {
    var n = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'SROUND[]', n); }

    state.round = roundSuper;

    var period;

    switch (n & 0xC0) {
        case 0x00:
            period = 0.5;
            break;
        case 0x40:
            period = 1;
            break;
        case 0x80:
            period = 2;
            break;
        default:
            throw new Error('invalid SROUND value');
    }

    state.srPeriod = period;

    switch (n & 0x30) {
        case 0x00:
            state.srPhase = 0;
            break;
        case 0x10:
            state.srPhase = 0.25 * period;
            break;
        case 0x20:
            state.srPhase = 0.5  * period;
            break;
        case 0x30:
            state.srPhase = 0.75 * period;
            break;
        default: throw new Error('invalid SROUND value');
    }

    n &= 0x0F;

    if (n === 0) { state.srThreshold = 0; }
    else { state.srThreshold = (n / 8 - 0.5) * period; }
}

// S45ROUND[] Super ROUND 45 degrees
// 0x77
function S45ROUND(state) {
    var n = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'S45ROUND[]', n); }

    state.round = roundSuper;

    var period;

    switch (n & 0xC0) {
        case 0x00:
            period = Math.sqrt(2) / 2;
            break;
        case 0x40:
            period = Math.sqrt(2);
            break;
        case 0x80:
            period = 2 * Math.sqrt(2);
            break;
        default:
            throw new Error('invalid S45ROUND value');
    }

    state.srPeriod = period;

    switch (n & 0x30) {
        case 0x00:
            state.srPhase = 0;
            break;
        case 0x10:
            state.srPhase = 0.25 * period;
            break;
        case 0x20:
            state.srPhase = 0.5  * period;
            break;
        case 0x30:
            state.srPhase = 0.75 * period;
            break;
        default:
            throw new Error('invalid S45ROUND value');
    }

    n &= 0x0F;

    if (n === 0) { state.srThreshold = 0; }
    else { state.srThreshold = (n / 8 - 0.5) * period; }
}

// ROFF[] Round Off
// 0x7A
function ROFF(state) {
    if (exports.DEBUG) { console.log(state.step, 'ROFF[]'); }

    state.round = roundOff;
}

// RUTG[] Round Up To Grid
// 0x7C
function RUTG(state) {
    if (exports.DEBUG) { console.log(state.step, 'RUTG[]'); }

    state.round = roundUpToGrid;
}

// RDTG[] Round Down To Grid
// 0x7D
function RDTG(state) {
    if (exports.DEBUG) { console.log(state.step, 'RDTG[]'); }

    state.round = roundDownToGrid;
}

// SCANCTRL[] SCAN conversion ConTRoL
// 0x85
function SCANCTRL(state) {
    var n = state.stack.pop();

    // ignored by opentype.js

    if (exports.DEBUG) { console.log(state.step, 'SCANCTRL[]', n); }
}

// SDPVTL[a] Set Dual Projection Vector To Line
// 0x86-0x87
function SDPVTL(a, state) {
    var stack = state.stack;
    var p2i = stack.pop();
    var p1i = stack.pop();
    var p2 = state.z2[p2i];
    var p1 = state.z1[p1i];

    if (exports.DEBUG) { console.log(state.step, 'SDPVTL[' + a + ']', p2i, p1i); }

    var dx;
    var dy;

    if (!a) {
        dx = p1.x - p2.x;
        dy = p1.y - p2.y;
    } else {
        dx = p2.y - p1.y;
        dy = p1.x - p2.x;
    }

    state.dpv = getUnitVector(dx, dy);
}

// GETINFO[] GET INFOrmation
// 0x88
function GETINFO(state) {
    var stack = state.stack;
    var sel = stack.pop();
    var r = 0;

    if (exports.DEBUG) { console.log(state.step, 'GETINFO[]', sel); }

    // v35 as in no subpixel hinting
    if (sel & 0x01) { r = 35; }

    // TODO rotation and stretch currently not supported
    // and thus those GETINFO are always 0.

    // opentype.js is always gray scaling
    if (sel & 0x20) { r |= 0x1000; }

    stack.push(r);
}

// ROLL[] ROLL the top three stack elements
// 0x8A
function ROLL(state) {
    var stack = state.stack;
    var a = stack.pop();
    var b = stack.pop();
    var c = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'ROLL[]'); }

    stack.push(b);
    stack.push(a);
    stack.push(c);
}

// MAX[] MAXimum of top two stack elements
// 0x8B
function MAX(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'MAX[]', e2, e1); }

    stack.push(Math.max(e1, e2));
}

// MIN[] MINimum of top two stack elements
// 0x8C
function MIN(state) {
    var stack = state.stack;
    var e2 = stack.pop();
    var e1 = stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'MIN[]', e2, e1); }

    stack.push(Math.min(e1, e2));
}

// SCANTYPE[] SCANTYPE
// 0x8D
function SCANTYPE(state) {
    var n = state.stack.pop();
    // ignored by opentype.js
    if (exports.DEBUG) { console.log(state.step, 'SCANTYPE[]', n); }
}

// INSTCTRL[] INSTCTRL
// 0x8D
function INSTCTRL(state) {
    var s = state.stack.pop();
    var v = state.stack.pop();

    if (exports.DEBUG) { console.log(state.step, 'INSTCTRL[]', s, v); }

    switch (s) {
        case 1 : state.inhibitGridFit = !!v; return;
        case 2 : state.ignoreCvt = !!v; return;
        default: throw new Error('invalid INSTCTRL[] selector');
    }
}

// PUSHB[abc] PUSH Bytes
// 0xB0-0xB7
function PUSHB(n, state) {
    var stack = state.stack;
    var prog = state.prog;
    var ip = state.ip;

    if (exports.DEBUG) { console.log(state.step, 'PUSHB[' + n + ']'); }

    for (var i = 0; i < n; i++) { stack.push(prog[++ip]); }

    state.ip = ip;
}

// PUSHW[abc] PUSH Words
// 0xB8-0xBF
function PUSHW(n, state) {
    var ip = state.ip;
    var prog = state.prog;
    var stack = state.stack;

    if (exports.DEBUG) { console.log(state.ip, 'PUSHW[' + n + ']'); }

    for (var i = 0; i < n; i++) {
        var w = (prog[++ip] << 8) | prog[++ip];
        if (w & 0x8000) { w = -((w ^ 0xffff) + 1); }
        stack.push(w);
    }

    state.ip = ip;
}

// MDRP[abcde] Move Direct Relative Point
// 0xD0-0xEF
// (if indirect is 0)
//
// and
//
// MIRP[abcde] Move Indirect Relative Point
// 0xE0-0xFF
// (if indirect is 1)

function MDRP_MIRP(indirect, setRp0, keepD, ro, dt, state) {
    var stack = state.stack;
    var cvte = indirect && stack.pop();
    var pi = stack.pop();
    var rp0i = state.rp0;
    var rp = state.z0[rp0i];
    var p = state.z1[pi];

    var md = state.minDis;
    var fv = state.fv;
    var pv = state.dpv;
    var od; // original distance
    var d; // moving distance
    var sign; // sign of distance
    var cv;

    d = od = pv.distance(p, rp, true, true);
    sign = d >= 0 ? 1 : -1; // Math.sign would be 0 in case of 0

    // TODO consider autoFlip
    d = Math.abs(d);

    if (indirect) {
        cv = state.cvt[cvte];

        if (ro && Math.abs(d - cv) < state.cvCutIn) { d = cv; }
    }

    if (keepD && d < md) { d = md; }

    if (ro) { d = state.round(d); }

    fv.setRelative(p, rp, sign * d, pv);
    fv.touch(p);

    if (exports.DEBUG) {
        console.log(
            state.step,
            (indirect ? 'MIRP[' : 'MDRP[') +
            (setRp0 ? 'M' : 'm') +
            (keepD ? '>' : '_') +
            (ro ? 'R' : '_') +
            (dt === 0 ? 'Gr' : (dt === 1 ? 'Bl' : (dt === 2 ? 'Wh' : ''))) +
            ']',
            indirect ?
                cvte + '(' + state.cvt[cvte] + ',' +  cv + ')' :
                '',
            pi,
            '(d =', od, '->', sign * d, ')'
        );
    }

    state.rp1 = state.rp0;
    state.rp2 = pi;
    if (setRp0) { state.rp0 = pi; }
}

/*
* The instruction table.
*/
instructionTable = [
    /* 0x00 */ SVTCA.bind(undefined, yUnitVector),
    /* 0x01 */ SVTCA.bind(undefined, xUnitVector),
    /* 0x02 */ SPVTCA.bind(undefined, yUnitVector),
    /* 0x03 */ SPVTCA.bind(undefined, xUnitVector),
    /* 0x04 */ SFVTCA.bind(undefined, yUnitVector),
    /* 0x05 */ SFVTCA.bind(undefined, xUnitVector),
    /* 0x06 */ SPVTL.bind(undefined, 0),
    /* 0x07 */ SPVTL.bind(undefined, 1),
    /* 0x08 */ SFVTL.bind(undefined, 0),
    /* 0x09 */ SFVTL.bind(undefined, 1),
    /* 0x0A */ SPVFS,
    /* 0x0B */ SFVFS,
    /* 0x0C */ GPV,
    /* 0x0D */ GFV,
    /* 0x0E */ SFVTPV,
    /* 0x0F */ ISECT,
    /* 0x10 */ SRP0,
    /* 0x11 */ SRP1,
    /* 0x12 */ SRP2,
    /* 0x13 */ SZP0,
    /* 0x14 */ SZP1,
    /* 0x15 */ SZP2,
    /* 0x16 */ SZPS,
    /* 0x17 */ SLOOP,
    /* 0x18 */ RTG,
    /* 0x19 */ RTHG,
    /* 0x1A */ SMD,
    /* 0x1B */ ELSE,
    /* 0x1C */ JMPR,
    /* 0x1D */ SCVTCI,
    /* 0x1E */ undefined,   // TODO SSWCI
    /* 0x1F */ undefined,   // TODO SSW
    /* 0x20 */ DUP,
    /* 0x21 */ POP,
    /* 0x22 */ CLEAR,
    /* 0x23 */ SWAP,
    /* 0x24 */ DEPTH,
    /* 0x25 */ CINDEX,
    /* 0x26 */ MINDEX,
    /* 0x27 */ undefined,   // TODO ALIGNPTS
    /* 0x28 */ undefined,
    /* 0x29 */ undefined,   // TODO UTP
    /* 0x2A */ LOOPCALL,
    /* 0x2B */ CALL,
    /* 0x2C */ FDEF,
    /* 0x2D */ undefined,   // ENDF (eaten by FDEF)
    /* 0x2E */ MDAP.bind(undefined, 0),
    /* 0x2F */ MDAP.bind(undefined, 1),
    /* 0x30 */ IUP.bind(undefined, yUnitVector),
    /* 0x31 */ IUP.bind(undefined, xUnitVector),
    /* 0x32 */ SHP.bind(undefined, 0),
    /* 0x33 */ SHP.bind(undefined, 1),
    /* 0x34 */ SHC.bind(undefined, 0),
    /* 0x35 */ SHC.bind(undefined, 1),
    /* 0x36 */ SHZ.bind(undefined, 0),
    /* 0x37 */ SHZ.bind(undefined, 1),
    /* 0x38 */ SHPIX,
    /* 0x39 */ IP,
    /* 0x3A */ MSIRP.bind(undefined, 0),
    /* 0x3B */ MSIRP.bind(undefined, 1),
    /* 0x3C */ ALIGNRP,
    /* 0x3D */ RTDG,
    /* 0x3E */ MIAP.bind(undefined, 0),
    /* 0x3F */ MIAP.bind(undefined, 1),
    /* 0x40 */ NPUSHB,
    /* 0x41 */ NPUSHW,
    /* 0x42 */ WS,
    /* 0x43 */ RS,
    /* 0x44 */ WCVTP,
    /* 0x45 */ RCVT,
    /* 0x46 */ GC.bind(undefined, 0),
    /* 0x47 */ GC.bind(undefined, 1),
    /* 0x48 */ undefined,   // TODO SCFS
    /* 0x49 */ MD.bind(undefined, 0),
    /* 0x4A */ MD.bind(undefined, 1),
    /* 0x4B */ MPPEM,
    /* 0x4C */ undefined,   // TODO MPS
    /* 0x4D */ FLIPON,
    /* 0x4E */ undefined,   // TODO FLIPOFF
    /* 0x4F */ undefined,   // TODO DEBUG
    /* 0x50 */ LT,
    /* 0x51 */ LTEQ,
    /* 0x52 */ GT,
    /* 0x53 */ GTEQ,
    /* 0x54 */ EQ,
    /* 0x55 */ NEQ,
    /* 0x56 */ ODD,
    /* 0x57 */ EVEN,
    /* 0x58 */ IF,
    /* 0x59 */ EIF,
    /* 0x5A */ AND,
    /* 0x5B */ OR,
    /* 0x5C */ NOT,
    /* 0x5D */ DELTAP123.bind(undefined, 1),
    /* 0x5E */ SDB,
    /* 0x5F */ SDS,
    /* 0x60 */ ADD,
    /* 0x61 */ SUB,
    /* 0x62 */ DIV,
    /* 0x63 */ MUL,
    /* 0x64 */ ABS,
    /* 0x65 */ NEG,
    /* 0x66 */ FLOOR,
    /* 0x67 */ CEILING,
    /* 0x68 */ ROUND.bind(undefined, 0),
    /* 0x69 */ ROUND.bind(undefined, 1),
    /* 0x6A */ ROUND.bind(undefined, 2),
    /* 0x6B */ ROUND.bind(undefined, 3),
    /* 0x6C */ undefined,   // TODO NROUND[ab]
    /* 0x6D */ undefined,   // TODO NROUND[ab]
    /* 0x6E */ undefined,   // TODO NROUND[ab]
    /* 0x6F */ undefined,   // TODO NROUND[ab]
    /* 0x70 */ WCVTF,
    /* 0x71 */ DELTAP123.bind(undefined, 2),
    /* 0x72 */ DELTAP123.bind(undefined, 3),
    /* 0x73 */ DELTAC123.bind(undefined, 1),
    /* 0x74 */ DELTAC123.bind(undefined, 2),
    /* 0x75 */ DELTAC123.bind(undefined, 3),
    /* 0x76 */ SROUND,
    /* 0x77 */ S45ROUND,
    /* 0x78 */ undefined,   // TODO JROT[]
    /* 0x79 */ undefined,   // TODO JROF[]
    /* 0x7A */ ROFF,
    /* 0x7B */ undefined,
    /* 0x7C */ RUTG,
    /* 0x7D */ RDTG,
    /* 0x7E */ POP, // actually SANGW, supposed to do only a pop though
    /* 0x7F */ POP, // actually AA, supposed to do only a pop though
    /* 0x80 */ undefined,   // TODO FLIPPT
    /* 0x81 */ undefined,   // TODO FLIPRGON
    /* 0x82 */ undefined,   // TODO FLIPRGOFF
    /* 0x83 */ undefined,
    /* 0x84 */ undefined,
    /* 0x85 */ SCANCTRL,
    /* 0x86 */ SDPVTL.bind(undefined, 0),
    /* 0x87 */ SDPVTL.bind(undefined, 1),
    /* 0x88 */ GETINFO,
    /* 0x89 */ undefined,   // TODO IDEF
    /* 0x8A */ ROLL,
    /* 0x8B */ MAX,
    /* 0x8C */ MIN,
    /* 0x8D */ SCANTYPE,
    /* 0x8E */ INSTCTRL,
    /* 0x8F */ undefined,
    /* 0x90 */ undefined,
    /* 0x91 */ undefined,
    /* 0x92 */ undefined,
    /* 0x93 */ undefined,
    /* 0x94 */ undefined,
    /* 0x95 */ undefined,
    /* 0x96 */ undefined,
    /* 0x97 */ undefined,
    /* 0x98 */ undefined,
    /* 0x99 */ undefined,
    /* 0x9A */ undefined,
    /* 0x9B */ undefined,
    /* 0x9C */ undefined,
    /* 0x9D */ undefined,
    /* 0x9E */ undefined,
    /* 0x9F */ undefined,
    /* 0xA0 */ undefined,
    /* 0xA1 */ undefined,
    /* 0xA2 */ undefined,
    /* 0xA3 */ undefined,
    /* 0xA4 */ undefined,
    /* 0xA5 */ undefined,
    /* 0xA6 */ undefined,
    /* 0xA7 */ undefined,
    /* 0xA8 */ undefined,
    /* 0xA9 */ undefined,
    /* 0xAA */ undefined,
    /* 0xAB */ undefined,
    /* 0xAC */ undefined,
    /* 0xAD */ undefined,
    /* 0xAE */ undefined,
    /* 0xAF */ undefined,
    /* 0xB0 */ PUSHB.bind(undefined, 1),
    /* 0xB1 */ PUSHB.bind(undefined, 2),
    /* 0xB2 */ PUSHB.bind(undefined, 3),
    /* 0xB3 */ PUSHB.bind(undefined, 4),
    /* 0xB4 */ PUSHB.bind(undefined, 5),
    /* 0xB5 */ PUSHB.bind(undefined, 6),
    /* 0xB6 */ PUSHB.bind(undefined, 7),
    /* 0xB7 */ PUSHB.bind(undefined, 8),
    /* 0xB8 */ PUSHW.bind(undefined, 1),
    /* 0xB9 */ PUSHW.bind(undefined, 2),
    /* 0xBA */ PUSHW.bind(undefined, 3),
    /* 0xBB */ PUSHW.bind(undefined, 4),
    /* 0xBC */ PUSHW.bind(undefined, 5),
    /* 0xBD */ PUSHW.bind(undefined, 6),
    /* 0xBE */ PUSHW.bind(undefined, 7),
    /* 0xBF */ PUSHW.bind(undefined, 8),
    /* 0xC0 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 0, 0),
    /* 0xC1 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 0, 1),
    /* 0xC2 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 0, 2),
    /* 0xC3 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 0, 3),
    /* 0xC4 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 1, 0),
    /* 0xC5 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 1, 1),
    /* 0xC6 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 1, 2),
    /* 0xC7 */ MDRP_MIRP.bind(undefined, 0, 0, 0, 1, 3),
    /* 0xC8 */ MDRP_MIRP.bind(undefined, 0, 0, 1, 0, 0),
    /* 0xC9 */ MDRP_MIRP.bind(undefined, 0, 0, 1, 0, 1),
    /* 0xCA */ MDRP_MIRP.bind(undefined, 0, 0, 1, 0, 2),
    /* 0xCB */ MDRP_MIRP.bind(undefined, 0, 0, 1, 0, 3),
    /* 0xCC */ MDRP_MIRP.bind(undefined, 0, 0, 1, 1, 0),
    /* 0xCD */ MDRP_MIRP.bind(undefined, 0, 0, 1, 1, 1),
    /* 0xCE */ MDRP_MIRP.bind(undefined, 0, 0, 1, 1, 2),
    /* 0xCF */ MDRP_MIRP.bind(undefined, 0, 0, 1, 1, 3),
    /* 0xD0 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 0, 0),
    /* 0xD1 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 0, 1),
    /* 0xD2 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 0, 2),
    /* 0xD3 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 0, 3),
    /* 0xD4 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 1, 0),
    /* 0xD5 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 1, 1),
    /* 0xD6 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 1, 2),
    /* 0xD7 */ MDRP_MIRP.bind(undefined, 0, 1, 0, 1, 3),
    /* 0xD8 */ MDRP_MIRP.bind(undefined, 0, 1, 1, 0, 0),
    /* 0xD9 */ MDRP_MIRP.bind(undefined, 0, 1, 1, 0, 1),
    /* 0xDA */ MDRP_MIRP.bind(undefined, 0, 1, 1, 0, 2),
    /* 0xDB */ MDRP_MIRP.bind(undefined, 0, 1, 1, 0, 3),
    /* 0xDC */ MDRP_MIRP.bind(undefined, 0, 1, 1, 1, 0),
    /* 0xDD */ MDRP_MIRP.bind(undefined, 0, 1, 1, 1, 1),
    /* 0xDE */ MDRP_MIRP.bind(undefined, 0, 1, 1, 1, 2),
    /* 0xDF */ MDRP_MIRP.bind(undefined, 0, 1, 1, 1, 3),
    /* 0xE0 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 0, 0),
    /* 0xE1 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 0, 1),
    /* 0xE2 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 0, 2),
    /* 0xE3 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 0, 3),
    /* 0xE4 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 1, 0),
    /* 0xE5 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 1, 1),
    /* 0xE6 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 1, 2),
    /* 0xE7 */ MDRP_MIRP.bind(undefined, 1, 0, 0, 1, 3),
    /* 0xE8 */ MDRP_MIRP.bind(undefined, 1, 0, 1, 0, 0),
    /* 0xE9 */ MDRP_MIRP.bind(undefined, 1, 0, 1, 0, 1),
    /* 0xEA */ MDRP_MIRP.bind(undefined, 1, 0, 1, 0, 2),
    /* 0xEB */ MDRP_MIRP.bind(undefined, 1, 0, 1, 0, 3),
    /* 0xEC */ MDRP_MIRP.bind(undefined, 1, 0, 1, 1, 0),
    /* 0xED */ MDRP_MIRP.bind(undefined, 1, 0, 1, 1, 1),
    /* 0xEE */ MDRP_MIRP.bind(undefined, 1, 0, 1, 1, 2),
    /* 0xEF */ MDRP_MIRP.bind(undefined, 1, 0, 1, 1, 3),
    /* 0xF0 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 0, 0),
    /* 0xF1 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 0, 1),
    /* 0xF2 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 0, 2),
    /* 0xF3 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 0, 3),
    /* 0xF4 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 1, 0),
    /* 0xF5 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 1, 1),
    /* 0xF6 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 1, 2),
    /* 0xF7 */ MDRP_MIRP.bind(undefined, 1, 1, 0, 1, 3),
    /* 0xF8 */ MDRP_MIRP.bind(undefined, 1, 1, 1, 0, 0),
    /* 0xF9 */ MDRP_MIRP.bind(undefined, 1, 1, 1, 0, 1),
    /* 0xFA */ MDRP_MIRP.bind(undefined, 1, 1, 1, 0, 2),
    /* 0xFB */ MDRP_MIRP.bind(undefined, 1, 1, 1, 0, 3),
    /* 0xFC */ MDRP_MIRP.bind(undefined, 1, 1, 1, 1, 0),
    /* 0xFD */ MDRP_MIRP.bind(undefined, 1, 1, 1, 1, 1),
    /* 0xFE */ MDRP_MIRP.bind(undefined, 1, 1, 1, 1, 2),
    /* 0xFF */ MDRP_MIRP.bind(undefined, 1, 1, 1, 1, 3)
];

/*****************************
  Mathematical Considerations
******************************

fv ... refers to freedom vector
pv ... refers to projection vector
rp ... refers to reference point
p  ... refers to to point being operated on
d  ... refers to distance

SETRELATIVE:
============

case freedom vector == x-axis:
------------------------------

                        (pv)
                     .-'
              rpd .-'
               .-*
          d .-'90°'
         .-'       '
      .-'           '
   *-'               ' b
  rp                  '
                       '
                        '
            p *----------*-------------- (fv)
                          pm

  rpdx = rpx + d * pv.x
  rpdy = rpy + d * pv.y

  equation of line b

   y - rpdy = pvns * (x- rpdx)

   y = p.y

   x = rpdx + ( p.y - rpdy ) / pvns


case freedom vector == y-axis:
------------------------------

    * pm
    |\
    | \
    |  \
    |   \
    |    \
    |     \
    |      \
    |       \
    |        \
    |         \ b
    |          \
    |           \
    |            \    .-' (pv)
    |         90° \.-'
    |           .-'* rpd
    |        .-'
    *     *-'  d
    p     rp

  rpdx = rpx + d * pv.x
  rpdy = rpy + d * pv.y

  equation of line b:
           pvns ... normal slope to pv

   y - rpdy = pvns * (x - rpdx)

   x = p.x

   y = rpdy +  pvns * (p.x - rpdx)



generic case:
-------------


                              .'(fv)
                            .'
                          .* pm
                        .' !
                      .'    .
                    .'      !
                  .'         . b
                .'           !
               *              .
              p               !
                         90°   .    ... (pv)
                           ...-*-'''
                  ...---'''    rpd
         ...---'''   d
   *--'''
  rp

    rpdx = rpx + d * pv.x
    rpdy = rpy + d * pv.y

 equation of line b:
    pvns... normal slope to pv

    y - rpdy = pvns * (x - rpdx)

 equation of freedom vector line:
    fvs ... slope of freedom vector (=fy/fx)

    y - py = fvs * (x - px)


  on pm both equations are true for same x/y

    y - rpdy = pvns * (x - rpdx)

    y - py = fvs * (x - px)

  form to y and set equal:

    pvns * (x - rpdx) + rpdy = fvs * (x - px) + py

  expand:

    pvns * x - pvns * rpdx + rpdy = fvs * x - fvs * px + py

  switch:

    fvs * x - fvs * px + py = pvns * x - pvns * rpdx + rpdy

  solve for x:

    fvs * x - pvns * x = fvs * px - pvns * rpdx - py + rpdy



          fvs * px - pvns * rpdx + rpdy - py
    x =  -----------------------------------
                 fvs - pvns

  and:

    y = fvs * (x - px) + py



INTERPOLATE:
============

Examples of point interpolation.

The weight of the movement of the reference point gets bigger
the further the other reference point is away, thus the safest
option (that is avoiding 0/0 divisions) is to weight the
original distance of the other point by the sum of both distances.

If the sum of both distances is 0, then move the point by the
arithmetic average of the movement of both reference points.




           (+6)
    rp1o *---->*rp1
         .     .                          (+12)
         .     .                  rp2o *---------->* rp2
         .     .                       .           .
         .     .                       .           .
         .    10          20           .           .
         |.........|...................|           .
               .   .                               .
               .   . (+8)                          .
                po *------>*p                      .
               .           .                       .
               .    12     .          24           .
               |...........|.......................|
                                  36


-------



           (+10)
    rp1o *-------->*rp1
         .         .                      (-10)
         .         .              rp2 *<---------* rpo2
         .         .                   .         .
         .         .                   .         .
         .    10   .          30       .         .
         |.........|.............................|
                   .                   .
                   . (+5)              .
                po *--->* p            .
                   .    .              .
                   .    .   20         .
                   |....|..............|
                     5        15


-------


           (+10)
    rp1o *-------->*rp1
         .         .
         .         .
    rp2o *-------->*rp2


                               (+10)
                          po *-------->* p

-------


           (+10)
    rp1o *-------->*rp1
         .         .
         .         .(+30)
    rp2o *---------------------------->*rp2


                                        (+25)
                          po *----------------------->* p



vim: set ts=4 sw=4 expandtab:
*****/

/**
 * Converts a string into a list of tokens.
 */

/**
 * Create a new token
 * @param {string} char a single char
 */
function Token(char) {
    this.char = char;
    this.state = {};
    this.activeState = null;
}

/**
 * Create a new context range
 * @param {number} startIndex range start index
 * @param {number} endOffset range end index offset
 * @param {string} contextName owner context name
 */
function ContextRange(startIndex, endOffset, contextName) {
    this.contextName = contextName;
    this.startIndex = startIndex;
    this.endOffset = endOffset;
}

/**
 * Check context start and end
 * @param {string} contextName a unique context name
 * @param {function} checkStart a predicate function the indicates a context's start
 * @param {function} checkEnd a predicate function the indicates a context's end
 */
function ContextChecker(contextName, checkStart, checkEnd) {
    this.contextName = contextName;
    this.openRange = null;
    this.ranges = [];
    this.checkStart = checkStart;
    this.checkEnd = checkEnd;
}

/**
 * @typedef ContextParams
 * @type Object
 * @property {array} context context items
 * @property {number} currentIndex current item index
 */

/**
 * Create a context params
 * @param {array} context a list of items
 * @param {number} currentIndex current item index
 */
function ContextParams(context, currentIndex) {
    this.context = context;
    this.index = currentIndex;
    this.length = context.length;
    this.current = context[currentIndex];
    this.backtrack = context.slice(0, currentIndex);
    this.lookahead = context.slice(currentIndex + 1);
}

/**
 * Create an event instance
 * @param {string} eventId event unique id
 */
function Event(eventId) {
    this.eventId = eventId;
    this.subscribers = [];
}

/**
 * Initialize a core events and auto subscribe required event handlers
 * @param {any} events an object that enlists core events handlers
 */
function initializeCoreEvents(events) {
    var this$1$1 = this;

    var coreEvents = [
        'start', 'end', 'next', 'newToken', 'contextStart',
        'contextEnd', 'insertToken', 'removeToken', 'removeRange',
        'replaceToken', 'replaceRange', 'composeRUD', 'updateContextsRanges'
    ];

    coreEvents.forEach(function (eventId) {
        Object.defineProperty(this$1$1.events, eventId, {
            value: new Event(eventId)
        });
    });

    if (!!events) {
        coreEvents.forEach(function (eventId) {
            var event = events[eventId];
            if (typeof event === 'function') {
                this$1$1.events[eventId].subscribe(event);
            }
        });
    }
    var requiresContextUpdate = [
        'insertToken', 'removeToken', 'removeRange',
        'replaceToken', 'replaceRange', 'composeRUD'
    ];
    requiresContextUpdate.forEach(function (eventId) {
        this$1$1.events[eventId].subscribe(
            this$1$1.updateContextsRanges
        );
    });
}

/**
 * Converts a string into a list of tokens
 * @param {any} events tokenizer core events
 */
function Tokenizer(events) {
    this.tokens = [];
    this.registeredContexts = {};
    this.contextCheckers = [];
    this.events = {};
    this.registeredModifiers = [];

    initializeCoreEvents.call(this, events);
}

/**
 * Sets the state of a token, usually called by a state modifier.
 * @param {string} key state item key
 * @param {any} value state item value
 */
Token.prototype.setState = function(key, value) {
    this.state[key] = value;
    this.activeState = { key: key, value: this.state[key] };
    return this.activeState;
};

Token.prototype.getState = function (stateId) {
    return this.state[stateId] || null;
};

/**
 * Checks if an index exists in the tokens list.
 * @param {number} index token index
 */
Tokenizer.prototype.inboundIndex = function(index) {
    return index >= 0 && index < this.tokens.length;
};

/**
 * Compose and apply a list of operations (replace, update, delete)
 * @param {array} RUDs replace, update and delete operations
 * TODO: Perf. Optimization (lengthBefore === lengthAfter ? dispatch once)
 */
Tokenizer.prototype.composeRUD = function (RUDs) {
    var this$1$1 = this;

    var silent = true;
    var state = RUDs.map(function (RUD) { return (
        this$1$1[RUD[0]].apply(this$1$1, RUD.slice(1).concat(silent))
    ); });
    var hasFAILObject = function (obj) { return (
        typeof obj === 'object' &&
        obj.hasOwnProperty('FAIL')
    ); };
    if (state.every(hasFAILObject)) {
        return {
            FAIL: "composeRUD: one or more operations hasn't completed successfully",
            report: state.filter(hasFAILObject)
        };
    }
    this.dispatch('composeRUD', [state.filter(function (op) { return !hasFAILObject(op); })]);
};

/**
 * Replace a range of tokens with a list of tokens
 * @param {number} startIndex range start index
 * @param {number} offset range offset
 * @param {token} tokens a list of tokens to replace
 * @param {boolean} silent dispatch events and update context ranges
 */
Tokenizer.prototype.replaceRange = function (startIndex, offset, tokens, silent) {
    offset = offset !== null ? offset : this.tokens.length;
    var isTokenType = tokens.every(function (token) { return token instanceof Token; });
    if (!isNaN(startIndex) && this.inboundIndex(startIndex) && isTokenType) {
        var replaced = this.tokens.splice.apply(
            this.tokens, [startIndex, offset].concat(tokens)
        );
        if (!silent) { this.dispatch('replaceToken', [startIndex, offset, tokens]); }
        return [replaced, tokens];
    } else {
        return { FAIL: 'replaceRange: invalid tokens or startIndex.' };
    }
};

/**
 * Replace a token with another token
 * @param {number} index token index
 * @param {token} token a token to replace
 * @param {boolean} silent dispatch events and update context ranges
 */
Tokenizer.prototype.replaceToken = function (index, token, silent) {
    if (!isNaN(index) && this.inboundIndex(index) && token instanceof Token) {
        var replaced = this.tokens.splice(index, 1, token);
        if (!silent) { this.dispatch('replaceToken', [index, token]); }
        return [replaced[0], token];
    } else {
        return { FAIL: 'replaceToken: invalid token or index.' };
    }
};

/**
 * Removes a range of tokens
 * @param {number} startIndex range start index
 * @param {number} offset range offset
 * @param {boolean} silent dispatch events and update context ranges
 */
Tokenizer.prototype.removeRange = function(startIndex, offset, silent) {
    offset = !isNaN(offset) ? offset : this.tokens.length;
    var tokens = this.tokens.splice(startIndex, offset);
    if (!silent) { this.dispatch('removeRange', [tokens, startIndex, offset]); }
    return tokens;
};

/**
 * Remove a token at a certain index
 * @param {number} index token index
 * @param {boolean} silent dispatch events and update context ranges
 */
Tokenizer.prototype.removeToken = function(index, silent) {
    if (!isNaN(index) && this.inboundIndex(index)) {
        var token = this.tokens.splice(index, 1);
        if (!silent) { this.dispatch('removeToken', [token, index]); }
        return token;
    } else {
        return { FAIL: 'removeToken: invalid token index.' };
    }
};

/**
 * Insert a list of tokens at a certain index
 * @param {array} tokens a list of tokens to insert
 * @param {number} index insert the list of tokens at index
 * @param {boolean} silent dispatch events and update context ranges
 */
Tokenizer.prototype.insertToken = function (tokens, index, silent) {
    var tokenType = tokens.every(
        function (token) { return token instanceof Token; }
    );
    if (tokenType) {
        this.tokens.splice.apply(
            this.tokens, [index, 0].concat(tokens)
        );
        if (!silent) { this.dispatch('insertToken', [tokens, index]); }
        return tokens;
    } else {
        return { FAIL: 'insertToken: invalid token(s).' };
    }
};

/**
 * A state modifier that is called on 'newToken' event
 * @param {string} modifierId state modifier id
 * @param {function} condition a predicate function that returns true or false
 * @param {function} modifier a function to update token state
 */
Tokenizer.prototype.registerModifier = function(modifierId, condition, modifier) {
    this.events.newToken.subscribe(function(token, contextParams) {
        var conditionParams = [token, contextParams];
        var canApplyModifier = (
            condition === null ||
            condition.apply(this, conditionParams) === true
        );
        var modifierParams = [token, contextParams];
        if (canApplyModifier) {
            var newStateValue = modifier.apply(this, modifierParams);
            token.setState(modifierId, newStateValue);
        }
    });
    this.registeredModifiers.push(modifierId);
};

/**
 * Subscribe a handler to an event
 * @param {function} eventHandler an event handler function
 */
Event.prototype.subscribe = function (eventHandler) {
    if (typeof eventHandler === 'function') {
        return ((this.subscribers.push(eventHandler)) - 1);
    } else {
        return { FAIL: ("invalid '" + (this.eventId) + "' event handler")};
    }
};

/**
 * Unsubscribe an event handler
 * @param {string} subsId subscription id
 */
Event.prototype.unsubscribe = function (subsId) {
    this.subscribers.splice(subsId, 1);
};

/**
 * Sets context params current value index
 * @param {number} index context params current value index
 */
ContextParams.prototype.setCurrentIndex = function(index) {
    this.index = index;
    this.current = this.context[index];
    this.backtrack = this.context.slice(0, index);
    this.lookahead = this.context.slice(index + 1);
};

/**
 * Get an item at an offset from the current value
 * example (current value is 3):
 *  1    2   [3]   4    5   |   items values
 * -2   -1    0    1    2   |   offset values
 * @param {number} offset an offset from current value index
 */
ContextParams.prototype.get = function (offset) {
    switch (true) {
        case (offset === 0):
            return this.current;
        case (offset < 0 && Math.abs(offset) <= this.backtrack.length):
            return this.backtrack.slice(offset)[0];
        case (offset > 0 && offset <= this.lookahead.length):
            return this.lookahead[offset - 1];
        default:
            return null;
    }
};

/**
 * Converts a context range into a string value
 * @param {contextRange} range a context range
 */
Tokenizer.prototype.rangeToText = function (range) {
    if (range instanceof ContextRange) {
        return (
            this.getRangeTokens(range)
                .map(function (token) { return token.char; }).join('')
        );
    }
};

/**
 * Converts all tokens into a string
 */
Tokenizer.prototype.getText = function () {
    return this.tokens.map(function (token) { return token.char; }).join('');
};

/**
 * Get a context by name
 * @param {string} contextName context name to get
 */
Tokenizer.prototype.getContext = function (contextName) {
    var context = this.registeredContexts[contextName];
    return !!context ? context : null;
};

/**
 * Subscribes a new event handler to an event
 * @param {string} eventName event name to subscribe to
 * @param {function} eventHandler a function to be invoked on event
 */
Tokenizer.prototype.on = function(eventName, eventHandler) {
    var event = this.events[eventName];
    if (!!event) {
        return event.subscribe(eventHandler);
    } else {
        return null;
    }
};

/**
 * Dispatches an event
 * @param {string} eventName event name
 * @param {any} args event handler arguments
 */
Tokenizer.prototype.dispatch = function(eventName, args) {
    var this$1$1 = this;

    var event = this.events[eventName];
    if (event instanceof Event) {
        event.subscribers.forEach(function (subscriber) {
            subscriber.apply(this$1$1, args || []);
        });
    }
};

/**
 * Register a new context checker
 * @param {string} contextName a unique context name
 * @param {function} contextStartCheck a predicate function that returns true on context start
 * @param {function} contextEndCheck  a predicate function that returns true on context end
 * TODO: call tokenize on registration to update context ranges with the new context.
 */
Tokenizer.prototype.registerContextChecker = function(contextName, contextStartCheck, contextEndCheck) {
    if (!!this.getContext(contextName)) { return {
        FAIL:
        ("context name '" + contextName + "' is already registered.")
    }; }
    if (typeof contextStartCheck !== 'function') { return {
        FAIL:
        "missing context start check."
    }; }
    if (typeof contextEndCheck !== 'function') { return {
        FAIL:
        "missing context end check."
    }; }
    var contextCheckers = new ContextChecker(
        contextName, contextStartCheck, contextEndCheck
    );
    this.registeredContexts[contextName] = contextCheckers;
    this.contextCheckers.push(contextCheckers);
    return contextCheckers;
};

/**
 * Gets a context range tokens
 * @param {contextRange} range a context range
 */
Tokenizer.prototype.getRangeTokens = function(range) {
    var endIndex = range.startIndex + range.endOffset;
    return [].concat(
        this.tokens
            .slice(range.startIndex, endIndex)
    );
};

/**
 * Gets the ranges of a context
 * @param {string} contextName context name
 */
Tokenizer.prototype.getContextRanges = function(contextName) {
    var context = this.getContext(contextName);
    if (!!context) {
        return context.ranges;
    } else {
        return { FAIL: ("context checker '" + contextName + "' is not registered.") };
    }
};

/**
 * Resets context ranges to run context update
 */
Tokenizer.prototype.resetContextsRanges = function () {
    var registeredContexts = this.registeredContexts;
    for (var contextName in registeredContexts) {
        if (registeredContexts.hasOwnProperty(contextName)) {
            var context = registeredContexts[contextName];
            context.ranges = [];
        }
    }
};

/**
 * Updates context ranges
 */
Tokenizer.prototype.updateContextsRanges = function () {
    this.resetContextsRanges();
    var chars = this.tokens.map(function (token) { return token.char; });
    for (var i = 0; i < chars.length; i++) {
        var contextParams = new ContextParams(chars, i);
        this.runContextCheck(contextParams);
    }
    this.dispatch('updateContextsRanges', [this.registeredContexts]);
};

/**
 * Sets the end offset of an open range
 * @param {number} offset range end offset
 * @param {string} contextName context name
 */
Tokenizer.prototype.setEndOffset = function (offset, contextName) {
    var startIndex = this.getContext(contextName).openRange.startIndex;
    var range = new ContextRange(startIndex, offset, contextName);
    var ranges = this.getContext(contextName).ranges;
    range.rangeId = contextName + "." + (ranges.length);
    ranges.push(range);
    this.getContext(contextName).openRange = null;
    return range;
};

/**
 * Runs a context check on the current context
 * @param {contextParams} contextParams current context params
 */
Tokenizer.prototype.runContextCheck = function(contextParams) {
    var this$1$1 = this;

    var index = contextParams.index;
    this.contextCheckers.forEach(function (contextChecker) {
        var contextName = contextChecker.contextName;
        var openRange = this$1$1.getContext(contextName).openRange;
        if (!openRange && contextChecker.checkStart(contextParams)) {
            openRange = new ContextRange(index, null, contextName);
            this$1$1.getContext(contextName).openRange = openRange;
            this$1$1.dispatch('contextStart', [contextName, index]);
        }
        if (!!openRange && contextChecker.checkEnd(contextParams)) {
            var offset = (index - openRange.startIndex) + 1;
            var range = this$1$1.setEndOffset(offset, contextName);
            this$1$1.dispatch('contextEnd', [contextName, range]);
        }
    });
};

/**
 * Converts a text into a list of tokens
 * @param {string} text a text to tokenize
 */
Tokenizer.prototype.tokenize = function (text) {
    this.tokens = [];
    this.resetContextsRanges();
    var chars = Array.from(text);
    this.dispatch('start');
    for (var i = 0; i < chars.length; i++) {
        var char = chars[i];
        var contextParams = new ContextParams(chars, i);
        this.dispatch('next', [contextParams]);
        this.runContextCheck(contextParams);
        var token = new Token(char);
        this.tokens.push(token);
        this.dispatch('newToken', [token, contextParams]);
    }
    this.dispatch('end', [this.tokens]);
    return this.tokens;
};

// ╭─┄┄┄────────────────────────┄─────────────────────────────────────────────╮
// ┊ Character Class Assertions ┊ Checks if a char belongs to a certain class ┊
// ╰─╾──────────────────────────┄─────────────────────────────────────────────╯
// jscs:disable maximumLineLength
/**
 * Check if a char is Arabic
 * @param {string} c a single char
 */
function isArabicChar(c) {
    return /[\u0600-\u065F\u066A-\u06D2\u06FA-\u06FF]/.test(c);
}

/**
 * Check if a char is an isolated arabic char
 * @param {string} c a single char
 */
function isIsolatedArabicChar(char) {
    return /[\u0630\u0690\u0621\u0631\u0661\u0671\u0622\u0632\u0672\u0692\u06C2\u0623\u0673\u0693\u06C3\u0624\u0694\u06C4\u0625\u0675\u0695\u06C5\u06E5\u0676\u0696\u06C6\u0627\u0677\u0697\u06C7\u0648\u0688\u0698\u06C8\u0689\u0699\u06C9\u068A\u06CA\u066B\u068B\u06CB\u068C\u068D\u06CD\u06FD\u068E\u06EE\u06FE\u062F\u068F\u06CF\u06EF]/.test(char);
}

/**
 * Check if a char is an Arabic Tashkeel char
 * @param {string} c a single char
 */
function isTashkeelArabicChar(char) {
    return /[\u0600-\u0605\u060C-\u060E\u0610-\u061B\u061E\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/.test(char);
}

/**
 * Check if a char is Latin
 * @param {string} c a single char
 */
function isLatinChar(c) {
    return /[A-z]/.test(c);
}

/**
 * Check if a char is whitespace char
 * @param {string} c a single char
 */
function isWhiteSpace(c) {
    return /\s/.test(c);
}

/**
 * Query a feature by some of it's properties to lookup a glyph substitution.
 */

/**
 * Create feature query instance
 * @param {Font} font opentype font instance
 */
function FeatureQuery(font) {
    this.font = font;
    this.features = {};
}

/**
 * @typedef SubstitutionAction
 * @type Object
 * @property {number} id substitution type
 * @property {string} tag feature tag
 * @property {any} substitution substitution value(s)
 */

/**
 * Create a substitution action instance
 * @param {SubstitutionAction} action
 */
function SubstitutionAction(action) {
    this.id = action.id;
    this.tag = action.tag;
    this.substitution = action.substitution;
}

/**
 * Lookup a coverage table
 * @param {number} glyphIndex glyph index
 * @param {CoverageTable} coverage coverage table
 */
function lookupCoverage(glyphIndex, coverage) {
    if (!glyphIndex) { return -1; }
    switch (coverage.format) {
        case 1:
            return coverage.glyphs.indexOf(glyphIndex);

        case 2:
            var ranges = coverage.ranges;
            for (var i = 0; i < ranges.length; i++) {
                var range = ranges[i];
                if (glyphIndex >= range.start && glyphIndex <= range.end) {
                    var offset = glyphIndex - range.start;
                    return range.index + offset;
                }
            }
            break;
        default:
            return -1; // not found
    }
    return -1;
}

/**
 * Handle a single substitution - format 1
 * @param {ContextParams} contextParams context params to lookup
 */
function singleSubstitutionFormat1(glyphIndex, subtable) {
    var substituteIndex = lookupCoverage(glyphIndex, subtable.coverage);
    if (substituteIndex === -1) { return null; }
    return glyphIndex + subtable.deltaGlyphId;
}

/**
 * Handle a single substitution - format 2
 * @param {ContextParams} contextParams context params to lookup
 */
function singleSubstitutionFormat2(glyphIndex, subtable) {
    var substituteIndex = lookupCoverage(glyphIndex, subtable.coverage);
    if (substituteIndex === -1) { return null; }
    return subtable.substitute[substituteIndex];
}

/**
 * Lookup a list of coverage tables
 * @param {any} coverageList a list of coverage tables
 * @param {ContextParams} contextParams context params to lookup
 */
function lookupCoverageList(coverageList, contextParams) {
    var lookupList = [];
    for (var i = 0; i < coverageList.length; i++) {
        var coverage = coverageList[i];
        var glyphIndex = contextParams.current;
        glyphIndex = Array.isArray(glyphIndex) ? glyphIndex[0] : glyphIndex;
        var lookupIndex = lookupCoverage(glyphIndex, coverage);
        if (lookupIndex !== -1) {
            lookupList.push(lookupIndex);
        }
    }
    if (lookupList.length !== coverageList.length) { return -1; }
    return lookupList;
}

/**
 * Handle chaining context substitution - format 3
 * @param {ContextParams} contextParams context params to lookup
 */
function chainingSubstitutionFormat3(contextParams, subtable) {
    var lookupsCount = (
        subtable.inputCoverage.length +
        subtable.lookaheadCoverage.length +
        subtable.backtrackCoverage.length
    );
    if (contextParams.context.length < lookupsCount) { return []; }
    // INPUT LOOKUP //
    var inputLookups = lookupCoverageList(
        subtable.inputCoverage, contextParams
    );
    if (inputLookups === -1) { return []; }
    // LOOKAHEAD LOOKUP //
    var lookaheadOffset = subtable.inputCoverage.length - 1;
    if (contextParams.lookahead.length < subtable.lookaheadCoverage.length) { return []; }
    var lookaheadContext = contextParams.lookahead.slice(lookaheadOffset);
    while (lookaheadContext.length && isTashkeelArabicChar(lookaheadContext[0].char)) {
        lookaheadContext.shift();
    }
    var lookaheadParams = new ContextParams(lookaheadContext, 0);
    var lookaheadLookups = lookupCoverageList(
        subtable.lookaheadCoverage, lookaheadParams
    );
    // BACKTRACK LOOKUP //
    var backtrackContext = [].concat(contextParams.backtrack);
    backtrackContext.reverse();
    while (backtrackContext.length && isTashkeelArabicChar(backtrackContext[0].char)) {
        backtrackContext.shift();
    }
    if (backtrackContext.length < subtable.backtrackCoverage.length) { return []; }
    var backtrackParams = new ContextParams(backtrackContext, 0);
    var backtrackLookups = lookupCoverageList(
        subtable.backtrackCoverage, backtrackParams
    );
    var contextRulesMatch = (
        inputLookups.length === subtable.inputCoverage.length &&
        lookaheadLookups.length === subtable.lookaheadCoverage.length &&
        backtrackLookups.length === subtable.backtrackCoverage.length
    );
    var substitutions = [];
    if (contextRulesMatch) {
        for (var i = 0; i < subtable.lookupRecords.length; i++) {
            var lookupRecord = subtable.lookupRecords[i];
            var lookupListIndex = lookupRecord.lookupListIndex;
            var lookupTable = this.getLookupByIndex(lookupListIndex);
            for (var s = 0; s < lookupTable.subtables.length; s++) {
                var subtable$1 = lookupTable.subtables[s];
                var lookup = this.getLookupMethod(lookupTable, subtable$1);
                var substitutionType = this.getSubstitutionType(lookupTable, subtable$1);
                if (substitutionType === '12') {
                    for (var n = 0; n < inputLookups.length; n++) {
                        var glyphIndex = contextParams.get(n);
                        var substitution = lookup(glyphIndex);
                        if (substitution) { substitutions.push(substitution); }
                    }
                }
            }
        }
    }
    return substitutions;
}

/**
 * Handle ligature substitution - format 1
 * @param {ContextParams} contextParams context params to lookup
 */
function ligatureSubstitutionFormat1(contextParams, subtable) {
    // COVERAGE LOOKUP //
    var glyphIndex = contextParams.current;
    var ligSetIndex = lookupCoverage(glyphIndex, subtable.coverage);
    if (ligSetIndex === -1) { return null; }
    // COMPONENTS LOOKUP
    // (!) note, components are ordered in the written direction.
    var ligature;
    var ligatureSet = subtable.ligatureSets[ligSetIndex];
    for (var s = 0; s < ligatureSet.length; s++) {
        ligature = ligatureSet[s];
        for (var l = 0; l < ligature.components.length; l++) {
            var lookaheadItem = contextParams.lookahead[l];
            var component = ligature.components[l];
            if (lookaheadItem !== component) { break; }
            if (l === ligature.components.length - 1) { return ligature; }
        }
    }
    return null;
}

/**
 * Handle decomposition substitution - format 1
 * @param {number} glyphIndex glyph index
 * @param {any} subtable subtable
 */
function decompositionSubstitutionFormat1(glyphIndex, subtable) {
    var substituteIndex = lookupCoverage(glyphIndex, subtable.coverage);
    if (substituteIndex === -1) { return null; }
    return subtable.sequences[substituteIndex];
}

/**
 * Get default script features indexes
 */
FeatureQuery.prototype.getDefaultScriptFeaturesIndexes = function () {
    var scripts = this.font.tables.gsub.scripts;
    for (var s = 0; s < scripts.length; s++) {
        var script = scripts[s];
        if (script.tag === 'DFLT') { return (
            script.script.defaultLangSys.featureIndexes
        ); }
    }
    return [];
};

/**
 * Get feature indexes of a specific script
 * @param {string} scriptTag script tag
 */
FeatureQuery.prototype.getScriptFeaturesIndexes = function(scriptTag) {
    var tables = this.font.tables;
    if (!tables.gsub) { return []; }
    if (!scriptTag) { return this.getDefaultScriptFeaturesIndexes(); }
    var scripts = this.font.tables.gsub.scripts;
    for (var i = 0; i < scripts.length; i++) {
        var script = scripts[i];
        if (script.tag === scriptTag && script.script.defaultLangSys) {
            return script.script.defaultLangSys.featureIndexes;
        } else {
            var langSysRecords = script.langSysRecords;
            if (!!langSysRecords) {
                for (var j = 0; j < langSysRecords.length; j++) {
                    var langSysRecord = langSysRecords[j];
                    if (langSysRecord.tag === scriptTag) {
                        var langSys = langSysRecord.langSys;
                        return langSys.featureIndexes;
                    }
                }
            }
        }
    }
    return this.getDefaultScriptFeaturesIndexes();
};

/**
 * Map a feature tag to a gsub feature
 * @param {any} features gsub features
 * @param {string} scriptTag script tag
 */
FeatureQuery.prototype.mapTagsToFeatures = function (features, scriptTag) {
    var tags = {};
    for (var i = 0; i < features.length; i++) {
        var tag = features[i].tag;
        var feature = features[i].feature;
        tags[tag] = feature;
    }
    this.features[scriptTag].tags = tags;
};

/**
 * Get features of a specific script
 * @param {string} scriptTag script tag
 */
FeatureQuery.prototype.getScriptFeatures = function (scriptTag) {
    var features = this.features[scriptTag];
    if (this.features.hasOwnProperty(scriptTag)) { return features; }
    var featuresIndexes = this.getScriptFeaturesIndexes(scriptTag);
    if (!featuresIndexes) { return null; }
    var gsub = this.font.tables.gsub;
    features = featuresIndexes.map(function (index) { return gsub.features[index]; });
    this.features[scriptTag] = features;
    this.mapTagsToFeatures(features, scriptTag);
    return features;
};

/**
 * Get substitution type
 * @param {any} lookupTable lookup table
 * @param {any} subtable subtable
 */
FeatureQuery.prototype.getSubstitutionType = function(lookupTable, subtable) {
    var lookupType = lookupTable.lookupType.toString();
    var substFormat = subtable.substFormat.toString();
    return lookupType + substFormat;
};

/**
 * Get lookup method
 * @param {any} lookupTable lookup table
 * @param {any} subtable subtable
 */
FeatureQuery.prototype.getLookupMethod = function(lookupTable, subtable) {
    var this$1$1 = this;

    var substitutionType = this.getSubstitutionType(lookupTable, subtable);
    switch (substitutionType) {
        case '11':
            return function (glyphIndex) { return singleSubstitutionFormat1.apply(
                this$1$1, [glyphIndex, subtable]
            ); };
        case '12':
            return function (glyphIndex) { return singleSubstitutionFormat2.apply(
                this$1$1, [glyphIndex, subtable]
            ); };
        case '63':
            return function (contextParams) { return chainingSubstitutionFormat3.apply(
                this$1$1, [contextParams, subtable]
            ); };
        case '41':
            return function (contextParams) { return ligatureSubstitutionFormat1.apply(
                this$1$1, [contextParams, subtable]
            ); };
        case '21':
            return function (glyphIndex) { return decompositionSubstitutionFormat1.apply(
                this$1$1, [glyphIndex, subtable]
            ); };
        default:
            throw new Error(
                "lookupType: " + (lookupTable.lookupType) + " - " +
                "substFormat: " + (subtable.substFormat) + " " +
                "is not yet supported"
            );
    }
};

/**
 * [ LOOKUP TYPES ]
 * -------------------------------
 * Single                        1;
 * Multiple                      2;
 * Alternate                     3;
 * Ligature                      4;
 * Context                       5;
 * ChainingContext               6;
 * ExtensionSubstitution         7;
 * ReverseChainingContext        8;
 * -------------------------------
 *
 */

/**
 * @typedef FQuery
 * @type Object
 * @param {string} tag feature tag
 * @param {string} script feature script
 * @param {ContextParams} contextParams context params
 */

/**
 * Lookup a feature using a query parameters
 * @param {FQuery} query feature query
 */
FeatureQuery.prototype.lookupFeature = function (query) {
    var contextParams = query.contextParams;
    var currentIndex = contextParams.index;
    var feature = this.getFeature({
        tag: query.tag, script: query.script
    });
    if (!feature) { return new Error(
        "font '" + (this.font.names.fullName.en) + "' " +
        "doesn't support feature '" + (query.tag) + "' " +
        "for script '" + (query.script) + "'."
    ); }
    var lookups = this.getFeatureLookups(feature);
    var substitutions = [].concat(contextParams.context);
    for (var l = 0; l < lookups.length; l++) {
        var lookupTable = lookups[l];
        var subtables = this.getLookupSubtables(lookupTable);
        for (var s = 0; s < subtables.length; s++) {
            var subtable = subtables[s];
            var substType = this.getSubstitutionType(lookupTable, subtable);
            var lookup = this.getLookupMethod(lookupTable, subtable);
            var substitution = (void 0);
            switch (substType) {
                case '11':
                    substitution = lookup(contextParams.current);
                    if (substitution) {
                        substitutions.splice(currentIndex, 1, new SubstitutionAction({
                            id: 11, tag: query.tag, substitution: substitution
                        }));
                    }
                    break;
                case '12':
                    substitution = lookup(contextParams.current);
                    if (substitution) {
                        substitutions.splice(currentIndex, 1, new SubstitutionAction({
                            id: 12, tag: query.tag, substitution: substitution
                        }));
                    }
                    break;
                case '63':
                    substitution = lookup(contextParams);
                    if (Array.isArray(substitution) && substitution.length) {
                        substitutions.splice(currentIndex, 1, new SubstitutionAction({
                            id: 63, tag: query.tag, substitution: substitution
                        }));
                    }
                    break;
                case '41':
                    substitution = lookup(contextParams);
                    if (substitution) {
                        substitutions.splice(currentIndex, 1, new SubstitutionAction({
                            id: 41, tag: query.tag, substitution: substitution
                        }));
                    }
                    break;
                case '21':
                    substitution = lookup(contextParams.current);
                    if (substitution) {
                        substitutions.splice(currentIndex, 1, new SubstitutionAction({
                            id: 21, tag: query.tag, substitution: substitution
                        }));
                    }
                    break;
            }
            contextParams = new ContextParams(substitutions, currentIndex);
            if (Array.isArray(substitution) && !substitution.length) { continue; }
            substitution = null;
        }
    }
    return substitutions.length ? substitutions : null;
};

/**
 * Checks if a font supports a specific features
 * @param {FQuery} query feature query object
 */
FeatureQuery.prototype.supports = function (query) {
    if (!query.script) { return false; }
    this.getScriptFeatures(query.script);
    var supportedScript = this.features.hasOwnProperty(query.script);
    if (!query.tag) { return supportedScript; }
    var supportedFeature = (
        this.features[query.script].some(function (feature) { return feature.tag === query.tag; })
    );
    return supportedScript && supportedFeature;
};

/**
 * Get lookup table subtables
 * @param {any} lookupTable lookup table
 */
FeatureQuery.prototype.getLookupSubtables = function (lookupTable) {
    return lookupTable.subtables || null;
};

/**
 * Get lookup table by index
 * @param {number} index lookup table index
 */
FeatureQuery.prototype.getLookupByIndex = function (index) {
    var lookups = this.font.tables.gsub.lookups;
    return lookups[index] || null;
};

/**
 * Get lookup tables for a feature
 * @param {string} feature
 */
FeatureQuery.prototype.getFeatureLookups = function (feature) {
    // TODO: memoize
    return feature.lookupListIndexes.map(this.getLookupByIndex.bind(this));
};

/**
 * Query a feature by it's properties
 * @param {any} query an object that describes the properties of a query
 */
FeatureQuery.prototype.getFeature = function getFeature(query) {
    if (!this.font) { return { FAIL: "No font was found"}; }
    if (!this.features.hasOwnProperty(query.script)) {
        this.getScriptFeatures(query.script);
    }
    var scriptFeatures = this.features[query.script];
    if (!scriptFeatures) { return (
        { FAIL: ("No feature for script " + (query.script))}
    ); }
    if (!scriptFeatures.tags[query.tag]) { return null; }
    return this.features[query.script].tags[query.tag];
};

/**
 * Arabic word context checkers
 */

function arabicWordStartCheck(contextParams) {
    var char = contextParams.current;
    var prevChar = contextParams.get(-1);
    return (
        // ? arabic first char
        (prevChar === null && isArabicChar(char)) ||
        // ? arabic char preceded with a non arabic char
        (!isArabicChar(prevChar) && isArabicChar(char))
    );
}

function arabicWordEndCheck(contextParams) {
    var nextChar = contextParams.get(1);
    return (
        // ? last arabic char
        (nextChar === null) ||
        // ? next char is not arabic
        (!isArabicChar(nextChar))
    );
}

var arabicWordCheck = {
    startCheck: arabicWordStartCheck,
    endCheck: arabicWordEndCheck
};

/**
 * Arabic sentence context checkers
 */

function arabicSentenceStartCheck(contextParams) {
    var char = contextParams.current;
    var prevChar = contextParams.get(-1);
    return (
        // ? an arabic char preceded with a non arabic char
        (isArabicChar(char) || isTashkeelArabicChar(char)) &&
        !isArabicChar(prevChar)
    );
}

function arabicSentenceEndCheck(contextParams) {
    var nextChar = contextParams.get(1);
    switch (true) {
        case nextChar === null:
            return true;
        case (!isArabicChar(nextChar) && !isTashkeelArabicChar(nextChar)):
            var nextIsWhitespace = isWhiteSpace(nextChar);
            if (!nextIsWhitespace) { return true; }
            if (nextIsWhitespace) {
                var arabicCharAhead = false;
                arabicCharAhead = (
                    contextParams.lookahead.some(
                        function (c) { return isArabicChar(c) || isTashkeelArabicChar(c); }
                    )
                );
                if (!arabicCharAhead) { return true; }
            }
            break;
        default:
            return false;
    }
}

var arabicSentenceCheck = {
    startCheck: arabicSentenceStartCheck,
    endCheck: arabicSentenceEndCheck
};

/**
 * Apply single substitution format 1
 * @param {Array} substitutions substitutions
 * @param {any} tokens a list of tokens
 * @param {number} index token index
 */
function singleSubstitutionFormat1$1(action, tokens, index) {
    tokens[index].setState(action.tag, action.substitution);
}

/**
 * Apply single substitution format 2
 * @param {Array} substitutions substitutions
 * @param {any} tokens a list of tokens
 * @param {number} index token index
 */
function singleSubstitutionFormat2$1(action, tokens, index) {
    tokens[index].setState(action.tag, action.substitution);
}

/**
 * Apply chaining context substitution format 3
 * @param {Array} substitutions substitutions
 * @param {any} tokens a list of tokens
 * @param {number} index token index
 */
function chainingSubstitutionFormat3$1(action, tokens, index) {
    action.substitution.forEach(function (subst, offset) {
        var token = tokens[index + offset];
        token.setState(action.tag, subst);
    });
}

/**
 * Apply ligature substitution format 1
 * @param {Array} substitutions substitutions
 * @param {any} tokens a list of tokens
 * @param {number} index token index
 */
function ligatureSubstitutionFormat1$1(action, tokens, index) {
    var token = tokens[index];
    token.setState(action.tag, action.substitution.ligGlyph);
    var compsCount = action.substitution.components.length;
    for (var i = 0; i < compsCount; i++) {
        token = tokens[index + i + 1];
        token.setState('deleted', true);
    }
}

/**
 * Supported substitutions
 */
var SUBSTITUTIONS = {
    11: singleSubstitutionFormat1$1,
    12: singleSubstitutionFormat2$1,
    63: chainingSubstitutionFormat3$1,
    41: ligatureSubstitutionFormat1$1
};

/**
 * Apply substitutions to a list of tokens
 * @param {Array} substitutions substitutions
 * @param {any} tokens a list of tokens
 * @param {number} index token index
 */
function applySubstitution(action, tokens, index) {
    if (action instanceof SubstitutionAction && SUBSTITUTIONS[action.id]) {
        SUBSTITUTIONS[action.id](action, tokens, index);
    }
}

/**
 * Apply Arabic presentation forms to a range of tokens
 */

/**
 * Check if a char can be connected to it's preceding char
 * @param {ContextParams} charContextParams context params of a char
 */
function willConnectPrev(charContextParams) {
    var backtrack = [].concat(charContextParams.backtrack);
    for (var i = backtrack.length - 1; i >= 0; i--) {
        var prevChar = backtrack[i];
        var isolated = isIsolatedArabicChar(prevChar);
        var tashkeel = isTashkeelArabicChar(prevChar);
        if (!isolated && !tashkeel) { return true; }
        if (isolated) { return false; }
    }
    return false;
}

/**
 * Check if a char can be connected to it's proceeding char
 * @param {ContextParams} charContextParams context params of a char
 */
function willConnectNext(charContextParams) {
    if (isIsolatedArabicChar(charContextParams.current)) { return false; }
    for (var i = 0; i < charContextParams.lookahead.length; i++) {
        var nextChar = charContextParams.lookahead[i];
        var tashkeel = isTashkeelArabicChar(nextChar);
        if (!tashkeel) { return true; }
    }
    return false;
}

/**
 * Apply arabic presentation forms to a list of tokens
 * @param {ContextRange} range a range of tokens
 */
function arabicPresentationForms(range) {
    var this$1$1 = this;

    var script = 'arab';
    var tags = this.featuresTags[script];
    var tokens = this.tokenizer.getRangeTokens(range);
    if (tokens.length === 1) { return; }
    var contextParams = new ContextParams(
        tokens.map(function (token) { return token.getState('glyphIndex'); }
    ), 0);
    var charContextParams = new ContextParams(
        tokens.map(function (token) { return token.char; }
    ), 0);
    tokens.forEach(function (token, index) {
        if (isTashkeelArabicChar(token.char)) { return; }
        contextParams.setCurrentIndex(index);
        charContextParams.setCurrentIndex(index);
        var CONNECT = 0; // 2 bits 00 (10: can connect next) (01: can connect prev)
        if (willConnectPrev(charContextParams)) { CONNECT |= 1; }
        if (willConnectNext(charContextParams)) { CONNECT |= 2; }
        var tag;
        switch (CONNECT) {
            case 1: (tag = 'fina'); break;
            case 2: (tag = 'init'); break;
            case 3: (tag = 'medi'); break;
        }
        if (tags.indexOf(tag) === -1) { return; }
        var substitutions = this$1$1.query.lookupFeature({
            tag: tag, script: script, contextParams: contextParams
        });
        if (substitutions instanceof Error) { return console.info(substitutions.message); }
        substitutions.forEach(function (action, index) {
            if (action instanceof SubstitutionAction) {
                applySubstitution(action, tokens, index);
                contextParams.context[index] = action.substitution;
            }
        });
    });
}

/**
 * Apply Arabic required ligatures feature to a range of tokens
 */

/**
 * Update context params
 * @param {any} tokens a list of tokens
 * @param {number} index current item index
 */
function getContextParams(tokens, index) {
    var context = tokens.map(function (token) { return token.activeState.value; });
    return new ContextParams(context, 0);
}

/**
 * Apply Arabic required ligatures to a context range
 * @param {ContextRange} range a range of tokens
 */
function arabicRequiredLigatures(range) {
    var this$1$1 = this;

    var script = 'arab';
    var tokens = this.tokenizer.getRangeTokens(range);
    var contextParams = getContextParams(tokens);
    contextParams.context.forEach(function (glyphIndex, index) {
        contextParams.setCurrentIndex(index);
        var substitutions = this$1$1.query.lookupFeature({
            tag: 'rlig', script: script, contextParams: contextParams
        });
        if (substitutions.length) {
            substitutions.forEach(
                function (action) { return applySubstitution(action, tokens, index); }
            );
            contextParams = getContextParams(tokens);
        }
    });
}

/**
 * Latin word context checkers
 */

function latinWordStartCheck(contextParams) {
    var char = contextParams.current;
    var prevChar = contextParams.get(-1);
    return (
        // ? latin first char
        (prevChar === null && isLatinChar(char)) ||
        // ? latin char preceded with a non latin char
        (!isLatinChar(prevChar) && isLatinChar(char))
    );
}

function latinWordEndCheck(contextParams) {
    var nextChar = contextParams.get(1);
    return (
        // ? last latin char
        (nextChar === null) ||
        // ? next char is not latin
        (!isLatinChar(nextChar))
    );
}

var latinWordCheck = {
    startCheck: latinWordStartCheck,
    endCheck: latinWordEndCheck
};

/**
 * Apply Latin ligature feature to a range of tokens
 */

/**
 * Update context params
 * @param {any} tokens a list of tokens
 * @param {number} index current item index
 */
function getContextParams$1(tokens, index) {
    var context = tokens.map(function (token) { return token.activeState.value; });
    return new ContextParams(context, 0);
}

/**
 * Apply Arabic required ligatures to a context range
 * @param {ContextRange} range a range of tokens
 */
function latinLigature(range) {
    var this$1$1 = this;

    var script = 'latn';
    var tokens = this.tokenizer.getRangeTokens(range);
    var contextParams = getContextParams$1(tokens);
    contextParams.context.forEach(function (glyphIndex, index) {
        contextParams.setCurrentIndex(index);
        var substitutions = this$1$1.query.lookupFeature({
            tag: 'liga', script: script, contextParams: contextParams
        });
        if (substitutions.length) {
            substitutions.forEach(
                function (action) { return applySubstitution(action, tokens, index); }
            );
            contextParams = getContextParams$1(tokens);
        }
    });
}

/**
 * Infer bidirectional properties for a given text and apply
 * the corresponding layout rules.
 */

/**
 * Create Bidi. features
 * @param {string} baseDir text base direction. value either 'ltr' or 'rtl'
 */
function Bidi(baseDir) {
    this.baseDir = baseDir || 'ltr';
    this.tokenizer = new Tokenizer();
    this.featuresTags = {};
}

/**
 * Sets Bidi text
 * @param {string} text a text input
 */
Bidi.prototype.setText = function (text) {
    this.text = text;
};

/**
 * Store essential context checks:
 * arabic word check for applying gsub features
 * arabic sentence check for adjusting arabic layout
 */
Bidi.prototype.contextChecks = ({
    latinWordCheck: latinWordCheck,
    arabicWordCheck: arabicWordCheck,
    arabicSentenceCheck: arabicSentenceCheck
});

/**
 * Register arabic word check
 */
function registerContextChecker(checkId) {
    var check = this.contextChecks[(checkId + "Check")];
    return this.tokenizer.registerContextChecker(
        checkId, check.startCheck, check.endCheck
    );
}

/**
 * Perform pre tokenization procedure then
 * tokenize text input
 */
function tokenizeText() {
    registerContextChecker.call(this, 'latinWord');
    registerContextChecker.call(this, 'arabicWord');
    registerContextChecker.call(this, 'arabicSentence');
    return this.tokenizer.tokenize(this.text);
}

/**
 * Reverse arabic sentence layout
 * TODO: check base dir before applying adjustments - priority low
 */
function reverseArabicSentences() {
    var this$1$1 = this;

    var ranges = this.tokenizer.getContextRanges('arabicSentence');
    ranges.forEach(function (range) {
        var rangeTokens = this$1$1.tokenizer.getRangeTokens(range);
        this$1$1.tokenizer.replaceRange(
            range.startIndex,
            range.endOffset,
            rangeTokens.reverse()
        );
    });
}

/**
 * Register supported features tags
 * @param {script} script script tag
 * @param {Array} tags features tags list
 */
Bidi.prototype.registerFeatures = function (script, tags) {
    var this$1$1 = this;

    var supportedTags = tags.filter(
        function (tag) { return this$1$1.query.supports({script: script, tag: tag}); }
    );
    if (!this.featuresTags.hasOwnProperty(script)) {
        this.featuresTags[script] = supportedTags;
    } else {
        this.featuresTags[script] =
        this.featuresTags[script].concat(supportedTags);
    }
};

/**
 * Apply GSUB features
 * @param {Array} tagsList a list of features tags
 * @param {string} script a script tag
 * @param {Font} font opentype font instance
 */
Bidi.prototype.applyFeatures = function (font, features) {
    if (!font) { throw new Error(
        'No valid font was provided to apply features'
    ); }
    if (!this.query) { this.query = new FeatureQuery(font); }
    for (var f = 0; f < features.length; f++) {
        var feature = features[f];
        if (!this.query.supports({script: feature.script})) { continue; }
        this.registerFeatures(feature.script, feature.tags);
    }
};

/**
 * Register a state modifier
 * @param {string} modifierId state modifier id
 * @param {function} condition a predicate function that returns true or false
 * @param {function} modifier a modifier function to set token state
 */
Bidi.prototype.registerModifier = function (modifierId, condition, modifier) {
    this.tokenizer.registerModifier(modifierId, condition, modifier);
};

/**
 * Check if 'glyphIndex' is registered
 */
function checkGlyphIndexStatus() {
    if (this.tokenizer.registeredModifiers.indexOf('glyphIndex') === -1) {
        throw new Error(
            'glyphIndex modifier is required to apply ' +
            'arabic presentation features.'
        );
    }
}

/**
 * Apply arabic presentation forms features
 */
function applyArabicPresentationForms() {
    var this$1$1 = this;

    var script = 'arab';
    if (!this.featuresTags.hasOwnProperty(script)) { return; }
    checkGlyphIndexStatus.call(this);
    var ranges = this.tokenizer.getContextRanges('arabicWord');
    ranges.forEach(function (range) {
        arabicPresentationForms.call(this$1$1, range);
    });
}

/**
 * Apply required arabic ligatures
 */
function applyArabicRequireLigatures() {
    var this$1$1 = this;

    var script = 'arab';
    if (!this.featuresTags.hasOwnProperty(script)) { return; }
    var tags = this.featuresTags[script];
    if (tags.indexOf('rlig') === -1) { return; }
    checkGlyphIndexStatus.call(this);
    var ranges = this.tokenizer.getContextRanges('arabicWord');
    ranges.forEach(function (range) {
        arabicRequiredLigatures.call(this$1$1, range);
    });
}

/**
 * Apply required arabic ligatures
 */
function applyLatinLigatures() {
    var this$1$1 = this;

    var script = 'latn';
    if (!this.featuresTags.hasOwnProperty(script)) { return; }
    var tags = this.featuresTags[script];
    if (tags.indexOf('liga') === -1) { return; }
    checkGlyphIndexStatus.call(this);
    var ranges = this.tokenizer.getContextRanges('latinWord');
    ranges.forEach(function (range) {
        latinLigature.call(this$1$1, range);
    });
}

/**
 * Check if a context is registered
 * @param {string} contextId context id
 */
Bidi.prototype.checkContextReady = function (contextId) {
    return !!this.tokenizer.getContext(contextId);
};

/**
 * Apply features to registered contexts
 */
Bidi.prototype.applyFeaturesToContexts = function () {
    if (this.checkContextReady('arabicWord')) {
        applyArabicPresentationForms.call(this);
        applyArabicRequireLigatures.call(this);
    }
    if (this.checkContextReady('latinWord')) {
        applyLatinLigatures.call(this);
    }
    if (this.checkContextReady('arabicSentence')) {
        reverseArabicSentences.call(this);
    }
};

/**
 * process text input
 * @param {string} text an input text
 */
Bidi.prototype.processText = function(text) {
    if (!this.text || this.text !== text) {
        this.setText(text);
        tokenizeText.call(this);
        this.applyFeaturesToContexts();
    }
};

/**
 * Process a string of text to identify and adjust
 * bidirectional text entities.
 * @param {string} text input text
 */
Bidi.prototype.getBidiText = function (text) {
    this.processText(text);
    return this.tokenizer.getText();
};

/**
 * Get the current state index of each token
 * @param {text} text an input text
 */
Bidi.prototype.getTextGlyphs = function (text) {
    this.processText(text);
    var indexes = [];
    for (var i = 0; i < this.tokenizer.tokens.length; i++) {
        var token = this.tokenizer.tokens[i];
        if (token.state.deleted) { continue; }
        var index = token.activeState.value;
        indexes.push(Array.isArray(index) ? index[0] : index);
    }
    return indexes;
};

// The Font object

/**
 * @typedef FontOptions
 * @type Object
 * @property {Boolean} empty - whether to create a new empty font
 * @property {string} familyName
 * @property {string} styleName
 * @property {string=} fullName
 * @property {string=} postScriptName
 * @property {string=} designer
 * @property {string=} designerURL
 * @property {string=} manufacturer
 * @property {string=} manufacturerURL
 * @property {string=} license
 * @property {string=} licenseURL
 * @property {string=} version
 * @property {string=} description
 * @property {string=} copyright
 * @property {string=} trademark
 * @property {Number} unitsPerEm
 * @property {Number} ascender
 * @property {Number} descender
 * @property {Number} createdTimestamp
 * @property {string=} weightClass
 * @property {string=} widthClass
 * @property {string=} fsSelection
 */

/**
 * A Font represents a loaded OpenType font file.
 * It contains a set of glyphs and methods to draw text on a drawing context,
 * or to get a path representing the text.
 * @exports opentype.Font
 * @class
 * @param {FontOptions}
 * @constructor
 */
function Font(options) {
    options = options || {};
    options.tables = options.tables || {};

    if (!options.empty) {
        // Check that we've provided the minimum set of names.
        checkArgument(
            options.familyName,
            'When creating a new Font object, familyName is required.'
        );
        checkArgument(
            options.styleName,
            'When creating a new Font object, styleName is required.'
        );
        checkArgument(
            options.unitsPerEm,
            'When creating a new Font object, unitsPerEm is required.'
        );
        checkArgument(
            options.ascender,
            'When creating a new Font object, ascender is required.'
        );
        checkArgument(
            options.descender <= 0,
            'When creating a new Font object, negative descender value is required.'
        );

        this.unitsPerEm = options.unitsPerEm || 1000;
        this.ascender = options.ascender;
        this.descender = options.descender;
        this.createdTimestamp = options.createdTimestamp;
        this.tables = Object.assign(options.tables, {
            os2: Object.assign(
                {
                    usWeightClass:
                        options.weightClass || this.usWeightClasses.MEDIUM,
                    usWidthClass:
                        options.widthClass || this.usWidthClasses.MEDIUM,
                    fsSelection:
                        options.fsSelection || this.fsSelectionValues.REGULAR,
                },
                options.tables.os2
            ),
        });
    }

    this.supported = true; // Deprecated: parseBuffer will throw an error if font is not supported.
    this.glyphs = new glyphset.GlyphSet(this, options.glyphs || []);
    this.encoding = new DefaultEncoding(this);
    this.position = new Position(this);
    this.substitution = new Substitution(this);
    this.tables = this.tables || {};

    // needed for low memory mode only.
    this._push = null;
    this._hmtxTableData = {};

    Object.defineProperty(this, 'hinting', {
        get: function () {
            if (this._hinting) { return this._hinting; }
            if (this.outlinesFormat === 'truetype') {
                return (this._hinting = new Hinting(this));
            }
        },
    });
}

/**
 * Check if the font has a glyph for the given character.
 * @param  {string}
 * @return {Boolean}
 */
Font.prototype.hasChar = function (c) {
    return this.encoding.charToGlyphIndex(c) !== null;
};

/**
 * Convert the given character to a single glyph index.
 * Note that this function assumes that there is a one-to-one mapping between
 * the given character and a glyph; for complex scripts this might not be the case.
 * @param  {string}
 * @return {Number}
 */
Font.prototype.charToGlyphIndex = function (s) {
    return this.encoding.charToGlyphIndex(s);
};

/**
 * Convert the given character to a single Glyph object.
 * Note that this function assumes that there is a one-to-one mapping between
 * the given character and a glyph; for complex scripts this might not be the case.
 * @param  {string}
 * @return {opentype.Glyph}
 */
Font.prototype.charToGlyph = function (c) {
    var glyphIndex = this.charToGlyphIndex(c);
    var glyph = this.glyphs.get(glyphIndex);
    if (!glyph) {
        // .notdef
        glyph = this.glyphs.get(0);
    }

    return glyph;
};

/**
 * Update features
 * @param {any} options features options
 */
Font.prototype.updateFeatures = function (options) {
    // TODO: update all features options not only 'latn'.
    return this.defaultRenderOptions.features.map(function (feature) {
        if (feature.script === 'latn') {
            return {
                script: 'latn',
                tags: feature.tags.filter(function (tag) { return options[tag]; }),
            };
        } else {
            return feature;
        }
    });
};

/**
 * Convert the given text to a list of Glyph objects.
 * Note that there is no strict one-to-one mapping between characters and
 * glyphs, so the list of returned glyphs can be larger or smaller than the
 * length of the given string.
 * @param  {string}
 * @param  {GlyphRenderOptions} [options]
 * @return {opentype.Glyph[]}
 */
Font.prototype.stringToGlyphs = function (s, options) {
    var this$1$1 = this;

    var bidi = new Bidi();

    // Create and register 'glyphIndex' state modifier
    var charToGlyphIndexMod = function (token) { return this$1$1.charToGlyphIndex(token.char); };
    bidi.registerModifier('glyphIndex', null, charToGlyphIndexMod);

    // roll-back to default features
    var features = options
        ? this.updateFeatures(options.features)
        : this.defaultRenderOptions.features;

    bidi.applyFeatures(this, features);

    var indexes = bidi.getTextGlyphs(s);

    var length = indexes.length;

    // convert glyph indexes to glyph objects
    var glyphs = new Array(length);
    var notdef = this.glyphs.get(0);
    for (var i = 0; i < length; i += 1) {
        glyphs[i] = this.glyphs.get(indexes[i]) || notdef;
    }
    return glyphs;
};

/**
 * Retrieve the value of the kerning pair between the left glyph (or its index)
 * and the right glyph (or its index). If no kerning pair is found, return 0.
 * The kerning value gets added to the advance width when calculating the spacing
 * between glyphs.
 * For GPOS kerning, this method uses the default script and language, which covers
 * most use cases. To have greater control, use font.position.getKerningValue .
 * @param  {opentype.Glyph} leftGlyph
 * @param  {opentype.Glyph} rightGlyph
 * @return {Number}
 */
Font.prototype.getKerningValue = function (leftGlyph, rightGlyph) {
    leftGlyph = leftGlyph.index || leftGlyph;
    rightGlyph = rightGlyph.index || rightGlyph;
    var gposKerning = this.position.defaultKerningTables;
    if (gposKerning) {
        return this.position.getKerningValue(
            gposKerning,
            leftGlyph,
            rightGlyph
        );
    }
    // "kern" table
    return this.kerningPairs[leftGlyph + ',' + rightGlyph] || 0;
};

/**
 * @typedef GlyphRenderOptions
 * @type Object
 * @property {string} [script] - script used to determine which features to apply. By default, 'DFLT' or 'latn' is used.
 *                               See https://www.microsoft.com/typography/otspec/scripttags.htm
 * @property {string} [language='dflt'] - language system used to determine which features to apply.
 *                                        See https://www.microsoft.com/typography/developers/opentype/languagetags.aspx
 * @property {boolean} [kerning=true] - whether to include kerning values
 * @property {object} [features] - OpenType Layout feature tags. Used to enable or disable the features of the given script/language system.
 *                                 See https://www.microsoft.com/typography/otspec/featuretags.htm
 */
Font.prototype.defaultRenderOptions = {
    kerning: true,
    features: [
        /**
         * these 4 features are required to render Arabic text properly
         * and shouldn't be turned off when rendering arabic text.
         */
        { script: 'arab', tags: ['init', 'medi', 'fina', 'rlig'] },
        { script: 'latn', tags: ['liga', 'rlig'] } ],
};

/**
 * Helper function that invokes the given callback for each glyph in the given text.
 * The callback gets `(glyph, x, y, fontSize, options)`.* @param  {string} text
 * @param {string} text - The text to apply.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @param  {Function} callback
 */
Font.prototype.forEachGlyph = function (
    text,
    x,
    y,
    fontSize,
    options,
    callback
) {
    x = x !== undefined ? x : 0;
    y = y !== undefined ? y : 0;
    fontSize = fontSize !== undefined ? fontSize : 72;
    options = Object.assign({}, this.defaultRenderOptions, options);
    var fontScale = (1 / this.unitsPerEm) * fontSize;
    var glyphs = this.stringToGlyphs(text, options);
    var kerningLookups;
    if (options.kerning) {
        var script = options.script || this.position.getDefaultScriptName();
        kerningLookups = this.position.getKerningTables(
            script,
            options.language
        );
    }
    for (var i = 0; i < glyphs.length; i += 1) {
        var glyph = glyphs[i];
        callback.call(this, glyph, x, y, fontSize, options);
        if (glyph.advanceWidth) {
            x += glyph.advanceWidth * fontScale;
        }

        if (options.kerning && i < glyphs.length - 1) {
            // We should apply position adjustment lookups in a more generic way.
            // Here we only use the xAdvance value.
            var kerningValue = kerningLookups
                ? this.position.getKerningValue(
                      kerningLookups,
                      glyph.index,
                      glyphs[i + 1].index
                  )
                : this.getKerningValue(glyph, glyphs[i + 1]);
            x += kerningValue * fontScale;
        }

        if (options.letterSpacing) {
            x += options.letterSpacing * fontSize;
        } else if (options.tracking) {
            x += (options.tracking / 1000) * fontSize;
        }
    }
    return x;
};

/**
 * Create a Path object that represents the given text.
 * @param  {string} text - The text to create.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @return {opentype.Path}
 */
Font.prototype.getPath = function (text, x, y, fontSize, options) {
    var fullPath = new Path();
    this.forEachGlyph(
        text,
        x,
        y,
        fontSize,
        options,
        function (glyph, gX, gY, gFontSize) {
            var glyphPath = glyph.getPath(gX, gY, gFontSize, options, this);
            fullPath.extend(glyphPath);
        }
    );
    return fullPath;
};

/**
 * Create an array of Path objects that represent the glyphs of a given text.
 * @param  {string} text - The text to create.
 * @param  {number} [x=0] - Horizontal position of the beginning of the text.
 * @param  {number} [y=0] - Vertical position of the *baseline* of the text.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @return {opentype.Path[]}
 */
Font.prototype.getPaths = function (text, x, y, fontSize, options) {
    var glyphPaths = [];
    this.forEachGlyph(
        text,
        x,
        y,
        fontSize,
        options,
        function (glyph, gX, gY, gFontSize) {
            var glyphPath = glyph.getPath(gX, gY, gFontSize, options, this);
            glyphPaths.push(glyphPath);
        }
    );

    return glyphPaths;
};

/**
 * Returns the advance width of a text.
 *
 * This is something different than Path.getBoundingBox() as for example a
 * suffixed whitespace increases the advanceWidth but not the bounding box
 * or an overhanging letter like a calligraphic 'f' might have a quite larger
 * bounding box than its advance width.
 *
 * This corresponds to canvas2dContext.measureText(text).width
 *
 * @param  {string} text - The text to create.
 * @param  {number} [fontSize=72] - Font size in pixels. We scale the glyph units by `1 / unitsPerEm * fontSize`.
 * @param  {GlyphRenderOptions=} options
 * @return advance width
 */
Font.prototype.getAdvanceWidth = function (text, fontSize, options) {
    return this.forEachGlyph(text, 0, 0, fontSize, options, function () {});
};

/**
 * @private
 */
Font.prototype.fsSelectionValues = {
    ITALIC: 0x001, //1
    UNDERSCORE: 0x002, //2
    NEGATIVE: 0x004, //4
    OUTLINED: 0x008, //8
    STRIKEOUT: 0x010, //16
    BOLD: 0x020, //32
    REGULAR: 0x040, //64
    USER_TYPO_METRICS: 0x080, //128
    WWS: 0x100, //256
    OBLIQUE: 0x200, //512
};

/**
 * @private
 */
Font.prototype.usWidthClasses = {
    ULTRA_CONDENSED: 1,
    EXTRA_CONDENSED: 2,
    CONDENSED: 3,
    SEMI_CONDENSED: 4,
    MEDIUM: 5,
    SEMI_EXPANDED: 6,
    EXPANDED: 7,
    EXTRA_EXPANDED: 8,
    ULTRA_EXPANDED: 9,
};

/**
 * @private
 */
Font.prototype.usWeightClasses = {
    THIN: 100,
    EXTRA_LIGHT: 200,
    LIGHT: 300,
    NORMAL: 400,
    MEDIUM: 500,
    SEMI_BOLD: 600,
    BOLD: 700,
    EXTRA_BOLD: 800,
    BLACK: 900,
};

// The `cmap` table stores the mappings from characters to glyphs.

function parseCmapTableFormat12(cmap, p) {
    //Skip reserved.
    p.parseUShort();

    // Length in bytes of the sub-tables.
    cmap.length = p.parseULong();
    cmap.language = p.parseULong();

    var groupCount;
    cmap.groupCount = groupCount = p.parseULong();
    cmap.glyphIndexMap = {};

    for (var i = 0; i < groupCount; i += 1) {
        var startCharCode = p.parseULong();
        var endCharCode = p.parseULong();
        var startGlyphId = p.parseULong();

        for (var c = startCharCode; c <= endCharCode; c += 1) {
            cmap.glyphIndexMap[c] = startGlyphId;
            startGlyphId++;
        }
    }
}

function parseCmapTableFormat4(cmap, p, data, start, offset) {
    // Length in bytes of the sub-tables.
    cmap.length = p.parseUShort();
    cmap.language = p.parseUShort();

    // segCount is stored x 2.
    var segCount;
    cmap.segCount = segCount = p.parseUShort() >> 1;

    // Skip searchRange, entrySelector, rangeShift.
    p.skip('uShort', 3);

    // The "unrolled" mapping from character codes to glyph indices.
    cmap.glyphIndexMap = {};
    var endCountParser = new parse.Parser(data, start + offset + 14);
    var startCountParser = new parse.Parser(
        data,
        start + offset + 16 + segCount * 2
    );
    var idDeltaParser = new parse.Parser(
        data,
        start + offset + 16 + segCount * 4
    );
    var idRangeOffsetParser = new parse.Parser(
        data,
        start + offset + 16 + segCount * 6
    );
    var glyphIndexOffset = start + offset + 16 + segCount * 8;
    for (var i = 0; i < segCount - 1; i += 1) {
        var glyphIndex = (void 0);
        var endCount = endCountParser.parseUShort();
        var startCount = startCountParser.parseUShort();
        var idDelta = idDeltaParser.parseShort();
        var idRangeOffset = idRangeOffsetParser.parseUShort();
        for (var c = startCount; c <= endCount; c += 1) {
            if (idRangeOffset !== 0) {
                // The idRangeOffset is relative to the current position in the idRangeOffset array.
                // Take the current offset in the idRangeOffset array.
                glyphIndexOffset =
                    idRangeOffsetParser.offset +
                    idRangeOffsetParser.relativeOffset -
                    2;

                // Add the value of the idRangeOffset, which will move us into the glyphIndex array.
                glyphIndexOffset += idRangeOffset;

                // Then add the character index of the current segment, multiplied by 2 for USHORTs.
                glyphIndexOffset += (c - startCount) * 2;
                glyphIndex = parse.getUShort(data, glyphIndexOffset);
                if (glyphIndex !== 0) {
                    glyphIndex = (glyphIndex + idDelta) & 0xffff;
                }
            } else {
                glyphIndex = (c + idDelta) & 0xffff;
            }

            cmap.glyphIndexMap[c] = glyphIndex;
        }
    }
}

// Parse the `cmap` table. This table stores the mappings from characters to glyphs.
// There are many available formats, but we only support the Windows format 4 and 12.
// This function returns a `CmapEncoding` object or null if no supported format could be found.
function parseCmapTable(data, start) {
    var cmap = {};
    cmap.version = parse.getUShort(data, start);
    check.argument(cmap.version === 0, 'cmap table version should be 0.');

    // The cmap table can contain many sub-tables, each with their own format.
    // We're only interested in a "platform 0" (Unicode format) and "platform 3" (Windows format) table.
    cmap.numTables = parse.getUShort(data, start + 2);
    var offset = -1;
    for (var i = cmap.numTables - 1; i >= 0; i -= 1) {
        var platformId = parse.getUShort(data, start + 4 + i * 8);
        var encodingId = parse.getUShort(data, start + 4 + i * 8 + 2);
        if (
            (platformId === 3 &&
                (encodingId === 0 || encodingId === 1 || encodingId === 10)) ||
            (platformId === 0 &&
                (encodingId === 0 ||
                    encodingId === 1 ||
                    encodingId === 2 ||
                    encodingId === 3 ||
                    encodingId === 4))
        ) {
            offset = parse.getULong(data, start + 4 + i * 8 + 4);
            break;
        }
    }

    if (offset === -1) {
        // There is no cmap table in the font that we support.
        throw new Error('No valid cmap sub-tables found.');
    }

    var p = new parse.Parser(data, start + offset);
    cmap.format = p.parseUShort();

    if (cmap.format === 12) {
        parseCmapTableFormat12(cmap, p);
    } else if (cmap.format === 4) {
        parseCmapTableFormat4(cmap, p, data, start, offset);
    } else {
        throw new Error(
            'Only format 4 and 12 cmap tables are supported (found format ' +
                cmap.format +
                ').'
        );
    }

    return cmap;
}

var cmap = { parse: parseCmapTable };

// The `CFF` table contains the glyph outlines in PostScript format.

// Subroutines are encoded using the negative half of the number space.
// See type 2 chapter 4.7 "Subroutine operators".
function calcCFFSubroutineBias(subrs) {
    var bias;
    if (subrs.length < 1240) {
        bias = 107;
    } else if (subrs.length < 33900) {
        bias = 1131;
    } else {
        bias = 32768;
    }

    return bias;
}

// Parse a `CFF` INDEX array.
// An index array consists of a list of offsets, then a list of objects at those offsets.
function parseCFFIndex(data, start, conversionFn) {
    var offsets = [];
    var objects = [];
    var count = parse.getCard16(data, start);
    var objectOffset;
    var endOffset;
    if (count !== 0) {
        var offsetSize = parse.getByte(data, start + 2);
        objectOffset = start + (count + 1) * offsetSize + 2;
        var pos = start + 3;
        for (var i = 0; i < count + 1; i += 1) {
            offsets.push(parse.getOffset(data, pos, offsetSize));
            pos += offsetSize;
        }

        // The total size of the index array is 4 header bytes + the value of the last offset.
        endOffset = objectOffset + offsets[count];
    } else {
        endOffset = start + 2;
    }

    for (var i$1 = 0; i$1 < offsets.length - 1; i$1 += 1) {
        var value = parse.getBytes(
            data,
            objectOffset + offsets[i$1],
            objectOffset + offsets[i$1 + 1]
        );
        if (conversionFn) {
            value = conversionFn(value);
        }

        objects.push(value);
    }

    return { objects: objects, startOffset: start, endOffset: endOffset };
}

function parseCFFIndexLowMemory(data, start) {
    var offsets = [];
    var count = parse.getCard16(data, start);
    var objectOffset;
    var endOffset;
    if (count !== 0) {
        var offsetSize = parse.getByte(data, start + 2);
        objectOffset = start + (count + 1) * offsetSize + 2;
        var pos = start + 3;
        for (var i = 0; i < count + 1; i += 1) {
            offsets.push(parse.getOffset(data, pos, offsetSize));
            pos += offsetSize;
        }

        // The total size of the index array is 4 header bytes + the value of the last offset.
        endOffset = objectOffset + offsets[count];
    } else {
        endOffset = start + 2;
    }

    return { offsets: offsets, startOffset: start, endOffset: endOffset };
}
function getCffIndexObject(i, offsets, data, start, conversionFn) {
    var count = parse.getCard16(data, start);
    var objectOffset = 0;
    if (count !== 0) {
        var offsetSize = parse.getByte(data, start + 2);
        objectOffset = start + (count + 1) * offsetSize + 2;
    }

    var value = parse.getBytes(
        data,
        objectOffset + offsets[i],
        objectOffset + offsets[i + 1]
    );
    return value;
}

// Parse a `CFF` DICT real value.
function parseFloatOperand(parser) {
    var s = '';
    var eof = 15;
    var lookup = [
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        '.',
        'E',
        'E-',
        null,
        '-' ];
    while (true) {
        var b = parser.parseByte();
        var n1 = b >> 4;
        var n2 = b & 15;

        if (n1 === eof) {
            break;
        }

        s += lookup[n1];

        if (n2 === eof) {
            break;
        }

        s += lookup[n2];
    }

    return parseFloat(s);
}

// Parse a `CFF` DICT operand.
function parseOperand(parser, b0) {
    var b1;
    var b2;
    var b3;
    var b4;
    if (b0 === 28) {
        b1 = parser.parseByte();
        b2 = parser.parseByte();
        return (b1 << 8) | b2;
    }

    if (b0 === 29) {
        b1 = parser.parseByte();
        b2 = parser.parseByte();
        b3 = parser.parseByte();
        b4 = parser.parseByte();
        return (b1 << 24) | (b2 << 16) | (b3 << 8) | b4;
    }

    if (b0 === 30) {
        return parseFloatOperand(parser);
    }

    if (b0 >= 32 && b0 <= 246) {
        return b0 - 139;
    }

    if (b0 >= 247 && b0 <= 250) {
        b1 = parser.parseByte();
        return (b0 - 247) * 256 + b1 + 108;
    }

    if (b0 >= 251 && b0 <= 254) {
        b1 = parser.parseByte();
        return -(b0 - 251) * 256 - b1 - 108;
    }

    throw new Error('Invalid b0 ' + b0);
}

// Convert the entries returned by `parseDict` to a proper dictionary.
// If a value is a list of one, it is unpacked.
function entriesToObject(entries) {
    var o = {};
    for (var i = 0; i < entries.length; i += 1) {
        var key = entries[i][0];
        var values = entries[i][1];
        var value = (void 0);
        if (values.length === 1) {
            value = values[0];
        } else {
            value = values;
        }

        if (o.hasOwnProperty(key) && !isNaN(o[key])) {
            throw new Error('Object ' + o + ' already has key ' + key);
        }

        o[key] = value;
    }

    return o;
}

// Parse a `CFF` DICT object.
// A dictionary contains key-value pairs in a compact tokenized format.
function parseCFFDict(data, start, size) {
    start = start !== undefined ? start : 0;
    var parser = new parse.Parser(data, start);
    var entries = [];
    var operands = [];
    size = size !== undefined ? size : data.length;

    while (parser.relativeOffset < size) {
        var op = parser.parseByte();

        // The first byte for each dict item distinguishes between operator (key) and operand (value).
        // Values <= 21 are operators.
        if (op <= 21) {
            // Two-byte operators have an initial escape byte of 12.
            if (op === 12) {
                op = 1200 + parser.parseByte();
            }

            entries.push([op, operands]);
            operands = [];
        } else {
            // Since the operands (values) come before the operators (keys), we store all operands in a list
            // until we encounter an operator.
            operands.push(parseOperand(parser, op));
        }
    }

    return entriesToObject(entries);
}

// Given a String Index (SID), return the value of the string.
// Strings below index 392 are standard CFF strings and are not encoded in the font.
function getCFFString(strings, index) {
    if (index <= 390) {
        index = cffStandardStrings[index];
    } else {
        index = strings[index - 391];
    }

    return index;
}

// Interpret a dictionary and return a new dictionary with readable keys and values for missing entries.
// This function takes `meta` which is a list of objects containing `operand`, `name` and `default`.
function interpretDict(dict, meta, strings) {
    var newDict = {};
    var value;

    // Because we also want to include missing values, we start out from the meta list
    // and lookup values in the dict.
    for (var i = 0; i < meta.length; i += 1) {
        var m = meta[i];

        if (Array.isArray(m.type)) {
            var values = [];
            values.length = m.type.length;
            for (var j = 0; j < m.type.length; j++) {
                value = dict[m.op] !== undefined ? dict[m.op][j] : undefined;
                if (value === undefined) {
                    value =
                        m.value !== undefined && m.value[j] !== undefined
                            ? m.value[j]
                            : null;
                }
                if (m.type[j] === 'SID') {
                    value = getCFFString(strings, value);
                }
                values[j] = value;
            }
            newDict[m.name] = values;
        } else {
            value = dict[m.op];
            if (value === undefined) {
                value = m.value !== undefined ? m.value : null;
            }

            if (m.type === 'SID') {
                value = getCFFString(strings, value);
            }
            newDict[m.name] = value;
        }
    }

    return newDict;
}

// Parse the CFF header.
function parseCFFHeader(data, start) {
    var header = {};
    header.formatMajor = parse.getCard8(data, start);
    header.formatMinor = parse.getCard8(data, start + 1);
    header.size = parse.getCard8(data, start + 2);
    header.offsetSize = parse.getCard8(data, start + 3);
    header.startOffset = start;
    header.endOffset = start + 4;
    return header;
}

var TOP_DICT_META = [
    { name: 'version', op: 0, type: 'SID' },
    { name: 'notice', op: 1, type: 'SID' },
    { name: 'copyright', op: 1200, type: 'SID' },
    { name: 'fullName', op: 2, type: 'SID' },
    { name: 'familyName', op: 3, type: 'SID' },
    { name: 'weight', op: 4, type: 'SID' },
    { name: 'isFixedPitch', op: 1201, type: 'number', value: 0 },
    { name: 'italicAngle', op: 1202, type: 'number', value: 0 },
    { name: 'underlinePosition', op: 1203, type: 'number', value: -100 },
    { name: 'underlineThickness', op: 1204, type: 'number', value: 50 },
    { name: 'paintType', op: 1205, type: 'number', value: 0 },
    { name: 'charstringType', op: 1206, type: 'number', value: 2 },
    {
        name: 'fontMatrix',
        op: 1207,
        type: ['real', 'real', 'real', 'real', 'real', 'real'],
        value: [0.001, 0, 0, 0.001, 0, 0],
    },
    { name: 'uniqueId', op: 13, type: 'number' },
    {
        name: 'fontBBox',
        op: 5,
        type: ['number', 'number', 'number', 'number'],
        value: [0, 0, 0, 0],
    },
    { name: 'strokeWidth', op: 1208, type: 'number', value: 0 },
    { name: 'xuid', op: 14, type: [], value: null },
    { name: 'charset', op: 15, type: 'offset', value: 0 },
    { name: 'encoding', op: 16, type: 'offset', value: 0 },
    { name: 'charStrings', op: 17, type: 'offset', value: 0 },
    { name: 'private', op: 18, type: ['number', 'offset'], value: [0, 0] },
    { name: 'ros', op: 1230, type: ['SID', 'SID', 'number'] },
    { name: 'cidFontVersion', op: 1231, type: 'number', value: 0 },
    { name: 'cidFontRevision', op: 1232, type: 'number', value: 0 },
    { name: 'cidFontType', op: 1233, type: 'number', value: 0 },
    { name: 'cidCount', op: 1234, type: 'number', value: 8720 },
    { name: 'uidBase', op: 1235, type: 'number' },
    { name: 'fdArray', op: 1236, type: 'offset' },
    { name: 'fdSelect', op: 1237, type: 'offset' },
    { name: 'fontName', op: 1238, type: 'SID' } ];

var PRIVATE_DICT_META = [
    { name: 'subrs', op: 19, type: 'offset', value: 0 },
    { name: 'defaultWidthX', op: 20, type: 'number', value: 0 },
    { name: 'nominalWidthX', op: 21, type: 'number', value: 0 } ];

// Parse the CFF top dictionary. A CFF table can contain multiple fonts, each with their own top dictionary.
// The top dictionary contains the essential metadata for the font, together with the private dictionary.
function parseCFFTopDict(data, strings) {
    var dict = parseCFFDict(data, 0, data.byteLength);
    return interpretDict(dict, TOP_DICT_META, strings);
}

// Parse the CFF private dictionary. We don't fully parse out all the values, only the ones we need.
function parseCFFPrivateDict(data, start, size, strings) {
    var dict = parseCFFDict(data, start, size);
    return interpretDict(dict, PRIVATE_DICT_META, strings);
}

// Returns a list of "Top DICT"s found using an INDEX list.
// Used to read both the usual high-level Top DICTs and also the FDArray
// discovered inside CID-keyed fonts.  When a Top DICT has a reference to
// a Private DICT that is read and saved into the Top DICT.
//
// In addition to the expected/optional values as outlined in TOP_DICT_META
// the following values might be saved into the Top DICT.
//
//    _subrs []        array of local CFF subroutines from Private DICT
//    _subrsBias       bias value computed from number of subroutines
//                      (see calcCFFSubroutineBias() and parseCFFCharstring())
//    _defaultWidthX   default widths for CFF characters
//    _nominalWidthX   bias added to width embedded within glyph description
//
//    _privateDict     saved copy of parsed Private DICT from Top DICT
function gatherCFFTopDicts(data, start, cffIndex, strings) {
    var topDictArray = [];
    for (var iTopDict = 0; iTopDict < cffIndex.length; iTopDict += 1) {
        var topDictData = new DataView(
            new Uint8Array(cffIndex[iTopDict]).buffer
        );
        var topDict = parseCFFTopDict(topDictData, strings);
        topDict._subrs = [];
        topDict._subrsBias = 0;
        topDict._defaultWidthX = 0;
        topDict._nominalWidthX = 0;
        var privateSize = topDict.private[0];
        var privateOffset = topDict.private[1];
        if (privateSize !== 0 && privateOffset !== 0) {
            var privateDict = parseCFFPrivateDict(
                data,
                privateOffset + start,
                privateSize,
                strings
            );
            topDict._defaultWidthX = privateDict.defaultWidthX;
            topDict._nominalWidthX = privateDict.nominalWidthX;
            if (privateDict.subrs !== 0) {
                var subrOffset = privateOffset + privateDict.subrs;
                var subrIndex = parseCFFIndex(data, subrOffset + start);
                topDict._subrs = subrIndex.objects;
                topDict._subrsBias = calcCFFSubroutineBias(topDict._subrs);
            }
            topDict._privateDict = privateDict;
        }
        topDictArray.push(topDict);
    }
    return topDictArray;
}

// Parse the CFF charset table, which contains internal names for all the glyphs.
// This function will return a list of glyph names.
// See Adobe TN #5176 chapter 13, "Charsets".
function parseCFFCharset(data, start, nGlyphs, strings) {
    var sid;
    var count;
    var parser = new parse.Parser(data, start);

    // The .notdef glyph is not included, so subtract 1.
    nGlyphs -= 1;
    var charset = ['.notdef'];

    var format = parser.parseCard8();
    if (format === 0) {
        for (var i = 0; i < nGlyphs; i += 1) {
            sid = parser.parseSID();
            charset.push(getCFFString(strings, sid));
        }
    } else if (format === 1) {
        while (charset.length <= nGlyphs) {
            sid = parser.parseSID();
            count = parser.parseCard8();
            for (var i$1 = 0; i$1 <= count; i$1 += 1) {
                charset.push(getCFFString(strings, sid));
                sid += 1;
            }
        }
    } else if (format === 2) {
        while (charset.length <= nGlyphs) {
            sid = parser.parseSID();
            count = parser.parseCard16();
            for (var i$2 = 0; i$2 <= count; i$2 += 1) {
                charset.push(getCFFString(strings, sid));
                sid += 1;
            }
        }
    } else {
        throw new Error('Unknown charset format ' + format);
    }

    return charset;
}

// Parse the CFF encoding data. Only one encoding can be specified per font.
// See Adobe TN #5176 chapter 12, "Encodings".
function parseCFFEncoding(data, start, charset) {
    var code;
    var enc = {};
    var parser = new parse.Parser(data, start);
    var format = parser.parseCard8();
    if (format === 0) {
        var nCodes = parser.parseCard8();
        for (var i = 0; i < nCodes; i += 1) {
            code = parser.parseCard8();
            enc[code] = i;
        }
    } else if (format === 1) {
        var nRanges = parser.parseCard8();
        code = 1;
        for (var i$1 = 0; i$1 < nRanges; i$1 += 1) {
            var first = parser.parseCard8();
            var nLeft = parser.parseCard8();
            for (var j = first; j <= first + nLeft; j += 1) {
                enc[j] = code;
                code += 1;
            }
        }
    } else {
        throw new Error('Unknown encoding format ' + format);
    }

    return new CffEncoding(enc, charset);
}

// Take in charstring code and return a Glyph object.
// The encoding is described in the Type 2 Charstring Format
// https://www.microsoft.com/typography/OTSPEC/charstr2.htm
function parseCFFCharstring(font, glyph, code) {
    var c1x;
    var c1y;
    var c2x;
    var c2y;
    var p = new Path();
    var stack = [];
    var nStems = 0;
    var haveWidth = false;
    var open = false;
    var x = 0;
    var y = 0;
    var subrs;
    var subrsBias;
    var defaultWidthX;
    var nominalWidthX;
    if (font.isCIDFont) {
        var fdIndex = font.tables.cff.topDict._fdSelect[glyph.index];
        var fdDict = font.tables.cff.topDict._fdArray[fdIndex];
        subrs = fdDict._subrs;
        subrsBias = fdDict._subrsBias;
        defaultWidthX = fdDict._defaultWidthX;
        nominalWidthX = fdDict._nominalWidthX;
    } else {
        subrs = font.tables.cff.topDict._subrs;
        subrsBias = font.tables.cff.topDict._subrsBias;
        defaultWidthX = font.tables.cff.topDict._defaultWidthX;
        nominalWidthX = font.tables.cff.topDict._nominalWidthX;
    }
    var width = defaultWidthX;

    function newContour(x, y) {
        if (open) {
            p.closePath();
        }

        p.moveTo(x, y);
        open = true;
    }

    function parseStems() {
        var hasWidthArg;

        // The number of stem operators on the stack is always even.
        // If the value is uneven, that means a width is specified.
        hasWidthArg = stack.length % 2 !== 0;
        if (hasWidthArg && !haveWidth) {
            width = stack.shift() + nominalWidthX;
        }

        nStems += stack.length >> 1;
        stack.length = 0;
        haveWidth = true;
    }

    function parse(code) {
        var b1;
        var b2;
        var b3;
        var b4;
        var codeIndex;
        var subrCode;
        var jpx;
        var jpy;
        var c3x;
        var c3y;
        var c4x;
        var c4y;

        var i = 0;
        while (i < code.length) {
            var v = code[i];
            i += 1;
            switch (v) {
                case 1: // hstem
                    parseStems();
                    break;
                case 3: // vstem
                    parseStems();
                    break;
                case 4: // vmoveto
                    if (stack.length > 1 && !haveWidth) {
                        width = stack.shift() + nominalWidthX;
                        haveWidth = true;
                    }

                    y += stack.pop();
                    newContour(x, y);
                    break;
                case 5: // rlineto
                    while (stack.length > 0) {
                        x += stack.shift();
                        y += stack.shift();
                        p.lineTo(x, y);
                    }

                    break;
                case 6: // hlineto
                    while (stack.length > 0) {
                        x += stack.shift();
                        p.lineTo(x, y);
                        if (stack.length === 0) {
                            break;
                        }

                        y += stack.shift();
                        p.lineTo(x, y);
                    }

                    break;
                case 7: // vlineto
                    while (stack.length > 0) {
                        y += stack.shift();
                        p.lineTo(x, y);
                        if (stack.length === 0) {
                            break;
                        }

                        x += stack.shift();
                        p.lineTo(x, y);
                    }

                    break;
                case 8: // rrcurveto
                    while (stack.length > 0) {
                        c1x = x + stack.shift();
                        c1y = y + stack.shift();
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x + stack.shift();
                        y = c2y + stack.shift();
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                    }

                    break;
                case 10: // callsubr
                    codeIndex = stack.pop() + subrsBias;
                    subrCode = subrs[codeIndex];
                    if (subrCode) {
                        parse(subrCode);
                    }

                    break;
                case 11: // return
                    return;
                case 12: // flex operators
                    v = code[i];
                    i += 1;
                    switch (v) {
                        case 35: // flex
                            // |- dx1 dy1 dx2 dy2 dx3 dy3 dx4 dy4 dx5 dy5 dx6 dy6 fd flex (12 35) |-
                            c1x = x + stack.shift(); // dx1
                            c1y = y + stack.shift(); // dy1
                            c2x = c1x + stack.shift(); // dx2
                            c2y = c1y + stack.shift(); // dy2
                            jpx = c2x + stack.shift(); // dx3
                            jpy = c2y + stack.shift(); // dy3
                            c3x = jpx + stack.shift(); // dx4
                            c3y = jpy + stack.shift(); // dy4
                            c4x = c3x + stack.shift(); // dx5
                            c4y = c3y + stack.shift(); // dy5
                            x = c4x + stack.shift(); // dx6
                            y = c4y + stack.shift(); // dy6
                            stack.shift(); // flex depth
                            p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                            p.curveTo(c3x, c3y, c4x, c4y, x, y);
                            break;
                        case 34: // hflex
                            // |- dx1 dx2 dy2 dx3 dx4 dx5 dx6 hflex (12 34) |-
                            c1x = x + stack.shift(); // dx1
                            c1y = y; // dy1
                            c2x = c1x + stack.shift(); // dx2
                            c2y = c1y + stack.shift(); // dy2
                            jpx = c2x + stack.shift(); // dx3
                            jpy = c2y; // dy3
                            c3x = jpx + stack.shift(); // dx4
                            c3y = c2y; // dy4
                            c4x = c3x + stack.shift(); // dx5
                            c4y = y; // dy5
                            x = c4x + stack.shift(); // dx6
                            p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                            p.curveTo(c3x, c3y, c4x, c4y, x, y);
                            break;
                        case 36: // hflex1
                            // |- dx1 dy1 dx2 dy2 dx3 dx4 dx5 dy5 dx6 hflex1 (12 36) |-
                            c1x = x + stack.shift(); // dx1
                            c1y = y + stack.shift(); // dy1
                            c2x = c1x + stack.shift(); // dx2
                            c2y = c1y + stack.shift(); // dy2
                            jpx = c2x + stack.shift(); // dx3
                            jpy = c2y; // dy3
                            c3x = jpx + stack.shift(); // dx4
                            c3y = c2y; // dy4
                            c4x = c3x + stack.shift(); // dx5
                            c4y = c3y + stack.shift(); // dy5
                            x = c4x + stack.shift(); // dx6
                            p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                            p.curveTo(c3x, c3y, c4x, c4y, x, y);
                            break;
                        case 37: // flex1
                            // |- dx1 dy1 dx2 dy2 dx3 dy3 dx4 dy4 dx5 dy5 d6 flex1 (12 37) |-
                            c1x = x + stack.shift(); // dx1
                            c1y = y + stack.shift(); // dy1
                            c2x = c1x + stack.shift(); // dx2
                            c2y = c1y + stack.shift(); // dy2
                            jpx = c2x + stack.shift(); // dx3
                            jpy = c2y + stack.shift(); // dy3
                            c3x = jpx + stack.shift(); // dx4
                            c3y = jpy + stack.shift(); // dy4
                            c4x = c3x + stack.shift(); // dx5
                            c4y = c3y + stack.shift(); // dy5
                            if (Math.abs(c4x - x) > Math.abs(c4y - y)) {
                                x = c4x + stack.shift();
                            } else {
                                y = c4y + stack.shift();
                            }

                            p.curveTo(c1x, c1y, c2x, c2y, jpx, jpy);
                            p.curveTo(c3x, c3y, c4x, c4y, x, y);
                            break;
                        default:
                            console.log(
                                'Glyph ' +
                                    glyph.index +
                                    ': unknown operator ' +
                                    1200 +
                                    v
                            );
                            stack.length = 0;
                    }
                    break;
                case 14: // endchar
                    if (stack.length > 0 && !haveWidth) {
                        width = stack.shift() + nominalWidthX;
                        haveWidth = true;
                    }

                    if (open) {
                        p.closePath();
                        open = false;
                    }

                    break;
                case 18: // hstemhm
                    parseStems();
                    break;
                case 19: // hintmask
                case 20: // cntrmask
                    parseStems();
                    i += (nStems + 7) >> 3;
                    break;
                case 21: // rmoveto
                    if (stack.length > 2 && !haveWidth) {
                        width = stack.shift() + nominalWidthX;
                        haveWidth = true;
                    }

                    y += stack.pop();
                    x += stack.pop();
                    newContour(x, y);
                    break;
                case 22: // hmoveto
                    if (stack.length > 1 && !haveWidth) {
                        width = stack.shift() + nominalWidthX;
                        haveWidth = true;
                    }

                    x += stack.pop();
                    newContour(x, y);
                    break;
                case 23: // vstemhm
                    parseStems();
                    break;
                case 24: // rcurveline
                    while (stack.length > 2) {
                        c1x = x + stack.shift();
                        c1y = y + stack.shift();
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x + stack.shift();
                        y = c2y + stack.shift();
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                    }

                    x += stack.shift();
                    y += stack.shift();
                    p.lineTo(x, y);
                    break;
                case 25: // rlinecurve
                    while (stack.length > 6) {
                        x += stack.shift();
                        y += stack.shift();
                        p.lineTo(x, y);
                    }

                    c1x = x + stack.shift();
                    c1y = y + stack.shift();
                    c2x = c1x + stack.shift();
                    c2y = c1y + stack.shift();
                    x = c2x + stack.shift();
                    y = c2y + stack.shift();
                    p.curveTo(c1x, c1y, c2x, c2y, x, y);
                    break;
                case 26: // vvcurveto
                    if (stack.length % 2) {
                        x += stack.shift();
                    }

                    while (stack.length > 0) {
                        c1x = x;
                        c1y = y + stack.shift();
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x;
                        y = c2y + stack.shift();
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                    }

                    break;
                case 27: // hhcurveto
                    if (stack.length % 2) {
                        y += stack.shift();
                    }

                    while (stack.length > 0) {
                        c1x = x + stack.shift();
                        c1y = y;
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x + stack.shift();
                        y = c2y;
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                    }

                    break;
                case 28: // shortint
                    b1 = code[i];
                    b2 = code[i + 1];
                    stack.push(((b1 << 24) | (b2 << 16)) >> 16);
                    i += 2;
                    break;
                case 29: // callgsubr
                    codeIndex = stack.pop() + font.gsubrsBias;
                    subrCode = font.gsubrs[codeIndex];
                    if (subrCode) {
                        parse(subrCode);
                    }

                    break;
                case 30: // vhcurveto
                    while (stack.length > 0) {
                        c1x = x;
                        c1y = y + stack.shift();
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x + stack.shift();
                        y = c2y + (stack.length === 1 ? stack.shift() : 0);
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                        if (stack.length === 0) {
                            break;
                        }

                        c1x = x + stack.shift();
                        c1y = y;
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        y = c2y + stack.shift();
                        x = c2x + (stack.length === 1 ? stack.shift() : 0);
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                    }

                    break;
                case 31: // hvcurveto
                    while (stack.length > 0) {
                        c1x = x + stack.shift();
                        c1y = y;
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        y = c2y + stack.shift();
                        x = c2x + (stack.length === 1 ? stack.shift() : 0);
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                        if (stack.length === 0) {
                            break;
                        }

                        c1x = x;
                        c1y = y + stack.shift();
                        c2x = c1x + stack.shift();
                        c2y = c1y + stack.shift();
                        x = c2x + stack.shift();
                        y = c2y + (stack.length === 1 ? stack.shift() : 0);
                        p.curveTo(c1x, c1y, c2x, c2y, x, y);
                    }

                    break;
                default:
                    if (v < 32) {
                        console.log(
                            'Glyph ' + glyph.index + ': unknown operator ' + v
                        );
                    } else if (v < 247) {
                        stack.push(v - 139);
                    } else if (v < 251) {
                        b1 = code[i];
                        i += 1;
                        stack.push((v - 247) * 256 + b1 + 108);
                    } else if (v < 255) {
                        b1 = code[i];
                        i += 1;
                        stack.push(-(v - 251) * 256 - b1 - 108);
                    } else {
                        b1 = code[i];
                        b2 = code[i + 1];
                        b3 = code[i + 2];
                        b4 = code[i + 3];
                        i += 4;
                        stack.push(
                            ((b1 << 24) | (b2 << 16) | (b3 << 8) | b4) / 65536
                        );
                    }
            }
        }
    }

    parse(code);

    glyph.advanceWidth = width;
    return p;
}

function parseCFFFDSelect(data, start, nGlyphs, fdArrayCount) {
    var fdSelect = [];
    var fdIndex;
    var parser = new parse.Parser(data, start);
    var format = parser.parseCard8();
    if (format === 0) {
        // Simple list of nGlyphs elements
        for (var iGid = 0; iGid < nGlyphs; iGid++) {
            fdIndex = parser.parseCard8();
            if (fdIndex >= fdArrayCount) {
                throw new Error(
                    'CFF table CID Font FDSelect has bad FD index value ' +
                        fdIndex +
                        ' (FD count ' +
                        fdArrayCount +
                        ')'
                );
            }
            fdSelect.push(fdIndex);
        }
    } else if (format === 3) {
        // Ranges
        var nRanges = parser.parseCard16();
        var first = parser.parseCard16();
        if (first !== 0) {
            throw new Error(
                'CFF Table CID Font FDSelect format 3 range has bad initial GID ' +
                    first
            );
        }
        var next;
        for (var iRange = 0; iRange < nRanges; iRange++) {
            fdIndex = parser.parseCard8();
            next = parser.parseCard16();
            if (fdIndex >= fdArrayCount) {
                throw new Error(
                    'CFF table CID Font FDSelect has bad FD index value ' +
                        fdIndex +
                        ' (FD count ' +
                        fdArrayCount +
                        ')'
                );
            }
            if (next > nGlyphs) {
                throw new Error(
                    'CFF Table CID Font FDSelect format 3 range has bad GID ' +
                        next
                );
            }
            for (; first < next; first++) {
                fdSelect.push(fdIndex);
            }
            first = next;
        }
        if (next !== nGlyphs) {
            throw new Error(
                'CFF Table CID Font FDSelect format 3 range has bad final GID ' +
                    next
            );
        }
    } else {
        throw new Error(
            'CFF Table CID Font FDSelect table has unsupported format ' + format
        );
    }
    return fdSelect;
}

// Parse the `CFF` table, which contains the glyph outlines in PostScript format.
function parseCFFTable(data, start, font, opt) {
    font.tables.cff = {};
    var header = parseCFFHeader(data, start);
    var nameIndex = parseCFFIndex(
        data,
        header.endOffset,
        parse.bytesToString
    );
    var topDictIndex = parseCFFIndex(data, nameIndex.endOffset);
    var stringIndex = parseCFFIndex(
        data,
        topDictIndex.endOffset,
        parse.bytesToString
    );
    var globalSubrIndex = parseCFFIndex(data, stringIndex.endOffset);
    font.gsubrs = globalSubrIndex.objects;
    font.gsubrsBias = calcCFFSubroutineBias(font.gsubrs);

    var topDictArray = gatherCFFTopDicts(
        data,
        start,
        topDictIndex.objects,
        stringIndex.objects
    );
    if (topDictArray.length !== 1) {
        throw new Error(
            "CFF table has too many fonts in 'FontSet' - count of fonts NameIndex.length = " +
                topDictArray.length
        );
    }

    var topDict = topDictArray[0];
    font.tables.cff.topDict = topDict;

    if (topDict._privateDict) {
        font.defaultWidthX = topDict._privateDict.defaultWidthX;
        font.nominalWidthX = topDict._privateDict.nominalWidthX;
    }

    if (topDict.ros[0] !== undefined && topDict.ros[1] !== undefined) {
        font.isCIDFont = true;
    }

    if (font.isCIDFont) {
        var fdArrayOffset = topDict.fdArray;
        var fdSelectOffset = topDict.fdSelect;
        if (fdArrayOffset === 0 || fdSelectOffset === 0) {
            throw new Error(
                'Font is marked as a CID font, but FDArray and/or FDSelect information is missing'
            );
        }
        fdArrayOffset += start;
        var fdArrayIndex = parseCFFIndex(data, fdArrayOffset);
        var fdArray = gatherCFFTopDicts(
            data,
            start,
            fdArrayIndex.objects,
            stringIndex.objects
        );
        topDict._fdArray = fdArray;
        fdSelectOffset += start;
        topDict._fdSelect = parseCFFFDSelect(
            data,
            fdSelectOffset,
            font.numGlyphs,
            fdArray.length
        );
    }

    var privateDictOffset = start + topDict.private[1];
    var privateDict = parseCFFPrivateDict(
        data,
        privateDictOffset,
        topDict.private[0],
        stringIndex.objects
    );
    font.defaultWidthX = privateDict.defaultWidthX;
    font.nominalWidthX = privateDict.nominalWidthX;

    if (privateDict.subrs !== 0) {
        var subrOffset = privateDictOffset + privateDict.subrs;
        var subrIndex = parseCFFIndex(data, subrOffset);
        font.subrs = subrIndex.objects;
        font.subrsBias = calcCFFSubroutineBias(font.subrs);
    } else {
        font.subrs = [];
        font.subrsBias = 0;
    }

    // Offsets in the top dict are relative to the beginning of the CFF data, so add the CFF start offset.
    var charStringsIndex;
    if (opt.lowMemory) {
        charStringsIndex = parseCFFIndexLowMemory(
            data,
            start + topDict.charStrings
        );
        font.nGlyphs = charStringsIndex.offsets.length;
    } else {
        charStringsIndex = parseCFFIndex(data, start + topDict.charStrings);
        font.nGlyphs = charStringsIndex.objects.length;
    }

    var charset = parseCFFCharset(
        data,
        start + topDict.charset,
        font.nGlyphs,
        stringIndex.objects
    );
    if (topDict.encoding === 0) {
        // Standard encoding
        font.cffEncoding = new CffEncoding(cffStandardEncoding, charset);
    } else if (topDict.encoding === 1) {
        // Expert encoding
        font.cffEncoding = new CffEncoding(cffExpertEncoding, charset);
    } else {
        font.cffEncoding = parseCFFEncoding(
            data,
            start + topDict.encoding,
            charset
        );
    }

    // Prefer the CMAP encoding to the CFF encoding.
    font.encoding = font.encoding || font.cffEncoding;

    font.glyphs = new glyphset.GlyphSet(font);
    if (opt.lowMemory) {
        font._push = function (i) {
            var charString = getCffIndexObject(
                i,
                charStringsIndex.offsets,
                data,
                start + topDict.charStrings
            );
            font.glyphs.push(
                i,
                glyphset.cffGlyphLoader(font, i, parseCFFCharstring, charString)
            );
        };
    } else {
        for (var i = 0; i < font.nGlyphs; i += 1) {
            var charString = charStringsIndex.objects[i];
            font.glyphs.push(
                i,
                glyphset.cffGlyphLoader(font, i, parseCFFCharstring, charString)
            );
        }
    }
}

var cff = { parse: parseCFFTable };

// The `fvar` table stores font variation axes and instances.

function parseFvarAxis(data, start, names) {
    var axis = {};
    var p = new parse.Parser(data, start);
    axis.tag = p.parseTag();
    axis.minValue = p.parseFixed();
    axis.defaultValue = p.parseFixed();
    axis.maxValue = p.parseFixed();
    p.skip('uShort', 1); // reserved for flags; no values defined
    axis.name = names[p.parseUShort()] || {};
    return axis;
}

function parseFvarInstance(data, start, axes, names) {
    var inst = {};
    var p = new parse.Parser(data, start);
    inst.name = names[p.parseUShort()] || {};
    p.skip('uShort', 1); // reserved for flags; no values defined

    inst.coordinates = {};
    for (var i = 0; i < axes.length; ++i) {
        inst.coordinates[axes[i].tag] = p.parseFixed();
    }

    return inst;
}

function parseFvarTable(data, start, names) {
    var p = new parse.Parser(data, start);
    var tableVersion = p.parseULong();
    check.argument(
        tableVersion === 0x00010000,
        'Unsupported fvar table version.'
    );
    var offsetToData = p.parseOffset16();
    // Skip countSizePairs.
    p.skip('uShort', 1);
    var axisCount = p.parseUShort();
    var axisSize = p.parseUShort();
    var instanceCount = p.parseUShort();
    var instanceSize = p.parseUShort();

    var axes = [];
    for (var i = 0; i < axisCount; i++) {
        axes.push(
            parseFvarAxis(data, start + offsetToData + i * axisSize, names)
        );
    }

    var instances = [];
    var instanceStart = start + offsetToData + axisCount * axisSize;
    for (var j = 0; j < instanceCount; j++) {
        instances.push(
            parseFvarInstance(
                data,
                instanceStart + j * instanceSize,
                axes,
                names
            )
        );
    }

    return { axes: axes, instances: instances };
}

var fvar = { parse: parseFvarTable };

// The `GDEF` table contains various glyph properties

var attachList = function() {
    return {
        coverage: this.parsePointer(Parser.coverage),
        attachPoints: this.parseList(Parser.pointer(Parser.uShortList))
    };
};

var caretValue = function() {
    var format = this.parseUShort();
    check.argument(format === 1 || format === 2 || format === 3,
        'Unsupported CaretValue table version.');
    if (format === 1) {
        return { coordinate: this.parseShort() };
    } else if (format === 2) {
        return { pointindex: this.parseShort() };
    } else if (format === 3) {
        // Device / Variation Index tables unsupported
        return { coordinate: this.parseShort() };
    }
};

var ligGlyph = function() {
    return this.parseList(Parser.pointer(caretValue));
};

var ligCaretList = function() {
    return {
        coverage: this.parsePointer(Parser.coverage),
        ligGlyphs: this.parseList(Parser.pointer(ligGlyph))
    };
};

var markGlyphSets = function() {
    this.parseUShort(); // Version
    return this.parseList(Parser.pointer(Parser.coverage));
};

function parseGDEFTable(data, start) {
    start = start || 0;
    var p = new Parser(data, start);
    var tableVersion = p.parseVersion(1);
    check.argument(tableVersion === 1 || tableVersion === 1.2 || tableVersion === 1.3,
        'Unsupported GDEF table version.');
    var gdef = {
        version: tableVersion,
        classDef: p.parsePointer(Parser.classDef),
        attachList: p.parsePointer(attachList),
        ligCaretList: p.parsePointer(ligCaretList),
        markAttachClassDef: p.parsePointer(Parser.classDef)
    };
    if (tableVersion >= 1.2) {
        gdef.markGlyphSets = p.parsePointer(markGlyphSets);
    }
    return gdef;
}
var gdef = { parse: parseGDEFTable };

// The `GPOS` table contains kerning pairs, among other things.

var subtableParsers = new Array(10); // subtableParsers[0] is unused

// https://docs.microsoft.com/en-us/typography/opentype/spec/gpos#lookup-type-1-single-adjustment-positioning-subtable
// this = Parser instance
subtableParsers[1] = function parseLookup1() {
    var start = this.offset + this.relativeOffset;
    var posformat = this.parseUShort();
    if (posformat === 1) {
        return {
            posFormat: 1,
            coverage: this.parsePointer(Parser.coverage),
            value: this.parseValueRecord(),
        };
    } else if (posformat === 2) {
        return {
            posFormat: 2,
            coverage: this.parsePointer(Parser.coverage),
            values: this.parseValueRecordList(),
        };
    }
    check.assert(
        false,
        '0x' +
            start.toString(16) +
            ': GPOS lookup type 1 format must be 1 or 2.'
    );
};

// https://docs.microsoft.com/en-us/typography/opentype/spec/gpos#lookup-type-2-pair-adjustment-positioning-subtable
subtableParsers[2] = function parseLookup2() {
    var start = this.offset + this.relativeOffset;
    var posFormat = this.parseUShort();
    check.assert(
        posFormat === 1 || posFormat === 2,
        '0x' +
            start.toString(16) +
            ': GPOS lookup type 2 format must be 1 or 2.'
    );
    var coverage = this.parsePointer(Parser.coverage);
    var valueFormat1 = this.parseUShort();
    var valueFormat2 = this.parseUShort();
    if (posFormat === 1) {
        // Adjustments for Glyph Pairs
        return {
            posFormat: posFormat,
            coverage: coverage,
            valueFormat1: valueFormat1,
            valueFormat2: valueFormat2,
            pairSets: this.parseList(
                Parser.pointer(
                    Parser.list(function () {
                        return {
                            // pairValueRecord
                            secondGlyph: this.parseUShort(),
                            value1: this.parseValueRecord(valueFormat1),
                            value2: this.parseValueRecord(valueFormat2),
                        };
                    })
                )
            ),
        };
    } else if (posFormat === 2) {
        var classDef1 = this.parsePointer(Parser.classDef);
        var classDef2 = this.parsePointer(Parser.classDef);
        var class1Count = this.parseUShort();
        var class2Count = this.parseUShort();
        return {
            // Class Pair Adjustment
            posFormat: posFormat,
            coverage: coverage,
            valueFormat1: valueFormat1,
            valueFormat2: valueFormat2,
            classDef1: classDef1,
            classDef2: classDef2,
            class1Count: class1Count,
            class2Count: class2Count,
            classRecords: this.parseList(
                class1Count,
                Parser.list(class2Count, function () {
                    return {
                        value1: this.parseValueRecord(valueFormat1),
                        value2: this.parseValueRecord(valueFormat2),
                    };
                })
            ),
        };
    }
};

subtableParsers[3] = function parseLookup3() {
    return { error: 'GPOS Lookup 3 not supported' };
};
subtableParsers[4] = function parseLookup4() {
    return { error: 'GPOS Lookup 4 not supported' };
};
subtableParsers[5] = function parseLookup5() {
    return { error: 'GPOS Lookup 5 not supported' };
};
subtableParsers[6] = function parseLookup6() {
    return { error: 'GPOS Lookup 6 not supported' };
};
subtableParsers[7] = function parseLookup7() {
    return { error: 'GPOS Lookup 7 not supported' };
};
subtableParsers[8] = function parseLookup8() {
    return { error: 'GPOS Lookup 8 not supported' };
};
subtableParsers[9] = function parseLookup9() {
    return { error: 'GPOS Lookup 9 not supported' };
};

// https://docs.microsoft.com/en-us/typography/opentype/spec/gpos
function parseGposTable(data, start) {
    start = start || 0;
    var p = new Parser(data, start);
    var tableVersion = p.parseVersion(1);
    check.argument(
        tableVersion === 1 || tableVersion === 1.1,
        'Unsupported GPOS table version ' + tableVersion
    );

    if (tableVersion === 1) {
        return {
            version: tableVersion,
            scripts: p.parseScriptList(),
            features: p.parseFeatureList(),
            lookups: p.parseLookupList(subtableParsers),
        };
    } else {
        return {
            version: tableVersion,
            scripts: p.parseScriptList(),
            features: p.parseFeatureList(),
            lookups: p.parseLookupList(subtableParsers),
            variations: p.parseFeatureVariationsList(),
        };
    }
}

var gpos = { parse: parseGposTable };

// The `GSUB` table contains ligatures, among other things.

var subtableParsers$1 = new Array(9); // subtableParsers[0] is unused

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#SS
subtableParsers$1[1] = function parseLookup1() {
    var start = this.offset + this.relativeOffset;
    var substFormat = this.parseUShort();
    if (substFormat === 1) {
        return {
            substFormat: 1,
            coverage: this.parsePointer(Parser.coverage),
            deltaGlyphId: this.parseUShort(),
        };
    } else if (substFormat === 2) {
        return {
            substFormat: 2,
            coverage: this.parsePointer(Parser.coverage),
            substitute: this.parseOffset16List(),
        };
    }
    check.assert(
        false,
        '0x' + start.toString(16) + ': lookup type 1 format must be 1 or 2.'
    );
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#MS
subtableParsers$1[2] = function parseLookup2() {
    var substFormat = this.parseUShort();
    check.argument(
        substFormat === 1,
        'GSUB Multiple Substitution Subtable identifier-format must be 1'
    );
    return {
        substFormat: substFormat,
        coverage: this.parsePointer(Parser.coverage),
        sequences: this.parseListOfLists(),
    };
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#AS
subtableParsers$1[3] = function parseLookup3() {
    var substFormat = this.parseUShort();
    check.argument(
        substFormat === 1,
        'GSUB Alternate Substitution Subtable identifier-format must be 1'
    );
    return {
        substFormat: substFormat,
        coverage: this.parsePointer(Parser.coverage),
        alternateSets: this.parseListOfLists(),
    };
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#LS
subtableParsers$1[4] = function parseLookup4() {
    var substFormat = this.parseUShort();
    check.argument(
        substFormat === 1,
        'GSUB ligature table identifier-format must be 1'
    );
    return {
        substFormat: substFormat,
        coverage: this.parsePointer(Parser.coverage),
        ligatureSets: this.parseListOfLists(function () {
            return {
                ligGlyph: this.parseUShort(),
                components: this.parseUShortList(this.parseUShort() - 1),
            };
        }),
    };
};

var lookupRecordDesc = {
    sequenceIndex: Parser.uShort,
    lookupListIndex: Parser.uShort,
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#CSF
subtableParsers$1[5] = function parseLookup5() {
    var start = this.offset + this.relativeOffset;
    var substFormat = this.parseUShort();

    if (substFormat === 1) {
        return {
            substFormat: substFormat,
            coverage: this.parsePointer(Parser.coverage),
            ruleSets: this.parseListOfLists(function () {
                var glyphCount = this.parseUShort();
                var substCount = this.parseUShort();
                return {
                    input: this.parseUShortList(glyphCount - 1),
                    lookupRecords: this.parseRecordList(
                        substCount,
                        lookupRecordDesc
                    ),
                };
            }),
        };
    } else if (substFormat === 2) {
        return {
            substFormat: substFormat,
            coverage: this.parsePointer(Parser.coverage),
            classDef: this.parsePointer(Parser.classDef),
            classSets: this.parseListOfLists(function () {
                var glyphCount = this.parseUShort();
                var substCount = this.parseUShort();
                return {
                    classes: this.parseUShortList(glyphCount - 1),
                    lookupRecords: this.parseRecordList(
                        substCount,
                        lookupRecordDesc
                    ),
                };
            }),
        };
    } else if (substFormat === 3) {
        var glyphCount = this.parseUShort();
        var substCount = this.parseUShort();
        return {
            substFormat: substFormat,
            coverages: this.parseList(
                glyphCount,
                Parser.pointer(Parser.coverage)
            ),
            lookupRecords: this.parseRecordList(substCount, lookupRecordDesc),
        };
    }
    check.assert(
        false,
        '0x' + start.toString(16) + ': lookup type 5 format must be 1, 2 or 3.'
    );
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#CC
subtableParsers$1[6] = function parseLookup6() {
    var start = this.offset + this.relativeOffset;
    var substFormat = this.parseUShort();
    if (substFormat === 1) {
        return {
            substFormat: 1,
            coverage: this.parsePointer(Parser.coverage),
            chainRuleSets: this.parseListOfLists(function () {
                return {
                    backtrack: this.parseUShortList(),
                    input: this.parseUShortList(this.parseShort() - 1),
                    lookahead: this.parseUShortList(),
                    lookupRecords: this.parseRecordList(lookupRecordDesc),
                };
            }),
        };
    } else if (substFormat === 2) {
        return {
            substFormat: 2,
            coverage: this.parsePointer(Parser.coverage),
            backtrackClassDef: this.parsePointer(Parser.classDef),
            inputClassDef: this.parsePointer(Parser.classDef),
            lookaheadClassDef: this.parsePointer(Parser.classDef),
            chainClassSet: this.parseListOfLists(function () {
                return {
                    backtrack: this.parseUShortList(),
                    input: this.parseUShortList(this.parseShort() - 1),
                    lookahead: this.parseUShortList(),
                    lookupRecords: this.parseRecordList(lookupRecordDesc),
                };
            }),
        };
    } else if (substFormat === 3) {
        return {
            substFormat: 3,
            backtrackCoverage: this.parseList(Parser.pointer(Parser.coverage)),
            inputCoverage: this.parseList(Parser.pointer(Parser.coverage)),
            lookaheadCoverage: this.parseList(Parser.pointer(Parser.coverage)),
            lookupRecords: this.parseRecordList(lookupRecordDesc),
        };
    }
    check.assert(
        false,
        '0x' + start.toString(16) + ': lookup type 6 format must be 1, 2 or 3.'
    );
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#ES
subtableParsers$1[7] = function parseLookup7() {
    // Extension Substitution subtable
    var substFormat = this.parseUShort();
    check.argument(
        substFormat === 1,
        'GSUB Extension Substitution subtable identifier-format must be 1'
    );
    var extensionLookupType = this.parseUShort();
    var extensionParser = new Parser(
        this.data,
        this.offset + this.parseULong()
    );
    return {
        substFormat: 1,
        lookupType: extensionLookupType,
        extension: subtableParsers$1[extensionLookupType].call(extensionParser),
    };
};

// https://www.microsoft.com/typography/OTSPEC/GSUB.htm#RCCS
subtableParsers$1[8] = function parseLookup8() {
    var substFormat = this.parseUShort();
    check.argument(
        substFormat === 1,
        'GSUB Reverse Chaining Contextual Single Substitution Subtable identifier-format must be 1'
    );
    return {
        substFormat: substFormat,
        coverage: this.parsePointer(Parser.coverage),
        backtrackCoverage: this.parseList(Parser.pointer(Parser.coverage)),
        lookaheadCoverage: this.parseList(Parser.pointer(Parser.coverage)),
        substitutes: this.parseUShortList(),
    };
};

// https://www.microsoft.com/typography/OTSPEC/gsub.htm
function parseGsubTable(data, start) {
    start = start || 0;
    var p = new Parser(data, start);
    var tableVersion = p.parseVersion(1);
    check.argument(
        tableVersion === 1 || tableVersion === 1.1,
        'Unsupported GSUB table version.'
    );
    if (tableVersion === 1) {
        return {
            version: tableVersion,
            scripts: p.parseScriptList(),
            features: p.parseFeatureList(),
            lookups: p.parseLookupList(subtableParsers$1),
        };
    } else {
        return {
            version: tableVersion,
            scripts: p.parseScriptList(),
            features: p.parseFeatureList(),
            lookups: p.parseLookupList(subtableParsers$1),
            variations: p.parseFeatureVariationsList(),
        };
    }
}

var gsub = { parse: parseGsubTable };

// The `head` table contains global information about the font.

// Parse the header `head` table
function parseHeadTable(data, start) {
    var head = {};
    var p = new parse.Parser(data, start);
    head.version = p.parseVersion();
    head.fontRevision = Math.round(p.parseFixed() * 1000) / 1000;
    head.checkSumAdjustment = p.parseULong();
    head.magicNumber = p.parseULong();
    check.argument(
        head.magicNumber === 0x5f0f3cf5,
        'Font header has wrong magic number.'
    );
    head.flags = p.parseUShort();
    head.unitsPerEm = p.parseUShort();
    head.created = p.parseLongDateTime();
    head.modified = p.parseLongDateTime();
    head.xMin = p.parseShort();
    head.yMin = p.parseShort();
    head.xMax = p.parseShort();
    head.yMax = p.parseShort();
    head.macStyle = p.parseUShort();
    head.lowestRecPPEM = p.parseUShort();
    head.fontDirectionHint = p.parseShort();
    head.indexToLocFormat = p.parseShort();
    head.glyphDataFormat = p.parseShort();
    return head;
}

var head = { parse: parseHeadTable };

// The `hhea` table contains information for horizontal layout.

// Parse the horizontal header `hhea` table
function parseHheaTable(data, start) {
    var hhea = {};
    var p = new parse.Parser(data, start);
    hhea.version = p.parseVersion();
    hhea.ascender = p.parseShort();
    hhea.descender = p.parseShort();
    hhea.lineGap = p.parseShort();
    hhea.advanceWidthMax = p.parseUShort();
    hhea.minLeftSideBearing = p.parseShort();
    hhea.minRightSideBearing = p.parseShort();
    hhea.xMaxExtent = p.parseShort();
    hhea.caretSlopeRise = p.parseShort();
    hhea.caretSlopeRun = p.parseShort();
    hhea.caretOffset = p.parseShort();
    p.relativeOffset += 8;
    hhea.metricDataFormat = p.parseShort();
    hhea.numberOfHMetrics = p.parseUShort();
    return hhea;
}

var hhea = { parse: parseHheaTable };

// The `hmtx` table contains the horizontal metrics for all glyphs.

function parseHmtxTableAll(data, start, numMetrics, numGlyphs, glyphs) {
    var advanceWidth;
    var leftSideBearing;
    var p = new parse.Parser(data, start);
    for (var i = 0; i < numGlyphs; i += 1) {
        // If the font is monospaced, only one entry is needed. This last entry applies to all subsequent glyphs.
        if (i < numMetrics) {
            advanceWidth = p.parseUShort();
            leftSideBearing = p.parseShort();
        }

        var glyph = glyphs.get(i);
        glyph.advanceWidth = advanceWidth;
        glyph.leftSideBearing = leftSideBearing;
    }
}

function parseHmtxTableOnLowMemory(font, data, start, numMetrics, numGlyphs) {
    font._hmtxTableData = {};

    var advanceWidth;
    var leftSideBearing;
    var p = new parse.Parser(data, start);
    for (var i = 0; i < numGlyphs; i += 1) {
        // If the font is monospaced, only one entry is needed. This last entry applies to all subsequent glyphs.
        if (i < numMetrics) {
            advanceWidth = p.parseUShort();
            leftSideBearing = p.parseShort();
        }

        font._hmtxTableData[i] = {
            advanceWidth: advanceWidth,
            leftSideBearing: leftSideBearing,
        };
    }
}

// Parse the `hmtx` table, which contains the horizontal metrics for all glyphs.
// This function augments the glyph array, adding the advanceWidth and leftSideBearing to each glyph.
function parseHmtxTable(font, data, start, numMetrics, numGlyphs, glyphs, opt) {
    if (opt.lowMemory)
        { parseHmtxTableOnLowMemory(font, data, start, numMetrics, numGlyphs); }
    else { parseHmtxTableAll(data, start, numMetrics, numGlyphs, glyphs); }
}

var hmtx = { parse: parseHmtxTable };

// The `kern` table contains kerning pairs.

function parseWindowsKernTable(p) {
    var pairs = {};
    // Skip nTables.
    p.skip('uShort');
    var subtableVersion = p.parseUShort();
    check.argument(subtableVersion === 0, 'Unsupported kern sub-table version.');
    // Skip subtableLength, subtableCoverage
    p.skip('uShort', 2);
    var nPairs = p.parseUShort();
    // Skip searchRange, entrySelector, rangeShift.
    p.skip('uShort', 3);
    for (var i = 0; i < nPairs; i += 1) {
        var leftIndex = p.parseUShort();
        var rightIndex = p.parseUShort();
        var value = p.parseShort();
        pairs[leftIndex + ',' + rightIndex] = value;
    }
    return pairs;
}

function parseMacKernTable(p) {
    var pairs = {};
    // The Mac kern table stores the version as a fixed (32 bits) but we only loaded the first 16 bits.
    // Skip the rest.
    p.skip('uShort');
    var nTables = p.parseULong();
    //check.argument(nTables === 1, 'Only 1 subtable is supported (got ' + nTables + ').');
    if (nTables > 1) {
        console.warn('Only the first kern subtable is supported.');
    }
    p.skip('uLong');
    var coverage = p.parseUShort();
    var subtableVersion = coverage & 0xFF;
    p.skip('uShort');
    if (subtableVersion === 0) {
        var nPairs = p.parseUShort();
        // Skip searchRange, entrySelector, rangeShift.
        p.skip('uShort', 3);
        for (var i = 0; i < nPairs; i += 1) {
            var leftIndex = p.parseUShort();
            var rightIndex = p.parseUShort();
            var value = p.parseShort();
            pairs[leftIndex + ',' + rightIndex] = value;
        }
    }
    return pairs;
}

// Parse the `kern` table which contains kerning pairs.
function parseKernTable(data, start) {
    var p = new parse.Parser(data, start);
    var tableVersion = p.parseUShort();
    if (tableVersion === 0) {
        return parseWindowsKernTable(p);
    } else if (tableVersion === 1) {
        return parseMacKernTable(p);
    } else {
        throw new Error('Unsupported kern table version (' + tableVersion + ').');
    }
}

var kern = { parse: parseKernTable };

// The `ltag` table stores IETF BCP-47 language tags. It allows supporting

function parseLtagTable(data, start) {
    var p = new parse.Parser(data, start);
    var tableVersion = p.parseULong();
    check.argument(tableVersion === 1, 'Unsupported ltag table version.');
    // The 'ltag' specification does not define any flags; skip the field.
    p.skip('uLong', 1);
    var numTags = p.parseULong();

    var tags = [];
    for (var i = 0; i < numTags; i++) {
        var tag = '';
        var offset = start + p.parseUShort();
        var length = p.parseUShort();
        for (var j = offset; j < offset + length; ++j) {
            tag += String.fromCharCode(data.getInt8(j));
        }

        tags.push(tag);
    }

    return tags;
}

var ltag = { parse: parseLtagTable };

// The `loca` table stores the offsets to the locations of the glyphs in the font.

// Parse the `loca` table. This table stores the offsets to the locations of the glyphs in the font,
// relative to the beginning of the glyphData table.
// The number of glyphs stored in the `loca` table is specified in the `maxp` table (under numGlyphs)
// The loca table has two versions: a short version where offsets are stored as uShorts, and a long
// version where offsets are stored as uLongs. The `head` table specifies which version to use
// (under indexToLocFormat).
function parseLocaTable(data, start, numGlyphs, shortVersion) {
    var p = new parse.Parser(data, start);
    var parseFn = shortVersion ? p.parseUShort : p.parseULong;
    // There is an extra entry after the last index element to compute the length of the last glyph.
    // That's why we use numGlyphs + 1.
    var glyphOffsets = [];
    for (var i = 0; i < numGlyphs + 1; i += 1) {
        var glyphOffset = parseFn.call(p);
        if (shortVersion) {
            // The short table version stores the actual offset divided by 2.
            glyphOffset *= 2;
        }

        glyphOffsets.push(glyphOffset);
    }

    return glyphOffsets;
}

var loca = { parse: parseLocaTable };

// The `maxp` table establishes the memory requirements for the font.

// Parse the maximum profile `maxp` table.
function parseMaxpTable(data, start) {
    var maxp = {};
    var p = new parse.Parser(data, start);
    maxp.version = p.parseVersion();
    maxp.numGlyphs = p.parseUShort();
    if (maxp.version === 1.0) {
        maxp.maxPoints = p.parseUShort();
        maxp.maxContours = p.parseUShort();
        maxp.maxCompositePoints = p.parseUShort();
        maxp.maxCompositeContours = p.parseUShort();
        maxp.maxZones = p.parseUShort();
        maxp.maxTwilightPoints = p.parseUShort();
        maxp.maxStorage = p.parseUShort();
        maxp.maxFunctionDefs = p.parseUShort();
        maxp.maxInstructionDefs = p.parseUShort();
        maxp.maxStackElements = p.parseUShort();
        maxp.maxSizeOfInstructions = p.parseUShort();
        maxp.maxComponentElements = p.parseUShort();
        maxp.maxComponentDepth = p.parseUShort();
    }

    return maxp;
}

var maxp = { parse: parseMaxpTable };

// The `OS/2` table contains metrics required in OpenType fonts.

// Parse the OS/2 and Windows metrics `OS/2` table
function parseOS2Table(data, start) {
    var os2 = {};
    var p = new parse.Parser(data, start);
    os2.version = p.parseUShort();
    os2.xAvgCharWidth = p.parseShort();
    os2.usWeightClass = p.parseUShort();
    os2.usWidthClass = p.parseUShort();
    os2.fsType = p.parseUShort();
    os2.ySubscriptXSize = p.parseShort();
    os2.ySubscriptYSize = p.parseShort();
    os2.ySubscriptXOffset = p.parseShort();
    os2.ySubscriptYOffset = p.parseShort();
    os2.ySuperscriptXSize = p.parseShort();
    os2.ySuperscriptYSize = p.parseShort();
    os2.ySuperscriptXOffset = p.parseShort();
    os2.ySuperscriptYOffset = p.parseShort();
    os2.yStrikeoutSize = p.parseShort();
    os2.yStrikeoutPosition = p.parseShort();
    os2.sFamilyClass = p.parseShort();
    os2.panose = [];
    for (var i = 0; i < 10; i++) {
        os2.panose[i] = p.parseByte();
    }

    os2.ulUnicodeRange1 = p.parseULong();
    os2.ulUnicodeRange2 = p.parseULong();
    os2.ulUnicodeRange3 = p.parseULong();
    os2.ulUnicodeRange4 = p.parseULong();
    os2.achVendID = String.fromCharCode(
        p.parseByte(),
        p.parseByte(),
        p.parseByte(),
        p.parseByte()
    );
    os2.fsSelection = p.parseUShort();
    os2.usFirstCharIndex = p.parseUShort();
    os2.usLastCharIndex = p.parseUShort();
    os2.sTypoAscender = p.parseShort();
    os2.sTypoDescender = p.parseShort();
    os2.sTypoLineGap = p.parseShort();
    os2.usWinAscent = p.parseUShort();
    os2.usWinDescent = p.parseUShort();
    if (os2.version >= 1) {
        os2.ulCodePageRange1 = p.parseULong();
        os2.ulCodePageRange2 = p.parseULong();
    }

    if (os2.version >= 2) {
        os2.sxHeight = p.parseShort();
        os2.sCapHeight = p.parseShort();
        os2.usDefaultChar = p.parseUShort();
        os2.usBreakChar = p.parseUShort();
        os2.usMaxContent = p.parseUShort();
    }

    return os2;
}

var os2 = { parse: parseOS2Table };

// The `post` table stores additional PostScript information, such as glyph names.

// Parse the PostScript `post` table
function parsePostTable(data, start) {
    var post = {};
    var p = new parse.Parser(data, start);
    post.version = p.parseVersion();
    post.italicAngle = p.parseFixed();
    post.underlinePosition = p.parseShort();
    post.underlineThickness = p.parseShort();
    post.isFixedPitch = p.parseULong();
    post.minMemType42 = p.parseULong();
    post.maxMemType42 = p.parseULong();
    post.minMemType1 = p.parseULong();
    post.maxMemType1 = p.parseULong();
    post.names = [];
    switch (post.version) {
        case 1:
            break;
        case 2:
            post.numberOfGlyphs = p.parseUShort();
            post.glyphNameIndex = new Array(post.numberOfGlyphs);
            for (var i = 0; i < post.numberOfGlyphs; i++) {
                post.glyphNameIndex[i] = p.parseUShort();
            }
            break;
        case 2.5:
            post.numberOfGlyphs = p.parseUShort();
            post.offset = new Array(post.numberOfGlyphs);
            for (var i$1 = 0; i$1 < post.numberOfGlyphs; i$1++) {
                post.offset[i$1] = p.parseChar();
            }
            break;
    }
    return post;
}

var post = { parse: parsePostTable };

// Data types used in the OpenType font file.

/**
 * @exports opentype.decode
 * @class
 */
var decode = {};

/**
 * @param {DataView} data
 * @param {number} offset
 * @param {number} numBytes
 * @returns {string}
 */
decode.UTF8 = function(data, offset, numBytes) {
    var codePoints = [];
    var numChars = numBytes;
    for (var j = 0; j < numChars; j++, offset += 1) {
        codePoints[j] = data.getUint8(offset);
    }

    return String.fromCharCode.apply(null, codePoints);
};

/**
 * @param {DataView} data
 * @param {number} offset
 * @param {number} numBytes
 * @returns {string}
 */
decode.UTF16 = function(data, offset, numBytes) {
    var codePoints = [];
    var numChars = numBytes / 2;
    for (var j = 0; j < numChars; j++, offset += 2) {
        codePoints[j] = data.getUint16(offset);
    }

    return String.fromCharCode.apply(null, codePoints);
};

// Data for converting old eight-bit Macintosh encodings to Unicode.
// This representation is optimized for decoding; encoding is slower
// and needs more memory. The assumption is that all opentype.js users
// want to open fonts, but saving a font will be comparatively rare
// so it can be more expensive. Keyed by IANA character set name.
//
// Python script for generating these strings:
//
//     s = u''.join([chr(c).decode('mac_greek') for c in range(128, 256)])
//     print(s.encode('utf-8'))
/**
 * @private
 */
var eightBitMacEncodings = {
    'x-mac-croatian':  // Python: 'mac_croatian'
    'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®Š™´¨≠ŽØ∞±≤≥∆µ∂∑∏š∫ªºΩžø' +
    '¿¡¬√ƒ≈Ć«Č… ÀÃÕŒœĐ—“”‘’÷◊©⁄€‹›Æ»–·‚„‰ÂćÁčÈÍÎÏÌÓÔđÒÚÛÙıˆ˜¯πË˚¸Êæˇ',
    'x-mac-cyrillic':  // Python: 'mac_cyrillic'
    'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ†°Ґ£§•¶І®©™Ђђ≠Ѓѓ∞±≤≥іµґЈЄєЇїЉљЊњ' +
    'јЅ¬√ƒ≈∆«»… ЋћЌќѕ–—“”‘’÷„ЎўЏџ№Ёёяабвгдежзийклмнопрстуфхцчшщъыьэю',
    'x-mac-gaelic': // http://unicode.org/Public/MAPPINGS/VENDORS/APPLE/GAELIC.TXT
    'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØḂ±≤≥ḃĊċḊḋḞḟĠġṀæø' +
    'ṁṖṗɼƒſṠ«»… ÀÃÕŒœ–—“”‘’ṡẛÿŸṪ€‹›Ŷŷṫ·Ỳỳ⁊ÂÊÁËÈÍÎÏÌÓÔ♣ÒÚÛÙıÝýŴŵẄẅẀẁẂẃ',
    'x-mac-greek':  // Python: 'mac_greek'
    'Ä¹²É³ÖÜ΅àâä΄¨çéèêë£™îï•½‰ôö¦€ùûü†ΓΔΘΛΞΠß®©ΣΪ§≠°·Α±≤≥¥ΒΕΖΗΙΚΜΦΫΨΩ' +
    'άΝ¬ΟΡ≈Τ«»… ΥΧΆΈœ–―“”‘’÷ΉΊΌΎέήίόΏύαβψδεφγηιξκλμνοπώρστθωςχυζϊϋΐΰ\u00AD',
    'x-mac-icelandic':  // Python: 'mac_iceland'
    'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûüÝ°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø' +
    '¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€ÐðÞþý·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ',
    'x-mac-inuit': // http://unicode.org/Public/MAPPINGS/VENDORS/APPLE/INUIT.TXT
    'ᐃᐄᐅᐆᐊᐋᐱᐲᐳᐴᐸᐹᑉᑎᑏᑐᑑᑕᑖᑦᑭᑮᑯᑰᑲᑳᒃᒋᒌᒍᒎᒐᒑ°ᒡᒥᒦ•¶ᒧ®©™ᒨᒪᒫᒻᓂᓃᓄᓅᓇᓈᓐᓯᓰᓱᓲᓴᓵᔅᓕᓖᓗ' +
    'ᓘᓚᓛᓪᔨᔩᔪᔫᔭ… ᔮᔾᕕᕖᕗ–—“”‘’ᕘᕙᕚᕝᕆᕇᕈᕉᕋᕌᕐᕿᖀᖁᖂᖃᖄᖅᖏᖐᖑᖒᖓᖔᖕᙱᙲᙳᙴᙵᙶᖖᖠᖡᖢᖣᖤᖥᖦᕼŁł',
    'x-mac-ce':  // Python: 'mac_latin2'
    'ÄĀāÉĄÖÜáąČäčĆćéŹźĎíďĒēĖóėôöõúĚěü†°Ę£§•¶ß®©™ę¨≠ģĮįĪ≤≥īĶ∂∑łĻļĽľĹĺŅ' +
    'ņŃ¬√ńŇ∆«»… ňŐÕőŌ–—“”‘’÷◊ōŔŕŘ‹›řŖŗŠ‚„šŚśÁŤťÍŽžŪÓÔūŮÚůŰűŲųÝýķŻŁżĢˇ',
    macintosh:  // Python: 'mac_roman'
    'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø' +
    '¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ',
    'x-mac-romanian':  // Python: 'mac_romanian'
    'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ĂȘ∞±≤≥¥µ∂∑∏π∫ªºΩăș' +
    '¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›Țț‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ',
    'x-mac-turkish':  // Python: 'mac_turkish'
    'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø' +
    '¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸĞğİıŞş‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙˆ˜¯˘˙˚¸˝˛ˇ'
};

/**
 * Decodes an old-style Macintosh string. Returns either a Unicode JavaScript
 * string, or 'undefined' if the encoding is unsupported. For example, we do
 * not support Chinese, Japanese or Korean because these would need large
 * mapping tables.
 * @param {DataView} dataView
 * @param {number} offset
 * @param {number} dataLength
 * @param {string} encoding
 * @returns {string}
 */
decode.MACSTRING = function(dataView, offset, dataLength, encoding) {
    var table = eightBitMacEncodings[encoding];
    if (table === undefined) {
        return undefined;
    }

    var result = '';
    for (var i = 0; i < dataLength; i++) {
        var c = dataView.getUint8(offset + i);
        // In all eight-bit Mac encodings, the characters 0x00..0x7F are
        // mapped to U+0000..U+007F; we only need to look up the others.
        if (c <= 0x7F) {
            result += String.fromCharCode(c);
        } else {
            result += table[c & 0x7F];
        }
    }

    return result;
};

// The `GPOS` table contains kerning pairs, among other things.

// Parse the metadata `meta` table.
// https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6meta.html
function parseMetaTable(data, start) {
    var p = new parse.Parser(data, start);
    var tableVersion = p.parseULong();
    check.argument(tableVersion === 1, 'Unsupported META table version.');
    p.parseULong(); // flags - currently unused and set to 0
    p.parseULong(); // tableOffset
    var numDataMaps = p.parseULong();

    var tags = {};
    for (var i = 0; i < numDataMaps; i++) {
        var tag = p.parseTag();
        var dataOffset = p.parseULong();
        var dataLength = p.parseULong();
        var text = decode.UTF8(data, start + dataOffset, dataLength);

        tags[tag] = text;
    }
    return tags;
}

var meta = { parse: parseMetaTable };

// opentype.js

/**
 * The opentype library.
 * @namespace opentype
 */

// Table Directory Entries //////////////////////////////////////////////
/**
 * Parses OpenType table entries.
 * @param  {DataView}
 * @param  {Number}
 * @return {Object[]}
 */
function parseOpenTypeTableEntries(data, numTables) {
    var tableEntries = [];
    var p = 12;
    for (var i = 0; i < numTables; i += 1) {
        var tag = parse.getTag(data, p);
        var checksum = parse.getULong(data, p + 4);
        var offset = parse.getULong(data, p + 8);
        var length = parse.getULong(data, p + 12);
        tableEntries.push({
            tag: tag,
            checksum: checksum,
            offset: offset,
            length: length,
            compression: false,
        });
        p += 16;
    }

    return tableEntries;
}

/**
 * Parses WOFF table entries.
 * @param  {DataView}
 * @param  {Number}
 * @return {Object[]}
 */
function parseWOFFTableEntries(data, numTables) {
    var tableEntries = [];
    var p = 44; // offset to the first table directory entry.
    for (var i = 0; i < numTables; i += 1) {
        var tag = parse.getTag(data, p);
        var offset = parse.getULong(data, p + 4);
        var compLength = parse.getULong(data, p + 8);
        var origLength = parse.getULong(data, p + 12);
        var compression = (void 0);
        if (compLength < origLength) {
            compression = 'WOFF';
        } else {
            compression = false;
        }

        tableEntries.push({
            tag: tag,
            offset: offset,
            compression: compression,
            compressedLength: compLength,
            length: origLength,
        });
        p += 20;
    }

    return tableEntries;
}

/**
 * @typedef TableData
 * @type Object
 * @property {DataView} data - The DataView
 * @property {number} offset - The data offset.
 */

/**
 * @param  {DataView}
 * @param  {Object}
 * @return {TableData}
 */
function uncompressTable(data, tableEntry) {
    if (tableEntry.compression === 'WOFF') {
        var inBuffer = new Uint8Array(
            data.buffer,
            tableEntry.offset + 2,
            tableEntry.compressedLength - 2
        );
        var outBuffer = new Uint8Array(tableEntry.length);
        inflateSync(inBuffer, outBuffer);
        if (outBuffer.byteLength !== tableEntry.length) {
            throw new Error(
                'Decompression error: ' +
                    tableEntry.tag +
                    " decompressed length doesn't match recorded length"
            );
        }

        var view = new DataView(outBuffer.buffer, 0);
        return { data: view, offset: 0 };
    } else {
        return { data: data, offset: tableEntry.offset };
    }
}

// Public API ///////////////////////////////////////////////////////////

/**
 * Parse the OpenType file data (as an ArrayBuffer) and return a Font object.
 * Throws an error if the font could not be parsed.
 * @param  {ArrayBuffer}
 * @param  {Object} opt - options for parsing
 * @return {opentype.Font}
 */
function parseBuffer(buffer, opt) {
    opt = opt === undefined || opt === null ? {} : opt;

    var indexToLocFormat;

    // Since the constructor can also be called to create new fonts from scratch, we indicate this
    // should be an empty font that we'll fill with our own data.
    var font = new Font({ empty: true });

    // OpenType fonts use big endian byte ordering.
    // We can't rely on typed array view types, because they operate with the endianness of the host computer.
    // Instead we use DataViews where we can specify endianness.
    var data = new DataView(buffer, 0);
    var numTables;
    var tableEntries = [];
    var signature = parse.getTag(data, 0);
    if (
        signature === String.fromCharCode(0, 1, 0, 0) ||
        signature === 'true' ||
        signature === 'typ1'
    ) {
        font.outlinesFormat = 'truetype';
        numTables = parse.getUShort(data, 4);
        tableEntries = parseOpenTypeTableEntries(data, numTables);
    } else if (signature === 'OTTO') {
        font.outlinesFormat = 'cff';
        numTables = parse.getUShort(data, 4);
        tableEntries = parseOpenTypeTableEntries(data, numTables);
    } else if (signature === 'wOFF') {
        var flavor = parse.getTag(data, 4);
        if (flavor === String.fromCharCode(0, 1, 0, 0)) {
            font.outlinesFormat = 'truetype';
        } else if (flavor === 'OTTO') {
            font.outlinesFormat = 'cff';
        } else {
            throw new Error('Unsupported OpenType flavor ' + signature);
        }

        numTables = parse.getUShort(data, 12);
        tableEntries = parseWOFFTableEntries(data, numTables);
    } else {
        throw new Error('Unsupported OpenType signature ' + signature);
    }

    var cffTableEntry;
    var fvarTableEntry;
    var glyfTableEntry;
    var gdefTableEntry;
    var gposTableEntry;
    var gsubTableEntry;
    var hmtxTableEntry;
    var kernTableEntry;
    var locaTableEntry;
    var metaTableEntry;
    var p;

    for (var i = 0; i < numTables; i += 1) {
        var tableEntry = tableEntries[i];
        var table = (void 0);
        switch (tableEntry.tag) {
            case 'cmap':
                table = uncompressTable(data, tableEntry);
                font.tables.cmap = cmap.parse(table.data, table.offset);
                font.encoding = new CmapEncoding(font.tables.cmap);
                break;
            case 'cvt ':
                table = uncompressTable(data, tableEntry);
                p = new parse.Parser(table.data, table.offset);
                font.tables.cvt = p.parseShortList(tableEntry.length / 2);
                break;
            case 'fvar':
                fvarTableEntry = tableEntry;
                break;
            case 'fpgm':
                table = uncompressTable(data, tableEntry);
                p = new parse.Parser(table.data, table.offset);
                font.tables.fpgm = p.parseByteList(tableEntry.length);
                break;
            case 'head':
                table = uncompressTable(data, tableEntry);
                font.tables.head = head.parse(table.data, table.offset);
                font.unitsPerEm = font.tables.head.unitsPerEm;
                indexToLocFormat = font.tables.head.indexToLocFormat;
                break;
            case 'hhea':
                table = uncompressTable(data, tableEntry);
                font.tables.hhea = hhea.parse(table.data, table.offset);
                font.ascender = font.tables.hhea.ascender;
                font.descender = font.tables.hhea.descender;
                font.numberOfHMetrics = font.tables.hhea.numberOfHMetrics;
                break;
            case 'hmtx':
                hmtxTableEntry = tableEntry;
                break;
            case 'ltag':
                table = uncompressTable(data, tableEntry);
                ltagTable = ltag.parse(table.data, table.offset);
                break;
            case 'maxp':
                table = uncompressTable(data, tableEntry);
                font.tables.maxp = maxp.parse(table.data, table.offset);
                font.numGlyphs = font.tables.maxp.numGlyphs;
                break;
            case 'OS/2':
                table = uncompressTable(data, tableEntry);
                font.tables.os2 = os2.parse(table.data, table.offset);
                break;
            case 'post':
                table = uncompressTable(data, tableEntry);
                font.tables.post = post.parse(table.data, table.offset);
                break;
            case 'prep':
                table = uncompressTable(data, tableEntry);
                p = new parse.Parser(table.data, table.offset);
                font.tables.prep = p.parseByteList(tableEntry.length);
                break;
            case 'glyf':
                glyfTableEntry = tableEntry;
                break;
            case 'loca':
                locaTableEntry = tableEntry;
                break;
            case 'CFF ':
                cffTableEntry = tableEntry;
                break;
            case 'kern':
                kernTableEntry = tableEntry;
                break;
            case 'GDEF':
                gdefTableEntry = tableEntry;
                break;
            case 'GPOS':
                gposTableEntry = tableEntry;
                break;
            case 'GSUB':
                gsubTableEntry = tableEntry;
                break;
            case 'meta':
                metaTableEntry = tableEntry;
                break;
        }
    }

    if (glyfTableEntry && locaTableEntry) {
        var shortVersion = indexToLocFormat === 0;
        var locaTable = uncompressTable(data, locaTableEntry);
        var locaOffsets = loca.parse(
            locaTable.data,
            locaTable.offset,
            font.numGlyphs,
            shortVersion
        );
        var glyfTable = uncompressTable(data, glyfTableEntry);
        font.glyphs = glyf.parse(
            glyfTable.data,
            glyfTable.offset,
            locaOffsets,
            font,
            opt
        );
    } else if (cffTableEntry) {
        var cffTable = uncompressTable(data, cffTableEntry);
        cff.parse(cffTable.data, cffTable.offset, font, opt);
    } else {
        throw new Error("Font doesn't contain TrueType or CFF outlines.");
    }

    var hmtxTable = uncompressTable(data, hmtxTableEntry);
    hmtx.parse(
        font,
        hmtxTable.data,
        hmtxTable.offset,
        font.numberOfHMetrics,
        font.numGlyphs,
        font.glyphs,
        opt
    );
    addGlyphNames(font, opt);

    if (kernTableEntry) {
        var kernTable = uncompressTable(data, kernTableEntry);
        font.kerningPairs = kern.parse(kernTable.data, kernTable.offset);
    } else {
        font.kerningPairs = {};
    }

    if (gdefTableEntry) {
        var gdefTable = uncompressTable(data, gdefTableEntry);
        font.tables.gdef = gdef.parse(gdefTable.data, gdefTable.offset);
    }

    if (gposTableEntry) {
        var gposTable = uncompressTable(data, gposTableEntry);
        font.tables.gpos = gpos.parse(gposTable.data, gposTable.offset);
        font.position.init();
    }

    if (gsubTableEntry) {
        var gsubTable = uncompressTable(data, gsubTableEntry);
        font.tables.gsub = gsub.parse(gsubTable.data, gsubTable.offset);
    }

    if (fvarTableEntry) {
        var fvarTable = uncompressTable(data, fvarTableEntry);
        font.tables.fvar = fvar.parse(
            fvarTable.data,
            fvarTable.offset,
            font.names
        );
    }

    if (metaTableEntry) {
        var metaTable = uncompressTable(data, metaTableEntry);
        font.tables.meta = meta.parse(metaTable.data, metaTable.offset);
        font.metas = font.tables.meta;
    }

    return font;
}

function load() {}
function loadSync() {}

var opentype = /*#__PURE__*/Object.freeze({
   __proto__: null,
   Font: Font,
   Glyph: Glyph,
   Path: Path,
   _parse: parse,
   parse: parseBuffer,
   load: load,
   loadSync: loadSync
});

var tI = Object.create;
var Mr = Object.defineProperty;
var rI = Object.getOwnPropertyDescriptor;
var nI = Object.getOwnPropertyNames;
var iI = Object.getPrototypeOf, oI = Object.prototype.hasOwnProperty;
var Pe = (A, e) => () => (A && (e = A(A = 0)), e);
var Y = (A, e) => () => (e || A((e = { exports: {} }).exports, e), e.exports), dt = (A, e) => {
  for (var t in e) Mr(A, t, { get: e[t], enumerable: true });
}, gs = (A, e, t, r) => {
  if (e && typeof e == "object" || typeof e == "function") for (let n of nI(e)) !oI.call(A, n) && n !== t && Mr(A, n, { get: () => e[n], enumerable: !(r = rI(e, n)) || r.enumerable });
  return A;
};
var sI = (A, e, t) => (t = A != null ? tI(iI(A)) : {}, gs(!A || !A.__esModule ? Mr(t, "default", { value: A, enumerable: true }) : t, A)), Lr = (A) => gs(Mr({}, "__esModule", { value: true }), A);
var We, ws, Ds, _t, Pn, Ke, mt, hI, Or, _n, yt, wt, Jn, Ss, Wn, Kn, ve, Yn, pI, vs, Tr = Pe(() => {
  We = (function(A) {
    return A[A.Auto = 0] = "Auto", A[A.FlexStart = 1] = "FlexStart", A[A.Center = 2] = "Center", A[A.FlexEnd = 3] = "FlexEnd", A[A.Stretch = 4] = "Stretch", A[A.Baseline = 5] = "Baseline", A[A.SpaceBetween = 6] = "SpaceBetween", A[A.SpaceAround = 7] = "SpaceAround", A[A.SpaceEvenly = 8] = "SpaceEvenly", A;
  })({}), ws = (function(A) {
    return A[A.BorderBox = 0] = "BorderBox", A[A.ContentBox = 1] = "ContentBox", A;
  })({}), Ds = (function(A) {
    return A[A.Width = 0] = "Width", A[A.Height = 1] = "Height", A;
  })({}), _t = (function(A) {
    return A[A.Inherit = 0] = "Inherit", A[A.LTR = 1] = "LTR", A[A.RTL = 2] = "RTL", A;
  })({}), Pn = (function(A) {
    return A[A.Flex = 0] = "Flex", A[A.None = 1] = "None", A[A.Contents = 2] = "Contents", A;
  })({}), Ke = (function(A) {
    return A[A.Left = 0] = "Left", A[A.Top = 1] = "Top", A[A.Right = 2] = "Right", A[A.Bottom = 3] = "Bottom", A[A.Start = 4] = "Start", A[A.End = 5] = "End", A[A.Horizontal = 6] = "Horizontal", A[A.Vertical = 7] = "Vertical", A[A.All = 8] = "All", A;
  })({}), mt = (function(A) {
    return A[A.None = 0] = "None", A[A.StretchFlexBasis = 1] = "StretchFlexBasis", A[A.AbsolutePositionWithoutInsetsExcludesPadding = 2] = "AbsolutePositionWithoutInsetsExcludesPadding", A[A.AbsolutePercentAgainstInnerSize = 4] = "AbsolutePercentAgainstInnerSize", A[A.All = 2147483647] = "All", A[A.Classic = 2147483646] = "Classic", A;
  })({}), hI = (function(A) {
    return A[A.WebFlexBasis = 0] = "WebFlexBasis", A;
  })({}), Or = (function(A) {
    return A[A.Column = 0] = "Column", A[A.ColumnReverse = 1] = "ColumnReverse", A[A.Row = 2] = "Row", A[A.RowReverse = 3] = "RowReverse", A;
  })({}), _n = (function(A) {
    return A[A.Column = 0] = "Column", A[A.Row = 1] = "Row", A[A.All = 2] = "All", A;
  })({}), yt = (function(A) {
    return A[A.FlexStart = 0] = "FlexStart", A[A.Center = 1] = "Center", A[A.FlexEnd = 2] = "FlexEnd", A[A.SpaceBetween = 3] = "SpaceBetween", A[A.SpaceAround = 4] = "SpaceAround", A[A.SpaceEvenly = 5] = "SpaceEvenly", A;
  })({}), wt = (function(A) {
    return A[A.Error = 0] = "Error", A[A.Warn = 1] = "Warn", A[A.Info = 2] = "Info", A[A.Debug = 3] = "Debug", A[A.Verbose = 4] = "Verbose", A[A.Fatal = 5] = "Fatal", A;
  })({}), Jn = (function(A) {
    return A[A.Undefined = 0] = "Undefined", A[A.Exactly = 1] = "Exactly", A[A.AtMost = 2] = "AtMost", A;
  })({}), Ss = (function(A) {
    return A[A.Default = 0] = "Default", A[A.Text = 1] = "Text", A;
  })({}), Wn = (function(A) {
    return A[A.Visible = 0] = "Visible", A[A.Hidden = 1] = "Hidden", A[A.Scroll = 2] = "Scroll", A;
  })({}), Kn = (function(A) {
    return A[A.Static = 0] = "Static", A[A.Relative = 1] = "Relative", A[A.Absolute = 2] = "Absolute", A;
  })({}), ve = (function(A) {
    return A[A.Undefined = 0] = "Undefined", A[A.Point = 1] = "Point", A[A.Percent = 2] = "Percent", A[A.Auto = 3] = "Auto", A;
  })({}), Yn = (function(A) {
    return A[A.NoWrap = 0] = "NoWrap", A[A.Wrap = 1] = "Wrap", A[A.WrapReverse = 2] = "WrapReverse", A;
  })({}), pI = { ALIGN_AUTO: We.Auto, ALIGN_FLEX_START: We.FlexStart, ALIGN_CENTER: We.Center, ALIGN_FLEX_END: We.FlexEnd, ALIGN_STRETCH: We.Stretch, ALIGN_BASELINE: We.Baseline, ALIGN_SPACE_BETWEEN: We.SpaceBetween, ALIGN_SPACE_AROUND: We.SpaceAround, ALIGN_SPACE_EVENLY: We.SpaceEvenly, BOX_SIZING_BORDER_BOX: ws.BorderBox, BOX_SIZING_CONTENT_BOX: ws.ContentBox, DIMENSION_WIDTH: Ds.Width, DIMENSION_HEIGHT: Ds.Height, DIRECTION_INHERIT: _t.Inherit, DIRECTION_LTR: _t.LTR, DIRECTION_RTL: _t.RTL, DISPLAY_FLEX: Pn.Flex, DISPLAY_NONE: Pn.None, DISPLAY_CONTENTS: Pn.Contents, EDGE_LEFT: Ke.Left, EDGE_TOP: Ke.Top, EDGE_RIGHT: Ke.Right, EDGE_BOTTOM: Ke.Bottom, EDGE_START: Ke.Start, EDGE_END: Ke.End, EDGE_HORIZONTAL: Ke.Horizontal, EDGE_VERTICAL: Ke.Vertical, EDGE_ALL: Ke.All, ERRATA_NONE: mt.None, ERRATA_STRETCH_FLEX_BASIS: mt.StretchFlexBasis, ERRATA_ABSOLUTE_POSITION_WITHOUT_INSETS_EXCLUDES_PADDING: mt.AbsolutePositionWithoutInsetsExcludesPadding, ERRATA_ABSOLUTE_PERCENT_AGAINST_INNER_SIZE: mt.AbsolutePercentAgainstInnerSize, ERRATA_ALL: mt.All, ERRATA_CLASSIC: mt.Classic, EXPERIMENTAL_FEATURE_WEB_FLEX_BASIS: hI.WebFlexBasis, FLEX_DIRECTION_COLUMN: Or.Column, FLEX_DIRECTION_COLUMN_REVERSE: Or.ColumnReverse, FLEX_DIRECTION_ROW: Or.Row, FLEX_DIRECTION_ROW_REVERSE: Or.RowReverse, GUTTER_COLUMN: _n.Column, GUTTER_ROW: _n.Row, GUTTER_ALL: _n.All, JUSTIFY_FLEX_START: yt.FlexStart, JUSTIFY_CENTER: yt.Center, JUSTIFY_FLEX_END: yt.FlexEnd, JUSTIFY_SPACE_BETWEEN: yt.SpaceBetween, JUSTIFY_SPACE_AROUND: yt.SpaceAround, JUSTIFY_SPACE_EVENLY: yt.SpaceEvenly, LOG_LEVEL_ERROR: wt.Error, LOG_LEVEL_WARN: wt.Warn, LOG_LEVEL_INFO: wt.Info, LOG_LEVEL_DEBUG: wt.Debug, LOG_LEVEL_VERBOSE: wt.Verbose, LOG_LEVEL_FATAL: wt.Fatal, MEASURE_MODE_UNDEFINED: Jn.Undefined, MEASURE_MODE_EXACTLY: Jn.Exactly, MEASURE_MODE_AT_MOST: Jn.AtMost, NODE_TYPE_DEFAULT: Ss.Default, NODE_TYPE_TEXT: Ss.Text, OVERFLOW_VISIBLE: Wn.Visible, OVERFLOW_HIDDEN: Wn.Hidden, OVERFLOW_SCROLL: Wn.Scroll, POSITION_TYPE_STATIC: Kn.Static, POSITION_TYPE_RELATIVE: Kn.Relative, POSITION_TYPE_ABSOLUTE: Kn.Absolute, UNIT_UNDEFINED: ve.Undefined, UNIT_POINT: ve.Point, UNIT_PERCENT: ve.Percent, UNIT_AUTO: ve.Auto, WRAP_NO_WRAP: Yn.NoWrap, WRAP_WRAP: Yn.Wrap, WRAP_WRAP_REVERSE: Yn.WrapReverse }, vs = pI;
});
function qn(A) {
  function e(n, i, o) {
    let g = n[i];
    n[i] = function() {
      for (var u = arguments.length, c = new Array(u), B = 0; B < u; B++) c[B] = arguments[B];
      return o.call(this, g, ...c);
    };
  }
  for (let n of ["setPosition", "setMargin", "setFlexBasis", "setWidth", "setHeight", "setMinWidth", "setMinHeight", "setMaxWidth", "setMaxHeight", "setPadding", "setGap"]) {
    let i = { [ve.Point]: A.Node.prototype[n], [ve.Percent]: A.Node.prototype[`${n}Percent`], [ve.Auto]: A.Node.prototype[`${n}Auto`] };
    e(A.Node.prototype, n, function(o) {
      for (var g = arguments.length, u = new Array(g > 1 ? g - 1 : 0), c = 1; c < g; c++) u[c - 1] = arguments[c];
      let B = u.pop(), E, d;
      if (B === "auto") E = ve.Auto, d = void 0;
      else if (typeof B == "object") E = B.unit, d = B.valueOf();
      else if (E = typeof B == "string" && B.endsWith("%") ? ve.Percent : ve.Point, d = parseFloat(B), B !== void 0 && !Number.isNaN(B) && Number.isNaN(d)) throw new Error(`Invalid value ${B} for ${n}`);
      if (!i[E]) throw new Error(`Failed to execute "${n}": Unsupported unit '${B}'`);
      return d !== void 0 ? i[E].call(this, ...u, d) : i[E].call(this, ...u);
    });
  }
  function t(n) {
    return A.MeasureCallback.implement({ measure: function() {
      let { width: i, height: o } = n(...arguments);
      return { width: i ?? NaN, height: o ?? NaN };
    } });
  }
  e(A.Node.prototype, "setMeasureFunc", function(n, i) {
    return i ? n.call(this, t(i)) : this.unsetMeasureFunc();
  });
  function r(n) {
    return A.DirtiedCallback.implement({ dirtied: n });
  }
  return e(A.Node.prototype, "setDirtiedFunc", function(n, i) {
    n.call(this, r(i));
  }), e(A.Config.prototype, "free", function() {
    A.Config.destroy(this);
  }), e(A.Node, "create", (n, i) => i ? A.Node.createWithConfig(i) : A.Node.createDefault()), e(A.Node.prototype, "free", function() {
    A.Node.destroy(this);
  }), e(A.Node.prototype, "freeRecursive", function() {
    for (let n = 0, i = this.getChildCount(); n < i; ++n) this.getChild(0).freeRecursive();
    this.free();
  }), e(A.Node.prototype, "calculateLayout", function(n) {
    let i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : NaN, o = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : NaN, g = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : _t.LTR;
    return n.call(this, i, o, g);
  }), { Config: A.Config, Node: A.Node, ...vs };
}
var ks = Pe(() => {
  Tr();
  Tr();
});
var Rs = {};
dt(Rs, { default: () => mI });
function mI(A) {
  let e = { wasmBinary: A };
  var t;
  t || (t = typeof e < "u" ? e : {});
  var r, n;
  t.ready = new Promise(function(s, a) {
    r = s, n = a;
  });
  var i = Object.assign({}, t), o = "";
  typeof document < "u" && document.currentScript && (o = document.currentScript.src), bs && (o = bs), o.indexOf("blob:") !== 0 ? o = o.substr(0, o.replace(/[?#].*/, "").lastIndexOf("/") + 1) : o = "";
  var g = t.print || console.log.bind(console), u = t.printErr || console.warn.bind(console);
  Object.assign(t, i), i = null;
  var c;
  t.wasmBinary && (c = t.wasmBinary);
  t.noExitRuntime || true;
  typeof WebAssembly != "object" && V("no native wasm support detected");
  var E, d = false;
  function C(s, a, I) {
    I = a + I;
    for (var l = ""; !(a >= I); ) {
      var f = s[a++];
      if (!f) break;
      if (f & 128) {
        var Q = s[a++] & 63;
        if ((f & 224) == 192) l += String.fromCharCode((f & 31) << 6 | Q);
        else {
          var h = s[a++] & 63;
          f = (f & 240) == 224 ? (f & 15) << 12 | Q << 6 | h : (f & 7) << 18 | Q << 12 | h << 6 | s[a++] & 63, 65536 > f ? l += String.fromCharCode(f) : (f -= 65536, l += String.fromCharCode(55296 | f >> 10, 56320 | f & 1023));
        }
      } else l += String.fromCharCode(f);
    }
    return l;
  }
  var m, D, S, b, L, x, k, F, G;
  function J() {
    var s = E.buffer;
    m = s, t.HEAP8 = D = new Int8Array(s), t.HEAP16 = b = new Int16Array(s), t.HEAP32 = x = new Int32Array(s), t.HEAPU8 = S = new Uint8Array(s), t.HEAPU16 = L = new Uint16Array(s), t.HEAPU32 = k = new Uint32Array(s), t.HEAPF32 = F = new Float32Array(s), t.HEAPF64 = G = new Float64Array(s);
  }
  var q, lA = [], wA = [], UA = [];
  function NA() {
    var s = t.preRun.shift();
    lA.unshift(s);
  }
  var j = 0, IA = null;
  function V(s) {
    throw t.onAbort && t.onAbort(s), s = "Aborted(" + s + ")", u(s), d = true, s = new WebAssembly.RuntimeError(s + ". Build with -sASSERTIONS for more info."), n(s), s;
  }
  function HA(s) {
    return s.startsWith("data:application/octet-stream;base64,");
  }
  var gA = "";
  if (!HA(gA)) {
    var pA = gA;
    gA = t.locateFile ? t.locateFile(pA, o) : o + pA;
  }
  function RA() {
    var s = gA;
    try {
      if (s == gA && c) return new Uint8Array(c);
      if (HA(s)) try {
        var a = Fn(s.slice(37)), I = new Uint8Array(a.length);
        for (s = 0; s < a.length; ++s) I[s] = a.charCodeAt(s);
        var l = I;
      } catch {
        throw Error("Converting base64 string to bytes failed.");
      }
      else l = void 0;
      var f = l;
      if (f) return f;
      throw "both async and sync fetching of the wasm failed";
    } catch (Q) {
      V(Q);
    }
  }
  function ae() {
    return c || typeof fetch != "function" ? Promise.resolve().then(function() {
      return RA();
    }) : fetch(gA, { credentials: "same-origin" }).then(function(s) {
      if (!s.ok) throw "failed to load wasm binary file at '" + gA + "'";
      return s.arrayBuffer();
    }).catch(function() {
      return RA();
    });
  }
  function OA(s) {
    for (; 0 < s.length; ) s.shift()(t);
  }
  function ge(s) {
    if (s === void 0) return "_unknown";
    s = s.replace(/[^a-zA-Z0-9_]/g, "$");
    var a = s.charCodeAt(0);
    return 48 <= a && 57 >= a ? "_" + s : s;
  }
  function hA(s, a) {
    return s = ge(s), function() {
      return a.apply(this, arguments);
    };
  }
  var W = [{}, { value: void 0 }, { value: null }, { value: true }, { value: false }], vA = [];
  function FA(s) {
    var a = Error, I = hA(s, function(l) {
      this.name = s, this.message = l, l = Error(l).stack, l !== void 0 && (this.stack = this.toString() + `
` + l.replace(/^Error(:[^\n]*)?\n/, ""));
    });
    return I.prototype = Object.create(a.prototype), I.prototype.constructor = I, I.prototype.toString = function() {
      return this.message === void 0 ? this.name : this.name + ": " + this.message;
    }, I;
  }
  var TA = void 0;
  function U(s) {
    throw new TA(s);
  }
  var XA = (s) => (s || U("Cannot use deleted val. handle = " + s), W[s].value), me = (s) => {
    switch (s) {
      case void 0:
        return 1;
      case null:
        return 2;
      case true:
        return 3;
      case false:
        return 4;
      default:
        var a = vA.length ? vA.pop() : W.length;
        return W[a] = { ga: 1, value: s }, a;
    }
  }, ot = void 0, Ue = void 0;
  function rA(s) {
    for (var a = ""; S[s]; ) a += Ue[S[s++]];
    return a;
  }
  var MA = [];
  function be() {
    for (; MA.length; ) {
      var s = MA.pop();
      s.M.$ = false, s.delete();
    }
  }
  var re = void 0, kA = {};
  function ye(s, a) {
    for (a === void 0 && U("ptr should not be undefined"); s.R; ) a = s.ba(a), s = s.R;
    return a;
  }
  var VA = {};
  function Re(s) {
    s = Gt(s);
    var a = rA(s);
    return JA(s), a;
  }
  function ue(s, a) {
    var I = VA[s];
    return I === void 0 && U(a + " has unknown type " + Re(s)), I;
  }
  function ZA() {
  }
  var KA = false;
  function xe(s) {
    --s.count.value, s.count.value === 0 && (s.T ? s.U.W(s.T) : s.P.N.W(s.O));
  }
  function Ie(s, a, I) {
    return a === I ? s : I.R === void 0 ? null : (s = Ie(s, a, I.R), s === null ? null : I.na(s));
  }
  var we = {};
  function Ve(s, a) {
    return a = ye(s, a), kA[a];
  }
  var ze = void 0;
  function ne(s) {
    throw new ze(s);
  }
  function jA(s, a) {
    return a.P && a.O || ne("makeClassHandle requires ptr and ptrType"), !!a.U != !!a.T && ne("Both smartPtrType and smartPtr must be specified"), a.count = { value: 1 }, bA(Object.create(s, { M: { value: a } }));
  }
  function bA(s) {
    return typeof FinalizationRegistry > "u" ? (bA = (a) => a, s) : (KA = new FinalizationRegistry((a) => {
      xe(a.M);
    }), bA = (a) => {
      var I = a.M;
      return I.T && KA.register(a, { M: I }, a), a;
    }, ZA = (a) => {
      KA.unregister(a);
    }, bA(s));
  }
  var le = {};
  function Z(s) {
    for (; s.length; ) {
      var a = s.pop();
      s.pop()(a);
    }
  }
  function $(s) {
    return this.fromWireType(x[s >> 2]);
  }
  var oA = {}, nA = {};
  function iA(s, a, I) {
    function l(p) {
      p = I(p), p.length !== s.length && ne("Mismatched type converter count");
      for (var w = 0; w < s.length; ++w) AA(s[w], p[w]);
    }
    s.forEach(function(p) {
      nA[p] = a;
    });
    var f = Array(a.length), Q = [], h = 0;
    a.forEach((p, w) => {
      VA.hasOwnProperty(p) ? f[w] = VA[p] : (Q.push(p), oA.hasOwnProperty(p) || (oA[p] = []), oA[p].push(() => {
        f[w] = VA[p], ++h, h === Q.length && l(f);
      }));
    }), Q.length === 0 && l(f);
  }
  function sA(s) {
    switch (s) {
      case 1:
        return 0;
      case 2:
        return 1;
      case 4:
        return 2;
      case 8:
        return 3;
      default:
        throw new TypeError("Unknown type size: " + s);
    }
  }
  function AA(s, a, I = {}) {
    if (!("argPackAdvance" in a)) throw new TypeError("registerType registeredInstance requires argPackAdvance");
    var l = a.name;
    if (s || U('type "' + l + '" must have a positive integer typeid pointer'), VA.hasOwnProperty(s)) {
      if (I.ua) return;
      U("Cannot register type '" + l + "' twice");
    }
    VA[s] = a, delete nA[s], oA.hasOwnProperty(s) && (a = oA[s], delete oA[s], a.forEach((f) => f()));
  }
  function uA(s) {
    U(s.M.P.N.name + " instance already deleted");
  }
  function X() {
  }
  function YA(s, a, I) {
    if (s[a].S === void 0) {
      var l = s[a];
      s[a] = function() {
        return s[a].S.hasOwnProperty(arguments.length) || U("Function '" + I + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + s[a].S + ")!"), s[a].S[arguments.length].apply(this, arguments);
      }, s[a].S = [], s[a].S[l.Z] = l;
    }
  }
  function aA(s, a) {
    t.hasOwnProperty(s) ? (U("Cannot register public name '" + s + "' twice"), YA(t, s, s), t.hasOwnProperty(void 0) && U("Cannot register multiple overloads of a function with the same number of arguments (undefined)!"), t[s].S[void 0] = a) : t[s] = a;
  }
  function De(s, a, I, l, f, Q, h, p) {
    this.name = s, this.constructor = a, this.X = I, this.W = l, this.R = f, this.pa = Q, this.ba = h, this.na = p, this.ja = [];
  }
  function LA(s, a, I) {
    for (; a !== I; ) a.ba || U("Expected null or instance of " + I.name + ", got an instance of " + a.name), s = a.ba(s), a = a.R;
    return s;
  }
  function ce(s, a) {
    return a === null ? (this.ea && U("null is not a valid " + this.name), 0) : (a.M || U('Cannot pass "' + Ae(a) + '" as a ' + this.name), a.M.O || U("Cannot pass deleted object as a pointer of type " + this.name), LA(a.M.O, a.M.P.N, this.N));
  }
  function Ze(s, a) {
    if (a === null) {
      if (this.ea && U("null is not a valid " + this.name), this.da) {
        var I = this.fa();
        return s !== null && s.push(this.W, I), I;
      }
      return 0;
    }
    if (a.M || U('Cannot pass "' + Ae(a) + '" as a ' + this.name), a.M.O || U("Cannot pass deleted object as a pointer of type " + this.name), !this.ca && a.M.P.ca && U("Cannot convert argument of type " + (a.M.U ? a.M.U.name : a.M.P.name) + " to parameter type " + this.name), I = LA(a.M.O, a.M.P.N, this.N), this.da) switch (a.M.T === void 0 && U("Passing raw pointer to smart pointer is illegal"), this.Ba) {
      case 0:
        a.M.U === this ? I = a.M.T : U("Cannot convert argument of type " + (a.M.U ? a.M.U.name : a.M.P.name) + " to parameter type " + this.name);
        break;
      case 1:
        I = a.M.T;
        break;
      case 2:
        if (a.M.U === this) I = a.M.T;
        else {
          var l = a.clone();
          I = this.xa(I, me(function() {
            l.delete();
          })), s !== null && s.push(this.W, I);
        }
        break;
      default:
        U("Unsupporting sharing policy");
    }
    return I;
  }
  function Be(s, a) {
    return a === null ? (this.ea && U("null is not a valid " + this.name), 0) : (a.M || U('Cannot pass "' + Ae(a) + '" as a ' + this.name), a.M.O || U("Cannot pass deleted object as a pointer of type " + this.name), a.M.P.ca && U("Cannot convert argument of type " + a.M.P.name + " to parameter type " + this.name), LA(a.M.O, a.M.P.N, this.N));
  }
  function z(s, a, I, l) {
    this.name = s, this.N = a, this.ea = I, this.ca = l, this.da = false, this.W = this.xa = this.fa = this.ka = this.Ba = this.wa = void 0, a.R !== void 0 ? this.toWireType = Ze : (this.toWireType = l ? ce : Be, this.V = null);
  }
  function GA(s, a) {
    t.hasOwnProperty(s) || ne("Replacing nonexistant public symbol"), t[s] = a, t[s].Z = void 0;
  }
  function fe(s, a) {
    var I = [];
    return function() {
      if (I.length = 0, Object.assign(I, arguments), s.includes("j")) {
        var l = t["dynCall_" + s];
        l = I && I.length ? l.apply(null, [a].concat(I)) : l.call(null, a);
      } else l = q.get(a).apply(null, I);
      return l;
    };
  }
  function QA(s, a) {
    s = rA(s);
    var I = s.includes("j") ? fe(s, a) : q.get(a);
    return typeof I != "function" && U("unknown function pointer with signature " + s + ": " + a), I;
  }
  var Ne = void 0;
  function xA(s, a) {
    function I(Q) {
      f[Q] || VA[Q] || (nA[Q] ? nA[Q].forEach(I) : (l.push(Q), f[Q] = true));
    }
    var l = [], f = {};
    throw a.forEach(I), new Ne(s + ": " + l.map(Re).join([", "]));
  }
  function PA(s, a, I, l, f) {
    var Q = a.length;
    2 > Q && U("argTypes array size mismatch! Must at least get return value and 'this' types!");
    var h = a[1] !== null && I !== null, p = false;
    for (I = 1; I < a.length; ++I) if (a[I] !== null && a[I].V === void 0) {
      p = true;
      break;
    }
    var w = a[0].name !== "void", y = Q - 2, v = Array(y), N = [], P = [];
    return function() {
      if (arguments.length !== y && U("function " + s + " called with " + arguments.length + " arguments, expected " + y + " args!"), P.length = 0, N.length = h ? 2 : 1, N[0] = f, h) {
        var eA = a[1].toWireType(P, this);
        N[1] = eA;
      }
      for (var K = 0; K < y; ++K) v[K] = a[K + 2].toWireType(P, arguments[K]), N.push(v[K]);
      if (K = l.apply(null, N), p) Z(P);
      else for (var fA = h ? 1 : 2; fA < a.length; fA++) {
        var DA = fA === 1 ? eA : v[fA - 2];
        a[fA].V !== null && a[fA].V(DA);
      }
      return eA = w ? a[0].fromWireType(K) : void 0, eA;
    };
  }
  function _A(s, a) {
    for (var I = [], l = 0; l < s; l++) I.push(k[a + 4 * l >> 2]);
    return I;
  }
  function $A(s) {
    4 < s && --W[s].ga === 0 && (W[s] = void 0, vA.push(s));
  }
  function Ae(s) {
    if (s === null) return "null";
    var a = typeof s;
    return a === "object" || a === "array" || a === "function" ? s.toString() : "" + s;
  }
  function Et(s, a) {
    switch (a) {
      case 2:
        return function(I) {
          return this.fromWireType(F[I >> 2]);
        };
      case 3:
        return function(I) {
          return this.fromWireType(G[I >> 3]);
        };
      default:
        throw new TypeError("Unknown float type: " + s);
    }
  }
  function Qt(s, a, I) {
    switch (a) {
      case 0:
        return I ? function(l) {
          return D[l];
        } : function(l) {
          return S[l];
        };
      case 1:
        return I ? function(l) {
          return b[l >> 1];
        } : function(l) {
          return L[l >> 1];
        };
      case 2:
        return I ? function(l) {
          return x[l >> 2];
        } : function(l) {
          return k[l >> 2];
        };
      default:
        throw new TypeError("Unknown integer type: " + s);
    }
  }
  function Ct(s, a) {
    for (var I = "", l = 0; !(l >= a / 2); ++l) {
      var f = b[s + 2 * l >> 1];
      if (f == 0) break;
      I += String.fromCharCode(f);
    }
    return I;
  }
  function wn(s, a, I) {
    if (I === void 0 && (I = 2147483647), 2 > I) return 0;
    I -= 2;
    var l = a;
    I = I < 2 * s.length ? I / 2 : s.length;
    for (var f = 0; f < I; ++f) b[a >> 1] = s.charCodeAt(f), a += 2;
    return b[a >> 1] = 0, a - l;
  }
  function Dn(s) {
    return 2 * s.length;
  }
  function Sn(s, a) {
    for (var I = 0, l = ""; !(I >= a / 4); ) {
      var f = x[s + 4 * I >> 2];
      if (f == 0) break;
      ++I, 65536 <= f ? (f -= 65536, l += String.fromCharCode(55296 | f >> 10, 56320 | f & 1023)) : l += String.fromCharCode(f);
    }
    return l;
  }
  function vn(s, a, I) {
    if (I === void 0 && (I = 2147483647), 4 > I) return 0;
    var l = a;
    I = l + I - 4;
    for (var f = 0; f < s.length; ++f) {
      var Q = s.charCodeAt(f);
      if (55296 <= Q && 57343 >= Q) {
        var h = s.charCodeAt(++f);
        Q = 65536 + ((Q & 1023) << 10) | h & 1023;
      }
      if (x[a >> 2] = Q, a += 4, a + 4 > I) break;
    }
    return x[a >> 2] = 0, a - l;
  }
  function kn(s) {
    for (var a = 0, I = 0; I < s.length; ++I) {
      var l = s.charCodeAt(I);
      55296 <= l && 57343 >= l && ++I, a += 4;
    }
    return a;
  }
  var bn = {};
  function Ft(s) {
    var a = bn[s];
    return a === void 0 ? rA(s) : a;
  }
  var He = [];
  function Rn(s) {
    var a = He.length;
    return He.push(s), a;
  }
  function xn(s, a) {
    for (var I = Array(s), l = 0; l < s; ++l) I[l] = ue(k[a + 4 * l >> 2], "parameter " + l);
    return I;
  }
  var Mt = [], Nn = [null, [], []];
  TA = t.BindingError = FA("BindingError"), t.count_emval_handles = function() {
    for (var s = 0, a = 5; a < W.length; ++a) W[a] !== void 0 && ++s;
    return s;
  }, t.get_first_emval = function() {
    for (var s = 5; s < W.length; ++s) if (W[s] !== void 0) return W[s];
    return null;
  }, ot = t.PureVirtualError = FA("PureVirtualError");
  for (var Lt = Array(256), Oe = 0; 256 > Oe; ++Oe) Lt[Oe] = String.fromCharCode(Oe);
  Ue = Lt, t.getInheritedInstanceCount = function() {
    return Object.keys(kA).length;
  }, t.getLiveInheritedInstances = function() {
    var s = [], a;
    for (a in kA) kA.hasOwnProperty(a) && s.push(kA[a]);
    return s;
  }, t.flushPendingDeletes = be, t.setDelayFunction = function(s) {
    re = s, MA.length && re && re(be);
  }, ze = t.InternalError = FA("InternalError"), X.prototype.isAliasOf = function(s) {
    if (!(this instanceof X && s instanceof X)) return false;
    var a = this.M.P.N, I = this.M.O, l = s.M.P.N;
    for (s = s.M.O; a.R; ) I = a.ba(I), a = a.R;
    for (; l.R; ) s = l.ba(s), l = l.R;
    return a === l && I === s;
  }, X.prototype.clone = function() {
    if (this.M.O || uA(this), this.M.aa) return this.M.count.value += 1, this;
    var s = bA, a = Object, I = a.create, l = Object.getPrototypeOf(this), f = this.M;
    return s = s(I.call(a, l, { M: { value: { count: f.count, $: f.$, aa: f.aa, O: f.O, P: f.P, T: f.T, U: f.U } } })), s.M.count.value += 1, s.M.$ = false, s;
  }, X.prototype.delete = function() {
    this.M.O || uA(this), this.M.$ && !this.M.aa && U("Object already scheduled for deletion"), ZA(this), xe(this.M), this.M.aa || (this.M.T = void 0, this.M.O = void 0);
  }, X.prototype.isDeleted = function() {
    return !this.M.O;
  }, X.prototype.deleteLater = function() {
    return this.M.O || uA(this), this.M.$ && !this.M.aa && U("Object already scheduled for deletion"), MA.push(this), MA.length === 1 && re && re(be), this.M.$ = true, this;
  }, z.prototype.qa = function(s) {
    return this.ka && (s = this.ka(s)), s;
  }, z.prototype.ha = function(s) {
    this.W && this.W(s);
  }, z.prototype.argPackAdvance = 8, z.prototype.readValueFromPointer = $, z.prototype.deleteObject = function(s) {
    s !== null && s.delete();
  }, z.prototype.fromWireType = function(s) {
    function a() {
      return this.da ? jA(this.N.X, { P: this.wa, O: I, U: this, T: s }) : jA(this.N.X, { P: this, O: s });
    }
    var I = this.qa(s);
    if (!I) return this.ha(s), null;
    var l = Ve(this.N, I);
    if (l !== void 0) return l.M.count.value === 0 ? (l.M.O = I, l.M.T = s, l.clone()) : (l = l.clone(), this.ha(s), l);
    if (l = this.N.pa(I), l = we[l], !l) return a.call(this);
    l = this.ca ? l.la : l.pointerType;
    var f = Ie(I, this.N, l.N);
    return f === null ? a.call(this) : this.da ? jA(l.N.X, { P: l, O: f, U: this, T: s }) : jA(l.N.X, { P: l, O: f });
  }, Ne = t.UnboundTypeError = FA("UnboundTypeError");
  var Fn = typeof atob == "function" ? atob : function(s) {
    var a = "", I = 0;
    s = s.replace(/[^A-Za-z0-9\+\/=]/g, "");
    do {
      var l = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(s.charAt(I++)), f = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(s.charAt(I++)), Q = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(s.charAt(I++)), h = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(s.charAt(I++));
      l = l << 2 | f >> 4, f = (f & 15) << 4 | Q >> 2;
      var p = (Q & 3) << 6 | h;
      a += String.fromCharCode(l), Q !== 64 && (a += String.fromCharCode(f)), h !== 64 && (a += String.fromCharCode(p));
    } while (I < s.length);
    return a;
  }, Mn = { l: function(s, a, I, l) {
    V("Assertion failed: " + (s ? C(S, s) : "") + ", at: " + [a ? a ? C(S, a) : "" : "unknown filename", I, l ? l ? C(S, l) : "" : "unknown function"]);
  }, q: function(s, a, I) {
    s = rA(s), a = ue(a, "wrapper"), I = XA(I);
    var l = [].slice, f = a.N, Q = f.X, h = f.R.X, p = f.R.constructor;
    s = hA(s, function() {
      f.R.ja.forEach(function(y) {
        if (this[y] === h[y]) throw new ot("Pure virtual function " + y + " must be implemented in JavaScript");
      }.bind(this)), Object.defineProperty(this, "__parent", { value: Q }), this.__construct.apply(this, l.call(arguments));
    }), Q.__construct = function() {
      this === Q && U("Pass correct 'this' to __construct");
      var y = p.implement.apply(void 0, [this].concat(l.call(arguments)));
      ZA(y);
      var v = y.M;
      y.notifyOnDestruction(), v.aa = true, Object.defineProperties(this, { M: { value: v } }), bA(this), y = v.O, y = ye(f, y), kA.hasOwnProperty(y) ? U("Tried to register registered instance: " + y) : kA[y] = this;
    }, Q.__destruct = function() {
      this === Q && U("Pass correct 'this' to __destruct"), ZA(this);
      var y = this.M.O;
      y = ye(f, y), kA.hasOwnProperty(y) ? delete kA[y] : U("Tried to unregister unregistered instance: " + y);
    }, s.prototype = Object.create(Q);
    for (var w in I) s.prototype[w] = I[w];
    return me(s);
  }, j: function(s) {
    var a = le[s];
    delete le[s];
    var I = a.fa, l = a.W, f = a.ia, Q = f.map((h) => h.ta).concat(f.map((h) => h.za));
    iA([s], Q, (h) => {
      var p = {};
      return f.forEach((w, y) => {
        var v = h[y], N = w.ra, P = w.sa, eA = h[y + f.length], K = w.ya, fA = w.Aa;
        p[w.oa] = { read: (DA) => v.fromWireType(N(P, DA)), write: (DA, Se) => {
          var WA = [];
          K(fA, DA, eA.toWireType(WA, Se)), Z(WA);
        } };
      }), [{ name: a.name, fromWireType: function(w) {
        var y = {}, v;
        for (v in p) y[v] = p[v].read(w);
        return l(w), y;
      }, toWireType: function(w, y) {
        for (var v in p) if (!(v in y)) throw new TypeError('Missing field:  "' + v + '"');
        var N = I();
        for (v in p) p[v].write(N, y[v]);
        return w !== null && w.push(l, N), N;
      }, argPackAdvance: 8, readValueFromPointer: $, V: l }];
    });
  }, v: function() {
  }, B: function(s, a, I, l, f) {
    var Q = sA(I);
    a = rA(a), AA(s, { name: a, fromWireType: function(h) {
      return !!h;
    }, toWireType: function(h, p) {
      return p ? l : f;
    }, argPackAdvance: 8, readValueFromPointer: function(h) {
      if (I === 1) var p = D;
      else if (I === 2) p = b;
      else if (I === 4) p = x;
      else throw new TypeError("Unknown boolean type size: " + a);
      return this.fromWireType(p[h >> Q]);
    }, V: null });
  }, f: function(s, a, I, l, f, Q, h, p, w, y, v, N, P) {
    v = rA(v), Q = QA(f, Q), p && (p = QA(h, p)), y && (y = QA(w, y)), P = QA(N, P);
    var eA = ge(v);
    aA(eA, function() {
      xA("Cannot construct " + v + " due to unbound types", [l]);
    }), iA([s, a, I], l ? [l] : [], function(K) {
      if (K = K[0], l) var fA = K.N, DA = fA.X;
      else DA = X.prototype;
      K = hA(eA, function() {
        if (Object.getPrototypeOf(this) !== Se) throw new TA("Use 'new' to construct " + v);
        if (WA.Y === void 0) throw new TA(v + " has no accessible constructor");
        var Ot = WA.Y[arguments.length];
        if (Ot === void 0) throw new TA("Tried to invoke ctor of " + v + " with invalid number of parameters (" + arguments.length + ") - expected (" + Object.keys(WA.Y).toString() + ") parameters instead!");
        return Ot.apply(this, arguments);
      });
      var Se = Object.create(DA, { constructor: { value: K } });
      K.prototype = Se;
      var WA = new De(v, K, Se, P, fA, Q, p, y);
      fA = new z(v, WA, true, false), DA = new z(v + "*", WA, false, false);
      var Ht = new z(v + " const*", WA, false, true);
      return we[s] = { pointerType: DA, la: Ht }, GA(eA, K), [fA, DA, Ht];
    });
  }, d: function(s, a, I, l, f, Q, h) {
    var p = _A(I, l);
    a = rA(a), Q = QA(f, Q), iA([], [s], function(w) {
      function y() {
        xA("Cannot call " + v + " due to unbound types", p);
      }
      w = w[0];
      var v = w.name + "." + a;
      a.startsWith("@@") && (a = Symbol[a.substring(2)]);
      var N = w.N.constructor;
      return N[a] === void 0 ? (y.Z = I - 1, N[a] = y) : (YA(N, a, v), N[a].S[I - 1] = y), iA([], p, function(P) {
        return P = PA(v, [P[0], null].concat(P.slice(1)), null, Q, h), N[a].S === void 0 ? (P.Z = I - 1, N[a] = P) : N[a].S[I - 1] = P, [];
      }), [];
    });
  }, p: function(s, a, I, l, f, Q) {
    0 < a || V();
    var h = _A(a, I);
    f = QA(l, f), iA([], [s], function(p) {
      p = p[0];
      var w = "constructor " + p.name;
      if (p.N.Y === void 0 && (p.N.Y = []), p.N.Y[a - 1] !== void 0) throw new TA("Cannot register multiple constructors with identical number of parameters (" + (a - 1) + ") for class '" + p.name + "'! Overload resolution is currently only performed using the parameter count, not actual type info!");
      return p.N.Y[a - 1] = () => {
        xA("Cannot construct " + p.name + " due to unbound types", h);
      }, iA([], h, function(y) {
        return y.splice(1, 0, null), p.N.Y[a - 1] = PA(w, y, null, f, Q), [];
      }), [];
    });
  }, a: function(s, a, I, l, f, Q, h, p) {
    var w = _A(I, l);
    a = rA(a), Q = QA(f, Q), iA([], [s], function(y) {
      function v() {
        xA("Cannot call " + N + " due to unbound types", w);
      }
      y = y[0];
      var N = y.name + "." + a;
      a.startsWith("@@") && (a = Symbol[a.substring(2)]), p && y.N.ja.push(a);
      var P = y.N.X, eA = P[a];
      return eA === void 0 || eA.S === void 0 && eA.className !== y.name && eA.Z === I - 2 ? (v.Z = I - 2, v.className = y.name, P[a] = v) : (YA(P, a, N), P[a].S[I - 2] = v), iA([], w, function(K) {
        return K = PA(N, K, y, Q, h), P[a].S === void 0 ? (K.Z = I - 2, P[a] = K) : P[a].S[I - 2] = K, [];
      }), [];
    });
  }, A: function(s, a) {
    a = rA(a), AA(s, { name: a, fromWireType: function(I) {
      var l = XA(I);
      return $A(I), l;
    }, toWireType: function(I, l) {
      return me(l);
    }, argPackAdvance: 8, readValueFromPointer: $, V: null });
  }, n: function(s, a, I) {
    I = sA(I), a = rA(a), AA(s, { name: a, fromWireType: function(l) {
      return l;
    }, toWireType: function(l, f) {
      return f;
    }, argPackAdvance: 8, readValueFromPointer: Et(a, I), V: null });
  }, e: function(s, a, I, l, f) {
    a = rA(a), f === -1 && (f = 4294967295), f = sA(I);
    var Q = (p) => p;
    if (l === 0) {
      var h = 32 - 8 * I;
      Q = (p) => p << h >>> h;
    }
    I = a.includes("unsigned") ? function(p, w) {
      return w >>> 0;
    } : function(p, w) {
      return w;
    }, AA(s, { name: a, fromWireType: Q, toWireType: I, argPackAdvance: 8, readValueFromPointer: Qt(a, f, l !== 0), V: null });
  }, b: function(s, a, I) {
    function l(Q) {
      Q >>= 2;
      var h = k;
      return new f(m, h[Q + 1], h[Q]);
    }
    var f = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array][a];
    I = rA(I), AA(s, { name: I, fromWireType: l, argPackAdvance: 8, readValueFromPointer: l }, { ua: true });
  }, o: function(s, a) {
    a = rA(a);
    var I = a === "std::string";
    AA(s, { name: a, fromWireType: function(l) {
      var f = k[l >> 2], Q = l + 4;
      if (I) for (var h = Q, p = 0; p <= f; ++p) {
        var w = Q + p;
        if (p == f || S[w] == 0) {
          if (h = h ? C(S, h, w - h) : "", y === void 0) var y = h;
          else y += String.fromCharCode(0), y += h;
          h = w + 1;
        }
      }
      else {
        for (y = Array(f), p = 0; p < f; ++p) y[p] = String.fromCharCode(S[Q + p]);
        y = y.join("");
      }
      return JA(l), y;
    }, toWireType: function(l, f) {
      f instanceof ArrayBuffer && (f = new Uint8Array(f));
      var Q, h = typeof f == "string";
      if (h || f instanceof Uint8Array || f instanceof Uint8ClampedArray || f instanceof Int8Array || U("Cannot pass non-string to std::string"), I && h) {
        var p = 0;
        for (Q = 0; Q < f.length; ++Q) {
          var w = f.charCodeAt(Q);
          127 >= w ? p++ : 2047 >= w ? p += 2 : 55296 <= w && 57343 >= w ? (p += 4, ++Q) : p += 3;
        }
        Q = p;
      } else Q = f.length;
      if (p = st(4 + Q + 1), w = p + 4, k[p >> 2] = Q, I && h) {
        if (h = w, w = Q + 1, Q = S, 0 < w) {
          w = h + w - 1;
          for (var y = 0; y < f.length; ++y) {
            var v = f.charCodeAt(y);
            if (55296 <= v && 57343 >= v) {
              var N = f.charCodeAt(++y);
              v = 65536 + ((v & 1023) << 10) | N & 1023;
            }
            if (127 >= v) {
              if (h >= w) break;
              Q[h++] = v;
            } else {
              if (2047 >= v) {
                if (h + 1 >= w) break;
                Q[h++] = 192 | v >> 6;
              } else {
                if (65535 >= v) {
                  if (h + 2 >= w) break;
                  Q[h++] = 224 | v >> 12;
                } else {
                  if (h + 3 >= w) break;
                  Q[h++] = 240 | v >> 18, Q[h++] = 128 | v >> 12 & 63;
                }
                Q[h++] = 128 | v >> 6 & 63;
              }
              Q[h++] = 128 | v & 63;
            }
          }
          Q[h] = 0;
        }
      } else if (h) for (h = 0; h < Q; ++h) y = f.charCodeAt(h), 255 < y && (JA(w), U("String has UTF-16 code units that do not fit in 8 bits")), S[w + h] = y;
      else for (h = 0; h < Q; ++h) S[w + h] = f[h];
      return l !== null && l.push(JA, p), p;
    }, argPackAdvance: 8, readValueFromPointer: $, V: function(l) {
      JA(l);
    } });
  }, i: function(s, a, I) {
    if (I = rA(I), a === 2) var l = Ct, f = wn, Q = Dn, h = () => L, p = 1;
    else a === 4 && (l = Sn, f = vn, Q = kn, h = () => k, p = 2);
    AA(s, { name: I, fromWireType: function(w) {
      for (var y = k[w >> 2], v = h(), N, P = w + 4, eA = 0; eA <= y; ++eA) {
        var K = w + 4 + eA * a;
        (eA == y || v[K >> p] == 0) && (P = l(P, K - P), N === void 0 ? N = P : (N += String.fromCharCode(0), N += P), P = K + a);
      }
      return JA(w), N;
    }, toWireType: function(w, y) {
      typeof y != "string" && U("Cannot pass non-string to C++ string type " + I);
      var v = Q(y), N = st(4 + v + a);
      return k[N >> 2] = v >> p, f(y, N + 4, v + a), w !== null && w.push(JA, N), N;
    }, argPackAdvance: 8, readValueFromPointer: $, V: function(w) {
      JA(w);
    } });
  }, k: function(s, a, I, l, f, Q) {
    le[s] = { name: rA(a), fa: QA(I, l), W: QA(f, Q), ia: [] };
  }, h: function(s, a, I, l, f, Q, h, p, w, y) {
    le[s].ia.push({ oa: rA(a), ta: I, ra: QA(l, f), sa: Q, za: h, ya: QA(p, w), Aa: y });
  }, C: function(s, a) {
    a = rA(a), AA(s, { va: true, name: a, argPackAdvance: 0, fromWireType: function() {
    }, toWireType: function() {
    } });
  }, s: function(s, a, I, l, f) {
    s = He[s], a = XA(a), I = Ft(I);
    var Q = [];
    return k[l >> 2] = me(Q), s(a, I, Q, f);
  }, t: function(s, a, I, l) {
    s = He[s], a = XA(a), I = Ft(I), s(a, I, null, l);
  }, g: $A, m: function(s, a) {
    var I = xn(s, a), l = I[0];
    a = l.name + "_$" + I.slice(1).map(function(h) {
      return h.name;
    }).join("_") + "$";
    var f = Mt[a];
    if (f !== void 0) return f;
    var Q = Array(s - 1);
    return f = Rn((h, p, w, y) => {
      for (var v = 0, N = 0; N < s - 1; ++N) Q[N] = I[N + 1].readValueFromPointer(y + v), v += I[N + 1].argPackAdvance;
      for (h = h[p].apply(h, Q), N = 0; N < s - 1; ++N) I[N + 1].ma && I[N + 1].ma(Q[N]);
      if (!l.va) return l.toWireType(w, h);
    }), Mt[a] = f;
  }, D: function(s) {
    4 < s && (W[s].ga += 1);
  }, r: function(s) {
    var a = XA(s);
    Z(a), $A(s);
  }, c: function() {
    V("");
  }, x: function(s, a, I) {
    S.copyWithin(s, a, a + I);
  }, w: function(s) {
    var a = S.length;
    if (s >>>= 0, 2147483648 < s) return false;
    for (var I = 1; 4 >= I; I *= 2) {
      var l = a * (1 + 0.2 / I);
      l = Math.min(l, s + 100663296);
      var f = Math;
      l = Math.max(s, l), f = f.min.call(f, 2147483648, l + (65536 - l % 65536) % 65536);
      A: {
        try {
          E.grow(f - m.byteLength + 65535 >>> 16), J();
          var Q = 1;
          break A;
        } catch {
        }
        Q = void 0;
      }
      if (Q) return true;
    }
    return false;
  }, z: function() {
    return 52;
  }, u: function() {
    return 70;
  }, y: function(s, a, I, l) {
    for (var f = 0, Q = 0; Q < I; Q++) {
      var h = k[a >> 2], p = k[a + 4 >> 2];
      a += 8;
      for (var w = 0; w < p; w++) {
        var y = S[h + w], v = Nn[s];
        y === 0 || y === 10 ? ((s === 1 ? g : u)(C(v, 0)), v.length = 0) : v.push(y);
      }
      f += p;
    }
    return k[l >> 2] = f, 0;
  } };
  ((function() {
    function s(f) {
      t.asm = f.exports, E = t.asm.E, J(), q = t.asm.J, wA.unshift(t.asm.F), j--, t.monitorRunDependencies && t.monitorRunDependencies(j), j == 0 && (IA && (f = IA, IA = null, f()));
    }
    function a(f) {
      s(f.instance);
    }
    function I(f) {
      return ae().then(function(Q) {
        return Q instanceof WebAssembly.Instance ? Q : WebAssembly.instantiate(Q, l);
      }).then(function(Q) {
        return Q;
      }).then(f, function(Q) {
        u("failed to asynchronously prepare wasm: " + Q), V(Q);
      });
    }
    var l = { a: Mn };
    if (j++, t.monitorRunDependencies && t.monitorRunDependencies(j), t.instantiateWasm) try {
      return t.instantiateWasm(l, s);
    } catch (f) {
      u("Module.instantiateWasm callback failed with error: " + f), n(f);
    }
    return (function() {
      return c || typeof WebAssembly.instantiateStreaming != "function" || HA(gA) || typeof fetch != "function" ? I(a) : fetch(gA, { credentials: "same-origin" }).then(function(f) {
        return WebAssembly.instantiateStreaming(f, l).then(a, function(Q) {
          return u("wasm streaming compile failed: " + Q), u("falling back to ArrayBuffer instantiation"), I(a);
        });
      });
    })().catch(n), {};
  }))(), t.___wasm_call_ctors = function() {
    return (t.___wasm_call_ctors = t.asm.F).apply(null, arguments);
  };
  var Gt = t.___getTypeName = function() {
    return (Gt = t.___getTypeName = t.asm.G).apply(null, arguments);
  };
  t.__embind_initialize_bindings = function() {
    return (t.__embind_initialize_bindings = t.asm.H).apply(null, arguments);
  };
  var st = t._malloc = function() {
    return (st = t._malloc = t.asm.I).apply(null, arguments);
  }, JA = t._free = function() {
    return (JA = t._free = t.asm.K).apply(null, arguments);
  };
  t.dynCall_jiji = function() {
    return (t.dynCall_jiji = t.asm.L).apply(null, arguments);
  };
  var Te;
  IA = function s() {
    Te || Ut(), Te || (IA = s);
  };
  function Ut() {
    function s() {
      if (!Te && (Te = true, t.calledRun = true, !d)) {
        if (OA(wA), r(t), t.onRuntimeInitialized && t.onRuntimeInitialized(), t.postRun) for (typeof t.postRun == "function" && (t.postRun = [t.postRun]); t.postRun.length; ) {
          var a = t.postRun.shift();
          UA.unshift(a);
        }
        OA(UA);
      }
    }
    if (!(0 < j)) {
      if (t.preRun) for (typeof t.preRun == "function" && (t.preRun = [t.preRun]); t.preRun.length; ) NA();
      OA(lA), 0 < j || (t.setStatus ? (t.setStatus("Running..."), setTimeout(function() {
        setTimeout(function() {
          t.setStatus("");
        }, 1), s();
      }, 1)) : s());
    }
  }
  if (t.preInit) for (typeof t.preInit == "function" && (t.preInit = [t.preInit]); 0 < t.preInit.length; ) t.preInit.pop()();
  return Ut(), e.ready;
}
var bs, xs = Pe(() => {
  bs = "";
});
var Ns = {};
dt(Ns, { default: () => wI });
var yI, wI, Fs = Pe(() => {
  yI = (() => {
    var A = import.meta.url;
    return function(e) {
      e = e || {};
      var t;
      t || (t = typeof e < "u" ? e : {});
      var r, n;
      t.ready = new Promise(function(s, a) {
        r = s, n = a;
      });
      var i = Object.assign({}, t), o = "";
      typeof document < "u" && document.currentScript && (o = document.currentScript.src), A && (o = A), o.indexOf("blob:") !== 0 ? o = o.substr(0, o.replace(/[?#].*/, "").lastIndexOf("/") + 1) : o = "";
      var g = t.print || console.log.bind(console), u = t.printErr || console.warn.bind(console);
      Object.assign(t, i), i = null;
      var c;
      t.wasmBinary && (c = t.wasmBinary);
      t.noExitRuntime || true;
      typeof WebAssembly != "object" && V("no native wasm support detected");
      var E, d = false;
      function C(s, a, I) {
        I = a + I;
        for (var l = ""; !(a >= I); ) {
          var f = s[a++];
          if (!f) break;
          if (f & 128) {
            var Q = s[a++] & 63;
            if ((f & 224) == 192) l += String.fromCharCode((f & 31) << 6 | Q);
            else {
              var h = s[a++] & 63;
              f = (f & 240) == 224 ? (f & 15) << 12 | Q << 6 | h : (f & 7) << 18 | Q << 12 | h << 6 | s[a++] & 63, 65536 > f ? l += String.fromCharCode(f) : (f -= 65536, l += String.fromCharCode(55296 | f >> 10, 56320 | f & 1023));
            }
          } else l += String.fromCharCode(f);
        }
        return l;
      }
      var m, D, S, b, L, x, k, F, G;
      function J() {
        var s = E.buffer;
        m = s, t.HEAP8 = D = new Int8Array(s), t.HEAP16 = b = new Int16Array(s), t.HEAP32 = x = new Int32Array(s), t.HEAPU8 = S = new Uint8Array(s), t.HEAPU16 = L = new Uint16Array(s), t.HEAPU32 = k = new Uint32Array(s), t.HEAPF32 = F = new Float32Array(s), t.HEAPF64 = G = new Float64Array(s);
      }
      var q, lA = [], wA = [], UA = [];
      function NA() {
        var s = t.preRun.shift();
        lA.unshift(s);
      }
      var j = 0, IA = null;
      function V(s) {
        throw t.onAbort && t.onAbort(s), s = "Aborted(" + s + ")", u(s), d = true, s = new WebAssembly.RuntimeError(s + ". Build with -sASSERTIONS for more info."), n(s), s;
      }
      function HA(s) {
        return s.startsWith("data:application/octet-stream;base64,");
      }
      var gA;
      if (gA = "data:application/octet-stream;base64,AGFzbQEAAAABugM3YAF/AGACf38AYAF/AX9gA39/fwBgAn98AGACf38Bf2ADf39/AX9gBH9/f30BfWADf398AGAAAGAEf39/fwBgAX8BfGACf38BfGAFf39/f38Bf2AAAX9gA39/fwF9YAZ/f31/fX8AYAV/f39/fwBgAn9/AX1gBX9/f319AX1gAX8BfWADf35/AX5gB39/f39/f38AYAZ/f39/f38AYAR/f39/AX9gBn9/f319fQF9YAR/f31/AGADf399AX1gBn98f39/fwF/YAR/fHx/AGACf30AYAh/f39/f39/fwBgDX9/f39/f39/f39/f38AYAp/f39/f39/f39/AGAFf39/f38BfGAEfHx/fwF9YA1/fX1/f399fX9/f39/AX9gB39/f319f38AYAJ+fwF/YAN/fX0BfWABfAF8YAN/fHwAYAR/f319AGAHf39/fX19fQF9YA1/fX99f31/fX19fX1/AX9gC39/f39/f399fX19AX9gCH9/f39/f319AGAEf39+fgBgB39/f39/f38Bf2ACfH8BfGAFf398fH8AYAN/f38BfGAEf39/fABgA39/fQBgBn9/fX99fwF/ArUBHgFhAWEAHwFhAWIAAwFhAWMACQFhAWQAFgFhAWUAEQFhAWYAIAFhAWcAAAFhAWgAIQFhAWkAAwFhAWoAAAFhAWsAFwFhAWwACgFhAW0ABQFhAW4AAwFhAW8AAQFhAXAAFwFhAXEABgFhAXIAAAFhAXMAIgFhAXQACgFhAXUADQFhAXYAFgFhAXcAAgFhAXgAAwFhAXkAGAFhAXoAAgFhAUEAAQFhAUIAEQFhAUMAAQFhAUQAAAOiAqACAgMSBwcACRkDAAoRBgYKEwAPDxMBBiMTCgcHGgMUASQFJRQHAwMKCgMmAQYYDxobFAAKBw8KBwMDAgkCAAAFGwACBwIHBgIDAQMIDAABKAkHBQURACkZASoAAAIrLAIALQcHBy4HLwkFCgMCMA0xAgMJAgACAQYKAQIBBQEACQIFAQEABQAODQ0GFQIBHBUGAgkCEAAAAAUyDzMMBQYINAUCAwUODg41AgMCAgIDBgICNgIBDAwMAQsLCwsLCx0CAAIAAAABABABBQICAQMCEgMMCwEBAQEBAQsLAQICAwICAgICAgIDAgIICAEICAgEBAQEBAQEBAQABAQABAQEBAAE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GiABQQA2AvADIAFCADcC6AMgAigC7AMiAyACKALoAyIERwRAIAMgBGsiBEEASA0FIAEgBBAeIgM2AuwDIAEgAzYC6AMgASADIARqNgLwAyACKALoAyIEIAIoAuwDIghHBEADQCADIAQoAgA2AgAgA0EEaiEDIARBBGoiBCAIRw0ACwsgASADNgLsAwsgASACKQL0AzcC9AMgASACKAKEBDYChAQgASACKQL8AzcC/AMgAUEANgLkAwsgBSABNgIAIAEgADYC5AMLIAZBAWohBiAFQQRqIgUgB0cNAAsLDwsQAgALUAACQAJAAkACQAJAIAIOBAQAAQIDCyAAIAEgAUEwahBDDwsgACABIAFBMGogAxBEDwsgACABIAFBMGoQQg8LECQACyAAIAEgAUEwaiADEEULcAIBfwF9IwBBEGsiBCQAIARBCGogACABQQJ0QdwlaigCACACEDZDAADAfyEFAkACQAJAIAQtAAxBAWsOAgABAgsgBCoCCCEFDAELIAQqAgggA5RDCtcjPJQhBQsgBEEQaiQAIAVDAAAAACAFIAVbGwt5AgF/AX0jAEEQayIDJAAgA0EIaiAAIAFBAnRB7CVqKAIAIAIQU0MAAMB/IQQCQAJAAkAgAy0ADEEBaw4CAAECCyADKgIIIQQMAQsgAyoCCEMAAAAAlEMK1yM8lCEECyADQRBqJAAgBEMAAAAAl0MAAAAAIAQgBFsbC1QAAkACQAJAAkACQCACDgQEAAECAwsgACABIAFBwgBqEEMPCyAAIAEgAUHCAGogAxBEDwsgACABIAFBwgBqEEIPCxAkAAsgACABIAFBwgBqIAMQRQsvACAAIAJFQQF0IgIgASADEGAgACACIAEQS5IgACACIAEgAxB/IAAgAiABEFKSkgvOAQIDfwJ9IwBBEGsiAyQAQQEhBCADQQhqIABB/ABqIgUgACABQQF0akH2AGoiAS8BABAfAkACQCADKgIIIgcgAioCACIGXARAIAcgB1sEQCACLQAEIQIMAgsgBiAGXCEECyACLQAEIQIgBEUNACADLQAMIAJB/wFxRg0BCyAFIAEgBiACEDkDQCAALQAAIgFBBHENASAAIAFBBHI6AAAgACgCECIBBEAgACABEQAACyAAQYCAgP4HNgKcASAAKALkAyIADQALCyADQRBqJAALzgECA38CfSMAQRBrIgMk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AWsOAgABAgsgBCoCCCEFDAELIAQqAgggA5RDCtcjPJQhBQsgBEEQaiQAIAVDAAAAACAFIAVbGwscACAAIAFBCCACpyACQiCIpyADpyADQiCIpxAVCwUAEFgACzkAIABFBEBBAA8LAn8gAUGAf3FBgL8DRiABQf8ATXJFBEBB/DtBGTYCAEF/DAELIAAgAToAAEEBCwvEAgACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCABQQlrDhIACgsMCgsCAwQFDAsMDAoLBwgJCyACIAIoAgAiAUEEajYCACAAIAEoAgA2AgAPCwALIAIgAigCACIBQQRqNgIAIAAgATIBADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATMBADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATAAADcDAA8LIAIgAigCACIBQQRqNgIAIAAgATEAADcDAA8LAAsgAiACKAIAQQdqQXhxIgFBCGo2AgAgACABKwMAOQMADwsgACACIAMRAQALDwsgAiACKAIAIgFBBGo2AgAgACABNAIANwMADwsgAiACKAIAIgFBBGo2AgAgACABNQIANwMADwsgAiACKAIAQQdqQXhxIgFBCGo2AgAgACABKQMANwMAC84BAgN/An0jAEEQayIDJABBASEEIANBCGogAEH8AGoiBSAAIAFBAXRqQegAaiIBLwEAEB8CQAJAIAMqAggiByACKgIAIgZcBEAgByAHWwRAIAItAAQhAgwCCyAGIAZcIQQLIAItAAQhAiAERQ0AIAMtAAwgAkH/AXFGDQELIAUgASAGIAIQOQNAIAAtAAAiAUEEcQ0BIAAgAUEEcjoAACAAKAIQIgEEQCAAIAERAAALIABBgICA/gc2ApwBIAAoAuQDIgANAAsLIANBEGokAAtdAQR/IAAoAgAhAgNAIAIsAAAiAxBXBEBBfyEEIAAgAkEBaiICNgIAIAFBzJmz5gBNBH9BfyADQTBrIgMgAUEKbCIEaiADIARB/////wdzShsFIAQLIQEMAQsLIAELrhQCEn8BfiMAQdAAayIIJAAgCCABNgJMIAhBN2ohFyAIQThqIRQCQAJAAkACQANAIAEhDSAHIA5B/////wdzSg0BIAcgDmohDgJAAkACQCANIgctAAAiCQRAA0ACQAJAIAlB/wFxIgFFBEAgByEBDAELIAFBJUcNASAH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IQEgAEIANwIEIAAgATYCACABIAA2AgQgAkEQaiQAIAALGwEBfyAABEAgACgCACIBBEAgARAjCyAAECMLC0kBAn9BBBAeIQFBIBAeIgBBADYCHCAAQoCAgICAgIDAPzcCFCAAQgA3AgwgAEEAOgAIIABBAzYCBCAAQQA2AgAgASAANgIAIAELIAAgAkEFR0EAIAIbRQRAQbgwIAMgBBBJDwsgAyAEEHALIgEBfiABIAKtIAOtQiCGhCAEIAARFQAiBUIgiKckASAFpwuoAQEFfyAAKAJUIgMoAgAhBSADKAIEIgQgACgCFCAAKAIcIgdrIgYgBCAGSRsiBgRAIAUgByAGECsaIAMgAygCACAGaiIFNgIAIAMgAygCBCAGayIENgIECyAEIAIgAiAESxsiBARAIAUgASAEECsaIAMgAygCACAEaiIFNgIAIAMgAygCBCAEazYCBAsgBUEAOgAAIAAgACgCLCIBNgIcIAAgATYCFCACCwQAQgALBABBAAuKBQIGfgJ/IAEgASgCAEEHakF4cSIBQRBqNgIAIAAhCSABKQMAIQMgASkDCCEGIwBBIGsiCCQAAkAgBkL///////////8AgyIEQoCAgICAgMCAPH0gBEKAgICAgIDA/8MAfVQEQCAGQgSGIANCPIiEIQQgA0L//////////w+DIgNCgYCAgICAgIAIWgRAIARCgYCAgICAgIDAAHwhAgwCCyAEQoCAgICAgICAQH0hAiADQoCAgICAgICACFINASACIARCAYN8IQIMAQsgA1AgBEKAgICAgIDA//8AVCAEQoCAgICAgMD//wBRG0UEQCAGQgSGIANCPIiEQv////////8Dg0KAgICAgICA/P8AhCECDAELQoCAgICAgID4/wAhAiAEQv///////7//wwBWDQBCACECIARCMIinIgBBkfcASQ0AIAMhAiAGQv///////z+DQoCAgICAgMAAhCIFIQcCQCAAQYH3AGsiAUHAAHEEQCACIAFBQGqthiEHQgAhAgwBCyABRQ0AIAcgAa0iBIYgAkHAACABa62IhCEHIAIgBIYhAgsgCCACNwMQIAggBzcDGAJAQYH4ACAAayIAQcAAcQRAIAUgAEFAaq2IIQNCACEFDAELIABFDQAgBUHAACAAa62GIAMgAK0iAoiEIQMgBSACiCEFCyAIIAM3AwAgCCAF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ASAAKAIAIQAgASACQQFxBH8gASgCACAAaigCAAUgAAsRCwALYQECfyMAQRBrIgIkACABIAAoAgQiA0EBdWohASAAKAIAIQAgAiABIANBAXEEfyABKAIAIABqKAIABSAACxEBAEEQEB4iACACKQMINwMIIAAgAikDADcDACACQRBqJAAgAAtjAQJ/IwBBEGsiAyQAIAEgACgCBCIEQQF1aiEBIAAoAgAhACADIAEgAiAEQQFxBH8gASgCACAAaigCAAUgAAsRAwBBEBAeIgAgAykDCDcDCCAAIAMpAwA3AwAgA0EQaiQAIAALNwEBfyABIAAoAgQiA0EBdWohASAAKAIAIQAgASACIANBAXEEfyABKAIAIABqKAIABSAACxEEAAs5AQF/IAEgACgCBCIEQQF1aiEBIAAoAgAhACABIAIgAyAEQQFxBH8gASgCACAAaigCAAUgAAsRCAALCQAgASAAEQIACwUAQcM7Cw8AIAEgACgCAGogAjYCAAsNACABIAAoAgBqKAIACxgBAX9BEBAeIgBCADcDCCAAQQA2AgAgAAsYAQF/QRAQHiIAQgA3AwAgAEIANwMIIAALDABBMBAeQQBBMBAqCzcBAX8gASAAKAIEIgNBAXVqIQEgACgCACEAIAEgAiADQQFxBH8gASgCACAAaigCAAUgAAsRHgALBQBBvjsLIQAgACABKAIAIAEgASwAC0EASBtBuzsgAigCABAQNgIACyoBAX9BDBAeIgFBADoABCABIAAoAgA2AgggAEEANgIAIAFB2Cc2AgAgAQsFAEG7OwsFAEG4OwshACAAIAEoAgAgASABLAALQQBIG0GkOyACKAIAEBA2AgAL2AEBBH8jAEEgayIDJAAgASgCACIEQfD///8HSQRAAkACQCAEQQtPBEAgBEEPckEBaiIFEB4hBiADIAVBgICAgHhyNgIQIAMgBjYCCCADIAQ2AgwgBCAGaiEFDAELIAMgBDoAEyADQQhqIgYgBGohBSAERQ0BCyAGIAFBBGogBBArGgsgBUEAOgAAIAMgAjYCACADQRhqIANBCGogAyAAEQMAIAMoAhgQHSADKAIYIgAQBiADKAIAEAYgAywAE0EASARAIAMoAggQIwsgA0EgaiQAIAAPCxACAAsqAQF/QQwQHiIBQQA6AAQgASAAKAIANgIIIABBADYCACABQeAmNgIA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AkEIaiAIIAYQHyACIAcgAC8AABAfQQEhAyACKgIIIgogAioCACILXAR/IAogClsNAyALIAtcBSADC0UNAiACLQAMIAItAARHDQILIABBAmohAEEBIQMgBCEGQQEhBCAGRQ0ACyABLwB6IgBBB3FFBEAgBS0AekEHcUUNAgsgCCAAECAiCiAHIAUvAHoQICILWw0BIAogClsNACALIAtcDQELIAFBFGogBUEUakHoABArGiABQfwAaiAFQfwAahCgAQNAIAEtAAAiAEEEcQ0BIAEgAEEEcjoAACABKAIQIgAEQCABIAARAAALIAFBgICA/gc2ApwBIAEoAuQDIgENAAsLIAJBEGokAAvGAwEEfyMAQaAEayICJAAgACgCBCEBIABBADYCBCABBEAgASABKAIAKAIEEQAACyAAKAIIIQEgAEEANgIIIAEEQCABIAEoAgAoAgQRAAALAkAgACgCACIAKALoAyAAKALsA0YEQCAAKALkAw0BIAAgAkEYaiAAKAL0AxBcIgEpAgA3AgAgACABKAIQNgIQIAAgASkCCDcCCCAAQRRqIAFBFGpB6AAQKxogACABKQKMATcCjAEgACABKQKEATcChAEgACABKQJ8NwJ8IAEoApQBIQQgAUEANgKUASAAKAKUASEDIAAgBDYClAEgAwRAIAMQWwsgAEGYAWogAUGYAWpB0AIQKxogACgC6AMiAwRAIAAgAzYC7AMgAxAjCyAAIAEoAugDNgLoAyAAIAEoAuwDNgLsAyAAIAEoAvADNgLwAyABQQA2AvADIAFCADcC6AMgACABKQL8AzcC/AMgACABKQL0AzcC9AMgACABKAKEBDYChAQgASgClAEhACABQQA2ApQBIAAEQCAAEFsLIAJBoARqJAAPCyACQfAcNgIQIABBBUHYJSACQRBqECwQJAALIAJB5hE2AgAgAEEFQdglIAIQLBAkAAsLAEEMEB4gABCiAQsLAEEMEB5BABCiAQsNACAAKAIALQAIQQFxCwoAIAAoAgAoAhQLGQAgAUH/AXEEQBACAAsgACgCACgCEEEBcQsYACAAKAIAIgAgAC0ACEH+AXEgAXI6AAgLJgAgASAAKAIAIgAoAhRHBEAgACABNgIUIAAgACgCDEEBajYCDAsLkgEBAn8jAEEQayICJAAgACgCACEAIAFDAAAAAGAEQCABIAAqAhhcBEAgACABOAIYIAAgACgCDEEBajYCDAsgAkEQaiQADwsgAkGIFDYCACMAQRBrIgMkACADIAI2AgwCQCAARQRAQbgwQdglIAIQSRoMAQsgAEEAQQVB2CUgAiAAKAIEEQ0AGgsgA0EQaiQAECQACz8AIAFB/wFxRQRAIAIgACgCACIAKAIQIgFBAXFHBEAgACABQX5xIAJyNgIQIAAgACgCDEEBajYCDAsPCxACAAsL4CYjAEGACAuBHk9ubHkgbGVhZiBub2RlcyB3aXRoIGN1c3RvbSBtZWFzdXJlIGZ1bmN0aW9ucyBzaG91bGQgbWFudWFsbHkgbWFyayB0aGVtc2VsdmVzIGFzIGRpcnR5AGlzRGlydHkAbWFya0RpcnR5AGRlc3Ryb3kAc2V0RGlzcGxheQBnZXREaXNwbGF5AHNldEZsZXgALSsgICAwWDB4AC0wWCswWCAwWC0weCsweCAweABzZXRGbGV4R3JvdwBnZXRGbGV4R3JvdwBzZXRPdmVyZmxvdwBnZXRPdmVyZmxvdwBoYXNOZXdMYXlvdXQAY2FsY3VsYXRlTGF5b3V0AGdldENvbXB1dGVkTGF5b3V0AHVuc2lnbmVkIHNob3J0AGdldENoaWxkQ291bnQAdW5zaWduZWQgaW50AHNldEp1c3RpZnlDb250ZW50AGdldEp1c3RpZnlDb250ZW50AGF2YWlsYWJsZUhlaWdodCBpcyBpbmRlZmluaXRlIHNvIGhlaWdodFNpemluZ01vZGUgbXVzdCBiZSBTaXppbmdNb2RlOjpNYXhDb250ZW50AGF2YWlsYWJsZVdpZHRoIGlzIGluZGVmaW5pdGUgc28gd2lkdGhTaXppbmdNb2RlIG11c3QgYmUgU2l6aW5nTW9kZTo6TWF4Q29udGVudABzZXRBbGlnbkNvbnRlbnQAZ2V0QWxpZ25Db250ZW50AGdldFBhcmVudABpbXBsZW1lbnQAc2V0TWF4SGVpZ2h0UGVyY2VudABzZXRIZWlnaHRQZXJjZW50AHNldE1pbkhlaWdodFBlcmNlbnQAc2V0RmxleEJhc2lzUGVyY2VudABzZXRHYXBQZXJjZW50AHNldFBvc2l0aW9uUGVyY2VudABzZXRNYXJnaW5QZXJjZW50AHNldE1heFdpZHRoUGVyY2VudABzZXRXaWR0aFBlcmNlbnQAc2V0TWluV2lkdGhQZXJjZW50AHNldFBhZGRpbmdQZXJjZW50AGhhbmRsZS50eXBlKCkgPT0gU3R5bGVWYWx1ZUhhbmRsZTo6VHlwZTo6UG9pbnQgfHwgaGFuZGxlLnR5cGUoKSA9PSBTdHlsZVZhbHVlSGFuZGxlOjpUeXBlOjpQZXJjZW50AGNyZWF0ZURlZmF1bHQAdW5pdAByaWdodABoZWlnaHQAc2V0TWF4SGVpZ2h0AGdldE1heEhlaWdodABzZXRIZWlnaHQAZ2V0SGVpZ2h0AHNldE1pbkhlaWdodABnZXRNaW5IZWlnaHQAZ2V0Q29tcHV0ZWRIZWlnaHQAZ2V0Q29tcHV0ZWRSaWdodABsZWZ0AGdldENvbXB1dGVkTGVmdAByZXNldABfX2Rlc3RydWN0AGZsb2F0AHVpbnQ2NF90AHVzZVdlYkRlZmF1bHRzAHNldFVzZVdlYkRlZmF1bHRzAHNldEFsaWduSXRlbXMAZ2V0QWxpZ25JdGVtcwBzZXRGbGV4QmFzaXMAZ2V0RmxleEJhc2lzAENhbm5vdCBnZXQgbGF5b3V0IHByb3BlcnRpZXMgb2YgbXVsdGktZWRnZSBzaG9ydGhhbmRzAHNldFBvaW50U2NhbGVGYWN0b3IATWVhc3VyZUNhbGxiYWNrV3JhcHBlcgBEaXJ0aWVkQ2FsbGJhY2tXcmFwcGVyAENhbm5vdCByZXNldCBhIG5vZGUgc3RpbGwgYXR0YWNoZWQgdG8gYSBvd25lcgBzZXRCb3JkZXIAZ2V0Qm9yZGVyAGdldENvbXB1dGVkQm9yZGVyAGdldE51bWJlcgBoYW5kbGUudHlwZSgpID09IFN0eWxlVmFsdWVIYW5kbGU6OlR5cGU6Ok51bWJlcgB1bnNpZ25lZCBjaGFyAHRvcABnZXRDb21wdXRlZFRvcABzZXRGbGV4V3JhcABnZXRGbGV4V3JhcABzZXRHYXAAZ2V0R2FwACVwAHNldEhlaWdodEF1dG8Ac2V0RmxleEJhc2lzQXV0bwBzZXRQb3NpdGlvbkF1dG8Ac2V0TWFyZ2luQXV0bwBzZXRXaWR0aEF1dG8AU2NhbGUgZmFjdG9yIHNob3VsZCBub3QgYmUgbGVzcyB0aGFuIHplcm8Ac2V0QXNwZWN0UmF0aW8AZ2V0QXNwZWN0UmF0aW8Ac2V0UG9zaXRpb24AZ2V0UG9zaXRpb24Abm90aWZ5T25EZXN0cnVjdGlvbgBzZXRGbGV4RGlyZWN0aW9uAGdldEZsZXhEaXJlY3Rpb24Ac2V0RGlyZWN0aW9uAGdldERpcmVjdGlvbgBzZXRNYXJnaW4AZ2V0TWFyZ2luAGdldENvbXB1dGVkTWFyZ2luAG1hcmtMYXlvdXRTZWVuAG5hbgBib3R0b20AZ2V0Q29tcHV0ZWRCb3R0b20AYm9vbABlbXNjcmlwdGVuOjp2YWwAc2V0RmxleFNocmluawBnZXRGbGV4U2hyaW5rAHNldEFsd2F5c0Zvcm1zQ29udGFpbmluZ0Jsb2NrAE1lYXN1cmVDYWxsYmFjawBEaXJ0aWVkQ2FsbGJhY2sAZ2V0TGVuZ3RoAHdpZHRoAHNldE1heFdpZHRoAGdldE1heFdpZHRoAHNldFdpZHRoAGdldFdpZHRoAHNldE1pbldpZHRoAGdldE1pbldpZHRoAGdldENvbXB1dGVkV2lkdGgAcHVzaAAvaG9tZS9ydW5uZXIvd29yay95b2dhL3lvZ2EvamF2YXNjcmlwdC8uLi95b2dhL3N0eWxlL1NtYWxsVmFsdWVCdWZmZXIuaAAvaG9tZS9ydW5uZXIvd29yay95b2dhL3lvZ2EvamF2YXNjcmlwdC8uLi95b2dhL3N0eWxlL1N0eWxlVmFsdWVQb29sLmgAdW5zaWduZWQgbG9uZwBzZXRCb3hTaXppbmcAZ2V0Qm94U2l6aW5nAHN0ZDo6d3N0cmluZwBzdGQ6OnN0cmluZwBzdGQ6OnUxNnN0cmluZwBzdGQ6OnUzMnN0cmluZwBzZXRQYWRkaW5nAGdldFBhZGRpbmcAZ2V0Q29tcHV0ZWRQYWRkaW5nAFRyaWVkIHRvIGNvbnN0cnVjdCBZR05vZGUgd2l0aCBudWxsIGNvbmZpZwBBdHRlbXB0aW5nIHRvIGNvbnN0cnVjdCBOb2RlIHdpdGggbnVsbCBjb25maWcAY3JlYXRlV2l0aENvbmZpZwBpbmYAc2V0QWxpZ25TZWxmAGdldEFsaWduU2VsZgBTaXplAHZhbHVlAFZhbHVlAGNyZWF0ZQBtZWFzdXJlAHNldFBvc2l0aW9uVHlwZQBnZXRQb3NpdGlvblR5cGUAaXNSZWZlcmVuY2VCYXNlbGluZQBzZXRJc1JlZmVyZW5jZUJhc2VsaW5lAGNvcHlTdHlsZQBkb3VibGUATm9kZQBleHRlbmQAaW5zZXJ0Q2hpbGQAZ2V0Q2hpbGQAcmVtb3ZlQ2hpbGQAdm9pZABzZXRFeHBlcmltZW50YWxGZWF0dXJlRW5hYmxlZABpc0V4cGVyaW1lbnRhbEZlYXR1cmVFbmFibGVkAGRpcnRpZWQAQ2Fubm90IHJlc2V0IGEgbm9kZSB3aGljaCBzdGlsbCBoYXMgY2hpbGRyZW4gYXR0YWNoZWQAdW5zZXRNZWFzdXJlRnVuYwB1bnNldERpcnRpZWRGdW5jAHNldEVycmF0YQBnZXRFcnJhdGEATWVhc3VyZSBmdW5jdGlvbiByZXR1cm5lZCBhbiBpbnZhbGlkIGRpbWVuc2lvbiB0byBZb2dhOiBbd2lkdGg9JWYsIGhlaWdodD0lZl0ARXhwZWN0IGN1c3RvbSBiYXNlbGluZSBmdW5jdGlvbiB0byBub3QgcmV0dXJuIE5hTgBOQU4ASU5GAGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHNob3J0PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1bnNpZ25lZCBzaG9ydD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1bnNpZ25lZCBpbnQ+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PGZsb2F0PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50OF90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxpbnQ4X3Q+AGVtc2NyaXB0ZW46Om1lbW9yeV92aWV3PHVpbnQxNl90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzxpbnQxNl90PgBlbXNjcmlwdGVuOjptZW1vcnlfdmlldzx1aW50MzJfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8aW50MzJfdD4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8Y2hhcj4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8dW5zaWduZWQgY2hhcj4Ac3RkOjpiYXNpY19zdHJpbmc8dW5zaWduZWQgY2hhcj4AZW1zY3JpcHRlbjo6bWVtb3J5X3ZpZXc8c2lnbmVk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", !HA(gA)) {
        var pA = gA;
        gA = t.locateFile ? t.locateFile(pA, o) : o + pA;
      }
      function RA() {
        var s = gA;
        try {
          if (s == gA && c) return new Uint8Array(c);
          if (HA(s)) try {
            var a = Fn(s.slice(37)), I = new Uint8Array(a.length);
            for (s = 0; s < a.length; ++s) I[s] = a.charCodeAt(s);
            var l = I;
          } catch {
            throw Error("Converting base64 string to bytes failed.");
          }
          else l = void 0;
          var f = l;
          if (f) return f;
          throw "both async and sync fetching of the wasm failed";
        } catch (Q) {
          V(Q);
        }
      }
      function ae() {
        return c || typeof fetch != "function" ? Promise.resolve().then(function() {
          return RA();
        }) : fetch(gA, { credentials: "same-origin" }).then(function(s) {
          if (!s.ok) throw "failed to load wasm binary file at '" + gA + "'";
          return s.arrayBuffer();
        }).catch(function() {
          return RA();
        });
      }
      function OA(s) {
        for (; 0 < s.length; ) s.shift()(t);
      }
      function ge(s) {
        if (s === void 0) return "_unknown";
        s = s.replace(/[^a-zA-Z0-9_]/g, "$");
        var a = s.charCodeAt(0);
        return 48 <= a && 57 >= a ? "_" + s : s;
      }
      function hA(s, a) {
        return s = ge(s), function() {
          return a.apply(this, arguments);
        };
      }
      var W = [{}, { value: void 0 }, { value: null }, { value: true }, { value: false }], vA = [];
      function FA(s) {
        var a = Error, I = hA(s, function(l) {
          this.name = s, this.message = l, l = Error(l).stack, l !== void 0 && (this.stack = this.toString() + `
` + l.replace(/^Error(:[^\n]*)?\n/, ""));
        });
        return I.prototype = Object.create(a.prototype), I.prototype.constructor = I, I.prototype.toString = function() {
          return this.message === void 0 ? this.name : this.name + ": " + this.message;
        }, I;
      }
      var TA = void 0;
      function U(s) {
        throw new TA(s);
      }
      var XA = (s) => (s || U("Cannot use deleted val. handle = " + s), W[s].value), me = (s) => {
        switch (s) {
          case void 0:
            return 1;
          case null:
            return 2;
          case true:
            return 3;
          case false:
            return 4;
          default:
            var a = vA.length ? vA.pop() : W.length;
            return W[a] = { ga: 1, value: s }, a;
        }
      }, ot = void 0, Ue = void 0;
      function rA(s) {
        for (var a = ""; S[s]; ) a += Ue[S[s++]];
        return a;
      }
      var MA = [];
      function be() {
        for (; MA.length; ) {
          var s = MA.pop();
          s.M.$ = false, s.delete();
        }
      }
      var re = void 0, kA = {};
      function ye(s, a) {
        for (a === void 0 && U("ptr should not be undefined"); s.R; ) a = s.ba(a), s = s.R;
        return a;
      }
      var VA = {};
      function Re(s) {
        s = Gt(s);
        var a = rA(s);
        return JA(s), a;
      }
      function ue(s, a) {
        var I = VA[s];
        return I === void 0 && U(a + " has unknown type " + Re(s)), I;
      }
      function ZA() {
      }
      var KA = false;
      function xe(s) {
        --s.count.value, s.count.value === 0 && (s.T ? s.U.W(s.T) : s.P.N.W(s.O));
      }
      function Ie(s, a, I) {
        return a === I ? s : I.R === void 0 ? null : (s = Ie(s, a, I.R), s === null ? null : I.na(s));
      }
      var we = {};
      function Ve(s, a) {
        return a = ye(s, a), kA[a];
      }
      var ze = void 0;
      function ne(s) {
        throw new ze(s);
      }
      function jA(s, a) {
        return a.P && a.O || ne("makeClassHandle requires ptr and ptrType"), !!a.U != !!a.T && ne("Both smartPtrType and smartPtr must be specified"), a.count = { value: 1 }, bA(Object.create(s, { M: { value: a } }));
      }
      function bA(s) {
        return typeof FinalizationRegistry > "u" ? (bA = (a) => a, s) : (KA = new FinalizationRegistry((a) => {
          xe(a.M);
        }), bA = (a) => {
          var I = a.M;
          return I.T && KA.register(a, { M: I }, a), a;
        }, ZA = (a) => {
          KA.unregister(a);
        }, bA(s));
      }
      var le = {};
      function Z(s) {
        for (; s.length; ) {
          var a = s.pop();
          s.pop()(a);
        }
      }
      function $(s) {
        return this.fromWireType(x[s >> 2]);
      }
      var oA = {}, nA = {};
      function iA(s, a, I) {
        function l(p) {
          p = I(p), p.length !== s.length && ne("Mismatched type converter count");
          for (var w = 0; w < s.length; ++w) AA(s[w], p[w]);
        }
        s.forEach(function(p) {
          nA[p] = a;
        });
        var f = Array(a.length), Q = [], h = 0;
        a.forEach((p, w) => {
          VA.hasOwnProperty(p) ? f[w] = VA[p] : (Q.push(p), oA.hasOwnProperty(p) || (oA[p] = []), oA[p].push(() => {
            f[w] = VA[p], ++h, h === Q.length && l(f);
          }));
        }), Q.length === 0 && l(f);
      }
      function sA(s) {
        switch (s) {
          case 1:
            return 0;
          case 2:
            return 1;
          case 4:
            return 2;
          case 8:
            return 3;
          default:
            throw new TypeError("Unknown type size: " + s);
        }
      }
      function AA(s, a, I = {}) {
        if (!("argPackAdvance" in a)) throw new TypeError("registerType registeredInstance requires argPackAdvance");
        var l = a.name;
        if (s || U('type "' + l + '" must have a positive integer typeid pointer'), VA.hasOwnProperty(s)) {
          if (I.ua) return;
          U("Cannot register type '" + l + "' twice");
        }
        VA[s] = a, delete nA[s], oA.hasOwnProperty(s) && (a = oA[s], delete oA[s], a.forEach((f) => f()));
      }
      function uA(s) {
        U(s.M.P.N.name + " instance already deleted");
      }
      function X() {
      }
      function YA(s, a, I) {
        if (s[a].S === void 0) {
          var l = s[a];
          s[a] = function() {
            return s[a].S.hasOwnProperty(arguments.length) || U("Function '" + I + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + s[a].S + ")!"), s[a].S[arguments.length].apply(this, arguments);
          }, s[a].S = [], s[a].S[l.Z] = l;
        }
      }
      function aA(s, a) {
        t.hasOwnProperty(s) ? (U("Cannot register public name '" + s + "' twice"), YA(t, s, s), t.hasOwnProperty(void 0) && U("Cannot register multiple overloads of a function with the same number of arguments (undefined)!"), t[s].S[void 0] = a) : t[s] = a;
      }
      function De(s, a, I, l, f, Q, h, p) {
        this.name = s, this.constructor = a, this.X = I, this.W = l, this.R = f, this.pa = Q, this.ba = h, this.na = p, this.ja = [];
      }
      function LA(s, a, I) {
        for (; a !== I; ) a.ba || U("Expected null or instance of " + I.name + ", got an instance of " + a.name), s = a.ba(s), a = a.R;
        return s;
      }
      function ce(s, a) {
        return a === null ? (this.ea && U("null is not a valid " + this.name), 0) : (a.M || U('Cannot pass "' + Ae(a) + '" as a ' + this.name), a.M.O || U("Cannot pass deleted object as a pointer of type " + this.name), LA(a.M.O, a.M.P.N, this.N));
      }
      function Ze(s, a) {
        if (a === null) {
          if (this.ea && U("null is not a valid " + this.name), this.da) {
            var I = this.fa();
            return s !== null && s.push(this.W, I), I;
          }
          return 0;
        }
        if (a.M || U('Cannot pass "' + Ae(a) + '" as a ' + this.name), a.M.O || U("Cannot pass deleted object as a pointer of type " + this.name), !this.ca && a.M.P.ca && U("Cannot convert argument of type " + (a.M.U ? a.M.U.name : a.M.P.name) + " to parameter type " + this.name), I = LA(a.M.O, a.M.P.N, this.N), this.da) switch (a.M.T === void 0 && U("Passing raw pointer to smart pointer is illegal"), this.Ba) {
          case 0:
            a.M.U === this ? I = a.M.T : U("Cannot convert argument of type " + (a.M.U ? a.M.U.name : a.M.P.name) + " to parameter type " + this.name);
            break;
          case 1:
            I = a.M.T;
            break;
          case 2:
            if (a.M.U === this) I = a.M.T;
            else {
              var l = a.clone();
              I = this.xa(I, me(function() {
                l.delete();
              })), s !== null && s.push(this.W, I);
            }
            break;
          default:
            U("Unsupporting sharing policy");
        }
        return I;
      }
      function Be(s, a) {
        return a === null ? (this.ea && U("null is not a valid " + this.name), 0) : (a.M || U('Cannot pass "' + Ae(a) + '" as a ' + this.name), a.M.O || U("Cannot pass deleted object as a pointer of type " + this.name), a.M.P.ca && U("Cannot convert argument of type " + a.M.P.name + " to parameter type " + this.name), LA(a.M.O, a.M.P.N, this.N));
      }
      function z(s, a, I, l) {
        this.name = s, this.N = a, this.ea = I, this.ca = l, this.da = false, this.W = this.xa = this.fa = this.ka = this.Ba = this.wa = void 0, a.R !== void 0 ? this.toWireType = Ze : (this.toWireType = l ? ce : Be, this.V = null);
      }
      function GA(s, a) {
        t.hasOwnProperty(s) || ne("Replacing nonexistant public symbol"), t[s] = a, t[s].Z = void 0;
      }
      function fe(s, a) {
        var I = [];
        return function() {
          if (I.length = 0, Object.assign(I, arguments), s.includes("j")) {
            var l = t["dynCall_" + s];
            l = I && I.length ? l.apply(null, [a].concat(I)) : l.call(null, a);
          } else l = q.get(a).apply(null, I);
          return l;
        };
      }
      function QA(s, a) {
        s = rA(s);
        var I = s.includes("j") ? fe(s, a) : q.get(a);
        return typeof I != "function" && U("unknown function pointer with signature " + s + ": " + a), I;
      }
      var Ne = void 0;
      function xA(s, a) {
        function I(Q) {
          f[Q] || VA[Q] || (nA[Q] ? nA[Q].forEach(I) : (l.push(Q), f[Q] = true));
        }
        var l = [], f = {};
        throw a.forEach(I), new Ne(s + ": " + l.map(Re).join([", "]));
      }
      function PA(s, a, I, l, f) {
        var Q = a.length;
        2 > Q && U("argTypes array size mismatch! Must at least get return value and 'this' types!");
        var h = a[1] !== null && I !== null, p = false;
        for (I = 1; I < a.length; ++I) if (a[I] !== null && a[I].V === void 0) {
          p = true;
          break;
        }
        var w = a[0].name !== "void", y = Q - 2, v = Array(y), N = [], P = [];
        return function() {
          if (arguments.length !== y && U("function " + s + " called with " + arguments.length + " arguments, expected " + y + " args!"), P.length = 0, N.length = h ? 2 : 1, N[0] = f, h) {
            var eA = a[1].toWireType(P, this);
            N[1] = eA;
          }
          for (var K = 0; K < y; ++K) v[K] = a[K + 2].toWireType(P, arguments[K]), N.push(v[K]);
          if (K = l.apply(null, N), p) Z(P);
          else for (var fA = h ? 1 : 2; fA < a.length; fA++) {
            var DA = fA === 1 ? eA : v[fA - 2];
            a[fA].V !== null && a[fA].V(DA);
          }
          return eA = w ? a[0].fromWireType(K) : void 0, eA;
        };
      }
      function _A(s, a) {
        for (var I = [], l = 0; l < s; l++) I.push(k[a + 4 * l >> 2]);
        return I;
      }
      function $A(s) {
        4 < s && --W[s].ga === 0 && (W[s] = void 0, vA.push(s));
      }
      function Ae(s) {
        if (s === null) return "null";
        var a = typeof s;
        return a === "object" || a === "array" || a === "function" ? s.toString() : "" + s;
      }
      function Et(s, a) {
        switch (a) {
          case 2:
            return function(I) {
              return this.fromWireType(F[I >> 2]);
            };
          case 3:
            return function(I) {
              return this.fromWireType(G[I >> 3]);
            };
          default:
            throw new TypeError("Unknown float type: " + s);
        }
      }
      function Qt(s, a, I) {
        switch (a) {
          case 0:
            return I ? function(l) {
              return D[l];
            } : function(l) {
              return S[l];
            };
          case 1:
            return I ? function(l) {
              return b[l >> 1];
            } : function(l) {
              return L[l >> 1];
            };
          case 2:
            return I ? function(l) {
              return x[l >> 2];
            } : function(l) {
              return k[l >> 2];
            };
          default:
            throw new TypeError("Unknown integer type: " + s);
        }
      }
      function Ct(s, a) {
        for (var I = "", l = 0; !(l >= a / 2); ++l) {
          var f = b[s + 2 * l >> 1];
          if (f == 0) break;
          I += String.fromCharCode(f);
        }
        return I;
      }
      function wn(s, a, I) {
        if (I === void 0 && (I = 2147483647), 2 > I) return 0;
        I -= 2;
        var l = a;
        I = I < 2 * s.length ? I / 2 : s.length;
        for (var f = 0; f < I; ++f) b[a >> 1] = s.charCodeAt(f), a += 2;
        return b[a >> 1] = 0, a - l;
      }
      function Dn(s) {
        return 2 * s.length;
      }
      function Sn(s, a) {
        for (var I = 0, l = ""; !(I >= a / 4); ) {
          var f = x[s + 4 * I >> 2];
          if (f == 0) break;
          ++I, 65536 <= f ? (f -= 65536, l += String.fromCharCode(55296 | f >> 10, 56320 | f & 1023)) : l += String.fromCharCode(f);
        }
        return l;
      }
      function vn(s, a, I) {
        if (I === void 0 && (I = 2147483647), 4 > I) return 0;
        var l = a;
        I = l + I - 4;
        for (var f = 0; f < s.length; ++f) {
          var Q = s.charCodeAt(f);
          if (55296 <= Q && 57343 >= Q) {
            var h = s.charCodeAt(++f);
            Q = 65536 + ((Q & 1023) << 10) | h & 1023;
          }
          if (x[a >> 2] = Q, a += 4, a + 4 > I) break;
        }
        return x[a >> 2] = 0, a - l;
      }
      function kn(s) {
        for (var a = 0, I = 0; I < s.length; ++I) {
          var l = s.charCodeAt(I);
          55296 <= l && 57343 >= l && ++I, a += 4;
        }
        return a;
      }
      var bn = {};
      function Ft(s) {
        var a = bn[s];
        return a === void 0 ? rA(s) : a;
      }
      var He = [];
      function Rn(s) {
        var a = He.length;
        return He.push(s), a;
      }
      function xn(s, a) {
        for (var I = Array(s), l = 0; l < s; ++l) I[l] = ue(k[a + 4 * l >> 2], "parameter " + l);
        return I;
      }
      var Mt = [], Nn = [null, [], []];
      TA = t.BindingError = FA("BindingError"), t.count_emval_handles = function() {
        for (var s = 0, a = 5; a < W.length; ++a) W[a] !== void 0 && ++s;
        return s;
      }, t.get_first_emval = function() {
        for (var s = 5; s < W.length; ++s) if (W[s] !== void 0) return W[s];
        return null;
      }, ot = t.PureVirtualError = FA("PureVirtualError");
      for (var Lt = Array(256), Oe = 0; 256 > Oe; ++Oe) Lt[Oe] = String.fromCharCode(Oe);
      Ue = Lt, t.getInheritedInstanceCount = function() {
        return Object.keys(kA).length;
      }, t.getLiveInheritedInstances = function() {
        var s = [], a;
        for (a in kA) kA.hasOwnProperty(a) && s.push(kA[a]);
        return s;
      }, t.flushPendingDeletes = be, t.setDelayFunction = function(s) {
        re = s, MA.length && re && re(be);
      }, ze = t.InternalError = FA("InternalError"), X.prototype.isAliasOf = function(s) {
        if (!(this instanceof X && s instanceof X)) return false;
        var a = this.M.P.N, I = this.M.O, l = s.M.P.N;
        for (s = s.M.O; a.R; ) I = a.ba(I), a = a.R;
        for (; l.R; ) s = l.ba(s), l = l.R;
        return a === l && I === s;
      }, X.prototype.clone = function() {
        if (this.M.O || uA(this), this.M.aa) return this.M.count.value += 1, this;
        var s = bA, a = Object, I = a.create, l = Object.getPrototypeOf(this), f = this.M;
        return s = s(I.call(a, l, { M: { value: { count: f.count, $: f.$, aa: f.aa, O: f.O, P: f.P, T: f.T, U: f.U } } })), s.M.count.value += 1, s.M.$ = false, s;
      }, X.prototype.delete = function() {
        this.M.O || uA(this), this.M.$ && !this.M.aa && U("Object already scheduled for deletion"), ZA(this), xe(this.M), this.M.aa || (this.M.T = void 0, this.M.O = void 0);
      }, X.prototype.isDeleted = function() {
        return !this.M.O;
      }, X.prototype.deleteLater = function() {
        return this.M.O || uA(this), this.M.$ && !this.M.aa && U("Object already scheduled for deletion"), MA.push(this), MA.length === 1 && re && re(be), this.M.$ = true, this;
      }, z.prototype.qa = function(s) {
        return this.ka && (s = this.ka(s)), s;
      }, z.prototype.ha = function(s) {
        this.W && this.W(s);
      }, z.prototype.argPackAdvance = 8, z.prototype.readValueFromPointer = $, z.prototype.deleteObject = function(s) {
        s !== null && s.delete();
      }, z.prototype.fromWireType = function(s) {
        function a() {
          return this.da ? jA(this.N.X, { P: this.wa, O: I, U: this, T: s }) : jA(this.N.X, { P: this, O: s });
        }
        var I = this.qa(s);
        if (!I) return this.ha(s), null;
        var l = Ve(this.N, I);
        if (l !== void 0) return l.M.count.value === 0 ? (l.M.O = I, l.M.T = s, l.clone()) : (l = l.clone(), this.ha(s), l);
        if (l = this.N.pa(I), l = we[l], !l) return a.call(this);
        l = this.ca ? l.la : l.pointerType;
        var f = Ie(I, this.N, l.N);
        return f === null ? a.call(this) : this.da ? jA(l.N.X, { P: l, O: f, U: this, T: s }) : jA(l.N.X, { P: l, O: f });
      }, Ne = t.UnboundTypeError = FA("UnboundTypeError");
      var Fn = typeof atob == "function" ? atob : function(s) {
        var a = "", I = 0;
        s = s.replace(/[^A-Za-z0-9\+\/=]/g, "");
        do {
          var l = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(s.charAt(I++)), f = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(s.charAt(I++)), Q = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(s.charAt(I++)), h = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(s.charAt(I++));
          l = l << 2 | f >> 4, f = (f & 15) << 4 | Q >> 2;
          var p = (Q & 3) << 6 | h;
          a += String.fromCharCode(l), Q !== 64 && (a += String.fromCharCode(f)), h !== 64 && (a += String.fromCharCode(p));
        } while (I < s.length);
        return a;
      }, Mn = { l: function(s, a, I, l) {
        V("Assertion failed: " + (s ? C(S, s) : "") + ", at: " + [a ? a ? C(S, a) : "" : "unknown filename", I, l ? l ? C(S, l) : "" : "unknown function"]);
      }, q: function(s, a, I) {
        s = rA(s), a = ue(a, "wrapper"), I = XA(I);
        var l = [].slice, f = a.N, Q = f.X, h = f.R.X, p = f.R.constructor;
        s = hA(s, function() {
          f.R.ja.forEach(function(y) {
            if (this[y] === h[y]) throw new ot("Pure virtual function " + y + " must be implemented in JavaScript");
          }.bind(this)), Object.defineProperty(this, "__parent", { value: Q }), this.__construct.apply(this, l.call(arguments));
        }), Q.__construct = function() {
          this === Q && U("Pass correct 'this' to __construct");
          var y = p.implement.apply(void 0, [this].concat(l.call(arguments)));
          ZA(y);
          var v = y.M;
          y.notifyOnDestruction(), v.aa = true, Object.defineProperties(this, { M: { value: v } }), bA(this), y = v.O, y = ye(f, y), kA.hasOwnProperty(y) ? U("Tried to register registered instance: " + y) : kA[y] = this;
        }, Q.__destruct = function() {
          this === Q && U("Pass correct 'this' to __destruct"), ZA(this);
          var y = this.M.O;
          y = ye(f, y), kA.hasOwnProperty(y) ? delete kA[y] : U("Tried to unregister unregistered instance: " + y);
        }, s.prototype = Object.create(Q);
        for (var w in I) s.prototype[w] = I[w];
        return me(s);
      }, j: function(s) {
        var a = le[s];
        delete le[s];
        var I = a.fa, l = a.W, f = a.ia, Q = f.map((h) => h.ta).concat(f.map((h) => h.za));
        iA([s], Q, (h) => {
          var p = {};
          return f.forEach((w, y) => {
            var v = h[y], N = w.ra, P = w.sa, eA = h[y + f.length], K = w.ya, fA = w.Aa;
            p[w.oa] = { read: (DA) => v.fromWireType(N(P, DA)), write: (DA, Se) => {
              var WA = [];
              K(fA, DA, eA.toWireType(WA, Se)), Z(WA);
            } };
          }), [{ name: a.name, fromWireType: function(w) {
            var y = {}, v;
            for (v in p) y[v] = p[v].read(w);
            return l(w), y;
          }, toWireType: function(w, y) {
            for (var v in p) if (!(v in y)) throw new TypeError('Missing field:  "' + v + '"');
            var N = I();
            for (v in p) p[v].write(N, y[v]);
            return w !== null && w.push(l, N), N;
          }, argPackAdvance: 8, readValueFromPointer: $, V: l }];
        });
      }, v: function() {
      }, B: function(s, a, I, l, f) {
        var Q = sA(I);
        a = rA(a), AA(s, { name: a, fromWireType: function(h) {
          return !!h;
        }, toWireType: function(h, p) {
          return p ? l : f;
        }, argPackAdvance: 8, readValueFromPointer: function(h) {
          if (I === 1) var p = D;
          else if (I === 2) p = b;
          else if (I === 4) p = x;
          else throw new TypeError("Unknown boolean type size: " + a);
          return this.fromWireType(p[h >> Q]);
        }, V: null });
      }, f: function(s, a, I, l, f, Q, h, p, w, y, v, N, P) {
        v = rA(v), Q = QA(f, Q), p && (p = QA(h, p)), y && (y = QA(w, y)), P = QA(N, P);
        var eA = ge(v);
        aA(eA, function() {
          xA("Cannot construct " + v + " due to unbound types", [l]);
        }), iA([s, a, I], l ? [l] : [], function(K) {
          if (K = K[0], l) var fA = K.N, DA = fA.X;
          else DA = X.prototype;
          K = hA(eA, function() {
            if (Object.getPrototypeOf(this) !== Se) throw new TA("Use 'new' to construct " + v);
            if (WA.Y === void 0) throw new TA(v + " has no accessible constructor");
            var Ot = WA.Y[arguments.length];
            if (Ot === void 0) throw new TA("Tried to invoke ctor of " + v + " with invalid number of parameters (" + arguments.length + ") - expected (" + Object.keys(WA.Y).toString() + ") parameters instead!");
            return Ot.apply(this, arguments);
          });
          var Se = Object.create(DA, { constructor: { value: K } });
          K.prototype = Se;
          var WA = new De(v, K, Se, P, fA, Q, p, y);
          fA = new z(v, WA, true, false), DA = new z(v + "*", WA, false, false);
          var Ht = new z(v + " const*", WA, false, true);
          return we[s] = { pointerType: DA, la: Ht }, GA(eA, K), [fA, DA, Ht];
        });
      }, d: function(s, a, I, l, f, Q, h) {
        var p = _A(I, l);
        a = rA(a), Q = QA(f, Q), iA([], [s], function(w) {
          function y() {
            xA("Cannot call " + v + " due to unbound types", p);
          }
          w = w[0];
          var v = w.name + "." + a;
          a.startsWith("@@") && (a = Symbol[a.substring(2)]);
          var N = w.N.constructor;
          return N[a] === void 0 ? (y.Z = I - 1, N[a] = y) : (YA(N, a, v), N[a].S[I - 1] = y), iA([], p, function(P) {
            return P = PA(v, [P[0], null].concat(P.slice(1)), null, Q, h), N[a].S === void 0 ? (P.Z = I - 1, N[a] = P) : N[a].S[I - 1] = P, [];
          }), [];
        });
      }, p: function(s, a, I, l, f, Q) {
        0 < a || V();
        var h = _A(a, I);
        f = QA(l, f), iA([], [s], function(p) {
          p = p[0];
          var w = "constructor " + p.name;
          if (p.N.Y === void 0 && (p.N.Y = []), p.N.Y[a - 1] !== void 0) throw new TA("Cannot register multiple constructors with identical number of parameters (" + (a - 1) + ") for class '" + p.name + "'! Overload resolution is currently only performed using the parameter count, not actual type info!");
          return p.N.Y[a - 1] = () => {
            xA("Cannot construct " + p.name + " due to unbound types", h);
          }, iA([], h, function(y) {
            return y.splice(1, 0, null), p.N.Y[a - 1] = PA(w, y, null, f, Q), [];
          }), [];
        });
      }, a: function(s, a, I, l, f, Q, h, p) {
        var w = _A(I, l);
        a = rA(a), Q = QA(f, Q), iA([], [s], function(y) {
          function v() {
            xA("Cannot call " + N + " due to unbound types", w);
          }
          y = y[0];
          var N = y.name + "." + a;
          a.startsWith("@@") && (a = Symbol[a.substring(2)]), p && y.N.ja.push(a);
          var P = y.N.X, eA = P[a];
          return eA === void 0 || eA.S === void 0 && eA.className !== y.name && eA.Z === I - 2 ? (v.Z = I - 2, v.className = y.name, P[a] = v) : (YA(P, a, N), P[a].S[I - 2] = v), iA([], w, function(K) {
            return K = PA(N, K, y, Q, h), P[a].S === void 0 ? (K.Z = I - 2, P[a] = K) : P[a].S[I - 2] = K, [];
          }), [];
        });
      }, A: function(s, a) {
        a = rA(a), AA(s, { name: a, fromWireType: function(I) {
          var l = XA(I);
          return $A(I), l;
        }, toWireType: function(I, l) {
          return me(l);
        }, argPackAdvance: 8, readValueFromPointer: $, V: null });
      }, n: function(s, a, I) {
        I = sA(I), a = rA(a), AA(s, { name: a, fromWireType: function(l) {
          return l;
        }, toWireType: function(l, f) {
          return f;
        }, argPackAdvance: 8, readValueFromPointer: Et(a, I), V: null });
      }, e: function(s, a, I, l, f) {
        a = rA(a), f === -1 && (f = 4294967295), f = sA(I);
        var Q = (p) => p;
        if (l === 0) {
          var h = 32 - 8 * I;
          Q = (p) => p << h >>> h;
        }
        I = a.includes("unsigned") ? function(p, w) {
          return w >>> 0;
        } : function(p, w) {
          return w;
        }, AA(s, { name: a, fromWireType: Q, toWireType: I, argPackAdvance: 8, readValueFromPointer: Qt(a, f, l !== 0), V: null });
      }, b: function(s, a, I) {
        function l(Q) {
          Q >>= 2;
          var h = k;
          return new f(m, h[Q + 1], h[Q]);
        }
        var f = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array][a];
        I = rA(I), AA(s, { name: I, fromWireType: l, argPackAdvance: 8, readValueFromPointer: l }, { ua: true });
      }, o: function(s, a) {
        a = rA(a);
        var I = a === "std::string";
        AA(s, { name: a, fromWireType: function(l) {
          var f = k[l >> 2], Q = l + 4;
          if (I) for (var h = Q, p = 0; p <= f; ++p) {
            var w = Q + p;
            if (p == f || S[w] == 0) {
              if (h = h ? C(S, h, w - h) : "", y === void 0) var y = h;
              else y += String.fromCharCode(0), y += h;
              h = w + 1;
            }
          }
          else {
            for (y = Array(f), p = 0; p < f; ++p) y[p] = String.fromCharCode(S[Q + p]);
            y = y.join("");
          }
          return JA(l), y;
        }, toWireType: function(l, f) {
          f instanceof ArrayBuffer && (f = new Uint8Array(f));
          var Q, h = typeof f == "string";
          if (h || f instanceof Uint8Array || f instanceof Uint8ClampedArray || f instanceof Int8Array || U("Cannot pass non-string to std::string"), I && h) {
            var p = 0;
            for (Q = 0; Q < f.length; ++Q) {
              var w = f.charCodeAt(Q);
              127 >= w ? p++ : 2047 >= w ? p += 2 : 55296 <= w && 57343 >= w ? (p += 4, ++Q) : p += 3;
            }
            Q = p;
          } else Q = f.length;
          if (p = st(4 + Q + 1), w = p + 4, k[p >> 2] = Q, I && h) {
            if (h = w, w = Q + 1, Q = S, 0 < w) {
              w = h + w - 1;
              for (var y = 0; y < f.length; ++y) {
                var v = f.charCodeAt(y);
                if (55296 <= v && 57343 >= v) {
                  var N = f.charCodeAt(++y);
                  v = 65536 + ((v & 1023) << 10) | N & 1023;
                }
                if (127 >= v) {
                  if (h >= w) break;
                  Q[h++] = v;
                } else {
                  if (2047 >= v) {
                    if (h + 1 >= w) break;
                    Q[h++] = 192 | v >> 6;
                  } else {
                    if (65535 >= v) {
                      if (h + 2 >= w) break;
                      Q[h++] = 224 | v >> 12;
                    } else {
                      if (h + 3 >= w) break;
                      Q[h++] = 240 | v >> 18, Q[h++] = 128 | v >> 12 & 63;
                    }
                    Q[h++] = 128 | v >> 6 & 63;
                  }
                  Q[h++] = 128 | v & 63;
                }
              }
              Q[h] = 0;
            }
          } else if (h) for (h = 0; h < Q; ++h) y = f.charCodeAt(h), 255 < y && (JA(w), U("String has UTF-16 code units that do not fit in 8 bits")), S[w + h] = y;
          else for (h = 0; h < Q; ++h) S[w + h] = f[h];
          return l !== null && l.push(JA, p), p;
        }, argPackAdvance: 8, readValueFromPointer: $, V: function(l) {
          JA(l);
        } });
      }, i: function(s, a, I) {
        if (I = rA(I), a === 2) var l = Ct, f = wn, Q = Dn, h = () => L, p = 1;
        else a === 4 && (l = Sn, f = vn, Q = kn, h = () => k, p = 2);
        AA(s, { name: I, fromWireType: function(w) {
          for (var y = k[w >> 2], v = h(), N, P = w + 4, eA = 0; eA <= y; ++eA) {
            var K = w + 4 + eA * a;
            (eA == y || v[K >> p] == 0) && (P = l(P, K - P), N === void 0 ? N = P : (N += String.fromCharCode(0), N += P), P = K + a);
          }
          return JA(w), N;
        }, toWireType: function(w, y) {
          typeof y != "string" && U("Cannot pass non-string to C++ string type " + I);
          var v = Q(y), N = st(4 + v + a);
          return k[N >> 2] = v >> p, f(y, N + 4, v + a), w !== null && w.push(JA, N), N;
        }, argPackAdvance: 8, readValueFromPointer: $, V: function(w) {
          JA(w);
        } });
      }, k: function(s, a, I, l, f, Q) {
        le[s] = { name: rA(a), fa: QA(I, l), W: QA(f, Q), ia: [] };
      }, h: function(s, a, I, l, f, Q, h, p, w, y) {
        le[s].ia.push({ oa: rA(a), ta: I, ra: QA(l, f), sa: Q, za: h, ya: QA(p, w), Aa: y });
      }, C: function(s, a) {
        a = rA(a), AA(s, { va: true, name: a, argPackAdvance: 0, fromWireType: function() {
        }, toWireType: function() {
        } });
      }, s: function(s, a, I, l, f) {
        s = He[s], a = XA(a), I = Ft(I);
        var Q = [];
        return k[l >> 2] = me(Q), s(a, I, Q, f);
      }, t: function(s, a, I, l) {
        s = He[s], a = XA(a), I = Ft(I), s(a, I, null, l);
      }, g: $A, m: function(s, a) {
        var I = xn(s, a), l = I[0];
        a = l.name + "_$" + I.slice(1).map(function(h) {
          return h.name;
        }).join("_") + "$";
        var f = Mt[a];
        if (f !== void 0) return f;
        var Q = Array(s - 1);
        return f = Rn((h, p, w, y) => {
          for (var v = 0, N = 0; N < s - 1; ++N) Q[N] = I[N + 1].readValueFromPointer(y + v), v += I[N + 1].argPackAdvance;
          for (h = h[p].apply(h, Q), N = 0; N < s - 1; ++N) I[N + 1].ma && I[N + 1].ma(Q[N]);
          if (!l.va) return l.toWireType(w, h);
        }), Mt[a] = f;
      }, D: function(s) {
        4 < s && (W[s].ga += 1);
      }, r: function(s) {
        var a = XA(s);
        Z(a), $A(s);
      }, c: function() {
        V("");
      }, x: function(s, a, I) {
        S.copyWithin(s, a, a + I);
      }, w: function(s) {
        var a = S.length;
        if (s >>>= 0, 2147483648 < s) return false;
        for (var I = 1; 4 >= I; I *= 2) {
          var l = a * (1 + 0.2 / I);
          l = Math.min(l, s + 100663296);
          var f = Math;
          l = Math.max(s, l), f = f.min.call(f, 2147483648, l + (65536 - l % 65536) % 65536);
          A: {
            try {
              E.grow(f - m.byteLength + 65535 >>> 16), J();
              var Q = 1;
              break A;
            } catch {
            }
            Q = void 0;
          }
          if (Q) return true;
        }
        return false;
      }, z: function() {
        return 52;
      }, u: function() {
        return 70;
      }, y: function(s, a, I, l) {
        for (var f = 0, Q = 0; Q < I; Q++) {
          var h = k[a >> 2], p = k[a + 4 >> 2];
          a += 8;
          for (var w = 0; w < p; w++) {
            var y = S[h + w], v = Nn[s];
            y === 0 || y === 10 ? ((s === 1 ? g : u)(C(v, 0)), v.length = 0) : v.push(y);
          }
          f += p;
        }
        return k[l >> 2] = f, 0;
      } };
      ((function() {
        function s(f) {
          t.asm = f.exports, E = t.asm.E, J(), q = t.asm.J, wA.unshift(t.asm.F), j--, t.monitorRunDependencies && t.monitorRunDependencies(j), j == 0 && (IA && (f = IA, IA = null, f()));
        }
        function a(f) {
          s(f.instance);
        }
        function I(f) {
          return ae().then(function(Q) {
            return WebAssembly.instantiate(Q, l);
          }).then(function(Q) {
            return Q;
          }).then(f, function(Q) {
            u("failed to asynchronously prepare wasm: " + Q), V(Q);
          });
        }
        var l = { a: Mn };
        if (j++, t.monitorRunDependencies && t.monitorRunDependencies(j), t.instantiateWasm) try {
          return t.instantiateWasm(l, s);
        } catch (f) {
          u("Module.instantiateWasm callback failed with error: " + f), n(f);
        }
        return (function() {
          return c || typeof WebAssembly.instantiateStreaming != "function" || HA(gA) || typeof fetch != "function" ? I(a) : fetch(gA, { credentials: "same-origin" }).then(function(f) {
            return WebAssembly.instantiateStreaming(f, l).then(a, function(Q) {
              return u("wasm streaming compile failed: " + Q), u("falling back to ArrayBuffer instantiation"), I(a);
            });
          });
        })().catch(n), {};
      }))(), t.___wasm_call_ctors = function() {
        return (t.___wasm_call_ctors = t.asm.F).apply(null, arguments);
      };
      var Gt = t.___getTypeName = function() {
        return (Gt = t.___getTypeName = t.asm.G).apply(null, arguments);
      };
      t.__embind_initialize_bindings = function() {
        return (t.__embind_initialize_bindings = t.asm.H).apply(null, arguments);
      };
      var st = t._malloc = function() {
        return (st = t._malloc = t.asm.I).apply(null, arguments);
      }, JA = t._free = function() {
        return (JA = t._free = t.asm.K).apply(null, arguments);
      };
      t.dynCall_jiji = function() {
        return (t.dynCall_jiji = t.asm.L).apply(null, arguments);
      };
      var Te;
      IA = function s() {
        Te || Ut(), Te || (IA = s);
      };
      function Ut() {
        function s() {
          if (!Te && (Te = true, t.calledRun = true, !d)) {
            if (OA(wA), r(t), t.onRuntimeInitialized && t.onRuntimeInitialized(), t.postRun) for (typeof t.postRun == "function" && (t.postRun = [t.postRun]); t.postRun.length; ) {
              var a = t.postRun.shift();
              UA.unshift(a);
            }
            OA(UA);
          }
        }
        if (!(0 < j)) {
          if (t.preRun) for (typeof t.preRun == "function" && (t.preRun = [t.preRun]); t.preRun.length; ) NA();
          OA(lA), 0 < j || (t.setStatus ? (t.setStatus("Running..."), setTimeout(function() {
            setTimeout(function() {
              t.setStatus("");
            }, 1), s();
          }, 1)) : s());
        }
      }
      if (t.preInit) for (typeof t.preInit == "function" && (t.preInit = [t.preInit]); 0 < t.preInit.length; ) t.preInit.pop()();
      return Ut(), e.ready;
    };
  })(), wI = yI;
});
async function Pr(A) {
  let { default: e } = process.env.SATORI_STANDALONE === "1" ? await Promise.resolve().then(() => (xs(), Rs)) : await Promise.resolve().then(() => (Fs(), Ns));
  return qn(await e(A));
}
var Xn = Pe(() => {
  ks();
  Tr();
});
var zn = {};
dt(zn, { getYoga: () => vI, init: () => SI });
function SI(A) {
  "buffer" in A ? Vn(A.buffer).then(_r) : "instance" in A ? Vn(A.instance).then(_r) : Vn(A).then(_r);
}
function vI() {
  return DI;
}
var _r, DI, Vn, Zn = Pe(() => {
  Xn();
  DI = new Promise((A) => {
    _r = A;
  }), Vn = Pr;
});
var jn = {};
dt(jn, { getYoga: () => bI });
function bI() {
  return kI;
}
var kI, $n = Pe(() => {
  Xn();
  kI = Pr();
});
var pi = Y((hi) => {
  Object.defineProperty(hi, "__esModule", { value: true });
  Object.defineProperty(hi, "default", { enumerable: true, get: () => Rl });
  function Rl(A) {
    if (A = `${A}`, A === "0") return "0";
    if (/^[+-]?(\d+|\d*\.\d+)(e[+-]?\d+)?(%|\w+)?$/.test(A)) return A.replace(/^[+-]?/, (e) => e === "-" ? "" : "-");
    if (A.includes("var(") || A.includes("calc(")) return `calc(${A} * -1)`;
  }
});
var ha = Y((mi) => {
  Object.defineProperty(mi, "__esModule", { value: true });
  Object.defineProperty(mi, "default", { enumerable: true, get: () => xl });
  var xl = ["preflight", "container", "accessibility", "pointerEvents", "visibility", "position", "inset", "isolation", "zIndex", "order", "gridColumn", "gridColumnStart", "gridColumnEnd", "gridRow", "gridRowStart", "gridRowEnd", "float", "clear", "margin", "boxSizing", "display", "aspectRatio", "height", "maxHeight", "minHeight", "width", "minWidth", "maxWidth", "flex", "flexShrink", "flexGrow", "flexBasis", "tableLayout", "borderCollapse", "borderSpacing", "transformOrigin", "translate", "rotate", "skew", "scale", "transform", "animation", "cursor", "touchAction", "userSelect", "resize", "scrollSnapType", "scrollSnapAlign", "scrollSnapStop", "scrollMargin", "scrollPadding", "listStylePosition", "listStyleType", "appearance", "columns", "breakBefore", "breakInside", "breakAfter", "gridAutoColumns", "gridAutoFlow", "gridAutoRows", "gridTemplateColumns", "gridTemplateRows", "flexDirection", "flexWrap", "placeContent", "placeItems", "alignContent", "alignItems", "justifyContent", "justifyItems", "gap", "space", "divideWidth", "divideStyle", "divideColor", "divideOpacity", "placeSelf", "alignSelf", "justifySelf", "overflow", "overscrollBehavior", "scrollBehavior", "textOverflow", "whitespace", "wordBreak", "borderRadius", "borderWidth", "borderStyle", "borderColor", "borderOpacity", "backgroundColor", "backgroundOpacity", "backgroundImage", "gradientColorStops", "boxDecorationBreak", "backgroundSize", "backgroundAttachment", "backgroundClip", "backgroundPosition", "backgroundRepeat", "backgroundOrigin", "fill", "stroke", "strokeWidth", "objectFit", "objectPosition", "padding", "textAlign", "textIndent", "verticalAlign", "fontFamily", "fontSize", "fontWeight", "textTransform", "fontStyle", "fontVariantNumeric", "lineHeight", "letterSpacing", "textColor", "textOpacity", "textDecoration", "textDecorationColor", "textDecorationStyle", "textDecorationThickness", "textUnderlineOffset", "fontSmoothing", "placeholderColor", "placeholderOpacity", "caretColor", "accentColor", "opacity", "backgroundBlendMode", "mixBlendMode", "boxShadow", "boxShadowColor", "outlineStyle", "outlineWidth", "outlineOffset", "outlineColor", "ringWidth", "ringColor", "ringOpacity", "ringOffsetWidth", "ringOffsetColor", "blur", "brightness", "contrast", "dropShadow", "grayscale", "hueRotate", "invert", "saturate", "sepia", "filter", "backdropBlur", "backdropBrightness", "backdropContrast", "backdropGrayscale", "backdropHueRotate", "backdropInvert", "backdropOpacity", "backdropSaturate", "backdropSepia", "backdropFilter", "transitionProperty", "transitionDelay", "transitionDuration", "transitionTimingFunction", "willChange", "content"];
});
var pa = Y((yi) => {
  Object.defineProperty(yi, "__esModule", { value: true });
  Object.defineProperty(yi, "default", { enumerable: true, get: () => Nl });
  function Nl(A, e) {
    return A === void 0 ? e : Array.isArray(A) ? A : [...new Set(e.filter((r) => A !== false && A[r] !== false).concat(Object.keys(A).filter((r) => A[r] !== false)))];
  }
});
var wi = Y((wp, ma) => {
  ma.exports = { content: [], presets: [], darkMode: "media", theme: { screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1536px" }, colors: ({ colors: A }) => ({ inherit: A.inherit, current: A.current, transparent: A.transparent, black: A.black, white: A.white, slate: A.slate, gray: A.gray, zinc: A.zinc, neutral: A.neutral, stone: A.stone, red: A.red, orange: A.orange, amber: A.amber, yellow: A.yellow, lime: A.lime, green: A.green, emerald: A.emerald, teal: A.teal, cyan: A.cyan, sky: A.sky, blue: A.blue, indigo: A.indigo, violet: A.violet, purple: A.purple, fuchsia: A.fuchsia, pink: A.pink, rose: A.rose }), columns: { auto: "auto", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12", "3xs": "16rem", "2xs": "18rem", xs: "20rem", sm: "24rem", md: "28rem", lg: "32rem", xl: "36rem", "2xl": "42rem", "3xl": "48rem", "4xl": "56rem", "5xl": "64rem", "6xl": "72rem", "7xl": "80rem" }, spacing: { px: "1px", 0: "0px", 0.5: "0.125rem", 1: "0.25rem", 1.5: "0.375rem", 2: "0.5rem", 2.5: "0.625rem", 3: "0.75rem", 3.5: "0.875rem", 4: "1rem", 5: "1.25rem", 6: "1.5rem", 7: "1.75rem", 8: "2rem", 9: "2.25rem", 10: "2.5rem", 11: "2.75rem", 12: "3rem", 14: "3.5rem", 16: "4rem", 20: "5rem", 24: "6rem", 28: "7rem", 32: "8rem", 36: "9rem", 40: "10rem", 44: "11rem", 48: "12rem", 52: "13rem", 56: "14rem", 60: "15rem", 64: "16rem", 72: "18rem", 80: "20rem", 96: "24rem" }, animation: { none: "none", spin: "spin 1s linear infinite", ping: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite", pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite", bounce: "bounce 1s infinite" }, aspectRatio: { auto: "auto", square: "1 / 1", video: "16 / 9" }, backdropBlur: ({ theme: A }) => A("blur"), backdropBrightness: ({ theme: A }) => A("brightness"), backdropContrast: ({ theme: A }) => A("contrast"), backdropGrayscale: ({ theme: A }) => A("grayscale"), backdropHueRotate: ({ theme: A }) => A("hueRotate"), backdropInvert: ({ theme: A }) => A("invert"), backdropOpacity: ({ theme: A }) => A("opacity"), backdropSaturate: ({ theme: A }) => A("saturate"), backdropSepia: ({ theme: A }) => A("sepia"), backgroundColor: ({ theme: A }) => A("colors"), backgroundImage: { none: "none", "gradient-to-t": "linear-gradient(to top, var(--tw-gradient-stops))", "gradient-to-tr": "linear-gradient(to top right, var(--tw-gradient-stops))", "gradient-to-r": "linear-gradient(to right, var(--tw-gradient-stops))", "gradient-to-br": "linear-gradient(to bottom right, var(--tw-gradient-stops))", "gradient-to-b": "linear-gradient(to bottom, var(--tw-gradient-stops))", "gradient-to-bl": "linear-gradient(to bottom left, var(--tw-gradient-stops))", "gradient-to-l": "linear-gradient(to left, var(--tw-gradient-stops))", "gradient-to-tl": "linear-gradient(to top left, var(--tw-gradient-stops))" }, backgroundOpacity: ({ theme: A }) => A("opacity"), backgroundPosition: { bottom: "bottom", center: "center", left: "left", "left-bottom": "left bottom", "left-top": "left top", right: "right", "right-bottom": "right bottom", "right-top": "right top", top: "top" }, backgroundSize: { auto: "auto", cover: "cover", contain: "contain" }, blur: { 0: "0", none: "0", sm: "4px", DEFAULT: "8px", md: "12px", lg: "16px", xl: "24px", "2xl": "40px", "3xl": "64px" }, brightness: { 0: "0", 50: ".5", 75: ".75", 90: ".9", 95: ".95", 100: "1", 105: "1.05", 110: "1.1", 125: "1.25", 150: "1.5", 200: "2" }, borderColor: ({ theme: A }) => ({ ...A("colors"), DEFAULT: A("colors.gray.200", "currentColor") }), borderOpacity: ({ theme: A }) => A("opacity"), borderRadius: { none: "0px", sm: "0.125rem", DEFAULT: "0.25rem", md: "0.375rem", lg: "0.5rem", xl: "0.75rem", "2xl": "1rem", "3xl": "1.5rem", full: "9999px" }, borderSpacing: ({ theme: A }) => ({ ...A("spacing") }), borderWidth: { DEFAULT: "1px", 0: "0px", 2: "2px", 4: "4px", 8: "8px" }, boxShadow: { sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)", DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)", md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)", xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)", "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)", inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)", none: "none" }, boxShadowColor: ({ theme: A }) => A("colors"), caretColor: ({ theme: A }) => A("colors"), accentColor: ({ theme: A }) => ({ ...A("colors"), auto: "auto" }), contrast: { 0: "0", 50: ".5", 75: ".75", 100: "1", 125: "1.25", 150: "1.5", 200: "2" }, container: {}, content: { none: "none" }, cursor: { auto: "auto", default: "default", pointer: "pointer", wait: "wait", text: "text", move: "move", help: "help", "not-allowed": "not-allowed", none: "none", "context-menu": "context-menu", progress: "progress", cell: "cell", crosshair: "crosshair", "vertical-text": "vertical-text", alias: "alias", copy: "copy", "no-drop": "no-drop", grab: "grab", grabbing: "grabbing", "all-scroll": "all-scroll", "col-resize": "col-resize", "row-resize": "row-resize", "n-resize": "n-resize", "e-resize": "e-resize", "s-resize": "s-resize", "w-resize": "w-resize", "ne-resize": "ne-resize", "nw-resize": "nw-resize", "se-resize": "se-resize", "sw-resize": "sw-resize", "ew-resize": "ew-resize", "ns-resize": "ns-resize", "nesw-resize": "nesw-resize", "nwse-resize": "nwse-resize", "zoom-in": "zoom-in", "zoom-out": "zoom-out" }, divideColor: ({ theme: A }) => A("borderColor"), divideOpacity: ({ theme: A }) => A("borderOpacity"), divideWidth: ({ theme: A }) => A("borderWidth"), dropShadow: { sm: "0 1px 1px rgb(0 0 0 / 0.05)", DEFAULT: ["0 1px 2px rgb(0 0 0 / 0.1)", "0 1px 1px rgb(0 0 0 / 0.06)"], md: ["0 4px 3px rgb(0 0 0 / 0.07)", "0 2px 2px rgb(0 0 0 / 0.06)"], lg: ["0 10px 8px rgb(0 0 0 / 0.04)", "0 4px 3px rgb(0 0 0 / 0.1)"], xl: ["0 20px 13px rgb(0 0 0 / 0.03)", "0 8px 5px rgb(0 0 0 / 0.08)"], "2xl": "0 25px 25px rgb(0 0 0 / 0.15)", none: "0 0 #0000" }, fill: ({ theme: A }) => A("colors"), grayscale: { 0: "0", DEFAULT: "100%" }, hueRotate: { 0: "0deg", 15: "15deg", 30: "30deg", 60: "60deg", 90: "90deg", 180: "180deg" }, invert: { 0: "0", DEFAULT: "100%" }, flex: { 1: "1 1 0%", auto: "1 1 auto", initial: "0 1 auto", none: "none" }, flexBasis: ({ theme: A }) => ({ auto: "auto", ...A("spacing"), "1/2": "50%", "1/3": "33.333333%", "2/3": "66.666667%", "1/4": "25%", "2/4": "50%", "3/4": "75%", "1/5": "20%", "2/5": "40%", "3/5": "60%", "4/5": "80%", "1/6": "16.666667%", "2/6": "33.333333%", "3/6": "50%", "4/6": "66.666667%", "5/6": "83.333333%", "1/12": "8.333333%", "2/12": "16.666667%", "3/12": "25%", "4/12": "33.333333%", "5/12": "41.666667%", "6/12": "50%", "7/12": "58.333333%", "8/12": "66.666667%", "9/12": "75%", "10/12": "83.333333%", "11/12": "91.666667%", full: "100%" }), flexGrow: { 0: "0", DEFAULT: "1" }, flexShrink: { 0: "0", DEFAULT: "1" }, fontFamily: { sans: ["ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", '"Helvetica Neue"', "Arial", '"Noto Sans"', "sans-serif", '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'], serif: ["ui-serif", "Georgia", "Cambria", '"Times New Roman"', "Times", "serif"], mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", '"Liberation Mono"', '"Courier New"', "monospace"] }, fontSize: { xs: ["0.75rem", { lineHeight: "1rem" }], sm: ["0.875rem", { lineHeight: "1.25rem" }], base: ["1rem", { lineHeight: "1.5rem" }], lg: ["1.125rem", { lineHeight: "1.75rem" }], xl: ["1.25rem", { lineHeight: "1.75rem" }], "2xl": ["1.5rem", { lineHeight: "2rem" }], "3xl": ["1.875rem", { lineHeight: "2.25rem" }], "4xl": ["2.25rem", { lineHeight: "2.5rem" }], "5xl": ["3rem", { lineHeight: "1" }], "6xl": ["3.75rem", { lineHeight: "1" }], "7xl": ["4.5rem", { lineHeight: "1" }], "8xl": ["6rem", { lineHeight: "1" }], "9xl": ["8rem", { lineHeight: "1" }] }, fontWeight: { thin: "100", extralight: "200", light: "300", normal: "400", medium: "500", semibold: "600", bold: "700", extrabold: "800", black: "900" }, gap: ({ theme: A }) => A("spacing"), gradientColorStops: ({ theme: A }) => A("colors"), gridAutoColumns: { auto: "auto", min: "min-content", max: "max-content", fr: "minmax(0, 1fr)" }, gridAutoRows: { auto: "auto", min: "min-content", max: "max-content", fr: "minmax(0, 1fr)" }, gridColumn: { auto: "auto", "span-1": "span 1 / span 1", "span-2": "span 2 / span 2", "span-3": "span 3 / span 3", "span-4": "span 4 / span 4", "span-5": "span 5 / span 5", "span-6": "span 6 / span 6", "span-7": "span 7 / span 7", "span-8": "span 8 / span 8", "span-9": "span 9 / span 9", "span-10": "span 10 / span 10", "span-11": "span 11 / span 11", "span-12": "span 12 / span 12", "span-full": "1 / -1" }, gridColumnEnd: { auto: "auto", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12", 13: "13" }, gridColumnStart: { auto: "auto", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12", 13: "13" }, gridRow: { auto: "auto", "span-1": "span 1 / span 1", "span-2": "span 2 / span 2", "span-3": "span 3 / span 3", "span-4": "span 4 / span 4", "span-5": "span 5 / span 5", "span-6": "span 6 / span 6", "span-full": "1 / -1" }, gridRowStart: { auto: "auto", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7" }, gridRowEnd: { auto: "auto", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7" }, gridTemplateColumns: { none: "none", 1: "repeat(1, minmax(0, 1fr))", 2: "repeat(2, minmax(0, 1fr))", 3: "repeat(3, minmax(0, 1fr))", 4: "repeat(4, minmax(0, 1fr))", 5: "repeat(5, minmax(0, 1fr))", 6: "repeat(6, minmax(0, 1fr))", 7: "repeat(7, minmax(0, 1fr))", 8: "repeat(8, minmax(0, 1fr))", 9: "repeat(9, minmax(0, 1fr))", 10: "repeat(10, minmax(0, 1fr))", 11: "repeat(11, minmax(0, 1fr))", 12: "repeat(12, minmax(0, 1fr))" }, gridTemplateRows: { none: "none", 1: "repeat(1, minmax(0, 1fr))", 2: "repeat(2, minmax(0, 1fr))", 3: "repeat(3, minmax(0, 1fr))", 4: "repeat(4, minmax(0, 1fr))", 5: "repeat(5, minmax(0, 1fr))", 6: "repeat(6, minmax(0, 1fr))" }, height: ({ theme: A }) => ({ auto: "auto", ...A("spacing"), "1/2": "50%", "1/3": "33.333333%", "2/3": "66.666667%", "1/4": "25%", "2/4": "50%", "3/4": "75%", "1/5": "20%", "2/5": "40%", "3/5": "60%", "4/5": "80%", "1/6": "16.666667%", "2/6": "33.333333%", "3/6": "50%", "4/6": "66.666667%", "5/6": "83.333333%", full: "100%", screen: "100vh", min: "min-content", max: "max-content", fit: "fit-content" }), inset: ({ theme: A }) => ({ auto: "auto", ...A("spacing"), "1/2": "50%", "1/3": "33.333333%", "2/3": "66.666667%", "1/4": "25%", "2/4": "50%", "3/4": "75%", full: "100%" }), keyframes: { spin: { to: { transform: "rotate(360deg)" } }, ping: { "75%, 100%": { transform: "scale(2)", opacity: "0" } }, pulse: { "50%": { opacity: ".5" } }, bounce: { "0%, 100%": { transform: "translateY(-25%)", animationTimingFunction: "cubic-bezier(0.8,0,1,1)" }, "50%": { transform: "none", animationTimingFunction: "cubic-bezier(0,0,0.2,1)" } } }, letterSpacing: { tighter: "-0.05em", tight: "-0.025em", normal: "0em", wide: "0.025em", wider: "0.05em", widest: "0.1em" }, lineHeight: { none: "1", tight: "1.25", snug: "1.375", normal: "1.5", relaxed: "1.625", loose: "2", 3: ".75rem", 4: "1rem", 5: "1.25rem", 6: "1.5rem", 7: "1.75rem", 8: "2rem", 9: "2.25rem", 10: "2.5rem" }, listStyleType: { none: "none", disc: "disc", decimal: "decimal" }, margin: ({ theme: A }) => ({ auto: "auto", ...A("spacing") }), maxHeight: ({ theme: A }) => ({ ...A("spacing"), full: "100%", screen: "100vh", min: "min-content", max: "max-content", fit: "fit-content" }), maxWidth: ({ theme: A, breakpoints: e }) => ({ none: "none", 0: "0rem", xs: "20rem", sm: "24rem", md: "28rem", lg: "32rem", xl: "36rem", "2xl": "42rem", "3xl": "48rem", "4xl": "56rem", "5xl": "64rem", "6xl": "72rem", "7xl": "80rem", full: "100%", min: "min-content", max: "max-content", fit: "fit-content", prose: "65ch", ...e(A("screens")) }), minHeight: { 0: "0px", full: "100%", screen: "100vh", min: "min-content", max: "max-content", fit: "fit-content" }, minWidth: { 0: "0px", full: "100%", min: "min-content", max: "max-content", fit: "fit-content" }, objectPosition: { bottom: "bottom", center: "center", left: "left", "left-bottom": "left bottom", "left-top": "left top", right: "right", "right-bottom": "right bottom", "right-top": "right top", top: "top" }, opacity: { 0: "0", 5: "0.05", 10: "0.1", 20: "0.2", 25: "0.25", 30: "0.3", 40: "0.4", 50: "0.5", 60: "0.6", 70: "0.7", 75: "0.75", 80: "0.8", 90: "0.9", 95: "0.95", 100: "1" }, order: { first: "-9999", last: "9999", none: "0", 1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "11", 12: "12" }, padding: ({ theme: A }) => A("spacing"), placeholderColor: ({ theme: A }) => A("colors"), placeholderOpacity: ({ theme: A }) => A("opacity"), outlineColor: ({ theme: A }) => A("colors"), outlineOffset: { 0: "0px", 1: "1px", 2: "2px", 4: "4px", 8: "8px" }, outlineWidth: { 0: "0px", 1: "1px", 2: "2px", 4: "4px", 8: "8px" }, ringColor: ({ theme: A }) => ({ DEFAULT: A("colors.blue.500", "#3b82f6"), ...A("colors") }), ringOffsetColor: ({ theme: A }) => A("colors"), ringOffsetWidth: { 0: "0px", 1: "1px", 2: "2px", 4: "4px", 8: "8px" }, ringOpacity: ({ theme: A }) => ({ DEFAULT: "0.5", ...A("opacity") }), ringWidth: { DEFAULT: "3px", 0: "0px", 1: "1px", 2: "2px", 4: "4px", 8: "8px" }, rotate: { 0: "0deg", 1: "1deg", 2: "2deg", 3: "3deg", 6: "6deg", 12: "12deg", 45: "45deg", 90: "90deg", 180: "180deg" }, saturate: { 0: "0", 50: ".5", 100: "1", 150: "1.5", 200: "2" }, scale: { 0: "0", 50: ".5", 75: ".75", 90: ".9", 95: ".95", 100: "1", 105: "1.05", 110: "1.1", 125: "1.25", 150: "1.5" }, scrollMargin: ({ theme: A }) => ({ ...A("spacing") }), scrollPadding: ({ theme: A }) => A("spacing"), sepia: { 0: "0", DEFAULT: "100%" }, skew: { 0: "0deg", 1: "1deg", 2: "2deg", 3: "3deg", 6: "6deg", 12: "12deg" }, space: ({ theme: A }) => ({ ...A("spacing") }), stroke: ({ theme: A }) => A("colors"), strokeWidth: { 0: "0", 1: "1", 2: "2" }, textColor: ({ theme: A }) => A("colors"), textDecorationColor: ({ theme: A }) => A("colors"), textDecorationThickness: { auto: "auto", "from-font": "from-font", 0: "0px", 1: "1px", 2: "2px", 4: "4px", 8: "8px" }, textUnderlineOffset: { auto: "auto", 0: "0px", 1: "1px", 2: "2px", 4: "4px", 8: "8px" }, textIndent: ({ theme: A }) => ({ ...A("spacing") }), textOpacity: ({ theme: A }) => A("opacity"), transformOrigin: { center: "center", top: "top", "top-right": "top right", right: "right", "bottom-right": "bottom right", bottom: "bottom", "bottom-left": "bottom left", left: "left", "top-left": "top left" }, transitionDelay: { 75: "75ms", 100: "100ms", 150: "150ms", 200: "200ms", 300: "300ms", 500: "500ms", 700: "700ms", 1e3: "1000ms" }, transitionDuration: { DEFAULT: "150ms", 75: "75ms", 100: "100ms", 150: "150ms", 200: "200ms", 300: "300ms", 500: "500ms", 700: "700ms", 1e3: "1000ms" }, transitionProperty: { none: "none", all: "all", DEFAULT: "color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter", colors: "color, background-color, border-color, text-decoration-color, fill, stroke", opacity: "opacity", shadow: "box-shadow", transform: "transform" }, transitionTimingFunction: { DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)", linear: "linear", in: "cubic-bezier(0.4, 0, 1, 1)", out: "cubic-bezier(0, 0, 0.2, 1)", "in-out": "cubic-bezier(0.4, 0, 0.2, 1)" }, translate: ({ theme: A }) => ({ ...A("spacing"), "1/2": "50%", "1/3": "33.333333%", "2/3": "66.666667%", "1/4": "25%", "2/4": "50%", "3/4": "75%", full: "100%" }), width: ({ theme: A }) => ({ auto: "auto", ...A("spacing"), "1/2": "50%", "1/3": "33.333333%", "2/3": "66.666667%", "1/4": "25%", "2/4": "50%", "3/4": "75%", "1/5": "20%", "2/5": "40%", "3/5": "60%", "4/5": "80%", "1/6": "16.666667%", "2/6": "33.333333%", "3/6": "50%", "4/6": "66.666667%", "5/6": "83.333333%", "1/12": "8.333333%", "2/12": "16.666667%", "3/12": "25%", "4/12": "33.333333%", "5/12": "41.666667%", "6/12": "50%", "7/12": "58.333333%", "8/12": "66.666667%", "9/12": "75%", "10/12": "83.333333%", "11/12": "91.666667%", full: "100%", screen: "100vw", min: "min-content", max: "max-content", fit: "fit-content" }), willChange: { auto: "auto", scroll: "scroll-position", contents: "contents", transform: "transform" }, zIndex: { auto: "auto", 0: "0", 10: "10", 20: "20", 30: "30", 40: "40", 50: "50" } }, variantOrder: ["first", "last", "odd", "even", "visited", "checked", "empty", "read-only", "group-hover", "group-focus", "focus-within", "hover", "focus", "focus-visible", "active", "disabled"], plugins: [] };
});
var rn = {};
dt(rn, { default: () => Fl });
var Fl, nn = Pe(() => {
  Fl = { info(A, e) {
    console.info(...Array.isArray(A) ? [A] : [e, A]);
  }, warn(A, e) {
    console.warn(...Array.isArray(A) ? [A] : [e, A]);
  }, risk(A, e) {
    console.error(...Array.isArray(A) ? [A] : [e, A]);
  } };
});
var ya = Y((Di) => {
  Object.defineProperty(Di, "__esModule", { value: true });
  Object.defineProperty(Di, "default", { enumerable: true, get: () => Gl });
  var Ml = Ll((nn(), Lr(rn)));
  function Ll(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function $t({ version: A, from: e, to: t }) {
    Ml.default.warn(`${e}-color-renamed`, [`As of Tailwind CSS ${A}, \`${e}\` has been renamed to \`${t}\`.`, "Update your configuration file to silence this warning."]);
  }
  var Gl = { inherit: "inherit", current: "currentColor", transparent: "transparent", black: "#000", white: "#fff", slate: { 50: "#f8fafc", 100: "#f1f5f9", 200: "#e2e8f0", 300: "#cbd5e1", 400: "#94a3b8", 500: "#64748b", 600: "#475569", 700: "#334155", 800: "#1e293b", 900: "#0f172a" }, gray: { 50: "#f9fafb", 100: "#f3f4f6", 200: "#e5e7eb", 300: "#d1d5db", 400: "#9ca3af", 500: "#6b7280", 600: "#4b5563", 700: "#374151", 800: "#1f2937", 900: "#111827" }, zinc: { 50: "#fafafa", 100: "#f4f4f5", 200: "#e4e4e7", 300: "#d4d4d8", 400: "#a1a1aa", 500: "#71717a", 600: "#52525b", 700: "#3f3f46", 800: "#27272a", 900: "#18181b" }, neutral: { 50: "#fafafa", 100: "#f5f5f5", 200: "#e5e5e5", 300: "#d4d4d4", 400: "#a3a3a3", 500: "#737373", 600: "#525252", 700: "#404040", 800: "#262626", 900: "#171717" }, stone: { 50: "#fafaf9", 100: "#f5f5f4", 200: "#e7e5e4", 300: "#d6d3d1", 400: "#a8a29e", 500: "#78716c", 600: "#57534e", 700: "#44403c", 800: "#292524", 900: "#1c1917" }, red: { 50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 300: "#fca5a5", 400: "#f87171", 500: "#ef4444", 600: "#dc2626", 700: "#b91c1c", 800: "#991b1b", 900: "#7f1d1d" }, orange: { 50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa", 300: "#fdba74", 400: "#fb923c", 500: "#f97316", 600: "#ea580c", 700: "#c2410c", 800: "#9a3412", 900: "#7c2d12" }, amber: { 50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309", 800: "#92400e", 900: "#78350f" }, yellow: { 50: "#fefce8", 100: "#fef9c3", 200: "#fef08a", 300: "#fde047", 400: "#facc15", 500: "#eab308", 600: "#ca8a04", 700: "#a16207", 800: "#854d0e", 900: "#713f12" }, lime: { 50: "#f7fee7", 100: "#ecfccb", 200: "#d9f99d", 300: "#bef264", 400: "#a3e635", 500: "#84cc16", 600: "#65a30d", 700: "#4d7c0f", 800: "#3f6212", 900: "#365314" }, green: { 50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0", 300: "#86efac", 400: "#4ade80", 500: "#22c55e", 600: "#16a34a", 700: "#15803d", 800: "#166534", 900: "#14532d" }, emerald: { 50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7", 400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b" }, teal: { 50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4", 300: "#5eead4", 400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e", 800: "#115e59", 900: "#134e4a" }, cyan: { 50: "#ecfeff", 100: "#cffafe", 200: "#a5f3fc", 300: "#67e8f9", 400: "#22d3ee", 500: "#06b6d4", 600: "#0891b2", 700: "#0e7490", 800: "#155e75", 900: "#164e63" }, sky: { 50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd", 300: "#7dd3fc", 400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1", 800: "#075985", 900: "#0c4a6e" }, blue: { 50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd", 400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8", 800: "#1e40af", 900: "#1e3a8a" }, indigo: { 50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 800: "#3730a3", 900: "#312e81" }, violet: { 50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe", 300: "#c4b5fd", 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9", 800: "#5b21b6", 900: "#4c1d95" }, purple: { 50: "#faf5ff", 100: "#f3e8ff", 200: "#e9d5ff", 300: "#d8b4fe", 400: "#c084fc", 500: "#a855f7", 600: "#9333ea", 700: "#7e22ce", 800: "#6b21a8", 900: "#581c87" }, fuchsia: { 50: "#fdf4ff", 100: "#fae8ff", 200: "#f5d0fe", 300: "#f0abfc", 400: "#e879f9", 500: "#d946ef", 600: "#c026d3", 700: "#a21caf", 800: "#86198f", 900: "#701a75" }, pink: { 50: "#fdf2f8", 100: "#fce7f3", 200: "#fbcfe8", 300: "#f9a8d4", 400: "#f472b6", 500: "#ec4899", 600: "#db2777", 700: "#be185d", 800: "#9d174d", 900: "#831843" }, rose: { 50: "#fff1f2", 100: "#ffe4e6", 200: "#fecdd3", 300: "#fda4af", 400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 700: "#be123c", 800: "#9f1239", 900: "#881337" }, get lightBlue() {
    return $t({ version: "v2.2", from: "lightBlue", to: "sky" }), this.sky;
  }, get warmGray() {
    return $t({ version: "v3.0", from: "warmGray", to: "stone" }), this.stone;
  }, get trueGray() {
    return $t({ version: "v3.0", from: "trueGray", to: "neutral" }), this.neutral;
  }, get coolGray() {
    return $t({ version: "v3.0", from: "coolGray", to: "gray" }), this.gray;
  }, get blueGray() {
    return $t({ version: "v3.0", from: "blueGray", to: "slate" }), this.slate;
  } };
});
var wa = Y((Si) => {
  Object.defineProperty(Si, "__esModule", { value: true });
  Object.defineProperty(Si, "defaults", { enumerable: true, get: () => Ul });
  function Ul(A, ...e) {
    for (let n of e) {
      for (let i in n) {
        var t;
        !(A == null || (t = A.hasOwnProperty) === null || t === void 0) && t.call(A, i) || (A[i] = n[i]);
      }
      for (let i of Object.getOwnPropertySymbols(n)) {
        var r;
        !(A == null || (r = A.hasOwnProperty) === null || r === void 0) && r.call(A, i) || (A[i] = n[i]);
      }
    }
    return A;
  }
});
var Da = Y((vi) => {
  Object.defineProperty(vi, "__esModule", { value: true });
  Object.defineProperty(vi, "toPath", { enumerable: true, get: () => Hl });
  function Hl(A) {
    if (Array.isArray(A)) return A;
    let e = A.split("[").length - 1, t = A.split("]").length - 1;
    if (e !== t) throw new Error(`Path is invalid. Has unbalanced brackets: ${A}`);
    return A.split(/\.(?![^\[]*\])|[\[\]]/g).filter(Boolean);
  }
});
var va = Y((ki) => {
  Object.defineProperty(ki, "__esModule", { value: true });
  Object.defineProperty(ki, "normalizeConfig", { enumerable: true, get: () => Tl });
  var Ar = Ol((nn(), Lr(rn)));
  function Sa(A) {
    if (typeof WeakMap != "function") return null;
    var e = /* @__PURE__ */ new WeakMap(), t = /* @__PURE__ */ new WeakMap();
    return (Sa = function(r) {
      return r ? t : e;
    })(A);
  }
  function Ol(A, e) {
    if (A && A.__esModule) return A;
    if (A === null || typeof A != "object" && typeof A != "function") return { default: A };
    var t = Sa(e);
    if (t && t.has(A)) return t.get(A);
    var r = {}, n = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for (var i in A) if (i !== "default" && Object.prototype.hasOwnProperty.call(A, i)) {
      var o = n ? Object.getOwnPropertyDescriptor(A, i) : null;
      o && (o.get || o.set) ? Object.defineProperty(r, i, o) : r[i] = A[i];
    }
    return r.default = A, t && t.set(A, r), r;
  }
  function Tl(A) {
    if ((() => {
      if (A.purge || !A.content || !Array.isArray(A.content) && !(typeof A.content == "object" && A.content !== null)) return false;
      if (Array.isArray(A.content)) return A.content.every((r) => typeof r == "string" ? true : !(typeof (r == null ? void 0 : r.raw) != "string" || r != null && r.extension && typeof (r == null ? void 0 : r.extension) != "string"));
      if (typeof A.content == "object" && A.content !== null) {
        if (Object.keys(A.content).some((r) => !["files", "extract", "transform"].includes(r))) return false;
        if (Array.isArray(A.content.files)) {
          if (!A.content.files.every((r) => typeof r == "string" ? true : !(typeof (r == null ? void 0 : r.raw) != "string" || r != null && r.extension && typeof (r == null ? void 0 : r.extension) != "string"))) return false;
          if (typeof A.content.extract == "object") {
            for (let r of Object.values(A.content.extract)) if (typeof r != "function") return false;
          } else if (!(A.content.extract === void 0 || typeof A.content.extract == "function")) return false;
          if (typeof A.content.transform == "object") {
            for (let r of Object.values(A.content.transform)) if (typeof r != "function") return false;
          } else if (!(A.content.transform === void 0 || typeof A.content.transform == "function")) return false;
        }
        return true;
      }
      return false;
    })() || Ar.default.warn("purge-deprecation", ["The `purge`/`content` options have changed in Tailwind CSS v3.0.", "Update your configuration file to eliminate this warning.", "https://tailwindcss.com/docs/upgrade-guide#configure-content-sources"]), A.safelist = (() => {
      var r;
      let { content: n, purge: i, safelist: o } = A;
      return Array.isArray(o) ? o : Array.isArray(n == null ? void 0 : n.safelist) ? n.safelist : Array.isArray(i == null ? void 0 : i.safelist) ? i.safelist : Array.isArray(i == null || (r = i.options) === null || r === void 0 ? void 0 : r.safelist) ? i.options.safelist : [];
    })(), typeof A.prefix == "function") Ar.default.warn("prefix-function", ["As of Tailwind CSS v3.0, `prefix` cannot be a function.", "Update `prefix` in your configuration to be a string to eliminate this warning.", "https://tailwindcss.com/docs/upgrade-guide#prefix-cannot-be-a-function"]), A.prefix = "";
    else {
      var t;
      A.prefix = (t = A.prefix) !== null && t !== void 0 ? t : "";
    }
    A.content = { files: (() => {
      let { content: r, purge: n } = A;
      return Array.isArray(n) ? n : Array.isArray(n == null ? void 0 : n.content) ? n.content : Array.isArray(r) ? r : Array.isArray(r == null ? void 0 : r.content) ? r.content : Array.isArray(r == null ? void 0 : r.files) ? r.files : [];
    })(), extract: (() => {
      let r = (() => {
        var o, g, u, c, B, E, d, C, m, D;
        return !((o = A.purge) === null || o === void 0) && o.extract ? A.purge.extract : !((g = A.content) === null || g === void 0) && g.extract ? A.content.extract : !((u = A.purge) === null || u === void 0 || (c = u.extract) === null || c === void 0) && c.DEFAULT ? A.purge.extract.DEFAULT : !((B = A.content) === null || B === void 0 || (E = B.extract) === null || E === void 0) && E.DEFAULT ? A.content.extract.DEFAULT : !((d = A.purge) === null || d === void 0 || (C = d.options) === null || C === void 0) && C.extractors ? A.purge.options.extractors : !((m = A.content) === null || m === void 0 || (D = m.options) === null || D === void 0) && D.extractors ? A.content.options.extractors : {};
      })(), n = {}, i = (() => {
        var o, g, u, c;
        if (!((o = A.purge) === null || o === void 0 || (g = o.options) === null || g === void 0) && g.defaultExtractor) return A.purge.options.defaultExtractor;
        if (!((u = A.content) === null || u === void 0 || (c = u.options) === null || c === void 0) && c.defaultExtractor) return A.content.options.defaultExtractor;
      })();
      if (i !== void 0 && (n.DEFAULT = i), typeof r == "function") n.DEFAULT = r;
      else if (Array.isArray(r)) for (let { extensions: o, extractor: g } of r ?? []) for (let u of o) n[u] = g;
      else typeof r == "object" && r !== null && Object.assign(n, r);
      return n;
    })(), transform: (() => {
      let r = (() => {
        var i, o, g, u, c, B;
        return !((i = A.purge) === null || i === void 0) && i.transform ? A.purge.transform : !((o = A.content) === null || o === void 0) && o.transform ? A.content.transform : !((g = A.purge) === null || g === void 0 || (u = g.transform) === null || u === void 0) && u.DEFAULT ? A.purge.transform.DEFAULT : !((c = A.content) === null || c === void 0 || (B = c.transform) === null || B === void 0) && B.DEFAULT ? A.content.transform.DEFAULT : {};
      })(), n = {};
      return typeof r == "function" && (n.DEFAULT = r), typeof r == "object" && r !== null && Object.assign(n, r), n;
    })() };
    for (let r of A.content.files) if (typeof r == "string" && /{([^,]*?)}/g.test(r)) {
      Ar.default.warn("invalid-glob-braces", [`The glob pattern ${(0, Ar.dim)(r)} in your Tailwind CSS configuration is invalid.`, `Update it to ${(0, Ar.dim)(r.replace(/{([^,]*?)}/g, "$1"))} to silence this warning.`]);
      break;
    }
    return A;
  }
});
var ka = Y((bi) => {
  Object.defineProperty(bi, "__esModule", { value: true });
  Object.defineProperty(bi, "default", { enumerable: true, get: () => Pl });
  function Pl(A) {
    if (Object.prototype.toString.call(A) !== "[object Object]") return false;
    let e = Object.getPrototypeOf(A);
    return e === null || e === Object.prototype;
  }
});
var ba = Y((xi) => {
  Object.defineProperty(xi, "__esModule", { value: true });
  Object.defineProperty(xi, "cloneDeep", { enumerable: true, get: () => Ri });
  function Ri(A) {
    return Array.isArray(A) ? A.map((e) => Ri(e)) : typeof A == "object" && A !== null ? Object.fromEntries(Object.entries(A).map(([e, t]) => [e, Ri(t)])) : A;
  }
});
var Ni = Y((on, Ra) => {
  on.__esModule = true;
  on.default = Wl;
  function _l(A) {
    for (var e = A.toLowerCase(), t = "", r = false, n = 0; n < 6 && e[n] !== void 0; n++) {
      var i = e.charCodeAt(n), o = i >= 97 && i <= 102 || i >= 48 && i <= 57;
      if (r = i === 32, !o) break;
      t += e[n];
    }
    if (t.length !== 0) {
      var g = parseInt(t, 16), u = g >= 55296 && g <= 57343;
      return u || g === 0 || g > 1114111 ? ["�", t.length + (r ? 1 : 0)] : [String.fromCodePoint(g), t.length + (r ? 1 : 0)];
    }
  }
  var Jl = /\\/;
  function Wl(A) {
    var e = Jl.test(A);
    if (!e) return A;
    for (var t = "", r = 0; r < A.length; r++) {
      if (A[r] === "\\") {
        var n = _l(A.slice(r + 1, r + 7));
        if (n !== void 0) {
          t += n[0], r += n[1];
          continue;
        }
        if (A[r + 1] === "\\") {
          t += "\\", r++;
          continue;
        }
        A.length === r + 1 && (t += A[r]);
        continue;
      }
      t += A[r];
    }
    return t;
  }
  Ra.exports = on.default;
});
var Na = Y((sn, xa) => {
  sn.__esModule = true;
  sn.default = Kl;
  function Kl(A) {
    for (var e = arguments.length, t = new Array(e > 1 ? e - 1 : 0), r = 1; r < e; r++) t[r - 1] = arguments[r];
    for (; t.length > 0; ) {
      var n = t.shift();
      if (!A[n]) return;
      A = A[n];
    }
    return A;
  }
  xa.exports = sn.default;
});
var Ma = Y((an, Fa) => {
  an.__esModule = true;
  an.default = Yl;
  function Yl(A) {
    for (var e = arguments.length, t = new Array(e > 1 ? e - 1 : 0), r = 1; r < e; r++) t[r - 1] = arguments[r];
    for (; t.length > 0; ) {
      var n = t.shift();
      A[n] || (A[n] = {}), A = A[n];
    }
  }
  Fa.exports = an.default;
});
var Ga = Y((gn, La) => {
  gn.__esModule = true;
  gn.default = ql;
  function ql(A) {
    for (var e = "", t = A.indexOf("/*"), r = 0; t >= 0; ) {
      e = e + A.slice(r, t);
      var n = A.indexOf("*/", t + 2);
      if (n < 0) return e;
      r = n + 2, t = A.indexOf("/*", r);
    }
    return e = e + A.slice(r), e;
  }
  La.exports = gn.default;
});
var er = Y((Me) => {
  Me.__esModule = true;
  Me.stripComments = Me.ensureObject = Me.getProp = Me.unesc = void 0;
  var Xl = un(Ni());
  Me.unesc = Xl.default;
  var Vl = un(Na());
  Me.getProp = Vl.default;
  var zl = un(Ma());
  Me.ensureObject = zl.default;
  var Zl = un(Ga());
  Me.stripComments = Zl.default;
  function un(A) {
    return A && A.__esModule ? A : { default: A };
  }
});
var Ye = Y((tr, Oa) => {
  tr.__esModule = true;
  tr.default = void 0;
  var Ua = er();
  function Ha(A, e) {
    for (var t = 0; t < e.length; t++) {
      var r = e[t];
      r.enumerable = r.enumerable || false, r.configurable = true, "value" in r && (r.writable = true), Object.defineProperty(A, r.key, r);
    }
  }
  function jl(A, e, t) {
    return e && Ha(A.prototype, e), A;
  }
  var $l = function A(e, t) {
    if (typeof e != "object" || e === null) return e;
    var r = new e.constructor();
    for (var n in e) if (e.hasOwnProperty(n)) {
      var i = e[n], o = typeof i;
      n === "parent" && o === "object" ? t && (r[n] = t) : i instanceof Array ? r[n] = i.map(function(g) {
        return A(g, r);
      }) : r[n] = A(i, r);
    }
    return r;
  }, Ac = (function() {
    function A(t) {
      t === void 0 && (t = {}), Object.assign(this, t), this.spaces = this.spaces || {}, this.spaces.before = this.spaces.before || "", this.spaces.after = this.spaces.after || "";
    }
    var e = A.prototype;
    return e.remove = function() {
      return this.parent && this.parent.removeChild(this), this.parent = void 0, this;
    }, e.replaceWith = function() {
      if (this.parent) {
        for (var r in arguments) this.parent.insertBefore(this, arguments[r]);
        this.remove();
      }
      return this;
    }, e.next = function() {
      return this.parent.at(this.parent.index(this) + 1);
    }, e.prev = function() {
      return this.parent.at(this.parent.index(this) - 1);
    }, e.clone = function(r) {
      r === void 0 && (r = {});
      var n = $l(this);
      for (var i in r) n[i] = r[i];
      return n;
    }, e.appendToPropertyAndEscape = function(r, n, i) {
      this.raws || (this.raws = {});
      var o = this[r], g = this.raws[r];
      this[r] = o + n, g || i !== n ? this.raws[r] = (g || o) + i : delete this.raws[r];
    }, e.setPropertyAndEscape = function(r, n, i) {
      this.raws || (this.raws = {}), this[r] = n, this.raws[r] = i;
    }, e.setPropertyWithoutEscape = function(r, n) {
      this[r] = n, this.raws && delete this.raws[r];
    }, e.isAtPosition = function(r, n) {
      if (this.source && this.source.start && this.source.end) return !(this.source.start.line > r || this.source.end.line < r || this.source.start.line === r && this.source.start.column > n || this.source.end.line === r && this.source.end.column < n);
    }, e.stringifyProperty = function(r) {
      return this.raws && this.raws[r] || this[r];
    }, e.valueToString = function() {
      return String(this.stringifyProperty("value"));
    }, e.toString = function() {
      return [this.rawSpaceBefore, this.valueToString(), this.rawSpaceAfter].join("");
    }, jl(A, [{ key: "rawSpaceBefore", get: function() {
      var r = this.raws && this.raws.spaces && this.raws.spaces.before;
      return r === void 0 && (r = this.spaces && this.spaces.before), r || "";
    }, set: function(r) {
      (0, Ua.ensureObject)(this, "raws", "spaces"), this.raws.spaces.before = r;
    } }, { key: "rawSpaceAfter", get: function() {
      var r = this.raws && this.raws.spaces && this.raws.spaces.after;
      return r === void 0 && (r = this.spaces.after), r || "";
    }, set: function(r) {
      (0, Ua.ensureObject)(this, "raws", "spaces"), this.raws.spaces.after = r;
    } }]), A;
  })();
  tr.default = Ac;
  Oa.exports = tr.default;
});
var zA = Y((CA) => {
  CA.__esModule = true;
  CA.UNIVERSAL = CA.ATTRIBUTE = CA.CLASS = CA.COMBINATOR = CA.COMMENT = CA.ID = CA.NESTING = CA.PSEUDO = CA.ROOT = CA.SELECTOR = CA.STRING = CA.TAG = void 0;
  var ec = "tag";
  CA.TAG = ec;
  var tc = "string";
  CA.STRING = tc;
  var rc = "selector";
  CA.SELECTOR = rc;
  var nc = "root";
  CA.ROOT = nc;
  var ic = "pseudo";
  CA.PSEUDO = ic;
  var oc = "nesting";
  CA.NESTING = oc;
  var sc = "id";
  CA.ID = sc;
  var ac = "comment";
  CA.COMMENT = ac;
  var gc = "combinator";
  CA.COMBINATOR = gc;
  var uc = "class";
  CA.CLASS = uc;
  var Ic = "attribute";
  CA.ATTRIBUTE = Ic;
  var lc = "universal";
  CA.UNIVERSAL = lc;
});
var In = Y((rr, Ja) => {
  rr.__esModule = true;
  rr.default = void 0;
  var cc = fc(Ye()), qe = Bc(zA());
  function _a() {
    if (typeof WeakMap != "function") return null;
    var A = /* @__PURE__ */ new WeakMap();
    return _a = function() {
      return A;
    }, A;
  }
  function Bc(A) {
    if (A && A.__esModule) return A;
    if (A === null || typeof A != "object" && typeof A != "function") return { default: A };
    var e = _a();
    if (e && e.has(A)) return e.get(A);
    var t = {}, r = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for (var n in A) if (Object.prototype.hasOwnProperty.call(A, n)) {
      var i = r ? Object.getOwnPropertyDescriptor(A, n) : null;
      i && (i.get || i.set) ? Object.defineProperty(t, n, i) : t[n] = A[n];
    }
    return t.default = A, e && e.set(A, t), t;
  }
  function fc(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function Ec(A, e) {
    var t;
    if (typeof Symbol > "u" || A[Symbol.iterator] == null) {
      if (Array.isArray(A) || (t = Qc(A)) || e) {
        t && (A = t);
        var r = 0;
        return function() {
          return r >= A.length ? { done: true } : { done: false, value: A[r++] };
        };
      }
      throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
    }
    return t = A[Symbol.iterator](), t.next.bind(t);
  }
  function Qc(A, e) {
    if (A) {
      if (typeof A == "string") return Ta(A, e);
      var t = Object.prototype.toString.call(A).slice(8, -1);
      if (t === "Object" && A.constructor && (t = A.constructor.name), t === "Map" || t === "Set") return Array.from(A);
      if (t === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)) return Ta(A, e);
    }
  }
  function Ta(A, e) {
    (e == null || e > A.length) && (e = A.length);
    for (var t = 0, r = new Array(e); t < e; t++) r[t] = A[t];
    return r;
  }
  function Pa(A, e) {
    for (var t = 0; t < e.length; t++) {
      var r = e[t];
      r.enumerable = r.enumerable || false, r.configurable = true, "value" in r && (r.writable = true), Object.defineProperty(A, r.key, r);
    }
  }
  function Cc(A, e, t) {
    return e && Pa(A.prototype, e), A;
  }
  function dc(A, e) {
    A.prototype = Object.create(e.prototype), A.prototype.constructor = A, Fi(A, e);
  }
  function Fi(A, e) {
    return Fi = Object.setPrototypeOf || function(r, n) {
      return r.__proto__ = n, r;
    }, Fi(A, e);
  }
  var hc = (function(A) {
    dc(e, A);
    function e(r) {
      var n;
      return n = A.call(this, r) || this, n.nodes || (n.nodes = []), n;
    }
    var t = e.prototype;
    return t.append = function(n) {
      return n.parent = this, this.nodes.push(n), this;
    }, t.prepend = function(n) {
      return n.parent = this, this.nodes.unshift(n), this;
    }, t.at = function(n) {
      return this.nodes[n];
    }, t.index = function(n) {
      return typeof n == "number" ? n : this.nodes.indexOf(n);
    }, t.removeChild = function(n) {
      n = this.index(n), this.at(n).parent = void 0, this.nodes.splice(n, 1);
      var i;
      for (var o in this.indexes) i = this.indexes[o], i >= n && (this.indexes[o] = i - 1);
      return this;
    }, t.removeAll = function() {
      for (var n = Ec(this.nodes), i; !(i = n()).done; ) {
        var o = i.value;
        o.parent = void 0;
      }
      return this.nodes = [], this;
    }, t.empty = function() {
      return this.removeAll();
    }, t.insertAfter = function(n, i) {
      i.parent = this;
      var o = this.index(n);
      this.nodes.splice(o + 1, 0, i), i.parent = this;
      var g;
      for (var u in this.indexes) g = this.indexes[u], o <= g && (this.indexes[u] = g + 1);
      return this;
    }, t.insertBefore = function(n, i) {
      i.parent = this;
      var o = this.index(n);
      this.nodes.splice(o, 0, i), i.parent = this;
      var g;
      for (var u in this.indexes) g = this.indexes[u], g <= o && (this.indexes[u] = g + 1);
      return this;
    }, t._findChildAtPosition = function(n, i) {
      var o = void 0;
      return this.each(function(g) {
        if (g.atPosition) {
          var u = g.atPosition(n, i);
          if (u) return o = u, false;
        } else if (g.isAtPosition(n, i)) return o = g, false;
      }), o;
    }, t.atPosition = function(n, i) {
      if (this.isAtPosition(n, i)) return this._findChildAtPosition(n, i) || this;
    }, t._inferEndPosition = function() {
      this.last && this.last.source && this.last.source.end && (this.source = this.source || {}, this.source.end = this.source.end || {}, Object.assign(this.source.end, this.last.source.end));
    }, t.each = function(n) {
      this.lastEach || (this.lastEach = 0), this.indexes || (this.indexes = {}), this.lastEach++;
      var i = this.lastEach;
      if (this.indexes[i] = 0, !!this.length) {
        for (var o, g; this.indexes[i] < this.length && (o = this.indexes[i], g = n(this.at(o), o), g !== false); ) this.indexes[i] += 1;
        if (delete this.indexes[i], g === false) return false;
      }
    }, t.walk = function(n) {
      return this.each(function(i, o) {
        var g = n(i, o);
        if (g !== false && i.length && (g = i.walk(n)), g === false) return false;
      });
    }, t.walkAttributes = function(n) {
      var i = this;
      return this.walk(function(o) {
        if (o.type === qe.ATTRIBUTE) return n.call(i, o);
      });
    }, t.walkClasses = function(n) {
      var i = this;
      return this.walk(function(o) {
        if (o.type === qe.CLASS) return n.call(i, o);
      });
    }, t.walkCombinators = function(n) {
      var i = this;
      return this.walk(function(o) {
        if (o.type === qe.COMBINATOR) return n.call(i, o);
      });
    }, t.walkComments = function(n) {
      var i = this;
      return this.walk(function(o) {
        if (o.type === qe.COMMENT) return n.call(i, o);
      });
    }, t.walkIds = function(n) {
      var i = this;
      return this.walk(function(o) {
        if (o.type === qe.ID) return n.call(i, o);
      });
    }, t.walkNesting = function(n) {
      var i = this;
      return this.walk(function(o) {
        if (o.type === qe.NESTING) return n.call(i, o);
      });
    }, t.walkPseudos = function(n) {
      var i = this;
      return this.walk(function(o) {
        if (o.type === qe.PSEUDO) return n.call(i, o);
      });
    }, t.walkTags = function(n) {
      var i = this;
      return this.walk(function(o) {
        if (o.type === qe.TAG) return n.call(i, o);
      });
    }, t.walkUniversals = function(n) {
      var i = this;
      return this.walk(function(o) {
        if (o.type === qe.UNIVERSAL) return n.call(i, o);
      });
    }, t.split = function(n) {
      var i = this, o = [];
      return this.reduce(function(g, u, c) {
        var B = n.call(i, u);
        return o.push(u), B ? (g.push(o), o = []) : c === i.length - 1 && g.push(o), g;
      }, []);
    }, t.map = function(n) {
      return this.nodes.map(n);
    }, t.reduce = function(n, i) {
      return this.nodes.reduce(n, i);
    }, t.every = function(n) {
      return this.nodes.every(n);
    }, t.some = function(n) {
      return this.nodes.some(n);
    }, t.filter = function(n) {
      return this.nodes.filter(n);
    }, t.sort = function(n) {
      return this.nodes.sort(n);
    }, t.toString = function() {
      return this.map(String).join("");
    }, Cc(e, [{ key: "first", get: function() {
      return this.at(0);
    } }, { key: "last", get: function() {
      return this.at(this.length - 1);
    } }, { key: "length", get: function() {
      return this.nodes.length;
    } }]), e;
  })(cc.default);
  rr.default = hc;
  Ja.exports = rr.default;
});
var Li = Y((nr, Ka) => {
  nr.__esModule = true;
  nr.default = void 0;
  var pc = yc(In()), mc = zA();
  function yc(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function Wa(A, e) {
    for (var t = 0; t < e.length; t++) {
      var r = e[t];
      r.enumerable = r.enumerable || false, r.configurable = true, "value" in r && (r.writable = true), Object.defineProperty(A, r.key, r);
    }
  }
  function wc(A, e, t) {
    return e && Wa(A.prototype, e), A;
  }
  function Dc(A, e) {
    A.prototype = Object.create(e.prototype), A.prototype.constructor = A, Mi(A, e);
  }
  function Mi(A, e) {
    return Mi = Object.setPrototypeOf || function(r, n) {
      return r.__proto__ = n, r;
    }, Mi(A, e);
  }
  var Sc = (function(A) {
    Dc(e, A);
    function e(r) {
      var n;
      return n = A.call(this, r) || this, n.type = mc.ROOT, n;
    }
    var t = e.prototype;
    return t.toString = function() {
      var n = this.reduce(function(i, o) {
        return i.push(String(o)), i;
      }, []).join(",");
      return this.trailingComma ? n + "," : n;
    }, t.error = function(n, i) {
      return this._error ? this._error(n, i) : new Error(n);
    }, wc(e, [{ key: "errorGenerator", set: function(n) {
      this._error = n;
    } }]), e;
  })(pc.default);
  nr.default = Sc;
  Ka.exports = nr.default;
});
var Ui = Y((ir, Ya) => {
  ir.__esModule = true;
  ir.default = void 0;
  var vc = bc(In()), kc = zA();
  function bc(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function Rc(A, e) {
    A.prototype = Object.create(e.prototype), A.prototype.constructor = A, Gi(A, e);
  }
  function Gi(A, e) {
    return Gi = Object.setPrototypeOf || function(r, n) {
      return r.__proto__ = n, r;
    }, Gi(A, e);
  }
  var xc = (function(A) {
    Rc(e, A);
    function e(t) {
      var r;
      return r = A.call(this, t) || this, r.type = kc.SELECTOR, r;
    }
    return e;
  })(vc.default);
  ir.default = xc;
  Ya.exports = ir.default;
});
var ln = Y((Fp, qa) => {
  var Nc = {}, Fc = Nc.hasOwnProperty, Mc = function(e, t) {
    if (!e) return t;
    var r = {};
    for (var n in t) r[n] = Fc.call(e, n) ? e[n] : t[n];
    return r;
  }, Lc = /[ -,\.\/:-@\[-\^`\{-~]/, Gc = /[ -,\.\/:-@\[\]\^`\{-~]/, Uc = /(^|\\+)?(\\[A-F0-9]{1,6})\x20(?![a-fA-F0-9\x20])/g, Hi = function A(e, t) {
    t = Mc(t, A.options), t.quotes != "single" && t.quotes != "double" && (t.quotes = "single");
    for (var r = t.quotes == "double" ? '"' : "'", n = t.isIdentifier, i = e.charAt(0), o = "", g = 0, u = e.length; g < u; ) {
      var c = e.charAt(g++), B = c.charCodeAt(), E = void 0;
      if (B < 32 || B > 126) {
        if (B >= 55296 && B <= 56319 && g < u) {
          var d = e.charCodeAt(g++);
          (d & 64512) == 56320 ? B = ((B & 1023) << 10) + (d & 1023) + 65536 : g--;
        }
        E = "\\" + B.toString(16).toUpperCase() + " ";
      } else t.escapeEverything ? Lc.test(c) ? E = "\\" + c : E = "\\" + B.toString(16).toUpperCase() + " " : /[\t\n\f\r\x0B]/.test(c) ? E = "\\" + B.toString(16).toUpperCase() + " " : c == "\\" || !n && (c == '"' && r == c || c == "'" && r == c) || n && Gc.test(c) ? E = "\\" + c : E = c;
      o += E;
    }
    return n && (/^-[-\d]/.test(o) ? o = "\\-" + o.slice(1) : /\d/.test(i) && (o = "\\3" + i + " " + o.slice(1))), o = o.replace(Uc, function(C, m, D) {
      return m && m.length % 2 ? C : (m || "") + D;
    }), !n && t.wrap ? r + o + r : o;
  };
  Hi.options = { escapeEverything: false, isIdentifier: false, quotes: "single", wrap: false };
  Hi.version = "3.0.0";
  qa.exports = Hi;
});
var Ti = Y((or, za) => {
  or.__esModule = true;
  or.default = void 0;
  var Hc = Va(ln()), Oc = er(), Tc = Va(Ye()), Pc = zA();
  function Va(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function Xa(A, e) {
    for (var t = 0; t < e.length; t++) {
      var r = e[t];
      r.enumerable = r.enumerable || false, r.configurable = true, "value" in r && (r.writable = true), Object.defineProperty(A, r.key, r);
    }
  }
  function _c(A, e, t) {
    return e && Xa(A.prototype, e), A;
  }
  function Jc(A, e) {
    A.prototype = Object.create(e.prototype), A.prototype.constructor = A, Oi(A, e);
  }
  function Oi(A, e) {
    return Oi = Object.setPrototypeOf || function(r, n) {
      return r.__proto__ = n, r;
    }, Oi(A, e);
  }
  var Wc = (function(A) {
    Jc(e, A);
    function e(r) {
      var n;
      return n = A.call(this, r) || this, n.type = Pc.CLASS, n._constructed = true, n;
    }
    var t = e.prototype;
    return t.valueToString = function() {
      return "." + A.prototype.valueToString.call(this);
    }, _c(e, [{ key: "value", get: function() {
      return this._value;
    }, set: function(n) {
      if (this._constructed) {
        var i = (0, Hc.default)(n, { isIdentifier: true });
        i !== n ? ((0, Oc.ensureObject)(this, "raws"), this.raws.value = i) : this.raws && delete this.raws.value;
      }
      this._value = n;
    } }]), e;
  })(Tc.default);
  or.default = Wc;
  za.exports = or.default;
});
var _i = Y((sr, Za) => {
  sr.__esModule = true;
  sr.default = void 0;
  var Kc = qc(Ye()), Yc = zA();
  function qc(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function Xc(A, e) {
    A.prototype = Object.create(e.prototype), A.prototype.constructor = A, Pi(A, e);
  }
  function Pi(A, e) {
    return Pi = Object.setPrototypeOf || function(r, n) {
      return r.__proto__ = n, r;
    }, Pi(A, e);
  }
  var Vc = (function(A) {
    Xc(e, A);
    function e(t) {
      var r;
      return r = A.call(this, t) || this, r.type = Yc.COMMENT, r;
    }
    return e;
  })(Kc.default);
  sr.default = Vc;
  Za.exports = sr.default;
});
var Wi = Y((ar, ja) => {
  ar.__esModule = true;
  ar.default = void 0;
  var zc = jc(Ye()), Zc = zA();
  function jc(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function $c(A, e) {
    A.prototype = Object.create(e.prototype), A.prototype.constructor = A, Ji(A, e);
  }
  function Ji(A, e) {
    return Ji = Object.setPrototypeOf || function(r, n) {
      return r.__proto__ = n, r;
    }, Ji(A, e);
  }
  var AB = (function(A) {
    $c(e, A);
    function e(r) {
      var n;
      return n = A.call(this, r) || this, n.type = Zc.ID, n;
    }
    var t = e.prototype;
    return t.valueToString = function() {
      return "#" + A.prototype.valueToString.call(this);
    }, e;
  })(zc.default);
  ar.default = AB;
  ja.exports = ar.default;
});
var cn = Y((gr, eg) => {
  gr.__esModule = true;
  gr.default = void 0;
  var eB = Ag(ln()), tB = er(), rB = Ag(Ye());
  function Ag(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function $a(A, e) {
    for (var t = 0; t < e.length; t++) {
      var r = e[t];
      r.enumerable = r.enumerable || false, r.configurable = true, "value" in r && (r.writable = true), Object.defineProperty(A, r.key, r);
    }
  }
  function nB(A, e, t) {
    return e && $a(A.prototype, e), A;
  }
  function iB(A, e) {
    A.prototype = Object.create(e.prototype), A.prototype.constructor = A, Ki(A, e);
  }
  function Ki(A, e) {
    return Ki = Object.setPrototypeOf || function(r, n) {
      return r.__proto__ = n, r;
    }, Ki(A, e);
  }
  var oB = (function(A) {
    iB(e, A);
    function e() {
      return A.apply(this, arguments) || this;
    }
    var t = e.prototype;
    return t.qualifiedName = function(n) {
      return this.namespace ? this.namespaceString + "|" + n : n;
    }, t.valueToString = function() {
      return this.qualifiedName(A.prototype.valueToString.call(this));
    }, nB(e, [{ key: "namespace", get: function() {
      return this._namespace;
    }, set: function(n) {
      if (n === true || n === "*" || n === "&") {
        this._namespace = n, this.raws && delete this.raws.namespace;
        return;
      }
      var i = (0, eB.default)(n, { isIdentifier: true });
      this._namespace = n, i !== n ? ((0, tB.ensureObject)(this, "raws"), this.raws.namespace = i) : this.raws && delete this.raws.namespace;
    } }, { key: "ns", get: function() {
      return this._namespace;
    }, set: function(n) {
      this.namespace = n;
    } }, { key: "namespaceString", get: function() {
      if (this.namespace) {
        var n = this.stringifyProperty("namespace");
        return n === true ? "" : n;
      } else return "";
    } }]), e;
  })(rB.default);
  gr.default = oB;
  eg.exports = gr.default;
});
var qi = Y((ur, tg) => {
  ur.__esModule = true;
  ur.default = void 0;
  var sB = gB(cn()), aB = zA();
  function gB(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function uB(A, e) {
    A.prototype = Object.create(e.prototype), A.prototype.constructor = A, Yi(A, e);
  }
  function Yi(A, e) {
    return Yi = Object.setPrototypeOf || function(r, n) {
      return r.__proto__ = n, r;
    }, Yi(A, e);
  }
  var IB = (function(A) {
    uB(e, A);
    function e(t) {
      var r;
      return r = A.call(this, t) || this, r.type = aB.TAG, r;
    }
    return e;
  })(sB.default);
  ur.default = IB;
  tg.exports = ur.default;
});
var Vi = Y((Ir, rg) => {
  Ir.__esModule = true;
  Ir.default = void 0;
  var lB = BB(Ye()), cB = zA();
  function BB(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function fB(A, e) {
    A.prototype = Object.create(e.prototype), A.prototype.constructor = A, Xi(A, e);
  }
  function Xi(A, e) {
    return Xi = Object.setPrototypeOf || function(r, n) {
      return r.__proto__ = n, r;
    }, Xi(A, e);
  }
  var EB = (function(A) {
    fB(e, A);
    function e(t) {
      var r;
      return r = A.call(this, t) || this, r.type = cB.STRING, r;
    }
    return e;
  })(lB.default);
  Ir.default = EB;
  rg.exports = Ir.default;
});
var Zi = Y((lr, ng) => {
  lr.__esModule = true;
  lr.default = void 0;
  var QB = dB(In()), CB = zA();
  function dB(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function hB(A, e) {
    A.prototype = Object.create(e.prototype), A.prototype.constructor = A, zi(A, e);
  }
  function zi(A, e) {
    return zi = Object.setPrototypeOf || function(r, n) {
      return r.__proto__ = n, r;
    }, zi(A, e);
  }
  var pB = (function(A) {
    hB(e, A);
    function e(r) {
      var n;
      return n = A.call(this, r) || this, n.type = CB.PSEUDO, n;
    }
    var t = e.prototype;
    return t.toString = function() {
      var n = this.length ? "(" + this.map(String).join(",") + ")" : "";
      return [this.rawSpaceBefore, this.stringifyProperty("value"), n, this.rawSpaceAfter].join("");
    }, e;
  })(QB.default);
  lr.default = pB;
  ng.exports = lr.default;
});
var og = Y((Mp, ig) => {
  ig.exports = function(e, t) {
    return function(...r) {
      return console.warn(t), e(...r);
    };
  };
});
var ro = Y((fr) => {
  fr.__esModule = true;
  fr.unescapeValue = to;
  fr.default = void 0;
  var cr = eo(ln()), mB = eo(Ni()), yB = eo(cn()), wB = zA(), ji;
  function eo(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function sg(A, e) {
    for (var t = 0; t < e.length; t++) {
      var r = e[t];
      r.enumerable = r.enumerable || false, r.configurable = true, "value" in r && (r.writable = true), Object.defineProperty(A, r.key, r);
    }
  }
  function DB(A, e, t) {
    return e && sg(A.prototype, e), A;
  }
  function SB(A, e) {
    A.prototype = Object.create(e.prototype), A.prototype.constructor = A, Ao(A, e);
  }
  function Ao(A, e) {
    return Ao = Object.setPrototypeOf || function(r, n) {
      return r.__proto__ = n, r;
    }, Ao(A, e);
  }
  var Br = og(), vB = /^('|")([^]*)\1$/, kB = Br(function() {
  }, "Assigning an attribute a value containing characters that might need to be escaped is deprecated. Call attribute.setValue() instead."), bB = Br(function() {
  }, "Assigning attr.quoted is deprecated and has no effect. Assign to attr.quoteMark instead."), RB = Br(function() {
  }, "Constructing an Attribute selector with a value without specifying quoteMark is deprecated. Note: The value should be unescaped now.");
  function to(A) {
    var e = false, t = null, r = A, n = r.match(vB);
    return n && (t = n[1], r = n[2]), r = (0, mB.default)(r), r !== A && (e = true), { deprecatedUsage: e, unescaped: r, quoteMark: t };
  }
  function xB(A) {
    if (A.quoteMark !== void 0 || A.value === void 0) return A;
    RB();
    var e = to(A.value), t = e.quoteMark, r = e.unescaped;
    return A.raws || (A.raws = {}), A.raws.value === void 0 && (A.raws.value = A.value), A.value = r, A.quoteMark = t, A;
  }
  var Bn = (function(A) {
    SB(e, A);
    function e(r) {
      var n;
      return r === void 0 && (r = {}), n = A.call(this, xB(r)) || this, n.type = wB.ATTRIBUTE, n.raws = n.raws || {}, Object.defineProperty(n.raws, "unquoted", { get: Br(function() {
        return n.value;
      }, "attr.raws.unquoted is deprecated. Call attr.value instead."), set: Br(function() {
        return n.value;
      }, "Setting attr.raws.unquoted is deprecated and has no effect. attr.value is unescaped by default now.") }), n._constructed = true, n;
    }
    var t = e.prototype;
    return t.getQuotedValue = function(n) {
      n === void 0 && (n = {});
      var i = this._determineQuoteMark(n), o = $i[i], g = (0, cr.default)(this._value, o);
      return g;
    }, t._determineQuoteMark = function(n) {
      return n.smart ? this.smartQuoteMark(n) : this.preferredQuoteMark(n);
    }, t.setValue = function(n, i) {
      i === void 0 && (i = {}), this._value = n, this._quoteMark = this._determineQuoteMark(i), this._syncRawValue();
    }, t.smartQuoteMark = function(n) {
      var i = this.value, o = i.replace(/[^']/g, "").length, g = i.replace(/[^"]/g, "").length;
      if (o + g === 0) {
        var u = (0, cr.default)(i, { isIdentifier: true });
        if (u === i) return e.NO_QUOTE;
        var c = this.preferredQuoteMark(n);
        if (c === e.NO_QUOTE) {
          var B = this.quoteMark || n.quoteMark || e.DOUBLE_QUOTE, E = $i[B], d = (0, cr.default)(i, E);
          if (d.length < u.length) return B;
        }
        return c;
      } else return g === o ? this.preferredQuoteMark(n) : g < o ? e.DOUBLE_QUOTE : e.SINGLE_QUOTE;
    }, t.preferredQuoteMark = function(n) {
      var i = n.preferCurrentQuoteMark ? this.quoteMark : n.quoteMark;
      return i === void 0 && (i = n.preferCurrentQuoteMark ? n.quoteMark : this.quoteMark), i === void 0 && (i = e.DOUBLE_QUOTE), i;
    }, t._syncRawValue = function() {
      var n = (0, cr.default)(this._value, $i[this.quoteMark]);
      n === this._value ? this.raws && delete this.raws.value : this.raws.value = n;
    }, t._handleEscapes = function(n, i) {
      if (this._constructed) {
        var o = (0, cr.default)(i, { isIdentifier: true });
        o !== i ? this.raws[n] = o : delete this.raws[n];
      }
    }, t._spacesFor = function(n) {
      var i = { before: "", after: "" }, o = this.spaces[n] || {}, g = this.raws.spaces && this.raws.spaces[n] || {};
      return Object.assign(i, o, g);
    }, t._stringFor = function(n, i, o) {
      i === void 0 && (i = n), o === void 0 && (o = ag);
      var g = this._spacesFor(i);
      return o(this.stringifyProperty(n), g);
    }, t.offsetOf = function(n) {
      var i = 1, o = this._spacesFor("attribute");
      if (i += o.before.length, n === "namespace" || n === "ns") return this.namespace ? i : -1;
      if (n === "attributeNS" || (i += this.namespaceString.length, this.namespace && (i += 1), n === "attribute")) return i;
      i += this.stringifyProperty("attribute").length, i += o.after.length;
      var g = this._spacesFor("operator");
      i += g.before.length;
      var u = this.stringifyProperty("operator");
      if (n === "operator") return u ? i : -1;
      i += u.length, i += g.after.length;
      var c = this._spacesFor("value");
      i += c.before.length;
      var B = this.stringifyProperty("value");
      if (n === "value") return B ? i : -1;
      i += B.length, i += c.after.length;
      var E = this._spacesFor("insensitive");
      return i += E.before.length, n === "insensitive" && this.insensitive ? i : -1;
    }, t.toString = function() {
      var n = this, i = [this.rawSpaceBefore, "["];
      return i.push(this._stringFor("qualifiedAttribute", "attribute")), this.operator && (this.value || this.value === "") && (i.push(this._stringFor("operator")), i.push(this._stringFor("value")), i.push(this._stringFor("insensitiveFlag", "insensitive", function(o, g) {
        return o.length > 0 && !n.quoted && g.before.length === 0 && !(n.spaces.value && n.spaces.value.after) && (g.before = " "), ag(o, g);
      }))), i.push("]"), i.push(this.rawSpaceAfter), i.join("");
    }, DB(e, [{ key: "quoted", get: function() {
      var n = this.quoteMark;
      return n === "'" || n === '"';
    }, set: function(n) {
      bB();
    } }, { key: "quoteMark", get: function() {
      return this._quoteMark;
    }, set: function(n) {
      if (!this._constructed) {
        this._quoteMark = n;
        return;
      }
      this._quoteMark !== n && (this._quoteMark = n, this._syncRawValue());
    } }, { key: "qualifiedAttribute", get: function() {
      return this.qualifiedName(this.raws.attribute || this.attribute);
    } }, { key: "insensitiveFlag", get: function() {
      return this.insensitive ? "i" : "";
    } }, { key: "value", get: function() {
      return this._value;
    }, set: function(n) {
      if (this._constructed) {
        var i = to(n), o = i.deprecatedUsage, g = i.unescaped, u = i.quoteMark;
        if (o && kB(), g === this._value && u === this._quoteMark) return;
        this._value = g, this._quoteMark = u, this._syncRawValue();
      } else this._value = n;
    } }, { key: "attribute", get: function() {
      return this._attribute;
    }, set: function(n) {
      this._handleEscapes("attribute", n), this._attribute = n;
    } }]), e;
  })(yB.default);
  fr.default = Bn;
  Bn.NO_QUOTE = null;
  Bn.SINGLE_QUOTE = "'";
  Bn.DOUBLE_QUOTE = '"';
  var $i = (ji = { "'": { quotes: "single", wrap: true }, '"': { quotes: "double", wrap: true } }, ji[null] = { isIdentifier: true }, ji);
  function ag(A, e) {
    return "" + e.before + A + e.after;
  }
});
var io = Y((Er, gg) => {
  Er.__esModule = true;
  Er.default = void 0;
  var NB = MB(cn()), FB = zA();
  function MB(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function LB(A, e) {
    A.prototype = Object.create(e.prototype), A.prototype.constructor = A, no(A, e);
  }
  function no(A, e) {
    return no = Object.setPrototypeOf || function(r, n) {
      return r.__proto__ = n, r;
    }, no(A, e);
  }
  var GB = (function(A) {
    LB(e, A);
    function e(t) {
      var r;
      return r = A.call(this, t) || this, r.type = FB.UNIVERSAL, r.value = "*", r;
    }
    return e;
  })(NB.default);
  Er.default = GB;
  gg.exports = Er.default;
});
var so = Y((Qr, ug) => {
  Qr.__esModule = true;
  Qr.default = void 0;
  var UB = OB(Ye()), HB = zA();
  function OB(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function TB(A, e) {
    A.prototype = Object.create(e.prototype), A.prototype.constructor = A, oo(A, e);
  }
  function oo(A, e) {
    return oo = Object.setPrototypeOf || function(r, n) {
      return r.__proto__ = n, r;
    }, oo(A, e);
  }
  var PB = (function(A) {
    TB(e, A);
    function e(t) {
      var r;
      return r = A.call(this, t) || this, r.type = HB.COMBINATOR, r;
    }
    return e;
  })(UB.default);
  Qr.default = PB;
  ug.exports = Qr.default;
});
var go = Y((Cr, Ig) => {
  Cr.__esModule = true;
  Cr.default = void 0;
  var _B = WB(Ye()), JB = zA();
  function WB(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function KB(A, e) {
    A.prototype = Object.create(e.prototype), A.prototype.constructor = A, ao(A, e);
  }
  function ao(A, e) {
    return ao = Object.setPrototypeOf || function(r, n) {
      return r.__proto__ = n, r;
    }, ao(A, e);
  }
  var YB = (function(A) {
    KB(e, A);
    function e(t) {
      var r;
      return r = A.call(this, t) || this, r.type = JB.NESTING, r.value = "&", r;
    }
    return e;
  })(_B.default);
  Cr.default = YB;
  Ig.exports = Cr.default;
});
var cg = Y((fn, lg) => {
  fn.__esModule = true;
  fn.default = qB;
  function qB(A) {
    return A.sort(function(e, t) {
      return e - t;
    });
  }
  lg.exports = fn.default;
});
var uo = Y((_) => {
  _.__esModule = true;
  _.combinator = _.word = _.comment = _.str = _.tab = _.newline = _.feed = _.cr = _.backslash = _.bang = _.slash = _.doubleQuote = _.singleQuote = _.space = _.greaterThan = _.pipe = _.equals = _.plus = _.caret = _.tilde = _.dollar = _.closeSquare = _.openSquare = _.closeParenthesis = _.openParenthesis = _.semicolon = _.colon = _.comma = _.at = _.asterisk = _.ampersand = void 0;
  var XB = 38;
  _.ampersand = XB;
  var VB = 42;
  _.asterisk = VB;
  var zB = 64;
  _.at = zB;
  var ZB = 44;
  _.comma = ZB;
  var jB = 58;
  _.colon = jB;
  var $B = 59;
  _.semicolon = $B;
  var Af = 40;
  _.openParenthesis = Af;
  var ef = 41;
  _.closeParenthesis = ef;
  var tf = 91;
  _.openSquare = tf;
  var rf = 93;
  _.closeSquare = rf;
  var nf = 36;
  _.dollar = nf;
  var of = 126;
  _.tilde = of;
  var sf = 94;
  _.caret = sf;
  var af = 43;
  _.plus = af;
  var gf = 61;
  _.equals = gf;
  var uf = 124;
  _.pipe = uf;
  var If = 62;
  _.greaterThan = If;
  var lf = 32;
  _.space = lf;
  var Bg = 39;
  _.singleQuote = Bg;
  var cf = 34;
  _.doubleQuote = cf;
  var Bf = 47;
  _.slash = Bf;
  var ff = 33;
  _.bang = ff;
  var Ef = 92;
  _.backslash = Ef;
  var Qf = 13;
  _.cr = Qf;
  var Cf = 12;
  _.feed = Cf;
  var df = 10;
  _.newline = df;
  var hf = 9;
  _.tab = hf;
  var pf = Bg;
  _.str = pf;
  var mf = -1;
  _.comment = mf;
  var yf = -2;
  _.word = yf;
  var wf = -3;
  _.combinator = wf;
});
var Qg = Y((dr) => {
  dr.__esModule = true;
  dr.default = xf;
  dr.FIELDS = void 0;
  var O = Df(uo()), vt, EA;
  function Eg() {
    if (typeof WeakMap != "function") return null;
    var A = /* @__PURE__ */ new WeakMap();
    return Eg = function() {
      return A;
    }, A;
  }
  function Df(A) {
    if (A && A.__esModule) return A;
    if (A === null || typeof A != "object" && typeof A != "function") return { default: A };
    var e = Eg();
    if (e && e.has(A)) return e.get(A);
    var t = {}, r = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for (var n in A) if (Object.prototype.hasOwnProperty.call(A, n)) {
      var i = r ? Object.getOwnPropertyDescriptor(A, n) : null;
      i && (i.get || i.set) ? Object.defineProperty(t, n, i) : t[n] = A[n];
    }
    return t.default = A, e && e.set(A, t), t;
  }
  var Sf = (vt = {}, vt[O.tab] = true, vt[O.newline] = true, vt[O.cr] = true, vt[O.feed] = true, vt), vf = (EA = {}, EA[O.space] = true, EA[O.tab] = true, EA[O.newline] = true, EA[O.cr] = true, EA[O.feed] = true, EA[O.ampersand] = true, EA[O.asterisk] = true, EA[O.bang] = true, EA[O.comma] = true, EA[O.colon] = true, EA[O.semicolon] = true, EA[O.openParenthesis] = true, EA[O.closeParenthesis] = true, EA[O.openSquare] = true, EA[O.closeSquare] = true, EA[O.singleQuote] = true, EA[O.doubleQuote] = true, EA[O.plus] = true, EA[O.pipe] = true, EA[O.tilde] = true, EA[O.greaterThan] = true, EA[O.equals] = true, EA[O.dollar] = true, EA[O.caret] = true, EA[O.slash] = true, EA), Io = {}, fg = "0123456789abcdefABCDEF";
  for (En = 0; En < fg.length; En++) Io[fg.charCodeAt(En)] = true;
  var En;
  function kf(A, e) {
    var t = e, r;
    do {
      if (r = A.charCodeAt(t), vf[r]) return t - 1;
      r === O.backslash ? t = bf(A, t) + 1 : t++;
    } while (t < A.length);
    return t - 1;
  }
  function bf(A, e) {
    var t = e, r = A.charCodeAt(t + 1);
    if (!Sf[r]) if (Io[r]) {
      var n = 0;
      do
        t++, n++, r = A.charCodeAt(t + 1);
      while (Io[r] && n < 6);
      n < 6 && r === O.space && t++;
    } else t++;
    return t;
  }
  var Rf = { TYPE: 0, START_LINE: 1, START_COL: 2, END_LINE: 3, END_COL: 4, START_POS: 5, END_POS: 6 };
  dr.FIELDS = Rf;
  function xf(A) {
    var e = [], t = A.css.valueOf(), r = t, n = r.length, i = -1, o = 1, g = 0, u = 0, c, B, E, d, C, m, D, S, b, L, x, k, F;
    function G(J, q) {
      if (A.safe) t += q, b = t.length - 1;
      else throw A.error("Unclosed " + J, o, g - i, g);
    }
    for (; g < n; ) {
      switch (c = t.charCodeAt(g), c === O.newline && (i = g, o += 1), c) {
        case O.space:
        case O.tab:
        case O.newline:
        case O.cr:
        case O.feed:
          b = g;
          do
            b += 1, c = t.charCodeAt(b), c === O.newline && (i = b, o += 1);
          while (c === O.space || c === O.newline || c === O.tab || c === O.cr || c === O.feed);
          F = O.space, d = o, E = b - i - 1, u = b;
          break;
        case O.plus:
        case O.greaterThan:
        case O.tilde:
        case O.pipe:
          b = g;
          do
            b += 1, c = t.charCodeAt(b);
          while (c === O.plus || c === O.greaterThan || c === O.tilde || c === O.pipe);
          F = O.combinator, d = o, E = g - i, u = b;
          break;
        case O.asterisk:
        case O.ampersand:
        case O.bang:
        case O.comma:
        case O.equals:
        case O.dollar:
        case O.caret:
        case O.openSquare:
        case O.closeSquare:
        case O.colon:
        case O.semicolon:
        case O.openParenthesis:
        case O.closeParenthesis:
          b = g, F = c, d = o, E = g - i, u = b + 1;
          break;
        case O.singleQuote:
        case O.doubleQuote:
          k = c === O.singleQuote ? "'" : '"', b = g;
          do
            for (C = false, b = t.indexOf(k, b + 1), b === -1 && G("quote", k), m = b; t.charCodeAt(m - 1) === O.backslash; ) m -= 1, C = !C;
          while (C);
          F = O.str, d = o, E = g - i, u = b + 1;
          break;
        default:
          c === O.slash && t.charCodeAt(g + 1) === O.asterisk ? (b = t.indexOf("*/", g + 2) + 1, b === 0 && G("comment", "*/"), B = t.slice(g, b + 1), S = B.split(`
`), D = S.length - 1, D > 0 ? (L = o + D, x = b - S[D].length) : (L = o, x = i), F = O.comment, o = L, d = L, E = b - x) : c === O.slash ? (b = g, F = c, d = o, E = g - i, u = b + 1) : (b = kf(t, g), F = O.word, d = o, E = b - i), u = b + 1;
          break;
      }
      e.push([F, o, g - i, d, E, g, u]), x && (i = x, x = null), g = u;
    }
    return e;
  }
});
var Dg = Y((hr, wg) => {
  hr.__esModule = true;
  hr.default = void 0;
  var Nf = Qe(Li()), lo = Qe(Ui()), Ff = Qe(Ti()), Cg = Qe(_i()), Mf = Qe(Wi()), Lf = Qe(qi()), co = Qe(Vi()), Gf = Qe(Zi()), dg = Qn(ro()), Uf = Qe(io()), Bo = Qe(so()), Hf = Qe(go()), Of = Qe(cg()), M = Qn(Qg()), T = Qn(uo()), Tf = Qn(zA()), mA = er(), ut, fo;
  function yg() {
    if (typeof WeakMap != "function") return null;
    var A = /* @__PURE__ */ new WeakMap();
    return yg = function() {
      return A;
    }, A;
  }
  function Qn(A) {
    if (A && A.__esModule) return A;
    if (A === null || typeof A != "object" && typeof A != "function") return { default: A };
    var e = yg();
    if (e && e.has(A)) return e.get(A);
    var t = {}, r = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for (var n in A) if (Object.prototype.hasOwnProperty.call(A, n)) {
      var i = r ? Object.getOwnPropertyDescriptor(A, n) : null;
      i && (i.get || i.set) ? Object.defineProperty(t, n, i) : t[n] = A[n];
    }
    return t.default = A, e && e.set(A, t), t;
  }
  function Qe(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function hg(A, e) {
    for (var t = 0; t < e.length; t++) {
      var r = e[t];
      r.enumerable = r.enumerable || false, r.configurable = true, "value" in r && (r.writable = true), Object.defineProperty(A, r.key, r);
    }
  }
  function Pf(A, e, t) {
    return e && hg(A.prototype, e), A;
  }
  var Co = (ut = {}, ut[T.space] = true, ut[T.cr] = true, ut[T.feed] = true, ut[T.newline] = true, ut[T.tab] = true, ut), _f = Object.assign({}, Co, (fo = {}, fo[T.comment] = true, fo));
  function pg(A) {
    return { line: A[M.FIELDS.START_LINE], column: A[M.FIELDS.START_COL] };
  }
  function mg(A) {
    return { line: A[M.FIELDS.END_LINE], column: A[M.FIELDS.END_COL] };
  }
  function It(A, e, t, r) {
    return { start: { line: A, column: e }, end: { line: t, column: r } };
  }
  function kt(A) {
    return It(A[M.FIELDS.START_LINE], A[M.FIELDS.START_COL], A[M.FIELDS.END_LINE], A[M.FIELDS.END_COL]);
  }
  function Eo(A, e) {
    if (A) return It(A[M.FIELDS.START_LINE], A[M.FIELDS.START_COL], e[M.FIELDS.END_LINE], e[M.FIELDS.END_COL]);
  }
  function bt(A, e) {
    var t = A[e];
    if (typeof t == "string") return t.indexOf("\\") !== -1 && ((0, mA.ensureObject)(A, "raws"), A[e] = (0, mA.unesc)(t), A.raws[e] === void 0 && (A.raws[e] = t)), A;
  }
  function Qo(A, e) {
    for (var t = -1, r = []; (t = A.indexOf(e, t + 1)) !== -1; ) r.push(t);
    return r;
  }
  function Jf() {
    var A = Array.prototype.concat.apply([], arguments);
    return A.filter(function(e, t) {
      return t === A.indexOf(e);
    });
  }
  var Wf = (function() {
    function A(t, r) {
      r === void 0 && (r = {}), this.rule = t, this.options = Object.assign({ lossy: false, safe: false }, r), this.position = 0, this.css = typeof this.rule == "string" ? this.rule : this.rule.selector, this.tokens = (0, M.default)({ css: this.css, error: this._errorGenerator(), safe: this.options.safe });
      var n = Eo(this.tokens[0], this.tokens[this.tokens.length - 1]);
      this.root = new Nf.default({ source: n }), this.root.errorGenerator = this._errorGenerator();
      var i = new lo.default({ source: { start: { line: 1, column: 1 } } });
      this.root.append(i), this.current = i, this.loop();
    }
    var e = A.prototype;
    return e._errorGenerator = function() {
      var r = this;
      return function(n, i) {
        return typeof r.rule == "string" ? new Error(n) : r.rule.error(n, i);
      };
    }, e.attribute = function() {
      var r = [], n = this.currToken;
      for (this.position++; this.position < this.tokens.length && this.currToken[M.FIELDS.TYPE] !== T.closeSquare; ) r.push(this.currToken), this.position++;
      if (this.currToken[M.FIELDS.TYPE] !== T.closeSquare) return this.expected("closing square bracket", this.currToken[M.FIELDS.START_POS]);
      var i = r.length, o = { source: It(n[1], n[2], this.currToken[3], this.currToken[4]), sourceIndex: n[M.FIELDS.START_POS] };
      if (i === 1 && !~[T.word].indexOf(r[0][M.FIELDS.TYPE])) return this.expected("attribute", r[0][M.FIELDS.START_POS]);
      for (var g = 0, u = "", c = "", B = null, E = false; g < i; ) {
        var d = r[g], C = this.content(d), m = r[g + 1];
        switch (d[M.FIELDS.TYPE]) {
          case T.space:
            if (E = true, this.options.lossy) break;
            if (B) {
              (0, mA.ensureObject)(o, "spaces", B);
              var D = o.spaces[B].after || "";
              o.spaces[B].after = D + C;
              var S = (0, mA.getProp)(o, "raws", "spaces", B, "after") || null;
              S && (o.raws.spaces[B].after = S + C);
            } else u = u + C, c = c + C;
            break;
          case T.asterisk:
            if (m[M.FIELDS.TYPE] === T.equals) o.operator = C, B = "operator";
            else if ((!o.namespace || B === "namespace" && !E) && m) {
              u && ((0, mA.ensureObject)(o, "spaces", "attribute"), o.spaces.attribute.before = u, u = ""), c && ((0, mA.ensureObject)(o, "raws", "spaces", "attribute"), o.raws.spaces.attribute.before = u, c = ""), o.namespace = (o.namespace || "") + C;
              var b = (0, mA.getProp)(o, "raws", "namespace") || null;
              b && (o.raws.namespace += C), B = "namespace";
            }
            E = false;
            break;
          case T.dollar:
            if (B === "value") {
              var L = (0, mA.getProp)(o, "raws", "value");
              o.value += "$", L && (o.raws.value = L + "$");
              break;
            }
          case T.caret:
            m[M.FIELDS.TYPE] === T.equals && (o.operator = C, B = "operator"), E = false;
            break;
          case T.combinator:
            if (C === "~" && m[M.FIELDS.TYPE] === T.equals && (o.operator = C, B = "operator"), C !== "|") {
              E = false;
              break;
            }
            m[M.FIELDS.TYPE] === T.equals ? (o.operator = C, B = "operator") : !o.namespace && !o.attribute && (o.namespace = true), E = false;
            break;
          case T.word:
            if (m && this.content(m) === "|" && r[g + 2] && r[g + 2][M.FIELDS.TYPE] !== T.equals && !o.operator && !o.namespace) o.namespace = C, B = "namespace";
            else if (!o.attribute || B === "attribute" && !E) {
              u && ((0, mA.ensureObject)(o, "spaces", "attribute"), o.spaces.attribute.before = u, u = ""), c && ((0, mA.ensureObject)(o, "raws", "spaces", "attribute"), o.raws.spaces.attribute.before = c, c = ""), o.attribute = (o.attribute || "") + C;
              var x = (0, mA.getProp)(o, "raws", "attribute") || null;
              x && (o.raws.attribute += C), B = "attribute";
            } else if (!o.value && o.value !== "" || B === "value" && !E) {
              var k = (0, mA.unesc)(C), F = (0, mA.getProp)(o, "raws", "value") || "", G = o.value || "";
              o.value = G + k, o.quoteMark = null, (k !== C || F) && ((0, mA.ensureObject)(o, "raws"), o.raws.value = (F || G) + C), B = "value";
            } else {
              var J = C === "i" || C === "I";
              (o.value || o.value === "") && (o.quoteMark || E) ? (o.insensitive = J, (!J || C === "I") && ((0, mA.ensureObject)(o, "raws"), o.raws.insensitiveFlag = C), B = "insensitive", u && ((0, mA.ensureObject)(o, "spaces", "insensitive"), o.spaces.insensitive.before = u, u = ""), c && ((0, mA.ensureObject)(o, "raws", "spaces", "insensitive"), o.raws.spaces.insensitive.before = c, c = "")) : (o.value || o.value === "") && (B = "value", o.value += C, o.raws.value && (o.raws.value += C));
            }
            E = false;
            break;
          case T.str:
            if (!o.attribute || !o.operator) return this.error("Expected an attribute followed by an operator preceding the string.", { index: d[M.FIELDS.START_POS] });
            var q = (0, dg.unescapeValue)(C), lA = q.unescaped, wA = q.quoteMark;
            o.value = lA, o.quoteMark = wA, B = "value", (0, mA.ensureObject)(o, "raws"), o.raws.value = C, E = false;
            break;
          case T.equals:
            if (!o.attribute) return this.expected("attribute", d[M.FIELDS.START_POS], C);
            if (o.value) return this.error('Unexpected "=" found; an operator was already defined.', { index: d[M.FIELDS.START_POS] });
            o.operator = o.operator ? o.operator + C : C, B = "operator", E = false;
            break;
          case T.comment:
            if (B) if (E || m && m[M.FIELDS.TYPE] === T.space || B === "insensitive") {
              var UA = (0, mA.getProp)(o, "spaces", B, "after") || "", NA = (0, mA.getProp)(o, "raws", "spaces", B, "after") || UA;
              (0, mA.ensureObject)(o, "raws", "spaces", B), o.raws.spaces[B].after = NA + C;
            } else {
              var j = o[B] || "", SA = (0, mA.getProp)(o, "raws", B) || j;
              (0, mA.ensureObject)(o, "raws"), o.raws[B] = SA + C;
            }
            else c = c + C;
            break;
          default:
            return this.error('Unexpected "' + C + '" found.', { index: d[M.FIELDS.START_POS] });
        }
        g++;
      }
      bt(o, "attribute"), bt(o, "namespace"), this.newNode(new dg.default(o)), this.position++;
    }, e.parseWhitespaceEquivalentTokens = function(r) {
      r < 0 && (r = this.tokens.length);
      var n = this.position, i = [], o = "", g = void 0;
      do
        if (Co[this.currToken[M.FIELDS.TYPE]]) this.options.lossy || (o += this.content());
        else if (this.currToken[M.FIELDS.TYPE] === T.comment) {
          var u = {};
          o && (u.before = o, o = ""), g = new Cg.default({ value: this.content(), source: kt(this.currToken), sourceIndex: this.currToken[M.FIELDS.START_POS], spaces: u }), i.push(g);
        }
      while (++this.position < r);
      if (o) {
        if (g) g.spaces.after = o;
        else if (!this.options.lossy) {
          var c = this.tokens[n], B = this.tokens[this.position - 1];
          i.push(new co.default({ value: "", source: It(c[M.FIELDS.START_LINE], c[M.FIELDS.START_COL], B[M.FIELDS.END_LINE], B[M.FIELDS.END_COL]), sourceIndex: c[M.FIELDS.START_POS], spaces: { before: o, after: "" } }));
        }
      }
      return i;
    }, e.convertWhitespaceNodesToSpace = function(r, n) {
      var i = this;
      n === void 0 && (n = false);
      var o = "", g = "";
      r.forEach(function(c) {
        var B = i.lossySpace(c.spaces.before, n), E = i.lossySpace(c.rawSpaceBefore, n);
        o += B + i.lossySpace(c.spaces.after, n && B.length === 0), g += B + c.value + i.lossySpace(c.rawSpaceAfter, n && E.length === 0);
      }), g === o && (g = void 0);
      var u = { space: o, rawSpace: g };
      return u;
    }, e.isNamedCombinator = function(r) {
      return r === void 0 && (r = this.position), this.tokens[r + 0] && this.tokens[r + 0][M.FIELDS.TYPE] === T.slash && this.tokens[r + 1] && this.tokens[r + 1][M.FIELDS.TYPE] === T.word && this.tokens[r + 2] && this.tokens[r + 2][M.FIELDS.TYPE] === T.slash;
    }, e.namedCombinator = function() {
      if (this.isNamedCombinator()) {
        var r = this.content(this.tokens[this.position + 1]), n = (0, mA.unesc)(r).toLowerCase(), i = {};
        n !== r && (i.value = "/" + r + "/");
        var o = new Bo.default({ value: "/" + n + "/", source: It(this.currToken[M.FIELDS.START_LINE], this.currToken[M.FIELDS.START_COL], this.tokens[this.position + 2][M.FIELDS.END_LINE], this.tokens[this.position + 2][M.FIELDS.END_COL]), sourceIndex: this.currToken[M.FIELDS.START_POS], raws: i });
        return this.position = this.position + 3, o;
      } else this.unexpected();
    }, e.combinator = function() {
      var r = this;
      if (this.content() === "|") return this.namespace();
      var n = this.locateNextMeaningfulToken(this.position);
      if (n < 0 || this.tokens[n][M.FIELDS.TYPE] === T.comma) {
        var i = this.parseWhitespaceEquivalentTokens(n);
        if (i.length > 0) {
          var o = this.current.last;
          if (o) {
            var g = this.convertWhitespaceNodesToSpace(i), u = g.space, c = g.rawSpace;
            c !== void 0 && (o.rawSpaceAfter += c), o.spaces.after += u;
          } else i.forEach(function(F) {
            return r.newNode(F);
          });
        }
        return;
      }
      var B = this.currToken, E = void 0;
      n > this.position && (E = this.parseWhitespaceEquivalentTokens(n));
      var d;
      if (this.isNamedCombinator() ? d = this.namedCombinator() : this.currToken[M.FIELDS.TYPE] === T.combinator ? (d = new Bo.default({ value: this.content(), source: kt(this.currToken), sourceIndex: this.currToken[M.FIELDS.START_POS] }), this.position++) : Co[this.currToken[M.FIELDS.TYPE]] || E || this.unexpected(), d) {
        if (E) {
          var C = this.convertWhitespaceNodesToSpace(E), m = C.space, D = C.rawSpace;
          d.spaces.before = m, d.rawSpaceBefore = D;
        }
      } else {
        var S = this.convertWhitespaceNodesToSpace(E, true), b = S.space, L = S.rawSpace;
        L || (L = b);
        var x = {}, k = { spaces: {} };
        b.endsWith(" ") && L.endsWith(" ") ? (x.before = b.slice(0, b.length - 1), k.spaces.before = L.slice(0, L.length - 1)) : b.startsWith(" ") && L.startsWith(" ") ? (x.after = b.slice(1), k.spaces.after = L.slice(1)) : k.value = L, d = new Bo.default({ value: " ", source: Eo(B, this.tokens[this.position - 1]), sourceIndex: B[M.FIELDS.START_POS], spaces: x, raws: k });
      }
      return this.currToken && this.currToken[M.FIELDS.TYPE] === T.space && (d.spaces.after = this.optionalSpace(this.content()), this.position++), this.newNode(d);
    }, e.comma = function() {
      if (this.position === this.tokens.length - 1) {
        this.root.trailingComma = true, this.position++;
        return;
      }
      this.current._inferEndPosition();
      var r = new lo.default({ source: { start: pg(this.tokens[this.position + 1]) } });
      this.current.parent.append(r), this.current = r, this.position++;
    }, e.comment = function() {
      var r = this.currToken;
      this.newNode(new Cg.default({ value: this.content(), source: kt(r), sourceIndex: r[M.FIELDS.START_POS] })), this.position++;
    }, e.error = function(r, n) {
      throw this.root.error(r, n);
    }, e.missingBackslash = function() {
      return this.error("Expected a backslash preceding the semicolon.", { index: this.currToken[M.FIELDS.START_POS] });
    }, e.missingParenthesis = function() {
      return this.expected("opening parenthesis", this.currToken[M.FIELDS.START_POS]);
    }, e.missingSquareBracket = function() {
      return this.expected("opening square bracket", this.currToken[M.FIELDS.START_POS]);
    }, e.unexpected = function() {
      return this.error("Unexpected '" + this.content() + "'. Escaping special characters with \\ may help.", this.currToken[M.FIELDS.START_POS]);
    }, e.namespace = function() {
      var r = this.prevToken && this.content(this.prevToken) || true;
      if (this.nextToken[M.FIELDS.TYPE] === T.word) return this.position++, this.word(r);
      if (this.nextToken[M.FIELDS.TYPE] === T.asterisk) return this.position++, this.universal(r);
    }, e.nesting = function() {
      if (this.nextToken) {
        var r = this.content(this.nextToken);
        if (r === "|") {
          this.position++;
          return;
        }
      }
      var n = this.currToken;
      this.newNode(new Hf.default({ value: this.content(), source: kt(n), sourceIndex: n[M.FIELDS.START_POS] })), this.position++;
    }, e.parentheses = function() {
      var r = this.current.last, n = 1;
      if (this.position++, r && r.type === Tf.PSEUDO) {
        var i = new lo.default({ source: { start: pg(this.tokens[this.position - 1]) } }), o = this.current;
        for (r.append(i), this.current = i; this.position < this.tokens.length && n; ) this.currToken[M.FIELDS.TYPE] === T.openParenthesis && n++, this.currToken[M.FIELDS.TYPE] === T.closeParenthesis && n--, n ? this.parse() : (this.current.source.end = mg(this.currToken), this.current.parent.source.end = mg(this.currToken), this.position++);
        this.current = o;
      } else {
        for (var g = this.currToken, u = "(", c; this.position < this.tokens.length && n; ) this.currToken[M.FIELDS.TYPE] === T.openParenthesis && n++, this.currToken[M.FIELDS.TYPE] === T.closeParenthesis && n--, c = this.currToken, u += this.parseParenthesisToken(this.currToken), this.position++;
        r ? r.appendToPropertyAndEscape("value", u, u) : this.newNode(new co.default({ value: u, source: It(g[M.FIELDS.START_LINE], g[M.FIELDS.START_COL], c[M.FIELDS.END_LINE], c[M.FIELDS.END_COL]), sourceIndex: g[M.FIELDS.START_POS] }));
      }
      if (n) return this.expected("closing parenthesis", this.currToken[M.FIELDS.START_POS]);
    }, e.pseudo = function() {
      for (var r = this, n = "", i = this.currToken; this.currToken && this.currToken[M.FIELDS.TYPE] === T.colon; ) n += this.content(), this.position++;
      if (!this.currToken) return this.expected(["pseudo-class", "pseudo-element"], this.position - 1);
      if (this.currToken[M.FIELDS.TYPE] === T.word) this.splitWord(false, function(o, g) {
        n += o, r.newNode(new Gf.default({ value: n, source: Eo(i, r.currToken), sourceIndex: i[M.FIELDS.START_POS] })), g > 1 && r.nextToken && r.nextToken[M.FIELDS.TYPE] === T.openParenthesis && r.error("Misplaced parenthesis.", { index: r.nextToken[M.FIELDS.START_POS] });
      });
      else return this.expected(["pseudo-class", "pseudo-element"], this.currToken[M.FIELDS.START_POS]);
    }, e.space = function() {
      var r = this.content();
      this.position === 0 || this.prevToken[M.FIELDS.TYPE] === T.comma || this.prevToken[M.FIELDS.TYPE] === T.openParenthesis || this.current.nodes.every(function(n) {
        return n.type === "comment";
      }) ? (this.spaces = this.optionalSpace(r), this.position++) : this.position === this.tokens.length - 1 || this.nextToken[M.FIELDS.TYPE] === T.comma || this.nextToken[M.FIELDS.TYPE] === T.closeParenthesis ? (this.current.last.spaces.after = this.optionalSpace(r), this.position++) : this.combinator();
    }, e.string = function() {
      var r = this.currToken;
      this.newNode(new co.default({ value: this.content(), source: kt(r), sourceIndex: r[M.FIELDS.START_POS] })), this.position++;
    }, e.universal = function(r) {
      var n = this.nextToken;
      if (n && this.content(n) === "|") return this.position++, this.namespace();
      var i = this.currToken;
      this.newNode(new Uf.default({ value: this.content(), source: kt(i), sourceIndex: i[M.FIELDS.START_POS] }), r), this.position++;
    }, e.splitWord = function(r, n) {
      for (var i = this, o = this.nextToken, g = this.content(); o && ~[T.dollar, T.caret, T.equals, T.word].indexOf(o[M.FIELDS.TYPE]); ) {
        this.position++;
        var u = this.content();
        if (g += u, u.lastIndexOf("\\") === u.length - 1) {
          var c = this.nextToken;
          c && c[M.FIELDS.TYPE] === T.space && (g += this.requiredSpace(this.content(c)), this.position++);
        }
        o = this.nextToken;
      }
      var B = Qo(g, ".").filter(function(m) {
        var D = g[m - 1] === "\\", S = /^\d+\.\d+%$/.test(g);
        return !D && !S;
      }), E = Qo(g, "#").filter(function(m) {
        return g[m - 1] !== "\\";
      }), d = Qo(g, "#{");
      d.length && (E = E.filter(function(m) {
        return !~d.indexOf(m);
      }));
      var C = (0, Of.default)(Jf([0].concat(B, E)));
      C.forEach(function(m, D) {
        var S = C[D + 1] || g.length, b = g.slice(m, S);
        if (D === 0 && n) return n.call(i, b, C.length);
        var L, x = i.currToken, k = x[M.FIELDS.START_POS] + C[D], F = It(x[1], x[2] + m, x[3], x[2] + (S - 1));
        if (~B.indexOf(m)) {
          var G = { value: b.slice(1), source: F, sourceIndex: k };
          L = new Ff.default(bt(G, "value"));
        } else if (~E.indexOf(m)) {
          var J = { value: b.slice(1), source: F, sourceIndex: k };
          L = new Mf.default(bt(J, "value"));
        } else {
          var q = { value: b, source: F, sourceIndex: k };
          bt(q, "value"), L = new Lf.default(q);
        }
        i.newNode(L, r), r = null;
      }), this.position++;
    }, e.word = function(r) {
      var n = this.nextToken;
      return n && this.content(n) === "|" ? (this.position++, this.namespace()) : this.splitWord(r);
    }, e.loop = function() {
      for (; this.position < this.tokens.length; ) this.parse(true);
      return this.current._inferEndPosition(), this.root;
    }, e.parse = function(r) {
      switch (this.currToken[M.FIELDS.TYPE]) {
        case T.space:
          this.space();
          break;
        case T.comment:
          this.comment();
          break;
        case T.openParenthesis:
          this.parentheses();
          break;
        case T.closeParenthesis:
          r && this.missingParenthesis();
          break;
        case T.openSquare:
          this.attribute();
          break;
        case T.dollar:
        case T.caret:
        case T.equals:
        case T.word:
          this.word();
          break;
        case T.colon:
          this.pseudo();
          break;
        case T.comma:
          this.comma();
          break;
        case T.asterisk:
          this.universal();
          break;
        case T.ampersand:
          this.nesting();
          break;
        case T.slash:
        case T.combinator:
          this.combinator();
          break;
        case T.str:
          this.string();
          break;
        case T.closeSquare:
          this.missingSquareBracket();
        case T.semicolon:
          this.missingBackslash();
        default:
          this.unexpected();
      }
    }, e.expected = function(r, n, i) {
      if (Array.isArray(r)) {
        var o = r.pop();
        r = r.join(", ") + " or " + o;
      }
      var g = /^[aeiou]/.test(r[0]) ? "an" : "a";
      return i ? this.error("Expected " + g + " " + r + ', found "' + i + '" instead.', { index: n }) : this.error("Expected " + g + " " + r + ".", { index: n });
    }, e.requiredSpace = function(r) {
      return this.options.lossy ? " " : r;
    }, e.optionalSpace = function(r) {
      return this.options.lossy ? "" : r;
    }, e.lossySpace = function(r, n) {
      return this.options.lossy ? n ? " " : "" : r;
    }, e.parseParenthesisToken = function(r) {
      var n = this.content(r);
      return r[M.FIELDS.TYPE] === T.space ? this.requiredSpace(n) : n;
    }, e.newNode = function(r, n) {
      return n && (/^ +$/.test(n) && (this.options.lossy || (this.spaces = (this.spaces || "") + n), n = true), r.namespace = n, bt(r, "namespace")), this.spaces && (r.spaces.before = this.spaces, this.spaces = ""), this.current.append(r);
    }, e.content = function(r) {
      return r === void 0 && (r = this.currToken), this.css.slice(r[M.FIELDS.START_POS], r[M.FIELDS.END_POS]);
    }, e.locateNextMeaningfulToken = function(r) {
      r === void 0 && (r = this.position + 1);
      for (var n = r; n < this.tokens.length; ) if (_f[this.tokens[n][M.FIELDS.TYPE]]) {
        n++;
        continue;
      } else return n;
      return -1;
    }, Pf(A, [{ key: "currToken", get: function() {
      return this.tokens[this.position];
    } }, { key: "nextToken", get: function() {
      return this.tokens[this.position + 1];
    } }, { key: "prevToken", get: function() {
      return this.tokens[this.position - 1];
    } }]), A;
  })();
  hr.default = Wf;
  wg.exports = hr.default;
});
var vg = Y((pr, Sg) => {
  pr.__esModule = true;
  pr.default = void 0;
  var Kf = Yf(Dg());
  function Yf(A) {
    return A && A.__esModule ? A : { default: A };
  }
  var qf = (function() {
    function A(t, r) {
      this.func = t || function() {
      }, this.funcRes = null, this.options = r;
    }
    var e = A.prototype;
    return e._shouldUpdateSelector = function(r, n) {
      n === void 0 && (n = {});
      var i = Object.assign({}, this.options, n);
      return i.updateSelector === false ? false : typeof r != "string";
    }, e._isLossy = function(r) {
      r === void 0 && (r = {});
      var n = Object.assign({}, this.options, r);
      return n.lossless === false;
    }, e._root = function(r, n) {
      n === void 0 && (n = {});
      var i = new Kf.default(r, this._parseOptions(n));
      return i.root;
    }, e._parseOptions = function(r) {
      return { lossy: this._isLossy(r) };
    }, e._run = function(r, n) {
      var i = this;
      return n === void 0 && (n = {}), new Promise(function(o, g) {
        try {
          var u = i._root(r, n);
          Promise.resolve(i.func(u)).then(function(c) {
            var B = void 0;
            return i._shouldUpdateSelector(r, n) && (B = u.toString(), r.selector = B), { transform: c, root: u, string: B };
          }).then(o, g);
        } catch (c) {
          g(c);
          return;
        }
      });
    }, e._runSync = function(r, n) {
      n === void 0 && (n = {});
      var i = this._root(r, n), o = this.func(i);
      if (o && typeof o.then == "function") throw new Error("Selector processor returned a promise to a synchronous call.");
      var g = void 0;
      return n.updateSelector && typeof r != "string" && (g = i.toString(), r.selector = g), { transform: o, root: i, string: g };
    }, e.ast = function(r, n) {
      return this._run(r, n).then(function(i) {
        return i.root;
      });
    }, e.astSync = function(r, n) {
      return this._runSync(r, n).root;
    }, e.transform = function(r, n) {
      return this._run(r, n).then(function(i) {
        return i.transform;
      });
    }, e.transformSync = function(r, n) {
      return this._runSync(r, n).transform;
    }, e.process = function(r, n) {
      return this._run(r, n).then(function(i) {
        return i.string || i.root.toString();
      });
    }, e.processSync = function(r, n) {
      var i = this._runSync(r, n);
      return i.string || i.root.toString();
    }, A;
  })();
  pr.default = qf;
  Sg.exports = pr.default;
});
var kg = Y((dA) => {
  dA.__esModule = true;
  dA.universal = dA.tag = dA.string = dA.selector = dA.root = dA.pseudo = dA.nesting = dA.id = dA.comment = dA.combinator = dA.className = dA.attribute = void 0;
  var Xf = Ce(ro()), Vf = Ce(Ti()), zf = Ce(so()), Zf = Ce(_i()), jf = Ce(Wi()), $f = Ce(go()), AE = Ce(Zi()), eE = Ce(Li()), tE = Ce(Ui()), rE = Ce(Vi()), nE = Ce(qi()), iE = Ce(io());
  function Ce(A) {
    return A && A.__esModule ? A : { default: A };
  }
  var oE = function(e) {
    return new Xf.default(e);
  };
  dA.attribute = oE;
  var sE = function(e) {
    return new Vf.default(e);
  };
  dA.className = sE;
  var aE = function(e) {
    return new zf.default(e);
  };
  dA.combinator = aE;
  var gE = function(e) {
    return new Zf.default(e);
  };
  dA.comment = gE;
  var uE = function(e) {
    return new jf.default(e);
  };
  dA.id = uE;
  var IE = function(e) {
    return new $f.default(e);
  };
  dA.nesting = IE;
  var lE = function(e) {
    return new AE.default(e);
  };
  dA.pseudo = lE;
  var cE = function(e) {
    return new eE.default(e);
  };
  dA.root = cE;
  var BE = function(e) {
    return new tE.default(e);
  };
  dA.selector = BE;
  var fE = function(e) {
    return new rE.default(e);
  };
  dA.string = fE;
  var EE = function(e) {
    return new nE.default(e);
  };
  dA.tag = EE;
  var QE = function(e) {
    return new iE.default(e);
  };
  dA.universal = QE;
});
var Ng = Y((cA) => {
  cA.__esModule = true;
  cA.isNode = ho;
  cA.isPseudoElement = xg;
  cA.isPseudoClass = kE;
  cA.isContainer = bE;
  cA.isNamespace = RE;
  cA.isUniversal = cA.isTag = cA.isString = cA.isSelector = cA.isRoot = cA.isPseudo = cA.isNesting = cA.isIdentifier = cA.isComment = cA.isCombinator = cA.isClassName = cA.isAttribute = void 0;
  var yA = zA(), ie, CE = (ie = {}, ie[yA.ATTRIBUTE] = true, ie[yA.CLASS] = true, ie[yA.COMBINATOR] = true, ie[yA.COMMENT] = true, ie[yA.ID] = true, ie[yA.NESTING] = true, ie[yA.PSEUDO] = true, ie[yA.ROOT] = true, ie[yA.SELECTOR] = true, ie[yA.STRING] = true, ie[yA.TAG] = true, ie[yA.UNIVERSAL] = true, ie);
  function ho(A) {
    return typeof A == "object" && CE[A.type];
  }
  function de(A, e) {
    return ho(e) && e.type === A;
  }
  var bg = de.bind(null, yA.ATTRIBUTE);
  cA.isAttribute = bg;
  var dE = de.bind(null, yA.CLASS);
  cA.isClassName = dE;
  var hE = de.bind(null, yA.COMBINATOR);
  cA.isCombinator = hE;
  var pE = de.bind(null, yA.COMMENT);
  cA.isComment = pE;
  var mE = de.bind(null, yA.ID);
  cA.isIdentifier = mE;
  var yE = de.bind(null, yA.NESTING);
  cA.isNesting = yE;
  var po = de.bind(null, yA.PSEUDO);
  cA.isPseudo = po;
  var wE = de.bind(null, yA.ROOT);
  cA.isRoot = wE;
  var DE = de.bind(null, yA.SELECTOR);
  cA.isSelector = DE;
  var SE = de.bind(null, yA.STRING);
  cA.isString = SE;
  var Rg = de.bind(null, yA.TAG);
  cA.isTag = Rg;
  var vE = de.bind(null, yA.UNIVERSAL);
  cA.isUniversal = vE;
  function xg(A) {
    return po(A) && A.value && (A.value.startsWith("::") || A.value.toLowerCase() === ":before" || A.value.toLowerCase() === ":after" || A.value.toLowerCase() === ":first-letter" || A.value.toLowerCase() === ":first-line");
  }
  function kE(A) {
    return po(A) && !xg(A);
  }
  function bE(A) {
    return !!(ho(A) && A.walk);
  }
  function RE(A) {
    return bg(A) || Rg(A);
  }
});
var Fg = Y((ke) => {
  ke.__esModule = true;
  var mo = zA();
  Object.keys(mo).forEach(function(A) {
    A === "default" || A === "__esModule" || A in ke && ke[A] === mo[A] || (ke[A] = mo[A]);
  });
  var yo = kg();
  Object.keys(yo).forEach(function(A) {
    A === "default" || A === "__esModule" || A in ke && ke[A] === yo[A] || (ke[A] = yo[A]);
  });
  var wo = Ng();
  Object.keys(wo).forEach(function(A) {
    A === "default" || A === "__esModule" || A in ke && ke[A] === wo[A] || (ke[A] = wo[A]);
  });
});
var Gg = Y((mr, Lg) => {
  mr.__esModule = true;
  mr.default = void 0;
  var xE = ME(vg()), NE = FE(Fg());
  function Mg() {
    if (typeof WeakMap != "function") return null;
    var A = /* @__PURE__ */ new WeakMap();
    return Mg = function() {
      return A;
    }, A;
  }
  function FE(A) {
    if (A && A.__esModule) return A;
    if (A === null || typeof A != "object" && typeof A != "function") return { default: A };
    var e = Mg();
    if (e && e.has(A)) return e.get(A);
    var t = {}, r = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for (var n in A) if (Object.prototype.hasOwnProperty.call(A, n)) {
      var i = r ? Object.getOwnPropertyDescriptor(A, n) : null;
      i && (i.get || i.set) ? Object.defineProperty(t, n, i) : t[n] = A[n];
    }
    return t.default = A, e && e.set(A, t), t;
  }
  function ME(A) {
    return A && A.__esModule ? A : { default: A };
  }
  var Do = function(e) {
    return new xE.default(e);
  };
  Object.assign(Do, NE);
  delete Do.__esModule;
  var LE = Do;
  mr.default = LE;
  Lg.exports = mr.default;
});
var Ug = Y((So) => {
  Object.defineProperty(So, "__esModule", { value: true });
  Object.defineProperty(So, "default", { enumerable: true, get: () => GE });
  function GE(A) {
    return A.replace(/\\,/g, "\\2c ");
  }
});
var Og = Y((_p, Hg) => {
  Hg.exports = { aliceblue: [240, 248, 255], antiquewhite: [250, 235, 215], aqua: [0, 255, 255], aquamarine: [127, 255, 212], azure: [240, 255, 255], beige: [245, 245, 220], bisque: [255, 228, 196], black: [0, 0, 0], blanchedalmond: [255, 235, 205], blue: [0, 0, 255], blueviolet: [138, 43, 226], brown: [165, 42, 42], burlywood: [222, 184, 135], cadetblue: [95, 158, 160], chartreuse: [127, 255, 0], chocolate: [210, 105, 30], coral: [255, 127, 80], cornflowerblue: [100, 149, 237], cornsilk: [255, 248, 220], crimson: [220, 20, 60], cyan: [0, 255, 255], darkblue: [0, 0, 139], darkcyan: [0, 139, 139], darkgoldenrod: [184, 134, 11], darkgray: [169, 169, 169], darkgreen: [0, 100, 0], darkgrey: [169, 169, 169], darkkhaki: [189, 183, 107], darkmagenta: [139, 0, 139], darkolivegreen: [85, 107, 47], darkorange: [255, 140, 0], darkorchid: [153, 50, 204], darkred: [139, 0, 0], darksalmon: [233, 150, 122], darkseagreen: [143, 188, 143], darkslateblue: [72, 61, 139], darkslategray: [47, 79, 79], darkslategrey: [47, 79, 79], darkturquoise: [0, 206, 209], darkviolet: [148, 0, 211], deeppink: [255, 20, 147], deepskyblue: [0, 191, 255], dimgray: [105, 105, 105], dimgrey: [105, 105, 105], dodgerblue: [30, 144, 255], firebrick: [178, 34, 34], floralwhite: [255, 250, 240], forestgreen: [34, 139, 34], fuchsia: [255, 0, 255], gainsboro: [220, 220, 220], ghostwhite: [248, 248, 255], gold: [255, 215, 0], goldenrod: [218, 165, 32], gray: [128, 128, 128], green: [0, 128, 0], greenyellow: [173, 255, 47], grey: [128, 128, 128], honeydew: [240, 255, 240], hotpink: [255, 105, 180], indianred: [205, 92, 92], indigo: [75, 0, 130], ivory: [255, 255, 240], khaki: [240, 230, 140], lavender: [230, 230, 250], lavenderblush: [255, 240, 245], lawngreen: [124, 252, 0], lemonchiffon: [255, 250, 205], lightblue: [173, 216, 230], lightcoral: [240, 128, 128], lightcyan: [224, 255, 255], lightgoldenrodyellow: [250, 250, 210], lightgray: [211, 211, 211], lightgreen: [144, 238, 144], lightgrey: [211, 211, 211], lightpink: [255, 182, 193], lightsalmon: [255, 160, 122], lightseagreen: [32, 178, 170], lightskyblue: [135, 206, 250], lightslategray: [119, 136, 153], lightslategrey: [119, 136, 153], lightsteelblue: [176, 196, 222], lightyellow: [255, 255, 224], lime: [0, 255, 0], limegreen: [50, 205, 50], linen: [250, 240, 230], magenta: [255, 0, 255], maroon: [128, 0, 0], mediumaquamarine: [102, 205, 170], mediumblue: [0, 0, 205], mediumorchid: [186, 85, 211], mediumpurple: [147, 112, 219], mediumseagreen: [60, 179, 113], mediumslateblue: [123, 104, 238], mediumspringgreen: [0, 250, 154], mediumturquoise: [72, 209, 204], mediumvioletred: [199, 21, 133], midnightblue: [25, 25, 112], mintcream: [245, 255, 250], mistyrose: [255, 228, 225], moccasin: [255, 228, 181], navajowhite: [255, 222, 173], navy: [0, 0, 128], oldlace: [253, 245, 230], olive: [128, 128, 0], olivedrab: [107, 142, 35], orange: [255, 165, 0], orangered: [255, 69, 0], orchid: [218, 112, 214], palegoldenrod: [238, 232, 170], palegreen: [152, 251, 152], paleturquoise: [175, 238, 238], palevioletred: [219, 112, 147], papayawhip: [255, 239, 213], peachpuff: [255, 218, 185], peru: [205, 133, 63], pink: [255, 192, 203], plum: [221, 160, 221], powderblue: [176, 224, 230], purple: [128, 0, 128], rebeccapurple: [102, 51, 153], red: [255, 0, 0], rosybrown: [188, 143, 143], royalblue: [65, 105, 225], saddlebrown: [139, 69, 19], salmon: [250, 128, 114], sandybrown: [244, 164, 96], seagreen: [46, 139, 87], seashell: [255, 245, 238], sienna: [160, 82, 45], silver: [192, 192, 192], skyblue: [135, 206, 235], slateblue: [106, 90, 205], slategray: [112, 128, 144], slategrey: [112, 128, 144], snow: [255, 250, 250], springgreen: [0, 255, 127], steelblue: [70, 130, 180], tan: [210, 180, 140], teal: [0, 128, 128], thistle: [216, 191, 216], tomato: [255, 99, 71], turquoise: [64, 224, 208], violet: [238, 130, 238], wheat: [245, 222, 179], white: [255, 255, 255], whitesmoke: [245, 245, 245], yellow: [255, 255, 0], yellowgreen: [154, 205, 50] };
});
var ko = Y((vo) => {
  Object.defineProperty(vo, "__esModule", { value: true });
  function UE(A, e) {
    for (var t in e) Object.defineProperty(A, t, { enumerable: true, get: e[t] });
  }
  UE(vo, { parseColor: () => JE, formatColor: () => WE });
  var Tg = HE(Og());
  function HE(A) {
    return A && A.__esModule ? A : { default: A };
  }
  var OE = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i, TE = /^#([a-f\d])([a-f\d])([a-f\d])([a-f\d])?$/i, tt = /(?:\d+|\d*\.\d+)%?/, Cn = /(?:\s*,\s*|\s+)/, Pg = /\s*[,/]\s*/, rt = /var\(--(?:[^ )]*?)\)/, PE = new RegExp(`^(rgb)a?\\(\\s*(${tt.source}|${rt.source})(?:${Cn.source}(${tt.source}|${rt.source}))?(?:${Cn.source}(${tt.source}|${rt.source}))?(?:${Pg.source}(${tt.source}|${rt.source}))?\\s*\\)$`), _E = new RegExp(`^(hsl)a?\\(\\s*((?:${tt.source})(?:deg|rad|grad|turn)?|${rt.source})(?:${Cn.source}(${tt.source}|${rt.source}))?(?:${Cn.source}(${tt.source}|${rt.source}))?(?:${Pg.source}(${tt.source}|${rt.source}))?\\s*\\)$`);
  function JE(A, { loose: e = false } = {}) {
    var t, r;
    if (typeof A != "string") return null;
    if (A = A.trim(), A === "transparent") return { mode: "rgb", color: ["0", "0", "0"], alpha: "0" };
    if (A in Tg.default) return { mode: "rgb", color: Tg.default[A].map((u) => u.toString()) };
    let n = A.replace(TE, (u, c, B, E, d) => ["#", c, c, B, B, E, E, d ? d + d : ""].join("")).match(OE);
    if (n !== null) return { mode: "rgb", color: [parseInt(n[1], 16), parseInt(n[2], 16), parseInt(n[3], 16)].map((u) => u.toString()), alpha: n[4] ? (parseInt(n[4], 16) / 255).toString() : void 0 };
    var i;
    let o = (i = A.match(PE)) !== null && i !== void 0 ? i : A.match(_E);
    if (o === null) return null;
    let g = [o[2], o[3], o[4]].filter(Boolean).map((u) => u.toString());
    return !e && g.length !== 3 || g.length < 3 && !g.some((u) => /^var\(.*?\)$/.test(u)) ? null : { mode: o[1], color: g, alpha: (t = o[5]) === null || t === void 0 || (r = t.toString) === null || r === void 0 ? void 0 : r.call(t) };
  }
  function WE({ mode: A, color: e, alpha: t }) {
    let r = t !== void 0;
    return `${A}(${e.join(" ")}${r ? ` / ${t}` : ""})`;
  }
});
var Ro = Y((bo) => {
  Object.defineProperty(bo, "__esModule", { value: true });
  function KE(A, e) {
    for (var t in e) Object.defineProperty(A, t, { enumerable: true, get: e[t] });
  }
  KE(bo, { withAlphaValue: () => YE, default: () => qE });
  var dn = ko();
  function YE(A, e, t) {
    if (typeof A == "function") return A({ opacityValue: e });
    let r = (0, dn.parseColor)(A, { loose: true });
    return r === null ? t : (0, dn.formatColor)({ ...r, alpha: e });
  }
  function qE({ color: A, property: e, variable: t }) {
    let r = [].concat(e);
    if (typeof A == "function") return { [t]: "1", ...Object.fromEntries(r.map((i) => [i, A({ opacityVariable: t, opacityValue: `var(${t})` })])) };
    let n = (0, dn.parseColor)(A);
    return n === null ? Object.fromEntries(r.map((i) => [i, A])) : n.alpha !== void 0 ? Object.fromEntries(r.map((i) => [i, A])) : { [t]: "1", ...Object.fromEntries(r.map((i) => [i, (0, dn.formatColor)({ ...n, alpha: `var(${t})` })])) };
  }
});
var Yg = Y((xo) => {
  Object.defineProperty(xo, "__esModule", { value: true });
  function XE(A, e) {
    for (var t in e) Object.defineProperty(A, t, { enumerable: true, get: e[t] });
  }
  XE(xo, { pattern: () => zE, withoutCapturing: () => Jg, any: () => Wg, optional: () => ZE, zeroOrMore: () => jE, nestedBrackets: () => Kg, escape: () => lt });
  var _g = /[\\^$.*+?()[\]{}|]/g, VE = RegExp(_g.source);
  function yr(A) {
    return A = Array.isArray(A) ? A : [A], A = A.map((e) => e instanceof RegExp ? e.source : e), A.join("");
  }
  function zE(A) {
    return new RegExp(yr(A), "g");
  }
  function Jg(A) {
    return new RegExp(`(?:${yr(A)})`, "g");
  }
  function Wg(A) {
    return `(?:${A.map(yr).join("|")})`;
  }
  function ZE(A) {
    return `(?:${yr(A)})?`;
  }
  function jE(A) {
    return `(?:${yr(A)})*`;
  }
  function Kg(A, e, t = 1) {
    return Jg([lt(A), /[^\s]*/, t === 1 ? `[^${lt(A)}${lt(e)}s]*` : Wg([`[^${lt(A)}${lt(e)}s]*`, Kg(A, e, t - 1)]), /[^\s]*/, lt(e)]);
  }
  function lt(A) {
    return A && VE.test(A) ? A.replace(_g, "\\$&") : A || "";
  }
});
var Xg = Y((No) => {
  Object.defineProperty(No, "__esModule", { value: true });
  Object.defineProperty(No, "splitAtTopLevelOnly", { enumerable: true, get: () => eQ });
  var $E = AQ(Yg());
  function qg(A) {
    if (typeof WeakMap != "function") return null;
    var e = /* @__PURE__ */ new WeakMap(), t = /* @__PURE__ */ new WeakMap();
    return (qg = function(r) {
      return r ? t : e;
    })(A);
  }
  function AQ(A, e) {
    if (A && A.__esModule) return A;
    if (A === null || typeof A != "object" && typeof A != "function") return { default: A };
    var t = qg(e);
    if (t && t.has(A)) return t.get(A);
    var r = {}, n = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for (var i in A) if (i !== "default" && Object.prototype.hasOwnProperty.call(A, i)) {
      var o = n ? Object.getOwnPropertyDescriptor(A, i) : null;
      o && (o.get || o.set) ? Object.defineProperty(r, i, o) : r[i] = A[i];
    }
    return r.default = A, t && t.set(A, r), r;
  }
  function* eQ(A, e) {
    let t = new RegExp(`[(){}\\[\\]${$E.escape(e)}]`, "g"), r = 0, n = 0, i = false, o = 0, g = 0, u = e.length;
    for (let c of A.matchAll(t)) {
      let B = c[0] === e[o], E = o === u - 1, d = B && E;
      c[0] === "(" && r++, c[0] === ")" && r--, c[0] === "[" && r++, c[0] === "]" && r--, c[0] === "{" && r++, c[0] === "}" && r--, B && r === 0 && (g === 0 && (g = c.index), o++), d && r === 0 && (i = true, yield A.substring(n, g), n = g + u), o === u && (o = 0, g = 0);
    }
    i ? yield A.substring(n) : yield A;
  }
});
var zg = Y((Fo) => {
  Object.defineProperty(Fo, "__esModule", { value: true });
  function tQ(A, e) {
    for (var t in e) Object.defineProperty(A, t, { enumerable: true, get: e[t] });
  }
  tQ(Fo, { parseBoxShadowValue: () => oQ, formatBoxShadowValue: () => sQ });
  var rQ = Xg(), nQ = /* @__PURE__ */ new Set(["inset", "inherit", "initial", "revert", "unset"]), iQ = /\ +(?![^(]*\))/g, Vg = /^-?(\d+|\.\d+)(.*?)$/g;
  function oQ(A) {
    return Array.from((0, rQ.splitAtTopLevelOnly)(A, ",")).map((t) => {
      let r = t.trim(), n = { raw: r }, i = r.split(iQ), o = /* @__PURE__ */ new Set();
      for (let g of i) Vg.lastIndex = 0, !o.has("KEYWORD") && nQ.has(g) ? (n.keyword = g, o.add("KEYWORD")) : Vg.test(g) ? o.has("X") ? o.has("Y") ? o.has("BLUR") ? o.has("SPREAD") || (n.spread = g, o.add("SPREAD")) : (n.blur = g, o.add("BLUR")) : (n.y = g, o.add("Y")) : (n.x = g, o.add("X")) : n.color ? (n.unknown || (n.unknown = []), n.unknown.push(g)) : n.color = g;
      return n.valid = n.x !== void 0 && n.y !== void 0, n;
    });
  }
  function sQ(A) {
    return A.map((e) => e.valid ? [e.keyword, e.x, e.y, e.blur, e.spread, e.color].filter(Boolean).join(" ") : e.raw).join(", ");
  }
});
var ru = Y((Lo) => {
  Object.defineProperty(Lo, "__esModule", { value: true });
  function aQ(A, e) {
    for (var t in e) Object.defineProperty(A, t, { enumerable: true, get: e[t] });
  }
  aQ(Lo, { normalize: () => nt, url: () => $g, number: () => IQ, percentage: () => Au, length: () => eu, lineWidth: () => BQ, shadow: () => fQ, color: () => EQ, image: () => QQ, gradient: () => tu, position: () => hQ, familyName: () => pQ, genericName: () => yQ, absoluteSize: () => DQ, relativeSize: () => vQ });
  var gQ = ko(), uQ = zg(), Mo = ["min", "max", "clamp", "calc"], jg = /,(?![^(]*\))/g, hn = /_(?![^(]*\))/g;
  function nt(A, e = true) {
    return A.includes("url(") ? A.split(/(url\(.*?\))/g).filter(Boolean).map((t) => /^url\(.*?\)$/.test(t) ? t : nt(t, false)).join("") : (A = A.replace(/([^\\])_+/g, (t, r) => r + " ".repeat(t.length - 1)).replace(/^_/g, " ").replace(/\\_/g, "_"), e && (A = A.trim()), A = A.replace(/(calc|min|max|clamp)\(.+\)/g, (t) => t.replace(/(-?\d*\.?\d(?!\b-.+[,)](?![^+\-/*])\D)(?:%|[a-z]+)?|\))([+\-/*])/g, "$1 $2 ")), A);
  }
  function $g(A) {
    return A.startsWith("url(");
  }
  function IQ(A) {
    return !isNaN(Number(A)) || Mo.some((e) => new RegExp(`^${e}\\(.+?`).test(A));
  }
  function Au(A) {
    return A.split(hn).every((e) => /%$/g.test(e) || Mo.some((t) => new RegExp(`^${t}\\(.+?%`).test(e)));
  }
  var lQ = ["cm", "mm", "Q", "in", "pc", "pt", "px", "em", "ex", "ch", "rem", "lh", "vw", "vh", "vmin", "vmax"], Zg = `(?:${lQ.join("|")})`;
  function eu(A) {
    return A.split(hn).every((e) => e === "0" || new RegExp(`${Zg}$`).test(e) || Mo.some((t) => new RegExp(`^${t}\\(.+?${Zg}`).test(e)));
  }
  var cQ = /* @__PURE__ */ new Set(["thin", "medium", "thick"]);
  function BQ(A) {
    return cQ.has(A);
  }
  function fQ(A) {
    let e = (0, uQ.parseBoxShadowValue)(nt(A));
    for (let t of e) if (!t.valid) return false;
    return true;
  }
  function EQ(A) {
    let e = 0;
    return A.split(hn).every((r) => (r = nt(r), r.startsWith("var(") ? true : (0, gQ.parseColor)(r, { loose: true }) !== null ? (e++, true) : false)) ? e > 0 : false;
  }
  function QQ(A) {
    let e = 0;
    return A.split(jg).every((r) => (r = nt(r), r.startsWith("var(") ? true : $g(r) || tu(r) || ["element(", "image(", "cross-fade(", "image-set("].some((n) => r.startsWith(n)) ? (e++, true) : false)) ? e > 0 : false;
  }
  var CQ = /* @__PURE__ */ new Set(["linear-gradient", "radial-gradient", "repeating-linear-gradient", "repeating-radial-gradient", "conic-gradient"]);
  function tu(A) {
    A = nt(A);
    for (let e of CQ) if (A.startsWith(`${e}(`)) return true;
    return false;
  }
  var dQ = /* @__PURE__ */ new Set(["center", "top", "right", "bottom", "left"]);
  function hQ(A) {
    let e = 0;
    return A.split(hn).every((r) => (r = nt(r), r.startsWith("var(") ? true : dQ.has(r) || eu(r) || Au(r) ? (e++, true) : false)) ? e > 0 : false;
  }
  function pQ(A) {
    let e = 0;
    return A.split(jg).every((r) => (r = nt(r), r.startsWith("var(") ? true : r.includes(" ") && !/(['"])([^"']+)\1/g.test(r) || /^\d/g.test(r) ? false : (e++, true))) ? e > 0 : false;
  }
  var mQ = /* @__PURE__ */ new Set(["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded", "math", "emoji", "fangsong"]);
  function yQ(A) {
    return mQ.has(A);
  }
  var wQ = /* @__PURE__ */ new Set(["xx-small", "x-small", "small", "medium", "large", "x-large", "x-large", "xxx-large"]);
  function DQ(A) {
    return wQ.has(A);
  }
  var SQ = /* @__PURE__ */ new Set(["larger", "smaller"]);
  function vQ(A) {
    return SQ.has(A);
  }
});
var Iu = Y((Ho) => {
  Object.defineProperty(Ho, "__esModule", { value: true });
  function kQ(A, e) {
    for (var t in e) Object.defineProperty(A, t, { enumerable: true, get: e[t] });
  }
  kQ(Ho, { updateAllClasses: () => xQ, asValue: () => Dr, parseColorFormat: () => Go, asColor: () => au, asLookupValue: () => gu, coerceValue: () => LQ });
  var bQ = Uo(Gg()), RQ = Uo(Ug()), nu = Ro(), oe = ru(), iu = Uo(pi());
  function Uo(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function xQ(A, e) {
    return (0, bQ.default)((n) => {
      n.walkClasses((i) => {
        let o = e(i.value);
        i.value = o, i.raws && i.raws.value && (i.raws.value = (0, RQ.default)(i.raws.value));
      });
    }).processSync(A);
  }
  function su(A, e) {
    if (!wr(A)) return;
    let t = A.slice(1, -1);
    if (e(t)) return (0, oe.normalize)(t);
  }
  function NQ(A, e = {}, t) {
    let r = e[A];
    if (r !== void 0) return (0, iu.default)(r);
    if (wr(A)) {
      let n = su(A, t);
      return n === void 0 ? void 0 : (0, iu.default)(n);
    }
  }
  function Dr(A, e = {}, { validate: t = () => true } = {}) {
    var r;
    let n = (r = e.values) === null || r === void 0 ? void 0 : r[A];
    return n !== void 0 ? n : e.supportsNegativeValues && A.startsWith("-") ? NQ(A.slice(1), e.values, t) : su(A, t);
  }
  function wr(A) {
    return A.startsWith("[") && A.endsWith("]");
  }
  function FQ(A) {
    let e = A.lastIndexOf("/");
    return e === -1 || e === A.length - 1 ? [A] : [A.slice(0, e), A.slice(e + 1)];
  }
  function Go(A) {
    if (typeof A == "string" && A.includes("<alpha-value>")) {
      let e = A;
      return ({ opacityValue: t = 1 }) => e.replace("<alpha-value>", t);
    }
    return A;
  }
  function au(A, e = {}, { tailwindConfig: t = {} } = {}) {
    var r;
    if (((r = e.values) === null || r === void 0 ? void 0 : r[A]) !== void 0) {
      var n;
      return Go((n = e.values) === null || n === void 0 ? void 0 : n[A]);
    }
    let [i, o] = FQ(A);
    if (o !== void 0) {
      var g, u, c, B;
      let E = (B = (g = e.values) === null || g === void 0 ? void 0 : g[i]) !== null && B !== void 0 ? B : wr(i) ? i.slice(1, -1) : void 0;
      return E === void 0 ? void 0 : (E = Go(E), wr(o) ? (0, nu.withAlphaValue)(E, o.slice(1, -1)) : ((u = t.theme) === null || u === void 0 || (c = u.opacity) === null || c === void 0 ? void 0 : c[o]) === void 0 ? void 0 : (0, nu.withAlphaValue)(E, t.theme.opacity[o]));
    }
    return Dr(A, e, { validate: oe.color });
  }
  function gu(A, e = {}) {
    var t;
    return (t = e.values) === null || t === void 0 ? void 0 : t[A];
  }
  function he(A) {
    return (e, t) => Dr(e, t, { validate: A });
  }
  var uu = { any: Dr, color: au, url: he(oe.url), image: he(oe.image), length: he(oe.length), percentage: he(oe.percentage), position: he(oe.position), lookup: gu, "generic-name": he(oe.genericName), "family-name": he(oe.familyName), number: he(oe.number), "line-width": he(oe.lineWidth), "absolute-size": he(oe.absoluteSize), "relative-size": he(oe.relativeSize), shadow: he(oe.shadow) }, ou = Object.keys(uu);
  function MQ(A, e) {
    let t = A.indexOf(e);
    return t === -1 ? [void 0, A] : [A.slice(0, t), A.slice(t + 1)];
  }
  function LQ(A, e, t, r) {
    if (wr(e)) {
      let n = e.slice(1, -1), [i, o] = MQ(n, ":");
      if (!/^[\w-_]+$/g.test(i)) o = n;
      else if (i !== void 0 && !ou.includes(i)) return [];
      if (o.length > 0 && ou.includes(i)) return [Dr(`[${o}]`, t), i];
    }
    for (let n of [].concat(A)) {
      let i = uu[n](e, t, { tailwindConfig: r });
      if (i !== void 0) return [i, n];
    }
    return [];
  }
});
var lu = Y((Oo) => {
  Object.defineProperty(Oo, "__esModule", { value: true });
  Object.defineProperty(Oo, "default", { enumerable: true, get: () => GQ });
  function GQ(A) {
    return typeof A == "function" ? A({}) : A;
  }
});
var Qu = Y((Po) => {
  Object.defineProperty(Po, "__esModule", { value: true });
  Object.defineProperty(Po, "default", { enumerable: true, get: () => tC });
  var UQ = ct(pi()), HQ = ct(ha()), OQ = ct(pa()), TQ = ct(wi()), PQ = ct(ya()), fu = wa(), cu = Da(), _Q = va(), JQ = ct(ka()), WQ = ba(), KQ = Iu(), YQ = Ro(), qQ = ct(lu());
  function ct(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function Rt(A) {
    return typeof A == "function";
  }
  function Sr(A) {
    return typeof A == "object" && A !== null;
  }
  function vr(A, ...e) {
    let t = e.pop();
    for (let r of e) for (let n in r) {
      let i = t(A[n], r[n]);
      i === void 0 ? Sr(A[n]) && Sr(r[n]) ? A[n] = vr(A[n], r[n], t) : A[n] = r[n] : A[n] = i;
    }
    return A;
  }
  var To = { colors: PQ.default, negative(A) {
    return Object.keys(A).filter((e) => A[e] !== "0").reduce((e, t) => {
      let r = (0, UQ.default)(A[t]);
      return r !== void 0 && (e[`-${t}`] = r), e;
    }, {});
  }, breakpoints(A) {
    return Object.keys(A).filter((e) => typeof A[e] == "string").reduce((e, t) => ({ ...e, [`screen-${t}`]: A[t] }), {});
  } };
  function XQ(A, ...e) {
    return Rt(A) ? A(...e) : A;
  }
  function VQ(A) {
    return A.reduce((e, { extend: t }) => vr(e, t, (r, n) => r === void 0 ? [n] : Array.isArray(r) ? [n, ...r] : [n, r]), {});
  }
  function zQ(A) {
    return { ...A.reduce((e, t) => (0, fu.defaults)(e, t), {}), extend: VQ(A) };
  }
  function Bu(A, e) {
    if (Array.isArray(A) && Sr(A[0])) return A.concat(e);
    if (Array.isArray(e) && Sr(e[0]) && Sr(A)) return [A, ...e];
    if (Array.isArray(e)) return e;
  }
  function ZQ({ extend: A, ...e }) {
    return vr(e, A, (t, r) => !Rt(t) && !r.some(Rt) ? vr({}, t, ...r, Bu) : (n, i) => vr({}, ...[t, ...r].map((o) => XQ(o, n, i)), Bu));
  }
  function* jQ(A) {
    let e = (0, cu.toPath)(A);
    if (e.length === 0 || (yield e, Array.isArray(A))) return;
    let t = /^(.*?)\s*\/\s*([^/]+)$/, r = A.match(t);
    if (r !== null) {
      let [, n, i] = r, o = (0, cu.toPath)(n);
      o.alpha = i, yield o;
    }
  }
  function $Q(A) {
    let e = (t, r) => {
      for (let n of jQ(t)) {
        let i = 0, o = A;
        for (; o != null && i < n.length; ) o = o[n[i++]], o = Rt(o) && (n.alpha === void 0 || i <= n.length - 1) ? o(e, To) : o;
        if (o !== void 0) {
          if (n.alpha !== void 0) {
            let g = (0, KQ.parseColorFormat)(o);
            return (0, YQ.withAlphaValue)(g, n.alpha, (0, qQ.default)(g));
          }
          return (0, JQ.default)(o) ? (0, WQ.cloneDeep)(o) : o;
        }
      }
      return r;
    };
    return Object.assign(e, { theme: e, ...To }), Object.keys(A).reduce((t, r) => (t[r] = Rt(A[r]) ? A[r](e, To) : A[r], t), {});
  }
  function Eu(A) {
    let e = [];
    return A.forEach((t) => {
      e = [...e, t];
      var r;
      let n = (r = t == null ? void 0 : t.plugins) !== null && r !== void 0 ? r : [];
      n.length !== 0 && n.forEach((i) => {
        i.__isOptionsFunction && (i = i());
        var o;
        e = [...e, ...Eu([(o = i == null ? void 0 : i.config) !== null && o !== void 0 ? o : {}])];
      });
    }), e;
  }
  function AC(A) {
    return [...A].reduceRight((t, r) => Rt(r) ? r({ corePlugins: t }) : (0, OQ.default)(r, t), HQ.default);
  }
  function eC(A) {
    return [...A].reduceRight((t, r) => [...t, ...r], []);
  }
  function tC(A) {
    let e = [...Eu(A), { prefix: "", important: false, separator: ":", variantOrder: TQ.default.variantOrder }];
    var t, r;
    return (0, _Q.normalizeConfig)((0, fu.defaults)({ theme: $Q(ZQ(zQ(e.map((n) => (t = n == null ? void 0 : n.theme) !== null && t !== void 0 ? t : {})))), corePlugins: AC(e.map((n) => n.corePlugins)), plugins: eC(A.map((n) => (r = n == null ? void 0 : n.plugins) !== null && r !== void 0 ? r : [])) }, ...e));
  }
});
var Cu = {};
dt(Cu, { default: () => rC });
var rC, du = Pe(() => {
  rC = { yellow: (A) => A };
});
var yu = Y((_o) => {
  Object.defineProperty(_o, "__esModule", { value: true });
  function nC(A, e) {
    for (var t in e) Object.defineProperty(A, t, { enumerable: true, get: e[t] });
  }
  nC(_o, { flagEnabled: () => sC, issueFlagNotices: () => aC, default: () => gC });
  var iC = mu((du(), Lr(Cu))), oC = mu((nn(), Lr(rn)));
  function mu(A) {
    return A && A.__esModule ? A : { default: A };
  }
  var hu = { optimizeUniversalDefaults: false }, kr = { future: ["hoverOnlyWhenSupported", "respectDefaultRingColorOpacity"], experimental: ["optimizeUniversalDefaults", "matchVariant"] };
  function sC(A, e) {
    if (kr.future.includes(e)) {
      var t, r, n;
      return A.future === "all" || ((n = (r = A == null || (t = A.future) === null || t === void 0 ? void 0 : t[e]) !== null && r !== void 0 ? r : hu[e]) !== null && n !== void 0 ? n : false);
    }
    if (kr.experimental.includes(e)) {
      var i, o, g;
      return A.experimental === "all" || ((g = (o = A == null || (i = A.experimental) === null || i === void 0 ? void 0 : i[e]) !== null && o !== void 0 ? o : hu[e]) !== null && g !== void 0 ? g : false);
    }
    return false;
  }
  function pu(A) {
    if (A.experimental === "all") return kr.experimental;
    var e;
    return Object.keys((e = A == null ? void 0 : A.experimental) !== null && e !== void 0 ? e : {}).filter((t) => kr.experimental.includes(t) && A.experimental[t]);
  }
  function aC(A) {
    if (process.env.JEST_WORKER_ID === void 0 && pu(A).length > 0) {
      let e = pu(A).map((t) => iC.default.yellow(t)).join(", ");
      oC.default.warn("experimental-flags-enabled", [`You have enabled experimental features: ${e}`, "Experimental features in Tailwind CSS are not covered by semver, may introduce breaking changes, and can change at any time."]);
    }
  }
  var gC = kr;
});
var Du = Y((Jo) => {
  Object.defineProperty(Jo, "__esModule", { value: true });
  Object.defineProperty(Jo, "default", { enumerable: true, get: () => wu });
  var uC = lC(wi()), IC = yu();
  function lC(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function wu(A) {
    var e;
    let t = ((e = A == null ? void 0 : A.presets) !== null && e !== void 0 ? e : [uC.default]).slice().reverse().flatMap((i) => wu(typeof i == "function" ? i() : i)), r = { respectDefaultRingColorOpacity: { theme: { ringColor: { DEFAULT: "#3b82f67f" } } } }, n = Object.keys(r).filter((i) => (0, IC.flagEnabled)(A, i)).map((i) => r[i]);
    return [A, ...n, ...t];
  }
});
var vu = Y((Wo) => {
  Object.defineProperty(Wo, "__esModule", { value: true });
  Object.defineProperty(Wo, "default", { enumerable: true, get: () => fC });
  var cC = Su(Qu()), BC = Su(Du());
  function Su(A) {
    return A && A.__esModule ? A : { default: A };
  }
  function fC(...A) {
    let [, ...e] = (0, BC.default)(A[0]);
    return (0, cC.default)([...A, ...e]);
  }
});
var bu = Y((e0, ku) => {
  var Ko = vu();
  ku.exports = (Ko.__esModule ? Ko : { default: Ko }).default;
});
var Tt = (A, e) => () => (e || A((e = { exports: {} }).exports, e), e.exports), aI = Tt((A, e) => {
  e.exports = ["em", "ex", "ch", "rem", "vh", "vw", "vmin", "vmax", "px", "mm", "cm", "in", "pt", "pc", "mozmm"];
}), gI = Tt((A, e) => {
  e.exports = ["deg", "grad", "rad", "turn"];
}), uI = Tt((A, e) => {
  e.exports = ["dpi", "dpcm", "dppx"];
}), II = Tt((A, e) => {
  e.exports = ["Hz", "kHz"];
}), lI = Tt((A, e) => {
  e.exports = ["s", "ms"];
}), cI = aI(), us = gI(), Is = uI(), ls = II(), cs = lI();
function Gn(A) {
  if (/\.\D?$/.test(A)) throw new Error("The dot should be followed by a number");
  if (/^[+-]{2}/.test(A)) throw new Error("Only one leading +/- is allowed");
  if (BI(A) > 1) throw new Error("Only one dot is allowed");
  if (/%$/.test(A)) {
    this.type = "percentage", this.value = Ln(A), this.unit = "%";
    return;
  }
  var e = EI(A);
  if (!e) {
    this.type = "number", this.value = Ln(A);
    return;
  }
  this.type = CI(e), this.value = Ln(A.substr(0, A.length - e.length)), this.unit = e;
}
Gn.prototype.valueOf = function() {
  return this.value;
};
Gn.prototype.toString = function() {
  return this.value + (this.unit || "");
};
function _e(A) {
  return new Gn(A);
}
function BI(A) {
  var e = A.match(/\./g);
  return e ? e.length : 0;
}
function Ln(A) {
  var e = parseFloat(A);
  if (isNaN(e)) throw new Error("Invalid number: " + A);
  return e;
}
var fI = [].concat(us, ls, cI, Is, cs);
function EI(A) {
  var e = A.match(/\D+$/), t = e && e[0];
  if (t && fI.indexOf(t) === -1) throw new Error("Invalid unit: " + t);
  return t;
}
var QI = Object.assign(Gr(us, "angle"), Gr(ls, "frequency"), Gr(Is, "resolution"), Gr(cs, "time"));
function Gr(A, e) {
  return Object.fromEntries(A.map((t) => [t, e]));
}
function CI(A) {
  return QI[A] || "length";
}
function ht(A) {
  let e = typeof A;
  return !(e === "number" || e === "bigint" || e === "string" || e === "boolean");
}
function Bs(A) {
  return /^class\s/.test(A.toString());
}
function On(A) {
  return A && A.$$typeof === Symbol.for("react.forward_ref");
}
function fs(A) {
  return typeof A == "function" || On(A);
}
function Es(A) {
  return "dangerouslySetInnerHTML" in A;
}
function Qs(A) {
  let e = typeof A > "u" ? [] : [].concat(A).flat(1 / 0), t = [];
  for (let r = 0; r < e.length; r++) {
    let n = e[r];
    typeof n > "u" || typeof n == "boolean" || n === null || (typeof n == "number" && (n = String(n)), typeof n == "string" && t.length && typeof t[t.length - 1] == "string" ? t[t.length - 1] += n : t.push(n));
  }
  return t;
}
function tA(A, e, t, r, n = false) {
  if (typeof A == "number") return A;
  try {
    if (A = A.trim(), /[ /\(,]/.test(A)) return;
    if (A === String(+A)) return +A;
    let i = new _e(A);
    if (i.type === "length") switch (i.unit) {
      case "em":
        return i.value * e;
      case "rem":
        return i.value * 16;
      case "vw":
        return ~~(i.value * r._viewportWidth / 100);
      case "vh":
        return ~~(i.value * r._viewportHeight / 100);
      default:
        return i.value;
    }
    else {
      if (i.type === "angle") return Tn(A);
      if (i.type === "percentage" && n) return i.value / 100 * t;
    }
  } catch {
  }
}
function Tn(A) {
  let e = new _e(A);
  switch (e.unit) {
    case "deg":
      return e.value;
    case "rad":
      return e.value * 180 / Math.PI;
    case "turn":
      return e.value * 360;
    case "grad":
      return 0.9 * e.value;
  }
}
function Pt(A, e) {
  return [A[0] * e[0] + A[2] * e[1], A[1] * e[0] + A[3] * e[1], A[0] * e[2] + A[2] * e[3], A[1] * e[2] + A[3] * e[3], A[0] * e[4] + A[2] * e[5] + A[4], A[1] * e[4] + A[3] * e[5] + A[5]];
}
function te(A, e, t, r) {
  let n = e[A];
  if (typeof n > "u") {
    if (r && typeof A < "u") throw new Error(`Invalid value for CSS property "${r}". Allowed values: ${Object.keys(e).map((i) => `"${i}"`).join(" | ")}. Received: "${A}".`);
    n = t;
  }
  return n;
}
var Un, Hn, Cs = [32, 160, 4961, 65792, 65793, 4153, 4241, 10].map((A) => String.fromCodePoint(A));
function ee(A, e, t) {
  if (!Un || !Hn) {
    if (!(typeof Intl < "u" && "Segmenter" in Intl)) throw new Error("Intl.Segmenter does not exist, please use import a polyfill.");
    Un = new Intl.Segmenter(t, { granularity: "word" }), Hn = new Intl.Segmenter(t, { granularity: "grapheme" });
  }
  if (e === "grapheme") return [...Hn.segment(A)].map((r) => r.segment);
  {
    let r = [...Un.segment(A)].map((o) => o.segment), n = [], i = 0;
    for (; i < r.length; ) {
      let o = r[i];
      if (o == " ") {
        let g = i === 0 ? "" : n.pop(), u = i === r.length - 1 ? "" : r[i + 1];
        n.push(g + " " + u), i += 2;
      } else n.push(o), i++;
    }
    return n;
  }
}
function H(A, e, t) {
  let r = "";
  for (let [n, i] of Object.entries(e)) typeof i < "u" && (r += ` ${n}="${i}"`);
  return t ? `<${A}${r}>${t}</${A}>` : `<${A}${r}/>`;
}
function ds(A = 20) {
  let e = /* @__PURE__ */ new Map();
  function t(i, o) {
    if (e.size >= A) {
      let g = e.keys().next().value;
      e.delete(g);
    }
    e.set(i, o);
  }
  function r(i) {
    if (!e.has(i)) return;
    let g = e.get(i);
    return e.delete(i), e.set(i, g), g;
  }
  function n() {
    e.clear();
  }
  return { set: t, get: r, clear: n };
}
function pt(A) {
  return A ? A.split(/[, ]/).filter(Boolean).map(Number) : null;
}
function Ur(A) {
  return typeof A == "string";
}
function hs(A) {
  return typeof A == "number";
}
function ps(A) {
  return typeof A > "u";
}
function Je(A, e) {
  if (typeof A == "number") return A;
  if (A.endsWith("%")) {
    let t = parseFloat(A.slice(0, -1));
    if (isNaN(t)) {
      console.warn(`Invalid value "${A}"${typeof e == "string" ? ` for "${e}"` : ""}. Expected a percentage value (e.g., "50%").`);
      return;
    }
    return `${t}%`;
  }
  console.warn(`Invalid value "${A}"${typeof e == "string" ? ` for "${e}"` : ""}. Expected a number or a percentage value (e.g., "50%").`);
}
function je(A, e) {
  if (typeof A == "number") return A;
  if (A === "auto") return "auto";
  if (A.endsWith("%")) {
    let t = parseFloat(A.slice(0, -1));
    if (isNaN(t)) {
      console.warn(`Invalid value "${A}"${typeof e == "string" ? ` for "${e}"` : ""}. Expected a percentage value (e.g., "50%").`);
      return;
    }
    return `${t}%`;
  }
  console.warn(`Invalid value "${A}"${typeof e == "string" ? ` for "${e}"` : ""}. Expected a number, "auto", or a percentage value (e.g., "50%").`);
}
function ms(A, e) {
  if (e === "break-all") return { words: ee(A, "grapheme"), requiredBreaks: [] };
  if (e === "keep-all") return { words: ee(A, "word"), requiredBreaks: [] };
  let t = new $557adaaeb0c7885f$exports(A), r = 0, n = t.nextBreak(), i = [], o = [false];
  for (; n; ) {
    let g = A.slice(r, n.position);
    i.push(g), n.required ? o.push(true) : o.push(false), r = n.position, n = t.nextBreak();
  }
  return { words: i, requiredBreaks: o };
}
var ys = (A) => A.replaceAll(/([A-Z])/g, (e, t) => `-${t.toLowerCase()}`);
function Hr(A, e = ",") {
  let t = [], r = 0, n = 0;
  e = new RegExp(e);
  for (let i = 0; i < A.length; i++) A[i] === "(" ? n++ : A[i] === ")" && n--, n === 0 && e.test(A[i]) && (t.push(A.slice(r, i).trim()), r = i + 1);
  return t.push(A.slice(r).trim()), t;
}
function $e() {
  return process.env.SATORI_STANDALONE === "1" ? Promise.resolve().then(() => (Zn(), zn)).then((A) => A.getYoga()) : Promise.resolve().then(() => ($n(), jn)).then((A) => A.getYoga());
}
process.env.SATORI_STANDALONE !== "1" && Promise.resolve().then(() => ($n(), jn));
var xI = "image/avif", NI = "image/webp", Jr = "image/apng", Wr = "image/png", Kr = "image/jpeg", Yr = "image/gif", Ai = "image/svg+xml";
function Gs(A) {
  let e = new DataView(A), t = 4, r = e.byteLength;
  for (; t < r; ) {
    let n = e.getUint16(t, false);
    if (n > r) throw new TypeError("Invalid JPEG");
    let i = e.getUint8(n + 1 + t);
    if (i === 192 || i === 193 || i === 194) return [e.getUint16(n + 7 + t, false), e.getUint16(n + 5 + t, false)];
    t += n + 2;
  }
  throw new TypeError("Invalid JPEG");
}
function Us(A) {
  let e = new Uint8Array(A.slice(6, 10));
  return [e[0] | e[1] << 8, e[2] | e[3] << 8];
}
function Hs(A) {
  let e = new DataView(A);
  return [e.getUint16(18, false), e.getUint16(22, false)];
}
var Fe = ds(100), Jt = /* @__PURE__ */ new Map(), FI = [Wr, Jr, Kr, Yr, Ai];
function MI(A) {
  let e = "", t = new Uint8Array(A);
  for (let r = 0; r < t.byteLength; r++) e += String.fromCharCode(t[r]);
  return btoa(e);
}
function LI(A) {
  let e = atob(A), t = e.length, r = new Uint8Array(t);
  for (let n = 0; n < t; n++) r[n] = e.charCodeAt(n);
  return r.buffer;
}
function Ms(A, e) {
  let t = e.match(/<svg[^>]*>/)[0], r = t.match(/viewBox=['"](.+)['"]/), n = r ? pt(r[1]) : null, i = t.match(/width=['"](\d*\.\d+|\d+)['"]/), o = t.match(/height=['"](\d*\.\d+|\d+)['"]/);
  if (!n && (!i || !o)) throw new Error(`Failed to parse SVG from ${A}: missing "viewBox"`);
  let g = n ? [n[2], n[3]] : [+i[1], +o[1]], u = g[0] / g[1];
  return i && o ? [+i[1], +o[1]] : i ? [+i[1], +i[1] / u] : o ? [+o[1] * u, +o[1]] : [g[0], g[1]];
}
function Ls(A) {
  let e, t = GI(new Uint8Array(A));
  switch (t) {
    case Wr:
    case Jr:
      e = Hs(A);
      break;
    case Yr:
      e = Us(A);
      break;
    case Kr:
      e = Gs(A);
      break;
  }
  if (!FI.includes(t)) throw new Error(`Unsupported image type: ${t || "unknown"}`);
  return [`data:${t};base64,${MI(A)}`, e];
}
async function Dt(A) {
  if (!A) throw new Error("Image source is not provided.");
  if (typeof A == "object") {
    let [n, i] = Ls(A);
    return [n, ...i];
  }
  if ((A.startsWith('"') && A.endsWith('"') || A.startsWith("'") && A.endsWith("'")) && (A = A.slice(1, -1)), typeof window > "u" && !A.startsWith("http") && !A.startsWith("data:")) throw new Error(`Image source must be an absolute URL: ${A}`);
  if (A.startsWith("data:")) {
    let n;
    try {
      n = /data:(?<imageType>[a-z/+]+)(;[^;=]+=[^;=]+)*?(;(?<encodingType>[^;,]+))?,(?<dataString>.*)/g.exec(A).groups;
    } catch {
      return console.warn("Image data URI resolved without size:" + A), [A];
    }
    let { imageType: i, encodingType: o, dataString: g } = n;
    if (i === Ai) {
      let u = o === "base64" ? atob(g) : decodeURIComponent(g.replace(/ /g, "%20")), c = o === "base64" ? A : `data:image/svg+xml;base64,${btoa(u)}`, B = Ms(A, u);
      return Fe.set(A, [c, ...B]), [c, ...B];
    } else if (o === "base64") {
      let u, c = LI(g);
      switch (i) {
        case Wr:
        case Jr:
          u = Hs(c);
          break;
        case Yr:
          u = Us(c);
          break;
        case Kr:
          u = Gs(c);
          break;
      }
      return Fe.set(A, [A, ...u]), [A, ...u];
    } else return console.warn("Image data URI resolved without size:" + A), Fe.set(A, [A]), [A];
  }
  if (!globalThis.fetch) throw new Error("`fetch` is required to be polyfilled to load images.");
  if (Jt.has(A)) return Jt.get(A);
  let e = Fe.get(A);
  if (e) return e;
  let t = A, r = fetch(t).then((n) => {
    let i = n.headers.get("content-type");
    return i === "image/svg+xml" || i === "application/svg+xml" ? n.text() : n.arrayBuffer();
  }).then((n) => {
    if (typeof n == "string") try {
      let g = `data:image/svg+xml;base64,${btoa(n)}`, u = Ms(t, n);
      return [g, ...u];
    } catch (g) {
      throw new Error(`Failed to parse SVG image: ${g.message}`);
    }
    let [i, o] = Ls(n);
    return [i, ...o];
  }).then((n) => (Fe.set(t, n), n)).catch((n) => (console.error(`Can't load image ${t}: ` + n.message), Fe.set(t, []), []));
  return Jt.set(t, r), r;
}
function GI(A) {
  return [255, 216, 255].every((e, t) => A[t] === e) ? Kr : [137, 80, 78, 71, 13, 10, 26, 10].every((e, t) => A[t] === e) ? UI(A) ? Jr : Wr : [71, 73, 70, 56].every((e, t) => A[t] === e) ? Yr : [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80].every((e, t) => !e || A[t] === e) ? NI : [60, 63, 120, 109, 108].every((e, t) => A[t] === e) ? Ai : [0, 0, 0, 0, 102, 116, 121, 112, 97, 118, 105, 102].every((e, t) => !e || A[t] === e) ? xI : null;
}
function UI(A) {
  let e = new DataView(A.buffer), t, r, n = 8, i = false;
  for (; !i && t !== "IEND" && n < A.length; ) {
    r = e.getUint32(n);
    let o = A.subarray(n + 4, n + 8);
    t = String.fromCharCode(...o), i = t === "acTL", n += 12 + r;
  }
  return i;
}
var ei = { accentHeight: "accent-height", alignmentBaseline: "alignment-baseline", arabicForm: "arabic-form", baselineShift: "baseline-shift", capHeight: "cap-height", clipPath: "clip-path", clipRule: "clip-rule", colorInterpolation: "color-interpolation", colorInterpolationFilters: "color-interpolation-filters", colorProfile: "color-profile", colorRendering: "color-rendering", dominantBaseline: "dominant-baseline", enableBackground: "enable-background", fillOpacity: "fill-opacity", fillRule: "fill-rule", floodColor: "flood-color", floodOpacity: "flood-opacity", fontFamily: "font-family", fontSize: "font-size", fontSizeAdjust: "font-size-adjust", fontStretch: "font-stretch", fontStyle: "font-style", fontVariant: "font-variant", fontWeight: "font-weight", glyphName: "glyph-name", glyphOrientationHorizontal: "glyph-orientation-horizontal", glyphOrientationVertical: "glyph-orientation-vertical", horizAdvX: "horiz-adv-x", horizOriginX: "horiz-origin-x", href: "href", imageRendering: "image-rendering", letterSpacing: "letter-spacing", lightingColor: "lighting-color", markerEnd: "marker-end", markerMid: "marker-mid", markerStart: "marker-start", overlinePosition: "overline-position", overlineThickness: "overline-thickness", paintOrder: "paint-order", panose1: "panose-1", pointerEvents: "pointer-events", renderingIntent: "rendering-intent", shapeRendering: "shape-rendering", stopColor: "stop-color", stopOpacity: "stop-opacity", strikethroughPosition: "strikethrough-position", strikethroughThickness: "strikethrough-thickness", strokeDasharray: "stroke-dasharray", strokeDashoffset: "stroke-dashoffset", strokeLinecap: "stroke-linecap", strokeLinejoin: "stroke-linejoin", strokeMiterlimit: "stroke-miterlimit", strokeOpacity: "stroke-opacity", strokeWidth: "stroke-width", textAnchor: "text-anchor", textDecoration: "text-decoration", textRendering: "text-rendering", underlinePosition: "underline-position", underlineThickness: "underline-thickness", unicodeBidi: "unicode-bidi", unicodeRange: "unicode-range", unitsPerEm: "units-per-em", vAlphabetic: "v-alphabetic", vHanging: "v-hanging", vIdeographic: "v-ideographic", vMathematical: "v-mathematical", vectorEffect: "vector-effect", vertAdvY: "vert-adv-y", vertOriginX: "vert-origin-x", vertOriginY: "vert-origin-y", wordSpacing: "word-spacing", writingMode: "writing-mode", xHeight: "x-height", xlinkActuate: "xlink:actuate", xlinkArcrole: "xlink:arcrole", xlinkHref: "xlink:href", xlinkRole: "xlink:role", xlinkShow: "xlink:show", xlinkTitle: "xlink:title", xlinkType: "xlink:type", xmlBase: "xml:base", xmlLang: "xml:lang", xmlSpace: "xml:space", xmlnsXlink: "xmlns:xlink" }, HI = /[\r\n%#()<>?[\\\]^`{|}"']/g;
function ti(A, e) {
  if (!A) return "";
  if (Array.isArray(A)) return A.map((c) => ti(c, e)).join("");
  if (typeof A != "object") return String(A);
  let t = A.type;
  if (t === "text") throw new Error("<text> nodes are not currently supported, please convert them to <path>");
  let { children: r, style: n, ...i } = A.props || {}, o = (n == null ? void 0 : n.color) || e, g = `${Object.entries(i).map(([c, B]) => (typeof B == "string" && B.toLowerCase() === "currentcolor" && (B = o), c === "href" && t === "image" ? ` ${ei[c] || c}="${Fe.get(B)[0]}"` : ` ${ei[c] || c}="${B}"`)).join("")}`, u = n ? ` style="${Object.entries(n).map(([c, B]) => `${ys(c)}:${B}`).join(";")}"` : "";
  return `<${t}${g}${u}>${ti(r, o)}</${t}>`;
}
async function Os(A) {
  let e = /* @__PURE__ */ new Set(), t = (r) => {
    if (r && ht(r)) {
      if (Array.isArray(r)) {
        r.forEach((n) => t(n));
        return;
      } else typeof r == "object" && (r.type === "image" ? e.has(r.props.href) || e.add(r.props.href) : r.type === "img" && (e.has(r.props.src) || e.add(r.props.src)));
      Array.isArray(r.props.children) ? r.props.children.map((n) => t(n)) : t(r.props.children);
    }
  };
  return t(A), Promise.all(Array.from(e).map((r) => Dt(r)));
}
async function Ts(A, e) {
  let { viewBox: t, viewbox: r, width: n, height: i, className: o, style: g, children: u, ...c } = A.props || {};
  t ||= r, c.xmlns = "http://www.w3.org/2000/svg";
  let B = (g == null ? void 0 : g.color) || e, E = pt(t), d = E ? E[3] / E[2] : null;
  return n = n || d && i ? i / d : null, i = i || d && n ? n * d : null, c.width = n, c.height = i, t && (c.viewBox = t), `data:image/svg+xml;utf8,${`<svg ${Object.entries(c).map(([C, m]) => (typeof m == "string" && m.toLowerCase() === "currentcolor" && (m = B), ` ${ei[C] || C}="${m}"`)).join("")}>${ti(u, B)}</svg>`.replace(HI, encodeURIComponent)}`;
}
var Ee = "flex", Ps = { p: { display: Ee, marginTop: "1em", marginBottom: "1em" }, div: { display: Ee }, blockquote: { display: Ee, marginTop: "1em", marginBottom: "1em", marginLeft: 40, marginRight: 40 }, center: { display: Ee, textAlign: "center" }, hr: { display: Ee, marginTop: "0.5em", marginBottom: "0.5em", marginLeft: "auto", marginRight: "auto", borderWidth: 1, borderStyle: "solid" }, h1: { display: Ee, fontSize: "2em", marginTop: "0.67em", marginBottom: "0.67em", marginLeft: 0, marginRight: 0, fontWeight: "bold" }, h2: { display: Ee, fontSize: "1.5em", marginTop: "0.83em", marginBottom: "0.83em", marginLeft: 0, marginRight: 0, fontWeight: "bold" }, h3: { display: Ee, fontSize: "1.17em", marginTop: "1em", marginBottom: "1em", marginLeft: 0, marginRight: 0, fontWeight: "bold" }, h4: { display: Ee, marginTop: "1.33em", marginBottom: "1.33em", marginLeft: 0, marginRight: 0, fontWeight: "bold" }, h5: { display: Ee, fontSize: "0.83em", marginTop: "1.67em", marginBottom: "1.67em", marginLeft: 0, marginRight: 0, fontWeight: "bold" }, h6: { display: Ee, fontSize: "0.67em", marginTop: "2.33em", marginBottom: "2.33em", marginLeft: 0, marginRight: 0, fontWeight: "bold" }, u: { textDecoration: "underline" }, strong: { fontWeight: "bold" }, b: { fontWeight: "bold" }, i: { fontStyle: "italic" }, em: { fontStyle: "italic" }, code: { fontFamily: "monospace" }, kbd: { fontFamily: "monospace" }, pre: { display: Ee, fontFamily: "monospace", whiteSpace: "pre", marginTop: "1em", marginBottom: "1em" }, mark: { backgroundColor: "yellow", color: "black" }, big: { fontSize: "larger" }, small: { fontSize: "smaller" }, s: { textDecoration: "line-through" } };
var OI = /* @__PURE__ */ new Set(["color", "font", "fontFamily", "fontSize", "fontStyle", "fontWeight", "letterSpacing", "lineHeight", "textAlign", "textTransform", "textShadowOffset", "textShadowColor", "textShadowRadius", "WebkitTextStrokeWidth", "WebkitTextStrokeColor", "textDecorationLine", "textDecorationStyle", "textDecorationColor", "whiteSpace", "transform", "wordBreak", "tabSize", "opacity", "filter", "_viewportWidth", "_viewportHeight", "_inheritedClipPathId", "_inheritedMaskId", "_inheritedBackgroundClipTextPath"]);
function ri(A) {
  let e = {};
  for (let t in A) OI.has(t) && (e[t] = A[t]);
  return e;
}
function PI(A, e) {
  try {
    let t = new _e(A);
    switch (t.unit) {
      case "px":
        return { absolute: t.value };
      case "em":
        return { absolute: t.value * e };
      case "rem":
        return { absolute: t.value * 16 };
      case "%":
        return { relative: t.value };
      default:
        return {};
    }
  } catch {
    return {};
  }
}
function ni(A, e, t) {
  switch (A) {
    case "top":
      return { yRelative: 0 };
    case "left":
      return { xRelative: 0 };
    case "right":
      return { xRelative: 100 };
    case "bottom":
      return { yRelative: 100 };
    case "center":
      return {};
    default: {
      let r = PI(A, e);
      return r.absolute ? { [t ? "xAbsolute" : "yAbsolute"]: r.absolute } : r.relative ? { [t ? "xRelative" : "yRelative"]: r.relative } : {};
    }
  }
}
function ii(A, e) {
  if (typeof A == "number") return { xAbsolute: A };
  let t;
  try {
    t = TI(A).nodes.filter((r) => r.type === "word").map((r) => r.value);
  } catch {
    return {};
  }
  return t.length === 1 ? ni(t[0], e, true) : t.length === 2 ? ((t[0] === "top" || t[0] === "bottom" || t[1] === "left" || t[1] === "right") && t.reverse(), { ...ni(t[0], e, true), ...ni(t[1], e, false) }) : {};
}
function Wt(A, e) {
  let t = cssToReactNativeExports.getPropertyName(`mask-${e}`);
  return A[t] || A[`WebkitM${t.substring(1)}`];
}
function _s(A) {
  let e = A.maskImage || A.WebkitMaskImage, t = { position: Wt(A, "position") || "0% 0%", size: Wt(A, "size") || "100% 100%", repeat: Wt(A, "repeat") || "repeat", origin: Wt(A, "origin") || "border-box", clip: Wt(A, "origin") || "border-box" };
  return Hr(e).filter((n) => n && n !== "none").reverse().map((n) => ({ image: n, ...t }));
}
var qI = /* @__PURE__ */ new Set(["flex", "flexGrow", "flexShrink", "flexBasis", "fontWeight", "lineHeight", "opacity", "scale", "scaleX", "scaleY"]), XI = /* @__PURE__ */ new Set(["lineHeight"]);
function VI(A, e, t, r) {
  return A === "textDecoration" && !t.includes(e.textDecorationColor) && (e.textDecorationColor = r), e;
}
function at(A, e) {
  let t = Number(e);
  return isNaN(t) ? e : qI.has(A) ? XI.has(A) ? t : String(e) : t + "px";
}
function zI(A, e, t) {
  if (A === "zIndex") return console.warn("`z-index` is currently not supported."), { [A]: e };
  if (A === "lineHeight") return { lineHeight: at(A, e) };
  if (A === "fontFamily") return { fontFamily: e.split(",").map((r) => r.trim().replace(/(^['"])|(['"]$)/g, "").toLocaleLowerCase()) };
  if (A === "borderRadius") {
    if (typeof e != "string" || !e.includes("/")) return;
    let [r, n] = e.split("/"), i = cssToReactNativeExports.getStylesForProperty(A, r, true), o = cssToReactNativeExports.getStylesForProperty(A, n, true);
    for (let g in i) o[g] = at(A, i[g]) + " " + at(A, o[g]);
    return o;
  }
  if (/^border(Top|Right|Bottom|Left)?$/.test(A)) {
    let r = cssToReactNativeExports.getStylesForProperty("border", e, true);
    r.borderWidth === 1 && !String(e).includes("1px") && (r.borderWidth = 3), r.borderColor === "black" && !String(e).includes("black") && (r.borderColor = t);
    let n = { Width: at(A + "Width", r.borderWidth), Style: te(r.borderStyle, { solid: "solid", dashed: "dashed" }, "solid", A + "Style"), Color: r.borderColor }, i = {};
    for (let o of A === "border" ? ["Top", "Right", "Bottom", "Left"] : [A.slice(6)]) for (let g in n) i["border" + o + g] = n[g];
    return i;
  }
  if (A === "boxShadow") {
    if (!e) throw new Error('Invalid `boxShadow` value: "' + e + '".');
    return { [A]: typeof e == "string" ? cssBoxShadowExports.parse(e) : e };
  }
  if (A === "transform") {
    if (typeof e != "string") throw new Error("Invalid `transform` value.");
    let r = {}, n = e.replace(/(-?[\d.]+%)/g, (o, g) => {
      let u = ~~(Math.random() * 1e9);
      return r[u] = g, u + "px";
    }), i = cssToReactNativeExports.getStylesForProperty("transform", n, true);
    for (let o of i.transform) for (let g in o) r[o[g]] && (o[g] = r[o[g]]);
    return i;
  }
  if (A === "background") return e = e.toString().trim(), /^(linear-gradient|radial-gradient|url|repeating-linear-gradient|repeating-radial-gradient)\(/.test(e) ? cssToReactNativeExports.getStylesForProperty("backgroundImage", e, true) : cssToReactNativeExports.getStylesForProperty("background", e, true);
  if (A === "textShadow") {
    e = e.toString().trim();
    let r = {}, n = Hr(e);
    for (let i of n) {
      let o = cssToReactNativeExports.getStylesForProperty("textShadow", i, true);
      for (let g in o) r[g] ? r[g].push(o[g]) : r[g] = [o[g]];
    }
    return r;
  }
  if (A === "WebkitTextStroke") {
    e = e.toString().trim();
    let r = e.split(" ");
    if (r.length !== 2) throw new Error("Invalid `WebkitTextStroke` value.");
    return { WebkitTextStrokeWidth: at(A, r[0]), WebkitTextStrokeColor: at(A, r[1]) };
  }
}
function Js(A) {
  return A === "transform" ? " Only absolute lengths such as `10px` are supported." : "";
}
var Ws = /rgb\((\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\.\d]+)\)/;
function Ys(A) {
  if (typeof A == "string" && Ws.test(A.trim())) return A.trim().replace(Ws, (e, t, r, n, i) => `rgba(${t}, ${r}, ${n}, ${i})`);
  if (typeof A == "object" && A !== null) {
    for (let e in A) A[e] = Ys(A[e]);
    return A;
  }
  return A;
}
function qr(A, e) {
  let t = {};
  if (A) {
    let n = jI(A.color, e.color);
    t.color = n;
    for (let i in A) {
      if (i.startsWith("_")) {
        t[i] = A[i];
        continue;
      }
      if (i === "color") continue;
      let o = cssToReactNativeExports.getPropertyName(i), g = Al(A[i], n);
      try {
        let u = zI(o, g, n) || VI(o, cssToReactNativeExports.getStylesForProperty(o, at(o, g), true), g, n);
        Object.assign(t, u);
      } catch (u) {
        throw new Error(u.message + (u.message.includes(g) ? `
  ` + Js(o) : `
  in CSS rule \`${o}: ${g}\`.${Js(o)}`));
      }
    }
  }
  if (t.backgroundImage) {
    let { backgrounds: n } = cssBackgroundParserExports.parseElementStyle(t);
    t.backgroundImage = n;
  }
  (t.maskImage || t.WebkitMaskImage) && (t.maskImage = _s(t));
  let r = ZI(t.fontSize, e.fontSize);
  typeof t.fontSize < "u" && (t.fontSize = r), t.transformOrigin && (t.transformOrigin = ii(t.transformOrigin, r));
  for (let n in t) {
    let i = t[n];
    if (n === "lineHeight") typeof i == "string" && i !== "normal" && (i = t[n] = tA(i, r, r, e, true) / r);
    else {
      if (typeof i == "string") {
        let o = tA(i, r, r, e);
        typeof o < "u" && (t[n] = o), i = t[n];
      }
      if (typeof i == "string" || typeof i == "object") {
        let o = Ys(i);
        o && (t[n] = o), i = t[n];
      }
    }
    if (n === "opacity" && typeof i == "number" && (t.opacity = i * e.opacity), n === "transform") {
      let o = i;
      for (let g of o) {
        let u = Object.keys(g)[0], c = g[u], B = typeof c == "string" ? tA(c, r, r, e) ?? c : c;
        g[u] = B;
      }
    }
    if (n === "textShadowRadius") {
      let o = i;
      t.textShadowRadius = o.map((g) => tA(g, r, 0, e, false));
    }
    if (n === "textShadowOffset") {
      let o = i;
      t.textShadowOffset = o.map(({ height: g, width: u }) => ({ height: tA(g, r, 0, e, false), width: tA(u, r, 0, e, false) }));
    }
  }
  return t;
}
function ZI(A, e) {
  if (typeof A == "number") return A;
  try {
    let t = new _e(A);
    switch (t.unit) {
      case "em":
        return t.value * e;
      case "rem":
        return t.value * 16;
    }
  } catch {
    return e;
  }
}
function Ks(A) {
  if (A.startsWith("hsl")) {
    let e = parseCSSColor(A), [t, r, n] = e.values;
    return `hsl(${[t, `${r}%`, `${n}%`].concat(e.alpha === 1 ? [] : [e.alpha]).join(",")})`;
  }
  return A;
}
function jI(A, e) {
  return A && A.toLowerCase() !== "currentcolor" ? Ks(A) : Ks(e);
}
function $I(A, e) {
  return A.replace(/currentcolor/gi, e);
}
function Al(A, e) {
  return Ur(A) && (A = $I(A, e)), A;
}
async function oi(A, e, t, r, n) {
  let i = await $e(), o = { ...t, ...qr(Ps[e], t), ...qr(r, t) };
  if (e === "img") {
    let [g, u, c] = await Dt(n.src);
    if (u === void 0 && c === void 0) {
      if (n.width === void 0 || n.height === void 0) throw new Error("Image size cannot be determined. Please provide the width and height of the image.");
      u = parseInt(n.width), c = parseInt(n.height);
    }
    let B = c / u, E = (o.borderLeftWidth || 0) + (o.borderRightWidth || 0) + (o.paddingLeft || 0) + (o.paddingRight || 0), d = (o.borderTopWidth || 0) + (o.borderBottomWidth || 0) + (o.paddingTop || 0) + (o.paddingBottom || 0), C = o.width || n.width, m = o.height || n.height, D = typeof C == "number" && typeof m == "number";
    D && (C -= E, m -= d), C === void 0 && m === void 0 ? (C = "100%", A.setAspectRatio(1 / B)) : C === void 0 ? typeof m == "number" ? C = m / B : A.setAspectRatio(1 / B) : m === void 0 && (typeof C == "number" ? m = C * B : A.setAspectRatio(1 / B)), o.width = D ? C + E : C, o.height = D ? m + d : m, o.__src = g;
  }
  if (e === "svg") {
    let g = n.viewBox || n.viewbox, u = pt(g), c = u ? u[3] / u[2] : null, { width: B, height: E } = n;
    typeof B > "u" && E ? c == null ? B = 0 : typeof E == "string" && E.endsWith("%") ? B = parseInt(E) / c + "%" : (E = tA(E, t.fontSize, 1, t), B = E / c) : typeof E > "u" && B ? c == null ? B = 0 : typeof B == "string" && B.endsWith("%") ? E = parseInt(B) * c + "%" : (B = tA(B, t.fontSize, 1, t), E = B * c) : (typeof B < "u" && (B = tA(B, t.fontSize, 1, t) || B), typeof E < "u" && (E = tA(E, t.fontSize, 1, t) || E), B ||= u == null ? void 0 : u[2], E ||= u == null ? void 0 : u[3]), !o.width && B && (o.width = B), !o.height && E && (o.height = E);
  }
  return A.setDisplay(te(o.display, { flex: i.DISPLAY_FLEX, block: i.DISPLAY_FLEX, contents: i.DISPLAY_CONTENTS, none: i.DISPLAY_NONE, "-webkit-box": i.DISPLAY_FLEX }, i.DISPLAY_FLEX, "display")), A.setAlignContent(te(o.alignContent, { stretch: i.ALIGN_STRETCH, center: i.ALIGN_CENTER, "flex-start": i.ALIGN_FLEX_START, "flex-end": i.ALIGN_FLEX_END, "space-between": i.ALIGN_SPACE_BETWEEN, "space-around": i.ALIGN_SPACE_AROUND, baseline: i.ALIGN_BASELINE, normal: i.ALIGN_AUTO }, i.ALIGN_AUTO, "alignContent")), A.setAlignItems(te(o.alignItems, { stretch: i.ALIGN_STRETCH, center: i.ALIGN_CENTER, "flex-start": i.ALIGN_FLEX_START, "flex-end": i.ALIGN_FLEX_END, baseline: i.ALIGN_BASELINE, normal: i.ALIGN_AUTO }, i.ALIGN_STRETCH, "alignItems")), A.setAlignSelf(te(o.alignSelf, { stretch: i.ALIGN_STRETCH, center: i.ALIGN_CENTER, "flex-start": i.ALIGN_FLEX_START, "flex-end": i.ALIGN_FLEX_END, baseline: i.ALIGN_BASELINE, normal: i.ALIGN_AUTO }, i.ALIGN_AUTO, "alignSelf")), A.setJustifyContent(te(o.justifyContent, { center: i.JUSTIFY_CENTER, "flex-start": i.JUSTIFY_FLEX_START, "flex-end": i.JUSTIFY_FLEX_END, "space-between": i.JUSTIFY_SPACE_BETWEEN, "space-around": i.JUSTIFY_SPACE_AROUND }, i.JUSTIFY_FLEX_START, "justifyContent")), A.setFlexDirection(te(o.flexDirection, { row: i.FLEX_DIRECTION_ROW, column: i.FLEX_DIRECTION_COLUMN, "row-reverse": i.FLEX_DIRECTION_ROW_REVERSE, "column-reverse": i.FLEX_DIRECTION_COLUMN_REVERSE }, i.FLEX_DIRECTION_ROW, "flexDirection")), A.setFlexWrap(te(o.flexWrap, { wrap: i.WRAP_WRAP, nowrap: i.WRAP_NO_WRAP, "wrap-reverse": i.WRAP_WRAP_REVERSE }, i.WRAP_NO_WRAP, "flexWrap")), typeof o.gap < "u" && A.setGap(i.GUTTER_ALL, o.gap), typeof o.rowGap < "u" && A.setGap(i.GUTTER_ROW, o.rowGap), typeof o.columnGap < "u" && A.setGap(i.GUTTER_COLUMN, o.columnGap), typeof o.flexBasis < "u" && A.setFlexBasis(je(o.flexBasis, "flexBasis")), A.setFlexGrow(typeof o.flexGrow > "u" ? 0 : o.flexGrow), A.setFlexShrink(typeof o.flexShrink > "u" ? 0 : o.flexShrink), typeof o.maxHeight < "u" && A.setMaxHeight(Je(o.maxHeight, "maxHeight")), typeof o.maxWidth < "u" && A.setMaxWidth(Je(o.maxWidth, "maxWidth")), typeof o.minHeight < "u" && A.setMinHeight(Je(o.minHeight, "minHeight")), typeof o.minWidth < "u" && A.setMinWidth(Je(o.minWidth, "minWidth")), A.setOverflow(te(o.overflow, { visible: i.OVERFLOW_VISIBLE, hidden: i.OVERFLOW_HIDDEN }, i.OVERFLOW_VISIBLE, "overflow")), A.setMargin(i.EDGE_TOP, je(o.marginTop || 0)), A.setMargin(i.EDGE_BOTTOM, je(o.marginBottom || 0)), A.setMargin(i.EDGE_LEFT, je(o.marginLeft || 0)), A.setMargin(i.EDGE_RIGHT, je(o.marginRight || 0)), A.setBorder(i.EDGE_TOP, o.borderTopWidth || 0), A.setBorder(i.EDGE_BOTTOM, o.borderBottomWidth || 0), A.setBorder(i.EDGE_LEFT, o.borderLeftWidth || 0), A.setBorder(i.EDGE_RIGHT, o.borderRightWidth || 0), A.setPadding(i.EDGE_TOP, o.paddingTop || 0), A.setPadding(i.EDGE_BOTTOM, o.paddingBottom || 0), A.setPadding(i.EDGE_LEFT, o.paddingLeft || 0), A.setPadding(i.EDGE_RIGHT, o.paddingRight || 0), A.setBoxSizing(te(o.boxSizing, { "border-box": i.BOX_SIZING_BORDER_BOX, "content-box": i.BOX_SIZING_CONTENT_BOX }, i.BOX_SIZING_BORDER_BOX, "boxSizing")), A.setPositionType(te(o.position, { absolute: i.POSITION_TYPE_ABSOLUTE, relative: i.POSITION_TYPE_RELATIVE, static: i.POSITION_TYPE_STATIC }, i.POSITION_TYPE_RELATIVE, "position")), typeof o.top < "u" && A.setPosition(i.EDGE_TOP, Je(o.top, "top")), typeof o.bottom < "u" && A.setPosition(i.EDGE_BOTTOM, Je(o.bottom, "bottom")), typeof o.left < "u" && A.setPosition(i.EDGE_LEFT, Je(o.left, "left")), typeof o.right < "u" && A.setPosition(i.EDGE_RIGHT, Je(o.right, "right")), typeof o.height < "u" ? A.setHeight(je(o.height, "height")) : A.setHeightAuto(), typeof o.width < "u" ? A.setWidth(je(o.width, "width")) : A.setWidthAuto(), [o, ri(o)];
}
var qs = [1, 0, 0, 1, 0, 0];
function el(A, e, t) {
  let r = [...qs];
  for (let n of A) {
    let i = Object.keys(n)[0], o = n[i];
    if (typeof o == "string") if (i === "translateX") o = parseFloat(o) / 100 * e, n[i] = o;
    else if (i === "translateY") o = parseFloat(o) / 100 * t, n[i] = o;
    else throw new Error(`Invalid transform: "${i}: ${o}".`);
    let g = o, u = [...qs];
    switch (i) {
      case "translateX":
        u[4] = g;
        break;
      case "translateY":
        u[5] = g;
        break;
      case "scale":
        u[0] = g, u[3] = g;
        break;
      case "scaleX":
        u[0] = g;
        break;
      case "scaleY":
        u[3] = g;
        break;
      case "rotate": {
        let c = g * Math.PI / 180, B = Math.cos(c), E = Math.sin(c);
        u[0] = B, u[1] = E, u[2] = -E, u[3] = B;
        break;
      }
      case "skewX":
        u[2] = Math.tan(g * Math.PI / 180);
        break;
      case "skewY":
        u[1] = Math.tan(g * Math.PI / 180);
        break;
    }
    r = Pt(u, r);
  }
  A.splice(0, A.length), A.push(...r), A.__resolved = true;
}
function Kt({ left: A, top: e, width: t, height: r }, n, i, o) {
  let g;
  n.__resolved || el(n, t, r);
  let u = n;
  if (i) g = u;
  else {
    let c = (o == null ? void 0 : o.xAbsolute) ?? ((o == null ? void 0 : o.xRelative) ?? 50) * t / 100, B = (o == null ? void 0 : o.yAbsolute) ?? ((o == null ? void 0 : o.yRelative) ?? 50) * r / 100, E = A + c, d = e + B;
    g = Pt([1, 0, 0, 1, E, d], Pt(u, [1, 0, 0, 1, -E, -d])), u.__parent && (g = Pt(u.__parent, g)), u.splice(0, 6, ...g);
  }
  return `matrix(${g.map((c) => c.toFixed(2)).join(",")})`;
}
function Vs({ left: A, top: e, width: t, height: r, isInheritingTransform: n }, i) {
  let o = "", g = 1;
  return i.transform && (o = Kt({ left: A, top: e, width: t, height: r }, i.transform, n, i.transformOrigin)), i.opacity !== void 0 && (g = +i.opacity), { matrix: o, opacity: g };
}
function si({ id: A, content: e, filter: t, left: r, top: n, width: i, height: o, matrix: g, opacity: u, image: c, clipPathId: B, debug: E, shape: d, decorationShape: C }, m) {
  let D = "";
  if (E && (D = H("rect", { x: r, y: n - o, width: i, height: o, fill: "transparent", stroke: "#575eff", "stroke-width": 1, transform: g || void 0, "clip-path": B ? `url(#${B})` : void 0 })), c) {
    let b = { href: c, x: r, y: n, width: i, height: o, transform: g || void 0, "clip-path": B ? `url(#${B})` : void 0, style: m.filter ? `filter:${m.filter}` : void 0 };
    return [(t ? `${t}<g filter="url(#satori_s-${A})">` : "") + H("image", { ...b, opacity: u !== 1 ? u : void 0 }) + (C || "") + (t ? "</g>" : "") + D, ""];
  }
  let S = { x: r, y: n, width: i, height: o, "font-weight": m.fontWeight, "font-style": m.fontStyle, "font-size": m.fontSize, "font-family": m.fontFamily, "letter-spacing": m.letterSpacing || void 0, transform: g || void 0, "clip-path": B ? `url(#${B})` : void 0, style: m.filter ? `filter:${m.filter}` : void 0, "stroke-width": m.WebkitTextStrokeWidth ? `${m.WebkitTextStrokeWidth}px` : void 0, stroke: m.WebkitTextStrokeWidth ? m.WebkitTextStrokeColor : void 0, "stroke-linejoin": m.WebkitTextStrokeWidth ? "round" : void 0, "paint-order": m.WebkitTextStrokeWidth ? "stroke" : void 0 };
  return [(t ? `${t}<g filter="url(#satori_s-${A})">` : "") + H("text", { ...S, fill: m.color, opacity: u !== 1 ? u : void 0 }, Xs(e)) + (C || "") + (t ? "</g>" : "") + D, d ? H("text", S, Xs(e)) : ""];
}
function tl(A, e, t) {
  return A.replace(/([MA])([0-9.-]+),([0-9.-]+)/g, function(r, n, i, o) {
    return n + (parseFloat(i) + e) + "," + (parseFloat(o) + t);
  });
}
var Xr = 1.1;
function zs({ id: A, width: e, height: t }, r) {
  if (!r.shadowColor || !r.shadowOffset || typeof r.shadowRadius > "u") return "";
  let n = r.shadowColor.length, i = "", o = "", g = 0, u = e, c = 0, B = t;
  for (let E = 0; E < n; E++) {
    let d = r.shadowRadius[E] * r.shadowRadius[E] / 4;
    g = Math.min(r.shadowOffset[E].width - d, g), u = Math.max(r.shadowOffset[E].width + d + e, u), c = Math.min(r.shadowOffset[E].height - d, c), B = Math.max(r.shadowOffset[E].height + d + t, B), i += H("feDropShadow", { dx: r.shadowOffset[E].width, dy: r.shadowOffset[E].height, stdDeviation: r.shadowRadius[E] / 2, "flood-color": r.shadowColor[E], "flood-opacity": 1, ...n > 1 ? { in: "SourceGraphic", result: `satori_s-${A}-result-${E}` } : {} }), n > 1 && (o = H("feMergeNode", { in: `satori_s-${A}-result-${E}` }) + o);
  }
  return H("filter", { id: `satori_s-${A}`, x: (g / e * 100 * Xr).toFixed(2) + "%", y: (c / t * 100 * Xr).toFixed(2) + "%", width: ((u - g) / e * 100 * Xr).toFixed(2) + "%", height: ((B - c) / t * 100 * Xr).toFixed(2) + "%" }, i + (o ? H("feMerge", {}, o) : ""));
}
function Zs({ width: A, height: e, shape: t, opacity: r, id: n }, i) {
  if (!i.boxShadow) return null;
  let o = "", g = "";
  for (let u = i.boxShadow.length - 1; u >= 0; u--) {
    let c = "", B = i.boxShadow[u];
    B.spreadRadius && B.inset && (B.spreadRadius = -B.spreadRadius);
    let E = B.blurRadius * B.blurRadius / 4 + (B.spreadRadius || 0), d = Math.min(-E - (B.inset ? B.offsetX : 0), 0), C = Math.max(E + A - (B.inset ? B.offsetX : 0), A), m = Math.min(-E - (B.inset ? B.offsetY : 0), 0), D = Math.max(E + e - (B.inset ? B.offsetY : 0), e), S = `satori_s-${n}-${u}`, b = `satori_ms-${n}-${u}`, L = B.spreadRadius ? t.replace('stroke-width="0"', `stroke-width="${B.spreadRadius * 2}"`) : t;
    c += H("mask", { id: b, maskUnits: "userSpaceOnUse" }, H("rect", { x: 0, y: 0, width: i._viewportWidth || "100%", height: i._viewportHeight || "100%", fill: B.inset ? "#000" : "#fff" }) + L.replace('fill="#fff"', B.inset ? 'fill="#fff"' : 'fill="#000"').replace('stroke="#fff"', ""));
    let x = L.replace(/d="([^"]+)"/, (k, F) => 'd="' + tl(F, B.offsetX, B.offsetY) + '"').replace(/x="([^"]+)"/, (k, F) => 'x="' + (parseFloat(F) + B.offsetX) + '"').replace(/y="([^"]+)"/, (k, F) => 'y="' + (parseFloat(F) + B.offsetY) + '"');
    B.spreadRadius && B.spreadRadius < 0 && (c += H("mask", { id: b + "-neg", maskUnits: "userSpaceOnUse" }, x.replace('stroke="#fff"', 'stroke="#000"').replace(/stroke-width="[^"]+"/, `stroke-width="${-B.spreadRadius * 2}"`))), B.spreadRadius && B.spreadRadius < 0 && (x = H("g", { mask: `url(#${b}-neg)` }, x)), c += H("defs", {}, H("filter", { id: S, x: `${d / A * 100}%`, y: `${m / e * 100}%`, width: `${(C - d) / A * 100}%`, height: `${(D - m) / e * 100}%` }, H("feGaussianBlur", { stdDeviation: B.blurRadius / 2, result: "b" }) + H("feFlood", { "flood-color": B.color, in: "SourceGraphic", result: "f" }) + H("feComposite", { in: "f", in2: "b", operator: B.inset ? "out" : "in" }))) + H("g", { mask: `url(#${b})`, filter: `url(#${S})`, opacity: r }, x), B.inset ? g += c : o += c;
  }
  return [o, g];
}
function ai({ width: A, left: e, top: t, ascender: r, clipPathId: n, matrix: i }, o) {
  let { textDecorationColor: g, textDecorationStyle: u, textDecorationLine: c, fontSize: B, color: E } = o;
  if (!c || c === "none") return "";
  let d = Math.max(1, B * 0.1), C = c === "line-through" ? t + r * 0.7 : c === "underline" ? t + r * 1.1 : t, m = u === "dashed" ? `${d * 1.2} ${d * 2}` : u === "dotted" ? `0 ${d * 2}` : void 0, D = u === "double" ? H("line", { x1: e, y1: C + d + 1, x2: e + A, y2: C + d + 1, stroke: g || E, "stroke-width": d, "stroke-dasharray": m, "stroke-linecap": u === "dotted" ? "round" : "square", transform: i }) : "";
  return (n ? `<g clip-path="url(#${n})">` : "") + H("line", { x1: e, y1: C, x2: e + A, y2: C, stroke: g || E, "stroke-width": d, "stroke-dasharray": m, "stroke-linecap": u === "dotted" ? "round" : "square", transform: i }) + D + (n ? "</g>" : "");
}
function gi(A) {
  return A = A.replace("U+", "0x"), String.fromCodePoint(Number(A));
}
var gt = gi("U+0020"), ui = gi("U+0009"), St = gi("U+2026");
function js(A, e, t) {
  let { fontSize: r, letterSpacing: n } = t, i = /* @__PURE__ */ new Map();
  function o(c) {
    if (i.has(c)) return i.get(c);
    let B = A.measure(c, { fontSize: r, letterSpacing: n });
    return i.set(c, B), B;
  }
  function g(c) {
    let B = 0;
    for (let E of c) e(E) ? B += r : B += o(E);
    return B;
  }
  function u(c) {
    return g(ee(c, "grapheme"));
  }
  return { measureGrapheme: o, measureGraphemeArray: g, measureText: u };
}
function $s(A, e, t) {
  let { textTransform: r, whiteSpace: n, wordBreak: i } = e;
  A = rl(A, r, t);
  let { content: o, shouldCollapseTabsAndSpaces: g, allowSoftWrap: u } = ol(A, n), { words: c, requiredBreaks: B, allowBreakWord: E } = il(o, i), [d, C] = nl(e, u);
  return { words: c, requiredBreaks: B, allowSoftWrap: u, allowBreakWord: E, processedContent: o, shouldCollapseTabsAndSpaces: g, lineLimit: d, blockEllipsis: C };
}
function rl(A, e, t) {
  return e === "uppercase" ? A = A.toLocaleUpperCase(t) : e === "lowercase" ? A = A.toLocaleLowerCase(t) : e === "capitalize" && (A = ee(A, "word", t).map((r) => ee(r, "grapheme", t).map((n, i) => i === 0 ? n.toLocaleUpperCase(t) : n).join("")).join("")), A;
}
function nl(A, e) {
  let { textOverflow: t, lineClamp: r, WebkitLineClamp: n, WebkitBoxOrient: i, overflow: o, display: g } = A;
  if (g === "block" && r) {
    let [u, c = St] = sl(r);
    if (u) return [u, c];
  }
  return t === "ellipsis" && g === "-webkit-box" && i === "vertical" && hs(n) && n > 0 ? [n, St] : t === "ellipsis" && o === "hidden" && !e ? [1, St] : [1 / 0];
}
function il(A, e) {
  let t = ["break-all", "break-word"].includes(e), { words: r, requiredBreaks: n } = ms(A, e);
  return { words: r, requiredBreaks: n, allowBreakWord: t };
}
function ol(A, e) {
  let t = ["pre", "pre-wrap", "pre-line"].includes(e), r = ["normal", "nowrap", "pre-line"].includes(e), n = !["pre", "nowrap"].includes(e);
  return t || (A = A.replace(/\n/g, gt)), r && (A = A.replace(/([ ]|\t)+/g, gt).replace(/^[ ]|[ ]$/g, "")), { content: A, shouldCollapseTabsAndSpaces: r, allowSoftWrap: n };
}
function sl(A) {
  if (typeof A == "number") return [A];
  let e = /^(\d+)\s*"(.*)"$/, t = /^(\d+)\s*'(.*)'$/, r = e.exec(A), n = t.exec(A);
  if (r) {
    let i = +r[1], o = r[2];
    return [i, o];
  } else if (n) {
    let i = +n[1], o = n[2];
    return [i, o];
  }
  return [];
}
var al = /* @__PURE__ */ new Set([ui]);
function gl(A) {
  return al.has(A);
}
async function* Ii(A, e) {
  let t = await $e(), { parentStyle: r, inheritedStyle: n, parent: i, font: o, id: g, isInheritingTransform: u, debug: c, embedFont: B, graphemeImages: E, locale: d, canLoadAdditionalAssets: C } = e, { textAlign: m, lineHeight: D, textWrap: S, fontSize: b, filter: L, tabSize: x = 8, letterSpacing: k, _inheritedBackgroundClipTextPath: F, flexShrink: G } = r, { words: J, requiredBreaks: q, allowSoftWrap: lA, allowBreakWord: wA, processedContent: UA, shouldCollapseTabsAndSpaces: NA, lineLimit: j, blockEllipsis: SA } = $s(A, r, d), IA = ul(t, m);
  i.insertChild(IA, i.getChildCount()), ps(G) && i.setFlexShrink(1);
  let V = o.getEngine(b, D, r, d), HA = C ? ee(UA, "grapheme").filter((Z) => !gl(Z) && !V.has(Z)) : [];
  yield HA.map((Z) => ({ word: Z, locale: d })), HA.length && (V = o.getEngine(b, D, r, d));
  function gA(Z) {
    return !!(E && E[Z]);
  }
  let { measureGrapheme: pA, measureGraphemeArray: RA, measureText: ae } = js(V, gA, { fontSize: b, letterSpacing: k }), OA = Ur(x) ? tA(x, b, 1, r) : pA(gt) * x, ge = (Z, $) => {
    if (Z.length === 0) return { originWidth: 0, endingSpacesWidth: 0, text: Z };
    let { index: oA, tabCount: nA } = Il(Z), iA = 0;
    if (nA > 0) {
      let AA = Z.slice(0, oA), uA = Z.slice(oA + nA), X = ae(AA), YA = X + $;
      iA = (OA === 0 ? X : (Math.floor(YA / OA) + nA) * OA) + ae(uA);
    } else iA = ae(Z);
    let sA = Z.trimEnd() === Z ? iA : ae(Z.trimEnd());
    return { originWidth: iA, endingSpacesWidth: iA - sA, text: Z };
  }, hA = [], W = [], vA = [], FA = [], TA = [];
  function U(Z) {
    let $ = 0, oA = 0, nA = -1, iA = 0, sA = 0, AA = 0, uA = 0;
    hA = [], vA = [0], FA = [], TA = [];
    let X = 0, YA = 0;
    for (; X < J.length && $ < j; ) {
      let aA = J[X], De = q[X], LA = 0, { originWidth: ce, endingSpacesWidth: Ze, text: Be } = ge(aA, sA);
      aA = Be, LA = ce;
      let z = Ze;
      De && AA === 0 && (AA = V.height(aA));
      let GA = m === "justify", fe = X && sA + LA > Z + z && lA;
      if (wA && LA > Z && (!sA || fe || De)) {
        let xA = ee(aA, "grapheme");
        J.splice(X, 1, ...xA), sA > 0 && (hA.push(sA - YA), W.push(uA), $++, iA += AA, sA = 0, AA = 0, uA = 0, vA.push(1), nA = -1), YA = z;
        continue;
      }
      if (De || fe) NA && aA === gt && (LA = 0), hA.push(sA - YA), W.push(uA), $++, iA += AA, sA = LA, AA = LA ? Math.round(V.height(aA)) : 0, uA = LA ? Math.round(V.baseline(aA)) : 0, vA.push(1), nA = -1, De || (oA = Math.max(oA, Z));
      else {
        sA += LA;
        let xA = Math.round(V.height(aA));
        xA > AA && (AA = xA, uA = Math.round(V.baseline(aA))), GA && vA[vA.length - 1]++;
      }
      GA && nA++, oA = Math.max(oA, sA);
      let Ne = sA - LA;
      if (LA === 0) TA.push({ y: iA, x: Ne, width: 0, line: $, lineIndex: nA, isImage: false });
      else {
        let xA = ee(aA, "word");
        for (let PA = 0; PA < xA.length; PA++) {
          let _A = xA[PA], $A = 0, Ae = false;
          gA(_A) ? ($A = b, Ae = true) : $A = pA(_A), FA.push(_A), TA.push({ y: iA, x: Ne, width: $A, line: $, lineIndex: nA, isImage: Ae }), Ne += $A;
        }
      }
      X++, YA = z;
    }
    return sA && ($ < j && (iA += AA), $++, hA.push(sA), W.push(uA)), { width: oA, height: iA };
  }
  let XA = { width: 0, height: 0 };
  IA.setMeasureFunc((Z) => {
    let { width: $, height: oA } = U(Z);
    if (S === "balance") {
      let iA = $ / 2, sA = $, AA = $;
      for (; iA + 1 < sA; ) {
        AA = (iA + sA) / 2;
        let { height: X } = U(AA);
        X > oA ? iA = AA : sA = AA;
      }
      U(sA);
      let uA = Math.ceil(sA);
      return XA = { width: uA, height: oA }, { width: uA, height: oA };
    }
    if (S === "pretty" && hA[hA.length - 1] < $ / 3) {
      let AA = $ * 0.9, uA = U(AA);
      if (uA.height <= oA * 1.3) return XA = { width: $, height: uA.height }, { width: $, height: uA.height };
    }
    let nA = Math.ceil($);
    return XA = { width: nA, height: oA }, { width: nA, height: oA };
  });
  let [me, ot] = yield, Ue = "", rA = "", MA = n._inheritedClipPathId, be = n._inheritedMaskId, { left: re, top: kA, width: ye, height: VA } = IA.getComputedLayout(), Re = i.getComputedWidth() - i.getComputedPadding(t.EDGE_LEFT) - i.getComputedPadding(t.EDGE_RIGHT) - i.getComputedBorder(t.EDGE_LEFT) - i.getComputedBorder(t.EDGE_RIGHT), ue = me + re, ZA = ot + kA, { matrix: KA, opacity: xe } = Vs({ left: re, top: kA, width: ye, height: VA, isInheritingTransform: u }, r), Ie = "";
  if (r.textShadowOffset) {
    let { textShadowColor: Z, textShadowOffset: $, textShadowRadius: oA } = r;
    Ie = zs({ width: XA.width, height: XA.height, id: g }, { shadowColor: Z, shadowOffset: $, shadowRadius: oA }), Ie = H("defs", {}, Ie);
  }
  let we = "", Ve = "", ze = "", ne = -1, jA = {}, bA = null, le = 0;
  for (let Z = 0; Z < FA.length; Z++) {
    let $ = TA[Z], oA = TA[Z + 1];
    if (!$) continue;
    let nA = FA[Z], iA = null, sA = false, AA = E ? E[nA] : null, uA = $.y, X = $.x, YA = $.width, aA = $.line;
    if (aA === ne) continue;
    let De = false;
    if (hA.length > 1) {
      let z = ye - hA[aA];
      if (m === "right" || m === "end") X += z;
      else if (m === "center") X += z / 2;
      else if (m === "justify" && aA < hA.length - 1) {
        let GA = vA[aA], fe = GA > 1 ? z / (GA - 1) : 0;
        X += fe * $.lineIndex, De = true;
      }
      X = Math.round(X);
    }
    let LA = W[aA], ce = V.baseline(nA), Ze = V.height(nA), Be = LA - ce;
    if (jA[aA] || (jA[aA] = [X, ZA + uA + Be, ce, De ? ye : hA[aA]]), j !== 1 / 0) {
      let xA = function(PA, _A) {
        let $A = ee(_A, "grapheme", d), Ae = "", Et = 0;
        for (let Qt of $A) {
          let Ct = PA + RA([Ae + Qt]);
          if (Ae && Ct + GA > Re) break;
          Ae += Qt, Et = Ct;
        }
        return { subset: Ae, resolvedWidth: Et };
      }, z = SA, GA = pA(SA);
      GA > Re && (z = St, GA = pA(z));
      let fe = pA(gt), QA = aA < hA.length - 1;
      if (aA + 1 === j && (QA || hA[aA] > Re)) {
        if (X + YA + GA + fe > Re) {
          let { subset: PA, resolvedWidth: _A } = xA(X, nA);
          nA = PA + z, ne = aA, jA[aA][2] = _A, sA = true;
        } else if (oA && oA.line !== aA) if (m === "center") {
          let { subset: PA, resolvedWidth: _A } = xA(X, nA);
          nA = PA + z, ne = aA, jA[aA][2] = _A, sA = true;
        } else {
          let PA = FA[Z + 1], { subset: _A, resolvedWidth: $A } = xA(YA + X, PA);
          nA = nA + _A + z, ne = aA, jA[aA][2] = $A, sA = true;
        }
      }
    }
    if (AA) uA += 0;
    else if (B) {
      if (!nA.includes(ui) && !Cs.includes(nA) && FA[Z + 1] && oA && !oA.isImage && uA === oA.y && !sA) {
        bA === null && (le = X), bA = bA === null ? nA : bA + nA;
        continue;
      }
      let z = bA === null ? nA : bA + nA, GA = bA === null ? X : le, fe = $.width + X - GA;
      iA = V.getSVG(z.replace(/(\t)+/g, ""), { fontSize: b, left: ue + GA, top: ZA + uA + ce + Be, letterSpacing: k }), bA = null, c && (ze += H("rect", { x: ue + GA, y: ZA + uA + Be, width: fe, height: Ze, fill: "transparent", stroke: "#575eff", "stroke-width": 1, transform: KA || void 0, "clip-path": MA ? `url(#${MA})` : void 0 }) + H("line", { x1: ue + X, x2: ue + X + $.width, y1: ZA + uA + Be + ce, y2: ZA + uA + Be + ce, stroke: "#14c000", "stroke-width": 1, transform: KA || void 0, "clip-path": MA ? `url(#${MA})` : void 0 }));
    } else uA += ce + Be;
    if (r.textDecorationLine) {
      let z = jA[aA];
      z && !z[4] && (we += ai({ left: ue + z[0], top: z[1], width: z[3], ascender: z[2], clipPathId: MA, matrix: KA }, r), z[4] = 1);
    }
    if (iA !== null) Ve += iA + " ";
    else {
      let [z, GA] = si({ content: nA, filter: Ie, id: g, left: ue + X, top: ZA + uA, width: YA, height: Ze, matrix: KA, opacity: xe, image: AA, clipPathId: MA, debug: c, shape: !!F, decorationShape: we }, r);
      Ue += z, rA += GA, we = "";
    }
    if (sA) break;
  }
  if (Ve) {
    let Z = r.color !== "transparent" && xe !== 0 ? `<g ${be ? `mask="url(#${be})"` : ""} ${MA ? `clip-path="url(#${MA})"` : ""}>` + H("path", { fill: r.color, d: Ve, transform: KA || void 0, opacity: xe !== 1 ? xe : void 0, style: L ? `filter:${L}` : void 0, "stroke-width": n.WebkitTextStrokeWidth ? `${n.WebkitTextStrokeWidth}px` : void 0, stroke: n.WebkitTextStrokeWidth ? n.WebkitTextStrokeColor : void 0, "stroke-linejoin": n.WebkitTextStrokeWidth ? "round" : void 0, "paint-order": n.WebkitTextStrokeWidth ? "stroke" : void 0 }) + "</g>" : "";
    F && (rA = H("path", { d: Ve, transform: KA || void 0 })), Ue += (Ie ? Ie + H("g", { filter: `url(#satori_s-${g})` }, Z + we) : Z + we) + ze;
  }
  return rA && (r._inheritedBackgroundClipTextPath.value += rA), Ue;
}
function ul(A, e) {
  let t = A.Node.create();
  return t.setAlignItems(A.ALIGN_BASELINE), t.setJustifyContent(te(e, { left: A.JUSTIFY_FLEX_START, right: A.JUSTIFY_FLEX_END, center: A.JUSTIFY_CENTER, justify: A.JUSTIFY_SPACE_BETWEEN, start: A.JUSTIFY_FLEX_START, end: A.JUSTIFY_FLEX_END }, A.JUSTIFY_FLEX_START, "textAlign")), t;
}
function Il(A) {
  let e = /(\t)+/.exec(A);
  return e ? { index: e.index, tabCount: e[0].length } : { index: null, tabCount: 0 };
}
function Vr(A, e, t, r, n) {
  let i = [], o = e.at(-1), g = o && o.offset && o.offset.unit === "%" && r ? +o.offset.value : 100;
  for (let E of e) {
    let { color: d } = E;
    if (!i.length && (i.push({ offset: 0, color: d }), !E.offset || E.offset.value === "0")) continue;
    let C = typeof E.offset > "u" ? void 0 : E.offset.unit === "%" ? +E.offset.value / g : Number(tA(`${E.offset.value}${E.offset.unit}`, t.fontSize, A, t, true)) / A;
    i.push({ offset: C, color: d });
  }
  i.length || i.push({ offset: 0, color: "transparent" });
  let u = i[i.length - 1];
  u.offset !== 1 && (typeof u.offset > "u" ? u.offset = 1 : r ? i[i.length - 1] = { offset: 1, color: u.color } : i.push({ offset: 1, color: u.color }));
  let c = 0, B = 1;
  for (let E = 0; E < i.length; E++) if (typeof i[E].offset > "u") {
    for (B < E && (B = E); typeof i[B].offset > "u"; ) B++;
    i[E].offset = (i[B].offset - i[c].offset) / (B - c) * (E - c) + i[c].offset;
  } else c = E;
  return n === "mask" ? i.map((E) => {
    let d = parseCSSColor(E.color);
    return d ? d.alpha === 0 ? { ...E, color: "rgba(0, 0, 0, 1)" } : { ...E, color: `rgba(255, 255, 255, ${d.alpha})` } : E;
  }) : i;
}
function Aa({ id: A, width: e, height: t, repeatX: r, repeatY: n }, i, o, g, u, c) {
  let B = P(i), [E, d] = o, C = i.startsWith("repeating"), m, D, S;
  if (B.orientation.type === "directional") m = fl(B.orientation.value), D = Math.sqrt(Math.pow((m.x2 - m.x1) * E, 2) + Math.pow((m.y2 - m.y1) * d, 2));
  else if (B.orientation.type === "angular") {
    let { length: F, ...G } = El(Tn(`${B.orientation.value.value}${B.orientation.value.unit}`) / 180 * Math.PI, E, d);
    D = F, m = G;
  }
  S = C ? Ql(B.stops, D, m, u) : m;
  let b = Vr(C ? Bl(B.stops, D) : D, B.stops, u, C, c), L = `satori_bi${A}`, x = `satori_pattern_${A}`, k = H("pattern", { id: x, x: g[0] / e, y: g[1] / t, width: r ? E / e : "1", height: n ? d / t : "1", patternUnits: "objectBoundingBox" }, H("linearGradient", { id: L, ...S, spreadMethod: C ? "repeat" : "pad" }, b.map((F) => H("stop", { offset: (F.offset ?? 0) * 100 + "%", "stop-color": F.color })).join("")) + H("rect", { x: 0, y: 0, width: E, height: d, fill: `url(#${L})` }));
  return [x, k];
}
function Bl(A, e) {
  let t = A[A.length - 1], { offset: r } = t;
  return r ? r.unit === "%" ? Number(r.value) / 100 * e : Number(r.value) : e;
}
function fl(A) {
  let e = 0, t = 0, r = 0, n = 0;
  return A.includes("top") ? t = 1 : A.includes("bottom") && (n = 1), A.includes("left") ? e = 1 : A.includes("right") && (r = 1), !e && !r && !t && !n && (t = 1), { x1: e, y1: t, x2: r, y2: n };
}
function El(A, e, t) {
  let r = Math.pow(t / e, 2);
  A = (A % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  let n, i, o, g, u, c, B, E, d = (C) => {
    if (C === 0) {
      n = 0, i = t, o = 0, g = 0, u = t;
      return;
    } else if (C === Math.PI / 2) {
      n = 0, i = 0, o = e, g = 0, u = e;
      return;
    }
    if (C > 0 && C < Math.PI / 2) {
      n = (r * e / 2 / Math.tan(C) - t / 2) / (Math.tan(C) + r / Math.tan(C)), i = Math.tan(C) * n + t, o = Math.abs(e / 2 - n) + e / 2, g = t / 2 - Math.abs(i - t / 2), u = Math.sqrt(Math.pow(o - n, 2) + Math.pow(g - i, 2)), B = (e / 2 / Math.tan(C) - t / 2) / (Math.tan(C) + 1 / Math.tan(C)), E = Math.tan(C) * B + t, u = 2 * Math.sqrt(Math.pow(e / 2 - B, 2) + Math.pow(t / 2 - E, 2));
      return;
    } else if (C > Math.PI / 2 && C < Math.PI) {
      n = (t / 2 + r * e / 2 / Math.tan(C)) / (Math.tan(C) + r / Math.tan(C)), i = Math.tan(C) * n, o = Math.abs(e / 2 - n) + e / 2, g = t / 2 + Math.abs(i - t / 2), B = (e / 2 / Math.tan(C) + t / 2) / (Math.tan(C) + 1 / Math.tan(C)), E = Math.tan(C) * B, u = 2 * Math.sqrt(Math.pow(e / 2 - B, 2) + Math.pow(t / 2 - E, 2));
      return;
    } else C >= Math.PI && (d(C - Math.PI), c = n, n = o, o = c, c = i, i = g, g = c);
  };
  return d(A), { x1: n / e, y1: i / t, x2: o / e, y2: g / t, length: u };
}
function Ql(A, e, t, r) {
  let { x1: n, x2: i, y1: o, y2: g } = t, u = A[0].offset ? A[0].offset.unit === "%" ? Number(A[0].offset.value) / 100 : tA(`${A[0].offset.value}${A[0].offset.unit}`, r.fontSize, e, r, true) / e : 0, c = A.at(-1).offset ? A.at(-1).offset.unit === "%" ? Number(A.at(-1).offset.value) / 100 : tA(`${A.at(-1).offset.value}${A.at(-1).offset.unit}`, r.fontSize, e, r, true) / e : 1, B = (i - n) * u + n, E = (g - o) * u + o, d = (i - n) * c + n, C = (g - o) * c + o;
  return { x1: B, y1: E, x2: d, y2: C };
}
function ta({ id: A, width: e, height: t, repeatX: r, repeatY: n }, i, o, g, u, c) {
  var j;
  let { shape: B, stops: E, position: d, size: C, repeating: m } = K(i), [D, S] = o, b = D / 2, L = S / 2, x = hl(d.x, d.y, D, S, u.fontSize, u);
  b = x.x, L = x.y;
  let k = dl(e, E, m, u), F = Vr(k, E, u, m, c), G = `satori_radial_${A}`, J = `satori_pattern_${A}`, q = `satori_mask_${A}`, lA = ml(B, C, u.fontSize, { x: b, y: L }, [D, S], u, m), wA = pl(B, u.fontSize, E, [D, S], u, m, lA), UA = H("pattern", { id: J, x: g[0] / e, y: g[1] / t, width: r ? D / e : "1", height: n ? S / t : "1", patternUnits: "objectBoundingBox" }, H("radialGradient", { id: G, ...wA }, F.map((SA) => H("stop", { offset: SA.offset || 0, "stop-color": SA.color })).join("")) + H("mask", { id: q }, H("rect", { x: 0, y: 0, width: D, height: S, fill: "#fff" })) + H("rect", { x: 0, y: 0, width: D, height: S, fill: ((j = F.at(-1)) == null ? void 0 : j.color) || "transparent" }) + H(B, { cx: b, cy: L, width: D, height: S, ...lA, fill: `url(#${G})`, mask: `url(#${q})` }));
  return [J, UA];
}
function dl(A, e, t, r) {
  if (!t) return A;
  let n = e.at(-1);
  return !n || !n.offset || n.offset.unit === "%" ? A : tA(`${n.offset.value}${n.offset.unit}`, +r.fontSize, A, r, true);
}
function hl(A, e, t, r, n, i) {
  let o = { x: t / 2, y: r / 2 };
  return A.type === "keyword" ? Object.assign(o, ea(A.value, t, r, "x")) : o.x = tA(`${A.value.value}${A.value.unit}`, n, t, i, true) ?? t / 2, e.type === "keyword" ? Object.assign(o, ea(e.value, t, r, "y")) : o.y = tA(`${e.value.value}${e.value.unit}`, n, r, i, true) ?? r / 2, o;
}
function ea(A, e, t, r) {
  switch (A) {
    case "center":
      return { [r]: r === "x" ? e / 2 : t / 2 };
    case "left":
      return { x: 0 };
    case "top":
      return { y: 0 };
    case "right":
      return { x: e };
    case "bottom":
      return { y: t };
  }
}
function pl(A, e, t, [r, n], i, o, g) {
  let { r: u, rx: c, ratio: B = 1 } = g;
  if (!o) return { spreadMethod: "pad" };
  let E = t.at(-1), d = A === "circle" ? u * 2 : c * 2;
  return { spreadMethod: "repeat", cx: "50%", cy: "50%", r: E.offset.unit === "%" ? `${Number(E.offset.value) * Math.min(n / r, 1) / B}%` : Number(tA(`${E.offset.value}${E.offset.unit}`, e, r, i, true) / d) };
}
function ml(A, e, t, r, n, i, o) {
  let [g, u] = n, { x: c, y: B } = r, E = {}, d = 0, C = 0;
  if (yl(e)) {
    if (e.some((m) => m.value.value.startsWith("-"))) throw new Error("disallow setting negative values to the size of the shape. Check https://w3c.github.io/csswg-drafts/css-images/#valdef-rg-size-length-0");
    return A === "circle" ? Object.assign(E, { r: Number(tA(`${e[0].value.value}${e[0].value.unit}`, t, g, i, true)) }) : Object.assign(E, { rx: Number(tA(`${e[0].value.value}${e[0].value.unit}`, t, g, i, true)), ry: Number(tA(`${e[1].value.value}${e[1].value.unit}`, t, u, i, true)) }), zr(E, g, u, c, B, o, A), E;
  }
  switch (e[0].value) {
    case "farthest-corner":
      d = Math.max(Math.abs(g - c), Math.abs(c)), C = Math.max(Math.abs(u - B), Math.abs(B));
      break;
    case "closest-corner":
      d = Math.min(Math.abs(g - c), Math.abs(c)), C = Math.min(Math.abs(u - B), Math.abs(B));
      break;
    case "farthest-side":
      return A === "circle" ? E.r = Math.max(Math.abs(g - c), Math.abs(c), Math.abs(u - B), Math.abs(B)) : (E.rx = Math.max(Math.abs(g - c), Math.abs(c)), E.ry = Math.max(Math.abs(u - B), Math.abs(B))), zr(E, g, u, c, B, o, A), E;
    case "closest-side":
      return A === "circle" ? E.r = Math.min(Math.abs(g - c), Math.abs(c), Math.abs(u - B), Math.abs(B)) : (E.rx = Math.min(Math.abs(g - c), Math.abs(c)), E.ry = Math.min(Math.abs(u - B), Math.abs(B))), zr(E, g, u, c, B, o, A), E;
  }
  return A === "circle" ? E.r = Math.sqrt(d * d + C * C) : Object.assign(E, ra(d, C)), zr(E, g, u, c, B, o, A), E;
}
function zr(A, e, t, r, n, i, o) {
  if (i) if (o === "ellipse") {
    let g = Math.max(Math.abs(e - r), Math.abs(r)), u = Math.max(Math.abs(t - n), Math.abs(n)), { rx: c, ry: B } = ra(g, u);
    A.ratio = Math.max(c / A.rx, B / A.ry), A.ratio > 1 && (A.rx *= A.ratio, A.ry *= A.ratio);
  } else {
    let g = Math.max(Math.abs(e - r), Math.abs(r)), u = Math.max(Math.abs(t - n), Math.abs(n)), c = Math.sqrt(g * g + u * u);
    A.ratio = c / A.r, A.ratio > 1 && (A.r = c);
  }
}
function ra(A, e) {
  let t = e !== 0 ? A / e : 1;
  if (A === 0) return { rx: 0, ry: 0 };
  {
    let r = Math.sqrt(A * A + e * e * t * t) / t;
    return { ry: r, rx: r * t };
  }
}
function yl(A) {
  return !A.some((e) => e.type === "keyword");
}
function wl(A, e) {
  return typeof A == "string" && A.endsWith("%") ? e * parseFloat(A) / 100 : +A;
}
function li(A, { x: e, y: t, defaultX: r, defaultY: n }) {
  return (A ? A.split(" ").map((i) => {
    try {
      let o = new _e(i);
      return o.type === "length" || o.type === "number" ? o.value : o.value + o.unit;
    } catch {
      return null;
    }
  }).filter((i) => i !== null) : [r, n]).map((i, o) => wl(i, [e, t][o]));
}
async function Yt({ id: A, width: e, height: t, left: r, top: n }, { image: i, size: o, position: g, repeat: u }, c, B) {
  u = u || "repeat", B = B || "background";
  let E = u === "repeat-x" || u === "repeat", d = u === "repeat-y" || u === "repeat", C = li(o, { x: e, y: t, defaultX: e, defaultY: t }), m = li(g, { x: e, y: t, defaultX: 0, defaultY: 0 });
  if (i.startsWith("linear-gradient(") || i.startsWith("repeating-linear-gradient(")) return Aa({ id: A, width: e, height: t, repeatX: E, repeatY: d }, i, C, m, c, B);
  if (i.startsWith("radial-gradient(") || i.startsWith("repeating-radial-gradient(")) return ta({ id: A, width: e, height: t, repeatX: E, repeatY: d }, i, C, m, c, B);
  if (i.startsWith("url(")) {
    let D = li(o, { x: e, y: t, defaultX: 0, defaultY: 0 }), [S, b, L] = await Dt(i.slice(4, -1)), x = B === "mask" ? b || D[0] : D[0] || b, k = B === "mask" ? L || D[1] : D[1] || L;
    return [`satori_bi${A}`, H("pattern", { id: `satori_bi${A}`, patternContentUnits: "userSpaceOnUse", patternUnits: "userSpaceOnUse", x: m[0] + r, y: m[1] + n, width: E ? x : "100%", height: d ? k : "100%" }, H("image", { x: 0, y: 0, width: x, height: k, preserveAspectRatio: "none", href: S }))];
  }
  throw new Error(`Invalid background image: "${i}"`);
}
function Dl([A, e]) {
  return Math.round(A * 1e3) === 0 && Math.round(e * 1e3) === 0 ? 0 : Math.round(A * e / Math.sqrt(A * A + e * e) * 1e3) / 1e3;
}
function Zr(A, e, t) {
  return t < A + e && (t / 2 < A && t / 2 < e ? A = e = t / 2 : t / 2 < A ? A = t - e : t / 2 < e && (e = t - A)), [A, e];
}
function jr(A) {
  A[0] = A[1] = Math.min(A[0], A[1]);
}
function $r(A, e, t, r, n) {
  if (typeof A == "string") {
    let i = A.split(" ").map((g) => g.trim()), o = !i[1] && !i[0].endsWith("%");
    return i[1] = i[1] || i[0], [o, [Math.min(tA(i[0], r, e, n, true), e), Math.min(tA(i[1], r, t, n, true), t)]];
  }
  return typeof A == "number" ? [true, [Math.min(A, e), Math.min(A, t)]] : [true, void 0];
}
var An = (A) => A && A[0] !== 0 && A[1] !== 0;
function na({ id: A, borderRadiusPath: e, borderType: t, left: r, top: n, width: i, height: o }, g) {
  let u = `satori_brc-${A}`;
  return [H("clipPath", { id: u }, H(t, { x: r, y: n, width: i, height: o, d: e || void 0 })), u];
}
function et({ left: A, top: e, width: t, height: r }, n, i) {
  let { borderTopLeftRadius: o, borderTopRightRadius: g, borderBottomLeftRadius: u, borderBottomRightRadius: c, fontSize: B } = n, E, d, C, m;
  if ([E, o] = $r(o, t, r, B, n), [d, g] = $r(g, t, r, B, n), [C, u] = $r(u, t, r, B, n), [m, c] = $r(c, t, r, B, n), !i && !An(o) && !An(g) && !An(u) && !An(c)) return "";
  o ||= [0, 0], g ||= [0, 0], u ||= [0, 0], c ||= [0, 0], [o[0], g[0]] = Zr(o[0], g[0], t), [u[0], c[0]] = Zr(u[0], c[0], t), [o[1], u[1]] = Zr(o[1], u[1], r), [g[1], c[1]] = Zr(g[1], c[1], r), E && jr(o), d && jr(g), C && jr(u), m && jr(c);
  let D = [];
  D[0] = [g, g], D[1] = [c, [-c[0], c[1]]], D[2] = [u, [-u[0], -u[1]]], D[3] = [o, [o[0], -o[1]]];
  let S = `h${t - o[0] - g[0]} a${D[0][0]} 0 0 1 ${D[0][1]}`, b = `v${r - g[1] - c[1]} a${D[1][0]} 0 0 1 ${D[1][1]}`, L = `h${c[0] + u[0] - t} a${D[2][0]} 0 0 1 ${D[2][1]}`, x = `v${u[1] + o[1] - r} a${D[3][0]} 0 0 1 ${D[3][1]}`;
  if (i) {
    let F = function(NA) {
      let j = Dl([o, g, c, u][NA]);
      return NA === 0 ? [[A + o[0] - j, e + o[1] - j], [A + o[0], e]] : NA === 1 ? [[A + t - g[0] + j, e + g[1] - j], [A + t, e + g[1]]] : NA === 2 ? [[A + t - c[0] + j, e + r - c[1] + j], [A + t - c[0], e + r]] : [[A + u[0] - j, e + r - u[1] + j], [A, e + r - u[1]]];
    }, k = i.indexOf(false);
    if (!i.includes(true)) throw new Error("Invalid `partialSides`.");
    if (k === -1) k = 0;
    else for (; !i[k]; ) k = (k + 1) % 4;
    let G = "", J = F(k), q = `M${J[0]} A${D[(k + 3) % 4][0]} 0 0 1 ${J[1]}`, lA = 0;
    for (; lA < 4 && i[(k + lA) % 4]; lA++) G += q + " ", q = [S, b, L, x][(k + lA) % 4];
    let wA = (k + lA) % 4;
    G += q.split(" ")[0];
    let UA = F(wA);
    return G += ` A${D[(wA + 3) % 4][0]} 0 0 1 ${UA[0]}`, G;
  }
  return `M${A + o[0]},${e} ${S} ${b} ${L} ${x}`;
}
function ia(A, e, t) {
  return t[A + "Width"] === t[e + "Width"] && t[A + "Style"] === t[e + "Style"] && t[A + "Color"] === t[e + "Color"];
}
function oa({ id: A, currentClipPathId: e, borderPath: t, borderType: r, left: n, top: i, width: o, height: g }, u) {
  if (!(u.borderTopWidth || u.borderRightWidth || u.borderBottomWidth || u.borderLeftWidth)) return null;
  let B = `satori_bc-${A}`;
  return [H("clipPath", { id: B, "clip-path": e ? `url(#${e})` : void 0 }, H(r, { x: n, y: i, width: o, height: g, d: t || void 0 })), B];
}
function qt({ left: A, top: e, width: t, height: r, props: n, asContentMask: i, maskBorderOnly: o }, g) {
  let u = ["borderTop", "borderRight", "borderBottom", "borderLeft"];
  if (!i && !u.some((C) => g[C + "Width"])) return "";
  let c = "", B = 0;
  for (; B > 0 && ia(u[B], u[(B + 3) % 4], g); ) B = (B + 3) % 4;
  let E = [false, false, false, false], d = [];
  for (let C = 0; C < 4; C++) {
    let m = (B + C) % 4, D = (B + C + 1) % 4, S = u[m], b = u[D];
    if (E[m] = true, d = [g[S + "Width"], g[S + "Style"], g[S + "Color"], S], !ia(S, b, g)) {
      let L = (d[0] || 0) + (i && !o && g[S.replace("border", "padding")] || 0);
      L && (c += H("path", { width: t, height: r, ...n, fill: "none", stroke: i ? "#000" : d[2], "stroke-width": L * 2, "stroke-dasharray": !i && d[1] === "dashed" ? L * 2 + " " + L : void 0, d: et({ left: A, top: e, width: t, height: r }, g, E) })), E = [false, false, false, false];
    }
  }
  if (E.some(Boolean)) {
    let C = (d[0] || 0) + (i && !o && g[d[3].replace("border", "padding")] || 0);
    C && (c += H("path", { width: t, height: r, ...n, fill: "none", stroke: i ? "#000" : d[2], "stroke-width": C * 2, "stroke-dasharray": !i && d[1] === "dashed" ? C * 2 + " " + C : void 0, d: et({ left: A, top: e, width: t, height: r }, g, E) }));
  }
  return c;
}
function ci({ id: A, left: e, top: t, width: r, height: n, matrix: i, borderOnly: o }, g) {
  let u = (g.borderLeftWidth || 0) + (o ? 0 : g.paddingLeft || 0), c = (g.borderTopWidth || 0) + (o ? 0 : g.paddingTop || 0), B = (g.borderRightWidth || 0) + (o ? 0 : g.paddingRight || 0), E = (g.borderBottomWidth || 0) + (o ? 0 : g.paddingBottom || 0), d = { x: e + u, y: t + c, width: r - u - B, height: n - c - E };
  return H("mask", { id: A }, H("rect", { ...d, fill: "#fff", transform: g.overflow === "hidden" && g.transform && i ? i : void 0, mask: g._inheritedMaskId ? `url(#${g._inheritedMaskId})` : void 0 }) + qt({ left: e, top: t, width: r, height: n, props: { transform: i || void 0 }, asContentMask: true, maskBorderOnly: o }, g));
}
var Xt = { circle: /circle\((.+)\)/, ellipse: /ellipse\((.+)\)/, path: /path\((.+)\)/, polygon: /polygon\((.+)\)/, inset: /inset\((.+)\)/ };
function ua({ width: A, height: e }, t, r) {
  function n(c) {
    let B = c.match(Xt.circle);
    if (!B) return null;
    let [, E] = B, [d, C = ""] = E.split("at").map((S) => S.trim()), { x: m, y: D } = ga(C, A, e);
    return { type: "circle", r: tA(d, r.fontSize, Math.sqrt(Math.pow(A, 2) + Math.pow(e, 2)) / Math.sqrt(2), r, true), cx: tA(m, r.fontSize, A, r, true), cy: tA(D, r.fontSize, e, r, true) };
  }
  function i(c) {
    let B = c.match(Xt.ellipse);
    if (!B) return null;
    let [, E] = B, [d, C = ""] = E.split("at").map((L) => L.trim()), [m, D] = d.split(" "), { x: S, y: b } = ga(C, A, e);
    return { type: "ellipse", rx: tA(m || "50%", r.fontSize, A, r, true), ry: tA(D || "50%", r.fontSize, e, r, true), cx: tA(S, r.fontSize, A, r, true), cy: tA(b, r.fontSize, e, r, true) };
  }
  function o(c) {
    let B = c.match(Xt.path);
    if (!B) return null;
    let [E, d] = aa(B[1]);
    return { type: "path", d, "fill-rule": E };
  }
  function g(c) {
    let B = c.match(Xt.polygon);
    if (!B) return null;
    let [E, d] = aa(B[1]);
    return { type: "polygon", "fill-rule": E, points: d.split(",").map((C) => C.split(" ").map((m, D) => tA(m, r.fontSize, D === 0 ? A : e, r, true)).join(" ")).join(",") };
  }
  function u(c) {
    let B = c.match(Xt.inset);
    if (!B) return null;
    let [E, d] = (B[1].includes("round") ? B[1] : `${B[1].trim()} round 0`).split("round"), C = cssToReactNativeExports.getStylesForProperty("borderRadius", d, true), m = Object.values(C).map((k) => String(k)).map((k, F) => tA(k, r.fontSize, F === 0 || F === 2 ? e : A, r, true) || 0), D = Object.values(cssToReactNativeExports.getStylesForProperty("margin", E, true)).map((k) => String(k)).map((k, F) => tA(k, r.fontSize, F === 0 || F === 2 ? e : A, r, true) || 0), S = D[3], b = D[0], L = A - (D[1] + D[3]), x = e - (D[0] + D[2]);
    return m.some((k) => k > 0) ? { type: "path", d: et({ left: S, top: b, width: L, height: x }, { ...t, ...C }) } : { type: "rect", x: S, y: b, width: L, height: x };
  }
  return { parseCircle: n, parseEllipse: i, parsePath: o, parsePolygon: g, parseInset: u };
}
function aa(A) {
  let [, e = "nonzero", t] = A.replace(/('|")/g, "").match(/^(nonzero|evenodd)?,?(.+)/) || [];
  return [e, t];
}
function ga(A, e, t) {
  let r = A.split(" "), n = { x: r[0] || "50%", y: r[1] || "50%" };
  return r.forEach((i) => {
    i === "top" ? n.y = 0 : i === "bottom" ? n.y = t : i === "left" ? n.x = 0 : i === "right" ? n.x = e : i === "center" && (n.x = e / 2, n.y = t / 2);
  }), n;
}
function en(A) {
  return `satori_cp-${A}`;
}
function Ia(A) {
  return `url(#${en(A)})`;
}
function la(A, e, t) {
  if (e.clipPath === "none") return "";
  let r = ua(A, e, t), n = e.clipPath, i = { type: "" };
  for (let o of Object.keys(r)) if (i = r[o](n), i) break;
  if (i) {
    let { type: o, ...g } = i;
    return H("clipPath", { id: en(A.id), "clip-path": A.currentClipPath, transform: `translate(${A.left}, ${A.top})` }, H(o, g));
  }
  return "";
}
function Bi({ left: A, top: e, width: t, height: r, path: n, matrix: i, id: o, currentClipPath: g, src: u }, c, B) {
  let E = "", d = c.clipPath && c.clipPath !== "none" ? la({ left: A, top: e, width: t, height: r, id: o, currentClipPath: g}, c, B) : "";
  if (c.overflow !== "hidden" && !u) E = "";
  else {
    let m = d ? `satori_ocp-${o}` : en(o);
    E = H("clipPath", { id: m, "clip-path": g }, H(n ? "path" : "rect", { x: A, y: e, width: t, height: r, d: n || void 0, transform: c.overflow === "hidden" && c.transform && i ? i : void 0 }));
  }
  let C = ci({ id: `satori_om-${o}`, left: A, top: e, width: t, height: r, matrix: i, borderOnly: !u }, c);
  return d + E + C;
}
var Sl = (A) => `satori_mi-${A}`;
async function fi(A, e, t) {
  if (!e.maskImage) return ["", ""];
  let { left: r, top: n, width: i, height: o, id: g } = A, u = e.maskImage, c = u.length;
  if (!c) return ["", ""];
  let B = Sl(g), E = "";
  for (let d = 0; d < c; d++) {
    let C = u[d], [m, D] = await Yt({ id: `${B}-${d}`, left: r, top: n, width: i, height: o }, C, t, "mask");
    E += D + H("rect", { x: r, y: n, width: i, height: o, fill: `url(#${m})` });
  }
  return E = H("mask", { id: B }, E), [B, E];
}
async function Vt({ id: A, left: e, top: t, width: r, height: n, isInheritingTransform: i, src: o, debug: g }, u, c) {
  if (u.display === "none") return "";
  let B = !!o, E = "rect", d = "", C = "", m = [], D = 1, S = "";
  u.backgroundColor && m.push(u.backgroundColor), u.opacity !== void 0 && (D = +u.opacity), u.transform && (d = Kt({ left: e, top: t, width: r, height: n }, u.transform, i, u.transformOrigin));
  let b = "";
  if (u.backgroundImage) {
    let IA = [];
    for (let V = 0; V < u.backgroundImage.length; V++) {
      let HA = u.backgroundImage[V], gA = await Yt({ id: A + "_" + V, width: r, height: n, left: e, top: t }, HA, c);
      gA && IA.unshift(gA);
    }
    for (let V of IA) m.push(`url(#${V[0]})`), C += V[1], V[2] && (b += V[2]);
  }
  let [L, x] = await fi({ id: A, left: e, top: t, width: r, height: n }, u, c);
  C += x;
  let k = L ? `url(#${L})` : u._inheritedMaskId ? `url(#${u._inheritedMaskId})` : void 0, F = et({ left: e, top: t, width: r, height: n }, u);
  F && (E = "path");
  let G = u._inheritedClipPathId;
  g && (S = H("rect", { x: e, y: t, width: r, height: n, fill: "transparent", stroke: "#ff5757", "stroke-width": 1, transform: d || void 0, "clip-path": G ? `url(#${G})` : void 0 }));
  let { backgroundClip: J, filter: q } = u, lA = J === "text" ? `url(#satori_bct-${A})` : G ? `url(#${G})` : u.clipPath ? Ia(A) : void 0, wA = Bi({ left: e, top: t, width: r, height: n, path: F, id: A, matrix: d, currentClipPath: lA, src: o }, u, c), UA = m.map((IA) => H(E, { x: e, y: t, width: r, height: n, fill: IA, d: F || void 0, transform: d || void 0, "clip-path": u.transform ? void 0 : lA, style: q ? `filter:${q}` : void 0, mask: u.transform ? void 0 : k })).join(""), NA = oa({ id: A, left: e, top: t, width: r, height: n, currentClipPathId: G, borderPath: F, borderType: E }, u), j;
  if (B) {
    let IA = (u.borderLeftWidth || 0) + (u.paddingLeft || 0), V = (u.borderTopWidth || 0) + (u.paddingTop || 0), HA = (u.borderRightWidth || 0) + (u.paddingRight || 0), gA = (u.borderBottomWidth || 0) + (u.paddingBottom || 0), pA = "Mid", RA = "Mid", OA = (u.objectPosition || "center").toString().trim().toLowerCase().split(/\s+/);
    if (OA.length === 1) switch (OA[0]) {
      case "left":
        pA = "Min", RA = "Mid";
        break;
      case "right":
        pA = "Max", RA = "Mid";
        break;
      case "top":
        pA = "Mid", RA = "Min";
        break;
      case "bottom":
        pA = "Mid", RA = "Max";
        break;
      case "center":
        pA = "Mid", RA = "Mid";
        break;
    }
    else if (OA.length === 2) for (let W of OA) W === "left" ? pA = "Min" : W === "right" ? pA = "Max" : W === "center" ? pA = "Mid" : W === "top" ? RA = "Min" : W === "bottom" && (RA = "Max");
    let ge = `x${pA}Y${RA}`, hA = u.objectFit === "contain" ? ge : u.objectFit === "cover" ? `${ge} slice` : "none";
    u.transform && (j = na({ id: A, borderRadiusPath: F, borderType: E, left: e, top: t, width: r, height: n })), UA += H("image", { x: e + IA, y: t + V, width: r - IA - HA, height: n - V - gA, href: o, preserveAspectRatio: hA, transform: d || void 0, style: q ? `filter:${q}` : void 0, "clip-path": u.transform ? j ? `url(#${j[1]})` : void 0 : `url(#satori_cp-${A})`, mask: u.transform ? void 0 : L ? `url(#${L})` : `url(#satori_om-${A})` });
  }
  if (NA) {
    C += NA[0];
    let IA = NA[1];
    UA += qt({ left: e, top: t, width: r, height: n, props: { transform: d || void 0, "clip-path": `url(#${IA})` } }, u);
  }
  let SA = Zs({ width: r, height: n, id: A, opacity: D, shape: H(E, { x: e, y: t, width: r, height: n, fill: "#fff", stroke: "#fff", "stroke-width": 0, d: F || void 0, transform: d || void 0, "clip-path": lA, mask: k }) }, u);
  return (C ? H("defs", {}, C) : "") + (SA ? SA[0] : "") + (j ? j[0] : "") + wA + (D !== 1 ? `<g opacity="${D}">` : "") + (u.transform && (lA || k) ? `<g${lA ? ` clip-path="${lA}"` : ""}${k ? ` mask="${k}"` : ""}>` : "") + (b || UA) + (u.transform && (lA || k) ? "</g>" : "") + (D !== 1 ? "</g>" : "") + (SA ? SA[1] : "") + S;
}
var Ba = String.raw, ca = Ba`\p{Emoji}(?:\p{EMod}|[\u{E0020}-\u{E007E}]+\u{E007F}|\uFE0F?\u20E3?)`, fa = () => new RegExp(Ba`\p{RI}{2}|(?![#*\d](?!\uFE0F?\u20E3))${ca}(?:\u200D${ca})*`, "gu");
var vl = new RegExp(fa(), "u"), Ei = { emoji: vl, symbol: /\p{Symbol}/u, math: /\p{Math}/u }, Qi = { "ja-JP": /\p{scx=Hira}|\p{scx=Kana}|\p{scx=Han}|[\u3000]|[\uFF00-\uFFEF]/u, "ko-KR": /\p{scx=Hangul}/u, "zh-CN": /\p{scx=Han}/u, "zh-TW": /\p{scx=Han}/u, "zh-HK": /\p{scx=Han}/u, "th-TH": /\p{scx=Thai}/u, "bn-IN": /\p{scx=Bengali}/u, "ar-AR": /\p{scx=Arabic}/u, "ta-IN": /\p{scx=Tamil}/u, "ml-IN": /\p{scx=Malayalam}/u, "he-IL": /\p{scx=Hebrew}/u, "te-IN": /\p{scx=Telugu}/u, devanagari: /\p{scx=Devanagari}/u, kannada: /\p{scx=Kannada}/u }, tn = Object.keys({ ...Qi, ...Ei });
function Ea(A) {
  return tn.includes(A);
}
function Qa(A, e) {
  for (let r of Object.keys(Ei)) if (Ei[r].test(A)) return [r];
  let t = Object.keys(Qi).filter((r) => Qi[r].test(A));
  if (t.length === 0) return ["unknown"];
  if (e) {
    let r = t.findIndex((n) => n === e);
    r !== -1 && (t.splice(r, 1), t.unshift(e));
  }
  return t;
}
function Ca(A) {
  if (A) return tn.find((e) => e.toLowerCase().startsWith(A.toLowerCase()));
}
async function* zt(A, e) {
  var hA;
  let t = await $e(), { id: r, inheritedStyle: n, parent: i, font: o, debug: g, locale: u, embedFont: c = true, graphemeImages: B, canLoadAdditionalAssets: E, getTwStyles: d } = e;
  if (A === null || typeof A > "u") return yield, yield, "";
  if (!ht(A) || fs(A.type)) {
    let W;
    if (!ht(A)) W = Ii(String(A), e), yield (await W.next()).value;
    else {
      if (Bs(A.type)) throw new Error("Class component is not supported.");
      let FA;
      On(A.type) ? FA = A.type.render : FA = A.type, W = zt(await FA(A.props), e), yield (await W.next()).value;
    }
    await W.next();
    let vA = yield;
    return (await W.next(vA)).value;
  }
  let { type: C, props: m } = A, D = C;
  if (m && Es(m)) throw new Error("dangerouslySetInnerHTML property is not supported. See documentation for more information https://github.com/vercel/satori#jsx.");
  let { style: S, children: b, tw: L, lang: x = u } = m || {}, k = Ca(x);
  if (L) {
    let W = d(L, S);
    S = Object.assign(W, S);
  }
  let F = t.Node.create();
  i.insertChild(F, i.getChildCount());
  let [G, J] = await oi(F, D, n, S, m), q = G.transform === n.transform;
  if (q || (G.transform.__parent = n.transform), (G.overflow === "hidden" || G.clipPath && G.clipPath !== "none") && (J._inheritedClipPathId = `satori_cp-${r}`, J._inheritedMaskId = `satori_om-${r}`), G.maskImage && (J._inheritedMaskId = `satori_mi-${r}`), G.backgroundClip === "text") {
    let W = { value: "" };
    J._inheritedBackgroundClipTextPath = W, G._inheritedBackgroundClipTextPath = W;
  }
  let lA = Qs(b), wA = [], UA = 0, NA = [];
  for (let W of lA) {
    let vA = zt(W, { id: r + "-" + UA++, parentStyle: G, inheritedStyle: J, isInheritingTransform: true, parent: F, font: o, embedFont: c, debug: g, graphemeImages: B, canLoadAdditionalAssets: E, locale: k, getTwStyles: d, onNodeDetected: e.onNodeDetected });
    E ? NA.push(...(await vA.next()).value || []) : await vA.next(), wA.push(vA);
  }
  yield NA;
  for (let W of wA) await W.next();
  let [j, SA] = yield, { left: IA, top: V, width: HA, height: gA } = F.getComputedLayout();
  IA += j, V += SA;
  let pA = "", RA = "", ae = "", { children: OA, ...ge } = m;
  if ((hA = e.onNodeDetected) == null || hA.call(e, { left: IA, top: V, width: HA, height: gA, type: D, props: ge, key: A.key, textContent: ht(OA) ? void 0 : OA }), D === "img") {
    let W = G.__src;
    RA = await Vt({ id: r, left: IA, top: V, width: HA, height: gA, src: W, isInheritingTransform: q, debug: g }, G, J);
  } else if (D === "svg") {
    let W = G.color, vA = await Ts(A, W);
    RA = await Vt({ id: r, left: IA, top: V, width: HA, height: gA, src: vA, isInheritingTransform: q, debug: g }, G, J);
  } else {
    let W = S == null ? void 0 : S.display;
    if (D === "div" && b && typeof b != "string" && W !== "flex" && W !== "none" && W !== "contents") throw new Error('Expected <div> to have explicit "display: flex", "display: contents", or "display: none" if it has more than one child node.');
    RA = await Vt({ id: r, left: IA, top: V, width: HA, height: gA, isInheritingTransform: q, debug: g }, G, J);
  }
  for (let W of wA) pA += (await W.next([IA, V])).value;
  return G._inheritedBackgroundClipTextPath && (ae += H("clipPath", { id: `satori_bct-${r}`, "clip-path": G._inheritedClipPathId ? `url(#${G._inheritedClipPathId})` : void 0 }, G._inheritedBackgroundClipTextPath.value)), ae + RA + pA;
}
var da = "unknown";
function kl(A, e, [t, r], [n, i]) {
  if (t !== n) return t ? !n || t === A ? -1 : n === A ? 1 : A === 400 && t === 500 || A === 500 && t === 400 ? -1 : A === 400 && n === 500 || A === 500 && n === 400 ? 1 : A < 400 ? t < A && n < A ? n - t : t < A ? -1 : n < A ? 1 : t - n : A < t && A < n ? t - n : A < t ? -1 : A < n ? 1 : n - t : 1;
  if (r !== i) {
    if (r === e) return -1;
    if (i === e) return 1;
  }
  return -1;
}
var Ci = /* @__PURE__ */ new WeakMap(), jt = class {
  constructor(e) {
    this.fonts = /* @__PURE__ */ new Map();
    this.addFonts(e);
  }
  get({ name: e, weight: t, style: r }) {
    if (!this.fonts.has(e)) return null;
    t === "normal" && (t = 400), t === "bold" && (t = 700), typeof t == "string" && (t = Number.parseInt(t, 10));
    let n = [...this.fonts.get(e)], i = n[0];
    for (let o = 1; o < n.length; o++) {
      let [, g, u] = i, [, c, B] = n[o];
      kl(t, r, [g, u], [c, B]) > 0 && (i = n[o]);
    }
    return i[0];
  }
  addFonts(e) {
    for (let t of e) {
      let { name: r, data: n, lang: i } = t;
      if (i && !Ea(i)) throw new Error(`Invalid value for props \`lang\`: "${i}". The value must be one of the following: ${tn.join(", ")}.`);
      let o = i ?? da, g;
      if (Ci.has(n)) g = Ci.get(n);
      else {
        g = opentype.parse("buffer" in n ? n.buffer.slice(n.byteOffset, n.byteOffset + n.byteLength) : n, { lowMemory: true });
        let c = g.charToGlyphIndex;
        g.charToGlyphIndex = (B) => {
          let E = c.call(g, B);
          return E === 0 && g._trackBrokenChars && g._trackBrokenChars.push(B), E;
        }, Ci.set(n, g);
      }
      this.defaultFont || (this.defaultFont = g);
      let u = `${r.toLowerCase()}_${o}`;
      this.fonts.has(u) || this.fonts.set(u, []), this.fonts.get(u).push([g, t.weight, t.style]);
    }
  }
  getEngine(e = 16, t = "normal", { fontFamily: r = "sans-serif", fontWeight: n = 400, fontStyle: i = "normal" }, o) {
    if (!this.fonts.size) throw new Error("No fonts are loaded. At least one font is required to calculate the layout.");
    r = (Array.isArray(r) ? r : [r]).map((x) => x.toLowerCase());
    let g = [];
    r.forEach((x) => {
      let k = this.get({ name: x, weight: n, style: i });
      if (k) {
        g.push(k);
        return;
      }
      let F = this.get({ name: x + "_unknown", weight: n, style: i });
      if (F) {
        g.push(F);
        return;
      }
    });
    let u = Array.from(this.fonts.keys()), c = [], B = [], E = [];
    for (let x of u) if (!r.includes(x)) if (o) {
      let k = bl(x);
      k ? k === o ? c.push(this.get({ name: x, weight: n, style: i })) : B.push(this.get({ name: x, weight: n, style: i })) : E.push(this.get({ name: x, weight: n, style: i }));
    } else E.push(this.get({ name: x, weight: n, style: i }));
    let d = /* @__PURE__ */ new Map(), C = (x, k = true) => {
      let F = [...g, ...E, ...c, ...k ? B : []];
      if (typeof x > "u") return k ? F[F.length - 1] : void 0;
      let G = x.charCodeAt(0);
      if (d.has(G)) return d.get(G);
      let J = F.find((q, lA) => !!q.charToGlyphIndex(x) || k && lA === F.length - 1);
      return J && d.set(G, J), J;
    }, m = (x, k = false) => {
      var G, J;
      return ((k ? (J = (G = x.tables) == null ? void 0 : G.os2) == null ? void 0 : J.sTypoAscender : 0) || x.ascender) / x.unitsPerEm * e;
    }, D = (x, k = false) => {
      var G, J;
      return ((k ? (J = (G = x.tables) == null ? void 0 : G.os2) == null ? void 0 : J.sTypoDescender : 0) || x.descender) / x.unitsPerEm * e;
    }, S = (x, k = false) => {
      var F, G;
      if (typeof t == "string" && t === "normal") {
        let J = (k ? (G = (F = x.tables) == null ? void 0 : F.os2) == null ? void 0 : G.sTypoLineGap : 0) || 0;
        return m(x, k) - D(x, k) + J / x.unitsPerEm * e;
      } else if (typeof t == "number") return e * t;
    }, b = (x) => C(x, false);
    return { has: (x) => {
      if (x === `
`) return true;
      let k = b(x);
      return k ? (k._trackBrokenChars = [], k.stringToGlyphs(x), k._trackBrokenChars.length ? (k._trackBrokenChars = void 0, false) : true) : false;
    }, baseline: (x, k = typeof x > "u" ? g[0] : C(x)) => {
      let F = m(k), G = D(k), J = F - G;
      return F + (S(k) - J) / 2;
    }, height: (x, k = typeof x > "u" ? g[0] : C(x)) => S(k), measure: (x, k) => this.measure(C, x, k), getSVG: (x, k) => this.getSVG(C, x, k) };
  }
  patchFontFallbackResolver(e, t) {
    let r = [];
    e._trackBrokenChars = r;
    let n = e.stringToGlyphs;
    return e.stringToGlyphs = (i, ...o) => {
      let g = n.call(e, i, ...o);
      for (let u = 0; u < g.length; u++) if (g[u].unicode === void 0) {
        let c = r.shift(), B = t(c);
        if (B !== e) {
          let E = B.charToGlyph(c), d = e.unitsPerEm / B.unitsPerEm, C = new opentype.Path();
          C.unitsPerEm = e.unitsPerEm, C.commands = E.path.commands.map((D) => {
            let S = { ...D };
            for (let b in S) typeof S[b] == "number" && (S[b] *= d);
            return S;
          });
          let m = new opentype.Glyph({ ...E, advanceWidth: E.advanceWidth * d, xMin: E.xMin * d, xMax: E.xMax * d, yMin: E.yMin * d, yMax: E.yMax * d, path: C });
          g[u] = m;
        }
      }
      return g;
    }, () => {
      e.stringToGlyphs = n, e._trackBrokenChars = void 0;
    };
  }
  measure(e, t, { fontSize: r, letterSpacing: n = 0 }) {
    let i = e(t), o = this.patchFontFallbackResolver(i, e);
    try {
      return i.getAdvanceWidth(t, r, { letterSpacing: n / r });
    } finally {
      o();
    }
  }
  getSVG(e, t, { fontSize: r, top: n, left: i, letterSpacing: o = 0 }) {
    let g = e(t), u = this.patchFontFallbackResolver(g, e);
    try {
      if (r === 0) return "";
      let c = new opentype.Path(), B = { letterSpacing: o / r }, E = /* @__PURE__ */ new WeakMap();
      return g.forEachGlyph(t.replace(/\n/g, ""), i, n, r, B, function(d, C, m, D) {
        let S;
        if (!E.has(d)) S = d.getPath(C, m, D, B), E.set(d, [C, m, S]);
        else {
          let [b, L, x] = E.get(d);
          S = new opentype.Path(), S.commands = x.commands.map((k) => {
            let F = { ...k };
            for (let G in F) typeof F[G] == "number" && ((G === "x" || G === "x1" || G === "x2") && (F[G] += C - b), (G === "y" || G === "y1" || G === "y2") && (F[G] += m - L));
            return F;
          });
        }
        c.extend(S);
      }), c.toPathData(1);
    } finally {
      u();
    }
  }
};
function bl(A) {
  let e = A.split("_"), t = e[e.length - 1];
  return t === da ? void 0 : t;
}
function di({ width: A, height: e, content: t }) {
  return H("svg", { width: A, height: e, viewBox: `0 0 ${A} ${e}`, xmlns: "http://www.w3.org/2000/svg" }, t);
}
var ju = sI(bu());
var EC = ["ios", "android", "windows", "macos", "web"];
function xu(A) {
  return EC.includes(A);
}
var QC = ["portrait", "landscape"];
function Nu(A) {
  return QC.includes(A);
}
var Ru;
(function(A) {
  A.fontSize = "fontSize", A.lineHeight = "lineHeight";
})(Ru || (Ru = {}));
var BA;
(function(A) {
  A.rem = "rem", A.em = "em", A.px = "px", A.percent = "%", A.vw = "vw", A.vh = "vh", A.none = "<no-css-unit>";
})(BA || (BA = {}));
function Yo(A) {
  return typeof A == "string";
}
function qo(A) {
  return typeof A == "object";
}
var Xo;
function R(A) {
  return { kind: "complete", style: A };
}
function qA(A, e = {}) {
  let { fractions: t } = e;
  if (t && A.includes("/")) {
    let [i = "", o = ""] = A.split("/", 2), g = qA(i), u = qA(o);
    return !g || !u ? null : [g[0] / u[0], u[1]];
  }
  let r = parseFloat(A);
  if (Number.isNaN(r)) return null;
  let n = A.match(/(([a-z]{2,}|%))$/);
  if (!n) return [r, BA.none];
  switch (n == null ? void 0 : n[1]) {
    case "rem":
      return [r, BA.rem];
    case "px":
      return [r, BA.px];
    case "em":
      return [r, BA.em];
    case "%":
      return [r, BA.percent];
    case "vw":
      return [r, BA.vw];
    case "vh":
      return [r, BA.vh];
    default:
      return null;
  }
}
function Xe(A, e, t = {}) {
  let r = Le(e, t);
  return r === null ? null : R({ [A]: r });
}
function pn(A, e, t) {
  let r = Le(e);
  return r !== null && (t[A] = r), t;
}
function Mu(A, e) {
  let t = Le(e);
  return t === null ? null : { [A]: t };
}
function Le(A, e = {}) {
  if (A === void 0) return null;
  let t = qA(String(A), e);
  return t ? it(...t, e) : null;
}
function it(A, e, t = {}) {
  let { isNegative: r, device: n } = t;
  switch (e) {
    case BA.rem:
      return A * 16 * (r ? -1 : 1);
    case BA.px:
      return A * (r ? -1 : 1);
    case BA.percent:
      return `${r ? "-" : ""}${A}%`;
    case BA.none:
      return A * (r ? -1 : 1);
    case BA.vw:
      return n != null && n.windowDimensions ? n.windowDimensions.width * (A / 100) : (se("`vw` CSS unit requires configuration with `useDeviceContext()`"), null);
    case BA.vh:
      return n != null && n.windowDimensions ? n.windowDimensions.height * (A / 100) : (se("`vh` CSS unit requires configuration with `useDeviceContext()`"), null);
    default:
      return null;
  }
}
function Vo(A) {
  let e = qA(A);
  if (!e) return null;
  let [t, r] = e;
  switch (r) {
    case BA.rem:
      return t * 16;
    case BA.px:
      return t;
    default:
      return null;
  }
}
var CC = { t: "Top", tr: "TopRight", tl: "TopLeft", b: "Bottom", br: "BottomRight", bl: "BottomLeft", l: "Left", r: "Right", x: "Horizontal", y: "Vertical" };
function zo(A) {
  return CC[A ?? ""] || "All";
}
function Zo(A) {
  let e = "All";
  return [A.replace(/^-(t|b|r|l|tr|tl|br|bl)(-|$)/, (r, n) => (e = zo(n), "")), e];
}
function Bt(A, e = {}) {
  if (A.includes("/")) {
    let t = Fu(A, { ...e, fractions: true });
    if (t) return t;
  }
  return A[0] === "[" && (A = A.slice(1, -1)), Fu(A, e);
}
function pe(A, e, t = {}) {
  let r = Bt(e, t);
  return r === null ? null : R({ [A]: r });
}
function Fu(A, e = {}) {
  if (A === "px") return 1;
  let t = qA(A, e);
  if (!t) return null;
  let [r, n] = t;
  return e.fractions && (n = BA.percent, r *= 100), n === BA.none && (r = r / 4, n = BA.rem), it(r, n, e);
}
function dC(...A) {
  console.warn(...A);
}
function hC(...A) {
}
var se = typeof process > "u" || ((Xo = process == null ? void 0 : process.env) === null || Xo === void 0 ? void 0 : Xo.JEST_WORKER_ID) === void 0 ? dC : hC;
var pC = [["aspect-square", R({ aspectRatio: 1 })], ["aspect-video", R({ aspectRatio: 16 / 9 })], ["items-center", R({ alignItems: "center" })], ["items-start", R({ alignItems: "flex-start" })], ["items-end", R({ alignItems: "flex-end" })], ["items-baseline", R({ alignItems: "baseline" })], ["items-stretch", R({ alignItems: "stretch" })], ["justify-start", R({ justifyContent: "flex-start" })], ["justify-end", R({ justifyContent: "flex-end" })], ["justify-center", R({ justifyContent: "center" })], ["justify-between", R({ justifyContent: "space-between" })], ["justify-around", R({ justifyContent: "space-around" })], ["justify-evenly", R({ justifyContent: "space-evenly" })], ["content-start", R({ alignContent: "flex-start" })], ["content-end", R({ alignContent: "flex-end" })], ["content-between", R({ alignContent: "space-between" })], ["content-around", R({ alignContent: "space-around" })], ["content-stretch", R({ alignContent: "stretch" })], ["content-center", R({ alignContent: "center" })], ["self-auto", R({ alignSelf: "auto" })], ["self-start", R({ alignSelf: "flex-start" })], ["self-end", R({ alignSelf: "flex-end" })], ["self-center", R({ alignSelf: "center" })], ["self-stretch", R({ alignSelf: "stretch" })], ["self-baseline", R({ alignSelf: "baseline" })], ["direction-inherit", R({ direction: "inherit" })], ["direction-ltr", R({ direction: "ltr" })], ["direction-rtl", R({ direction: "rtl" })], ["hidden", R({ display: "none" })], ["flex", R({ display: "flex" })], ["flex-row", R({ flexDirection: "row" })], ["flex-row-reverse", R({ flexDirection: "row-reverse" })], ["flex-col", R({ flexDirection: "column" })], ["flex-col-reverse", R({ flexDirection: "column-reverse" })], ["flex-wrap", R({ flexWrap: "wrap" })], ["flex-wrap-reverse", R({ flexWrap: "wrap-reverse" })], ["flex-nowrap", R({ flexWrap: "nowrap" })], ["flex-auto", R({ flexGrow: 1, flexShrink: 1, flexBasis: "auto" })], ["flex-initial", R({ flexGrow: 0, flexShrink: 1, flexBasis: "auto" })], ["flex-none", R({ flexGrow: 0, flexShrink: 0, flexBasis: "auto" })], ["overflow-hidden", R({ overflow: "hidden" })], ["overflow-visible", R({ overflow: "visible" })], ["overflow-scroll", R({ overflow: "scroll" })], ["absolute", R({ position: "absolute" })], ["relative", R({ position: "relative" })], ["italic", R({ fontStyle: "italic" })], ["not-italic", R({ fontStyle: "normal" })], ["oldstyle-nums", br("oldstyle-nums")], ["small-caps", br("small-caps")], ["lining-nums", br("lining-nums")], ["tabular-nums", br("tabular-nums")], ["proportional-nums", br("proportional-nums")], ["font-thin", R({ fontWeight: "100" })], ["font-100", R({ fontWeight: "100" })], ["font-extralight", R({ fontWeight: "200" })], ["font-200", R({ fontWeight: "200" })], ["font-light", R({ fontWeight: "300" })], ["font-300", R({ fontWeight: "300" })], ["font-normal", R({ fontWeight: "normal" })], ["font-400", R({ fontWeight: "400" })], ["font-medium", R({ fontWeight: "500" })], ["font-500", R({ fontWeight: "500" })], ["font-semibold", R({ fontWeight: "600" })], ["font-600", R({ fontWeight: "600" })], ["font-bold", R({ fontWeight: "bold" })], ["font-700", R({ fontWeight: "700" })], ["font-extrabold", R({ fontWeight: "800" })], ["font-800", R({ fontWeight: "800" })], ["font-black", R({ fontWeight: "900" })], ["font-900", R({ fontWeight: "900" })], ["include-font-padding", R({ includeFontPadding: true })], ["remove-font-padding", R({ includeFontPadding: false })], ["max-w-none", R({ maxWidth: "99999%" })], ["text-left", R({ textAlign: "left" })], ["text-center", R({ textAlign: "center" })], ["text-right", R({ textAlign: "right" })], ["text-justify", R({ textAlign: "justify" })], ["text-auto", R({ textAlign: "auto" })], ["underline", R({ textDecorationLine: "underline" })], ["line-through", R({ textDecorationLine: "line-through" })], ["no-underline", R({ textDecorationLine: "none" })], ["uppercase", R({ textTransform: "uppercase" })], ["lowercase", R({ textTransform: "lowercase" })], ["capitalize", R({ textTransform: "capitalize" })], ["normal-case", R({ textTransform: "none" })], ["w-auto", R({ width: "auto" })], ["h-auto", R({ height: "auto" })], ["shadow-sm", R({ shadowOffset: { width: 1, height: 1 }, shadowColor: "#000", shadowRadius: 1, shadowOpacity: 0.025, elevation: 1 })], ["shadow", R({ shadowOffset: { width: 1, height: 1 }, shadowColor: "#000", shadowRadius: 1, shadowOpacity: 0.075, elevation: 2 })], ["shadow-md", R({ shadowOffset: { width: 1, height: 1 }, shadowColor: "#000", shadowRadius: 3, shadowOpacity: 0.125, elevation: 3 })], ["shadow-lg", R({ shadowOffset: { width: 1, height: 1 }, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 })], ["shadow-xl", R({ shadowOffset: { width: 1, height: 1 }, shadowColor: "#000", shadowOpacity: 0.19, shadowRadius: 20, elevation: 12 })], ["shadow-2xl", R({ shadowOffset: { width: 1, height: 1 }, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 30, elevation: 16 })], ["shadow-none", R({ shadowOffset: { width: 0, height: 0 }, shadowColor: "#000", shadowRadius: 0, shadowOpacity: 0, elevation: 0 })]], jo = pC;
function br(A) {
  return { kind: "dependent", complete(e) {
    (!e.fontVariant || !Array.isArray(e.fontVariant)) && (e.fontVariant = []), e.fontVariant.push(A);
  } };
}
var Rr = class {
  constructor(e) {
    this.ir = new Map(jo), this.styles = /* @__PURE__ */ new Map(), this.prefixes = /* @__PURE__ */ new Map(), this.ir = new Map([...jo, ...e ?? []]);
  }
  getStyle(e) {
    return this.styles.get(e);
  }
  setStyle(e, t) {
    this.styles.set(e, t);
  }
  getIr(e) {
    return this.ir.get(e);
  }
  setIr(e, t) {
    this.ir.set(e, t);
  }
  getPrefixMatch(e) {
    return this.prefixes.get(e);
  }
  setPrefixMatch(e, t) {
    this.prefixes.set(e, t);
  }
};
function $o(A, e, t = {}) {
  let r = e == null ? void 0 : e[A];
  if (!r) return pe("fontSize", A, t);
  if (typeof r == "string") return Xe("fontSize", r);
  let n = {}, [i, o] = r, g = Mu("fontSize", i);
  if (g && (n = g), typeof o == "string") return R(pn("lineHeight", Lu(o, n), n));
  let { lineHeight: u, letterSpacing: c } = o;
  return u && pn("lineHeight", Lu(u, n), n), c && pn("letterSpacing", c, n), R(n);
}
function Lu(A, e) {
  let t = qA(A);
  if (t) {
    let [r, n] = t;
    if ((n === BA.none || n === BA.em) && typeof e.fontSize == "number") return e.fontSize * r;
  }
  return A;
}
function As(A, e) {
  var t;
  let r = (t = e == null ? void 0 : e[A]) !== null && t !== void 0 ? t : A.startsWith("[") ? A.slice(1, -1) : A, n = qA(r);
  if (!n) return null;
  let [i, o] = n;
  if (o === BA.none) return { kind: "dependent", complete(u) {
    if (typeof u.fontSize != "number") return "relative line-height utilities require that font-size be set";
    u.lineHeight = u.fontSize * i;
  } };
  let g = it(i, o);
  return g !== null ? R({ lineHeight: g }) : null;
}
function es(A, e, t, r, n) {
  let i = "";
  if (r[0] === "[") i = r.slice(1, -1);
  else {
    let c = n == null ? void 0 : n[r];
    if (c) i = c;
    else {
      let B = Bt(r);
      return B && typeof B == "number" ? Gu(B, BA.px, e, A) : null;
    }
  }
  if (i === "auto") return Uu(e, A, "auto");
  let o = qA(i);
  if (!o) return null;
  let [g, u] = o;
  return t && (g = -g), Gu(g, u, e, A);
}
function Gu(A, e, t, r) {
  let n = it(A, e);
  return n === null ? null : Uu(t, r, n);
}
function Uu(A, e, t) {
  switch (A) {
    case "All":
      return { kind: "complete", style: { [`${e}Top`]: t, [`${e}Right`]: t, [`${e}Bottom`]: t, [`${e}Left`]: t } };
    case "Bottom":
    case "Top":
    case "Left":
    case "Right":
      return { kind: "complete", style: { [`${e}${A}`]: t } };
    case "Vertical":
      return { kind: "complete", style: { [`${e}Top`]: t, [`${e}Bottom`]: t } };
    case "Horizontal":
      return { kind: "complete", style: { [`${e}Left`]: t, [`${e}Right`]: t } };
    default:
      return null;
  }
}
function ts(A) {
  if (!A) return {};
  let e = Object.entries(A).reduce((n, [i, o]) => {
    let g = [0, 1 / 0, 0], u = typeof o == "string" ? { min: o } : o, c = u.min ? Vo(u.min) : 0;
    c === null ? se(`invalid screen config value: ${i}->min: ${u.min}`) : g[0] = c;
    let B = u.max ? Vo(u.max) : 1 / 0;
    return B === null ? se(`invalid screen config value: ${i}->max: ${u.max}`) : g[1] = B, n[i] = g, n;
  }, {}), t = Object.values(e);
  t.sort((n, i) => {
    let [o, g] = n, [u, c] = i;
    return g === 1 / 0 || c === 1 / 0 ? o - u : g - c;
  });
  let r = 0;
  return t.forEach((n) => n[2] = r++), e;
}
function rs(A, e) {
  let t = e == null ? void 0 : e[A];
  if (!t) return null;
  if (typeof t == "string") return R({ fontFamily: t });
  let r = t[0];
  return r ? R({ fontFamily: r }) : null;
}
function ft(A, e, t) {
  if (!t) return null;
  let r;
  e.includes("/") && ([e = "", r] = e.split("/", 2));
  let n = "";
  if (e.startsWith("[#") || e.startsWith("[rgb") ? n = e.slice(1, -1) : n = Tu(e, t), !n) return null;
  if (r) {
    let i = Number(r);
    if (!Number.isNaN(i)) return n = Hu(n, i / 100), R({ [mn[A].color]: n });
  }
  return { kind: "dependent", complete(i) {
    let o = mn[A].opacity, g = i[o];
    typeof g == "number" && (n = Hu(n, g)), i[mn[A].color] = n;
  } };
}
function xr(A, e) {
  let t = parseInt(e, 10);
  if (Number.isNaN(t)) return null;
  let r = t / 100;
  return { kind: "complete", style: { [mn[A].opacity]: r } };
}
function Hu(A, e) {
  return A.startsWith("#") ? A = mC(A) : A.startsWith("rgb(") && (A = A.replace(/^rgb\(/, "rgba(").replace(/\)$/, ", 1)")), A.replace(/, ?\d*\.?(\d+)\)$/, `, ${e})`);
}
function Ou(A) {
  for (let e in A) e.startsWith("__opacity_") && delete A[e];
}
var mn = { bg: { opacity: "__opacity_bg", color: "backgroundColor" }, text: { opacity: "__opacity_text", color: "color" }, border: { opacity: "__opacity_border", color: "borderColor" }, borderTop: { opacity: "__opacity_border", color: "borderTopColor" }, borderBottom: { opacity: "__opacity_border", color: "borderBottomColor" }, borderLeft: { opacity: "__opacity_border", color: "borderLeftColor" }, borderRight: { opacity: "__opacity_border", color: "borderRightColor" }, shadow: { opacity: "__opacity_shadow", color: "shadowColor" }, tint: { opacity: "__opacity_tint", color: "tintColor" } };
function mC(A) {
  let e = A;
  A = A.replace(yC, (o, g, u, c) => g + g + u + u + c + c);
  let t = wC.exec(A);
  if (!t) return se(`invalid config hex color value: ${e}`), "rgba(0, 0, 0, 1)";
  let r = parseInt(t[1], 16), n = parseInt(t[2], 16), i = parseInt(t[3], 16);
  return `rgba(${r}, ${n}, ${i}, 1)`;
}
function Tu(A, e) {
  let t = e[A];
  if (Yo(t)) return t;
  if (qo(t) && Yo(t.DEFAULT)) return t.DEFAULT;
  let [r = "", ...n] = A.split("-");
  for (; r !== A; ) {
    let i = e[r];
    if (qo(i)) return Tu(n.join("-"), i);
    if (n.length === 0) return "";
    r = `${r}-${n.shift()}`;
  }
  return "";
}
var yC = /^#?([a-f\d])([a-f\d])([a-f\d])$/i, wC = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
function _u(A, e) {
  let [t, r] = Zo(A);
  if (t.match(/^(-?(\d)+)?$/)) return DC(t, r, e == null ? void 0 : e.borderWidth);
  if (t = t.replace(/^-/, ""), ["dashed", "solid", "dotted"].includes(t)) return R({ borderStyle: t });
  let i = "border";
  switch (r) {
    case "Bottom":
      i = "borderBottom";
      break;
    case "Top":
      i = "borderTop";
      break;
    case "Left":
      i = "borderLeft";
      break;
    case "Right":
      i = "borderRight";
      break;
  }
  let o = ft(i, t, e == null ? void 0 : e.borderColor);
  if (o) return o;
  let g = `border${r === "All" ? "" : r}Width`;
  t = t.replace(/^-/, "");
  let u = t.slice(1, -1), c = pe(g, u);
  return typeof (c == null ? void 0 : c.style[g]) != "number" ? null : c;
}
function DC(A, e, t) {
  if (!t) return null;
  A = A.replace(/^-/, "");
  let n = t[A === "" ? "DEFAULT" : A];
  if (n === void 0) return null;
  let i = `border${e === "All" ? "" : e}Width`;
  return Xe(i, n);
}
function Ju(A, e) {
  if (!e) return null;
  let [t, r] = Zo(A);
  t = t.replace(/^-/, ""), t === "" && (t = "DEFAULT");
  let n = `border${r === "All" ? "" : r}Radius`, i = e[t];
  if (i) return Pu(Xe(n, i));
  let o = pe(n, t);
  return typeof (o == null ? void 0 : o.style[n]) != "number" ? null : Pu(o);
}
function Pu(A) {
  if ((A == null ? void 0 : A.kind) !== "complete") return A;
  let e = A.style.borderTopRadius;
  e !== void 0 && (A.style.borderTopLeftRadius = e, A.style.borderTopRightRadius = e, delete A.style.borderTopRadius);
  let t = A.style.borderBottomRadius;
  t !== void 0 && (A.style.borderBottomLeftRadius = t, A.style.borderBottomRightRadius = t, delete A.style.borderBottomRadius);
  let r = A.style.borderLeftRadius;
  r !== void 0 && (A.style.borderBottomLeftRadius = r, A.style.borderTopLeftRadius = r, delete A.style.borderLeftRadius);
  let n = A.style.borderRightRadius;
  return n !== void 0 && (A.style.borderBottomRightRadius = n, A.style.borderTopRightRadius = n, delete A.style.borderRightRadius), A;
}
function xt(A, e, t, r) {
  let n = null;
  A === "inset" && (e = e.replace(/^(x|y)-/, (g, u) => (n = u === "x" ? "x" : "y", "")));
  let i = r == null ? void 0 : r[e];
  if (i) {
    let g = Le(i, { isNegative: t });
    if (g !== null) return Wu(A, n, g);
  }
  let o = Bt(e, { isNegative: t });
  return o !== null ? Wu(A, n, o) : null;
}
function Wu(A, e, t) {
  if (A !== "inset") return R({ [A]: t });
  switch (e) {
    case null:
      return R({ top: t, left: t, right: t, bottom: t });
    case "y":
      return R({ top: t, bottom: t });
    case "x":
      return R({ left: t, right: t });
  }
}
function Nr(A, e, t) {
  var r;
  e = e.replace(/^-/, "");
  let n = e === "" ? "DEFAULT" : e, i = Number((r = t == null ? void 0 : t[n]) !== null && r !== void 0 ? r : e);
  return Number.isNaN(i) ? null : R({ [`flex${A}`]: i });
}
function Ku(A, e) {
  var t, r;
  if (A = (e == null ? void 0 : e[A]) || A, ["min-content", "revert", "unset"].includes(A)) return null;
  if (A.match(/^\d+(\.\d+)?$/)) return R({ flexGrow: Number(A), flexBasis: "0%" });
  let n = A.match(/^(\d+)\s+(\d+)$/);
  if (n) return R({ flexGrow: Number(n[1]), flexShrink: Number(n[2]) });
  if (n = A.match(/^(\d+)\s+([^ ]+)$/), n) {
    let i = Le((t = n[2]) !== null && t !== void 0 ? t : "");
    return i ? R({ flexGrow: Number(n[1]), flexBasis: i }) : null;
  }
  if (n = A.match(/^(\d+)\s+(\d+)\s+(.+)$/), n) {
    let i = Le((r = n[3]) !== null && r !== void 0 ? r : "");
    return i ? R({ flexGrow: Number(n[1]), flexShrink: Number(n[2]), flexBasis: i }) : null;
  }
  return null;
}
function ns(A, e, t = {}, r) {
  let n = r == null ? void 0 : r[e];
  return n !== void 0 ? Xe(A, n, t) : pe(A, e, t);
}
function Fr(A, e, t = {}, r) {
  let n = Le(r == null ? void 0 : r[e], t);
  return n ? R({ [A]: n }) : (e === "screen" && (e = A.includes("Width") ? "100vw" : "100vh"), pe(A, e, t));
}
function Yu(A, e, t) {
  let r = t == null ? void 0 : t[A];
  if (r) {
    let n = qA(r, { });
    if (!n) return null;
    let [i, o] = n;
    if (o === BA.em) return SC(i);
    if (o === BA.percent) return se("percentage-based letter-spacing configuration currently unsupported, switch to `em`s, or open an issue if you'd like to see support added."), null;
    let g = it(i, o, { isNegative: e });
    return g !== null ? R({ letterSpacing: g }) : null;
  }
  return pe("letterSpacing", A, { isNegative: e });
}
function SC(A) {
  return { kind: "dependent", complete(e) {
    let t = e.fontSize;
    if (typeof t != "number" || Number.isNaN(t)) return "tracking-X relative letter spacing classes require font-size to be set";
    e.letterSpacing = Math.round((A * t + Number.EPSILON) * 100) / 100;
  } };
}
function qu(A, e) {
  let t = e == null ? void 0 : e[A];
  if (t) {
    let n = qA(String(t));
    if (n) return R({ opacity: n[0] });
  }
  let r = qA(A);
  return r ? R({ opacity: r[0] / 100 }) : null;
}
function Xu(A) {
  let e = parseInt(A, 10);
  return Number.isNaN(e) ? null : { kind: "complete", style: { shadowOpacity: e / 100 } };
}
function Vu(A) {
  if (A.includes("/")) {
    let [t = "", r = ""] = A.split("/", 2), n = is(t), i = is(r);
    return n === null || i === null ? null : { kind: "complete", style: { shadowOffset: { width: n, height: i } } };
  }
  let e = is(A);
  return e === null ? null : { kind: "complete", style: { shadowOffset: { width: e, height: e } } };
}
function is(A) {
  let e = Bt(A);
  return typeof e == "number" ? e : null;
}
var Nt = class {
  constructor(e, t = {}, r, n, i) {
    var o, g, u, c, B, E;
    this.config = t, this.cache = r, this.position = 0, this.isNull = false, this.isNegative = false, this.context = {}, this.context.device = n;
    let d = e.trim().split(":"), C = [];
    d.length === 1 ? this.string = e : (this.string = (o = d.pop()) !== null && o !== void 0 ? o : "", C = d), this.char = this.string[0];
    let m = ts((g = this.config.theme) === null || g === void 0 ? void 0 : g.screens);
    for (let D of C) if (m[D]) {
      let S = (u = m[D]) === null || u === void 0 ? void 0 : u[2];
      S !== void 0 && (this.order = ((c = this.order) !== null && c !== void 0 ? c : 0) + S);
      let b = (B = n.windowDimensions) === null || B === void 0 ? void 0 : B.width;
      if (b) {
        let [L, x] = (E = m[D]) !== null && E !== void 0 ? E : [0, 0];
        (b <= L || b > x) && (this.isNull = true);
      } else this.isNull = true;
    } else xu(D) ? this.isNull = D !== i : Nu(D) ? n.windowDimensions ? (n.windowDimensions.width > n.windowDimensions.height ? "landscape" : "portrait") !== D ? this.isNull = true : this.incrementOrder() : this.isNull = true : D === "retina" ? n.pixelDensity === 2 ? this.incrementOrder() : this.isNull = true : D === "dark" ? n.colorScheme !== "dark" ? this.isNull = true : this.incrementOrder() : this.handlePossibleArbitraryBreakpointPrefix(D) || (this.isNull = true);
  }
  parse() {
    if (this.isNull) return { kind: "null" };
    let e = this.cache.getIr(this.rest);
    if (e) return e;
    this.parseIsNegative();
    let t = this.parseUtility();
    return t ? this.order !== void 0 ? { kind: "ordered", order: this.order, styleIr: t } : t : { kind: "null" };
  }
  parseUtility() {
    var e, t, r, n, i;
    let o = this.config.theme, g = null;
    switch (this.char) {
      case "m":
      case "p": {
        let u = this.peekSlice(1, 3).match(/^(t|b|r|l|x|y)?-/);
        if (u) {
          let c = this.char === "m" ? "margin" : "padding";
          this.advance(((t = (e = u[0]) === null || e === void 0 ? void 0 : e.length) !== null && t !== void 0 ? t : 0) + 1);
          let B = zo(u[1]), E = es(c, B, this.isNegative, this.rest, (r = this.config.theme) === null || r === void 0 ? void 0 : r[c]);
          if (E) return E;
        }
      }
    }
    if (this.consumePeeked("h-") && (g = ns("height", this.rest, this.context, o == null ? void 0 : o.height), g) || this.consumePeeked("w-") && (g = ns("width", this.rest, this.context, o == null ? void 0 : o.width), g) || this.consumePeeked("min-w-") && (g = Fr("minWidth", this.rest, this.context, o == null ? void 0 : o.minWidth), g) || this.consumePeeked("min-h-") && (g = Fr("minHeight", this.rest, this.context, o == null ? void 0 : o.minHeight), g) || this.consumePeeked("max-w-") && (g = Fr("maxWidth", this.rest, this.context, o == null ? void 0 : o.maxWidth), g) || this.consumePeeked("max-h-") && (g = Fr("maxHeight", this.rest, this.context, o == null ? void 0 : o.maxHeight), g) || this.consumePeeked("leading-") && (g = As(this.rest, o == null ? void 0 : o.lineHeight), g) || this.consumePeeked("text-") && (g = $o(this.rest, o == null ? void 0 : o.fontSize, this.context), g || (g = ft("text", this.rest, o == null ? void 0 : o.textColor), g) || this.consumePeeked("opacity-") && (g = xr("text", this.rest), g)) || this.consumePeeked("font-") && (g = rs(this.rest, o == null ? void 0 : o.fontFamily), g) || this.consumePeeked("aspect-") && (this.consumePeeked("ratio-") && se("`aspect-ratio-{ratio}` is deprecated, use `aspect-{ratio}` instead"), g = Xe("aspectRatio", this.rest, { fractions: true }), g) || this.consumePeeked("tint-") && (g = ft("tint", this.rest, o == null ? void 0 : o.colors), g) || this.consumePeeked("bg-") && (g = ft("bg", this.rest, o == null ? void 0 : o.backgroundColor), g || this.consumePeeked("opacity-") && (g = xr("bg", this.rest), g)) || this.consumePeeked("border") && (g = _u(this.rest, o), g || this.consumePeeked("-opacity-") && (g = xr("border", this.rest), g)) || this.consumePeeked("rounded") && (g = Ju(this.rest, o == null ? void 0 : o.borderRadius), g) || this.consumePeeked("bottom-") && (g = xt("bottom", this.rest, this.isNegative, o == null ? void 0 : o.inset), g) || this.consumePeeked("top-") && (g = xt("top", this.rest, this.isNegative, o == null ? void 0 : o.inset), g) || this.consumePeeked("left-") && (g = xt("left", this.rest, this.isNegative, o == null ? void 0 : o.inset), g) || this.consumePeeked("right-") && (g = xt("right", this.rest, this.isNegative, o == null ? void 0 : o.inset), g) || this.consumePeeked("inset-") && (g = xt("inset", this.rest, this.isNegative, o == null ? void 0 : o.inset), g) || this.consumePeeked("flex-") && (this.consumePeeked("grow") ? g = Nr("Grow", this.rest, o == null ? void 0 : o.flexGrow) : this.consumePeeked("shrink") ? g = Nr("Shrink", this.rest, o == null ? void 0 : o.flexShrink) : g = Ku(this.rest, o == null ? void 0 : o.flex), g) || this.consumePeeked("grow") && (g = Nr("Grow", this.rest, o == null ? void 0 : o.flexGrow), g) || this.consumePeeked("shrink") && (g = Nr("Shrink", this.rest, o == null ? void 0 : o.flexShrink), g) || this.consumePeeked("shadow-color-opacity-") && (g = xr("shadow", this.rest), g) || this.consumePeeked("shadow-opacity-") && (g = Xu(this.rest), g) || this.consumePeeked("shadow-offset-") && (g = Vu(this.rest), g) || this.consumePeeked("shadow-radius-") && (g = pe("shadowRadius", this.rest), g) || this.consumePeeked("shadow-") && (g = ft("shadow", this.rest, o == null ? void 0 : o.colors), g)) return g;
    if (this.consumePeeked("elevation-")) {
      let u = parseInt(this.rest, 10);
      if (!Number.isNaN(u)) return R({ elevation: u });
    }
    if (this.consumePeeked("opacity-") && (g = qu(this.rest, o == null ? void 0 : o.opacity), g) || this.consumePeeked("tracking-") && (g = Yu(this.rest, this.isNegative, o == null ? void 0 : o.letterSpacing), g)) return g;
    if (this.consumePeeked("z-")) {
      let u = Number((i = (n = o == null ? void 0 : o.zIndex) === null || n === void 0 ? void 0 : n[this.rest]) !== null && i !== void 0 ? i : this.rest);
      if (!Number.isNaN(u)) return R({ zIndex: u });
    }
    return se(`\`${this.rest}\` unknown or invalid utility`), null;
  }
  handlePossibleArbitraryBreakpointPrefix(e) {
    var t;
    if (e[0] !== "m") return false;
    let r = e.match(/^(min|max)-(w|h)-\[([^\]]+)\]$/);
    if (!r) return false;
    if (!(!((t = this.context.device) === null || t === void 0) && t.windowDimensions)) return this.isNull = true, true;
    let n = this.context.device.windowDimensions, [, i = "", o = "", g = ""] = r, u = o === "w" ? n.width : n.height, c = qA(g, this.context);
    if (c === null) return this.isNull = true, true;
    let [B, E] = c;
    return E !== "px" && (this.isNull = true), (i === "min" ? u >= B : u <= B) ? this.incrementOrder() : this.isNull = true, true;
  }
  advance(e = 1) {
    this.position += e, this.char = this.string[this.position];
  }
  get rest() {
    return this.peekSlice(0, this.string.length);
  }
  peekSlice(e, t) {
    return this.string.slice(this.position + e, this.position + t);
  }
  consumePeeked(e) {
    return this.peekSlice(0, e.length) === e ? (this.advance(e.length), true) : false;
  }
  parseIsNegative() {
    this.char === "-" && (this.advance(), this.isNegative = true, this.context.isNegative = true);
  }
  incrementOrder() {
    var e;
    this.order = ((e = this.order) !== null && e !== void 0 ? e : 0) + 1;
  }
};
function zu(A) {
  let e = [], t = null;
  return A.forEach((r) => {
    if (typeof r == "string") e = [...e, ...os(r)];
    else if (Array.isArray(r)) e = [...e, ...r.flatMap(os)];
    else if (typeof r == "object" && r !== null) for (let [n, i] of Object.entries(r)) typeof i == "boolean" ? e = [...e, ...i ? os(n) : []] : t ? t[n] = i : t = { [n]: i };
  }), [e.filter(Boolean).filter(vC), t];
}
function os(A) {
  return A.trim().split(/\s+/);
}
function vC(A, e, t) {
  return t.indexOf(A) === e;
}
function Zu(A) {
  var e;
  return (e = A == null ? void 0 : A.reduce((t, r) => ({ ...t, ...kC(r.handler) }), {})) !== null && e !== void 0 ? e : {};
}
function kC(A) {
  let e = {};
  return A({ addUtilities: (t) => {
    e = t;
  }, ...bC }), e;
}
function Ge(A) {
  throw new Error(`tailwindcss plugin function argument object prop "${A}" not implemented`);
}
var bC = { addComponents: Ge, addBase: Ge, addVariant: Ge, e: Ge, prefix: Ge, theme: Ge, variants: Ge, config: Ge, corePlugins: Ge, matchUtilities: Ge, postcss: null };
function $u(A, e) {
  let t = (0, ju.default)(RC(A)), r = {}, n = Zu(t.plugins), i = {}, o = Object.entries(n).map(([m, D]) => typeof D == "string" ? (i[m] = D, [m, { kind: "null" }]) : [m, R(D)]).filter(([, m]) => m.kind !== "null");
  function g() {
    return [r.windowDimensions ? `w${r.windowDimensions.width}` : false, r.windowDimensions ? `h${r.windowDimensions.height}` : false, r.fontScale ? `fs${r.fontScale}` : false, r.colorScheme === "dark" ? "dark" : false, r.pixelDensity === 2 ? "retina" : false].filter(Boolean).join("--") || "default";
  }
  let u = g(), c = {};
  function B() {
    let m = c[u];
    if (m) return m;
    let D = new Rr(o);
    return c[u] = D, D;
  }
  function E(...m) {
    let D = B(), S = {}, b = [], L = [], [x, k] = zu(m), F = x.join(" "), G = D.getStyle(F);
    if (G) return { ...G, ...k || {} };
    for (let J of x) {
      let q = D.getIr(J);
      if (!q && J in i) {
        let wA = E(i[J]);
        D.setIr(J, R(wA)), S = { ...S, ...wA };
        continue;
      }
      switch (q = new Nt(J, t, D, r, e).parse(), q.kind) {
        case "complete":
          S = { ...S, ...q.style }, D.setIr(J, q);
          break;
        case "dependent":
          b.push(q);
          break;
        case "ordered":
          L.push(q);
          break;
        case "null":
          D.setIr(J, q);
          break;
      }
    }
    if (L.length > 0) {
      L.sort((J, q) => J.order - q.order);
      for (let J of L) switch (J.styleIr.kind) {
        case "complete":
          S = { ...S, ...J.styleIr.style };
          break;
        case "dependent":
          b.push(J.styleIr);
          break;
      }
    }
    if (b.length > 0) {
      for (let J of b) {
        let q = J.complete(S);
        q && se(q);
      }
      Ou(S);
    }
    return F !== "" && D.setStyle(F, S), k && (S = { ...S, ...k }), S;
  }
  function d(m) {
    let D = E(m.split(/\s+/g).map((S) => S.replace(/^(bg|text|border)-/, "")).map((S) => `bg-${S}`).join(" "));
    return typeof D.backgroundColor == "string" ? D.backgroundColor : void 0;
  }
  let C = (m, ...D) => {
    let S = "";
    return m.forEach((b, L) => {
      var x;
      S += b + ((x = D[L]) !== null && x !== void 0 ? x : "");
    }), E(S);
  };
  return C.style = E, C.color = d, C.prefixMatch = (...m) => {
    let D = m.sort().join(":"), S = B(), b = S.getPrefixMatch(D);
    if (b !== void 0) return b;
    let k = new Nt(`${D}:flex`, t, S, r, e).parse().kind !== "null";
    return S.setPrefixMatch(D, k), k;
  }, C.setWindowDimensions = (m) => {
    r.windowDimensions = m, u = g();
  }, C.setFontScale = (m) => {
    r.fontScale = m, u = g();
  }, C.setPixelDensity = (m) => {
    r.pixelDensity = m, u = g();
  }, C.setColorScheme = (m) => {
    r.colorScheme = m, u = g();
  }, C;
}
function RC(A) {
  return { ...A, content: ["_no_warnings_please"] };
}
var NC = { handler: ({ addUtilities: A }) => {
  A({ "shadow-sm": { boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" }, shadow: { boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)" }, "shadow-md": { boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }, "shadow-lg": { boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" }, "shadow-xl": { boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }, "shadow-2xl": { boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)" }, "shadow-inner": { boxShadow: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)" }, "shadow-none": { boxShadow: "0 0 #0000" } });
} };
function FC(A) {
  return $u({ ...A, plugins: [...(A == null ? void 0 : A.plugins) ?? [], NC] }, "web");
}
var yn;
function ss({ width: A, height: e, config: t }) {
  return yn || (yn = FC(t)), yn.setWindowDimensions({ width: +A, height: +e }), yn;
}
var as = /* @__PURE__ */ new WeakMap();
async function eI(A, e) {
  let t = await $e();
  if (!t || !t.Node) throw new Error("Satori is not initialized: expect `yoga` to be loaded, got " + t);
  e.fonts = e.fonts || [];
  let r;
  as.has(e.fonts) ? r = as.get(e.fonts) : as.set(e.fonts, r = new jt(e.fonts));
  let n = "width" in e ? e.width : void 0, i = "height" in e ? e.height : void 0, o = MC(t, e.pointScaleFactor);
  n && o.setWidth(n), i && o.setHeight(i), o.setFlexDirection(t.FLEX_DIRECTION_ROW), o.setFlexWrap(t.WRAP_WRAP), o.setAlignContent(t.ALIGN_AUTO), o.setAlignItems(t.ALIGN_FLEX_START), o.setJustifyContent(t.JUSTIFY_FLEX_START), o.setOverflow(t.OVERFLOW_HIDDEN);
  let g = { ...e.graphemeImages }, u = /* @__PURE__ */ new Set();
  Fe.clear(), Jt.clear(), await Os(A);
  let c = zt(A, { id: "id", parentStyle: {}, inheritedStyle: { fontSize: 16, fontWeight: "normal", fontFamily: "serif", fontStyle: "normal", lineHeight: "normal", color: "black", opacity: 1, whiteSpace: "normal", _viewportWidth: n, _viewportHeight: i }, parent: o, font: r, embedFont: e.embedFont, debug: e.debug, graphemeImages: g, canLoadAdditionalAssets: !!e.loadAdditionalAsset, onNodeDetected: e.onNodeDetected, getTwStyles: (m, D) => {
    let b = { ...ss({ width: n, height: i, config: e.tailwindConfig })([m]) };
    return typeof b.lineHeight == "number" && (b.lineHeight = b.lineHeight / (+b.fontSize || D.fontSize || 16)), b.shadowColor && b.boxShadow && (b.boxShadow = b.boxShadow.replace(/rgba?\([^)]+\)/, b.shadowColor)), b;
  } }), B = (await c.next()).value;
  if (e.loadAdditionalAsset && B.length) {
    let m = LC(B), D = [], S = {};
    await Promise.all(Object.entries(m).flatMap(([b, L]) => L.map((x) => {
      let k = `${b}_${x}`;
      return u.has(k) ? null : (u.add(k), e.loadAdditionalAsset(b, x).then((F) => {
        typeof F == "string" ? S[x] = F : F && (Array.isArray(F) ? D.push(...F) : D.push(F));
      }));
    }))), r.addFonts(D), Object.assign(g, S);
  }
  await c.next(), o.calculateLayout(n, i, t.DIRECTION_LTR);
  let E = (await c.next([0, 0])).value, d = o.getComputedWidth(), C = o.getComputedHeight();
  return o.freeRecursive(), di({ width: d, height: C, content: E });
}
function MC(A, e) {
  if (e) {
    let t = A.Config.create();
    return t.setPointScaleFactor(e), A.Node.createWithConfig(t);
  } else return A.Node.create();
}
function LC(A) {
  let e = {}, t = {};
  for (let { word: r, locale: n } of A) {
    let i = Qa(r, n).join("|");
    t[i] = t[i] || "", t[i] += r;
  }
  return Object.keys(t).forEach((r) => {
    e[r] = e[r] || [], r === "emoji" ? e[r].push(...AI(ee(t[r], "grapheme"))) : (e[r][0] = e[r][0] || "", e[r][0] += AI(ee(t[r], "grapheme", r === "unknown" ? void 0 : r)).join(""));
  }), e;
}
function AI(A) {
  return Array.from(new Set(A));
}

async function loadGoogleFont(font, text) {
  const url = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(
    text
  )}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(
    /src: url\((.+)\) format\('(opentype|truetype)'\)/
  );
  if (resource) {
    const res = await fetch(resource[1]);
    if (res.status == 200) {
      return await res.arrayBuffer();
    }
  }
  throw new Error("failed to load font data");
}

async function renderOgImage({
  requestUrl,
  title,
  subtitle,
  backgroundPath,
  textSize = 80
}) {
  const fontData = await loadGoogleFont("Google+Sans+Code", `${title}${subtitle}`);
  const backgroundUrl = new URL(backgroundPath, requestUrl).toString();
  const svg = await eI(
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          color: "#000000",
          border: "16px solid #000000",
          overflow: "hidden"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "img",
            {
              src: backgroundUrl,
              width: "1200",
              height: "630",
              style: {
                position: "absolute",
                inset: "0",
                objectFit: "cover"
              }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "0 80px"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    style: {
                      fontFamily: '"Google Sans Code"',
                      fontSize: `${textSize}px`,
                      lineHeight: 1.2,
                      letterSpacing: "-1px",
                      textTransform: "lowercase"
                    },
                    children: title
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "div",
                  {
                    style: {
                      fontFamily: '"Google Sans Code"',
                      fontSize: "36px",
                      marginTop: "16px"
                    },
                    children: subtitle
                  }
                )
              ]
            }
          )
        ]
      }
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Google Sans Code",
          data: fontData,
          weight: 400,
          style: "normal"
        }
      ]
    }
  );
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml"
    }
  });
}

export { renderOgImage as r };
