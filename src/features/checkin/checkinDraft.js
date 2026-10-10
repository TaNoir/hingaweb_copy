// The check-in the student is filling in, kept in page memory only (00 must-never 14).
// It survives a trip to the crisis screen and back, and is gone when the tab closes or the page
// reloads. It belongs to one signed-in student: another account never sees it.

let saved = null; // { owner, answers, note, ticked }

export function emptyDraft() {
  return { answers: {}, note: '', ticked: [] };
}

/** The draft for this student, or an empty one. */
export function loadDraft(owner) {
  if (!saved || saved.owner !== owner) return emptyDraft();
  return { answers: { ...saved.answers }, note: saved.note, ticked: [...saved.ticked] };
}

export function saveDraft(owner, draft) {
  saved = { owner, answers: { ...draft.answers }, note: draft.note, ticked: [...draft.ticked] };
}

export function clearDraft() {
  saved = null;
}
