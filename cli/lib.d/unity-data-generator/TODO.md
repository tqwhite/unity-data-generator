# Unity Data Generator TODO

## Architecture Decisions

### Prompt Library Architecture

- **DECISION: Keep multiple libraries but add explicit selection mechanism.**
  - Multiple prompt libraries are valuable for different data sources and strategies
  - Current auto-merge system creates conflicts and unclear precedence
  - Need explicit way to select which prompt library to use
  - Plan: Add command line parameter to specify prompt library (see PROMPTFIX.md)

### XML Elimination Cleanup

- **Finish XML elimination by renaming the individual thinkers.**
  - Current thinker names still reference XML concepts (xml-maker, xml-review, etc.)
  - Should be renamed to reflect their generic workflow patterns:
    - xml-maker → content-maker or data-maker
    - xml-review → content-review or data-review  
    - fix-problems → error-fixer (already generic)
    - check-validity → validation-checker (already generic)