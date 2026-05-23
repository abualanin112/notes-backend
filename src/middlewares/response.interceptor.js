const serializeResponse = (req, res, next) => {
  // If neither payload nor statusCode is defined, let the request pass through
  // (e.g., 404 handler or direct res.send calls like health checks)
  if (res.locals.payload === undefined && res.locals.statusCode === undefined) {
    return next();
  }

  // Handle 204 No Content explicitly
  if (res.locals.statusCode === 204) {
    return res.status(204).send();
  }

  const { payload, serializer, meta = {} } = res.locals;

  // Process data through the serializer if one is provided
  let data = payload;

  if (serializer) {
    if (
      payload &&
      payload.results &&
      Array.isArray(payload.results) &&
      (typeof payload.page !== 'undefined' || typeof payload.nextCursor !== 'undefined')
    ) {
      // It's a paginated response (offset or cursor), serialize the array explicitly
      data = {
        ...payload,
        results: payload.results.map((item) => serializer(item)),
      };
    } else if (Array.isArray(payload)) {
      data = payload.map((item) => serializer(item));
    } else {
      data = serializer(payload);
    }
  }

  // Enforce Canonical Success Envelope
  const response = {
    success: true,
    data,
    ...(Object.keys(meta).length > 0 && { meta }),
  };

  // The interceptor replaces manual res.send() in controllers
  res.status(res.locals.statusCode || 200).send(response);
};

module.exports = {
  serializeResponse,
};
