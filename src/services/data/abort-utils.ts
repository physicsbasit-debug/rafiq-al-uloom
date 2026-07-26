export function raceWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;

  signal.throwIfAborted();

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => {
      reject(signal.reason);
    };

    signal.addEventListener('abort', handleAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener('abort', handleAbort);

        // لا نستدعي throwIfAborted هنا.
        // إذا وقع الإلغاء سابقًا، فقد استقر الوعد الخارجي بالرفض بالفعل،
        // وأي resolve لاحق لن يغيّر حالته.
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', handleAbort);
        reject(error);
      }
    );
  });
}
