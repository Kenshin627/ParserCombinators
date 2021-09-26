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

  /**
   * chain
   * @param {Function} fn
   * @returns
   */
  chain(fn) {
    return new Parser((parserState) => {
      let nextState = this.parserStateTransformFn(parserState);
      if (nextState.isError) {
        return nextState;
      }
      const nextParser = fn(nextState.result);
      return nextParser.parserStateTransformFn(nextState);
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

const str = (s) =>
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
      updateStateResult(parserState, regexMatch[0]),
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
      updateStateResult(parserState, regexMatch[0]),
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

const between = (leftParser, rightParser) => (contentParser) =>
  sequenceOf([leftParser, contentParser, rightParser]).map(
    (results) => results[1]
  );

const sepBy = (seperatorPaser) => (contentParser) =>
  new Parser((parserState) => {
    if (parserState.isError) {
      return parserState;
    }
    let results = [];
    let nextParserState = parserState;
    while (true) {
      let contentParserState =
        contentParser.parserStateTransformFn(nextParserState);
      if (contentParserState.isError) {
        break;
      } else {
        results.push(contentParserState.result);
        nextParserState = contentParserState;
      }
      let sepNextParserState =
        seperatorPaser.parserStateTransformFn(nextParserState);
      if (sepNextParserState.isError) {
        break;
      } else {
        nextParserState = sepNextParserState;
      }
    }
    return updateStateResult(nextParserState, results);
  });

const sepBy1 = (seperatorPaser) => (contentParser) =>
  new Parser((parserState) => {
    let results = [];
    let nextParserState = parserState;
    while (true) {
      let nextContentParserState =
        contentParser.parserStateTransformFn(nextParserState);
      if (nextContentParserState.isError) {
        break;
      }
      results.push(nextContentParserState.result);
      nextParserState = nextContentParserState;
      let nextSepParserState = seperatorPaser.parserStateTransformFn(
        nextContentParserState
      );
      if (nextSepParserState.isError) {
        break;
      }
      nextParserState = nextSepParserState;
    }
    return updateStateResult(nextParserState, results);
  });

const lazy = (thunkParser) =>
  new Parser((parserState) => {
    const parser = thunkParser();
    return parser.parserStateTransformFn(parserState);
  });

module.exports = {
  str,
  letters,
  digits,
  sequenceOf,
  choice,
  many,
  many1,
  sepBy,
  sepBy1,
  between,
  lazy,
};
