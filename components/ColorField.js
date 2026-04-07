import { useEffect, useId, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import styles from '../styles/ColorField.module.css';

export function normalizeHex(value, fallback = '#374151') {
  if (!value || typeof value !== 'string') return fallback;
  const s = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s;
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return `#${s}`;
  return fallback;
}

export default function ColorField({ id, label, value, onChange, hint }) {
  const fid = id || `color-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const pickerColor = normalizeHex(value);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const reactId = useId();
  const popoverId = `${fid}-popover-${reactId}`;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <label id={`${fid}-label`} className={styles.primaryLabel} htmlFor={`${fid}-hex`}>
        {label}
      </label>
      {hint ? (
        <p id={`${fid}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <div className={styles.row}>
        <button
          type="button"
          ref={triggerRef}
          className={styles.swatchBtn}
          aria-expanded={open}
          aria-controls={popoverId}
          aria-label={`${label} — open colour picker`}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={styles.swatch} style={{ backgroundColor: pickerColor }} />
        </button>
        <input
          id={`${fid}-hex`}
          className={styles.hexInput}
          type="text"
          inputMode="text"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-labelledby={hint ? `${fid}-label ${fid}-hint` : `${fid}-label`}
          spellCheck="false"
        />
        <button
          type="button"
          className={styles.chooseBtn}
          aria-expanded={open}
          aria-controls={popoverId}
          onClick={() => setOpen((o) => !o)}
        >
          Choose…
        </button>
      </div>
      {open ? (
        <div
          id={popoverId}
          className={styles.popover}
          role="dialog"
          aria-label={`${label} colour wheel`}
        >
          <HexColorPicker
            className={styles.picker}
            color={pickerColor}
            onChange={(hex) => onChange(hex)}
            aria-label={`${label} wheel`}
          />
        </div>
      ) : null}
    </div>
  );
}
