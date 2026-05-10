class ApiResponse {
  static success(data, message = 'Success', meta = null) {
    return {
      success: true,
      message,
      data,
      ...(meta && { meta }),
    };
  }

  static error(message, code = 'ERROR', details = null) {
    return {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    };
  }

  static paginated(data, pagination) {
    return {
      success: true,
      message: 'Success',
      data,
      meta: { pagination },
    };
  }
}

module.exports = { ApiResponse };
