;; Attendance Verification Contract
;; Records daily presence in classrooms

;; Define data variables
(define-data-var last-attendance-id uint u0)

;; Define data maps
(define-map attendance-records
  { attendance-id: uint }
  {
    student-id: uint,
    date: uint,
    status: (string-ascii 20), ;; "present", "absent", "tardy", "excused"
    recorded-by: principal,
    class-id: uint,
    timestamp: uint
  }
)

;; Map of daily attendance by student and date
(define-map daily-attendance
  { student-id: uint, date: uint }
  { attendance-id: uint }
)

;; Map of classes
(define-map classes
  { class-id: uint }
  {
    name: (string-ascii 100),
    school-id: uint,
    grade-level: uint,
    teacher: principal,
    active: bool
  }
)

;; Record attendance for a student
(define-public (record-attendance
                (student-id uint)
                (date uint)
                (status (string-ascii 20))
                (class-id uint))
  (let (
    (attendance-id (+ (var-get last-attendance-id) u1))
    (class (unwrap! (map-get? classes { class-id: class-id }) (err u1)))
  )
    ;; Validate status
    (asserts! (or (is-eq status "present")
                 (is-eq status "absent")
                 (is-eq status "tardy")
                 (is-eq status "excused"))
             (err u2))

    ;; Update last attendance ID
    (var-set last-attendance-id attendance-id)

    ;; Store the attendance record
    (map-set attendance-records
      { attendance-id: attendance-id }
      {
        student-id: student-id,
        date: date,
        status: status,
        recorded-by: tx-sender,
        class-id: class-id,
        timestamp: block-height
      }
    )

    ;; Update daily attendance lookup
    (map-set daily-attendance
      { student-id: student-id, date: date }
      { attendance-id: attendance-id }
    )

    (ok attendance-id)
  )
)

;; Update an existing attendance record
(define-public (update-attendance
                (attendance-id uint)
                (status (string-ascii 20)))
  (let (
    (record (unwrap! (map-get? attendance-records { attendance-id: attendance-id }) (err u1)))
  )
    ;; Validate status
    (asserts! (or (is-eq status "present")
                 (is-eq status "absent")
                 (is-eq status "tardy")
                 (is-eq status "excused"))
             (err u2))

    ;; Update the attendance record
    (map-set attendance-records
      { attendance-id: attendance-id }
      (merge record {
        status: status,
        recorded-by: tx-sender,
        timestamp: block-height
      })
    )

    (ok true)
  )
)

;; Register a class
(define-public (register-class
                (class-id uint)
                (name (string-ascii 100))
                (school-id uint)
                (grade-level uint))
  (begin
    ;; Store the class
    (map-set classes
      { class-id: class-id }
      {
        name: name,
        school-id: school-id,
        grade-level: grade-level,
        teacher: tx-sender,
        active: true
      }
    )

    (ok true)
  )
)

;; Read-only functions

;; Get attendance record
(define-read-only (get-attendance-record (attendance-id uint))
  (map-get? attendance-records { attendance-id: attendance-id })
)

;; Get student's attendance for a specific date
(define-read-only (get-student-attendance (student-id uint) (date uint))
  (let (
    (attendance-lookup (map-get? daily-attendance { student-id: student-id, date: date }))
  )
    (match attendance-lookup
      attendance-id (map-get? attendance-records { attendance-id: (get attendance-id attendance-id) })
      none
    )
  )
)

;; Get class details
(define-read-only (get-class (class-id uint))
  (map-get? classes { class-id: class-id })
)

;; Get the last attendance ID
(define-read-only (get-last-attendance-id)
  (var-get last-attendance-id)
)
