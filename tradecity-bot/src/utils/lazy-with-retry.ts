export const isChunkLoadError = (error: unknown): boolean => {
    if (!error) return false;
    const name = error instanceof Error ? error.name : '';
    const message = error instanceof Error ? error.message : String(error);
    return (
        name === 'ChunkLoadError' ||
        /Loading chunk [\d]+ failed/i.test(message) ||
        /Loading CSS chunk/i.test(message) ||
        /Failed to fetch dynamically imported module/i.test(message) ||
        /error loading dynamically imported module/i.test(message) ||
        /Importing a module script failed/i.test(message)
    );
};

export const retryImport = <T,>(loader: () => Promise<T>, retries = 2, delay_ms = 400): Promise<T> => {
    return loader().catch((error: unknown) => {
        if (!isChunkLoadError(error) || retries <= 0) {
            throw error;
        }
        return new Promise<T>(resolve => {
            window.setTimeout(() => {
                resolve(retryImport(loader, retries - 1, delay_ms * 2));
            }, delay_ms);
        });
    });
};
