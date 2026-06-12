import { ERROR_NAMES, type Token, type TokenType } from "../lexer/token";
import { lex } from "../lexer/lexer";
import { SticksLiteError, type SticksLiteErrorName } from "../runtime/errors";
import type {
  AskExpression,
  BinaryExpression,
  DictionaryExpression,
  Expression,
  IdentifierExpression,
  IndexExpression,
  Program,
  Statement
} from "./ast";

export function parse(source: string): Program {
  return parseTokens(lex(source));
}

export function parseTokens(tokens: Token[]): Program {
  return new Parser(tokens).parseProgram();
}

class Parser {
  private current = 0;

  constructor(private readonly tokens: Token[]) {}

  parseProgram(): Program {
    const body: Statement[] = [];
    this.skipNewlines();
    while (!this.isAtEnd()) {
      if (this.check("dedent")) {
        this.error(this.peek(), "Indentation ended without a matching block.");
      }
      const statement = this.statement();
      body.push(statement);
      this.statementEnd();
      this.skipNewlines();
    }
    return { kind: "Program", body };
  }

  private statement(): Statement {
    const token = this.peek();

    if (this.matchKeyword("DEFINE")) return this.constantStatement(token);
    if (this.matchKeyword("say")) return this.sayStatement(token);
    if (this.matchKeyword("if")) return this.ifStatement(token);
    if (this.matchKeyword("repeat")) return this.repeatStatement(token);
    if (this.matchKeyword("loopif")) return this.loopIfStatement(token);
    if (this.matchKeyword("foreach")) return this.foreachStatement(token);
    if (this.matchKeyword("new")) return this.functionStatement(token);
    if (this.matchKeyword("return")) return this.returnStatement(token);
    if (this.matchKeyword("break")) return { kind: "BreakStatement", line: token.line, column: token.column };
    if (this.matchKeyword("continue")) return { kind: "ContinueStatement", line: token.line, column: token.column };
    if (this.matchKeyword("attempt")) return this.attemptStatement(token);
    if (this.matchKeyword("orif")) this.error(token, "`orif` must immediately follow an `if` or another `orif` block.");
    if (this.matchKeyword("otherwise")) this.error(token, "`otherwise` must immediately follow an `if` or `orif` block.");
    if (this.matchKeyword("when")) this.error(token, "`when` must immediately follow an `attempt` block.");

    const expression = this.expression();

    if (this.match("equal")) {
      if (expression.kind !== "IdentifierExpression" && expression.kind !== "IndexExpression") {
        this.error(token, "The left side of an assignment must be a name or indexed value.");
      }
      return {
        kind: "AssignmentStatement",
        target: expression,
        value: this.expression(),
        line: token.line,
        column: token.column
      };
    }

    const compound = this.matchCompoundOperator();
    if (compound) {
      if (expression.kind !== "IdentifierExpression") {
        this.error(token, "Compound assignment works only with an existing variable name.");
      }
      return {
        kind: "CompoundAssignmentStatement",
        name: expression.name,
        operator: compound,
        value: this.expression(),
        line: token.line,
        column: token.column
      };
    }

    const increment = this.matchIncrementOperator();
    if (increment) {
      if (expression.kind !== "IdentifierExpression") {
        this.error(token, "Increment and decrement work only with an existing variable name.");
      }
      return {
        kind: "IncrementStatement",
        name: expression.name,
        operator: increment,
        line: token.line,
        column: token.column
      };
    }

    return { kind: "ExpressionStatement", expression, line: token.line, column: token.column };
  }

  private constantStatement(token: Token): Statement {
    const name = this.consume("identifier", "A constant needs a name after `DEFINE`.");
    this.consume("equal", "A constant definition needs `=` before the value.");
    return {
      kind: "ConstantStatement",
      name: name.lexeme,
      value: this.expression(),
      line: token.line,
      column: token.column
    };
  }

  private sayStatement(token: Token): Statement {
    if (this.check("leftParen")) {
      this.error(this.peek(), "`say` does not use parentheses.", "Write `say \"Hello\"` instead of `say(\"Hello\")`.");
    }
    return { kind: "SayStatement", expression: this.expression(), line: token.line, column: token.column };
  }

  private ifStatement(token: Token): Statement {
    if (this.check("leftParen")) {
      this.error(this.peek(), "`if` conditions do not use surrounding parentheses.", "Write `if score > 5:`.");
    }
    const branches = [{ condition: this.expression(), body: this.blockAfterColon("An `if` statement needs `:` before its block.") }];
    while (this.matchKeyword("orif")) {
      const orif = this.previous();
      if (this.check("leftParen")) {
        this.error(this.peek(), "`orif` conditions do not use surrounding parentheses.");
      }
      branches.push({
        condition: this.expression(),
        body: this.blockAfterColon("An `orif` statement needs `:` before its block.")
      });
      if (this.previous().line < orif.line) break;
      this.skipNewlines();
    }
    let otherwise: Statement[] | undefined;
    if (this.matchKeyword("otherwise")) {
      otherwise = this.blockAfterColon("An `otherwise` statement needs `:` before its block.");
      this.skipNewlines();
      if (this.checkKeyword("orif")) {
        this.error(this.peek(), "`orif` cannot come after `otherwise`.");
      }
    }
    return { kind: "IfStatement", branches, otherwise, line: token.line, column: token.column };
  }

  private repeatStatement(token: Token): Statement {
    const count = this.expression();
    if (!this.matchKeyword("times")) {
      this.error(this.peek(), "`repeat` needs the word `times` after the count.", "Write `repeat 5 times:`.");
    }
    return {
      kind: "RepeatStatement",
      count,
      body: this.blockAfterColon("A `repeat` statement needs `:` before its block."),
      line: token.line,
      column: token.column
    };
  }

  private loopIfStatement(token: Token): Statement {
    if (this.check("leftParen")) {
      this.error(this.peek(), "`loopif` conditions do not use surrounding parentheses.", "Write `loopif count > 0:`.");
    }
    return {
      kind: "LoopIfStatement",
      condition: this.expression(),
      body: this.blockAfterColon("A `loopif` statement needs `:` before its block."),
      line: token.line,
      column: token.column
    };
  }

  private foreachStatement(token: Token): Statement {
    const item = this.consume("identifier", "`foreach` needs a loop variable name.");
    if (!this.matchKeyword("in")) {
      this.error(this.peek(), "`foreach` needs `in` between the item name and collection.");
    }
    return {
      kind: "ForeachStatement",
      itemName: item.lexeme,
      collection: this.expression(),
      body: this.blockAfterColon("A `foreach` statement needs `:` before its block."),
      line: token.line,
      column: token.column
    };
  }

  private functionStatement(token: Token): Statement {
    const name = this.consume("identifier", "A function needs a name after `new`.");
    const params: string[] = [];
    if (this.match("leftParen")) {
      if (this.check("rightParen")) {
        this.error(this.peek(), "No-parameter function definitions omit parentheses.", "Write `new greet:` instead of `new greet()`.");
      }
      do {
        const param = this.consume("identifier", "Function parameters must be names.");
        if (params.includes(param.lexeme)) {
          this.error(param, `The parameter \`${param.lexeme}\` is listed more than once.`, "Each parameter name must be unique.");
        }
        params.push(param.lexeme);
      } while (this.match("comma") && !this.check("rightParen"));
      this.consume("rightParen", "A function parameter list needs a closing `)`.");
    }
    return {
      kind: "FunctionStatement",
      name: name.lexeme,
      params,
      body: this.blockAfterColon("A function definition needs `:` before its block."),
      line: token.line,
      column: token.column
    };
  }

  private returnStatement(token: Token): Statement {
    if (this.check("newline") || this.check("dedent") || this.check("eof")) {
      return { kind: "ReturnStatement", line: token.line, column: token.column };
    }
    return { kind: "ReturnStatement", value: this.expression(), line: token.line, column: token.column };
  }

  private attemptStatement(token: Token): Statement {
    const body = this.blockAfterColon("An `attempt` statement needs `:` before its block.");
    const handlers: Array<{ errorName: SticksLiteErrorName | "error"; body: Statement[]; line: number; column: number }> = [];
    let catchAllSeen = false;
    this.skipNewlines();
    while (this.matchKeyword("when")) {
      const when = this.previous();
      let errorName: SticksLiteErrorName | "error";
      if (this.matchKeyword("error")) {
        errorName = "error";
      } else {
        const name = this.consume("identifier", "`when` needs an error name or `error`.");
        if (!ERROR_NAMES.has(name.lexeme)) {
          this.error(name, `\`${name.lexeme}\` is not a Sticks Lite error name.`);
        }
        errorName = name.lexeme as SticksLiteErrorName;
      }
      if (catchAllSeen) {
        this.error(when, "A specific `when` block cannot appear after `when error:`.", "`when error:` catches everything, so it should be last.");
      }
      if (errorName === "error") {
        if (handlers.some((handler) => handler.errorName === "error")) {
          this.error(when, "Only one `when error:` catch-all handler is allowed.");
        }
        catchAllSeen = true;
      }
      handlers.push({
        errorName,
        body: this.blockAfterColon("A `when` handler needs `:` before its block."),
        line: when.line,
        column: when.column
      });
      this.skipNewlines();
    }
    if (handlers.length === 0) {
      this.error(token, "`attempt` needs at least one `when` handler.");
    }
    return { kind: "AttemptStatement", body, handlers, line: token.line, column: token.column };
  }

  private blockAfterColon(message: string): Statement[] {
    this.consume("colon", message);
    this.consume("newline", "A block must start on the next indented line.");
    this.consume("indent", "This block needs an indented statement.");
    const body: Statement[] = [];
    this.skipNewlines();
    while (!this.check("dedent") && !this.isAtEnd()) {
      body.push(this.statement());
      this.statementEnd();
      this.skipNewlines();
    }
    if (body.length === 0) {
      this.error(this.peek(), "Blocks need at least one statement.");
    }
    this.consume("dedent", "This block is missing its ending indentation.");
    return body;
  }

  private expression(): Expression {
    return this.orExpression();
  }

  private orExpression(): Expression {
    let expression = this.andExpression();
    while (this.matchKeyword("or")) {
      expression = this.binary(expression, "or", this.previous(), this.andExpression());
    }
    return expression;
  }

  private andExpression(): Expression {
    let expression = this.equality();
    while (this.matchKeyword("and")) {
      expression = this.binary(expression, "and", this.previous(), this.equality());
    }
    return expression;
  }

  private equality(): Expression {
    let expression = this.comparison();
    while (this.match("equalEqual") || this.match("bangEqual")) {
      const operator = this.previous();
      expression = this.binary(expression, operator.lexeme as "==" | "!=", operator, this.comparison());
    }
    return expression;
  }

  private comparison(): Expression {
    let expression = this.term();
    while (this.match("less") || this.match("lessEqual") || this.match("greater") || this.match("greaterEqual")) {
      const operator = this.previous();
      expression = this.binary(expression, operator.lexeme as "<" | "<=" | ">" | ">=", operator, this.term());
    }
    return expression;
  }

  private term(): Expression {
    let expression = this.factor();
    while (this.match("plus") || this.match("minus")) {
      const operator = this.previous();
      expression = this.binary(expression, operator.lexeme as "+" | "-", operator, this.factor());
    }
    return expression;
  }

  private factor(): Expression {
    let expression = this.unary();
    while (this.match("star") || this.match("slash") || this.match("percent") || this.matchKeyword("div")) {
      const operator = this.previous();
      expression = this.binary(expression, operator.lexeme as "*" | "/" | "%" | "div", operator, this.unary());
    }
    return expression;
  }

  private unary(): Expression {
    if (this.matchKeyword("not") || this.match("minus")) {
      const operator = this.previous();
      return {
        kind: "UnaryExpression",
        operator: operator.lexeme as "not" | "-",
        right: this.unary(),
        line: operator.line,
        column: operator.column
      };
    }
    return this.call();
  }

  private call(): Expression {
    let expression = this.primary();
    while (true) {
      if (this.match("leftParen")) {
        const open = this.previous();
        const args = this.argumentList("rightParen");
        expression = { kind: "CallExpression", callee: expression, args, line: open.line, column: open.column };
      } else if (this.match("leftBracket")) {
        const open = this.previous();
        const index = this.expression();
        this.consume("rightBracket", "Index access needs a closing `]`.");
        expression = { kind: "IndexExpression", object: expression, index, line: open.line, column: open.column };
      } else {
        break;
      }
    }
    return expression;
  }

  private primary(): Expression {
    const token = this.peek();
    if (this.match("number")) {
      return { kind: "LiteralExpression", value: token.literal as number, line: token.line, column: token.column };
    }
    if (this.match("string")) {
      return { kind: "LiteralExpression", value: token.literal as string, line: token.line, column: token.column };
    }
    if (this.matchKeyword("True")) {
      return { kind: "LiteralExpression", value: true, line: token.line, column: token.column };
    }
    if (this.matchKeyword("False")) {
      return { kind: "LiteralExpression", value: false, line: token.line, column: token.column };
    }
    if (this.matchKeyword("null")) {
      return { kind: "LiteralExpression", value: null, line: token.line, column: token.column };
    }
    if (this.matchKeyword("ask")) {
      if (this.check("leftParen")) {
        this.error(this.peek(), "`ask` does not use parentheses.", "Write `name = ask \"Name?\"`.");
      }
      return { kind: "AskExpression", prompt: this.expression(), line: token.line, column: token.column } satisfies AskExpression;
    }
    if (this.match("identifier")) {
      return { kind: "IdentifierExpression", name: token.lexeme, line: token.line, column: token.column };
    }
    if (this.match("leftBracket")) {
      return { kind: "ListExpression", elements: this.argumentList("rightBracket"), line: token.line, column: token.column };
    }
    if (this.match("leftBrace")) {
      return this.dictionaryLiteral(token);
    }
    if (this.match("leftParen")) {
      return this.tupleOrGrouped(token);
    }
    this.error(token, "Expected an expression here.");
  }

  private dictionaryLiteral(token: Token): DictionaryExpression {
    const entries: DictionaryExpression["entries"] = [];
    if (!this.check("rightBrace")) {
      do {
        const key = this.consume("string", "Dictionary keys must be quoted text.");
        this.consume("colon", "Dictionary entries need `:` between the key and value.");
        entries.push({ key: key.literal as string, value: this.expression(), line: key.line, column: key.column });
        if (this.check("rightBrace") && this.previous().type === "comma") {
          this.error(this.peek(), "Trailing commas are not supported.");
        }
      } while (this.match("comma"));
    }
    this.consume("rightBrace", "A dictionary literal needs a closing `}`.");
    return { kind: "DictionaryExpression", entries, line: token.line, column: token.column };
  }

  private tupleOrGrouped(token: Token): Expression {
    if (this.check("rightParen")) {
      this.error(token, "Empty tuples are not supported in Sticks Lite.");
    }
    const first = this.expression();
    if (!this.match("comma")) {
      this.consume("rightParen", "A grouped expression needs a closing `)`.");
      return first;
    }
    if (this.check("rightParen")) {
      this.error(this.peek(), "One-item tuples and trailing commas are not supported.");
    }
    const elements: Expression[] = [first, this.expression()];
    while (this.match("comma")) {
      if (this.check("rightParen")) {
        this.error(this.peek(), "Trailing commas are not supported.");
      }
      elements.push(this.expression());
    }
    this.consume("rightParen", "A tuple literal needs a closing `)`.");
    return { kind: "TupleExpression", elements, line: token.line, column: token.column };
  }

  private argumentList(closingType: TokenType): Expression[] {
    const args: Expression[] = [];
    if (!this.check(closingType)) {
      do {
        if (this.check(closingType)) {
          this.error(this.peek(), "Trailing commas are not supported.");
        }
        args.push(this.expression());
      } while (this.match("comma"));
    }
    this.consume(closingType, `Expected closing \`${closingLexeme(closingType)}\`.`);
    return args;
  }

  private binary(left: Expression, operator: BinaryExpression["operator"], token: Token, right: Expression): BinaryExpression {
    return { kind: "BinaryExpression", left, operator, right, line: token.line, column: token.column };
  }

  private matchCompoundOperator(): "+=" | "-=" | "*=" | "/=" | "%=" | null {
    if (this.match("plusEqual")) return "+=";
    if (this.match("minusEqual")) return "-=";
    if (this.match("starEqual")) return "*=";
    if (this.match("slashEqual")) return "/=";
    if (this.match("percentEqual")) return "%=";
    return null;
  }

  private matchIncrementOperator(): "++" | "--" | null {
    if (this.match("plusPlus")) return "++";
    if (this.match("minusMinus")) return "--";
    return null;
  }

  private statementEnd(): void {
    if (this.match("newline")) return;
    if (this.previous().type === "dedent") return;
    if (this.check("dedent") || this.check("eof")) return;
    this.error(this.peek(), "Only one statement is allowed per line.");
  }

  private skipNewlines(): void {
    while (this.match("newline")) {
      // keep going
    }
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private matchKeyword(keyword: string): boolean {
    if (this.checkKeyword(keyword)) {
      this.advance();
      return true;
    }
    return false;
  }

  private checkKeyword(keyword: string): boolean {
    const token = this.peek();
    return token.type === "keyword" && token.lexeme === keyword;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    this.error(this.peek(), message);
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return type === "eof";
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current += 1;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === "eof";
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private error(token: Token, message: string, hint?: string): never {
    let name: "SyntaxError" | "FunctionError" = "SyntaxError";
    if (message.includes("function") || message.includes("parameter")) name = "FunctionError";
    throw new SticksLiteError(name, message, token.line, token.column, hint);
  }
}

function closingLexeme(type: TokenType): string {
  switch (type) {
    case "rightParen":
      return ")";
    case "rightBracket":
      return "]";
    default:
      return "}";
  }
}
