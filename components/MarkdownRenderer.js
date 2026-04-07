import MDEditor from '@uiw/react-md-editor';

export default function MarkdownRenderer({ content }) {
  return (
    <div data-color-mode="light">
      <MDEditor.Markdown source={content || ''} />
    </div>
  );
}
