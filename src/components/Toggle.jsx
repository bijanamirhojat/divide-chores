export default function Toggle({ enabled, loading, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={loading}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled ? 'bg-accent-mint' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none relative inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      >
        {loading ? (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg className="animate-spin w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </span>
        ) : enabled ? (
          <span className="absolute inset-0 flex items-center justify-center text-accent-mint">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 12 12">
              <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
            </svg>
          </span>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 12 12">
              <path d="M4 8l4-4m0 4L4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </span>
    </button>
  )
}
