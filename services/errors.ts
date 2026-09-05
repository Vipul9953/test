export class AmbiguousIntentError extends Error {
  readonly code = "ambiguous" as const;

  constructor(message = "Prompt is too ambiguous to classify.") {
    super(message);
    this.name = "AmbiguousIntentError";
  }
}

export class UnauthorizedError extends Error {
  readonly code = "unauthorized" as const;

  constructor(message = "Operator identity is missing.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class InsufficientCreditsError extends Error {
  readonly code = "credits" as const;

  constructor(message = "Please subscribe") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

export class DispatchNotFoundError extends Error {
  readonly code = "not_found" as const;

  constructor(message = "Dispatch run was not found.") {
    super(message);
    this.name = "DispatchNotFoundError";
  }
}

export class ParentArtifactNotFoundError extends Error {
  readonly code = "parent_not_found" as const;

  constructor(message = "Parent creative does not exist.") {
    super(message);
    this.name = "ParentArtifactNotFoundError";
  }
}

export class InvalidCredentialsError extends Error {
  readonly code = "invalid_credentials" as const;

  constructor(message = "Wrong password.") {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

export class ProjectNotFoundError extends Error {
  readonly code = "project_not_found" as const;

  constructor(message = "This project does not belong to you.") {
    super(message);
    this.name = "ProjectNotFoundError";
  }
}

export class DuplicateProjectError extends Error {
  readonly code = "duplicate_project" as const;

  constructor(message = "You already have a project with that name.") {
    super(message);
    this.name = "DuplicateProjectError";
  }
}

export class RenderAbortedError extends Error {
  readonly code = "abort" as const;

  constructor(message = "Run aborted by the client.") {
    super(message);
    this.name = "RenderAbortedError";
  }
}
