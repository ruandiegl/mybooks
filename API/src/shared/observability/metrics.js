const startedAt = Date.now();

const counters = {
  httpRequests: 0,
  httpErrors: 0,
  socketConnections: 0,
  socketMessagesAccepted: 0,
  socketErrors: 0
};

export const metrics = {
  increment(name) {
    if (Object.hasOwn(counters, name)) counters[name] += 1;
  },

  snapshot() {
    return {
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      ...counters
    };
  }
};
