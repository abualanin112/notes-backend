# Architecture Decision Records (ADRs)

This directory contains records of significant architectural decisions made for the Notes-Backend / ERP platform.

## What is an ADR?

An Architecture Decision Record (ADR) is a short text file that captures an important architectural decision made along with its context and consequences.

## Format

We follow the standard [Michael Nygard ADR template](http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions).

### Template Structure:

- **Title**: Short noun phrase describing the decision.
- **Status**: e.g., Proposed, Accepted, Deprecated, Superseded.
- **Context**: What is the issue that we're seeing that is motivating this decision or change?
- **Decision**: What is the change that we're proposing and/or doing?
- **Consequences**: What becomes easier or more difficult to do because of this change?

## Process

When proposing a major architectural shift (e.g., swapping a core library, changing a fundamental design pattern, or introducing new infrastructure):

1. Create a new markdown file named `NNNN-short-title.md`.
2. Fill out the template.
3. Submit the ADR in a Pull Request for review by core maintainers.
