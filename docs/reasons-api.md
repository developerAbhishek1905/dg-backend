# Reason API

Base URL: `/api/v1/reasons`. All endpoints require `Authorization: Bearer <token>`.

Supported `reasonType` values:
- `close`
- `on_call_pending`
- `after_call_pending`
- `on_call_cancel`
- `after_call_cancel`

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/` | Create a reason |
| GET | `/` | List reasons, including inactive by default |
| GET | `/dropdown` | Active reasons only |
| GET | `/:id` | Get a reason |
| PUT | `/:id` | Update any of reasonName, reasonType, isActive |
| PATCH | `/:id/status` | Set active/inactive status |
| DELETE | `/:id` | Permanently delete a reason |

Create example:
```json
{"reasonName":"Customer unavailable","reasonType":"on_call_pending","isActive":true}
```
`reasonName` and `reasonType` are required when creating. `isActive` defaults to true.
Names are trimmed and unique within a type, ignoring case. The same name is allowed in different types.

Deactivate with `PATCH /api/v1/reasons/:id/status`:
```json
{"isActive":false}
```
Send true to reactivate. Repeating a request preserves the requested status.

Dropdown example: `GET /api/v1/reasons/dropdown?reasonType=on_call_pending&search=customer`.
```json
{"success":true,"count":1,"data":[{"id":"507f1f77bcf86cd799439011","reasonName":"Customer unavailable","reasonType":"on_call_pending"}]}
```
Omitting reasonType returns active reasons from all types. Inactive reasons are always excluded, even if status=inactive is supplied. The management list supports reasonType, search, and status=active or status=inactive. Search is literal, case-insensitive text.

Responses use success and data; list responses also include count. Invalid input returns 400, missing records 404, duplicate names within a type 409, and unexpected database failures 500.

Validation: `node --test tests/reason.test.js`. These tests validate the model and exercise controllers with mocked database calls; they do not connect to MongoDB. The unique compound index is declared in the model and must be created by MongoDB/Mongoose in the deployed database (normal Mongoose autoIndex behavior, or your deployment's index provisioning if autoIndex is disabled).
