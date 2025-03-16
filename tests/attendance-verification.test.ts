import { describe, it, expect, beforeEach } from 'vitest';

// Mock the Clarity VM environment
const mockClarity = {
  tx: {
    sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Default teacher
  },
  block: {
    height: 100,
  },
};

// Mock the contract functions
const attendanceVerificationContract = {
  lastAttendanceId: 0,
  attendanceRecords: new Map(),
  dailyAttendance: new Map(),
  classes: new Map(),
  
  recordAttendance(studentId, date, status, classId) {
    const attendanceId = this.lastAttendanceId + 1;
    
    // Check if class exists
    if (!this.classes.has(classId)) {
      return { error: 1 };
    }
    
    // Validate status
    if (!['present', 'absent', 'tardy', 'excused'].includes(status)) {
      return { error: 2 };
    }
    
    this.lastAttendanceId = attendanceId;
    
    // Store the attendance record
    this.attendanceRecords.set(attendanceId, {
      studentId,
      date,
      status,
      recordedBy: mockClarity.tx.sender,
      classId,
      timestamp: mockClarity.block.height
    });
    
    // Update daily attendance lookup
    this.dailyAttendance.set(`${studentId}-${date}`, { attendanceId });
    
    return { value: attendanceId };
  },
  
  updateAttendance(attendanceId, status) {
    if (!this.attendanceRecords.has(attendanceId)) {
      return { error: 1 };
    }
    
    const record = this.attendanceRecords.get(attendanceId);
    
    // Validate status
    if (!['present', 'absent', 'tardy', 'excused'].includes(status)) {
      return { error: 2 };
    }
    
    // Update the record
    record.status = status;
    record.recordedBy = mockClarity.tx.sender;
    record.timestamp = mockClarity.block.height;
    
    this.attendanceRecords.set(attendanceId, record);
    
    return { value: true };
  },
  
  registerClass(classId, name, schoolId, gradeLevel) {
    this.classes.set(classId, {
      name,
      schoolId,
      gradeLevel,
      teacher: mockClarity.tx.sender,
      active: true
    });
    
    return { value: true };
  },
  
  getAttendanceRecord(attendanceId) {
    return this.attendanceRecords.get(attendanceId) || null;
  },
  
  getStudentAttendance(studentId, date) {
    const attendanceLookup = this.dailyAttendance.get(`${studentId}-${date}`);
    if (!attendanceLookup) return null;
    
    return this.attendanceRecords.get(attendanceLookup.attendanceId) || null;
  },
  
  getClass(classId) {
    return this.classes.get(classId) || null;
  },
  
  getLastAttendanceId() {
    return this.lastAttendanceId;
  }
};

describe('Attendance Verification Contract', () => {
  beforeEach(() => {
    // Reset the contract state before each test
    attendanceVerificationContract.lastAttendanceId = 0;
    attendanceVerificationContract.attendanceRecords = new Map();
    attendanceVerificationContract.dailyAttendance = new Map();
    attendanceVerificationContract.classes = new Map();
    mockClarity.block.height = 100;
  });
  
  it('should register a class', () => {
    const result = attendanceVerificationContract.registerClass(
        1, // class ID
        'Algebra I',
        1, // school ID
        9 // grade level
    );
    
    expect(result.value).toBe(true);
    
    const classData = attendanceVerificationContract.getClass(1);
    expect(classData).not.toBeNull();
    expect(classData.name).toBe('Algebra I');
    expect(classData.schoolId).toBe(1);
    expect(classData.gradeLevel).toBe(9);
    expect(classData.teacher).toBe(mockClarity.tx.sender);
    expect(classData.active).toBe(true);
  });
  
  it('should record attendance', () => {
    // First register a class
    attendanceVerificationContract.registerClass(1, 'Algebra I', 1, 9);
    
    // Record attendance
    const result = attendanceVerificationContract.recordAttendance(
        1, // student ID
        20230901, // date (YYYYMMDD)
        'present',
        1 // class ID
    );
    
    expect(result.value).toBe(1);
    
    const record = attendanceVerificationContract.getAttendanceRecord(1);
    expect(record).not.toBeNull();
    expect(record.studentId).toBe(1);
    expect(record.date).toBe(20230901);
    expect(record.status).toBe('present');
    expect(record.classId).toBe(1);
    expect(record.recordedBy).toBe(mockClarity.tx.sender);
    
    // Check that we can retrieve by student and date
    const studentRecord = attendanceVerificationContract.getStudentAttendance(1, 20230901);
    expect(studentRecord).not.toBeNull();
    expect(studentRecord.status).toBe('present');
  });
  
  it('should update attendance', () => {
    // Register a class and record attendance
    attendanceVerificationContract.registerClass(1, 'Algebra I', 1, 9);
    attendanceVerificationContract.recordAttendance(1, 20230901, 'present', 1);
    
    // Update to absent
    const result = attendanceVerificationContract.updateAttendance(
        1, // attendance ID
        'absent'
    );
    
    expect(result.value).toBe(true);
    
    const record = attendanceVerificationContract.getAttendanceRecord(1);
    expect(record.status).toBe('absent');
  });
});
