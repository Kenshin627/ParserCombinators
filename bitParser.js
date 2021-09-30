const {
  Parser,
  sequenceOf,
  updateStateError,
  updatestateIndex,
  updateStateResult,
} = require("./index");

const bit = new Parser((parserState) => {
  if (parserState.isError) {
    return parserState;
  }
  const byteOffset = Math.floor(parserState.index / 8);
  if (byteOffset >= parserState.target.byteLength) {
    return updateStateError(
      parserState,
      `bit:unexpected error in ${parserState.index}`
    );
  }
  const byte = parserState.target.getUint8(byteOffset);
  const bitOffset = 8 - 1 - parserState.index % 8;
  const result = (byte & (1 << bitOffset)) >>> bitOffset;
  return updatestateIndex(
    updateStateResult(parserState, result),
    parserState.index + 1
  );
});

const byte = sequenceOf([bit, bit, bit, bit, bit, bit, bit, bit]);

const zero = bit.chain(
  (res) =>
    new Parser((parserState) => {
      if (res === 0) {
        return updateStateResult(parserState, res);
      } else {
        return updateStateError(parserState, `zero:not zero!`);
      }
    })
);

const one = bit.chain(
  (res) =>
    new Parser((parserState) => {
      if (res === 1) {
        return updateStateResult(parserState, res);
      } else {
        return updateStateError(parserState, `one:not one!`);
      }
    })
);

const uint = (n) =>
  sequenceOf(Array.from({ length: n }, _ => bit)).map((bits) => {
    return bits.reduce((acc, bit, i) => {
        return acc + (bit << (n - 1 - i));
    }, 0);
  });

const int = (n) => sequenceOf(Array.from({length: n}, _ => bit)).map(bits =>{
    return bits.reduce((acc,bit,i) =>{
        return acc;
    },0);
}) 

const 

/**test */
const data = new Uint8Array([234, 235]).buffer;
const dv = new DataView(data);
let res = sequenceOf([uint(8),uint(8)]);
console.log(res.run(dv));
