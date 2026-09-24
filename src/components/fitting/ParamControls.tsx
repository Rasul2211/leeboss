'use client';

import {
  BUILD_LABELS,
  HEIGHT_RANGE,
  WEIGHT_RANGE,
  bmi,
  type BodyParams,
  type Build,
} from '@/lib/mannequin/measurements';
import { cn } from '@/lib/utils';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;

type Props = {
  body: BodyParams;
  size: string;
  onBodyChange: (body: BodyParams) => void;
  onSizeChange: (size: string) => void;
};

export function ParamControls({ body, size, onBodyChange, onSizeChange }: Props) {
  const index = bmi(body);

  return (
    <div className="space-y-6">
      <Slider
        id="height"
        label="Рост"
        unit="см"
        value={body.height}
        min={HEIGHT_RANGE.min}
        max={HEIGHT_RANGE.max}
        step={HEIGHT_RANGE.step}
        onChange={(height) => onBodyChange({ ...body, height })}
      />

      <Slider
        id="weight"
        label="Вес"
        unit="кг"
        value={body.weight}
        min={WEIGHT_RANGE.min}
        max={WEIGHT_RANGE.max}
        step={WEIGHT_RANGE.step}
        onChange={(weight) => onBodyChange({ ...body, weight })}
      />

      <p className="price-figures text-xs text-ink-faint">
        Индекс массы тела {index.toFixed(1)}
      </p>

      <fieldset>
        <legend className="text-sm font-medium text-ink">Телосложение</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(Object.keys(BUILD_LABELS) as Build[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onBodyChange({ ...body, build: key })}
              aria-pressed={body.build === key}
              className={cn(
                'h-10 rounded-lg border px-3 text-sm transition-colors',
                body.build === key
                  ? 'border-brand bg-brand text-white'
                  : 'border-line text-ink hover:border-ink/40',
              )}
            >
              {BUILD_LABELS[key]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-ink">Размер одежды</legend>
        <p className="mt-1 text-xs text-ink-faint">Меняет посадку вещей на манекене</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SIZES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onSizeChange(value)}
              aria-pressed={value === size}
              className={cn(
                'h-10 min-w-12 rounded-lg border px-3 text-sm transition-colors',
                value === size
                  ? 'border-brand bg-brand text-white'
                  : 'border-line text-ink hover:border-ink/40',
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

type SliderProps = {
  id: string;
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

function Slider({ id, label, unit, value, min, max, step, onChange }: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        <span className="price-figures text-sm text-ink-muted">
          {value} {unit}
        </span>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none
          [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand
          [&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(0,0,0,0.3)]
          [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-brand"
        style={{
          background: `linear-gradient(to right, var(--color-brand) ${percent}%, var(--color-line) ${percent}%)`,
        }}
      />

      <div className="price-figures mt-1 flex justify-between text-[11px] text-ink-faint">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
