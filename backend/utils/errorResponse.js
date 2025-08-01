class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ErrorResponse);
    }

    this.name = this.constructor.name;
  }

  // Static method to create common error responses
  static badRequest(message = 'Bad Request') {
    return new ErrorResponse(message, 400);
  }

  static unauthorized(message = 'Not Authorized') {
    return new ErrorResponse(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return new ErrorResponse(message, 403);
  }

  static notFound(message = 'Resource Not Found') {
    return new ErrorResponse(message, 404);
  }

  static conflict(message = 'Resource Already Exists') {
    return new ErrorResponse(message, 409);
  }

  static validationError(message = 'Validation Error', errors = []) {
    const error = new ErrorResponse(message, 422);
    error.errors = errors;
    return error;
  }

  static serverError(message = 'Internal Server Error') {
    return new ErrorResponse(message, 500);
  }

  static serviceUnavailable(message = 'Service Unavailable') {
    return new ErrorResponse(message, 503);
  }
}

module.exports = ErrorResponse;
