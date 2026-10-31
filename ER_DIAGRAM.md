# ReliefDesk – Database Design (ER Diagram)

```mermaid
erDiagram
  REQUESTS {
    TEXT id PK "tracking ID, e.g. RD-4821"
    TEXT name "citizen name"
    TEXT phone "citizen phone"
    TEXT type "Rescue, Medical, Food and water, Shelter, Power and comms, Other"
    TEXT urgency "Critical, High, Medium, Low"
    INTEGER people "number of people needing help"
    TEXT vuln "JSON list of vulnerable groups"
    TEXT location "area, landmark or GPS"
    TEXT description "optional details"
    TEXT status "New, Assigned, In progress, Resolved"
    TEXT team "assigned team"
    INTEGER created "timestamp in ms"
    INTEGER updated "timestamp in ms"
  }

  USERS {
    TEXT username PK "responder login"
    TEXT password_hash "bcrypt hash"
  }
```

## Notes
- **requests** holds every help request. The priority score is calculated by the API from `urgency`, `people` and `vuln`, so it is not stored.
- **users** holds responder accounts. The first admin is created from the `ADMIN_USER` and `ADMIN_PASS` environment variables.
- The two tables are separate. Responders act on requests through the authenticated API, so there is no foreign key between them.
- Database: SQLite, using Node's built-in `node:sqlite` module.
