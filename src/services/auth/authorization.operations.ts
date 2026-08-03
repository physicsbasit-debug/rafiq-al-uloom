export const AUTHORIZATION_OPERATIONS = [
  'access_student_experience',
  'access_teacher_workspace',
  'access_reviewer_workspace',
  'author_content',
  'review_content',
] as const;

export type AuthorizationOperation = (typeof AUTHORIZATION_OPERATIONS)[number];
