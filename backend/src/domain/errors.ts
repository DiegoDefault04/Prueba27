export type DomainErrorCode =
  | 'ACTIVITY_NOT_FOUND'
  | 'THEORY_NOT_FOUND'
  | 'INVALID_OPTION'
  | 'ACTIVITY_NOT_AVAILABLE'
  | 'THEORY_NOT_AVAILABLE'
  | 'JOURNEY_COMPLETED';

/** Error de regla de negocio. La capa HTTP decide cómo mapearlo a un status. */
export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
