export const GRIEVANCE_SUBJECT_MIN = 5;
export const GRIEVANCE_SUBJECT_MAX = 140;
export const GRIEVANCE_DESCRIPTION_MIN = 10;
export const GRIEVANCE_DESCRIPTION_MAX = 4000;
export const GRIEVANCE_MESSAGE_MIN = 1;
export const GRIEVANCE_MESSAGE_MAX = 4000;

export function validateGrievanceSubject(subject: string): string | undefined {
  const trimmed = subject.trim();
  if (!trimmed) return "Subject is required.";
  if (trimmed.length < GRIEVANCE_SUBJECT_MIN) {
    return `Subject must be at least ${GRIEVANCE_SUBJECT_MIN} characters.`;
  }
  if (trimmed.length > GRIEVANCE_SUBJECT_MAX) {
    return `Subject must be ${GRIEVANCE_SUBJECT_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validateGrievanceDescription(
  description: string,
): string | undefined {
  const trimmed = description.trim();
  if (!trimmed) return "Description is required.";
  if (trimmed.length < GRIEVANCE_DESCRIPTION_MIN) {
    return `Description must be at least ${GRIEVANCE_DESCRIPTION_MIN} characters.`;
  }
  if (description.length > GRIEVANCE_DESCRIPTION_MAX) {
    return `Description must be ${GRIEVANCE_DESCRIPTION_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validateGrievanceMessageBody(body: string): string | undefined {
  const trimmed = body.trim();
  if (!trimmed) return "Message is required.";
  if (trimmed.length < GRIEVANCE_MESSAGE_MIN) {
    return "Enter a message before sending.";
  }
  if (body.length > GRIEVANCE_MESSAGE_MAX) {
    return `Message must be ${GRIEVANCE_MESSAGE_MAX} characters or fewer.`;
  }
  return undefined;
}

export function liveGrievanceMessageBodyError(
  body: string,
): string | undefined {
  if (!body.trim()) return undefined;
  return validateGrievanceMessageBody(body);
}

export function grievanceMessageBodyReady(body: string): boolean {
  return validateGrievanceMessageBody(body) === undefined;
}
