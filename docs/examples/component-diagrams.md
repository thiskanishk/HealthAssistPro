# Component Diagrams Guide

This guide provides visual representations of the HealthAssist Pro notification system components and their interactions using Mermaid.js diagrams.

## Component Architecture

```mermaid
graph TD
    A[App] --> B[NotificationProvider]
    B --> C[Dashboard]
    B --> D[Settings]
    C --> E[NotificationBadge]
    C --> F[NotificationDrawer]
    D --> G[PreferencesForm]
    
    B --> H[useNotifications Hook]
    H --> I[WebSocket Connection]
    H --> J[REST API]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style H fill:#dfd,stroke:#333,stroke-width:2px
```

## Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Component
    participant H as Hook
    participant A as API
    participant WS as WebSocket
    
    U->>C: Open Dashboard
    C->>H: Initialize useNotifications
    H->>A: Fetch notifications
    A-->>H: Return notifications
    H-->>C: Update state
    
    WS->>H: New notification
    H-->>C: Update state
    C-->>U: Show notification badge
    
    U->>C: Click notification
    C->>H: Mark as read
    H->>A: Update notification
    A-->>H: Confirm update
    H-->>C: Update state
    C-->>U: Update UI
```

## State Management

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading: Fetch
    Loading --> Success: Data received
    Loading --> Error: API error
    Success --> Idle: Reset
    Error --> Idle: Reset
    Success --> Loading: Refresh
    Error --> Loading: Retry
```

## Notification Lifecycle

```mermaid
graph LR
    A[Created] --> B[Pending]
    B --> C[Delivered]
    C --> D[Read]
    B --> E[Failed]
    E --> B
    
    style A fill:#dfd
    style D fill:#bbf
    style E fill:#fdd
```

## Component Hierarchy

```mermaid
graph TD
    subgraph App
        A[NotificationProvider]
    end
    
    subgraph Components
        B[NotificationBadge]
        C[NotificationDrawer]
        D[PreferencesForm]
    end
    
    subgraph Hooks
        E[useNotifications]
        F[useNotificationPreferences]
    end
    
    subgraph Context
        G[NotificationContext]
    end
    
    A --> G
    G --> B
    G --> C
    G --> D
    G --> E
    G --> F
```

## WebSocket Communication

```mermaid
sequenceDiagram
    participant C as Client
    participant WS as WebSocket Server
    participant DB as Database
    
    C->>WS: Connect
    WS->>C: Acknowledge
    C->>WS: Auth token
    WS->>C: Authenticated
    
    loop Notification Check
        WS->>DB: Check new notifications
        DB-->>WS: New notification
        WS->>C: Send notification
        C->>C: Update UI
    end
    
    C->>WS: Disconnect
    WS->>C: Closed
```

## Error Boundary Flow

```mermaid
graph TD
    A[Component] --> B{Error?}
    B -->|Yes| C[Error Boundary]
    B -->|No| D[Render normally]
    C --> E[Show error UI]
    C --> F[Log error]
    E --> G[Retry button]
    G --> A
    
    style B fill:#fdd,stroke:#333,stroke-width:2px
    style C fill:#dfd,stroke:#333,stroke-width:2px
```

## Preferences Update Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as PreferencesForm
    participant H as Hook
    participant A as API
    
    U->>F: Change preference
    F->>H: Update preferences
    H->>A: Save preferences
    A-->>H: Confirm update
    H-->>F: Update state
    F-->>U: Show success
    
    alt API Error
        A-->>H: Error response
        H-->>F: Error state
        F-->>U: Show error message
    end
```

## Component Interaction

```mermaid
graph LR
    subgraph UI Layer
        A[NotificationBadge]
        B[NotificationDrawer]
        C[PreferencesForm]
    end
    
    subgraph Logic Layer
        D[useNotifications]
        E[useNotificationPreferences]
    end
    
    subgraph Data Layer
        F[API Client]
        G[WebSocket Client]
    end
    
    A --> D
    B --> D
    C --> E
    D --> F
    D --> G
    E --> F
    
    style A fill:#bbf
    style B fill:#bbf
    style C fill:#bbf
    style D fill:#dfd
    style E fill:#dfd
    style F fill:#fdd
    style G fill:#fdd
```

## Testing Strategy

```mermaid
graph TD
    subgraph Unit Tests
        A[Component Tests]
        B[Hook Tests]
        C[Utility Tests]
    end
    
    subgraph Integration Tests
        D[API Integration]
        E[WebSocket Integration]
        F[State Management]
    end
    
    subgraph E2E Tests
        G[User Flows]
        H[Error Scenarios]
    end
    
    A --> D
    B --> D
    C --> D
    D --> G
    E --> G
    F --> G
    
    style A fill:#dfd
    style B fill:#dfd
    style C fill:#dfd
    style G fill:#bbf
    style H fill:#bbf
```

## Performance Monitoring

```mermaid
graph TD
    A[Component Render] --> B{Performance Check}
    B -->|Slow| C[Optimization]
    B -->|Fast| D[Monitor]
    
    C --> E[Memoization]
    C --> F[Code Splitting]
    C --> G[Lazy Loading]
    
    D --> H[Performance Metrics]
    D --> I[Error Tracking]
    
    style B fill:#fdd,stroke:#333,stroke-width:2px
    style C fill:#dfd,stroke:#333,stroke-width:2px
    style D fill:#bbf,stroke:#333,stroke-width:2px
```

## Example Use Cases

### 1. User Receives and Reads a New Notification

```mermaid
sequenceDiagram
    participant U as User
    participant D as Dashboard
    participant NB as NotificationBadge
    participant ND as NotificationDrawer
    participant H as useNotifications Hook
    participant WS as WebSocket
    participant API as REST API

    Note over WS,API: New notification arrives
    WS->>H: Emit notification event
    H->>NB: Update badge count
    NB->>D: Re-render with new count

    Note over U,D: User sees new notification
    U->>NB: Click badge
    NB->>ND: Open drawer
    ND->>H: Fetch notifications
    H->>API: GET /notifications
    API-->>H: Return notifications list
    H->>ND: Update notifications state
    ND->>D: Display notifications

    Note over U,D: User reads notification
    U->>ND: Click notification
    ND->>H: Mark as read
    H->>API: PUT /notifications/:id/read
    API-->>H: Confirm update
    H->>NB: Update badge count
    H->>ND: Update notification state
    ND->>D: Re-render with updated state
```

### 2. User Updates Notification Preferences

```mermaid
sequenceDiagram
    participant U as User
    participant S as Settings Page
    participant PF as PreferencesForm
    participant H as useNotificationPreferences Hook
    participant API as REST API
    participant WS as WebSocket Service

    U->>S: Navigate to settings
    S->>H: Load preferences
    H->>API: GET /preferences
    API-->>H: Return current preferences
    H->>PF: Initialize form state
    PF->>S: Render preferences

    Note over U,S: User modifies settings
    U->>PF: Toggle category switch
    PF->>H: Update preferences
    H->>API: PUT /preferences
    API-->>H: Confirm update
    H->>WS: Emit preferences changed
    WS-->>H: Acknowledge update
    H->>PF: Update form state
    PF->>S: Show success message
```

### 3. Quiet Hours Activation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant PF as PreferencesForm
    participant H as useNotificationPreferences Hook
    participant API as REST API
    participant NS as NotificationService
    participant WS as WebSocket

    U->>PF: Enable quiet hours
    PF->>PF: Show time pickers
    U->>PF: Set start time
    U->>PF: Set end time
    PF->>H: Save quiet hours
    H->>API: PUT /preferences/quiet-hours
    API->>NS: Update notification rules
    NS-->>API: Confirm update
    API-->>H: Success response
    H->>WS: Broadcast preferences update
    H->>PF: Update UI state
    PF->>U: Show confirmation

    Note over NS,WS: During quiet hours
    WS->>NS: New notification arrives
    NS->>NS: Check quiet hours
    NS-->>WS: Hold notification
    Note over NS,WS: After quiet hours
    NS->>WS: Release held notifications
    WS->>U: Deliver notifications
```

### 4. Error Recovery Scenario

```mermaid
sequenceDiagram
    participant U as User
    participant C as Component
    participant EB as ErrorBoundary
    participant H as Hook
    participant API as REST API

    Note over C,API: API request fails
    C->>H: Fetch data
    H->>API: GET /notifications
    API-->>H: 500 Error
    H->>C: Throw error
    C->>EB: Catch error
    EB->>U: Display error UI
    
    Note over U,API: User attempts recovery
    U->>EB: Click retry
    EB->>C: Reset error state
    C->>H: Retry fetch
    H->>API: GET /notifications
    API-->>H: Success response
    H->>C: Update state
    C->>U: Display data
```

### 5. Real-time Group Notification Flow

```mermaid
sequenceDiagram
    participant A as Admin
    participant API as REST API
    participant NS as NotificationService
    participant WS as WebSocket
    participant GS as GroupSubscriber
    participant U as Users

    A->>API: Create group notification
    API->>NS: Process notification
    NS->>NS: Filter by group preferences
    NS->>WS: Broadcast to group
    
    par Parallel Delivery
        WS->>GS: Notify Subscriber 1
        GS->>U: Update UI for User 1
    and
        WS->>GS: Notify Subscriber 2
        GS->>U: Update UI for User 2
    and
        WS->>GS: Notify Subscriber N
        GS->>U: Update UI for User N
    end

    Note over U: All group members notified
```

These sequence diagrams illustrate common interaction patterns in the notification system, showing how different components communicate and handle various user scenarios. Each diagram demonstrates the flow of data and actions between the user interface, application logic, and backend services.

These diagrams provide a visual representation of the component architecture, data flow, state management, and other important aspects of the HealthAssist Pro notification system. They can be rendered using any Mermaid.js compatible viewer or documentation system. 