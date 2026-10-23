import {
  BookOpen,
  ChevronLeft,
  CircleHelp,
  FileText,
  Menu,
  Send,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useChatStream } from '../../hooks/useChatStream.js';

export function LessonWorkspace({ initialLesson, apiKey, onExit }) {
  const [lesson, setLesson] = useState(initialLesson);
  const [showPlan, setShowPlan] = useState(false);
  const [source, setSource] = useState(null);
  const updateProgress = (update) =>
    setLesson((current) => ({
      ...current,
      progress: update.progress,
      lessonState: update.lessonState,
    }));
  const chat = useChatStream({ lesson, apiKey, onProgress: updateProgress });
  const sourceMap = useMemo(
    () => new Map(lesson.sources.map((item) => [item.id, item])),
    [lesson.sources]
  );
  return (
    <main className='min-h-screen bg-[#f8f9fd] text-slate-900'>
      <header className='flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6'>
        <button
          onClick={onExit}
          className='flex items-center gap-2 font-semibold'
        >
          <span className='flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white'>
            <Sparkles size={16} />
          </span>{' '}
          TeachFlow<span className='text-indigo-600'>AI</span>
        </button>
        <div className='flex items-center gap-3'>
          <span className='hidden text-sm text-slate-500 sm:inline'>
            {lesson.progress.status === 'completed'
              ? 'Lesson complete'
              : 'Interactive lesson'}
          </span>
          <button
            onClick={() => setShowPlan(true)}
            className='secondary-button lg:hidden'
          >
            <Menu size={18} /> Plan
          </button>
          <button
            onClick={onExit}
            className='icon-button'
            aria-label='Leave lesson'
          >
            <ChevronLeft size={21} />
          </button>
        </div>
      </header>
      <div className='mx-auto flex max-w-[1600px]'>
        <aside
          className={`${showPlan ? 'fixed inset-0 z-30 block bg-slate-950/20 p-4' : 'hidden'} lg:static lg:block lg:w-80 lg:shrink-0 lg:bg-transparent lg:p-5`}
        >
          <div className='h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <div className='flex items-start justify-between'>
              <div>
                <p className='eyebrow'>
                  <BookOpen size={14} /> Lesson plan
                </p>
                <h1 className='mt-3 text-lg font-semibold leading-6'>
                  {lesson.plan.title}
                </h1>
              </div>
              <button
                onClick={() => setShowPlan(false)}
                className='icon-button lg:hidden'
                aria-label='Close lesson plan'
              >
                <X size={18} />
              </button>
            </div>
            <Progress progress={lesson.progress} steps={lesson.plan.steps} />
            <ol className='mt-6 space-y-1'>
              {lesson.plan.steps.map((step, index) => (
                <li
                  key={`${step.objective}-${index}`}
                  className={`flex gap-3 rounded-xl px-3 py-3 text-sm ${index === lesson.progress.currentStep && lesson.progress.status !== 'completed' ? 'bg-indigo-50 text-indigo-950' : 'text-slate-600'}`}
                >
                  <span
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${lesson.progress.completedSteps.includes(index) ? 'bg-emerald-500 text-white' : index === lesson.progress.currentStep ? 'bg-indigo-600 text-white' : 'border border-slate-300'}`}
                  >
                    {lesson.progress.completedSteps.includes(index)
                      ? '✓'
                      : index + 1}
                  </span>
                  <span>
                    <b className='block font-medium'>{step.objective}</b>
                    <span className='text-xs text-slate-400'>
                      {step.sourceIds?.length || 0} source passage
                      {step.sourceIds?.length === 1 ? '' : 's'}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
        <section className='min-w-0 flex-1 px-4 py-5 sm:px-6'>
          <div className='mx-auto flex h-[calc(100vh-105px)] max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-sm'>
            <ChatPanel
              chat={chat}
              completed={lesson.progress.status === 'completed'}
              sourceMap={sourceMap}
              onSource={setSource}
            />
          </div>
        </section>
      </div>
      {source && (
        <SourceDrawer source={source} onClose={() => setSource(null)} />
      )}
    </main>
  );
}
function Progress({ progress, steps }) {
  const value = steps.length
    ? Math.round((progress.completedSteps.length / steps.length) * 100)
    : 0;
  return (
    <div className='mt-7'>
      <div className='mb-2 flex justify-between text-xs text-slate-500'>
        <span>
          {progress.status === 'completed'
            ? 'Completed'
            : `Step ${Math.min(progress.currentStep + 1, steps.length)} of ${steps.length}`}
        </span>
        <span>{value}%</span>
      </div>
      <div
        className='h-2 overflow-hidden rounded-full bg-slate-100'
        role='progressbar'
        aria-label='Lesson completion'
        aria-valuenow={value}
        aria-valuemin='0'
        aria-valuemax='100'
      >
        <div
          className='h-full rounded-full bg-indigo-600 transition-all'
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
function ChatPanel({ chat, completed, sourceMap, onSource }) {
  const [value, setValue] = useState('');
  const end = useRef(null);
  const started = chat.messages.length > 0;
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [chat.messages, chat.isStreaming]);
  const submit = (event) => {
    event.preventDefault();
    chat.send({ message: value });
    setValue('');
  };
  return (
    <>
      <div className='flex items-center justify-between border-b border-slate-100 px-5 py-4'>
        <div>
          <h2 className='font-semibold'>Your tutor</h2>
          <p className='text-xs text-slate-500'>
            {chat.isStreaming
              ? 'Thinking through your answer…'
              : completed
                ? 'You completed this lesson'
                : 'Grounded in your document'}
          </p>
        </div>
        <span className='flex size-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600'>
          <CircleHelp size={19} />
        </span>
      </div>
      <div className='flex-1 overflow-y-auto px-5 py-6'>
        {!started && (
          <div className='mx-auto max-w-md py-12 text-center'>
            <div className='mx-auto flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600'>
              <Sparkles size={26} />
            </div>
            <h3 className='mt-5 text-xl font-semibold'>Ready when you are</h3>
            <p className='mt-2 text-sm leading-6 text-slate-500'>
              Your tutor will introduce the first lesson objective and ask the
              first question.
            </p>
            <button
              disabled={chat.isStreaming || completed}
              onClick={() => chat.send({ start: true })}
              className='primary-button mt-6'
            >
              Start lesson <Sparkles size={17} />
            </button>
          </div>
        )}
        {chat.messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            sourceMap={sourceMap}
            onSource={onSource}
          />
        ))}
        {chat.error && (
          <div
            role='alert'
            className='my-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700'
          >
            {chat.error} You can try again.
          </div>
        )}
        <div ref={end} />
      </div>
      <form onSubmit={submit} className='border-t border-slate-100 p-4'>
        <div className='flex items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100'>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit(e);
              }
            }}
            disabled={chat.isStreaming || completed || !started}
            rows={1}
            dir='auto'
            className='min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none disabled:cursor-not-allowed'
            placeholder={
              completed
                ? 'Lesson completed'
                : started
                  ? 'Share your answer…'
                  : 'Start the lesson to begin'
            }
          />
          {chat.isStreaming ? (
            <button
              type='button'
              onClick={chat.stop}
              className='stop-button'
              aria-label='Stop generating'
            >
              <Square size={15} fill='currentColor' />
            </button>
          ) : (
            <button
              disabled={!value.trim() || completed || !started}
              className='send-button'
              aria-label='Send response'
            >
              <Send size={17} />
            </button>
          )}
        </div>
        <p className='mt-2 px-2 text-xs text-slate-400'>
          Enter to send · Shift + Enter for a new line
        </p>
      </form>
    </>
  );
}
function Message({ message, sourceMap, onSource }) {
  const tutor = message.role === 'tutor';
  return (
    <article className={`mb-5 flex gap-3 ${tutor ? '' : 'flex-row-reverse'}`}>
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tutor ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}
      >
        {tutor ? 'AI' : 'You'}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${tutor ? 'rounded-tl-sm bg-slate-100 text-slate-800' : 'rounded-tr-sm bg-indigo-600 text-white'}`}
      >
        <p dir='auto' className='whitespace-pre-wrap'>
          {message.content ||
            (tutor && !message.complete ? (
              <span className='inline-flex gap-1'>
                <i className='dot' />
                <i className='dot' />
                <i className='dot' />
              </span>
            ) : (
              ''
            ))}
        </p>
        {message.interrupted && (
          <p className='mt-2 text-xs text-slate-500'>Response stopped</p>
        )}
        {tutor && message.sourceIds?.length > 0 && (
          <div className='mt-3 flex flex-wrap gap-2'>
            {message.sourceIds.map((id) => {
              const source = sourceMap.get(id);
              return source ? (
                <button
                  key={id}
                  onClick={() => onSource(source)}
                  className='inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-medium text-indigo-600 shadow-sm hover:bg-indigo-50'
                >
                  <FileText size={13} /> Source{' '}
                  {source.page ? `· Page ${source.page}` : id}
                </button>
              ) : null;
            })}
          </div>
        )}
      </div>
    </article>
  );
}
function SourceDrawer({ source, onClose }) {
  return (
    <div
      className='fixed inset-0 z-50 flex justify-end bg-slate-950/25'
      role='dialog'
      aria-modal='true'
      aria-label='Source passage'
    >
      <section className='flex h-full w-full max-w-xl flex-col bg-white shadow-2xl'>
        <header className='flex items-center justify-between border-b border-slate-200 p-5'>
          <div>
            <p className='eyebrow'>
              <FileText size={14} /> Source passage
            </p>
            <h2 className='mt-1 font-semibold'>
              {source.id}
              {source.page ? ` · Page ${source.page}` : ''}
            </h2>
          </div>
          <button
            onClick={onClose}
            className='icon-button'
            aria-label='Close source'
          >
            <X size={19} />
          </button>
        </header>
        <div className='overflow-y-auto p-6'>
          <p
            dir='auto'
            className='whitespace-pre-wrap text-[15px] leading-8 text-slate-700'
          >
            {source.text}
          </p>
        </div>
      </section>
    </div>
  );
}
