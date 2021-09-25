const updatestateIndex = (parserState, index) => ({
  ...parserState,
  index,
});

const updateStateResult = (parserState, result) => ({
  ...parserState,
  result,
});

const updateStateError = (parserState, error) => ({
  ...parserState,
  isError: true,
  error,
});

/**Parser */
class Parser {
  constructor(parserStateTransformFn) {
    this.parserStateTransformFn = parserStateTransformFn;
  }

  run(target) {
    let parserState = {
      target,
      index: 0,
      isError: false,
      result: null,
      error: null,
    };
    return this.parserStateTransformFn(parserState);
  }

  /**
   * map
   * @param {Function} fn
   */
  map(fn) {
    return new Parser((parseState) => {
      let nextState = this.parserStateTransformFn(parseState);
      if (nextState.isError) {
        return nextState;
      } else {
        return updateStateResult(nextState, fn(nextState.result));
      }
    });
  }

  errorMap(fn) {
    return new Parser((parserState) => {
      let nextState = this.parserStateTransformFn(parserState);
      if (!nextState.isError) {
        return nextState;
      } else {
        return updateStateError(
          nextState,
          fn(nextState.error, nextState.index)
        );
      }
    });
  }
}

const checkState = (parserState) => {
  let { target, index, isError } = parserState;
  if (isError) {
    return parserState;
  }
  let sliceTarget = target.slice(index);
  if (!sliceTarget) {
    return updateStateError(parserState, `target length limit @index ${index}`);
  }
};

const startWith = (s) =>
  new Parser((parserState) => {
    checkState(parserState);
    let { target, index } = parserState;
    /**@type{String} */
    let sliceTarget = target.slice(index);
    if (sliceTarget.startsWith(s)) {
      return updatestateIndex(
        updateStateResult(parserState, s),
        index + s.length
      );
    } else {
      return updateStateError(
        parserState,
        `startWith: ${target} not found ${s}`
      );
    }
  });

/**letters */
const letters = new Parser((parserState) => {
  checkState(parserState);
  let { target, index } = parserState;
  /**@type{String} */
  let sliceTarget = target.slice(index);
  const lettersRegex = /^[A-Za-z]+/;
  let regexMatch = sliceTarget.match(lettersRegex);
  if (regexMatch) {
    return updatestateIndex(
      updateStateResult(parserState, `letters: ${regexMatch[0]}`),
      index + regexMatch[0].length
    );
  } else {
    return updateStateError(parserState, `letters: not match @index ${index}`);
  }
});

/**digits */
const digits = new Parser((parserState) => {
  checkState(parserState);
  let { target, index } = parserState;
  /**@type{String} */
  let sliceTarget = target.slice(index);
  const digitsRegex = /^[0-9]+/;
  let regexMatch = sliceTarget.match(digitsRegex);
  if (regexMatch) {
    return updatestateIndex(
      updateStateResult(parserState, `digits: ${regexMatch[0]}`),
      index + regexMatch[0].length
    );
  } else {
    return updateStateError(parserState, `digits: not matched @index ${index}`);
  }
});

/**
 *sequenceOf
 * @param {Parser[]} parsers
 * @returns
 */
const sequenceOf = (parsers) =>
  new Parser((parserState) => {
    checkState(parserState);
    const result = [];
    let nextParserState = parserState;
    for (const parser of parsers) {
      nextParserState = parser.parserStateTransformFn(nextParserState);
      if (nextParserState.isError) {
        return nextParserState;
      } else {
        result.push(nextParserState.result);
      }
    }
    return updateStateResult(nextParserState, result);
  });

/**
 * choice
 * @param {Parser[]} parsers
 * @returns
 */
const choice = (parsers) =>
  new Parser((parserState) => {
    checkState(parserState);
    let nextParserState = parserState;
    for (const parser of parsers) {
      nextParserState = parser.parserStateTransformFn(parserState);
      if (!nextParserState.isError) {
        return nextParserState;
      }
    }
    return updateStateError(
      nextParserState,
      `choice: not match any parsers @ index ${parserState.index}`
    );
  });

/**
 * many
 * @param {Parser} parser
 * @returns
 */
const many = (parser) =>
  new Parser((parserState) => {
    checkState(parserState);
    let nextParserState = parserState;
    let done = false;
    let result = [];
    while (!done) {
      let testState = parser.parserStateTransformFn(nextParserState);
      if (testState.isError) {
        done = true;
      } else {
        nextParserState = testState;
        result.push(nextParserState.result);
      }
    }
    return updateStateResult(nextParserState, result);
  });

/**
 * many1
 * @param {Parser} parser
 * @returns
 */
const many1 = (parser) =>
  new Parser((parserState) => {
    checkState(parserState);
    let nextParserState = parserState;
    let done = false;
    let result = [];
    while (!done) {
      nextParserState = parser.parserStateTransformFn(nextParserState);
      if (nextParserState.isError) {
        done = true;
      } else {
        result.push(nextParserState.result);
      }
    }
    if (result.length === 0) {
      updateStateError(parserState, `at least one must be matched,found none!`);
    } else {
      updateStateResult(parserState, result);
    }
  });

/**test */
// const testString = "123123123";
// const sq = sequenceOf([letters, digits, letters]);
// let res = sq.run(testString);
// console.log(res);

// const parser = startWith("helloworld")
//   .map((result) => ({ value: result.toUpperCase() }))
//   .errorMap((error, index) => `Expected a greeting @ index ${index}`);
// console.log(parser.run("123"));

let res = choice([letters, digits]).run("123asdasd");
console.log(res);
