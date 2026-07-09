// Lightweight in-process job queue.
//
// Purpose: run slow, non-critical follow-up work in the BACKGROUND so the HTTP
// response returns immediately. Good examples in this app: awarding badges
// after a quiz, or firing a notification — the student doesn't need to wait for
// those to finish before getting their result.
//
// What this IS: a small queue that runs jobs inside THIS Node process with a
// concurrency limit and error logging.
//
// What this is NOT: a durable, distributed message queue. If the process
// restarts, queued jobs are lost, and there are no automatic retries. That is
// perfectly acceptable for non-critical background tasks. If you ever need
// durability, retries, or multiple worker machines, graduate to BullMQ (backed
// by Redis) or RabbitMQ. For a project this size, that is usually
// over-engineering — reach for it only if you have a concrete need.

class JobQueue {
  constructor(concurrency = 2) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  // Add a fire-and-forget job. `task` is an async function.
  enqueue(name, task) {
    this.queue.push({ name, task });
    this._drain();
  }

  _drain() {
    while (this.running < this.concurrency && this.queue.length) {
      const { name, task } = this.queue.shift();
      this.running += 1;
      Promise.resolve()
        .then(task)
        .catch((err) => {
          // A failed background job must never crash the server.
          console.error(`[jobQueue] job "${name}" failed:`, err.message);
        })
        .finally(() => {
          this.running -= 1;
          this._drain();
        });
    }
  }
}

// One shared queue for the whole app.
module.exports = new JobQueue(2);
