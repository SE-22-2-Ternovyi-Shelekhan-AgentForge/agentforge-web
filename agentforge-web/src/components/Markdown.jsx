import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false);
  const lang = /language-(\w+)/.exec(className || '')?.[1] || 'code';
  const raw = String(children ?? '');

  async function copy() {
    try {
      await navigator.clipboard.writeText(raw.replace(/\n$/, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="af-md-codewrap">
      <div className="af-code-head">
        <span>{lang}</span>
        <button type="button" className="af-code-copy" onClick={copy}>
          {copied ? '✓ скопійовано' : 'копіювати'}
        </button>
      </div>
      <pre>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

/**
 * Render assistant/markdown content with GitHub-flavored markdown and syntax
 * highlighting. Fenced code blocks get a language label + copy button; inline
 * code is left untouched.
 */
export default function Markdown({ children }) {
  return (
    <div className="af-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noreferrer noopener" />,
          // `pre` wraps the highlighted `code`; render our own chrome instead.
          pre: ({ children }) => {
            const codeEl = Array.isArray(children) ? children[0] : children;
            const props = codeEl?.props || {};
            return <CodeBlock className={props.className}>{props.children}</CodeBlock>;
          },
        }}
      >
        {String(children ?? '')}
      </ReactMarkdown>
    </div>
  );
}
