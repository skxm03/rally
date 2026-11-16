export const notFound = (req, res, next) => {
  res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error(`[Server Error] ${req.method} ${req.url}:`, err.message || err);
  }

  res.status(statusCode).json({
    message: err.message || 'Server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
