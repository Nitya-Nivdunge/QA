# L-Shape ATM Simulator - Detailed Project Plan

## 1) Project Overview

This plan implements the requirements from `requirement.txt` using:

- **Frontend:** Electron JS
- **Backend:** Java
- **Build tools:** npm (UI), Gradle (backend)
- **Target window behavior:** Left side of Windows desktop, **50% screen width** and **100% screen height**
- **ATM reserved area:** Top-left reserved viewport of **1024x768**

## 2) Scope by Phase

### Phase 0 - Foundation & Setup

Set up a maintainable project baseline so UI and Java backend can run together in development.

**Deliverables**
- Project folder structure for Electron + Java + shared contracts
- npm and Gradle build/run scripts
- Inter-process communication (IPC) contract for commands/events
- Config and logging standard

**Exit Criteria**
- One command starts UI and backend in dev mode
- Backend heartbeat event appears in UI logs/status panel

---

### Phase 1 - ATM UI + Device Binding from DeviceMap

Build ATM-style UI and bind devices based on `DeviceMap.json`.

**Requirements Coverage**
- Show only devices where `DeviceType == "XFS"`
- Reserve ATM space at top-left: `1024x768`
- App layout fits left 50% width and full height

**Deliverables**
- Electron shell window with docking/layout constraints
- ATM view placeholder area (`1024x768`)
- DeviceMap parser and validation
- Device list/status panel showing only XFS devices

**Exit Criteria**
- On launch, UI displays only XFS devices from `DeviceMap.json`
- Layout matches required dimensions/positioning rules

---

### Phase 2 - Java XFS Device Processing + Event Animations

Start all configured XFS devices through Java processing and display event-driven user guidance animations.

**Requirements Coverage**
- Start devices using XFS service
- Reflect events such as:
  - Ready for Insert Card
  - Eject Card
  - Dispenser Ready with Cash
  - Receipt Print

**Deliverables**
- Java device lifecycle manager (`init/start/stop/recover`)
- XFS adapter/service integration layer
- Event bus from Java to Electron (IPC/WebSocket)
- UI state machine and animations for ATM events

**Exit Criteria**
- Event sequence from backend triggers correct UI transitions and messages
- Error conditions are shown with clear status and recovery hints

---

### Phase 3 - Device-wise Fault Generation

Provide fault actions per device, send command to Java backend, and execute via XFS service.

**Requirements Coverage**
- Device-wise fault options in UI
- Fault command forwarded to Java processing
- Java interacts with XFS service for fault action

**Deliverables**
- Fault control panel per device
- Backend fault API/command handlers
- Result and recovery event feedback to UI
- Fault action audit logs (timestamp, device, action, result)

**Exit Criteria**
- Operator can trigger and clear faults by device
- UI shows success/failure and resulting device state

---

### Phase 4 - Integration, UAT, and Release Readiness

Consolidate phases, verify system behavior, and prepare release package.

**Deliverables**
- End-to-end integration tests for major event and fault flows
- Build packaging scripts for Windows
- Operator runbook and troubleshooting checklist

**Exit Criteria**
- No critical defects (Sev-1/Sev-2)
- UAT sign-off for all required user journeys

## 3) Timeline (Suggested)

- **Week 1:** Phase 0
- **Week 2-3:** Phase 1
- **Week 4-5:** Phase 2
- **Week 6:** Phase 3
- **Week 7:** Phase 4 (integration/UAT)
- **Week 8:** Buffer + release stabilization

## 4) Work Breakdown Structure (WBS)

## Phase 0 Tasks

- `P0-T1` Create repository/module structure (`ui-electron`, `backend-java`, `shared-contracts`)
- `P0-T2` Configure npm scripts and Gradle tasks
- `P0-T3` Define command/event schema v1
- `P0-T4` Add environment configuration (`dev`, `qa`) and logging
- `P0-T5` Implement app startup orchestration script

## Phase 1 Tasks

- `P1-T1` Build Electron shell and left-pane sizing logic
- `P1-T2` Reserve ATM view container (`1024x768`) top-left
- `P1-T3` Implement `DeviceMap.json` loader and schema validation
- `P1-T4` Filter devices with `DeviceType == "XFS"`
- `P1-T5` Build device status UI components
- `P1-T6` Implement UI states (`Disconnected`, `Initializing`, `Ready`, `Error`)

## Phase 2 Tasks

- `P2-T1` Build Java bootstrap to initialize all XFS devices from config
- `P2-T2` Add lifecycle handling and retry/timeouts
- `P2-T3` Publish device and transaction events to UI channel
- `P2-T4` Map backend events to ATM UI states/animations
- `P2-T5` Implement event-driven animation/message templates
- `P2-T6` Add backend error and recovery event handling

## Phase 3 Tasks

- `P3-T1` Define fault catalog by device type
- `P3-T2` Build device-wise fault controls in UI
- `P3-T3` Implement backend fault command handlers
- `P3-T4` Call XFS service operations for fault actions
- `P3-T5` Add fault action logs and result reporting in UI

## Phase 4 Tasks

- `P4-T1` Write integration test scenarios (startup, events, faults)
- `P4-T2` Verify non-functional requirements (stability, logging)
- `P4-T3` Build Windows package and startup scripts
- `P4-T4` Execute UAT and defect closure

## 5) Milestone Tracker

| Milestone | Target Week | Completion Criteria | Owner |
|---|---:|---|---|
| M0 Foundation Ready | 1 | UI+Backend dev run works, heartbeat visible | Tech Lead |
| M1 UI + Device Binding Complete | 3 | XFS devices loaded and rendered correctly | UI Lead |
| M2 XFS Event Flow Complete | 5 | Core ATM events animate correctly | Backend Lead |
| M3 Fault Injection Complete | 6 | Fault trigger/clear works per device | Full Team |
| M4 UAT Sign-off | 7 | All required journeys passed, no critical defects | QA Lead |

## 6) Task Tracker Template

Use this table in markdown/Excel/Jira import.

| Task ID | Phase | Task Name | Owner | Start | End | Dependency | Status | Progress % | Risk | Notes |
|---|---|---|---|---|---|---|---|---:|---|---|
| P0-T1 | P0 | Repo/module structure | TBD | 2026-03-10 | 2026-03-11 | - | Not Started | 0 | Low | |
| P0-T3 | P0 | Event/command schema v1 | TBD | 2026-03-11 | 2026-03-12 | P0-T1 | Not Started | 0 | Medium | |
| P1-T3 | P1 | DeviceMap loader + validation | TBD | 2026-03-17 | 2026-03-18 | P0-T3 | Not Started | 0 | Medium | |
| P1-T4 | P1 | XFS-only filtering/render | TBD | 2026-03-18 | 2026-03-19 | P1-T3 | Not Started | 0 | Low | |
| P2-T1 | P2 | Java XFS bootstrap | TBD | 2026-03-24 | 2026-03-26 | P0-T3 | Not Started | 0 | High | |
| P2-T4 | P2 | Core event mapping | TBD | 2026-03-26 | 2026-03-28 | P2-T1 | Not Started | 0 | High | |
| P3-T2 | P3 | Fault controls in UI | TBD | 2026-04-01 | 2026-04-02 | P2-T4 | Not Started | 0 | Medium | |
| P4-T1 | P4 | Integration test execution | TBD | 2026-04-07 | 2026-04-09 | P3-T4 | Not Started | 0 | Medium | |

## 7) RAID (Risks, Assumptions, Issues, Dependencies)

### Risks
- XFS integration behavior differs across vendor drivers/devices
- Event latency may impact animation timing and user perception
- Incomplete or inconsistent `DeviceMap.json` structure

### Assumptions
- Java has access to required XFS service libraries/drivers in target environment
- DeviceMap contains stable identifiers for each physical/logical device
- Windows host allows the required screen/window placement behavior

### Issues (to track during execution)
- Driver-level faults that cannot be reproduced in development
- Mismatch between UI event needs and backend event payload format

### Dependencies
- Access to test devices or simulators for card reader/dispenser/printer
- XFS SDK/service availability and permissions
- QA environment matching production display resolution behavior

## 8) Definition of Done (DoD)

A phase is complete when:
- All phase tasks are marked `Done`
- Exit criteria for that phase are met
- No open high-severity defects in that phase scope
- Demo completed and accepted by stakeholders

## 9) Weekly Governance

- **Daily:** 15-minute standup and tracker updates
- **Weekly:** Milestone review and RAID review
- **End of each phase:** Demo + sign-off checklist

## 10) Reporting Format (Suggested)

- Completed this week
- Planned next week
- Open blockers
- Risks requiring decisions
- Milestone confidence (`Green` / `Amber` / `Red`)
