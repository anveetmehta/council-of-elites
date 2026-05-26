/**
 * Safe arithmetic calculator for council tool use.
 *
 * Used by Hana Mori (and optionally Daniel Okafor) to perform
 * real calculations during conversations about money, unit economics,
 * runway, valuations, and compound growth.
 *
 * Safety: no eval(), no Function constructor. Pure recursive descent parser.
 */

import type Anthropic from "@anthropic-ai/sdk";

// ─── Anthropic tool definition ────────────────────────────────────────────────

export const CALCULATOR_TOOL: Anthropic.Tool = {
  name: "calculate",
  description:
    "Evaluate a mathematical or financial expression and return the exact result. " +
    "Use this whenever a specific number would make your point concrete. " +
    "Examples: 200000 * 0.30 (30% tax on 200K), 1.07^10 (7% growth over 10 years), " +
    "(300000 - 150000) / 150000 (percentage difference). " +
    "Show your work in the label.",
  input_schema: {
    type: "object" as const,
    properties: {
      expression: {
        type: "string",
        description:
          "A mathematical expression using numbers, +, -, *, /, ^, %, and parentheses. " +
          "Example: '200000 * (1 - 0.30) * 12'",
      },
      label: {
        type: "string",
        description:
          "What this calculation represents. Example: 'After-tax monthly income at 30% rate'",
      },
    },
    required: ["expression"],
  },
};

// ─── Safe expression evaluator ───────────────────────────────────────────────
// Recursive descent parser: handles +, -, *, /, ^, %, (, )
// No eval(), no Function constructor. Throws on invalid input.

class Parser {
  private pos = 0;
  constructor(private input: string) {}

  parse(): number {
    const result = this.parseAddSub();
    this.skipWhitespace();
    if (this.pos < this.input.length) {
      throw new Error(`Unexpected character at position ${this.pos}: '${this.input[this.pos]}'`);
    }
    return result;
  }

  private skipWhitespace() {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  private parseAddSub(): number {
    let left = this.parseMulDiv();
    this.skipWhitespace();
    while (this.pos < this.input.length && (this.input[this.pos] === "+" || this.input[this.pos] === "-")) {
      const op = this.input[this.pos++];
      this.skipWhitespace();
      const right = this.parseMulDiv();
      left = op === "+" ? left + right : left - right;
      this.skipWhitespace();
    }
    return left;
  }

  private parseMulDiv(): number {
    let left = this.parsePower();
    this.skipWhitespace();
    while (this.pos < this.input.length && (this.input[this.pos] === "*" || this.input[this.pos] === "/" || this.input[this.pos] === "%")) {
      const op = this.input[this.pos++];
      this.skipWhitespace();
      const right = this.parsePower();
      if (op === "*") left = left * right;
      else if (op === "/") {
        if (right === 0) throw new Error("Division by zero");
        left = left / right;
      } else {
        // % — treat as modulo (or percentage: x%y means x/100*y, depends on context)
        // We implement as: if preceded by a number and followed by another, it's modulo
        left = left % right;
      }
      this.skipWhitespace();
    }
    return left;
  }

  private parsePower(): number {
    let base = this.parseUnary();
    this.skipWhitespace();
    if (this.pos < this.input.length && this.input[this.pos] === "^") {
      this.pos++;
      this.skipWhitespace();
      const exp = this.parseUnary();
      base = Math.pow(base, exp);
    }
    return base;
  }

  private parseUnary(): number {
    this.skipWhitespace();
    if (this.pos < this.input.length && this.input[this.pos] === "-") {
      this.pos++;
      return -this.parsePrimary();
    }
    if (this.pos < this.input.length && this.input[this.pos] === "+") {
      this.pos++;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    this.skipWhitespace();

    // Parentheses
    if (this.pos < this.input.length && this.input[this.pos] === "(") {
      this.pos++;
      const val = this.parseAddSub();
      this.skipWhitespace();
      if (this.input[this.pos] !== ")") throw new Error("Expected closing parenthesis");
      this.pos++;
      // Check for trailing % (percentage modifier: (x)% = x/100)
      if (this.pos < this.input.length && this.input[this.pos] === "%") {
        this.pos++;
        return val / 100;
      }
      return val;
    }

    // Numbers
    const start = this.pos;
    // Handle numbers with commas as thousand separators (e.g. 1,000,000)
    while (
      this.pos < this.input.length &&
      (/[\d.]/.test(this.input[this.pos]) || (this.input[this.pos] === "," && /\d/.test(this.input[this.pos + 1] ?? "")))
    ) {
      this.pos++;
    }

    if (this.pos === start) {
      throw new Error(`Expected number at position ${this.pos}, got '${this.input[this.pos] ?? "end"}'`);
    }

    const numStr = this.input.slice(start, this.pos).replace(/,/g, "");
    const num = parseFloat(numStr);
    if (isNaN(num)) throw new Error(`Invalid number: ${numStr}`);

    // Trailing % after a bare number (e.g. 30% = 0.30)
    if (this.pos < this.input.length && this.input[this.pos] === "%") {
      this.pos++;
      return num / 100;
    }

    return num;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CalculatorResult {
  expression: string;
  label?: string;
  value: number;
  formatted: string; // human-readable result
  error?: string;
}

export function evaluateExpression(expression: string): number {
  const parser = new Parser(expression.trim());
  return parser.parse();
}

export function runCalculator(input: { expression: string; label?: string }): CalculatorResult {
  try {
    const value = evaluateExpression(input.expression);

    // Format the result appropriately
    let formatted: string;
    if (Math.abs(value) >= 1_000_000) {
      formatted = `${(value / 1_000_000).toFixed(2)}M`;
    } else if (Math.abs(value) >= 1_000) {
      formatted = value.toLocaleString("en-US", { maximumFractionDigits: 2 });
    } else if (!Number.isInteger(value) && Math.abs(value) < 10) {
      formatted = value.toFixed(4);
    } else {
      formatted = value.toLocaleString("en-US", { maximumFractionDigits: 2 });
    }

    return {
      expression: input.expression,
      label: input.label,
      value,
      formatted,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      expression: input.expression,
      label: input.label,
      value: NaN,
      formatted: "error",
      error,
    };
  }
}

/**
 * Format a calculator result for injection into the conversation as a tool result.
 * The model sees this and can cite the number in its response.
 */
export function formatCalculatorResult(result: CalculatorResult): string {
  if (result.error) {
    return `Error evaluating "${result.expression}": ${result.error}`;
  }
  const labelPart = result.label ? `${result.label}: ` : "";
  return `${labelPart}${result.expression} = ${result.formatted}`;
}

// ─── Personas that get calculator access ──────────────────────────────────────
// These personas will have the calculator tool available in their API calls.

export const CALCULATOR_ENABLED_PERSONAS = new Set([
  "hana-mori",   // primary — unit economics, runway, valuations
  "daniel-okafor", // secondary — engineering ROI, hiring cost math
]);
