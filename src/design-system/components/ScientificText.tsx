import { Fragment, type ReactNode } from 'react';

const UNIT =
  '(?:kg/m³|km/h|m/s²|m/s|cm³|mm³|m³|cm²|mm²|m²|mL|µm|km|cm|mm|kg|kHz|MHz|Hz|kPa|Pa|ms|ns|°C|N|J|W|V|A|Ω|s|m|L|h|g)';
const NUMBER = '(?:(?:\\d{1,3}(?:[ \\u00A0]\\d{3})+)|\\d+)(?:[.,]\\d+)?';
const VALUE = `(?:${NUMBER}\\s*${UNIT})`;
const VALUE_EXPRESSION = `${VALUE}(?:\\s*(?:≈|=|→|×|÷|\\+|-|−)\\s*${VALUE})*`;

const VALUE_EXPRESSION_PATTERN = new RegExp(`(${VALUE_EXPRESSION})`, 'g');
const EXACT_VALUE_EXPRESSION_PATTERN = new RegExp(`^${VALUE_EXPRESSION}$`);
const STANDALONE_UNIT_PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}µ])(${UNIT})(?![\\p{L}\\p{N}µ])`,
  'gu'
);
const EXACT_STANDALONE_UNIT_PATTERN = new RegExp(`^${UNIT}$`, 'u');

function isolateScientificPart(part: string, key: string): ReactNode {
  return (
    <bdi key={key} dir="ltr" className="rafiq-scientific-quantity">
      {part}
    </bdi>
  );
}

function splitStandaloneUnits(text: string, parentIndex: number): ReactNode[] {
  return text
    .split(STANDALONE_UNIT_PATTERN)
    .filter(Boolean)
    .map((part, index) => {
      EXACT_STANDALONE_UNIT_PATTERN.lastIndex = 0;
      return EXACT_STANDALONE_UNIT_PATTERN.test(part) ? (
        isolateScientificPart(part, `unit-${parentIndex}-${index}-${part}`)
      ) : (
        <Fragment key={`copy-${parentIndex}-${index}-${part}`}>{part}</Fragment>
      );
    });
}

function splitScientificText(text: string): ReactNode[] {
  return text
    .split(VALUE_EXPRESSION_PATTERN)
    .filter(Boolean)
    .flatMap((part, index) => {
      EXACT_VALUE_EXPRESSION_PATTERN.lastIndex = 0;
      return EXACT_VALUE_EXPRESSION_PATTERN.test(part)
        ? [isolateScientificPart(part, `value-${index}-${part}`)]
        : splitStandaloneUnits(part, index);
    });
}

interface ScientificTextProps {
  readonly text: string;
}

/**
 * Displays scientific quantities and standalone unit symbols safely inside RTL Arabic copy.
 * Keep scientific-direction handling here rather than adding local dir="ltr" patches in features.
 */
export function ScientificText({ text }: ScientificTextProps) {
  return <>{splitScientificText(text)}</>;
}
