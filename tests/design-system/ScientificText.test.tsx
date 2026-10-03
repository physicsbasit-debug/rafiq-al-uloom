// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScientificText } from '@design-system/components/ScientificText';

describe('ScientificText', () => {
  it('isolates number-unit expressions as left-to-right inside Arabic copy', () => {
    const { container } = render(
      <p>
        المسافة <ScientificText text="3000 m تساوي 3 km" />
      </p>
    );
    const quantities = [...container.querySelectorAll('bdi.rafiq-scientific-quantity')];
    expect(quantities).toHaveLength(2);
    expect(quantities.map((node) => node.textContent)).toEqual(['3000 m', '3 km']);
    expect(quantities.every((node) => node.getAttribute('dir') === 'ltr')).toBe(true);
  });

  it('keeps related quantities together as one LTR scientific expression', () => {
    const { container } = render(<ScientificText text="بعد التحويل: 0.8 m = 800 mm." />);
    const quantities = [...container.querySelectorAll('bdi.rafiq-scientific-quantity')];
    expect(quantities.map((node) => node.textContent)).toEqual(['0.8 m = 800 mm']);
  });

  it('supports grouped thousands and precision-heavy measurements', () => {
    const { container } = render(
      <ScientificText text="يدور القمر على ارتفاع 24 000 km وسجل الجهاز 12.345 cm." />
    );
    const quantities = [...container.querySelectorAll('bdi.rafiq-scientific-quantity')];
    expect(quantities.map((node) => node.textContent)).toEqual(['24 000 km', '12.345 cm']);
  });

  it('isolates standalone unit symbols inside Arabic explanations', () => {
    const { container } = render(
      <ScientificText text="kg تقيس الكتلة، بينما الحجم قد يسجل بوحدة mL والزمن بوحدة s." />
    );
    const units = [...container.querySelectorAll('bdi.rafiq-scientific-quantity')];
    expect(units.map((node) => node.textContent)).toEqual(['kg', 'mL', 's']);
  });

  it('supports common physics compound and derived units', () => {
    const { container } = render(
      <ScientificText text="السرعة 60 km/h والتسارع 3 m/s² والضغط 100 kPa." />
    );
    const quantities = [...container.querySelectorAll('bdi.rafiq-scientific-quantity')];
    expect(quantities.map((node) => node.textContent)).toEqual(['60 km/h', '3 m/s²', '100 kPa']);
  });

  it('does not split ordinary Latin words as if they were unit symbols', () => {
    const { container } = render(<ScientificText text="يعتمد GPS على إشارات متعددة." />);
    expect(container.querySelectorAll('bdi.rafiq-scientific-quantity')).toHaveLength(0);
    expect(container).toHaveTextContent('GPS');
  });

  it('keeps displacement equations with the Unicode minus sign in one LTR run', () => {
    const { container } = render(<ScientificText text="43 mL − 31 mL = 12 mL" />);
    const quantities = [...container.querySelectorAll('bdi.rafiq-scientific-quantity')];
    expect(quantities).toHaveLength(1);
    expect(quantities[0]).toHaveTextContent('43 mL − 31 mL = 12 mL');
    expect(quantities[0]).toHaveAttribute('dir', 'ltr');
  });
});
