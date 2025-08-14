module.exports = (err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(err);

  res.status(status).json({
    success: false,
    message,
  });
};
