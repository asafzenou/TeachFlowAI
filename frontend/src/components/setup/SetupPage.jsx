import {
  BookOpen,
  Check,
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
  const [lessonLengthMode, setLessonLengthMode] = useState('auto');
  const [customSteps, setCustomSteps] = useState(5);
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
      return setLocalError('Choose a PDF or TXT file.');
    }
    if (candidate.size > LIMIT) {
      return setLocalError('This file is larger than the 2 MB limit.');
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
    onCreate({
      file,
      teacherPrompt: prompt.trim(),
      lessonLength:
        lessonLengthMode === 'custom'
          ? { mode: 'custom', steps: customSteps }
          : { mode: 'auto', steps: null },
    });
  };
  return (
    <main className='setup-page study-shell min-h-[100dvh] text-slate-900'>
      <div className='study-orb study-orb-one' />
      <div className='study-orb study-orb-two' />
      <header className='setup-header relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8'>
        <Brand />
        <button
          type='button'
          onClick={() => setSettings(true)}
          className='icon-button bg-white/70'
          aria-label='Open API key settings'
        >
          <Settings size={20} />
        </button>
      </header>
      <section className='setup-content relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pb-12 pt-6 sm:px-8 lg:grid-cols-[.88fr_1.12fr] lg:pb-0 lg:pt-0'>
        <div className='setup-hero max-w-xl py-6 lg:py-0'>
          <p className='eyebrow'>
            <Sparkles size={15} /> Your personal study space
          </p>
          <h1 className='mt-5 text-4xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[3.55rem] lg:leading-[1.06]'>
            Make every file feel like a{' '}
            <span className='text-indigo-600'>real lesson.</span>
          </h1>
          <p className='mt-6 max-w-lg text-lg leading-8 text-slate-600'>
            Bring a document, add your teaching goals, and learn through a
            focused conversation that stays grounded in your material.
          </p>
          <div className='setup-steps mt-9 grid max-w-md grid-cols-3 gap-3 text-center text-sm text-slate-600'>
            {[
              ['1', 'Add a file'],
              ['2', 'Set the tone'],
              ['3', 'Learn together'],
            ].map(([number, label]) => (
              <div
                key={number}
                className='rounded-2xl border border-white/80 bg-white/60 px-2 py-3 shadow-sm'
              >
                <span className='mx-auto mb-1.5 flex size-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700'>
                  {number}
                </span>
                {label}
              </div>
            ))}
          </div>
          <div className='setup-nook study-nook mt-10 hidden rounded-[2rem] p-5 sm:block'>
            <div className='nook-books'>
              <i />
              <i />
              <i />
            </div>
            <div className='nook-plant'>
              <span />
              <b />
            </div>
            <div className='relative z-10 ml-28'>
              <p className='text-sm font-semibold text-indigo-950'>
                Designed for a calmer kind of learning
              </p>
              <p className='mt-1 text-sm leading-6 text-slate-600'>
                One thought at a time, with your source material close by.
              </p>
            </div>
          </div>
        </div>
        <form
          onSubmit={submit}
          className='setup-form lesson-card relative overflow-hidden p-6 sm:p-8'
        >
          <div className='absolute -right-12 -top-16 size-44 rounded-full bg-orange-100/60 blur-2xl' />
          <div className='relative'>
            <div className='mb-7 flex items-start justify-between gap-4'>
              <div>
                <p className='eyebrow'>Start a lesson</p>
                <h2 className='mt-2 text-2xl font-semibold tracking-tight'>
                  What are we learning today?
                </h2>
                <p className='mt-1 text-sm text-slate-500'>
                  PDF or TXT · up to 2 MB
                </p>
              </div>
              <div className='flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600'>
                <BookOpen size={23} />
              </div>
            </div>
            <div className='setup-form-body'>
              <div className='setup-form-upload'>
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
                    onKeyDown={(e) =>
                      (e.key === 'Enter' || e.key === ' ') &&
                      input.current?.click()
                    }
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      selectFile(e.dataTransfer.files?.[0]);
                    }}
                    className='upload-well group'
                  >
                    <span className='mx-auto flex size-14 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm transition group-hover:scale-105'>
                      <Upload size={25} />
                    </span>
                    <p className='mt-4 font-semibold'>
                      Drop your document here
                    </p>
                    <p className='mt-1 text-sm text-slate-500'>
                      or{' '}
                      <span className='font-medium text-indigo-600'>
                        browse your files
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className='flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4'>
                    <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600'>
                      <FileText size={19} />
                    </span>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-semibold'>
                        {file.name}
                      </p>
                      <p className='mt-0.5 text-xs text-slate-500'>
                        {(file.size / 1024).toFixed(0)} KB · ready for your
                        lesson
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
              </div>
              <div className='setup-form-details'>
                <label
                  className='mt-7 block text-sm font-semibold'
                  htmlFor='instructions'
                >
                  How should your tutor teach?
                </label>
                <textarea
                  id='instructions'
                  maxLength={3000}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className='field mt-2 resize-y'
                  placeholder='For example: teach this in simple Hebrew, use examples, and check my understanding before moving on.'
                />
                <div className='mt-3 flex flex-wrap gap-2'>
                  {suggestions.map((suggestion) => (
                    <button
                      type='button'
                      key={suggestion}
                      onClick={() => setPrompt(suggestion)}
                      className='prompt-chip'
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <fieldset
                  className={`lesson-length-control lesson-length-control--${lessonLengthMode} mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3`}
                >
                  <legend className='px-1 text-sm font-semibold'>
                    Lesson Length
                  </legend>
                  <p className='mt-1 text-xs leading-5 text-slate-500'>
                    Choose how many learning steps your lesson should include.
                  </p>
                  <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                    <label
                      className={`cursor-pointer rounded-xl border p-3 transition ${lessonLengthMode === 'auto' ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                    >
                      <span className='flex items-start gap-2'>
                        <input
                          type='radio'
                          name='lesson-length'
                          value='auto'
                          checked={lessonLengthMode === 'auto'}
                          onChange={() => setLessonLengthMode('auto')}
                          className='mt-0.5 accent-indigo-600'
                        />
                        <span>
                          <span className='block text-sm font-semibold'>
                            Auto — Recommended
                          </span>
                          <span className='mt-1 block text-xs leading-4 text-slate-500'>
                            AI chooses a balanced 3–8 step lesson based on your
                            document and instructions.
                          </span>
                        </span>
                      </span>
                    </label>
                    <label
                      className={`cursor-pointer rounded-xl border p-3 transition ${lessonLengthMode === 'custom' ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'}`}
                    >
                      <span className='flex items-start gap-2'>
                        <input
                          type='radio'
                          name='lesson-length'
                          value='custom'
                          checked={lessonLengthMode === 'custom'}
                          onChange={() => setLessonLengthMode('custom')}
                          className='mt-0.5 accent-indigo-600'
                        />
                        <span className='block text-sm font-semibold'>
                          Custom
                        </span>
                      </span>
                      <div className='mt-3 pl-6'>
                        <div className='flex items-center justify-between text-xs text-slate-500'>
                          <span>Short lesson</span>
                          <output className='rounded-full bg-white px-2 py-1 font-semibold text-indigo-700'>
                            {customSteps} steps
                          </output>
                          <span>Detailed lesson</span>
                        </div>
                        <input
                          type='range'
                          min='3'
                          max='8'
                          step='1'
                          value={customSteps}
                          aria-label='Custom lesson steps'
                          disabled={lessonLengthMode !== 'custom'}
                          onChange={(event) =>
                            setCustomSteps(Number(event.target.value))
                          }
                          className='mt-2 w-full accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50'
                        />
                      </div>
                    </label>
                  </div>
                  <p className='mt-3 text-xs leading-5 text-slate-500'>
                    Longer lessons provide more learning checkpoints and may
                    require more AI requests.
                  </p>
                </fieldset>
                {(localError || error) && (
                  <p
                    role='alert'
                    className='mt-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700'
                  >
                    {localError || error}
                  </p>
                )}
                <button
                  disabled={isCreating}
                  className='primary-button mt-7 w-full'
                >
                  {isCreating ? 'Preparing your lesson…' : 'Create my lesson'}{' '}
                  <Sparkles size={18} />
                </button>
                <p className='mt-4 text-center text-xs leading-5 text-slate-500'>
                  Your document is used only to create this lesson. Add a Gemini
                  key in settings if your server does not provide one.
                </p>
              </div>
            </div>
          </div>
        </form>
      </section>
      <footer className='setup-footer relative z-10 mx-auto flex max-w-7xl justify-start px-5 pb-6 text-sm text-slate-500 sm:px-8'>
        Developed by{' '}
        <span className='ml-1 font-semibold text-slate-700'>Asaf Zenou</span>
      </footer>
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

export function Brand() {
  return (
    <div className='flex items-center gap-3'>
      <div className='brand-mark'>
        <BookOpen size={21} />
      </div>
      <div>
        <p className='font-semibold tracking-tight text-slate-900'>
          Teach Me This File
        </p>
        <p className='text-xs text-slate-500'>Learn with intention</p>
      </div>
    </div>
  );
}

function SettingsDialog({ apiKey, onChange, show, setShow, onClose }) {
  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-5 backdrop-blur-sm'
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
          <Check size={17} /> Save for this session
        </button>
      </div>
    </div>
  );
}
