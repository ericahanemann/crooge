// Mirrors the backend's request bounds (`backend/src/http/schemas/common.ts`)
// so the dialogs can explain a rejected value instead of falling through to
// the generic "Something went wrong". Keep the two in sync by hand.
export const MAX_INSTALLMENTS = 120;
export const MAX_DESCRIPTION_LENGTH = 200;
