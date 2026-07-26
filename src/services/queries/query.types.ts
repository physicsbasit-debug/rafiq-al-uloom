export interface ContentQueryError {
  message: string;
  cause?: unknown;
}

export interface QueryState<T> {
  data: T;
  isLoading: boolean;
  error: ContentQueryError | null;
  reload: () => void;
}
