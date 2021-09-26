const { digits, str, choice, sequenceOf, between, lazy } = require("./index");
const OPERATOR = (val1, val2, op) => {
  switch (op) {
    case "+":
      return val1 + val2;
      break;
    case "-":
      return val1 - val2;
      break;
    case "*":
      return val1 * val2;
      break;
    case "/":
      return val1 / val2;
      break;
    default:
      break;
  }
};
const numberParser = digits.map((result) => ({
  type: "number",
  value: Number(result),
}));
const betweenBrackets = between(str("("), str(")"));
const operatorParser = choice([str("+"), str("-"), str("*"), str("/")]);
const expr = lazy(() => choice([numberParser, operationParser]));
const operationParser = betweenBrackets(
  sequenceOf([operatorParser, str(" "), expr, str(" "), expr])
).map((results) => ({
  type: "operation",
  value: {
    operator: results[0],
    val_L: results[2],
    val_R: results[4],
  },
}));
const excute = (treeNode) => {
  if (treeNode.type === "number") {
    return treeNode.value;
  } else {
    let { val_L, val_R, operator } = treeNode.value;
    return OPERATOR(excute(val_L), excute(val_R), operator);
  }
};

const interpreter = (program) => {
  const ast = expr.run(program);
  if (ast.isError) {
    throw new Error("Invalid program");
  }
  console.log(JSON.stringify(ast.result, null, "  "));
  const res = excute(ast.result);
  console.log(res);
};

interpreter("(+ (* 10 2) (- (/ 50 3) 2))");
