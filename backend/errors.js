export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const fail = (status, code, message) => {
  throw new ApiError(status, code, message);
};
export function sendError(res, error) {
  if (error?.name === 'ZodError') {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'The request is invalid.' },
    });
  }
  const status = error instanceof ApiError ? error.status : 500;
  const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
  res.status(status).json({
    error: {
      code,
      message:
        error instanceof ApiError
          ? error.message
          : 'An unexpected error occurred.',
    },
  });
}
