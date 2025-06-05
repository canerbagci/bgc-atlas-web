function sanitizeMessage(message) {
  if (!message) return '';
  const pathRegex = /([A-Za-z]:)?[\\/][^\s']+/g;
  return message.replace(pathRegex, '[path]');
}

module.exports = { sanitizeMessage };
