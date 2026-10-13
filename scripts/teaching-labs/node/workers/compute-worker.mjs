import { parentPort } from 'node:worker_threads';

parentPort.on('message', ({ id, operation, input }) => {
  // These two paths exercise host-level Worker failures, not task-level errors.
  if (operation === 'exit') process.exit(0);
  if (operation === 'crash') throw new Error('uncaught worker failure');
  try {
    if (operation === 'sum') {
      // CPU work happens on this OS thread, leaving the main event loop available.
      let total = 0;
      for (const value of input) total += value;
      parentPort.postMessage({ id, value: total });
    } else if (operation === 'fail') {
      throw new Error('requested worker failure');
    } else {
      throw new TypeError(`unknown operation: ${operation}`);
    }
  } catch (error) {
    parentPort.postMessage({ id, error: { name: error.name, message: error.message } });
  }
});
