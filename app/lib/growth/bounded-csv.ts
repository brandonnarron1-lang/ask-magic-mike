export type BoundedCsvMatrixResult =
  | { ok: true; rows: string[][] }
  | { ok: false; code: string; message: string };

/**
 * Parse a bounded RFC-style CSV matrix without evaluating spreadsheet content.
 * Callers still own byte, row, header, and domain-specific cell validation.
 */
export function parseBoundedCsvMatrix(
  input: string,
  options: { maxCellCharacters?: number } = {},
): BoundedCsvMatrixResult {
  const maxCellCharacters = options.maxCellCharacters ?? 512;
  if (!Number.isSafeInteger(maxCellCharacters) || maxCellCharacters < 1) {
    throw new Error("invalid_csv_cell_limit");
  }
  if (input.includes("\u0000")) {
    return { ok: false, code: "null_byte", message: "CSV contains a prohibited null byte." };
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let justClosedQuote = false;

  const pushField = () => {
    row.push(field);
    field = "";
    justClosedQuote = false;
  };
  const pushRow = () => {
    pushField();
    if (row.some((value) => value.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          justClosedQuote = true;
        }
      } else {
        field += character;
      }
    } else if (justClosedQuote) {
      if (character === ",") pushField();
      else if (character === "\n" || character === "\r") {
        pushRow();
        if (character === "\r" && input[index + 1] === "\n") index += 1;
      } else if (character !== " " && character !== "\t") {
        return {
          ok: false,
          code: "invalid_quote_boundary",
          message: "A quoted CSV field has characters after its closing quote.",
        };
      }
    } else if (character === '"') {
      if (field.trim() !== "") {
        return {
          ok: false,
          code: "invalid_quote_boundary",
          message: "A quote begins inside an unquoted CSV field.",
        };
      }
      field = "";
      quoted = true;
    } else if (character === ",") {
      pushField();
    } else if (character === "\n" || character === "\r") {
      pushRow();
      if (character === "\r" && input[index + 1] === "\n") index += 1;
    } else {
      field += character;
    }

    if (field.length > maxCellCharacters) {
      return {
        ok: false,
        code: "cell_too_long",
        message: `A CSV cell exceeds ${maxCellCharacters} characters.`,
      };
    }
  }

  if (quoted) {
    return { ok: false, code: "unclosed_quote", message: "CSV contains an unclosed quoted field." };
  }
  if (field !== "" || row.length > 0) pushRow();
  return { ok: true, rows };
}
