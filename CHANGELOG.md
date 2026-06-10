# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-06-10

### Added
- **User Interface**
  - Implemented global background schedule generation, allowing users to navigate the application while schedules optimize.
  - Added a persistent bottom-corner progress overlay tracking generation phase, steps, score, and percentage.
  - Draft history panel now live-updates seamlessly upon background generation completion.

### Changed
- **Scheduling & Algorithm**
  - Improved performance of the initial schedule generation by offloading soft target hours balancing entirely to the Simulated Annealer.
  - Scaled down internal penalty constants to prevent solver integer overflows and improve CP-SAT math engine efficiency.
  - Introduced dynamic shift distribution logic to prevent schedule clumping for employees with heavily interrupted availability (e.g., numerous time-off requests).

## [0.2.0] - 2026-04-22

### Added
- **Scheduling & Algorithm**
  - Advanced builder settings to specify positions, minimum/maximum days off, and maximum algorithm steps when generating drafts.
  - "Frozen Assignments" feature allowing managers to lock specific shifts and regenerate only parts of a schedule.
  - Baseline template system for applying schedule parameters.
  - Multiprocessing support for the `CpSolver` in the Annealer Optimizer.
  - Complex soft-constraint penalties (exponential penalties for max days off violations, back-to-back shift penalties, and zero-shift prevention).
  - Smart auto-assign feature in `DayEditModal` to calculate and assign the optimal employee for a selected shift.
  - Ability to save invalid drafts to allow for manual shuffling of personnel.
  - Toggle to ignore pending time-off requests when generating a draft schedule.
- **User Interface**
  - Expanded and full-screen view options for the `EmployeeTimeline` alongside richer tooltips.
  - Visual conflict hinting on the Requests page for large groups of conflicting time-off requests.
  - Tiered, labeled blocks for displaying shifts based on their duration.
  - Base `ConfirmModal` component to unify confirmation prompts across the application.
- **Personnel & Management**
  - Unified add/edit modals for handling Employees and Positions.
  - Ability for managers to rescind previously approved time-off requests.
- **Backend & Operations**
  - Alembic integration for robust database schema migrations.
  - Automatic deployment to a VPS via GitHub Actions on push to `main`.

### Changed
- Refactored the builder page into distinct `BuilderMainStage` and `BuilderSidebar` components.
- Made the main application sidebar collapsible (expands on hover).
- Condensed the `TimelineGrid` to better fit full month views on most screens.
- Transitioned Employee and Position deletions to a "soft delete" system (`is_active` flag) to preserve historical schedule records.
- Decoupled frontend and backend environment variables using `pydantic-settings`.

### Security
- Enforced strict authorization checks (`Depends`) on all API endpoints to ensure only active, logged-in users can execute requests.

## [0.1.0] - 2026-02-16

### Added
- Initial release of NextWatch.
- Docker support for self-hosting (docker-compose).
- Backend: FastAPI implementation with SQLModel database.
- Frontend: React implementation with Vite and Chakra UI.
- Shift scheduling algorithm logic.
- Employee and Position management.