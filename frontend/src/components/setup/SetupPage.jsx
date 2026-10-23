import {
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Settings,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';

const LIMIT = 2 * 1024 * 1024;
const suggestions = [
  'Teach this to a beginner using simple language.',
  'Use the Socratic method and ask one question at a time.',
  'Teach this in Hebrew and include practical examples.',
];

export function SetupPage({
  apiKey,
  onApiKeyChange,
  onCreate,
  isCreating,
  error,
}) {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [localError, setLocalError] = useState(null);
  const [settings, setSettings] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const input = useRef(null);
  const selectFile = (candidate) => {
    if (!candidate) {
      return;
    }
    if (
      !['application/pdf', 'text/plain'].includes(candidate.type) &&
      !/\.(pdf|txt)$/i.test(candidate.name)
    ) {
      setLocalError('Choose a PDF or TXT file.');
      return;
    }
    if (candidate.size > LIMIT) {
      setLocalError('This file is larger than the 2 MB limit.');
      return;
    }
    setLocalError(null);
    setFile(candidate);
  };
  const submit = (event) => {
    event.preventDefault();
    if (!file) {
      return setLocalError('Add a document before creating a lesson.');
    }
    if (!prompt.trim()) {
      return setLocalError(
        'Add teaching instructions before creating a lesson.'
      );
    }
    onCreate({ file, teacherPrompt: prompt.trim() });
  };
  return (
    <main className='min-h-screen bg-[#f7f8ff] text-slate-900'>
      <header className='mx-auto flex max-w-6xl items-center justify-between px-5 py-6'>
        <Brand />
        <button
          type='button'
          onClick={() => setSettings(true)}
          className='icon-button'
          aria-label='Open API key settings'
        >
          <Settings size={20} />
        </button>
      </header>
      <section className='mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-8 lg:grid-cols-[.85fr_1.15fr] lg:pt-20'>
        <div className='pt-4'>
          <p className='eyebrow'>
            <Sparkles size={15} /> Grounded AI tutoring
          </p>
          <h1 className='mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl'>
            Turn any document into an{' '}
            <span className='text-indigo-600'>interactive</span> learning
            experience.
          </h1>
          <p className='mt-6 max-w-lg text-lg leading-8 text-slate-600'>
            Upload the material, shape the lesson in your own words, and let a
            thoughtful AI tutor guide each learner at their pace.
          </p>
          <div className='mt-10 flex items-center gap-4 text-sm text-slate-500'>
            <span className='flex size-9 items-center justify-center rounded-full bg-white shadow-sm'>
              1
            </span>{' '}
            Add material <span className='h-px w-8 bg-slate-200' />
            <span className='flex size-9 items-center justify-center rounded-full bg-white shadow-sm'>
              2
            </span>{' '}
            Create <span className='h-px w-8 bg-slate-200' />
            <span className='flex size-9 items-center justify-center rounded-full bg-white shadow-sm'>
              3
            </span>{' '}
            Learn
          </div>
        </div>
        <form
          onSubmit={submit}
          className='rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-indigo-950/5 sm:p-8'
        >
          <div className='mb-7 flex items-center justify-between'>
            <div>
              <h2 className='text-xl font-semibold'>Build a lesson</h2>
              <p className='mt-1 text-sm text-slate-500'>
                PDF or TXT · up to 2 MB
              </p>
            </div>
            <div className='flex size-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600'>
              <FileText size={21} />
            </div>
          </div>
          <input
            ref={input}
            type='file'
            accept='.pdf,.txt,application/pdf,text/plain'
            className='sr-only'
            onChange={(e) => selectFile(e.target.files?.[0])}
          />
          {!file ? (
            <div
              role='button'
              tabIndex={0}
              onClick={() => input.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                selectFile(e.dataTransfer.files?.[0]);
              }}
              className='group cursor-pointer rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-6 py-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50'
            >
              <Upload className='mx-auto text-indigo-600' size={25} />
              <p className='mt-4 font-medium'>Drop your document here</p>
              <p className='mt-1 text-sm text-slate-500'>
                or <span className='text-indigo-600'>browse files</span>
              </p>
            </div>
          ) : (
            <div className='flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4'>
              <FileText className='shrink-0 text-indigo-600' />
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>{file.name}</p>
                <p className='text-xs text-slate-500'>
                  {(file.size / 1024).toFixed(0)} KB · ready to use
                </p>
              </div>
              <button
                type='button'
                className='icon-button'
                aria-label='Remove document'
                onClick={() => {
                  setFile(null);
                  input.current.value = '';
                }}
              >
                <X size={18} />
              </button>
            </div>
          )}
          <label
            className='mt-7 block text-sm font-semibold'
            htmlFor='instructions'
          >
            How should the tutor teach?
          </label>
          <textarea
            id='instructions'
            maxLength={3000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            className='field mt-2 resize-y'
            placeholder='Teach this material to 7th graders in French. Ask questions, use simple explanations, and make sure the student understands each concept before moving on.'
          />
          <div className='mt-3 flex flex-wrap gap-2'>
            {suggestions.map((suggestion) => (
              <button
                type='button'
                key={suggestion}
                onClick={() => setPrompt(suggestion)}
                className='rounded-full border border-slate-200 px-3 py-1.5 text-left text-xs text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50'
              >
                {suggestion}
              </button>
            ))}
          </div>
          {(localError || error) && (
            <p
              role='alert'
              className='mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700'
            >
              {localError || error}
            </p>
          )}
          <button disabled={isCreating} className='primary-button mt-7 w-full'>
            {isCreating ? 'Creating your lesson…' : 'Create lesson'}{' '}
            <Sparkles size={18} />
          </button>
          <p className='mt-4 text-center text-xs text-slate-500'>
            Add a Gemini key in settings if your server does not provide one.
          </p>
        </form>
      </section>
      {settings && (
        <SettingsDialog
          apiKey={apiKey}
          onChange={onApiKeyChange}
          show={showKey}
          setShow={setShowKey}
          onClose={() => setSettings(false)}
        />
      )}
    </main>
  );
}
function Brand() {
  return (
    <div className='flex items-center gap-3'>
      <div className='flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200'>
        <Sparkles size={20} />
      </div>
      <div>
        <p className='font-semibold tracking-tight'>
          TeachFlow<span className='text-indigo-600'>AI</span>
        </p>
        <p className='text-xs text-slate-500'>Teaching, thoughtfully</p>
      </div>
    </div>
  );
}
function SettingsDialog({ apiKey, onChange, show, setShow, onClose }) {
  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-5'
      role='dialog'
      aria-modal='true'
      aria-labelledby='settings-title'
    >
      <div className='w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl'>
        <div className='flex items-start justify-between'>
          <div>
            <div className='mb-3 flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600'>
              <KeyRound size={20} />
            </div>
            <h2 id='settings-title' className='text-xl font-semibold'>
              Gemini API key
            </h2>
          </div>
          <button
            className='icon-button'
            onClick={onClose}
            aria-label='Close settings'
          >
            <X size={19} />
          </button>
        </div>
        <p className='mt-3 text-sm leading-6 text-slate-600'>
          Your key is sent to the backend only for Gemini requests. It stays in
          memory for this browser session and is never saved in lesson data.
        </p>
        <label className='mt-6 block text-sm font-medium' htmlFor='api-key'>
          API key
        </label>
        <div className='relative mt-2'>
          <input
            id='api-key'
            type={show ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => onChange(e.target.value)}
            className='field pr-12'
            placeholder='AIza…'
            autoComplete='off'
          />
          <button
            type='button'
            onClick={() => setShow(!show)}
            className='absolute right-3 top-3 text-slate-400'
            aria-label={show ? 'Hide API key' : 'Show API key'}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <a
          className='mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700'
          href='https://aistudio.google.com/app/apikey'
          target='_blank'
          rel='noreferrer'
        >
          Get an API key from Google AI Studio ↗
        </a>
        <button
          type='button'
          onClick={onClose}
          className='primary-button mt-7 w-full'
        >
          Save for this session
        </button>
      </div>
    </div>
  );
}
