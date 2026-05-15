"use client";

import React, { useState, type CSSProperties } from "react";

export type SubmitBillKeyboardMode = "numeric" | "alpha";

interface SubmitBillVirtualKeyboardProps {
  mode: SubmitBillKeyboardMode;
  /** Called for digit/decimal/letter; use special keys via onSpecialKey */
  onCharacter: (ch: string) => void;
  onSpecialKey: (key: "Backspace" | "Clear" | "Space") => void;
  /** When false, numeric layout has digits and backspace only (e.g. login PIN). Default true (amounts). */
  numericDecimal?: boolean;
  /** Overrides default “Amount keypad” / numeric title */
  numericHeading?: string;
  /** Overrides default alpha header */
  alphaHeading?: string;
  /**
   * Alpha (QWERTY) layout density. `compact` = denser (e.g. tight layouts).
   * `comfortable` = larger gaps and keys; rows use CSS grid so keys don’t wrap.
   */
  alphaSpacing?: "compact" | "comfortable";
  /** Start with Caps Lock on. Default false. */
  defaultCapsLock?: boolean;
}

/**
 * Fallback keyboard for Submit Bill modal when the system on-screen keyboard does not appear (touch / WebView).
 * Numeric layout for cash/M-Pesa amounts; QWERTY for M-Pesa reference codes.
 */
export default function SubmitBillVirtualKeyboard({
  mode,
  onCharacter,
  onSpecialKey,
  numericDecimal = true,
  numericHeading,
  alphaHeading,
  alphaSpacing = "compact",
  defaultCapsLock = false,
}: SubmitBillVirtualKeyboardProps) {
  const [capsLock, setCapsLock] = useState(defaultCapsLock);

  const comfortable = alphaSpacing === "comfortable";

  const numRowsTop = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
  ];

  const qwertyRows = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["z", "x", "c", "v", "b", "n", "m"],
  ];

  const alphaTouchMin = comfortable ? 48 : 44;
  const alphaFontCompact = "0.875rem";
  /** Pixel gaps — grid layout prevents flex-wrap ragged rows */
  const alphaGapPx = comfortable ? 10 : 7;
  const alphaRowMbPx = comfortable ? 10 : 8;

  const alphaGridLetters = (columnCount: number): CSSProperties => ({
    display: "grid",
    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
    columnGap: alphaGapPx,
    rowGap: alphaGapPx,
    marginBottom: alphaRowMbPx,
  });

  const alphaGridBottomRow = (): CSSProperties => ({
    display: "grid",
    gridTemplateColumns:
      "minmax(3.35rem, auto) minmax(0, 1fr) minmax(2.85rem, auto) minmax(2.85rem, auto)",
    columnGap: alphaGapPx,
    alignItems: "stretch",
  });

  const keyBtn = (
    label: string,
    display: string,
    className = "",
    ariaLabel?: string,
  ) => (
    <button
      key={label}
      type="button"
      className={`btn btn-outline-secondary btn-sm touch-key ${
        mode === "alpha" ? `w-100 ${comfortable ? "py-3" : "py-2"}` : "flex-grow-1 py-2"
      } ${className}`.trim()}
      style={{
        minHeight: mode === "alpha" ? alphaTouchMin : 40,
        minWidth: mode === "alpha" ? 0 : undefined,
        fontSize:
          mode === "alpha" ? (comfortable ? "0.95rem" : alphaFontCompact) : "1rem",
      }}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={ariaLabel ?? display}
      onClick={() => {
        if (label === "⌫") onSpecialKey("Backspace");
        else onCharacter(label);
      }}
    >
      {display}
    </button>
  );

  const numericTitle =
    numericHeading ??
    (numericDecimal ? "Amount keypad" : "Number keypad");

  const alphaTitle = alphaHeading ?? "Keyboard (M-Pesa code)";

  return (
    <div
      className={`submit-bill-vkeyboard border rounded bg-white ${mode === "alpha" ? "p-3" : "p-2"}`}
    >
      <div className="small text-muted mb-2 fw-semibold">
        <i className="bi bi-keyboard me-1" aria-hidden />
        {mode === "numeric" ? numericTitle : alphaTitle}
      </div>

      {mode === "numeric" ? (
        <>
          {numRowsTop.map((row, ri) => (
            <div key={ri} className="d-flex gap-1 mb-1">
              {row.map((k) => keyBtn(k, k))}
            </div>
          ))}
          <div className="d-flex gap-1 mb-1">
            {numericDecimal ? (
              <>
                {keyBtn(".", ".")}
                {keyBtn("0", "0")}
                {keyBtn("⌫", "⌫", "", "Backspace")}
              </>
            ) : (
              <>
                <button
                  key="0"
                  type="button"
                  className="btn btn-outline-secondary btn-sm flex-grow-1 py-2 touch-key"
                  style={{ minHeight: 40, fontSize: "1rem" }}
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label="0"
                  onClick={() => onCharacter("0")}
                >
                  0
                </button>
                <button
                  key="bs"
                  type="button"
                  className="btn btn-outline-secondary btn-sm py-2 px-3 touch-key"
                  style={{ minHeight: 40, fontSize: "1rem" }}
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label="Backspace"
                  onClick={() => onSpecialKey("Backspace")}
                >
                  ⌫
                </button>
              </>
            )}
          </div>
          <div className="d-flex gap-1 mt-2">
            <button
              type="button"
              className="btn btn-outline-danger btn-sm flex-grow-1 py-2"
              style={{ minHeight: 40 }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSpecialKey("Clear")}
            >
              Clear field
            </button>
          </div>
        </>
      ) : (
        <>
          {qwertyRows.map((row, ri) => (
            <div key={ri} style={alphaGridLetters(row.length)}>
              {row.map((k) => {
                const shown = capsLock ? k.toUpperCase() : k.toLowerCase();
                return (
                  <button
                    key={k}
                    type="button"
                    className={`btn btn-outline-secondary btn-sm w-100 touch-key ${comfortable ? "py-3" : "py-2"}`}
                    style={{
                      minWidth: 0,
                      minHeight: alphaTouchMin,
                      fontSize: comfortable ? "0.95rem" : alphaFontCompact,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={shown}
                    onClick={() => onCharacter(capsLock ? k.toUpperCase() : k.toLowerCase())}
                  >
                    {shown}
                  </button>
                );
              })}
            </div>
          ))}
          <div style={alphaGridLetters(10)}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((k) => keyBtn(k, k))}
          </div>
          <div style={alphaGridBottomRow()}>
            <button
              type="button"
              className={`btn btn-sm ${comfortable ? "py-3 px-3" : "py-2 px-2"} ${capsLock ? "btn-primary" : "btn-outline-secondary"}`}
              style={{ minHeight: alphaTouchMin, minWidth: 0 }}
              aria-pressed={capsLock}
              aria-label="Caps Lock"
              title="Caps Lock"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCapsLock((c) => !c)}
            >
              Caps
            </button>
            <button
              type="button"
              className={`btn btn-outline-secondary btn-sm w-100 ${comfortable ? "py-3" : "py-2"}`}
              style={{ minHeight: alphaTouchMin, minWidth: 0 }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSpecialKey("Space")}
            >
              Space
            </button>
            <button
              type="button"
              className={`btn btn-outline-secondary btn-sm ${comfortable ? "py-3 px-3" : "py-2 px-3"}`}
              style={{ minHeight: alphaTouchMin, minWidth: 0 }}
              aria-label="Backspace"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSpecialKey("Backspace")}
            >
              ⌫
            </button>
            <button
              type="button"
              className={`btn btn-outline-danger btn-sm ${comfortable ? "py-3 px-3" : "py-2 px-3"}`}
              style={{ minHeight: alphaTouchMin, minWidth: 0 }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSpecialKey("Clear")}
            >
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}
