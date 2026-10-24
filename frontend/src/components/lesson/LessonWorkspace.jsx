import {
  BookOpen,
  ChevronLeft,
  FileText,
  Menu,
  MessageCircle,
  Send,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useChatStream } from '../../hooks/useChatStream.js';
import { Brand } from '../setup/SetupPage.jsx';

export function LessonWorkspace({ initialLesson, apiKey, onExit }) {
  const [lesson, setLesson] = useState(initialLesson);
  const [showPlan, setShowPlan] = useState(false);
  const [source, setSource] = useState(null);
  const chat = useChatStream({
    lessonState: lesson,
    apiKey,
    onProgress: (update) => setLesson(update.lessonState),
  });
  const sourceMap = useMemo(
    () => new Map(lesson.sources.map((item) => [item.id, item])),
    [lesson.sources]
  );
  return (
    <main className='lesson-shell min-h-screen text-slate-900'>
      <header className='sticky top-0 z-20 border-b border-indigo-100/80 bg-[#fbfcff]/90 backdrop-blur-md'>
        <div className='mx-auto flex h-[4.5rem] max-w-[1560px] items-center justify-between px-4 sm:px-6'>
          <button onClick={onExit} aria-label='Return to document setup'>
            <Brand />
          </button>
          <div className='flex items-center gap-3'>
            <span className='hidden rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 sm:inline'>
              {lesson.status === 'completed'
                ? 'Lesson complete'
                : 'Interactive lesson'}
            </span>
            <button
              onClick={() => setShowPlan(true)}
              className='secondary-button lg:hidden'
            >
              <Menu size={18} /> Lesson plan
            </button>
            <button
              onClick={onExit}
              className='icon-button'
              aria-label='Leave lesson'
            >
              <ChevronLeft size={21} />
            </button>
          </div>
        </div>
      </header>
      <div className='mx-auto grid max-w-[1560px] gap-5 p-4 sm:p-6 lg:grid-cols-[20rem_minmax(0,1fr)_19rem]'>
        <aside
          className={`${showPlan ? 'fixed inset-0 z-40 block bg-slate-950/25 p-4 backdrop-blur-sm' : 'hidden'} lg:static lg:block lg:bg-transparent lg:p-0`}
        >
          <PlanCard lesson={lesson} close={() => setShowPlan(false)} />
        </aside>
        <section className='min-w-0'>
          <div className='lesson-card flex h-[calc(100dvh-8.5rem)] min-h-[34rem] flex-col overflow-hidden p-0'>
            <ChatPanel
              chat={chat}
              completed={lesson.status === 'completed'}
              sourceMap={sourceMap}
              onSource={setSource}
            />
          </div>
        </section>
        <aside className='hidden lg:block'>
          <div className='space-y-4'>
            <ProgressCard lesson={lesson} />
            <div className='side-card'>
              <p className='eyebrow'>
                <FileText size={14} /> Learning material
              </p>
              <p className='mt-3 text-sm font-semibold'>{lesson.plan.title}</p>
              <p className='mt-1 text-sm leading-6 text-slate-500'>
                Source passages appear with your tutor’s explanations, so you
                can always follow the thread back to the document.
              </p>
              <div className='mt-4 flex items-center gap-2 text-xs font-medium text-indigo-700'>
                <span className='flex size-7 items-center justify-center rounded-lg bg-indigo-50'>
                  <BookOpen size={14} />
                </span>
                {lesson.sources.length} passage
                {lesson.sources.length === 1 ? '' : 's'} ready
              </div>
            </div>
            <div className='rounded-2xl border border-orange-100 bg-orange-50/70 p-4'>
              <p className='text-sm font-semibold text-orange-950'>
                A thoughtful pace
              </p>
              <p className='mt-1 text-sm leading-6 text-orange-800/75'>
                Take your time. Clear answers help your tutor choose the next
                step.
              </p>
            </div>
          </div>
        </aside>
      </div>
      <footer className='mx-auto max-w-[1560px] px-6 pb-5 text-right text-xs text-slate-400'>
        Developed by{' '}
        <span className='font-semibold text-slate-600'>Asaf Zenou</span>
      </footer>
      {source && (
        <SourceDrawer source={source} onClose={() => setSource(null)} />
      )}
    </main>
  );
}

function PlanCard({ lesson, close }) {
  return (
    <div className='side-card h-full max-h-[calc(100dvh-7.5rem)] overflow-y-auto'>
      <div className='flex items-start justify-between'>
        <div>
          <p className='eyebrow'>
            <BookOpen size={14} /> Your path
          </p>
          <h1 className='mt-3 text-lg font-semibold leading-6'>
            {lesson.plan.title}
          </h1>
        </div>
        <button
          onClick={close}
          className='icon-button lg:hidden'
          aria-label='Close lesson plan'
        >
          <X size={18} />
        </button>
      </div>
      <Progress lesson={lesson} steps={lesson.plan.steps} />
      <ol className='mt-6 space-y-1'>
        {lesson.plan.steps.map((step, index) => {
          const done = lesson.completedSteps.includes(index);
          const current =
            index === lesson.currentStep && lesson.status !== 'completed';
          return (
            <li
              key={`${step.objective}-${index}`}
              className={`flex gap-3 rounded-xl px-3 py-3 text-sm ${current ? 'bg-indigo-50 text-indigo-950' : 'text-slate-600'}`}
            >
              <span
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-500 text-white' : current ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' : 'border border-slate-200 bg-white text-slate-400'}`}
              >
                {done ? '✓' : index + 1}
              </span>
              <span>
                <b className='block font-medium leading-5'>{step.objective}</b>
                <span className='mt-0.5 block text-xs text-slate-400'>
                  {done
                    ? 'Complete'
                    : current
                      ? 'In progress'
                      : `${step.sourceIds?.length || 0} source passage${step.sourceIds?.length === 1 ? '' : 's'}`}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ProgressCard({ lesson }) {
  return (
    <div className='side-card'>
      <p className='eyebrow'>
        <Sparkles size={14} /> Lesson progress
      </p>
      <div className='mt-4 flex items-center gap-4'>
        <div className='progress-ring'>
          <span>
            {lesson.completedSteps.length}
            <small>/{lesson.plan.steps.length}</small>
          </span>
        </div>
        <div>
          <p className='text-sm font-semibold'>
            {lesson.status === 'completed'
              ? 'Wonderful work!'
              : 'Keep the momentum'}
          </p>
          <p className='mt-1 text-sm text-slate-500'>
            {lesson.status === 'completed'
              ? 'You completed every topic.'
              : `You’re exploring step ${Math.min(lesson.currentStep + 1, lesson.plan.steps.length)}.`}
          </p>
        </div>
      </div>
      <Progress lesson={lesson} steps={lesson.plan.steps} compact />
    </div>
  );
}

function Progress({ lesson, steps, compact = false }) {
  const value = steps.length
    ? Math.round((lesson.completedSteps.length / steps.length) * 100)
    : 0;
  return (
    <div className={compact ? 'mt-4' : 'mt-7'}>
      <div className='mb-2 flex justify-between text-xs text-slate-500'>
        <span>
          {lesson.status === 'completed'
            ? 'Completed'
            : `Step ${Math.min(lesson.currentStep + 1, steps.length)} of ${steps.length}`}
        </span>
        <span>{value}%</span>
      </div>
      <div
        className='h-2 overflow-hidden rounded-full bg-indigo-50'
        role='progressbar'
        aria-label='Lesson completion'
        aria-valuenow={value}
        aria-valuemin='0'
        aria-valuemax='100'
      >
        <div
          className='h-full rounded-full bg-emerald-500 transition-all duration-500'
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
      <div className='flex items-center justify-between border-b border-indigo-50 bg-[#fcfdff] px-5 py-4 sm:px-7'>
        <div className='flex items-center gap-3'>
          <span className='flex size-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600'>
            <MessageCircle size={19} />
          </span>
          <div>
            <h2 className='font-semibold'>Your learning conversation</h2>
            <p className='text-xs text-slate-500'>
              {chat.isStreaming
                ? 'Your tutor is writing…'
                : completed
                  ? 'You completed this lesson'
                  : 'Grounded in your document'}
            </p>
          </div>
        </div>
        <span className='hidden rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 sm:inline'>
          One idea at a time
        </span>
      </div>
      <div className='flex-1 overflow-y-auto px-5 py-6 sm:px-7'>
        {!started && (
          <div className='mx-auto max-w-md py-16 text-center'>
            <span className='mx-auto flex size-16 items-center justify-center rounded-[1.35rem] bg-indigo-50 text-indigo-600'>
              <Sparkles size={27} />
            </span>
            <h3 className='mt-5 text-2xl font-semibold tracking-tight'>
              Ready when you are
            </h3>
            <p className='mt-2 text-sm leading-6 text-slate-500'>
              Your tutor will introduce the first learning goal, then make space
              for your thinking.
            </p>
            <button
              disabled={chat.isStreaming || completed}
              onClick={() => chat.send({ start: true })}
              className='primary-button mt-7'
            >
              Begin the lesson <Sparkles size={17} />
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
            className='my-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700'
          >
            {chat.error} You can try again.
          </div>
        )}
        <div ref={end} />
      </div>
      <form
        onSubmit={submit}
        className='border-t border-indigo-50 bg-[#fcfdff] p-4 sm:p-5'
      >
        <div className='flex items-end gap-3 rounded-2xl border border-indigo-100 bg-white p-2 shadow-sm transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100'>
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
            className='min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 outline-none disabled:cursor-not-allowed'
            placeholder={
              completed
                ? 'Lesson completed'
                : started
                  ? 'Share your answer or question…'
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
              <Square size={14} fill='currentColor' />
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
    <article className={`mb-6 flex gap-3 ${tutor ? '' : 'flex-row-reverse'}`}>
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-2xl text-[10px] font-bold ${tutor ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}
      >
        {tutor ? 'TM' : 'YOU'}
      </div>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-7 sm:max-w-[80%] ${tutor ? 'rounded-tl-sm border border-indigo-50 bg-indigo-50/65 text-slate-800' : 'rounded-tr-sm bg-slate-800 text-white shadow-sm'}`}
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
          <p className='mt-2 text-xs opacity-60'>Response stopped</p>
        )}
        {tutor && message.sourceIds?.length > 0 && (
          <div className='mt-3 flex flex-wrap gap-2'>
            {message.sourceIds.map((id) => {
              const source = sourceMap.get(id);
              return source ? (
                <button
                  key={id}
                  onClick={() => onSource(source)}
                  className='source-chip'
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
      className='fixed inset-0 z-50 flex justify-end bg-slate-950/25 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-label='Source passage'
    >
      <section className='flex h-full w-full max-w-xl flex-col bg-[#fcfdff] shadow-2xl'>
        <header className='flex items-center justify-between border-b border-indigo-100 p-5'>
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
        <div className='overflow-y-auto p-6 sm:p-8'>
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
