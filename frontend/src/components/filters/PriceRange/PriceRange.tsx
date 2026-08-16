import styles from './PriceRange.module.css';

interface PriceRangeProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

const MAX_PRICE = 5000000;

const formatPrice = (value: number) =>
  new Intl.NumberFormat('fa-IR').format(value);

export function PriceRange({
  value,
  onChange,
}: PriceRangeProps) {
  const [min, max] = value;

  const handleMinChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const nextMin = Math.min(
      Number(event.target.value),
      max,
    );

    onChange([nextMin, max]);
  };

  const handleMaxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const nextMax = Math.max(
      Number(event.target.value),
      min,
    );

    onChange([min, nextMax]);
  };

  const minPercent = (min / MAX_PRICE) * 100;
  const maxPercent = (max / MAX_PRICE) * 100;

  return (
    <div className={styles.wrapper} dir="rtl">
      <div className={styles.values}>
        <span>{formatPrice(min)} تومان</span>
        <span>{formatPrice(max)} تومان</span>
      </div>

      <div className={styles.slider}>
        <div
          className={styles.track}
          style={{
            right: `${minPercent}%`,
            left: `${100 - maxPercent}%`,
          }}
        />

        <input
          type="range"
          min={0}
          max={MAX_PRICE}
          step={50000}
          value={min}
          onChange={handleMinChange}
          aria-label="حداقل قیمت"
        />

        <input
          type="range"
          min={0}
          max={MAX_PRICE}
          step={50000}
          value={max}
          onChange={handleMaxChange}
          aria-label="حداکثر قیمت"
        />
      </div>

      <div className={styles.labels}>
        <span>۰</span>
        <span>۵ میلیون</span>
      </div>
    </div>
  );
}
