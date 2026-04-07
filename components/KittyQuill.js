import MDEditor from '@uiw/react-md-editor';

export default function KittyQuill({ value, onChange }) {
  return (
    <div data-color-mode="light">
      <MDEditor
        value={value || ''}
        onChange={(val) => onChange(val || '')}
        preview="live"
        height={300}
      />
    </div>
  );
}
