export const PERMISSIONS = {
  DASHBOARD_ACCESS: "dashboard.access",
  DASHBOARD_VIEW: "dashboard.view",
  DASHBOARD_OPERATIONS: "dashboard.operations",
  DASHBOARD_FINANCE: "dashboard.finance",
  DASHBOARD_DEALER_PERFORMANCE: "dashboard.dealer_performance",
  DASHBOARD_SLA: "dashboard.sla",

  COMPLAINT_ACCESS: "complaints.access",

  DEALER_ACCESS: "dealers.access",

  PRODUCT_MASTER_ACCESS: "productMaster.access",

  CATEGORY_ACCESS: "category.access",
  CATEGORY_TABLE: "category.table",
  CATEGORY_CREATE: "category.create",
  CATEGORY_VIEW: "category.view",
  CATEGORY_UPDATE: "category.update",
  CATEGORY_DELETE: "category.delete",
  CATEGORY_IMPORT: "category.import",
  CATEGORY_EXPORT: "category.export",

  BRAND_ACCESS: "brand.access",
  BRAND_TABLE: "brand.table",
  BRAND_CREATE: "brand.create",
  BRAND_VIEW: "brand.view",
  BRAND_UPDATE: "brand.update",
  BRAND_DELETE: "brand.delete",
  BRAND_IMPORT: "brand.import",
  BRAND_EXPORT: "brand.export",

  PRODUCT_ACCESS: "product.access",
  PRODUCT_TABLE: "product.table",
  PRODUCT_CREATE: "product.create",
  PRODUCT_VIEW: "product.view",
  PRODUCT_UPDATE: "product.update",
  PRODUCT_DELETE: "product.delete",
  PRODUCT_IMPORT: "product.import",
  PRODUCT_EXPORT: "product.export",

  PRODUCT_TYPE_ACCESS: "product_type.access",
  PRODUCT_TYPE_TABLE: "product_type.table",
  PRODUCT_TYPE_CREATE: "product_type.create",
  PRODUCT_TYPE_VIEW: "product_type.view",
  PRODUCT_TYPE_UPDATE: "product_type.update",
  PRODUCT_TYPE_DELETE: "product_type.delete",
  PRODUCT_TYPE_IMPORT: "product_type.import",
  PRODUCT_TYPE_EXPORT: "product_type.export",

  ADDRESS_ACCESS: "address.access",

  STATE_ACCESS: "state.access",
  STATE_TABLE: "state.table",
  STATE_CREATE: "state.create",
  STATE_VIEW: "state.view",
  STATE_UPDATE: "state.update",
  STATE_DELETE: "state.delete",
  STATE_IMPORT: "state.import",
  STATE_EXPORT: "state.export",

  DISTRICT_ACCESS: "district.access",
  DISTRICT_TABLE: "district.table",
  DISTRICT_CREATE: "district.create",
  DISTRICT_VIEW: "district.view",
  DISTRICT_UPDATE: "district.update",
  DISTRICT_DELETE: "district.delete",
  DISTRICT_IMPORT: "district.import",
  DISTRICT_EXPORT: "district.export",

  CITY_ACCESS: "city.access",
  CITY_TABLE: "city.table",
  CITY_CREATE: "city.create",
  CITY_VIEW: "city.view",
  CITY_UPDATE: "city.update",
  CITY_DELETE: "city.delete",
  CITY_IMPORT: "city.import",
  CITY_EXPORT: "city.export",

  PINCODE_ACCESS: "pincode.access",
  PINCODE_TABLE: "pincode.table",
  PINCODE_CREATE: "pincode.create",
  PINCODE_VIEW: "pincode.view",
  PINCODE_UPDATE: "pincode.update",
  PINCODE_DELETE: "pincode.delete",
  PINCODE_IMPORT: "pincode.import",
  PINCODE_EXPORT: "pincode.export",

  AREA_ACCESS: "area.access",
  AREA_TABLE: "area.table",
  AREA_CREATE: "area.create",
  AREA_VIEW: "area.view",
  AREA_UPDATE: "area.update",
  AREA_DELETE: "area.delete",
  AREA_IMPORT: "area.import",
  AREA_EXPORT: "area.export",

  ITEM_ACCESS: "item.access",

  APPOINTMENT_ACCESS: "appointments.access",

  PENDING_ACCESS: "pending.access",

  CANCELLATION_ACCESS: "cancellations.access",
  CLOSURE_ACCESS: "closures.access",
  VERIFICATION_ACCESS: "verification.access",
  BILLING_ACCESS: "billing.access",
  LEDGER_ACCESS: "ledger.access",
  NOTIFICATION_ACCESS: "notifications.access",
  // AREA_ACCESS: "area.access",
  USER_ACCESS: "users.access",
  // BRAND_ACCESS: "brand.access",

  USER_VIEW: "users.view",
  USER_CREATE: "users.create",
  USER_UPDATE: "users.update",
  USER_DELETE: "users.delete",
  USER_ASSIGN_ROLE: "users.assign_role",
  USER_RESET_PASSWORD: "users.reset_password",
  USER_SUSPEND: "users.suspend",

  ROLE_ACCESS: "roles.access",
  ROLE_VIEW: "roles.view",
  ROLE_CREATE: "roles.create",
  ROLE_UPDATE: "roles.update",
  ROLE_DELETE: "roles.delete",
  ROLE_PERMISSION_MANAGE: "roles.permissions.manage",
  ROLE_PERMISSION_VIEW: "roles.permissions.view",

  COMPLAINT_VIEW: "complaints.view",
  COMPLAINT_CREATE: "complaints.create",
  COMPLAINT_UPDATE: "complaints.update",
  COMPLAINT_DELETE: "complaints.delete",
  COMPLAINT_ASSIGN: "complaints.assign",
  COMPLAINT_REASSIGN: "complaints.reassign",
  COMPLAINT_UPDATE_STATUS: "complaints.update_status",
  COMPLAINT_CANCEL: "complaints.cancel",
  COMPLAINT_CLOSE: "complaints.close",
  COMPLAINT_VERIFY: "complaints.verify",

  DEALER_VIEW: "dealers.view",
  DEALER_CREATE: "dealers.create",
  DEALER_UPDATE: "dealers.update",
  DEALER_DELETE: "dealers.delete",
  DEALER_PERFORMANCE_VIEW: "dealers.performance.view",
  DEALER_CAPACITY_MANAGE: "dealers.capacity.manage",

  APPOINTMENT_VIEW: "appointments.view",
  APPOINTMENT_CREATE: "appointments.create",
  APPOINTMENT_UPDATE: "appointments.update",
  APPOINTMENT_CONFIRM: "appointments.confirm",
  APPOINTMENT_RESCHEDULE: "appointments.reschedule",
  APPOINTMENT_COMPLETE: "appointments.complete",
  APPOINTMENT_CANCEL: "appointments.cancel",

  PENDING_VIEW: "pending.view",
  PENDING_CREATE: "pending.create",
  PENDING_UPDATE: "pending.update",
  PENDING_RESOLVE: "pending.resolve",
  PENDING_CONTINUE: "pending.continue",
  PENDING_REASSIGN: "pending.reassign",
  PENDING_ESCALATE: "pending.escalate",
  PENDING_CANCEL: "pending.cancel",

  SLA_VIEW: "sla.view",
  SLA_REMINDER: "sla.reminder",
  SLA_MANAGE: "sla.manage",

  CANCELLATION_VIEW: "cancellations.view",
  CANCELLATION_CREATE: "cancellations.create",
  CANCELLATION_VERIFY: "cancellations.verify",
  CANCELLATION_APPROVE: "cancellations.approve",
  CANCELLATION_REJECT: "cancellations.reject",
  CANCELLATION_REASSIGN: "cancellations.reassign",

  CLOSURE_VIEW: "closures.view",
  CLOSURE_CREATE: "closures.create",
  CLOSURE_SUBMIT: "closures.submit",
  CLOSURE_VERIFY: "closures.verify",
  CLOSURE_REJECT: "closures.reject",
  CLOSURE_HISTORY_VIEW: "closures.history.view",

  VERIFICATION_VIEW: "verification.view",
  VERIFICATION_REVIEW: "verification.review",
  VERIFICATION_VERIFY: "verification.verify",
  VERIFICATION_REJECT: "verification.reject",
  VERIFICATION_CORRECTION: "verification.correction",
  VERIFICATION_ASSIGN: "verification.assign",

  BILLING_VIEW: "billing.view",
  BILLING_GENERATE: "billing.generate",
  BILLING_APPROVE: "billing.approve",
  BILLING_REJECT: "billing.reject",
  BILLING_RATE_VIEW: "billing.rates.view",
  BILLING_RATE_CREATE: "billing.rates.create",
  BILLING_RATE_UPDATE: "billing.rates.update",
  BILLING_RATE_DELETE: "billing.rates.delete",

  LEDGER_VIEW: "ledger.view",
  LEDGER_DEALER_VIEW: "ledger.dealer.view",
  LEDGER_TRANSACTION_VIEW: "ledger.transaction.view",
  LEDGER_ADJUSTMENT_CREATE: "ledger.adjustment.create",
  LEDGER_EXPORT: "ledger.export",

  PAYMENT_VIEW: "payment.view",
  PAYMENT_DETAILS_VIEW: "payment.details.view",
  PAYMENT_CREATE: "payment.create",
  PAYMENT_APPROVE: "payment.approve",
  PAYMENT_REJECT: "payment.reject",
  PAYMENT_REVERSE: "payment.reverse",
  PAYMENT_EXPORT: "payment.export",

  RECONCILIATION_VIEW: "reconciliation.view",
  RECONCILIATION_DETAILS_VIEW: "reconciliation.details.view",
  RECONCILIATION_RECONCILE: "reconciliation.reconcile",
  RECONCILIATION_MARK_MATCHED: "reconciliation.mark_matched",
  RECONCILIATION_EXPORT: "reconciliation.export",

  REPORT_VIEW: "report.view",
  REPORT_COMPLAINT: "report.complaint",
  REPORT_DEALER: "report.dealer",
  REPORT_SLA: "report.sla",
  REPORT_CANCELLATION: "report.cancellation",
  REPORT_BILLING: "report.billing",
  REPORT_PAYMENT: "report.payment",
  REPORT_EXPORT: "report.export",
  NOTIFICATION_VIEW: "notification.view",
  NOTIFICATION_READ: "notification.read",
  NOTIFICATION_DELETE: "notification.delete",
  NOTIFICATION_CLEAR: "notification.clear",

  AUDIT_VIEW: "audit.view",
  AUDIT_DETAILS: "audit.details",
  AUDIT_EXPORT: "audit.export",

  SETTINGS_VIEW: "settings.view",
  SETTINGS_SLA: "settings.sla",
  SETTINGS_NOTIFICATION: "settings.notification",
  SETTINGS_BILLING: "settings.billing",
  SETTINGS_STATUS: "settings.status",
  SETTINGS_CANCELLATION_REASON: "settings.cancellation_reason",
  SETTINGS_PENDING_REASON: "settings.pending_reason",
  SETTINGS_PERMISSION: "settings.permission",

  ALLOCATION_VIEW: "allocation.view",
  ALLOCATION_ASSIGN: "allocation.assign",
  ALLOCATION_REASSIGN: "allocation.reassign",
  ALLOCATION_HISTORY_VIEW: "allocation.history.view",
}

export const PERMISSION_LIST = [
  // {
  //   id: "P-001",
  //   key: PERMISSIONS.BRAND_ACCESS,
  //   module: "Brand",
  //   action: "access",
  //   label: "Access Brand",
  // },
  {
    id: "P-001",
    key: PERMISSIONS.DASHBOARD_ACCESS,
    module: "Dashboard",
    action: "access",
    label: "Access Dashboard",
  },
  {
    id: "P-002",
    key: PERMISSIONS.COMPLAINT_ACCESS,
    module: "Complaints",
    action: "access",
    label: "Access Complaints",
  },
  {
    id: "P-003",
    key: PERMISSIONS.DEALER_ACCESS,
    module: "Dealers",
    action: "access",
    label: "Access Dealers",
  },

  // =========================
  // PRODUCT MASTER
  // =========================

  {
    id: "P-001",
    key: PERMISSIONS.PRODUCT_MASTER_ACCESS,
    module: "Product Master",
    action: "access",
    label: "Access Product",
  },

  // =========================
  // CATEGORY
  // =========================
  {
    id: "P-001",
    key: PERMISSIONS.CATEGORY_ACCESS,
    module: "Category",
    action: "access",
    label: "Access Category",
  },
  {
    id: "P-002",
    key: PERMISSIONS.CATEGORY_TABLE,
    module: "Category",
    action: "table",
    label: "View Category Table",
  },
  {
    id: "P-003",
    key: PERMISSIONS.CATEGORY_CREATE,
    module: "Category",
    action: "create",
    label: "Create Category",
  },
  {
    id: "P-004",
    key: PERMISSIONS.CATEGORY_VIEW,
    module: "Category",
    action: "view",
    label: "View Category",
  },
  {
    id: "P-005",
    key: PERMISSIONS.CATEGORY_UPDATE,
    module: "Category",
    action: "update",
    label: "Update Category",
  },
  {
    id: "P-006",
    key: PERMISSIONS.CATEGORY_DELETE,
    module: "Category",
    action: "delete",
    label: "Delete Category",
  },
  {
    id: "P-007",
    key: PERMISSIONS.CATEGORY_IMPORT,
    module: "Category",
    action: "import",
    label: "Import Category",
  },
  {
    id: "P-008",
    key: PERMISSIONS.CATEGORY_EXPORT,
    module: "Category",
    action: "export",
    label: "Export Category",
  },

  // =========================
  // BRAND
  // =========================
  {
    id: "P-009",
    key: PERMISSIONS.BRAND_ACCESS,
    module: "Brand",
    action: "access",
    label: "Access Brand",
  },
  {
    id: "P-010",
    key: PERMISSIONS.BRAND_TABLE,
    module: "Brand",
    action: "table",
    label: "View Brand Table",
  },
  {
    id: "P-011",
    key: PERMISSIONS.BRAND_CREATE,
    module: "Brand",
    action: "create",
    label: "Create Brand",
  },
  {
    id: "P-012",
    key: PERMISSIONS.BRAND_VIEW,
    module: "Brand",
    action: "view",
    label: "View Brand",
  },
  {
    id: "P-013",
    key: PERMISSIONS.BRAND_UPDATE,
    module: "Brand",
    action: "update",
    label: "Update Brand",
  },
  {
    id: "P-014",
    key: PERMISSIONS.BRAND_DELETE,
    module: "Brand",
    action: "delete",
    label: "Delete Brand",
  },
  {
    id: "P-015",
    key: PERMISSIONS.BRAND_IMPORT,
    module: "Brand",
    action: "import",
    label: "Import Brand",
  },
  {
    id: "P-016",
    key: PERMISSIONS.BRAND_EXPORT,
    module: "Brand",
    action: "export",
    label: "Export Brand",
  },

  // =========================
  // PRODUCT
  // =========================
  {
    id: "P-017",
    key: PERMISSIONS.PRODUCT_ACCESS,
    module: "Product",
    action: "access",
    label: "Access Product",
  },
  {
    id: "P-018",
    key: PERMISSIONS.PRODUCT_TABLE,
    module: "Product",
    action: "table",
    label: "View Product Table",
  },
  {
    id: "P-019",
    key: PERMISSIONS.PRODUCT_CREATE,
    module: "Product",
    action: "create",
    label: "Create Product",
  },
  {
    id: "P-020",
    key: PERMISSIONS.PRODUCT_VIEW,
    module: "Product",
    action: "view",
    label: "View Product",
  },
  {
    id: "P-021",
    key: PERMISSIONS.PRODUCT_UPDATE,
    module: "Product",
    action: "update",
    label: "Update Product",
  },
  {
    id: "P-022",
    key: PERMISSIONS.PRODUCT_DELETE,
    module: "Product",
    action: "delete",
    label: "Delete Product",
  },
  {
    id: "P-023",
    key: PERMISSIONS.PRODUCT_IMPORT,
    module: "Product",
    action: "import",
    label: "Import Product",
  },
  {
    id: "P-024",
    key: PERMISSIONS.PRODUCT_EXPORT,
    module: "Product",
    action: "export",
    label: "Export Product",
  },

  // =========================
  // PRODUCT TYPE
  // =========================
  {
    id: "P-025",
    key: PERMISSIONS.PRODUCT_TYPE_ACCESS,
    module: "Product Type",
    action: "access",
    label: "Access Product Type",
  },
  {
    id: "P-026",
    key: PERMISSIONS.PRODUCT_TYPE_TABLE,
    module: "Product Type",
    action: "table",
    label: "View Product Type Table",
  },
  {
    id: "P-027",
    key: PERMISSIONS.PRODUCT_TYPE_CREATE,
    module: "Product Type",
    action: "create",
    label: "Create Product Type",
  },
  {
    id: "P-028",
    key: PERMISSIONS.PRODUCT_TYPE_VIEW,
    module: "Product Type",
    action: "view",
    label: "View Product Type",
  },
  {
    id: "P-029",
    key: PERMISSIONS.PRODUCT_TYPE_UPDATE,
    module: "Product Type",
    action: "update",
    label: "Update Product Type",
  },
  {
    id: "P-030",
    key: PERMISSIONS.PRODUCT_TYPE_DELETE,
    module: "Product Type",
    action: "delete",
    label: "Delete Product Type",
  },
  {
    id: "P-031",
    key: PERMISSIONS.PRODUCT_TYPE_IMPORT,
    module: "Product Type",
    action: "import",
    label: "Import Product Type",
  },
  {
    id: "P-032",
    key: PERMISSIONS.PRODUCT_TYPE_EXPORT,
    module: "Product Type",
    action: "export",
    label: "Export Product Type",
  },

  // =========================
  // ADDRESS
  // =========================
  {
    id: "P-033",
    key: PERMISSIONS.ADDRESS_ACCESS,
    module: "Address",
    action: "access",
    label: "Access Address",
  },

  // =========================
  // STATE
  // =========================
  {
    id: "P-041",
    key: PERMISSIONS.STATE_ACCESS,
    module: "State",
    action: "access",
    label: "Access State",
  },
  {
    id: "P-042",
    key: PERMISSIONS.STATE_TABLE,
    module: "State",
    action: "table",
    label: "View State Table",
  },
  {
    id: "P-043",
    key: PERMISSIONS.STATE_CREATE,
    module: "State",
    action: "create",
    label: "Create State",
  },
  {
    id: "P-044",
    key: PERMISSIONS.STATE_VIEW,
    module: "State",
    action: "view",
    label: "View State",
  },
  {
    id: "P-045",
    key: PERMISSIONS.STATE_UPDATE,
    module: "State",
    action: "update",
    label: "Update State",
  },
  {
    id: "P-046",
    key: PERMISSIONS.STATE_DELETE,
    module: "State",
    action: "delete",
    label: "Delete State",
  },
  {
    id: "P-047",
    key: PERMISSIONS.STATE_IMPORT,
    module: "State",
    action: "import",
    label: "Import State",
  },
  {
    id: "P-048",
    key: PERMISSIONS.STATE_EXPORT,
    module: "State",
    action: "export",
    label: "Export State",
  },

  // =========================
  // DISTRICT
  // =========================
  {
    id: "P-049",
    key: PERMISSIONS.DISTRICT_ACCESS,
    module: "District",
    action: "access",
    label: "Access District",
  },
  {
    id: "P-050",
    key: PERMISSIONS.DISTRICT_TABLE,
    module: "District",
    action: "table",
    label: "View District Table",
  },
  {
    id: "P-051",
    key: PERMISSIONS.DISTRICT_CREATE,
    module: "District",
    action: "create",
    label: "Create District",
  },
  {
    id: "P-052",
    key: PERMISSIONS.DISTRICT_VIEW,
    module: "District",
    action: "view",
    label: "View District",
  },
  {
    id: "P-053",
    key: PERMISSIONS.DISTRICT_UPDATE,
    module: "District",
    action: "update",
    label: "Update District",
  },
  {
    id: "P-054",
    key: PERMISSIONS.DISTRICT_DELETE,
    module: "District",
    action: "delete",
    label: "Delete District",
  },
  {
    id: "P-055",
    key: PERMISSIONS.DISTRICT_IMPORT,
    module: "District",
    action: "import",
    label: "Import District",
  },
  {
    id: "P-056",
    key: PERMISSIONS.DISTRICT_EXPORT,
    module: "District",
    action: "export",
    label: "Export District",
  },

  // =========================
  // CITY
  // =========================
  {
    id: "P-057",
    key: PERMISSIONS.CITY_ACCESS,
    module: "City",
    action: "access",
    label: "Access City",
  },
  {
    id: "P-058",
    key: PERMISSIONS.CITY_TABLE,
    module: "City",
    action: "table",
    label: "View City Table",
  },
  {
    id: "P-059",
    key: PERMISSIONS.CITY_CREATE,
    module: "City",
    action: "create",
    label: "Create City",
  },
  {
    id: "P-060",
    key: PERMISSIONS.CITY_VIEW,
    module: "City",
    action: "view",
    label: "View City",
  },
  {
    id: "P-061",
    key: PERMISSIONS.CITY_UPDATE,
    module: "City",
    action: "update",
    label: "Update City",
  },
  {
    id: "P-062",
    key: PERMISSIONS.CITY_DELETE,
    module: "City",
    action: "delete",
    label: "Delete City",
  },
  {
    id: "P-063",
    key: PERMISSIONS.CITY_IMPORT,
    module: "City",
    action: "import",
    label: "Import City",
  },
  {
    id: "P-064",
    key: PERMISSIONS.CITY_EXPORT,
    module: "City",
    action: "export",
    label: "Export City",
  },

  // =========================
  // PINCODE
  // =========================
  {
    id: "P-065",
    key: PERMISSIONS.PINCODE_ACCESS,
    module: "Pincode",
    action: "access",
    label: "Access Pincode",
  },
  {
    id: "P-066",
    key: PERMISSIONS.PINCODE_TABLE,
    module: "Pincode",
    action: "table",
    label: "View Pincode Table",
  },
  {
    id: "P-067",
    key: PERMISSIONS.PINCODE_CREATE,
    module: "Pincode",
    action: "create",
    label: "Create Pincode",
  },
  {
    id: "P-068",
    key: PERMISSIONS.PINCODE_VIEW,
    module: "Pincode",
    action: "view",
    label: "View Pincode",
  },
  {
    id: "P-069",
    key: PERMISSIONS.PINCODE_UPDATE,
    module: "Pincode",
    action: "update",
    label: "Update Pincode",
  },
  {
    id: "P-070",
    key: PERMISSIONS.PINCODE_DELETE,
    module: "Pincode",
    action: "delete",
    label: "Delete Pincode",
  },
  {
    id: "P-071",
    key: PERMISSIONS.PINCODE_IMPORT,
    module: "Pincode",
    action: "import",
    label: "Import Pincode",
  },
  {
    id: "P-072",
    key: PERMISSIONS.PINCODE_EXPORT,
    module: "Pincode",
    action: "export",
    label: "Export Pincode",
  },

  // =========================
  // AREA
  // =========================
  {
    id: "P-073",
    key: PERMISSIONS.AREA_ACCESS,
    module: "Area",
    action: "access",
    label: "Access Area",
  },
  {
    id: "P-074",
    key: PERMISSIONS.AREA_TABLE,
    module: "Area",
    action: "table",
    label: "View Area Table",
  },
  {
    id: "P-075",
    key: PERMISSIONS.AREA_CREATE,
    module: "Area",
    action: "create",
    label: "Create Area",
  },
  {
    id: "P-076",
    key: PERMISSIONS.AREA_VIEW,
    module: "Area",
    action: "view",
    label: "View Area",
  },
  {
    id: "P-077",
    key: PERMISSIONS.AREA_UPDATE,
    module: "Area",
    action: "update",
    label: "Update Area",
  },
  {
    id: "P-078",
    key: PERMISSIONS.AREA_DELETE,
    module: "Area",
    action: "delete",
    label: "Delete Area",
  },
  {
    id: "P-079",
    key: PERMISSIONS.AREA_IMPORT,
    module: "Area",
    action: "import",
    label: "Import Area",
  },
  {
    id: "P-080",
    key: PERMISSIONS.AREA_EXPORT,
    module: "Area",
    action: "export",
    label: "Export Area",
  },


  // {
  //   id: "P-004",
  //   key: PERMISSIONS.CATEGORY_ACCESS,
  //   module: "Category Master",
  //   action: "access",
  //   label: "Access Category Master",
  // },

  // {
  //   id: "P-005",
  //   key: PERMISSIONS.ITEM_ACCESS,
  //   module: "Item Master",
  //   action: "access",
  //   label: "Access Item Master",
  // },
  {
    id: "P-006",
    key: PERMISSIONS.APPOINTMENT_ACCESS,
    module: "Appointments",
    action: "access",
    label: "Access Appointments",
  },
  {
    id: "P-007",
    key: PERMISSIONS.PENDING_ACCESS,
    module: "Pending & SLA",
    action: "access",
    label: "Access Pending & SLA",
  },
  {
    id: "P-008",
    key: PERMISSIONS.CANCELLATION_ACCESS,
    module: "Cancellation",
    action: "access",
    label: "Access Cancellation",
  },
  {
    id: "P-009",
    key: PERMISSIONS.CLOSURE_ACCESS,
    module: "Closure History",
    action: "access",
    label: "Access Closure History",
  },
  {
    id: "P-010",
    key: PERMISSIONS.VERIFICATION_ACCESS,
    module: "DG Verification",
    action: "access",
    label: "Access DG Verification",
  },
  {
    id: "P-011",
    key: PERMISSIONS.BILLING_ACCESS,
    module: "Billing",
    action: "access",
    label: "Access Billing",
  },
  {
    id: "P-012",
    key: PERMISSIONS.LEDGER_ACCESS,
    module: "Dealer Ledger",
    action: "access",
    label: "Access Dealer Ledger",
  },
  {
    id: "P-013",
    key: PERMISSIONS.NOTIFICATION_ACCESS,
    module: "Notifications",
    action: "access",
    label: "Access Notifications",
  },
  {
    id: "P-014",
    key: PERMISSIONS.AREA_ACCESS,
    module: "Area Master",
    action: "access",
    label: "Access Area Master",
  },
  {
    id: "P-015",
    key: PERMISSIONS.USER_ACCESS,
    module: "Users",
    action: "access",
    label: "Access Users",
  },
  {
    id: "P-016",
    key: PERMISSIONS.ROLE_ACCESS,
    module: "Roles & Permissions",
    action: "access",
    label: "Access Roles & Permissions",
  },
  {
    id: "P-098",
    key: PERMISSIONS.DASHBOARD_VIEW,
    module: "Dashboard",
    action: "view",
    label: "View Dashboard",
  },

  {
    id: "P-099",
    key: PERMISSIONS.DASHBOARD_OPERATIONS,
    module: "Dashboard",
    action: "operations",
    label: "View Operational Dashboard Data",
  },

  {
    id: "P-100",
    key: PERMISSIONS.DASHBOARD_FINANCE,
    module: "Dashboard",
    action: "finance",
    label: "View Financial Dashboard Data",
  },

  {
    id: "P-101",
    key: PERMISSIONS.DASHBOARD_DEALER_PERFORMANCE,
    module: "Dashboard",
    action: "dealer_performance",
    label: "View Dealer Performance",
  },

  {
    id: "P-102",
    key: PERMISSIONS.DASHBOARD_SLA,
    module: "Dashboard",
    action: "sla",
    label: "View SLA Dashboard Data",
  },

  {
    id: "P-002",
    key: PERMISSIONS.USER_VIEW,
    module: "Users",
    action: "view",
    label: "View Users",
  },

  {
    id: "P-003",
    key: PERMISSIONS.USER_CREATE,
    module: "Users",
    action: "create",
    label: "Create Users",
  },

  {
    id: "P-004",
    key: PERMISSIONS.USER_UPDATE,
    module: "Users",
    action: "update",
    label: "Update Users",
  },

  {
    id: "P-005",
    key: PERMISSIONS.USER_DELETE,
    module: "Users",
    action: "delete",
    label: "Delete Users",
  },

  {
    id: "P-006",
    key: PERMISSIONS.USER_ASSIGN_ROLE,
    module: "Users",
    action: "assign_role",
    label: "Assign Role",
  },

  {
    id: "P-007",
    key: PERMISSIONS.ROLE_VIEW,
    module: "Roles",
    action: "view",
    label: "View Roles",
  },

  {
    id: "P-500",
    key: PERMISSIONS.ROLE_ACCESS,
    module: "Roles",
    action: "access",
    label: "View Roles",
  },

  {
    id: "P-008",
    key: PERMISSIONS.ROLE_CREATE,
    module: "Roles",
    action: "create",
    label: "Create Roles",
  },

  {
    id: "P-009",
    key: PERMISSIONS.ROLE_UPDATE,
    module: "Roles",
    action: "update",
    label: "Update Roles",
  },

  {
    id: "P-010",
    key: PERMISSIONS.ROLE_DELETE,
    module: "Roles",
    action: "delete",
    label: "Delete Roles",
  },

  {
    id: "P-011",
    key: PERMISSIONS.ROLE_PERMISSION_MANAGE,
    module: "Roles",
    action: "permissions",
    label: "Manage Permissions",
  },

  {
    id: "role-permission-view",
    key: PERMISSIONS.ROLE_PERMISSION_VIEW,
    module: "Roles",
    action: "permissions",
    label: "View Role Permissions",
  },

  // {
  //   id: "P-012",
  //   key:
  //     PERMISSIONS.COMPLAINT_VIEW,
  //   module:
  //     "Complaints",
  //   action: "view",
  //   label:
  //     "View Complaints",
  // },

  // {
  //   id: "P-013",
  //   key:
  //     PERMISSIONS.COMPLAINT_CREATE,
  //   module:
  //     "Complaints",
  //   action: "create",
  //   label:
  //     "Create Complaints",
  // },

  // {
  //   id: "P-014",
  //   key:
  //     PERMISSIONS.COMPLAINT_UPDATE,
  //   module:
  //     "Complaints",
  //   action: "update",
  //   label:
  //     "Update Complaints",
  // },

  // {
  //   id: "P-015",
  //   key:
  //     PERMISSIONS.COMPLAINT_ASSIGN,
  //   module:
  //     "Complaints",
  //   action: "assign",
  //   label:
  //     "Assign Dealer",
  // },

  // {
  //   id: "P-016",
  //   key:
  //     PERMISSIONS.COMPLAINT_REASSIGN,
  //   module:
  //     "Complaints",
  //   action: "reassign",
  //   label:
  //     "Reassign Dealer",
  // },

  // {
  //   id: "P-017",
  //   key:
  //     PERMISSIONS.COMPLAINT_CANCEL,
  //   module:
  //     "Complaints",
  //   action: "cancel",
  //   label:
  //     "Cancel Complaint",
  // },

  // {
  //   id: "P-018",
  //   key:
  //     PERMISSIONS.COMPLAINT_VERIFY,
  //   module:
  //     "Complaints",
  //   action: "verify",
  //   label:
  //     "Verify Complaint",
  // },

  {
    id: "P-012",
    key: "complaints.view",
    module: "Complaints",
    action: "view",
    label: "View Complaints",
  },

  {
    id: "P-013",
    key: "complaints.create",
    module: "Complaints",
    action: "create",
    label: "Create Complaints",
  },

  {
    id: "P-014",
    key: "complaints.update",
    module: "Complaints",
    action: "update",
    label: "Update Complaints",
  },

  {
    id: "P-015",
    key: "complaints.delete",
    module: "Complaints",
    action: "delete",
    label: "Delete Complaints",
  },

  {
    id: "P-016",
    key: "complaints.assign",
    module: "Complaints",
    action: "assign",
    label: "Assign Complaint",
  },

  {
    id: "P-017",
    key: "complaints.reassign",
    module: "Complaints",
    action: "reassign",
    label: "Reassign Complaint",
  },

  {
    id: "P-018",
    key: "complaints.verify",
    module: "Complaints",
    action: "verify",
    label: "Verify Complaint",
  },

  {
    id: "P-019",
    key: PERMISSIONS.DEALER_VIEW,
    module: "Dealers",
    action: "view",
    label: "View Dealers",
  },

  {
    id: "P-020",
    key: PERMISSIONS.DEALER_CREATE,
    module: "Dealers",
    action: "create",
    label: "Create Dealers",
  },

  {
    id: "P-021",
    key: PERMISSIONS.DEALER_UPDATE,
    module: "Dealers",
    action: "update",
    label: "Update Dealers",
  },

  {
    id: "P-022",
    key: PERMISSIONS.DEALER_DELETE,
    module: "Dealers",
    action: "delete",
    label: "Delete Dealers",
  },

  {
    id: "P-023",
    key: PERMISSIONS.DEALER_PERFORMANCE_VIEW,
    module: "Dealers",
    action: "performance",
    label: "View Performance",
  },

  {
    id: "P-038",
    key: PERMISSIONS.APPOINTMENT_VIEW,
    module: "Appointments",
    action: "view",
    label: "View Appointments",
  },

  {
    id: "P-039",
    key: PERMISSIONS.APPOINTMENT_CREATE,
    module: "Appointments",
    action: "create",
    label: "Create Appointment",
  },

  {
    id: "P-040",
    key: PERMISSIONS.APPOINTMENT_UPDATE,
    module: "Appointments",
    action: "update",
    label: "Update Appointment",
  },

  {
    id: "P-041",
    key: PERMISSIONS.APPOINTMENT_CONFIRM,
    module: "Appointments",
    action: "confirm",
    label: "Confirm Appointment",
  },

  {
    id: "P-042",
    key: PERMISSIONS.APPOINTMENT_RESCHEDULE,
    module: "Appointments",
    action: "reschedule",
    label: "Reschedule Appointment",
  },

  {
    id: "P-043",
    key: PERMISSIONS.APPOINTMENT_COMPLETE,
    module: "Appointments",
    action: "complete",
    label: "Complete Appointment",
  },

  {
    id: "P-044",
    key: PERMISSIONS.APPOINTMENT_CANCEL,
    module: "Appointments",
    action: "cancel",
    label: "Cancel Appointment",
  },
  {
    id: "P-045",
    key: PERMISSIONS.PENDING_VIEW,
    module: "Pending",
    action: "view",
    label: "View Pending Complaints",
  },

  {
    id: "P-046",
    key: PERMISSIONS.PENDING_CREATE,
    module: "Pending",
    action: "create",
    label: "Set Complaint Pending",
  },

  {
    id: "P-047",
    key: PERMISSIONS.PENDING_UPDATE,
    module: "Pending",
    action: "update",
    label: "Update Pending Complaint",
  },

  {
    id: "P-048",
    key: PERMISSIONS.PENDING_RESOLVE,
    module: "Pending",
    action: "resolve",
    label: "Resolve Pending Complaint",
  },

  {
    id: "P-049",
    key: PERMISSIONS.PENDING_REASSIGN,
    module: "Pending",
    action: "reassign",
    label: "Reassign Pending Complaint",
  },

  {
    id: "P-050",
    key: PERMISSIONS.PENDING_ESCALATE,
    module: "Pending",
    action: "escalate",
    label: "Escalate Pending Complaint",
  },

  {
    id: "P-051",
    key: PERMISSIONS.PENDING_CANCEL,
    module: "Pending",
    action: "cancel",
    label: "Cancel Pending Complaint",
  },

  {
    id: "P-052",
    key: PERMISSIONS.SLA_VIEW,
    module: "SLA",
    action: "view",
    label: "View SLA Dashboard",
  },

  {
    id: "P-053",
    key: PERMISSIONS.SLA_REMINDER,
    module: "SLA",
    action: "reminder",
    label: "Send SLA Reminder",
  },

  {
    id: "P-054",
    key: PERMISSIONS.SLA_MANAGE,
    module: "SLA",
    action: "manage",
    label: "Manage SLA",
  },

  {
    id: "P-073",
    key: PERMISSIONS.BILLING_VIEW,
    module: "Billing",
    action: "view",
    label: "View Billing",
  },

  {
    id: "P-074",
    key: PERMISSIONS.BILLING_GENERATE,
    module: "Billing",
    action: "generate",
    label: "Generate Bill",
  },

  {
    id: "P-075",
    key: PERMISSIONS.BILLING_APPROVE,
    module: "Billing",
    action: "approve",
    label: "Approve Bill",
  },

  {
    id: "P-076",
    key: PERMISSIONS.BILLING_REJECT,
    module: "Billing",
    action: "reject",
    label: "Reject Bill",
  },

  {
    id: "P-077",
    key: PERMISSIONS.BILLING_RATE_VIEW,
    module: "Rate Master",
    action: "view",
    label: "View Rates",
  },

  {
    id: "P-078",
    key: PERMISSIONS.BILLING_RATE_CREATE,
    module: "Rate Master",
    action: "create",
    label: "Create Rate",
  },

  {
    id: "P-079",
    key: PERMISSIONS.BILLING_RATE_UPDATE,
    module: "Rate Master",
    action: "update",
    label: "Update Rate",
  },

  {
    id: "P-080",
    key: PERMISSIONS.BILLING_RATE_DELETE,
    module: "Rate Master",
    action: "delete",
    label: "Delete Rate",
  },

  {
    id: "P-086",
    key: PERMISSIONS.PAYMENT_VIEW,
    module: "Payments",
    action: "view",
    label: "View Payments",
  },

  {
    id: "P-087",
    key: PERMISSIONS.PAYMENT_DETAILS_VIEW,
    module: "Payments",
    action: "details_view",
    label: "View Payment Details",
  },

  {
    id: "P-088",
    key: PERMISSIONS.PAYMENT_CREATE,
    module: "Payments",
    action: "create",
    label: "Record Payment",
  },

  {
    id: "P-089",
    key: PERMISSIONS.PAYMENT_APPROVE,
    module: "Payments",
    action: "approve",
    label: "Approve Payment",
  },

  {
    id: "P-090",
    key: PERMISSIONS.PAYMENT_REJECT,
    module: "Payments",
    action: "reject",
    label: "Reject Payment",
  },

  {
    id: "P-091",
    key: PERMISSIONS.PAYMENT_REVERSE,
    module: "Payments",
    action: "reverse",
    label: "Reverse Payment",
  },

  {
    id: "P-092",
    key: PERMISSIONS.PAYMENT_EXPORT,
    module: "Payments",
    action: "export",
    label: "Export Payments",
  },

  {
    id: "P-103",
    key: PERMISSIONS.REPORT_VIEW,
    module: "Reports",
    action: "view",
    label: "View Reports",
  },

  {
    id: "P-104",
    key: PERMISSIONS.REPORT_COMPLAINT,
    module: "Reports",
    action: "complaint",
    label: "View Complaint Report",
  },

  {
    id: "P-105",
    key: PERMISSIONS.REPORT_DEALER,
    module: "Reports",
    action: "dealer",
    label: "View Dealer Report",
  },

  {
    id: "P-106",
    key: PERMISSIONS.REPORT_SLA,
    module: "Reports",
    action: "sla",
    label: "View SLA Report",
  },

  {
    id: "P-107",
    key: PERMISSIONS.REPORT_CANCELLATION,
    module: "Reports",
    action: "cancellation",
    label: "View Cancellation Report",
  },

  {
    id: "P-108",
    key: PERMISSIONS.REPORT_BILLING,
    module: "Reports",
    action: "billing",
    label: "View Billing Report",
  },

  {
    id: "P-109",
    key: PERMISSIONS.REPORT_PAYMENT,
    module: "Reports",
    action: "payment",
    label: "View Payment Report",
  },

  {
    id: "P-110",
    key: PERMISSIONS.REPORT_EXPORT,
    module: "Reports",
    action: "export",
    label: "Export Reports",
  },
  {
    id: "P-115",
    key: PERMISSIONS.AUDIT_VIEW,
    module: "Audit Logs",
    action: "view",
    label: "View Audit Logs",
  },

  {
    id: "P-116",
    key: PERMISSIONS.AUDIT_DETAILS,
    module: "Audit Logs",
    action: "details",
    label: "View Audit Log Details",
  },

  {
    id: "P-117",
    key: PERMISSIONS.AUDIT_EXPORT,
    module: "Audit Logs",
    action: "export",
    label: "Export Audit Logs",
  },

  {
    id: "P-118",
    key: PERMISSIONS.SETTINGS_VIEW,
    module: "Settings",
    action: "view",
    label: "View Settings",
  },

  {
    id: "P-119",
    key: PERMISSIONS.SETTINGS_SLA,
    module: "Settings",
    action: "sla",
    label: "Manage SLA Settings",
  },

  {
    id: "P-120",
    key: PERMISSIONS.SETTINGS_NOTIFICATION,
    module: "Settings",
    action: "notification",
    label: "Manage Notification Settings",
  },

  {
    id: "P-121",
    key: PERMISSIONS.SETTINGS_BILLING,
    module: "Settings",
    action: "billing",
    label: "Manage Billing Settings",
  },

  {
    id: "P-122",
    key: PERMISSIONS.SETTINGS_STATUS,
    module: "Settings",
    action: "status",
    label: "Manage Status Settings",
  },

  {
    id: "P-123",
    key: PERMISSIONS.SETTINGS_CANCELLATION_REASON,
    module: "Settings",
    action: "cancellation_reason",
    label: "Manage Cancellation Reasons",
  },

  {
    id: "P-124",
    key: PERMISSIONS.SETTINGS_PENDING_REASON,
    module: "Settings",
    action: "pending_reason",
    label: "Manage Pending Reasons",
  },

  {
    id: "P-125",
    key: PERMISSIONS.SETTINGS_PERMISSION,
    module: "Settings",
    action: "permission",
    label: "Manage Permission Settings",
  },

  {
    id: "P-034",
    key: PERMISSIONS.ALLOCATION_VIEW,
    module: "Allocation",
    action: "view",
    label: "View Dealer Allocation",
  },

  {
    id: "P-035",
    key: PERMISSIONS.ALLOCATION_ASSIGN,
    module: "Allocation",
    action: "assign",
    label: "Assign Dealer",
  },

  {
    id: "P-036",
    key: PERMISSIONS.ALLOCATION_REASSIGN,
    module: "Allocation",
    action: "reassign",
    label: "Reassign Dealer",
  },

  {
    id: "P-037",
    key: PERMISSIONS.ALLOCATION_HISTORY_VIEW,
    module: "Allocation",
    action: "history",
    label: "View Allocation History",
  },
  {
    id: "P-055",
    key: PERMISSIONS.CANCELLATION_VIEW,
    module: "Cancellations",
    action: "view",
    label: "View Cancellation Requests",
  },

  {
    id: "P-056",
    key: PERMISSIONS.CANCELLATION_CREATE,
    module: "Cancellations",
    action: "create",
    label: "Request Cancellation",
  },

  {
    id: "P-057",
    key: PERMISSIONS.CANCELLATION_VERIFY,
    module: "Cancellations",
    action: "verify",
    label: "Verify Customer",
  },

  {
    id: "P-058",
    key: PERMISSIONS.CANCELLATION_APPROVE,
    module: "Cancellations",
    action: "approve",
    label: "Approve Cancellation",
  },

  {
    id: "P-059",
    key: PERMISSIONS.CANCELLATION_REJECT,
    module: "Cancellations",
    action: "reject",
    label: "Reject Cancellation",
  },

  {
    id: "P-060",
    key: PERMISSIONS.CANCELLATION_REASSIGN,
    module: "Cancellations",
    action: "reassign",
    label: "Reassign After Cancellation",
  },
  {
    id: "P-061",
    key: PERMISSIONS.CLOSURE_VIEW,
    module: "Closures",
    action: "view",
    label: "View Closures",
  },

  {
    id: "P-062",
    key: PERMISSIONS.CLOSURE_CREATE,
    module: "Closures",
    action: "create",
    label: "Create Closure",
  },

  {
    id: "P-063",
    key: PERMISSIONS.CLOSURE_SUBMIT,
    module: "Closures",
    action: "submit",
    label: "Submit Closure",
  },

  {
    id: "P-064",
    key: PERMISSIONS.CLOSURE_VERIFY,
    module: "Closures",
    action: "verify",
    label: "Verify Closure",
  },

  {
    id: "P-065",
    key: PERMISSIONS.CLOSURE_REJECT,
    module: "Closures",
    action: "reject",
    label: "Reject Closure",
  },

  {
    id: "P-066",
    key: PERMISSIONS.CLOSURE_HISTORY_VIEW,
    module: "Closures",
    action: "history",
    label: "View Closure History",
  },
  {
    id: "P-067",
    key: PERMISSIONS.VERIFICATION_VIEW,
    module: "Verification",
    action: "view",
    label: "View Verification Queue",
  },

  {
    id: "P-068",
    key: PERMISSIONS.VERIFICATION_REVIEW,
    module: "Verification",
    action: "review",
    label: "Review Closure",
  },

  {
    id: "P-069",
    key: PERMISSIONS.VERIFICATION_VERIFY,
    module: "Verification",
    action: "verify",
    label: "Verify Closure",
  },

  {
    id: "P-070",
    key: PERMISSIONS.VERIFICATION_REJECT,
    module: "Verification",
    action: "reject",
    label: "Reject Closure",
  },

  {
    id: "P-071",
    key: PERMISSIONS.VERIFICATION_CORRECTION,
    module: "Verification",
    action: "correction",
    label: "Request Correction",
  },

  {
    id: "P-072",
    key: PERMISSIONS.VERIFICATION_ASSIGN,
    module: "Verification",
    action: "assign",
    label: "Assign Verifier",
  },
  {
    id: "P-081",
    key: PERMISSIONS.LEDGER_VIEW,
    module: "Ledger",
    action: "view",
    label: "View Ledger Overview",
  },

  {
    id: "P-082",
    key: PERMISSIONS.LEDGER_DEALER_VIEW,
    module: "Ledger",
    action: "dealer_view",
    label: "View Dealer Ledger",
  },

  {
    id: "P-083",
    key: PERMISSIONS.LEDGER_TRANSACTION_VIEW,
    module: "Ledger",
    action: "transaction_view",
    label: "View Ledger Transactions",
  },

  {
    id: "P-084",
    key: PERMISSIONS.LEDGER_ADJUSTMENT_CREATE,
    module: "Ledger",
    action: "adjust",
    label: "Create Ledger Adjustment",
  },

  {
    id: "P-085",
    key: PERMISSIONS.LEDGER_EXPORT,
    module: "Ledger",
    action: "export",
    label: "Export Dealer Ledger",
  },

  {
    id: "P-093",
    key: PERMISSIONS.RECONCILIATION_VIEW,
    module: "Reconciliation",
    action: "view",
    label: "View Reconciliation",
  },

  {
    id: "P-094",
    key: PERMISSIONS.RECONCILIATION_DETAILS_VIEW,
    module: "Reconciliation",
    action: "details_view",
    label: "View Reconciliation Details",
  },

  {
    id: "P-095",
    key: PERMISSIONS.RECONCILIATION_RECONCILE,
    module: "Reconciliation",
    action: "reconcile",
    label: "Reconcile Difference",
  },

  {
    id: "P-096",
    key: PERMISSIONS.RECONCILIATION_MARK_MATCHED,
    module: "Reconciliation",
    action: "mark_matched",
    label: "Mark Reconciliation Matched",
  },

  {
    id: "P-097",
    key: PERMISSIONS.RECONCILIATION_EXPORT,
    module: "Reconciliation",
    action: "export",
    label: "Export Reconciliation",
  },

  {
    id: "P-111",
    key: PERMISSIONS.NOTIFICATION_VIEW,
    module: "Notifications",
    action: "view",
    label: "View Notifications",
  },

  {
    id: "P-112",
    key: PERMISSIONS.NOTIFICATION_READ,
    module: "Notifications",
    action: "read",
    label: "Mark Notifications Read",
  },

  {
    id: "P-113",
    key: PERMISSIONS.NOTIFICATION_DELETE,
    module: "Notifications",
    action: "delete",
    label: "Delete Notification",
  },

  {
    id: "P-114",
    key: PERMISSIONS.NOTIFICATION_CLEAR,
    module: "Notifications",
    action: "clear",
    label: "Clear Notifications",
  },
];

export const VALID_PERMISSION_KEYS = new Set(
  PERMISSION_LIST.map((permission) => permission.key),
);
